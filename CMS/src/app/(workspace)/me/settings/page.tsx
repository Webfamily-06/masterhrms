'use client';

import React, { useState, useEffect } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { GLOBAL_TIMEZONES } from "@/src/lib/constants/system-locale";
import { toast } from "sonner";
import { useCurrentProfile } from "@/lib/session";
import { useAppConfig, setPersonalPrimaryColor, applyThemeVariables } from "@/lib/useAppConfig";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserEmailAccountsSettings } from "@/components/settings/user-email-accounts-settings";
import {
  Sliders,
  Palette,
  Sun,
  Moon,
  Laptop,
  Globe,
  Clock,
  Calendar,
  Bell,
  BellRing,
  VolumeX,
  Shield,
  ShieldCheck,
  KeyRound,
  Mail,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  Smartphone,
  Sparkles,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserSettingsForm {
  "user.theme_mode": string;
  "user.primary_color": string | null;
  "user.locale": string;
  "user.timezone": string;
  "user.date_format": string;
  "user.time_format": string;
  "user.calendar_first_day": number;
  "user.notifications_email": boolean;
  "user.notifications_inapp": boolean;
  "user.notifications_push": boolean;
  "user.quiet_hours_enabled": boolean;
  "user.quiet_hours_start": string;
  "user.quiet_hours_end": string;
}

const ACCENT_COLOR_PRESETS = [
  { label: "Royal Blue", hex: "#2563EB" },
  { label: "Violet", hex: "#7C3AED" },
  { label: "Crimson Rose", hex: "#E11D48" },
  { label: "Emerald", hex: "#059669" },
  { label: "Amber", hex: "#D97706" },
  { label: "Ocean Cyan", hex: "#0891B2" },
  { label: "Indigo", hex: "#4F46E5" },
  { label: "Sunset Orange", hex: "#EA580C" },
];

const DEFAULT_USER_SETTINGS: UserSettingsForm = {
  "user.theme_mode": "system",
  "user.primary_color": null,
  "user.locale": "en-US",
  "user.timezone": "",
  "user.date_format": "YYYY-MM-DD",
  "user.time_format": "HH:mm",
  "user.calendar_first_day": 1,
  "user.notifications_email": true,
  "user.notifications_inapp": true,
  "user.notifications_push": false,
  "user.quiet_hours_enabled": false,
  "user.quiet_hours_start": "22:00",
  "user.quiet_hours_end": "07:00",
};

export default function EmployeeSettingsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const { appConfig } = useAppConfig();
  const workspaceDefaultColor = appConfig?.workspacePrimaryColor || appConfig?.primaryColor || "#2563EB";
  const workspaceTimezone = appConfig?.locale?.workspaceTimezone || appConfig?.locale?.timezone || "Asia/Kolkata";
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") || "preferences";

  const handleTabChange = (tab: string) => {
    router.push(`/me/settings?tab=${tab}`);
  };

  // Form State
  const [form, setForm] = useState<UserSettingsForm>(DEFAULT_USER_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 1. Fetch User Settings
  const { data: settingsData, isLoading: loadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["settings", "USER", "user"],
    queryFn: async () => {
      try {
        const res = await api.get<{ values: Partial<UserSettingsForm> }>("/v1/settings/user/user");
        return res?.values || {};
      } catch (err) {
        return {};
      }
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (settingsData) {
      setForm((prev) => ({
        ...prev,
        ...settingsData,
      }));
      setIsDirty(false);
    }
  }, [settingsData]);

  // Update field handler
  const updateField = (key: keyof UserSettingsForm, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    if (key === "user.primary_color") {
      if (value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(value).trim())) {
        applyThemeVariables(String(value).trim());
      } else if (!value) {
        applyThemeVariables(workspaceDefaultColor);
      }
    }
  };

  // 2. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedValues: Partial<UserSettingsForm>) => {
      return api.put("/v1/settings/user/user", updatedValues);
    },
    onSuccess: () => {
      toast.success("Settings saved successfully", {
        description: "Your personal preferences have been updated and synced to your account.",
      });
      setIsDirty(false);
      setPersonalPrimaryColor(
        (profile as any)?.userId || (profile as any)?.id || null,
        form["user.primary_color"],
        workspaceDefaultColor
      );
      qc.invalidateQueries({ queryKey: ["settings", "USER"] });
      qc.invalidateQueries({ queryKey: ["app-config"] });

      // Apply theme mode dynamically to HTML tag if changed
      if (form["user.theme_mode"] === "dark") {
        document.documentElement.classList.add("dark");
      } else if (form["user.theme_mode"] === "light") {
        document.documentElement.classList.remove("dark");
      }
    },
    onError: (err: any) => {
      toast.error("Failed to save settings", {
        description: err?.message || "An unexpected error occurred while saving your preferences.",
      });
    },
  });

  // 3. Reset Mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      return api.post("/v1/settings/user/user/reset", {});
    },
    onSuccess: () => {
      toast.info("Preferences restored to default", {
        description: "Your personal color and locale overrides now inherit workspace defaults.",
      });
      setIsDirty(false);
      setPersonalPrimaryColor(
        (profile as any)?.userId || (profile as any)?.id || null,
        null,
        workspaceDefaultColor
      );
      qc.invalidateQueries({ queryKey: ["app-config"] });
      refetchSettings();
    },
    onError: (err: any) => {
      toast.error("Failed to reset settings", {
        description: err?.message || "Could not reset settings.",
      });
    },
  });

  // 4. Password Change Mutation
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password updated successfully", {
        description: "Your security credentials have been updated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error("Password change failed", {
        description: err?.message || "Please check your current password and try again.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Sliders className="h-6 w-6 text-primary" />
            Personal Settings & Preferences
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure your personal workspace appearance, notification schedule, account credentials, and email connections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs px-2 py-0.5 animate-pulse">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending || loadingSettings}
            className="text-xs h-9"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Defaults
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !isDirty}
            className="text-xs h-9 font-semibold"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/60 border rounded-lg">
          <TabsTrigger value="preferences" className="text-xs py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Palette className="h-4 w-4 mr-2" />
            Appearance & Locale
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications & Quiet Hours
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4 mr-2" />
            Account Security & 2FA
          </TabsTrigger>
          <TabsTrigger value="email-accounts" className="text-xs py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Mail className="h-4 w-4 mr-2" />
            Personal Email Accounts
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: APPEARANCE & LOCALE ────────────────────────────────────────── */}
        <TabsContent value="preferences" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Theme Mode Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Color Theme & Display Mode
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose your preferred contrast mode for the interface.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("user.theme_mode", "light")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3.5 rounded-lg border-2 text-center transition-all",
                      form["user.theme_mode"] === "light"
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    <Sun className="h-5 w-5 mb-1.5" />
                    <span className="text-xs font-medium">Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField("user.theme_mode", "dark")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3.5 rounded-lg border-2 text-center transition-all",
                      form["user.theme_mode"] === "dark"
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    <Moon className="h-5 w-5 mb-1.5" />
                    <span className="text-xs font-medium">Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField("user.theme_mode", "system")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3.5 rounded-lg border-2 text-center transition-all",
                      form["user.theme_mode"] === "system"
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    <Laptop className="h-5 w-5 mb-1.5" />
                    <span className="text-xs font-medium">System</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  System mode automatically synchronizes with your operating system's light or dark mode schedule.
                </p>

                {/* Personal Accent Color Picker (Isolated to Current Employee ID Only) */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Personal Theme Accent Color
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Applies exclusively to your employee ID across buttons, active navigation, and focus rings without changing other employees' screens.
                      </p>
                    </div>
                    {form["user.primary_color"] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateField("user.primary_color", null)}
                        className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                      >
                        Use Workspace Color
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ACCENT_COLOR_PRESETS.map((preset) => {
                      const selected =
                        (form["user.primary_color"] || "").toUpperCase() === preset.hex.toUpperCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          title={preset.label}
                          onClick={() => updateField("user.primary_color", preset.hex)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 transition-transform flex items-center justify-center",
                            selected
                              ? "scale-110 border-foreground ring-2 ring-offset-2 ring-primary"
                              : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: preset.hex }}
                        >
                          {selected && <CheckCircle2 className="h-3.5 w-3.5 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="color"
                      aria-label="Custom personal accent color"
                      value={form["user.primary_color"] || workspaceDefaultColor}
                      onChange={(e) => updateField("user.primary_color", e.target.value.toUpperCase())}
                      className="h-9 w-11 rounded-md border cursor-pointer bg-transparent p-0.5"
                    />
                    <Input
                      value={form["user.primary_color"] || ""}
                      placeholder={`Workspace Default (${workspaceDefaultColor})`}
                      onChange={(e) => updateField("user.primary_color", e.target.value || null)}
                      className="text-xs h-9 font-mono flex-1"
                    />
                    <Button type="button" size="sm" className="h-9 text-xs pointer-events-none shrink-0">
                      Live Button Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language & Regional Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Language & Locale
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure your primary language and regional formatting standards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Display Language</Label>
                  <Select
                    value={form["user.locale"]}
                    onValueChange={(val) => updateField("user.locale", val)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (United States)</SelectItem>
                      <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                      <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                      <SelectItem value="ar-SA">Arabic (Saudi Arabia)</SelectItem>
                      <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
                      <SelectItem value="fr-FR">French (France)</SelectItem>
                      <SelectItem value="de-DE">German (Germany)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Personal Timezone</Label>
                  <Select
                    value={form["user.timezone"] ? form["user.timezone"] : "__WORKSPACE_DEFAULT__"}
                    onValueChange={(val) =>
                      updateField("user.timezone", val === "__WORKSPACE_DEFAULT__" ? "" : val)
                    }
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Follow Workspace Timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__WORKSPACE_DEFAULT__">
                        Follow Workspace Timezone ({workspaceTimezone})
                      </SelectItem>
                      {GLOBAL_TIMEZONES.map((tz, idx) => (
                        <SelectItem key={`${tz.iana}-${idx}`} value={tz.iana}>
                          {tz.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Defaults to your organization's synced workspace timezone ({workspaceTimezone}) unless you set a personal override.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Date & Time Formatting */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Date & Time Formatting
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose how timestamps are rendered across attendance and reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Date Format</Label>
                  <Select
                    value={form["user.date_format"]}
                    onValueChange={(val) => updateField("user.date_format", val)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-16)</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (e.g. 16/11/2026)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/16/2026)</SelectItem>
                      <SelectItem value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 16-Nov-2026)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Time Format</Label>
                  <Select
                    value={form["user.time_format"]}
                    onValueChange={(val) => updateField("user.time_format", val)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HH:mm">24-Hour Clock (e.g. 14:30)</SelectItem>
                      <SelectItem value="hh:mm A">12-Hour Clock (e.g. 02:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Preferences */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Calendar Preferences
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure calendar display and workweek start day.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Week Start Day</Label>
                  <Select
                    value={String(form["user.calendar_first_day"])}
                    onValueChange={(val) => updateField("user.calendar_first_day", Number(val))}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select start day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday (Standard Business Week)</SelectItem>
                      <SelectItem value="0">Sunday (Traditional Calendar)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Determines the first column in your leave calendar and shift schedule views.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 2: NOTIFICATIONS & QUIET HOURS ─────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notification Channels */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-primary" />
                  Notification Channels
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose where and how you want to be notified about workflow events.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Email Alerts</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Receive email digests for leave approvals, mentions, and tasks.
                    </p>
                  </div>
                  <Switch
                    checked={form["user.notifications_email"]}
                    onCheckedChange={(checked) => updateField("user.notifications_email", checked)}
                  />
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">In-App Notification Dock</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Show real-time badge counters and alert cards in the top bar.
                    </p>
                  </div>
                  <Switch
                    checked={form["user.notifications_inapp"]}
                    onCheckedChange={(checked) => updateField("user.notifications_inapp", checked)}
                  />
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Desktop & Mobile Push Alerts</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Send web push notifications when Master HRMS is running in the background.
                    </p>
                  </div>
                  <Switch
                    checked={form["user.notifications_push"]}
                    onCheckedChange={(checked) => updateField("user.notifications_push", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quiet Hours Policy */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <VolumeX className="h-4 w-4 text-primary" />
                  Do Not Disturb & Quiet Hours
                </CardTitle>
                <CardDescription className="text-xs">
                  Automatically suppress audible alerts and push notifications outside working hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Enable Quiet Hours</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Mute notifications during your scheduled rest and off-duty periods.
                    </p>
                  </div>
                  <Switch
                    checked={form["user.quiet_hours_enabled"]}
                    onCheckedChange={(checked) => updateField("user.quiet_hours_enabled", checked)}
                  />
                </div>

                {form["user.quiet_hours_enabled"] && (
                  <div className="grid grid-cols-2 gap-3 border-t pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quiet Hours Start</Label>
                      <Input
                        type="time"
                        value={form["user.quiet_hours_start"]}
                        onChange={(e) => updateField("user.quiet_hours_start", e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quiet Hours End</Label>
                      <Input
                        type="time"
                        value={form["user.quiet_hours_end"]}
                        onChange={(e) => updateField("user.quiet_hours_end", e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-muted/40 rounded-lg p-3 flex items-start gap-2.5 text-xs text-muted-foreground border">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    Emergency corporate broadcasts and high-priority security notifications bypass Quiet Hours.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 3: ACCOUNT SECURITY & 2FA ─────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password Management */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Change Password
                </CardTitle>
                <CardDescription className="text-xs">
                  Update your account password regularly to keep your profile secure.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handlePasswordChange}>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Current Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">New Password</Label>
                    <Input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Confirm New Password</Label>
                    <Input
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-3 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isChangingPassword || !currentPassword || !newPassword}
                    className="text-xs font-semibold"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Two-Factor Authentication Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Two-Factor Authentication (2FA)
                </CardTitle>
                <CardDescription className="text-xs">
                  Add an extra layer of defense using an authenticator app (TOTP).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">TOTP Authenticator App</span>
                      <Badge
                        variant="outline"
                        className={
                          profile?.twoFactorEnabled
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                        }
                      >
                        {profile?.twoFactorEnabled ? "● ENABLED" : "○ NOT CONFIGURED"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Use Google Authenticator, Authy, or 1Password to generate verification codes.
                    </p>
                  </div>
                  <Button asChild size="sm" variant={profile?.twoFactorEnabled ? "outline" : "default"} className="h-8 text-xs font-semibold">
                    <Link to="/two-factor-auth">
                      {profile?.twoFactorEnabled ? "Manage 2FA" : "Set Up 2FA"}
                    </Link>
                  </Button>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <span className="text-xs font-medium">Session & Active Devices</span>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background text-xs">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Current Session</p>
                        <p className="text-[11px] text-muted-foreground">Active now &bull; Web Browser</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 4: PERSONAL EMAIL ACCOUNTS ────────────────────────────────────── */}
        <TabsContent value="email-accounts" className="space-y-6 outline-none">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Personal & Corporate Email Accounts
              </CardTitle>
              <CardDescription className="text-xs">
                Connect external IMAP, POP3, and SMTP email accounts to send and receive communications directly within Master HRMS.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <UserEmailAccountsSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
