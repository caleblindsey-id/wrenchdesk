-- Migration 064: Audit columns for "approve & email rep" on equipment leads.
--
-- Captures the rep we forwarded the lead to and Mandrill's message id, so
-- the same lead can't be silently re-forwarded and we have a trail.

ALTER TABLE tech_leads
  ADD COLUMN emailed_to_rep_id      UUID
    REFERENCES sales_reps(id),
  ADD COLUMN emailed_to_rep_at      TIMESTAMPTZ,
  ADD COLUMN email_rep_message_id   TEXT;

COMMENT ON COLUMN tech_leads.emailed_to_rep_id IS
  'Sales rep this lead was forwarded to at approval time. Idempotency guard '
  'for /api/tech-leads/[id]/approve-and-email — non-NULL = already sent.';
