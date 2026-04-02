-- Add 'skipped' to the allowed ticket statuses
ALTER TABLE pm_tickets DROP CONSTRAINT IF EXISTS pm_tickets_status_check;
ALTER TABLE pm_tickets ADD CONSTRAINT pm_tickets_status_check
  CHECK (status IN ('unassigned','assigned','in_progress','completed','billed','skipped'));
