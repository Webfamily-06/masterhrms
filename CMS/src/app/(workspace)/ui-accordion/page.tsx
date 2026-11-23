"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export default function UIAccordionPage() {
  const [openItems, setOpenItems] = useState<string[]>(["item-1"]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Accordion</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collapsible accordion content panels conforming to modern web disclosure patterns and DreamsERP styling.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Default Accordion */}
        <PreviewCard
          title="Default Accordion"
          description="Standard expandable accordion with smooth transition and icon rotation."
          code={`<Accordion type="single" collapsible defaultValue="item-1">
  <AccordionItem value="item-1">
    <AccordionTrigger>What is Master HRMS Enterprise?</AccordionTrigger>
    <AccordionContent>
      Master HRMS is an all-in-one Human Resource and Enterprise Resource Planning suite featuring payroll, attendance, workforce governance, and realtime communication.
    </AccordionContent>
  </AccordionItem>
</Accordion>`}
        >
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            <AccordionItem value="item-1" className="border-border/60">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline text-foreground">
                What is Master HRMS Enterprise?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Master HRMS is an all-in-one Human Resource and Enterprise Resource Planning suite featuring payroll, attendance, workforce governance, and realtime communication.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-border/60">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline text-foreground">
                How do multi-tenant roles work?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Workspaces are strictly isolated by tenant ID. Super Administrators oversee platform health, Workspace Administrators configure company policies, and Employees interact with dedicated self-service tools.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-border/60">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline text-foreground">
                Can we integrate biometrics devices?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Yes, our system synchronizes in realtime with ZKTeco, Anviz, and cloud biometric gateways via WebSockets and automated cron polling.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </PreviewCard>

        {/* 2. Flush Accordions */}
        <PreviewCard
          title="Flush Accordions"
          description="Border-free minimalist accordions designed to seamlessly integrate into container cards."
          code={`<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="item-1" className="border-b border-border/40">
    <AccordionTrigger>Automated Payroll Reconciliation</AccordionTrigger>
    <AccordionContent>Runs automatic deduction, PF, ESI, and tax withholding calculation.</AccordionContent>
  </AccordionItem>
</Accordion>`}
        >
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="f-1" className="border-b border-border/40 py-1">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline text-foreground py-2">
                Automated Payroll Reconciliation
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Runs automatic deduction, PF, ESI, and tax withholding calculation directly against verified timesheet inputs.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="f-2" className="border-b border-border/40 py-1">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline text-foreground py-2">
                Shift Schedule Roster Engine
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Distributes rotating 24/7 shifts, alerts on rest violations, and supports instantaneous peer swap requests.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="f-3" className="border-b-0 py-1">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline text-foreground py-2">
                Document Generation & Digital Signatures
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Generates branded appointment letters, appraisal forms, and contracts with audit-ready cryptographic verification.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </PreviewCard>

        {/* 3. Bordered Card Accordions */}
        <PreviewCard
          title="Bordered Card Accordions"
          description="Independent card elements each wrapped in clean borders with subtle padding."
          code={`<div className="space-y-3">
  <details className="group rounded-lg border border-border p-4 [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex cursor-pointer items-center justify-between font-semibold">
      <span>Company Policy & Compliance</span>
      <i className="ph ph-caret-down transition-transform group-open:rotate-180" />
    </summary>
    <p className="mt-3 text-xs text-muted-foreground">Standard compliance guidelines.</p>
  </details>
</div>`}
        >
          <div className="space-y-3">
            <details className="group rounded-lg border border-border/80 bg-muted/20 p-4 open:bg-card transition-all [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <i className="ph-duotone ph-shield-check text-primary text-base" />
                  Compliance & Regulatory Protocols
                </span>
                <i className="ph ph-caret-down text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
                All data is encrypted in transit via TLS 1.3 and at rest with AES-256 keys. Multi-region redundancy ensures 99.99% uptime guarantees across all active enterprise tenants.
              </p>
            </details>

            <details className="group rounded-lg border border-border/80 bg-muted/20 p-4 open:bg-card transition-all [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <i className="ph-duotone ph-database text-sky-600 text-base" />
                  Backup & Disaster Recovery
                </span>
                <i className="ph ph-caret-down text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
                Continuous point-in-time recovery (PITR) is maintained for 35 days, coupled with daily immutable snapshots stored in geographically isolated cloud buckets.
              </p>
            </details>
          </div>
        </PreviewCard>

        {/* 4. Colored Accent Accordions */}
        <PreviewCard
          title="Colored Accent Accordions"
          description="Status-driven accordions styled with branded contextual color accents."
          code={`<div className="space-y-3">
  <div className="rounded-lg border-s-4 border-s-emerald-600 border border-border/70 p-4">
    <!-- Success Accordion Content -->
  </div>
</div>`}
        >
          <div className="space-y-3">
            <details className="group rounded-lg border-s-4 border-s-emerald-500 border border-border/70 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 [&_summary::-webkit-details-marker]:hidden" open>
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-2">
                  <i className="ph-duotone ph-check-circle text-emerald-600 text-base" />
                  Production Deployment: Online
                </span>
                <i className="ph ph-caret-down transition-transform duration-200 group-open:rotate-180 text-emerald-600" />
              </summary>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Core CMS and API services operating normally with zero latency degradation.
              </p>
            </details>

            <details className="group rounded-lg border-s-4 border-s-amber-500 border border-border/70 bg-amber-50/30 dark:bg-amber-950/20 p-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-2">
                  <i className="ph-duotone ph-warning text-amber-500 text-base" />
                  Storage Quota Warning
                </span>
                <i className="ph ph-caret-down transition-transform duration-200 group-open:rotate-180 text-amber-500" />
              </summary>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Media library storage is at 82% capacity. Consider upgrading tier or executing cleanup.
              </p>
            </details>

            <details className="group rounded-lg border-s-4 border-s-rose-500 border border-border/70 bg-rose-50/30 dark:bg-rose-950/20 p-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-rose-800 dark:text-rose-300">
                <span className="flex items-center gap-2">
                  <i className="ph-duotone ph-warning-octagon text-rose-500 text-base" />
                  Authentication Rate Limit Throttled
                </span>
                <i className="ph ph-caret-down transition-transform duration-200 group-open:rotate-180 text-rose-500" />
              </summary>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Excessive login failures detected from IP block 198.51.100.0/24. Shield active.
              </p>
            </details>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
