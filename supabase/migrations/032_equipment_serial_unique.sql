-- Prevent the same customer from owning two active equipment records with the
-- same serial number. Case- and whitespace-insensitive on serial_number.
-- Inactive records and records with null/blank serials are excluded so the
-- common "deactivate the bad one" cleanup path keeps working.

CREATE UNIQUE INDEX idx_equipment_customer_serial_unique
  ON equipment (customer_id, LOWER(BTRIM(serial_number)))
  WHERE active = true
    AND customer_id IS NOT NULL
    AND serial_number IS NOT NULL
    AND BTRIM(serial_number) <> '';
