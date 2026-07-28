import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatSystemAmount } from "@/lib/currency";
import {
  Users, Clock, Wallet, UserPlus, Target, ShieldCheck, BarChart3,
  ArrowRight, CheckCircle2, Puzzle, Sparkles, Zap, Globe, Building2,
  Landmark, TrendingUp, Boxes, LineChart, Layers, Cpu, Activity,
  Play, ArrowUpRight, Server, Lock, Headphones, FileText,
  CreditCard, Star, MessageSquare, Send, Loader2, Store,
  PhoneCall, MailCheck, ChevronDown, Globe2, FileSpreadsheet,
  Code, Database, Cloud, Layers3, BrainCircuit, Workflow,
  AreaChart, PieChart, CalendarCheck,
} from "lucide-react";

export const Route = createFileRoute("/")(  {
  component: Landing,
  head: () => ({
    meta: [
      { title: "Master ERP & HRMS — All-In-One Enterprise Cloud Platform" },
      { name: "description", content: "Unify Financials, Sales CRM, Supply Chain, Global Payroll & 500+ Addons." },
      { property: "og:title", content: "Master ERP & HRMS — Next-Gen Enterprise Cloud" },
      { property: "og:type", content: "website" },
    ],
  }),
});

/* ─── Static Data ─────────────────────────────────────────── */
const coreSuites = [
  {
    id: "finance", icon: Landmark, color: "from-blue-500 to-indigo-600",
    glow: "blue", title: "Financials & Accounting",
    desc: "General ledger, multi-currency invoicing, GST compliance, automated audit trails.",
    kpis: [
      { label: "Monthly Revenue", value: "₹1,48,29,000", note: "↑ +18.4% YoY", color: "text-emerald-400" },
      { label: "Net Ledger Profit", value: "₹48,20,000", note: "Audited", color: "text-blue-400" },
      { label: "GST Invoices", value: "1,428 Filed", note: "100% Compliant", color: "text-purple-400" },
    ],
  },
  {
    id: "payroll", icon: Wallet, color: "from-emerald-500 to-teal-600",
    glow: "emerald", title: "Global HRMS & Payroll",
    desc: "Statutory payroll with PF, ESI, TDS calculations, payslips & biometric attendance.",
    kpis: [
      { label: "Net Monthly Payroll", value: "₹42,85,000", note: "Disbursed 28th", color: "text-emerald-400" },
      { label: "Active Workforce", value: "1,248 Staff", note: "98.4% Attendance", color: "text-blue-400" },
      { label: "PF & ESI Challans", value: "₹5,12,000", note: "Auto Generated", color: "text-purple-400" },
    ],
  },
  {
    id: "supply", icon: Boxes, color: "from-orange-500 to-amber-600",
    glow: "orange", title: "Supply Chain & Inventory",
    desc: "Multi-warehouse stock, SKU management, automated reorder & 3-way PO matching.",
    kpis: [
      { label: "Active SKUs", value: "14,850 Units", note: "14 Warehouses", color: "text-emerald-400" },
      { label: "Purchase Orders", value: "42 POs", note: "Vendor Approved", color: "text-blue-400" },
      { label: "Inventory Value", value: "₹1.84 Cr", note: "Realtime Valuation", color: "text-purple-400" },
    ],
  },
  {
    id: "crm", icon: TrendingUp, color: "from-purple-500 to-pink-600",
    glow: "purple", title: "Sales CRM & Deal Pipeline",
    desc: "Lead scoring, deal pipelines, customer 360°, automated quotes & sales forecasting.",
    kpis: [
      { label: "Active Deals Value", value: "₹2.45 Cr", note: "Quarterly Pipeline", color: "text-emerald-400" },
      { label: "Won Contracts", value: "184 Deals", note: "↑ +24% Growth", color: "text-blue-400" },
      { label: "Win Rate", value: "68.4%", note: "High Conversion", color: "text-purple-400" },
    ],
  },
];

const platformFeatures = [
  { icon: BrainCircuit, title: "AI-Powered Automation", desc: "Smart invoice categorization, payroll anomaly detection, and predictive cashflow forecasting.", color: "from-violet-500 to-purple-600" },
  { icon: Workflow, title: "Visual ERP Workflows", desc: "No-code drag-and-drop approval chains, multi-level authorization, and SLA routing.", color: "from-blue-500 to-cyan-600" },
  { icon: Globe, title: "Multi-Tenant & Multi-Entity", desc: "Isolate subsidiaries, manage inter-company transfers, and consolidated reporting.", color: "from-emerald-500 to-teal-600" },
  { icon: Database, title: "Unified Data Fabric", desc: "Single source of truth across HR, finance, inventory, and CRM with live BI dashboards.", color: "from-orange-500 to-red-500" },
  { icon: ShieldCheck, title: "Enterprise Security", desc: "ISO 27001, SOC-2 Type II, role-based access control, full audit trails, and SSO.", color: "from-rose-500 to-pink-600" },
  { icon: Cloud, title: "Cloud-Native SaaS", desc: "99.99% uptime SLA with multi-region redundancy, automated backups, and zero downtime.", color: "from-sky-500 to-indigo-600" },
];




const fallbackAddons = [
  { name: "WhatsApp Alerts", category: "Messaging", price_monthly: 499, slug: "whatsapp-alerts", featured: true, image_url: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=400&q=80" },
  { name: "Biometric Device Sync", category: "Hardware", price_monthly: 799, slug: "biometric-sync", featured: true, image_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80" },
  { name: "QuickBooks & Tally", category: "Finance", price_monthly: 999, slug: "quickbooks-tally-sync", featured: true, image_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" },
  { name: "Razorpay Gateway", category: "Payment", price_monthly: 0, slug: "stripe-razorpay-sync", featured: true, image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=400&q=80" },
  { name: "Google Workspace SSO", category: "Auth", price_monthly: 0, slug: "google-slack-sso", featured: true, image_url: "" },
];

const defaultClientLogos = [
  { id: "c1", name: "Apex Global Manufacturing", badge: "Manufacturing" },
  { id: "c2", name: "Nova Health System", badge: "Healthcare" },
  { id: "c3", name: "Zenith Retail Cloud", badge: "Retail" },
  { id: "c4", name: "Horizon Logistics", badge: "Logistics" },
  { id: "c5", name: "Reliance Tech Digital", badge: "Enterprise" },
  { id: "c6", name: "Tata Communications", badge: "Telecom" },
  { id: "c7", name: "Mahindra Operations", badge: "Automotive" },
  { id: "c8", name: "Infosys Cloud", badge: "IT & Tech" },
];

const defaultFaqs = [
  { q: "Can Master ERP handle multi-company operations?", a: "Yes. Master ERP supports multi-tenant workspace architecture with multi-entity consolidation, separate subdomains, and role-based access control per entity." },
  { q: "Is the platform Indian tax and payroll compliant?", a: "Absolutely. Built-in GST invoicing, PF, ESI, TDS calculations, Form 16 generation, and full Indian Rupee (INR ₹) accounting support." },
  { q: "How does the 500+ Addons Marketplace work?", a: "Enable or disable modules like WhatsApp Alerts, Biometric Sync, or Tally with one click. Addons are synced live from our database." },
  { q: "Can we migrate data from legacy systems?", a: "Yes. Our team provides automated CSV/Excel migration tools and 1-on-1 implementation playbooks for every enterprise." },
];

const defaultTrustStats = [
  { value: "10,000+", label: "Enterprise Users", icon: Users },
  { value: "500+", label: "Addons Available", icon: Puzzle },
  { value: "99.99%", label: "Uptime SLA", icon: Server },
  { value: "₹48Cr+", label: "Payroll Processed", icon: Wallet },
];


function getAddonIcon(category: string, name: string) {
  const cat = (category || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (cat.includes("message") || n.includes("whatsapp") || n.includes("slack")) return MessageSquare;
  if (cat.includes("hardware") || n.includes("biometric")) return Cpu;
  if (cat.includes("finance") || n.includes("tally") || n.includes("quick")) return Landmark;
  if (cat.includes("payment") || n.includes("stripe") || n.includes("razorpay")) return CreditCard;
  if (cat.includes("auth") || n.includes("sso") || n.includes("google")) return Lock;
  if (cat.includes("security")) return ShieldCheck;
  if (cat.includes("hr") || n.includes("payroll")) return Users;
  return Puzzle;
}

const addonGradients: Record<string, string> = {
  Messaging: "from-green-500/30 to-emerald-600/20",
  Hardware: "from-slate-500/30 to-gray-600/20",
  Finance: "from-blue-500/30 to-indigo-600/20",
  Payment: "from-violet-500/30 to-purple-600/20",
  Auth: "from-orange-500/30 to-amber-600/20",
  Security: "from-red-500/30 to-rose-600/20",
  HRMS: "from-teal-500/30 to-cyan-600/20",
};

/* ─── Main Component ──────────────────────────────────────── */
function Landing() {
  const [activeSuiteId, setActiveSuiteId] = useState("finance");
  const [pulseRevenue, setPulseRevenue] = useState(14829000);
  const [selectedAddonCategory, setSelectedAddonCategory] = useState("All");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isSending, setIsSending] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", company: "", headcount: "100-500 Staff", message: "" });
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  // Homepage CMS: hero, CTAs, trust stats, FAQ — all editable in Super Admin
  const { data: homeCms } = useQuery({
    queryKey: ["cms-home-page"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "home").maybeSingle();
      return (data?.content as any) || null;
    },
  });

  const { data: dbAddons, isLoading: isAddonsLoading } = useQuery({
    queryKey: ["homepage-realtime-addons-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("addons").select("*").order("featured", { ascending: false }).limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: dbClientLogos } = useQuery({
    queryKey: ["homepage-client-logos"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-client-logos").maybeSingle();
      if (data?.content) {
        const parsed = data.content as any;
        if (Array.isArray(parsed.logos) && parsed.logos.length > 0) return parsed.logos;
      }
      return defaultClientLogos;
    },
  });


  const rawAddons = (dbAddons && dbAddons.length > 0) ? dbAddons : fallbackAddons;
  const clientLogos = dbClientLogos || defaultClientLogos;
  const addonCategories = ["All", ...Array.from(new Set(rawAddons.map((a: any) => a.category || "Extension")))];
  const displayAddons = rawAddons.filter((a: any) =>
    selectedAddonCategory === "All" || (a.category || "").toLowerCase() === selectedAddonCategory.toLowerCase()
  );
  const activeSuite = coreSuites.find((s) => s.id === activeSuiteId) || coreSuites[0];

  // CMS-driven dynamic content (with fallbacks)
  const faqs: { q: string; a: string }[] = (homeCms?.faq && Array.isArray(homeCms.faq) && homeCms.faq.length > 0)
    ? homeCms.faq
    : defaultFaqs;

  const trustStats: { value: string; label: string; icon: any }[] =
    (homeCms?.trust_stats && Array.isArray(homeCms.trust_stats) && homeCms.trust_stats.length > 0)
      ? homeCms.trust_stats.map((s: any, i: number) => ({
          ...s,
          icon: defaultTrustStats[i % defaultTrustStats.length]?.icon || Users,
        }))
      : defaultTrustStats;



  useEffect(() => {
    const interval = setInterval(() => setPulseRevenue((p) => p + Math.floor(Math.random() * 480)), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handle = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setMousePos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    };
    el.addEventListener("mousemove", handle);
    return () => el.removeEventListener("mousemove", handle);
  }, []);

  function handleSendContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return toast.error("Please fill all required fields (*)");
    setIsSending(true);
    setTimeout(() => {
      toast.success("Thank you! An ERP specialist will contact you shortly.");
      setContactForm({ name: "", email: "", phone: "", company: "", headcount: "100-500 Staff", message: "" });
    }, 1000);
  }

  const currCode = sysConfig?.defaultCurrency || "INR";

  function formatAddonPrice(price_monthly: number) {
    if (price_monthly === 0) return "Free";
    let p = price_monthly;
    if (currCode === "USD") p = p > 100 ? Math.round(p / 80) : p;
    else if (currCode === "EUR") p = p > 100 ? Math.round(p / 85) : p;
    else if (currCode === "GBP") p = p > 100 ? Math.round(p / 100) : p;
    return `${formatSystemAmount(p, sysConfig)}/mo`;
  }

  return (
    <MarketingLayout>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HERO — CINEMATIC LIQUID GLASS (MOBILE RESPONSIVE)             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative overflow-x-clip overflow-y-hidden flex items-center min-h-[90vh] sm:min-h-screen py-16 sm:py-24 lg:py-0"
        style={{
          background: "linear-gradient(125deg, #05060f 0%, #0c0e1e 40%, #0a0c1a 70%, #070818 100%)",
        }}
      >
        {/* ── Layer 0: Canvas particle dots ────────────────────────────── */}
        {Array.from({ length: 26 }).map((_, i) => {
          const size = 2 + (i % 4);
          const delay = (i * 1.3) % 12;
          const dur = 8 + (i * 0.9) % 14;
          const left = (i * 37 + 5) % 96;
          const tx = ((i % 7) - 3) * 40;
          return (
            <div
              key={`p-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: size, height: size,
                left: `${left}%`,
                bottom: `-${size}px`,
                background: i % 3 === 0 ? "rgba(99,102,241,0.7)" : i % 3 === 1 ? "rgba(16,185,129,0.6)" : "rgba(168,85,247,0.5)",
                "--tx": tx,
                animation: `particle-rise ${dur}s ${delay}s linear infinite`,
                filter: "blur(0.5px)",
              } as React.CSSProperties}
            />
          );
        })}

        {/* ── Layer 1: Ambient macro blobs ─────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-liquid-drift absolute -top-40 -left-40 w-[350px] sm:w-[700px] h-[350px] sm:h-[700px] rounded-full"
            style={{ background: "radial-gradient(circle at 40% 40%, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.15) 45%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="animate-liquid-glow absolute -bottom-32 -right-32 w-[300px] sm:w-[550px] h-[300px] sm:h-[550px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(6,182,212,0.12) 55%, transparent 75%)", filter: "blur(90px)" }} />
          <div className="absolute top-1/3 right-1/5 w-[200px] sm:w-[320px] h-[200px] sm:h-[320px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(244,63,94,0.18) 0%, transparent 70%)", filter: "blur(60px)", animation: "liquid-float 9s ease-in-out infinite 3s" }} />
        </div>

        {/* ── Layer 2: Interactive cursor glow ─────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 transition-all duration-500"
          style={{ background: `radial-gradient(700px circle at ${mousePos.x}% ${mousePos.y}%, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)` }} />

        {/* ── Layer 3: Grid / mesh overlay ─────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />

        {/* ── Main Content Grid ─────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[calc(100vh-100px)] py-6 sm:py-10 lg:py-0">

            {/* ══ LEFT COLUMN — Copy & CTAs ══════════════════════════════ */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-center lg:text-left">

              {/* Eyebrow pill with animated live dot */}
              <div className="animate-slide-up inline-flex items-center gap-2 rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold max-w-full"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
                  border: "1px solid rgba(99,102,241,0.3)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 0 20px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}>
                <span className="relative flex size-2 shrink-0">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <Sparkles className="size-3.5 text-indigo-400 shrink-0" />
                <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent font-extrabold tracking-wide truncate">
                  Next-Gen Cloud ERP
                </span>
                <span className="w-px h-3 bg-white/15 shrink-0 hidden sm:inline" />
                <span className="text-white/40 text-[10px] font-mono tracking-widest shrink-0 hidden sm:inline">{currCode} · 500+ ADDONS</span>
              </div>

              {/* ── Animated multi-word headline ───────────────────────── */}
              <div className="animate-slide-up-d1 space-y-1 sm:space-y-2">
                <h1 className="text-4xl xs:text-5xl sm:text-6xl lg:text-[70px] xl:text-[76px] font-black tracking-tight leading-[1.04] text-white">
                  The Only
                  <br />
                  <span className="relative">
                    <span
                      className="animate-gradient-shift bg-clip-text text-transparent"
                      style={{ backgroundImage: "linear-gradient(90deg, #818cf8, #a78bfa, #38bdf8, #34d399, #818cf8)" }}>
                      All-in-One
                    </span>
                  </span>
                </h1>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-1 sm:gap-3 text-3xl xs:text-4xl sm:text-6xl lg:text-[70px] xl:text-[76px] font-black tracking-tight leading-[1.04]">
                  <span className="text-white/80">Enterprise</span>
                  <div className="relative h-[1.25em] overflow-hidden text-center lg:text-left min-w-[210px] xs:min-w-[250px] sm:min-w-[340px]">
                    {/* Rotating words via CSS */}
                    {["ERP Platform", "HRMS Suite", "Finance Cloud", "Ops Console"].map((word, i) => (
                      <span
                        key={word}
                        className="absolute inset-0 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent font-black"
                        style={{
                          animation: `slide-up-fade 0.6s ease both`,
                          animationName: "data-stream",
                          animationDuration: "16s",
                          animationDelay: `${i * 4}s`,
                          animationIterationCount: "infinite",
                          animationTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
                        }}>
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sub copy */}
              <p className="animate-slide-up-d2 text-sm sm:text-base lg:text-lg text-white/45 leading-relaxed max-w-[540px] mx-auto lg:mx-0 px-1 sm:px-0">
                Unify{" "}
                <span className="text-white/75 font-semibold">Financial Ledgers</span>,{" "}
                <span className="text-white/75 font-semibold">Sales CRM</span>,{" "}
                <span className="text-white/75 font-semibold">Supply Chain</span>,{" "}
                <span className="text-white/75 font-semibold">Global Payroll</span>, and{" "}
                <span className="text-indigo-400 font-bold">500+ Ecosystem Addons</span>{" "}
                in one intelligent multi-tenant platform.
              </p>

              {/* CTA Buttons */}
              <div className="animate-slide-up-d3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 w-full max-w-md mx-auto lg:mx-0">
                {/* Primary CTA */}
                <Link to="/auth" search={{ mode: "signup" } as never} className="w-full sm:w-auto">
                  <button
                    className="conic-glow w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #4f46e5 100%)",
                      backgroundSize: "200% 200%",
                      boxShadow: "0 0 40px rgba(99,102,241,0.5), 0 4px 24px rgba(0,0,0,0.4)",
                    }}>
                    <span className="relative z-10 flex items-center gap-2">
                      Start Free Enterprise Trial
                      <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                  </button>
                </Link>

                {/* Secondary CTA */}
                <Link to="/contact" className="w-full sm:w-auto">
                  <button
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-white/70 hover:text-white transition-all duration-300 hover:scale-[1.01] group"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      backdropFilter: "blur(16px)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}>
                    <div className="size-5 sm:size-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Play className="size-2 sm:size-2.5 fill-indigo-400 text-indigo-400 translate-x-px" />
                    </div>
                    Watch Executive Demo
                  </button>
                </Link>
              </div>

              {/* Trust strip */}
              <div className="animate-slide-up-d4 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 pt-1">
                {[
                  { icon: "🛡️", text: "ISO 27001 Certified" },
                  { icon: "📊", text: "GST & Tax Compliant" },
                  { icon: "⚡", text: "14-Day Free Trial" },
                  { icon: "🔒", text: "SOC-2 Type II" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-white/35 font-medium">
                    <span>{b.icon}</span> {b.text}
                  </div>
                ))}
              </div>

              {/* Live stat row */}
              <div className="animate-slide-up-d4 hidden sm:flex items-center justify-center lg:justify-start gap-6 pt-2">
                {[
                  { value: "10K+", label: "Enterprise Users", color: "text-indigo-400" },
                  { value: "99.99%", label: "Uptime SLA", color: "text-emerald-400" },
                  { value: "500+", label: "Addons", color: "text-violet-400" },
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center gap-3">
                    {i > 0 && <div className="w-px h-7 bg-white/10" />}
                    <div>
                      <div className={`text-base sm:text-lg lg:text-xl font-black font-mono ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] sm:text-[10px] text-white/30 font-medium uppercase tracking-wider">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ══ RIGHT COLUMN — Orbital Dashboard Showcase ══════════════ */}
            <div className="lg:col-span-6 relative flex items-center justify-center py-6 sm:py-10 lg:py-0 w-full overflow-hidden lg:overflow-visible">

              {/* ── Outer orbital ring decoration (Responsive size) ───── */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <div className="animate-ring-spin absolute w-[280px] xs:w-[360px] sm:w-[460px] lg:w-[540px] h-[280px] xs:h-[360px] sm:h-[460px] lg:h-[540px] rounded-full"
                  style={{ border: "1px solid rgba(99,102,241,0.12)" }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-indigo-500" style={{ boxShadow: "0 0 8px rgba(99,102,241,0.8)" }} />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 size-1.5 rounded-full bg-violet-500 opacity-60" />
                </div>
                <div className="animate-ring-spin-rev absolute w-[220px] xs:w-[280px] sm:w-[360px] lg:w-[420px] h-[220px] xs:h-[280px] sm:h-[360px] lg:h-[420px] rounded-full"
                  style={{ border: "1px dashed rgba(16,185,129,0.1)" }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 size-1.5 rounded-full bg-emerald-500 opacity-70" style={{ boxShadow: "0 0 6px rgba(16,185,129,0.8)" }} />
                </div>
              </div>

              {/* ── Floating satellite KPI cards ──────────────────────── */}

              {/* TOP LEFT: MRR counter */}
              <div className="animate-card-float-a absolute -top-2 left-0 lg:-left-6 z-20 hidden md:flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.12)",
                }}>
                <div className="size-8 rounded-xl grid place-items-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <TrendingUp className="size-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[8px] text-white/35 font-bold uppercase tracking-widest">Realtime MRR</div>
                  <div className="text-sm font-black font-mono text-emerald-400">{formatSystemAmount(pulseRevenue, sysConfig)}</div>
                </div>
              </div>

              {/* BOTTOM RIGHT: API latency */}
              <div className="animate-card-float-c absolute -bottom-2 right-0 lg:-right-4 z-20 hidden md:flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
                style={{
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.12)",
                }}>
                <div className="size-8 rounded-xl grid place-items-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                  <Zap className="size-4 text-violet-400" />
                </div>
                <div>
                  <div className="text-[8px] text-white/35 font-bold uppercase tracking-widest">API Latency</div>
                  <div className="text-sm font-black font-mono text-violet-400">14ms</div>
                </div>
              </div>

              {/* ── MAIN DASHBOARD CARD ───────────────────────────────── */}
              <div className="relative w-full max-w-[95vw] xs:max-w-[440px] lg:max-w-[500px] animate-hero-breathe"
                style={{
                  borderRadius: "24px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(32px) saturate(200%)",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}>

                {/* Card top bar — window chrome */}
                <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 sm:py-4 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 sm:size-3 rounded-full bg-red-500/80" />
                      <div className="size-2.5 sm:size-3 rounded-full bg-amber-400/80" />
                      <div className="size-2.5 sm:size-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-white/25 font-mono truncate max-w-[120px] sm:max-w-none">master-erp.dashboard</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono text-emerald-400"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live · Synced
                  </div>
                </div>

                {/* App identity row */}
                <div className="px-3.5 sm:px-5 pt-3.5 sm:pt-5 pb-2.5 sm:pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl grid place-items-center font-black text-lg sm:text-xl text-white shadow-xl"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>M</div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white">Master ERP Operations</div>
                      <div className="text-[10px] sm:text-[11px] text-white/35">Multi-Tenant · Enterprise Engine</div>
                    </div>
                  </div>
                  <div className="text-right hidden xs:block">
                    <div className="text-[10px] text-white/25 font-mono">v2.8.1</div>
                    <div className="text-[10px] text-indigo-400 font-mono">500+ modules</div>
                  </div>
                </div>

                {/* Suite tab switcher */}
                <div className="px-3.5 sm:px-5 pb-2.5 sm:pb-3">
                  <div className="flex gap-1 p-1 rounded-xl overflow-x-auto no-scrollbar"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {coreSuites.map((s) => {
                      const isActive = activeSuiteId === s.id;
                      const grad = s.color.includes("blue") ? "#4f46e5,#4338ca"
                        : s.color.includes("emerald") ? "#059669,#0d9488"
                        : s.color.includes("orange") ? "#d97706,#b45309"
                        : "#9333ea,#db2777";
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActiveSuiteId(s.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all shrink-0 ${isActive ? "text-white shadow-sm" : "text-white/35 hover:text-white/60"}`}
                          style={isActive ? { background: `linear-gradient(135deg, ${grad})` } : {}}>
                          <s.icon className="size-3" />
                          {s.title.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* KPI grid */}
                <div className="px-3.5 sm:px-5 pb-2.5 sm:pb-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                  {activeSuite.kpis.map((kpi, i) => (
                    <div key={i} className="p-2 sm:p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-[8px] sm:text-[9px] text-white/30 font-medium leading-tight mb-0.5 truncate">{kpi.label}</div>
                      <div className="text-[11px] sm:text-xs font-black font-mono text-white leading-tight truncate">{kpi.value}</div>
                      <div className={`text-[8px] sm:text-[9px] font-semibold mt-0.5 truncate ${kpi.color}`}>{kpi.note}</div>
                    </div>
                  ))}
                </div>

                {/* Mini chart bars */}
                <div className="px-3.5 sm:px-5 pb-2.5 sm:pb-3">
                  <div className="p-2.5 sm:p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-end justify-between gap-1 h-9 sm:h-12">
                      {[35, 55, 42, 68, 52, 78, 61, 85, 72, 91, 69, 88].map((h, i) => (
                        <div key={i} className="flex-1 rounded-xs transition-all duration-500"
                          style={{
                            height: `${h}%`,
                            background: `linear-gradient(to top, rgba(99,102,241,${0.3 + (h / 100) * 0.5}), rgba(139,92,246,${0.2 + (h / 100) * 0.3}))`,
                          }} />
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[8px] sm:text-[9px] text-white/25 font-mono">
                      <span>Jan</span><span>Jun</span><span>Dec</span>
                    </div>
                  </div>
                </div>

                {/* Module pill strip */}
                <div className="px-3.5 sm:px-5 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "💼 Financials", col: "rgba(99,102,241,0.25)" },
                      { label: "💵 Payroll", col: "rgba(16,185,129,0.2)" },
                      { label: "📦 Supply", col: "rgba(245,158,11,0.2)" },
                      { label: "⏱️ Attendance", col: "rgba(139,92,246,0.2)" },
                      { label: "+500 Addons →", col: "rgba(99,102,241,0.35)" },
                    ].map((m) => (
                      <span key={m.label} className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold text-white/60"
                        style={{ background: m.col, border: "1px solid rgba(255,255,255,0.08)" }}>
                        {m.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* ── Bottom fog fade ──────────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent 0%, var(--color-background) 100%)" }} />

        {/* ── Scroll cue ───────────────────────────────────────────────── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-bounce">
          <div className="text-[10px] text-white font-mono tracking-widest uppercase">Scroll</div>
          <div className="w-px h-8 bg-gradient-to-b from-white/60 to-transparent" />
        </div>
      </section>


      {/* 2. TRUST STATS BAR */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-8 border-y bg-gradient-to-r from-primary/5 via-purple-500/5 to-emerald-500/5 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:divide-x divide-border">
            {trustStats.map((s) => (
              <div key={s.label} className="flex items-center gap-4 px-6 py-2">
                <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-black tracking-tight text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 3. CLIENT LOGOS MARQUEE (2-ROW LIQUID) */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-12 border-b overflow-hidden relative bg-secondary/20">
        <div className="mx-auto max-w-7xl px-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Building2 className="size-4 text-primary" />
              Trusted By Leading Global Enterprises
            </div>
            <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              Live from Super Admin
            </Badge>
          </div>
        </div>

        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-32 bg-gradient-to-l from-background to-transparent" />

        <div className="space-y-4">
          <div className="flex overflow-hidden select-none">
            <div className="animate-marquee-left gap-4">
              {[...clientLogos, ...clientLogos, ...clientLogos].map((logo: any, idx) => (
                <div key={`r1-${logo.id}-${idx}`}
                  className="liquid-glass h-16 px-6 rounded-2xl hover:border-primary/40 transition-all flex items-center gap-3 shrink-0 group cursor-pointer mx-2">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary grid place-items-center font-black text-sm group-hover:scale-110 transition-transform">
                    {logo.name[0]}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-primary/60" />
                    {logo.name.split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex overflow-hidden select-none">
            <div className="animate-marquee-right gap-4">
              {[...clientLogos, ...clientLogos, ...clientLogos].reverse().map((logo: any, idx) => (
                <div key={`r2-${logo.id}-${idx}`}
                  className="liquid-glass h-16 px-6 rounded-2xl hover:border-purple-500/40 transition-all flex items-center gap-3 shrink-0 group cursor-pointer mx-2">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-emerald-500/20 text-purple-500 dark:text-purple-400 grid place-items-center font-black text-sm group-hover:scale-110 transition-transform">
                    {logo.name[logo.name.length - 1]}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500/60" />
                    {logo.badge}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 4. CORE ENTERPRISE MODULES — LIQUID GLASS GRID */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-24 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-8 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)", filter: "blur(80px)" }} />

        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-primary border border-primary/30 bg-primary/5">
              <Layers3 className="size-3.5" /> ERP & HRMS Capabilities
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Complete Enterprise
              <span className="block bg-gradient-to-r from-primary via-purple-600 to-emerald-500 bg-clip-text text-transparent">
                Financial & Operational Control
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Manage your entire business lifecycle in one unified database with native Indian Rupee (INR ₹) accounting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreSuites.map((s, i) => (
              <div key={s.id}
                className="group relative rounded-3xl p-6 cursor-pointer hover:scale-[1.02] transition-all duration-500 overflow-hidden bg-card border border-border shadow-sm hover:border-primary/40 hover:shadow-xl"
                style={{ animationDelay: `${i * 0.15}s` }}>

                {/* Hover glow overlay */}
                <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${s.color}`}
                  style={{ opacity: 0 }} />

                {/* Colored icon */}
                <div className={`size-14 rounded-2xl bg-gradient-to-br ${s.color} grid place-items-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon className="size-7 text-white" />
                </div>

                <h3 className="font-bold text-base mb-2 text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-5">{s.desc}</p>

                {/* KPI mini rows */}
                <div className="space-y-2 border-t border-border pt-4">
                  {s.kpis.slice(0, 2).map((k, ki) => (
                    <div key={ki} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{k.label}</span>
                      <span className={`font-mono font-bold ${k.color}`}>{k.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-primary group-hover:gap-2.5 transition-all">
                  Explore Suite <ArrowRight className="size-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* 5. PLATFORM FEATURES — BENTO GLASS GRID */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-24 relative border-t" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.04) 50%, transparent 100%)" }}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-purple-600 border border-purple-500/30 bg-purple-500/5">
              <BrainCircuit className="size-3.5" /> Platform Intelligence
            </div>
            <h2 className="text-4xl font-black tracking-tight">
              Why Enterprises Choose
              <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Master ERP</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {platformFeatures.map((f, i) => (
              <div key={f.title}
                className="group relative rounded-3xl p-7 overflow-hidden hover:scale-[1.01] transition-all duration-300 cursor-default bg-card border border-border shadow-sm hover:border-primary/30 hover:shadow-lg"
                style={{ animationDelay: `${i * 0.1}s` }}>
                {/* Animated gradient corner glow */}
                <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${f.color}`} style={{ filter: "blur(30px)" }} />

                <div className={`size-12 rounded-2xl bg-gradient-to-br ${f.color} grid place-items-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  <f.icon className="size-6 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-2 text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 6. ADDONS MARKETPLACE — REALTIME LIQUID CARDS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-24 border-t relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-6 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)", filter: "blur(100px)" }} />

        <div className="mx-auto max-w-7xl px-6 space-y-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-600 border border-emerald-500/30 bg-emerald-500/5">
                  <Store className="size-3.5" /> Ecosystem Marketplace
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-emerald-600 border border-emerald-500/30 bg-emerald-500/8">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" /> Realtime Sync
                </span>
              </div>
              <h2 className="text-4xl font-black tracking-tight">
                500+ Modular ERP &amp;
                <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">HR Addons</span>
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                Extend your workspace with 1-click add-ons for WhatsApp messaging, biometric hardware, QuickBooks, Tally, and more.
              </p>
            </div>
            <Button asChild size="lg" className="font-bold gap-2 shrink-0" style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}>
              <Link to="/addons">Browse Full Marketplace <ArrowRight className="size-4" /></Link>
            </Button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {addonCategories.map((cat) => {
              const isActive = selectedAddonCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedAddonCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${isActive ? "text-white shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                  style={isActive
                    ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "1px solid rgba(99,102,241,0.5)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Addons Grid */}
          {isAddonsLoading ? (
            <div className="py-16 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground mt-3 font-mono">Syncing marketplace from database...</p>
            </div>
          ) : displayAddons.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground liquid-glass rounded-3xl p-8">
              No addons in "{selectedAddonCategory}" — <button className="text-primary font-semibold" onClick={() => setSelectedAddonCategory("All")}>view all</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {displayAddons.map((addon: any) => {
                const CatIcon = getAddonIcon(addon.category, addon.name);
                const hasImg = !!(addon.image_url || addon.icon);
                const grad = addonGradients[addon.category] || "from-slate-500/20 to-gray-600/15";
                const price = formatAddonPrice(addon.price_monthly ?? 0);
                return (
                  <div key={addon.id || addon.name}
                    className="group relative rounded-3xl overflow-hidden liquid-glass hover:scale-[1.02] transition-all duration-400 flex flex-col"
                    style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>

                    {/* Thumbnail */}
                    <div className={`h-40 relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${grad}`}>
                      {hasImg ? (
                        <img src={addon.image_url || addon.icon} alt={addon.name}
                          className="object-cover size-full group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="size-16 rounded-2xl bg-background/30 backdrop-blur-md border border-white/10 grid place-items-center group-hover:scale-110 transition-transform">
                          <CatIcon className="size-8 text-white/80" />
                        </div>
                      )}
                      {/* Overlay badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md capitalize"
                        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
                        <CatIcon className="size-2.5" /> {addon.category || "Extension"}
                      </div>
                      {addon.featured && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>★ Featured</div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold line-clamp-1 group-hover:text-primary transition-colors">{addon.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {addon.tagline || addon.description || `Integrate ${addon.name} into your Master ERP workspace.`}
                        </p>
                      </div>
                      <div className="mt-auto pt-3 flex items-center justify-between border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        <span className="font-mono text-xs font-black text-emerald-600">{price}</span>
                        <Button size="sm" variant="outline" asChild className="h-7 text-[10px] px-3 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all">
                          <Link to="/addons">View <ArrowRight className="size-2.5 ml-1" /></Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 7. FAQ — LIQUID GLASS ACCORDION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-24 border-t bg-secondary/10">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-primary border border-primary/30 bg-primary/5">
              <Headphones className="size-3.5" /> Frequently Asked
            </div>
            <h2 className="text-4xl font-black tracking-tight">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i}
                className="rounded-2xl overflow-hidden liquid-glass transition-all duration-300"
                style={{ boxShadow: openFaq === i ? "0 8px 32px rgba(99,102,241,0.12)" : "none" }}>
                <button className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-semibold text-sm">{faq.q}</span>
                  <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180 text-primary" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 8. SCHEDULE DEMO — MOBILE RESPONSIVE CTA WIDGET       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-12 sm:py-20 lg:py-24 border-t relative overflow-hidden">
        {/* Deep background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.04) 50%, rgba(16,185,129,0.04) 100%)" }} />
        <div className="absolute top-0 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)", filter: "blur(120px)" }} />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
          <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-12 overflow-hidden relative bg-card border border-border shadow-xl">
            {/* Inner glow */}
            <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)", filter: "blur(60px)" }} />

            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
              {/* Left Pane */}
              <div className="lg:col-span-5 space-y-5 sm:space-y-7">
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-600 border border-indigo-500/30 bg-indigo-500/8 mb-3">
                    <Sparkles className="size-3.5 shrink-0" /> Executive Consultation
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-foreground">
                    Schedule an Enterprise
                    <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">ERP Demo</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2.5">
                    Questions about custom ERP workflows, multi-company consolidation, or data migration? Our solution architects are ready.
                  </p>
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  {[
                    { icon: Target, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", title: "Personalized Demo Walkthrough", desc: "Tailored to your industry, headcount & use case." },
                    { icon: Building2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", title: "Custom Architecture Review", desc: "Multi-tenant isolation, API audit & integration map." },
                    { icon: FileSpreadsheet, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", title: "1-on-1 Data Migration Playbook", desc: "Seamless import from legacy ERPs & spreadsheets." },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-secondary/30 border border-border/60">
                      <div className={`size-8 sm:size-9 rounded-xl ${item.bg} ${item.color} grid place-items-center shrink-0`}>
                        <item.icon className="size-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-foreground">{item.title}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="size-3.5 text-emerald-500 shrink-0" /> 2-Hour Response SLA</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-500 shrink-0" /> 100% Confidential</span>
                </div>
              </div>

              {/* Right Form */}
              <form onSubmit={handleSendContact} className="lg:col-span-7 space-y-4 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 bg-card border border-border shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="font-bold text-xs sm:text-sm text-foreground">Fill in your requirements</div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-border bg-secondary/50 text-muted-foreground">
                    Instant Booking
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full Name *</Label>
                    <Input placeholder="Anand Sharma" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="h-10 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work Email *</Label>
                    <Input type="email" placeholder="anand@company.com" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="h-10 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Company Name</Label>
                    <Input placeholder="Apex Global Ltd" value={contactForm.company} onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })} className="h-10 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Workforce Headcount</Label>
                    <Select value={contactForm.headcount} onValueChange={(v) => setContactForm({ ...contactForm, headcount: v })}>
                      <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-50 Staff">1–50 Employees</SelectItem>
                        <SelectItem value="50-200 Staff">50–200 Employees</SelectItem>
                        <SelectItem value="200-1000 Staff">200–1,000 Employees</SelectItem>
                        <SelectItem value="1000+ Enterprise">1,000+ Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Message / Requirements *</Label>
                  <Textarea placeholder="Tell us about your current ERP tools, migration timeline, or modules required..." rows={3} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} className="text-xs leading-relaxed resize-none" />
                </div>

                <Button type="submit" size="lg" disabled={isSending} className="w-full font-bold h-11 sm:h-12 gap-2 text-xs sm:text-sm relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>
                  {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Request Executive Demo
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

