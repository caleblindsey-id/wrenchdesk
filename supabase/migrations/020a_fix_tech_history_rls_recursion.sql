-- Backfilled 2026-04-21 from Supabase (applied 2026-04-06 as version 20260406185905)

-- Drop the recursive policy
DROP POLICY IF EXISTS "Technicians read completed tickets for shared equipment" ON pm_tickets;

-- Create a SECURITY DEFINER function to get equipment IDs for the current tech
-- (bypasses RLS, breaking the recursion)
CREATE OR REPLACE FUNCTION get_tech_equipment_ids()
RETURNS SETOF UUID AS $$
  SELECT DISTINCT equipment_id
  FROM pm_tickets
  WHERE assigned_technician_id = auth.uid()
    AND equipment_id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Recreate the policy using the function
CREATE POLICY "Technicians read completed tickets for shared equipment"
  ON pm_tickets FOR SELECT TO authenticated
  USING (
    get_user_role() = 'technician'
    AND status IN ('completed', 'billed')
    AND equipment_id IN (SELECT get_tech_equipment_ids())
  );
