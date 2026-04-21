-- 034_parts_validation_status.sql
-- Adds per-part validation status for the nightly Synergy item-number check.
-- Values: 'valid' (all parts' item #s match Synergy order lines),
--         'partial' (some match, some do not),
--         'invalid' (no parts match),
--         NULL (not yet validated or no parts requested).
-- Order-level validation continues to live in synergy_validation_status.

ALTER TABLE pm_tickets
  ADD COLUMN IF NOT EXISTS parts_validation_status TEXT;

ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS parts_validation_status TEXT;
