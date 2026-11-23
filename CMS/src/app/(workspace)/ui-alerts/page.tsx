"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function UIAlertsPage() {
  const [dismissedList, setDismissedList] = useState<Record<string, boolean>>({});

  const toggleDismiss = (id: string) => {
    setDismissedList((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Alerts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modern accessible alert components adhering to DreamsERP design tokens and standard web notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Solid Alerts */}
        <PreviewCard
          title="Basic Solid Alerts"
          description="High-contrast solid colored notification banners for urgent platform feedback."
          code={`<Alert variant="primary">This is a simple primary alert</Alert>
<Alert variant="dark">This is a simple dark alert</Alert>
<Alert variant="warning">This is a simple warning alert</Alert>
<Alert variant="info">This is a simple info alert</Alert>
<Alert variant="success">This is a simple success alert</Alert>
<Alert variant="danger">This is a simple error alert</Alert>`}
        >
          <div className="space-y-3">
            <Alert variant="primary">This is a simple primary alert</Alert>
            <Alert variant="dark">This is a simple dark alert</Alert>
            <Alert variant="warning">This is a simple warning alert</Alert>
            <Alert variant="info">This is a simple info alert</Alert>
            <Alert variant="success">This is a simple success alert</Alert>
            <Alert variant="danger">This is a simple error alert</Alert>
          </div>
        </PreviewCard>

        {/* 2. Ghost / Transparent Alerts */}
        <PreviewCard
          title="Ghost & Transparent Alerts"
          description="Soft subtle background alerts ideal for non-intrusive status reports."
          code={`<Alert variant="ghost-primary">This is a soft primary alert</Alert>
<Alert variant="ghost-dark">This is a soft light/dark alert</Alert>
<Alert variant="ghost-warning">This is a soft warning alert</Alert>
<Alert variant="ghost-info">This is a soft info alert</Alert>
<Alert variant="ghost-success">This is a soft success alert</Alert>
<Alert variant="ghost-danger">This is a soft danger alert</Alert>`}
        >
          <div className="space-y-3">
            <Alert variant="ghost-primary">This is a soft primary alert</Alert>
            <Alert variant="ghost-dark">This is a soft light/dark alert</Alert>
            <Alert variant="ghost-warning">This is a soft warning alert</Alert>
            <Alert variant="ghost-info">This is a soft info alert</Alert>
            <Alert variant="ghost-success">This is a soft success alert</Alert>
            <Alert variant="ghost-danger">This is a soft danger alert</Alert>
          </div>
        </PreviewCard>

        {/* 3. Left Border Accent Alerts */}
        <PreviewCard
          title="Border Accent Alerts"
          description="Card-style alerts highlighted with authoritative left-border status indicators."
          code={`<Alert variant="border-primary">Your workspace configuration has been updated.</Alert>
<Alert variant="border-warning">Your monthly payroll run is scheduled for review.</Alert>
<Alert variant="border-success">Timesheet batch successfully reconciled.</Alert>
<Alert variant="border-danger">Failed to connect to biometrics attendance device.</Alert>`}
        >
          <div className="space-y-3">
            <Alert variant="border-primary">Your workspace configuration has been updated.</Alert>
            <Alert variant="border-warning">Your monthly payroll run is scheduled for review.</Alert>
            <Alert variant="border-success">Timesheet batch successfully reconciled.</Alert>
            <Alert variant="border-danger">Failed to connect to biometrics attendance device.</Alert>
          </div>
        </PreviewCard>

        {/* 4. Outline Alerts */}
        <PreviewCard
          title="Outline Alerts"
          description="Clean minimalist outline border alerts without background fills."
          code={`<Alert variant="outline-primary">Primary outline alert notification</Alert>
<Alert variant="outline-warning">Warning outline alert notification</Alert>
<Alert variant="outline-success">Success outline alert notification</Alert>
<Alert variant="outline-danger">Error outline alert notification</Alert>`}
        >
          <div className="space-y-3">
            <Alert variant="outline-primary">Primary outline alert notification</Alert>
            <Alert variant="outline-warning">Warning outline alert notification</Alert>
            <Alert variant="outline-success">Success outline alert notification</Alert>
            <Alert variant="outline-danger">Error outline alert notification</Alert>
          </div>
        </PreviewCard>

        {/* 5. Alerts with Icons */}
        <PreviewCard
          title="Alerts with Phosphor & Tabler Icons"
          description="Semantic contextual alerts with visual vector glyphs for accessibility."
          code={`<Alert variant="ghost-primary" icon={<i className="ph-duotone ph-info text-xl" />}>
  An update to the enterprise employee portal is available.
</Alert>
<Alert variant="ghost-success" icon={<i className="ph-duotone ph-check-circle text-xl" />}>
  Employee onboarding documentation approved by HR operations.
</Alert>
<Alert variant="ghost-warning" icon={<i className="ph-duotone ph-warning text-xl" />}>
  3 leave requests require manager authorization before payroll cutoff.
</Alert>
<Alert variant="ghost-danger" icon={<i className="ph-duotone ph-warning-octagon text-xl" />}>
  Database synchronization failure detected on secondary cluster.
</Alert>`}
        >
          <div className="space-y-3">
            <Alert variant="ghost-primary" icon={<i className="ph-duotone ph-info text-xl text-primary" />}>
              An update to the enterprise employee portal is available.
            </Alert>
            <Alert variant="ghost-success" icon={<i className="ph-duotone ph-check-circle text-xl text-emerald-600" />}>
              Employee onboarding documentation approved by HR operations.
            </Alert>
            <Alert variant="ghost-warning" icon={<i className="ph-duotone ph-warning text-xl text-amber-500" />}>
              3 leave requests require manager authorization before payroll cutoff.
            </Alert>
            <Alert variant="ghost-danger" icon={<i className="ph-duotone ph-warning-octagon text-xl text-rose-600" />}>
              Database synchronization failure detected on secondary cluster.
            </Alert>
          </div>
        </PreviewCard>

        {/* 6. Dismissible Alerts & Additional Content */}
        <PreviewCard
          title="Dismissible & Rich Content Alerts"
          description="Interactive alerts with dismiss handlers, titles, dividers, and action buttons."
          code={`<Alert
  variant="ghost-info"
  dismissible
  icon={<i className="ph-duotone ph-bell-ringing text-xl" />}
>
  <div>
    <AlertTitle>Scheduled Maintenance Notice</AlertTitle>
    <AlertDescription>
      The platform will undergo regular infrastructure updates this Saturday between 02:00 UTC and 04:00 UTC.
    </AlertDescription>
  </div>
</Alert>`}
        >
          <div className="space-y-3">
            {!dismissedList["alert-1"] && (
              <Alert
                variant="ghost-info"
                dismissible
                onDismiss={() => toggleDismiss("alert-1")}
                icon={<i className="ph-duotone ph-bell-ringing text-xl text-sky-600" />}
              >
                <div>
                  <AlertTitle>Scheduled Maintenance Notice</AlertTitle>
                  <AlertDescription>
                    The platform will undergo regular infrastructure updates this Saturday between 02:00 UTC and 04:00 UTC.
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {!dismissedList["alert-2"] && (
              <Alert
                variant="ghost-success"
                dismissible
                onDismiss={() => toggleDismiss("alert-2")}
                icon={<i className="ph-duotone ph-shield-check text-xl text-emerald-600" />}
              >
                <div>
                  <AlertTitle>Two-Factor Authentication Enforced</AlertTitle>
                  <AlertDescription>
                    All workspace administrative accounts have successfully enabled passkey and authenticator device protection.
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {Object.keys(dismissedList).length > 0 && (
              <button
                type="button"
                onClick={() => setDismissedList({})}
                className="text-xs font-semibold text-primary underline cursor-pointer"
              >
                Reset Dismissed Alerts
              </button>
            )}
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
