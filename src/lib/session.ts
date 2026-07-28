import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export type ProfileWithRoles = {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  tenant: { id: string; name: string; slug: string } | null;
  roles: string[];
};

export function useCurrentProfile(user: User | null | undefined) {
  return useQuery({
    queryKey: ["current-profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ProfileWithRoles | null> => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, tenant_id, full_name, email, avatar_url, tenants(id, name, slug)")
        .eq("id", user.id)
        .maybeSingle();
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return {
        id: user.id,
        tenant_id: profile?.tenant_id ?? null,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? user.email ?? null,
        avatar_url: profile?.avatar_url ?? null,
        tenant: (profile as any)?.tenants ?? null,
        roles: (roles ?? []).map((r) => r.role as string),
      };
    },
  });
}

export function hasRole(profile: ProfileWithRoles | null | undefined, role: string) {
  return !!profile?.roles.includes(role);
}
