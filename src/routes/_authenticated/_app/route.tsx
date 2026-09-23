import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DreamsSidebar } from "@/components/dreams-sidebar";
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
import {
  Loader2, Home, User, ShieldCheck, Settings, CreditCard, LogOut,
  Sparkles, Users, Clock, CalendarCheck, Wallet, Briefcase, GraduationCap, HelpCircle,
  Receipt, FileText, FolderLock, Layers, FileSpreadsheet, Workflow, BarChart3,
  ShoppingCart, Landmark, Kanban, MessageSquare, Package, Store, Compass,
  Fingerprint, ScanLine, HardDrive, Target, ArrowRightLeft, Truck, Building2, SlidersHorizontal
} from "lucide-react";
import { api, clearToken } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppShell,
});

const ALL_SEARCH_ITEMS = [
  { title: "HRM Dashboard", url: "/dashboard", group: "ERP Core", icon: Home },
  { title: "POS Dashboard", url: "/pos-dashboard", group: "ERP Core", icon: ShoppingCart },
  { title: "Inventory Dashboard", url: "/inventory-dashboard", group: "ERP Core", icon: Package },
  { title: "Sales CRM Dashboard", url: "/crm-dashboard", group: "ERP Core", icon: Compass },
  { title: "Finance Dashboard", url: "/finance-dashboard", group: "ERP Core", icon: Landmark },
  { title: "Project Dashboard", url: "/project-dashboard", group: "ERP Core", icon: Kanban },
  { title: "Analytics Overview", url: "/analytics", group: "ERP Core", icon: BarChart3 },
  { title: "Point of Sale (POS Terminal)", url: "/pos", group: "ERP Core", icon: ShoppingCart },
  { title: "Online Storefront Catalog", url: "/store", group: "ERP Core", icon: Store },
  { title: "Client Invoice Portal (B2B)", url: "/portal/invoices/INV-2026-001", group: "Sales & Finance", icon: Receipt },
  { title: "WooCommerce Sync", url: "/integrations", group: "Extensions", icon: ShoppingCart },
  { title: "Shopify Sync", url: "/shopify", group: "Extensions", icon: Store },
  { title: "Products & Catalog", url: "/products", group: "ERP Core", icon: Package },
  { title: "Stock Transfers & In-Transit", url: "/transfers", group: "ERP Core", icon: ArrowRightLeft },
  { title: "Stock Adjustments & Audits", url: "/adjustments", group: "ERP Core", icon: SlidersHorizontal },
  { title: "Purchase Orders & Inward", url: "/purchases", group: "ERP Core", icon: Truck },
  { title: "Supplier Master Directory", url: "/suppliers", group: "ERP Core", icon: Building2 },
  { title: "Accounting & Ledgers", url: "/accounting", group: "Sales & Finance", icon: Landmark },
  { title: "Projects & Tasks", url: "/projects", group: "Platform", icon: Kanban },
  { title: "Sales CRM Pipeline", url: "/crm", group: "Sales & Finance", icon: Compass },
  { title: "Invoices & Billing", url: "/invoices", group: "Sales & Finance", icon: Receipt },
  { title: "Proposals & Quotes", url: "/proposals", group: "Sales & Finance", icon: FileText },
  { title: "Expense Claims", url: "/expenses", group: "Sales & Finance", icon: Wallet },
  { title: "Team Chat", url: "/chat", group: "Collaboration", icon: MessageSquare },
  { title: "AI Document OCR", url: "/ai-ocr", group: "Collaboration", icon: ScanLine },
  { title: "AI Copywriter", url: "/ai-writer", group: "Collaboration", icon: Sparkles },
  { title: "HRM Hub & Overview", url: "/hrm", group: "HRM Suite", icon: Users },
  { title: "Employee Directory", url: "/employees", group: "HRM Suite", icon: Users },
  { title: "Attendance & Clock", url: "/attendance", group: "HRM Suite", icon: Clock },
  { title: "Leave Management", url: "/leave", group: "HRM Suite", icon: CalendarCheck },
  { title: "Shift Rostering", url: "/shifts", group: "HRM Suite", icon: Layers },
  { title: "Payroll Runs", url: "/payroll", group: "HRM Suite", icon: Wallet },
  { title: "Recruitment (ATS)", url: "/recruitment", group: "HRM Suite", icon: Briefcase },
  { title: "Training & LMS", url: "/training", group: "HRM Suite", icon: GraduationCap },
  { title: "Helpdesk & Tickets", url: "/helpdesk", group: "HRM Suite", icon: HelpCircle },
  { title: "Document Vault", url: "/documents", group: "HRM Suite", icon: FolderLock },
  { title: "OKR & Goals", url: "/okr", group: "HRM Suite", icon: Target },
  { title: "Asset Management", url: "/assets", group: "HRM Suite", icon: HardDrive },
  { title: "Offboarding & Exit", url: "/offboarding", group: "HRM Suite", icon: LogOut },
  { title: "Biometric Hardware", url: "/biometric", group: "HRM Suite", icon: Fingerprint },
  { title: "Live Biometric Agent", url: "/biometric-sync", group: "HRM Suite", icon: Fingerprint },
  { title: "Form Builder", url: "/forms", group: "HRM Suite", icon: FileSpreadsheet },
  { title: "Automation Rules", url: "/workflows", group: "HRM Suite", icon: Workflow },
  { title: "People Analytics", url: "/analytics", group: "HRM Suite", icon: BarChart3 },
  { title: "App Marketplace", url: "/marketplace", group: "Extensions", icon: Store },
  { title: "Integrations & API", url: "/integrations", group: "Extensions", icon: Sparkles },
  { title: "Google Workspace", url: "/google-workspace", group: "Extensions", icon: Sparkles },
  { title: "Tally Prime Importer", url: "/tally-importer", group: "Extensions", icon: Layers },
  { title: "WhatsApp Alerts", url: "/whatsapp-alerts", group: "Extensions", icon: MessageSquare },
  { title: "Razorpay Gateway", url: "/razorpay-gateway", group: "Extensions", icon: CreditCard },
  { title: "Workspace Settings", url: "/settings", group: "Platform", icon: Settings },
  { title: "Users & Roles", url: "/users", group: "Platform", icon: Users },
  { title: "Subscription & Plan", url: "/subscription", group: "Platform", icon: CreditCard },
  { title: "Super Admin Console", url: "/super", group: "Platform", icon: ShieldCheck },
];

function AppShell() {
  const { data: profile, isLoading, error: profileError, refetch: reloadProfile } = useCurrentProfile();
  const { loading } = useSession();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  


  useEffect(() => {
    if (!loading && !isLoading && !localStorage.getItem("hrms_auth_token")) {
      navigate({ to: "/login" });
      return;
    }
    if (!loading && !isLoading && profile && !profile.tenant_id) {
      if (profile.roles?.includes("super_admin")) {
        navigate({ to: "/super" });
      } else {
        navigate({ to: "/onboarding" });
      }
    }
  }, [loading, isLoading, profile, navigate]);

  // Sidebar collapse state with localStorage persistence
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("master_hrms_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Full View Dashboard mode state (hides sidebar completely for true full-width screen)
  const [fullView, setFullView] = useState<boolean>(() => {
    try {
      return localStorage.getItem("master_hrms_full_view") === "true";
    } catch {
      return false;
    }
  });

  // Browser native fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== "undefined" && !!document.fullscreenElement;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Synchronize full-view, mini-sidebar classes on document.body and document.documentElement
  useEffect(() => {
    if (fullView) {
      document.body.classList.add("full-view", "full-width");
      document.documentElement.setAttribute("data-layout", "full-width");
      document.body.classList.remove("mini-sidebar", "expand-menu");
    } else {
      document.body.classList.remove("full-view", "full-width");
      document.documentElement.removeAttribute("data-layout");
      if (collapsed) {
        document.body.classList.add("mini-sidebar");
      } else {
        document.body.classList.remove("mini-sidebar", "expand-menu");
      }
    }
    try {
      localStorage.setItem("master_hrms_full_view", String(fullView));
      localStorage.setItem("master_hrms_sidebar_collapsed", String(collapsed));
    } catch {}
  }, [fullView, collapsed]);

  // Synchronize mobile slide-nav on document.body and html
  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("slide-nav");
      document.documentElement.classList.add("menu-opened");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("slide-nav");
      document.documentElement.classList.remove("menu-opened");
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  // Global keyboard shortcut: ⌘K for search, ⌘B for sidebar toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if ((e.key === "b" || e.key === "B") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setFullView((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Close mobile sidebar on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  async function handleSignOut() {
    try { await api.post("/auth/logout"); } catch {}
    clearToken();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hrms_auth_token");
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("hrms_auth_token");
    navigate({ to: "/auth" });
  }

  if (profileError) return <div className="min-h-screen grid place-items-center p-6"><div role="alert" className="max-w-md space-y-4 rounded-lg border p-6"><h1 className="font-semibold">Workspace unavailable</h1><p className="text-sm">{profileError.message}</p><div className="flex gap-4"><button onClick={() => reloadProfile()} className="underline">Retry</button><button onClick={handleSignOut} className="underline">Sign out</button></div></div></div>;

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

  if (!profile.tenant_id && !profile.roles?.includes("super_admin")) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <h2 className="text-base font-bold">Workspace Configuration Required</h2>
          <p className="text-xs text-muted-foreground">
            Please complete the organization onboarding setup to activate your dashboard.
          </p>
          <Button asChild size="sm" className="mt-2 text-xs font-bold">
            <Link to="/onboarding">Complete Setup Wizard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = (profile?.full_name || profile?.email || "U")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = (profile.roles?.[0] || "member").replace(/_/g, " ");

  return (
    <div
      className={cn(
        "main-wrapper min-h-screen w-full relative",
        mobileOpen && "slide-nav",
        !fullView && collapsed && "mini-sidebar",
        fullView && "full-view full-width"
      )}
    >
      {/* Dreams ERP Sidenav */}
      <DreamsSidebar
        profile={profile}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        fullView={fullView}
        onToggleFullView={() => setFullView((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Topbar Header */}
      <header className="navbar-header flex items-center max-lg:w-full">
        <div className="topbar-menu flex items-center justify-between w-full gap-2 px-1 sm:px-2 flex-nowrap">
          {/* Left section: mobile hamburger + mobile brand logo + desktop collapse toggle + workspace */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Sidenav Hamburger Button */}
            <button
              type="button"
              id="mobile_btn"
              className="mobile-btn lg:hidden flex items-center justify-center size-9 rounded-lg border border-border-color bg-white dark:bg-slate-900 text-foreground shadow-xs hover:bg-light cursor-pointer transition-colors"
              onClick={() => setMobileOpen((m) => !m)}
              aria-label="Toggle Navigation Menu"
            >
              <i className="ph-duotone ph-list text-xl"></i>
            </button>

            {/* Mobile Brand Logo (Visible only on mobile / tablet < 992px) */}
            <Link to="/dashboard" className="logo lg:hidden flex items-center gap-1.5 shrink-0">
              <img src="/logo.webp" alt="Master Platform" className="h-7 max-h-7 w-auto object-contain" />
            </Link>

            {/* Desktop Full Sidebar / Mini Sidebar Toggle Button */}
            <button
              type="button"
              id="toggle_btn2"
              onClick={() => {
                if (fullView) {
                  setFullView(false);
                  setCollapsed(false);
                } else {
                  setCollapsed((c) => !c);
                }
              }}
              className={cn(
                "sidenav-toggle-btn topbar-link shrink-0 size-9 text-[18px] hidden lg:flex items-center justify-center rounded-lg border transition-all cursor-pointer shadow-xs",
                collapsed
                  ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                  : "bg-white dark:bg-slate-900 border-border-color hover:bg-light text-foreground"
              )}
              aria-label="Toggle Sidebar Mini Rail"
              title={collapsed ? "Expand Sidebar to Full Width (250px)" : "Collapse Sidebar to Mini Rail (72px)"}
            >
              <i className={cn("ph-duotone", collapsed ? "ph-caret-right" : "ph-caret-left")}></i>
            </button>

            {/* Active Company / Workspace Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="header-item hidden md:flex relative company-dropdown me-auto cursor-pointer">
                  <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md py-[6px] px-2.5 flex items-center justify-between gap-2 shadow-xs hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-md flex items-center justify-center shrink-0">
                        <img src="/favicon.webp" alt="company" className="size-3.5" />
                      </div>
                      <p className="text-[13px] font-semibold text-title leading-none truncate max-w-[150px]">
                        {profile.tenant?.name || "Falcon LLP"}
                      </p>
                    </div>
                    <i className="ph-duotone ph-caret-down text-xs text-muted-foreground"></i>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 p-2" align="start">
                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Active Workspace
                </DropdownMenuLabel>
                <DropdownMenuItem className="flex items-center gap-2 p-2 rounded-md font-medium text-sm">
                  <div className="size-6 rounded-md flex items-center justify-center">
                    <img src="/favicon.webp" alt="Tenant" className="size-4" />
                  </div>
                  <span className="truncate">{profile.tenant?.name || "Falcon LLP"}</span>
                  <Badge variant="outline" className="ms-auto text-[9px] py-0 px-1 border-primary/40 text-primary">Live</Badge>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 p-2 cursor-pointer text-xs">
                    <Settings className="size-3.5 text-muted-foreground" />
                    <span>Workspace Settings</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right section items */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Quick POS Terminal Button */}
            <Link
              to="/pos"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
              title="Open POS Terminal"
            >
              <i className="ph-duotone ph-shopping-cart text-sm"></i>
              <span>POS Register</span>
            </Link>

            {/* Customer Display New Window Launch */}
            <a
              href="/customer-display"
              target="_blank"
              rel="noopener noreferrer"
              className="header-item topbar-link hidden xl:flex items-center justify-center size-8 rounded-md border border-border-color bg-white dark:bg-slate-900 hover:bg-light text-foreground shadow-xs"
              title="Open Dual Customer Display in New Window"
            >
              <i className="ph-duotone ph-monitor text-base"></i>
            </a>

            {/* Global Search Trigger Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="header-item flex items-center gap-2 px-2.5 py-1.5 h-8 rounded-md border border-border-color bg-light/60 hover:bg-light text-muted-foreground hover:text-foreground text-xs transition-colors shadow-xs"
              aria-label="Global Search"
            >
              <i className="ph-duotone ph-magnifying-glass text-sm"></i>
              <span className="hidden md:inline font-medium">Search...</span>
              <kbd className="hidden sm:inline-flex pointer-events-none h-4 items-center gap-0.5 rounded border bg-background px-1 font-mono text-[9px] font-semibold text-muted-foreground">⌘K</kbd>
            </button>

            {/* Realtime Notification Drawer */}
            <div className="header-item">
              <RealtimeNotificationDrawer />
            </div>

            {/* Chat Quick Link */}
            <div className="header-item hidden sm:flex">
              <Link
                to="/chat"
                className="topbar-link flex items-center justify-center size-8 rounded-md border border-border-color bg-white dark:bg-slate-900 hover:bg-light text-foreground shadow-xs"
                title="Team Chat & Live Messaging"
              >
                <i className="ph-duotone ph-chats-circle text-base"></i>
              </Link>
            </div>

            {/* Full View Canvas Toggle (Hide / Show Sidebar) */}
            <div className="header-item hidden lg:flex">
              <button
                type="button"
                id="btn_full_view"
                onClick={() => setFullView((v) => !v)}
                className={cn(
                  "topbar-link flex items-center justify-center size-8 rounded-md border transition-all cursor-pointer shadow-xs",
                  fullView
                    ? "bg-primary text-white border-primary hover:bg-primary/90"
                    : "bg-white dark:bg-slate-900 border-border-color hover:bg-light text-foreground"
                )}
                title={fullView ? "Exit Full View (Show Sidebar) (⌘B)" : "Full View Canvas (Hide Sidebar) (⌘B)"}
                aria-label="Toggle Full View Canvas"
              >
                <i className={cn("text-base ph-duotone", fullView ? "ph-sidebar-simple" : "ph-arrows-out-line-horizontal")}></i>
              </button>
            </div>

            {/* Native Fullscreen / Full View Screen Toggle */}
            <div className="header-item">
              <button
                type="button"
                id="btn_fullscreen"
                onClick={toggleBrowserFullscreen}
                className="topbar-link flex items-center justify-center size-8 rounded-md border border-border-color bg-white dark:bg-slate-900 hover:bg-light text-foreground shadow-xs cursor-pointer transition-colors"
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Full View Screen (Fullscreen)"}
                aria-label="Toggle Fullscreen"
              >
                <i className={cn("text-base ph-duotone", isFullscreen ? "ph-arrows-in" : "ph-arrows-out")}></i>
              </button>
            </div>

            {/* Light / Dark Mode Toggle */}
            <div className="header-item">
              <ThemeToggle />
            </div>

            {/* User Profile Dropdown */}
            <div className="profile-dropdown">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0.5 cursor-pointer"
                    aria-label="User Profile"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-3" align="end" forceMount>
                  <DropdownMenuLabel className="p-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 ring-2 ring-primary/20">
                        <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "User"} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-bold leading-tight truncate text-foreground">{profile.full_name || "User"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
                        <div className="flex items-center gap-1 pt-0.5">
                          <Badge variant="outline" className="text-[9px] capitalize font-bold py-0 h-4 px-1.5 bg-primary/5 text-primary border-primary/20">
                            {roleLabel}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1.5 truncate max-w-[90px]">
                            {profile.tenant?.name || "Workspace"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />

                  {/* 2FA Security Status Indicator */}
                  <div className="px-2 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] flex items-center justify-between mb-1">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-primary" />
                      2FA Status
                    </span>
                    {profile.twoFactorEnabled ? (
                      <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                        ● Enabled
                      </Badge>
                    ) : (
                      <Link to="/settings" search={{ tab: "security" }}>
                        <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 px-1.5 border-amber-500/40 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer">
                          ○ Setup Required
                        </Badge>
                      </Link>
                    )}
                  </div>

                  <DropdownMenuItem asChild>
                    <Link to="/settings" search={{ tab: "profile" }} className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
                      <User className="size-3.5 text-muted-foreground" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" search={{ tab: "security" }} className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      <span>Security & 2FA</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/setup-notes" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
                      <HelpCircle className="size-3.5 text-primary" />
                      <span>Setup Notes & Guide</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
                      <Settings className="size-3.5 text-muted-foreground" />
                      <span>Workspace Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/subscription" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
                      <CreditCard className="size-3.5 text-muted-foreground" />
                      <span>Subscription & Plan</span>
                    </Link>
                  </DropdownMenuItem>
                  {profile.roles?.includes("super_admin") && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem asChild>
                        <Link to="/super" className="flex items-center gap-2.5 cursor-pointer py-2 text-purple-600 dark:text-purple-400 font-semibold">
                          <ShieldCheck className="size-4" />
                          <span>Super Admin Console</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive py-2">
                    <LogOut className="size-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Wrapper */}
      <div className="page-wrapper">
        <main className="content p-3 lg:p-6 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={cn("sidebar-overlay cursor-pointer", mobileOpen && "opened")}
        onClick={() => setMobileOpen(false)}
      />

      {/* ⌘K Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search ERP, HRM, Inventory, Sales, Finance modules..." />
        <CommandList className="max-h-[380px]">
          <CommandEmpty>No matching modules found.</CommandEmpty>
          {["ERP Core", "Sales & Finance", "HRM Suite", "Collaboration", "Extensions", "Platform"].map((group) => {
            const items = ALL_SEARCH_ITEMS.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.url}
                    onSelect={() => {
                      setSearchOpen(false);
                      navigate({ to: item.url });
                    }}
                    className="flex items-center justify-between gap-2 cursor-pointer py-2 px-3"
                  >
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

      {/* AI Copilot Widget */}
      <AICopilotWidget />
    </div>
  );
}
