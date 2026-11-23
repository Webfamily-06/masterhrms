"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UITypographyPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Typography</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Headings, body typography, display styles, blockquotes, inline formatting, and list structures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Heading Scale */}
        <PreviewCard
          title="Heading Scale (H1 - H6)"
          description="Hierarchical typography scale mapped to semantic heading tags."
          code={`<h1 className="text-3xl font-extrabold">H1 Heading</h1>
<h2 className="text-2xl font-bold">H2 Heading</h2>
<h3 className="text-xl font-bold">H3 Heading</h3>
<h4 className="text-lg font-semibold">H4 Heading</h4>
<h5 className="text-base font-semibold">H5 Heading</h5>
<h6 className="text-sm font-semibold">H6 Heading</h6>`}
        >
          <div className="space-y-3 p-1">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
              H1. Enterprise Master HRMS
            </h1>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
              H2. Workforce Governance System
            </h2>
            <h3 className="text-lg lg:text-xl font-bold text-foreground">
              H3. Departmental Structures
            </h3>
            <h4 className="text-base lg:text-lg font-semibold text-foreground">
              H4. Realtime Attendance Engine
            </h4>
            <h5 className="text-sm font-semibold text-foreground">
              H5. Automated Payroll Settlements
            </h5>
            <h6 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
              H6. Auditable Activity Logs
            </h6>
          </div>
        </PreviewCard>

        {/* 2. Inline Text Elements */}
        <PreviewCard
          title="Inline Text Styles & Highlights"
          description="Inline typographical accents including highlights, deletions, codes, and badges."
          code={`<p>You can use the <mark>mark element</mark> to highlight text.</p>
<p><del>This line is treated as deleted text.</del></p>
<p><ins>This line is treated as an addition to the document.</ins></p>
<p><strong>This line rendered as bold text.</strong></p>
<p><em>This line rendered as italicized text.</em></p>`}
        >
          <div className="space-y-2.5 text-xs text-foreground p-1">
            <p>
              You can highlight regulatory requirements with the{" "}
              <mark className="bg-amber-300 dark:bg-amber-500/30 px-1 py-0.5 rounded text-foreground font-semibold">
                statutory compliance mark
              </mark>
              .
            </p>
            <p className="line-through text-muted-foreground">
              Legacy biometric USB sync cable drivers (Deprecated).
            </p>
            <p className="underline decoration-emerald-500 decoration-2 font-medium">
              Realtime WebSocket Push Gateway (Active Addition).
            </p>
            <p>
              Use inline code badges:{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-[11px]">
                GET /api/v1/employees
              </code>
            </p>
            <p>
              Keyboard shortcuts:{" "}
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-card shadow-xs font-mono text-[11px]">
                ⌘ + K
              </kbd>
            </p>
          </div>
        </PreviewCard>

        {/* 3. Blockquotes */}
        <PreviewCard
          title="Blockquotes with Citations"
          description="Styled quotes for employee testimonials, executive policies, and disclaimers."
          code={`<blockquote className="border-s-4 border-s-primary pl-4 py-1 italic text-muted-foreground">
  "Master HRMS streamlined our multi-city payroll reconciliation from 6 days to under 15 minutes."
  <footer className="text-xs font-semibold text-foreground mt-2">— VP of People Operations</footer>
</blockquote>`}
        >
          <div className="p-2">
            <blockquote className="border-s-4 border-s-primary bg-muted/20 rounded-r-lg p-4 italic text-xs text-muted-foreground leading-relaxed">
              &quot;Master HRMS streamlined our multi-city payroll reconciliation and attendance logging from 6 days to under 15 minutes with complete audit accountability.&quot;
              <footer className="text-xs font-semibold text-foreground not-italic mt-2 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                <span>VP of Global People Operations, Falcon LLP</span>
              </footer>
            </blockquote>
          </div>
        </PreviewCard>

        {/* 4. Lists with Custom Glyphs */}
        <PreviewCard
          title="Lists with Vector Glyphs"
          description="Clean bulleted lists styled with semantic Phosphor checks."
          code={`<ul className="space-y-2 text-xs">
  <li className="flex items-center gap-2"><i className="ph ph-check text-emerald-600" />Feature 1</li>
</ul>`}
        >
          <div className="p-1">
            <ul className="space-y-2 text-xs text-foreground">
              <li className="flex items-center gap-2">
                <i className="ph-duotone ph-check-circle text-emerald-600 text-sm" />
                <span>Zero-downtime database failover and automated tenant backup replication.</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="ph-duotone ph-check-circle text-emerald-600 text-sm" />
                <span>End-to-end encrypted chat, media attachment exchange, and WebRTC calling.</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="ph-duotone ph-check-circle text-emerald-600 text-sm" />
                <span>Custom dynamic form builders with drag-and-drop schema validation.</span>
              </li>
            </ul>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
