"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";
import Link from "next/link";

export default function UIBreadcrumbPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Breadcrumb</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hierarchical navigation trails indicating current location within the Master HRMS ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Breadcrumb */}
        <PreviewCard
          title="Basic Breadcrumb"
          description="Standard slash-separated trail indicating page hierarchy."
          code={`<nav aria-label="breadcrumb">
  <ol className="flex items-center gap-2 text-sm text-muted-foreground">
    <li><a href="#" className="hover:text-primary">Home</a></li>
    <li>/</li>
    <li><a href="#" className="hover:text-primary">HR Operations</a></li>
    <li>/</li>
    <li className="text-foreground font-semibold" aria-current="page">Employee Directory</li>
  </ol>
</nav>`}
        >
          <div className="p-2">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/hrm-dashboard" className="hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li className="opacity-40">/</li>
                <li>
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    Human Resources
                  </span>
                </li>
                <li className="opacity-40">/</li>
                <li className="text-foreground font-semibold" aria-current="page">
                  Employee Directory
                </li>
              </ol>
            </nav>
          </div>
        </PreviewCard>

        {/* 2. Breadcrumb with Chevron Icons */}
        <PreviewCard
          title="Chevron Separators"
          description="Modern breadcrumbs using micro-icons as dividers."
          code={`<nav aria-label="breadcrumb">
  <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <li><a href="#">Workspace</a></li>
    <i className="ph ph-caret-right text-xs" />
    <li><a href="#">Payroll & Finance</a></li>
    <i className="ph ph-caret-right text-xs" />
    <li className="text-foreground font-semibold">Salary Slips</li>
  </ol>
</nav>`}
        >
          <div className="p-2">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <li>
                  <Link href="/hrm-dashboard" className="hover:text-primary transition-colors">
                    Workspace
                  </Link>
                </li>
                <li>
                  <i className="ph ph-caret-right text-xs opacity-50" />
                </li>
                <li>
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    Payroll & Finance
                  </span>
                </li>
                <li>
                  <i className="ph ph-caret-right text-xs opacity-50" />
                </li>
                <li className="text-foreground font-semibold" aria-current="page">
                  Salary Slips Generation
                </li>
              </ol>
            </nav>
          </div>
        </PreviewCard>

        {/* 3. Breadcrumb with Leading Icons */}
        <PreviewCard
          title="Icon-Enriched Breadcrumbs"
          description="Contextual icons enhancing visual wayfinding."
          code={`<nav aria-label="breadcrumb">
  <ol className="flex items-center gap-2 text-xs">
    <li className="flex items-center gap-1"><i className="ph-duotone ph-house" />Home</li>
    <i className="ph ph-caret-right text-xs" />
    <li className="flex items-center gap-1"><i className="ph-duotone ph-clock" />Attendance</li>
  </ol>
</nav>`}
        >
          <div className="p-2">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/hrm-dashboard" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <i className="ph-duotone ph-house text-sm text-primary" />
                    <span>Home</span>
                  </Link>
                </li>
                <li>
                  <i className="ph ph-caret-right text-xs opacity-50" />
                </li>
                <li>
                  <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
                    <i className="ph-duotone ph-clock text-sm text-amber-500" />
                    <span>Attendance</span>
                  </span>
                </li>
                <li>
                  <i className="ph ph-caret-right text-xs opacity-50" />
                </li>
                <li className="flex items-center gap-1.5 text-foreground font-semibold" aria-current="page">
                  <i className="ph-duotone ph-calendar-check text-sm text-emerald-600" />
                  <span>Timesheet Reconciliations</span>
                </li>
              </ol>
            </nav>
          </div>
        </PreviewCard>

        {/* 4. Styled Container Breadcrumb */}
        <PreviewCard
          title="Card-Wrapped Breadcrumb"
          description="Contained background pill for prominent page headers."
          code={`<div className="bg-muted/50 border border-border/60 rounded-lg px-4 py-2.5">
  <!-- Breadcrumb list -->
</div>`}
        >
          <div className="p-1">
            <div className="bg-muted/40 border border-border/70 rounded-lg px-4 py-2.5">
              <nav aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-xs text-muted-foreground">
                  <li>
                    <Link href="/hrm-dashboard" className="hover:text-primary transition-colors font-medium">
                      Dashboard
                    </Link>
                  </li>
                  <li className="opacity-40">/</li>
                  <li>
                    <span className="hover:text-primary cursor-pointer transition-colors font-medium">
                      Performance & Appraisals
                    </span>
                  </li>
                  <li className="opacity-40">/</li>
                  <li className="text-primary font-semibold" aria-current="page">
                    Q4 Goal Settings
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
