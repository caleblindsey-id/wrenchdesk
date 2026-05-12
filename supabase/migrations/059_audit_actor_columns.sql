-- Migration 059: Row-level actor columns + trigger fallback for audit attribution.
--
-- Migration 058 installed the audit_events table and trigger but admin-client
-- writes (the ~7 routes that use createAdminClient() to bypass RLS) had no
-- way to attribute their changes — auth.uid() is NULL under the service-role
-- JWT, so every admin-client write was logging as actor_type='system'
-- actor_label='unattributed'.
--
-- The plan originally called for SECURITY DEFINER RPCs per write path that
-- would SET LOCAL app.acting_user_id before the write. That works but forces
-- duplicating each route's validation logic (FK checks, error mapping,
-- conditional writes) into plpgsql. Sidestepping with a simpler approach:
-- add updated_by_id / created_by_id columns to each audited table and have
-- the trigger fall back to those when the session-level GUC and auth.uid()
-- are both NULL. API routes just include one extra field in their write
-- payload — no RPC dance required.
--
-- Order of preference for actor_id in audit_capture():
--   1. current_setting('app.acting_user_id') — set by cascading SECURITY
--      DEFINER functions (e.g. earn_tech_lead_on_pm_completion) inside the
--      same transaction.
--   2. auth.uid() — present for user-client writes.
--   3. NEW.updated_by_id (UPDATE) / NEW.created_by_id (INSERT) /
--      NEW.deleted_by_id (pm_tickets soft-delete) — populated by admin-client
--      API routes.
--   4. NULL — actor_type='system', actor_label='unattributed'.

-- ---------------------------------------------------------------------------
-- 1. Add updated_by_id (and created_by_id where missing) to audited tables
-- ---------------------------------------------------------------------------
ALTER TABLE service_tickets   ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES users(id);
ALTER TABLE pm_tickets        ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES users(id);
ALTER TABLE equipment         ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES users(id);
ALTER TABLE equipment         ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id);
ALTER TABLE pm_schedules      ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES users(id);
ALTER TABLE pm_schedules      ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id);
ALTER TABLE customers         ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES users(id);
ALTER TABLE customers         ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id);
ALTER TABLE users             ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES users(id);
ALTER TABLE users             ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id);
-- parts_order_queue is a view (migration 036), so no columns can be added.
-- Parts changes are captured via pm_tickets / service_tickets parts_requested
-- diffs in their respective audit rows.

COMMENT ON COLUMN service_tickets.updated_by_id IS
  'Set by API routes on each PATCH so the audit trigger can attribute admin-client writes.';
COMMENT ON COLUMN pm_tickets.updated_by_id IS
  'Set by API routes on each PATCH so the audit trigger can attribute admin-client writes.';
COMMENT ON COLUMN equipment.updated_by_id IS
  'Set by API routes on each PATCH so the audit trigger can attribute admin-client writes.';
COMMENT ON COLUMN equipment.created_by_id IS
  'Set by API routes on POST so the audit trigger can attribute admin-client inserts.';

-- ---------------------------------------------------------------------------
-- 2. Replace audit_capture() with row-level fallback chain
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_capture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_set_actor     TEXT  := current_setting('app.acting_user_id', true);
  v_set_type      TEXT  := current_setting('app.actor_type', true);
  v_set_label     TEXT  := current_setting('app.actor_label', true);
  v_set_source    TEXT  := current_setting('app.audit_source', true);
  v_actor         UUID;
  v_actor_type    TEXT;
  v_actor_label   TEXT;
  v_action        TEXT  := lower(TG_OP);
  v_changes       JSONB;
  v_denylist      TEXT[] := ARRAY[
                              'updated_at',
                              'updated_by_id',         -- attribution metadata, not domain data
                              'customer_signature'     -- base64 blob — too large to diff
                            ];
  v_entity_id     TEXT;
  v_row_jsonb     JSONB;     -- the row we'll read attribution columns from
BEGIN
  -- Resolve actor from session GUC if set.
  IF v_set_actor IS NOT NULL AND v_set_actor <> '' THEN
    BEGIN
      v_actor := v_set_actor::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_actor := NULL;
    END;
  ELSE
    v_actor := auth.uid();
  END IF;

  -- Equipment-specific denylist: ship_to_location_id is already tracked in
  -- equipment_location_history (migration 049). Skip it here.
  IF TG_TABLE_NAME = 'equipment' THEN
    v_denylist := v_denylist || ARRAY['ship_to_location_id'];
  END IF;

  -- Soft-delete detection on pm_tickets.
  IF TG_TABLE_NAME = 'pm_tickets'
     AND TG_OP = 'UPDATE'
     AND (OLD).deleted_at IS NULL
     AND (NEW).deleted_at IS NOT NULL THEN
    v_action := 'delete';
  END IF;

  -- Pick the right row jsonb for attribution + entity_id derivation.
  IF TG_OP = 'DELETE' THEN
    v_row_jsonb := to_jsonb(OLD);
  ELSE
    v_row_jsonb := to_jsonb(NEW);
  END IF;

  v_entity_id := v_row_jsonb ->> 'id';

  -- Fall back to row-level actor columns if neither GUC nor auth.uid()
  -- gave us an actor. Order: updated_by_id, created_by_id, deleted_by_id.
  IF v_actor IS NULL THEN
    BEGIN
      v_actor := NULLIF(v_row_jsonb ->> 'updated_by_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN v_actor := NULL;
    END;
  END IF;
  IF v_actor IS NULL AND TG_OP = 'INSERT' THEN
    BEGIN
      v_actor := NULLIF(v_row_jsonb ->> 'created_by_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN v_actor := NULL;
    END;
  END IF;
  IF v_actor IS NULL AND v_action = 'delete' AND TG_TABLE_NAME = 'pm_tickets' THEN
    BEGIN
      v_actor := NULLIF(v_row_jsonb ->> 'deleted_by_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN v_actor := NULL;
    END;
  END IF;

  -- Resolve actor_type / actor_label.
  IF v_set_type IS NOT NULL AND v_set_type <> '' THEN
    v_actor_type := v_set_type;
  ELSIF v_actor IS NOT NULL THEN
    v_actor_type := 'user';
  ELSE
    v_actor_type := 'system';
  END IF;

  IF v_set_label IS NOT NULL AND v_set_label <> '' THEN
    v_actor_label := v_set_label;
  ELSIF v_actor_type = 'system' AND v_actor IS NULL THEN
    v_actor_label := 'unattributed';
  ELSE
    v_actor_label := NULL;
  END IF;

  -- Build the changes payload.
  IF TG_OP = 'INSERT' THEN
    v_changes := (to_jsonb(NEW)) - v_denylist;
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := (to_jsonb(OLD)) - v_denylist;
  ELSE
    SELECT coalesce(
             jsonb_object_agg(key, jsonb_build_object('old', o.value, 'new', n.value)),
             '{}'::jsonb
           )
      INTO v_changes
    FROM jsonb_each(to_jsonb(OLD)) o
    JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
    WHERE o.value IS DISTINCT FROM n.value
      AND key <> ALL(v_denylist);

    IF v_changes = '{}'::jsonb THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO audit_events (
    entity_type, entity_id, action,
    actor_type, changed_by, actor_label,
    changes, context
  ) VALUES (
    TG_TABLE_NAME, v_entity_id, v_action,
    v_actor_type,
    CASE WHEN v_actor_type = 'user' THEN v_actor ELSE NULL END,
    v_actor_label,
    v_changes,
    CASE WHEN v_set_source IS NULL OR v_set_source = '' THEN NULL
         ELSE jsonb_build_object('source', v_set_source)
    END
  );

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION audit_capture() IS
  'Generic AFTER INSERT/UPDATE/DELETE trigger. Writes one row to audit_events '
  'per meaningful change. Actor resolution: app.acting_user_id GUC -> auth.uid() '
  '-> NEW.updated_by_id / NEW.created_by_id / NEW.deleted_by_id (pm_tickets only) '
  '-> NULL (actor_type=system, actor_label=unattributed).';
