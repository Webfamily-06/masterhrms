"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIGridPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Grid System</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            12-column responsive layout engine based on CSS Grid and Flexbox with responsive breakpoint utilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. 12-Column Layout */}
        <PreviewCard
          title="12-Column Responsive Breakdown"
          description="Demonstration of equal column divisions across 12 grid tracks."
          code={`<div className="grid grid-cols-12 gap-3">
  <div className="col-span-12 p-3 bg-primary/10">col-12</div>
  <div className="col-span-6 p-3 bg-primary/10">col-6</div>
  <div className="col-span-6 p-3 bg-primary/10">col-6</div>
  <div className="col-span-4 p-3 bg-primary/10">col-4</div>
  <div className="col-span-4 p-3 bg-primary/10">col-4</div>
  <div className="col-span-4 p-3 bg-primary/10">col-4</div>
  <div className="col-span-3 p-3 bg-primary/10">col-3</div>
  <div className="col-span-3 p-3 bg-primary/10">col-3</div>
  <div className="col-span-3 p-3 bg-primary/10">col-3</div>
  <div className="col-span-3 p-3 bg-primary/10">col-3</div>
</div>`}
        >
          <div className="grid grid-cols-12 gap-2 text-center text-xs font-mono font-medium">
            <div className="col-span-12 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-12 (Full Width)
            </div>
            <div className="col-span-6 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-6 (50%)
            </div>
            <div className="col-span-6 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-6 (50%)
            </div>
            <div className="col-span-4 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-4 (33.3%)
            </div>
            <div className="col-span-4 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-4 (33.3%)
            </div>
            <div className="col-span-4 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-4 (33.3%)
            </div>
            <div className="col-span-3 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-3 (25%)
            </div>
            <div className="col-span-3 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-3 (25%)
            </div>
            <div className="col-span-3 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-3 (25%)
            </div>
            <div className="col-span-3 p-2.5 rounded bg-primary/10 text-primary border border-primary/20">
              col-span-3 (25%)
            </div>
          </div>
        </PreviewCard>

        {/* 2. Responsive Breakpoint Adaptation */}
        <PreviewCard
          title="Responsive Column Scaling"
          description="Columns automatically restructure based on screen dimensions (mobile: 1, tablet: 2, desktop: 4)."
          code={`<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="p-4 bg-card border rounded-lg">Card 1</div>
  <div className="p-4 bg-card border rounded-lg">Card 2</div>
  <div className="p-4 bg-card border rounded-lg">Card 3</div>
  <div className="p-4 bg-card border rounded-lg">Card 4</div>
</div>`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-card border border-border/80 text-xs shadow-xs">
              <span className="text-[10px] font-bold text-primary uppercase">Metric 1</span>
              <h5 className="text-lg font-bold text-foreground mt-1">98.4%</h5>
              <p className="text-muted-foreground mt-0.5">SLA Adherence</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/80 text-xs shadow-xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Metric 2</span>
              <h5 className="text-lg font-bold text-foreground mt-1">42</h5>
              <p className="text-muted-foreground mt-0.5">Open Positions</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/80 text-xs shadow-xs">
              <span className="text-[10px] font-bold text-amber-500 uppercase">Metric 3</span>
              <h5 className="text-lg font-bold text-foreground mt-1">₹ 4.2M</h5>
              <p className="text-muted-foreground mt-0.5">Monthly Payroll</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/80 text-xs shadow-xs">
              <span className="text-[10px] font-bold text-sky-600 uppercase">Metric 4</span>
              <h5 className="text-lg font-bold text-foreground mt-1">1,420</h5>
              <p className="text-muted-foreground mt-0.5">Active Workforce</p>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
