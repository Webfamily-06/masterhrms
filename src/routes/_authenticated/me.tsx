import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { EmployeeSidebar } from "@/components/navigation/portal-sidebar";
import { evaluateRouteAccess, getClientAuthState } from "@/lib/route-guards";
import { ThemeToggle } from "@/components/theme-toggle";
import { RealtimeNotificationDrawer } from "@/components/realtime-notification-drawer";
import { PortalSwitcher } from "@/components/portal-switcher";
import { getImpersonationState, stopViewAs } from "@/lib/auth";
import { ArrowLeft, UserX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/me")({
  beforeLoad: async () => {
    const access = evaluateRouteAccess({ targetPortal: "me" });
    if (!access.allowed && access.redirectUrl) {
      throw redirect({ to: access.redirectUrl as any });
    }
  },
  component: EmployeePortalLayout,
});

function EmployeePortalLayout() {
  const auth = getClientAuthState();
  const [impersonation, setImpersonation] = useState(getImpersonationState());

  useEffect(() => {
    const handleImpersonationChange = () => setImpersonation(getImpersonationState());
    window.addEventListener("impersonation-changed", handleImpersonationChange);
    return () => window.removeEventListener("impersonation-changed", handleImpersonationChange);
  }, []);

  const handleExitImpersonation = () => {
    stopViewAs();
    window.location.href = auth.isTenantAdmin ? "/tenant/dashboard" : "/hr/dashboard";
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground flex-col">
        {/* Impersonation Banner */}
        {impersonation.isImpersonating && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between text-xs font-medium z-30 shadow-sm animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Viewing as <strong>{impersonation.targetName || impersonation.targetId}</strong> (Read-only mode enabled)
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExitImpersonation}
              className="h-6 px-2 text-xs bg-white text-destructive hover:bg-white/90 gap-1 font-semibold"
            >
              <UserX className="h-3.5 w-3.5" />
              Exit Impersonation
            </Button>
          </div>
        )}

        <div className="flex flex-1 w-full overflow-hidden">
          <EmployeeSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top header bar */}
            <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
                <div className="h-4 w-px bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Employee Self-Service
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
      </div>
    </SidebarProvider>
  );
}
