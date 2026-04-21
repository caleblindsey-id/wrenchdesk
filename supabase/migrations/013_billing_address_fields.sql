-- Backfilled 2026-04-21 from Supabase (applied 2026-04-03 as version 20260403192148)
ALTER TABLE customers
  ADD COLUMN billing_city TEXT,
  ADD COLUMN billing_state TEXT,
  ADD COLUMN billing_zip TEXT;
