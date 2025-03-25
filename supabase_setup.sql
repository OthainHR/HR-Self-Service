-- Create tables for chat history with Supabase

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  title TEXT DEFAULT 'New Chat',
  message_count INTEGER DEFAULT 0
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);

-- Create row level security policies
-- Enable row level security
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.chat_sessions FOR SELECT
  USING (user_id = auth.uid() OR user_id LIKE 'guest-%');

CREATE POLICY "Users can insert their own sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id LIKE 'guest-%');

CREATE POLICY "Users can update their own sessions"
  ON public.chat_sessions FOR UPDATE
  USING (user_id = auth.uid() OR user_id LIKE 'guest-%');

CREATE POLICY "Users can delete their own sessions"
  ON public.chat_sessions FOR DELETE
  USING (user_id = auth.uid() OR user_id LIKE 'guest-%');

-- Create policies for chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id::text = chat_messages.session_id::text
      AND (chat_sessions.user_id = auth.uid() OR chat_sessions.user_id LIKE 'guest-%')
    )
  );

CREATE POLICY "Users can insert messages in their sessions"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id::text = chat_messages.session_id::text
      AND (chat_sessions.user_id = auth.uid() OR chat_sessions.user_id LIKE 'guest-%')
    )
  );

-- Create function for incrementing message count
CREATE OR REPLACE FUNCTION increment(row_id UUID, table_name TEXT, column_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_value INTEGER;
BEGIN
  EXECUTE format('SELECT %I FROM %I WHERE id = %L::uuid', column_name, table_name, row_id) INTO current_value;
  current_value := COALESCE(current_value, 0) + 1;
  RETURN current_value;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create function to convert string IDs to UUIDs safely
CREATE OR REPLACE FUNCTION try_cast_uuid(text)
RETURNS uuid AS $$
BEGIN
    RETURN $1::uuid;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to handle type conversion in queries automatically
CREATE OR REPLACE FUNCTION handle_text_to_uuid()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Convert text session_id to UUID if needed
        IF NEW.session_id IS NOT NULL AND 
           NOT (NEW.session_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') THEN
            -- If not valid UUID format, set to NULL to fail gracefully
            NEW.session_id := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to chat_messages table
CREATE TRIGGER chat_messages_text_to_uuid_trigger
BEFORE INSERT OR UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION handle_text_to_uuid();

-- Create a function that allows explicit casting from text to UUID
CREATE OR REPLACE FUNCTION explicit_cast_to_uuid(p_value text)
RETURNS uuid AS $$
BEGIN
    -- First check if the input is already a valid UUID format
    IF p_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RETURN p_value::uuid;
    END IF;
    
    -- If it's not in UUID format but is 32 hex chars, add dashes to make it UUID format
    IF p_value ~ '^[0-9a-f]{32}$' THEN
        RETURN (
            SUBSTRING(p_value, 1, 8) || '-' ||
            SUBSTRING(p_value, 9, 4) || '-' ||
            SUBSTRING(p_value, 13, 4) || '-' ||
            SUBSTRING(p_value, 17, 4) || '-' ||
            SUBSTRING(p_value, 21, 12)
        )::uuid;
    END IF;
    
    -- If it doesn't match any known pattern, raise an exception
    RAISE EXCEPTION 'Cannot convert % to UUID', p_value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;