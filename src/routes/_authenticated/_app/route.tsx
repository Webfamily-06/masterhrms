import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useSession, useCurrentProfile } from "@/lib/session";
import { RealtimeNotificationDrawer } from "@/components/realtime-notification-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { AICopilotWidget } from "@/components/ai-copilot-widget";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Search, ChevronRight, Home, ShieldCheck, Settings, CreditCard, LogOut,
  Sparkles, Users, Clock, CalendarCheck, Wallet, Briefcase, GraduationCap, HelpCircle,
  Receipt, FileText, FolderLock, Layers, FileSpreadsheet, Workflow, BarChart3,
  ShoppingCart, Landmark, Kanban, MessageSquare, Package, Store, Compass,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppShell,
});

const ALL_SEARCH_ITEMS = [
  { title: "Executive Dashboard", url: "/dashboard", group: "ERP Core", icon: Home },
  { title: "Point of Sale (POS)", url: "/pos", group: "ERP Core", icon: ShoppingCart },
  { title: "Accounting & Ledgers", url: "/accounting", group: "ERP Core", icon: Landmark },
  { title: "Products & Services", url: "/products", group: "ERP Core", icon: Package },
  { title: "Projects & Tasks", url: "/projects", group: "ERP Core", icon: Kanban },
  { title: "Sales CRM Pipeline", url: "/crm", group: "Sales & Finance", icon: Compass },
  { title: "Invoices & Billing", url: "/invoices", group: "Sales & Finance", icon: Receipt },
  { title: "Team Chat", url: "/chat", group: "Collaboration", icon: MessageSquare },
  { title: "HRM Hub & Overview", url: "/hrm", group: "HRM Suite", icon: Users },
  { title: "Employee Directory", url: "/employees", group: "HRM Suite", icon: Users },
  { title: "Attendance & Clock", url: "/attendance", group: "HRM Suite", icon: Clock },
  { title: "Leave & PTO Management", url: "/leave", group: "HRM Suite", icon: CalendarCheck },
  { title: "Payroll Runs", url: "/payroll", group: "HRM Suite", icon: Wallet },
  { title: "Recruitment & ATS", url: "/recruitment", group: "HRM Suite", icon: Briefcase },
  { title: "Training & LMS", url: "/training", group: "HRM Suite", icon: GraduationCap },
  { title: "Expense Claims", url: "/expenses", group: "HRM Suite", icon: Receipt },
  { title: "Employee Helpdesk", url: "/helpdesk", group: "HRM Suite", icon: HelpCircle },
  { title: "Document Vault", url: "/documents", group: "HRM Suite", icon: FolderLock },
  { title: "Shift Rostering", url: "/shifts", group: "HRM Suite", icon: Layers },
  { title: "People Analytics", url: "/analytics", group: "HRM Suite", icon: BarChart3 },
  { title: "Form Builder", url: "/forms", group: "HRM Suite", icon: FileSpreadsheet },
  { title: "Workflow Automation", url: "/workflows", group: "HRM Suite", icon: Workflow },
  { title: "AI Content Studio", url: "/ai-writer", group: "Platform", icon: Sparkles },
  { title: "App Marketplace", url: "/marketplace", group: "Platform", icon: Store },
  { title: "Subscription & Billing", url: "/subscription", group: "Platform", icon: CreditCard },
  { title: "Company Settings", url: "/settings", group: "Platform", icon: Settings },
];

function AppShell() {
  const { user, loading } = useSession();
  const { data: profile, isLoading } = useCurrentProfile(user);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && profile && !profile.tenant_id) {
      navigate({ to: "/onboarding" });
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
    sessionStorage.removeItem("auth_token");
    navigate({ to: "/auth" });
  }

  if (loading || isLoading || !profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!profile.tenant_id) return null;

  const initials = useMemo(
    () => (profile?.full_name || profile?.email || "U").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase(),
    [profile?.full_name, profile?.email]
  );

  const pathSegments = path.split("/").filter(Boolean);
  const currentTitle =
    ALL_SEARCH_ITEMS.find((item) => item.url === path)?.title ||
    (pathSegments[pathSegments.length - 1] ? pathSegments[pathSegments.length - 1].replace(/-/g, " ") : "Dashboard");

  const roleLabel = (profile.roles?.[0] || "member").replace(/_/g, " ");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[60px] flex items-center gap-3 border-b border-border/60 bg-card/80 backdrop-blur-md px-4 sm:px-6 sticky top-0 z-30">
            <SidebarTrigger className="size-8 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0" />
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
              <Link to="/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                <Home className="size-3.5" /><span>Home</span>
              </Link>
              <ChevronRight className="size-3 text-muted-foreground/40" />
              <span className="text-foreground font-semibold capitalize truncate max-w-[240px]">{currentTitle}</span>
            </nav>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}
              className={cn("h-8 px-3 gap-2 justify-between rounded-lg text-xs w-36 sm:w-56 bg-muted/50 hover:bg-accent border-border/60 text-muted-foreground")}>
              <span className="flex items-center gap-2"><Search className="size-3.5 shrink-0" /><span className="hidden sm:inline">Search...</span></span>
              <kbd className="hidden sm:inline-flex pointer-events-none h-4 items-center gap-0.5 rounded border bg-background px-1 font-mono text-[9px] font-medium text-muted-foreground"><span>⌘</span>K</kbd>
            </Button>
            <RealtimeNotificationDrawer />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0 shrink-0">
                  <Avatar className="size-8">
                    <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end" forceMount>
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 ring-2 ring-primary/20">
                      <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-bold leading-tight truncate">{profile.full_name || "User"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
                      <div className="flex items-center gap-1 pt-0.5">
                        <Badge variant="outline" className="text-[9px] capitalize font-bold py-0 h-4 px-1.5 bg-primary/5 text-primary border-primary/20">{roleLabel}</Badge>
                        <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1.5 truncate max-w-[90px]">{profile.tenant?.name || "Workspace"}</Badge>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2.5 cursor-pointer"><Settings className="size-4 text-muted-foreground" /><span>Settings</span></Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/subscription" className="flex items-center gap-2.5 cursor-pointer"><CreditCard className="size-4 text-muted-foreground" /><span>Subscription & Plan</span></Link>
                </DropdownMenuItem>
                {profile.roles?.includes("super_admin") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/super" className="flex items-center gap-2.5 cursor-pointer text-purple-600 dark:text-purple-400 font-semibold">
                        <ShieldCheck className="size-4" /><span>Super Admin Console</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="size-4" /><span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search ERP & HRM modules..." />
        <CommandList className="max-h-[380px]">
          <CommandEmpty>No matching modules found.</CommandEmpty>
          {["ERP Core", "HRM Suite", "Sales & Finance", "Collaboration", "Platform"].map((group) => {
            const items = ALL_SEARCH_ITEMS.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => (
                  <CommandItem key={item.url} onSelect={() => { setSearchOpen(false); navigate({ to: item.url }); }}
                    className="flex items-center justify-between gap-2 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <item.icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{item.url}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
      <AICopilotWidget />
    </SidebarProvider>
  );
}
