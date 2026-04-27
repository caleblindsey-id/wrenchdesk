-- Migration 044: Auth, Roles & RLS hardening (QC pass — section 1)
-- See projects/callboard-qc/section-1-auth-roles-rls.md in the Compass repo for findings.
--
-- Changes:
-- 1. Mark get_user_role() STABLE (was VOLATILE — recomputed per row in policies). [MIG-3]
-- 2. Drop stale "Staff read users" policy from migration 002 (duplicates 024 coverage). [MIG-4]
-- 3. Replace "Managers manage users" with split policies + WITH CHECK to block manager → super_admin escalation. [MGR-1]
-- 4. Add explicit broad SELECT on users so coordinators/techs retain directory visibility after dropping the stale policy.
-- 5. Tighten "Authenticated insert equipment_notes" to require user_id = auth.uid(). [EN-1]
-- 6. Scope "service_tickets_tech_select" completed/billed visibility to equipment the tech has been assigned to. [ST-1]

-- ---------------------------------------------------------------------------
-- 1. STABLE volatility on get_user_role() (planner can cache per-statement)
--    auth.uid() is stable in a transaction; users.role does not change mid-statement.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 2. Drop the stale "Staff read users" policy (originally added in migration 002).
--    Replaced by the explicit users_select_all policy below.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff read users" ON users;

-- ---------------------------------------------------------------------------
-- 3+4. Replace "Managers manage users" with hardened policies.
--      WITH CHECK prevents a manager from updating any user (themselves or
--      others) to role='super_admin' via direct Supabase calls.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Managers manage users" ON users;

-- All authenticated users can read the users directory (names, emails, roles
-- are visible across the org — this matches existing app behavior and avoids
-- session collapse when other roles try to resolve assigned_technician_id, etc.)
CREATE POLICY users_select_all
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- super_admin can insert any role; manager can only insert non-super_admin roles.
CREATE POLICY users_insert
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'super_admin'
    OR (get_user_role() = 'manager' AND role IN ('manager', 'coordinator', 'technician'))
  );

-- super_admin can update any user to any role; manager can only set role to non-super_admin values.
-- (Self-modification is additionally blocked at the API layer in /api/users/[id].)
CREATE POLICY users_update
  ON users FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'manager')
  )
  WITH CHECK (
    get_user_role() = 'super_admin'
    OR (get_user_role() = 'manager' AND role IN ('manager', 'coordinator', 'technician'))
  );

-- Only super_admin can delete users.
CREATE POLICY users_delete
  ON users FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- ---------------------------------------------------------------------------
-- 5. Tighten equipment_notes INSERT — require user_id = auth.uid().
--    Prevents impersonation (writing a note as another user) at the DB layer.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated insert equipment_notes" ON equipment_notes;
CREATE POLICY "Authenticated insert equipment_notes"
  ON equipment_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Scope service_tickets_tech_select to equipment the tech has been assigned to.
--    Mirrors the pm_tickets policy pattern (see migration 020a).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS service_tickets_tech_select ON service_tickets;
CREATE POLICY service_tickets_tech_select ON service_tickets
  FOR SELECT
  USING (
    get_user_role() = 'technician'
    AND (
      assigned_technician_id = auth.uid()
      OR (
        status IN ('completed', 'billed')
        AND equipment_id IN (SELECT get_tech_equipment_ids())
      )
    )
  );
