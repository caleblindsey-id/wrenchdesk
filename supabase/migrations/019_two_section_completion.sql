-- Migration 019: Two-section ticket completion
-- Adds additional work fields (parts + labor not covered under PM agreement)
-- Removes service request infrastructure (parent_ticket_id, ticket_type)

-- Add new columns for additional work section
ALTER TABLE pm_tickets ADD COLUMN IF NOT EXISTS additional_parts_used JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pm_tickets ADD COLUMN IF NOT EXISTS additional_hours_worked DECIMAL(5,2);

-- Remove service request columns (no service request tickets exist)
ALTER TABLE pm_tickets DROP COLUMN IF EXISTS parent_ticket_id;
ALTER TABLE pm_tickets DROP COLUMN IF EXISTS ticket_type;
