import { createFileRoute } from "@tanstack/react-router";
import { SharedSettingsShell } from "@/components/settings/shared-settings-shell";
import { useCurrentProfile } from "@/lib/session";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tenant/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
  component: TenantSettingsPage,
  head: () => ({
    meta: [{ title: "Workspace Settings — Master HRMS" }],
  }),
});

function TenantSettingsPage() {
  const { data: profile } = useCurrentProfile();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleTabChange = (tab: string) => {
    navigate({ search: { tab } as any, replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="size-6 text-primary" />
          Workspace Settings & Architecture
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Authoritative settings backed by PostgreSQL SettingsService and runtime dynamic consumers.
        </p>
      </div>

      <SharedSettingsShell
        scope="TENANT"
        tenantId={profile?.tenant_id || profile?.tenant?.id}
        initialTab={search.tab || "general"}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
export default TenantSettingsPage;
