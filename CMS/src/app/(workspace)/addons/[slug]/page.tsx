"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MASTER_ADDON_NAV_REGISTRY } from "@/lib/addon-navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function DynamicAddonWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = String(params?.slug || "").trim();

  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [customJson, setCustomJson] = useState("{}");

  // Check if this addon has a dedicated workspace route in MASTER_ADDON_NAV_REGISTRY
  const dedicatedNav = useMemo(() => {
    const clean = slug.toLowerCase();
    return MASTER_ADDON_NAV_REGISTRY.find(
      (def) =>
        def.slug.toLowerCase() === clean ||
        (def.aliases || []).some((a) => a.toLowerCase() === clean)
    );
  }, [slug]);

  const dedicatedRoute =
    dedicatedNav?.route && dedicatedNav.route !== `/addons/${slug}` ? dedicatedNav.route : null;

  const { data: entitlementData, isLoading: loadingEnt } = useQuery<any>({
    queryKey: ["addon-entitlements-single", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const res = await api.get<any>("/addons/entitlements");
      const map = res?.entitlements || res?.data || res || {};
      return map[slug] || null;
    },
  });

  const { data: configData, isLoading: loadingConfig } = useQuery<any>({
    queryKey: ["addon-config", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      try {
        const res = await api.get<any>(`/addons/${slug}/config`);
        return res?.data || res || {};
      } catch {
        return {};
      }
    },
  });

  useEffect(() => {
    const cfg = configData?.config || configData || {};
    if (cfg && typeof cfg === "object") {
      if (typeof cfg.apiKey === "string") setApiKey(cfg.apiKey);
      if (typeof cfg.webhookUrl === "string") setWebhookUrl(cfg.webhookUrl);
      try {
        setCustomJson(JSON.stringify(cfg, null, 2));
      } catch {
        setCustomJson("{}");
      }
    }
  }, [configData]);

  const installMutation = useMutation({
    mutationFn: async () => api.post(`/addons/${slug}/install`, {}),
    onSuccess: () => {
      toast.success("Add-on installed and activated.");
      queryClient.invalidateQueries({ queryKey: ["addon-entitlements-single", slug] });
      queryClient.invalidateQueries({ queryKey: ["addon-config", slug] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to install add-on.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (enable: boolean) =>
      api.post(`/addons/${slug}/${enable ? "enable" : "disable"}`, {}),
    onSuccess: (_d, enable) => {
      toast.success(enable ? "Add-on enabled." : "Add-on disabled.");
      queryClient.invalidateQueries({ queryKey: ["addon-entitlements-single", slug] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update add-on status.");
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, any> = {};
      try {
        parsed = JSON.parse(customJson || "{}");
      } catch {
        throw new Error("Invalid JSON in Advanced Configuration.");
      }
      const payload = {
        ...parsed,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        ...(webhookUrl.trim() ? { webhookUrl: webhookUrl.trim() } : {}),
      };
      return api.put(`/addons/${slug}/config`, { config: payload });
    },
    onSuccess: () => {
      toast.success("Add-on configuration saved.");
      queryClient.invalidateQueries({ queryKey: ["addon-config", slug] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save configuration.");
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => api.post(`/addons/${slug}/test-connection`, {}),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Connection test succeeded.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Connection test failed.");
    },
  });

  const title =
    dedicatedNav?.name ||
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const isInstalled = Boolean(entitlementData?.isInstalled);
  const isEnabled = Boolean(entitlementData?.isEnabled);

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={title}
        description="Manage installation status, credentials, webhook endpoints, and tenant configuration for this add-on."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/tenant/addon")}>
              <i className="ph ph-arrow-left mr-1.5" />
              Back to Marketplace
            </Button>
            {dedicatedRoute && (
              <Button variant="primary" size="sm" onClick={() => router.push(dedicatedRoute)}>
                <i className="ph ph-arrow-square-out mr-1.5" />
                Open Dedicated Workspace
              </Button>
            )}
            {!isInstalled ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => installMutation.mutate()}
                disabled={installMutation.isPending}
              >
                <i className="ph ph-download-simple mr-1.5" />
                {installMutation.isPending ? "Installing..." : "Install Add-on"}
              </Button>
            ) : (
              <Button
                variant={isEnabled ? "outline" : "primary"}
                size="sm"
                onClick={() => toggleMutation.mutate(!isEnabled)}
                disabled={toggleMutation.isPending}
              >
                <i className={`ph ${isEnabled ? "ph-pause" : "ph-play"} mr-1.5`} />
                {isEnabled ? "Disable" : "Enable"}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status & Metadata Card */}
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <i className="ph-duotone ph-puzzle-piece text-primary text-lg" />
              Add-on Entitlement
            </CardTitle>
            <CardDescription>Live status synced from tenant entitlements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-semibold text-foreground">{slug}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Status</span>
              {loadingEnt ? (
                <Badge variant="outline">Checking...</Badge>
              ) : isEnabled ? (
                <Badge variant="success">Active</Badge>
              ) : isInstalled ? (
                <Badge variant="warning">Disabled</Badge>
              ) : (
                <Badge variant="secondary">Not Installed</Badge>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium text-foreground">{dedicatedNav?.category || "Marketplace Add-on"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium text-foreground capitalize">
                {entitlementData?.plan || "Standard"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Live Configuration Console */}
        <Card className="lg:col-span-2 border border-border/80 rounded-xl bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <i className="ph-duotone ph-sliders-horizontal text-primary text-lg" />
              Integration &amp; Configuration
            </CardTitle>
            <CardDescription>
              Settings are encrypted and persisted per-tenant via <code>/api/addons/{slug}/config</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingConfig ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Loading configuration...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="addon-api-key">API Key / Secret Token</Label>
                    <Input
                      id="addon-api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter provider API key or secret"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addon-webhook">Webhook / Callback URL</Label>
                    <Input
                      id="addon-webhook"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="addon-json">Advanced JSON Settings</Label>
                  <Textarea
                    id="addon-json"
                    rows={6}
                    value={customJson}
                    onChange={(e) => setCustomJson(e.target.value)}
                    placeholder="{}"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending || !isInstalled}
                  >
                    <i className="ph ph-plugs-connected mr-1.5" />
                    {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => saveConfigMutation.mutate()}
                    disabled={saveConfigMutation.isPending || !isInstalled}
                  >
                    <i className="ph ph-floppy-disk mr-1.5" />
                    {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
