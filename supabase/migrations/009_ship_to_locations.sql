-- Ship-to locations synced from Synergy's shiplist table
-- One customer can have multiple ship-to addresses
CREATE TABLE IF NOT EXISTS ship_to_locations (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  synergy_customer_code VARCHAR NOT NULL,
  synergy_shiplist_code VARCHAR NOT NULL,
  name VARCHAR,
  address TEXT,
  city VARCHAR,
  state VARCHAR,
  zip VARCHAR,
  contact VARCHAR,
  email VARCHAR,
  synced_at TIMESTAMPTZ,
  UNIQUE(synergy_customer_code, synergy_shiplist_code)
);

-- Enable RLS
ALTER TABLE ship_to_locations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read ship-to locations
CREATE POLICY "Authenticated users can read ship_to_locations"
  ON ship_to_locations FOR SELECT
  TO authenticated
  USING (true);

-- Add ship-to location reference to equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS ship_to_location_id INTEGER REFERENCES ship_to_locations(id);
