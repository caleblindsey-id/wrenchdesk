-- Backfilled 2026-04-21 from Supabase (applied 2026-04-03 as version 20260403194811)
ALTER TABLE pm_tickets
  ADD COLUMN po_number TEXT,
  ADD COLUMN billing_contact_name TEXT,
  ADD COLUMN billing_contact_email TEXT,
  ADD COLUMN billing_contact_phone TEXT;
