'use client';

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SeoAndProvisioningCard() {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    metaTitle: "Master HRMS — Enterprise Human Resource Platform",
    metaDescription: "Next-generation Enterprise HRMS, Payroll, Attendance, and Performance Platform.",
    canonicalUrl: "https://masterhrms.com",
    robotsIndex: true,
    socialLinkedin: "",
    socialX: "",
    socialInstagram: "",
    socialFacebook: "",
    socialYoutube: "",
    appstoreUrl: "",
    playstoreUrl: "",
    baseDomain: "masterhrms.com",
    cnameTarget: "cname.masterhrms.com",
    autoApproveCustomDomains: false,
    empIdAutoGenerate: true,
    empIdCompanyPrefix: "AUTO",
    empIdLocationPrefix: "AUTO",
    empIdDigits: "4",
    empIdSeparator: "-",
    backupSchedule: "daily",
    backupRetentionDays: "30",
    auditRetentionDays: "365",
  });

  const { data } = useQuery({
    queryKey: ["settings", "PLATFORM", "seo-domains-ops"],
    queryFn: async () => {
      const [seo, domains, hr, sys] = await Promise.all([
        api.get("/v1/settings/PLATFORM/seo").then((r: any) => r?.values || {}).catch(() => ({})),
        api.get("/v1/settings/PLATFORM/domains").then((r: any) => r?.values || {}).catch(() => ({})),
        api.get("/v1/settings/PLATFORM/hr").then((r: any) => r?.values || {}).catch(() => ({})),
        api.get("/v1/settings/PLATFORM/system").then((r: any) => r?.values || {}).catch(() => ({})),
      ]);
      return { seo, domains, hr, sys };
    },
  });

  useEffect(() => {
    if (!data) return;
    const { seo, domains, hr, sys } = data;
    setForm((prev) => ({
      ...prev,
      metaTitle: String(seo["seo.meta_title"] || prev.metaTitle),
      metaDescription: String(seo["seo.meta_description"] || prev.metaDescription),
      canonicalUrl: String(seo["seo.canonical_url"] || prev.canonicalUrl),
      robotsIndex: seo["seo.robots_index"] !== false,
      socialLinkedin: String(seo["seo.social_linkedin"] || ""),
      socialX: String(seo["seo.social_x"] || ""),
      socialInstagram: String(seo["seo.social_instagram"] || ""),
      socialFacebook: String(seo["seo.social_facebook"] || ""),
      socialYoutube: String(seo["seo.social_youtube"] || ""),
      appstoreUrl: String(seo["seo.appstore_url"] || ""),
      playstoreUrl: String(seo["seo.playstore_url"] || ""),
      baseDomain: String(domains["domains.base_domain"] || prev.baseDomain),
      cnameTarget: String(domains["domains.cname_target"] || prev.cnameTarget),
      autoApproveCustomDomains: Boolean(domains["domains.auto_approve_custom_domains"]),
      empIdAutoGenerate: hr["hr.employee_id.auto_generate"] !== false,
      empIdCompanyPrefix: String(hr["hr.employee_id.company_prefix"] || "AUTO"),
      empIdLocationPrefix: String(hr["hr.employee_id.location_prefix"] || "AUTO"),
      empIdDigits: String(hr["hr.employee_id.sequence_digits"] ?? 4),
      empIdSeparator: String(hr["hr.employee_id.separator"] || "-"),
      backupSchedule: String(sys["system.backup_schedule"] || "daily"),
      backupRetentionDays: String(sys["system.backup_retention_days"] ?? 30),
      auditRetentionDays: String(sys["system.audit_retention_days"] ?? 365),
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      await Promise.all([
        api.put("/v1/settings/PLATFORM/seo", {
          "seo.meta_title": form.metaTitle.trim(),
          "seo.meta_description": form.metaDescription.trim(),
          "seo.canonical_url": form.canonicalUrl.trim(),
          "seo.robots_index": Boolean(form.robotsIndex),
          "seo.social_linkedin": form.socialLinkedin.trim(),
          "seo.social_x": form.socialX.trim(),
          "seo.social_instagram": form.socialInstagram.trim(),
          "seo.social_facebook": form.socialFacebook.trim(),
          "seo.social_youtube": form.socialYoutube.trim(),
          "seo.appstore_url": form.appstoreUrl.trim(),
          "seo.playstore_url": form.playstoreUrl.trim(),
        }),
        api.put("/v1/settings/PLATFORM/domains", {
          "domains.base_domain": form.baseDomain.trim(),
          "domains.cname_target": form.cnameTarget.trim(),
          "domains.auto_approve_custom_domains": Boolean(form.autoApproveCustomDomains),
        }),
        api.put("/v1/settings/PLATFORM/hr", {
          "hr.employee_id.auto_generate": Boolean(form.empIdAutoGenerate),
          "hr.employee_id.company_prefix": form.empIdCompanyPrefix.trim() || "AUTO",
          "hr.employee_id.location_prefix": form.empIdLocationPrefix.trim() || "AUTO",
          "hr.employee_id.sequence_digits": Math.max(2, Math.min(8, Number(form.empIdDigits) || 4)),
          "hr.employee_id.separator": form.empIdSeparator || "-",
        }),
        api.put("/v1/settings/PLATFORM/system", {
          "system.backup_schedule": form.backupSchedule,
          "system.backup_retention_days": Math.max(1, Math.min(3650, Number(form.backupRetentionDays) || 30)),
          "system.audit_retention_days": Math.max(30, Math.min(3650, Number(form.auditRetentionDays) || 365)),
        }),
      ]);
    },
    onSuccess: () => {
      toast.success("SEO, domain provisioning, employee ID defaults, and retention policies saved.");
      qc.invalidateQueries({ queryKey: ["settings", "PLATFORM", "seo-domains-ops"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save SEO & provisioning settings"),
  });

  const sampleEmpId = [
    form.empIdCompanyPrefix === "AUTO" ? "ACM" : form.empIdCompanyPrefix.toUpperCase(),
    form.empIdLocationPrefix === "AUTO" ? "BLR" : form.empIdLocationPrefix.toUpperCase(),
    "1".padStart(Math.max(2, Math.min(8, Number(form.empIdDigits) || 4)), "0"),
  ].join(form.empIdSeparator || "-");

  return (
    <Card id="settings-section-seo-provisioning" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 flex-wrap">
          <div className="flex items-start gap-2.5">
            <i className="ph ph-globe-hemisphere-west text-xl text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-foreground">SEO, Domains, Provisioning &amp; Retention</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Public portal metadata, social/app links, custom domain CNAME routing, default Employee ID format, and backup/audit retention.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
          >
            <i className={saveMut.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-floppy-disk"} />
            Save Changes
          </Button>
        </div>

        {/* 1. SEO & Public Metadata */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground">Public Portal SEO &amp; Indexing</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Allow Search Indexing</span>
              <Switch
                checked={form.robotsIndex}
                onCheckedChange={(v) => setForm((p) => ({ ...p, robotsIndex: v }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Global Meta Title</Label>
              <Input
                value={form.metaTitle}
                onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Canonical Site URL</Label>
              <Input
                value={form.canonicalUrl}
                onChange={(e) => setForm((p) => ({ ...p, canonicalUrl: e.target.value }))}
                placeholder="https://www.masterhrms.com"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Global Meta Description</Label>
              <Textarea
                rows={2}
                value={form.metaDescription}
                onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">LinkedIn URL</Label>
              <Input value={form.socialLinkedin} onChange={(e) => setForm((p) => ({ ...p, socialLinkedin: e.target.value }))} placeholder="https://linkedin.com/company/..." className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">X (Twitter) URL</Label>
              <Input value={form.socialX} onChange={(e) => setForm((p) => ({ ...p, socialX: e.target.value }))} placeholder="https://x.com/..." className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Instagram URL</Label>
              <Input value={form.socialInstagram} onChange={(e) => setForm((p) => ({ ...p, socialInstagram: e.target.value }))} placeholder="https://instagram.com/..." className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">YouTube URL</Label>
              <Input value={form.socialYoutube} onChange={(e) => setForm((p) => ({ ...p, socialYoutube: e.target.value }))} placeholder="https://youtube.com/@..." className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Apple App Store URL</Label>
              <Input value={form.appstoreUrl} onChange={(e) => setForm((p) => ({ ...p, appstoreUrl: e.target.value }))} placeholder="https://apps.apple.com/..." className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Google Play Store URL</Label>
              <Input value={form.playstoreUrl} onChange={(e) => setForm((p) => ({ ...p, playstoreUrl: e.target.value }))} placeholder="https://play.google.com/..." className="h-8 text-xs" />
            </div>
          </div>
        </div>

        {/* 2. Domains & Default Employee ID Pattern */}
        <div className="pt-4 border-t border-border/60 space-y-4">
          <p className="text-xs font-bold text-foreground">Custom Domains &amp; Tenant Provisioning Defaults</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Platform Base Domain</Label>
              <Input value={form.baseDomain} onChange={(e) => setForm((p) => ({ ...p, baseDomain: e.target.value }))} placeholder="masterhrms.com" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Custom Domain CNAME Target</Label>
              <Input value={form.cnameTarget} onChange={(e) => setForm((p) => ({ ...p, cnameTarget: e.target.value }))} placeholder="cname.masterhrms.com" className="h-9 text-xs" />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-foreground">Auto-Approve Domains</p>
                <p className="text-[10px] text-muted-foreground">Activate after DNS passes</p>
              </div>
              <Switch
                checked={form.autoApproveCustomDomains}
                onCheckedChange={(v) => setForm((p) => ({ ...p, autoApproveCustomDomains: v }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Company Prefix</Label>
              <Input value={form.empIdCompanyPrefix} onChange={(e) => setForm((p) => ({ ...p, empIdCompanyPrefix: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Branch Prefix</Label>
              <Input value={form.empIdLocationPrefix} onChange={(e) => setForm((p) => ({ ...p, empIdLocationPrefix: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Digits</Label>
              <Input type="number" min={2} max={8} value={form.empIdDigits} onChange={(e) => setForm((p) => ({ ...p, empIdDigits: e.target.value }))} className="h-8 text-xs tabular-nums" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Separator</Label>
              <Select value={form.empIdSeparator} onValueChange={(v) => setForm((p) => ({ ...p, empIdSeparator: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Hyphen (-)</SelectItem>
                  <SelectItem value="/">Slash (/)</SelectItem>
                  <SelectItem value="_">Underscore (_)</SelectItem>
                  <SelectItem value=".">Dot (.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">ID Preview</Label>
              <div className="h-8 px-2.5 rounded-md border border-border/70 bg-muted/40 flex items-center text-xs font-bold text-primary tabular-nums">
                {sampleEmpId}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Backup & Audit Retention */}
        <div className="pt-4 border-t border-border/60 space-y-3">
          <p className="text-xs font-bold text-foreground">Backup &amp; Compliance Retention Governance</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Automated Backup Cadence</Label>
              <Select value={form.backupSchedule} onValueChange={(v) => setForm((p) => ({ ...p, backupSchedule: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Automated Snapshot</SelectItem>
                  <SelectItem value="weekly">Weekly Snapshot</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Backup Snapshot Retention (Days)</Label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={form.backupRetentionDays}
                onChange={(e) => setForm((p) => ({ ...p, backupRetentionDays: e.target.value }))}
                className="h-9 text-xs tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Audit Log Retention (Days)</Label>
              <Input
                type="number"
                min={30}
                max={3650}
                value={form.auditRetentionDays}
                onChange={(e) => setForm((p) => ({ ...p, auditRetentionDays: e.target.value }))}
                className="h-9 text-xs tabular-nums"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
