-- ============================================================================
-- FIX: Enforce strict per-department ticket visibility
-- ============================================================================
-- Problem: HR can see IT/Accounts tickets, IT can see HR tickets etc.
--          The blanket email list gave all admin emails access to ALL tickets.
--
-- Rule:
--   hr@othainsoft.com       → HR Requests + Operations only
--   it@othainsoft.com       → IT Requests only
--   accounts@othainsoft.com → Accounts + Payroll + Expense only
--   ai@othainsoft.com       → AI Requests only
--   operations@othainsoft.com → Operations only
--   tickets@othainsoft.com  → ALL (super-admin mailbox)
--
-- Run this script in the Supabase SQL Editor.
-- ============================================================================

-- ── Drop all existing ticket policies ────────────────────────────────────────
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
    -- Requester sees their own tickets
    requested_by = auth.uid()

    -- Assignee sees tickets assigned to them
    OR assignee = auth.uid()

    -- tickets@ is a super-admin mailbox – sees everything
    OR lower(auth.jwt() ->> 'email') = 'tickets@othainsoft.com'

    -- hr@ sees HR Requests + Operations only
    OR (
        lower(auth.jwt() ->> 'email') = 'hr@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests','hr','hr support',
                                    'operations','ops')
        )
    )

    -- it@ sees IT Requests only
    OR (
        lower(auth.jwt() ->> 'email') = 'it@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests','it','it support')
        )
    )

    -- accounts@ sees Accounts + Payroll + Expense only
    OR (
        lower(auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('accounts','accounts support','accounts requests',
                                    'payroll','payroll requests','tax payments',
                                    'expense management','expense','expenses')
        )
    )

    -- operations@ sees Operations only
    OR (
        lower(auth.jwt() ->> 'email') = 'operations@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations','ops')
        )
    )

    -- ai@ sees AI Requests only
    OR (
        lower(auth.jwt() ->> 'email') = 'ai@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests','ai','ai request','general ai request')
        )
    )

    -- Role-based access (same category restrictions)
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests','hr','hr support','operations','ops')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests','it','it support')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('accounts','accounts support','accounts requests',
                                    'payroll','payroll requests','tax payments',
                                    'expense management','expense','expenses')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations','ops')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests','ai','ai request','general ai request')
        )
    )

    -- Users in additional emails for this ticket
    OR user_in_additional_emails(id, auth.uid())

    -- Global admin sees everything
    OR (auth.jwt() ->> 'role') = 'admin'
);

-- ── INSERT policy ─────────────────────────────────────────────────────────────
CREATE POLICY "tickets_insert_policy" ON public.tickets
FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    OR (auth.jwt() ->> 'role') IN ('admin','it_admin','hr_admin',
                                    'payroll_admin','operations_admin','ai_admin')
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
    OR lower(auth.jwt() ->> 'email') = 'tickets@othainsoft.com'

    OR (
        lower(auth.jwt() ->> 'email') = 'hr@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests','hr','hr support','operations','ops')
        )
    )
    OR (
        lower(auth.jwt() ->> 'email') = 'it@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests','it','it support')
        )
    )
    OR (
        lower(auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('accounts','accounts support','accounts requests',
                                    'payroll','payroll requests','tax payments',
                                    'expense management','expense','expenses')
        )
    )
    OR (
        lower(auth.jwt() ->> 'email') = 'operations@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations','ops')
        )
    )
    OR (
        lower(auth.jwt() ->> 'email') = 'ai@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests','ai','ai request','general ai request')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests','hr','hr support','operations','ops')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests','it','it support')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('accounts','accounts support','accounts requests',
                                    'payroll','payroll requests','tax payments',
                                    'expense management','expense','expenses')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations','ops')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests','ai','ai request','general ai request')
        )
    )
    OR user_in_additional_emails(id, auth.uid())
    OR (auth.jwt() ->> 'role') = 'admin'
) WITH CHECK (
    requested_by = auth.uid()
    OR assignee   = auth.uid()
    OR lower(auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (
        lower(auth.jwt() ->> 'email') = 'hr@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests','hr','hr support','operations','ops')
        )
    )
    OR (
        lower(auth.jwt() ->> 'email') = 'it@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests','it','it support')
        )
    )
    OR (
        lower(auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('accounts','accounts support','accounts requests',
                                    'payroll','payroll requests','tax payments',
                                    'expense management','expense','expenses')
        )
    )
    OR (
        lower(auth.jwt() ->> 'email') = 'operations@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations','ops')
        )
    )
    OR (
        lower(auth.jwt() ->> 'email') = 'ai@othainsoft.com'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests','ai','ai request','general ai request')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('hr requests','hr','hr support','operations','ops')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('it requests','it','it support')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('accounts','accounts support','accounts requests',
                                    'payroll','payroll requests','tax payments',
                                    'expense management','expense','expenses')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('operations','ops')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND LOWER(c.name) IN ('ai requests','ai','ai request','general ai request')
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

-- ── Verify all policies ───────────────────────────────────────────────────────
SELECT policyname, cmd AS operation
FROM pg_policies
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;

SELECT 'Strict per-department RLS applied successfully!' AS status;
