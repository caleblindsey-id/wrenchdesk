-- Backfilled 2026-04-21 from Supabase (applied 2026-04-03 as version 20260403195240)
ALTER TABLE equipment
  ADD COLUMN contact_name TEXT,
  ADD COLUMN contact_email TEXT,
  ADD COLUMN contact_phone TEXT;
