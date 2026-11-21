import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSession, useCurrentProfile } from "@/lib/session";
import { openRazorpayCheckout } from "@/lib/razorpay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Star,
  Search,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
  Globe,
  Loader2,
  RefreshCw,
  Tag,
  Package,
  FolderPlus,
  AlertTriangle,
  BookOpen,
  Eye,
  ArrowRight,
  Shield,
  Bot,
  Users,
  Landmark,
  FileText,
  ShoppingCart,
  Cpu,
  Share2,
  Sliders,
  Navigation,
  Check,
  CheckCircle,
  CreditCard,
  Calendar,
  Receipt,
  Download,
  Building,
  Power,
  PowerOff,
} from "lucide-react";
import { formatSystemAmount, DEFAULT_CURRENCY_SETTINGS, SystemCurrencySettings } from "@/lib/currency";
export const Route = createFileRoute("/_authenticated/super/marketplace")({
  component: MarketplaceAdmin,
});



export type Addon = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  category: string;
  icon: string | null;
  image_url?: string | null;
  price_monthly: number;
  developer: string | null;
  status: string;
  featured: boolean;
  install_url: string | null;
  docs_url: string | null;
  version: string | null;
  features: string[];
  screenshots: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryDetail = {
  name: string;
  count: number;
  isDeletable: boolean;
};

const emptyAddon: Omit<Addon, "id"> = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  long_description: "",
  category: "HR",
  icon: "",
  price_monthly: 0,
  developer: "Master ERP Core Team",
  status: "active",
  featured: false,
  install_url: "",
  docs_url: "",
  version: "1.0.0",
  features: [],
  screenshots: [],
};

// ==========================================
// AUTHENTIC BRAND & DOMAIN ICON RENDERER
// ==========================================
function AddonIconRenderer({
  icon,
  name,
  category,
  className = "size-10",
}: {
  icon: string | null;
  name: string;
  category: string;
  className?: string;
}) {
  let resolvedIcon = icon;
  if (resolvedIcon && !resolvedIcon.startsWith("/") && !resolvedIcon.startsWith("http") && !resolvedIcon.startsWith("data:")) {
    if (resolvedIcon.endsWith(".png") || resolvedIcon.endsWith(".svg") || resolvedIcon.endsWith(".jpg") || resolvedIcon.endsWith(".webp")) {
      resolvedIcon = `/addons-icons/${resolvedIcon}`;
    }
  }

  // 1. If stored image in local storage or URL or static addons-icons, render real image tag
  if (
    resolvedIcon &&
    (resolvedIcon.startsWith("http://") ||
      resolvedIcon.startsWith("https://") ||
      resolvedIcon.startsWith("/uploads/") ||
      resolvedIcon.startsWith("/addons-icons/") ||
      resolvedIcon.startsWith("/") ||
      resolvedIcon.startsWith("data:"))
  ) {
    return (
      <img
        src={resolvedIcon}
        alt={name}
        className="size-11 object-contain rounded-xl"
        loading="lazy"
      />
    );
  }

  const n = (name || "").toLowerCase();
  const c = (category || "").toLowerCase();

  // 2. High-fidelity SVGs matching WorkDo Explore screenshot reference
  // Free Addons Icons (Dark green rounded box)
  if (n.includes("ai business advisor") || n.includes("advisor")) {
    return (
      <div className="size-11 rounded-xl bg-[#093e32] flex items-center justify-center text-emerald-400 shadow-xs">
        <svg className="size-6.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="14" x="3" y="6" rx="3" />
          <path d="M12 2v4" />
          <path d="M9 13h.01" />
          <path d="M15 13h.01" />
          <path d="M8 17s1.5 1.5 4 1.5 4-1.5 4-1.5" />
        </svg>
      </div>
    );
  }
  if (n.includes("smart dashboard")) {
    return (
      <div className="size-11 rounded-xl bg-[#0a3539] flex items-center justify-center text-teal-400 shadow-xs">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1.5" />
          <rect width="7" height="7" x="14" y="3" rx="1.5" />
          <rect width="7" height="7" x="14" y="14" rx="1.5" />
          <rect width="7" height="7" x="3" y="14" rx="1.5" />
        </svg>
      </div>
    );
  }
  if (n.includes("smart report") || n.includes("reports")) {
    return (
      <div className="size-11 rounded-xl bg-[#082a39] flex items-center justify-center text-cyan-400 shadow-xs">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 17v-4" />
          <path d="M12 17v-2" />
          <path d="M15 17v-6" />
        </svg>
      </div>
    );
  }
  if (n.includes("suggestion box")) {
    return (
      <div className="size-11 rounded-xl bg-[#07382c] flex items-center justify-center text-emerald-400 shadow-xs">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      </div>
    );
  }
  if (n.includes("notice board")) {
    return (
      <div className="size-11 rounded-xl bg-[#08352b] flex items-center justify-center text-emerald-400 shadow-xs">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="18" x="4" y="4" rx="2" />
          <path d="M8 2h8" />
          <path d="M8 10h8" />
          <path d="M8 14h5" />
        </svg>
      </div>
    );
  }

  // Social Media Icons
  if (n.includes("instagram")) {
    return (
      <div className="size-11 rounded-xl bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center text-white shadow-xs">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      </div>
    );
  }
  if (n.includes("facebook")) {
    return (
      <div className="size-11 rounded-xl bg-[#1877F2] flex items-center justify-center text-white font-bold text-2xl shadow-xs">
        <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5c0-.988.293-1.49 1.5-1.49H17V2.29C16.34 2.2 15.14 2 13.79 2 10.42 2 8 4.06 8 7.86V9.51H5v3.98h3v8.01z" />
        </svg>
      </div>
    );
  }
  if (n.includes("whatsapp")) {
    return (
      <div className="size-11 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-xs">
        <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24" />
        </svg>
      </div>
    );
  }
  if (n.includes("youtube")) {
    return (
      <div className="size-11 rounded-xl bg-[#FF0000] flex items-center justify-center text-white shadow-xs">
        <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );
  }
  if (n.includes("telegram")) {
    return (
      <div className="size-11 rounded-xl bg-[#24A1DE] flex items-center justify-center text-white shadow-xs">
        <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.457l2.199-2.138 4.574 3.379c.843.465 1.448.225 1.658-.782l3-14.137c.307-1.232-.47-1.79-1.278-1.424z" />
        </svg>
      </div>
    );
  }
  if (n.includes("twilio")) {
    return (
      <div className="size-11 rounded-xl bg-[#F22F46] flex items-center justify-center text-white shadow-xs">
        <div className="grid grid-cols-2 gap-1.5 p-1">
          <span className="size-2 rounded-full bg-white" />
          <span className="size-2 rounded-full bg-white" />
          <span className="size-2 rounded-full bg-white" />
          <span className="size-2 rounded-full bg-white" />
        </div>
      </div>
    );
  }
  if (n.includes("slack")) {
    return (
      <div className="size-11 rounded-xl bg-[#4A154B] flex items-center justify-center text-white shadow-xs">
        <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2zm2-7a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2zm0 1a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2H9zm7 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-2 7a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2zm0-1a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h5z" />
        </svg>
      </div>
    );
  }
  if (n.includes("discord")) {
    return (
      <div className="size-11 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-xs">
        <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      </div>
    );
  }

  // Domain Category Defaults
  if (c.includes("social")) {
    return (
      <div className="size-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-xs">
        <Share2 className="size-6" />
      </div>
    );
  }
  if (c.includes("integration")) {
    return (
      <div className="size-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-xs">
        <Cpu className="size-6" />
      </div>
    );
  }
  if (c.includes("commerce") || c.includes("sale")) {
    return (
      <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-xs">
        <ShoppingCart className="size-6" />
      </div>
    );
  }
  if (c.includes("content")) {
    return (
      <div className="size-11 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shadow-xs">
        <FileText className="size-6" />
      </div>
    );
  }
  if (c.includes("finance")) {
    return (
      <div className="size-11 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shadow-xs">
        <Landmark className="size-6" />
      </div>
    );
  }
  if (c.includes("hr")) {
    return (
      <div className="size-11 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shadow-xs">
        <Users className="size-6" />
      </div>
    );
  }
  if (c.includes("communication") || c.includes("custom")) {
    return (
      <div className="size-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shadow-xs">
        <Sliders className="size-6" />
      </div>
    );
  }
  if (c.includes("mobility") || c.includes("operation")) {
    return (
      <div className="size-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shadow-xs">
        <Navigation className="size-6" />
      </div>
    );
  }
  if (c.includes("ai")) {
    return (
      <div className="size-11 rounded-xl bg-fuchsia-500/10 text-fuchsia-600 flex items-center justify-center shadow-xs">
        <Bot className="size-6" />
      </div>
    );
  }
  if (c.includes("security")) {
    return (
      <div className="size-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-xs">
        <Shield className="size-6" />
      </div>
    );
  }

  return (
    <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
      <Package className="size-6" />
    </div>
  );
}

function MarketplaceAdmin() {
  const qc = useQueryClient();

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Free Addons");

  // Addon Editor State
  const [editing, setEditing] = useState<Partial<Addon> | null>(null);
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const screenshotFileInputRef = useRef<HTMLInputElement>(null);

  // Addon Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingAddon, setViewingAddon] = useState<Addon | null>(null);

  // Addon Deletion Confirmation State
  const [addonToDelete, setAddonToDelete] = useState<Addon | null>(null);
  const [deleteAddonModalOpen, setDeleteAddonModalOpen] = useState(false);

  // Category Management State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"create" | "edit">("create");
  const [targetCategoryOldName, setTargetCategoryOldName] = useState("");
  const [categoryInputName, setCategoryInputName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDetail | null>(null);
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);

  // User Profile & Tenant Role Context
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const userRoles = profile?.roles || [];
  const isSuperAdmin = userRoles.includes("super_admin");
  const isTenantPage = typeof window !== "undefined" && window.location.pathname.includes("/tenant");
  const isTenantView = isTenantPage || !isSuperAdmin;

  const BANK_DETAILS = {
    bankName: "HDFC Bank Ltd.",
    accountName: "Master ERP Solutions Pvt. Ltd.",
    accountNumber: "50200087654321",
    ifscCode: "HDFC0001234",
    branch: "Indiranagar, Bangalore",
  };

  // Fetch Tenant Entitlements for live installed status
  const { data: entitlementsData } = useQuery({
    queryKey: ["addons-entitlements"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/entitlements");
        return res?.entitlements || {};
      } catch {
        return {};
      }
    },
  });
  const entitlements: Record<string, any> = entitlementsData || {};

  // Addon Checkout & Purchase State
  const [purchasingAddon, setPurchasingAddon] = useState<Addon | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutDuration, setCheckoutDuration] = useState<"1_month" | "1_year">("1_month");
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<
    "razorpay" | "paypal" | "stripe" | "bank_transfer"
  >("razorpay");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [offlineRefNo, setOfflineRefNo] = useState("");
  const [offlineReceiptPreview, setOfflineReceiptPreview] = useState<string | null>(null);
  const offlineFileInputRef = useRef<HTMLInputElement>(null);

  // Free Install Mutation
  const installFreeMutation = useMutation({
    mutationFn: (addon: Addon) => api.post(`/addons/${addon.slug}/install`),
    onSuccess: (_, addon) => {
      toast.success(`Add-on "${addon.name}" installed successfully!`);
      qc.invalidateQueries({ queryKey: ["addons-entitlements"] });
      qc.invalidateQueries({ queryKey: ["realtime-purchased-addons-v2"] });
      qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices"] });
      qc.invalidateQueries({ queryKey: ["tenant-billing-invoices"] });
      if (detailsModalOpen && viewingAddon?.slug === addon.slug) {
        setDetailsModalOpen(false);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to install add-on.");
    },
  });

  // Disable Add-on Mutation
  const disableAddonMutation = useMutation({
    mutationFn: (addon: Addon) => api.post(`/addons/${addon.slug}/disable`),
    onSuccess: (_, addon) => {
      toast.success(`Add-on "${addon.name}" disabled.`);
      qc.invalidateQueries({ queryKey: ["addons-entitlements"] });
      qc.invalidateQueries({ queryKey: ["realtime-purchased-addons-v2"] });
      qc.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
      qc.invalidateQueries({ queryKey: ["tenant-billing-invoices"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to disable add-on.");
    },
  });

  // Enable Add-on Mutation
  const enableAddonMutation = useMutation({
    mutationFn: (addon: Addon) => api.post(`/addons/${addon.slug}/enable`),
    onSuccess: (_, addon) => {
      toast.success(`Add-on "${addon.name}" enabled.`);
      qc.invalidateQueries({ queryKey: ["addons-entitlements"] });
      qc.invalidateQueries({ queryKey: ["realtime-purchased-addons-v2"] });
      qc.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
      qc.invalidateQueries({ queryKey: ["tenant-billing-invoices"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to enable add-on.");
    },
  });

  function handleStartPaidCheckout(addon: Addon) {
    setPurchasingAddon(addon);
    setCheckoutDuration("1_month");
    setSelectedPaymentGateway("razorpay");
    setOfflineRefNo("");
    setOfflineReceiptPreview(null);
    setCheckoutModalOpen(true);
  }

  function handleOfflineFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setOfflineReceiptPreview(String(evt.target?.result || ""));
    reader.readAsDataURL(file);
  }

  async function handleExecuteCheckout() {
    if (!purchasingAddon) return;
    setIsCheckingOut(true);

    try {
      if (selectedPaymentGateway === "razorpay") {
        const orderData = await api.post(`/addons/${purchasingAddon.slug}/checkout`, {
          duration: checkoutDuration,
          paymentMethod: "razorpay",
        });

        if (!orderData || !orderData.invoiceId) {
          throw new Error("Failed to initialize checkout invoice.");
        }

        toast.info("Launching Razorpay Payment Gateway...");

        const rzpResponse = await openRazorpayCheckout({
          amount: orderData.amount,
          currency: orderData.currency,
          name: purchasingAddon.name,
          description: `Add-on License valid through ${new Date(orderData.periodEnd).toLocaleDateString()}`,
          userName: profile?.full_name || user?.email || "Workspace Administrator",
          userEmail: user?.email || "billing@workspace.com",
          tenantId: profile?.tenant_id || "default",
          keyId: orderData.keyId,
          orderId: orderData.orderId,
        });

        if (!rzpResponse || !rzpResponse.razorpay_payment_id) {
          throw new Error("Payment was cancelled or response is incomplete.");
        }

        toast.info("Verifying payment signature and activating add-on...");
        const verifyRes = await api.post(`/addons/${purchasingAddon.slug}/verify-payment`, {
          invoiceId: orderData.invoiceId,
          razorpay_order_id: rzpResponse.razorpay_order_id || orderData.orderId,
          razorpay_payment_id: rzpResponse.razorpay_payment_id,
          razorpay_signature: rzpResponse.razorpay_signature,
          gateway: "razorpay",
        });

        toast.success(verifyRes.message || `Add-on "${purchasingAddon.name}" activated successfully!`);
        setCheckoutModalOpen(false);
        setPurchasingAddon(null);
        qc.invalidateQueries({ queryKey: ["addons-entitlements"] });
        qc.invalidateQueries({ queryKey: ["realtime-purchased-addons-v2"] });
        qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices"] });
        qc.invalidateQueries({ queryKey: ["tenant-billing-invoices"] });
        if (detailsModalOpen) setDetailsModalOpen(false);
        return;
      }

      if (selectedPaymentGateway === "bank_transfer") {
        if (!offlineRefNo.trim()) {
          throw new Error("Please enter your Bank Transaction / UTR / Reference Number.");
        }
        if (!offlineReceiptPreview) {
          throw new Error("Please attach your payment receipt screenshot.");
        }

        const offlineRes = await api.post(`/addons/${purchasingAddon.slug}/submit-offline-payment`, {
          duration: checkoutDuration,
          referenceNo: offlineRefNo.trim(),
          receiptUrl: offlineReceiptPreview,
          notes: `Add-on purchase submitted by ${profile?.full_name || user?.email}`,
        });

        toast.success(offlineRes.message || "Payment proof submitted! Super Admin will review and activate your add-on.");
        setCheckoutModalOpen(false);
        setPurchasingAddon(null);
        qc.invalidateQueries({ queryKey: ["tenant-billing-invoices"] });
        qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices"] });
        if (detailsModalOpen) setDetailsModalOpen(false);
        return;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err?.message || "Payment process could not be completed.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  // 1. Fetch System Settings for authoritative currency
  const { data: systemPlatformSettings } = useQuery({
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

  const activeCurrencyConfig = useMemo<Partial<SystemCurrencySettings>>(() => {
    return {
      defaultCurrency: systemPlatformSettings?.defaultCurrency || "INR",
      currencySymbol: systemPlatformSettings?.currencySymbol || "₹",
      showDecimals: false,
    };
  }, [systemPlatformSettings]);

  // 2. Fetch All Addons from authoritative endpoint
  const {
    data: addons = [],
    isLoading: isLoadingAddons,
    refetch: refetchAddons,
    isError: isErrorAddons,
    error: addonsError,
  } = useQuery({
    queryKey: ["admin-addons"],
    queryFn: async () => {
      const res = await api.get<Addon[]>("/super/addons");
      return Array.isArray(res) ? res : [];
    },
  });

  // 3. Fetch Category Details (with addon counts & deletable flags)
  const {
    data: categoryDetails = [],
    isLoading: isLoadingCategories,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["admin-addon-categories-details"],
    queryFn: async () => {
      const res = await api.get<CategoryDetail[]>("/super/addons/categories?details=true");
      return Array.isArray(res) ? res : [];
    },
  });

  // Ordered Category list ensuring Free Addons is first, matching WorkDo reference
  const preferredCategoryOrder = [
    "free add-ons",
    "free addons",
    "free",
    "social media",
    "integration",
    "integrations",
    "e-commerces and saas",
    "e-commerce & sales",
    "e-commerce",
    "content management",
    "finance",
    "hr",
    "industrial solutions",
    "communication",
    "mobility",
    "ai",
    "security",
    "mobile app",
    "payment gateways",
    "accounting",
    "operations",
  ];

  const orderedCategoryDetails = useMemo(() => {
    const sorted = [...categoryDetails].sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aIdx = preferredCategoryOrder.findIndex((p) => aLower.includes(p) || p.includes(aLower));
      const bIdx = preferredCategoryOrder.findIndex((p) => bLower.includes(p) || p.includes(bLower));
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [categoryDetails]);

  // Sort items within each category matching canonical reference order
  function sortAddonsByReference(items: Addon[]): Addon[] {
    const preferredOrder = [
      "ai business advisor",
      "smart dashboard",
      "smart reports",
      "suggestion box",
      "notice board",
      "instagram chat",
      "facebook chat",
      "instagram post",
      "facebook post",
      "whatsapp chat",
      "youtube content",
      "telegram",
      "twilio",
      "slack",
      "discord",
    ];

    return [...items].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aIdx = preferredOrder.findIndex((p) => aName.includes(p));
      const bIdx = preferredOrder.findIndex((p) => bName.includes(p));
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Computed summary metrics
  const metrics = useMemo(() => {
    const total = addons.length;
    const categoriesCount = categoryDetails.length;
    const published = addons.filter((a) => a.status === "available" || a.status === "active").length;
    const freeCount = addons.filter((a) => Number(a.price_monthly ?? 0) === 0).length;
    return { total, categoriesCount, published, freeCount };
  }, [addons, categoryDetails]);

  // Group addons by Category for multi-section presentation
  const groupedAddonsByCategory = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const map = new Map<string, Addon[]>();

    orderedCategoryDetails.forEach((cat) => {
      map.set(cat.name, []);
    });

    addons.forEach((a) => {
      const matchesSearch =
        !query ||
        a.name.toLowerCase().includes(query) ||
        a.slug.toLowerCase().includes(query) ||
        (a.tagline ?? "").toLowerCase().includes(query) ||
        (a.category ?? "").toLowerCase().includes(query) ||
        (Array.isArray(a.features) && a.features.some((f) => f.toLowerCase().includes(query)));

      if (!matchesSearch) return;

      const catName = a.category;
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(a);
    });

    return map;
  }, [addons, orderedCategoryDetails, searchQuery]);

  // Filtered addons for single selected category view
  const activeCategoryAddons = useMemo(() => {
    if (selectedCategory === "All") {
      return addons;
    }
    return groupedAddonsByCategory.get(selectedCategory) || [];
  }, [selectedCategory, groupedAddonsByCategory, addons]);

  // ==========================================
  // SYNC CANONICAL 133 ADDONS MUTATION
  // ==========================================
  const syncCanonicalMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ message: string; createdCount: number; updatedCount: number; total: number }>(
        "/super/addons/sync-canonical",
        {}
      );
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Successfully synchronized 133 canonical add-ons catalog!");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to synchronize canonical add-ons");
    },
  });

  // ==========================================
  // TOGGLE STATUS (ENABLE / DISABLE) MUTATION
  // ==========================================
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      return await api.put(`/super/addons/${id}`, { status: newStatus });
    },
    onSuccess: (_, variables) => {
      const isNowActive = variables.newStatus === "active" || variables.newStatus === "available";
      toast.success(isNowActive ? "Addon enabled successfully" : "Addon disabled");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update addon status");
    },
  });

  // ==========================================
  // UPSERT ADDON MUTATION
  // ==========================================
  const upsertAddon = useMutation({
    mutationFn: async (a: Partial<Addon> & { id?: string }) => {
      const payload = {
        name: a.name,
        slug: a.slug,
        tagline: a.tagline || null,
        description: a.description || null,
        longDescription: a.long_description || (a as any).longDescription || null,
        category: a.category,
        priceMonthly: a.price_monthly ?? (a as any).priceMonthly ?? 0,
        icon: a.icon || null,
        screenshots: a.screenshots || [],
        features: a.features || [],
        developer: a.developer || null,
        version: a.version || "1.0.0",
        docsUrl: a.docs_url || (a as any).docsUrl || null,
        installUrl: a.install_url || (a as any).installUrl || null,
        featured: Boolean(a.featured),
        status: a.status || "active",
      };

      if (a.id && !a.id.startsWith("addon-")) {
        return await api.put(`/super/addons/${a.id}`, payload);
      } else {
        return await api.post("/super/addons", payload);
      }
    },
    onSuccess: () => {
      toast.success("Addon saved successfully");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      setAddonModalOpen(false);
      setDetailsModalOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to save addon");
    },
  });

  // ==========================================
  // DELETE ADDON MUTATION
  // ==========================================
  const deleteAddon = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/super/addons/${id}`);
    },
    onSuccess: (res: any) => {
      if (res?.archived) {
        toast.info(res.message || "Addon referenced by entitlements. Archived instead of hard-deleted.");
      } else {
        toast.success(res?.message || "Addon deleted successfully");
      }
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      setDeleteAddonModalOpen(false);
      setAddonToDelete(null);
      setDetailsModalOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to delete addon");
    },
  });

  // ==========================================
  // CATEGORY MUTATIONS
  // ==========================================
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return await api.post("/super/addons/categories", { name });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category created successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      setCategoryModalOpen(false);
      setCategoryInputName("");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to create category");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      return await api.put(`/super/addons/categories/${encodeURIComponent(oldName)}`, { newName });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category updated successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      setCategoryModalOpen(false);
      setCategoryInputName("");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to update category");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return await api.delete(`/super/addons/categories/${encodeURIComponent(name)}`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category deleted successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      setDeleteCategoryModalOpen(false);
      setCategoryToDelete(null);
      if (selectedCategory === categoryToDelete?.name) {
        setSelectedCategory("Free Addons");
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to delete category");
    },
  });

  // Modal Openers
  function openNewAddon() {
    setEditing({ ...emptyAddon });
    setFeaturesText("");
    setScreenshots([]);
    setAddonModalOpen(true);
  }

  function openEditAddon(a: Addon) {
    setEditing(a);
    setFeaturesText((a.features ?? []).join("\n"));
    setScreenshots(a.screenshots ?? []);
    setAddonModalOpen(true);
  }

  function openViewDetails(a: Addon) {
    setViewingAddon(a);
    setDetailsModalOpen(true);
  }

  function confirmDeleteAddon(a: Addon) {
    setAddonToDelete(a);
    setDeleteAddonModalOpen(true);
  }

  function openNewCategory() {
    setCategoryModalMode("create");
    setTargetCategoryOldName("");
    setCategoryInputName("");
    setCategoryModalOpen(true);
  }

  function openEditCategory(cat: CategoryDetail) {
    setCategoryModalMode("edit");
    setTargetCategoryOldName(cat.name);
    setCategoryInputName(cat.name);
    setCategoryModalOpen(true);
  }

  function confirmDeleteCategory(cat: CategoryDetail) {
    setCategoryToDelete(cat);
    setDeleteCategoryModalOpen(true);
  }

  function handleSaveCategory() {
    if (!categoryInputName.trim()) {
      return toast.error("Category name is required");
    }
    if (categoryModalMode === "create") {
      createCategoryMutation.mutate(categoryInputName.trim());
    } else {
      updateCategoryMutation.mutate({
        oldName: targetCategoryOldName,
        newName: categoryInputName.trim(),
      });
    }
  }

  function saveAddon() {
    if (!editing) return;
    if (!editing.name || !editing.slug) {
      return toast.error("Name and URL slug are required fields");
    }
    const features = featuresText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    upsertAddon.mutate({ ...editing, features, screenshots } as never);
  }

  // Handle PNG Icon upload to local storage via /v1/media/upload
  async function handleIconFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please upload an image file (PNG, JPG, SVG, WebP)");
    }

    try {
      setIsUploadingIcon(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "addons/icons");
      const res = await api.upload<{ url: string }>("/v1/media/upload", fd);
      if (res?.url) {
        setEditing((prev) => (prev ? { ...prev, icon: res.url } : null));
        toast.success("Image uploaded to local storage! Click 'Save Addon' to persist.");
      } else {
        toast.error("Upload failed: No URL returned from media server");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image to storage");
    } finally {
      setIsUploadingIcon(false);
      if (iconFileInputRef.current) iconFileInputRef.current.value = "";
    }
  }

  // Handle PNG Screenshots multi-upload
  async function handleScreenshotFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    try {
      setIsUploadingScreenshots(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "addons/screenshots");
        const res = await api.upload<{ url: string }>("/v1/media/upload", fd);
        if (res?.url) {
          uploadedUrls.push(res.url);
        }
      }
      if (uploadedUrls.length > 0) {
        setScreenshots((prev) => [...prev, ...uploadedUrls]);
        toast.success(`Uploaded ${uploadedUrls.length} screenshot image(s) to storage!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload screenshots");
    } finally {
      setIsUploadingScreenshots(false);
      if (screenshotFileInputRef.current) screenshotFileInputRef.current.value = "";
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-20">
      {/* 1. TOP BREADCRUMB NAV */}
      <BreadcrumbNav className="mb-2" />

      {/* 2. TOP BANNER (EXACT WORKDO HERO STYLE) */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-50/50 via-background to-emerald-50/20 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Green Icon Box */}
            <div className="size-13 rounded-2xl bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="size-6" />
            </div>

            <div className="space-y-1">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                PREMIUM MARKETPLACE
              </div>

              {/* Title */}
              <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                {metrics.total}+ Premium Add-ons Available
              </h1>

              {/* Subtitle */}
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Supercharge your workspace with powerful integrations, automation tools, and industry-specific solutions.
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              onClick={() => {
                const el = document.getElementById("marketplace-explorer-content");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-[#00a86b] hover:bg-[#008f5b] text-white gap-2 text-xs h-10 font-bold rounded-xl px-5 shadow-xs"
            >
              Browse All Add-ons <ArrowRight className="size-4" />
            </Button>

            {isTenantView && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs h-10 font-semibold border-slate-200 hover:bg-slate-100 rounded-xl px-3.5"
                >
                  <Link to="/subscription">
                    <Package className="size-3.5 text-indigo-600" /> My Subscriptions
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs h-10 font-semibold border-slate-200 hover:bg-slate-100 rounded-xl px-3.5"
                >
                  <Link to="/tenant/billing">
                    <Receipt className="size-3.5 text-emerald-600" /> Billing & Invoices
                  </Link>
                </Button>
              </>
            )}

            {!isTenantView && isSuperAdmin && (
              <>
                {/* Sync Canonical 133 Catalog Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncCanonicalMutation.mutate()}
                  disabled={syncCanonicalMutation.isPending}
                  className="gap-1.5 text-xs h-10 font-semibold border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl px-3"
                  title="Ensure all 133 canonical addons from documentation matrix are synchronized"
                >
                  {syncCanonicalMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <RefreshCw className="size-3.5 text-emerald-600" />
                  )}
                  Sync 133 Addons
                </Button>

                {/* New Addon Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openNewAddon}
                  className="border-slate-200 hover:bg-slate-50 gap-1.5 text-xs h-10 font-semibold rounded-xl px-3"
                >
                  <Plus className="size-3.5 text-[#00a86b]" /> New Addon
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN EXPLORER LAYOUT: 2 COLUMNS (SIDEBAR + CONTENT) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* LEFT SIDEBAR: CATEGORY NAVIGATION (WORKDO EXACT STYLE) */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-3">
          {/* Search Box in Sidebar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search add-ons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 text-xs rounded-xl bg-card border-border/80"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category List */}
          <Card className="border border-border/80 shadow-xs overflow-hidden rounded-2xl bg-card">
            <div className="p-2 space-y-1">


              {/* Dynamic Categories List */}
              {isLoadingCategories ? (
                <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-3.5 animate-spin text-[#00a86b]" /> Loading categories...
                </div>
              ) : (
                orderedCategoryDetails.map((cat) => {
                  const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();

                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        const targetId = "section-" + cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                        const el = document.getElementById(targetId);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group ${
                        isSelected
                          ? "bg-[#00a86b] text-white shadow-xs font-bold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate pr-2">{cat.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-mono shrink-0 ${
                          isSelected
                            ? "bg-white/20 text-white font-bold"
                            : "bg-secondary text-muted-foreground group-hover:bg-secondary/90"
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Manage Categories Action at Bottom of Sidebar */}
            <div className="p-2 border-t bg-secondary/10 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground px-2 font-medium">Categories</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={openNewCategory}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              >
                <FolderPlus className="size-3 text-[#00a86b]" /> Manage
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT MAIN SHOWCASE: ADDON CARDS GRID */}
        <div id="marketplace-explorer-content" className="flex-1 w-full min-w-0 space-y-8">
          {isLoadingAddons ? (
            <div className="py-32 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-[#00a86b]" />
              <p className="text-xs text-muted-foreground font-mono mt-3">Loading marketplace extensions...</p>
            </div>
          ) : isErrorAddons ? (
            <Card className="p-12 text-center text-muted-foreground space-y-3 rounded-2xl">
              <AlertTriangle className="size-10 mx-auto text-destructive" />
              <p className="text-sm font-semibold text-foreground">Failed to load marketplace catalog</p>
              <p className="text-xs max-w-md mx-auto">
                {(addonsError as any)?.message || "A network or authentication error occurred."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchAddons()} className="mt-2">
                Retry Loading
              </Button>
            </Card>
          ) : (
            <div className="space-y-8">
              {orderedCategoryDetails.map((cat) => {
                const rawItems = groupedAddonsByCategory.get(cat.name) || [];
                const items = sortAddonsByReference(rawItems);
                if (items.length === 0) return null;
                const sectionId = "section-" + cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

                return (
                  <div key={cat.name} id={sectionId} className="space-y-4 scroll-mt-6">
                    {/* Section Header: Green dot + Category Name + Count */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="size-2.5 rounded-full bg-[#00a86b]" />
                        <h2 className="text-base font-bold text-foreground tracking-tight">{cat.name}</h2>
                        <span className="text-xs text-muted-foreground font-normal">
                          {items.length} {items.length === 1 ? "add-on" : "add-ons"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {items.filter((a) => a.status !== "disabled").length} Active
                      </div>
                    </div>

                    {/* Responsive Grid of Cards (5 Columns on Desktop) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {items.map((addon) => (
                        <AddonCard
                          key={addon.id}
                          addon={addon}
                          entitlement={entitlements[addon.slug]}
                          onViewDetails={() => openViewDetails(addon)}
                          onEdit={() => openEditAddon(addon)}
                          onToggleStatus={(newStatus) =>
                            toggleStatusMutation.mutate({ id: addon.id, newStatus })
                          }
                          onDelete={() => confirmDeleteAddon(addon)}
                          onInstallFree={() => installFreeMutation.mutate(addon)}
                          onPurchasePaid={() => handleStartPaidCheckout(addon)}
                          onDisable={() => disableAddonMutation.mutate(addon)}
                          onEnable={() => enableAddonMutation.mutate(addon)}
                          isInstalling={
                            installFreeMutation.isPending &&
                            installFreeMutation.variables?.id === addon.id
                          }
                          isDisabling={
                            disableAddonMutation.isPending &&
                            disableAddonMutation.variables?.id === addon.id
                          }
                          isEnabling={
                            enableAddonMutation.isPending &&
                            enableAddonMutation.variables?.id === addon.id
                          }
                          isToggling={
                            toggleStatusMutation.isPending &&
                            toggleStatusMutation.variables?.id === addon.id
                          }
                          isSuperAdmin={isSuperAdmin}
                          isTenantView={isTenantView}
                          activeCurrencyConfig={activeCurrencyConfig}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. ADDON VIEW DETAILS MODAL */}
      {/* ========================================== */}
      {viewingAddon && (
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <div className="flex items-start gap-4 pt-2">
                <div className="size-16 rounded-2xl border bg-secondary/30 grid place-items-center p-2 shadow-xs shrink-0">
                  <AddonIconRenderer
                    icon={viewingAddon.icon}
                    name={viewingAddon.name}
                    category={viewingAddon.category}
                    className="size-10"
                  />
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {viewingAddon.name}
                    </DialogTitle>
                    <Badge
                      variant={
                        viewingAddon.status === "active" || viewingAddon.status === "available"
                          ? "default"
                          : "outline"
                      }
                      className={
                        viewingAddon.status === "active" || viewingAddon.status === "available"
                          ? "bg-emerald-600 text-white capitalize text-[10px]"
                          : "text-muted-foreground capitalize text-[10px]"
                      }
                    >
                      {viewingAddon.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-mono">/{viewingAddon.slug}</span>
                    <span className="text-muted-foreground">•</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {viewingAddon.category}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-semibold text-emerald-600 font-mono">
                      {Number(viewingAddon.price_monthly) === 0
                        ? "Free"
                        : `${formatSystemAmount(Number(viewingAddon.price_monthly), activeCurrencyConfig)} / mo`}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-4 border-t text-xs">
              {/* Pitch & Descriptions */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Overview & Capabilities</Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {viewingAddon.tagline || viewingAddon.description || "Enterprise modular extension capability."}
                </p>
                {viewingAddon.long_description && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {viewingAddon.long_description}
                  </p>
                )}
              </div>

              {/* Features List */}
              {Array.isArray(viewingAddon.features) && viewingAddon.features.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Key Features & Inclusions</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {viewingAddon.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl border bg-secondary/15">
                        <CheckCircle className="size-3.5 text-[#00a86b] shrink-0" />
                        <span className="text-xs text-foreground truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Screenshots Gallery if available */}
              {Array.isArray(viewingAddon.screenshots) && viewingAddon.screenshots.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Module Screenshots</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {viewingAddon.screenshots.map((s, idx) => (
                      <div key={idx} className="rounded-xl border bg-background overflow-hidden aspect-video shadow-2xs">
                        <img src={s} alt="Screenshot" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Installation & Licensing Status Box */}
              {(() => {
                const ent = viewingAddon ? entitlements[viewingAddon.slug] : null;
                const isInstalled = Boolean(ent?.isInstalled || ent?.isActive);
                const price = Number(viewingAddon.price_monthly ?? 0);

                if (isInstalled) {
                  const isAddonDisabled = ent?.status === "disabled";
                  return (
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className={`size-5 shrink-0 ${isAddonDisabled ? "text-amber-600" : "text-emerald-600"}`} />
                        <div>
                          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            {isAddonDisabled ? "Installed (Disabled)" : "Installed & Active on Workspace"}
                          </p>
                          <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400">
                            License renewal / expiry:{" "}
                            <strong className="font-mono">
                              {ent?.renewsAt
                                ? new Date(ent.renewsAt).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Active Subscription"}
                            </strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAddonDisabled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={enableAddonMutation.isPending}
                            onClick={() => enableAddonMutation.mutate(viewingAddon)}
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-xl h-8"
                          >
                            {enableAddonMutation.isPending ? (
                              <Loader2 className="size-3.5 animate-spin mr-1 text-emerald-600" />
                            ) : (
                              <Power className="size-3.5 mr-1 text-emerald-600" />
                            )}
                            Enable Add-on
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disableAddonMutation.isPending}
                            onClick={() => disableAddonMutation.mutate(viewingAddon)}
                            className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl h-8"
                          >
                            {disableAddonMutation.isPending ? (
                              <Loader2 className="size-3.5 animate-spin mr-1 text-red-500" />
                            ) : (
                              <PowerOff className="size-3.5 mr-1 text-red-500" />
                            )}
                            Disable Add-on
                          </Button>
                        )}
                        {viewingAddon.install_url && (
                          <Button size="sm" asChild className="bg-[#00a86b] hover:bg-[#008f5b] text-white text-xs gap-1.5 font-bold rounded-xl shadow-xs">
                            <a href={viewingAddon.install_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-3.5" /> Open Module
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-3.5 rounded-xl border bg-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground block font-medium">Pricing & Access:</span>
                      <span className="text-sm font-bold text-foreground">
                        {price === 0
                          ? "Free Included Extension"
                          : `${formatSystemAmount(price, activeCurrencyConfig)} / month`}
                      </span>
                      {price > 0 && (
                        <span className="text-[11px] text-emerald-600 block font-medium">
                          Annual plan: {formatSystemAmount(Math.round(price * 12 * 0.85), activeCurrencyConfig)} / year (Save 15%)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {price === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => installFreeMutation.mutate(viewingAddon)}
                          disabled={installFreeMutation.isPending}
                          className="bg-[#00a86b] hover:bg-[#008f5b] text-white text-xs gap-1.5 rounded-xl font-bold px-4 shadow-xs"
                        >
                          {installFreeMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                          Install Free Add-on
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStartPaidCheckout(viewingAddon)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs gap-1.5 rounded-xl font-bold px-4 shadow-xs"
                        >
                          <ShoppingCart className="size-3.5" /> Purchase & Install Add-on
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Metadata Bar */}
              <div className="p-3.5 rounded-xl border bg-secondary/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground">Developer: </span>
                  <span className="text-xs font-semibold text-foreground">
                    {viewingAddon.developer || "Master ERP Core Team"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">SemVer Version: </span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    v{viewingAddon.version || "1.0.0"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Action Route: </span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {viewingAddon.install_url || `/addons/${viewingAddon.slug}`}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 text-xs rounded-xl"
              >
                <Link to="/addons/$slug" params={{ slug: viewingAddon.slug }} target="_blank">
                  <Globe className="size-3.5 text-[#00a86b]" /> Public Store
                  <ExternalLink className="size-3 text-muted-foreground ml-0.5" />
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDetailsModalOpen(false);
                      openEditAddon(viewingAddon);
                    }}
                    className="bg-[#00a86b] hover:bg-[#008f5b] text-white text-xs gap-1.5 rounded-xl font-semibold"
                  >
                    <Pencil className="size-3.5" /> Edit Addon
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setDetailsModalOpen(false)} className="rounded-xl text-xs">
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================== */}
      {/* 5. ADDON CREATE / EDIT MODAL DIALOG */}
      {/* ========================================== */}
      {editing && (
        <Dialog open={addonModalOpen} onOpenChange={setAddonModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Pencil className="size-4" />
                </div>
                {"id" in editing && editing.id ? `Edit Addon — ${editing.name}` : "Create New Addon"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload image icons to storage, configure pricing, enable/disable status, and write feature copy.
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4 py-2">
              <Field label="Addon Name *">
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "");
                    setEditing({ ...editing, name, slug: editing.slug || autoSlug });
                  }}
                  placeholder="e.g. WhatsApp Instant Alerts"
                  className="rounded-xl text-xs h-9"
                />
              </Field>

              <Field label="URL Slug *">
                <Input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="e.g. whatsapp-alerts"
                  className="font-mono text-xs rounded-xl h-9"
                />
              </Field>

              <Field label="Category *">
                <Select
                  value={editing.category || "HR"}
                  onValueChange={(val) => setEditing({ ...editing, category: val })}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryDetails.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name} className="text-xs">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={`Monthly Price (${activeCurrencyConfig.currencySymbol || "₹"})`}>
                <Input
                  type="number"
                  step="1"
                  value={editing.price_monthly ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, price_monthly: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="rounded-xl text-xs h-9"
                />
              </Field>

              {/* Status & Enable Switch */}
              <div className="md:col-span-2 p-3.5 rounded-xl border bg-secondary/15 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground">Addon Entitlement Status</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {editing.status === "disabled"
                      ? "Currently Disabled (Tenants cannot subscribe or access this module)"
                      : "Currently Active & Discoverable in Marketplace"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold font-mono text-foreground">
                    {editing.status === "disabled" ? "Disabled" : "Active"}
                  </span>
                  <Switch
                    checked={editing.status !== "disabled"}
                    onCheckedChange={(checked) =>
                      setEditing({ ...editing, status: checked ? "active" : "disabled" })
                    }
                  />
                </div>
              </div>

              {/* REAL IMAGE UPLOAD INTO STORAGE */}
              <div className="md:col-span-2 p-4 rounded-xl border border-dashed bg-secondary/10 space-y-3">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-[#00a86b]" /> Icon Image (Upload to Local Storage)
                  </span>
                  {editing.icon && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Image Configured
                    </span>
                  )}
                </Label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="size-16 shrink-0 rounded-2xl border bg-card grid place-items-center overflow-hidden p-1 shadow-xs">
                    <AddonIconRenderer
                      icon={editing.icon ?? null}
                      name={editing.name || "Addon"}
                      category={editing.category || "HR"}
                      className="size-8"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editing.icon ?? ""}
                        onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                        placeholder="Saved storage URL (/uploads/addons/icons/...) or image link"
                        className="text-xs font-mono h-9 rounded-xl"
                      />
                      <input
                        type="file"
                        ref={iconFileInputRef}
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        onChange={handleIconFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isUploadingIcon}
                        onClick={() => iconFileInputRef.current?.click()}
                        className="gap-1.5 shrink-0 h-9 text-xs font-semibold rounded-xl"
                      >
                        {isUploadingIcon ? (
                          <Loader2 className="size-3.5 animate-spin text-[#00a86b]" />
                        ) : (
                          <Upload className="size-3.5 text-[#00a86b]" />
                        )}
                        {isUploadingIcon ? "Uploading..." : "Upload PNG/JPG"}
                      </Button>
                      {editing.icon && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing({ ...editing, icon: null })}
                          className="h-9 px-2 text-destructive hover:bg-destructive/10 rounded-xl"
                          title="Remove icon"
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Uploaded images are stored directly in your server's local media storage directory and served with permanent URLs.
                    </p>
                  </div>
                </div>
              </div>

              <Field label="Developer / Team">
                <Input
                  value={editing.developer ?? ""}
                  onChange={(e) => setEditing({ ...editing, developer: e.target.value })}
                  placeholder="Master ERP Core Team"
                  className="rounded-xl text-xs h-9"
                />
              </Field>

              <Field label="Version Number">
                <Input
                  value={editing.version ?? ""}
                  onChange={(e) => setEditing({ ...editing, version: e.target.value })}
                  placeholder="1.0.0"
                  className="rounded-xl text-xs h-9 font-mono"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Tagline (Brief Pitch)">
                  <Input
                    value={editing.tagline ?? ""}
                    onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                    placeholder="Short 1-sentence value proposition"
                    className="rounded-xl text-xs h-9"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Short Description">
                  <Textarea
                    rows={2}
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="text-xs rounded-xl"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Features Included (One feature per line)">
                  <Textarea
                    rows={3}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder={"Real-time sync\nAutomated notifications\nCustom templates"}
                    className="text-xs font-mono rounded-xl"
                  />
                </Field>
              </div>

              {/* PNG SCREENSHOTS GALLERY UPLOAD */}
              <div className="md:col-span-2 p-4 rounded-xl border bg-secondary/10 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-[#00a86b]" /> Screenshots Gallery ({screenshots.length})
                  </Label>
                  <input
                    type="file"
                    ref={screenshotFileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingScreenshots}
                    onClick={() => screenshotFileInputRef.current?.click()}
                    className="gap-1.5 text-xs h-8 rounded-xl"
                  >
                    {isUploadingScreenshots ? (
                      <Loader2 className="size-3.5 animate-spin text-[#00a86b]" />
                    ) : (
                      <Upload className="size-3.5 text-[#00a86b]" />
                    )}
                    {isUploadingScreenshots ? "Uploading..." : "Upload Screenshots"}
                  </Button>
                </div>

                {screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {screenshots.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl border bg-background overflow-hidden aspect-video shadow-2xs"
                      >
                        <img src={src} alt="Screenshot" className="w-full h-full object-cover" loading="lazy" />
                        <button
                          type="button"
                          onClick={() => setScreenshots((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-xl">
                    No screenshots added yet. Click "Upload Screenshots" to persist previews.
                  </p>
                )}
              </div>

              <div className="md:col-span-2 border-t pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.featured)}
                    onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                    className="size-4 rounded accent-[#00a86b]"
                  />
                  <span>Spotlight Feature on Public Marketplace & CMS Pages</span>
                </label>
              </div>
            </div>

            <DialogFooter className="mt-4 border-t pt-4">
              <Button variant="outline" onClick={() => setAddonModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={saveAddon}
                disabled={upsertAddon.isPending}
                className="bg-[#00a86b] hover:bg-[#008f5b] text-white gap-2 font-semibold rounded-xl"
              >
                {upsertAddon.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Save Addon
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================== */}
      {/* 6. CATEGORY MANAGEMENT DIALOG */}
      {/* ========================================== */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-[#00a86b]" />
              {categoryModalMode === "create"
                ? "Create New Category"
                : `Edit Category — ${targetCategoryOldName}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {categoryModalMode === "create"
                ? "Add a new domain taxonomy category to organize add-on modules."
                : `Renaming will safely update all associated add-ons assigned to '${targetCategoryOldName}'.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Field label="Category Name *">
              <Input
                value={categoryInputName}
                onChange={(e) => setCategoryInputName(e.target.value)}
                placeholder="e.g. Communication, Hardware, AI & ML"
                autoFocus
                className="rounded-xl text-xs"
              />
            </Field>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setCategoryModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              className="bg-[#00a86b] hover:bg-[#008f5b] text-white gap-2 font-semibold rounded-xl"
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {categoryModalMode === "create" ? "Create Category" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 7. DELETE CATEGORY CONFIRMATION DIALOG */}
      {/* ========================================== */}
      {categoryToDelete && (
        <Dialog open={deleteCategoryModalOpen} onOpenChange={setDeleteCategoryModalOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5" />
                Delete Category — {categoryToDelete.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {categoryToDelete.count > 0 ? (
                  <span className="text-destructive font-semibold">
                    Warning: Cannot delete category '{categoryToDelete.name}' because {categoryToDelete.count} add-on(s) are currently assigned to it.
                    Please reassign or delete those extensions first.
                  </span>
                ) : (
                  <span>
                    Are you sure you want to delete category '{categoryToDelete.name}'? This category has no assigned extensions and can be safely removed.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteCategoryModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={categoryToDelete.count > 0 || deleteCategoryMutation.isPending}
                onClick={() => deleteCategoryMutation.mutate(categoryToDelete.name)}
                className="gap-2 rounded-xl"
              >
                {deleteCategoryMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================== */}
      {/* 8. DELETE ADDON CONFIRMATION DIALOG */}
      {/* ========================================== */}
      {addonToDelete && (
        <Dialog open={deleteAddonModalOpen} onOpenChange={setDeleteAddonModalOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5" />
                Delete Addon — {addonToDelete.name}
              </DialogTitle>
              <DialogDescription className="text-xs space-y-2">
                <p>
                  Are you sure you want to remove <strong className="text-foreground">{addonToDelete.name}</strong> (<code className="font-mono text-foreground">/{addonToDelete.slug}</code>)?
                </p>
                <p className="text-muted-foreground">
                  If this add-on has active tenant entitlements or historical records, it will be safely <strong>soft-archived</strong>.
                </p>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteAddonModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteAddon.isPending}
                onClick={() => deleteAddon.mutate(addonToDelete.id)}
                className="gap-2 font-semibold rounded-xl"
              >
                {deleteAddon.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* ========================================== */}
      {/* 9. ADDON CHECKOUT & PURCHASE MODAL (CART / PAYMENT GATEWAY) */}
      {/* ========================================== */}
      {purchasingAddon && (
        <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <div className="flex items-start gap-3.5 pt-1">
                <div className="size-14 rounded-2xl border bg-secondary/30 grid place-items-center p-2 shrink-0">
                  <AddonIconRenderer
                    icon={purchasingAddon.icon}
                    name={purchasingAddon.name}
                    category={purchasingAddon.category}
                    className="size-9"
                  />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    Subscribe & Install — {purchasingAddon.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Select your billing duration and payment method to activate this add-on for your workspace.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Plan Duration Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Billing Duration</Label>
                <RadioGroup
                  value={checkoutDuration}
                  onValueChange={(val: any) => setCheckoutDuration(val)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div
                    onClick={() => setCheckoutDuration("1_month")}
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                      checkoutDuration === "1_month"
                        ? "border-[#00a86b] bg-[#00a86b]/5 ring-1 ring-[#00a86b]"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Monthly Plan</span>
                      <RadioGroupItem value="1_month" id="dur-month" />
                    </div>
                    <div className="mt-2 text-sm font-extrabold text-[#00a86b]">
                      {formatSystemAmount(Number(purchasingAddon.price_monthly), activeCurrencyConfig)}
                      <span className="text-[11px] font-normal text-muted-foreground"> / month</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setCheckoutDuration("1_year")}
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between relative ${
                      checkoutDuration === "1_year"
                        ? "border-[#00a86b] bg-[#00a86b]/5 ring-1 ring-[#00a86b]"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      Save 15%
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Annual Plan</span>
                      <RadioGroupItem value="1_year" id="dur-year" />
                    </div>
                    <div className="mt-2 text-sm font-extrabold text-[#00a86b]">
                      {formatSystemAmount(Math.round(Number(purchasingAddon.price_monthly) * 12 * 0.85), activeCurrencyConfig)}
                      <span className="text-[11px] font-normal text-muted-foreground"> / year</span>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Gateway Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Payment Gateway</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSelectedPaymentGateway("razorpay")}
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex items-center gap-3 ${
                      selectedPaymentGateway === "razorpay"
                        ? "border-[#00a86b] bg-[#00a86b]/5 ring-1 ring-[#00a86b]"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <CreditCard className="size-5 text-[#00a86b] shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-bold">Razorpay</div>
                      <div className="text-[10px] text-muted-foreground">UPI, Cards, Netbanking</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedPaymentGateway("bank_transfer")}
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex items-center gap-3 ${
                      selectedPaymentGateway === "bank_transfer"
                        ? "border-[#00a86b] bg-[#00a86b]/5 ring-1 ring-[#00a86b]"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <Building className="size-5 text-indigo-600 shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-bold">Bank Transfer</div>
                      <div className="text-[10px] text-muted-foreground">Offline NEFT / IMPS</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Details & Receipt Upload if Bank Transfer */}
              {selectedPaymentGateway === "bank_transfer" && (
                <div className="p-3.5 rounded-xl border border-dashed bg-secondary/10 space-y-3">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building className="size-3.5 text-[#00a86b]" />
                    Company Bank Account Details
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-background/80 p-2.5 rounded-lg border">
                    <div><span className="text-muted-foreground">Bank: </span><span className="font-semibold">{BANK_DETAILS.bankName}</span></div>
                    <div><span className="text-muted-foreground">A/C Name: </span><span className="font-semibold">{BANK_DETAILS.accountName}</span></div>
                    <div><span className="text-muted-foreground">A/C No: </span><span className="font-mono font-semibold">{BANK_DETAILS.accountNumber}</span></div>
                    <div><span className="text-muted-foreground">IFSC: </span><span className="font-mono font-semibold">{BANK_DETAILS.ifscCode}</span></div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Transaction / UTR Reference No.</Label>
                    <Input
                      placeholder="e.g. UTR123456789012"
                      value={offlineRefNo}
                      onChange={(e) => setOfflineRefNo(e.target.value)}
                      className="text-xs font-mono h-9 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Upload Payment Receipt</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={offlineFileInputRef}
                        accept="image/png, image/jpeg, application/pdf"
                        onChange={handleOfflineFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => offlineFileInputRef.current?.click()}
                        className="gap-1.5 h-8 text-xs rounded-xl"
                      >
                        <Upload className="size-3.5" />
                        {offlineReceiptPreview ? "Change Receipt" : "Choose File"}
                      </Button>
                      {offlineReceiptPreview && (
                        <span className="text-[11px] text-emerald-600 font-medium">Receipt Attached ✓</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="rounded-xl border bg-secondary/20 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Monthly Rate:</span>
                  <span>{formatSystemAmount(Number(purchasingAddon.price_monthly), activeCurrencyConfig)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold">{checkoutDuration === "1_year" ? "1 Year (Annual)" : "1 Month"}</span>
                </div>
                {checkoutDuration === "1_year" && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Annual Discount (15%):</span>
                    <span>- {formatSystemAmount(Math.round(Number(purchasingAddon.price_monthly) * 12 * 0.15), activeCurrencyConfig)}</span>
                  </div>
                )}
                <div className="pt-2 border-t flex justify-between font-bold text-sm text-foreground">
                  <span>Total Payable:</span>
                  <span className="text-[#00a86b]">
                    {formatSystemAmount(
                      checkoutDuration === "1_year"
                        ? Math.round(Number(purchasingAddon.price_monthly) * 12 * 0.85)
                        : Number(purchasingAddon.price_monthly),
                      activeCurrencyConfig
                    )}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCheckoutModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isCheckingOut}
                onClick={handleExecuteCheckout}
                className="bg-[#00a86b] hover:bg-[#008f5b] text-white text-xs gap-1.5 font-bold rounded-xl shadow-xs"
              >
                {isCheckingOut ? (
                  <Loader2 className="size-3.5 animate-spin mr-1" />
                ) : (
                  <ShoppingCart className="size-3.5 mr-1" />
                )}
                {selectedPaymentGateway === "razorpay" ? "Proceed to Payment" : "Submit Payment Proof"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ==========================================
// INDIVIDUAL ADDON CARD COMPONENT (EXACT WORKDO STYLE)
// ==========================================
function AddonCard({
  addon,
  entitlement,
  onViewDetails,
  onEdit,
  onToggleStatus,
  onDelete,
  onInstallFree,
  onPurchasePaid,
  onDisable,
  onEnable,
  isInstalling,
  isDisabling,
  isEnabling,
  isToggling,
  isSuperAdmin,
  isTenantView,
  activeCurrencyConfig,
}: {
  addon: Addon;
  entitlement?: {
    isPurchased?: boolean;
    isInstalled?: boolean;
    isActive?: boolean;
    isEnabled?: boolean;
    renewsAt?: string | null;
    status?: string;
    invoiceNo?: string | null;
  } | null;
  onViewDetails: () => void;
  onEdit: () => void;
  onToggleStatus: (newStatus: string) => void;
  onDelete: () => void;
  onInstallFree: () => void;
  onPurchasePaid: () => void;
  onDisable?: () => void;
  onEnable?: () => void;
  isInstalling?: boolean;
  isDisabling?: boolean;
  isEnabling?: boolean;
  isToggling?: boolean;
  isSuperAdmin?: boolean;
  isTenantView?: boolean;
  activeCurrencyConfig: Partial<SystemCurrencySettings>;
}) {
  const isEnabled = addon.status !== "disabled";
  const isInstalled = Boolean(
    entitlement?.isInstalled ||
    entitlement?.isActive ||
    entitlement?.isPurchased
  );
  const isAddonDisabled = entitlement?.status === "disabled";
  const isFree = Number(addon.price_monthly) <= 0;
  const priceDisplay = isFree
    ? "Free"
    : `${formatSystemAmount(Number(addon.price_monthly), activeCurrencyConfig)} / mo`;

  return (
    <Card
      className={`border border-border/80 rounded-2xl bg-card p-4 text-center flex flex-col items-center justify-between transition-all duration-200 group relative hover:shadow-md hover:border-[#00a86b] hover:ring-1 hover:ring-[#00a86b]/30 ${
        !isEnabled ? "opacity-75 bg-muted/20 border-dashed" : ""
      }`}
    >
      {/* Top Controls: For Super Admin on Super Admin Page -> Switch & Edit; For Tenant View -> NEVER show switch or pencil! */}
      <div className="w-full flex items-center justify-between mb-2">
        {!isTenantView && isSuperAdmin ? (
          <>
            {/* Enable / Disable Switch for Super Admin Catalog */}
            <div
              className="flex items-center gap-1.5"
              title={isEnabled ? "Click to disable addon" : "Click to enable addon"}
            >
              <Switch
                checked={isEnabled}
                disabled={isToggling}
                onCheckedChange={(checked) =>
                  onToggleStatus(checked ? "active" : "disabled")
                }
                className="scale-75 origin-left data-[state=checked]:bg-[#00a86b]"
              />
              <span className="text-[10px] font-mono text-muted-foreground select-none">
                {isEnabled ? "Active" : "Disabled"}
              </span>
            </div>

            {/* Quick Edit Button */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onEdit}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                title="Edit Addon & Storage Images"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Price tag */}
            <Badge
              variant="secondary"
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isFree
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                  : "bg-muted text-foreground"
              }`}
            >
              {priceDisplay}
            </Badge>

            {/* Installed status indicator */}
            {isInstalled ? (
              <span
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isAddonDisabled
                    ? "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200"
                    : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200"
                }`}
              >
                <CheckCircle2 className={`size-3 ${isAddonDisabled ? "text-amber-600" : "text-emerald-600"}`} />
                {isAddonDisabled ? "Disabled" : "Installed"}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Available</span>
            )}
          </>
        )}
      </div>

      {/* Centered Icon */}
      <div
        onClick={onViewDetails}
        className="cursor-pointer group-hover:scale-105 transition-transform my-1"
      >
        <AddonIconRenderer
          icon={addon.icon}
          name={addon.name}
          category={addon.category}
          className="size-11"
        />
      </div>

      {/* Centered Addon Name */}
      <div className="mt-2 w-full">
        <h3
          onClick={onViewDetails}
          className="text-xs font-bold text-foreground line-clamp-2 min-h-[34px] flex items-center justify-center leading-snug cursor-pointer group-hover:text-[#00a86b] transition-colors"
          title={addon.name}
        >
          {addon.name}
        </h3>
      </div>

      {/* Action Area: Install Button for Tenant or View Details */}
      <div className="mt-2.5 pt-2 border-t border-border/50 w-full flex flex-col gap-2 items-center justify-center">
        {isTenantView && (
          <div className="w-full flex flex-col gap-1.5">
            {isInstalled ? (
              <>
                {/* 1st Button: Installed (Disabled so user cannot click install again) */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full h-8 text-xs font-semibold rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 opacity-75 cursor-not-allowed"
                >
                  <CheckCircle2 className="size-3.5 text-emerald-600 mr-1.5" />
                  Installed
                </Button>

                {/* Newly needed 2nd button: Disable Add-on or Enable Add-on Option */}
                {isAddonDisabled ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isEnabling}
                    onClick={onEnable}
                    className="w-full h-7 text-[11px] font-semibold rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    {isEnabling ? (
                      <Loader2 className="size-3 animate-spin mr-1 text-emerald-600" />
                    ) : (
                      <Power className="size-3 mr-1 text-emerald-600" />
                    )}
                    Enable Add-on
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isDisabling}
                    onClick={onDisable}
                    className="w-full h-7 text-[11px] font-semibold rounded-lg border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    {isDisabling ? (
                      <Loader2 className="size-3 animate-spin mr-1 text-red-500" />
                    ) : (
                      <PowerOff className="size-3 mr-1 text-red-500" />
                    )}
                    Disable Add-on
                  </Button>
                )}
              </>
            ) : isFree ? (
              <Button
                size="sm"
                disabled={isInstalling || !isEnabled}
                onClick={onInstallFree}
                className="w-full h-8 text-xs font-semibold rounded-xl bg-[#00a86b] hover:bg-[#008f5b] text-white shadow-xs"
              >
                {isInstalling ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <Package className="size-3.5 mr-1.5" />
                )}
                Install (Free)
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!isEnabled}
                onClick={onPurchasePaid}
                className="w-full h-8 text-xs font-semibold rounded-xl bg-[#00a86b] hover:bg-[#008f5b] text-white shadow-xs"
              >
                <ShoppingCart className="size-3.5 mr-1.5" />
                Buy · {priceDisplay}
              </Button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onViewDetails}
          className="text-[11px] font-semibold text-[#00a86b] hover:text-[#008f5b] flex items-center gap-1 transition-colors"
        >
          <span>View Details</span>
          <ExternalLink className="size-2.5" />
        </button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}

export { MarketplaceAdmin };
export default MarketplaceAdmin;