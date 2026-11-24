"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HrZoomMeetingsPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      <PageHeader
        title="Zoom Meetings"
        description="Schedule, launch, and manage Zoom video conferences for HR interviews, reviews, and team meetings."
        actions={
          <Link
            href="/hr/meetings"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <i className="ph-bold ph-plus text-sm" />
            Schedule Meeting
          </Link>
        }
      />

      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Zoom Video Conferencing</CardTitle>
          <CardDescription className="text-xs">
            Connect your Zoom OAuth credentials in Settings to automatically generate Zoom meeting links for HR meetings and candidate interviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center shrink-0">
              <i className="ph ph-video-conference text-xl" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ready to sync Zoom Meetings</p>
              <p className="text-xs text-muted-foreground">
                View all scheduled meetings or configure Zoom integration settings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/hr/meetings"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-background hover:bg-muted/60 text-xs font-semibold text-foreground"
            >
              <i className="ph ph-calendar text-sm" />
              All Meetings
            </Link>
            <Link
              href="/hr/settings"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              <i className="ph ph-gear text-sm" />
              Integration Settings
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
