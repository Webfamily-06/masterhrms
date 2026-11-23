"use client";

import React, { lazy, Suspense } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

// Dynamic import with SSR disabled for ApexCharts
const Chart = lazy(() => import("react-apexcharts"));

export default function ChartApexPage() {
  // 1. Line Chart Options & Series
  const lineSeries = [
    { name: "Gross Payroll", data: [45, 52, 58, 65, 72, 78, 85] },
    { name: "Net Operating Revenue", data: [60, 68, 74, 82, 90, 98, 110] },
  ];
  const lineOptions: ApexCharts.ApexOptions = {
    chart: { height: 260, type: "line", toolbar: { show: false } },
    colors: ["#e11d48", "#0d6efd"],
    stroke: { curve: "smooth", width: 3 },
    xaxis: { categories: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
    dataLabels: { enabled: false },
    legend: { position: "top" },
  };

  // 2. Column Bar Chart
  const barSeries = [{ name: "Headcount", data: [320, 240, 180, 140, 95] }];
  const barOptions: ApexCharts.ApexOptions = {
    chart: { height: 260, type: "bar", toolbar: { show: false } },
    colors: ["#0d6efd"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "45%" } },
    xaxis: { categories: ["Engineering", "Sales", "Support", "Finance", "HR"] },
    dataLabels: { enabled: false },
  };

  // 3. Donut Chart
  const donutSeries = [58, 28, 14];
  const donutOptions: ApexCharts.ApexOptions = {
    chart: { height: 260, type: "donut" },
    labels: ["Full-Time", "Contractors", "Interns"],
    colors: ["#0d6efd", "#16a34a", "#f59e0b"],
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
  };

  // 4. RadialBar Gauge
  const radialSeries = [94];
  const radialOptions: ApexCharts.ApexOptions = {
    chart: { height: 260, type: "radialBar" },
    plotOptions: {
      radialBar: {
        hollow: { size: "70%" },
        dataLabels: {
          name: { show: true, fontSize: "14px", color: "#64748b" },
          value: { show: true, fontSize: "24px", fontWeight: "bold" },
        },
      },
    },
    colors: ["#16a34a"],
    labels: ["Attendance SLA"],
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Apex Charts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Declarative vector charts powered by ApexCharts for multi-tenant KPIs, telemetry, and revenue trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Charts Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Line Chart */}
        <PreviewCard
          title="Revenue vs Payroll Trend"
          description="Dual-series line chart tracking monthly expenditures against incoming cash flow."
          code={`<Chart options={lineOptions} series={lineSeries} type="line" height={260} />`}
        >
          <div className="h-[280px] w-full">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={lineOptions} series={lineSeries} type="line" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 2. Column Bar Chart */}
        <PreviewCard
          title="Departmental Headcount"
          description="Categorical column chart visualizing active staff distribution by department."
          code={`<Chart options={barOptions} series={barSeries} type="bar" height={260} />`}
        >
          <div className="h-[280px] w-full">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={barOptions} series={barSeries} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 3. Donut Chart */}
        <PreviewCard
          title="Employment Composition"
          description="Proportional breakdown across full-time employees, contractors, and interns."
          code={`<Chart options={donutOptions} series={donutSeries} type="donut" height={260} />`}
        >
          <div className="h-[280px] w-full">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={donutOptions} series={donutSeries} type="donut" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 4. RadialBar Gauge */}
        <PreviewCard
          title="Punctuality Compliance Gauge"
          description="Circular gauge tracking organizational shift adherence."
          code={`<Chart options={radialOptions} series={radialSeries} type="radialBar" height={260} />`}
        >
          <div className="h-[280px] w-full">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={radialOptions} series={radialSeries} type="radialBar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
