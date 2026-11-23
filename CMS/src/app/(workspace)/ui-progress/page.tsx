"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIProgressPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Progress</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Progress bars indicating completion state across onboarding steps, task milestones, and system quotas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Progress Bars */}
        <PreviewCard
          title="Basic Progress with Percentage"
          description="Standard progress indicators paired with percentage labels."
          code={`<div className="space-y-4">
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span>Onboarding Progress</span>
      <span>75%</span>
    </div>
    <div className="w-full bg-muted rounded-full h-2">
      <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }} />
    </div>
  </div>
</div>`}
        >
          <div className="space-y-4 p-2">
            <div>
              <div className="flex justify-between text-xs font-medium text-foreground mb-1.5">
                <span>Employee Onboarding Completion</span>
                <span className="text-primary font-bold">75%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: "75%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-foreground mb-1.5">
                <span>Sprint Task Milestones</span>
                <span className="text-emerald-600 font-bold">92%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: "92%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-foreground mb-1.5">
                <span>Cloud Storage Quota</span>
                <span className="text-amber-500 font-bold">48%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: "48%" }} />
              </div>
            </div>
          </div>
        </PreviewCard>

        {/* 2. Striped & Animated Bars */}
        <PreviewCard
          title="Striped & Animated Progress Bars"
          description="High-visibility striped gradient tracks with continuous animation."
          code={`<div className="w-full bg-muted rounded-full h-3 overflow-hidden">
  <div
    className="bg-primary h-3 rounded-full bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]"
    style={{ width: '60%' }}
  />
</div>`}
        >
          <div className="space-y-4 p-2">
            <div>
              <div className="flex justify-between text-xs font-medium text-foreground mb-1.5">
                <span>Biometrics Sync In Progress</span>
                <span className="text-primary font-bold">60%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-3 rounded-full bg-[linear-gradient(45deg,rgba(255,255,255,.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.2)_50%,rgba(255,255,255,.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"
                  style={{ width: "60%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-foreground mb-1.5">
                <span>Database Migration (Live)</span>
                <span className="text-rose-600 font-bold">35%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-rose-600 h-3 rounded-full bg-[linear-gradient(45deg,rgba(255,255,255,.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.2)_50%,rgba(255,255,255,.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"
                  style={{ width: "35%" }}
                />
              </div>
            </div>
          </div>
        </PreviewCard>

        {/* 3. Stacked Multi-Segment Progress */}
        <PreviewCard
          title="Stacked Multi-Segment Progress"
          description="Segmented progress bar breaking down total capacity across multiple categories."
          code={`<div className="w-full bg-muted rounded-full h-3 flex overflow-hidden">
  <div className="bg-primary h-full" style={{ width: '45%' }} title="Permanent: 45%" />
  <div className="bg-emerald-600 h-full" style={{ width: '30%' }} title="Contract: 30%" />
  <div className="bg-amber-500 h-full" style={{ width: '15%' }} title="Interns: 15%" />
</div>`}
        >
          <div className="space-y-3 p-2">
            <div className="w-full bg-muted rounded-full h-3 flex overflow-hidden">
              <div className="bg-primary h-full" style={{ width: "45%" }} title="Permanent: 45%" />
              <div className="bg-emerald-600 h-full" style={{ width: "30%" }} title="Contract: 30%" />
              <div className="bg-amber-500 h-full" style={{ width: "15%" }} title="Interns: 15%" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Permanent (45%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-600" /> Contract (30%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" /> Interns (15%)
              </span>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
