"use client";

import React, { lazy, Suspense } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

// Dynamic import with SSR disabled
const Chart = lazy(() => import("react-apexcharts"));

export default function ChartJsPage() {
  // Area Chart (Revenue / Expenses flow)
  const areaSeries = [
    { name: "Invoiced Sales", data: [31, 40, 28, 51, 42, 109, 100] },
    { name: "Disbursements", data: [11, 32, 45, 32, 34, 52, 41] },
  ];
  const areaOptions: ApexCharts.ApexOptions = {
    chart: { height: 260, type: "area", toolbar: { show: false } },
    colors: ["#16a34a", "#f59e0b"],
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
    xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    dataLabels: { enabled: false },
    legend: { position: "top" },
  };

  // Radar Chart (Performance Matrix)
  const radarSeries = [
    { name: "Team Average", data: [80, 50, 70, 60, 85, 90] },
    { name: "Top Quartile", data: [95, 75, 88, 82, 98, 95] },
  ];
  const radarOptions: ApexCharts.ApexOptions = {
    chart: { height: 260, type: "radar", toolbar: { show: false } },
    colors: ["#0d6efd", "#e11d48"],
    xaxis: { categories: ["Communication", "Execution", "Code Quality", "Initiative", "Attendance", "Teamwork"] },
    markers: { size: 4 },
    legend: { position: "top" },
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Chart.js & Vector Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive canvas and SVG chart rendering displaying sales velocities, cash flows, and performance radars.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Charts Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Area Wave Chart */}
        <PreviewCard
          title="Weekly Invoiced Sales vs Disbursements"
          description="Gradient filled smooth area chart showing weekly cash movements."
          code={`<Chart options={areaOptions} series={areaSeries} type="area" height={260} />`}
        >
          <div className="h-[280px] w-full">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={areaOptions} series={areaSeries} type="area" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 2. Radar Skill Matrix */}
        <PreviewCard
          title="Team Competency Radar Matrix"
          description="Multi-axis radar polygon comparing team averages with top-quartile performance."
          code={`<Chart options={radarOptions} series={radarSeries} type="radar" height={260} />`}
        >
          <div className="h-[280px] w-full">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={radarOptions} series={radarSeries} type="radar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
