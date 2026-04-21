-- Backfilled 2026-04-21 from Supabase (applied 2026-04-09 as version 20260409162753)

-- Fix all RLS policies to include super_admin role

-- users: super_admin can manage all users (same as manager)
DROP POLICY IF EXISTS "Managers manage users" ON users;
CREATE POLICY "Managers manage users" ON users
  FOR ALL USING (get_user_role() = ANY (ARRAY['super_admin', 'manager']));

-- equipment: super_admin gets full staff access
DROP POLICY IF EXISTS "Staff manage equipment" ON equipment;
CREATE POLICY "Staff manage equipment" ON equipment
  FOR ALL USING (get_user_role() = ANY (ARRAY['super_admin', 'manager', 'coordinator']));

-- equipment_prospects: super_admin gets full staff access
DROP POLICY IF EXISTS "Staff manage equipment_prospects" ON equipment_prospects;
CREATE POLICY "Staff manage equipment_prospects" ON equipment_prospects
  FOR ALL USING (get_user_role() = ANY (ARRAY['super_admin', 'manager', 'coordinator']));

-- pm_schedules: super_admin gets full staff access
DROP POLICY IF EXISTS "Staff manage schedules" ON pm_schedules;
CREATE POLICY "Staff manage schedules" ON pm_schedules
  FOR ALL USING (get_user_role() = ANY (ARRAY['super_admin', 'manager', 'coordinator']));

-- pm_tickets: super_admin gets full staff access
DROP POLICY IF EXISTS "Staff manage tickets" ON pm_tickets;
CREATE POLICY "Staff manage tickets" ON pm_tickets
  FOR ALL USING (get_user_role() = ANY (ARRAY['super_admin', 'manager', 'coordinator']));

-- settings: fix broken subquery referencing users table, add super_admin
DROP POLICY IF EXISTS "Managers can update settings" ON settings;
CREATE POLICY "Managers can update settings" ON settings
  FOR ALL USING (get_user_role() = ANY (ARRAY['super_admin', 'manager', 'coordinator']));

-- sync_log: super_admin can read
DROP POLICY IF EXISTS "Staff read sync_log" ON sync_log;
CREATE POLICY "Staff read sync_log" ON sync_log
  FOR SELECT USING (get_user_role() = ANY (ARRAY['super_admin', 'manager', 'coordinator']));

-- technician_targets: super_admin gets full staff access
DROP POLICY IF EXISTS "Staff manage technician_targets" ON technician_targets;
CREATE POLICY "Staff manage technician_targets" ON technician_targets
  FOR ALL USING (get_user_role() = ANY (ARRAY['super_admin', 'manager', 'coordinator']));
