'use client';

import React from "react";
import { GanttTimelineView } from "@/components/todo/gantt-timeline-view";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { List } from "lucide-react";

export default function GanttTimelinePage() {
  return (
    <div className="space-y-6 max-w-full pb-16">
      <PageHeader
        title="Todo Gantt Timeline"
        description="Visualize task schedules, update deadlines, and track execution progress interactively across your authorized workspace."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Apps" },
          { label: "Todo", href: "/hr/todo" },
          { label: "Gantt Timeline" },
        ]}
        actions={
          <Link href="/todo">
            <Button variant="outline" size="sm" className="gap-2">
              <List className="w-4 h-4" />
              Switch to List View
            </Button>
          </Link>
        }
      />
      <GanttTimelineView onSwitchToList={() => { window.location.href = '/todo'; }} />
    </div>
  );
}
