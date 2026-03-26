-- Settings key-value store for system configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default labor rate
INSERT INTO settings (key, value) VALUES ('labor_rate_per_hour', '75')
ON CONFLICT (key) DO NOTHING;

-- RLS: all authenticated users can read, only managers can write
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can update settings"
  ON settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'coordinator')
    )
  );
