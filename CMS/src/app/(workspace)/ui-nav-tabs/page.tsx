"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UINavTabsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [activePill, setActivePill] = useState("daily");
  const [activeVertical, setActiveVertical] = useState("general");

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Tabs & Navigation</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tabbed interfaces across horizontal underline, pill segmented, justified, and vertical orientations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Underline Tabs */}
        <PreviewCard
          title="Underline Tabs"
          description="Classic flat horizontal tabs with active color indicator border."
          code={`<nav className="flex space-x-6 border-b border-border">
  <button onClick={() => setTab('overview')} className={tab === 'overview' ? 'border-b-2 border-primary text-primary' : ''}>Overview</button>
  <button onClick={() => setTab('payroll')} className={tab === 'payroll' ? 'border-b-2 border-primary text-primary' : ''}>Payroll</button>
</nav>`}
        >
          <div className="space-y-4 p-1">
            <nav className="flex space-x-6 border-b border-border/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`pb-3 transition-colors cursor-pointer ${
                  activeTab === "overview"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className={`pb-3 transition-colors cursor-pointer ${
                  activeTab === "attendance"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Attendance Log
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`pb-3 transition-colors cursor-pointer ${
                  activeTab === "documents"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Documents & Contracts
              </button>
            </nav>

            <div className="p-3 bg-muted/20 border border-border/60 rounded-lg text-xs leading-relaxed">
              {activeTab === "overview" && (
                <p className="text-muted-foreground">
                  Displaying core employment metadata, assigned supervisor, emergency contacts, and active equipment assets.
                </p>
              )}
              {activeTab === "attendance" && (
                <p className="text-muted-foreground">
                  30-day biometric clock-in timestamp records, calculated work hours, overtime credits, and break durations.
                </p>
              )}
              {activeTab === "documents" && (
                <p className="text-muted-foreground">
                  Verified PAN, Aadhaar, educational certificates, signed NDA, and annual compensation letters.
                </p>
              )}
            </div>
          </div>
        </PreviewCard>

        {/* 2. Pill Tabs */}
        <PreviewCard
          title="Pill Segmented Navigation"
          description="Rounded pill buttons highlighting active state with solid fill."
          code={`<div className="flex gap-2">
  <button onClick={() => setPill('daily')} className={pill === 'daily' ? 'bg-primary text-white' : 'bg-muted'}>Daily</button>
  <button onClick={() => setPill('weekly')} className={pill === 'weekly' ? 'bg-primary text-white' : 'bg-muted'}>Weekly</button>
</div>`}
        >
          <div className="space-y-4 p-1">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActivePill("daily")}
                className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activePill === "daily"
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                Daily Metrics
              </button>
              <button
                type="button"
                onClick={() => setActivePill("weekly")}
                className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activePill === "weekly"
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                Weekly Roster
              </button>
              <button
                type="button"
                onClick={() => setActivePill("monthly")}
                className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activePill === "monthly"
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                Monthly Settlement
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Selected timeframe: <strong className="text-foreground capitalize">{activePill}</strong> aggregation.
            </p>
          </div>
        </PreviewCard>

        {/* 3. Vertical Navigation Tabs */}
        <PreviewCard
          title="Vertical Navigation Tabs"
          description="Side rail navigation tabs paired with adjacent content pane."
          code={`<div className="flex gap-4">
  <div className="flex flex-col w-40">
    <button className="text-left py-2 font-medium">General</button>
    <button className="text-left py-2 font-medium">Security</button>
  </div>
  <div className="flex-1 p-3 bg-card border rounded">Content</div>
</div>`}
        >
          <div className="flex flex-col sm:flex-row gap-4 p-1">
            <div className="flex sm:flex-col gap-1 w-full sm:w-44 shrink-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveVertical("general")}
                className={`px-3 py-2 text-left rounded-md transition-colors cursor-pointer ${
                  activeVertical === "general"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                General Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveVertical("security")}
                className={`px-3 py-2 text-left rounded-md transition-colors cursor-pointer ${
                  activeVertical === "security"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                Security & Passkeys
              </button>
              <button
                type="button"
                onClick={() => setActiveVertical("billing")}
                className={`px-3 py-2 text-left rounded-md transition-colors cursor-pointer ${
                  activeVertical === "billing"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                Billing & Plan
              </button>
            </div>
            <div className="flex-1 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs">
              <h5 className="font-semibold text-foreground mb-1 capitalize">
                {activeVertical} Configuration
              </h5>
              <p className="text-muted-foreground leading-relaxed">
                Adjust organizational preferences, multi-factor policies, and automated billing notifications.
              </p>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
