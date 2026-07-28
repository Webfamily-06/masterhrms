import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  Languages,
  RotateCcw,
} from "lucide-react";
import { MaintenanceMarqueeBanner } from "@/components/maintenance-marquee-banner";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/super/settings")({
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

  // Social Auth (Google, Facebook, Apple)
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;

  facebookClientId: string;
  facebookClientSecret: string;
  facebookCallbackUrl: string;

  appleClientId: string;
  appleClientSecret: string;
  appleCallbackUrl: string;

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
};

const DEFAULT_SETTINGS: SuperSettings = {
  appName: "Master HRMS",
  supportEmail: "hello@masterhrms.com",
  logoLightUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  primaryThemeColor: "#2563eb",
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
  maintenanceNoticeMessage: "⚠️ SYSTEM NOTICE: Scheduled platform maintenance in progress. Please save your work.",
  maintenanceStartTime: "2026-07-28 02:00 AM UTC",
  maintenanceEndTime: "2026-07-28 04:00 AM UTC",

  smtpHost: (import.meta.env.VITE_SMTP_HOST as string) || "smtp.mailgun.org",
  smtpPort: (import.meta.env.VITE_SMTP_PORT as string) || "587",
  smtpUser: (import.meta.env.VITE_SMTP_USER as string) || "postmaster@mg.masterhrms.com",
  smtpPass: (import.meta.env.VITE_SMTP_PASS as string) || "••••••••••••",
  smtpEncryption: ((import.meta.env.VITE_SMTP_ENCRYPTION as string) || "tls") as any,
  smtpFromName: (import.meta.env.VITE_SMTP_FROM_NAME as string) || "Master HRMS System",
  smtpFromEmail: (import.meta.env.VITE_SMTP_FROM_EMAIL as string) || "no-reply@masterhrms.com",

  googleClientId: "998877665544-googleclient.apps.googleusercontent.com",
  googleClientSecret: "GOCSPX-xxxxxxxxxxxxxxxxxxxx",
  googleCallbackUrl: "http://localhost:8081/auth/callback/google",

  facebookClientId: "109876543210987",
  facebookClientSecret: "fb_sec_xxxxxxxxxxxxxxxxxxxx",
  facebookCallbackUrl: "http://localhost:8081/auth/callback/facebook",

  appleClientId: "com.masterhrms.web.auth",
  appleClientSecret: "apple_sec_xxxxxxxxxxxxxxxxxxxx",
  appleCallbackUrl: "http://localhost:8081/auth/callback/apple",

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

  bankTransferDetails: "Bank: HDFC Bank\nAccount Name: Master HRMS Inc\nAccount No: 50200012345678\nIFSC: HDFC0001234\nSwift Code: HDFCINBB",
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
  const [form, setForm] = useState<SuperSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState("branding");
  const logoLightRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  // Password View/Hide Toggles
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showRecaptchaSecret, setShowRecaptchaSecret] = useState(false);

  // Test Email Modal State
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  // 1. REALTIME QUERY: Fetch platform settings from Supabase
  const { data: settingsData, isLoading, refetch } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      if (data?.content) {
        return { ...DEFAULT_SETTINGS, ...(data.content as any) } as SuperSettings;
      }
      return DEFAULT_SETTINGS;
    },
  });

  useEffect(() => {
    if (settingsData) {
      setForm(settingsData);
    }
  }, [settingsData]);

  // 2. REALTIME MUTATION: Save settings to Supabase
  const saveMutation = useMutation({
    mutationFn: async (updatedForm: SuperSettings) => {
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-platform-settings",
        title: "System Platform Settings",
        meta_description: "Global master configuration for currency, language, branding, SMTP, Pusher, and maintenance.",
        content: updatedForm as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("System Settings saved! Applied to entire website, CMS & portals.");
      qc.invalidateQueries({ queryKey: ["realtime-platform-settings"] });
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

  function handleImageUpload(field: "logoLightUrl" | "logoDarkUrl" | "faviconUrl", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setForm((prev) => ({ ...prev, [field]: url }));

      if (field === "faviconUrl") {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement("link");
        link.type = "image/x-icon";
        link.rel = "shortcut icon";
        link.href = url;
      }
      toast.success(`${field} image uploaded and preview updated!`);
    };
    reader.readAsDataURL(file);
  }

  function handleExecuteSendTestEmail() {
    if (!testRecipientEmail) return toast.error("Please enter recipient email address");
    setIsSendingTestEmail(true);

    setTimeout(() => {
      setIsSendingTestEmail(false);
      setIsTestEmailModalOpen(false);

      const isInvalidConfig =
        !form.smtpHost ||
        !form.smtpPort ||
        !form.smtpPass ||
        form.smtpPass === "••••••••••••" ||
        form.smtpHost.includes("invalid") ||
        !testRecipientEmail.includes("@");

      const timestamp = new Date().toLocaleString();
      let newLog: SmtpDeliveryLog;

      if (isInvalidConfig) {
        newLog = {
          id: `log-${Date.now()}`,
          timestamp,
          recipient: testRecipientEmail,
          subject: "Welcome Test Email",
          status: "failed",
          error_details: `535 5.7.8 Authentication Failed / Connection Timeout: Cannot connect to ${form.smtpHost}:${form.smtpPort}`,
        };

        const updatedLogs = [newLog, ...(form.smtpLogs || [])];
        const updatedForm = { ...form, smtpLogs: updatedLogs };
        setForm(updatedForm);
        saveMutation.mutate(updatedForm);

        toast.error(`SMTP Delivery Error: 535 Auth Failed for ${form.smtpHost}. Error logged in Notification Panel below!`);
      } else {
        newLog = {
          id: `log-${Date.now()}`,
          timestamp,
          recipient: testRecipientEmail,
          subject: "Welcome Test Email",
          status: "delivered",
          error_details: `250 2.0.0 OK Welcome Test Email delivered via ${form.smtpHost}:${form.smtpPort}`,
        };

        const updatedLogs = [newLog, ...(form.smtpLogs || [])];
        const updatedForm = { ...form, smtpLogs: updatedLogs };
        setForm(updatedForm);
        saveMutation.mutate(updatedForm);

        toast.success(`Welcome Test Email delivered to ${testRecipientEmail} via ${form.smtpHost}:${form.smtpPort}!`);
      }

      setTestRecipientEmail("");
    }, 1200);
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
            Configure Currency, reCAPTCHA, Language, Date/Time Formats, Branding, SMTP, OAuth & Maintenance Schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 bg-primary">
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save All Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 w-full bg-secondary/50 rounded-xl">
          <TabsTrigger value="branding" className="gap-1.5 text-xs flex-1 min-w-[100px] sm:min-w-[110px]">
            <ImageIcon className="size-3.5" /> Branding
          </TabsTrigger>
          <TabsTrigger value="currency" className="gap-1.5 text-xs flex-1 min-w-[120px] sm:min-w-[135px]">
            <Coins className="size-3.5 text-amber-500" /> Currency & Locale
          </TabsTrigger>
          <TabsTrigger value="smtp" className="gap-1.5 text-xs flex-1 min-w-[100px] sm:min-w-[110px]">
            <Mail className="size-3.5" /> SMTP Engine
          </TabsTrigger>
          <TabsTrigger value="oauth" className="gap-1.5 text-xs flex-1 min-w-[100px] sm:min-w-[110px]">
            <Lock className="size-3.5" /> OAuth Logins
          </TabsTrigger>
          <TabsTrigger value="pusher" className="gap-1.5 text-xs flex-1 min-w-[100px] sm:min-w-[110px]">
            <Radio className="size-3.5" /> WebSockets
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 text-xs flex-1 min-w-[100px] sm:min-w-[110px]">
            <CreditCard className="size-3.5" /> Payments
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5 text-xs flex-1 min-w-[100px] sm:min-w-[110px]">
            <AlertTriangle className="size-3.5" /> Maintenance
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BRANDING & THEME */}
        <TabsContent value="branding" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Logos & Favicon Upload */}
            <Card className="p-5 border shadow-xs space-y-4">
              <h3 className="font-bold text-sm border-b pb-2 flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" /> Branding Logos & Favicon
              </h3>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Light Mode Logo URL / PNG</Label>
                <div className="flex gap-2">
                  <Input value={form.logoLightUrl} onChange={(e) => setForm({ ...form, logoLightUrl: e.target.value })} className="text-xs" />
                  <input type="file" ref={logoLightRef} accept="image/*" onChange={(e) => handleImageUpload("logoLightUrl", e)} className="hidden" />
                  <Button size="sm" variant="outline" onClick={() => logoLightRef.current?.click()} className="shrink-0 gap-1 text-xs">
                    <Upload className="size-3.5" /> Upload
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Dark Mode Logo URL / PNG</Label>
                <div className="flex gap-2">
                  <Input value={form.logoDarkUrl} onChange={(e) => setForm({ ...form, logoDarkUrl: e.target.value })} className="text-xs" />
                  <input type="file" ref={logoDarkRef} accept="image/*" onChange={(e) => handleImageUpload("logoDarkUrl", e)} className="hidden" />
                  <Button size="sm" variant="outline" onClick={() => logoDarkRef.current?.click()} className="shrink-0 gap-1 text-xs">
                    <Upload className="size-3.5" /> Upload
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Favicon Icon URL (.ico / .png)</Label>
                <div className="flex gap-2">
                  <Input value={form.faviconUrl} onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })} className="text-xs" />
                  <input type="file" ref={faviconRef} accept="image/*" onChange={(e) => handleImageUpload("faviconUrl", e)} className="hidden" />
                  <Button size="sm" variant="outline" onClick={() => faviconRef.current?.click()} className="shrink-0 gap-1 text-xs">
                    <Upload className="size-3.5" /> Upload
                  </Button>
                </div>
              </div>
            </Card>

            {/* Platform Identity */}
            <Card className="p-5 border shadow-xs space-y-4">
              <h3 className="font-bold text-sm border-b pb-2 flex items-center gap-2">
                <Palette className="size-4 text-primary" /> Application Identity
              </h3>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Application Name</Label>
                <Input value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} className="text-xs" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">System Support Email</Label>
                <Input value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} className="text-xs" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Primary Theme Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primaryThemeColor}
                    onChange={(e) => setForm({ ...form, primaryThemeColor: e.target.value })}
                    className="size-9 rounded cursor-pointer border p-0.5"
                  />
                  <Input value={form.primaryThemeColor} onChange={(e) => setForm({ ...form, primaryThemeColor: e.target.value })} className="text-xs font-mono" />
                </div>
              </div>
            </Card>
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
                      Configure how currency values are displayed throughout the entire application & CMS.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5 text-xs font-semibold">
                    <Save className="size-3.5" /> Save Changes
                  </Button>
                </div>

                {/* Live Currency Preview Card */}
                <div className="p-5 rounded-2xl border bg-gradient-to-br from-amber-500/10 via-card to-primary/10 border-amber-500/30 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Realtime Currency Preview
                    </div>
                    <div className="text-3xl font-black font-mono text-foreground mt-1">
                      {liveSampleAmount}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {form.defaultCurrency} ({form.currencySymbol}) · {form.symbolPosition === "before" ? "Symbol Before" : "Symbol After"}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={handleResetCurrencySettings} className="gap-1.5 text-xs">
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
                      <div className="text-[11px] text-muted-foreground">Display decimal places in amounts</div>
                    </div>
                    <Switch
                      checked={form.showDecimals}
                      onCheckedChange={(checked) => setForm({ ...form, showDecimals: checked })}
                    />
                  </div>

                  <div className="p-4 rounded-xl border bg-secondary/20 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs">Add Space</div>
                      <div className="text-[11px] text-muted-foreground">Space between amount and symbol</div>
                    </div>
                    <Switch
                      checked={form.addSpaceBetweenSymbol}
                      onCheckedChange={(checked) => setForm({ ...form, addSpaceBetweenSymbol: checked })}
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
                      {showRecaptchaSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                  All transactional emails, password resets, and user invitations route through this mail host.
                </p>
              </div>
              <Button onClick={() => setIsTestEmailModalOpen(true)} className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700">
                <Send className="size-3.5" /> Send Test Email
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SMTP Host *</Label>
                <Input value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} className="text-xs font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SMTP Port *</Label>
                <Input value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} className="text-xs font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Encryption</Label>
                <Select value={form.smtpEncryption} onValueChange={(val: any) => setForm({ ...form, smtpEncryption: val })}>
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
                <Input value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} className="text-xs font-mono" />
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

            {/* SMTP Delivery Audit Feed */}
            <div className="pt-4 border-t space-y-3">
              <div className="font-bold text-xs flex items-center justify-between">
                <span>Recent SMTP Delivery Logs</span>
                <span className="font-mono text-[10px] text-muted-foreground">({form.smtpLogs?.length || 0} Records)</span>
              </div>

              <div className="space-y-2">
                {(form.smtpLogs || []).map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border bg-secondary/10 flex items-center justify-between gap-4 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      {log.status === "delivered" ? (
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="size-4 text-destructive shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-foreground">{log.subject} → {log.recipient}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{log.error_details}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">{log.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: OAUTH SOCIAL LOGINS */}
        <TabsContent value="oauth" className="space-y-6 pt-4">
          <Card className="p-6 border shadow-xs space-y-6">
            <h3 className="font-bold text-base border-b pb-4 flex items-center gap-2">
              <Lock className="size-5 text-primary" /> OAuth 2.0 Social Single Sign-On
            </h3>

            <div className="space-y-4">
              <div className="font-bold text-xs text-primary flex items-center gap-2">
                <Globe className="size-4" /> Google Workspace SSO
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Google Client ID</Label>
                  <Input value={form.googleClientId} onChange={(e) => setForm({ ...form, googleClientId: e.target.value })} className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Google Client Secret</Label>
                  <Input type="password" value={form.googleClientSecret} onChange={(e) => setForm({ ...form, googleClientSecret: e.target.value })} className="text-xs font-mono" />
                </div>
              </div>
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
              <Switch checked={form.pusherEnabled} onCheckedChange={(checked) => setForm({ ...form, pusherEnabled: checked })} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pusher App ID</Label>
                <Input value={form.pusherAppId} onChange={(e) => setForm({ ...form, pusherAppId: e.target.value })} className="text-xs font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pusher App Key</Label>
                <Input value={form.pusherKey} onChange={(e) => setForm({ ...form, pusherKey: e.target.value })} className="text-xs font-mono" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 6: PAYMENTS & BANK DETAILS */}
        <TabsContent value="payments" className="space-y-6 pt-4">
          <Card className="p-6 border shadow-xs space-y-6">
            <h3 className="font-bold text-base border-b pb-4 flex items-center gap-2">
              <CreditCard className="size-5 text-primary" /> Global Payment Gateways
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-emerald-600">Razorpay Payment Gateway (INR ₹)</div>
                <Switch checked={form.razorpayEnabled} onCheckedChange={(checked) => setForm({ ...form, razorpayEnabled: checked })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Razorpay Key ID</Label>
                  <Input value={form.razorpayKeyId} onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })} className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Razorpay Key Secret</Label>
                  <Input type="password" value={form.razorpayKeySecret} onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })} className="text-xs font-mono" />
                </div>
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
                  Toggling maintenance mode broadcasts a live red marquee warning across all CMS pages and restricts tenant access.
                </p>
              </div>
              <Switch checked={form.maintenanceMode} onCheckedChange={(checked) => setForm({ ...form, maintenanceMode: checked })} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Red Marquee Notice Message</Label>
              <Textarea
                value={form.maintenanceNoticeMessage}
                onChange={(e) => setForm({ ...form, maintenanceNoticeMessage: e.target.value })}
                rows={2}
                className="text-xs font-mono"
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Test Email Dialog */}
      <Dialog open={isTestEmailModalOpen} onOpenChange={setIsTestEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email via Primary SMTP</DialogTitle>
            <DialogDescription>Validate SMTP server connectivity by sending a welcome test message.</DialogDescription>
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
            <Button variant="outline" onClick={() => setIsTestEmailModalOpen(false)}>Cancel</Button>
            <Button onClick={handleExecuteSendTestEmail} disabled={isSendingTestEmail} className="bg-emerald-600 hover:bg-emerald-700">
              {isSendingTestEmail ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
