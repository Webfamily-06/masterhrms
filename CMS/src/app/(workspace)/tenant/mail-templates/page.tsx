"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TENANT_DEFAULT_EMAIL_TEMPLATES,
  TENANT_EMAIL_CATEGORIES,
  TENANT_SAMPLE_VARS,
  type EmailTemplate,
} from "@/lib/tenant-email-templates";
import { UniversalEmailPreviewSuite } from "@/components/email/universal-email-preview-suite";
import {
  substituteUniversalEmailVars,
  type UniversalEmailBranding,
} from "@/lib/email-design-system";
import { useWorkspaceSettings } from "@/context/workspace-settings-context";

const ALLOWED_CATEGORIES = new Set<string>(TENANT_EMAIL_CATEGORIES);

function mergeTenantTemplates(fetched?: EmailTemplate[] | null): EmailTemplate[] {
  if (!Array.isArray(fetched) || fetched.length === 0) {
    return TENANT_DEFAULT_EMAIL_TEMPLATES;
  }
  const fetchedMap = new Map(
    fetched
      .filter((t) => t && t.id && ALLOWED_CATEGORIES.has(t.category))
      .map((t) => [t.id, t])
  );
  const merged: EmailTemplate[] = [];
  for (const def of TENANT_DEFAULT_EMAIL_TEMPLATES) {
    merged.push(fetchedMap.get(def.id) || def);
    fetchedMap.delete(def.id);
  }
  for (const custom of fetchedMap.values()) {
    merged.push(custom);
  }
  return merged;
}

export default function TenantMailTemplatesPage() {
  const qc = useQueryClient();
  const { brand: workspaceBrand, tenant: workspaceTenant } = useWorkspaceSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>("HR");
  const [selectedId, setSelectedId] = useState<string>(
    TENANT_DEFAULT_EMAIL_TEMPLATES[0]?.id || "hr-assign-document-to-employee"
  );
  const [pageMode, setPageMode] = useState<"templates" | "validation">("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [draftOverrides, setDraftOverrides] = useState<Record<string, EmailTemplate>>({});
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const {
    data: templatePayload,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["tenant-email-templates"],
    queryFn: async () => {
      try {
        const res = await api.get("/workspace/email-templates");
        const raw = res?.templates || res?.data?.templates || [];
        return {
          templates: mergeTenantTemplates(raw),
          branding: (res?.branding || res?.data?.branding || null) as UniversalEmailBranding | null,
          brandingVars: (res?.brandingVars || res?.data?.brandingVars || {}) as Record<string, string>,
        };
      } catch {
        return {
          templates: TENANT_DEFAULT_EMAIL_TEMPLATES,
          branding: null as UniversalEmailBranding | null,
          brandingVars: {} as Record<string, string>,
        };
      }
    },
  });

  const serverTemplates = templatePayload?.templates;

  const publicAppUrl = useMemo(() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin.replace(/\/+$/, "");
    }
    return "http://localhost:3000";
  }, []);

  // Priority: Brand Settings -> Logo Light, fallback to Logo Dark, then backend branding
  const resolvedTenantLogo = useMemo(() => {
    const candidates = [
      workspaceBrand?.logoLight,
      workspaceBrand?.logoDark,
      templatePayload?.branding?.tenant?.logoUrl,
      workspaceTenant?.logoUrl,
    ];
    for (const c of candidates) {
      const v = String(c || "").trim();
      if (v && v !== "/logo.webp" && v !== "/white-logo.webp") return v;
    }
    return "";
  }, [workspaceBrand?.logoLight, workspaceBrand?.logoDark, templatePayload?.branding?.tenant?.logoUrl, workspaceTenant?.logoUrl]);

  const resolvedCompanyName =
    workspaceBrand?.companyName ||
    templatePayload?.branding?.tenant?.companyName ||
    workspaceTenant?.name ||
    TENANT_SAMPLE_VARS.company_name;

  const resolvedTenantTagline =
    (workspaceBrand?.titleText &&
      workspaceBrand.titleText.toLowerCase() !== resolvedCompanyName.toLowerCase()
      ? workspaceBrand.titleText
      : "") ||
    templatePayload?.branding?.tenant?.tagline ||
    "";

  const liveBranding: UniversalEmailBranding | null = useMemo(() => {
    const base = templatePayload?.branding;
    return {
      tenant: {
        companyName: resolvedCompanyName,
        logoUrl: resolvedTenantLogo,
        tagline: resolvedTenantTagline,
        brandColor:
          workspaceBrand?.themeColor ||
          base?.tenant?.brandColor ||
          "#1d4ed8",
      },
      platform: base?.platform || {
        platformName: "MasterHRMS",
        logoUrl: "/logo.webp",
        tagline: "Smart HR. Better Workforce.",
        supportEmail: "support@masterhrms.com",
        websiteUrl: "https://masterhrms.com",
        websiteLabel: "masterhrms.com",
        copyrightText: `© ${new Date().getFullYear()} MasterHRMS. All rights reserved.`,
        playStoreUrl: "https://play.google.com/store",
        appStoreUrl: "https://apps.apple.com",
        privacyPolicyUrl: "https://masterhrms.com/privacy-policy",
        socialLinks: [
          { label: "Facebook", url: "https://facebook.com" },
          { label: "X", url: "https://x.com" },
          { label: "Instagram", url: "https://instagram.com" },
          { label: "LinkedIn", url: "https://linkedin.com" },
          { label: "YouTube", url: "https://youtube.com" },
        ],
      },
    };
  }, [templatePayload?.branding, resolvedCompanyName, resolvedTenantLogo, resolvedTenantTagline, workspaceBrand?.themeColor]);

  const effectiveSampleVars = useMemo(
    () => ({
      ...TENANT_SAMPLE_VARS,
      ...(templatePayload?.brandingVars || {}),
      portal_url: publicAppUrl,
      login_url: `${publicAppUrl}/auth`,
      payslip_url: `${publicAppUrl}/hr/payroll/runs`,
      calendarUrl: `${publicAppUrl}/tenant/calendar`,
      task_url: `${publicAppUrl}/tenant/todo`,
      company_name: resolvedCompanyName,
      COMPANY_NAME: resolvedCompanyName,
      tenant_logo_url: resolvedTenantLogo,
      tenant_tagline: resolvedTenantTagline,
      tenant_brand_color:
        workspaceBrand?.themeColor ||
        templatePayload?.brandingVars?.tenant_brand_color ||
        "#1d4ed8",
    }),
    [templatePayload?.brandingVars, publicAppUrl, resolvedCompanyName, resolvedTenantLogo, resolvedTenantTagline, workspaceBrand?.themeColor]
  );

  const list = useMemo(() => {
    const base = serverTemplates ?? TENANT_DEFAULT_EMAIL_TEMPLATES;
    return base.map((tpl) => draftOverrides[tpl.id] ?? tpl);
  }, [serverTemplates, draftOverrides]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter((t) => {
      const catOk = selectedCategory === "All" || t.category === selectedCategory;
      if (!catOk) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [list, selectedCategory, searchQuery]);

  const current =
    list.find((t) => t.id === selectedId) ?? filteredList[0] ?? list[0];

  const hasUnsavedChanges = Object.keys(draftOverrides).length > 0;

  const saveMutation = useMutation({
    mutationFn: async (updatedList: EmailTemplate[]) => {
      await api.put("/workspace/email-templates", {
        templates: updatedList,
      });
    },
    onSuccess: () => {
      setDraftOverrides({});
      toast.success(`Saved HTML email templates ("${current?.name}")`);
      qc.invalidateQueries({ queryKey: ["tenant-email-templates"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to save email templates");
    },
  });

  function updateCurrentField(field: keyof EmailTemplate, value: string) {
    if (!current) return;
    setDraftOverrides((prev) => ({
      ...prev,
      [current.id]: {
        ...(prev[current.id] ?? current),
        [field]: value,
      },
    }));
  }

  function handleResetCurrent() {
    if (!current) return;
    const def = TENANT_DEFAULT_EMAIL_TEMPLATES.find((t) => t.id === current.id);
    if (!def) return;
    setDraftOverrides((prev) => ({
      ...prev,
      [current.id]: { ...def },
    }));
    toast.info(`Reset "${def.name}" to default HTML template. Click Save Templates to persist.`);
  }

  const renderedPreviewHtml = useMemo(() => {
    return substituteUniversalEmailVars(current?.html_body || "", effectiveSampleVars);
  }, [current?.html_body, effectiveSampleVars]);

  const renderedPreviewSubject = useMemo(() => {
    let out = current?.subject || "";
    for (const [k, v] of Object.entries(effectiveSampleVars)) {
      out = out.replace(new RegExp(`{{${k}}}`, "g"), v);
    }
    return out;
  }, [current?.subject, effectiveSampleVars]);

  async function handleSendTestEmail() {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }
    if (!current) return;

    setIsSendingTest(true);
    try {
      const res = await api.post("/workspace/email-templates/test", {
        templateId: current.id,
        toEmail: testEmailAddress.trim(),
        subject: current.subject,
        htmlBody: current.html_body,
      });

      if (res?.success) {
        toast.success(res.message || `Test email sent to ${testEmailAddress}`);
        setTestModalOpen(false);
      } else {
        toast.error(res?.error || "Failed to send test email.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Test email delivery failed. Verify SMTP settings in Workspace Settings.");
    } finally {
      setIsSendingTest(false);
    }
  }

  function getCategoryBadgeClass(category: string, active: boolean) {
    if (active) return "bg-white/20 text-white";
    switch (category) {
      case "HR":
        return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
      case "Calendar":
        return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
      case "Tasks":
        return "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20";
      case "Invoices":
        return "bg-sky-500/10 text-sky-600 border border-sky-500/20";
      case "Payroll":
        return "bg-purple-500/10 text-purple-600 border border-purple-500/20";
      default:
        return "bg-primary/10 text-primary border border-primary/20";
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Mail Templates"
        description="Manage and customize organization-wide HTML email templates for HR workflows, Calendar, Tasks, Invoices, and Payroll."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <i className="ph ph-arrows-clockwise text-sm" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTestModalOpen(true)}
              className="gap-2"
            >
              <i className="ph ph-paper-plane-tilt text-sm" />
              Send Test Email
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate(list)}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <i className="ph ph-spinner animate-spin text-sm" />
              ) : (
                <i className="ph ph-floppy-disk text-sm" />
              )}
              {hasUnsavedChanges ? "Save Changes" : "Save Templates"}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <i className="ph ph-spinner animate-spin text-3xl text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <Tabs
            value={pageMode}
            onValueChange={(v) => setPageMode(v as "templates" | "validation")}
          >
            <TabsList>
              <TabsTrigger value="templates" className="gap-2 text-xs">
                <i className="ph ph-envelope-simple-open text-sm" />
                Organization Templates ({list.length})
              </TabsTrigger>
              <TabsTrigger value="validation" className="gap-2 text-xs">
                <i className="ph ph-layout text-sm" />
                Design System Validation (8 Scenarios)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {pageMode === "validation" ? (
            <UniversalEmailPreviewSuite liveBranding={liveBranding} />
          ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
          {/* Template Selector Sidebar */}
          <Card className="p-3 border border-border/80 rounded-xl bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between px-1 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <i className="ph-duotone ph-envelope-simple-open text-primary text-base" />
                <span>Templates</span>
              </div>
              <Badge variant="soft" className="text-[11px] font-mono">
                {list.length} Total
              </Badge>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1 p-1.5 bg-muted/40 rounded-lg border border-border/50 text-[11px]">
              {(["All", ...TENANT_EMAIL_CATEGORIES] as const).map((cat) => {
                const count =
                  cat === "All"
                    ? list.length
                    : list.filter((t) => t.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      const firstInCat =
                        cat === "All"
                          ? list[0]
                          : list.find((t) => t.category === cat);
                      if (firstInCat) setSelectedId(firstInCat.id);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 rounded-full ${
                        isSelected
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Template List */}
            <div className="space-y-1 max-h-[620px] overflow-y-auto pr-1">
              {filteredList.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No matching templates found.
                </div>
              ) : (
                filteredList.map((t) => {
                  const isActive = current?.id === t.id;
                  const isDirty = Boolean(draftOverrides[t.id]);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left p-3 rounded-lg text-xs transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{t.name}</span>
                        {isDirty && (
                          <span
                            className={`size-2 rounded-full shrink-0 ${
                              isActive ? "bg-white" : "bg-amber-500"
                            }`}
                            title="Unsaved changes"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span
                          className={`text-[10px] font-mono ${
                            isActive
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t.category}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${getCategoryBadgeClass(
                            t.category,
                            isActive
                          )}`}
                        >
                          {t.category} HTML
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Editor & Live Preview Studio */}
          {current && (
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs p-5 lg:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">
                      {current.name}
                    </h2>
                    <Badge variant="soft" className="text-[11px]">
                      {current.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dynamic values in <code className="text-[11px] font-mono">{"{{variable}}"}</code> are replaced automatically when emails are sent.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetCurrent}
                  className="gap-1.5 text-xs"
                >
                  <i className="ph ph-arrow-counter-clockwise text-sm" />
                  Reset Default
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Template Name</Label>
                  <Input
                    value={current.name}
                    onChange={(e) => updateCurrentField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Subject Line</Label>
                  <Input
                    value={current.subject}
                    onChange={(e) => updateCurrentField("subject", e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Variables */}
              <div className="p-3 rounded-lg border border-border/70 bg-muted/30 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Dynamic Template Variables (click to copy)</span>
                  <span className="text-[10px] font-normal">
                    Populated dynamically from organization records
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from(
                    new Set([
                      "{{tenant_logo_url}}",
                      "{{company_name}}",
                      "{{portal_url}}",
                      ...(current.variables ?? []),
                    ])
                  ).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(v);
                        toast.success(`Copied ${v}`);
                      }}
                      className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/30 font-mono text-[11px] transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <Tabs
                  value={activeView}
                  onValueChange={(v) => setActiveView(v as "preview" | "code")}
                >
                  <TabsList className="grid grid-cols-2 w-[230px]">
                    <TabsTrigger value="preview" className="gap-1.5 text-xs">
                      <i className="ph ph-eye text-sm" />
                      Live Preview
                    </TabsTrigger>
                    <TabsTrigger value="code" className="gap-1.5 text-xs">
                      <i className="ph ph-code text-sm" />
                      HTML Code
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {activeView === "preview" && (
                  <span className="text-[11px] text-muted-foreground">
                    Rendered with sample organization data
                  </span>
                )}
              </div>

              {/* Preview vs HTML Code */}
              {activeView === "code" ? (
                <div className="space-y-2">
                  <Textarea
                    value={current.html_body}
                    onChange={(e) => updateCurrentField("html_body", e.target.value)}
                    rows={22}
                    className="font-mono text-xs leading-relaxed bg-slate-950 text-slate-100 p-4 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Inline CSS is recommended for consistent rendering across Gmail, Outlook, and mobile mail apps.
                  </p>
                </div>
              ) : (
                <div className="border border-border/80 rounded-xl p-4 bg-muted/40 min-h-[480px]">
                  <div className="bg-card border border-border/80 rounded-t-lg p-3 text-xs text-muted-foreground border-b flex items-center gap-2">
                    <span className="font-semibold text-foreground">Subject:</span>
                    <span className="text-foreground">{renderedPreviewSubject}</span>
                  </div>
                  <iframe
                    title="Tenant Email Template Preview"
                    srcDoc={renderedPreviewHtml}
                    className="w-full h-[460px] border-0 rounded-b-lg bg-white shadow-xs"
                  />
                </div>
              )}
            </Card>
          )}
        </div>
          )}
        </div>
      )}

      {/* Send Test Email Dialog */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Dispatch a real HTML test email for &quot;{current?.name}&quot; using your organization&apos;s configured SMTP settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tenant-test-email" className="text-xs font-semibold">
                Recipient Email Address
              </Label>
              <Input
                id="tenant-test-email"
                type="email"
                placeholder="recipient@company.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/70">
              Dynamic placeholders will be previewed with sample values (e.g.{" "}
              <strong>{TENANT_SAMPLE_VARS.employee_name}</strong>,{" "}
              <strong>{TENANT_SAMPLE_VARS.company_name}</strong>).
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="gap-2"
            >
              {isSendingTest ? (
                <i className="ph ph-spinner animate-spin text-sm" />
              ) : (
                <i className="ph ph-paper-plane-tilt text-sm" />
              )}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
