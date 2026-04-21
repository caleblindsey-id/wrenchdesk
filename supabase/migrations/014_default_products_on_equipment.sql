-- Backfilled 2026-04-21 from Supabase (applied 2026-04-03 as version 20260403194154)
ALTER TABLE equipment ADD COLUMN default_products JSONB DEFAULT '[]'::jsonb;
