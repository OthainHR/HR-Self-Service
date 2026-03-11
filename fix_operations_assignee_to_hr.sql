-- ============================================================================
-- FIX: Reassign all Operations tickets from IT to HR
-- ============================================================================
-- Problem: Operations category tickets (lighting, AC, stationary, printing,
--          supply requests) were being assigned to it@othainsoft.com.
--          They must be handled by HR only (hr@othainsoft.com).
--
-- Run this script in the Supabase SQL Editor once.
-- ============================================================================

-- 1. Verify the current state before changes
SELECT 
    'Before fix - Operations tickets assigned to IT:' AS status,
    COUNT(*) AS count
FROM public.tickets t
WHERE t.category_id IN (
    SELECT id FROM public.categories WHERE LOWER(name) IN ('operations', 'ops')
)
AND t.assignee = (
    SELECT id FROM auth.users WHERE email = 'it@othainsoft.com' LIMIT 1
);

-- 2. Get the HR user ID we will assign to
SELECT 
    'HR user ID:' AS label,
    id AS hr_user_id,
    email
FROM auth.users
WHERE email = 'hr@othainsoft.com'
LIMIT 1;

-- 3. Reassign all Operations tickets currently assigned to IT → HR
UPDATE public.tickets
SET 
    assignee = (SELECT id FROM auth.users WHERE email = 'hr@othainsoft.com' LIMIT 1),
    updated_at = NOW()
WHERE category_id IN (
    SELECT id FROM public.categories WHERE LOWER(name) IN ('operations', 'ops')
)
AND assignee = (
    SELECT id FROM auth.users WHERE email = 'it@othainsoft.com' LIMIT 1
);

-- 4. Also fix any Operations tickets that have no assignee at all
UPDATE public.tickets
SET 
    assignee = (SELECT id FROM auth.users WHERE email = 'hr@othainsoft.com' LIMIT 1),
    updated_at = NOW()
WHERE category_id IN (
    SELECT id FROM public.categories WHERE LOWER(name) IN ('operations', 'ops')
)
AND assignee IS NULL;

-- 5. Verify the fix
SELECT 
    'After fix - Operations tickets assigned to HR:' AS status,
    COUNT(*) AS count
FROM public.tickets t
WHERE t.category_id IN (
    SELECT id FROM public.categories WHERE LOWER(name) IN ('operations', 'ops')
)
AND t.assignee = (
    SELECT id FROM auth.users WHERE email = 'hr@othainsoft.com' LIMIT 1
);

-- 6. Confirm no Operations tickets remain assigned to IT
SELECT 
    'Operations tickets still assigned to IT (should be 0):' AS status,
    COUNT(*) AS count
FROM public.tickets t
WHERE t.category_id IN (
    SELECT id FROM public.categories WHERE LOWER(name) IN ('operations', 'ops')
)
AND t.assignee = (
    SELECT id FROM auth.users WHERE email = 'it@othainsoft.com' LIMIT 1
);

-- 7. Show a breakdown of all Operations tickets by sub-category and assignee email
SELECT
    c.name  AS category,
    sc.name AS sub_category,
    u.email AS assigned_to,
    COUNT(*) AS ticket_count
FROM public.tickets t
LEFT JOIN public.categories  c  ON c.id  = t.category_id
LEFT JOIN public.sub_categories sc ON sc.id = t.sub_category_id
LEFT JOIN auth.users         u  ON u.id  = t.assignee
WHERE LOWER(c.name) IN ('operations', 'ops')
GROUP BY c.name, sc.name, u.email
ORDER BY sc.name;

SELECT 'Operations reassignment to HR complete!' AS status;
