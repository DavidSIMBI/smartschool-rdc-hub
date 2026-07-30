
CREATE POLICY "school_assets_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND (
      (storage.foldername(name))[1] = public.get_user_school(auth.uid())::text
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE POLICY "school_assets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-assets'
    AND (storage.foldername(name))[1] = public.get_user_school(auth.uid())::text
  );

CREATE POLICY "school_assets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND (storage.foldername(name))[1] = public.get_user_school(auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'school-assets'
    AND (storage.foldername(name))[1] = public.get_user_school(auth.uid())::text
  );

CREATE POLICY "school_assets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND (storage.foldername(name))[1] = public.get_user_school(auth.uid())::text
  );
