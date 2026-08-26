import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import {
  Users,
  Clock,
  Target,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Building2,
  Landmark,
  TrendingUp,
  Boxes,
  Layers,
  Cpu,
  Activity,
  Server,
  Lock,
  FileText,
  CreditCard,
  Star,
  Store,
  Globe2,
  Workflow,
  Check,
  Headphones,
  CheckCheck,
  ChevronRight,
  Shield,
  Award,
  CircleDollarSign,
  TrendingDown,
  UserCheck,
  Compass,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/")({
  component: CorporateLanding,
  head: () => ({
    meta: [
      { title: "Master ERP & HRMS — Unified Enterprise Operating System" },
      {
        name: "description",
        content:
          "Unify Global Workforce Management, Automated Payroll, Financial Accounting, Sales CRM, and 500+ Ecosystem Addons in one unified cloud platform.",
      },
    ],
  }),
});

function CorporateLanding() {
  const [activePreviewTab, setActivePreviewTab] = useState<"workforce" | "finance" | "crm" | "security">("workforce");
  const [billingYearly, setBillingYearly] = useState(true);

  // Fetch real-time CMS settings from MySQL
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const appName = sysConfig?.appName || "Master ERP & HRMS";
  const currencyCode = sysConfig?.defaultCurrency || "INR";

  const suites = [
    {
      id: "workforce",
      title: "Workforce & Autonomous Payroll",
      icon: Users,
      badge: "16 HRM Modules",
      headline: "Automate global payroll, biometric attendance, and workforce lifecycle.",
      desc: "Process multi-currency payroll in under 2 minutes with automated statutory deductions, direct tax computation, and employee self-service payslips.",
      stats: [
        { label: "Processing Speed", value: "< 2 min" },
        { label: "Attendance Precision", value: "99.99%" },
        { label: "Compliance Rate", value: "100% Auto" },
      ],
      features: [
        "Biometric, GPS & mobile clock-in integration",
        "Configurable leave workflows & PTO balance ledgers",
        "Automated salary slip generation with PDF export",
        "Recruitment ATS pipelines and onboarding checklists",
      ],
    },
    {
      id: "finance",
      title: "Financials & Point of Sale",
      icon: Landmark,
      badge: "Double-Entry Ledgers",
      headline: "Real-time general ledgers, multi-currency invoicing, and cashflow analytics.",
      desc: "Complete visibility into corporate financials with automated bank reconciliation, double-entry accounting, GST/VAT compliant digital client billing, and POS terminals.",
      stats: [
        { label: "Reconciliation", value: "Real-time" },
        { label: "Currencies", value: "140+ Supported" },
        { label: "Audit Accuracy", value: "100% Verifiable" },
      ],
      features: [
        "Automated balance sheets, profit & loss, and trial balance",
        "Point of Sale checkout with barcode scanning & receipt printing",
        "Recurring subscription invoicing with automatic reminders",
        "Multi-branch cash register tracking and daily closing audits",
      ],
    },
    {
      id: "crm",
      title: "Commercial CRM & Deals",
      icon: Target,
      badge: "Revenue Velocity",
      headline: "Accelerate quote-to-close with interactive visual pipelines.",
      desc: "Track client relationships from prospecting to signed proposals. Monitor win-rates, automate follow-ups, and generate executive revenue forecasts.",
      stats: [
        { label: "Deal Velocity", value: "+42% MoM" },
        { label: "Quote-to-Close", value: "3.4 Days" },
        { label: "Pipeline Visibility", value: "360° Real-time" },
      ],
      features: [
        "Visual drag-and-drop opportunity Kanban stages",
        "Commercial proposals with digital e-signatures",
        "Lead scoring and automated team assignment rules",
        "Customer lifetime value and churn risk indicators",
      ],
    },
    {
      id: "security",
      title: "Enterprise Multi-Tenancy",
      icon: ShieldCheck,
      badge: "Zero-Trust Partitioning",
      headline: "Isolated database architecture with granular role-based access.",
      desc: "Engineered for compliance and scale. Every tenant operates in a cryptographically isolated schema with automatic snapshot backups and sub-20ms edge querying.",
      stats: [
        { label: "Cluster Uptime", value: "99.99%" },
        { label: "Edge Latency", value: "< 18ms" },
        { label: "Data Encryption", value: "AES-256" },
      ],
      features: [
        "Dedicated tenant schema isolation powered by MySQL 8.0 & Prisma",
        "Super Admin 1-click passwordless tenant impersonation",
        "Full audit logging of administrative and financial actions",
        "Automated point-in-time database snapshot recovery",
      ],
    },
  ];

  const currentSuite = suites.find((s) => s.id === activePreviewTab) || suites[0];

  const enterpriseMetrics = [
    { value: "99.99%", label: "Guaranteed SLA Uptime", sub: "Enterprise Cluster Stability" },
    { value: "< 18ms", label: "Average API Latency", sub: "Optimized MySQL Database Engine" },
    { value: "16+", label: "Integrated HRM Modules", sub: "From Hire to Retire" },
    { value: "500+", label: "Ecosystem Addons", sub: "Modular Marketplace Catalog" },
  ];

  const testimonials = [
    {
      quote:
        "Master ERP unified our payroll across 4 regional branches into a 5-minute automated run. The level of speed and UI craftsmanship is unmatched.",
      author: "Priya Sharma",
      title: "Chief Operating Officer",
      company: "Apex Global Technologies",
      avatar: "PS",
    },
    {
      quote:
        "Replacing three fragmented tools for HR, POS, and Invoicing saved our accounting department over 35 hours every month. The multi-tenant architecture is rock solid.",
      author: "Marcus Vance",
      title: "VP of Enterprise Finance",
      company: "Novus Industries",
      avatar: "MV",
    },
    {
      quote:
        "The clean design system and real-time attendance clock-in made onboarding 400+ employees effortless. Our team actually enjoys using it every day.",
      author: "Elena Rostova",
      title: "Head of People & Culture",
      company: "Vanguard Mobility",
      avatar: "ER",
    },
  ];

  return (
    <MarketingLayout>
      {/* ─── 1. CORPORATE HERO SECTION ───────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b bg-gradient-to-b from-secondary/30 via-background to-background">
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-pink-500/10 blur-[120px] rounded-full -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Top Pill & Headline */}
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold shadow-xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Next-Generation Autonomous Enterprise Operating System</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono text-[11px] font-bold">v2.8 Enterprise Cloud</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.08]">
              One Unified Cloud Platform for{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 dark:from-purple-400 dark:via-indigo-400 dark:to-pink-400">
                Workforce, Finance & Scale.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Unify global payroll runs, biometric attendance, double-entry ledgers, POS cashiers, sales
              CRM pipelines, and 500+ ecosystem addons in one reliable workspace.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                size="lg"
                asChild
                className="h-12 px-7 rounded-xl font-bold text-sm bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95"
              >
                <Link to="/auth">
                  Start 14-Day Free Trial <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 px-7 rounded-xl font-semibold text-sm border-border bg-card/60 backdrop-blur-md hover:bg-muted"
              >
                <Link to="/contact">Schedule Architecture Walkthrough</Link>
              </Button>
            </div>

            {/* Enterprise Trust Badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                SOC-2 Type II Certified
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-purple-600 dark:text-purple-400" />
                GDPR & ISO 27001 Ready
              </span>
              <span className="flex items-center gap-1.5">
                <Server className="size-4 text-blue-600 dark:text-blue-400" />
                99.99% Guaranteed SLA
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="size-4 text-pink-600 dark:text-pink-400" />
                256-Bit Hardware Encryption
              </span>
            </div>
          </div>

          {/* ─── INTERACTIVE CORPORATE DASHBOARD PREVIEW ──────────────────── */}
          <div className="rounded-3xl border border-border/80 bg-card/90 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Mock Topbar */}
            <div className="h-12 border-b border-border/60 bg-muted/40 px-4 sm:px-6 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-rose-500/80" />
                  <div className="size-3 rounded-full bg-amber-500/80" />
                  <div className="size-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-muted-foreground font-mono text-[11px] ml-2 hidden sm:inline">
                  https://app.masterhrms.com/dashboard
                </span>
              </div>

              {/* Interactive Preview Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-background border border-border/60">
                {(["workforce", "finance", "crm", "security"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActivePreviewTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      activePreviewTab === tab
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Mock Content */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Dynamic Live Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border bg-background space-y-1">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total Workforce
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-foreground">1,248</div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>↑ +12 this month</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-background space-y-1">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Today Attendance
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400">
                    98.4%
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">1,228 clocked in</div>
                </div>

                <div className="p-4 rounded-2xl border bg-background space-y-1">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Monthly Run Rate
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    ₹1.48 Cr
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    ↑ +18.4% YoY
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-background space-y-1">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Database Latency
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                    18.2 ms
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">MySQL Realtime Sync</div>
                </div>
              </div>

              {/* Dynamic Feature Details Pane */}
              <div className="p-6 rounded-2xl border border-border/80 bg-secondary/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold">
                      <currentSuite.icon className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{currentSuite.title}</h4>
                      <p className="text-xs text-muted-foreground">{currentSuite.headline}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs self-start sm:self-auto">
                    {currentSuite.badge}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {currentSuite.desc}
                </p>

                <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
                  {currentSuite.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-foreground font-medium">
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. ENTERPRISE LOGO TRUST STRIP ──────────────────────────────── */}
      <section className="py-12 border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Trusted by over 1,200+ fast-growing enterprises & multi-branch organizations
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all text-sm font-black font-mono">
            <span>APEX GLOBAL</span>
            <span>NOVUS TECH</span>
            <span>VANGUARD CORP</span>
            <span>SYNAPSE MOBILITY</span>
            <span>HORIZON LABS</span>
            <span>SOLARIS LOGISTICS</span>
          </div>
        </div>
      </section>

      {/* ─── 3. CORE SUITE PILLARS ────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-xs font-mono px-3 py-1">
              Complete Business Suite
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Built for every department. Integrated into one database.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Eliminate disjointed software subscriptions. Every module communicates seamlessly through a
              shared MySQL multi-tenant schema.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {suites.map((s) => (
              <div
                key={s.id}
                className="rounded-3xl border border-border/80 bg-card p-6 flex flex-col justify-between hover:border-primary/50 hover:shadow-xl transition-all group"
              >
                <div className="space-y-4">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center group-hover:scale-105 transition-transform">
                    <s.icon className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.headline}</p>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                    {s.features.slice(0, 2).map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <Link
                    to="/auth"
                    className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-1.5 transition-all"
                  >
                    Explore {s.title.split(" ")[0]} <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. TELEMETRY & ROI STATS ─────────────────────────────────────── */}
      <section className="py-20 border-y bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {enterpriseMetrics.map((m, idx) => (
              <div key={idx} className="space-y-2">
                <div className="text-3xl sm:text-5xl font-black font-mono text-primary">{m.value}</div>
                <div className="text-sm font-bold text-foreground">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. ENTERPRISE TESTIMONIALS ──────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-xs font-mono px-3 py-1">
              Customer Success
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Proven results from industry leaders.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-border/80 bg-card p-8 flex flex-col justify-between hover:shadow-lg transition-all"
              >
                <div className="space-y-4">
                  <div className="flex gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-4 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed italic">&quot;{t.quote}&quot;</p>
                </div>

                <div className="pt-6 border-t border-border/60 flex items-center gap-3 mt-6">
                  <div className="size-10 rounded-full bg-primary/10 text-primary font-black grid place-items-center text-xs">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">{t.author}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.title}, {t.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. PREDICTABLE PRICING SECTION ──────────────────────────────── */}
      <section className="py-20 border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-xs font-mono px-3 py-1">
              Predictable Pricing
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Transparent plans tailored for growth.
            </h2>
            <p className="text-muted-foreground text-sm">
              All plans include core multi-tenancy, daily automated backups, and unlimited employee self-service.
            </p>

            {/* Toggle */}
            <div className="pt-2 flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${!billingYearly ? "text-foreground" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingYearly(!billingYearly)}
                className="w-12 h-6 rounded-full bg-primary/30 p-0.5 flex items-center transition-colors"
              >
                <div
                  className={`size-5 rounded-full bg-primary transition-transform ${
                    billingYearly ? "translate-x-6" : ""
                  }`}
                />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${billingYearly ? "text-foreground" : "text-muted-foreground"}`}>
                Annual Billing
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter */}
            <div className="rounded-3xl border border-border/80 bg-card p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Starter Cloud
                  </div>
                  <h3 className="text-2xl font-black text-foreground mt-1">Small Teams</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black font-mono text-foreground">
                      ₹{billingYearly ? "199" : "249"}
                    </span>
                    <span className="text-xs text-muted-foreground">/ employee / mo</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-muted-foreground border-t border-border/60 pt-6">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Up to 50 Employees
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Biometric Attendance & Leave
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Employee Portal
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Standard Email Support
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Button variant="outline" asChild className="w-full font-bold text-xs h-11 rounded-xl">
                  <Link to="/auth">Start Free Trial</Link>
                </Button>
              </div>
            </div>

            {/* Growth Enterprise */}
            <div className="rounded-3xl border-2 border-primary bg-card p-8 flex flex-col justify-between relative shadow-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider shadow-md">
                Most Popular Tier
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                    Growth Enterprise
                  </div>
                  <h3 className="text-2xl font-black text-foreground mt-1">Complete Suite</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black font-mono text-primary">
                      ₹{billingYearly ? "399" : "499"}
                    </span>
                    <span className="text-xs text-muted-foreground">/ employee / mo</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-muted-foreground border-t border-border/60 pt-6">
                  <li className="flex items-center gap-2 text-foreground font-bold">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Complete 16-Module HRM Suite
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Financials & General Ledger
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Global Automated Payroll
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Sales CRM & Proposals
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> 500+ Ecosystem Addons
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Priority 24/7 SLA Support
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Button asChild className="w-full font-bold text-xs h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Link to="/auth">Start 14-Day Sandbox</Link>
                </Button>
              </div>
            </div>

            {/* Sovereign Cluster */}
            <div className="rounded-3xl border border-border/80 bg-card p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Custom Sovereign
                  </div>
                  <h3 className="text-2xl font-black text-foreground mt-1">Enterprise Cloud</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">Custom</span>
                    <span className="text-xs text-muted-foreground">/ dedicated pod</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-muted-foreground border-t border-border/60 pt-6">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Dedicated MySQL Database Pod
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Custom SSO (SAML / Okta)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> White-Label Branding
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> 99.999% SLA Guarantee
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" /> Dedicated Account Architect
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Button variant="outline" asChild className="w-full font-bold text-xs h-11 rounded-xl">
                  <Link to="/contact">Contact Sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. ENTERPRISE CTA LEAD BANNER ───────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold">
              <Sparkles className="size-3.5" /> Instant Cloud Deployment
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground max-w-2xl mx-auto">
              Ready to transform your enterprise operations?
            </h2>

            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Join over 1,200+ organizations running automated payroll, real-time financials, and multi-tenant
              operations on {appName}.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                asChild
                className="h-12 px-8 rounded-xl font-bold text-sm bg-primary text-primary-foreground shadow-xl shadow-primary/25"
              >
                <Link to="/auth">
                  Start Free 14-Day Trial <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 px-8 rounded-xl font-semibold text-sm bg-card border-border hover:bg-muted"
              >
                <Link to="/contact">Talk to Enterprise Architect</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
