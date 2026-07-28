import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  Wallet,
  Clock,
  CalendarCheck,
  UserPlus,
  Target,
  GraduationCap,
  LifeBuoy,
  Building2,
  Factory,
  HeartPulse,
  ShoppingBag,
  Landmark,
  School,
  BookOpen,
  FileText,
  Newspaper,
  HelpCircle,
  ChevronDown,
  Menu,
  X,
  Puzzle,
  TrendingUp,
  Boxes,
  ShoppingCart,
  LineChart,
  Layers,
  Cpu,
} from "lucide-react";
import { MaintenanceMarqueeBanner } from "@/components/maintenance-marquee-banner";
import { ThemeToggle } from "@/components/theme-toggle";

type MenuItem = { title: string; desc: string; icon: any; to: string };

const erpModules: MenuItem[] = [
  { title: "Financials & Accounting", desc: "Ledgers, invoices, tax, multi-currency", icon: Landmark, to: "/product#financials" },
  { title: "Sales & CRM Pipeline", desc: "Leads, deals, quotes, forecast", icon: TrendingUp, to: "/product#crm" },
  { title: "Supply Chain & Stock", desc: "Multi-warehouse, SKUs, reorders", icon: Boxes, to: "/product#inventory" },
  { title: "Procurement & POs", desc: "Purchase requests, vendor portal", icon: ShoppingCart, to: "/product#procurement" },
  { title: "BI Enterprise Analytics", desc: "Executive dashboards, KPI reports", icon: LineChart, to: "/product#bi" },
  { title: "Core HR & Payroll", desc: "Employee directory, automated pay runs", icon: Users, to: "/product#core-hr" },
  { title: "Geo-Attendance & Time", desc: "Biometric sync, GPS clock-in", icon: Clock, to: "/product#attendance" },
  { title: "OKRs & Performance", desc: "360° appraisals, goal cascades", icon: Target, to: "/product#performance" },
];

const industries: MenuItem[] = [
  { title: "Tech & Startups", desc: "Fast scaling, global teams", icon: Building2, to: "/solutions#tech" },
  { title: "Manufacturing", desc: "Shifts, overtime, compliance", icon: Factory, to: "/solutions#manufacturing" },
  { title: "Healthcare", desc: "Rosters, credential tracking", icon: HeartPulse, to: "/solutions#healthcare" },
  { title: "Retail & Services", desc: "Multi-location attendance", icon: ShoppingBag, to: "/solutions#retail" },
  { title: "Financial Services", desc: "Audit trails, strict permissions", icon: Landmark, to: "/solutions#finance" },
  { title: "Education", desc: "Faculty & staff workflows", icon: School, to: "/solutions#education" },
];

const resources: MenuItem[] = [
  { title: "Blog & Insights", desc: "HR trends, best practices", icon: BookOpen, to: "/resources#blog" },
  { title: "Guides & Ebooks", desc: "Compliance & payroll playbooks", icon: FileText, to: "/resources#guides" },
  { title: "Customer Stories", desc: "How teams scale with us", icon: Newspaper, to: "/resources#stories" },
  { title: "Help Center", desc: "Docs, API, support ticket desk", icon: HelpCircle, to: "/resources#help" },
];

function MegaPanel({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[600px] p-4 bg-popover text-popover-foreground border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.to as any}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 mt-0.5">
                <Icon className="size-4" />
              </div>
              <div>
                <div className="text-sm font-medium leading-none mb-1">{item.title}</div>
                <div className="text-xs text-muted-foreground leading-snug line-clamp-1">{item.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Dynamic Theme Mode Observer
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const { data: platformSettings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return (data?.content as any) || null;
    },
  });

  let cachedLogo = "";
  try {
    if (typeof window !== "undefined") {
      cachedLogo = isDark
        ? localStorage.getItem("master_hrms_logo_dark") || localStorage.getItem("master_hrms_logo_light") || ""
        : localStorage.getItem("master_hrms_logo_light") || localStorage.getItem("master_hrms_logo_dark") || "";
    }
  } catch (e) {}

  const activeLogo = isDark
    ? platformSettings?.logoDarkUrl || platformSettings?.logoLightUrl || cachedLogo
    : platformSettings?.logoLightUrl || platformSettings?.logoDarkUrl || cachedLogo;

  const appName = platformSettings?.appName || "Master HRMS";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-xs">
      <MaintenanceMarqueeBanner />
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Dynamic Light/Dark Mode Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          {activeLogo ? (
            <img src={activeLogo} alt={appName} className="h-9 max-h-11 max-w-[170px] object-contain transition-all duration-300" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
                M
              </div>
              <span>{appName}</span>
            </div>
          )}
        </Link>

        {/* Navigation links */}
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          <div className="group relative">
            <button className="inline-flex items-center gap-1 px-3 py-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground font-medium">
              ERP & HR Modules <ChevronDown className="size-3.5" />
            </button>
            <MegaPanel title="Enterprise Modules" items={erpModules} />
          </div>

          <div className="group relative">
            <button className="inline-flex items-center gap-1 px-3 py-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
              Solutions <ChevronDown className="size-3.5" />
            </button>
            <MegaPanel title="By industry" items={industries} />
          </div>

          <Link to="/addons" className="px-3 py-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <Puzzle className="size-3.5" /> Addons
          </Link>
          <Link to="/pricing" className="px-3 py-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">Pricing</Link>

          <div className="group relative">
            <button className="inline-flex items-center gap-1 px-3 py-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
              Resources <ChevronDown className="size-3.5" />
            </button>
            <MegaPanel title="Knowledge & Support" items={resources} />
          </div>
          <Link to="/about" className="px-3 py-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">About</Link>
          <Link to="/contact" className="px-3 py-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">Contact</Link>
        </nav>

        {/* Action buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Start Free Trial</Link>
          </Button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-md hover:bg-accent"
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t p-4 space-y-3 bg-background">
          <Link to="/product" className="block py-2 text-sm font-medium">Product</Link>
          <Link to="/solutions" className="block py-2 text-sm font-medium">Solutions</Link>
          <Link to="/addons" className="block py-2 text-sm font-medium">Addons</Link>
          <Link to="/pricing" className="block py-2 text-sm font-medium">Pricing</Link>
          <Link to="/resources" className="block py-2 text-sm font-medium">Resources</Link>
          <Link to="/about" className="block py-2 text-sm font-medium">About</Link>
          <Link to="/contact" className="block py-2 text-sm font-medium">Contact</Link>
          <div className="pt-3 border-t flex flex-col gap-2">
            <Button variant="outline" asChild className="w-full">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild className="w-full">
              <Link to="/auth" search={{ mode: "signup" }}>Start Free Trial</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
