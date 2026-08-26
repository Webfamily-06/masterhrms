import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession, useCurrentProfile } from "@/lib/session";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Loader2,
  LayoutDashboard,
  FileText,
  Store,
  ShieldCheck,
  Building2,
  LogOut,
  ArrowLeft,
  LifeBuoy,
  CreditCard,
  Mail,
  Bell,
  ImageIcon,
  BarChart3,
  Database,
  Settings,
  Search,
  Globe,
  ChevronRight,
  Code,
  BookOpen,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/super")({
  component: SuperShell,
});

type SuperNavItem = {
  to: string;
  label: string;
  icon: any;
  group: string;
  badge?: string;
};

const ALL_SUPER_SEARCH_ITEMS: SuperNavItem[] = [
  // ── Core Orchestration
  { to: "/super", label: "Root Command Center", icon: LayoutDashboard, group: "Core Orchestration" },
  { to: "/super/tenants", label: "Tenant Workspaces", icon: Building2, group: "Core Orchestration", badge: "Multi-Tenant" },
  { to: "/super/plans", label: "Subscription Plans", icon: CreditCard, group: "Core Orchestration" },
  { to: "/super/roles", label: "Roles & RBAC Matrix", icon: ShieldCheck, group: "Core Orchestration" },

  // ── Ecosystem & Marketplace
  { to: "/super/marketplace", label: "Addons Marketplace", icon: Store, group: "Ecosystem", badge: "500+ Live" },

  // ── Marketing & CMS
  { to: "/super/cms", label: "Visual CMS Studio", icon: FileText, group: "Marketing & CMS", badge: "Studio 2.0" },
  { to: "/super/blogs", label: "Blog Insights", icon: BookOpen, group: "Marketing & CMS" },
  { to: "/super/case-studies", label: "Case Studies", icon: Briefcase, group: "Marketing & CMS" },
  { to: "/super/media", label: "Media Library", icon: ImageIcon, group: "Marketing & CMS" },

  // ── Communications
  { to: "/super/support", label: "Global Support Desk", icon: LifeBuoy, group: "Communications" },
  { to: "/super/email-templates", label: "Email Templates", icon: Mail, group: "Communications" },
  { to: "/super/notifications", label: "Broadcast Alerts", icon: Bell, group: "Communications" },

  // ── System Controls
  { to: "/super/settings", label: "Platform Settings", icon: Settings, group: "System Controls" },
  { to: "/super/analytics", label: "Platform Analytics", icon: BarChart3, group: "System Controls" },
  { to: "/super/languages", label: "Localization (i18n)", icon: Globe, group: "System Controls" },
  { to: "/super/backup", label: "Database Backups", icon: Database, group: "System Controls" },
  { to: "/super/api-docs", label: "API Reference", icon: Code, group: "System Controls" },
];

function SuperSidebar({ profile }: { profile: any }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const groups = [
    { title: "Core Orchestration", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "Core Orchestration") },
    { title: "Ecosystem & Apps", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "Ecosystem") },
    { title: "Marketing & CMS", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "Marketing & CMS") },
    { title: "Communications", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "Communications") },
    { title: "System Controls", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "System Controls") },
  ];

  async function handleSignOut() {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hrms_auth_token");
    sessionStorage.removeItem("auth_token");
    navigate({ to: "/super-login" });
  }

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* Brand Header */}
      <SidebarHeader className="h-[60px] flex items-center px-4 border-b border-sidebar-border">
        <Link to="/super" className="flex items-center justify-between gap-2.5 w-full">
          <img src="/logo.webp" alt="Master Platform" className="h-8 max-h-9 w-auto object-contain" />
          <Badge className="bg-purple-600 text-white text-[9px] font-mono uppercase font-bold py-0 h-4 shrink-0">
            ROOT
          </Badge>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {groups.map((g) => (
          <SidebarGroup key={g.title} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-2 mb-1">
              {g.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const isActive = item.to === "/super" ? path === "/super" : path.startsWith(item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          "h-8.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Link to={item.to} className="flex items-center gap-2.5 w-full text-left">
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1.5 py-0 h-4 font-mono font-bold shrink-0 ml-auto",
                                isActive
                                  ? "border-white/30 text-white bg-white/10"
                                  : "border-primary/20 text-primary bg-primary/5"
                              )}
                            >
                              {item.badge}
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

      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-1.5 bg-sidebar">
        <Link
          to="/dashboard"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-sidebar-accent transition-colors border border-sidebar-border"
        >
          <span className="flex items-center gap-2">
            <ArrowLeft className="size-3.5 text-primary" /> Switch to App
          </span>
          <ExternalLink className="size-3 text-muted-foreground" />
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
        >
          <LogOut className="size-3.5" /> Sign Out of Console
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

function SuperShell() {
  const { user, loading } = useSession();
  const { data: profile, isLoading } = useCurrentProfile(user);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && profile && !profile.roles?.includes("super_admin")) {
      navigate({ to: "/dashboard" });
    }
  }, [profile, isLoading, navigate]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  async function handleSignOut() {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hrms_auth_token");
    sessionStorage.removeItem("auth_token");
    navigate({ to: "/super-login" });
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verifying root access...</p>
        </div>
      </div>
    );
  }

  if (!profile?.roles?.includes("super_admin")) {
    return null;
  }

  const initials = (profile?.full_name || profile?.email || "SA")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const currentItem = ALL_SUPER_SEARCH_ITEMS.find((item) =>
    item.to === "/super" ? path === "/super" : path.startsWith(item.to)
  );
  const currentTitle = currentItem?.label || "Root Command Center";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background font-sans">
        <SuperSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Exact 60px Unified Topbar */}
          <header className="h-[60px] flex items-center gap-3 border-b border-border/60 bg-card/80 backdrop-blur-md px-4 sm:px-6 sticky top-0 z-30">
            <SidebarTrigger className="size-8 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0" />
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
              <Link to="/super" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                <ShieldCheck className="size-3.5 text-primary" /><span>Super Console</span>
              </Link>
              <ChevronRight className="size-3 text-muted-foreground/40" />
              <span className="text-foreground font-semibold capitalize truncate max-w-[240px]">{currentTitle}</span>
            </nav>

            <div className="flex-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "h-8 px-3 gap-2 justify-between rounded-lg text-xs w-36 sm:w-56 bg-muted/50 hover:bg-accent border-border/60 text-muted-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <Search className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Search console...</span>
              </span>
              <kbd className="hidden sm:inline-flex pointer-events-none h-4 items-center gap-0.5 rounded border bg-background px-1 font-mono text-[9px] font-medium text-muted-foreground">
                <span>⌘</span>K
              </kbd>
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0 shrink-0">
                  <Avatar className="size-8">
                    <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "Admin"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end" forceMount>
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 ring-2 ring-primary/20">
                      <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "Admin"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-bold leading-tight truncate">{profile.full_name || "Super Admin"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
                      <div className="flex items-center gap-1 pt-0.5">
                        <Badge className="bg-purple-600 text-white text-[9px] font-bold py-0 h-4 px-1.5">SUPER ADMIN</Badge>
                        <Badge variant="outline" className="text-[9px] py-0 h-4 px-1.5 border-purple-500/30 text-purple-600">Root</Badge>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/super/settings" className="flex items-center gap-2.5 cursor-pointer">
                    <Settings className="size-4 text-muted-foreground" /><span>Platform Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2.5 cursor-pointer">
                    <ArrowLeft className="size-4 text-muted-foreground" /><span>Switch to Tenant App</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="size-4" /><span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Unified Page Content Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search Super Admin console..." />
        <CommandList className="max-h-[380px]">
          <CommandEmpty>No matching tools found.</CommandEmpty>
          {["Core Orchestration", "Ecosystem", "Marketing & CMS", "Communications", "System Controls"].map((group) => {
            const items = ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.to}
                    onSelect={() => {
                      setSearchOpen(false);
                      navigate({ to: item.to });
                    }}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{item.to}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}

