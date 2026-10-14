import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Sliders, 
  Save, 
  RotateCw, 
  ShieldCheck, 
  Key, 
  Zap, 
  CheckCircle2, 
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiAssistantNavHeader } from "@/components/ai/ai-assistant-nav-header";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/addons/ai-assistant/settings")({
  component: AiAssistantSettingsPage,
});

interface ProviderItem {
  id: string;
  name: string;
  desc: string;
}

interface ModelItem {
  id: string;
  provider: string;
  modelId: string;
  label: string;
}

function AiAssistantSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);

  const [selectedProvider, setSelectedProvider] = useState<string>("openai");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o");
  const [apiKey, setApiKey] = useState<string>("");
  const [maskedKey, setMaskedKey] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(false);
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState<number>(500000);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const [provRes, modelsRes, confRes] = await Promise.all([
        fetch("/api/v1/addons/ai-assistant/providers", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/ai-assistant/models", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/ai-assistant/settings", { headers: getAuthHeaders() }),
      ]);

      if (provRes.ok) {
        const p = await provRes.json();
        setProviders(Array.isArray(p) ? p : p.providers || []);
      }
      if (modelsRes.ok) {
        const m = await modelsRes.json();
        setModels(Array.isArray(m) ? m : m.models || []);
      }

      if (confRes.ok) {
        const conf = await confRes.json();
        const data = conf.data || conf;
        setSelectedProvider(data.provider || "openai");
        setSelectedModel(data.model || "gpt-4o");
        setIsActive(data.isActive ?? false);
        setMonthlyTokenLimit(data.monthlyTokenLimit || 500000);
        setMaskedKey(data.apiKeyMasked || (data.hasKey ? "••••••••••••••••••••••••••••••••" : ""));
        if (data.lastTestStatus && data.lastTestStatus !== "untested") {
          setTestResult({
            status: data.lastTestStatus,
            message: `Last tested: ${data.lastTestAt ? new Date(data.lastTestAt).toLocaleString() : "Recently"}`,
          });
        }
      }
    } catch (err: any) {
      toast.error("Failed to load AI Assistant settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleProviderChange = async (prov: string) => {
    setSelectedProvider(prov);
    try {
      const res = await fetch(`/api/v1/addons/ai-assistant/models?provider=${prov}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const provModels = await res.json();
        const list = Array.isArray(provModels) ? provModels : provModels.models || [];
        setModels(list);
        if (list.length > 0) {
          setSelectedModel(list[0].modelId);
        }
      }
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/v1/addons/ai-assistant/settings", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          apiKey: apiKey.trim() || undefined,
          isActive,
          monthlyTokenLimit,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save configuration");
      }

      toast.success("AI Assistant configuration saved successfully");
      setApiKey("");
      await fetchConfig();
    } catch (err: any) {
      toast.error(err.message);
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
        body: JSON.stringify({ apiKey: apiKey.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestResult({ status: "failed", message: data.message || "Connection failed" });
        toast.error(data.message || "Connection failed");
      } else {
        setTestResult({ status: "success", message: data.message });
        toast.success(data.message);
      }
    } catch (err: any) {
      setTestResult({ status: "failed", message: err.message });
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <PlanGuard moduleName="AI Assistant" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <AiAssistantNavHeader activeTab="settings" />

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-primary" />
                <span>Primary LLM Provider & Adapter</span>
              </CardTitle>
              <CardDescription>
                Select an LLM provider and API model. Keys are encrypted at rest with AES-256 and never returned to the browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select value={selectedProvider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Provider" />
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
                  <Label>Model (from ai_model master)</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.modelId} value={m.modelId}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="apiKey">Provider API Key</Label>
                  {maskedKey && (
                    <span className="text-xs text-muted-foreground font-mono">
                      Current: {maskedKey}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    placeholder={maskedKey ? "Enter new API key to replace..." : "sk-... or api key"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono pr-10 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 text-muted-foreground"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Token Quota */}
              <div className="space-y-2">
                <Label htmlFor="quota">Monthly Token Limit</Label>
                <Input
                  id="quota"
                  type="number"
                  min="10000"
                  max="10000000"
                  step="50000"
                  value={monthlyTokenLimit}
                  onChange={(e) => setMonthlyTokenLimit(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Circuit breaker: Content generation is paused once monthly tokens reach this limit.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label className="text-sm font-semibold">Enable AI Assistant Globally</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, contextual "Generate with AI" buttons appear across active modules.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  <Zap className={`w-4 h-4 mr-2 ${testing ? "animate-spin" : "text-amber-500"}`} />
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
                {testResult && (
                  <span className={`text-xs flex items-center ${testResult.status === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                    {testResult.status === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                    )}
                    {testResult.message}
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={fetchConfig} disabled={loading || saving}>
                  <RotateCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </PlanGuard>
  );
}
