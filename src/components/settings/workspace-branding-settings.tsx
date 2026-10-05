import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { MediaImageUploader } from "@/components/settings/media-image-uploader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Palette,
  RotateCcw,
  Save,
  CheckCircle2,
  Sparkles,
  Info,
  Building2,
  Sliders,
  Sun,
  Moon,
  ExternalLink,
} from "lucide-react";
import { applyThemeVariables } from "@/lib/useAppConfig";

interface BrandingItem {
  key: string;
  value: any;
  mediaUrl?: string;
  source: "TENANT" | "PLATFORM" | "DEFAULT";
  hasTenantOverride: boolean;
  fallbackValue?: any;
  fallbackMediaUrl?: string;
}

interface BrandingResponse {
  values: {
    "branding.primary_color"?: string;
    "branding.logo_light_id"?: string | null;
    "branding.logo_dark_id"?: string | null;
    "branding.favicon_id"?: string | null;
    "branding.app_name"?: string;
    "branding.footer_text"?: string;
    [key: string]: any;
  };
  mediaUrls: {
    "branding.logo_light_id"?: string;
    "branding.logo_dark_id"?: string;
    "branding.favicon_id"?: string;
    [key: string]: string | undefined;
  };
  version: number;
  overrides?: Record<string, boolean>;
  sources?: Record<string, "TENANT" | "PLATFORM" | "DEFAULT">;
  items?: Record<string, BrandingItem>;
  platformFallbacks?: {
    values: Record<string, any>;
    mediaUrls: Record<string, string>;
  };
}

const PRESET_COLORS = [
  { name: "Master Orange", hex: "#FF6B00" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Deep Indigo", hex: "#6366F1" },
  { name: "Violet Modern", hex: "#8B5CF6" },
  { name: "Crimson Rose", hex: "#F43F5E" },
  { name: "Amber Glow", hex: "#F59E0B" },
  { name: "Teal Cyber", hex: "#14B8A6" },
];

export function WorkspaceBrandingSettings() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || profile?.tenantId;

  // 1. Fetch current workspace branding with platform fallback
  const { data: brandingData, isLoading, refetch } = useQuery<BrandingResponse>({
    queryKey: ["tenant-settings-branding", tenantId],
    queryFn: async () => {
      const res = await api.get<BrandingResponse>("/v1/settings/TENANT/branding");
      return res;
    },
    enabled: !!tenantId,
  });

  // Local editing form state
  const [form, setForm] = useState<{
    primaryColor: string;
    logoLightId: string | null;
    logoDarkId: string | null;
    faviconId: string | null;
    logoLightUrl?: string;
    logoDarkUrl?: string;
    faviconUrl?: string;
    hasLightOverride: boolean;
    hasDarkOverride: boolean;
    hasFaviconOverride: boolean;
  }>({
    primaryColor: "#FF6B00",
    logoLightId: null,
    logoDarkId: null,
    faviconId: null,
    hasLightOverride: false,
    hasDarkOverride: false,
    hasFaviconOverride: false,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [previewThemeMode, setPreviewThemeMode] = useState<"light" | "dark">("light");

  // Sync form when backend data loads
  useEffect(() => {
    if (brandingData) {
      const items = brandingData.items;
      const lightOverride =
        items?.["branding.logo_light_id"]?.hasTenantOverride ??
        !!brandingData.overrides?.["branding.logo_light_id"];
      const darkOverride =
        items?.["branding.logo_dark_id"]?.hasTenantOverride ??
        !!brandingData.overrides?.["branding.logo_dark_id"];
      const favOverride =
        items?.["branding.favicon_id"]?.hasTenantOverride ??
        !!brandingData.overrides?.["branding.favicon_id"];

      setForm({
        primaryColor: brandingData.values["branding.primary_color"] || "#FF6B00",
        // CRITICAL FIX: Only pre-fill custom media ID if tenant override ACTUALLY exists!
        // If inheriting from platform, keep null so saving does not corrupt tenant scope with platform ID!
        logoLightId: lightOverride ? (brandingData.values["branding.logo_light_id"] || null) : null,
        logoDarkId: darkOverride ? (brandingData.values["branding.logo_dark_id"] || null) : null,
        faviconId: favOverride ? (brandingData.values["branding.favicon_id"] || null) : null,
        logoLightUrl: lightOverride ? brandingData.mediaUrls["branding.logo_light_id"] : undefined,
        logoDarkUrl: darkOverride ? brandingData.mediaUrls["branding.logo_dark_id"] : undefined,
        faviconUrl: favOverride ? brandingData.mediaUrls["branding.favicon_id"] : undefined,
        hasLightOverride: lightOverride,
        hasDarkOverride: darkOverride,
        hasFaviconOverride: favOverride,
      });
      setIsDirty(false);
    }
  }, [brandingData]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return await api.put("/v1/settings/TENANT/branding", payload);
    },
    onSuccess: (result: any) => {
      toast.success("Workspace branding saved successfully!");
      setIsDirty(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["tenant-settings-branding"] });
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });

      // Apply theme locally
      if (form.primaryColor) {
        applyThemeVariables(form.primaryColor);
      }

      // Broadcast to other tabs for this tenant
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("masterhrms_settings");
          bc.postMessage({
            type: "settings_updated",
            scope: "TENANT",
            tenantId,
            primaryColor: form.primaryColor,
          });
          bc.close();
        }
      } catch {}
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save workspace branding");
    },
  });

  // Reset Mutation (removes all tenant overrides and falls back to platform)
  const resetMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/v1/settings/TENANT/branding/reset");
    },
    onSuccess: () => {
      toast.success("All branding overrides reset to Platform defaults.");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["tenant-settings-branding"] });
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset branding");
    },
  });

  const handleSave = () => {
    const payload: Record<string, any> = {
      "branding.primary_color": form.primaryColor,
      "branding.logo_light_id": form.logoLightId, // null cleans up override
      "branding.logo_dark_id": form.logoDarkId,   // null cleans up override
      "branding.favicon_id": form.faviconId,       // null cleans up override
    };
    saveMutation.mutate(payload);
  };

  const handleDiscard = () => {
    if (brandingData) {
      const items = brandingData.items;
      const lightOverride =
        items?.["branding.logo_light_id"]?.hasTenantOverride ??
        !!brandingData.overrides?.["branding.logo_light_id"];
      const darkOverride =
        items?.["branding.logo_dark_id"]?.hasTenantOverride ??
        !!brandingData.overrides?.["branding.logo_dark_id"];
      const favOverride =
        items?.["branding.favicon_id"]?.hasTenantOverride ??
        !!brandingData.overrides?.["branding.favicon_id"];

      setForm({
        primaryColor: brandingData.values["branding.primary_color"] || "#FF6B00",
        logoLightId: lightOverride ? (brandingData.values["branding.logo_light_id"] || null) : null,
        logoDarkId: darkOverride ? (brandingData.values["branding.logo_dark_id"] || null) : null,
        faviconId: favOverride ? (brandingData.values["branding.favicon_id"] || null) : null,
        logoLightUrl: lightOverride ? brandingData.mediaUrls["branding.logo_light_id"] : undefined,
        logoDarkUrl: darkOverride ? brandingData.mediaUrls["branding.logo_dark_id"] : undefined,
        faviconUrl: favOverride ? brandingData.mediaUrls["branding.favicon_id"] : undefined,
        hasLightOverride: lightOverride,
        hasDarkOverride: darkOverride,
        hasFaviconOverride: favOverride,
      });
      setIsDirty(false);
      toast.info("Changes discarded.");
    }
  };

  // Revert single field to platform default
  const handleRevertField = (field: "primary_color" | "logo_light_id" | "logo_dark_id" | "favicon_id") => {
    if (field === "primary_color") {
      setForm((prev) => ({ ...prev, primaryColor: "" }));
      setIsDirty(true);
      toast.info(`Primary color set to revert to Platform Default on save.`);
    } else if (field === "logo_light_id") {
      setForm((prev) => ({
        ...prev,
        logoLightId: null,
        logoLightUrl: undefined,
        hasLightOverride: false,
      }));
      setIsDirty(true);
      toast.info("Light logo reverted to Platform Default. Save changes to persist.");
    } else if (field === "logo_dark_id") {
      setForm((prev) => ({
        ...prev,
        logoDarkId: null,
        logoDarkUrl: undefined,
        hasDarkOverride: false,
      }));
      setIsDirty(true);
      toast.info("Dark logo reverted to Platform Default. Save changes to persist.");
    } else if (field === "favicon_id") {
      setForm((prev) => ({
        ...prev,
        faviconId: null,
        faviconUrl: undefined,
        hasFaviconOverride: false,
      }));
      setIsDirty(true);
      toast.info("Favicon reverted to Platform Default. Save changes to persist.");
    }
  };

  const overrides = brandingData?.overrides || {};

  // Compute authoritative fallback URLs for each asset
  const lightFallbackUrl =
    brandingData?.items?.["branding.logo_light_id"]?.fallbackMediaUrl ||
    brandingData?.platformFallbacks?.mediaUrls["branding.logo_light_id"] ||
    "/logo.webp";
  const lightCurrentUrl = form.hasLightOverride && form.logoLightUrl ? form.logoLightUrl : lightFallbackUrl;

  const darkFallbackUrl =
    brandingData?.items?.["branding.logo_dark_id"]?.fallbackMediaUrl ||
    brandingData?.platformFallbacks?.mediaUrls["branding.logo_dark_id"] ||
    "/white-logo.webp";
  const darkCurrentUrl = form.hasDarkOverride && form.logoDarkUrl ? form.logoDarkUrl : darkFallbackUrl;

  const faviconFallbackUrl =
    brandingData?.items?.["branding.favicon_id"]?.fallbackMediaUrl ||
    brandingData?.platformFallbacks?.mediaUrls["branding.favicon_id"] ||
    "/favicon.webp";
  const faviconCurrentUrl = form.hasFaviconOverride && form.faviconUrl ? form.faviconUrl : faviconFallbackUrl;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-muted/40 border border-primary/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Palette className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Workspace Branding</h2>
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/30">
                White-Label
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              These branding settings apply only to your workspace. Any setting not customized here automatically inherits the platform default identity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleDiscard} className="text-xs">
              Discard
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
            className="text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Save className="size-3.5" />
            {saveMutation.isPending ? "Saving..." : "Save Workspace Branding"}
          </Button>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Brand Logos */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    Workspace Logos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Logos displayed in your workspace header, sidebar, and employee portal.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              {/* Light Theme Logo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Light Theme Logo</span>
                  <div className="flex items-center gap-2">
                    {form.hasLightOverride ? (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Custom Workspace Logo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Inherited from Platform
                      </Badge>
                    )}
                    {form.hasLightOverride && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        title="Revert to Platform Default"
                        onClick={() => handleRevertField("logo_light_id")}
                      >
                        <RotateCcw className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <MediaImageUploader
                  label="Light Theme Logo"
                  description="Displayed on dark sidebars or dark backgrounds in light mode."
                  folder="workspace/branding"
                  currentUrl={lightCurrentUrl}
                  currentMediaId={form.logoLightId}
                  previewBg="dark"
                  hasCustomOverride={form.hasLightOverride}
                  onUploaded={(media) => {
                    setForm((prev) => ({
                      ...prev,
                      logoLightId: media.id,
                      logoLightUrl: media.url,
                      hasLightOverride: true,
                    }));
                    setIsDirty(true);
                  }}
                  onRemove={() => handleRevertField("logo_light_id")}
                />
              </div>

              {/* Dark Theme Logo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Dark Theme Logo</span>
                  <div className="flex items-center gap-2">
                    {form.hasDarkOverride ? (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Custom Workspace Logo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Inherited from Platform
                      </Badge>
                    )}
                    {form.hasDarkOverride && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        title="Revert to Platform Default"
                        onClick={() => handleRevertField("logo_dark_id")}
                      >
                        <RotateCcw className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <MediaImageUploader
                  label="Dark Theme Logo"
                  description="Displayed on light sidebars or in dark mode."
                  folder="workspace/branding"
                  currentUrl={darkCurrentUrl}
                  currentMediaId={form.logoDarkId}
                  previewBg="light"
                  hasCustomOverride={form.hasDarkOverride}
                  onUploaded={(media) => {
                    setForm((prev) => ({
                      ...prev,
                      logoDarkId: media.id,
                      logoDarkUrl: media.url,
                      hasDarkOverride: true,
                    }));
                    setIsDirty(true);
                  }}
                  onRemove={() => handleRevertField("logo_dark_id")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Favicon */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="size-4 text-amber-500" />
                    Workspace Favicon
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Browser tab icon and shortcut icon for your workspace.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {form.hasFaviconOverride ? (
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Custom Workspace Favicon
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Inherited from Platform
                    </Badge>
                  )}
                  {form.hasFaviconOverride && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-foreground"
                      title="Revert to Platform Default"
                      onClick={() => handleRevertField("favicon_id")}
                    >
                      <RotateCcw className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <MediaImageUploader
                label="Favicon"
                description="32x32, 64x64 .png, .ico, or .webp recommended"
                folder="workspace/branding"
                currentUrl={faviconCurrentUrl}
                currentMediaId={form.faviconId}
                previewBg="checker"
                hasCustomOverride={form.hasFaviconOverride}
                onUploaded={(media) => {
                  setForm((prev) => ({
                    ...prev,
                    faviconId: media.id,
                    faviconUrl: media.url,
                    hasFaviconOverride: true,
                  }));
                  setIsDirty(true);
                }}
                onRemove={() => handleRevertField("favicon_id")}
              />
            </CardContent>
          </Card>

          {/* Section 3: Primary Theme Accent Color */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Palette className="size-4 text-primary" />
                    Primary Accent Color
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Controls buttons, active sidebar menu items, highlight badges, and focus rings across your workspace.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {overrides["branding.primary_color"] ? (
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Workspace Override
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Inherited from Platform
                    </Badge>
                  )}
                  {overrides["branding.primary_color"] && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-foreground"
                      title="Revert to Platform Default"
                      onClick={() => handleRevertField("primary_color")}
                    >
                      <RotateCcw className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primaryColor || "#FF6B00"}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, primaryColor: e.target.value }));
                    setIsDirty(true);
                  }}
                  className="size-11 rounded-lg border border-border cursor-pointer p-0.5 bg-background shadow-xs shrink-0"
                />
                <Input
                  type="text"
                  value={form.primaryColor}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, primaryColor: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="#FF6B00"
                  className="w-36 font-mono text-xs uppercase"
                />
              </div>

              {/* Preset Swatches */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block font-medium">Quick Preset Palettes:</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, primaryColor: preset.hex }));
                        setIsDirty(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105"
                      style={{
                        borderColor: form.primaryColor === preset.hex ? preset.hex : undefined,
                        backgroundColor: form.primaryColor === preset.hex ? `${preset.hex}15` : undefined,
                      }}
                    >
                      <span className="size-3 rounded-full" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Workspace Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-border/80 shadow-xs sticky top-20">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  Live Workspace Preview
                </CardTitle>
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewThemeMode("light")}
                    className={`p-1.5 rounded-md text-xs transition-colors ${
                      previewThemeMode === "light" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                    title="Preview Light Mode"
                  >
                    <Sun className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewThemeMode("dark")}
                    className={`p-1.5 rounded-md text-xs transition-colors ${
                      previewThemeMode === "dark" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                    title="Preview Dark Mode"
                  >
                    <Moon className="size-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Mock App Shell */}
              <div
                className={`rounded-xl border overflow-hidden transition-all ${
                  previewThemeMode === "dark" ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              >
                {/* Header Mock */}
                <div className="h-12 border-b px-4 flex items-center justify-between bg-card/60 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={previewThemeMode === "dark" ? darkCurrentUrl : lightCurrentUrl}
                      alt="Workspace Logo"
                      className="h-6 max-h-6 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = previewThemeMode === "dark" ? "/white-logo.webp" : "/logo.webp";
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white shadow-xs"
                      style={{ backgroundColor: form.primaryColor || "#FF6B00" }}
                    >
                      Action
                    </div>
                  </div>
                </div>

                {/* Body Mock: Sidebar + Content */}
                <div className="flex h-56">
                  {/* Mock Sidebar */}
                  <div className={`w-36 border-r p-2 space-y-1 ${previewThemeMode === "dark" ? "bg-slate-900/60" : "bg-white"}`}>
                    <div
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${form.primaryColor || "#FF6B00"} 15%, transparent)`,
                        color: form.primaryColor || "#FF6B00",
                      }}
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: form.primaryColor || "#FF6B00" }} />
                      Dashboard
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground flex items-center gap-2 hover:bg-muted/40">
                      <span className="size-2 rounded-full bg-muted-foreground/40" />
                      Employees
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground flex items-center gap-2 hover:bg-muted/40">
                      <span className="size-2 rounded-full bg-muted-foreground/40" />
                      Attendance
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground flex items-center gap-2 hover:bg-muted/40">
                      <span className="size-2 rounded-full bg-muted-foreground/40" />
                      Payroll
                    </div>
                  </div>

                  {/* Mock Content */}
                  <div className="flex-1 p-3 space-y-3 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 bg-muted rounded-md" />
                      <div
                        className="h-5 px-2 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                        style={{ backgroundColor: form.primaryColor || "#FF6B00" }}
                      >
                        Active Tab
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card/80 space-y-2">
                      <div className="h-2 w-3/4 bg-muted rounded-xs" />
                      <div className="h-2 w-1/2 bg-muted rounded-xs" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-3 py-1 rounded-md text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: form.primaryColor || "#FF6B00" }}
                      >
                        Primary CTA
                      </button>
                      <button type="button" className="px-3 py-1 rounded-md text-xs font-medium border bg-background">
                        Secondary
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset Everything Option */}
              <div className="pt-2 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Revert all overrides:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Reset all workspace branding back to platform defaults?")) {
                      resetMutation.mutate();
                    }
                  }}
                  disabled={resetMutation.isPending}
                  className="text-xs h-7 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Reset to Platform Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
