import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Settings,
  Save,
  Sliders,
  Mail,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
  Key,
  Radio,
  Palette,
  Type,
  Upload,
  Globe,
  Lock,
  Send,
  CheckCircle2,
  Eye,
  EyeOff,
  Inbox,
  UserCheck,
  AlertCircle,
  XCircle,
  Terminal,
  Wrench,
  Calendar,
  Coins,
  ShieldCheck,
  Building,
  Building2,
  MapPin,
  FileText,
  Languages,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Folder,
  Sparkles,
} from "lucide-react";
import { MaintenanceMarqueeBanner } from "@/components/maintenance-marquee-banner";
import { formatSystemAmount } from "@/lib/currency";
import { getPlatformBaseDomain } from "@/lib/platform-domain";
import { MediaImageUploader } from "@/components/settings/media-image-uploader";
import { LivePreviewDock } from "@/components/settings/live-preview-dock";
import { MediaLibraryManager } from "@/components/settings/media-library-manager";
import { UnsavedChangesBar } from "@/components/settings/unsaved-changes-bar";
import {
  SettingsNestedNav,
  SettingsSectionBreadcrumb,
  type SettingsNavCategory,
} from "@/components/settings/settings-nested-nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/super/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
  component: SuperSettingsAdmin,
});

export type SmtpDeliveryLog = {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  status: "delivered" | "failed";
  error_details?: string;
};

export type SuperSettings = {
  // General & Branding
  appName: string;
  supportEmail: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  logoLightId?: string | null;
  logoDarkId?: string | null;
  faviconId?: string | null;
  footerText?: string;
  primaryThemeColor: string;
  fontFamily: string;

  // Currency & Financial Formatting
  defaultCurrency: string;
  currencySymbol: string;
  decimalPlaces: number;
  symbolPosition: "before" | "after";
  decimalSeparator: "." | ",";
  thousandsSeparator: "," | "." | " ";
  showDecimals: boolean;
  addSpaceBetweenSymbol: boolean;

  // Localization & Regional
  defaultLanguage: string;
  dateFormat: string;
  timeFormat: string;
  calendarStartDay: string;

  // reCAPTCHA & Security
  recaptchaEnabled: boolean;
  recaptchaVersion: "v2" | "v3";
  recaptchaSiteKey: string;
  recaptchaSecretKey: string;

  // Maintenance Controls
  maintenanceMode: boolean;
  maintenanceScheduled: boolean;
  maintenanceNoticeMessage: string;
  maintenanceStartTime: string;
  maintenanceEndTime: string;

  // SMTP Mail Server
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpEncryption: "tls" | "ssl" | "none";
  smtpFromName: string;
  smtpFromEmail: string;

  // Social Auth & OAuth 2.0 (Google, Apple, LinkedIn, Facebook)
  oauthBaseUrl: string;
  frontendBaseUrl: string;

  googleEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  googleScope: string;

  appleEnabled: boolean;
  appleClientId: string;
  appleTeamId: string;
  appleKeyId: string;
  applePrivateKey: string;
  appleCallbackUrl: string;

  linkedinEnabled: boolean;
  linkedinClientId: string;
  linkedinClientSecret: string;
  linkedinCallbackUrl: string;
  linkedinScope: string;

  facebookEnabled: boolean;
  facebookAppId: string;
  facebookAppSecret: string;
  facebookCallbackUrl: string;
  facebookScope: string;

  // Pusher WebSockets
  pusherAppId: string;
  pusherKey: string;
  pusherSecret: string;
  pusherCluster: string;
  pusherEnabled: boolean;

  // Payment Gateways (PayPal, Razorpay, Bank)
  paypalClientId: string;
  paypalSecret: string;
  paypalMode: "sandbox" | "live";
  paypalEnabled: boolean;

  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayEnabled: boolean;

  bankTransferDetails: string;
  bankTransferEnabled: boolean;

  // SMTP Error & Delivery Logs
  smtpLogs?: SmtpDeliveryLog[];
  otpEmailSubject?: string;
  otpEmailTemplate?: string;

  // Platform Legal Entity & Invoicing Address (From Address)
  platformLegalName?: string;
  platformAddress?: string;
  platformCity?: string;
  platformState?: string;
  platformPostalCode?: string;
  platformCountry?: string;
  platformGstin?: string;
  platformPhone?: string;
};

const DEFAULT_SETTINGS: SuperSettings = {
  appName: "Master HRMS & ERP",
  supportEmail: `hello@${getPlatformBaseDomain()}`,
  logoLightUrl: "/logo.webp",
  logoDarkUrl: "/white-logo.webp",
  faviconUrl: "/favicon.webp",
  logoLightId: null,
  logoDarkId: null,
  faviconId: null,
  footerText: "© 2026 Master HRMS. All rights reserved.",
  primaryThemeColor: "#FF6B00",
  fontFamily: "Inter",

  // Currency Defaults
  defaultCurrency: "INR",
  currencySymbol: "₹",
  decimalPlaces: 2,
  symbolPosition: "before",
  decimalSeparator: ".",
  thousandsSeparator: ",",
  showDecimals: true,
  addSpaceBetweenSymbol: true,

  // Localization Defaults
  defaultLanguage: "en",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24h",
  calendarStartDay: "monday",

  // reCAPTCHA Defaults
  recaptchaEnabled: true,
  recaptchaVersion: "v3",
  recaptchaSiteKey: "6Ld_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  recaptchaSecretKey: "6Ld_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",

  maintenanceMode: false,
  maintenanceScheduled: false,
  maintenanceNoticeMessage:
    "SYSTEM NOTICE: Scheduled platform maintenance in progress. Please save your work.",
  maintenanceStartTime: "2026-07-28 02:00 AM UTC",
  maintenanceEndTime: "2026-07-28 04:00 AM UTC",

  smtpHost: (import.meta.env.VITE_SMTP_HOST as string) || "smtp.mailgun.org",
  smtpPort: (import.meta.env.VITE_SMTP_PORT as string) || "587",
  smtpUser: (import.meta.env.VITE_SMTP_USER as string) || `postmaster@${getPlatformBaseDomain()}`,
  smtpPass: (import.meta.env.VITE_SMTP_PASS as string) || "••••••••••••",
  smtpEncryption: ((import.meta.env.VITE_SMTP_ENCRYPTION as string) || "tls") as any,
  smtpFromName: (import.meta.env.VITE_SMTP_FROM_NAME as string) || "Master HRMS System",
  smtpFromEmail: (import.meta.env.VITE_SMTP_FROM_EMAIL as string) || `no-reply@${getPlatformBaseDomain()}`,
  otpEmailSubject: "{{appName}} — Your Login Verification Code",
  otpEmailTemplate: "",

  // OAuth Defaults
  oauthBaseUrl: "http://localhost:4000",
  frontendBaseUrl: "http://localhost:8080",

  googleEnabled: true,
  googleClientId: "",
  googleClientSecret: "",
  googleCallbackUrl: "http://localhost:4000/api/auth/oauth/google/callback",
  googleScope: "openid email profile",

  appleEnabled: true,
  appleClientId: "",
  appleTeamId: "",
  appleKeyId: "",
  applePrivateKey: "",
  appleCallbackUrl: "http://localhost:4000/api/auth/oauth/apple/callback",

  linkedinEnabled: true,
  linkedinClientId: "",
  linkedinClientSecret: "",
  linkedinCallbackUrl: "http://localhost:4000/api/auth/oauth/linkedin/callback",
  linkedinScope: "openid profile email",

  facebookEnabled: true,
  facebookAppId: "",
  facebookAppSecret: "",
  facebookCallbackUrl: "http://localhost:4000/api/auth/oauth/facebook/callback",
  facebookScope: "email,public_profile",

  pusherAppId: (import.meta.env.VITE_PUSHER_APP_ID as string) || "1789012",
  pusherKey: (import.meta.env.VITE_PUSHER_KEY as string) || "psh_key_998877",
  pusherSecret: (import.meta.env.VITE_PUSHER_SECRET as string) || "psh_sec_443322",
  pusherCluster: (import.meta.env.VITE_PUSHER_CLUSTER as string) || "ap2",
  pusherEnabled: (import.meta.env.VITE_PUSHER_ENABLED as string) !== "false",

  paypalClientId: "AQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  paypalSecret: "ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  paypalMode: "sandbox",
  paypalEnabled: true,

  razorpayKeyId: "rzp_test_99XXXXXXXX",
  razorpayKeySecret: "rzp_sec_XXXXXXXX",
  razorpayEnabled: true,

  bankTransferDetails:
    "Bank: HDFC Bank\nAccount Name: Master HRMS Inc\nAccount No: 50200012345678\nIFSC: HDFC0001234\nSwift Code: HDFCINBB",
  bankTransferEnabled: true,

  smtpLogs: [
    {
      id: "log-1",
      timestamp: "2026-07-27 19:30:00",
      recipient: "test.admin@company.com",
      subject: "Welcome Test Email",
      status: "delivered",
      error_details: "250 2.0.0 OK Message accepted for delivery",
    },
  ],

  // Platform Origin / Dispatch Address Defaults
  platformLegalName: "Master ERP Technologies Private Limited",
  platformAddress: "DLF Cyber City, Tower B, 8th Floor, DLF Phase 2",
  platformCity: "Gurugram",
  platformState: "Haryana (06)",
  platformPostalCode: "122002",
  platformCountry: "India",
  platformGstin: "06AAACM1234F1Z8",
  platformPhone: "+91 98765 43210",
};

const COLOR_PRESETS = [
  { name: "Sapphire Blue", color: "#2563eb" },
  { name: "Emerald Green", color: "#059669" },
  { name: "Violet Purple", color: "#7c3aed" },
  { name: "Rose Crimson", color: "#dc2626" },
  { name: "Sunset Amber", color: "#d97706" },
  { name: "Ocean Cyan", color: "#0891b2" },
];

function SuperSettingsAdmin() {
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const searchParams = useSearch({ from: "/_authenticated/super/settings" });
  const [form, setForm] = useState<SuperSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTabState] = useState<string>(searchParams.tab || "branding");

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    navigate({ search: { tab } as any, replace: true });
  };

  // Keep activeTab in sync with URL search param, and populate default tab in URL if missing
  useEffect(() => {
    if (searchParams.tab && searchParams.tab !== activeTab) {
      setActiveTabState(searchParams.tab);
    } else if (!searchParams.tab) {
      navigate({ search: { tab: activeTab } as any, replace: true });
    }
  }, [searchParams.tab, activeTab, navigate]);

  // Nested Menus Hierarchy Definition
  const SUPER_SETTINGS_NAV: SettingsNavCategory[] = useMemo(
    () => [
      {
        id: "identity",
        label: "Brand & Identity",
        icon: Sparkles,
        description: "Logos, themes, legal entity and media storage",
        items: [
          {
            id: "branding",
            label: "Branding & Themes",
            description: "Logos, favicon, primary theme color and brand identity",
            icon: ImageIcon,
          },
          {
            id: "addresses",
            label: "Dispatch & Invoicing",
            description: "Platform legal name, GSTIN, origin dispatch address",
            icon: Building2,
          },
          {
            id: "media",
            label: "Media Library",
            description: "Asset storage, vector icons, media repository",
            icon: Folder,
          },
        ],
      },
      {
        id: "finance",
        label: "Currency & Payments",
        icon: Coins,
        description: "Master currency, formatting and payment gateways",
        items: [
          {
            id: "currency",
            label: "Currency & Locale",
            description: "Currency symbols, separators and number formatting",
            icon: Coins,
            badge: form.defaultCurrency,
            badgeColor: "bg-muted text-muted-foreground border-border",
          },
          {
            id: "payments",
            label: "Payment Gateways",
            description: "Stripe, PayPal, Razorpay & Bank transfer credentials",
            icon: CreditCard,
          },
        ],
      },
      {
        id: "integrations",
        label: "Comms & Integrations",
        icon: Radio,
        description: "Email delivery, OAuth logins, and live websockets",
        items: [
          {
            id: "smtp",
            label: "SMTP Email Engine",
            description: "Mail server, credentials & live test email dispatch",
            icon: Mail,
          },
          {
            id: "oauth",
            label: "OAuth 2.0 Logins",
            description: "Google, Apple, LinkedIn & Facebook social sign-in",
            icon: Lock,
          },
          {
            id: "pusher",
            label: "WebSockets & Events",
            description: "Pusher & Soketi real-time event broadcasting",
            icon: Radio,
          },
        ],
      },
      {
        id: "operations",
        label: "Platform Operations",
        icon: AlertTriangle,
        description: "Maintenance schedule and emergency broadcast",
        items: [
          {
            id: "system",
            label: "Maintenance & System",
            description: "Emergency maintenance mode, lockouts & announcements",
            icon: AlertTriangle,
            badge: form.maintenanceMode ? "ACTIVE" : "Normal",
            badgeColor: form.maintenanceMode
              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          },
        ],
      },
    ],
    [form.defaultCurrency, form.maintenanceMode],
  );

  const activeNavInfo = useMemo(() => {
    for (const cat of SUPER_SETTINGS_NAV) {
      const found = cat.items.find((i) => i.id === activeTab);
      if (found) return { category: cat, item: found };
    }
    return null;
  }, [SUPER_SETTINGS_NAV, activeTab]);

  const logoLightRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  // Password View/Hide Toggles
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showRecaptchaSecret, setShowRecaptchaSecret] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showLinkedinSecret, setShowLinkedinSecret] = useState(false);
  const [showFacebookSecret, setShowFacebookSecret] = useState(false);
  const [showAppleKey, setShowAppleKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyToClipboard(text: string, keyName: string) {
    if (!text) return toast.error("No callback URL generated to copy");
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success(`${keyName} Callback URL copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  function handleAutoDetectDomain() {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const isDevFrontend = origin.includes(":8080");
      const backendDomain = isDevFrontend ? origin.replace(":8080", ":4000") : origin;
      setForm((prev) => ({
        ...prev,
        oauthBaseUrl: backendDomain,
        frontendBaseUrl: origin,
      }));
      toast.success(`Domain auto-detected: ${backendDomain}`);
    }
  }

  function copyAllCallbacks() {
    const base = (form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "");
    const bundle = [
      `=== Master HRMS OAuth Callback URLs for ${base} ===`,
      `Google:    ${base}/api/auth/oauth/google/callback`,
      `Apple:     ${base}/api/auth/oauth/apple/callback`,
      `LinkedIn:  ${base}/api/auth/oauth/linkedin/callback`,
      `Facebook:  ${base}/api/auth/oauth/facebook/callback`,
    ].join("\n");
    navigator.clipboard.writeText(bundle);
    setCopiedKey("ALL");
    toast.success("All 4 OAuth Callback URLs copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2500);
  }

  // Test Email Modal State
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  // Super Admin Workspace & Tenant Company Profile Integration (Wave 2.1 Follow-Up)
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Query all tenant workspaces for the selector
  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery({
    queryKey: ["super-tenants-list"],
    queryFn: async () => {
      const res = await api.get("/super/tenants");
      return Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
    },
  });

  // Automatically select the first tenant once loaded if none is active
  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  // Selected tenant object
  const selectedTenant = tenants.find((t: any) => t.id === selectedTenantId);

  // Query authoritative CompanyProfile & GST for the selected tenant using the canonical query key
  const {
    data: tenantProfileData,
    isLoading: isLoadingTenantProfile,
    isRefetching: isRefetchingTenantProfile,
    refetch: refetchTenantProfile,
  } = useQuery({
    queryKey: ["company-profile", selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const res: any = await api.get(`/v1/company-profile/tenant/${selectedTenantId}`);
      return res;
    },
    enabled: !!selectedTenantId,
  });

  const tenantCompanyProfile = tenantProfileData?.profile;
  const tenantGstRegistration = tenantProfileData?.primaryGst;

  // 1. REALTIME QUERY: Fetch platform settings from MySQL & Settings Service
  const {
    data: settingsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const brandingRes = await api.get("/v1/settings/PLATFORM/branding").catch(() => null);
        let cmsContent: any = {};
        try {
          const page = await api.get("/cms/pages/system-platform-settings");
          if (page?.content) cmsContent = page.content;
        } catch {}

        const merged: SuperSettings = {
          ...DEFAULT_SETTINGS,
          ...cmsContent,
        };

        // Harmonize platform address fields from legacy/current cmsPage keys
        if (cmsContent.platformName || cmsContent.companyName) {
          merged.platformLegalName = cmsContent.platformLegalName || cmsContent.platformName || cmsContent.companyName;
        }
        if (cmsContent.companyAddress || cmsContent.address) {
          merged.platformAddress = cmsContent.platformAddress || cmsContent.companyAddress || cmsContent.address;
        }
        if (cmsContent.taxGstNumber || cmsContent.gstNumber) {
          merged.platformGstin = cmsContent.platformGstin || cmsContent.taxGstNumber || cmsContent.gstNumber;
        }
        if (cmsContent.contactNumber || cmsContent.contactPhone) {
          merged.platformPhone = cmsContent.platformPhone || cmsContent.contactNumber || cmsContent.contactPhone;
        }

        if (brandingRes?.values) {
          if (brandingRes.values["branding.app_name"]) merged.appName = brandingRes.values["branding.app_name"];
          if (brandingRes.values["branding.support_email"]) merged.supportEmail = brandingRes.values["branding.support_email"];
          if (brandingRes.values["branding.primary_color"]) merged.primaryThemeColor = brandingRes.values["branding.primary_color"];
          if (brandingRes.values["branding.footer_text"]) merged.footerText = brandingRes.values["branding.footer_text"];
          if (brandingRes.values["branding.logo_light_id"]) merged.logoLightId = brandingRes.values["branding.logo_light_id"];
          if (brandingRes.values["branding.logo_dark_id"]) merged.logoDarkId = brandingRes.values["branding.logo_dark_id"];
          if (brandingRes.values["branding.favicon_id"]) merged.faviconId = brandingRes.values["branding.favicon_id"];
          if (brandingRes.mediaUrls) {
            if (brandingRes.mediaUrls["branding.logo_light_id"]) merged.logoLightUrl = brandingRes.mediaUrls["branding.logo_light_id"];
            if (brandingRes.mediaUrls["branding.logo_dark_id"]) merged.logoDarkUrl = brandingRes.mediaUrls["branding.logo_dark_id"];
            if (brandingRes.mediaUrls["branding.favicon_id"]) merged.faviconUrl = brandingRes.mediaUrls["branding.favicon_id"];
          }
        }
        return merged;
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
  });

  useEffect(() => {
    if (settingsData) {
      setForm(settingsData);
    }
  }, [settingsData]);

  // Track dirty state for sticky unsaved bar
  const isDirty = JSON.stringify(form) !== JSON.stringify(settingsData || DEFAULT_SETTINGS);

  // 2. REALTIME MUTATION: Save settings to MySQL & Settings Service
  const saveMutation = useMutation({
    mutationFn: async (updatedForm: SuperSettings) => {
      // 1. Save typed settings to Settings Service (Phase 1)
      await api.put("/v1/settings/PLATFORM/branding", {
        "branding.app_name": updatedForm.appName,
        "branding.support_email": updatedForm.supportEmail,
        "branding.primary_color": updatedForm.primaryThemeColor,
        "branding.logo_light_id": updatedForm.logoLightId || null,
        "branding.logo_dark_id": updatedForm.logoDarkId || null,
        "branding.favicon_id": updatedForm.faviconId || null,
        "branding.footer_text": updatedForm.footerText || "© 2026 Master HRMS. All rights reserved.",
      });

      // 2. Also keep CMS page updated for backward compatibility
      await api.put("/cms/pages/system-platform-settings", {
        title: "System Platform Settings",
        meta_description:
          "Global master configuration for currency, language, branding, SMTP, Pusher, and maintenance.",
        content: {
          ...updatedForm,
          companyAddress: updatedForm.platformAddress,
          platformName: updatedForm.platformLegalName,
          companyName: updatedForm.platformLegalName,
          taxGstNumber: updatedForm.platformGstin,
          contactPhone: updatedForm.platformPhone,
        },
        published: true,
      });
    },
    onSuccess: (_, updatedForm) => {
      toast.success("Settings saved! Realtime changes broadcast across all portals.");
      qc.invalidateQueries({ queryKey: ["realtime-platform-settings"] });
      qc.invalidateQueries({ queryKey: ["app-config"] });
      qc.invalidateQueries({ queryKey: ["tenant-branding"] });
      qc.invalidateQueries({ queryKey: ["platform-media-library"] });
      qc.invalidateQueries({ queryKey: ["oauth-config"] });
      qc.invalidateQueries({ queryKey: ["company-profile"] });
      // Apply theme immediately in this tab
      if (updatedForm.primaryThemeColor) {
        import("@/lib/useAppConfig").then(({ applyThemeVariables }) => {
          applyThemeVariables(updatedForm.primaryThemeColor);
        });
      }
      // Broadcast to all other open tabs
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("masterhrms_settings");
          bc.postMessage({ type: "settings_updated", primaryColor: updatedForm.primaryThemeColor });
          bc.close();
        }
      } catch {}
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSave() {
    saveMutation.mutate(form);
  }

  function handleResetCurrencySettings() {
    setForm({
      ...form,
      defaultCurrency: "INR",
      currencySymbol: "₹",
      decimalPlaces: 2,
      symbolPosition: "before",
      decimalSeparator: ".",
      thousandsSeparator: ",",
      showDecimals: true,
      addSpaceBetweenSymbol: true,
    });
    toast.info("Currency formatting reset to system defaults.");
  }

  function handleCurrencyChange(currCode: string) {
    let sym = "₹";
    if (currCode === "USD") sym = "$";
    if (currCode === "EUR") sym = "€";
    if (currCode === "GBP") sym = "£";
    if (currCode === "AED") sym = "AED";
    if (currCode === "CAD") sym = "$";

    setForm({
      ...form,
      defaultCurrency: currCode,
      currencySymbol: sym,
    });
  }

  function handleImageUpload(
    field: "logoLightUrl" | "logoDarkUrl" | "faviconUrl",
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setForm((prev) => ({ ...prev, [field]: url }));

      if (field === "faviconUrl") {
        const link =
          (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
          document.createElement("link");
        link.type = "image/x-icon";
        link.rel = "shortcut icon";
        link.href = url;
      }
      toast.success(`${field} image uploaded and preview updated!`);
    };
    reader.readAsDataURL(file);
  }

  async function handleExecuteSendTestEmail() {
    if (!testRecipientEmail) return toast.error("Please enter recipient email address");
    setIsSendingTestEmail(true);

    try {
      // 1. First ensure the current SMTP configuration is saved to the database
      await api.put("/cms/pages/system-platform-settings", {
        title: "System Platform Settings",
        meta_description:
          "Global master configuration for currency, language, branding, SMTP, Pusher, and maintenance.",
        content: form,
        published: true,
      });

      // 2. Execute real backend SMTP dispatch
      const res: any = await api.post("/super/smtp/test-otp-email", {
        toEmail: testRecipientEmail.trim(),
      });

      const timestamp = new Date().toLocaleString();
      const newLog: SmtpDeliveryLog = {
        id: `log-${Date.now()}`,
        timestamp,
        recipient: testRecipientEmail,
        subject: "Welcome Test Email",
        status: "delivered",
        error_details: `250 2.0.0 OK Test Email delivered via ${form.smtpHost}:${form.smtpPort} (ID: ${res.messageId || "sent"})`,
      };

      const updatedLogs = [newLog, ...(form.smtpLogs || [])];
      const updatedForm = { ...form, smtpLogs: updatedLogs };
      setForm(updatedForm);
      saveMutation.mutate(updatedForm);

      toast.success(
        res.message ||
          `Welcome Test Email delivered to ${testRecipientEmail} via ${form.smtpHost}:${form.smtpPort}!`,
      );
      setIsTestEmailModalOpen(false);
      setTestRecipientEmail("");
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error || err.message || `Cannot connect to ${form.smtpHost}:${form.smtpPort}`;
      const timestamp = new Date().toLocaleString();
      const newLog: SmtpDeliveryLog = {
        id: `log-${Date.now()}`,
        timestamp,
        recipient: testRecipientEmail,
        subject: "Welcome Test Email",
        status: "failed",
        error_details: `SMTP Failure: ${errMsg} (Host: ${form.smtpHost}:${form.smtpPort})`,
      };

      const updatedLogs = [newLog, ...(form.smtpLogs || [])];
      const updatedForm = { ...form, smtpLogs: updatedLogs };
      setForm(updatedForm);
      saveMutation.mutate(updatedForm);

      toast.error(`SMTP Delivery Error: ${errMsg}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  }

  // Live Currency Sample Calculation
  const liveSampleAmount = formatSystemAmount(1234.56, {
    defaultCurrency: form.defaultCurrency,
    currencySymbol: form.currencySymbol,
    decimalPlaces: form.decimalPlaces,
    symbolPosition: form.symbolPosition,
    decimalSeparator: form.decimalSeparator,
    thousandsSeparator: form.thousandsSeparator,
    showDecimals: form.showDecimals,
    addSpaceBetweenSymbol: form.addSpaceBetweenSymbol,
  });

  return (
    <div className="space-y-6">
      {/* Top Red Marquee Announcement Banner */}
      <MaintenanceMarqueeBanner />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <Settings className="size-3 text-primary" /> Global Master Config
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Configure Currency, reCAPTCHA, Language, Date/Time Formats, Branding, SMTP, OAuth &
            Maintenance Schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-2 bg-primary"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sub Menu & Nested Menus Navigation Sidebar */}
          <SettingsNestedNav
            categories={SUPER_SETTINGS_NAV}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            title="System Settings"
            subtitle="Global Master Config"
            searchPlaceholder="Search system settings..."
          />

          {/* Right Active Panel (No Tab Space!) */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            <SettingsSectionBreadcrumb
              categoryLabel={activeNavInfo?.category?.label}
              itemLabel={activeNavInfo?.item?.label || "Settings"}
              itemDescription={activeNavInfo?.item?.description}
              icon={activeNavInfo?.item?.icon}
              badge={
                activeNavInfo?.item?.badge ? (
                  <Badge variant="outline" className={cn("text-[10px] font-mono", activeNavInfo.item.badgeColor)}>
                    {activeNavInfo.item.badge}
                  </Badge>
                ) : null
              }
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="gap-1.5 text-xs h-8 bg-primary"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save Settings
                  </Button>
                </div>
              }
            />

        {/* TAB 1: BRANDING & THEME (PHASE 1 CORE) */}
        <TabsContent value="branding" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left 7 Columns: Enterprise Media Uploaders & Identity */}
            <div className="lg:col-span-7 space-y-6">
              {/* Logos Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                      <ImageIcon className="size-4.5 text-primary" /> Logos & Favicon
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upload brand assets with instant 0ms preview and direct storage in the Relational Media Library.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveMutation.mutate(form)}
                    disabled={saveMutation.isPending}
                    className="gap-1.5 text-xs font-semibold h-8"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5 text-primary" />
                    )}
                    Save Branding
                  </Button>
                </div>

                {/* Logos: side-by-side, Favicon: full-width below */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <MediaImageUploader
                    label="Light Mode Logo"
                    description="Displayed on white/light surfaces."
                    currentUrl={form.logoLightUrl}
                    currentMediaId={form.logoLightId}
                    previewBg="light"
                    recommendedDims="240×60px PNG/SVG transparent"
                    onUploaded={({ id, url }) => {
                      setForm((prev) => ({
                        ...prev,
                        logoLightId: id,
                        logoLightUrl: url,
                      }));
                    }}
                    onRemove={() => {
                      setForm((prev) => ({
                        ...prev,
                        logoLightId: null,
                        logoLightUrl: "",
                      }));
                    }}
                  />

                  <MediaImageUploader
                    label="Dark Mode Logo"
                    description="Displayed on dark navbars/headers."
                    currentUrl={form.logoDarkUrl}
                    currentMediaId={form.logoDarkId}
                    previewBg="dark"
                    recommendedDims="240×60px PNG/SVG light lettering"
                    onUploaded={({ id, url }) => {
                      setForm((prev) => ({
                        ...prev,
                        logoDarkId: id,
                        logoDarkUrl: url,
                      }));
                    }}
                    onRemove={() => {
                      setForm((prev) => ({
                        ...prev,
                        logoDarkId: null,
                        logoDarkUrl: "",
                      }));
                    }}
                  />
                </div>

                <MediaImageUploader
                  label="Browser Favicon Icon"
                  description="Browser tab icon. Applied immediately on upload."
                  currentUrl={form.faviconUrl}
                  currentMediaId={form.faviconId}
                  previewBg="checker"
                  recommendedDims="32×32 or 64×64 PNG or ICO"
                  onUploaded={({ id, url }) => {
                    setForm((prev) => ({
                      ...prev,
                      faviconId: id,
                      faviconUrl: url,
                    }));
                    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
                    if (link) link.href = url;
                  }}
                  onRemove={() => {
                    setForm((prev) => ({
                      ...prev,
                      faviconId: null,
                      faviconUrl: "",
                    }));
                  }}
                />
              </div>

              {/* Platform Identity Section */}
              <Card className="p-5 border shadow-xs space-y-4">
                <h3 className="font-bold text-sm border-b pb-2 flex items-center gap-2">
                  <Palette className="size-4 text-primary" /> Platform Identity & Colors
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Application Display Name</Label>
                    <Input
                      value={form.appName}
                      onChange={(e) => setForm({ ...form, appName: e.target.value })}
                      placeholder="e.g. Master HRMS"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">System Support Email</Label>
                    <Input
                      type="email"
                      value={form.supportEmail}
                      onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                      placeholder="support@company.com"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Primary Theme Accent Color</Label>
                    <span className="text-[11px] font-mono text-muted-foreground">{form.primaryThemeColor}</span>
                  </div>

                  {/* Preset Swatches */}
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    {[
                      { name: "Master Orange", hex: "#FF6B00" },
                      { name: "Royal Blue", hex: "#2563EB" },
                      { name: "Emerald Green", hex: "#10B981" },
                      { name: "Purple Indigo", hex: "#6366F1" },
                      { name: "Rose Ruby", hex: "#E11D48" },
                      { name: "Amber Gold", hex: "#F59E0B" },
                      { name: "Cyan Teal", hex: "#06B6D4" },
                    ].map((swatch) => (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => setForm({ ...form, primaryThemeColor: swatch.hex })}
                        className={`size-7 rounded-lg transition-all border flex items-center justify-center ${
                          form.primaryThemeColor.toLowerCase() === swatch.hex.toLowerCase()
                            ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-sm"
                            : "opacity-80 hover:opacity-100 hover:scale-105"
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                        title={swatch.name}
                      >
                        {form.primaryThemeColor.toLowerCase() === swatch.hex.toLowerCase() && (
                          <Check className="size-3.5 text-white drop-shadow-xs" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Color Picker Input */}
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryThemeColor}
                      onChange={(e) => setForm({ ...form, primaryThemeColor: e.target.value })}
                      className="size-9 rounded-lg cursor-pointer border p-0.5 bg-background shadow-xs shrink-0"
                    />
                    <Input
                      value={form.primaryThemeColor}
                      onChange={(e) => setForm({ ...form, primaryThemeColor: e.target.value })}
                      placeholder="#FF6B00"
                      className="text-xs font-mono max-w-[140px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <Label className="text-xs font-semibold">Footer Copyright Text</Label>
                  <Input
                    value={form.footerText || ""}
                    onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                    placeholder="© 2026 Master HRMS. All rights reserved."
                    className="text-xs"
                  />
                </div>
              </Card>
            </div>

            {/* Right 5 Columns: Interactive Live Preview Dock */}
            <div className="lg:col-span-5">
              <LivePreviewDock
                appName={form.appName}
                primaryColor={form.primaryThemeColor}
                logoLightUrl={form.logoLightUrl}
                logoDarkUrl={form.logoDarkUrl}
                footerText={form.footerText}
              />
            </div>
          </div>
        </TabsContent>

        {/* TAB 8: RELATIONAL MEDIA LIBRARY */}
        <TabsContent value="media" className="space-y-6 pt-4">
          <MediaLibraryManager />
        </TabsContent>

        {/* TAB 9: DISPATCH & INVOICING ADDRESSES (PHASE 2 WAVE 2.1) */}
        <TabsContent value="addresses" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Dispatch & Invoicing Addresses
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clear visual separation between Platform Origin (From Address) and Workspace Destination (To Address).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/30 font-medium">
                Platform Identity: Locked
              </Badge>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium">
                Tenant Identity: Authoritative
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* LEFT 6 COLS: FROM ADDRESS (PLATFORM / SUPER ADMIN) */}
            <div className="lg:col-span-6 space-y-6">
              <Card className="p-6 border shadow-xs space-y-5 bg-card">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        From Address
                      </span>
                      <h4 className="font-bold text-sm text-foreground">Platform / Service Provider</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Authoritative legal identity of the SaaS platform used on commercial invoices and outgoing dispatch.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="gap-1.5 text-xs font-semibold h-8"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5 text-primary" />
                    )}
                    Save Platform Address
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Platform Legal Entity Name</Label>
                    <Input
                      value={form.platformLegalName || ""}
                      onChange={(e) => setForm({ ...form, platformLegalName: e.target.value })}
                      placeholder="e.g. Master ERP Technologies Private Limited"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Registered Street Address</Label>
                    <Textarea
                      value={form.platformAddress || ""}
                      onChange={(e) => setForm({ ...form, platformAddress: e.target.value })}
                      placeholder="e.g. DLF Cyber City, Tower B, 8th Floor, DLF Phase 2"
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">City</Label>
                      <Input
                        value={form.platformCity || ""}
                        onChange={(e) => setForm({ ...form, platformCity: e.target.value })}
                        placeholder="e.g. Gurugram"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">State / Province</Label>
                      <Input
                        value={form.platformState || ""}
                        onChange={(e) => setForm({ ...form, platformState: e.target.value })}
                        placeholder="e.g. Haryana (06)"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Postal / PIN Code</Label>
                      <Input
                        value={form.platformPostalCode || ""}
                        onChange={(e) => setForm({ ...form, platformPostalCode: e.target.value })}
                        placeholder="e.g. 122002"
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Country</Label>
                      <Input
                        value={form.platformCountry || ""}
                        onChange={(e) => setForm({ ...form, platformCountry: e.target.value })}
                        placeholder="e.g. India"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Platform GSTIN / Tax Registration</Label>
                    <Input
                      value={form.platformGstin || ""}
                      onChange={(e) => setForm({ ...form, platformGstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 06AAACM1234F1Z8"
                      className="text-xs font-mono uppercase tracking-wider"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Official Support Email</Label>
                      <Input
                        value={form.supportEmail || ""}
                        onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                        placeholder="support@masterhrms.com"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Support Contact Phone</Label>
                      <Input
                        value={form.platformPhone || ""}
                        onChange={(e) => setForm({ ...form, platformPhone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Box for From Address */}
                <div className="p-4 rounded-xl border bg-muted/40 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <FileText className="size-3.5 text-indigo-500" /> Letterhead / Dispatch Preview
                    </span>
                    <span className="font-mono text-[10px]">ORIGIN</span>
                  </div>
                  <div className="p-3 rounded-lg bg-card border text-xs space-y-1">
                    <div className="font-bold text-foreground">
                      {form.platformLegalName || form.appName || "Platform Legal Entity"}
                    </div>
                    <div className="text-muted-foreground text-[11px] leading-relaxed">
                      {form.platformAddress || "Platform Address Not Configured"}
                      {form.platformCity && `, ${form.platformCity}`}
                      {form.platformState && `, ${form.platformState}`}
                      {form.platformPostalCode && ` — ${form.platformPostalCode}`}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground font-mono">
                      {form.platformGstin && (
                        <span>
                          <strong className="text-foreground">GSTIN:</strong> {form.platformGstin}
                        </span>
                      )}
                      {form.supportEmail && (
                        <span>
                          <strong className="text-foreground">Email:</strong> {form.supportEmail}
                        </span>
                      )}
                      {form.platformPhone && (
                        <span>
                          <strong className="text-foreground">Phone:</strong> {form.platformPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT 6 COLS: TO ADDRESS (SELECTED WORKSPACE / TENANT) */}
            <div className="lg:col-span-6 space-y-6">
              <Card className="p-6 border shadow-xs space-y-5 bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        To Address
                      </span>
                      <h4 className="font-bold text-sm text-foreground">Selected Workspace / Tenant</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Normalized CompanyProfile & GST record consumed live from the selected tenant workspace.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchTenantProfile()}
                      disabled={isRefetchingTenantProfile || !selectedTenantId}
                      className="gap-1.5 text-xs font-semibold h-8"
                      title="Refetch live tenant records from database"
                    >
                      <RefreshCw className={cn("size-3.5", (isRefetchingTenantProfile || isLoadingTenantProfile) && "animate-spin text-primary")} />
                      Refresh
                    </Button>
                    {selectedTenant && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="Open tenant workspace settings in new tab"
                      >
                        <a
                          href={`http://${selectedTenant.domain || `${selectedTenant.slug}.localhost:5173`}/settings`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Workspace Selection Toolbar */}
                <div className="space-y-2 p-3.5 rounded-xl border bg-secondary/30">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Select Workspace Tenant</span>
                    {isLoadingTenants && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" /> Loading workspaces...
                      </span>
                    )}
                  </Label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Choose a tenant workspace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{t.name}</span>
                            <span className="text-muted-foreground text-xs font-mono">
                              ({t.slug})
                            </span>
                            {t.status && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                                {t.status}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tenant Address Display State Machine */}
                {isLoadingTenantProfile ? (
                  <div className="flex flex-col items-center justify-center p-10 space-y-3 bg-muted/20 rounded-xl border">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground font-medium">
                      Fetching authoritative CompanyProfile & GST statutory records...
                    </p>
                  </div>
                ) : !selectedTenantId ? (
                  <div className="p-8 text-center space-y-2 border border-dashed rounded-xl bg-muted/10">
                    <Building2 className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-xs font-medium text-muted-foreground">
                      No tenant selected. Select a workspace from the dropdown above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Legal Corporate Identity Card */}
                    <div className="p-4 rounded-xl border bg-card space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground font-mono uppercase">
                            Legal Entity Name
                          </div>
                          <div className="text-sm font-bold text-foreground">
                            {tenantCompanyProfile?.legalName || selectedTenant?.name || "Workspace Profile"}
                          </div>
                          {tenantCompanyProfile?.tradeName && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Trade Name: <span className="text-foreground font-medium">{tenantCompanyProfile.tradeName}</span>
                            </div>
                          )}
                        </div>

                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-muted">
                          {tenantCompanyProfile?.constitutionOfBusiness
                            ? tenantCompanyProfile.constitutionOfBusiness.replace(/_/g, " ")
                            : "Private Limited"}
                        </Badge>
                      </div>

                      {/* PAN, TAN, CIN Identification */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono block">PAN</span>
                          <span className="font-mono font-bold text-[11px]">
                            {tenantCompanyProfile?.pan || "—"}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono block">TAN</span>
                          <span className="font-mono font-bold text-[11px]">
                            {tenantCompanyProfile?.tan || "—"}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono block">CIN</span>
                          <span className="font-mono font-bold text-[11px] truncate block" title={tenantCompanyProfile?.cin || "—"}>
                            {tenantCompanyProfile?.cin || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Registered Office Address */}
                    <div className="p-4 rounded-xl border bg-card space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <MapPin className="size-3.5 text-emerald-600" />
                        <span>Registered Office Address</span>
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {(tenantCompanyProfile?.registeredAddress || tenantCompanyProfile?.registeredAddressLine1) ? (
                          <>
                            <div>{tenantCompanyProfile.registeredAddress || tenantCompanyProfile.registeredAddressLine1}</div>
                            {tenantCompanyProfile.registeredAddressLine2 && (
                              <div>{tenantCompanyProfile.registeredAddressLine2}</div>
                            )}
                            <div>
                              {tenantCompanyProfile.registeredCity}, {tenantCompanyProfile.registeredState}{" "}
                              {tenantCompanyProfile.registeredPostalCode}
                            </div>
                            <div>{tenantCompanyProfile.registeredCountry || "India"}</div>
                          </>
                        ) : (
                          <span className="italic">No registered address specified by tenant yet.</span>
                        )}
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div className="p-4 rounded-xl border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Building className="size-3.5 text-blue-600" />
                          <span>Billing Address</span>
                        </div>
                        {(tenantCompanyProfile?.sameAsRegistered || tenantCompanyProfile?.sameAsRegisteredAddress) && (
                          <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-medium">
                            Identical to Registered Office
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {(tenantCompanyProfile?.sameAsRegistered || tenantCompanyProfile?.sameAsRegisteredAddress) ? (
                          <div>
                            {tenantCompanyProfile.registeredAddress || tenantCompanyProfile.registeredAddressLine1}, {tenantCompanyProfile.registeredCity},{" "}
                            {tenantCompanyProfile.registeredState} {tenantCompanyProfile.registeredPostalCode}
                          </div>
                        ) : (tenantCompanyProfile?.billingAddress || tenantCompanyProfile?.billingAddressLine1) ? (
                          <>
                            <div>{tenantCompanyProfile.billingAddress || tenantCompanyProfile.billingAddressLine1}</div>
                            {tenantCompanyProfile.billingAddressLine2 && (
                              <div>{tenantCompanyProfile.billingAddressLine2}</div>
                            )}
                            <div>
                              {tenantCompanyProfile.billingCity}, {tenantCompanyProfile.billingState}{" "}
                              {tenantCompanyProfile.billingPostalCode}
                            </div>
                            <div>{tenantCompanyProfile.billingCountry || "India"}</div>
                          </>
                        ) : (
                          <span className="italic">Defaulting to registered office address.</span>
                        )}
                      </div>
                    </div>

                    {/* Statutory GST Registration */}
                    <div className="p-4 rounded-xl border bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          <span>GST Registration (Statutory)</span>
                        </span>
                        {tenantGstRegistration?.status === "ACTIVE" ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            Active GSTIN
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {tenantGstRegistration ? "Inactive" : "Unregistered"}
                          </Badge>
                        )}
                      </div>

                      {tenantGstRegistration ? (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-lg bg-muted/40 border font-mono text-xs flex items-center justify-between">
                            <span className="font-bold text-foreground tracking-wider">
                              {tenantGstRegistration.gstin}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {tenantGstRegistration.state} ({tenantGstRegistration.stateCode || tenantGstRegistration.gstin?.substring(0, 2)})
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              Filing Preference: <strong className="text-foreground">{tenantGstRegistration.filingFrequency || "MONTHLY"}</strong>
                            </span>
                            <span>
                              Type: <strong className="text-foreground">{tenantGstRegistration.registrationType || "REGULAR"}</strong>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                          Tenant has no active GSTIN registered. B2C or Composition scheme applies.
                        </div>
                      )}
                    </div>

                    {/* Immutability & Authority Guard Notice */}
                    <div className="p-3 rounded-xl bg-muted/40 border text-[11px] text-muted-foreground flex items-start gap-2 leading-relaxed">
                      <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-foreground">Authoritative Data Isolation:</strong> This CompanyProfile is owned exclusively by the tenant at{" "}
                        <span className="font-mono text-[10px] text-foreground">
                          http://{selectedTenant?.slug}.localhost:5173/settings
                        </span>
                        . Super Admin consumes this record in read-only mode to prevent configuration drift.
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CURRENCY, LOCALIZATION & RECAPTCHA SECURITY */}
        <TabsContent value="currency" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left 7 Columns: Currency & Live Preview */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="p-6 border shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Coins className="size-5 text-amber-500" /> Currency Settings
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure how currency values are displayed throughout the entire application
                      & CMS.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Save className="size-3.5" /> Save Changes
                  </Button>
                </div>

                {/* Live Currency Preview Card */}
                <div className="p-5 rounded-2xl border bg-gradient-to-br from-amber-500/10 via-card to-primary/10 border-amber-500/30 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Realtime Currency Preview
                    </div>
                    <div className="text-3xl font-bold font-mono text-foreground mt-1">
                      {liveSampleAmount}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {form.defaultCurrency} ({form.currencySymbol}) ·{" "}
                      {form.symbolPosition === "before" ? "Symbol Before" : "Symbol After"}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetCurrencySettings}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="size-3.5" /> Reset Defaults
                  </Button>
                </div>

                {/* Form Controls */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Default Currency</Label>
                    <Select value={form.defaultCurrency} onValueChange={handleCurrencyChange}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ · INR - Indian Rupee (Selected)</SelectItem>
                        <SelectItem value="USD">$ · USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">€ · EUR - Euro</SelectItem>
                        <SelectItem value="GBP">£ · GBP - British Pound</SelectItem>
                        <SelectItem value="AED">AED · UAE Dirham</SelectItem>
                        <SelectItem value="CAD">$ · CAD - Canadian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Currency Symbol</Label>
                    <Input
                      value={form.currencySymbol}
                      onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                      className="text-xs h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Decimal Places</Label>
                    <Select
                      value={String(form.decimalPlaces)}
                      onValueChange={(val) => setForm({ ...form, decimalPlaces: Number(val) })}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 (e.g., 1234.56)</SelectItem>
                        <SelectItem value="0">0 (e.g., 1235)</SelectItem>
                        <SelectItem value="3">3 (e.g., 1234.567)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Symbol Position</Label>
                    <Select
                      value={form.symbolPosition}
                      onValueChange={(val: any) => setForm({ ...form, symbolPosition: val })}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before">Before Amount ($100 / ₹100)</SelectItem>
                        <SelectItem value="after">After Amount (100$ / 100₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Decimal Separator</Label>
                    <Select
                      value={form.decimalSeparator}
                      onValueChange={(val: any) => setForm({ ...form, decimalSeparator: val })}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=".">Dot (123.45)</SelectItem>
                        <SelectItem value=",">Comma (123,45)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Thousands Separator</Label>
                    <Select
                      value={form.thousandsSeparator}
                      onValueChange={(val: any) => setForm({ ...form, thousandsSeparator: val })}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=",">Comma (1,234.56)</SelectItem>
                        <SelectItem value=".">Dot (1.234,56)</SelectItem>
                        <SelectItem value=" ">Space (1 234.56)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="p-4 rounded-xl border bg-secondary/20 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs">Show Decimals</div>
                      <div className="text-[11px] text-muted-foreground">
                        Display decimal places in amounts
                      </div>
                    </div>
                    <Switch
                      checked={form.showDecimals}
                      onCheckedChange={(checked) => setForm({ ...form, showDecimals: checked })}
                    />
                  </div>

                  <div className="p-4 rounded-xl border bg-secondary/20 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs">Add Space</div>
                      <div className="text-[11px] text-muted-foreground">
                        Space between amount and symbol
                      </div>
                    </div>
                    <Switch
                      checked={form.addSpaceBetweenSymbol}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, addSpaceBetweenSymbol: checked })
                      }
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Right 5 Columns: Localization & reCAPTCHA */}
            <div className="lg:col-span-5 space-y-6">
              {/* Default Language & Regional Formats */}
              <Card className="p-6 border shadow-xs space-y-4">
                <h3 className="font-bold text-sm border-b pb-2 flex items-center gap-2">
                  <Languages className="size-4 text-primary" /> Default Language & Formats
                </h3>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Language</Label>
                  <Select
                    value={form.defaultLanguage}
                    onValueChange={(val) => setForm({ ...form, defaultLanguage: val })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                      <SelectItem value="hi">🇮🇳 Hindi (हिंदी)</SelectItem>
                      <SelectItem value="es">🇪🇸 Spanish (Español)</SelectItem>
                      <SelectItem value="fr">🇫🇷 French (Français)</SelectItem>
                      <SelectItem value="ar">🇦🇪 Arabic (العربية - RTL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date Format</Label>
                  <Select
                    value={form.dateFormat}
                    onValueChange={(val) => setForm({ ...form, dateFormat: val })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-01-15)</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (15/01/2024)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (01/15/2024)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Time Format</Label>
                  <Select
                    value={form.timeFormat}
                    onValueChange={(val) => setForm({ ...form, timeFormat: val })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 Hour (13:30)</SelectItem>
                      <SelectItem value="12h">12 Hour (01:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Calendar Start Day</Label>
                  <Select
                    value={form.calendarStartDay}
                    onValueChange={(val) => setForm({ ...form, calendarStartDay: val })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              {/* reCAPTCHA Security Suite */}
              <Card className="p-6 border shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" /> Google reCAPTCHA Security
                  </h3>
                  <Switch
                    checked={form.recaptchaEnabled}
                    onCheckedChange={(checked) => setForm({ ...form, recaptchaEnabled: checked })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">reCAPTCHA Version</Label>
                  <Select
                    value={form.recaptchaVersion}
                    onValueChange={(val: any) => setForm({ ...form, recaptchaVersion: val })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v3">reCAPTCHA v3 (Invisible Score Based)</SelectItem>
                      <SelectItem value="v2">reCAPTCHA v2 (Checkbox "I'm not a robot")</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Site Key</Label>
                  <Input
                    value={form.recaptchaSiteKey}
                    onChange={(e) => setForm({ ...form, recaptchaSiteKey: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Secret Key</Label>
                  <div className="relative">
                    <Input
                      type={showRecaptchaSecret ? "text" : "password"}
                      value={form.recaptchaSecretKey}
                      onChange={(e) => setForm({ ...form, recaptchaSecretKey: e.target.value })}
                      className="text-xs font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecaptchaSecret(!showRecaptchaSecret)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showRecaptchaSecret ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SMTP PRIMARY MAIL ENGINE */}
        <TabsContent value="smtp" className="space-y-6 pt-4">
          <Card className="p-6 border shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Mail className="size-5 text-primary" /> Primary SMTP Server Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All transactional emails, password resets, and user invitations route through this
                  mail host.
                </p>
              </div>
              <Button
                onClick={() => setIsTestEmailModalOpen(true)}
                className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="size-3.5" /> Send Test Email
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SMTP Host *</Label>
                <Input
                  value={form.smtpHost}
                  onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SMTP Port *</Label>
                <Input
                  value={form.smtpPort}
                  onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Encryption</Label>
                <Select
                  value={form.smtpEncryption}
                  onValueChange={(val: any) => setForm({ ...form, smtpEncryption: val })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS (Port 587)</SelectItem>
                    <SelectItem value="ssl">SSL (Port 465)</SelectItem>
                    <SelectItem value="none">None (Port 25)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SMTP Username</Label>
                <Input
                  value={form.smtpUser}
                  onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SMTP Password</Label>
                <div className="relative">
                  <Input
                    type={showSmtpPassword ? "text" : "password"}
                    value={form.smtpPass}
                    onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
                    className="text-xs font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showSmtpPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

                        <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sender Display Name</Label>
                <Input
                  value={form.smtpFromName || "Master HRMS System"}
                  onChange={(e) => setForm({ ...form, smtpFromName: e.target.value })}
                  className="text-xs font-mono"
                  placeholder="Master HRMS System"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sender Email Address (From)</Label>
                <Input
                  value={form.smtpFromEmail || `no-reply@${getPlatformBaseDomain()}`}
                  onChange={(e) => setForm({ ...form, smtpFromEmail: e.target.value })}
                  className="text-xs font-mono"
                  placeholder={`no-reply@${getPlatformBaseDomain()}`}
                />
              </div>
            </div>

            {/* 2FA EMAIL OTP HTML TEMPLATE SECTION */}
            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    Two-Factor Authentication (2FA) Email OTP Template
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customize the security email template dispatched whenever users log in or verify their identity.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm({
                        ...form,
                        otpEmailSubject: "{{appName}} — Your Login Verification Code",
                        otpEmailTemplate: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b; margin: 0; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .hdr { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: white; }
    .hdr h2 { margin: 0; font-size: 20px; font-weight: 800; color: #f97316; letter-spacing: -0.5px; }
    .hdr p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; color: #e2e8f0; }
    .bdy { padding: 32px 24px; }
    .box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ea580c; margin: 0; }
    .tag { display: inline-block; background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }
    .ftr { padding: 18px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <h2>{{appName}}</h2>
      <p>Secure Login Verification Code</p>
    </div>
    <div class="bdy">
      <p style="font-weight: 600; margin: 0 0 12px 0;">Hello {{userName}},</p>
      <p style="font-size: 13px; color: #475569; margin: 0 0 20px 0;">We received a sign-in request for your account. Please use the 6-digit verification code below to complete your authentication:</p>
      <div class="box">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Your 6-Digit OTP Code</div>
        <div class="code">{{otp}}</div>
        <div class="tag">Expires in {{expiryMinutes}} minutes</div>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">For your security, never share this code. If you did not make this request, contact your administrator immediately.</p>
    </div>
    <div class="ftr">© {{currentYear}} {{appName}}. All rights reserved.</div>
  </div>
</body>
</html>`,
                      });
                      toast.info("Reset to default professional HTML template!");
                    }}
                    className="text-xs font-semibold h-8 gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    Reset to Default
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsTestEmailModalOpen(true)}
                    className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 h-8"
                  >
                    <Send className="size-3.5" /> Send Test OTP Email
                  </Button>
                </div>
              </div>

              {/* Subject Line */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Subject Line</Label>
                <Input
                  value={form.otpEmailSubject || "{{appName}} — Your Login Verification Code"}
                  onChange={(e) => setForm({ ...form, otpEmailSubject: e.target.value })}
                  placeholder="{{appName}} — Your Login Verification Code"
                  className="text-xs font-mono"
                />
              </div>

              {/* Template Variable Badges */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Available Dynamic Variables (Click to Copy)
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["{{otp}}", "{{userName}}", "{{userEmail}}", "{{appName}}", "{{expiryMinutes}}", "{{currentYear}}"].map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(tag);
                        toast.success(`Copied ${tag} to clipboard!`);
                      }}
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary font-mono text-[10px] py-1 px-2 border-border/80 text-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Code Editor & Live Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                {/* Editor Column */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Terminal className="size-3.5 text-primary" />
                      HTML Source Code
                    </Label>
                    <span className="text-[10px] font-mono text-muted-foreground">HTML5 + Inline CSS</span>
                  </div>
                  <Textarea
                    rows={15}
                    value={form.otpEmailTemplate || `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b; margin: 0; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .hdr { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: white; }
    .hdr h2 { margin: 0; font-size: 20px; font-weight: 800; color: #f97316; letter-spacing: -0.5px; }
    .hdr p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; color: #e2e8f0; }
    .bdy { padding: 32px 24px; }
    .box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ea580c; margin: 0; }
    .tag { display: inline-block; background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }
    .ftr { padding: 18px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <h2>{{appName}}</h2>
      <p>Secure Login Verification Code</p>
    </div>
    <div class="bdy">
      <p style="font-weight: 600; margin: 0 0 12px 0;">Hello {{userName}},</p>
      <p style="font-size: 13px; color: #475569; margin: 0 0 20px 0;">We received a sign-in request for your account. Please use the 6-digit verification code below to complete your authentication:</p>
      <div class="box">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Your 6-Digit OTP Code</div>
        <div class="code">{{otp}}</div>
        <div class="tag">Expires in {{expiryMinutes}} minutes</div>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">For your security, never share this code. If you did not make this request, contact your administrator immediately.</p>
    </div>
    <div class="ftr">© {{currentYear}} {{appName}}. All rights reserved.</div>
  </div>
</body>
</html>`}
                    onChange={(e) => setForm({ ...form, otpEmailTemplate: e.target.value })}
                    className="font-mono text-xs leading-relaxed bg-background/50 border-border/80 resize-y"
                    placeholder="Enter custom HTML template..."
                  />
                </div>

                {/* Preview Column */}
                <div className="space-y-1.5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Eye className="size-3.5 text-emerald-500" />
                      Live Inbox Render Preview
                    </Label>
                    <Badge variant="secondary" className="text-[10px] font-mono py-0 h-4">
                      Simulated Preview
                    </Badge>
                  </div>

                  <div className="flex-1 rounded-xl border border-border/80 bg-slate-100 dark:bg-slate-900/50 p-2 overflow-hidden flex flex-col min-h-[320px]">
                    <div className="text-[10px] font-mono text-muted-foreground px-2 py-1 border-b border-border/40 flex items-center justify-between">
                      <span className="truncate max-w-[200px]">Subject: {(form.otpEmailSubject || "{{appName}} — Your Login Verification Code").replace("{{appName}}", form.appName || "Master HRMS")}</span>
                      <span>From: {form.smtpFromName || "Master HRMS"} &lt;{form.smtpFromEmail || `no-reply@${getPlatformBaseDomain()}`}&gt;</span>
                    </div>

                    <iframe
                      title="2FA Template Preview"
                      srcDoc={(form.otpEmailTemplate || `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b; margin: 0; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .hdr { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: white; }
    .hdr h2 { margin: 0; font-size: 20px; font-weight: 800; color: #f97316; letter-spacing: -0.5px; }
    .hdr p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; color: #e2e8f0; }
    .bdy { padding: 32px 24px; }
    .box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ea580c; margin: 0; }
    .tag { display: inline-block; background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }
    .ftr { padding: 18px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <h2>{{appName}}</h2>
      <p>Secure Login Verification Code</p>
    </div>
    <div class="bdy">
      <p style="font-weight: 600; margin: 0 0 12px 0;">Hello {{userName}},</p>
      <p style="font-size: 13px; color: #475569; margin: 0 0 20px 0;">We received a sign-in request for your account. Please use the 6-digit verification code below to complete your authentication:</p>
      <div class="box">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Your 6-Digit OTP Code</div>
        <div class="code">{{otp}}</div>
        <div class="tag">Expires in {{expiryMinutes}} minutes</div>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">For your security, never share this code. If you did not make this request, contact your administrator immediately.</p>
    </div>
    <div class="ftr">© {{currentYear}} {{appName}}. All rights reserved.</div>
  </div>
</body>
</html>`)
                        .replace(/{{otp}}/g, "482913")
                        .replace(/{{userName}}/g, "Gowtham Wilsan")
                        .replace(/{{userEmail}}/g, "gowtham@company.com")
                        .replace(/{{appName}}/g, form.appName || "Master HRMS")
                        .replace(/{{expiryMinutes}}/g, "5")
                        .replace(/{{currentYear}}/g, String(new Date().getFullYear()))}
                      className="w-full flex-1 border-0 rounded-lg bg-white mt-1"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SMTP Delivery Audit Feed */}
            <div className="pt-4 border-t space-y-3">
              <div className="font-bold text-xs flex items-center justify-between">
                <span>Recent SMTP Delivery Logs</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  ({form.smtpLogs?.length || 0} Records)
                </span>
              </div>

              <div className="space-y-2">
                {(form.smtpLogs || []).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border bg-secondary/10 flex items-center justify-between gap-4 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      {log.status === "delivered" ? (
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="size-4 text-destructive shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-foreground">
                          {log.subject} → {log.recipient}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {log.error_details}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">
                      {log.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: OAUTH SOCIAL LOGINS */}
        <TabsContent value="oauth" className="space-y-6 pt-4">
          {/* Top Domain & Callback Base URL Configuration */}
          <Card className="p-6 border shadow-xs space-y-4 bg-gradient-to-br from-primary/5 via-card to-background border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Globe className="size-5 text-primary" /> Production Domain & Callback Base URL
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set your public backend API and frontend URLs. All OAuth provider callback URLs are automatically generated in real time from this domain.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoDetectDomain}
                  className="gap-1.5 text-xs font-semibold"
                  title="Auto-detect domain from your browser address bar"
                >
                  <RefreshCw className="size-3.5 text-primary" /> Auto-Detect Current Domain
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={copyAllCallbacks}
                  className="gap-1.5 text-xs font-semibold"
                  title="Copy all 4 callback URLs to clipboard"
                >
                  {copiedKey === "ALL" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedKey === "ALL" ? "All Copied!" : "Copy All 4 URLs"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Save className="size-3.5" /> Save Settings
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Backend API & OAuth Base URL *</Label>
                <Input
                  value={form.oauthBaseUrl}
                  onChange={(e) => setForm({ ...form, oauthBaseUrl: e.target.value })}
                  placeholder="e.g. https://api.yourdomain.com or http://localhost:4000"
                  className="text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Where your Express server routes reside (used for OAuth redirect callbacks).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Frontend Application Base URL *</Label>
                <Input
                  value={form.frontendBaseUrl}
                  onChange={(e) => setForm({ ...form, frontendBaseUrl: e.target.value })}
                  placeholder="e.g. https://yourdomain.com or http://localhost:8080"
                  className="text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Where users are redirected after successful social authentication.
                </p>
              </div>
            </div>
          </Card>

          {/* 1. GOOGLE WORKSPACE OAUTH */}
          <Card className="p-6 border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-blue-500/10 grid place-items-center text-blue-600 border border-blue-500/20">
                  <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm">Google Workspace & Gmail OAuth 2.0</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Allow employees and leads to sign in with Google accounts.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.googleEnabled}
                onCheckedChange={(v) => setForm({ ...form, googleEnabled: v })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Google Client ID *</Label>
                <Input
                  value={form.googleClientId}
                  onChange={(e) => setForm({ ...form, googleClientId: e.target.value })}
                  placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Google Client Secret *</Label>
                <div className="relative">
                  <Input
                    type={showGoogleSecret ? "text" : "password"}
                    value={form.googleClientSecret}
                    onChange={(e) => setForm({ ...form, googleClientSecret: e.target.value })}
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
                    className="text-xs font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showGoogleSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Callback URL with 1-Click Copy */}
            <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Authorized Redirect URI (Callback URL for Google Cloud Console)</span>
                <span className="text-[10px] text-primary font-normal">Copy this into Google Cloud</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${(form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/oauth/google/callback`}
                  className="text-xs font-mono bg-background select-all"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 text-xs shrink-0"
                  onClick={() =>
                    copyToClipboard(
                      `${(form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/oauth/google/callback`,
                      "Google",
                    )
                  }
                >
                  {copiedKey === "Google" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedKey === "Google" ? "Copied" : "Copy URL"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                In <strong>Google Cloud Console → APIs & Services → Credentials → Authorized redirect URIs</strong>, paste this exact URL.
              </p>
            </div>
          </Card>

          {/* 2. APPLE SIGN IN */}
          <Card className="p-6 border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-foreground/10 grid place-items-center text-foreground border border-border">
                  <svg className="size-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.92.04-2.02.62-2.67 1.37-.58.67-1.1 1.74-.96 2.77 1.02.08 2.08-.53 2.71-1.29z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm">Sign in with Apple (iOS / macOS / Web)</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Apple ID single sign-on authentication via Apple Developer Services.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.appleEnabled}
                onCheckedChange={(v) => setForm({ ...form, appleEnabled: v })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Apple Services ID (Client ID) *</Label>
                <Input
                  value={form.appleClientId}
                  onChange={(e) => setForm({ ...form, appleClientId: e.target.value })}
                  placeholder="e.g. com.masterhrms.web.auth"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Apple Team ID</Label>
                <Input
                  value={form.appleTeamId}
                  onChange={(e) => setForm({ ...form, appleTeamId: e.target.value })}
                  placeholder="e.g. ABC123DEFG (10-character Team ID)"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Apple Key ID</Label>
                <Input
                  value={form.appleKeyId}
                  onChange={(e) => setForm({ ...form, appleKeyId: e.target.value })}
                  placeholder="e.g. 10-char Key Identifier"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Private Key (.p8 text)</Label>
                <div className="relative">
                  <Input
                    type={showAppleKey ? "text" : "password"}
                    value={form.applePrivateKey}
                    onChange={(e) => setForm({ ...form, applePrivateKey: e.target.value })}
                    placeholder="Paste Apple .p8 private key text here..."
                    className="text-xs font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppleKey(!showAppleKey)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showAppleKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Callback URL */}
            <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Apple Return URL (Callback URL for Apple Developer Portal)</span>
                <span className="text-[10px] text-primary font-normal">Copy this into Apple Developer</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${(form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/oauth/apple/callback`}
                  className="text-xs font-mono bg-background select-all"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 text-xs shrink-0"
                  onClick={() =>
                    copyToClipboard(
                      `${(form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/oauth/apple/callback`,
                      "Apple",
                    )
                  }
                >
                  {copiedKey === "Apple" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedKey === "Apple" ? "Copied" : "Copy URL"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                In <strong>Apple Developer → Certificates, Identifiers & Profiles → Services IDs → Sign In with Apple → Return URLs</strong>, paste this URL.
              </p>
            </div>
          </Card>

          {/* 3. LINKEDIN OAUTH */}
          <Card className="p-6 border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-[#0A66C2]/10 grid place-items-center text-[#0A66C2] border border-[#0A66C2]/20">
                  <svg className="size-5 fill-[#0A66C2] shrink-0" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm">LinkedIn OpenID Connect SSO</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Enable corporate professionals and candidates to log in via LinkedIn profiles.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.linkedinEnabled}
                onCheckedChange={(v) => setForm({ ...form, linkedinEnabled: v })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">LinkedIn Client ID *</Label>
                <Input
                  value={form.linkedinClientId}
                  onChange={(e) => setForm({ ...form, linkedinClientId: e.target.value })}
                  placeholder="e.g. 78xxxxxxxxxxxx"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">LinkedIn Client Secret *</Label>
                <div className="relative">
                  <Input
                    type={showLinkedinSecret ? "text" : "password"}
                    value={form.linkedinClientSecret}
                    onChange={(e) => setForm({ ...form, linkedinClientSecret: e.target.value })}
                    placeholder="e.g. secret_xxxxxxxxxxxx"
                    className="text-xs font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinkedinSecret(!showLinkedinSecret)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showLinkedinSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Callback URL */}
            <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>LinkedIn Authorized Redirect URL (Callback URL)</span>
                <span className="text-[10px] text-primary font-normal">Copy this into LinkedIn Developers</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${(form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/oauth/linkedin/callback`}
                  className="text-xs font-mono bg-background select-all"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 text-xs shrink-0"
                  onClick={() =>
                    copyToClipboard(
                      `${(form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/oauth/linkedin/callback`,
                      "LinkedIn",
                    )
                  }
                >
                  {copiedKey === "LinkedIn" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedKey === "LinkedIn" ? "Copied" : "Copy URL"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                In <strong>LinkedIn Developer Portal → Your App → Auth → Authorized Redirect URLs</strong>, add this URL.
              </p>
            </div>
          </Card>

          {/* 4. META FACEBOOK OAUTH */}
          <Card className="p-6 border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-[#1877F2]/10 grid place-items-center text-[#1877F2] border border-[#1877F2]/20">
                  <svg className="size-5 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm">Meta Facebook Login</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Allow users to authenticate using their Facebook identity via Meta Graph API.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.facebookEnabled}
                onCheckedChange={(v) => setForm({ ...form, facebookEnabled: v })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Facebook App ID *</Label>
                <Input
                  value={form.facebookAppId}
                  onChange={(e) => setForm({ ...form, facebookAppId: e.target.value })}
                  placeholder="e.g. 109876543210987"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Facebook App Secret *</Label>
                <div className="relative">
                  <Input
                    type={showFacebookSecret ? "text" : "password"}
                    value={form.facebookAppSecret}
                    onChange={(e) => setForm({ ...form, facebookAppSecret: e.target.value })}
                    placeholder="e.g. fb_sec_xxxxxxxxxxxxxxxxxxxx"
                    className="text-xs font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFacebookSecret(!showFacebookSecret)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showFacebookSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Callback URL */}
            <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Valid OAuth Redirect URI (Callback URL for Meta for Developers)</span>
                <span className="text-[10px] text-primary font-normal">Copy this into Meta Developers</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${(form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/oauth/facebook/callback`}
                  className="text-xs font-mono bg-background select-all"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 text-xs shrink-0"
                  onClick={() =>
                    copyToClipboard(
                      `${(form.oauthBaseUrl || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/oauth/facebook/callback`,
                      "Facebook",
                    )
                  }
                >
                  {copiedKey === "Facebook" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedKey === "Facebook" ? "Copied" : "Copy URL"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                In <strong>Meta for Developers → App Dashboard → Facebook Login → Settings → Valid OAuth Redirect URIs</strong>, paste this URL.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: PUSHER WEBSOCKETS */}
        <TabsContent value="pusher" className="space-y-6 pt-4">
          <Card className="p-6 border shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Radio className="size-5 text-primary" /> Pusher WebSockets Realtime Engine
              </h3>
              <Switch
                checked={form.pusherEnabled}
                onCheckedChange={(checked) => setForm({ ...form, pusherEnabled: checked })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pusher App ID</Label>
                <Input
                  value={form.pusherAppId}
                  onChange={(e) => setForm({ ...form, pusherAppId: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pusher App Key</Label>
                <Input
                  value={form.pusherKey}
                  onChange={(e) => setForm({ ...form, pusherKey: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 6: PAYMENTS & BANK DETAILS */}
        <TabsContent value="payments" className="space-y-6 pt-4">
          <Card className="p-6 border shadow-xs space-y-6">
            <h3 className="font-bold text-base border-b pb-4 flex items-center gap-2">
              <CreditCard className="size-5 text-primary" /> Global Payment Gateways & Bank
              Instructions
            </h3>

            {/* 1. Razorpay Gateway */}
            <div className="space-y-4 border-b pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-blue-600 flex items-center gap-1.5">
                    <CreditCard className="size-4" /> Razorpay Payment Gateway (INR ₹)
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    UPI, Credit/Debit Cards, NetBanking for Indian INR payments
                  </div>
                </div>
                <Switch
                  checked={form.razorpayEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, razorpayEnabled: checked })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Razorpay Key ID</Label>
                  <Input
                    value={form.razorpayKeyId}
                    onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })}
                    className="text-xs font-mono"
                    placeholder="rzp_live_xxxxxxxxxxxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Razorpay Key Secret</Label>
                  <Input
                    type="password"
                    value={form.razorpayKeySecret}
                    onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })}
                    className="text-xs font-mono"
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>
            </div>

            {/* 2. PayPal Gateway */}
            <div className="space-y-4 border-b pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-indigo-600 flex items-center gap-1.5">
                    <Globe className="size-4" /> PayPal Payment Gateway (USD $)
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Global PayPal balance and international credit card checkout
                  </div>
                </div>
                <Switch
                  checked={form.paypalEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, paypalEnabled: checked })}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-semibold">PayPal Client ID</Label>
                  <Input
                    value={form.paypalClientId}
                    onChange={(e) => setForm({ ...form, paypalClientId: e.target.value })}
                    className="text-xs font-mono"
                    placeholder="AQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">PayPal Environment Mode</Label>
                  <Select
                    value={form.paypalMode}
                    onValueChange={(v: any) => setForm({ ...form, paypalMode: v })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="live">Live (Production)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-3">
                  <Label className="text-xs font-semibold">PayPal Secret Key</Label>
                  <Input
                    type="password"
                    value={form.paypalSecret}
                    onChange={(e) => setForm({ ...form, paypalSecret: e.target.value })}
                    className="text-xs font-mono"
                    placeholder="ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            {/* 3. Manual Bank Transfer Instructions & Account Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-emerald-600 flex items-center gap-1.5">
                    <Building className="size-4" /> Manual Bank Transfer Instructions & Account
                    Details
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Shown to tenants when choosing Manual Bank Transfer option
                  </div>
                </div>
                <Switch
                  checked={form.bankTransferEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, bankTransferEnabled: checked })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Bank Account Details & Payment Instructions
                </Label>
                <Textarea
                  rows={6}
                  value={form.bankTransferDetails}
                  onChange={(e) => setForm({ ...form, bankTransferDetails: e.target.value })}
                  placeholder="Enter Bank Name, Account Number, IFSC, Swift Code, UPI ID, and Transfer Instructions..."
                  className="text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Tenants will copy these bank details to transfer money and upload their
                  transaction receipt screenshot for your approval in Super Admin → Monetization →
                  Bank Transfers.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 7: MAINTENANCE MODE & NOTICES */}
        <TabsContent value="system" className="space-y-6 pt-4">
          <Card className="p-6 border shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <AlertTriangle className="size-5 text-destructive" /> Platform Maintenance Controls
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage active maintenance lockdown, scheduled windows, and public downtime notices.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className="gap-1.5 text-xs font-semibold"
              >
                <Save className="size-3.5" /> Save Changes
              </Button>
            </div>

            {/* Instant Emergency Lockdown Switch */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span>Emergency Maintenance Mode</span>
                  {form.maintenanceMode ? (
                    <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                      Active Lockdown
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                      Normal Mode
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Immediately restricts tenant dashboards and non-super API access, redirecting users to /maintenance.
                </p>
              </div>
              <Switch
                checked={form.maintenanceMode}
                onCheckedChange={(checked) => setForm({ ...form, maintenanceMode: checked })}
              />
            </div>

            {/* Advance Scheduled Notice Switch */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span>Advance Scheduled Maintenance</span>
                  {form.maintenanceScheduled && (
                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">
                      Scheduled Window
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Enables scheduled downtime window. Displays countdown when estimated end time is specified.
                </p>
              </div>
              <Switch
                checked={form.maintenanceScheduled}
                onCheckedChange={(checked) => setForm({ ...form, maintenanceScheduled: checked })}
              />
            </div>

            {/* Start and End Timestamps */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Scheduled Start Time</Label>
                <Input
                  value={form.maintenanceStartTime}
                  onChange={(e) => setForm({ ...form, maintenanceStartTime: e.target.value })}
                  placeholder="e.g. 2026-10-15 02:00:00 UTC or Today at 02:00 AM UTC"
                  className="text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  When maintenance window begins. Leave empty if uncommitted.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estimated Completion / End Time</Label>
                <Input
                  value={form.maintenanceEndTime}
                  onChange={(e) => setForm({ ...form, maintenanceEndTime: e.target.value })}
                  placeholder="e.g. 2026-10-15 04:00:00 UTC or Today at 04:00 AM UTC"
                  className="text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Required for countdown timer and Retry-After header. Leave blank if unknown.
                </p>
              </div>
            </div>

            {/* Custom Notice Message */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Public Downtime Notice Message</Label>
              <Textarea
                value={form.maintenanceNoticeMessage}
                onChange={(e) => setForm({ ...form, maintenanceNoticeMessage: e.target.value })}
                rows={3}
                placeholder="Enter informative message explaining the reason and scope of the maintenance..."
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Displayed in the center of the /maintenance page and in the top marquee banner across public pages.
              </p>
            </div>
          </Card>
        </TabsContent>
          </main>
        </div>
      </Tabs>

      {/* Send Test Email Dialog */}
      <Dialog open={isTestEmailModalOpen} onOpenChange={setIsTestEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email via Primary SMTP</DialogTitle>
            <DialogDescription>
              Validate SMTP server connectivity by sending a welcome test message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">Recipient Email Address *</Label>
            <Input
              type="email"
              placeholder="admin@company.com"
              value={testRecipientEmail}
              onChange={(e) => setTestRecipientEmail(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteSendTestEmail}
              disabled={isSendingTestEmail}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSendingTestEmail ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}{" "}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Unsaved Changes Bar */}
      <UnsavedChangesBar
        isDirty={isDirty}
        isSaving={saveMutation.isPending}
        sectionTitle="Branding & System Configuration"
        onSave={handleSave}
        onDiscard={() => {
          if (settingsData) setForm(settingsData);
          toast.info("Unsaved changes discarded.");
        }}
      />
    </div>
  );
}
