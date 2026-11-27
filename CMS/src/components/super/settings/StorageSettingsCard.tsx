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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StorageSettingsCard() {
  const qc = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);

  const [form, setForm] = useState({
    provider: "local",
    s3Bucket: "",
    s3Region: "ap-south-1",
    s3Endpoint: "",
    s3AccessKey: "",
    s3SecretKey: "",
    hasSecret: false,
    encryptionEnabled: true,
    maxFileSizeMb: "10",
    defaultTenantQuotaGb: "10",
    clamavHost: "",
  });

  const { data } = useQuery({
    queryKey: ["settings", "PLATFORM", "storage"],
    queryFn: async () => {
      const res: any = await api.get("/v1/settings/PLATFORM/storage").catch(() => null);
      return res?.values || {};
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      provider: String(data["storage.provider"] || "local"),
      s3Bucket: String(data["storage.s3_bucket"] || ""),
      s3Region: String(data["storage.s3_region"] || "ap-south-1"),
      s3Endpoint: String(data["storage.s3_endpoint"] || ""),
      s3AccessKey: String(data["storage.s3_access_key"] || ""),
      s3SecretKey: data["storage.s3_secret_key"]?.set ? "••••••••••••••••" : "",
      hasSecret: Boolean(data["storage.s3_secret_key"]?.set),
      encryptionEnabled: data["storage.encryption_enabled"] !== false,
      maxFileSizeMb: String(data["storage.max_file_size_mb"] ?? 10),
      defaultTenantQuotaGb: String(data["storage.default_tenant_quota_gb"] ?? 10),
      clamavHost: String(data["storage.clamav_host"] || ""),
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        "storage.provider": form.provider,
        "storage.s3_bucket": form.s3Bucket.trim(),
        "storage.s3_region": form.s3Region.trim() || "ap-south-1",
        "storage.s3_endpoint": form.s3Endpoint.trim(),
        "storage.s3_access_key": form.s3AccessKey.trim(),
        "storage.encryption_enabled": Boolean(form.encryptionEnabled),
        "storage.max_file_size_mb": Math.max(1, Math.min(100, Number(form.maxFileSizeMb) || 10)),
        "storage.default_tenant_quota_gb": Math.max(1, Math.min(10000, Number(form.defaultTenantQuotaGb) || 10)),
        "storage.clamav_host": form.clamavHost.trim(),
      };
      if (form.s3SecretKey && !form.s3SecretKey.includes("••••")) {
        payload["storage.s3_secret_key"] = form.s3SecretKey.trim();
      }
      return await api.put("/v1/settings/PLATFORM/storage", payload);
    },
    onSuccess: () => {
      toast.success("Cloud storage & file governance settings saved.");
      qc.invalidateQueries({ queryKey: ["settings", "PLATFORM", "storage"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save storage settings"),
  });

  async function handleTestStorage() {
    setTesting(true);
    try {
      const res: any = await api.post("/v1/settings/PLATFORM/storage/test", {});
      if (res?.success) {
        toast.success("Storage Connection Verified!", {
          description: `${res.message || "Bucket & write permissions verified."} (${res.latencyMs || 0}ms)`,
        });
      } else {
        toast.error("Storage Connection Failed", {
          description: res?.error || "Could not verify storage adapter.",
        });
      }
    } catch (err: any) {
      toast.error("Storage Test Error", {
        description: err?.response?.data?.error || err?.message || "Storage check failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  const isCloud = form.provider !== "local";

  return (
    <Card id="settings-section-storage" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 flex-wrap">
          <div className="flex items-start gap-2.5">
            <i className="ph ph-hard-drives text-xl text-primary mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Cloud Storage (S3 / R2 / GCS)</h2>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {form.provider}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure object storage driver, S3/Cloudflare R2/MinIO credentials, encryption, upload limits, and default tenant quotas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={testing}
              onClick={handleTestStorage}
              className="gap-1.5"
            >
              <i className={testing ? "ph ph-spinner-gap animate-spin" : "ph ph-plugs-connected"} />
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <i className={saveMut.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-floppy-disk"} />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Storage Driver</Label>
            <Select value={form.provider} onValueChange={(v) => setForm((p) => ({ ...p, provider: v }))}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Encrypted Disk</SelectItem>
                <SelectItem value="s3">AWS S3 / S3-Compatible (MinIO / Wasabi)</SelectItem>
                <SelectItem value="r2">Cloudflare R2 Object Storage</SelectItem>
                <SelectItem value="gcs">Google Cloud Storage (GCS)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Max Single File Upload (MB)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={form.maxFileSizeMb}
              onChange={(e) => setForm((p) => ({ ...p, maxFileSizeMb: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Default Tenant Storage Quota (GB)</Label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={form.defaultTenantQuotaGb}
              onChange={(e) => setForm((p) => ({ ...p, defaultTenantQuotaGb: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>
        </div>

        {isCloud && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bucket Name</Label>
              <Input
                value={form.s3Bucket}
                onChange={(e) => setForm((p) => ({ ...p, s3Bucket: e.target.value }))}
                placeholder="e.g. masterhrms-prod-vault"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Region</Label>
              <Input
                value={form.s3Region}
                onChange={(e) => setForm((p) => ({ ...p, s3Region: e.target.value }))}
                placeholder="ap-south-1 or auto"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Custom Endpoint URL (Optional for R2 / MinIO / Wasabi)</Label>
              <Input
                value={form.s3Endpoint}
                onChange={(e) => setForm((p) => ({ ...p, s3Endpoint: e.target.value }))}
                placeholder="https://<account-id>.r2.cloudflarestorage.com"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Access Key ID</Label>
              <Input
                value={form.s3AccessKey}
                onChange={(e) => setForm((p) => ({ ...p, s3AccessKey: e.target.value }))}
                placeholder="AKIA... or R2 Access Key"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Secret Access Key</Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {form.hasSecret ? "AES-256 Encrypted & Set" : "Not configured"}
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={form.s3SecretKey}
                  onChange={(e) => setForm((p) => ({ ...p, s3SecretKey: e.target.value }))}
                  placeholder="Leave masked to preserve existing secret"
                  className="h-9 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <i className={`ph ${showSecret ? "ph-eye-slash" : "ph-eye"} text-sm`} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/60 items-center">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">At-Rest AES-256-GCM Encryption</p>
              <p className="text-[11px] text-muted-foreground">Encrypt sensitive employee & payroll documents on disk.</p>
            </div>
            <Switch
              checked={form.encryptionEnabled}
              onCheckedChange={(v) => setForm((p) => ({ ...p, encryptionEnabled: v }))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">ClamAV Antivirus Host (Optional)</Label>
            <Input
              value={form.clamavHost}
              onChange={(e) => setForm((p) => ({ ...p, clamavHost: e.target.value }))}
              placeholder="e.g. 127.0.0.1:3310 (blank disables AV scan)"
              className="h-9 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
