import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProviderTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  timestamp: string;
  error?: string;
}

export interface ProviderCardProps {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  scope: "PLATFORM" | "TENANT";
  group: string;
  providerKey?: string;
  callbackUrl?: string;
  setupDocsUrl?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  statusBadgeText?: string;
  statusBadgeVariant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

export function ProviderCard({
  id,
  title,
  description,
  icon,
  enabled,
  onToggleEnabled,
  scope,
  group,
  providerKey,
  callbackUrl,
  setupDocsUrl,
  children,
  disabled = false,
  statusBadgeText,
  statusBadgeVariant = "outline",
  className,
}: ProviderCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const handleCopyCallback = () => {
    if (!callbackUrl) return;
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    toast.success("Callback URL copied to clipboard");
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload: Record<string, any> = {};
      if (providerKey) {
        payload.provider = providerKey;
      }

      const res: any = await api.post(`/v1/settings/${scope}/${group}/test`, payload);
      const result: ProviderTestResult = {
        success: res.success ?? true,
        message: res.message || "Connection validated successfully.",
        latencyMs: res.latencyMs,
        timestamp: new Date().toLocaleTimeString(),
      };
      setTestResult(result);
      toast.success(result.message);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Connection test failed";
      const latencyMs = err.response?.data?.latencyMs;
      const result: ProviderTestResult = {
        success: false,
        message: errorMsg,
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
        error: errorMsg,
      };
      setTestResult(result);
      toast.error(`Test failed: ${errorMsg}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className={cn("border border-border/70 shadow-xs transition-all duration-200", className)}>
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
                {statusBadgeText ? (
                  <Badge variant={statusBadgeVariant} className="text-[10px] py-0 px-2 font-mono uppercase">
                    {statusBadgeText}
                  </Badge>
                ) : enabled ? (
                  <Badge variant="outline" className="text-[10px] py-0 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono">
                    ACTIVE
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] py-0 px-2 text-muted-foreground border-border font-mono">
                    DISABLED
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {description}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor={`${id}-toggle`} className="text-xs text-muted-foreground sr-only">
              Enable {title}
            </Label>
            <Switch
              id={`${id}-toggle`}
              checked={enabled}
              onCheckedChange={onToggleEnabled}
              disabled={disabled}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Child Form Fields */}
        {children}

        {/* Read-only Callback URL with Copy Action */}
        {callbackUrl && (
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Authorized Redirect / Callback URL</span>
              {setupDocsUrl && (
                <a
                  href={setupDocsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-normal"
                >
                  Setup Docs <ExternalLink className="size-2.5" />
                </a>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={callbackUrl}
                className="w-full text-xs font-mono bg-muted/60 border border-border/80 rounded-md px-3 py-1.5 text-muted-foreground select-all focus:outline-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCallback}
                className="h-8 px-2.5 text-xs shrink-0 gap-1.5"
                title="Copy Callback URL"
              >
                {copiedCallback ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                {copiedCallback ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        {/* Inline Test Result Banner */}
        {testResult && (
          <div
            className={cn(
              "p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all animate-in fade-in duration-200",
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                : "bg-destructive/10 border-destructive/30 text-destructive dark:text-rose-200"
            )}
          >
            {testResult.success ? (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {testResult.success ? "Test Passed" : "Verification Failed"}
                </span>
                <span className="text-[10px] opacity-75 font-mono">
                  {testResult.timestamp}
                  {testResult.latencyMs !== undefined && ` (${testResult.latencyMs}ms)`}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed break-words">{testResult.message}</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-3 border-t border-border/40 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {enabled ? "Ready to accept inbound connections" : "Toggle switch above to enable"}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || testing || !enabled}
          onClick={handleTestConnection}
          className="text-xs h-8 gap-1.5 border-border hover:bg-muted"
        >
          {testing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3 text-primary" />
          )}
          Test Connection
        </Button>
      </CardFooter>
    </Card>
  );
}
