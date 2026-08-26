import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Store,
  Search,
  CheckCircle2,
  Plus,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  MessageSquare,
  Landmark,
  Lock,
  CreditCard,
  ShoppingBag,
  Loader2,
  Check,
  ImageIcon,
  Eye,
  ExternalLink,
  Layers,
  Building2,
  Tag,
  Boxes,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PaymentCheckoutModal } from "@/components/payment-checkout-modal";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/marketplace")({
  component: MarketplacePage,
  head: () => ({ meta: [{ title: "Addons Marketplace — Master ERP" }] }),
});

export type TenantPurchasedAddon = {
  addonId: string;
  addonSlug: string;
  name: string;
  price: number;
  purchasedAt: string;
  expiresAt: string;
  status: "active" | "trial" | "disabled";
  paymentMethod?: string;
  paymentId?: string;
  invoiceNo?: string;
  install_url?: string;
};

const CATEGORY_IMAGES: Record<string, string> = {
  Productivity:
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  "Sales & CRM":
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80",
  "Retail & POS":
    "https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=600&q=80",
  "AI & ML":
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  Finance:
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
  Hardware:
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
  Communication:
    "https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=600&q=80",
  "Talent & Strategy":
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
  Payments:
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
  Other:
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
};

const DEFAULT_SUPER_ADDONS = [
  {
    id: "add-01",
    slug: "whatsapp-alerts",
    name: "WhatsApp Instant Alerts",
    tagline: "Automated SMS & WhatsApp alerts for shifts, payroll & leaves",
    description: "Send real-time alerts directly to employees via official Meta Cloud API with customizable templates.",
    long_description: "Deliver instant automated push alerts to employees and managers for shifts, clock-in reminders, payslips, and leave request decisions without third-party middleman delays.",
    price_monthly: 999,
    category: "Communication",
    developer: "Master ERP Core Team",
    version: "v2.4.0",
    features: ["Automated payslip PDF delivery", "Shift clock-in/out alert triggers", "Two-factor OTP delivery", "Template customizer"],
    status: "active",
    featured: true,
    install_url: "/whatsapp-alerts",
  },
  {
    id: "add-02",
    slug: "biometric-sync",
    name: "Biometric Hardware Sync",
    tagline: "Realtime ZKTeco and Essl fingerprint and face scanner sync",
    description: "Sync punches automatically from fingerprint & face scanners with zero manual upload.",
    long_description: "Connect physical attendance machines directly to your MySQL cloud instance with millisecond synchronization and automated shift logs.",
    price_monthly: 1499,
    category: "Hardware",
    developer: "Master Hardware Team",
    version: "v3.1.0",
    features: ["TCP/IP direct socket sync", "Automated shift assignment", "Offline punch buffering", "Device health logs"],
    status: "active",
    featured: true,
    install_url: "/biometric-sync",
  },
  {
    id: "add-03",
    slug: "ai-content-generator",
    name: "AI Content Generation Studio",
    tagline: "Generate marketing copy, job descriptions, HR circulars & blogs with 20+ AI models",
    description: "Multi-model AI studio supporting ChatGPT (OpenAI), Google Gemini, Claude, Groq & Mistral.",
    long_description: "Enterprise multi-model AI Studio with 7 specialized content creators (HR Announcements, Job Descriptions, Marketing Copy, Email Newsletters, Support Responses) in 10+ languages.",
    price_monthly: 1499,
    category: "AI & ML",
    developer: "Master AI Labs",
    version: "v2.0.0",
    features: ["OpenAI & Gemini API integration", "Multi-language generation (10+ languages)", "Tone & creativity tuning", "1-Click Markdown & PDF export"],
    status: "active",
    featured: true,
    install_url: "/ai-writer",
  },
  {
    id: "add-04",
    slug: "ai-ocr",
    name: "AI Invoice OCR Reader",
    tagline: "Smart machine vision document extractor for vendor bills",
    description: "Scan vendor invoices and auto-populate expenses using neural computer vision.",
    long_description: "Automatically parse vendor invoices, extract GST numbers, line items, taxes, and amounts into ledger entries using neural computer vision.",
    price_monthly: 1999,
    category: "AI & ML",
    developer: "Vision Labs",
    version: "v2.3.0",
    features: ["Multi-format receipt scan", "Automated ledger tagging", "GSTIN validation", "Expense auto-fill"],
    status: "active",
    featured: true,
    install_url: "/ai-ocr",
  },
  {
    id: "add-05",
    slug: "okr-performance",
    name: "OKR & 360° Performance Management",
    tagline: "Cascading company goals, key results, weekly check-ins & 360° appraisals",
    description: "Align enterprise goals with multi-rater performance feedback cycles and talent matrix reports.",
    long_description: "Comprehensive OKR and 360-degree appraisal engine with multi-rater reviews, weekly goal progress sliders, and competency scoring matrices.",
    price_monthly: 1999,
    category: "Talent & Strategy",
    developer: "Master People Ops",
    version: "v2.2.0",
    features: ["Cascading OKR alignment", "360° multi-rater reviews", "Weekly check-in sliders", "Competency grading matrix"],
    status: "active",
    featured: true,
    install_url: "/okr",
  },
  {
    id: "add-06",
    slug: "asset-management",
    name: "Hardware & IT Asset Lifecycle",
    tagline: "Track company laptops, monitors, assignments, warranties & maintenance",
    description: "End-to-end device registry, HR onboarding assignments & offboarding clearances.",
    long_description: "End-to-end device tracking registry with serial numbers, employee assignments, warranty tracking, and disposal workflows.",
    price_monthly: 1499,
    category: "Hardware",
    developer: "Master Asset Ops",
    version: "v2.1.0",
    features: ["Barcode asset tagging", "Employee assignment passports", "Depreciation calculator", "Repair & maintenance logs"],
    status: "active",
    featured: true,
    install_url: "/assets",
  },
  {
    id: "add-07",
    slug: "double-entry-accounting",
    name: "Double-Entry General Ledger",
    tagline: "Standard 5-tier Chart of Accounts, balanced journals & real-time balance sheets",
    description: "Manage 17 chart of accounts, balanced journal postings, general ledger, and balance sheet.",
    long_description: "Professional accounting engine with 5-tier Chart of Accounts, strict balanced journal entry verification, live Balance Sheets, and Profit & Loss statements.",
    price_monthly: 1499,
    category: "Finance",
    developer: "Master FinTech",
    version: "v3.0.0",
    features: ["17 default chart of accounts", "Balanced journal vouchers ($DR=CR$)", "Live Balance Sheet & P&L", "Aging & Tax reports"],
    status: "active",
    featured: true,
    install_url: "/accounting",
  },
  {
    id: "add-08",
    slug: "form-builder",
    name: "Dynamic Form Builder",
    tagline: "Drag-and-drop custom feedback, survey & onboarding forms",
    description: "Build custom multi-step forms with file uploads, logic jumps, and response export.",
    long_description: "Custom visual form builder for employee surveys, HR exit forms, onboarding checklists, and feedback with dynamic response tables.",
    price_monthly: 999,
    category: "Productivity",
    developer: "Master Automation Labs",
    version: "v1.8.0",
    features: ["Drag-and-drop field builder", "File uploads & signatures", "Custom response exports", "Public/private form links"],
    status: "active",
    featured: false,
    install_url: "/forms",
  },
  {
    id: "add-09",
    slug: "tally-importer",
    name: "Tally ERP 9 / Prime Bridge",
    tagline: "2-way automated voucher & ledger sync for accounts",
    description: "Direct XML & ODBC sync between Master ERP and Tally accounts without duplication.",
    long_description: "Seamless bi-directional synchronization bridge between Master ERP invoices/vouchers and Tally Prime/ERP 9 software instances.",
    price_monthly: 1299,
    category: "Finance",
    developer: "Tally Bridge Labs",
    version: "v2.0.0",
    features: ["2-way ledger mapping", "Auto voucher sync", "Error exception log", "XML bulk exporter"],
    status: "active",
    featured: false,
    install_url: "/tally-importer",
  },
  {
    id: "add-10",
    slug: "razorpay-gateway",
    name: "Razorpay Payment Gateway",
    tagline: "Accept UPI, Credit Cards, NetBanking with auto invoice matching",
    description: "Collect client invoice payments via UPI & Cards directly into your bank.",
    long_description: "Accept instant payments via UPI QR, Indian Debit/Credit Cards, and NetBanking with automated tax invoice receipt generation.",
    price_monthly: 799,
    category: "Payments",
    developer: "FinTech Team",
    version: "v2.1.0",
    features: ["UPI auto-collect", "QR generation", "Instant payment verification", "Auto receipt dispatch"],
    status: "active",
    featured: true,
    install_url: "/razorpay-gateway",
  },
  {
    id: "add-11",
    slug: "google-workspace",
    name: "Google Workspace & Drive",
    tagline: "Sync calendars, Gmail invitations, and Drive backups",
    description: "Direct Google OAuth 2.0 calendar and file backup integration.",
    long_description: "Sync interview schedules, training calendars, and document vault backups with Google Workspace and Google Drive.",
    price_monthly: 499,
    category: "Productivity",
    developer: "Master Cloud",
    version: "v1.2.0",
    features: ["Calendar sync", "Drive backups", "Gmail notification triggers"],
    status: "active",
    featured: false,
    install_url: "/google-workspace",
  },
  {
    id: "add-12",
    slug: "workflow-automation",
    name: "Workflow Automation Engine",
    tagline: "Custom IF-THEN triggers, auto-notifications & scheduled tasks",
    description: "Automate repetitive company tasks with custom trigger-action workflows.",
    long_description: "Build visual automation rules connecting employee status changes, leave approvals, and invoice payments to webhook actions and notifications.",
    price_monthly: 899,
    category: "Productivity",
    developer: "Master Automation Labs",
    version: "v1.4.0",
    features: ["Trigger-action workflow builder", "Email & SMS webhooks", "Scheduled periodic triggers"],
    status: "active",
    featured: false,
    install_url: "/workflows",
  },
  {
    id: "add-13",
    slug: "crm-pipeline",
    name: "Sales CRM Pipeline & Deals",
    tagline: "Lead tracking, visual deal stages Kanban & customer accounts",
    description: "Manage sales pipelines from initial lead to contract closed-won with stage tracking.",
    long_description: "Comprehensive CRM suite with 7 deal stages (New Lead, Contacted, Qualified, Proposal, Negotiation, Won, Lost), lead source tracking, deal value calculations, and 1-click proposal conversions.",
    price_monthly: 1299,
    category: "Sales & CRM",
    developer: "Master Sales Labs",
    version: "v2.2.0",
    features: ["Visual 7-stage Kanban deal board", "Lead scoring & sources", "Deal value tracking", "1-click proposal & invoice conversion"],
    status: "active",
    featured: true,
    install_url: "/crm",
  },
  {
    id: "add-14",
    slug: "hrm-suite",
    name: "Core HRM 16 Suite",
    tagline: "End-to-end workforce management, payroll runs, biometric sync & leave quotas",
    description: "All-in-one Human Resource Management covering employees, attendance, payroll & shifts.",
    long_description: "The complete enterprise HRM package: employee KYC passports, multi-shift rostering, biometric hardware sync, automated monthly payroll with PF/TDS deductions, and multi-tier leave approvals.",
    price_monthly: 1999,
    category: "Talent & Strategy",
    developer: "Master HRM Core",
    version: "v3.0.0",
    features: ["Employee directory & passports", "Automated payroll runs & payslips", "Leave quotas & approvals", "Shift rostering & rotations"],
    status: "active",
    featured: true,
    install_url: "/hrm",
  },
  {
    id: "add-15",
    slug: "pos-billing",
    name: "Point of Sale (POS) & Barcode Billing",
    tagline: "High-speed retail counter, barcode scanning, split payments & thermal receipt printing",
    description: "Full retail POS counter terminal with offline local cache and instant MySQL auto-sync.",
    long_description: "Enterprise Point of Sale terminal with barcode scanning, custom product discounts, multi-warehouse stock deduction, parked/held orders, and 80mm/58mm thermal receipt printing.",
    price_monthly: 1499,
    category: "Retail & POS",
    developer: "Master POS Labs",
    version: "v2.5.0",
    features: ["Barcode SKU scanner", "Hold / recall parked orders", "Offline sync queue", "Thermal 80mm/58mm GST receipts", "Realtime inventory auto-decrement"],
    status: "active",
    featured: true,
    install_url: "/pos",
  },
  {
    id: "add-16",
    slug: "product-service-catalog",
    name: "Products, Services & Multi-Warehouse Catalog",
    tagline: "End-to-end items catalog, multi-warehouse stock, taxes & multi-step creation wizard",
    description: "Enterprise product catalog management with custom categories, taxes, measurement units, and warehouse stock tracking.",
    long_description: "Manage your business inventory and services catalog in one place. Setup categories with custom color palettes, GST tax rates, units (Pcs, Kg, Box), multi-warehouse stock allocations, and product image gallery carousels.",
    price_monthly: 1499,
    category: "Retail & POS",
    developer: "Master Inventory Labs",
    version: "v2.0.0",
    features: [
      "4-Step item creation wizard (Products, Services, Parts)",
      "Auto-generate SKU barcodes & tags",
      "Color-coded category setup with reports mapping",
      "Multi-warehouse stock allocation & live tracking",
      "Product image gallery carousel with thumbnails",
    ],
    status: "active",
    featured: true,
    install_url: "/products",
  },
];

function MarketplacePage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || "default";

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTab, setFilterTab] = useState<"all" | "installed" | "free" | "pro">("all");
  const [selectedAddonForDetails, setSelectedAddonForDetails] = useState<any | null>(null);
  const [selectedAddonForPayment, setSelectedAddonForPayment] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const { data: superAdminAddons = DEFAULT_SUPER_ADDONS, isLoading: isAddonsLoading } = useQuery({
    queryKey: ["realtime-super-addons"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-addons-catalog");
        if (Array.isArray(page?.content) && page.content.length > 0) return page.content;
        return DEFAULT_SUPER_ADDONS;
      } catch {
        return DEFAULT_SUPER_ADDONS;
      }
    },
  });

  const purchasedSlugKey = `tenant-${tenantId}-purchased-addons-v2`;
  const { data: installedAddons = [] } = useQuery({
    queryKey: ["realtime-tenant-installed-addons", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      try {
        const page = await api.get(`/cms/pages/${purchasedSlugKey}`);
        if (page?.content && Array.isArray(page.content)) {
          return page.content as TenantPurchasedAddon[];
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!tenantId,
  });

  function isInstalled(addonId: string, slug?: string) {
    return installedAddons.some(
      (a) => (a.addonId === addonId || (slug && a.addonSlug === slug)) && a.status === "active",
    );
  }

  async function persistInstalledAddons(list: TenantPurchasedAddon[]) {
    if (!tenantId) return;
    await api.put(`/cms/pages/${purchasedSlugKey}`, {
      title: `Addons ${tenantId}`,
      content: list,
      published: true,
    });
    qc.invalidateQueries({ queryKey: ["realtime-tenant-installed-addons", tenantId] });
    qc.invalidateQueries({ queryKey: ["realtime-purchased-addons-v2", tenantId] });
  }

  async function activateAddonAfterPayment(paymentDetails: { method: string; paymentId?: string }) {
    if (!selectedAddonForPayment || !tenantId) return;

    const addon = selectedAddonForPayment;
    const slug = addon.slug || addon.id;
    const priceVal = Number(addon.price_monthly) || 0;

    const newInstalledItem: TenantPurchasedAddon = {
      addonId: addon.id,
      addonSlug: slug,
      name: addon.name,
      price: priceVal,
      purchasedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      paymentMethod: paymentDetails.method || "Razorpay",
      paymentId: paymentDetails.paymentId || `TXN-${Date.now()}`,
      invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      install_url: addon.install_url,
    };

    const updated = [newInstalledItem, ...installedAddons.filter((a) => a.addonId !== addon.id && a.addonSlug !== slug)];
    await persistInstalledAddons(updated);

    // Record invoice in tenant's billing ledger
    try {
      const invoicesSlug = `tenant-${tenantId}-invoices-ledger`;
      const invPage = await api.get(`/cms/pages/${invoicesSlug}`);
      const currentInvoices = Array.isArray(invPage?.content) ? invPage.content : [];
      const newInvoice = {
        id: `INV-${Date.now()}`,
        invoiceNumber: newInstalledItem.invoiceNo,
        itemName: `${addon.name} (Monthly Addon)`,
        itemType: "addon",
        amount: priceVal,
        paymentMethod: paymentDetails.method || "Razorpay",
        paymentId: paymentDetails.paymentId || `TXN-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        status: "paid",
        customerName: profile?.full_name || user?.email || "Tenant Admin",
        customerEmail: user?.email || "admin@workspace.com",
      };
      await api.put(`/cms/pages/${invoicesSlug}`, {
        title: `Invoices Ledger ${tenantId}`,
        content: [newInvoice, ...currentInvoices],
        published: true,
      });
      qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices", tenantId] });
    } catch {}

    toast.success(
      `🎉 Payment Verified via ${paymentDetails.method}! Addon "${addon.name}" is now active on your workspace!`,
    );
    setSelectedAddonForPayment(null);
    setSelectedAddonForDetails(null);
  }

  async function confirmFreePurchase(addon: any) {
    if (!addon || !tenantId) return;
    setIsPurchasing(true);
    try {
      const slug = addon.slug || addon.id;
      const newInstalledItem: TenantPurchasedAddon = {
        addonId: addon.id,
        addonSlug: slug,
        name: addon.name,
        price: 0,
        purchasedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        install_url: addon.install_url,
      };
      const updated = [newInstalledItem, ...installedAddons.filter((a) => a.addonId !== addon.id && a.addonSlug !== slug)];
      await persistInstalledAddons(updated);

      toast.success(`Free Addon "${addon.name}" installed successfully!`);
      setSelectedAddonForDetails(null);
    } catch (err: any) {
      toast.error(err.message || "Installation failed");
    } finally {
      setIsPurchasing(false);
    }
  }

  async function toggleUninstall(addonId: string, name: string) {
    try {
      const updated = installedAddons.filter((a) => a.addonId !== addonId && a.addonSlug !== addonId);
      await persistInstalledAddons(updated);
      toast.info(`Addon "${name}" uninstalled from workspace.`);
      setSelectedAddonForDetails(null);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  }

  function handleStartPurchase(addon: any) {
    setSelectedAddonForPayment(addon);
    const price = addon.price_monthly || 0;
    if (price > 0) {
      setIsPaymentModalOpen(true);
    } else {
      confirmFreePurchase(addon);
    }
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    superAdminAddons.forEach((a: any) => {
      if (a.category) set.add(a.category);
    });
    return ["all", ...Array.from(set).sort()];
  }, [superAdminAddons]);

  const filtered = superAdminAddons.filter((a: any) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.description || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      filterCategory === "all" ||
      (a.category || "").toLowerCase() === filterCategory.toLowerCase();

    const installed = isInstalled(a.id, a.slug);
    const isFree = (a.price_monthly || 0) === 0;

    let matchesTab = true;
    if (filterTab === "free") matchesTab = isFree;
    else if (filterTab === "pro") matchesTab = !isFree;
    else if (filterTab === "installed") matchesTab = installed;

    return matchesSearch && matchesCategory && matchesTab;
  });

  const activeCount = installedAddons.filter((a) => a.status === "active").length;

  return (
    <PlanGuard moduleName="Addons Marketplace" requiredPlan="free">
      <div className="space-y-6 max-w-7xl pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Store className="size-6 text-primary" /> Addons Marketplace
            </h1>
            <p className="text-xs text-muted-foreground">
              Discover, view full details, and activate modular extensions for your ERP workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={activeCount} limit={50} label="Active Addons Limit" />
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search addons, categories..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "installed", "free", "pro"] as const).map((tab) => (
              <Button
                key={tab}
                variant={filterTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab(tab)}
                className="text-xs font-bold capitalize"
              >
                {tab === "all" ? "All Addons" : tab}
              </Button>
            ))}
          </div>
        </div>

        {/* Real-time Category Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 shrink-0 flex items-center gap-1">
            <Tag className="size-3 text-primary" /> Categories:
          </span>
          {categories.map((cat: string) => (
            <Button
              key={cat}
              variant={filterCategory.toLowerCase() === cat.toLowerCase() ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory(cat)}
              className="h-7 text-xs px-2.5 rounded-lg shrink-0 font-semibold capitalize"
            >
              {cat === "all" ? "All Categories" : cat}
            </Button>
          ))}
        </div>

        {/* Addons Grid */}
        {isAddonsLoading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground italic space-y-2">
            <Store className="size-10 mx-auto opacity-30" />
            <p>No addons match your search criteria.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((a: any) => {
              const installed = isInstalled(a.id, a.slug);
              const priceVal = a.price_monthly !== null && a.price_monthly !== undefined ? Number(a.price_monthly) : 0;
              const isFree = priceVal === 0 || isNaN(priceVal);
              const imageUrl = String((a as any).image || CATEGORY_IMAGES[a.category] || CATEGORY_IMAGES.Productivity);

              return (
                <Card
                  key={a.id}
                  className={`flex flex-col justify-between overflow-hidden transition-all hover:shadow-xl group border shadow-xs ${
                    installed ? "border-emerald-500/50 bg-emerald-500/5" : ""
                  }`}
                >
                  <div className="h-40 relative bg-secondary/40 overflow-hidden cursor-pointer" onClick={() => setSelectedAddonForDetails(a)}>
                    <img
                      src={imageUrl}
                      alt={a.name}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

                    <div className="absolute top-3 left-3">
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/80 backdrop-blur-md">
                        {a.category || "General"}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3">
                      {isFree ? (
                        <Badge className="bg-emerald-500 text-white font-mono text-[9px] shadow-sm">
                          FREE ADDON
                        </Badge>
                      ) : (
                        <Badge className="bg-primary text-white font-mono text-[9px] shadow-sm">
                          {formatSystemAmount(priceVal, sysConfig)}/mo
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader className="pb-2 pt-3 cursor-pointer" onClick={() => setSelectedAddonForDetails(a)}>
                    <CardTitle className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
                      {a.name}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1 line-clamp-2">
                      {a.description || (a as any).tagline}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="pt-3 border-t flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAddonForDetails(a)}
                        className="h-8 text-xs font-semibold gap-1.5 flex-1"
                      >
                        <Eye className="size-3.5 text-primary" /> View Details
                      </Button>

                      {installed ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs font-bold gap-1 text-emerald-600 border border-emerald-500/20"
                          asChild
                        >
                          <Link to={a.install_url as any}>
                            <ExternalLink className="size-3.5" /> Launch
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 font-bold text-xs gap-1.5"
                          style={
                            !isFree
                              ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }
                              : {}
                          }
                          onClick={() => handleStartPurchase(a)}
                        >
                          <ShoppingBag className="size-3.5" /> {isFree ? "Install Free" : "Purchase"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* MODAL: VIEW FULL ADDON DETAILS */}
        <Dialog open={!!selectedAddonForDetails} onOpenChange={(open) => !open && setSelectedAddonForDetails(null)}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            {selectedAddonForDetails && (() => {
              const addon = selectedAddonForDetails;
              const installed = isInstalled(addon.id, addon.slug);
              const priceVal = Number(addon.price_monthly) || 0;
              const isFree = priceVal === 0;
              const imageUrl = String((addon as any).image || CATEGORY_IMAGES[addon.category] || CATEGORY_IMAGES.Productivity);

              return (
                <div className="space-y-4 text-xs">
                  {/* Banner Image */}
                  <div className="h-44 rounded-xl relative overflow-hidden bg-secondary/30">
                    <img src={imageUrl} alt={addon.name} className="size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className="bg-background/80 backdrop-blur-md text-foreground font-mono text-[10px]">
                        {addon.category || "Extension"}
                      </Badge>
                      <Badge variant="outline" className="bg-background/80 font-mono text-[10px]">
                        {addon.version || "v2.0.0"}
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <div>
                        <h2 className="text-xl font-black text-foreground">{addon.name}</h2>
                        <p className="text-muted-foreground text-xs mt-0.5">{addon.developer || "Master ERP Official Team"}</p>
                      </div>
                      <Badge className="bg-primary text-white font-mono font-bold text-xs">
                        {isFree ? "FREE ADDON" : `${formatSystemAmount(priceVal, sysConfig)}/mo`}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-foreground">About this Add-on</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {addon.long_description || addon.description || addon.tagline}
                    </p>
                  </div>

                  {/* Key Features List */}
                  {Array.isArray(addon.features) && addon.features.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="font-bold text-xs uppercase text-muted-foreground">Included Features & Capabilities</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {addon.features.map((feat: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border">
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            <span className="font-medium text-foreground text-[11px]">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status & Pricing Banner */}
                  <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between border">
                    <div>
                      <span className="text-muted-foreground text-[11px]">Monthly License Rate:</span>
                      <div className="font-mono font-bold text-base text-primary">
                        {isFree ? "₹0.00 (Free of cost)" : formatSystemAmount(priceVal, sysConfig)}
                      </div>
                    </div>
                    <div>
                      {installed ? (
                        <Badge className="bg-emerald-500 text-white font-bold">
                          ✓ INSTALLED & ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground font-mono">
                          Ready to Install
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => setSelectedAddonForDetails(null)}>
                      Close
                    </Button>
                    <div className="flex gap-2">
                      {installed ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleUninstall(addon.id, addon.name)}
                            className="text-destructive hover:bg-destructive/10 text-xs"
                          >
                            Uninstall
                          </Button>
                          <Button size="sm" className="font-bold gap-1.5 bg-primary" asChild>
                            <Link to={addon.install_url as any}>
                              <ExternalLink className="size-3.5" /> Launch Module
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStartPurchase(addon)}
                          className="font-bold gap-1.5"
                          style={
                            !isFree
                              ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }
                              : { background: "#059669", color: "#fff" }
                          }
                        >
                          <ShoppingBag className="size-3.5" /> {isFree ? "Confirm & Install Free" : "Purchase & Activate"}
                        </Button>
                      )}
                    </div>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* 3-Option Payment Checkout Modal (Razorpay, PayPal, Manual Bank Transfer + Screenshot Upload) */}
        {selectedAddonForPayment && (selectedAddonForPayment.price_monthly || 0) > 0 && (
          <PaymentCheckoutModal
            open={isPaymentModalOpen}
            onOpenChange={(open) => {
              setIsPaymentModalOpen(open);
              if (!open) setSelectedAddonForPayment(null);
            }}
            title="Purchase & Activate Addon"
            itemType="addon"
            itemId={selectedAddonForPayment.id}
            itemName={selectedAddonForPayment.name}
            amount={selectedAddonForPayment.price_monthly || 0}
            description={
              selectedAddonForPayment.description || `Monthly subscription for ${selectedAddonForPayment.name}`
            }
            onSuccess={activateAddonAfterPayment}
          />
        )}
      </div>
    </PlanGuard>
  );
}
export default MarketplacePage;
