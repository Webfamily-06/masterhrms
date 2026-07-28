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
  LayoutDashboard,
  Users,
  Clock,
  CalendarCheck,
  Wallet,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ProfileWithRoles } from "@/lib/session";

import { useQuery } from "@tanstack/react-query";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Leave", url: "/leave", icon: CalendarCheck },
  { title: "Payroll", url: "/payroll", icon: Wallet },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar({ profile }: { profile: ProfileWithRoles | null }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const { data: platformSettings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const initials =
    (profile?.full_name || profile?.email || "U")
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center justify-center px-2 py-2">
          {platformSettings?.logoLightUrl ? (
            <img src={platformSettings.logoLightUrl} alt="Logo" className="h-9 max-h-11 w-full object-contain" />
          ) : (
            <div className="flex items-center gap-2 w-full">
              <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold shrink-0">
                M
              </div>
              {!collapsed && (
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-semibold text-sm truncate">{profile?.tenant?.name ?? platformSettings?.appName ?? "Master HRMS"}</span>
                  <span className="text-xs text-muted-foreground truncate">Workspace</span>
                </div>
              )}
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = path === item.url || path.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {profile?.roles.includes("super_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path.startsWith("/super")}>
                    <Link to="/super" className="flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      {!collapsed && <span>Super Admin</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile?.full_name || "User"}</div>
              <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
            </div>
          )}
          {!collapsed && <ThemeToggle />}
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
