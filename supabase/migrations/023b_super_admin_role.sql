-- Backfilled 2026-04-21 from Supabase (applied 2026-04-09 as version 20260409160152)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'manager', 'coordinator', 'technician'));
