import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession, useCurrentProfile } from "@/lib/session";
import { api, clearToken } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/super")({
  component: SuperShell,
});

type SuperNavItem = {
  to: string;
  label: string;
  iconClass: string;
  group: string;
  badge?: string;
};

const ALL_SUPER_SEARCH_ITEMS: SuperNavItem[] = [
  // ── Core Orchestration
  { to: "/super", label: "Root Command Center", iconClass: "ph-gauge", group: "Core Orchestration" },
  { to: "/super/tenants", label: "Tenant Workspaces", iconClass: "ph-buildings", group: "Core Orchestration", badge: "Multi-Tenant" },
  { to: "/super/plans", label: "Subscription Plans", iconClass: "ph-credit-card", group: "Core Orchestration" },
  { to: "/super/roles", label: "Roles & RBAC Matrix", iconClass: "ph-shield-check", group: "Core Orchestration" },

  // ── Ecosystem & Marketplace
  { to: "/super/marketplace", label: "Addons Marketplace", iconClass: "ph-storefront", group: "Ecosystem & Apps", badge: "500+ Live" },

  // ── Marketing & CMS
  { to: "/super/cms", label: "Visual CMS Studio", iconClass: "ph-article", group: "Marketing & CMS", badge: "Studio 2.0" },
  { to: "/super/blogs", label: "Blog Insights", iconClass: "ph-book-open", group: "Marketing & CMS" },
  { to: "/super/case-studies", label: "Case Studies", iconClass: "ph-briefcase", group: "Marketing & CMS" },
  { to: "/super/media", label: "Media Library", iconClass: "ph-image", group: "Marketing & CMS" },

  // ── Communications
  { to: "/super/support", label: "Global Support Desk", iconClass: "ph-lifebuoy", group: "Communications" },
  { to: "/super/email-templates", label: "Email Templates", iconClass: "ph-envelope", group: "Communications" },
  { to: "/super/notifications", label: "Broadcast Alerts", iconClass: "ph-bell", group: "Communications" },

  // ── System Controls
  { to: "/super/settings", label: "Platform Settings", iconClass: "ph-gear", group: "System Controls" },
  { to: "/super/analytics", label: "Platform Analytics", iconClass: "ph-chart-line-up", group: "System Controls" },
  { to: "/super/languages", label: "Localization (i18n)", iconClass: "ph-globe", group: "System Controls" },
  { to: "/super/backup", label: "Database Backups", iconClass: "ph-database", group: "System Controls" },
  { to: "/super/api-docs", label: "API Reference", iconClass: "ph-code", group: "System Controls" },
];

function SuperSidebar({
  profile,
  collapsed,
  onToggleCollapse,
  fullView,
  onToggleFullView,
  mobileOpen,
  onCloseMobile,
  onSignOut,
}: {
  profile: any;
  collapsed: boolean;
  onToggleCollapse: () => void;
  fullView: boolean;
  onToggleFullView: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [isHovered, setIsHovered] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);

  const isMini = collapsed && !isHovered;

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIgnoreHover(true);
    setIsHovered(false);
    document.body.classList.remove("expand-menu");
    onToggleCollapse();
  };

  const groups = [
    { title: "Core Orchestration", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "Core Orchestration") },
    { title: "Ecosystem & Apps", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "Ecosystem & Apps") },
    { title: "Marketing & CMS", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "Marketing & CMS") },
    { title: "Communications", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "Communications") },
    { title: "System Controls", items: ALL_SUPER_SEARCH_ITEMS.filter((i) => i.group === "System Controls") },
  ];

  return (
    <aside
      className="sidebar"
      id="sidebar"
      onMouseEnter={() => {
        if (collapsed && !ignoreHover) {
          setIsHovered(true);
          document.body.classList.add("expand-menu");
        }
      }}
      onMouseLeave={() => {
        setIgnoreHover(false);
        if (collapsed) {
          setIsHovered(false);
          document.body.classList.remove("expand-menu");
        }
      }}
    >
      {/* Sidebar Logo Header */}
      <div className={cn("sidebar-logo flex items-center h-14 border-b border-border-color gap-2", isMini ? "justify-center px-2" : "px-3 sm:px-4")}>
        {isMini ? (
          /* Mini Mode Centered Favicon */
          <Link
            to="/super"
            className="flex items-center justify-center size-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Super Admin Root Console"
          >
            <img
              src="/favicon.webp"
              alt="Root Console"
              className="size-7 object-contain"
            />
          </Link>
        ) : (
          <>
            {/* Full Brand Logo */}
            <Link
              to="/super"
              className="brand-logo logo flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
              onClick={onCloseMobile}
            >
              <img
                src="/logo.webp"
                alt="Master Platform"
                className="h-8 max-h-8 w-auto object-contain dark:brightness-110"
              />
              <Badge className="bg-purple-600 text-white text-[9px] font-mono uppercase font-bold py-0 h-4 shrink-0">
                ROOT
              </Badge>
            </Link>

            {/* Desktop Pin / Hover Mode Switch Button */}
            <button
              type="button"
              id="toggle_btn"
              onClick={handleToggleCollapse}
              className={cn(
                "hidden lg:flex items-center justify-center size-8 rounded-lg border transition-all cursor-pointer shadow-xs",
                collapsed
                  ? "bg-slate-100 dark:bg-slate-800 border-border-color text-muted-foreground hover:text-purple-600"
                  : "bg-purple-600/10 border-purple-600/20 text-purple-600 hover:bg-purple-600/20"
              )}
              title={collapsed ? "Pin Sidebar (Fixed 250px)" : "Unpin Sidebar (Mini Hover Mode)"}
              aria-label="Toggle Sidebar Pin Mode"
            >
              <i className={cn("text-base ph-duotone", collapsed ? "ph-circle" : "ph-record")}></i>
            </button>

            {/* Quick Full View Console Toggle Button */}
            {onToggleFullView && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFullView();
                }}
                className="hidden lg:flex items-center justify-center size-8 rounded-lg border border-border-color bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-purple-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-xs"
                title="Full View Console (Hide Sidebar)"
                aria-label="Full View Console"
              >
                <i className="text-base ph-duotone ph-arrows-out-line-horizontal"></i>
              </button>
            )}

            {/* Mobile Close X Button */}
            <button
              type="button"
              className="sidebar-close lg:hidden size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-border-color"
              onClick={onCloseMobile}
              aria-label="Close Mobile Menu"
            >
              <i className="ph-bold ph-x text-base"></i>
            </button>
          </>
        )}
      </div>

      {/* Sidenav Scrollable Menu */}
      <div
        className="sidebar-inner"
        data-simplebar
        style={{ overflowY: "auto", height: "calc(100% - 56px)" }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const anchor = target.closest("a");
          if (anchor && anchor.getAttribute("href") !== "#") {
            onCloseMobile();
          }
        }}
      >
        <div id="sidebar-menu" className="sidebar-menu">
          <ul>
            {groups.map((group) => (
              <div key={group.title} className="contents">
                <li className="menu-title">
                  <span>{group.title.toUpperCase()}</span>
                </li>
                {group.items.map((item) => {
                  const isActive = item.to === "/super" ? path === "/super" : path.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onCloseMobile}
                        className={cn(isActive && "active")}
                        title={item.label}
                      >
                        <i className={cn("ph-duotone", item.iconClass)}></i>
                        <span>{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[9px] px-1.5 py-0 h-4 font-mono font-bold shrink-0 ml-auto rounded border inline-flex items-center",
                              isActive
                                ? "border-white/30 text-white bg-white/10"
                                : "border-purple-500/30 text-purple-600 bg-purple-50 dark:bg-purple-950/50"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </div>
            ))}

            {/* ===================== WORKSPACES & PLATFORM ===================== */}
            <li className="menu-title">
              <span>WORKSPACES & ACCESS</span>
            </li>
            <li>
              <Link
                to="/dashboard"
                onClick={onCloseMobile}
                className="text-primary hover:text-primary font-semibold"
                title="Switch to Tenant App"
              >
                <i className="ph-duotone ph-buildings"></i>
                <span>Switch to Tenant App</span>
                <span className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold shrink-0 ml-auto rounded border border-primary/30 text-primary bg-primary/10 inline-flex items-center">
                  Live
                </span>
              </Link>
            </li>
            <li>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSignOut();
                }}
                className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                title="Sign Out of Root Console"
              >
                <i className="ph-duotone ph-sign-out"></i>
                <span>Sign Out of Console</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
function SuperShell() {
  const { user, loading } = useSession();
  const { data: profile, isLoading, error: profileError, refetch: reloadProfile } = useCurrentProfile(user);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  // Sidebar collapse state with localStorage persistence
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("master_super_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Full View Dashboard mode state (hides sidebar completely for true full-width screen)
  const [fullView, setFullView] = useState<boolean>(() => {
    try {
      return localStorage.getItem("master_super_full_view") === "true";
    } catch {
      return false;
    }
  });

  // Browser native fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== "undefined" && !!document.fullscreenElement;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
      localStorage.setItem("master_super_full_view", String(fullView));
      localStorage.setItem("master_super_sidebar_collapsed", String(collapsed));
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

  // Close mobile sidebar on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // Global keyboard shortcuts: ⌘K for search, ⌘B for full view / sidebar toggle
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

  useEffect(() => {
    if (!isLoading && !localStorage.getItem("hrms_auth_token")) navigate({ to: "/super-login" });
    if (!isLoading && profile && !profile.roles?.includes("super_admin")) {
      navigate({ to: "/dashboard" });
    }
  }, [profile, isLoading, navigate]);

  async function handleSignOut() {
    try { await api.post("/auth/logout"); } catch {}
    clearToken();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hrms_auth_token");
    sessionStorage.removeItem("auth_token");
    navigate({ to: "/super-login" });
  }

  if (profileError) return <div role="alert" className="p-8 space-y-4"><p>{profileError.message}</p><button onClick={() => reloadProfile()} className="underline">Retry</button> <button onClick={handleSignOut} className="underline">Sign out</button></div>;

  if (loading || isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-purple-600" />
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
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const currentItem = ALL_SUPER_SEARCH_ITEMS.find((item) =>
    item.to === "/super" ? path === "/super" : path.startsWith(item.to)
  );
  const currentTitle = currentItem?.label || "Root Command Center";

  return (
    <div
      className={cn(
        "main-wrapper min-h-screen w-full relative",
        mobileOpen && "slide-nav",
        !fullView && collapsed && "mini-sidebar",
        fullView && "full-view full-width"
      )}
    >
      {/* Super Admin Dreams ERP Sidenav */}
      <SuperSidebar
        profile={profile}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        fullView={fullView}
        onToggleFullView={() => setFullView((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onSignOut={handleSignOut}
      />

      {/* Topbar Header */}
      <header className="navbar-header flex items-center max-lg:w-full">
        <div className="topbar-menu flex items-center justify-between w-full gap-2 px-1 sm:px-2 flex-nowrap">
          {/* Left section: mobile hamburger + mobile brand logo + desktop toggle + breadcrumbs */}
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
            <Link to="/super" className="logo lg:hidden flex items-center gap-1.5 shrink-0">
              <img src="/logo.webp" alt="Master Platform" className="h-7 max-h-7 w-auto object-contain" />
              <Badge className="bg-purple-600 text-white text-[8px] font-mono font-bold py-0 h-3.5 px-1">ROOT</Badge>
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
                  ? "bg-purple-600/10 border-purple-600/20 text-purple-600 hover:bg-purple-600/20"
                  : "bg-white dark:bg-slate-900 border-border-color hover:bg-light text-foreground"
              )}
              aria-label="Toggle Sidebar Mini Rail"
              title={collapsed ? "Expand Sidebar to Full Width (250px)" : "Collapse Sidebar to Mini Rail (72px)"}
            >
              <i className={cn("ph-duotone", collapsed ? "ph-caret-right" : "ph-caret-left")}></i>
            </button>

            {/* Breadcrumb / Title */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
              <Badge className="bg-purple-600 text-white text-[10px] font-bold py-0.5 px-2">ROOT CONSOLE</Badge>
              <span className="text-muted-foreground/60">/</span>
              <span className="text-foreground font-bold truncate max-w-[200px]">{currentTitle}</span>
            </div>
          </div>

          {/* Right section: Search + Fullscreen + Theme + User profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Global Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="header-item flex items-center gap-2 px-2.5 py-1.5 h-8 rounded-md border border-border-color bg-light/60 hover:bg-light text-muted-foreground hover:text-foreground text-xs transition-colors shadow-xs"
              aria-label="Global Search"
            >
              <i className="ph-duotone ph-magnifying-glass text-sm"></i>
              <span className="hidden md:inline font-medium">Search Console...</span>
              <kbd className="hidden sm:inline-flex pointer-events-none h-4 items-center gap-0.5 rounded border bg-background px-1 font-mono text-[9px] font-semibold text-muted-foreground">⌘K</kbd>
            </button>

            {/* Full View Canvas Toggle (Hide / Show Sidebar) */}
            <div className="header-item hidden lg:flex">
              <button
                type="button"
                id="btn_full_view"
                onClick={() => setFullView((v) => !v)}
                className={cn(
                  "topbar-link flex items-center justify-center size-8 rounded-md border transition-all cursor-pointer shadow-xs",
                  fullView
                    ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
                    : "bg-white dark:bg-slate-900 border-border-color hover:bg-light text-foreground"
                )}
                title={fullView ? "Exit Full View (Show Sidebar) (⌘B)" : "Full View Console (Hide Sidebar) (⌘B)"}
                aria-label="Toggle Full View Console"
              >
                <i className={cn("text-base ph-duotone", fullView ? "ph-sidebar-simple" : "ph-arrows-out-line-horizontal")}></i>
              </button>
            </div>

            {/* Native Fullscreen Button */}
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

            {/* Theme Toggle */}
            <div className="header-item">
              <ThemeToggle />
            </div>

            {/* User Profile Dropdown */}
            <div className="profile-dropdown">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-full ring-2 ring-purple-500/30 hover:ring-purple-500/60 transition-all p-0.5 cursor-pointer"
                    aria-label="Super Admin Profile"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "Admin"} />
                      <AvatarFallback className="bg-purple-600/10 text-purple-600 text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-3" align="end" forceMount>
                  <DropdownMenuLabel className="p-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 ring-2 ring-purple-500/30">
                        <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "Admin"} />
                        <AvatarFallback className="bg-purple-600/10 text-purple-600 text-sm font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-bold leading-tight truncate text-foreground">{profile.full_name || "Super Admin"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
                        <div className="flex items-center gap-1 pt-0.5">
                          <Badge className="bg-purple-600 text-white text-[9px] font-bold py-0 h-4 px-1.5">SUPER ADMIN</Badge>
                          <Badge variant="outline" className="text-[9px] py-0 h-4 px-1.5 border-purple-500/30 text-purple-600">Root</Badge>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem asChild>
                    <Link to="/super/settings" className="flex items-center gap-2.5 cursor-pointer py-2 text-xs">
                      <i className="ph-duotone ph-gear text-base text-muted-foreground"></i>
                      <span>Platform Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2.5 cursor-pointer py-2 text-xs text-primary font-semibold">
                      <i className="ph-duotone ph-arrow-left text-base"></i>
                      <span>Switch to Tenant App</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive py-2 text-xs">
                    <i className="ph-duotone ph-sign-out text-base"></i>
                    <span>Sign Out of Console</span>
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

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search Super Admin console..." />
        <CommandList className="max-h-[380px]">
          <CommandEmpty>No matching tools found.</CommandEmpty>
          {["Core Orchestration", "Ecosystem & Apps", "Marketing & CMS", "Communications", "System Controls"].map((group) => {
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
                    className="flex items-center justify-between gap-2 cursor-pointer py-2 px-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <i className={cn("text-base ph-duotone", item.iconClass, "text-purple-600")} />
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
    </div>
  );
}

