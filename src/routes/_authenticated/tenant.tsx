import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TenantSidebar } from "@/components/navigation/portal-sidebar";
import { evaluateRouteAccess } from "@/lib/route-guards";
import { ThemeToggle } from "@/components/theme-toggle";
import { RealtimeNotificationDrawer } from "@/components/realtime-notification-drawer";
import { PortalSwitcher } from "@/components/portal-switcher";

export const Route = createFileRoute("/_authenticated/tenant")({
  beforeLoad: async () => {
    const access = evaluateRouteAccess({ targetPortal: "tenant" });
    if (!access.allowed && access.redirectUrl) {
      throw redirect({ to: access.redirectUrl as any });
    }
  },
  component: TenantPortalLayout,
});

function TenantPortalLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <TenantSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
              <div className="h-4 w-px bg-border" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tenant Command Center
              </span>
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
