-- 1) Notifications: add school-scoped SELECT policy for school members
DROP POLICY IF EXISTS "School members read school notifications" ON public.notifications;
CREATE POLICY "School members read school notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (school_id IS NOT NULL AND school_id = public.get_user_school(auth.uid()));

-- 2) Platform settings: restrict read to super admins only
DROP POLICY IF EXISTS "Authenticated read settings" ON public.platform_settings;
-- The existing "Super admin manages settings" ALL policy already covers super admin reads.

-- 3) User roles: add explicit super-admin-only write policies
DROP POLICY IF EXISTS "Super admin inserts roles" ON public.user_roles;
CREATE POLICY "Super admin inserts roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin updates roles" ON public.user_roles;
CREATE POLICY "Super admin updates roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin deletes roles" ON public.user_roles;
CREATE POLICY "Super admin deletes roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 4) Revoke EXECUTE on trigger-only SECURITY DEFINER functions from authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated, anon, PUBLIC;
-- has_role, is_super_admin, get_user_school remain executable by authenticated because
-- they are referenced inside RLS policies and must be callable by the querying role.