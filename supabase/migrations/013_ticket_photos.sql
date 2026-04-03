-- Add photos array to pm_tickets for technician work documentation
ALTER TABLE pm_tickets
  ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;
