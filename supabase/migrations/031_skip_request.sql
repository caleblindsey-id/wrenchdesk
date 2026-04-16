-- Add skip_requested status and skip request fields to pm_tickets

-- Drop and recreate the status check constraint to include skip_requested
ALTER TABLE pm_tickets DROP CONSTRAINT IF EXISTS pm_tickets_status_check;
ALTER TABLE pm_tickets ADD CONSTRAINT pm_tickets_status_check
  CHECK (status IN ('unassigned', 'assigned', 'in_progress', 'completed', 'billed', 'skipped', 'skip_requested'));

-- Add fields for skip request tracking
ALTER TABLE pm_tickets ADD COLUMN IF NOT EXISTS skip_reason TEXT;
ALTER TABLE pm_tickets ADD COLUMN IF NOT EXISTS skip_previous_status TEXT;
