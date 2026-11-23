"use client";

import React, { lazy, Suspense } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

// Dynamic import with SSR disabled for ApexCharts
const Chart = lazy(() => import("react-apexcharts"));

export default function ChartFlotPage() {
  const newCust = [20, 35, 25, 22, 18, 27, 34, 35, 48, 30];
  const newCustLine = [10, 15, 25, 22, 18, 27, 34];
  const retCustLine = [8, 17, 28, 20, 16, 24, 36];
  const pieLabels = ["Series 1", "Series 2", "Series 3", "Series 4", "Series 5"];
  const pieColors = ["#664dc9", "#44c4fa", "#38cb89", "#ef4b4b", "#ffab00"];

  // 1. Bar Chart 1
  const bar1Series = [{ name: "Value", data: newCust }];
  const bar1Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 250, toolbar: { show: false } },
    colors: ["#44c4fa"],
    plotOptions: { bar: { columnWidth: "40%", borderRadius: 3 } },
    dataLabels: { enabled: false },
    xaxis: { labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    yaxis: { labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    grid: { borderColor: "rgba(67, 87, 133, .09)" },
  };

  // 2. Bar Chart 2 (Two Series)
  const bar2Series = [
    { name: "Series A", data: [30, 15, 45, 22, 18, 27, 34, 35, 48] },
    { name: "Series B", data: [80, 20, 24, 17, 10, 24, 30, 16, 22] },
  ];
  const bar2Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 250, toolbar: { show: false } },
    series: bar2Series,
    colors: ["#664dc9", "#44c4fa"],
    plotOptions: { bar: { columnWidth: "60%", borderRadius: 3 } },
    dataLabels: { enabled: false },
    xaxis: { labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    yaxis: { labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    grid: { borderColor: "rgba(67, 87, 133, .09)" },
  };

  // 3. Line Chart 1
  const line1Series = [
    { name: "Sales", data: newCustLine },
    { name: "Customer", data: retCustLine },
  ];
  const line1Options: ApexCharts.ApexOptions = {
    chart: { type: "line", height: 250, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { width: 2, curve: "straight" },
    markers: { size: 0 },
    legend: { position: "top", horizontalAlign: "left" },
    xaxis: { labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    yaxis: { min: 0, max: 40, labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    grid: { borderColor: "rgba(67, 87, 133, .09)" },
  };

  // 4. Line Chart 2 (With Markers)
  const line2Options: ApexCharts.ApexOptions = {
    chart: { type: "line", height: 250, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { width: 2, curve: "straight" },
    markers: { size: 4 },
    legend: { position: "top", horizontalAlign: "right" },
    xaxis: { labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    yaxis: { min: 0, max: 50, labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    grid: { borderColor: "rgba(67, 87, 133, .09)" },
  };

  // 5. Area Chart 1
  const area1Options: ApexCharts.ApexOptions = {
    chart: { type: "area", height: 250, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { width: 1, curve: "straight" },
    fill: { type: "gradient", gradient: { opacityFrom: 0.8, opacityTo: 0 } },
    markers: { size: 0 },
    legend: { position: "top", horizontalAlign: "left" },
    xaxis: { labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    yaxis: { min: 0, max: 50, labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    grid: { borderColor: "rgba(67, 87, 133, .09)" },
  };

  // 6. Area Chart 2 (With Markers & Lighter Gradient)
  const area2Options: ApexCharts.ApexOptions = {
    chart: { type: "area", height: 250, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { width: 1, curve: "straight" },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    markers: { size: 4 },
    legend: { position: "top", horizontalAlign: "left" },
    xaxis: { labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    yaxis: { min: 0, max: 50, labels: { style: { colors: "#8e9cad", fontSize: "10px" } } },
    grid: { borderColor: "rgba(67, 87, 133, .09)" },
  };

  // 7. Pie Chart 1
  const pie1Options: ApexCharts.ApexOptions = {
    chart: { type: "pie", height: 250 },
    labels: pieLabels,
    colors: pieColors,
    legend: { show: false },
    dataLabels: { style: { fontSize: "11px" } },
  };

  // 8. Donut Chart 2
  const pie2Options: ApexCharts.ApexOptions = {
    chart: { type: "donut", height: 250 },
    labels: pieLabels,
    colors: pieColors,
    legend: { show: false },
    dataLabels: { style: { fontSize: "11px" } },
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Flot Charts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            SmartHR Flot chart patterns implemented with responsive vector telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Charts Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Bar Chart 1 */}
        <PreviewCard
          title="Bar Chart"
          description="Single customer volume distribution bar chart."
          code={`<Chart options={bar1Options} series={bar1Series} type="bar" height={250} />`}
        >
          <div className="h-[260px] w-full" id="flotBar1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={bar1Options} series={bar1Series} type="bar" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 2. Bar Chart 2 */}
        <PreviewCard
          title="Bar Chart (Two Series)"
          description="Comparative series A vs series B multi-bar chart."
          code={`<Chart options={bar2Options} series={bar2Series} type="bar" height={250} />`}
        >
          <div className="h-[260px] w-full" id="flotBar2">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={bar2Options} series={bar2Series} type="bar" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 3. Line Chart */}
        <PreviewCard
          title="Line Chart"
          description="Sales vs customer line chart without point markers."
          code={`<Chart options={line1Options} series={line1Series} type="line" height={250} />`}
        >
          <div className="h-[260px] w-full" id="flotLine1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={line1Options} series={line1Series} type="line" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 4. Line Chart Points */}
        <PreviewCard
          title="Line Chart Points"
          description="Sales vs customer line chart with accentuated point markers."
          code={`<Chart options={line2Options} series={line1Series} type="line" height={250} />`}
        >
          <div className="h-[260px] w-full" id="flotLine2">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={line2Options} series={line1Series} type="line" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 5. Area Chart */}
        <PreviewCard
          title="Area Chart"
          description="Gradient filled smooth area chart showing customer retention flows."
          code={`<Chart options={area1Options} series={line1Series} type="area" height={250} />`}
        >
          <div className="h-[260px] w-full" id="flotArea1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={area1Options} series={line1Series} type="area" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 6. Area Chart Points */}
        <PreviewCard
          title="Area Chart Points"
          description="Light gradient area chart highlighting sample point markers."
          code={`<Chart options={area2Options} series={line1Series} type="area" height={250} />`}
        >
          <div className="h-[260px] w-full" id="flotArea2">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={area2Options} series={line1Series} type="area" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 7. Pie Chart */}
        <PreviewCard
          title="Pie Chart"
          description="Categorical proportions displayed in a classic solid pie view."
          code={`<Chart options={pie1Options} series={[10, 50, 30, 30, 60]} type="pie" height={250} />`}
        >
          <div className="h-[260px] w-full" id="flotPie1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={pie1Options} series={[10, 50, 30, 30, 60]} type="pie" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 8. Donut Chart */}
        <PreviewCard
          title="Donut Chart"
          description="Ring donut breakdown of segmented metric series."
          code={`<Chart options={pie2Options} series={[10, 50, 30, 30, 60]} type="donut" height={250} />`}
        >
          <div className="h-[260px] w-full" id="flotPie2">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={pie2Options} series={[10, 50, 30, 30, 60]} type="donut" height={250} />
            </Suspense>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
