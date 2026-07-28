import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppShell,
});

function AppShell() {
  const { user, loading } = useSession();
  const { data: profile, isLoading } = useCurrentProfile(user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && profile && !profile.tenant_id) {
      navigate({ to: "/onboarding" });
    }
  }, [profile, isLoading, navigate]);

  if (loading || isLoading || !profile) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile.tenant_id) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/20">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b bg-background px-4 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
