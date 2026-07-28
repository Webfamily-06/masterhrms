
-- 1) Replace permissive tenants insert policy.
-- bootstrap_tenant is SECURITY DEFINER and bypasses RLS, so onboarding still works.
DROP POLICY IF EXISTS tenants_insert ON public.tenants;
CREATE POLICY tenants_insert ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 2) Lock down SECURITY DEFINER function execution.
-- Trigger-only functions: no direct callers needed.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Internal helpers used inside RLS policies: revoke from anon, keep authenticated.
REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.has_tenant_role(uuid, uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, app_role) TO authenticated;

-- User-callable RPCs: authenticated only.
REVOKE ALL ON FUNCTION public.bootstrap_tenant(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_tenant(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_super_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.promote_to_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_to_super_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_super_admin(uuid) TO authenticated;
