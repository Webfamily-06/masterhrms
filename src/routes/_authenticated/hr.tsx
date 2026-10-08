import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { HrSidebar } from "@/components/navigation/portal-sidebar";
import { evaluateRouteAccess, getClientAuthState } from "@/lib/route-guards";
import { ThemeToggle } from "@/components/theme-toggle";
import { RealtimeNotificationDrawer } from "@/components/realtime-notification-drawer";
import { PortalSwitcher } from "@/components/portal-switcher";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/hr")({
  beforeLoad: async () => {
    const access = evaluateRouteAccess({ targetPortal: "hr" });
    if (!access.allowed && access.redirectUrl) {
      throw redirect({ to: access.redirectUrl as any });
    }
  },
  component: HrPortalLayout,
});

function HrPortalLayout() {
  const auth = getClientAuthState();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <HrSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
              <div className="h-4 w-px bg-border" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                HR Command Center
              </span>
              {auth.isTenantAdmin && (
                <Link to="/tenant/dashboard">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 ml-2 border-primary/40 text-primary hover:bg-primary/10">
                    <ArrowLeft className="h-3 w-3" />
                    Back to Tenant
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <PortalSwitcher />
              <ThemeToggle />
              <RealtimeNotificationDrawer />
            </div>
          </header>

          {/* Main content viewport */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
