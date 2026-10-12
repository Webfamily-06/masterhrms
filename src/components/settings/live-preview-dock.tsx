import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, Mail, FileText, Globe, Palette, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LivePreviewDockProps {
  appName: string;
  primaryColor: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  footerText?: string;
  // Locale / Currency props
  currencyCode?: string;
  dateFormat?: string;
  timezone?: string;
  // Invoicing props
  companyLegalName?: string;
  companyAddress?: string;
  companyGstin?: string;
  invoicePrefix?: string;
  bankDetails?: string;
  className?: string;
}

export function LivePreviewDock({
  appName = "Master HRMS",
  primaryColor = "#2563EB",
  logoLightUrl = "/logo.webp",
  logoDarkUrl = "/white-logo.webp",
  footerText = "© 2026 Master HRMS. All rights reserved.",
  currencyCode = "INR",
  dateFormat = "DD-MM-YYYY",
  timezone = "Asia/Kolkata",
  companyLegalName,
  companyAddress,
  companyGstin,
  invoicePrefix = "INV-2026-",
  bankDetails,
  className,
}: LivePreviewDockProps) {
  const [activeTab, setActiveTab] = useState<"branding" | "locale" | "invoice" | "email">("branding");

  // Format currency sample
  const formatCurrencySample = (amount: number, code: string) => {
    try {
      return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: code,
      }).format(amount);
    } catch {
      return `${code} ${amount.toFixed(2)}`;
    }
  };

  return (
    <Card className={cn("border border-border/80 shadow-md bg-card/80 backdrop-blur-md overflow-hidden sticky top-6", className)}>
      <div className="p-3 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Interactive Live Preview</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          Unsaved Changes Synced
        </span>
      </div>

      <div className="p-3">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid grid-cols-4 h-8 bg-muted/60 p-0.5">
            <TabsTrigger value="branding" className="text-[11px] h-7 gap-1 px-1">
              <Palette className="size-3" /> Brand
            </TabsTrigger>
            <TabsTrigger value="locale" className="text-[11px] h-7 gap-1 px-1">
              <Globe className="size-3" /> Locale
            </TabsTrigger>
            <TabsTrigger value="invoice" className="text-[11px] h-7 gap-1 px-1">
              <FileText className="size-3" /> Invoice
            </TabsTrigger>
            <TabsTrigger value="email" className="text-[11px] h-7 gap-1 px-1">
              <Mail className="size-3" /> Email
            </TabsTrigger>
          </TabsList>

          {/* ─── 1. BRANDING PREVIEW ─────────────────────────────────── */}
          <TabsContent value="branding" className="space-y-4 pt-3 mt-0">
            {/* Light Mode Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>Portal Shell (Light Mode)</span>
                <span className="text-[10px] uppercase font-mono">Surface: White</span>
              </div>
              <div className="rounded-xl border bg-white text-slate-900 p-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {logoLightUrl ? (
                      <img src={logoLightUrl} alt={appName} className="h-5 max-w-[90px] object-contain" />
                    ) : (
                      <div
                        className="size-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {appName.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[90px]">
                      {appName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-white shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Dashboard
                    </span>
                    <div className="size-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <Bell className="size-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dark Mode Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>Portal Shell (Dark Mode)</span>
                <span className="text-[10px] uppercase font-mono">Surface: Slate-950</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-100 p-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {logoDarkUrl ? (
                      <img src={logoDarkUrl} alt={appName} className="h-5 max-w-[90px] object-contain" />
                    ) : (
                      <div
                        className="size-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {appName.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[90px]">
                      {appName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-white shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Dashboard
                    </span>
                    <div className="size-5 rounded-full bg-slate-900 flex items-center justify-center text-slate-400">
                      <Bell className="size-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accent Buttons */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-white shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Primary Button
              </button>
              <div
                className="size-7 rounded-lg border flex items-center justify-center font-mono text-xs font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                A
              </div>
            </div>
          </TabsContent>

          {/* ─── 2. LOCALE & CURRENCY PREVIEW ────────────────────────── */}
          <TabsContent value="locale" className="space-y-3 pt-3 mt-0">
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Currency Formatting:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrencySample(125000.5, currencyCode)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Small Denomination:</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrencySample(499, currencyCode)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Date Format Display:</span>
                <span className="font-mono text-foreground font-medium">
                  {dateFormat === "YYYY-MM-DD"
                    ? "2026-10-12"
                    : dateFormat === "MM/DD/YYYY"
                    ? "10/12/2026"
                    : "12-10-2026"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Active Timezone:</span>
                <span className="font-mono text-[11px] text-muted-foreground">{timezone}</span>
              </div>
            </div>
          </TabsContent>

          {/* ─── 3. INVOICE PREVIEW ──────────────────────────────────── */}
          <TabsContent value="invoice" className="space-y-2 pt-3 mt-0">
            <div className="rounded-xl border border-border/80 bg-background p-3 shadow-xs space-y-2.5">
              <div className="flex items-start justify-between border-b pb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {companyLegalName || appName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground max-w-[140px] truncate">
                    {companyAddress || "Tower 4, FinTech Park, Mumbai"}
                  </p>
                  {companyGstin && (
                    <p className="text-[10px] font-mono text-muted-foreground">
                      GSTIN: {companyGstin}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    TAX INVOICE
                  </span>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                    {invoicePrefix}0042
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sovereign HRMS (100 seats)</span>
                  <span className="font-mono">{formatCurrencySample(12000, currencyCode)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Integrated GST (18%)</span>
                  <span className="font-mono">{formatCurrencySample(2160, currencyCode)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1 text-foreground">
                  <span>Total Payable:</span>
                  <span className="font-mono">{formatCurrencySample(14160, currencyCode)}</span>
                </div>
              </div>

              {bankDetails && (
                <div className="pt-1 border-t text-[10px] text-muted-foreground font-mono">
                  <span className="font-semibold text-foreground">Wire Instructions:</span> {bankDetails}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── 4. EMAIL NOTIFICATION PREVIEW ───────────────────────── */}
          <TabsContent value="email" className="space-y-2 pt-3 mt-0">
            <div className="rounded-xl border border-border/80 bg-background overflow-hidden shadow-xs">
              <div
                className="p-3 text-white flex items-center justify-between"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-xs font-bold">{appName}</span>
                <Mail className="size-3.5" />
              </div>
              <div className="p-3 space-y-2 text-xs">
                <p className="font-semibold text-foreground">Welcome to your workspace!</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your administrator has provisioned an account for you on {appName}.
                </p>
                <div className="pt-1">
                  <span
                    className="inline-block px-3 py-1 rounded-md text-[11px] font-medium text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Confirm Email & Sign In
                  </span>
                </div>
              </div>
              <div className="p-2 border-t bg-muted/30 text-[10px] text-center text-muted-foreground">
                {footerText}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
