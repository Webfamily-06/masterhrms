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

const AI_MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3-mini"],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
  groq: ["llama-3.3-70b-versatile", "llama3-70b-8192", "mixtral-8x7b-32768"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
};

export function AiGovernanceCard() {
  const qc = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const [form, setForm] = useState({
    enabled: true,
    provider: "openai",
    model: "gpt-4o",
    apiKey: "",
    hasKey: false,
    quotaPerTenant: "100000",
    allowTenantByok: true,
  });

  const { data } = useQuery({
    queryKey: ["settings", "PLATFORM", "ai"],
    queryFn: async () => {
      const res: any = await api.get("/v1/settings/PLATFORM/ai").catch(() => null);
      return res?.values || {};
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      enabled: data["ai.enabled"] !== false,
      provider: String(data["ai.provider"] || "openai"),
      model: String(data["ai.model"] || "gpt-4o"),
      apiKey: data["ai.api_key"]?.set ? "••••••••••••••••" : "",
      hasKey: Boolean(data["ai.api_key"]?.set),
      quotaPerTenant: String(data["ai.quota_per_tenant"] ?? 100000),
      allowTenantByok: data["ai.allow_tenant_byok"] !== false,
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        "ai.enabled": Boolean(form.enabled),
        "ai.provider": form.provider,
        "ai.model": form.model.trim() || "gpt-4o",
        "ai.quota_per_tenant": Math.max(0, Number(form.quotaPerTenant) || 0),
        "ai.allow_tenant_byok": Boolean(form.allowTenantByok),
      };
      if (form.apiKey && !form.apiKey.includes("••••")) {
        payload["ai.api_key"] = form.apiKey.trim();
      }
      return await api.put("/v1/settings/PLATFORM/ai", payload);
    },
    onSuccess: () => {
      toast.success("AI Platform governance & quota settings saved.");
      qc.invalidateQueries({ queryKey: ["settings", "PLATFORM", "ai"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save AI settings"),
  });

  async function handleTestAi() {
    setTesting(true);
    try {
      const res: any = await api.post("/v1/settings/PLATFORM/ai/test", {
        provider: form.provider,
        apiKey: form.apiKey,
      });
      if (res?.success) {
        toast.success("AI Provider Verified!", {
          description: `${res.message} (${res.latencyMs || 0}ms)`,
        });
      } else {
        toast.error("AI Test Failed", { description: res?.error || "Could not authenticate API key." });
      }
    } catch (err: any) {
      toast.error("AI Test Error", { description: err?.response?.data?.error || err?.message });
    } finally {
      setTesting(false);
    }
  }

  const suggestedModels = AI_MODELS_BY_PROVIDER[form.provider] || AI_MODELS_BY_PROVIDER.openai;

  return (
    <Card id="settings-section-ai" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 flex-wrap">
          <div className="flex items-start gap-2.5">
            <i className="ph ph-sparkle text-xl text-primary mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">AI Platform &amp; Token Quotas</h2>
                <Badge
                  variant="outline"
                  className={
                    form.enabled
                      ? "text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "text-[10px] bg-muted text-muted-foreground"
                  }
                >
                  {form.enabled ? "Enabled" : "Paused"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure master LLM provider for AI Copilot, Resume Parsing &amp; OCR, monthly tenant token caps, and tenant BYOK rules.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={testing}
              onClick={handleTestAi}
              className="gap-1.5"
            >
              <i className={testing ? "ph ph-spinner-gap animate-spin" : "ph ph-lightning"} />
              {testing ? "Testing..." : "Test AI Key"}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">Enable AI Features Globally</p>
              <p className="text-[11px] text-muted-foreground">Master kill-switch for Copilot, Resume AI, and OCR.</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">Allow Tenant BYOK</p>
              <p className="text-[11px] text-muted-foreground">Let tenants plug in their own OpenAI/Gemini/Claude keys.</p>
            </div>
            <Switch
              checked={form.allowTenantByok}
              onCheckedChange={(v) => setForm((p) => ({ ...p, allowTenantByok: v }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Default AI Provider</Label>
            <Select
              value={form.provider}
              onValueChange={(v) => {
                const nextModels = AI_MODELS_BY_PROVIDER[v] || [];
                setForm((p) => ({ ...p, provider: v, model: nextModels[0] || p.model }));
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT-4o / o3)</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                <SelectItem value="groq">Groq (Llama 3)</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Default Model Identifier</Label>
            <Select value={suggestedModels.includes(form.model) ? form.model : suggestedModels[0]} onValueChange={(v) => setForm((p) => ({ ...p, model: v }))}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {suggestedModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Monthly Token Quota / Tenant</Label>
            <Input
              type="number"
              min={0}
              step={10000}
              value={form.quotaPerTenant}
              onChange={(e) => setForm((p) => ({ ...p, quotaPerTenant: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>

          <div className="space-y-1.5 md:col-span-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Platform Master API Key</Label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                {form.hasKey ? "AES-256 Encrypted & Set" : "Fallback to server .env"}
              </span>
            </div>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={form.apiKey}
                onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))}
                placeholder="sk-... / AIza... (leave masked to preserve current key)"
                className="h-9 text-xs pr-9"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className={`ph ${showKey ? "ph-eye-slash" : "ph-eye"} text-sm`} />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
