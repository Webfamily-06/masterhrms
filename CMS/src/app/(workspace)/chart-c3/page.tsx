"use client";

import React, { lazy, Suspense } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

// Dynamic import with SSR disabled for ApexCharts
const Chart = lazy(() => import("react-apexcharts"));

export default function ChartC3Page() {
  const months12 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months6 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const months9 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

  // 1. Stacked Bar Chart (chart-bar-stacked)
  const stackedSeries = [
    { name: "Maximum", data: [11, 8, 15, 18, 19, 17, 20, 25, 32, 20, 14, 20] },
    { name: "Minimum", data: [7, 7, 5, 7, 9, 12, 4, 6, 2, 5, 2, 8] },
  ];
  const stackedOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, stacked: true, toolbar: { show: false } },
    colors: ["#44c4fa", "#664dc9"],
    plotOptions: { bar: { columnWidth: "40%", borderRadius: 2 } },
    xaxis: { categories: months12 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 2. Multiple Bar Chart (chart-bar)
  const barSeries = [
    { name: "Maximum", data: [11, 8, 15, 18, 19, 17] },
    { name: "Minimum", data: [7, 7, 5, 7, 9, 12] },
  ];
  const barOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 2 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 3. Horizontal Bar Chart (chart-bar-rotated)
  const rotatedBarOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#44c4fa", "#664dc9"],
    plotOptions: { bar: { horizontal: true, borderRadius: 2 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 4. Line / Area Spline Chart (chart-sracked)
  const splineSeries = [
    { name: "Maximum", data: [0, 9, 16, 19, 30, 25, 19, 12, 0] },
  ];
  const splineOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", height: 260, toolbar: { show: false } },
    colors: ["#664dc9"],
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
    xaxis: { categories: months9 },
    dataLabels: { enabled: false },
  };

  // 5. Rotated Spline Chart (chart-spline-rotated)
  const splineRotatedSeries = [
    { name: "Maximum", data: [12, 7, 8, 6, 8, 9, 12] },
    { name: "Minimum", data: [8, 10, 10, 9, 7, 10, 8] },
  ];
  const splineRotatedOptions: ApexCharts.ApexOptions = {
    chart: { type: "line", height: 260, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"] },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 6. Stacked Area Spline Chart (chart-area-spline-sracked)
  const areaSplineSeries = [
    { name: "Maximum", data: [12, 9, 16, 19, 20, 18] },
    { name: "Minimum", data: [8, 8, 6, 8, 10, 13] },
  ];
  const areaSplineOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", height: 260, stacked: true, toolbar: { show: false } },
    colors: ["#44c4fa", "#664dc9"],
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.7, opacityTo: 0.1 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 7. Pie Chart (chart-pie)
  const pieSeries = [63, 44, 12, 14];
  const pieOptions: ApexCharts.ApexOptions = {
    chart: { type: "pie", height: 260 },
    labels: ["A", "B", "C", "D"],
    colors: ["#664dc9", "#44c4fa", "#2dce89", "#ff5b51"],
    legend: { position: "bottom" },
  };

  // 8. Donut Chart (chart-donut)
  const donutSeries = [58, 65, 35];
  const donutOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut", height: 260 },
    labels: ["sales1", "sales2", "sales3"],
    colors: ["#664dc9", "#44c4fa", "#2dce89"],
    legend: { position: "bottom" },
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">C3 Charts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            SmartHR C3 D3-driven analytics models faithfully rendered via responsive vector pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Charts Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Bar Chart Stacked */}
        <PreviewCard
          title="Bar Chart (Stacked)"
          description="Cumulative minimum and maximum bounds stacked monthly."
          code={`<Chart options={stackedOptions} series={stackedSeries} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chart-bar-stacked">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={stackedOptions} series={stackedSeries} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 2. Multiple Bar Chart */}
        <PreviewCard
          title="Multiple Bar Chart"
          description="Side-by-side comparative column metrics over 6 months."
          code={`<Chart options={barOptions} series={barSeries} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chart-bar">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={barOptions} series={barSeries} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 3. Horizontal Bar Chart */}
        <PreviewCard
          title="Horizontal Bar Chart"
          description="Rotated horizontal distribution comparison."
          code={`<Chart options={rotatedBarOptions} series={barSeries} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chart-bar-rotated">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={rotatedBarOptions} series={barSeries} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 4. Area Spline Chart */}
        <PreviewCard
          title="Line / Area Spline Chart"
          description="Continuous smooth spline envelope across 9 months."
          code={`<Chart options={splineOptions} series={splineSeries} type="area" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chart-sracked">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={splineOptions} series={splineSeries} type="area" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 5. Rotated Spline Chart */}
        <PreviewCard
          title="Rotated Spline Chart"
          description="Dual smooth curve tracking performance variance."
          code={`<Chart options={splineRotatedOptions} series={splineRotatedSeries} type="line" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chart-spline-rotated">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={splineRotatedOptions} series={splineRotatedSeries} type="line" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 6. Stacked Area Spline Chart */}
        <PreviewCard
          title="Stacked Area Spline Chart"
          description="Dual-layered smooth area envelope stacked cumulatively."
          code={`<Chart options={areaSplineOptions} series={areaSplineSeries} type="area" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chart-area-spline-sracked">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={areaSplineOptions} series={areaSplineSeries} type="area" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 7. Pie Chart */}
        <PreviewCard
          title="Pie Chart"
          description="Proportional share breakdown across segments A, B, C, D."
          code={`<Chart options={pieOptions} series={pieSeries} type="pie" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chart-pie">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={pieOptions} series={pieSeries} type="pie" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 8. Donut Chart */}
        <PreviewCard
          title="Donut Chart"
          description="Three-channel sales distribution ring donut."
          code={`<Chart options={donutOptions} series={donutSeries} type="donut" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chart-donut">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={donutOptions} series={donutSeries} type="donut" height={260} />
            </Suspense>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
