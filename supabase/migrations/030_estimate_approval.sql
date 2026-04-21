-- 030_estimate_approval.sql
-- Adds columns for customer estimate approval flow

ALTER TABLE service_tickets
  ADD COLUMN approval_token TEXT UNIQUE,
  ADD COLUMN approval_token_expires_at TIMESTAMPTZ,
  ADD COLUMN estimate_signature TEXT,
  ADD COLUMN estimate_signature_name VARCHAR,
  ADD COLUMN decline_reason TEXT;
