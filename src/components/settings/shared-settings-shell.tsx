import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SettingsNestedNav,
  type SettingsNavCategory,
} from "@/components/settings/settings-nested-nav";
import { SecretField } from "@/components/settings/secret-field";
import { ProviderCard } from "@/components/settings/provider-card";
import { LivePreviewDock } from "@/components/settings/live-preview-dock";
import { UnsavedChangesBar } from "@/components/settings/unsaved-changes-bar";
import { MediaImageUploader } from "@/components/settings/media-image-uploader";
import {
  Sliders,
  Palette,
  Mail,
  Lock,
  CreditCard,
  HardDrive,
  ShieldCheck,
  Workflow,
  Wrench,
  Save,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Globe,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SharedSettingsShellProps {
  scope: "PLATFORM" | "TENANT";
  tenantId?: string;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

export function SharedSettingsShell({
  scope,
  tenantId,
  initialTab = "general",
  onTabChange,
  className,
}: SharedSettingsShellProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTabState] = useState<string>(initialTab);

  const handleSelectTab = (tab: string) => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Discard them and switch section?")) {
        return;
      }
    }
    setActiveTabState(tab);
    if (onTabChange) onTabChange(tab);
  };

  // ─── 1. FETCH PERSISTED SETTINGS FROM API ───────────────────────────
  // Queries for each settings group
  const queryUrlPrefix = `/v1/settings/${scope}`;
  const queryParams = scope === "TENANT" && tenantId ? `?tenantId=${tenantId}` : "";

  const {
    data: generalData,
    isLoading: loadingGeneral,
    refetch: refetchGeneral,
  } = useQuery({
    queryKey: ["settings", scope, tenantId, "general"],
    queryFn: async () => {
      const [branding, locale] = await Promise.all([
        api.get(`${queryUrlPrefix}/branding${queryParams}`).catch(() => ({ values: {} })),
        api.get(`${queryUrlPrefix}/locale${queryParams}`).catch(() => ({ values: {} })),
      ]);
      return {
        ...branding.values,
        ...locale.values,
      };
    },
  });

  const {
    data: emailData,
    isLoading: loadingEmail,
    refetch: refetchEmail,
  } = useQuery({
    queryKey: ["settings", scope, tenantId, "email"],
    queryFn: () => api.get(`${queryUrlPrefix}/email${queryParams}`).then((r: any) => r.values || {}).catch(() => ({})),
  });

  const {
    data: oauthData,
    isLoading: loadingOauth,
    refetch: refetchOauth,
  } = useQuery({
    queryKey: ["settings", scope, tenantId, "oauth"],
    queryFn: () => (scope === "PLATFORM" ? api.get(`${queryUrlPrefix}/oauth`).then((r: any) => r.values || {}).catch(() => ({})) : Promise.resolve({})),
    enabled: scope === "PLATFORM",
  });

  const {
    data: storageData,
    isLoading: loadingStorage,
    refetch: refetchStorage,
  } = useQuery({
    queryKey: ["settings", scope, tenantId, "storage"],
    queryFn: () => api.get(`${queryUrlPrefix}/storage${queryParams}`).then((r: any) => r.values || {}).catch(() => ({})),
  });

  const {
    data: securityData,
    isLoading: loadingSecurity,
    refetch: refetchSecurity,
  } = useQuery({
    queryKey: ["settings", scope, tenantId, "security"],
    queryFn: () => api.get(`${queryUrlPrefix}/security${queryParams}`).then((r: any) => r.values || {}).catch(() => ({})),
  });

  const {
    data: paymentsData,
    isLoading: loadingPayments,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ["settings", scope, tenantId, "payments"],
    queryFn: () => api.get(`${queryUrlPrefix}/payments${queryParams}`).then((r: any) => r.values || {}).catch(() => ({})),
  });

  const {
    data: systemData,
    isLoading: loadingSystem,
    refetch: refetchSystem,
  } = useQuery({
    queryKey: ["settings", scope, tenantId, "system"],
    queryFn: () => (scope === "PLATFORM" ? api.get(`${queryUrlPrefix}/system`).then((r: any) => r.values || {}).catch(() => ({})) : Promise.resolve({})),
    enabled: scope === "PLATFORM",
  });

  // Consolidated persisted state
  const persistedSettings = useMemo(() => {
    return {
      ...(generalData || {}),
      ...(emailData || {}),
      ...(oauthData || {}),
      ...(storageData || {}),
      ...(securityData || {}),
      ...(paymentsData || {}),
      ...(systemData || {}),
    };
  }, [generalData, emailData, oauthData, storageData, securityData, paymentsData, systemData]);

  // Form State
  const [form, setForm] = useState<Record<string, any>>({});
  const [initialFormLoaded, setInitialFormLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (Object.keys(persistedSettings).length > 0 && !initialFormLoaded) {
      setForm(persistedSettings);
      setInitialFormLoaded(true);
    }
  }, [persistedSettings, initialFormLoaded]);

  // When remote settings refresh, update form if not dirty
  const isDirty = useMemo(() => {
    if (!initialFormLoaded) return false;
    for (const [k, v] of Object.entries(form)) {
      if (k.startsWith("_")) continue;
      if (persistedSettings[k] !== undefined && persistedSettings[k] !== v) {
        return true;
      }
    }
    return false;
  }, [form, persistedSettings, initialFormLoaded]);

  const updateFormField = useCallback((key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── 2. SAVE MUTATION ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Group dirty keys by settings group
      const groupsToSave: Record<string, Record<string, any>> = {};

      for (const [key, value] of Object.entries(form)) {
        if (key.startsWith("_")) continue;
        if (persistedSettings[key] !== value) {
          const [group] = key.split(".");
          if (!groupsToSave[group]) groupsToSave[group] = {};
          groupsToSave[group][key] = value;
        }
      }

      const results = [];
      for (const [group, payload] of Object.entries(groupsToSave)) {
        const res = await api.put(`${queryUrlPrefix}/${group}${queryParams}`, payload);
        results.push(res);
      }
      return results;
    },
    onSuccess: () => {
      toast.success("Settings saved and activated successfully");
      qc.invalidateQueries({ queryKey: ["settings", scope] });
      qc.invalidateQueries({ queryKey: ["app-config"] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to save settings";
      toast.error(msg);
    },
  });

  const handleDiscard = () => {
    setForm(persistedSettings);
    toast.info("Unsaved modifications reverted");
  };

  // ─── 3. REALTIME SOCKET.IO LISTENER ─────────────────────────────────
  const [remoteUpdateAlert, setRemoteUpdateAlert] = useState<string | null>(null);

  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      const detail = e.detail;
      if (detail?.scope === scope) {
        if (scope === "TENANT" && detail.tenantId !== tenantId) return;
        if (isDirty) {
          setRemoteUpdateAlert(`Remote changes detected for group '${detail.group}'. Save your edits or refresh.`);
        } else {
          qc.invalidateQueries({ queryKey: ["settings", scope] });
          toast.info(`Settings hot-reloaded: group '${detail.group}' updated`);
        }
      }
    };

    window.addEventListener("settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdated);
    };
  }, [scope, tenantId, isDirty, qc]);

  // ─── 4. CANONICAL 9-CATEGORY NAVIGATION ─────────────────────────────
  const SETTINGS_CATEGORIES: SettingsNavCategory[] = useMemo(() => {
    return [
      {
        id: "general",
        label: "General & Locale",
        description: "Application name, support email, locale and currency",
        icon: Sliders,
        items: [
          {
            id: "general",
            label: "General Settings",
            description: "System identity, support contact and localization",
          },
        ],
      },
      {
        id: "branding",
        label: "Branding & Identity",
        description: "White-label logos, favicon, accent colors and footer",
        icon: Palette,
        items: [
          {
            id: "branding",
            label: "Branding Assets",
            description: "Light/dark logos, favicon and color palette",
          },
        ],
      },
      {
        id: "communication",
        label: "Communication",
        description: "SMTP mail server and SMS gateways",
        icon: Mail,
        items: [
          {
            id: "communication",
            label: "Email & SMS Engines",
            description: "Transporter pooling, SMTP credentials and SMS provider",
          },
        ],
      },
      {
        id: "authentication",
        label: "Authentication",
        description: "OAuth 2.0 social sign-in and session policies",
        icon: Lock,
        hidden: scope === "TENANT", // OAuth is strictly PLATFORM scope
        items: [
          {
            id: "authentication",
            label: "OAuth & Sessions",
            description: "Google, GitHub, Microsoft and session security",
          },
        ],
      },
      {
        id: "payments",
        label: "Payments",
        description: "Payment gateways, Razorpay and bank settlement",
        icon: CreditCard,
        items: [
          {
            id: "payments",
            label: scope === "PLATFORM" ? "Platform Billing" : "Invoicing Gateways",
            description: scope === "PLATFORM" ? "Razorpay, Stripe & Bank wire for subscriptions" : "Customer invoicing and collection gateways",
          },
        ],
      },
      {
        id: "storage",
        label: "Storage",
        description: "Local encrypted disk and S3-compatible cloud buckets",
        icon: HardDrive,
        items: [
          {
            id: "storage",
            label: "Storage Drivers",
            description: "Local AES-256 storage and S3/Wasabi adapters",
          },
        ],
      },
      {
        id: "security",
        label: "Security",
        description: "Password policies, 2FA enforcement and IP allowlist",
        icon: ShieldCheck,
        items: [
          {
            id: "security",
            label: "Security Controls",
            description: "Rate limits, lockouts and password rules",
          },
        ],
      },
      {
        id: "integrations",
        label: "Integrations",
        description: "Webhooks, biometric connectors and Slack sync",
        icon: Workflow,
        items: [
          {
            id: "integrations",
            label: "Integration Connectors",
            description: "External systems and event dispatchers",
          },
        ],
      },
      {
        id: "system",
        label: "System & Operations",
        description: "Maintenance mode and runtime diagnostics",
        icon: Wrench,
        hidden: scope === "TENANT", // Platform Super Admin only
        items: [
          {
            id: "system",
            label: "Platform Maintenance",
            description: "Emergency maintenance and administrator bypass",
          },
        ],
      },
    ];
  }, [scope]);

  const activeCategory = useMemo(() => {
    for (const cat of SETTINGS_CATEGORIES) {
      if (cat.items.some((i) => i.id === activeTab)) return cat;
    }
    return SETTINGS_CATEGORIES[0];
  }, [SETTINGS_CATEGORIES, activeTab]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Remote update notification banner */}
      {remoteUpdateAlert && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{remoteUpdateAlert}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRemoteUpdateAlert(null);
              qc.invalidateQueries({ queryKey: ["settings", scope] });
            }}
            className="h-7 text-xs"
          >
            Refresh Now
          </Button>
        </div>
      )}

      {/* Main Grid: Nav + Form + Live Preview Dock */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Nested Nav */}
        <div className="md:col-span-3">
          <SettingsNestedNav
            categories={SETTINGS_CATEGORIES}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            title={scope === "PLATFORM" ? "Platform Settings" : "Workspace Settings"}
            subtitle={scope === "PLATFORM" ? "Global Configuration" : "Tenant Organization"}
          />
        </div>

        {/* Center: Dynamic Category Form */}
        <div className="md:col-span-9 xl:col-span-5 space-y-6">
          {/* ─── 1. GENERAL & LOCALE ─────────────────────────────────── */}
          {activeTab === "general" && (
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-base font-semibold">General & Localization</CardTitle>
                <CardDescription className="text-xs">
                  Primary identity and display format rules for {scope === "PLATFORM" ? "the platform" : "this workspace"}.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="app_name" className="text-xs font-semibold">Application / Workspace Name</Label>
                  <Input
                    id="app_name"
                    value={form["branding.app_name"] || ""}
                    onChange={(e) => updateFormField("branding.app_name", e.target.value)}
                    placeholder="e.g. Master HRMS"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="support_email" className="text-xs font-semibold">Support Email Address</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={form["branding.support_email"] || ""}
                    onChange={(e) => updateFormField("branding.support_email", e.target.value)}
                    placeholder="support@example.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Currency Code</Label>
                    <Select
                      value={form["locale.default_currency"] || "INR"}
                      onValueChange={(val) => updateFormField("locale.default_currency", val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹ - Indian Rupee)</SelectItem>
                        <SelectItem value="USD">USD ($ - US Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (€ - Euro)</SelectItem>
                        <SelectItem value="GBP">GBP (£ - British Pound)</SelectItem>
                        <SelectItem value="AED">AED (د.إ - UAE Dirham)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date Format</Label>
                    <Select
                      value={form["locale.date_format"] || "DD-MM-YYYY"}
                      onValueChange={(val) => updateFormField("locale.date_format", val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD-MM-YYYY">DD-MM-YYYY (12-10-2026)</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-10-12)</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (10/12/2026)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Timezone</Label>
                  <Input
                    value={form["locale.timezone"] || "Asia/Kolkata"}
                    onChange={(e) => updateFormField("locale.timezone", e.target.value)}
                    placeholder="e.g. Asia/Kolkata, UTC, America/New_York"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── 2. BRANDING & ASSETS ─────────────────────────────────── */}
          {activeTab === "branding" && (
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-base font-semibold">Branding & Appearance</CardTitle>
                <CardDescription className="text-xs">
                  Logos, favicon, primary theme color, and copyright text.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="primary_color" className="text-xs font-semibold">Primary Theme Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primary_color_picker"
                      value={form["branding.primary_color"] || "#2563EB"}
                      onChange={(e) => updateFormField("branding.primary_color", e.target.value)}
                      className="size-9 rounded-md border border-border cursor-pointer p-0.5 bg-transparent"
                    />
                    <Input
                      id="primary_color"
                      value={form["branding.primary_color"] || "#2563EB"}
                      onChange={(e) => updateFormField("branding.primary_color", e.target.value)}
                      placeholder="#2563EB"
                      className="h-9 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="footer_text" className="text-xs font-semibold">Portal Footer Copyright</Label>
                  <Input
                    id="footer_text"
                    value={form["branding.footer_text"] || ""}
                    onChange={(e) => updateFormField("branding.footer_text", e.target.value)}
                    placeholder="© 2026 Master HRMS. All rights reserved."
                    className="h-9 text-xs"
                  />
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
                    Asset Integration
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Upload vector (.svg) or optimized WebP (.webp) logos to ensure high DPI clarity in light and dark mode.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── 3. COMMUNICATION (SMTP & SMS) ───────────────────────── */}
          {activeTab === "communication" && (
            <div className="space-y-4">
              <ProviderCard
                id="smtp-provider"
                title="SMTP Mail Server"
                description="Custom mail transport for verification emails, payslips, and system notifications"
                icon={<Mail className="size-4" />}
                enabled={true}
                onToggleEnabled={() => {}}
                scope={scope}
                group="email"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">SMTP Host</Label>
                    <Input
                      value={form["email.smtp_host"] || ""}
                      onChange={(e) => updateFormField("email.smtp_host", e.target.value)}
                      placeholder="smtp.mailgun.org"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">SMTP Port</Label>
                    <Input
                      type="number"
                      value={form["email.smtp_port"] || 587}
                      onChange={(e) => updateFormField("email.smtp_port", parseInt(e.target.value) || 587)}
                      placeholder="587"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Username / API Key</Label>
                    <Input
                      value={form["email.smtp_user"] || ""}
                      onChange={(e) => updateFormField("email.smtp_user", e.target.value)}
                      placeholder="postmaster@yourdomain.com"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <SecretField
                    id="smtp_password"
                    label="SMTP Password"
                    hasSavedSecret={Boolean(persistedSettings["email.smtp_password"])}
                    value={form["email.smtp_password"] || ""}
                    onChange={(val) => updateFormField("email.smtp_password", val)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">From Sender Address</Label>
                    <Input
                      value={form["email.from_email"] || ""}
                      onChange={(e) => updateFormField("email.from_email", e.target.value)}
                      placeholder="no-reply@yourdomain.com"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sender Display Name</Label>
                    <Input
                      value={form["email.from_name"] || ""}
                      onChange={(e) => updateFormField("email.from_name", e.target.value)}
                      placeholder="Master HRMS Notifications"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <Label className="text-xs font-semibold">Ignore TLS Certificate Verification</Label>
                    <p className="text-[11px] text-muted-foreground">Allow self-signed certificates or test mail relays</p>
                  </div>
                  <Switch
                    checked={form["email.ignore_tls"] ?? false}
                    onCheckedChange={(checked) => updateFormField("email.ignore_tls", checked)}
                  />
                </div>
              </ProviderCard>

              <ProviderCard
                id="sms-provider"
                title="SMS Notification Gateway"
                description="Fast2SMS, MSG91 or Twilio SMS gateway for OTP logins and alerts"
                icon={<Smartphone className="size-4" />}
                enabled={form["messaging.sms_enabled"] ?? true}
                onToggleEnabled={(c) => updateFormField("messaging.sms_enabled", c)}
                scope={scope}
                group="sms"
                providerKey={form["messaging.sms_provider"] || "mock-sandbox"}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Active Provider</Label>
                    <Select
                      value={form["messaging.sms_provider"] || "mock-sandbox"}
                      onValueChange={(val) => updateFormField("messaging.sms_provider", val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mock-sandbox">Mock Sandbox (Test Double)</SelectItem>
                        <SelectItem value="fast2sms">Fast2SMS (India DLT)</SelectItem>
                        <SelectItem value="msg91">MSG91 (Global / India)</SelectItem>
                        <SelectItem value="twilio">Twilio (Global)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sender ID / DLT Header</Label>
                    <Input
                      value={form["messaging.sms_sender_id"] || ""}
                      onChange={(e) => updateFormField("messaging.sms_sender_id", e.target.value)}
                      placeholder="MSTRHR"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </ProviderCard>
            </div>
          )}

          {/* ─── 4. AUTHENTICATION (OAUTH & POLICIES - PLATFORM ONLY) ── */}
          {activeTab === "authentication" && scope === "PLATFORM" && (
            <div className="space-y-4">
              <ProviderCard
                id="google-oauth"
                title="Google OAuth 2.0"
                description="Allow users to sign in with their Google Workspace or Gmail accounts"
                enabled={form["oauth.google_enabled"] ?? false}
                onToggleEnabled={(c) => updateFormField("oauth.google_enabled", c)}
                scope="PLATFORM"
                group="oauth"
                providerKey="google"
                callbackUrl={`${window.location.origin}/api/v1/auth/google/callback`}
                setupDocsUrl="https://console.cloud.google.com/apis/credentials"
              >
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Google Client ID</Label>
                    <Input
                      value={form["oauth.google_client_id"] || ""}
                      onChange={(e) => updateFormField("oauth.google_client_id", e.target.value)}
                      placeholder="xxxxxxxx.apps.googleusercontent.com"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <SecretField
                    id="google_client_secret"
                    label="Google Client Secret"
                    hasSavedSecret={Boolean(persistedSettings["oauth.google_client_secret"])}
                    value={form["oauth.google_client_secret"] || ""}
                    onChange={(val) => updateFormField("oauth.google_client_secret", val)}
                  />
                </div>
              </ProviderCard>

              <ProviderCard
                id="github-oauth"
                title="GitHub OAuth"
                description="Social sign-in for developers and engineering teams"
                enabled={form["oauth.github_enabled"] ?? false}
                onToggleEnabled={(c) => updateFormField("oauth.github_enabled", c)}
                scope="PLATFORM"
                group="oauth"
                providerKey="github"
                callbackUrl={`${window.location.origin}/api/v1/auth/github/callback`}
                setupDocsUrl="https://github.com/settings/developers"
              >
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">GitHub Client ID</Label>
                    <Input
                      value={form["oauth.github_client_id"] || ""}
                      onChange={(e) => updateFormField("oauth.github_client_id", e.target.value)}
                      placeholder="Iv1.xxxxxxxxxxxx"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <SecretField
                    id="github_client_secret"
                    label="GitHub Client Secret"
                    hasSavedSecret={Boolean(persistedSettings["oauth.github_client_secret"])}
                    value={form["oauth.github_client_secret"] || ""}
                    onChange={(val) => updateFormField("oauth.github_client_secret", val)}
                  />
                </div>
              </ProviderCard>

              <ProviderCard
                id="microsoft-oauth"
                title="Microsoft Azure AD"
                description="Enterprise SSO sign-in via Microsoft 365 and Entra ID"
                enabled={form["oauth.microsoft_enabled"] ?? false}
                onToggleEnabled={(c) => updateFormField("oauth.microsoft_enabled", c)}
                scope="PLATFORM"
                group="oauth"
                providerKey="microsoft"
                callbackUrl={`${window.location.origin}/api/v1/auth/microsoft/callback`}
              >
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Application (Client) ID</Label>
                    <Input
                      value={form["oauth.microsoft_client_id"] || ""}
                      onChange={(e) => updateFormField("oauth.microsoft_client_id", e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <SecretField
                    id="microsoft_client_secret"
                    label="Client Secret Value"
                    hasSavedSecret={Boolean(persistedSettings["oauth.microsoft_client_secret"])}
                    value={form["oauth.microsoft_client_secret"] || ""}
                    onChange={(val) => updateFormField("oauth.microsoft_client_secret", val)}
                  />
                </div>
              </ProviderCard>
            </div>
          )}

          {/* ─── 5. PAYMENTS & GATEWAYS ───────────────────────────────── */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <ProviderCard
                id="razorpay-provider"
                title="Razorpay Payment Gateway"
                description={
                  scope === "PLATFORM"
                    ? "Commercial SaaS subscription billing (system-platform-settings)"
                    : "Customer invoicing and POS collections (tenant-specific)"
                }
                icon={<CreditCard className="size-4" />}
                enabled={form["payments.razorpay_enabled"] ?? false}
                onToggleEnabled={(c) => updateFormField("payments.razorpay_enabled", c)}
                scope={scope}
                group="payments"
                providerKey="razorpay"
              >
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Razorpay Key ID</Label>
                    <Input
                      value={form["payments.razorpay_key_id"] || ""}
                      onChange={(e) => updateFormField("payments.razorpay_key_id", e.target.value)}
                      placeholder="rzp_test_xxxxxxxxxxxx"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <SecretField
                    id="razorpay_key_secret"
                    label="Razorpay Key Secret"
                    hasSavedSecret={Boolean(persistedSettings["payments.razorpay_key_secret"])}
                    value={form["payments.razorpay_key_secret"] || ""}
                    onChange={(val) => updateFormField("payments.razorpay_key_secret", val)}
                  />
                </div>
              </ProviderCard>

              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="border-b border-border/40 pb-3">
                  <CardTitle className="text-sm font-semibold">Bank Wire Settlement</CardTitle>
                  <CardDescription className="text-xs">
                    Offline bank transfer instructions printed on customer invoices.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold">Enable Bank Transfer Option</Label>
                      <p className="text-[11px] text-muted-foreground">Allows manual invoice settlement verification</p>
                    </div>
                    <Switch
                      checked={form["payments.bank_transfer_enabled"] ?? false}
                      onCheckedChange={(c) => updateFormField("payments.bank_transfer_enabled", c)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Bank Wire Settlement Details</Label>
                    <Textarea
                      value={form["payments.bank_details"] || ""}
                      onChange={(e) => updateFormField("payments.bank_details", e.target.value)}
                      placeholder="Bank: HDFC Bank&#10;A/C No: 50200012345678&#10;IFSC: HDFC0000123&#10;Beneficiary: Master HRMS Technologies Private Limited"
                      className="text-xs font-mono h-24"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── 6. STORAGE DRIVERS ──────────────────────────────────── */}
          {activeTab === "storage" && (
            <ProviderCard
              id="storage-provider"
              title="Storage Driver"
              description="Configure file upload storage destination with fail-closed security"
              icon={<HardDrive className="size-4" />}
              enabled={true}
              onToggleEnabled={() => {}}
              scope={scope}
              group="storage"
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Storage Provider</Label>
                  <Select
                    value={form["storage.driver"] || "local"}
                    onValueChange={(val) => updateFormField("storage.driver", val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Encrypted Disk (AES-256)</SelectItem>
                      <SelectItem value="s3">AWS S3 / Cloudflare R2 / MinIO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form["storage.driver"] === "s3" && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">S3 Bucket Name</Label>
                        <Input
                          value={form["storage.s3_bucket"] || ""}
                          onChange={(e) => updateFormField("storage.s3_bucket", e.target.value)}
                          placeholder="my-company-assets"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Region</Label>
                        <Input
                          value={form["storage.s3_region"] || "ap-south-1"}
                          onChange={(e) => updateFormField("storage.s3_region", e.target.value)}
                          placeholder="ap-south-1"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Custom Endpoint (Optional for R2/MinIO)</Label>
                      <Input
                        value={form["storage.s3_endpoint"] || ""}
                        onChange={(e) => updateFormField("storage.s3_endpoint", e.target.value)}
                        placeholder="https://s3.ap-south-1.amazonaws.com"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Access Key ID</Label>
                        <Input
                          value={form["storage.s3_access_key"] || ""}
                          onChange={(e) => updateFormField("storage.s3_access_key", e.target.value)}
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <SecretField
                        id="s3_secret_key"
                        label="Secret Access Key"
                        hasSavedSecret={Boolean(persistedSettings["storage.s3_secret_key"])}
                        value={form["storage.s3_secret_key"] || ""}
                        onChange={(val) => updateFormField("storage.s3_secret_key", val)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold">Max Upload File Size (MB)</Label>
                  <Input
                    type="number"
                    value={form["storage.max_file_size_mb"] || 10}
                    onChange={(e) => updateFormField("storage.max_file_size_mb", parseInt(e.target.value) || 10)}
                    className="h-8 text-xs font-mono max-w-[120px]"
                  />
                </div>
              </div>
            </ProviderCard>
          )}

          {/* ─── 7. SECURITY & ACCESS CONTROLS ───────────────────────── */}
          {activeTab === "security" && (
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-base font-semibold">Security & Authentication Controls</CardTitle>
                <CardDescription className="text-xs">
                  Session timeouts, failed login thresholds, and password complexity.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold">Enforce Two-Factor Authentication (2FA)</Label>
                    <p className="text-[11px] text-muted-foreground">Require all users to verify TOTP tokens at sign-in</p>
                  </div>
                  <Switch
                    checked={form["security.mfa_enforced"] ?? false}
                    onCheckedChange={(c) => updateFormField("security.mfa_enforced", c)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Inactivity Timeout (Minutes)</Label>
                    <Input
                      type="number"
                      value={form["security.session_timeout_minutes"] || 1440}
                      onChange={(e) => updateFormField("security.session_timeout_minutes", parseInt(e.target.value) || 1440)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Max Failed Login Attempts</Label>
                    <Input
                      type="number"
                      value={form["security.max_login_attempts"] || 5}
                      onChange={(e) => updateFormField("security.max_login_attempts", parseInt(e.target.value) || 5)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Lockout Duration (Minutes)</Label>
                    <Input
                      type="number"
                      value={form["security.lockout_duration_minutes"] || 15}
                      onChange={(e) => updateFormField("security.lockout_duration_minutes", parseInt(e.target.value) || 15)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Minimum Password Length</Label>
                    <Input
                      type="number"
                      value={form["security.password_min_length"] || 8}
                      onChange={(e) => updateFormField("security.password_min_length", parseInt(e.target.value) || 8)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold">IP Allowlist (Comma-separated CIDRs)</Label>
                  <Input
                    value={form["security.ip_allowlist"] || ""}
                    onChange={(e) => updateFormField("security.ip_allowlist", e.target.value)}
                    placeholder="e.g. 192.168.1.0/24, 10.0.0.1 (empty allows all)"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── 8. INTEGRATIONS ─────────────────────────────────────── */}
          {activeTab === "integrations" && (
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-base font-semibold">Integration Hub</CardTitle>
                <CardDescription className="text-xs">
                  Biometric attendance clocks, Webhooks, and automated connectors.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">Biometric Clock Sync</span>
                    <p className="text-[11px] text-muted-foreground">ZKTeco and eSSL device attendance synchronization</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    READY
                  </Badge>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">Outbox Webhook Dispatcher</span>
                    <p className="text-[11px] text-muted-foreground">Transactional HMAC-signed events to custom endpoints</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono bg-blue-500/10 text-blue-600 border-blue-500/20">
                    ACTIVE
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── 9. SYSTEM OPERATIONS (PLATFORM ONLY) ────────────────── */}
          {activeTab === "system" && scope === "PLATFORM" && (
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-base font-semibold">Platform System & Maintenance</CardTitle>
                <CardDescription className="text-xs">
                  Scheduled downtime broadcasts and emergency maintenance lockouts.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/30 bg-destructive/5">
                  <div>
                    <Label className="text-xs font-semibold text-destructive">Emergency Maintenance Mode</Label>
                    <p className="text-[11px] text-muted-foreground">Locks access for all regular tenant users immediately</p>
                  </div>
                  <Switch
                    checked={form["system.maintenance_mode"] ?? false}
                    onCheckedChange={(c) => updateFormField("system.maintenance_mode", c)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Maintenance Announcement Banner</Label>
                  <Textarea
                    value={form["system.maintenance_message"] || ""}
                    onChange={(e) => updateFormField("system.maintenance_message", e.target.value)}
                    placeholder="Master HRMS is currently undergoing maintenance..."
                    className="h-20 text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Interactive Live Preview Dock */}
        <div className="hidden xl:block xl:col-span-4">
          <LivePreviewDock
            appName={form["branding.app_name"] || "Master HRMS"}
            primaryColor={form["branding.primary_color"] || "#2563EB"}
            logoLightUrl={form["branding.logo_light_id"] || "/logo.webp"}
            logoDarkUrl={form["branding.logo_dark_id"] || "/white-logo.webp"}
            footerText={form["branding.footer_text"] || "© 2026 Master HRMS. All rights reserved."}
            currencyCode={form["locale.default_currency"] || "INR"}
            dateFormat={form["locale.date_format"] || "DD-MM-YYYY"}
            timezone={form["locale.timezone"] || "Asia/Kolkata"}
            companyLegalName={form["branding.app_name"]}
            companyAddress={form["companyAddress"]}
            companyGstin={form["companyGstin"]}
            bankDetails={form["payments.bank_details"]}
          />
        </div>
      </div>

      {/* Sticky Unsaved Changes Bar */}
      <UnsavedChangesBar
        isDirty={isDirty}
        isSaving={saveMutation.isPending}
        sectionTitle={activeCategory?.label || "Settings"}
        onSave={() => saveMutation.mutate()}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
