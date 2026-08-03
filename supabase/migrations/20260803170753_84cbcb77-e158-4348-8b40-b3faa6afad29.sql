CREATE POLICY "School admins update school notifications" ON public.notifications FOR UPDATE TO authenticated
USING (school_id IS NOT NULL AND school_id = public.get_user_school(auth.uid()) AND (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'secretary') OR public.has_role(auth.uid(), 'accountant')))
WITH CHECK (school_id IS NOT NULL AND school_id = public.get_user_school(auth.uid()));
GRANT SELECT, UPDATE ON public.notifications TO authenticated;