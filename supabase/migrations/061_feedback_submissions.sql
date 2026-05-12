-- Migration 061: In-app feedback submissions for CallBoard.
--
-- Backs the FAB-driven "Send Feedback" flow. Any authenticated user can submit;
-- only super_admin can read or move cards on the Mission Control Kanban.
-- Compass diagnoses overnight (writes to diagnosis JSONB), morning digest cron
-- emails Caleb the diagnosed batch.
--
-- Design ref: C:\Users\Caleb Lindsey\.claude\plans\i-have-an-idea-happy-lecun.md

-- ---------------------------------------------------------------------------
-- 1. feedback_submissions table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by_id   UUID NOT NULL REFERENCES users(id),
  submitter_role    TEXT NOT NULL,
  submitter_label   TEXT NOT NULL,
  page_url          TEXT,
  user_agent        TEXT,
  category          TEXT NOT NULL CHECK (category IN ('bug','idea','question')),
  body              TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  attachment_path   TEXT,
  status            TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','backlog','in_progress','done','wont_fix')),
  diagnosis         JSONB,
  diagnosis_at      TIMESTAMPTZ,
  diagnosis_error   TEXT,
  digested_at       TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id     UUID REFERENCES users(id)
);

COMMENT ON TABLE feedback_submissions IS
  'In-app feedback from techs/managers/admins. Submissions trusted only when '
  'mediated through /api/feedback (which snapshots role + label server-side).';

COMMENT ON COLUMN feedback_submissions.submitter_role IS
  'Role snapshot at submission time. Snapshot — NOT a live FK — so audit '
  'reflects what the user was when they submitted, even if role changes later.';

COMMENT ON COLUMN feedback_submissions.diagnosis IS
  'Compass diagnosis JSON: { summary, severity, is_duplicate_of, recommendation, suggested_status }. '
  'NULL until the overnight diagnosis cron processes the row.';

COMMENT ON COLUMN feedback_submissions.diagnosis_error IS
  'Set when a diagnosis attempt failed (Claude API down, parse error). '
  'Cleared next time the row diagnoses successfully. Idempotency: cron picks '
  'up rows where diagnosis_at IS NULL regardless of diagnosis_error.';

COMMENT ON COLUMN feedback_submissions.digested_at IS
  'Set by the 7 AM digest cron once the row appears in a sent digest email. '
  'Failed-diagnosis rows stay NULL so they get included again next morning.';

-- Indexes — three read surfaces:
--   * Kanban page filters by status: (status, created_at DESC)
--   * Diagnosis cron scans diagnosis_at IS NULL: (diagnosis_at, created_at) where NULL
--   * Digest cron scans digested_at IS NULL with diagnosis_at NOT NULL
CREATE INDEX IF NOT EXISTS feedback_submissions_status_idx
  ON feedback_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_submissions_undiagnosed_idx
  ON feedback_submissions (created_at)
  WHERE diagnosis_at IS NULL;

CREATE INDEX IF NOT EXISTS feedback_submissions_pending_digest_idx
  ON feedback_submissions (diagnosis_at)
  WHERE digested_at IS NULL AND diagnosis_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger (BEFORE UPDATE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION feedback_submissions_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_submissions_updated_at_trg ON feedback_submissions;
CREATE TRIGGER feedback_submissions_updated_at_trg
  BEFORE UPDATE ON feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION feedback_submissions_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Audit trigger — reuses audit_capture() from migration 058/060.
--    Named zz_audit_*_trg so it fires LAST after the updated_at trigger.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS zz_audit_feedback_submissions_trg ON feedback_submissions;
CREATE TRIGGER zz_audit_feedback_submissions_trg
  AFTER INSERT OR UPDATE OR DELETE ON feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION audit_capture();

-- ---------------------------------------------------------------------------
-- 4. RLS — INSERT for any authenticated user, SELECT/UPDATE for super_admin
--    only. Mutating writes route through admin-client API routes per the
--    Direct-Client + RLS-Only Trap rule. The UPDATE policy exists so the
--    super_admin can still patch via the admin client (service_role bypasses
--    RLS anyway, but explicit policy keeps the table self-documenting).
-- ---------------------------------------------------------------------------
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_authenticated_insert ON feedback_submissions;
CREATE POLICY feedback_submissions_authenticated_insert
  ON feedback_submissions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by_id = auth.uid());

DROP POLICY IF EXISTS feedback_submissions_super_admin_select ON feedback_submissions;
CREATE POLICY feedback_submissions_super_admin_select
  ON feedback_submissions FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- No UPDATE/DELETE policy from the client. All status changes route through
-- /api/feedback/[id] which uses the admin client (service_role bypasses RLS).

-- ---------------------------------------------------------------------------
-- 5. Storage RLS — feedback-attachments bucket
--    Path: {userId}/{timestamp}-{filename}
--    INSERT: authenticated user can upload only into their own {userId} folder
--    SELECT: super_admin only (signed URLs minted server-side from MC)
-- ---------------------------------------------------------------------------
-- Bucket creation lives in the storage admin pane / migration 062 — this
-- migration only sets the policies, so it's safe to re-run if the bucket
-- doesn't exist yet (policies on a non-existent bucket are inert).

DROP POLICY IF EXISTS feedback_attachments_insert ON storage.objects;
CREATE POLICY feedback_attachments_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS feedback_attachments_select ON storage.objects;
CREATE POLICY feedback_attachments_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'feedback-attachments'
    AND get_user_role() = 'super_admin'
  );

-- No UPDATE/DELETE policies from the client. If we ever need to purge old
-- attachments, that happens via the service_role key from a maintenance job.
