-- 1) Notifications: complete + tighten policies
DROP POLICY IF EXISTS "School admins update school notifications" ON public.notifications;
CREATE POLICY "School admins update school notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (
  school_id IS NOT NULL AND school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'accountant'))
)
WITH CHECK (
  school_id IS NOT NULL AND school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'accountant'))
);

DROP POLICY IF EXISTS "School admins insert school notifications" ON public.notifications;
CREATE POLICY "School admins insert school notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  school_id IS NOT NULL AND school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'secretary'))
);

DROP POLICY IF EXISTS "School admins delete school notifications" ON public.notifications;
CREATE POLICY "School admins delete school notifications"
ON public.notifications FOR DELETE TO authenticated
USING (
  school_id IS NOT NULL AND school_id = public.get_user_school(auth.uid())
  AND public.has_role(auth.uid(),'school_admin')
);

-- 2) Storage: verify school membership against profiles instead of trusting folder name only
CREATE OR REPLACE FUNCTION public.owns_school_folder(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.schools s ON s.id = p.school_id
    WHERE p.id = auth.uid()
      AND p.school_id IS NOT NULL
      AND (storage.foldername(_path))[1] = p.school_id::text
  )
$$;

REVOKE ALL ON FUNCTION public.owns_school_folder(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_school_folder(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.owns_school_folder(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "school_assets_read" ON storage.objects;
CREATE POLICY "school_assets_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'school-assets' AND (public.owns_school_folder(name) OR public.is_super_admin(auth.uid())));

DROP POLICY IF EXISTS "school_assets_insert" ON storage.objects;
CREATE POLICY "school_assets_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'school-assets' AND public.owns_school_folder(name) AND owner = auth.uid());

DROP POLICY IF EXISTS "school_assets_update" ON storage.objects;
CREATE POLICY "school_assets_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'school-assets' AND public.owns_school_folder(name) AND owner = auth.uid())
WITH CHECK (bucket_id = 'school-assets' AND public.owns_school_folder(name) AND owner = auth.uid());

DROP POLICY IF EXISTS "school_assets_delete" ON storage.objects;
CREATE POLICY "school_assets_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'school-assets' AND public.owns_school_folder(name) AND owner = auth.uid());

DROP POLICY IF EXISTS "teacher-materials read school" ON storage.objects;
CREATE POLICY "teacher-materials read school" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'teacher-materials' AND (public.owns_school_folder(name) OR public.is_super_admin(auth.uid())));

DROP POLICY IF EXISTS "teacher-materials owner writes" ON storage.objects;
CREATE POLICY "teacher-materials owner writes" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'teacher-materials' AND public.owns_school_folder(name) AND owner = auth.uid());

DROP POLICY IF EXISTS "teacher-materials owner updates" ON storage.objects;
CREATE POLICY "teacher-materials owner updates" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'teacher-materials' AND public.owns_school_folder(name) AND owner = auth.uid())
WITH CHECK (bucket_id = 'teacher-materials' AND public.owns_school_folder(name) AND owner = auth.uid());

DROP POLICY IF EXISTS "teacher-materials owner deletes" ON storage.objects;
CREATE POLICY "teacher-materials owner deletes" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'teacher-materials' AND public.owns_school_folder(name) AND owner = auth.uid());

-- 3) Make the notification helper server-only (no longer callable by signed-in users)
REVOKE ALL ON FUNCTION public.notify_school_user(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_school_user(uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.notify_school_user(uuid, text, text, text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.notify_user_as(_caller_id uuid, _user_id uuid, _type text, _title text, _body text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_school uuid;
  target_school uuid;
BEGIN
  IF _caller_id IS NULL OR _user_id IS NULL THEN
    RETURN;
  END IF;
  SELECT school_id INTO caller_school FROM public.profiles WHERE id = _caller_id;
  SELECT school_id INTO target_school FROM public.profiles WHERE id = _user_id;
  IF caller_school IS NULL OR target_school IS NULL OR caller_school IS DISTINCT FROM target_school THEN
    RETURN;
  END IF;
  INSERT INTO public.teacher_notifications (user_id, school_id, type, title, body, read)
  VALUES (_user_id, target_school, _type, _title, left(coalesce(_body,''), 2000), false);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_user_as(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_user_as(uuid, uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.notify_user_as(uuid, uuid, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user_as(uuid, uuid, text, text, text) TO service_role;