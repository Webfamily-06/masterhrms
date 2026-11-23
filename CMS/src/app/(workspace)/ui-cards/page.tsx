"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UICardsPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Cards</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Flexible content containers for displaying statistics, employee summaries, modules, and grouped actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Content Card */}
        <PreviewCard
          title="Basic Card"
          description="Standard card with header, body content, and action button."
          code={`<div className="bg-card text-card-foreground border border-border rounded-lg p-5 shadow-xs">
  <h4 className="font-semibold text-base mb-2">Employee Verification</h4>
  <p className="text-xs text-muted-foreground mb-4">Complete statutory verification before next payroll run.</p>
  <button className="bg-primary text-white text-xs px-3.5 py-1.5 rounded-md">Review Details</button>
</div>`}
        >
          <div className="bg-card border border-border/80 rounded-lg p-5 shadow-xs">
            <h4 className="font-semibold text-sm text-foreground mb-1.5">
              Employee Verification Notice
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              12 newly onboarded staff members have submitted their tax documents and PF nomination forms for compliance sign-off.
            </p>
            <button
              type="button"
              className="bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3.5 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              Review Submissions
            </button>
          </div>
        </PreviewCard>

        {/* 2. Card with Header & Footer */}
        <PreviewCard
          title="Card with Header & Footer"
          description="Structured card dividing meta controls, main body, and footer timestamps."
          code={`<div className="border border-border rounded-lg overflow-hidden bg-card">
  <div className="p-4 border-b border-border flex justify-between items-center">
    <h5 className="font-semibold text-sm">Monthly Headcount</h5>
    <span className="badge bg-primary/10 text-primary text-xs">Live</span>
  </div>
  <div className="p-4">Card body content</div>
  <div className="p-3 bg-muted/30 border-t border-border text-xs text-muted-foreground">Last updated 5 mins ago</div>
</div>`}
        >
          <div className="border border-border/80 rounded-lg overflow-hidden bg-card shadow-xs">
            <div className="p-4 border-b border-border/60 flex justify-between items-center">
              <h5 className="font-semibold text-sm text-foreground">
                Headcount & Retention
              </h5>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                +4.2% MoM
              </span>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                1,420
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Active full-time employees across 8 domestic & regional branches.
              </p>
            </div>
            <div className="px-4 py-2.5 bg-muted/30 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Synchronized with Payroll DB</span>
              <span className="text-[11px] font-medium text-foreground">5 mins ago</span>
            </div>
          </div>
        </PreviewCard>

        {/* 3. Accent Border & Status Cards */}
        <PreviewCard
          title="Accent Status Cards"
          description="Cards augmented with distinctive top or side status bars."
          code={`<div className="border-t-4 border-t-primary border border-border rounded-lg p-4 bg-card">
  <h5 className="font-semibold text-sm">Primary Accent</h5>
</div>`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border-t-4 border-t-primary border border-border/80 rounded-lg p-4 bg-card shadow-xs">
              <span className="text-xs font-semibold text-primary">Onboarding</span>
              <h5 className="text-lg font-bold text-foreground mt-1">28</h5>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pending orientation</p>
            </div>
            <div className="border-t-4 border-t-emerald-500 border border-border/80 rounded-lg p-4 bg-card shadow-xs">
              <span className="text-xs font-semibold text-emerald-600">Attendance</span>
              <h5 className="text-lg font-bold text-foreground mt-1">96.8%</h5>
              <p className="text-[11px] text-muted-foreground mt-0.5">Punctuality today</p>
            </div>
          </div>
        </PreviewCard>

        {/* 4. Horizontal Card with Image */}
        <PreviewCard
          title="Horizontal Profile Card"
          description="Side-by-side layout displaying employee avatar and employment details."
          code={`<div className="flex items-center gap-4 border border-border rounded-lg p-4 bg-card">
  <img src="/assets/img/avatar/avatar-02.jpg" className="size-16 rounded-lg object-cover" />
  <div>
    <h5 className="font-semibold text-sm">Sarah Connor</h5>
    <p className="text-xs text-muted-foreground">Lead UI/UX Architect</p>
  </div>
</div>`}
        >
          <div className="flex items-center gap-4 border border-border/80 rounded-lg p-4 bg-card shadow-xs">
            <img
              src="/assets/img/avatar/avatar-02.jpg"
              className="size-16 rounded-xl object-cover border border-border shadow-xs shrink-0"
              alt="Employee"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h5 className="font-semibold text-sm text-foreground truncate">
                  Sarah Connor
                </h5>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                  Engineering
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Principal Design System Architect
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <i className="ph ph-envelope text-xs" />
                  s.connor@masterhrms.com
                </span>
                <span className="flex items-center gap-1">
                  <i className="ph ph-map-pin text-xs" />
                  HQ - Floor 4
                </span>
              </div>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
