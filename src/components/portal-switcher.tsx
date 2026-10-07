import React from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getClientAuthState } from "@/lib/route-guards";
import {
  Building2,
  User,
  ShieldCheck,
  Briefcase,
  ChevronsUpDown,
  Check,
} from "lucide-react";

export interface PortalConfig {
  id: "hr" | "me" | "sa" | "client";
  title: string;
  subtitle: string;
  route: string;
  icon: React.ElementType;
  badge?: string;
}

export function PortalSwitcher() {
  const router = useRouter();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const auth = getClientAuthState();

  // Determine authorized portals
  const availablePortals: PortalConfig[] = [];

  // 1. HR Portal
  if (
    auth.isTenantAdmin ||
    auth.roles.includes("manager") ||
    auth.permissions.some((p) => p.startsWith("hr."))
  ) {
    availablePortals.push({
      id: "hr",
      title: "HR Command Center",
      subtitle: "Operations & Workforce",
      route: "/hr",
      icon: Building2,
      badge: "Admin",
    });
  }

  // 2. Employee Self-Service Portal
  // Available to all users belonging to a tenant
  if (auth.tenantId) {
    availablePortals.push({
      id: "me",
      title: "Employee Portal",
      subtitle: "Personal Hub & Requests",
      route: "/me",
      icon: User,
      badge: "Self",
    });
  }

  // 3. Super Admin Portal
  if (auth.isSuperAdmin) {
    availablePortals.push({
      id: "sa",
      title: "Super Admin",
      subtitle: "Platform Governance",
      route: "/super",
      icon: ShieldCheck,
      badge: "Root",
    });
  }

  // 4. Client Portal
  if (auth.roles.includes("client") || auth.roles.includes("client_admin")) {
    availablePortals.push({
      id: "client",
      title: "Client Portal",
      subtitle: "Staffing & Billing",
      route: "/client",
      icon: Briefcase,
    });
  }

  // Determine current active portal
  let activePortalId: "hr" | "me" | "sa" | "client" = "me";
  if (currentPath.startsWith("/hr")) {
    activePortalId = "hr";
  } else if (currentPath.startsWith("/super")) {
    activePortalId = "sa";
  } else if (currentPath.startsWith("/client")) {
    activePortalId = "client";
  } else if (currentPath.startsWith("/me")) {
    activePortalId = "me";
  } else if (availablePortals.length > 0) {
    activePortalId = availablePortals[0].id;
  }

  const activePortal = availablePortals.find((p) => p.id === activePortalId) || availablePortals[0];

  if (availablePortals.length <= 1) {
    if (!activePortal) return null;
    const Icon = activePortal.icon;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md border bg-muted/40">
        <Icon className="h-4 w-4 text-primary" />
        <span>{activePortal.title}</span>
      </div>
    );
  }

  const ActiveIcon = activePortal ? activePortal.icon : Building2;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2.5 h-9 px-3 border-border/80 hover:bg-accent/60 transition-colors"
        >
          <div className="flex items-center justify-center h-5 w-5 rounded bg-primary/10 text-primary">
            <ActiveIcon className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col items-start text-left leading-none">
            <span className="text-xs font-semibold">{activePortal?.title}</span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-1.5">
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
          Switch Portal
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        {availablePortals.map((portal) => {
          const Icon = portal.icon;
          const isSelected = portal.id === activePortalId;
          return (
            <DropdownMenuItem
              key={portal.id}
              onClick={() => router.navigate({ to: portal.route as any })}
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                isSelected ? "bg-accent/80 font-medium" : "hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex items-center justify-center h-7 w-7 rounded-md ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{portal.title}</span>
                  <span className="text-[10px] text-muted-foreground">{portal.subtitle}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {portal.badge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                    {portal.badge}
                  </Badge>
                )}
                {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
