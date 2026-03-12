-- ============================================================================
-- FIX: Add '2:30am' to pickup_time enum and migrate all '3:30am' data
-- ============================================================================
-- Problem: The pickup_time column is an enum that only accepts '3:30am'.
--          The app now sends '2:30am', causing:
--          "invalid input value for enum pickup_time: 2:30am"
--
-- Run this script in the Supabase SQL Editor.
-- ============================================================================

-- ── STEP 1: Check current enum values ────────────────────────────────────────
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%pickup%' OR t.typname LIKE '%cab%' OR t.typname LIKE '%time%'
ORDER BY t.typname, e.enumsortorder;

-- ── STEP 2: Check what the pickup_time column type actually is ────────────────
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'cab_bookings' AND column_name = 'pickup_time';

SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'cab_booking_whitelist' AND column_name = 'pickup_time';

-- ── STEP 3: Add '2:30am' to the enum (safe - does not break existing data) ───
-- This works even if '2:30am' already exists (ALTER TYPE ADD VALUE is idempotent in PG 14+)
DO $$
DECLARE
    enum_type_name TEXT;
BEGIN
    -- Find the enum type used by cab_bookings.pickup_time
    SELECT udt_name INTO enum_type_name
    FROM information_schema.columns
    WHERE table_name = 'cab_bookings' AND column_name = 'pickup_time';

    IF enum_type_name IS NOT NULL AND enum_type_name != 'text' AND enum_type_name != 'varchar' THEN
        -- It's an enum type, add the new value
        EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''2:30am''', enum_type_name);
        RAISE NOTICE 'Added 2:30am to enum type: %', enum_type_name;
    ELSE
        RAISE NOTICE 'pickup_time is not an enum (type: %), no ALTER TYPE needed.', enum_type_name;
    END IF;
END $$;

-- ── STEP 4: Update cab_bookings – replace all '3:30am' with '2:30am' ─────────
UPDATE public.cab_bookings
SET pickup_time = '2:30am'
WHERE pickup_time::text = '3:30am';

SELECT 'Updated cab_bookings rows: ' || ROW_COUNT AS status
FROM (SELECT COUNT(*) AS ROW_COUNT FROM public.cab_bookings WHERE pickup_time::text = '2:30am') x;

-- ── STEP 5: Update cab_booking_whitelist – same fix ───────────────────────────
DO $$
DECLARE
    wl_type TEXT;
BEGIN
    SELECT udt_name INTO wl_type
    FROM information_schema.columns
    WHERE table_name = 'cab_booking_whitelist' AND column_name = 'pickup_time';

    IF wl_type IS NOT NULL AND wl_type != 'text' AND wl_type != 'varchar' THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''2:30am''', wl_type);
    END IF;
END $$;

UPDATE public.cab_booking_whitelist
SET pickup_time = '2:30am'
WHERE pickup_time::text = '3:30am';

-- ── STEP 6: Verify – no rows should have '3:30am' anymore ────────────────────
SELECT 
    'cab_bookings' AS table_name,
    COUNT(*) AS remaining_3_30am_rows
FROM public.cab_bookings
WHERE pickup_time::text = '3:30am'
UNION ALL
SELECT 
    'cab_booking_whitelist',
    COUNT(*)
FROM public.cab_booking_whitelist
WHERE pickup_time::text = '3:30am';

-- ── STEP 7: Show final distribution ──────────────────────────────────────────
SELECT pickup_time, COUNT(*) AS count
FROM public.cab_bookings
GROUP BY pickup_time
ORDER BY pickup_time;

SELECT 'Pickup time enum fix completed!' AS status;
