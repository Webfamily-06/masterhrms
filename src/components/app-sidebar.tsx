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
  ShoppingCart,
  Landmark,
  Kanban,
  UserCheck,
  Store,
  CreditCard,
  LifeBuoy,
  MessageSquare,
  Package,
  Target,
  FileText,
  Receipt,
  ImageIcon,
  Sparkles,
  Lock,
  Fingerprint,
  ScanLine,
  ArrowLeftRight,
  HardDrive,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ProfileWithRoles } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Core ERP Operations",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Point of Sale (POS)", url: "/pos", icon: ShoppingCart, badge: "Free Addon", badgeVariant: "secondary" },
      { title: "Accountant / Ledgers", url: "/accounting", icon: Landmark },
      { title: "HRM Suite", url: "/hrm", icon: Users },
      { title: "Products & Services", url: "/products", icon: Package },
    ],
  },
  {
    label: "Sales & CRM",
    items: [
      { title: "CRM & Pipelines", url: "/crm", icon: Target },
      { title: "Proposals", url: "/proposals", icon: FileText },
      { title: "Sales Invoices", url: "/invoices", icon: Receipt },
    ],
  },
  {
    label: "Projects & Team",
    items: [
      { title: "Projects & Kanban", url: "/projects", icon: Kanban },
      { title: "Team Chat", url: "/chat", icon: MessageSquare, badge: "Free Addon", badgeVariant: "secondary" },
      { title: "User Management", url: "/users", icon: UserCheck },
    ],
  },
  {
    label: "Addons & Platform",
    items: [
      { title: "Media Library", url: "/media", icon: ImageIcon },
      { title: "Marketplace", url: "/marketplace", icon: Store, badge: "500+ Live", badgeVariant: "default" },
      { title: "Support Tickets", url: "/support", icon: LifeBuoy },
      { title: "Subscription & Plan", url: "/subscription", icon: CreditCard, badge: "Upgrade", badgeVariant: "outline" },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
  {
    label: "Installed Addons",
    items: [
      { title: "WhatsApp Alerts", url: "/whatsapp-alerts", icon: MessageSquare, badge: "Active", badgeVariant: "secondary" },
      { title: "Biometric Sync", url: "/biometric-sync", icon: Fingerprint, badge: "Active", badgeVariant: "secondary" },
      { title: "AI Invoice OCR", url: "/ai-ocr", icon: ScanLine, badge: "AI", badgeVariant: "default" },
      { title: "Tally Importer", url: "/tally-importer", icon: ArrowLeftRight },
      { title: "Razorpay Gateway", url: "/razorpay-gateway", icon: CreditCard },
      { title: "Google Workspace", url: "/google-workspace", icon: HardDrive },
    ],
  },
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
              <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-extrabold shrink-0 shadow-sm">
                M
              </div>
              {!collapsed && (
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-bold text-sm truncate">{profile?.tenant?.name ?? platformSettings?.appName ?? "Master ERP"}</span>
                  <span className="text-[11px] text-muted-foreground truncate">Tenant Admin Portal</span>
                </div>
              )}
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = path === item.url || (item.url !== "/dashboard" && path.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center justify-between w-full gap-2">
                          <span className="flex items-center gap-2 truncate">
                            <item.icon className="size-4 shrink-0" />
                            {!collapsed && <span className="truncate text-xs font-medium">{item.title}</span>}
                          </span>
                          {!collapsed && item.badge && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {item.badge}
                            </span>
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

        {profile?.roles.includes("super_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-wider text-purple-500">
              Super Admin Console
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path.startsWith("/super")}>
                    <Link to="/super" className="flex items-center gap-2 text-purple-600 font-bold">
                      <ShieldCheck className="size-4" />
                      {!collapsed && <span>Super Admin Console</span>}
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
