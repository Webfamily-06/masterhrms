import React, { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNavigationForPortal,
  isRouteActive,
  NavigationItem,
  PortalId,
} from "@/lib/navigation-registry";
import { getClientAuthState } from "@/lib/route-guards";
import { NavIcon } from "./nav-icon";
import { PortalSwitcher } from "@/components/portal-switcher";

interface PortalSidebarProps {
  portal: PortalId;
}

export function PortalSidebar({ portal }: PortalSidebarProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const auth = getClientAuthState();

  // Navigation items for this portal
  const navItems = getNavigationForPortal(portal, {
    roles: auth.roles,
    permissions: auth.permissions,
    enabledModules: auth.enabledModules,
    isSuperAdmin: auth.isSuperAdmin,
    isTenantAdmin: auth.isTenantAdmin,
  });

  // Group items by section
  const sections: { sectionName: string; items: NavigationItem[] }[] = [];
  const sectionMap = new Map<string, NavigationItem[]>();

  for (const item of navItems) {
    const sec = item.section || "General";
    if (!sectionMap.has(sec)) {
      sectionMap.set(sec, []);
    }
    sectionMap.get(sec)!.push(item);
  }

  for (const [sec, items] of sectionMap.entries()) {
    sections.push({ sectionName: sec, items });
  }

  // State for collapsible parent menus
  const [openParents, setOpenParents] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of navItems) {
      if (item.children) {
        // Auto-open if child is active
        const hasActiveChild = item.children.some((child) =>
          isRouteActive(currentPath, child)
        );
        initial[item.id] = hasActiveChild;
      }
    }
    return initial;
  });

  const toggleParent = (id: string) => {
    setOpenParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = () => {
    localStorage.removeItem("hrms_auth_token");
    localStorage.removeItem("hrms_user");
    navigate({ to: "/auth" as any });
  };

  return (
    <Sidebar className="border-r border-border/80 bg-card">
      <SidebarHeader className="p-4 border-b border-border/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Link to={portal === "hr" ? "/hr" : "/me"} className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight tracking-tight">MASTERHRMS</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {portal === "hr" ? "HR Management" : "Employee Portal"}
              </span>
            </div>
          </Link>
        </div>
        <div className="w-full">
          <PortalSwitcher />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 overflow-y-auto">
        {sections.map(({ sectionName, items }) => (
          <SidebarGroup key={sectionName} className="mb-2">
            <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider px-2 mb-1">
              {sectionName}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  if (item.children && item.children.length > 0) {
                    const isOpen = openParents[item.id];
                    const isAnyChildActive = item.children.some((c) =>
                      isRouteActive(currentPath, c)
                    );

                    return (
                      <Collapsible
                        key={item.id}
                        open={isOpen}
                        onOpenChange={() => toggleParent(item.id)}
                        className="w-full"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              className={cn(
                                "w-full justify-between font-medium text-xs h-9 px-2.5 rounded-md transition-colors",
                                isAnyChildActive && "bg-accent/40 font-semibold"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <NavIcon name={item.icon} className="h-4 w-4 text-muted-foreground" />
                                <span>{item.label}</span>
                              </div>
                              {isOpen ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/80" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/80" />
                              )}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 pt-1 space-y-1">
                            {item.children.map((child) => {
                              const active = isRouteActive(currentPath, child);
                              return (
                                <SidebarMenuItem key={child.id}>
                                  <SidebarMenuButton
                                    asChild
                                    className={cn(
                                      "text-xs h-8 px-2 rounded-md font-normal transition-colors",
                                      active
                                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    )}
                                  >
                                    <Link to={child.route as any} className="flex items-center gap-2">
                                      <NavIcon name={child.icon} className="h-3.5 w-3.5" />
                                      <span>{child.label}</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  const active = isRouteActive(currentPath, item);
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "text-xs h-9 px-2.5 rounded-md font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "hover:bg-accent/60"
                        )}
                      >
                        <Link to={item.route as any} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2.5">
                            <NavIcon name={item.icon} className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badgeKey && (
                            <Badge
                              variant={active ? "secondary" : "outline"}
                              className="text-[10px] px-1.5 py-0 h-4 font-normal"
                            >
                              0
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/60 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar className="h-8 w-8 rounded-md border border-border">
            <AvatarFallback className="text-xs font-semibold bg-muted">
              {auth.roles[0]?.slice(0, 2).toUpperCase() || "US"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate leading-none">
              {auth.isSuperAdmin ? "Super Admin" : auth.roles[0] || "User"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {auth.tenantId ? `Tenant ${auth.tenantId.slice(0, 8)}` : "Platform"}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function HrSidebar() {
  return <PortalSidebar portal="hr" />;
}

export function EmployeeSidebar() {
  return <PortalSidebar portal="me" />;
}
