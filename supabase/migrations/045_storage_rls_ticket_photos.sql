-- Migration 045: Storage RLS for ticket-photos bucket (QC pass — section 2)
-- See projects/callboard-qc/section-2-pm-tickets.md (TKT-15) in the Compass repo.
--
-- Existing policies were wide-open (any authenticated user could read/write/delete
-- any object in the bucket regardless of ticket assignment). Photo paths are of
-- the form `${ticket_id}/${uuid}.jpg` where ticket_id is a UUID matching either
-- pm_tickets.id or service_tickets.id. We use storage.foldername(name)[1] to
-- extract the ticket id from the path and tie permission to ticket-row visibility.
--
-- The pm_tickets and service_tickets RLS policies (already hardened in section 1
-- and section 2 work) handle the role-based access checks; we just lift them
-- into the storage layer.

-- Drop the old wide-open policies
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;

-- INSERT: only allow uploading into a folder that names a ticket the user can see
CREATE POLICY "ticket_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-photos'
    AND (
      EXISTS (SELECT 1 FROM public.pm_tickets WHERE id::text = (storage.foldername(name))[1])
      OR EXISTS (SELECT 1 FROM public.service_tickets WHERE id::text = (storage.foldername(name))[1])
    )
  );

-- SELECT: same constraint — only visible if the corresponding ticket is visible
CREATE POLICY "ticket_photos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ticket-photos'
    AND (
      EXISTS (SELECT 1 FROM public.pm_tickets WHERE id::text = (storage.foldername(name))[1])
      OR EXISTS (SELECT 1 FROM public.service_tickets WHERE id::text = (storage.foldername(name))[1])
    )
  );

-- DELETE: same constraint
CREATE POLICY "ticket_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ticket-photos'
    AND (
      EXISTS (SELECT 1 FROM public.pm_tickets WHERE id::text = (storage.foldername(name))[1])
      OR EXISTS (SELECT 1 FROM public.service_tickets WHERE id::text = (storage.foldername(name))[1])
    )
  );

-- UPDATE: same constraint (photos shouldn't normally be updated, but if a future
-- workflow needs to overwrite an object the policy is consistent with the others).
CREATE POLICY "ticket_photos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ticket-photos'
    AND (
      EXISTS (SELECT 1 FROM public.pm_tickets WHERE id::text = (storage.foldername(name))[1])
      OR EXISTS (SELECT 1 FROM public.service_tickets WHERE id::text = (storage.foldername(name))[1])
    )
  )
  WITH CHECK (
    bucket_id = 'ticket-photos'
    AND (
      EXISTS (SELECT 1 FROM public.pm_tickets WHERE id::text = (storage.foldername(name))[1])
      OR EXISTS (SELECT 1 FROM public.service_tickets WHERE id::text = (storage.foldername(name))[1])
    )
  );
