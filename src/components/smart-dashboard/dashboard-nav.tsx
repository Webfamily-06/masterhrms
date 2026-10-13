import { Link, useRouterState } from "@tanstack/react-router";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Layers,
  Download,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWorkspaceDashboardCapabilities } from "@/lib/workspace-dashboard-capabilities";

interface SmartDashboardNavProps {
  activeSection: "overview" | "financial" | "sales" | "operational";
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function SmartDashboardNav({
  activeSection,
  onRefresh,
  isRefreshing,
}: SmartDashboardNavProps) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const handleExport = async () => {
    try {
      const section = activeSection === "operational" ? "operational" : activeSection;
      const res = await api.get(`/smart-dashboard/export?section=${section}`);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smart-dashboard-${section}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${section} analytics data`);
    } catch {
      toast.error("Failed to export analytics data");
    }
  };

  const { canAccessSection } = useWorkspaceDashboardCapabilities();

  const allNavItems = [
    {
      id: "overview",
      label: "Executive Overview",
      href: "/smart-dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/smart-dashboard" || activeSection === "overview",
      isAuthorized: true,
    },
    {
      id: "financial",
      label: "Financial Analytics",
      href: "/smart-dashboard/financial",
      icon: DollarSign,
      isActive: pathname === "/smart-dashboard/financial" || activeSection === "financial",
      isAuthorized: canAccessSection("financial"),
    },
    {
      id: "sales",
      label: "Sales & Customer",
      href: "/smart-dashboard/sales",
      icon: Users,
      isActive: pathname === "/smart-dashboard/sales" || activeSection === "sales",
      isAuthorized: canAccessSection("sales"),
    },
    {
      id: "operational",
      label: "Operational Analytics",
      href: "/smart-dashboard/operational",
      icon: Layers,
      isActive: pathname === "/smart-dashboard/operational" || activeSection === "operational",
      isAuthorized: canAccessSection("operational"),
    },
  ];

  const navItems = allNavItems.filter((item) => item.isAuthorized);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-3xl font-bold tracking-tight mt-1">Smart Dashboard Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time business telemetry, financial health metrics, sales pipelines, and operational intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={onRefresh}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          )}
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Canonical Navigation Tabs Bar */}
      <div className="border-b border-border/60">
        <nav className="flex space-x-2 md:space-x-4 overflow-x-auto" aria-label="Dashboard Sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                  item.isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
