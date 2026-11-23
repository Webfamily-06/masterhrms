"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIBadgesPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Badges</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Badges and tags for numerical counters, active states, labels, and status highlights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Solid Badges */}
        <PreviewCard
          title="Solid Badges"
          description="High-contrast badges with solid color backgrounds."
          code={`<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-primary text-white">Primary</span>
<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-900 text-white">Dark</span>
<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-600 text-white">Success</span>
<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500 text-white">Warning</span>
<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-500 text-white">Info</span>
<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-600 text-white">Danger</span>`}
        >
          <div className="flex flex-wrap items-center gap-2.5 p-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-primary text-white">Primary</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-900 text-white">Dark</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-600 text-white">Success</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500 text-white">Warning</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-500 text-white">Info</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-600 text-white">Danger</span>
          </div>
        </PreviewCard>

        {/* 2. Soft / Ghost Badges */}
        <PreviewCard
          title="Soft & Ghost Badges"
          description="Subtle, transparent background badges preferred for table records and lists."
          code={`<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">Primary</span>
<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Active</span>
<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">Pending</span>
<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">Rejected</span>`}
        >
          <div className="flex flex-wrap items-center gap-2.5 p-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">Primary</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">Archived</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Active</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">Pending</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-sky-500/10 text-sky-600 border border-sky-500/20">In Review</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">Rejected</span>
          </div>
        </PreviewCard>

        {/* 3. Pill Badges */}
        <PreviewCard
          title="Pill Badges"
          description="Rounded pill-shaped badges commonly used for tags and filters."
          code={`<span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary text-white">Full-time</span>
<span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">Contract</span>
<span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">Remote</span>`}
        >
          <div className="flex flex-wrap items-center gap-2.5 p-1">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary text-white">Full-time</span>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">Contract</span>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">Probation</span>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">Remote</span>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 border border-sky-500/20">Hybrid</span>
          </div>
        </PreviewCard>

        {/* 4. Badges with Status Dots & Icons */}
        <PreviewCard
          title="Badges with Status Dots & Icons"
          description="Badges augmented with contextual icons and live status indicators."
          code={`<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
  Live Shift
</span>`}
        >
          <div className="flex flex-wrap items-center gap-2.5 p-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Shift
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <span className="size-1.5 rounded-full bg-amber-500" />
              On Break
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <i className="ph ph-check text-xs" />
              Verified
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <i className="ph ph-shield-warning text-xs" />
              Overdue
            </span>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
