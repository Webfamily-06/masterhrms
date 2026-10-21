'use client';

import React from "react";
import { Link } from "@/src/lib/router-compat";
import { Webhook, Layers, Activity, Settings } from "lucide-react";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

export function WebhookNavHeader({ activeTab }: { activeTab: "endpoints" | "events" | "logs" | "settings" }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
      <div>
        <BreadcrumbNav />
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Webhook className="size-6 text-primary" /> Webhook Engine
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Event-driven HTTP callback system with HMAC-SHA256 signatures, SSRF protection & bounded retries.
        </p>
      </div>

      <div className="inline-flex items-center p-1 bg-muted/60 rounded-xl border border-border/50 text-xs font-semibold gap-1">
        <Link
          to="/addons/webhook/endpoints"
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "endpoints"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Webhook className="size-3.5" /> Endpoints
        </Link>
        <Link
          to="/addons/webhook/events"
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "events"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="size-3.5" /> Event Catalog
        </Link>
        <Link
          to="/addons/webhook/events"
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "logs" || activeTab === "events"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="size-3.5" /> Event Logs
        </Link>
        <Link
          to="/addons/webhook/settings"
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="size-3.5" /> Settings
        </Link>
      </div>
    </div>
  );
}
