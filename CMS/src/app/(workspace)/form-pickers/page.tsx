"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function FormPickersPage() {
  const [selectedDate, setSelectedDate] = useState("2026-11-23");
  const [selectedTime, setSelectedTime] = useState("09:30");
  const [selectedColor, setSelectedColor] = useState("#0d6efd");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Date, Time & Color Pickers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive picker widgets for leave scheduling, shift start/end hours, fiscal quarters, and theme branding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Forms Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Date & Time Pickers */}
        <PreviewCard
          title="Standard Date & Time Pickers"
          description="Calendar and clock controls with formatted ISO string outputs."
          code={`<input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
<input type="time" value={time} onChange={(e) => setTime(e.target.value)} />`}
        >
          <div className="space-y-4 p-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Effective Joining Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-muted/20 border border-border rounded-md text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Selected: <strong className="text-foreground">{selectedDate}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Daily Shift Clock-In Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full p-2.5 text-xs bg-muted/20 border border-border rounded-md text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Scheduled Start: <strong className="text-foreground">{selectedTime} IST</strong>
              </p>
            </div>
          </div>
        </PreviewCard>

        {/* 2. Date Range Picker & Color Picker */}
        <PreviewCard
          title="Date Range & Color Palette Picker"
          description="Fiscal period span selector and workspace brand accent color picker."
          code={`<div className="flex gap-2">
  <input type="date" value={start} />
  <span>to</span>
  <input type="date" value={end} />
</div>`}
        >
          <div className="space-y-4 p-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Payroll Cycle Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Cycle Start:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 text-xs bg-muted/20 border border-border rounded-md text-foreground"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Cycle End:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 text-xs bg-muted/20 border border-border rounded-md text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Workspace Brand Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="size-10 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                />
                <div>
                  <span className="text-xs font-mono font-bold text-foreground uppercase">{selectedColor}</span>
                  <p className="text-[10px] text-muted-foreground">Applies to workspace headers & active sidebar links</p>
                </div>
              </div>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
