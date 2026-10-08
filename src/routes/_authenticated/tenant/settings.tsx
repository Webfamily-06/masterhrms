import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Shield, Clock, Globe } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tenant/settings")({
  component: TenantSettingsPage,
  head: () => ({
    meta: [{ title: "Workspace Settings — Master HRMS" }],
  }),
});

function TenantSettingsPage() {
  const [form, setForm] = useState({
    defaultCurrency: "INR",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    enable2fa: true,
    autoClockout: true,
    sessionTimeoutMinutes: 60,
  });

  const handleSave = () => {
    toast.success("Workspace localization & security settings saved.");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-primary" />
          Workspace Settings & Governance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure default currencies, operational timezones, session lifetimes, and security policies.
        </p>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Localization & Region
          </CardTitle>
          <CardDescription className="text-xs">
            Standard format preferences for financial calculations and attendance timestamps.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Default Operating Currency</Label>
            <Select
              value={form.defaultCurrency}
              onValueChange={(val) => setForm({ ...form, defaultCurrency: val })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                <SelectItem value="AED">AED — UAE Dirham (د.إ)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Workspace Timezone</Label>
            <Select
              value={form.timezone}
              onValueChange={(val) => setForm({ ...form, timezone: val })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</SelectItem>
                <SelectItem value="UTC">UTC (Universal Coordinated Time)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST -05:00)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT +00:00)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST +04:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Security & Session Policies
          </CardTitle>
          <CardDescription className="text-xs">
            Enforce mandatory authentication safeguards across employee and admin logins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-foreground">Mandatory Two-Factor Authentication (2FA)</div>
              <div className="text-[11px] text-muted-foreground">Require OTP verification upon every login</div>
            </div>
            <Switch
              checked={form.enable2fa}
              onCheckedChange={(val) => setForm({ ...form, enable2fa: val })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <div>
              <div className="text-xs font-semibold text-foreground">Automatic Midnight Clock-Out</div>
              <div className="text-[11px] text-muted-foreground">Auto-close open attendance shifts at 23:59:59</div>
            </div>
            <Switch
              checked={form.autoClockout}
              onCheckedChange={(val) => setForm({ ...form, autoClockout: val })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
