-- Migration 072: Surface Synergy validation in the Parts Queue
--
-- Two things:
--
-- 1. Add `synergy_validation_status` and `synergy_validated_at` to `pm_tickets`.
--    Migration 028 added these to `service_tickets` only, but the nightly
--    `validate-synergy-orders.py` script PATCHes both tables. Every PM ticket
--    has 400'd silently since the script's PM-table branch landed — fix is to
--    bring the schema into line with the script's intent.
--
-- 2. Re-create `parts_order_queue` (last redefined in 070) to project
--    `synergy_validation_status` and `parts_validation_status` from the parent
--    ticket. PartsQueueClient.tsx renders a badge per row using both.

ALTER TABLE pm_tickets
  ADD COLUMN IF NOT EXISTS synergy_validation_status TEXT,
  ADD COLUMN IF NOT EXISTS synergy_validated_at TIMESTAMPTZ;

DROP VIEW IF EXISTS parts_order_queue;

CREATE VIEW parts_order_queue
WITH (security_invoker = on) AS
SELECT
  'pm'::text                                                           AS source,
  pm.id                                                                AS ticket_id,
  pm.work_order_number                                                 AS work_order_number,
  (elem.ord - 1)::int                                                  AS part_index,
  pm.customer_id                                                       AS customer_id,
  c.name                                                               AS customer_name,
  pm.assigned_technician_id                                            AS assigned_technician_id,
  u.name                                                               AS assigned_technician_name,
  pm.synergy_order_number                                              AS synergy_order_number,
  pm.synergy_validation_status                                         AS synergy_validation_status,
  pm.parts_validation_status                                           AS parts_validation_status,
  pm.synergy_validated_at                                              AS synergy_validated_at,
  COALESCE((elem.value->>'requested_at')::timestamptz, pm.updated_at)  AS requested_at,
  elem.value->>'description'                                           AS description,
  NULLIF(elem.value->>'quantity', '')::numeric                         AS quantity,
  elem.value->>'vendor'                                                AS vendor,
  elem.value->>'vendor_code'                                           AS vendor_code,
  elem.value->>'product_number'                                        AS product_number,
  NULLIF(elem.value->>'synergy_product_id', '')::int                   AS synergy_product_id,
  elem.value->>'vendor_item_code'                                      AS vendor_item_code,
  elem.value->>'po_number'                                             AS po_number,
  COALESCE(elem.value->>'status', 'requested')                         AS status,
  COALESCE((elem.value->>'cancelled')::boolean, false)                 AS cancelled,
  elem.value->>'cancel_reason'                                         AS cancel_reason,
  (elem.value->>'ordered_at')::timestamptz                             AS ordered_at,
  (elem.value->>'received_at')::timestamptz                            AS received_at,
  NULLIF(elem.value->>'ordered_by', '')::uuid                          AS ordered_by,
  NULLIF(elem.value->>'received_by', '')::uuid                         AS received_by
FROM pm_tickets pm
JOIN customers c ON c.id = pm.customer_id
LEFT JOIN users u ON u.id = pm.assigned_technician_id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pm.parts_requested, '[]'::jsonb))
  WITH ORDINALITY AS elem(value, ord)
WHERE jsonb_typeof(COALESCE(pm.parts_requested, '[]'::jsonb)) = 'array'

UNION ALL

SELECT
  'service'::text                                                      AS source,
  st.id                                                                AS ticket_id,
  st.work_order_number                                                 AS work_order_number,
  (elem.ord - 1)::int                                                  AS part_index,
  st.customer_id                                                       AS customer_id,
  c.name                                                               AS customer_name,
  st.assigned_technician_id                                            AS assigned_technician_id,
  u.name                                                               AS assigned_technician_name,
  st.synergy_order_number                                              AS synergy_order_number,
  st.synergy_validation_status                                         AS synergy_validation_status,
  st.parts_validation_status                                           AS parts_validation_status,
  st.synergy_validated_at                                              AS synergy_validated_at,
  COALESCE((elem.value->>'requested_at')::timestamptz, st.updated_at)  AS requested_at,
  elem.value->>'description'                                           AS description,
  NULLIF(elem.value->>'quantity', '')::numeric                         AS quantity,
  elem.value->>'vendor'                                                AS vendor,
  elem.value->>'vendor_code'                                           AS vendor_code,
  elem.value->>'product_number'                                        AS product_number,
  NULLIF(elem.value->>'synergy_product_id', '')::int                   AS synergy_product_id,
  elem.value->>'vendor_item_code'                                      AS vendor_item_code,
  elem.value->>'po_number'                                             AS po_number,
  COALESCE(elem.value->>'status', 'requested')                         AS status,
  COALESCE((elem.value->>'cancelled')::boolean, false)                 AS cancelled,
  elem.value->>'cancel_reason'                                         AS cancel_reason,
  (elem.value->>'ordered_at')::timestamptz                             AS ordered_at,
  (elem.value->>'received_at')::timestamptz                            AS received_at,
  NULLIF(elem.value->>'ordered_by', '')::uuid                          AS ordered_by,
  NULLIF(elem.value->>'received_by', '')::uuid                         AS received_by
FROM service_tickets st
JOIN customers c ON c.id = st.customer_id
LEFT JOIN users u ON u.id = st.assigned_technician_id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(st.parts_requested, '[]'::jsonb))
  WITH ORDINALITY AS elem(value, ord)
WHERE jsonb_typeof(COALESCE(st.parts_requested, '[]'::jsonb)) = 'array'
  AND NOT (
    st.status IN ('open', 'estimated')
    AND COALESCE(elem.value->>'status', 'requested') = 'requested'
  );

GRANT SELECT ON parts_order_queue TO authenticated;

COMMENT ON VIEW parts_order_queue IS
  'One row per part request across pm_tickets and service_tickets. Drives the office Parts Queue page. RLS inherits from base tables via security_invoker=on. Service parts in ''requested'' status are hidden until the ticket estimate is approved. Migration 072 projects synergy_validation_status + parts_validation_status + synergy_validated_at from the parent ticket so the queue UI can render validation badges.';
