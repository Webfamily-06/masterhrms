import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Loader2, Home, User, ShieldCheck, Settings, CreditCard, LogOut, Globe,
  Sparkles, Users, Clock, CalendarCheck, Wallet, Briefcase, GraduationCap, HelpCircle,
  Receipt, FileText, FolderLock, Layers, FileSpreadsheet, Workflow, BarChart3,
  ShoppingCart, Landmark, Kanban, MessageSquare, Package, Store, Compass,
  Fingerprint, ScanLine, HardDrive, Target, ArrowRightLeft, Truck, Building2, SlidersHorizontal,
  CalendarDays, Trophy, ShieldAlert, Timer, TrendingUp, UserCheck, UserX, PiggyBank, Percent, GitBranch, Coins, RefreshCw, Award, Gift, Phone, Repeat, Megaphone
} from "lucide-react";
import { api, clearToken, setToken } from "@/lib/api";
import { toast } from "sonner";
import { WorkspaceUnavailableView } from "@/components/workspace-unavailable-view";
import { useAppConfig } from "@/lib/useAppConfig";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { AccessDenied } from "@/components/access-denied";
import { isSuperAdminUser, isSharedRoute, isPlatformOnlyRoute, isWorkspaceAdminUser, isModuleAllowed, hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SuspendedAccountView } from "@/components/subscription/suspended-account-view";
import { ExpiredSubscriptionView } from "@/components/subscription/expired-subscription-view";
import { SubscriptionWarningPopup } from "@/components/subscription/subscription-warning-popup";
import { SubscriptionFooterBar } from "@/components/subscription/subscription-footer-bar";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppShell,
});

const ALL_SEARCH_ITEMS = [
  { title: "HRM Dashboard", url: "/hrm-dashboard", group: "ERP Core", icon: Home },
  { title: "Deals Dashboard", url: "/deals-dashboard", group: "ERP Core", icon: Compass },
  { title: "Leads Dashboard", url: "/leads-dashboard", group: "ERP Core", icon: Users },
  { title: "Payroll Dashboard", url: "/payroll-dashboard", group: "ERP Core", icon: Wallet },
  { title: "Recruitment Dashboard", url: "/recruitment-dashboard", group: "ERP Core", icon: Briefcase },
  { title: "Help Desk Dashboard", url: "/help-desk-dashboard", group: "ERP Core", icon: HelpCircle },
  { title: "Asset Dashboard", url: "/asset-dashboard", group: "ERP Core", icon: HardDrive },
  { title: "IT Admin Dashboard", url: "/it-admin-dashboard", group: "ERP Core", icon: SlidersHorizontal },
  { title: "Learning Analytics", url: "/learning-analytics", group: "ERP Core", icon: GraduationCap },
  { title: "AI Attendance Insights", url: "/ai-attendance-insights", group: "AI Center", icon: Sparkles },
  { title: "AI Payroll Forecast", url: "/ai-payroll-forecast", group: "AI Center", icon: Sparkles },
  { title: "AI Hiring Forecast", url: "/ai-hiring-forecast", group: "AI Center", icon: Sparkles },
  { title: "AI Team Performance Insights", url: "/ai-team-performance-insights", group: "AI Center", icon: Sparkles },
  { title: "AI Settings & Configuration", url: "/ai-configuration", group: "AI Center", icon: Settings },
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
  { title: "Budgets & Financial Plans", url: "/budgets", group: "Sales & Finance", icon: PiggyBank },
  { title: "Tax Rates & GST Slabs", url: "/taxes", group: "Sales & Finance", icon: Percent },
  { title: "Currencies & FX Exchange", url: "/currencies", group: "Sales & Finance", icon: Coins },
  { title: "Clients Directory", url: "/clients", group: "Sales & Finance", icon: Users },
  { title: "CRM Companies & Accounts", url: "/companies", group: "Sales & Finance", icon: Building2 },
  { title: "Sales Pipelines", url: "/pipeline", group: "Sales & Finance", icon: GitBranch },
  { title: "Projects & Tasks", url: "/projects", group: "Platform", icon: Kanban },
  { title: "Sales CRM Pipeline", url: "/crm", group: "Sales & Finance", icon: Compass },
  { title: "Invoices & Billing", url: "/invoices", group: "Sales & Finance", icon: Receipt },
  { title: "Recurring Invoices", url: "/recurring-invoices", group: "Sales & Finance", icon: Repeat },
  { title: "Proposals & Quotes", url: "/proposals", group: "Sales & Finance", icon: FileText },
  { title: "Expense Claims", url: "/expenses", group: "Sales & Finance", icon: Wallet },
  { title: "Team Chat", url: "/hr/chat", group: "Collaboration", icon: MessageSquare },
  { title: "Call History", url: "/call-history", group: "Collaboration", icon: Phone },
  { title: "AI Document OCR", url: "/ai-ocr", group: "Collaboration", icon: ScanLine },
  { title: "AI Copywriter", url: "/ai-writer", group: "Collaboration", icon: Sparkles },
  { title: "HRM Hub & Overview", url: "/hr/dashboard", group: "HRM Suite", icon: Users },
  { title: "Employee Directory", url: "/hr/employees", group: "HRM Suite", icon: Users },
  { title: "Attendance & Clock", url: "/hr/attendance", group: "HRM Suite", icon: Clock },
  { title: "Employee Attendance Matrix", url: "/hr/attendance/records", group: "HRM Suite", icon: CalendarDays },
  { title: "Daily Attendance Report", url: "/hr/attendance/timesheets", group: "HRM Suite", icon: FileText },
  { title: "Leave Management", url: "/hr/leave/applications", group: "HRM Suite", icon: CalendarCheck },
  { title: "Shift Rostering", url: "/hr/attendance/shifts", group: "HRM Suite", icon: Layers },
  { title: "Shift Swap Requests", url: "/hr/attendance/shifts", group: "HRM Suite", icon: ArrowRightLeft },
  { title: "Overtime Requests", url: "/hr/attendance/records", group: "HRM Suite", icon: Timer },
  { title: "Work From Home (WFH)", url: "/hr/attendance/regularizations", group: "HRM Suite", icon: Home },
  { title: "Promotions & Transfers", url: "/hr/lifecycle/promotions", group: "HRM Suite", icon: TrendingUp },
  { title: "Probation Management", url: "/hr/employees", group: "HRM Suite", icon: UserCheck },
  { title: "Provident Fund Administration", url: "/hr/payroll/components", group: "HRM Suite", icon: Landmark },
  { title: "Personal Tasks Board", url: "/tasks", group: "Platform", icon: Kanban },
  { title: "Global Task Board", url: "/task-board", group: "Platform", icon: Kanban },
  { title: "Payroll Runs", url: "/hr/payroll/runs", group: "HRM Suite", icon: Wallet },
  { title: "Recruitment (ATS)", url: "/hr/recruitment/job-postings", group: "HRM Suite", icon: Briefcase },
  { title: "Campus Hiring", url: "/hr/recruitment/candidates", group: "HRM Suite", icon: GraduationCap },
  { title: "Employee Referrals", url: "/hr/recruitment/referrals", group: "HRM Suite", icon: Gift },
  { title: "Training & LMS", url: "/hr/training/employee-trainings", group: "HRM Suite", icon: GraduationCap },
  { title: "Certification Tracking", url: "/hr/training/programs", group: "HRM Suite", icon: Award },
  { title: "Helpdesk & Tickets", url: "/me/helpdesk", group: "HRM Suite", icon: HelpCircle },
  { title: "Document Vault", url: "/hr/documents", group: "HRM Suite", icon: FolderLock },
  { title: "OKR & Goals", url: "/hr/performance/goals", group: "HRM Suite", icon: Target },
  { title: "Asset Management", url: "/hr/assets", group: "HRM Suite", icon: HardDrive },
  { title: "Offboarding & Exit", url: "/hr/lifecycle/resignations", group: "HRM Suite", icon: LogOut },
  { title: "Notice Period Tracker", url: "/hr/lifecycle/resignations", group: "HRM Suite", icon: LogOut },
  { title: "Resignations", url: "/hr/lifecycle/resignations", group: "HRM Suite", icon: UserX },
  { title: "Terminations", url: "/hr/lifecycle/terminations", group: "HRM Suite", icon: ShieldAlert },
  { title: "Awards & Recognitions", url: "/hr/lifecycle/awards", group: "HRM Suite", icon: Trophy },
  { title: "Disciplinary Warnings", url: "/hr/lifecycle/warnings", group: "HRM Suite", icon: ShieldAlert },
  { title: "Biometric Hardware", url: "/hr/attendance/records", group: "HRM Suite", icon: Fingerprint },
  { title: "Biometric Device Agent", url: "/hr/attendance/records", group: "HRM Suite", icon: Fingerprint },
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
  { title: "Primary Custom Domain", url: "/settings/custom-domain", group: "Platform", icon: Globe },
  { title: "Custom Fields", url: "/custom-fields", group: "Platform", icon: SlidersHorizontal },
  { title: "Marketing Campaigns", url: "/campaigns", group: "CRM & Growth", icon: Megaphone },
  { title: "Users & Roles", url: "/users", group: "Platform", icon: Users },
  { title: "Subscription & Plan", url: "/subscription", group: "Platform", icon: CreditCard },
  { title: "Ban IP Address", url: "/ban-ip-address", group: "Platform", icon: ShieldAlert },
  { title: "Clear Cache & Maintenance", url: "/clear-cache", group: "Platform", icon: RefreshCw },
  { title: "Cronjob Management", url: "/cronjob", group: "Platform", icon: Clock },
  { title: "Super Admin Console", url: "/super", group: "Platform", icon: ShieldCheck },
];

export function AppShell() {
  const { data: profile, isLoading, error: profileError, refetch: reloadProfile } = useCurrentProfile();
  const { loading } = useSession();
  const { branding, isDark } = useTenantBranding();
  const { appConfig } = useAppConfig();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const userRoles = profile?.roles || [];
  const isAdminOrSuper = userRoles.some((r) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  );
  const isManager = userRoles.includes("manager");
  const isSuperAdmin = isSuperAdminUser(profile);
  const isWorkspaceAdmin = isWorkspaceAdminUser(profile);
  const canAccessPos = isModuleAllowed("pos", profile) || hasPermission("pos.terminal.view", profile) || hasPermission("pos.dashboard.view", profile);
  const isClientOnly = userRoles.includes("client") && !isAdminOrSuper;
  const isEmployeeOnly = (userRoles.includes("employee") || isManager) && !isAdminOrSuper;
  const isHrAdmin = userRoles.some((r) => ["hr_admin", "hr"].includes(r));
  const homeRoute = isSuperAdmin
    ? "/super"
    : isClientOnly
      ? "/client-dashboard"
      : isEmployeeOnly
        ? "/me/dashboard"
        : isHrAdmin
          ? "/hr/dashboard"
          : "/hrm-dashboard";
  const isPlatformOrShared = isPlatformOnlyRoute(path) || isSharedRoute(path);

  const { data: subscription, isLoading: isSubLoading, refetch: reloadSubscription } = useQuery({
    queryKey: ["workspace-subscription-shell", profile?.tenant_id],
    queryFn: () => api.get("/workspace/subscription"),
    enabled: !!profile?.tenant_id && !isSuperAdmin,
    staleTime: 5000,
    refetchOnMount: true,
  });

  const isSuspended = !isSuperAdmin && !!profile?.tenant_id && subscription?.status === "suspended";
  const isExpired =
    !isSuperAdmin &&
    !!profile?.tenant_id &&
    (subscription?.status === "expired" ||
      subscription?.isExpired === true ||
      (!!subscription?.expiresAt && new Date(subscription.expiresAt).getTime() < Date.now()));

  const { data: maintenanceStatus } = useQuery({
    queryKey: ["platform-maintenance-guard"],
    queryFn: () => api.get("/system/maintenance-status"),
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const isMaintenanceActive =
    !isSuperAdmin &&
    (maintenanceStatus?.active === true || maintenanceStatus?.status === "active");

  const EMPLOYEE_ALLOWED_PREFIXES = [
    "/me",
    "/employee-dashboard",
    "/attendance",
    "/attendance-employee",
    "/leave",
    "/shifts",
    "/shift-swap-requests",
    "/overtime",
    "/work-from-home",
    "/tasks",
    "/employee-payslips",
    "/awards",
    "/okr",
    "/training",
    "/forms",
    "/documents",
    "/resignation",
    "/announcements",
    "/helpdesk",
    "/chat",
    "/todo",
    "/expenses",
    "/assets",
    "/profile",
    "/manager-hub",
    "/daily-report",
    "/settings",
    "/clear-cache",
    "/offline",
  ];

  const CLIENT_ALLOWED_PREFIXES = [
    "/client-dashboard",
    "/invoices",
    "/projects",
    "/task-board",
    "/helpdesk",
    "/chat",
    "/portal",
    "/profile",
    "/clear-cache",
    "/offline",
  ];

  useEffect(() => {
    if (!loading && !isLoading && !localStorage.getItem("hrms_auth_token")) {
      navigate({ to: "/auth" });
      return;
    }
    if (!loading && !isLoading && profile && !profile.tenant_id) {
      if (isSuperAdmin) {
        if (!isPlatformOrShared && (path === "/hrm-dashboard" || path === "/dashboard" || path === "/")) {
          navigate({ to: "/super" });
        }
      } else {
        navigate({ to: "/onboarding" });
      }
      return;
    }

    // Role-based Deep Link Enforcement
    if (!loading && !isLoading && profile) {
      if (isEmployeeOnly) {
        const isAllowed = EMPLOYEE_ALLOWED_PREFIXES.some(
          (p) => path === p || path.startsWith(p + "/")
        );
        if (!isAllowed) {
          navigate({ to: "/me/dashboard" });
          return;
        }
      }
      if (isClientOnly) {
        const isAllowed = CLIENT_ALLOWED_PREFIXES.some(
          (p) => path === p || path.startsWith(p + "/")
        );
        if (!isAllowed) {
          navigate({ to: "/client-dashboard" });
          return;
        }
      }
    }
  }, [loading, isLoading, profile, isSuperAdmin, isPlatformOrShared, isEmployeeOnly, isClientOnly, path, navigate]);

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
  const [leavingImpersonation, setLeavingImpersonation] = useState(false);

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

  const impersonationBannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isImpersonating = typeof window !== "undefined" && localStorage.getItem("hrms_impersonation_active") === "true";
    if (!isImpersonating || !impersonationBannerRef.current) {
      document.documentElement.style.removeProperty("--impersonation-banner-height");
      return;
    }

    const updateHeight = () => {
      if (impersonationBannerRef.current) {
        const height = impersonationBannerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--impersonation-banner-height", `${height}px`);
      }
    };

    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(impersonationBannerRef.current);

    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--impersonation-banner-height");
    };
  }, []);

  async function handleSignOut() {
    try { await api.post("/auth/logout"); } catch {}
    clearToken();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hrms_auth_token");
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("hrms_auth_token");
    navigate({ to: "/auth" });
  }

  if (profileError) {
    return (
      <WorkspaceUnavailableView
        error={profileError}
        onRetry={() => reloadProfile()}
        onSignOut={handleSignOut}
      />
    );
  }

  if (loading || isLoading || (isSubLoading && !isSuperAdmin) || !profile) {
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

  // 0. Maintenance Mode Guard: Restrict tenant application access during active maintenance
  if (isMaintenanceActive) {
    navigate({ to: "/maintenance" });
    return null;
  }

  // 1. Suspension Guard: Lock full workspace if tenant account is suspended
  if (isSuspended) {
    return (
      <SuspendedAccountView
        companyName={profile.tenant?.name || branding.name || "Workspace"}
        tenantId={profile.tenant_id ?? undefined}
        planName={subscription?.planName}
        suspensionReason={subscription?.suspensionReason}
        onSignOut={handleSignOut}
        onRefresh={() => reloadSubscription()}
      />
    );
  }

  // 2. Expiration Guard: Lock full workspace if subscription has expired (except /subscription renewal page)
  if (isExpired && path !== "/subscription") {
    return (
      <ExpiredSubscriptionView
        companyName={profile.tenant?.name || branding.name || "Workspace"}
        tenantId={profile.tenant_id ?? undefined}
        planName={subscription?.planName}
        expiryDate={subscription?.expiresAt}
        renewalUrl="/subscription"
        onSignOut={handleSignOut}
        onRefresh={() => reloadSubscription()}
      />
    );
  }

  const initials = (profile?.full_name || profile?.email || "U")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = (profile.roles?.[0] || "member").replace(/_/g, " ");

  const isImpersonating = typeof window !== "undefined" && localStorage.getItem("hrms_impersonation_active") === "true";
  const impersonatedTenantName =
    (typeof window !== "undefined" ? localStorage.getItem("hrms_impersonated_tenant_name") : null) ||
    profile?.tenant?.name ||
    "Workspace";


  async function handleLeaveImpersonation() {
    setLeavingImpersonation(true);
    try {
      const res = await api.post("/super/leave-impersonation");
      if (res?.token) {
        setToken(res.token);
      } else {
        const backup = localStorage.getItem("hrms_super_admin_backup_token");
        if (backup) setToken(backup);
      }
      localStorage.removeItem("hrms_impersonation_active");
      localStorage.removeItem("hrms_impersonated_tenant_name");
      localStorage.removeItem("hrms_super_admin_backup_token");
      toast.success("Exited impersonation. Returned to Super Admin console.");
      window.location.href = "/super";
    } catch (e: any) {
      const backup = localStorage.getItem("hrms_super_admin_backup_token");
      if (backup) {
        setToken(backup);
        localStorage.removeItem("hrms_impersonation_active");
        localStorage.removeItem("hrms_impersonated_tenant_name");
        localStorage.removeItem("hrms_super_admin_backup_token");
        window.location.href = "/super";
      } else {
        toast.error(e.message || "Failed to exit impersonation");
      }
    } finally {
      setLeavingImpersonation(false);
    }
  }

  return (
    <div
      className={cn(
        "main-wrapper min-h-screen w-full relative",
        mobileOpen && "slide-nav",
        !fullView && collapsed && "mini-sidebar",
        fullView && "full-view full-width",
        isImpersonating && "has-impersonation-banner"
      )}
    >
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div
          ref={impersonationBannerRef}
          className="impersonation-top-banner bg-amber-600 dark:bg-amber-700 text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs font-semibold shadow-md"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="size-2 rounded-full bg-white animate-ping shrink-0" />
            <span className="leading-snug">
              SUPER ADMIN IMPERSONATION: Acting as administrator for{" "}
              <strong className="underline underline-offset-2">{impersonatedTenantName}</strong>. Actions affect this tenant&apos;s live database.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] font-bold px-2.5 py-0 bg-white text-amber-700 hover:bg-slate-100 border-none shadow-xs shrink-0 cursor-pointer"
            onClick={handleLeaveImpersonation}
            disabled={leavingImpersonation}
          >
            {leavingImpersonation ? <Loader2 className="size-3 animate-spin mr-1" /> : <LogOut className="size-3 mr-1" />}
            Exit Impersonation
          </Button>
        </div>
      )}

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
      <header className="navbar-header flex items-center max-lg:w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-colors">
        <div className="topbar-menu flex items-center justify-between w-full gap-2 px-1 sm:px-2 flex-nowrap">
          {/* Left section: mobile hamburger + mobile brand logo + desktop collapse toggle + workspace */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Sidenav Hamburger Button */}
            <button
              type="button"
              id="mobile_btn"
              className="mobile-btn lg:hidden flex items-center justify-center size-9 rounded-xl border border-border/70 bg-card hover:bg-muted/70 text-foreground shadow-2xs cursor-pointer transition-colors"
              onClick={() => setMobileOpen((m) => !m)}
              aria-label="Toggle Navigation Menu"
            >
              <i className="ph-duotone ph-list text-xl"></i>
            </button>

            {/* Mobile Brand Logo (Visible only on mobile / tablet < 992px) */}
            <Link to={homeRoute} className="logo lg:hidden flex items-center gap-1.5 shrink-0">
              {branding.isWhiteLabeled && (!branding.activeLogo || branding.activeLogo.includes("logo.webp") || branding.activeLogo.includes("white-logo")) ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <img
                      src={branding.faviconUrl || "/favicon.webp"}
                      alt={branding.name}
                      className="size-4 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/favicon.webp";
                      }}
                      loading="lazy"
                    />
                  </div>
                  <span className="font-bold text-xs tracking-tight text-foreground truncate max-w-[120px]">
                    {branding.name}
                  </span>
                </div>
              ) : (
                <img
                  src={branding.activeLogo || (isDark ? (branding.logoDark || "/white-logo.webp") : (branding.logoUrl || "/logo.webp"))}
                  alt={branding.name || "Master Platform"}
                  className="h-7 max-h-7 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = isDark ? "/white-logo.webp" : "/logo.webp";
                  }}
                  loading="lazy"
                />
              )}
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
                "sidenav-toggle-btn topbar-link shrink-0 size-8.5 text-[18px] hidden lg:flex items-center justify-center rounded-xl border transition-all cursor-pointer shadow-2xs",
                collapsed
                  ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                  : "bg-card border-border/70 hover:bg-muted/70 text-foreground"
              )}
              aria-label="Toggle Sidebar Mini Rail"
              title={collapsed ? "Expand Sidebar to Full Width (250px)" : "Collapse Sidebar to Mini Rail (72px)"}
            >
              <i className={cn("ph-duotone", collapsed ? "ph-arrow-line-right" : "ph-arrow-line-left")}></i>
            </button>

            {/* Active Company / Workspace Selector */}
            {isWorkspaceAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="header-item hidden md:flex relative company-dropdown me-auto cursor-pointer">
                    <div className="bg-card border border-border/70 rounded-xl py-1.5 px-3 flex items-center justify-between gap-2.5 shadow-2xs hover:border-primary/40 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-md flex items-center justify-center shrink-0">
                          <img src={branding.faviconUrl || "/favicon.webp"} alt="company" className="size-3.5 object-contain" loading="lazy"/>
                        </div>
                        <p className="text-xs font-bold text-foreground leading-none truncate max-w-[150px]">
                          {profile.tenant?.name || branding.name || "Workspace"}
                        </p>
                      </div>
                      <i className="ph-duotone ph-caret-down text-xs text-muted-foreground"></i>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 p-2 rounded-xl border border-border/70 shadow-md font-sans" align="start">
                  <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Active Workspace
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="flex items-center gap-2 p-2 rounded-lg font-medium text-xs">
                    <div className="size-6 rounded-md flex items-center justify-center">
                      <img src={branding.faviconUrl || "/favicon.webp"} alt="Tenant" className="size-4 object-contain" loading="lazy"/>
                    </div>
                    <span className="truncate">{profile.tenant?.name || branding.name || "Workspace"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 p-2 cursor-pointer text-xs rounded-lg hover:bg-muted/60 transition-colors">
                      <Settings className="size-3.5 text-muted-foreground" />
                      <span>Workspace Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="header-item hidden md:flex relative me-auto">
                <div className="bg-card border border-border/70 rounded-xl py-1.5 px-3 flex items-center gap-2 shadow-2xs">
                  <div className="size-5 rounded-md flex items-center justify-center shrink-0">
                    <img src={branding.faviconUrl || "/favicon.webp"} alt="company" className="size-3.5 object-contain" loading="lazy"/>
                  </div>
                  <p className="text-xs font-bold text-foreground leading-none truncate max-w-[150px]">
                    {profile.tenant?.name || branding.name || "Workspace"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right section items */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Quick POS Terminal Button (Role & Module Gated) */}
            {canAccessPos && (
              <Link
                to="/pos"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors shrink-0"
                title="Open POS Terminal"
              >
                <i className="ph-duotone ph-shopping-cart text-sm"></i>
                <span>POS Register</span>
              </Link>
            )}

            {/* Customer Display New Window Launch (Role & Module Gated) */}
            {canAccessPos && (
              <a
                href="/customer-display"
                target="_blank"
                rel="noopener noreferrer"
                className="header-item topbar-link hidden xl:flex items-center justify-center size-8.5 rounded-xl border border-border/70 bg-card hover:bg-muted/70 text-foreground shadow-2xs transition-colors"
                title="Open Dual Customer Display in New Window"
              >
                <i className="ph-duotone ph-monitor text-base"></i>
              </a>
            )}

            {/* Global Search Trigger Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="header-item flex items-center gap-2 px-3 py-1.5 h-8.5 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs transition-colors shadow-2xs cursor-pointer"
              aria-label="Global Search"
            >
              <i className="ph-duotone ph-magnifying-glass text-sm"></i>
              <span className="hidden md:inline font-medium">Search...</span>
              <kbd className="hidden sm:inline-flex pointer-events-none h-4.5 items-center gap-0.5 rounded-md border border-border/60 bg-background px-1.5 font-mono text-[9px] font-semibold text-muted-foreground shadow-2xs">⌘K</kbd>
            </button>

            {/* Realtime Notification Drawer */}
            <div className="header-item">
              <RealtimeNotificationDrawer />
            </div>

            {/* Chat Quick Link */}
            <div className="header-item hidden sm:flex">
              <Link
                to={isAdminOrSuper ? "/hr/chat" : "/me/chat"}
                className="topbar-link flex items-center justify-center size-8.5 rounded-xl border border-border/70 bg-card hover:bg-muted/70 text-foreground shadow-2xs transition-colors"
                title="Team Chat"
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
                  "topbar-link flex items-center justify-center size-8.5 rounded-xl border transition-all cursor-pointer shadow-2xs",
                  fullView
                    ? "bg-primary text-white border-primary hover:bg-primary/90"
                    : "bg-card border-border/70 hover:bg-muted/70 text-foreground"
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
                className="topbar-link flex items-center justify-center size-8.5 rounded-xl border border-border/70 bg-card hover:bg-muted/70 text-foreground shadow-2xs cursor-pointer transition-colors"
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
                <DropdownMenuContent className="w-64 p-3 rounded-2xl border border-border/70 shadow-lg font-sans" align="end" forceMount>
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
                            {profile.tenant?.name || branding.name || "Workspace"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />

                  {/* 2FA Security Status Indicator */}
                  <div className="px-2.5 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] flex items-center justify-between mb-1">
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
                    <Link
                      to={isEmployeeOnly ? "/profile" : "/settings"}
                      search={isEmployeeOnly ? undefined : { tab: "profile" }}
                      className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <User className="size-3.5 text-muted-foreground" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" search={{ tab: "security" }} className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors">
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      <span>Security & 2FA</span>
                    </Link>
                  </DropdownMenuItem>

                  {/* Administration Options - Workspace Admins Only */}
                  {isWorkspaceAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/setup-notes" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors">
                          <HelpCircle className="size-3.5 text-primary" />
                          <span>Setup Notes & Guide</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors">
                          <Settings className="size-3.5 text-muted-foreground" />
                          <span>Workspace Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/subscription" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors">
                          <CreditCard className="size-3.5 text-muted-foreground" />
                          <span>Subscription & Plan</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {profile.roles?.includes("super_admin") && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem asChild>
                        <Link to="/super" className="flex items-center gap-2.5 cursor-pointer py-2 text-purple-600 dark:text-purple-400 font-semibold rounded-lg hover:bg-muted/60 transition-colors">
                          <ShieldCheck className="size-4" />
                          <span>Super Admin Console</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive py-2 rounded-lg hover:bg-destructive/10 transition-colors">
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
      <div className="page-wrapper flex flex-col justify-between">
        <main className="content min-w-0 flex-1">
          {isSuperAdmin && !profile?.tenant_id && !isPlatformOrShared ? (
            <AccessDenied
              moduleName="Tenant Workspace"
              message="Platform Super Administrators are restricted from accessing tenant-only workspaces. Please switch to the Platform Super Admin Console or sign in with authorized tenant credentials."
            />
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="mt-auto py-3 px-6 border-t border-border-color/60 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2" data-testid="workspace-footer">
          <span data-testid="workspace-footer-text">{branding.footerText || appConfig.footerText || "© 2026 Master HRMS. All rights reserved."}</span>
          <span>{branding.name || appConfig.appName}</span>
        </footer>
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

      {/* Expiry Warning Popup (Dismissible with threshold persistence) */}
      {!isSuperAdmin && profile?.tenant_id && subscription?.expiresAt && !isExpired && !isSuspended && (
        <SubscriptionWarningPopup
          tenantId={profile.tenant_id}
          planName={subscription.planName}
          expiresAt={subscription.expiresAt}
          renewalUrl="/subscription"
        />
      )}

      {/* Persistent Footer-side Warning Bar */}
      {!isSuperAdmin && profile?.tenant_id && subscription?.expiresAt && !isExpired && !isSuspended && (
        <SubscriptionFooterBar
          planName={subscription.planName}
          expiresAt={subscription.expiresAt}
          renewalUrl="/subscription"
        />
      )}

      {/* AI Copilot Widget */}
      <AICopilotWidget />
    </div>
  );
}

