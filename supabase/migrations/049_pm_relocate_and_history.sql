-- Migration 049: Tech-initiated equipment relocation on PM tickets.
--
-- Techs working a PM in the field sometimes find that the customer has moved
-- the equipment to a different ship-to since the last visit. Today they have
-- no way to correct it — they tell the office, the office updates Synergy,
-- the next sync corrects equipment.ship_to_location_id, and meanwhile the
-- current PM ticket and any future PMs render the wrong site.
--
-- This migration adds three pieces:
--   1. pm_tickets.ship_to_location_id — snapshot column so the PM ticket
--      remembers WHERE it was actually serviced. Backfilled from the equipment
--      row at migration time.
--   2. equipment_location_history — append-only log of every relocate, who
--      did it, when, and which PM it was tied to. Replaces the silent overwrite
--      pattern that left no audit trail.
--   3. ship_to_requests — queue for techs who need a new ship-to created.
--      Office staff resolve these by adding the location in Synergy and
--      marking the request resolved.
--
-- The atomic relocate flow is wrapped in relocate_equipment_for_pm(), a
-- SECURITY DEFINER function. EXECUTE is granted to service_role only so it
-- can only be invoked from the API route via the admin client. Calling the
-- RPC under a tech's auth context would trip the equipment_tech_field_lock
-- trigger from migration 048 (which intentionally blocks tech writes to
-- ship_to_location_id). Routing through service_role is the deliberate
-- escape hatch for this single, audited workflow.

-- ---------------------------------------------------------------------------
-- 1. pm_tickets.ship_to_location_id (snapshot)
-- ---------------------------------------------------------------------------
ALTER TABLE pm_tickets
  ADD COLUMN IF NOT EXISTS ship_to_location_id INTEGER
    REFERENCES ship_to_locations(id);

CREATE INDEX IF NOT EXISTS idx_pm_tickets_ship_to
  ON pm_tickets(ship_to_location_id)
  WHERE ship_to_location_id IS NOT NULL;

COMMENT ON COLUMN pm_tickets.ship_to_location_id IS
  'Snapshot of the ship-to where this PM is being / was serviced. NULL means '
  'the ticket inherits from equipment.ship_to_location_id (the legacy behavior '
  'before migration 049). The detail page reads this column first and falls back '
  'to the equipment row when NULL.';

-- Backfill live tickets from the current equipment row. This is a best-effort
-- snapshot — for tickets completed long ago we cannot reconstruct historical
-- locations, but the live work-in-flight tickets get the correct value.
UPDATE pm_tickets pt
SET ship_to_location_id = e.ship_to_location_id
FROM equipment e
WHERE pt.equipment_id = e.id
  AND pt.ship_to_location_id IS NULL
  AND e.ship_to_location_id IS NOT NULL
  AND pt.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. equipment_location_history — audit trail of equipment relocations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_location_history (
  id                 BIGSERIAL PRIMARY KEY,
  equipment_id       UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  from_ship_to_id    INTEGER REFERENCES ship_to_locations(id),
  to_ship_to_id      INTEGER NOT NULL REFERENCES ship_to_locations(id),
  changed_by         UUID NOT NULL REFERENCES users(id),
  changed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  pm_ticket_id       UUID REFERENCES pm_tickets(id) ON DELETE SET NULL,
  service_ticket_id  UUID REFERENCES service_tickets(id) ON DELETE SET NULL,
  note               TEXT
);

CREATE INDEX IF NOT EXISTS idx_equipment_location_history_equipment
  ON equipment_location_history(equipment_id, changed_at DESC);

ALTER TABLE equipment_location_history ENABLE ROW LEVEL SECURITY;

-- Read access for any authenticated user. Tightly-scoped writes happen only
-- through relocate_equipment_for_pm() (service_role) — no INSERT policy is
-- defined for the authenticated role, so direct supabase-js writes are blocked.
CREATE POLICY equipment_location_history_select
  ON equipment_location_history FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 3. ship_to_requests — tech-flagged "we need a new ship-to here"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ship_to_requests (
  id                   BIGSERIAL PRIMARY KEY,
  customer_id          INTEGER NOT NULL REFERENCES customers(id),
  requested_by         UUID NOT NULL REFERENCES users(id),
  pm_ticket_id         UUID REFERENCES pm_tickets(id) ON DELETE SET NULL,
  equipment_id         UUID REFERENCES equipment(id) ON DELETE SET NULL,
  note                 TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','resolved','dismissed')),
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at          TIMESTAMPTZ,
  resolved_ship_to_id  INTEGER REFERENCES ship_to_locations(id),
  resolved_by          UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ship_to_requests_status
  ON ship_to_requests(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_ship_to_requests_customer
  ON ship_to_requests(customer_id, requested_at DESC);

ALTER TABLE ship_to_requests ENABLE ROW LEVEL SECURITY;

-- Techs see only their own requests; managers/coordinators/super_admin see all.
CREATE POLICY ship_to_requests_select
  ON ship_to_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR get_user_role() IN ('manager','coordinator','super_admin')
  );

-- Any authenticated user can insert a request for themselves only. The API
-- route additionally validates customer/equipment/PM ownership, but the
-- requested_by = auth.uid() check here is the DB-level anti-impersonation
-- guard.
CREATE POLICY ship_to_requests_insert
  ON ship_to_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Only manager/coordinator/super_admin can resolve or dismiss requests.
CREATE POLICY ship_to_requests_update
  ON ship_to_requests FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('manager','coordinator','super_admin'))
  WITH CHECK (get_user_role() IN ('manager','coordinator','super_admin'));

-- ---------------------------------------------------------------------------
-- 4. relocate_equipment_for_pm — atomic relocate RPC
-- ---------------------------------------------------------------------------
-- Wraps three writes in one transaction: pm_tickets snapshot, equipment home
-- update, and the history insert. SECURITY DEFINER lets it run as the function
-- owner (which inherits from the migration runner — typically postgres). With
-- EXECUTE granted to service_role only, the only legitimate caller is the
-- /api/tickets/[id]/relocate route via the admin client.
--
-- Validations (each raises P0001):
--   - PM ticket exists, is live (deleted_at IS NULL), is not in a terminal
--     status (completed / billed / skipped).
--   - Target ship-to belongs to the SAME customer as the PM ticket.
--   - Target ship-to differs from the current equipment ship-to (no-op guard).
CREATE OR REPLACE FUNCTION relocate_equipment_for_pm(
  p_pm_ticket_id   UUID,
  p_to_ship_to_id  INTEGER,
  p_actor          UUID,
  p_note           TEXT DEFAULT NULL
)
RETURNS equipment_location_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_equipment_id   UUID;
  v_ticket_status  TEXT;
  v_ticket_deleted TIMESTAMPTZ;
  v_ticket_cust    INT;
  v_target_cust    INT;
  v_from_ship_to   INTEGER;
  v_history        equipment_location_history;
BEGIN
  -- 1. Lookup ticket. Lock the row so concurrent relocates serialize.
  SELECT equipment_id, status, deleted_at, customer_id
    INTO v_equipment_id, v_ticket_status, v_ticket_deleted, v_ticket_cust
  FROM pm_tickets
  WHERE id = p_pm_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PM ticket not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_ticket_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot relocate a deleted PM ticket' USING ERRCODE = 'P0001';
  END IF;

  IF v_ticket_status IN ('completed','billed','skipped') THEN
    RAISE EXCEPTION 'Cannot relocate equipment on a % PM ticket', v_ticket_status
      USING ERRCODE = 'P0001';
  END IF;

  IF v_equipment_id IS NULL THEN
    RAISE EXCEPTION 'PM ticket has no associated equipment' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Validate target ship-to belongs to the same customer.
  SELECT customer_id INTO v_target_cust
  FROM ship_to_locations
  WHERE id = p_to_ship_to_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target ship-to not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_target_cust IS DISTINCT FROM v_ticket_cust THEN
    RAISE EXCEPTION 'Target ship-to belongs to a different customer'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Capture current equipment ship-to (for history "from").
  SELECT ship_to_location_id INTO v_from_ship_to
  FROM equipment
  WHERE id = v_equipment_id
  FOR UPDATE;

  IF v_from_ship_to IS NOT DISTINCT FROM p_to_ship_to_id THEN
    RAISE EXCEPTION 'Equipment is already at this ship-to' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Stamp the PM ticket. (RLS bypassed — running as function owner.)
  UPDATE pm_tickets
  SET ship_to_location_id = p_to_ship_to_id,
      updated_at = now()
  WHERE id = p_pm_ticket_id;

  -- 5. Update equipment home location. The equipment_tech_field_lock trigger
  --    reads get_user_role(), which returns NULL when invoked under the
  --    service-role admin client (auth.uid() is NULL). The trigger therefore
  --    short-circuits and lets this write through.
  UPDATE equipment
  SET ship_to_location_id = p_to_ship_to_id,
      updated_at = now()
  WHERE id = v_equipment_id;

  -- 6. Audit row.
  INSERT INTO equipment_location_history (
    equipment_id, from_ship_to_id, to_ship_to_id,
    changed_by, pm_ticket_id, note
  )
  VALUES (
    v_equipment_id, v_from_ship_to, p_to_ship_to_id,
    p_actor, p_pm_ticket_id, NULLIF(BTRIM(p_note), '')
  )
  RETURNING * INTO v_history;

  RETURN v_history;
END;
$$;

-- Lock down execution. The API route calls via the admin client (service_role).
-- We REVOKE from authenticated explicitly so a tech with a valid session can't
-- bypass the API and call the RPC directly via supabase-js — which would also
-- fail due to the equipment trigger, but defense-in-depth is the right move.
REVOKE ALL ON FUNCTION relocate_equipment_for_pm(UUID, INTEGER, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION relocate_equipment_for_pm(UUID, INTEGER, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION relocate_equipment_for_pm(UUID, INTEGER, UUID, TEXT) TO service_role;
