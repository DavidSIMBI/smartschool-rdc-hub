
-- 1. schools: remove public/anon SELECT; add authenticated members SELECT; tighten INSERT
DROP POLICY IF EXISTS "Public can view schools basic" ON public.schools;
DROP POLICY IF EXISTS "Authenticated can create school" ON public.schools;

CREATE POLICY "Members view their school"
  ON public.schools FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_school(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Authenticated without school can create one"
  ON public.schools FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_school(auth.uid()) IS NULL
    OR public.is_super_admin(auth.uid())
  );

REVOKE SELECT ON public.schools FROM anon;

-- 2. platform_settings: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone reads settings" ON public.platform_settings;

CREATE POLICY "Authenticated read settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.platform_settings FROM anon;

-- 3. Revoke EXECUTE on SECURITY DEFINER functions from anon (authenticated retains
--    execute because these are called from RLS policies and must be callable by the
--    querying role). Trigger-only functions revoked from both.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_school(uuid) FROM anon, public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
