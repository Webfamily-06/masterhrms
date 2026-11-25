'use client';

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccessDenied } from "@/components/access-denied";
import { usePermissions } from "@/lib/permissions";
import {
  applyBrandThemeToDom,
  formatAmountWithConfig,
  type WorkspaceCurrencyConfig,
} from "@/src/context/workspace-settings-context";
import {
  BrandImageCropDialog,
  type BrandAssetType,
} from "@/components/settings/brand-image-crop-dialog";
import {
  DATE_FORMAT_OPTIONS,
  GLOBAL_TIMEZONES,
  LANGUAGE_OPTIONS,
  TIME_FORMAT_OPTIONS,
  formatDateWithPattern,
  formatTimeWithPattern,
  resolveIanaTimezone,
} from "@/src/lib/constants/system-locale";

type SectionId =
  | "system"
  | "brand"
  | "currency"
  | "email"
  | "email_notifications"
  | "slack"
  | "telegram"
  | "twilio"
  | "zoom"
  | "working_days"
  | "ip_restriction"
  | "noc"
  | "experience_certificate"
  | "joining_letter";

const NAV_ITEMS: Array<{
  id: SectionId;
  label: string;
  icon: string;
  scope: "overall" | "hr" | "addon";
}> = [
  { id: "system", label: "System Settings", icon: "ph-gear", scope: "overall" },
  { id: "brand", label: "Brand Settings", icon: "ph-palette", scope: "overall" },
  { id: "currency", label: "Currency Settings", icon: "ph-currency-inr", scope: "overall" },
  { id: "email", label: "Email Settings", icon: "ph-envelope-simple", scope: "overall" },
  { id: "email_notifications", label: "Email Notification Settings", icon: "ph-bell", scope: "hr" },
  { id: "slack", label: "Slack Settings", icon: "ph-chat-centered-text", scope: "addon" },
  { id: "telegram", label: "Telegram Settings", icon: "ph-paper-plane-tilt", scope: "addon" },
  { id: "twilio", label: "Twilio SMS Settings", icon: "ph-device-mobile", scope: "addon" },
  { id: "zoom", label: "Zoom Meeting Settings", icon: "ph-video-camera", scope: "addon" },
  { id: "working_days", label: "Working Days Settings", icon: "ph-clock", scope: "hr" },
  { id: "ip_restriction", label: "IP Restriction Settings", icon: "ph-git-branch", scope: "overall" },
  { id: "noc", label: "NOC Settings", icon: "ph-file-text", scope: "hr" },
  { id: "experience_certificate", label: "Experience Certificate Settings", icon: "ph-briefcase", scope: "hr" },
  { id: "joining_letter", label: "Joining Letter Settings", icon: "ph-file-doc", scope: "hr" },
];

const CURRENCY_OPTIONS = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
];

const HR_NOTIFICATION_ITEMS: Array<{ key: string; label: string }> = [
  { key: "assignDocumentToEmployee", label: "Assign Document To Employee" },
  { key: "awardCreate", label: "Award Create" },
  { key: "candidateStatusUpdate", label: "Candidate Status Update" },
  { key: "complaintCreate", label: "Complaint Create" },
  { key: "employeeContractCreate", label: "Employee Contract Create" },
  { key: "employeeContractStatusUpdate", label: "Employee Contract Status Update" },
  { key: "employeeCreate", label: "Employee Create" },
  { key: "employeeTransfer", label: "Employee Transfer" },
  { key: "employeeTransferStatusUpdate", label: "Employee Transfer Status Update" },
  { key: "interviewCreate", label: "Interview Create" },
  { key: "interviewStatusUpdate", label: "Interview Status Update" },
  { key: "jobApplied", label: "Job Applied" },
  { key: "leaveStatusUpdate", label: "Leave Status Update" },
  { key: "offerCreate", label: "Offer Create" },
  { key: "payrollRunStatusUpdate", label: "Payroll Run Status Update" },
  { key: "promotionCreate", label: "Promotion Create" },
  { key: "promotionStatusUpdate", label: "Promotion Status Update" },
  { key: "resignationStatusUpdate", label: "Resignation Status Update" },
  { key: "terminationCreate", label: "Termination Create" },
  { key: "terminationStatusUpdate", label: "Termination Status Update" },
  { key: "tripCreate", label: "Trip Create" },
  { key: "tripStatusUpdate", label: "Trip Status Update" },
  { key: "userCreate", label: "User Create" },
  { key: "warningCreate", label: "Warning Create" },
];

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

interface IpEntry {
  id: string;
  ip: string;
  label?: string;
  createdAt: string;
}

export function TenantSystemSettingsConsole({
  mode = "tenant",
}: {
  mode?: "tenant" | "hr";
}) {
  const { isWorkspaceAdmin, isSuperAdmin, loading } = usePermissions();
  const canEdit = isWorkspaceAdmin || isSuperAdmin;
  const queryClient = useQueryClient();

  const visibleNav =
    mode === "hr"
      ? NAV_ITEMS.filter((item) => item.scope === "hr")
      : NAV_ITEMS;

  const [activeSection, setActiveSection] = useState<SectionId>(
    mode === "hr" ? "working_days" : "system"
  );
  const [brandTab, setBrandTab] = useState<"logos" | "text" | "theme">("logos");
  const [sampleAmount, setSampleAmount] = useState("1234.56");
  const [testEmailTo, setTestEmailTo] = useState("");

  // IP Modal State
  const [ipModalOpen, setIpModalOpen] = useState(false);
  const [editingIpId, setEditingIpId] = useState<string | null>(null);
  const [ipValue, setIpValue] = useState("");
  const [ipLabel, setIpLabel] = useState("");

  // File input refs for Brand uploads + Interactive Cropper State
  const logoDarkRef = useRef<HTMLInputElement | null>(null);
  const logoLightRef = useRef<HTMLInputElement | null>(null);
  const faviconRef = useRef<HTMLInputElement | null>(null);
  const [cropDialog, setCropDialog] = useState<{
    open: boolean;
    assetType: BrandAssetType;
    sourceDataUrl: string | null;
  }>({ open: false, assetType: "logoDark", sourceDataUrl: null });

  // Local state for all 14 sections
  const [system, setSystem] = useState({
    defaultLanguage: "en",
    dateFormat: "Y-m-d",
    timeFormat: "h:i a",
    defaultTimezone: "Asia/Kolkata",
    ipRestrictionEnabled: false,
  });

  const [brand, setBrand] = useState({
    logoDark: "",
    logoLight: "",
    favicon: "",
    titleText: "MasterHRMS",
    companyName: "MasterHRMS",
    footerText: `© ${new Date().getFullYear()} MasterHRMS. All rights reserved.`,
    companyMobile: "",
    companyEmail: "",
    companyAddress: "",
    taxNumber: "",
    themeColor: "#10b981",
    themeMode: "light",
    layoutMode: "full-width",
    sidebarVariant: "inset",
    sidebarStyle: "plain",
    layoutDirection: "ltr",
    sidebarPosition: "left",
  });

  const [currency, setCurrency] = useState<WorkspaceCurrencyConfig>({
    defaultCurrency: "INR",
    symbol: "₹",
    currencyName: "Indian Rupee",
    decimalPlaces: 2,
    symbolPosition: "prefix",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    showDecimals: true,
    addSpace: false,
  });

  const [email, setEmail] = useState({
    provider: "SMTP",
    driver: "smtp",
    host: "",
    port: "587",
    username: "",
    password: "",
    encryption: "TLS",
    fromAddress: "noreply@masterhrms.com",
    fromName: "MasterHRMS",
  });

  const [emailNotifications, setEmailNotifications] = useState<Record<string, boolean>>({});
  const [slack, setSlack] = useState({ enabled: false, webhookUrl: "", botToken: "", defaultChannel: "#hr-updates" });
  const [telegram, setTelegram] = useState({ enabled: false, botToken: "", chatId: "" });
  const [twilio, setTwilio] = useState({ enabled: false, accountSid: "", authToken: "", fromNumber: "" });
  const [zoom, setZoom] = useState({ enabled: false, accountId: "", clientId: "", clientSecret: "" });
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });
  const [ipRestriction, setIpRestriction] = useState<{ enabled: boolean; allowedIps: IpEntry[] }>({
    enabled: false,
    allowedIps: [],
  });
  const [noc, setNoc] = useState({ language: "en", content: "" });
  const [experienceCert, setExperienceCert] = useState({ language: "en", content: "" });
  const [joiningLetter, setJoiningLetter] = useState({ language: "en", content: "" });

  const endpoint = canEdit ? "/workspace/system-settings" : "/workspace/system-settings/public";
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-system-settings", endpoint],
    queryFn: async () => {
      const res: any = await api.get(endpoint);
      return res?.data || res || {};
    },
    enabled: !loading && (mode === "hr" || canEdit),
  });

  useEffect(() => {
    const s = data?.settings || data;
    if (!s) return;
    if (s.system) setSystem((prev) => ({ ...prev, ...s.system }));
    if (s.brand) setBrand((prev) => ({ ...prev, ...s.brand }));
    if (s.currency) setCurrency((prev) => ({ ...prev, ...s.currency }));
    if (s.email) setEmail((prev) => ({ ...prev, ...s.email }));
    if (s.email_notifications) setEmailNotifications(s.email_notifications);
    if (s.slack) setSlack((prev) => ({ ...prev, ...s.slack }));
    if (s.telegram) setTelegram((prev) => ({ ...prev, ...s.telegram }));
    if (s.twilio) setTwilio((prev) => ({ ...prev, ...s.twilio }));
    if (s.zoom) setZoom((prev) => ({ ...prev, ...s.zoom }));
    if (s.working_days) setWorkingDays((prev) => ({ ...prev, ...s.working_days }));
    if (s.ip_restriction) setIpRestriction((prev) => ({ ...prev, ...s.ip_restriction }));
    if (s.noc) setNoc((prev) => ({ ...prev, ...s.noc }));
    if (s.experience_certificate) setExperienceCert((prev) => ({ ...prev, ...s.experience_certificate }));
    if (s.joining_letter) setJoiningLetter((prev) => ({ ...prev, ...s.joining_letter }));
  }, [data]);

  const saveSectionMutation = useMutation({
    mutationFn: async ({ section, payload }: { section: SectionId; payload: any }) => {
      return await api.put(`/workspace/system-settings/${section}`, payload);
    },
    onSuccess: (_res, vars) => {
      toast.success("Settings saved and applied across workspace.");
      if (vars.section === "brand") {
        applyBrandThemeToDom(vars.payload, system.defaultLanguage);
      }
      queryClient.invalidateQueries({ queryKey: ["tenant-system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-system-settings-public"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
      if (vars.section === "brand" || vars.section === "system") {
        queryClient.invalidateQueries({ queryKey: ["auth-me-profile"] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save settings.");
    },
  });

  const uploadBrandAssetMutation = useMutation({
    mutationFn: async ({
      assetType,
      imageDataUrl,
    }: {
      assetType: "logoDark" | "logoLight" | "favicon";
      imageDataUrl: string;
    }) => {
      return await api.post("/workspace/system-settings/brand/upload", { assetType, imageDataUrl });
    },
    onSuccess: (res: any, vars) => {
      const url = res?.url || res?.data?.url;
      if (url) {
        setBrand((prev) => ({ ...prev, [vars.assetType]: url }));
      }
      toast.success("Brand asset uploaded. Click Save Changes to apply across workspace.");
      queryClient.invalidateQueries({ queryKey: ["workspace-system-settings-public"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to upload brand image.");
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/workspace/system-settings/test-email", {
        toEmail: testEmailTo.trim(),
        smtp: email,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Test email sent successfully.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Test email failed.");
    },
  });

  const handleBrandFilePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    assetType: "logoDark" | "logoLight" | "favicon"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be 4 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Open interactive Crop & Auto-Fit modal before uploading
        setCropDialog({ open: true, assetType, sourceDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    const el = document.getElementById(`settings-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSaveIp = () => {
    const trimmed = ipValue.trim();
    if (!trimmed) {
      toast.error("Please enter a valid IP address.");
      return;
    }
    let nextIps: IpEntry[];
    if (editingIpId) {
      nextIps = ipRestriction.allowedIps.map((item) =>
        item.id === editingIpId ? { ...item, ip: trimmed, label: ipLabel.trim() } : item
      );
    } else {
      nextIps = [
        ...ipRestriction.allowedIps,
        {
          id: `ip-${Date.now()}`,
          ip: trimmed,
          label: ipLabel.trim() || "Office Network",
          createdAt: new Date().toISOString(),
        },
      ];
    }
    const nextState = { ...ipRestriction, allowedIps: nextIps };
    setIpRestriction(nextState);
    setIpModalOpen(false);
    setEditingIpId(null);
    setIpValue("");
    setIpLabel("");
    saveSectionMutation.mutate({ section: "ip_restriction", payload: nextState });
  };

  const handleDeleteIp = (id: string) => {
    const nextState = {
      ...ipRestriction,
      allowedIps: ipRestriction.allowedIps.filter((i) => i.id !== id),
    };
    setIpRestriction(nextState);
    saveSectionMutation.mutate({ section: "ip_restriction", payload: nextState });
  };

  const insertPlaceholder = (
    setter: React.Dispatch<React.SetStateAction<{ language: string; content: string }>>,
    token: string
  ) => {
    setter((prev) => ({
      ...prev,
      content: `${prev.content}${prev.content.endsWith(" ") || prev.content.endsWith("\n") ? "" : " "}${token}`,
    }));
  };

  if (!loading && mode === "tenant" && !canEdit) {
    return (
      <AccessDenied
        moduleName="Tenant System Settings"
        requiredPermission="workspace.settings.manage"
      />
    );
  }

  // Clicking options updates local state + Live Preview ONLY; actual workspace applies after clicking Save Changes
  const updateBrandLive = (
    updater: (prev: typeof brand) => typeof brand
  ) => {
    setBrand((prev) => updater(prev));
  };

  const SaveBtn = ({ section, payload }: { section: SectionId; payload: any }) =>
    canEdit ? (
      <Button
        type="button"
        size="sm"
        disabled={saveSectionMutation.isPending}
        onClick={() => saveSectionMutation.mutate({ section, payload })}
        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
      >
        <i
          className={
            saveSectionMutation.isPending && saveSectionMutation.variables?.section === section
              ? "ph ph-spinner-gap animate-spin"
              : "ph ph-floppy-disk"
          }
        />
        Save Changes
      </Button>
    ) : (
      <Badge variant="soft" className="text-[11px] gap-1">
        <i className="ph ph-lock" />
        Tenant Admin Only
      </Badge>
    );

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 space-y-5 font-sans">
      <PageHeader
        title={mode === "hr" ? "HR & Letter Template Settings" : "Settings"}
        description={
          mode === "hr"
            ? "HR working days, HR email notifications, and employee document templates. Core workspace currency, timezone, and branding are locked to Tenant Settings."
            : "Manage authoritative system-wide tenant settings, branding, currency, email, integrations, and HR templates."
        }
        actions={
          mode === "hr" && canEdit ? (
            <Link href="/tenant/settings">
              <Button size="sm" variant="outline" className="gap-1.5">
                <i className="ph ph-gear" />
                Open Full Tenant Settings
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Locked Workspace Summary Strip for HR mode */}
      {mode === "hr" && (
        <Card className="border border-primary/25 bg-primary/5 rounded-xl shadow-xs">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <i className="ph ph-lock-key text-primary text-lg" />
              <div>
                <p className="font-semibold text-foreground">
                  Fixed Workspace Defaults (Managed by Tenant Admin Only)
                </p>
                <p className="text-muted-foreground">
                  Company: <span className="font-semibold text-foreground">{brand.companyName}</span> •
                  Currency: <span className="font-semibold text-foreground">{currency.symbol} {currency.defaultCurrency}</span> •
                  Timezone: <span className="font-semibold text-foreground">{system.defaultTimezone}</span>
                </p>
              </div>
            </div>
            <Badge variant="soft" className="text-[11px]">Authoritative Tenant Policy</Badge>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground text-xs">
          <i className="ph ph-spinner-gap animate-spin text-2xl text-primary block mx-auto mb-2" />
          Loading workspace settings from database...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sticky Sidebar Navigation (Matches Screenshots) */}
          <aside className="lg:col-span-3 lg:sticky lg:top-20">
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardContent className="p-2 space-y-0.5">
                {visibleNav.map((item) => {
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer",
                        active
                          ? "bg-muted text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <i className={cn("ph text-base shrink-0", item.icon)} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </aside>

          {/* Right Stacked Settings Cards */}
          <div className="lg:col-span-9 space-y-6">
            {/* 1. SYSTEM SETTINGS */}
            {mode === "tenant" && (
              <Card id="settings-section-system" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">System Settings</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure system-wide settings for your entire workspace.
                      </p>
                    </div>
                    <SaveBtn section="system" payload={system} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5" data-no-translate="true">
                      <Label className="text-xs font-semibold">Default Language</Label>
                      <Select
                        value={system.defaultLanguage}
                        onValueChange={(v) => setSystem((p) => ({ ...p, defaultLanguage: v }))}
                      >
                        <SelectTrigger className="h-9 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {LANGUAGE_OPTIONS.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              <span className="inline-flex items-center gap-2">
                                <img
                                  src={`/assets/img/flags/${lang.countryCode.toLowerCase()}.svg`}
                                  alt={lang.label}
                                  className="w-5 h-3.5 rounded-[2px] object-cover border border-border/50 shrink-0"
                                />
                                <span className="font-medium">{lang.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5" data-no-translate="true">
                      <Label className="text-xs font-semibold">Date Format</Label>
                      <Select
                        value={system.dateFormat}
                        onValueChange={(v) => setSystem((p) => ({ ...p, dateFormat: v }))}
                      >
                        <SelectTrigger className="h-9 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {DATE_FORMAT_OPTIONS.map((df) => (
                            <SelectItem key={df.value} value={df.value}>
                              <span className="inline-flex items-center gap-2">
                                <span className="font-semibold text-foreground">{df.label}</span>
                                <span className="text-muted-foreground">{df.example}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5" data-no-translate="true">
                      <Label className="text-xs font-semibold">Time Format</Label>
                      <Select
                        value={system.timeFormat}
                        onValueChange={(v) => setSystem((p) => ({ ...p, timeFormat: v }))}
                      >
                        <SelectTrigger className="h-9 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {TIME_FORMAT_OPTIONS.map((tf) => (
                            <SelectItem key={tf.value} value={tf.value}>
                              <span className="inline-flex items-center gap-2">
                                <span className="font-semibold text-foreground">{tf.label}</span>
                                <span className="text-muted-foreground">{tf.example}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5" data-no-translate="true">
                      <Label className="text-xs font-semibold">Default Timezone</Label>
                      <Select
                        value={resolveIanaTimezone(system.defaultTimezone)}
                        onValueChange={(v) => setSystem((p) => ({ ...p, defaultTimezone: v }))}
                      >
                        <SelectTrigger className="h-9 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {GLOBAL_TIMEZONES.map((tz, idx) => (
                            <SelectItem key={`${tz.iana}-${idx}`} value={tz.iana}>
                              {tz.text}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Live Format & Timezone Preview */}
                  <div className="rounded-lg border border-border/70 bg-muted/25 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground font-medium">Live Workspace Clock Preview:</span>
                    <span className="font-semibold text-foreground" data-no-translate="true">
                      {formatDateWithPattern(new Date(), system.dateFormat, system.defaultTimezone)} •{" "}
                      {formatTimeWithPattern(new Date(), system.timeFormat, system.defaultTimezone)} ({resolveIanaTimezone(system.defaultTimezone)})
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div>
                      <p className="text-xs font-semibold text-foreground">IP Restriction</p>
                      <p className="text-[11px] text-muted-foreground">
                        Enable IP address restrictions for enhanced workspace security.
                      </p>
                    </div>
                    <Switch
                      checked={system.ipRestrictionEnabled}
                      onCheckedChange={(v) => setSystem((p) => ({ ...p, ipRestrictionEnabled: v }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2. BRAND SETTINGS */}
            {mode === "tenant" && (
              <Card id="settings-section-brand" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Brand Settings</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Customize your organization logo, favicon, title, footer, and live theme appearance.
                      </p>
                    </div>
                    <SaveBtn section="brand" payload={brand} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-5">
                      {/* Sub-Tabs: Logos | Text | Theme */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: "logos", label: "Logos", icon: "ph-upload-simple" },
                          { key: "text", label: "Text", icon: "ph-text-t" },
                          { key: "theme", label: "Theme", icon: "ph-palette" },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setBrandTab(tab.key as any)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                              brandTab === tab.key
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                            )}
                          >
                            <i className={`ph ${tab.icon}`} />
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {brandTab === "logos" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Logo Dark */}
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Logo Dark</Label>
                            <div className="h-28 rounded-xl border border-border/80 bg-white flex items-center justify-center p-3 overflow-hidden">
                              {brand.logoDark ? (
                                <img src={brand.logoDark} alt="Logo Dark" className="max-h-20 object-contain" />
                              ) : (
                                <span className="text-lg font-bold text-slate-900">{brand.companyName || "HRM"}</span>
                              )}
                            </div>
                            <input
                              ref={logoDarkRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              className="hidden"
                              onChange={(e) => handleBrandFilePick(e, "logoDark")}
                            />
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={brand.logoDark}
                                onChange={(e) => setBrand((p) => ({ ...p, logoDark: e.target.value }))}
                                placeholder="logo/logo-dark.png"
                                className="h-8 text-xs"
                              />
                              <Button type="button" size="xs" variant="outline" onClick={() => logoDarkRef.current?.click()} className="gap-1 shrink-0">
                                <i className="ph ph-image" />
                                Browse
                              </Button>
                              {brand.logoDark && (
                                <Button type="button" size="xs" variant="outline" onClick={() => setBrand((p) => ({ ...p, logoDark: "" }))}>
                                  <i className="ph ph-x" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Logo Light */}
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Logo Light</Label>
                            <div className="h-28 rounded-xl border border-border/80 bg-slate-950 flex items-center justify-center p-3 overflow-hidden">
                              {brand.logoLight ? (
                                <img src={brand.logoLight} alt="Logo Light" className="max-h-20 object-contain" />
                              ) : (
                                <span className="text-lg font-bold text-white">{brand.companyName || "HRM"}</span>
                              )}
                            </div>
                            <input
                              ref={logoLightRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              className="hidden"
                              onChange={(e) => handleBrandFilePick(e, "logoLight")}
                            />
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={brand.logoLight}
                                onChange={(e) => setBrand((p) => ({ ...p, logoLight: e.target.value }))}
                                placeholder="logo/logo-light.png"
                                className="h-8 text-xs"
                              />
                              <Button type="button" size="xs" variant="outline" onClick={() => logoLightRef.current?.click()} className="gap-1 shrink-0">
                                <i className="ph ph-image" />
                                Browse
                              </Button>
                              {brand.logoLight && (
                                <Button type="button" size="xs" variant="outline" onClick={() => setBrand((p) => ({ ...p, logoLight: "" }))}>
                                  <i className="ph ph-x" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Favicon */}
                          <div className="space-y-2 sm:col-span-2">
                            <Label className="text-xs font-semibold">Favicon</Label>
                            <div className="h-20 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-center p-2">
                              {brand.favicon ? (
                                <img src={brand.favicon} alt="Favicon" className="size-12 rounded-lg object-contain" />
                              ) : (
                                <div className="size-12 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center text-xl">
                                  <i className="ph ph-buildings" />
                                </div>
                              )}
                            </div>
                            <input
                              ref={faviconRef}
                              type="file"
                              accept="image/png,image/x-icon,image/svg+xml,image/webp"
                              className="hidden"
                              onChange={(e) => handleBrandFilePick(e, "favicon")}
                            />
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={brand.favicon}
                                onChange={(e) => setBrand((p) => ({ ...p, favicon: e.target.value }))}
                                placeholder="logo/favicon.png"
                                className="h-8 text-xs"
                              />
                              <Button type="button" size="xs" variant="outline" onClick={() => faviconRef.current?.click()} className="gap-1 shrink-0">
                                <i className="ph ph-image" />
                                Browse
                              </Button>
                              {brand.favicon && (
                                <Button type="button" size="xs" variant="outline" onClick={() => setBrand((p) => ({ ...p, favicon: "" }))}>
                                  <i className="ph ph-x" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {brandTab === "text" && (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Title Text *</Label>
                            <Input
                              value={brand.titleText}
                              onChange={(e) =>
                                setBrand((p) => ({ ...p, titleText: e.target.value, companyName: e.target.value }))
                              }
                              placeholder="HRM SaaS"
                              className="h-9 text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Application & legal company title displayed in the browser tab and documents.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Footer Text *</Label>
                            <Input
                              value={brand.footerText}
                              onChange={(e) => setBrand((p) => ({ ...p, footerText: e.target.value }))}
                              placeholder="© 2026 HRM SaaS. All rights reserved."
                              className="h-9 text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Text displayed in the workspace footer and payslips.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Company Mobile Number</Label>
                              <Input
                                value={brand.companyMobile}
                                onChange={(e) => setBrand((p) => ({ ...p, companyMobile: e.target.value }))}
                                placeholder="+91 98765 43210"
                                className="h-9 text-xs"
                              />
                              <p className="text-[11px] text-muted-foreground">Company contact mobile number</p>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Company Email</Label>
                              <Input
                                type="email"
                                value={brand.companyEmail}
                                onChange={(e) => setBrand((p) => ({ ...p, companyEmail: e.target.value }))}
                                placeholder="hr@company.com"
                                className="h-9 text-xs"
                              />
                              <p className="text-[11px] text-muted-foreground">Official organization email</p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">GSTIN / Tax Registration No.</Label>
                            <Input
                              value={brand.taxNumber}
                              onChange={(e) => setBrand((p) => ({ ...p, taxNumber: e.target.value }))}
                              placeholder="33AABCP1234F1Z5"
                              className="h-9 text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Company Address</Label>
                            <Textarea
                              rows={3}
                              value={brand.companyAddress}
                              onChange={(e) => setBrand((p) => ({ ...p, companyAddress: e.target.value }))}
                              placeholder="Registered company street address, city, state, postal code"
                              className="text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Used as the single source of truth across Payslips, Tax Invoices, and Offer Letters.
                            </p>
                          </div>
                        </div>
                      )}

                      {brandTab === "theme" && (
                        <div className="space-y-5">
                          {/* Theme Color Swatches (Matches Screenshot 3) */}
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <i className="ph ph-palette text-sm" />
                              Theme Color
                            </Label>
                            <div className="grid grid-cols-6 gap-2.5">
                              {[
                                { label: "Blue", hex: "#3b82f6" },
                                { label: "Emerald", hex: "#10b981" },
                                { label: "Violet", hex: "#8b5cf6" },
                                { label: "Orange", hex: "#f97316" },
                                { label: "Red", hex: "#ef4444" },
                                { label: "Royal", hex: "#2563eb" },
                              ].map((swatch) => {
                                const selected = brand.themeColor.toLowerCase() === swatch.hex.toLowerCase();
                                return (
                                  <button
                                    key={swatch.hex}
                                    type="button"
                                    title={swatch.label}
                                    onClick={() => updateBrandLive((p) => ({ ...p, themeColor: swatch.hex }))}
                                    className={cn(
                                      "h-10 rounded-lg border-2 p-1 transition-all cursor-pointer",
                                      selected ? "border-foreground scale-[1.03] shadow-xs" : "border-border"
                                    )}
                                  >
                                    <span
                                      className="block w-full h-full rounded-md"
                                      style={{ backgroundColor: swatch.hex }}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* HRMS-HTML Layout Modes */}
                          <div className="space-y-2 pt-2 border-t border-border/60">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <i className="ph ph-layout text-sm" />
                              Workspace Layout Mode
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {[
                                { value: "full-width", label: "Full Width" },
                                { value: "mini", label: "Mini" },
                                { value: "hoverview", label: "Hover View" },
                                { value: "hidden", label: "Hidden" },
                                { value: "rtl", label: "RTL" },
                              ].map((m) => {
                                const active = brand.layoutMode === m.value;
                                return (
                                  <button
                                    key={m.value}
                                    type="button"
                                    onClick={() =>
                                      updateBrandLive((p) => ({
                                        ...p,
                                        layoutMode: m.value,
                                        layoutDirection: m.value === "rtl" ? "rtl" : p.layoutDirection,
                                      }))
                                    }
                                    className={cn(
                                      "h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                                      active
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-foreground border-border hover:bg-muted/50"
                                    )}
                                  >
                                    <span>{m.label}</span>
                                    {active && <i className="ph ph-check text-xs" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Sidebar Variant & Style (Matches Screenshot 3) */}
                          <div className="space-y-3 pt-2 border-t border-border/60">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <i className="ph ph-sidebar text-sm" />
                              Sidebar
                            </Label>
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-medium text-muted-foreground">Sidebar Variant</p>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { value: "inset", label: "Inset" },
                                  { value: "floating", label: "Floating" },
                                  { value: "minimal", label: "Minimal" },
                                ].map((v) => {
                                  const active = brand.sidebarVariant === v.value;
                                  return (
                                    <button
                                      key={v.value}
                                      type="button"
                                      onClick={() => updateBrandLive((p) => ({ ...p, sidebarVariant: v.value }))}
                                      className={cn(
                                        "h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                                        active
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "bg-background text-foreground border-border hover:bg-muted/50"
                                      )}
                                    >
                                      <span>{v.label}</span>
                                      {active && <i className="ph ph-check text-xs" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <p className="text-[11px] font-medium text-muted-foreground">Sidebar Style</p>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { value: "plain", label: "Plain" },
                                  { value: "colored", label: "Colored" },
                                  { value: "gradient", label: "Gradient" },
                                ].map((s) => {
                                  const active = brand.sidebarStyle === s.value;
                                  return (
                                    <button
                                      key={s.value}
                                      type="button"
                                      onClick={() => updateBrandLive((p) => ({ ...p, sidebarStyle: s.value }))}
                                      className={cn(
                                        "h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                                        active
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "bg-background text-foreground border-border hover:bg-muted/50"
                                      )}
                                    >
                                      <span>{s.label}</span>
                                      {active && <i className="ph ph-check text-xs" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Layout Direction (Matches Screenshot 3) */}
                          <div className="space-y-2 pt-2 border-t border-border/60">
                            <Label className="text-xs font-semibold">Layout Direction</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: "ltr", label: "Left-to-Right" },
                                { value: "rtl", label: "Right-to-Left" },
                              ].map((d) => {
                                const active = brand.layoutDirection === d.value;
                                return (
                                  <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => updateBrandLive((p) => ({ ...p, layoutDirection: d.value }))}
                                    className={cn(
                                      "h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                                      active
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-foreground border-border hover:bg-muted/50"
                                    )}
                                  >
                                    <span>{d.label}</span>
                                    {active && <i className="ph ph-check text-xs" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Theme Mode (Matches Screenshot 3) */}
                          <div className="space-y-2 pt-2 border-t border-border/60">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <i className="ph ph-moon text-sm" />
                              Theme Mode
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { value: "light", label: "Light" },
                                { value: "dark", label: "Dark" },
                                { value: "system", label: "System" },
                              ].map((t) => {
                                const active = brand.themeMode === t.value;
                                return (
                                  <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => updateBrandLive((p) => ({ ...p, themeMode: t.value }))}
                                    className={cn(
                                      "h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                                      active
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-foreground border-border hover:bg-muted/50"
                                    )}
                                  >
                                    <span>{t.label}</span>
                                    {active && <i className="ph ph-check text-xs" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Live Preview Box (Matches Screenshot 2) */}
                    <div className="rounded-xl border border-border/80 p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <i className="ph ph-palette text-primary" />
                        Live Preview
                      </div>
                      <div className="rounded-lg border border-border/70 bg-card p-3 space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground">Theme Preview</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="soft" className="text-[10px]">{brand.themeMode}</Badge>
                            <Badge variant="soft" className="text-[10px]">{brand.sidebarPosition}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-16 space-y-1.5 border-r border-border/60 pr-2">
                            <div className="h-5 flex items-center">
                              {brand.logoDark ? (
                                <img src={brand.logoDark} alt="Preview" className="max-h-5 object-contain" />
                              ) : (
                                <span className="text-xs font-bold truncate">{brand.companyName || "HRM"}</span>
                              )}
                            </div>
                            <div className="h-3 rounded" style={{ backgroundColor: `${brand.themeColor}33` }} />
                            <div className="h-2.5 rounded bg-muted" />
                            <div className="h-2.5 rounded bg-muted w-3/4" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="h-6 rounded bg-muted/60" />
                            <div className="h-2.5 rounded bg-muted/60 w-5/6" />
                            <div className="flex gap-2 pt-1">
                              <div className="h-6 w-14 rounded" style={{ backgroundColor: brand.themeColor }} />
                              <div className="h-6 w-12 rounded bg-muted" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{brand.footerText}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 3. CURRENCY SETTINGS */}
            {mode === "tenant" && (
              <Card id="settings-section-currency" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Currency Settings</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure how currency values are displayed throughout the entire workspace.
                      </p>
                    </div>
                    <SaveBtn section="currency" payload={currency} />
                  </div>

                  {/* Live Currency Preview Card (Matches Screenshot 3) */}
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <i className="ph ph-currency-circle-dollar text-base" />
                      Format Options
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/70 bg-card p-4">
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {formatAmountWithConfig(sampleAmount, currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {currency.currencyName} ({currency.defaultCurrency})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={sampleAmount}
                          onChange={(e) => setSampleAmount(e.target.value)}
                          className="w-28 h-8 text-xs text-right"
                        />
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setSampleAmount("1234.56")}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Default Currency *</Label>
                      <Select
                        value={currency.defaultCurrency}
                        onValueChange={(code) => {
                          const found = CURRENCY_OPTIONS.find((c) => c.code === code);
                          if (found) {
                            setCurrency((p) => ({
                              ...p,
                              defaultCurrency: found.code,
                              symbol: found.symbol,
                              currencyName: found.name,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.symbol} {c.code} - {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Decimal Places *</Label>
                      <Select
                        value={String(currency.decimalPlaces)}
                        onValueChange={(v) => setCurrency((p) => ({ ...p, decimalPlaces: Number(v) }))}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 (e.g., 1235)</SelectItem>
                          <SelectItem value="2">2 (e.g., 1234.56)</SelectItem>
                          <SelectItem value="3">3 (e.g., 1234.560)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Symbol Position *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrency((p) => ({ ...p, symbolPosition: "prefix" }))}
                          className={cn(
                            "h-9 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                            currency.symbolPosition === "prefix"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:bg-muted/50"
                          )}
                        >
                          {currency.symbol} 100
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrency((p) => ({ ...p, symbolPosition: "suffix" }))}
                          className={cn(
                            "h-9 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                            currency.symbolPosition === "suffix"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:bg-muted/50"
                          )}
                        >
                          100 {currency.symbol}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Decimal Separator *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrency((p) => ({ ...p, decimalSeparator: "." }))}
                          className={cn(
                            "h-9 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                            currency.decimalSeparator === "."
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:bg-muted/50"
                          )}
                        >
                          Dot (123.45)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrency((p) => ({ ...p, decimalSeparator: "," }))}
                          className={cn(
                            "h-9 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                            currency.decimalSeparator === ","
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:bg-muted/50"
                          )}
                        >
                          Comma (123,45)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Thousands Separator *</Label>
                      <Select
                        value={currency.thousandsSeparator || "none"}
                        onValueChange={(v) =>
                          setCurrency((p) => ({
                            ...p,
                            thousandsSeparator: (v === "none" ? "" : v) as any,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=",">Comma (1,234.56)</SelectItem>
                          <SelectItem value=".">Dot (1.234,56)</SelectItem>
                          <SelectItem value=" ">Space (1 234.56)</SelectItem>
                          <SelectItem value="none">None (1234.56)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-lg border border-border/70 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Show Decimals</p>
                        <p className="text-[11px] text-muted-foreground">Display decimal places in amounts</p>
                      </div>
                      <Switch
                        checked={currency.showDecimals}
                        onCheckedChange={(v) => setCurrency((p) => ({ ...p, showDecimals: v }))}
                      />
                    </div>

                    <div className="rounded-lg border border-border/70 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Add Space</p>
                        <p className="text-[11px] text-muted-foreground">Space between amount and symbol</p>
                      </div>
                      <Switch
                        checked={currency.addSpace}
                        onCheckedChange={(v) => setCurrency((p) => ({ ...p, addSpace: v }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4. EMAIL SETTINGS */}
            {mode === "tenant" && (
              <Card id="settings-section-email" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Email Settings</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure email server settings for system notifications, OTPs, and payslips.
                      </p>
                    </div>
                    <SaveBtn section="email" payload={email} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Email Provider</Label>
                        <Select value={email.provider} onValueChange={(v) => setEmail((p) => ({ ...p, provider: v }))}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMTP">SMTP</SelectItem>
                            <SelectItem value="AWS_SES">Amazon SES</SelectItem>
                            <SelectItem value="SENDGRID">SendGrid</SelectItem>
                            <SelectItem value="MAILGUN">Mailgun</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Mail Driver *</Label>
                        <Input value={email.driver} onChange={(e) => setEmail((p) => ({ ...p, driver: e.target.value }))} placeholder="smtp" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">SMTP Host *</Label>
                        <Input value={email.host} onChange={(e) => setEmail((p) => ({ ...p, host: e.target.value }))} placeholder="smtp.example.com" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">SMTP Port *</Label>
                        <Input value={email.port} onChange={(e) => setEmail((p) => ({ ...p, port: e.target.value }))} placeholder="587" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">SMTP Username *</Label>
                        <Input value={email.username} onChange={(e) => setEmail((p) => ({ ...p, username: e.target.value }))} placeholder="user@example.com" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">SMTP Password *</Label>
                        <Input type="password" value={email.password} onChange={(e) => setEmail((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••••••" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Mail Encryption *</Label>
                        <Select value={email.encryption} onValueChange={(v) => setEmail((p) => ({ ...p, encryption: v }))}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TLS">TLS</SelectItem>
                            <SelectItem value="SSL">SSL</SelectItem>
                            <SelectItem value="NONE">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">From Address *</Label>
                        <Input value={email.fromAddress} onChange={(e) => setEmail((p) => ({ ...p, fromAddress: e.target.value }))} placeholder="noreply@company.com" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-medium">From Name *</Label>
                        <Input value={email.fromName} onChange={(e) => setEmail((p) => ({ ...p, fromName: e.target.value }))} placeholder="MasterHRMS System" className="h-9 text-xs" />
                      </div>
                    </div>

                    {/* Test Email Box (Matches Screenshot 4) */}
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3 h-fit">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <i className="ph ph-paper-plane-tilt text-emerald-600" />
                        Test Email Configuration
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Send Test To</Label>
                        <Input
                          type="email"
                          value={testEmailTo}
                          onChange={(e) => setTestEmailTo(e.target.value)}
                          placeholder="test@example.com"
                          className="h-9 text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Enter an email address to send a live test message.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={testEmailMutation.isPending || !testEmailTo.trim()}
                        onClick={() => testEmailMutation.mutate()}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                      >
                        <i className={testEmailMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-paper-plane-right"} />
                        Send Test Email
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 5. EMAIL NOTIFICATION SETTINGS (HR FLOW ONLY) */}
            <Card id="settings-section-email_notifications" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">Email Notification Settings</h2>
                      <Badge variant="soft" className="text-[10px]">HR Flow</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure which HR workflow email notifications are triggered automatically.
                    </p>
                  </div>
                  <SaveBtn section="email_notifications" payload={emailNotifications} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {HR_NOTIFICATION_ITEMS.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3.5 py-2.5 bg-background"
                    >
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                      <Switch
                        disabled={!canEdit}
                        checked={Boolean(emailNotifications[item.key])}
                        onCheckedChange={(v) =>
                          setEmailNotifications((prev) => ({ ...prev, [item.key]: v }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 6-9. DEDICATED ADDON-INTEGRATIONS (Slack, Telegram, Twilio SMS, Zoom) */}
            {mode === "tenant" && (
              <>
                <Card id="settings-section-slack" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-foreground">Slack Settings</h2>
                          <Badge variant="soft" className="text-[10px]">Add-on Integration</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Connect Slack webhooks for real-time HR & workspace alerts.
                        </p>
                      </div>
                      <SaveBtn section="slack" payload={slack} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                      <span className="text-xs font-semibold">Enable Slack Integration</span>
                      <Switch checked={slack.enabled} onCheckedChange={(v) => setSlack((p) => ({ ...p, enabled: v }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Slack Webhook URL</Label>
                        <Input value={slack.webhookUrl} onChange={(e) => setSlack((p) => ({ ...p, webhookUrl: e.target.value }))} placeholder="https://hooks.slack.com/services/..." className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Default Channel</Label>
                        <Input value={slack.defaultChannel} onChange={(e) => setSlack((p) => ({ ...p, defaultChannel: e.target.value }))} placeholder="#hr-updates" className="h-9 text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card id="settings-section-telegram" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-foreground">Telegram Settings</h2>
                          <Badge variant="soft" className="text-[10px]">Add-on Integration</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Configure Telegram Bot token and Chat ID for instant notifications.
                        </p>
                      </div>
                      <SaveBtn section="telegram" payload={telegram} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                      <span className="text-xs font-semibold">Enable Telegram Bot</span>
                      <Switch checked={telegram.enabled} onCheckedChange={(v) => setTelegram((p) => ({ ...p, enabled: v }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Telegram Access Token</Label>
                        <Input type="password" value={telegram.botToken} onChange={(e) => setTelegram((p) => ({ ...p, botToken: e.target.value }))} placeholder="BotFather token" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Telegram Chat ID</Label>
                        <Input value={telegram.chatId} onChange={(e) => setTelegram((p) => ({ ...p, chatId: e.target.value }))} placeholder="-1001234567890" className="h-9 text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card id="settings-section-twilio" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-foreground">Twilio SMS Settings</h2>
                          <Badge variant="soft" className="text-[10px]">Add-on Integration</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Configure Twilio SMS credentials for employee alerts and OTP SMS.
                        </p>
                      </div>
                      <SaveBtn section="twilio" payload={twilio} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                      <span className="text-xs font-semibold">Enable Twilio SMS</span>
                      <Switch checked={twilio.enabled} onCheckedChange={(v) => setTwilio((p) => ({ ...p, enabled: v }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Account SID</Label>
                        <Input value={twilio.accountSid} onChange={(e) => setTwilio((p) => ({ ...p, accountSid: e.target.value }))} placeholder="ACxxxxxxxxxxxxxxxx" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Auth Token</Label>
                        <Input type="password" value={twilio.authToken} onChange={(e) => setTwilio((p) => ({ ...p, authToken: e.target.value }))} placeholder="••••••••••••" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">From Number</Label>
                        <Input value={twilio.fromNumber} onChange={(e) => setTwilio((p) => ({ ...p, fromNumber: e.target.value }))} placeholder="+1234567890" className="h-9 text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card id="settings-section-zoom" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-foreground">Zoom Meeting Settings</h2>
                          <Badge variant="soft" className="text-[10px]">Add-on Integration</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Connect Zoom Server-to-Server OAuth for interviews and HR meetings.
                        </p>
                      </div>
                      <SaveBtn section="zoom" payload={zoom} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                      <span className="text-xs font-semibold">Enable Zoom Meetings</span>
                      <Switch checked={zoom.enabled} onCheckedChange={(v) => setZoom((p) => ({ ...p, enabled: v }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Account ID</Label>
                        <Input value={zoom.accountId} onChange={(e) => setZoom((p) => ({ ...p, accountId: e.target.value }))} placeholder="Zoom Account ID" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Client ID</Label>
                        <Input value={zoom.clientId} onChange={(e) => setZoom((p) => ({ ...p, clientId: e.target.value }))} placeholder="Zoom Client ID" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Client Secret</Label>
                        <Input type="password" value={zoom.clientSecret} onChange={(e) => setZoom((p) => ({ ...p, clientSecret: e.target.value }))} placeholder="••••••••••••" className="h-9 text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* 10. WORKING DAYS SETTINGS (HRMS) */}
            <Card id="settings-section-working_days" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">Working Days Settings</h2>
                      <Badge variant="soft" className="text-[10px]">HRMS</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure which days are official working days for attendance & payroll calculations.
                    </p>
                  </div>
                  <SaveBtn section="working_days" payload={workingDays} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day.key}
                      className="flex items-center justify-between rounded-lg border border-border/70 px-4 py-3 bg-background"
                    >
                      <span className="text-xs font-medium text-foreground flex items-center gap-2">
                        <i className="ph ph-clock text-muted-foreground" />
                        {day.label}
                      </span>
                      <Switch
                        disabled={!canEdit}
                        checked={Boolean(workingDays[day.key])}
                        onCheckedChange={(v) => setWorkingDays((p) => ({ ...p, [day.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 11. IP RESTRICTION SETTINGS (OVERALL SYSTEM) */}
            {mode === "tenant" && (
              <Card id="settings-section-ip_restriction" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">IP Restriction Settings</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage allowed IP addresses for company access.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setEditingIpId(null);
                        setIpValue("");
                        setIpLabel("");
                        setIpModalOpen(true);
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                    >
                      <i className="ph ph-plus" />
                      Add IP Address
                    </Button>
                  </div>

                  <div className="overflow-x-auto border border-border/80 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/70">
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 w-12">#</th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">IP Address</th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Label</th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {ipRestriction.allowedIps.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-muted-foreground">
                              No IP restrictions added. All IPs are currently permitted.
                            </td>
                          </tr>
                        ) : (
                          ipRestriction.allowedIps.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                              <td className="p-3 text-muted-foreground">{idx + 1}</td>
                              <td className="p-3 font-semibold text-foreground">{item.ip}</td>
                              <td className="p-3 text-muted-foreground">{item.label || "Allowed IP"}</td>
                              <td className="p-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingIpId(item.id);
                                      setIpValue(item.ip);
                                      setIpLabel(item.label || "");
                                      setIpModalOpen(true);
                                    }}
                                  >
                                    <i className="ph ph-pencil-simple" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="ghost"
                                    className="text-rose-600 hover:bg-rose-500/10"
                                    onClick={() => handleDeleteIp(item.id)}
                                  >
                                    <i className="ph ph-trash" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 12. NOC SETTINGS (HRMS) */}
            <Card id="settings-section-noc" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-foreground">No Objection Certificate Settings</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure NOC templates with dynamic employee placeholders.
                    </p>
                  </div>
                  <SaveBtn section="noc" payload={noc} />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Select value={noc.language} onValueChange={(v) => setNoc((p) => ({ ...p, language: v }))}>
                      <SelectTrigger className="w-40 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ta">Tamil</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-2 block">Available Placeholders (Click to Insert)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { label: "Date", token: "{date}" },
                        { label: "Company Name", token: "{company_name}" },
                        { label: "Employee Name", token: "{employee_name}" },
                        { label: "Designation", token: "{designation}" },
                      ].map((ph) => (
                        <button
                          key={ph.token}
                          type="button"
                          onClick={() => insertPlaceholder(setNoc, ph.token)}
                          className="rounded-lg border border-border/70 p-2.5 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-foreground">{ph.label}</p>
                          <p className="text-[11px] text-primary mt-0.5">{ph.token}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Template Content</Label>
                    <Textarea
                      rows={8}
                      disabled={!canEdit}
                      value={noc.content}
                      onChange={(e) => setNoc((p) => ({ ...p, content: e.target.value }))}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 13. EXPERIENCE CERTIFICATE SETTINGS (HR SETTINGS) */}
            <Card id="settings-section-experience_certificate" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-foreground">Experience Certificate Settings</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure Experience Certificate templates for exiting employees.
                    </p>
                  </div>
                  <SaveBtn section="experience_certificate" payload={experienceCert} />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold mb-2 block">Available Placeholders (Click to Insert)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { label: "Date", token: "{date}" },
                        { label: "Company Name", token: "{company_name}" },
                        { label: "Employee Name", token: "{employee_name}" },
                        { label: "Designation", token: "{designation}" },
                        { label: "Joining Date", token: "{joining_date}" },
                        { label: "Relieving Date", token: "{relieving_date}" },
                      ].map((ph) => (
                        <button
                          key={ph.token}
                          type="button"
                          onClick={() => insertPlaceholder(setExperienceCert, ph.token)}
                          className="rounded-lg border border-border/70 p-2.5 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-foreground">{ph.label}</p>
                          <p className="text-[11px] text-primary mt-0.5">{ph.token}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Template Content</Label>
                    <Textarea
                      rows={8}
                      disabled={!canEdit}
                      value={experienceCert.content}
                      onChange={(e) => setExperienceCert((p) => ({ ...p, content: e.target.value }))}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 14. JOINING LETTER SETTINGS (HRMS) */}
            <Card id="settings-section-joining_letter" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-foreground">Joining Letter Settings</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure Joining Letter templates for newly onboarded employees.
                    </p>
                  </div>
                  <SaveBtn section="joining_letter" payload={joiningLetter} />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Select
                      value={joiningLetter.language}
                      onValueChange={(v) => setJoiningLetter((p) => ({ ...p, language: v }))}
                    >
                      <SelectTrigger className="w-40 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ta">Tamil</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-2 block">Available Placeholders (Click to Insert)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { label: "Date", token: "{date}" },
                        { label: "Company Name", token: "{company_name}" },
                        { label: "Employee Name", token: "{employee_name}" },
                        { label: "Designation", token: "{designation}" },
                        { label: "Joining Date", token: "{joining_date}" },
                        { label: "Salary", token: "{salary}" },
                        { label: "Department", token: "{department}" },
                      ].map((ph) => (
                        <button
                          key={ph.token}
                          type="button"
                          onClick={() => insertPlaceholder(setJoiningLetter, ph.token)}
                          className="rounded-lg border border-border/70 p-2.5 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-foreground">{ph.label}</p>
                          <p className="text-[11px] text-primary mt-0.5">{ph.token}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Template Content</Label>
                    <Textarea
                      rows={9}
                      disabled={!canEdit}
                      value={joiningLetter.content}
                      onChange={(e) => setJoiningLetter((p) => ({ ...p, content: e.target.value }))}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add / Edit IP Address Modal */}
      <Dialog open={ipModalOpen} onOpenChange={setIpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingIpId ? "Edit Allowed IP Address" : "Add Allowed IP Address"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter an IPv4/IPv6 address or CIDR block permitted for workspace access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">IP Address *</Label>
              <Input
                value={ipValue}
                onChange={(e) => setIpValue(e.target.value)}
                placeholder="e.g. 192.168.1.100"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Label</Label>
              <Input
                value={ipLabel}
                onChange={(e) => setIpLabel(e.target.value)}
                placeholder="e.g. Chennai Head Office"
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setIpModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveIp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save IP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Brand Logo / Favicon Crop & Auto-Fit Modal */}
      <BrandImageCropDialog
        open={cropDialog.open}
        assetType={cropDialog.assetType}
        sourceDataUrl={cropDialog.sourceDataUrl}
        isUploading={uploadBrandAssetMutation.isPending}
        onClose={() => setCropDialog((p) => ({ ...p, open: false, sourceDataUrl: null }))}
        onConfirm={(croppedDataUrl) => {
          uploadBrandAssetMutation.mutate(
            { assetType: cropDialog.assetType, imageDataUrl: croppedDataUrl },
            {
              onSuccess: () => {
                setCropDialog((p) => ({ ...p, open: false, sourceDataUrl: null }));
              },
            }
          );
        }}
      />
    </div>
  );
}
