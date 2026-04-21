-- Backfilled 2026-04-21 from Supabase (applied 2026-04-09 as version 20260409144042)
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
