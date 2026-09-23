import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
  LogOut,
  ShieldCheck,
  ShoppingCart,
  Landmark,
  Kanban,
  Store,
  CreditCard,
  MessageSquare,
  Package,
  Target,
  FileText,
  Receipt,
  Sparkles,
  Fingerprint,
  ScanLine,
  HardDrive,
  Briefcase,
  GraduationCap,
  HelpCircle,
  FolderLock,
  Layers,
  FileSpreadsheet,
  Workflow,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { ProfileWithRoles } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppSidebar({ profile }: { profile: ProfileWithRoles | null }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const HRM_PATHS = new Set([
    "/hrm", "/employees", "/attendance", "/leave", "/payroll",
    "/recruitment", "/training", "/expenses", "/helpdesk", "/documents",
    "/shifts", "/offboarding", "/announcements", "/analytics", "/forms",
    "/integrations", "/workflows", "/okr", "/assets", "/biometric",
  ]);
  const isHrmActive = HRM_PATHS.has(path);
  const [hrmOpen, setHrmOpen] = useState(true);

  const tenantId = profile?.tenant_id || "default";
  const purchasedSlugKey = `tenant-${tenantId}-purchased-addons-v2`;

  const { data: installedAddons = [] } = useQuery({
    queryKey: ["realtime-tenant-installed-addons", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      try {
        const page = await api.get(`/cms/pages/${purchasedSlugKey}`);
        if (page?.content && Array.isArray(page.content)) return page.content as any[];
        return [];
      } catch { return []; }
    },
    enabled: !!tenantId,
  });

  const { data: serverEntitlements = {} } = useQuery({
    queryKey: ["tenant-addon-entitlements"],
    queryFn: async () => {
      try { const res = await api.get("/addons/entitlements"); return res?.entitlements || {}; }
      catch { return {}; }
    },
    staleTime: 2 * 60 * 1000,
  });

  function isAddonUnlocked(slug: string) {
    if (profile?.roles?.includes("super_admin")) return true;
    if (serverEntitlements[slug]?.isActive) return true;
    return installedAddons.some(
      (a: any) =>
        (a.addonSlug === slug || a.addonId === slug || a.slug === slug ||
          (a.name && a.name.toLowerCase() === slug.toLowerCase())) &&
        (a.status === "active" || a.status === "trial")
    );
  }

  const { data: platformSettings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      try { const page = await api.get("/cms/pages/system-platform-settings"); return page?.content || null; }
      catch { return null; }
    },
  });

  async function signOut() {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");
    navigate({ to: "/auth" });
  }

  const initials = (profile?.full_name || profile?.email || "U")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const isOkrUnlocked = isAddonUnlocked("okr-performance") || isAddonUnlocked("okr");
  const isAssetsUnlocked = isAddonUnlocked("asset-management") || isAddonUnlocked("assets");

  type NavItem = { title: string; url: string; icon: any; badge?: string };
  type NavGroup = { category: string; items: NavItem[] };

  const paidAddonItems: NavItem[] = [];
  if (isOkrUnlocked) paidAddonItems.push({ title: "OKR & Performance", url: "/okr", icon: Target, badge: "PRO" });
  if (isAssetsUnlocked) paidAddonItems.push({ title: "Asset Management", url: "/assets", icon: HardDrive, badge: "PRO" });

  const HRM_NAV_GROUPS: NavGroup[] = [
    { category: "Overview", items: [{ title: "HRM Hub", url: "/hrm", icon: Users }] },
    { category: "People", items: [{ title: "Employees", url: "/employees", icon: Users }] },
    {
      category: "Time & Attendance", items: [
        { title: "Attendance", url: "/attendance", icon: Clock },
        { title: "Leave & PTO", url: "/leave", icon: CalendarCheck },
        { title: "Shift Rostering", url: "/shifts", icon: Layers },
      ],
    },
    { category: "Payroll", items: [{ title: "Payroll Runs", url: "/payroll", icon: Wallet }] },
    {
      category: "Talent", items: [
        { title: "Recruitment (ATS)", url: "/recruitment", icon: Briefcase },
        { title: "Training / LMS", url: "/training", icon: GraduationCap },
      ],
    },
    {
      category: "Employee Services", items: [
        { title: "Expense Claims", url: "/expenses", icon: Receipt },
        { title: "Helpdesk", url: "/helpdesk", icon: HelpCircle },
        { title: "Document Vault", url: "/documents", icon: FolderLock },
      ],
    },
    { category: "Lifecycle", items: [{ title: "Offboarding / Exit", url: "/offboarding", icon: LogOut }] },
    ...(paidAddonItems.length > 0 ? [{ category: "Paid Add-ons", items: paidAddonItems }] : []),
    {
      category: "Analytics & Automation", items: [
        { title: "People Analytics", url: "/analytics", icon: BarChart3 },
        { title: "Form Builder", url: "/forms", icon: FileSpreadsheet },
        { title: "Automation Rules", url: "/workflows", icon: Workflow },
        { title: "Biometric Hardware", url: "/biometric", icon: Fingerprint },
        { title: "Integrations & API", url: "/integrations", icon: Sparkles },
        { title: "Announcements", url: "/announcements", icon: MessageSquare },
      ],
    },
  ];

  function SectionLabel({ label, color }: { label: string; color?: string }) {
    if (collapsed) return null;
    return (
      <div className="px-3 pt-3 pb-1">
        <span className={cn("text-[9px] font-black uppercase tracking-widest select-none", color || "text-muted-foreground/50")}>
          {label}
        </span>
      </div>
    );
  }

  function SimpleNavItem({ item }: { item: NavItem }) {
    const active = path === item.url;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={cn(
            "h-9 px-3 rounded-md text-[11px] font-medium transition-all",
            active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Link to={item.url} className="flex items-center gap-2.5">
            <item.icon className="size-4 shrink-0 opacity-80" />
            {!collapsed && <span>{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 shadow-[1px_0_12px_0_rgba(0,0,0,0.07)] dark:shadow-[1px_0_12px_0_rgba(0,0,0,0.35)]"
      style={{ background: "var(--color-sidebar)" }}
    >
      {/* ─── Logo Header ─── */}
      <SidebarHeader className="border-b border-sidebar-border/60 p-0">
        <Link to="/dashboard" className="flex items-center justify-center py-3 px-4 hover:opacity-80 transition-opacity">
          {collapsed ? (
            <img
              src={platformSettings?.faviconUrl || "/favicon.webp"}
              alt="Logo"
              className="size-8 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = "/favicon.webp"; }}
             loading="lazy"/>
          ) : (
            <img
              src={platformSettings?.logoLightUrl || "/logo.webp"}
              alt="Platform"
              className="h-9 w-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo.webp"; }}
             loading="lazy"/>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 overflow-x-hidden">

        {/* Dashboard */}
        <SidebarGroup className="p-0 mt-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={path === "/dashboard"}
                  className={cn(
                    "h-9 px-3 rounded-md text-[11px] font-medium transition-all",
                    path === "/dashboard" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Link to="/dashboard" className="flex items-center gap-2.5">
                    <LayoutDashboard className="size-4 shrink-0" />
                    {!collapsed && <span>Dashboard</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Apps & Modules */}
        <SectionLabel label="Apps & Modules" />
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {/* HRM Suite collapsible */}
              <Collapsible open={hrmOpen} onOpenChange={setHrmOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        "w-full h-9 px-3 rounded-md text-[11px] font-medium transition-all",
                        isHrmActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <span className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Users className={cn("size-4 shrink-0", isHrmActive ? "text-primary" : "opacity-70")} />
                        {!collapsed && <span className="truncate">HRM Suite</span>}
                      </span>
                      {!collapsed && (
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="text-[8px] font-bold px-1.5 rounded bg-primary/10 text-primary leading-4">PRO</span>
                          {hrmOpen
                            ? <ChevronDown className="size-3 opacity-50" />
                            : <ChevronRight className="size-3 opacity-50" />
                          }
                        </span>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <div className="ml-3 mt-0.5 pl-3 border-l border-border/40 space-y-0.5 max-h-[400px] overflow-y-auto pr-1 py-0.5">
                        {HRM_NAV_GROUPS.map((group) => (
                          <div key={group.category} className="mb-2">
                            <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 px-2 py-1 select-none">
                              {group.category}
                            </div>
                            {group.items.map((sub) => {
                              const active = path === sub.url;
                              return (
                                <Link
                                  key={sub.url}
                                  to={sub.url}
                                  className={cn(
                                    "flex items-center justify-between px-2.5 py-1.5 text-[11px] rounded-md transition-all",
                                    active
                                      ? "bg-primary text-primary-foreground font-semibold"
                                      : "text-muted-foreground hover:text-foreground hover:bg-accent font-medium"
                                  )}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <sub.icon className="size-3.5 shrink-0 opacity-80" />
                                    <span className="truncate">{sub.title}</span>
                                  </span>
                                  {sub.badge && !active && (
                                    <span className="text-[8px] font-bold px-1 rounded bg-primary/10 text-primary leading-4">
                                      {sub.badge}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>

              <SimpleNavItem item={{ title: "Point of Sale", url: "/pos", icon: ShoppingCart }} />
              <SimpleNavItem item={{ title: "Accounting & Ledgers", url: "/accounting", icon: Landmark }} />
              <SimpleNavItem item={{ title: "Products & Catalog", url: "/products", icon: Package }} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sales & Projects */}
        <SectionLabel label="Sales & Projects" />
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "CRM Pipelines", url: "/crm", icon: Target },
                { title: "Proposals", url: "/proposals", icon: FileText },
                { title: "Invoices & Billing", url: "/invoices", icon: Receipt },
                { title: "Projects & Tasks", url: "/projects", icon: Kanban },
                { title: "Team Chat", url: "/chat", icon: MessageSquare },
              ].map((item) => <SimpleNavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Extensions */}
        <SectionLabel label="Extensions" />
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild isActive={path === "/marketplace"}
                  className={cn("h-9 px-3 rounded-md text-[11px] font-medium transition-all",
                    path === "/marketplace" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent")}
                >
                  <Link to="/marketplace" className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5">
                      <Store className="size-4 shrink-0 opacity-80" />
                      {!collapsed && <span>Marketplace</span>}
                    </span>
                    {!collapsed && <span className="text-[8px] font-bold px-1.5 rounded bg-purple-500/10 text-purple-600 leading-4">500+</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAddonUnlocked("whatsapp-alerts") && <SimpleNavItem item={{ title: "WhatsApp Gateway", url: "/whatsapp-alerts", icon: MessageSquare }} />}
              {isAddonUnlocked("biometric-sync") && <SimpleNavItem item={{ title: "Biometric Sync Hub", url: "/biometric-sync", icon: Fingerprint }} />}
              {isAddonUnlocked("ai-ocr") && <SimpleNavItem item={{ title: "AI Invoice OCR", url: "/ai-ocr", icon: ScanLine }} />}
              {(isAddonUnlocked("ai-content-generator") || isAddonUnlocked("ai-writer")) && (
                <SimpleNavItem item={{ title: "AI Content Studio", url: "/ai-writer", icon: Sparkles }} />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SectionLabel label="Settings" />
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SimpleNavItem item={{ title: "Organization Settings", url: "/settings", icon: Building2 }} />
              <SimpleNavItem item={{ title: "Subscription & Billing", url: "/subscription", icon: CreditCard }} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Super Admin */}
        {profile?.roles?.includes("super_admin") && (
          <>
            <SectionLabel label="System" color="text-purple-500/70" />
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild isActive={path.startsWith("/super")}
                      className={cn("h-9 px-3 rounded-md text-[11px] font-semibold transition-all",
                        path.startsWith("/super")
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          : "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10")}
                    >
                      <Link to="/super" className="flex items-center gap-2.5">
                        <ShieldCheck className="size-4 shrink-0" />
                        {!collapsed && <span>Super Admin Console</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* ─── User Footer ─── */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <div className={cn("flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/60 transition-colors", collapsed && "justify-center")}>
          <Avatar className="size-8 shrink-0 ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url || "/favicon.webp"} alt={profile?.full_name || "User"} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate text-foreground leading-tight">{profile?.full_name || "User"}</div>
                <div className="text-[10px] text-muted-foreground truncate leading-tight">{profile?.email}</div>
              </div>
              <Button
                variant="ghost" size="icon"
                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={signOut} title="Sign out"
              >
                <LogOut className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}