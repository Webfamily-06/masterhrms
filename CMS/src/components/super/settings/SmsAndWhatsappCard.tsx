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

export function SmsAndWhatsappCard() {
  const qc = useQueryClient();
  const [testingSms, setTestingSms] = useState(false);
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);

  const [form, setForm] = useState({
    smsEnabled: true,
    smsProvider: "fast2sms",
    smsSenderId: "MHRMS",
    smsApiKey: "",
    hasSmsKey: false,
    whatsappEnabled: false,
    whatsappPhoneNumberId: "",
    whatsappBusinessAccountId: "",
    whatsappAccessToken: "",
    hasWaToken: false,
  });

  const { data } = useQuery({
    queryKey: ["settings", "PLATFORM", "messaging"],
    queryFn: async () => {
      const res: any = await api.get("/v1/settings/PLATFORM/messaging").catch(() => null);
      return res?.values || {};
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      smsEnabled: data["messaging.sms_enabled"] !== false,
      smsProvider: String(data["messaging.sms_provider"] || "fast2sms"),
      smsSenderId: String(data["messaging.sms_sender_id"] || "MHRMS"),
      smsApiKey: data["messaging.sms_api_key"]?.set ? "••••••••••••••••" : "",
      hasSmsKey: Boolean(data["messaging.sms_api_key"]?.set),
      whatsappEnabled: Boolean(data["messaging.whatsapp_enabled"]),
      whatsappPhoneNumberId: String(data["messaging.whatsapp_phone_number_id"] || ""),
      whatsappBusinessAccountId: String(data["messaging.whatsapp_business_account_id"] || ""),
      whatsappAccessToken: data["messaging.whatsapp_access_token"]?.set ? "••••••••••••••••" : "",
      hasWaToken: Boolean(data["messaging.whatsapp_access_token"]?.set),
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        "messaging.sms_enabled": Boolean(form.smsEnabled),
        "messaging.sms_provider": form.smsProvider,
        "messaging.sms_sender_id": form.smsSenderId.trim() || "MHRMS",
        "messaging.whatsapp_enabled": Boolean(form.whatsappEnabled),
        "messaging.whatsapp_phone_number_id": form.whatsappPhoneNumberId.trim(),
        "messaging.whatsapp_business_account_id": form.whatsappBusinessAccountId.trim(),
      };
      if (form.smsApiKey && !form.smsApiKey.includes("••••")) {
        payload["messaging.sms_api_key"] = form.smsApiKey.trim();
      }
      if (form.whatsappAccessToken && !form.whatsappAccessToken.includes("••••")) {
        payload["messaging.whatsapp_access_token"] = form.whatsappAccessToken.trim();
      }
      return await api.put("/v1/settings/PLATFORM/messaging", payload);
    },
    onSuccess: () => {
      toast.success("SMS & WhatsApp gateway settings saved.");
      qc.invalidateQueries({ queryKey: ["settings", "PLATFORM", "messaging"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save messaging settings"),
  });

  async function handleTestSms() {
    setTestingSms(true);
    try {
      const res: any = await api.post("/v1/settings/PLATFORM/sms/test", {});
      if (res?.success) {
        toast.success("SMS Gateway Verified!", {
          description: `${res.message || "SMS provider ready."} (${res.latencyMs || 0}ms)`,
        });
      } else {
        toast.error("SMS Test Failed", { description: res?.error || "Provider verification failed." });
      }
    } catch (err: any) {
      toast.error("SMS Test Error", { description: err?.response?.data?.error || err?.message });
    } finally {
      setTestingSms(false);
    }
  }

  return (
    <Card id="settings-section-messaging" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 flex-wrap">
          <div className="flex items-start gap-2.5">
            <i className="ph ph-chat-teardrop-text text-xl text-primary mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">SMS &amp; WhatsApp Gateways</h2>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {form.smsProvider}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure platform SMS providers for 2FA OTPs and urgent shift alerts, plus Meta WhatsApp Cloud API defaults.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={testingSms}
              onClick={handleTestSms}
              className="gap-1.5"
            >
              <i className={testingSms ? "ph ph-spinner-gap animate-spin" : "ph ph-paper-plane-tilt"} />
              {testingSms ? "Testing..." : "Test SMS"}
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

        {/* SMS Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">SMS Delivery Gateway</p>
              <p className="text-[11px] text-muted-foreground">Used for OTP verification codes and transactional SMS alerts.</p>
            </div>
            <Switch
              checked={form.smsEnabled}
              onCheckedChange={(v) => setForm((p) => ({ ...p, smsEnabled: v }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">SMS Provider</Label>
              <Select value={form.smsProvider} onValueChange={(v) => setForm((p) => ({ ...p, smsProvider: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast2sms">Fast2SMS (India DLT)</SelectItem>
                  <SelectItem value="msg91">MSG91 Enterprise</SelectItem>
                  <SelectItem value="twilio">Twilio Global SMS</SelectItem>
                  <SelectItem value="mock-sandbox">Sandbox / Mock Logger</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">DLT / Alpha Sender ID</Label>
              <Input
                value={form.smsSenderId}
                onChange={(e) => setForm((p) => ({ ...p, smsSenderId: e.target.value }))}
                placeholder="MHRMS"
                maxLength={11}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">API Key / Auth Token</Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {form.hasSmsKey ? "Encrypted & Set" : "Not set"}
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showSmsKey ? "text" : "password"}
                  value={form.smsApiKey}
                  onChange={(e) => setForm((p) => ({ ...p, smsApiKey: e.target.value }))}
                  placeholder="Enter SMS API key"
                  className="h-9 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowSmsKey((v) => !v)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <i className={`ph ${showSmsKey ? "ph-eye-slash" : "ph-eye"} text-sm`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Section */}
        <div className="pt-4 border-t border-border/60 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Meta WhatsApp Cloud API</p>
              <p className="text-[11px] text-muted-foreground">Platform-wide WhatsApp Business alerts & onboarding messages.</p>
            </div>
            <Switch
              checked={form.whatsappEnabled}
              onCheckedChange={(v) => setForm((p) => ({ ...p, whatsappEnabled: v }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phone Number ID</Label>
              <Input
                value={form.whatsappPhoneNumberId}
                onChange={(e) => setForm((p) => ({ ...p, whatsappPhoneNumberId: e.target.value }))}
                placeholder="e.g. 109283746512345"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">WhatsApp Business Account ID</Label>
              <Input
                value={form.whatsappBusinessAccountId}
                onChange={(e) => setForm((p) => ({ ...p, whatsappBusinessAccountId: e.target.value }))}
                placeholder="Optional WABA ID"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Permanent Access Token</Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {form.hasWaToken ? "Encrypted & Set" : "Not set"}
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showWaToken ? "text" : "password"}
                  value={form.whatsappAccessToken}
                  onChange={(e) => setForm((p) => ({ ...p, whatsappAccessToken: e.target.value }))}
                  placeholder="EAA..."
                  className="h-9 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowWaToken((v) => !v)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <i className={`ph ${showWaToken ? "ph-eye-slash" : "ph-eye"} text-sm`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
