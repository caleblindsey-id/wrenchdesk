-- Replace frequency enum with interval_months + anchor_month
-- interval_months: how often the PM runs (1=monthly, 2=every 2 months, etc.)
-- anchor_month: which month the cycle starts from (1=January, 2=February, etc.)
-- Logic: PM runs when (month - anchor_month) % interval_months = 0 (mod 12)

ALTER TABLE pm_schedules
  DROP COLUMN IF EXISTS frequency,
  ADD COLUMN interval_months INT NOT NULL DEFAULT 3 CHECK (interval_months BETWEEN 1 AND 12),
  ADD COLUMN anchor_month    INT NOT NULL DEFAULT 1 CHECK (anchor_month BETWEEN 1 AND 12);

-- Drop the enum if it exists
DROP TYPE IF EXISTS pm_frequency;
