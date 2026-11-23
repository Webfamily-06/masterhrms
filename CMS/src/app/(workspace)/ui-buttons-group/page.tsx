"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIButtonGroupPage() {
  const [selectedRadio, setSelectedRadio] = useState("all");
  const [activeView, setActiveView] = useState("grid");

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Button Group</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group a series of buttons together on a single line with attached borders and active state coordination.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Button Group */}
        <PreviewCard
          title="Basic Horizontal Button Group"
          description="Joined horizontal buttons with contiguous border corners."
          code={`<div className="inline-flex rounded-md shadow-xs" role="group">
  <button type="button" className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-s-lg hover:bg-muted">Left</button>
  <button type="button" className="px-4 py-2 text-sm font-medium text-foreground bg-card border-t border-b border-border hover:bg-muted">Middle</button>
  <button type="button" className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-e-lg hover:bg-muted">Right</button>
</div>`}
        >
          <div className="space-y-4 p-1">
            <div className="inline-flex rounded-md shadow-xs" role="group">
              <button type="button" className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-s-md hover:bg-muted transition-colors cursor-pointer">
                Left
              </button>
              <button type="button" className="px-4 py-2 text-sm font-medium text-foreground bg-card border-t border-b border-border hover:bg-muted transition-colors cursor-pointer">
                Middle
              </button>
              <button type="button" className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-e-md hover:bg-muted transition-colors cursor-pointer">
                Right
              </button>
            </div>

            {/* Solid primary group */}
            <div>
              <div className="inline-flex rounded-md shadow-xs" role="group">
                <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 border-r border-primary-foreground/20 rounded-s-md cursor-pointer">
                  Years
                </button>
                <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 border-r border-primary-foreground/20 cursor-pointer">
                  Months
                </button>
                <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-e-md cursor-pointer">
                  Days
                </button>
              </div>
            </div>
          </div>
        </PreviewCard>

        {/* 2. View Mode Toggle Group */}
        <PreviewCard
          title="Interactive Toggle Segment"
          description="Mutually exclusive segmented controls with active state highlights."
          code={`<div className="inline-flex p-1 bg-muted rounded-lg">
  <button onClick={() => setView('grid')} className={view === 'grid' ? 'bg-card shadow-xs' : ''}>Grid</button>
  <button onClick={() => setView('list')} className={view === 'list' ? 'bg-card shadow-xs' : ''}>List</button>
</div>`}
        >
          <div className="p-1 space-y-4">
            <div className="inline-flex p-1 bg-muted/70 border border-border/60 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveView("grid")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeView === "grid"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className="ph ph-squares-four text-sm" />
                <span>Grid View</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("list")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeView === "list"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className="ph ph-list-bullets text-sm" />
                <span>Table View</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("kanban")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeView === "kanban"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className="ph ph-kanban text-sm" />
                <span>Kanban</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current active selection: <strong className="text-foreground capitalize">{activeView}</strong>
            </p>
          </div>
        </PreviewCard>

        {/* 3. Button Toolbar with Search */}
        <PreviewCard
          title="Button Toolbar"
          description="Complex composite toolbar joining multiple button groups and utility actions."
          code={`<div className="flex flex-wrap items-center gap-2">
  <div className="inline-flex rounded-md shadow-xs">
    <button className="px-3 py-1.5 border border-border rounded-s-md">1</button>
    <button className="px-3 py-1.5 border-t border-b border-border">2</button>
    <button className="px-3 py-1.5 border border-border rounded-e-md">3</button>
  </div>
</div>`}
        >
          <div className="flex flex-wrap items-center gap-3 p-1">
            <div className="inline-flex rounded-md shadow-xs" role="group">
              <button type="button" className="px-3 py-1.5 text-xs font-medium bg-card border border-border rounded-s-md hover:bg-muted cursor-pointer">
                <i className="ph ph-text-bolder text-sm" />
              </button>
              <button type="button" className="px-3 py-1.5 text-xs font-medium bg-card border-t border-b border-border hover:bg-muted cursor-pointer">
                <i className="ph ph-text-italic text-sm" />
              </button>
              <button type="button" className="px-3 py-1.5 text-xs font-medium bg-card border border-border rounded-e-md hover:bg-muted cursor-pointer">
                <i className="ph ph-text-underline text-sm" />
              </button>
            </div>

            <div className="inline-flex rounded-md shadow-xs" role="group">
              <button type="button" className="px-3 py-1.5 text-xs font-medium bg-card border border-border rounded-s-md hover:bg-muted cursor-pointer">
                <i className="ph ph-text-align-left text-sm" />
              </button>
              <button type="button" className="px-3 py-1.5 text-xs font-medium bg-card border-t border-b border-border hover:bg-muted cursor-pointer">
                <i className="ph ph-text-align-center text-sm" />
              </button>
              <button type="button" className="px-3 py-1.5 text-xs font-medium bg-card border border-border rounded-e-md hover:bg-muted cursor-pointer">
                <i className="ph ph-text-align-right text-sm" />
              </button>
            </div>
          </div>
        </PreviewCard>

        {/* 4. Vertical Button Group */}
        <PreviewCard
          title="Vertical Button Group"
          description="Vertically stacked button controls for sidebars, filters, and tool palettes."
          code={`<div className="inline-flex flex-col rounded-md shadow-xs" role="group">
  <button type="button" className="px-4 py-2 text-sm border border-border rounded-t-md">Top</button>
  <button type="button" className="px-4 py-2 text-sm border-x border-b border-border">Middle</button>
  <button type="button" className="px-4 py-2 text-sm border-x border-b border-border rounded-b-md">Bottom</button>
</div>`}
        >
          <div className="p-1">
            <div className="inline-flex flex-col rounded-md shadow-xs w-48" role="group">
              <button type="button" className="px-4 py-2 text-xs font-semibold text-left text-foreground bg-card border border-border rounded-t-md hover:bg-muted transition-colors cursor-pointer flex items-center justify-between">
                <span>Personal Info</span>
                <i className="ph ph-user text-muted-foreground" />
              </button>
              <button type="button" className="px-4 py-2 text-xs font-semibold text-left text-foreground bg-card border-x border-b border-border hover:bg-muted transition-colors cursor-pointer flex items-center justify-between">
                <span>Bank Accounts</span>
                <i className="ph ph-bank text-muted-foreground" />
              </button>
              <button type="button" className="px-4 py-2 text-xs font-semibold text-left text-foreground bg-card border-x border-b border-border hover:bg-muted transition-colors cursor-pointer flex items-center justify-between">
                <span>Salary Structure</span>
                <i className="ph ph-receipt text-muted-foreground" />
              </button>
              <button type="button" className="px-4 py-2 text-xs font-semibold text-left text-foreground bg-card border-x border-b border-border rounded-b-md hover:bg-muted transition-colors cursor-pointer flex items-center justify-between">
                <span>Emergency Contacts</span>
                <i className="ph ph-phone text-muted-foreground" />
              </button>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
