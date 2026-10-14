import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, CheckCircle2, XCircle, KeyRound, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute(
  "/_authenticated/_app/addons/ai-document/settings"
)({
  component: AiDocumentSettingsPage,
});

export default function AiDocumentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<any>(null);

  const [form, setForm] = useState({
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: "",
    isActive: true,
    monthlyTokenLimit: 250000,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [provRes, setRes] = await Promise.all([
        fetch("/api/v1/addons/ai-assistant/providers", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/ai-assistant/settings", { headers: getAuthHeaders() }),
      ]);

      if (provRes.ok) {
        const provData = await provRes.json();
        setProviders(provData.data || (Array.isArray(provData) ? provData : []));
      }

      if (setRes.ok) {
        const sData = await setRes.json();
        const cfg = sData.data || sData;
        if (cfg) {
          setForm({
            provider: cfg.provider || "openai",
            model: cfg.model || "gpt-4o-mini",
            apiKey: cfg.hasKey ? "••••••••••••••••••••••••••••••••" : (cfg.apiKey || ""),
            isActive: cfg.isActive ?? true,
            monthlyTokenLimit: cfg.monthlyTokenLimit || 250000,
          });
        }
      }
    } catch {
      toast.error("Failed to load AI settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async (provider: string) => {
    try {
      const res = await fetch(`/api/v1/addons/ai-assistant/models?provider=${provider}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const mList = data.data || (Array.isArray(data) ? data : []);
        setModels(mList);
        if (mList?.length > 0 && !mList.some((m: any) => m.modelId === form.model)) {
          setForm((prev) => ({ ...prev, model: mList[0].modelId }));
        }
      }
    } catch {
      toast.error("Failed to fetch models");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (form.provider) {
      fetchModels(form.provider);
    }
  }, [form.provider]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/v1/addons/ai-assistant/settings", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("AI Document provider configuration saved");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save configuration");
      }
    } catch {
      toast.error("Network error saving configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await fetch("/api/v1/addons/ai-assistant/settings/test", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        toast.success("AI Provider connection verified!");
      } else {
        toast.error(data.message || "Connection test failed");
      }
    } catch {
      toast.error("Error during connection test");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <AiDocumentNavHeader active="settings" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Document Provider Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure API credentials and shared provider configuration (OpenAI, Anthropic, Gemini).
        </p>
      </div>

      {loading ? (
        <Card className="p-8">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Provider & Model Selection
              </CardTitle>
              <CardDescription>
                Credentials are shared with the AI Assistant engine and encrypted at rest with AES-256.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select
                    value={form.provider}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, provider: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language Model</Label>
                  <Select
                    value={form.model}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, model: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id || m.modelId} value={m.modelId}>
                          {m.label} ({m.modelId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter secret API key (e.g. sk-...)"
                  value={form.apiKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Saved keys are masked. Leave unchanged unless updating credentials.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Monthly Token Quota</Label>
                  <Input
                    type="number"
                    min="1000"
                    step="5000"
                    value={form.monthlyTokenLimit}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, monthlyTokenLimit: parseInt(e.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">Tokens allotted per monthly billing cycle</p>
                </div>

                <div className="flex items-center justify-between border p-3 rounded-md mt-auto">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Active Status</Label>
                    <p className="text-xs text-muted-foreground">Enable AI content generation across app</p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-md text-xs flex items-center gap-2 border ${
                    testResult.success
                      ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t p-4">
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
                <Sparkles className="h-4 w-4 mr-2" />
                {testing ? "Testing Connection..." : "Test Connection"}
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving Configuration..." : "Save Configuration"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
