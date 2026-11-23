"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIOffcanvasPage() {
  const [openLeft, setOpenLeft] = useState(false);
  const [openRight, setOpenRight] = useState(false);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Offcanvas Drawers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hidden sidebars and sliding drawers positioned left, right, top, or bottom with backdrop overlays.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Left Navigation Drawer */}
        <PreviewCard
          title="Left Offcanvas Drawer"
          description="Sliding panel appearing from the left edge of the viewport."
          code={`<button onClick={() => setOpenLeft(true)} className="btn-primary">Open Left Drawer</button>

{openLeft && (
  <div className="fixed inset-0 z-50 flex">
    <div className="fixed inset-0 bg-black/50" onClick={() => setOpenLeft(false)} />
    <div className="relative w-80 bg-card p-5 shadow-2xl">
      <!-- Drawer Content -->
    </div>
  </div>
)}`}
        >
          <div className="p-2">
            <button
              type="button"
              onClick={() => setOpenLeft(true)}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition-colors cursor-pointer"
            >
              <i className="ph ph-sidebar text-sm" />
              <span>Open Left Navigation Drawer</span>
            </button>

            {/* Left Drawer */}
            {openLeft && (
              <div className="fixed inset-0 z-50 flex">
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
                  onClick={() => setOpenLeft(false)}
                />
                <div className="relative z-10 w-80 max-w-[85vw] h-full bg-card text-card-foreground border-r border-border shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-left duration-200">
                  <div>
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
                      <h4 className="font-bold text-sm text-foreground">Workspace Menu</h4>
                      <button
                        type="button"
                        onClick={() => setOpenLeft(false)}
                        className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
                      >
                        <i className="ph ph-x text-base" />
                      </button>
                    </div>
                    <ul className="space-y-1 text-xs">
                      <li>
                        <a href="/hrm-dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted font-medium text-foreground">
                          <i className="ph-duotone ph-squares-four text-base text-primary" />
                          <span>HRM Overview</span>
                        </a>
                      </li>
                      <li>
                        <a href="/inventory-dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted font-medium text-foreground">
                          <i className="ph-duotone ph-warehouse text-base text-emerald-600" />
                          <span>Inventory Logistics</span>
                        </a>
                      </li>
                      <li>
                        <a href="/finance-dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted font-medium text-foreground">
                          <i className="ph-duotone ph-bank text-base text-amber-500" />
                          <span>Finance & Cash Flow</span>
                        </a>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground">
                    Master HRMS Enterprise v4.8
                  </div>
                </div>
              </div>
            )}
          </div>
        </PreviewCard>

        {/* 2. Right Detail Drawer */}
        <PreviewCard
          title="Right Offcanvas Detail Pane"
          description="Slide-in panel from the right edge, optimal for filter bars and entity inspectors."
          code={`<button onClick={() => setOpenRight(true)}>Open Right Filter Pane</button>`}
        >
          <div className="p-2">
            <button
              type="button"
              onClick={() => setOpenRight(true)}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition-colors cursor-pointer"
            >
              <i className="ph ph-sliders text-sm" />
              <span>Open Right Filter Pane</span>
            </button>

            {/* Right Drawer */}
            {openRight && (
              <div className="fixed inset-0 z-50 flex justify-end">
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
                  onClick={() => setOpenRight(false)}
                />
                <div className="relative z-10 w-96 max-w-[85vw] h-full bg-card text-card-foreground border-l border-border shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200">
                  <div>
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
                      <h4 className="font-bold text-sm text-foreground">Filter Employee Records</h4>
                      <button
                        type="button"
                        onClick={() => setOpenRight(false)}
                        className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
                      >
                        <i className="ph ph-x text-base" />
                      </button>
                    </div>
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Department</label>
                        <select className="w-full p-2 border border-border rounded-md bg-card text-foreground">
                          <option>All Departments</option>
                          <option>Engineering</option>
                          <option>Human Resources</option>
                          <option>Finance</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Employment Type</label>
                        <select className="w-full p-2 border border-border rounded-md bg-card text-foreground">
                          <option>All Types</option>
                          <option>Full-time Permanent</option>
                          <option>Contractor</option>
                          <option>Probation</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenRight(false)}
                      className="px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-md cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenRight(false)}
                      className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-md cursor-pointer"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
