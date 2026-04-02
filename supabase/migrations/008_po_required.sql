-- Add PO required flag to customers table (synced from Synergy cust.PORequired)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS po_required BOOLEAN DEFAULT FALSE;
