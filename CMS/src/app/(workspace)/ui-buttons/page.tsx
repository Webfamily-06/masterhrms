"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIButtonsPage() {
  const [loading, setLoading] = useState(false);

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Buttons</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clickable button controls across solid, outline, ghost, sizing, rounded, and loading states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Solid Buttons */}
        <PreviewCard
          title="Solid Color Buttons"
          description="High-contrast primary call-to-actions with smooth hover feedback."
          code={`<button type="button" className="btn btn-primary bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm">Primary</button>
<button type="button" className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-md font-medium text-sm">Dark</button>
<button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md font-medium text-sm">Success</button>
<button type="button" className="bg-amber-500 text-white hover:bg-amber-600 px-4 py-2 rounded-md font-medium text-sm">Warning</button>
<button type="button" className="bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-md font-medium text-sm">Danger</button>`}
        >
          <div className="flex flex-wrap items-center gap-3 p-1">
            <button type="button" className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer shadow-xs">
              Primary
            </button>
            <button type="button" className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer shadow-xs">
              Dark
            </button>
            <button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer shadow-xs">
              Success
            </button>
            <button type="button" className="bg-amber-500 text-white hover:bg-amber-600 px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer shadow-xs">
              Warning
            </button>
            <button type="button" className="bg-sky-500 text-white hover:bg-sky-600 px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer shadow-xs">
              Info
            </button>
            <button type="button" className="bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer shadow-xs">
              Danger
            </button>
          </div>
        </PreviewCard>

        {/* 2. Light / Ghost Buttons */}
        <PreviewCard
          title="Light & Ghost Buttons"
          description="Subtle background buttons that elevate gracefully on cursor hover."
          code={`<button type="button" className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors">Primary Light</button>
<button type="button" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors">Success Light</button>`}
        >
          <div className="flex flex-wrap items-center gap-3 p-1">
            <button type="button" className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Primary Light
            </button>
            <button type="button" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Success Light
            </button>
            <button type="button" className="bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Warning Light
            </button>
            <button type="button" className="bg-sky-500/10 text-sky-600 hover:bg-sky-600 hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Info Light
            </button>
            <button type="button" className="bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Danger Light
            </button>
          </div>
        </PreviewCard>

        {/* 3. Outline Buttons */}
        <PreviewCard
          title="Outline Buttons"
          description="Bordered buttons ideal for secondary actions or cancel triggers."
          code={`<button type="button" className="border border-primary text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors">Outline Primary</button>
<button type="button" className="border border-border text-foreground hover:bg-muted px-4 py-2 rounded-md font-medium text-sm transition-colors">Outline Default</button>`}
        >
          <div className="flex flex-wrap items-center gap-3 p-1">
            <button type="button" className="border border-primary text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Outline Primary
            </button>
            <button type="button" className="border border-border text-foreground hover:bg-muted px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Outline Default
            </button>
            <button type="button" className="border border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Outline Success
            </button>
            <button type="button" className="border border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer">
              Outline Danger
            </button>
          </div>
        </PreviewCard>

        {/* 4. Sizing & Icon Buttons */}
        <PreviewCard
          title="Sizes, Pill & Icon States"
          description="Small, medium, large, rounded-pill shapes, and responsive loading animations."
          code={`<button type="button" className="btn-sm bg-primary text-white px-3 py-1.5 text-xs rounded-md">Small</button>
<button type="button" className="btn-md bg-primary text-white px-4 py-2 text-sm rounded-md">Default</button>
<button type="button" className="btn-lg bg-primary text-white px-5 py-2.5 text-base rounded-md">Large</button>
<button type="button" className="rounded-full bg-primary text-white px-4 py-2 text-sm">Pill Button</button>`}
        >
          <div className="space-y-4 p-1">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="bg-primary text-white hover:bg-primary/90 px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer">
                Small (sm)
              </button>
              <button type="button" className="bg-primary text-white hover:bg-primary/90 px-4 py-2 text-sm rounded-md font-medium transition-colors cursor-pointer">
                Medium (md)
              </button>
              <button type="button" className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 text-base rounded-lg font-medium transition-colors cursor-pointer">
                Large (lg)
              </button>
              <button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2 text-sm rounded-full font-medium transition-colors cursor-pointer">
                Rounded Pill
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
              <button type="button" className="inline-flex items-center gap-2 bg-primary text-white px-3.5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 cursor-pointer">
                <i className="ph ph-plus text-base" />
                Add Employee
              </button>
              <button type="button" className="inline-flex items-center gap-2 border border-border text-foreground hover:bg-muted px-3.5 py-2 rounded-md text-sm font-medium cursor-pointer">
                <i className="ph ph-download-simple text-base" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={simulateLoading}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                {loading && <i className="ph ph-spinner animate-spin text-base" />}
                <span>{loading ? "Processing..." : "Save Record"}</span>
              </button>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
