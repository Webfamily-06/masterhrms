"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIPopoversPage() {
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const togglePopover = (id: string) => {
    setActivePopover(activePopover === id ? null : id);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Popovers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rich interactive overlay tooltips containing headers, descriptive copy, and action buttons.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Four-Directional Popovers */}
        <PreviewCard
          title="Directional Popovers"
          description="Popovers anchored above, below, or to the sides of trigger controls."
          code={`<div className="relative inline-block">
  <button onClick={() => toggle('top')}>Popover on Top</button>
  {active === 'top' && (
    <div className="absolute bottom-full mb-2 w-56 bg-card border rounded-lg p-3 shadow-lg">
      <h5 className="font-semibold text-xs">Popover Header</h5>
      <p className="text-xs text-muted-foreground mt-1">Descriptive content.</p>
    </div>
  )}
</div>`}
        >
          <div className="flex flex-wrap items-center gap-4 p-4 min-h-[160px]">
            {/* Top */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => togglePopover("top")}
                className="bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer"
              >
                Popover on Top
              </button>
              {activePopover === "top" && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-card text-card-foreground border border-border/80 rounded-lg p-3 shadow-xl z-20 text-xs animate-in fade-in duration-150">
                  <h5 className="font-semibold text-foreground text-xs mb-1">Payroll Cutoff Alert</h5>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    All timesheets must be submitted by Friday 18:00 IST for automatic salary disbursement.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => togglePopover("bottom")}
                className="bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer"
              >
                Popover on Bottom
              </button>
              {activePopover === "bottom" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-card text-card-foreground border border-border/80 rounded-lg p-3 shadow-xl z-20 text-xs animate-in fade-in duration-150">
                  <h5 className="font-semibold text-foreground text-xs mb-1">Tax Declarations</h5>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Upload Section 80C investment proofs before the end of the current financial quarter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </PreviewCard>

        {/* 2. Interactive Action Popover */}
        <PreviewCard
          title="Actionable Popover with Form"
          description="Popover containing quick micro-actions and direct confirmation triggers."
          code={`<div className="relative inline-block">
  <button onClick={() => toggle('action')}>Quick Feedback</button>
  {active && (
    <div className="p-3 w-64 bg-card border rounded-lg">
      <input type="text" placeholder="Note" className="p-1 border rounded" />
      <button className="btn-primary mt-2">Submit</button>
    </div>
  )}
</div>`}
        >
          <div className="p-4 min-h-[160px]">
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => togglePopover("action")}
                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-3.5 py-2 rounded-md cursor-pointer"
              >
                <i className="ph ph-chat-circle-dots text-sm" />
                <span>Add Quick Manager Note</span>
              </button>

              {activePopover === "action" && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-card text-card-foreground border border-border/80 rounded-lg p-4 shadow-xl z-20 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <h5 className="font-semibold text-foreground text-xs mb-1.5">Note for Employee Record</h5>
                  <textarea
                    rows={2}
                    placeholder="Enter observation or praise..."
                    className="w-full p-2 border border-border rounded-md bg-muted/30 text-foreground text-xs mb-3"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
