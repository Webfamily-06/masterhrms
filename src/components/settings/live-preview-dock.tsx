import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Bell, User, Lock, Mail, Sparkles, CheckCircle2 } from "lucide-react";

interface LivePreviewDockProps {
  appName: string;
  primaryColor: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  footerText?: string;
}

export function LivePreviewDock({
  appName,
  primaryColor = "#FF6B00",
  logoLightUrl = "/logo.webp",
  logoDarkUrl = "/white-logo.webp",
  footerText = "© 2026 Master HRMS. All rights reserved.",
}: LivePreviewDockProps) {
  return (
    <Card className="border border-border/80 shadow-md bg-card/70 backdrop-blur-md overflow-hidden sticky top-6">
      <CardHeader className="py-3.5 px-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Realtime Visual Preview</CardTitle>
        </div>
        <Badge
          variant="outline"
          className="text-[11px] gap-1 border-primary/30 text-primary font-mono bg-primary/5"
        >
          <Sparkles className="size-3" /> Live Repaint
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-5">
        {/* 1. Header (Light Mode) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Portal Header (Light Mode)</span>
            <span className="text-[10px] uppercase font-mono">Surface: Light</span>
          </div>
          <div className="rounded-xl border bg-white text-slate-900 p-3 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {logoLightUrl ? (
                  <img
                    src={logoLightUrl}
                    alt={appName}
                    className="h-6 max-w-[120px] object-contain"
                  />
                ) : (
                  <div
                    className="size-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {appName.slice(0, 1)}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
                  {appName}
                </span>
              </div>

              {/* Mock Nav Pill */}
              <div className="flex items-center gap-1.5">
                <span
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white shadow-xs transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  Dashboard
                </span>
                <span className="text-[11px] font-medium text-slate-500 px-2 py-1">Employees</span>
                <div className="size-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Bell className="size-3.5" />
                </div>
                <div
                  className="size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  AD
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Header (Dark Mode) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Portal Header (Dark Mode)</span>
            <span className="text-[10px] uppercase font-mono">Surface: Dark</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-100 p-3 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {logoDarkUrl ? (
                  <img
                    src={logoDarkUrl}
                    alt={appName}
                    className="h-6 max-w-[120px] object-contain"
                  />
                ) : (
                  <div
                    className="size-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {appName.slice(0, 1)}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-200 truncate max-w-[110px]">
                  {appName}
                </span>
              </div>

              {/* Mock Nav Pill Dark */}
              <div className="flex items-center gap-1.5">
                <span
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  Dashboard
                </span>
                <div className="size-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                  <Bell className="size-3.5" />
                </div>
                <div
                  className="size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  AD
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Login Card Mockup */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Login Card Preview</span>
            <span className="text-[10px] uppercase font-mono">CTA Button</span>
          </div>
          <div className="rounded-xl border bg-muted/40 p-3.5 flex flex-col items-center text-center">
            <div className="mb-2">
              <img
                src={logoLightUrl || "/logo.webp"}
                alt={appName}
                className="h-7 max-w-[130px] object-contain mx-auto"
              />
            </div>
            <p className="text-xs font-semibold text-foreground">Sign in to {appName}</p>
            <p className="text-[10px] text-muted-foreground mb-3">Enterprise Employee Portal</p>

            <div className="w-full space-y-1.5 mb-3 text-left">
              <div className="h-6 bg-background rounded border px-2 text-[10px] flex items-center text-muted-foreground">
                <Mail className="size-3 mr-1.5" /> employee@company.com
              </div>
              <div className="h-6 bg-background rounded border px-2 text-[10px] flex items-center text-muted-foreground">
                <Lock className="size-3 mr-1.5" /> ••••••••••••
              </div>
            </div>

            <button
              type="button"
              className="w-full py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              Sign In to Workspace
            </button>
          </div>
        </div>

        {/* Accent Color Badge Display */}
        <div className="pt-2 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Active Accent Color:</span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <div
              className="size-3.5 rounded-full border shadow-xs"
              style={{ backgroundColor: primaryColor }}
            />
            <span>{primaryColor}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
