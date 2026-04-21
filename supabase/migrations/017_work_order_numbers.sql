-- Backfilled 2026-04-21 from Supabase (applied 2026-04-03 as version 20260403195531)

-- Create sequence
CREATE SEQUENCE pm_tickets_wo_seq START 1;

-- Add column without default first (avoids conflict during backfill)
ALTER TABLE pm_tickets ADD COLUMN work_order_number INTEGER UNIQUE;

-- Backfill existing tickets in creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at)::INTEGER AS rn
  FROM pm_tickets
)
UPDATE pm_tickets SET work_order_number = numbered.rn
FROM numbered WHERE pm_tickets.id = numbered.id;

-- Advance sequence past existing tickets
SELECT setval('pm_tickets_wo_seq', COALESCE((SELECT MAX(work_order_number) FROM pm_tickets), 0));

-- Now set the default for future inserts
ALTER TABLE pm_tickets ALTER COLUMN work_order_number SET DEFAULT nextval('pm_tickets_wo_seq');
