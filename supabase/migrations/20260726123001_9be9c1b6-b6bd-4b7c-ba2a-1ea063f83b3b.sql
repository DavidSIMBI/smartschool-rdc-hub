CREATE POLICY "teacher-materials read school" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'teacher-materials' AND ((storage.foldername(name))[1] = get_user_school(auth.uid())::text OR is_super_admin(auth.uid())));

CREATE POLICY "teacher-materials owner writes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teacher-materials' AND (storage.foldername(name))[1] = get_user_school(auth.uid())::text AND owner = auth.uid());

CREATE POLICY "teacher-materials owner updates" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'teacher-materials' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'teacher-materials' AND owner = auth.uid());

CREATE POLICY "teacher-materials owner deletes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'teacher-materials' AND owner = auth.uid());