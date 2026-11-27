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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StripeAndBillingRulesCard() {
  const qc = useQueryClient();
  const [testingStripe, setTestingStripe] = useState(false);

  const [form, setForm] = useState({
    stripeEnabled: false,
    stripePublishableKey: "",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    razorpayWebhookSecret: "",
    defaultTrialDays: "14",
    gracePeriodDays: "7",
    autoSuspendOverdue: true,
    defaultTaxRate: "18",
    invoicePrefix: "INV-",
    recurringInterval: "MONTHLY",
    autoPostLedger: true,
    defaultTerms: "Net 30 days. Payment is due within 30 days from invoice generation date.",
  });

  const { data } = useQuery({
    queryKey: ["settings", "PLATFORM", "stripe-billing-lifecycle"],
    queryFn: async () => {
      const [pay, bill, inv] = await Promise.all([
        api.get("/v1/settings/PLATFORM/payments").then((r: any) => r?.values || {}).catch(() => ({})),
        api.get("/v1/settings/PLATFORM/billing").then((r: any) => r?.values || {}).catch(() => ({})),
        api.get("/v1/settings/PLATFORM/invoicing").then((r: any) => r?.values || {}).catch(() => ({})),
      ]);
      return { pay, bill, inv };
    },
  });

  useEffect(() => {
    if (!data) return;
    const { pay, bill, inv } = data;
    setForm((prev) => ({
      ...prev,
      stripeEnabled: Boolean(pay["payments.stripe_enabled"]),
      stripePublishableKey: String(pay["payments.stripe_publishable_key"] || ""),
      stripeSecretKey: pay["payments.stripe_secret_key"]?.set ? "••••••••••••••••" : "",
      stripeWebhookSecret: pay["payments.stripe_webhook_secret"]?.set ? "••••••••••••••••" : "",
      razorpayWebhookSecret: pay["payments.razorpay_webhook_secret"]?.set ? "••••••••••••••••" : "",
      defaultTrialDays: String(bill["billing.default_trial_days"] ?? 14),
      gracePeriodDays: String(bill["billing.grace_period_days"] ?? 7),
      autoSuspendOverdue: bill["billing.auto_suspend_overdue"] !== false,
      defaultTaxRate: String(bill["billing.default_tax_rate"] ?? 18),
      invoicePrefix: String(bill["billing.invoice_prefix"] || "INV-"),
      recurringInterval: String(inv["invoicing.recurring_default_interval"] || "MONTHLY"),
      autoPostLedger: inv["invoicing.auto_post"] !== false,
      defaultTerms: String(inv["invoicing.default_terms"] || prev.defaultTerms),
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payPayload: Record<string, any> = {
        "payments.stripe_enabled": Boolean(form.stripeEnabled),
        "payments.stripe_publishable_key": form.stripePublishableKey.trim(),
      };
      if (form.stripeSecretKey && !form.stripeSecretKey.includes("••••")) {
        payPayload["payments.stripe_secret_key"] = form.stripeSecretKey.trim();
      }
      if (form.stripeWebhookSecret && !form.stripeWebhookSecret.includes("••••")) {
        payPayload["payments.stripe_webhook_secret"] = form.stripeWebhookSecret.trim();
      }
      if (form.razorpayWebhookSecret && !form.razorpayWebhookSecret.includes("••••")) {
        payPayload["payments.razorpay_webhook_secret"] = form.razorpayWebhookSecret.trim();
      }

      await Promise.all([
        api.put("/v1/settings/PLATFORM/payments", payPayload),
        api.put("/v1/settings/PLATFORM/billing", {
          "billing.default_trial_days": Math.max(0, Math.min(365, Number(form.defaultTrialDays) || 14)),
          "billing.grace_period_days": Math.max(0, Math.min(90, Number(form.gracePeriodDays) || 7)),
          "billing.auto_suspend_overdue": Boolean(form.autoSuspendOverdue),
          "billing.default_tax_rate": Math.max(0, Math.min(50, Number(form.defaultTaxRate) || 18)),
          "billing.invoice_prefix": form.invoicePrefix.trim() || "INV-",
        }),
        api.put("/v1/settings/PLATFORM/invoicing", {
          "invoicing.recurring_default_interval": form.recurringInterval,
          "invoicing.auto_post": Boolean(form.autoPostLedger),
          "invoicing.default_terms": form.defaultTerms.trim(),
        }),
      ]);
    },
    onSuccess: () => {
      toast.success("Stripe, webhook secrets, and SaaS billing lifecycle rules saved.");
      qc.invalidateQueries({ queryKey: ["settings", "PLATFORM", "stripe-billing-lifecycle"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save billing lifecycle rules"),
  });

  async function handleTestStripe() {
    setTestingStripe(true);
    try {
      const res: any = await api.post("/v1/settings/PLATFORM/payments/test", {
        provider: "stripe",
        stripeSecretKey: form.stripeSecretKey,
      });
      if (res?.success) {
        toast.success("Stripe API Verified!", { description: `${res.message} (${res.latencyMs || 0}ms)` });
      } else {
        toast.error("Stripe Test Failed", { description: res?.error });
      }
    } catch (err: any) {
      toast.error("Stripe Test Error", { description: err?.response?.data?.error || err?.message });
    } finally {
      setTestingStripe(false);
    }
  }

  return (
    <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <i className="ph ph-receipt text-primary text-base" />
              Stripe Billing, Webhook Secrets &amp; SaaS Dunning Rules
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Global Stripe card checkout, Razorpay/Stripe webhook HMAC secrets, free trials, grace windows, GST tax rate, and invoice terms.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" size="sm" variant="outline" disabled={testingStripe} onClick={handleTestStripe} className="gap-1.5">
              <i className={testingStripe ? "ph ph-spinner-gap animate-spin" : "ph ph-plugs-connected"} />
              Test Stripe
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <i className={saveMut.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-floppy-disk"} />
              Save Billing Rules
            </Button>
          </div>
        </div>

        {/* Stripe & Webhook Secrets */}
        <div className="space-y-4 border-b border-border/60 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Stripe Global Payments</p>
              <p className="text-[11px] text-muted-foreground">International card subscriptions, Apple Pay, and automated dunning webhooks.</p>
            </div>
            <Switch checked={form.stripeEnabled} onCheckedChange={(v) => setForm((p) => ({ ...p, stripeEnabled: v }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stripe Publishable Key</Label>
              <Input value={form.stripePublishableKey} onChange={(e) => setForm((p) => ({ ...p, stripePublishableKey: e.target.value }))} placeholder="pk_live_... or pk_test_..." className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stripe Secret Key</Label>
              <Input type="password" value={form.stripeSecretKey} onChange={(e) => setForm((p) => ({ ...p, stripeSecretKey: e.target.value }))} placeholder="sk_live_... or sk_test_..." className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stripe Webhook Signing Secret</Label>
              <Input type="password" value={form.stripeWebhookSecret} onChange={(e) => setForm((p) => ({ ...p, stripeWebhookSecret: e.target.value }))} placeholder="whsec_..." className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Razorpay Webhook Signing Secret</Label>
              <Input type="password" value={form.razorpayWebhookSecret} onChange={(e) => setForm((p) => ({ ...p, razorpayWebhookSecret: e.target.value }))} placeholder="Webhook secret from Razorpay Dashboard" className="h-9 text-xs" />
            </div>
          </div>
        </div>

        {/* Subscription Lifecycle & Invoicing Defaults */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-foreground">SaaS Trial, Grace Period &amp; Invoicing Policy</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Default Trial (Days)</Label>
              <Input type="number" min={0} max={365} value={form.defaultTrialDays} onChange={(e) => setForm((p) => ({ ...p, defaultTrialDays: e.target.value }))} className="h-9 text-xs tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Grace Period (Days)</Label>
              <Input type="number" min={0} max={90} value={form.gracePeriodDays} onChange={(e) => setForm((p) => ({ ...p, gracePeriodDays: e.target.value }))} className="h-9 text-xs tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Default GST / Tax (%)</Label>
              <Input type="number" min={0} max={50} value={form.defaultTaxRate} onChange={(e) => setForm((p) => ({ ...p, defaultTaxRate: e.target.value }))} className="h-9 text-xs tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Invoice Prefix</Label>
              <Input value={form.invoicePrefix} onChange={(e) => setForm((p) => ({ ...p, invoicePrefix: e.target.value }))} placeholder="INV-" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Default Billing Cycle</Label>
              <Select value={form.recurringInterval} onValueChange={(v) => setForm((p) => ({ ...p, recurringInterval: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Auto-Suspend Overdue Tenants</p>
                <p className="text-[11px] text-muted-foreground">Suspend workspace once grace period expires unpaid.</p>
              </div>
              <Switch checked={form.autoSuspendOverdue} onCheckedChange={(v) => setForm((p) => ({ ...p, autoSuspendOverdue: v }))} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Auto-Post Recurring Invoices</p>
                <p className="text-[11px] text-muted-foreground">Automatically post generated invoices to ledger.</p>
              </div>
              <Switch checked={form.autoPostLedger} onCheckedChange={(v) => setForm((p) => ({ ...p, autoPostLedger: v }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Standard Invoice Payment Terms</Label>
            <Textarea rows={2} value={form.defaultTerms} onChange={(e) => setForm((p) => ({ ...p, defaultTerms: e.target.value }))} className="text-xs" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
