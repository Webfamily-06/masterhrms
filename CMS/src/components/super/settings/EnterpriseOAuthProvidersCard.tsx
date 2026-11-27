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

export function EnterpriseOAuthProvidersCard() {
  const qc = useQueryClient();
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const [form, setForm] = useState({
    msEnabled: false,
    msClientId: "",
    msClientSecret: "",
    msHasSecret: false,
    msTenantId: "common",
    ghEnabled: false,
    ghClientId: "",
    ghClientSecret: "",
    ghHasSecret: false,
    slackEnabled: false,
    slackClientId: "",
    slackClientSecret: "",
    slackHasSecret: false,
  });

  const { data } = useQuery({
    queryKey: ["settings", "PLATFORM", "oauth"],
    queryFn: async () => {
      const res: any = await api.get("/v1/settings/PLATFORM/oauth").catch(() => null);
      return res?.values || {};
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      msEnabled: Boolean(data["oauth.microsoft_enabled"]),
      msClientId: String(data["oauth.microsoft_client_id"] || ""),
      msClientSecret: data["oauth.microsoft_client_secret"]?.set ? "••••••••••••••••" : "",
      msHasSecret: Boolean(data["oauth.microsoft_client_secret"]?.set),
      msTenantId: String(data["oauth.microsoft_tenant_id"] || "common"),
      ghEnabled: Boolean(data["oauth.github_enabled"]),
      ghClientId: String(data["oauth.github_client_id"] || ""),
      ghClientSecret: data["oauth.github_client_secret"]?.set ? "••••••••••••••••" : "",
      ghHasSecret: Boolean(data["oauth.github_client_secret"]?.set),
      slackEnabled: Boolean(data["oauth.slack_enabled"]),
      slackClientId: String(data["oauth.slack_client_id"] || ""),
      slackClientSecret: data["oauth.slack_client_secret"]?.set ? "••••••••••••••••" : "",
      slackHasSecret: Boolean(data["oauth.slack_client_secret"]?.set),
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        "oauth.microsoft_enabled": Boolean(form.msEnabled),
        "oauth.microsoft_client_id": form.msClientId.trim(),
        "oauth.microsoft_tenant_id": form.msTenantId.trim() || "common",
        "oauth.github_enabled": Boolean(form.ghEnabled),
        "oauth.github_client_id": form.ghClientId.trim(),
        "oauth.slack_enabled": Boolean(form.slackEnabled),
        "oauth.slack_client_id": form.slackClientId.trim(),
      };
      if (form.msClientSecret && !form.msClientSecret.includes("••••")) {
        payload["oauth.microsoft_client_secret"] = form.msClientSecret.trim();
      }
      if (form.ghClientSecret && !form.ghClientSecret.includes("••••")) {
        payload["oauth.github_client_secret"] = form.ghClientSecret.trim();
      }
      if (form.slackClientSecret && !form.slackClientSecret.includes("••••")) {
        payload["oauth.slack_client_secret"] = form.slackClientSecret.trim();
      }
      return await api.put("/v1/settings/PLATFORM/oauth", payload);
    },
    onSuccess: () => {
      toast.success("Enterprise OAuth providers (Microsoft Entra ID, GitHub, Slack) saved.");
      qc.invalidateQueries({ queryKey: ["settings", "PLATFORM", "oauth"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save enterprise OAuth settings"),
  });

  async function handleTest(provider: "microsoft" | "github" | "slack") {
    setTestingProvider(provider);
    try {
      const res: any = await api.post("/v1/settings/PLATFORM/oauth/test", { provider });
      if (res?.success) {
        toast.success(`${provider.toUpperCase()} OAuth Verified`, { description: res.message });
      } else {
        toast.error("OAuth Test Failed", { description: res?.error });
      }
    } catch (err: any) {
      toast.error("OAuth Test Error", { description: err?.response?.data?.error || err?.message });
    } finally {
      setTestingProvider(null);
    }
  }

  return (
    <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <i className="ph ph-buildings text-primary text-base" />
              Enterprise SSO Providers (Microsoft Entra ID, GitHub, Slack OIDC)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Additional OAuth 2.0 / OIDC providers stored in the encrypted canonical SettingsService vault.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
          >
            <i className={saveMut.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-floppy-disk"} />
            Save Enterprise SSO
          </Button>
        </div>

        {/* Microsoft Entra ID */}
        <div className="space-y-3 border-b border-border/60 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Microsoft Entra ID (Azure AD)</span>
              {form.msHasSecret && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/10">Secret Set</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="xs" variant="outline" disabled={testingProvider === "microsoft"} onClick={() => handleTest("microsoft")}>
                {testingProvider === "microsoft" ? "Testing..." : "Test"}
              </Button>
              <Switch checked={form.msEnabled} onCheckedChange={(v) => setForm((p) => ({ ...p, msEnabled: v }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Application (Client) ID</Label>
              <Input value={form.msClientId} onChange={(e) => setForm((p) => ({ ...p, msClientId: e.target.value }))} placeholder="Azure App Client ID" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Client Secret</Label>
              <Input type="password" value={form.msClientSecret} onChange={(e) => setForm((p) => ({ ...p, msClientSecret: e.target.value }))} placeholder="Leave masked to keep" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Directory (Tenant) ID</Label>
              <Input value={form.msTenantId} onChange={(e) => setForm((p) => ({ ...p, msTenantId: e.target.value }))} placeholder="common" className="h-8 text-xs" />
            </div>
          </div>
        </div>

        {/* GitHub & Slack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-lg border border-border/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">GitHub OAuth (Platform Staff)</span>
              <div className="flex items-center gap-2">
                <Button type="button" size="xs" variant="outline" disabled={testingProvider === "github"} onClick={() => handleTest("github")}>
                  {testingProvider === "github" ? "Testing..." : "Test"}
                </Button>
                <Switch checked={form.ghEnabled} onCheckedChange={(v) => setForm((p) => ({ ...p, ghEnabled: v }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Input value={form.ghClientId} onChange={(e) => setForm((p) => ({ ...p, ghClientId: e.target.value }))} placeholder="GitHub Client ID" className="h-8 text-xs" />
              <Input type="password" value={form.ghClientSecret} onChange={(e) => setForm((p) => ({ ...p, ghClientSecret: e.target.value }))} placeholder="GitHub Client Secret" className="h-8 text-xs" />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">Slack OpenID Connect</span>
              <div className="flex items-center gap-2">
                <Button type="button" size="xs" variant="outline" disabled={testingProvider === "slack"} onClick={() => handleTest("slack")}>
                  {testingProvider === "slack" ? "Testing..." : "Test"}
                </Button>
                <Switch checked={form.slackEnabled} onCheckedChange={(v) => setForm((p) => ({ ...p, slackEnabled: v }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Input value={form.slackClientId} onChange={(e) => setForm((p) => ({ ...p, slackClientId: e.target.value }))} placeholder="Slack Client ID" className="h-8 text-xs" />
              <Input type="password" value={form.slackClientSecret} onChange={(e) => setForm((p) => ({ ...p, slackClientSecret: e.target.value }))} placeholder="Slack Client Secret" className="h-8 text-xs" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
