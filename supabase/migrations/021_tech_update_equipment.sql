-- Allow techs to update equipment they can see (field restriction enforced in app)
CREATE POLICY "Technicians update equipment"
  ON equipment FOR UPDATE TO authenticated
  USING (get_user_role() = 'technician')
  WITH CHECK (get_user_role() = 'technician');
