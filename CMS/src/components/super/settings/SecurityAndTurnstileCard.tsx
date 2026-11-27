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

export function SecurityAndTurnstileCard() {
  const qc = useQueryClient();
  const [showTurnstileSecret, setShowTurnstileSecret] = useState(false);

  const [form, setForm] = useState({
    allowPublicRegistration: true,
    requireEmailVerification: false,
    mfaEnforced: false,
    sessionTimeoutMinutes: "1440",
    maxLoginAttempts: "5",
    lockoutDurationMinutes: "15",
    passwordMinLength: "8",
    passwordRequireSpecial: true,
    passwordExpiryDays: "90",
    rateLimitRpm: "120",
    ipAllowlist: "",
    allowedAdminIps: "",
    turnstileEnabled: false,
    turnstileMode: "enforce",
    turnstileSiteKey: "",
    turnstileSecretKey: "",
    hasTurnstileSecret: false,
    turnstileHostnames: "",
  });

  const { data } = useQuery({
    queryKey: ["settings", "PLATFORM", "security-bundle"],
    queryFn: async () => {
      const [sec, sys] = await Promise.all([
        api.get("/v1/settings/PLATFORM/security").then((r: any) => r?.values || {}).catch(() => ({})),
        api.get("/v1/settings/PLATFORM/system").then((r: any) => r?.values || {}).catch(() => ({})),
      ]);
      return { sec, sys };
    },
  });

  useEffect(() => {
    if (!data) return;
    const { sec, sys } = data;
    setForm((prev) => ({
      ...prev,
      allowPublicRegistration: sec["security.allow_public_registration"] !== false,
      requireEmailVerification: Boolean(sec["security.require_email_verification"]),
      mfaEnforced: Boolean(sec["security.mfa_enforced"]),
      sessionTimeoutMinutes: String(sec["security.session_timeout_minutes"] ?? 1440),
      maxLoginAttempts: String(sec["security.max_login_attempts"] ?? 5),
      lockoutDurationMinutes: String(sec["security.lockout_duration_minutes"] ?? 15),
      passwordMinLength: String(sec["security.password_min_length"] ?? 8),
      passwordRequireSpecial: sec["security.password_require_special"] !== false,
      passwordExpiryDays: String(sec["security.password_expiry_days"] ?? 90),
      rateLimitRpm: String(sec["security.rate_limit_rpm"] ?? 120),
      ipAllowlist: String(sec["security.ip_allowlist"] || ""),
      allowedAdminIps: String(sys["system.allowed_admin_ips"] || ""),
      turnstileEnabled: Boolean(sec["security.turnstile_enabled"]),
      turnstileMode: String(sec["security.turnstile_mode"] || "enforce"),
      turnstileSiteKey: String(sec["security.turnstile_site_key"] || ""),
      turnstileSecretKey: sec["security.turnstile_secret_key"]?.set ? "••••••••••••••••" : "",
      hasTurnstileSecret: Boolean(sec["security.turnstile_secret_key"]?.set),
      turnstileHostnames: String(sec["security.turnstile_hostnames"] || ""),
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const secPayload: Record<string, any> = {
        "security.allow_public_registration": Boolean(form.allowPublicRegistration),
        "security.require_email_verification": Boolean(form.requireEmailVerification),
        "security.mfa_enforced": Boolean(form.mfaEnforced),
        "security.session_timeout_minutes": Math.max(5, Math.min(10080, Number(form.sessionTimeoutMinutes) || 1440)),
        "security.max_login_attempts": Math.max(3, Math.min(20, Number(form.maxLoginAttempts) || 5)),
        "security.lockout_duration_minutes": Math.max(1, Math.min(1440, Number(form.lockoutDurationMinutes) || 15)),
        "security.password_min_length": Math.max(8, Math.min(128, Number(form.passwordMinLength) || 8)),
        "security.password_require_special": Boolean(form.passwordRequireSpecial),
        "security.password_expiry_days": Math.max(0, Math.min(365, Number(form.passwordExpiryDays) || 0)),
        "security.rate_limit_rpm": Math.max(10, Math.min(10000, Number(form.rateLimitRpm) || 120)),
        "security.ip_allowlist": form.ipAllowlist.trim(),
        "security.turnstile_enabled": Boolean(form.turnstileEnabled),
        "security.turnstile_mode": form.turnstileMode,
        "security.turnstile_site_key": form.turnstileSiteKey.trim(),
        "security.turnstile_hostnames": form.turnstileHostnames.trim(),
      };
      if (form.turnstileSecretKey && !form.turnstileSecretKey.includes("••••")) {
        secPayload["security.turnstile_secret_key"] = form.turnstileSecretKey.trim();
      }
      await Promise.all([
        api.put("/v1/settings/PLATFORM/security", secPayload),
        api.put("/v1/settings/PLATFORM/system", {
          "system.allowed_admin_ips": form.allowedAdminIps.trim(),
        }),
      ]);
    },
    onSuccess: () => {
      toast.success("Platform security, password policy, and Cloudflare Turnstile settings saved.");
      qc.invalidateQueries({ queryKey: ["settings", "PLATFORM", "security-bundle"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save security settings"),
  });

  return (
    <Card id="settings-section-security" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 flex-wrap">
          <div className="flex items-start gap-2.5">
            <i className="ph ph-shield-check text-xl text-primary mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Security, 2FA &amp; Anti-Bot (Turnstile)</h2>
                {form.mfaEnforced && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    2FA Mandatory
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control signup policies, mandatory 2FA, session timeouts, lockouts, password complexity, API rate limits, and Cloudflare Turnstile.
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

        {/* Auth & Registration Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              key: "allowPublicRegistration",
              title: "Allow Public Registration",
              desc: "Allow new companies to self-signup.",
              val: form.allowPublicRegistration,
              set: (v: boolean) => setForm((p) => ({ ...p, allowPublicRegistration: v })),
            },
            {
              key: "requireEmailVerification",
              title: "Require Email Verification",
              desc: "Verify admin email before access.",
              val: form.requireEmailVerification,
              set: (v: boolean) => setForm((p) => ({ ...p, requireEmailVerification: v })),
            },
            {
              key: "mfaEnforced",
              title: "Enforce Global 2FA",
              desc: "Require TOTP/OTP across workspaces.",
              val: form.mfaEnforced,
              set: (v: boolean) => setForm((p) => ({ ...p, mfaEnforced: v })),
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5"
            >
              <div>
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={item.val} onCheckedChange={item.set} />
            </div>
          ))}
        </div>

        {/* Session, Lockout & Password Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Session Timeout (Minutes)</Label>
            <Input
              type="number"
              min={5}
              max={10080}
              value={form.sessionTimeoutMinutes}
              onChange={(e) => setForm((p) => ({ ...p, sessionTimeoutMinutes: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Max Failed Login Attempts</Label>
            <Input
              type="number"
              min={3}
              max={20}
              value={form.maxLoginAttempts}
              onChange={(e) => setForm((p) => ({ ...p, maxLoginAttempts: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Lockout Cool-down (Minutes)</Label>
            <Input
              type="number"
              min={1}
              max={1440}
              value={form.lockoutDurationMinutes}
              onChange={(e) => setForm((p) => ({ ...p, lockoutDurationMinutes: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Minimum Password Length</Label>
            <Input
              type="number"
              min={8}
              max={128}
              value={form.passwordMinLength}
              onChange={(e) => setForm((p) => ({ ...p, passwordMinLength: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Password Expiry (Days, 0 = Never)</Label>
            <Input
              type="number"
              min={0}
              max={365}
              value={form.passwordExpiryDays}
              onChange={(e) => setForm((p) => ({ ...p, passwordExpiryDays: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Global API Rate Limit (Req / Min)</Label>
            <Input
              type="number"
              min={10}
              max={10000}
              value={form.rateLimitRpm}
              onChange={(e) => setForm((p) => ({ ...p, rateLimitRpm: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Super Admin Maintenance Bypass IPs (CIDR)</Label>
            <Input
              value={form.allowedAdminIps}
              onChange={(e) => setForm((p) => ({ ...p, allowedAdminIps: e.target.value }))}
              placeholder="e.g. 203.0.113.10, 10.0.0.0/24 (empty allows all super admins)"
              className="h-9 text-xs"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5 self-end">
            <div>
              <p className="text-xs font-semibold text-foreground">Require Special Character in Passwords</p>
              <p className="text-[11px] text-muted-foreground">Enforce symbol complexity on new passwords.</p>
            </div>
            <Switch
              checked={form.passwordRequireSpecial}
              onCheckedChange={(v) => setForm((p) => ({ ...p, passwordRequireSpecial: v }))}
            />
          </div>
        </div>

        {/* Cloudflare Turnstile */}
        <div className="pt-3 border-t border-border/60 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <i className="ph ph-cloud-check text-primary text-base" />
                Cloudflare Turnstile Anti-Bot Verification
              </p>
              <p className="text-[11px] text-muted-foreground">
                Protects /login, /register, and /super06 against credential stuffing and automated bot traffic.
              </p>
            </div>
            <Switch
              checked={form.turnstileEnabled}
              onCheckedChange={(v) => setForm((p) => ({ ...p, turnstileEnabled: v }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Enforcement Mode</Label>
              <Select
                value={form.turnstileMode}
                onValueChange={(v) => setForm((p) => ({ ...p, turnstileMode: v }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enforce">Enforce (Block Failed Challenges)</SelectItem>
                  <SelectItem value="monitor">Monitor Only (Log Warnings)</SelectItem>
                  <SelectItem value="off">Off (Bypass Verification)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Turnstile Site Key</Label>
              <Input
                value={form.turnstileSiteKey}
                onChange={(e) => setForm((p) => ({ ...p, turnstileSiteKey: e.target.value }))}
                placeholder="0x4AAAAAAA..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Turnstile Secret Key</Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {form.hasTurnstileSecret ? "Encrypted & Set" : "Not set"}
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showTurnstileSecret ? "text" : "password"}
                  value={form.turnstileSecretKey}
                  onChange={(e) => setForm((p) => ({ ...p, turnstileSecretKey: e.target.value }))}
                  placeholder="0x4AAAAAAA... (leave masked to keep)"
                  className="h-9 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowTurnstileSecret((v) => !v)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <i className={`ph ${showTurnstileSecret ? "ph-eye-slash" : "ph-eye"} text-sm`} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <Label className="text-xs font-semibold">Allowed Hostnames (Comma-Separated)</Label>
              <Input
                value={form.turnstileHostnames}
                onChange={(e) => setForm((p) => ({ ...p, turnstileHostnames: e.target.value }))}
                placeholder="app.masterhrms.com, www.masterhrms.com, localhost"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
