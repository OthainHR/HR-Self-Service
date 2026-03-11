-- ============================================================================
-- FIX TICKET ASSIGNMENT
-- Paste this entire script into Supabase → SQL Editor and click "Run"
-- ============================================================================

-- ── STEP 1: Verify the categories table and names ────────────────────────────
SELECT id, name FROM public.categories ORDER BY id;

-- ── STEP 2: Recreate helper view (safe to re-run) ────────────────────────────
CREATE OR REPLACE VIEW public.v_user_emails AS
SELECT id, email
FROM auth.users
WHERE email IS NOT NULL;

ALTER VIEW public.v_user_emails OWNER TO postgres;
GRANT SELECT ON public.v_user_emails TO authenticated;
GRANT SELECT ON public.v_user_emails TO anon;

-- ── STEP 3: Recreate helper function ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id
        FROM auth.users
        WHERE email = user_email
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO authenticated;

-- ── STEP 4: Confirm admin user IDs resolve correctly ─────────────────────────
SELECT 'it@othainsoft.com'       AS email, get_user_id_by_email('it@othainsoft.com')       AS user_id
UNION ALL
SELECT 'hr@othainsoft.com',       get_user_id_by_email('hr@othainsoft.com')
UNION ALL
SELECT 'accounts@othainsoft.com', get_user_id_by_email('accounts@othainsoft.com')
UNION ALL
SELECT 'sunhith.reddy@othainsoft.com', get_user_id_by_email('sunhith.reddy@othainsoft.com');

-- ── STEP 5: Assign tickets that currently have no assignee ────────────────────
UPDATE public.tickets
SET assignee = CASE
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'it requests'        LIMIT 1)
        THEN get_user_id_by_email('it@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'it'                 LIMIT 1)
        THEN get_user_id_by_email('it@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'hr requests'        LIMIT 1)
        THEN get_user_id_by_email('hr@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'hr'                 LIMIT 1)
        THEN get_user_id_by_email('hr@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'expense management' LIMIT 1)
        THEN get_user_id_by_email('accounts@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'expenses'           LIMIT 1)
        THEN get_user_id_by_email('accounts@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'payroll requests'   LIMIT 1)
        THEN get_user_id_by_email('accounts@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'payroll'            LIMIT 1)
        THEN get_user_id_by_email('accounts@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'operations'         LIMIT 1)
        THEN get_user_id_by_email('hr@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'ops'                LIMIT 1)
        THEN get_user_id_by_email('hr@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'ai requests'        LIMIT 1)
        THEN get_user_id_by_email('sunhith.reddy@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.categories WHERE LOWER(name) = 'ai'                 LIMIT 1)
        THEN get_user_id_by_email('sunhith.reddy@othainsoft.com')
    ELSE assignee
END
WHERE assignee IS NULL;

-- ── STEP 6: Fix any Operations tickets wrongly assigned to IT ─────────────────
UPDATE public.tickets
SET
    assignee   = get_user_id_by_email('hr@othainsoft.com'),
    updated_at = NOW()
WHERE category_id IN (
    SELECT id FROM public.categories WHERE LOWER(name) IN ('operations', 'ops')
)
AND assignee = get_user_id_by_email('it@othainsoft.com');

-- ── STEP 7: Verify final assignment breakdown ────────────────────────────────
SELECT
    c.name                              AS category,
    u.email                             AS assigned_to,
    COUNT(t.id)                         AS ticket_count
FROM public.tickets t
LEFT JOIN public.categories c ON c.id = t.category_id
LEFT JOIN auth.users        u ON u.id = t.assignee
GROUP BY c.name, u.email
ORDER BY c.name, u.email;

SELECT 'Ticket assignment fix completed!' AS status;
