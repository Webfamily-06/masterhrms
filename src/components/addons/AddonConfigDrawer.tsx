import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Plug,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

export interface AddonConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  addonSlug: string;
  addonName: string;
  addonDescription?: string;
  isReadOnly?: boolean;
}

export function AddonConfigDrawer({
  isOpen,
  onClose,
  addonSlug,
  addonName,
  addonDescription,
  isReadOnly = false,
}: AddonConfigDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({
    apiKey: "",
    apiSecret: "",
    webhookUrl: "",
    environment: "sandbox",
    enableSync: true,
  });

  useEffect(() => {
    if (isOpen && addonSlug) {
      loadConfig();
    } else {
      setTestResult(null);
    }
  }, [isOpen, addonSlug]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; config?: Record<string, any> }>(
        `/addons/${addonSlug}/config`
      );
      if (res && res.config && Object.keys(res.config).length > 0) {
        setFormData({
          apiKey: res.config.apiKey || "",
          apiSecret: res.config.apiSecret || "",
          webhookUrl: res.config.webhookUrl || "",
          environment: res.config.environment || "sandbox",
          enableSync: res.config.enableSync ?? true,
          ...res.config,
        });
      }
    } catch (err: any) {
      // Non-fatal if config does not exist yet
      console.warn("Could not load initial addon config", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isReadOnly) {
      toast.error("Add-on is in Read-Only mode due to subscription expiry. Please renew to modify.");
      return;
    }
    try {
      setSaving(true);
      await api.put(`/addons/${addonSlug}/config`, { config: formData });
      toast.success(`Configuration for ${addonName} saved successfully.`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.post<{
        success: boolean;
        message: string;
        latencyMs?: number;
      }>(`/addons/${addonSlug}/test-connection`, { config: formData });

      setTestResult({
        success: res?.success ?? true,
        message: res?.message || "Connection active and responsive.",
        latencyMs: res?.latencyMs,
      });
      toast.success("Connection test successful!");
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Connection failed. Please verify credentials.",
      });
      toast.error("Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <SheetHeader className="text-left pb-4 border-b border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold">{addonName}</SheetTitle>
                <span className="text-xs text-muted-foreground font-mono">{addonSlug}</span>
              </div>
            </div>
            {addonDescription && (
              <SheetDescription className="text-xs text-muted-foreground">
                {addonDescription}
              </SheetDescription>
            )}

            {isReadOnly && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs mt-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Read-Only Mode:</strong> Subscription expired. Settings cannot be edited.
                </span>
              </div>
            )}
          </SheetHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Loading secure configuration...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Public API Key / Client ID</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="e.g. pk_live_xxxxxxxxxxxxxxxx"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Secret Key / Token</Label>
                <div className="relative">
                  <Input
                    disabled={isReadOnly}
                    type={showSecret ? "text" : "password"}
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    placeholder="e.g. sk_live_xxxxxxxxxxxxxxxx"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Webhook Callback URL</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://api.yourdomain.com/webhooks/listener"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Live Production Mode</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Switch between sandbox testing and live gateway.
                  </p>
                </div>
                <Switch
                  disabled={isReadOnly}
                  checked={formData.environment === "production"}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      environment: checked ? "production" : "sandbox",
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Automated Background Sync</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Enable daily scheduled synchronization cron.
                  </p>
                </div>
                <Switch
                  disabled={isReadOnly}
                  checked={formData.enableSync}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableSync: checked })
                  }
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-md text-xs border flex items-start gap-2.5 ${
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.latencyMs && (
                      <p className="text-[10px] opacity-80 mt-0.5">
                        Response Latency: {testResult.latencyMs}ms
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="pt-6 border-t border-border/60 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testing || loading}
            onClick={handleTestConnection}
            className="w-full sm:w-auto"
          >
            {testing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Test Connection
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saving || loading || isReadOnly}
            onClick={handleSave}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save Changes
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
