import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession, useCurrentProfile, hasRole } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronDown,
  User,
  ChevronRight,
  Code,
  BookOpen,
  Briefcase,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super")({
  component: SuperShell,
});

type NavSubmenu = { to: string; label: string; icon?: any };
type NavGroup = {
  to: string;
  label: string;
  icon: any;
  exact?: boolean;
  submenus?: NavSubmenu[];
  sectionBefore?: string;
};

const navItems: NavGroup[] = [
  {
    to: "/super",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
    sectionBefore: "PLATFORM",
  },
  { to: "/super/tenants", label: "Tenants & Workspaces", icon: Building2 },
  { to: "/super/roles", label: "Roles & Access Control", icon: ShieldCheck },

  // ── CMS ──────────────────────────────────────────────────────
  {
    to: "/super/cms",
    label: "Manage Pages",
    icon: FileText,
    sectionBefore: "CMS & CONTENT",
    submenus: [
      { to: "/super/cms", label: "All CMS Pages" },
      { to: "/super/cms", label: "Legal Pages" },
      { to: "/super/cms", label: "Marketing Pages" },
      { to: "/super/cms", label: "Website Config" },
    ],
  },
  {
    to: "/super/blogs",
    label: "Blogs & Articles",
    icon: BookOpen,
  },
  {
    to: "/super/case-studies",
    label: "Case Studies & ROI",
    icon: Briefcase,
  },
  { to: "/super/media", label: "Media Library", icon: ImageIcon },

  // ── COMMERCE ──────────────────────────────────────────────────
  {
    to: "/super/plans",
    label: "Plans & Monetization",
    icon: CreditCard,
    sectionBefore: "COMMERCE",
    submenus: [
      { to: "/super/plans", label: "All Subscription Plans" },
      { to: "/super/plans", label: "Coupons & Discounts" },
      { to: "/super/plans", label: "Payment Gateways" },
    ],
  },
  { to: "/super/marketplace", label: "Addons Marketplace", icon: Store },

  // ── COMMUNICATIONS ───────────────────────────────────────────
  {
    to: "/super/support",
    label: "Support Desk",
    icon: LifeBuoy,
    sectionBefore: "COMMUNICATIONS",
    submenus: [
      { to: "/super/support", label: "All Support Tickets" },
      { to: "/super/support", label: "Categories" },
    ],
  },
  { to: "/super/email-templates", label: "Email Templates", icon: Mail },
  { to: "/super/notifications", label: "Notification Templates", icon: Bell },

  // ── SYSTEM ────────────────────────────────────────────────────
  {
    to: "/super/settings",
    label: "Settings",
    icon: Settings,
    sectionBefore: "SYSTEM",
    submenus: [
      { to: "/super/settings", label: "General & Branding" },
      { to: "/super/settings", label: "Currency & Locale" },
      { to: "/super/settings", label: "Security & reCAPTCHA" },
      { to: "/super/settings", label: "Integrations" },
    ],
  },
  { to: "/super/analytics", label: "Google Analytics", icon: BarChart3 },
  { to: "/super/languages", label: "Language Editor", icon: Globe },
  { to: "/super/backup", label: "Backup & Restore", icon: Database },
  { to: "/super/api-docs", label: "API & Documentation", icon: Code },
];

const LANGUAGES = [
  { code: "en", label: "English (US)", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "hi", label: "हिन्दी (Hindi)", flag: "🇮🇳" },
  { code: "ar", label: "العربية (Arabic)", flag: "🇦🇪" },
];

function SuperShell() {
  const { user, loading } = useSession();
  const { data: profile, isLoading, refetch } = useCurrentProfile(user);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const [selectedLang, setSelectedLang] = useState("en");
  const [globalSearch, setGlobalSearch] = useState("");
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { data: platformSettings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const isSuper = hasRole(profile, "super_admin");

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [path]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/super-login" });
  }, [user, loading, navigate]);

  async function claim() {
    const { data, error } = await supabase.rpc("claim_super_admin");
    if (error) return toast.error(error.message);
    if (data === true) {
      toast.success("You are now the super admin");
      refetch();
    } else {
      toast.error("A super admin already exists. Ask them to promote you.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/super-login" });
  }

  function handleLangChange(langCode: string) {
    setSelectedLang(langCode);
    const lang = LANGUAGES.find((l) => l.code === langCode);
    toast.success(`Language switched to ${lang?.label} (${langCode}.json)`);
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuper) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <ShieldCheck className="size-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Super Admin area</h1>
          <p className="text-muted-foreground text-sm">
            You need the super_admin role to access this area. If you're the first user on this platform, you can claim it now.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={claim}>Claim super admin</Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentLang = LANGUAGES.find((l) => l.code === selectedLang) ?? LANGUAGES[0];

  const SidebarContentNode = (
    <div className="flex flex-col h-full bg-background">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b shrink-0">
        {platformSettings?.logoLightUrl ? (
          <img src={platformSettings.logoLightUrl} alt="Platform Logo" className="h-10 max-h-12 w-full object-contain" />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-extrabold text-base shadow-sm shrink-0">
              S
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-bold text-sm truncate">{platformSettings?.appName || "Super Admin"}</div>
              <div className="text-[11px] text-muted-foreground font-mono">Master HRMS Panel</div>
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" className="lg:hidden size-8" onClick={() => setIsMobileOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
        {navItems.map((n) => {
          const active = n.exact ? path === n.to : path === n.to || path.startsWith(n.to + "/");
          const hasSub = !!n.submenus?.length;
          const isSubOpen = openSubmenu === n.to || active;

          return (
            <div key={n.to}>
              {n.sectionBefore && (
                <div className="flex items-center gap-2 px-2 pt-4 pb-1.5 first:pt-1">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground/50 shrink-0">
                    {n.sectionBefore}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              )}

              <div className="space-y-0.5">
                <div
                  onClick={() => {
                    if (hasSub) setOpenSubmenu(isSubOpen ? null : n.to);
                  }}
                >
                  <Link
                    to={n.to}
                    onClick={() => !hasSub && setIsMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "hover:bg-secondary/70 text-foreground/75 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate min-w-0">
                      <n.icon className={`size-3.5 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      <span className="truncate">{n.label}</span>
                    </span>
                    {hasSub && (
                      <ChevronRight
                        className={`size-3 shrink-0 transition-transform duration-200 ${
                          isSubOpen ? "rotate-90 text-primary-foreground" : "text-muted-foreground/50"
                        }`}
                      />
                    )}
                  </Link>
                </div>

                {hasSub && isSubOpen && (
                  <div className="ml-3 pl-3 border-l-2 border-primary/20 space-y-0.5 py-0.5">
                    {n.submenus?.map((sub, idx) => {
                      const subActive = path === sub.to;
                      return (
                        <Link
                          key={idx}
                          to={sub.to}
                          onClick={() => setIsMobileOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors truncate ${
                            subActive
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <span className={`size-1.5 rounded-full shrink-0 ${subActive ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t bg-card space-y-1 shrink-0">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to App
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-destructive/10 text-destructive transition-colors"
        >
          <LogOut className="size-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-secondary/20 font-sans">
      {/* Desktop Sidebar (lg screens) */}
      <aside className="w-64 border-r bg-background flex flex-col shrink-0 shadow-xs hidden lg:flex">
        {SidebarContentNode}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer (screens < lg) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setIsMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-background h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
            {SidebarContentNode}
          </aside>
        </div>
      )}

      {/* Main Right Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Menu Bar */}
        <header className="h-16 border-b bg-background px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
          {/* Mobile Hamburger Toggle */}
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setIsMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>

          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tools, users, plans..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-secondary/30"
            />
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />

            {/* Language Selector */}
            <div className="flex items-center gap-1.5 p-1 px-2 rounded-lg border bg-secondary/30 shadow-xs">
              <Globe className="size-3.5 text-primary shrink-0" />
              <Select value={selectedLang} onValueChange={handleLangChange}>
                <SelectTrigger className="h-6 text-xs border-0 bg-transparent shadow-none p-0 focus:ring-0 w-[80px] sm:w-[110px]">
                  <div className="flex items-center gap-1 truncate">
                    <span>{currentLang.flag}</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-xs">
                      <span className="mr-2">{l.flag}</span> {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Profile Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-secondary transition-colors border focus:outline-none">
                  <Avatar className="size-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                      {profile?.full_name ? profile.full_name[0].toUpperCase() : "SA"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left text-xs leading-none pr-1">
                    <div className="font-bold truncate max-w-[90px]">{profile?.full_name || "Super Admin"}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Super Admin</div>
                  </div>
                  <ChevronDown className="size-3.5 text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{profile?.full_name || "Super Admin"}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/super/settings" })} className="text-xs cursor-pointer">
                  <Settings className="mr-2 size-4" /> System Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/super/api-docs" })} className="text-xs cursor-pointer">
                  <Code className="mr-2 size-4" /> API & Documentation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/super/languages" })} className="text-xs cursor-pointer">
                  <Globe className="mr-2 size-4" /> Language Editor
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-xs text-destructive cursor-pointer">
                  <LogOut className="mr-2 size-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
