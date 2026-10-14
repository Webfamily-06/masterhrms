import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Settings2, 
  Save, 
  RotateCw, 
  ShieldAlert, 
  Sliders, 
  Clock, 
  Archive, 
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { WebhookNavHeader } from "./endpoints";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/addons/webhook/settings")({
  component: WebhookSettingsPage,
});

interface WebhookSettings {
  defaultTimeoutMs: number;
  maxRetries: number;
  backoffBaseSeconds: number;
  autoDisableAfterFailures: number;
  maxEndpoints: number;
  logRetentionDays: number;
}

function WebhookSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebhookSettings>({
    defaultTimeoutMs: 10000,
    maxRetries: 3,
    backoffBaseSeconds: 5,
    autoDisableAfterFailures: 10,
    maxEndpoints: 50,
    logRetentionDays: 30,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/webhook/settings", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load webhook settings");
      const d = await res.json();
      const data = d.data || d;
      setSettings({
        defaultTimeoutMs: data.defaultTimeoutMs || 10000,
        maxRetries: data.maxRetries || 3,
        backoffBaseSeconds: data.backoffBaseSeconds || 5,
        autoDisableAfterFailures: data.autoDisableAfterFailures || 10,
        maxEndpoints: data.maxEndpoints || 50,
        logRetentionDays: data.logRetentionDays || 30,
      });
    } catch (err: any) {
      toast("Using default system configuration settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/v1/addons/webhook/settings", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }

      toast.success("Webhook engine and dispatch configuration updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <WebhookNavHeader activeTab="settings" />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Network & Dispatch Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-primary" />
              <span>Dispatch & Timeout Defaults</span>
            </CardTitle>
            <CardDescription>
              Control baseline request execution timeouts and default limits applied to new endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="timeout">Default Timeout (Milliseconds)</Label>
              <Input
                id="timeout"
                type="number"
                min="1000"
                max="60000"
                step="500"
                value={settings.defaultTimeoutMs}
                onChange={(e) => setSettings({ ...settings, defaultTimeoutMs: Number(e.target.value) })}
                required
              />
              <p className="text-xs text-muted-foreground">Standard 10,000ms (10 seconds). Max allowable is 60,000ms.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxEndpoints">Tenant Endpoint Limit</Label>
              <Input
                id="maxEndpoints"
                type="number"
                min="1"
                max="500"
                value={settings.maxEndpoints}
                onChange={(e) => setSettings({ ...settings, maxEndpoints: Number(e.target.value) })}
                required
              />
              <p className="text-xs text-muted-foreground">Maximum active outbound endpoints permitted for this tenant.</p>
            </div>
          </CardContent>
        </Card>

        {/* Retry & Circuit Breaker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Retry Policy & Circuit Breaker</span>
            </CardTitle>
            <CardDescription>
              Exponential backoff algorithm parameters and automatic endpoint disabling protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxRetries">Default Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min="0"
                max="10"
                value={settings.maxRetries}
                onChange={(e) => setSettings({ ...settings, maxRetries: Number(e.target.value) })}
                required
              />
              <p className="text-xs text-muted-foreground">Number of automatic retry attempts before marking as dead.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backoff">Backoff Base Seconds</Label>
              <Input
                id="backoff"
                type="number"
                min="1"
                max="120"
                value={settings.backoffBaseSeconds}
                onChange={(e) => setSettings({ ...settings, backoffBaseSeconds: Number(e.target.value) })}
                required
              />
              <p className="text-xs text-muted-foreground">Base interval for exponential calculation (base * 2^(attempt-1)).</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="circuitBreaker">Auto-Disable After Consecutive Failures</Label>
              <Input
                id="circuitBreaker"
                type="number"
                min="3"
                max="100"
                value={settings.autoDisableAfterFailures}
                onChange={(e) => setSettings({ ...settings, autoDisableAfterFailures: Number(e.target.value) })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Endpoints with consecutive failed deliveries exceeding this threshold are automatically disabled to prevent denial of service and outbound queue starvation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Retention Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Archive className="w-5 h-5 text-blue-500" />
              <span>Log Retention & Housekeeping</span>
            </CardTitle>
            <CardDescription>
              Specify how long delivery history and payload audit entries are retained.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="retention">Log Retention Period (Days)</Label>
              <Input
                id="retention"
                type="number"
                min="1"
                max="365"
                value={settings.logRetentionDays}
                onChange={(e) => setSettings({ ...settings, logRetentionDays: Number(e.target.value) })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Logs and response snippets older than this threshold will be purged by the daily scheduled cleanup worker.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={fetchSettings} disabled={loading || saving}>
              <RotateCw className="w-4 h-4 mr-2" /> Reset
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
