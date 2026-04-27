-- Soft-delete on pm_tickets so deleted PMs survive in the table and block
-- regeneration. Generator's existing dedup query (month + year) returns
-- soft-deleted rows, which blocks them from being re-created.

ALTER TABLE pm_tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE pm_tickets ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id);

-- Live tickets are the common case; index only those rows so the partial
-- index stays small while still accelerating the .is('deleted_at', null) filter.
CREATE INDEX IF NOT EXISTS idx_pm_tickets_live
  ON pm_tickets (month, year)
  WHERE deleted_at IS NULL;
