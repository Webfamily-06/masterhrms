"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UICollapsePage() {
  const [openBasic, setOpenBasic] = useState(false);
  const [openFirst, setOpenFirst] = useState(false);
  const [openSecond, setOpenSecond] = useState(false);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Collapse</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toggle the visibility of content with smooth CSS animations and accessible disclosure triggers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Single Collapse */}
        <PreviewCard
          title="Basic Collapse Toggle"
          description="Click the button to reveal or conceal the hidden information block."
          code={`<button onClick={() => setOpen(!open)} className="btn btn-primary">
  Toggle Details
</button>
{open && (
  <div className="mt-3 p-4 bg-muted/40 border border-border rounded-lg">
    Collapsible body content.
  </div>
)}`}
        >
          <div className="p-1 space-y-3">
            <button
              type="button"
              onClick={() => setOpenBasic(!openBasic)}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors cursor-pointer"
              aria-expanded={openBasic}
            >
              <i className={`ph ${openBasic ? "ph-caret-up" : "ph-caret-down"}`} />
              <span>{openBasic ? "Hide Details" : "Show Details"}</span>
            </button>

            {openBasic && (
              <div className="p-4 bg-muted/40 border border-border/80 rounded-lg text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                <h5 className="font-semibold text-foreground mb-1 text-sm">
                  Employee Leave Balance Overview
                </h5>
                <p>
                  Annual Earned Leave (PL): 18 days remaining.<br />
                  Casual Leave (CL): 4 days remaining.<br />
                  Sick Leave (SL): 7 days remaining.
                </p>
              </div>
            )}
          </div>
        </PreviewCard>

        {/* 2. Multiple Target Collapse */}
        <PreviewCard
          title="Multiple Targets Collapse"
          description="Independent or coordinated toggling across multiple panel segments."
          code={`<div className="flex gap-2">
  <button onClick={() => setFirst(!first)}>Toggle First</button>
  <button onClick={() => setSecond(!second)}>Toggle Second</button>
  <button onClick={() => { setFirst(!both); setSecond(!both); }}>Toggle Both</button>
</div>`}
        >
          <div className="p-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenFirst(!openFirst)}
                className="bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer"
              >
                Toggle Panel A
              </button>
              <button
                type="button"
                onClick={() => setOpenSecond(!openSecond)}
                className="bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer"
              >
                Toggle Panel B
              </button>
              <button
                type="button"
                onClick={() => {
                  const state = !(openFirst && openSecond);
                  setOpenFirst(state);
                  setOpenSecond(state);
                }}
                className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer"
              >
                Toggle Both
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {openFirst && (
                <div className="p-3 bg-card border border-border/80 rounded-lg text-xs animate-in fade-in duration-150">
                  <h6 className="font-semibold text-foreground mb-1">Panel A: Shift Roster</h6>
                  <p className="text-muted-foreground">Morning Shift (09:00 - 18:00 IST)</p>
                </div>
              )}
              {openSecond && (
                <div className="p-3 bg-card border border-border/80 rounded-lg text-xs animate-in fade-in duration-150">
                  <h6 className="font-semibold text-foreground mb-1">Panel B: Location</h6>
                  <p className="text-muted-foreground">Bengaluru Tech Park, Block C</p>
                </div>
              )}
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
