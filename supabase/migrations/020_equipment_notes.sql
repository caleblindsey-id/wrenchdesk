-- Equipment notes: timestamped, append-only log
CREATE TABLE equipment_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  note_text    TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_equipment_notes_equipment_id ON equipment_notes(equipment_id);

ALTER TABLE equipment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read equipment_notes"
  ON equipment_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert equipment_notes"
  ON equipment_notes FOR INSERT TO authenticated
  WITH CHECK (true);

-- Helper: get equipment IDs for the current tech (SECURITY DEFINER to bypass RLS,
-- avoiding infinite recursion when used in a policy on pm_tickets)
CREATE OR REPLACE FUNCTION get_tech_equipment_ids()
RETURNS SETOF UUID AS $$
  SELECT DISTINCT equipment_id
  FROM pm_tickets
  WHERE assigned_technician_id = auth.uid()
    AND equipment_id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Allow techs to read completed/billed tickets for equipment they've been assigned
-- (needed for service history — default RLS only lets techs see their own assigned tickets)
CREATE POLICY "Technicians read completed tickets for shared equipment"
  ON pm_tickets FOR SELECT TO authenticated
  USING (
    get_user_role() = 'technician'
    AND status IN ('completed', 'billed')
    AND equipment_id IN (SELECT get_tech_equipment_ids())
  );
