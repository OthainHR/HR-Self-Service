-- ============================================================================
-- FIX: Allow HR Admin to SELECT, UPDATE and INSERT Operations tickets
-- ============================================================================
-- Problem: hr_admin role can only manage 'HR Requests' tickets via RLS.
--          Since Operations tickets are now routed to HR, hr_admin must also
--          be allowed to view and update Operations tickets.
--
-- Run this script in the Supabase SQL Editor.
-- ============================================================================

-- ── Drop all existing ticket policies so we can recreate them cleanly ────────
DROP POLICY IF EXISTS "tickets_select_restricted"  ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_restricted"  ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_restricted"  ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_policy"      ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_policy"      ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_policy"      ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete_policy"      ON public.tickets;

-- ── SELECT policy ─────────────────────────────────────────────────────────────
CREATE POLICY "tickets_select_policy" ON public.tickets
FOR SELECT USING (
    requested_by = auth.uid()
    OR assignee   = auth.uid()
    OR lower(auth.jwt() ->> 'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com',
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    -- HR admin: can see HR Requests AND Operations tickets
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests', 'hr', 'hr support',
                                    'operations', 'ops')
        )
    )
    -- IT admin: IT tickets
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests', 'it', 'it support')
        )
    )
    -- Payroll/Accounts admin
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('payroll requests', 'payroll',
                                    'expense management', 'expenses',
                                    'accounts', 'accounts requests')
        )
    )
    -- Operations admin (kept for compatibility)
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations', 'ops')
        )
    )
    -- AI admin
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests', 'ai', 'ai request',
                                    'general ai request')
        )
    )
    OR user_in_additional_emails(id, auth.uid())
    OR (auth.jwt() ->> 'role') = 'admin'
);

-- ── INSERT policy ─────────────────────────────────────────────────────────────
CREATE POLICY "tickets_insert_policy" ON public.tickets
FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    OR (auth.jwt() ->> 'role') IN ('admin', 'it_admin', 'hr_admin',
                                    'payroll_admin', 'operations_admin', 'ai_admin')
    OR lower(auth.jwt() ->> 'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com',
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
);

-- ── UPDATE policy ─────────────────────────────────────────────────────────────
CREATE POLICY "tickets_update_policy" ON public.tickets
FOR UPDATE USING (
    requested_by = auth.uid()
    OR assignee   = auth.uid()
    OR lower(auth.jwt() ->> 'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com',
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    -- HR admin: HR Requests + Operations
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests', 'hr', 'hr support',
                                    'operations', 'ops')
        )
    )
    -- IT admin
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests', 'it', 'it support')
        )
    )
    -- Payroll/Accounts admin
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('payroll requests', 'payroll',
                                    'expense management', 'expenses',
                                    'accounts', 'accounts requests')
        )
    )
    -- Operations admin (kept for compatibility)
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations', 'ops')
        )
    )
    -- AI admin
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests', 'ai', 'ai request',
                                    'general ai request')
        )
    )
    OR user_in_additional_emails(id, auth.uid())
    OR (auth.jwt() ->> 'role') = 'admin'
) WITH CHECK (
    requested_by = auth.uid()
    OR assignee   = auth.uid()
    OR lower(auth.jwt() ->> 'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com',
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests', 'hr', 'hr support',
                                    'operations', 'ops')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests', 'it', 'it support')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('payroll requests', 'payroll',
                                    'expense management', 'expenses',
                                    'accounts', 'accounts requests')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations', 'ops')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests', 'ai', 'ai request',
                                    'general ai request')
        )
    )
    OR user_in_additional_emails(id, auth.uid())
    OR (auth.jwt() ->> 'role') = 'admin'
);

-- ── DELETE policy ─────────────────────────────────────────────────────────────
CREATE POLICY "tickets_delete_policy" ON public.tickets
FOR DELETE USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR lower(auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;

SELECT 'RLS fix for Operations tickets completed!' AS status;
