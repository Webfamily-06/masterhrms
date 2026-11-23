"use client";

import React, { lazy, Suspense } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

// Dynamic import with SSR disabled for ApexCharts
const Chart = lazy(() => import("react-apexcharts"));

export default function ChartJsPage() {
  const months6 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const months12 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months5 = ["Jan", "Feb", "Mar", "Apr", "May"];
  const pieColors = ["#44c4fa", "#1976D2", "#6A1B9A", "#303F9F", "#FDAF22"];

  // 1. Bar Chart (chartBar1)
  const bar1Series = [{ name: "Sales", data: [24, 10, 32, 24, 26, 20] }];
  const bar1Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#44c4fa"],
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
  };

  // 2. Transparency Bar Chart (chartBar2)
  const bar2Series = [{ name: "Sales", data: [14, 12, 34, 25, 24, 20] }];
  const bar2Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#44c4fa"],
    fill: { opacity: 0.5 },
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
  };

  // 3. Gradient Bar Chart (chartBar3)
  const bar3Series = [{ name: "Sales", data: [14, 12, 34, 25, 24, 20] }];
  const bar3Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#0d7858"],
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.5,
        gradientToColors: ["#44c4fa"],
        opacityFrom: 1,
        opacityTo: 0.9,
      },
    },
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
  };

  // 4. Horizontal Bar Chart (chartBar4)
  const bar4Series = [{ name: "Sales", data: [14, 12, 34, 25, 24, 20] }];
  const bar4Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#44c4fa"],
    plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 2 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
    legend: { show: false },
  };

  // 5. Horizontal Bar Chart Style 2 (chartBar5)
  const bar5Series = [
    { name: "Target", data: [14, 12, 34, 25, 24] },
    { name: "Achieved", data: [22, 30, 25, 30, 20] },
  ];
  const bar5Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#1976D2", "#44c4fa"],
    plotOptions: { bar: { horizontal: true, borderRadius: 2 } },
    xaxis: { categories: months5 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 6. Vertical Stacked Bar Chart (chartStacked1)
  const stacked1Series = [
    { name: "Series A", data: [14, 12, 34, 25, 24, 20] },
    { name: "Series B", data: [14, 12, 34, 25, 24, 20] },
  ];
  const stacked1Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, stacked: true, toolbar: { show: false } },
    colors: ["#44c4fa", "#0D7858"],
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 7. Horizontal Stacked Bar Chart (chartStacked2)
  const stacked2Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 260, stacked: true, toolbar: { show: false } },
    colors: ["#44c4fa", "#0D7858"],
    plotOptions: { bar: { horizontal: true, borderRadius: 2 } },
    xaxis: { categories: months6 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 8. Line Chart (chartLine1)
  const line1Series = [
    { name: "Metric A", data: [14, 12, 34, 25, 44, 36, 35, 25, 30, 32, 20, 25] },
    { name: "Metric B", data: [35, 30, 45, 35, 55, 40, 10, 20, 25, 55, 50, 45] },
  ];
  const line1Options: ApexCharts.ApexOptions = {
    chart: { type: "line", height: 260, toolbar: { show: false } },
    colors: ["#44c4fa", "#0D7858"],
    stroke: { width: 2, curve: "straight" },
    xaxis: { categories: months12 },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 9. Donut Chart (chartPie in SmartHR)
  const pieData = [35, 20, 8, 15, 24];
  const donutOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut", height: 260 },
    labels: months5,
    colors: pieColors,
    legend: { position: "bottom" },
  };

  // 10. Pie Chart (chartDonut in SmartHR)
  const pieOptions: ApexCharts.ApexOptions = {
    chart: { type: "pie", height: 260 },
    labels: months5,
    colors: pieColors,
    legend: { position: "bottom" },
  };

  // 11. Area Chart (chartArea1)
  const area1Series = [
    { name: "Flow A", data: [20, 35, 45, 35, 55, 40, 30, 45, 50, 65, 55, 70] },
    { name: "Flow B", data: [10, 20, 25, 20, 35, 25, 20, 30, 35, 40, 30, 45] },
  ];
  const area1Options: ApexCharts.ApexOptions = {
    chart: { type: "area", height: 260, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.6, opacityTo: 0.05 } },
    xaxis: { categories: months12 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
  };

  // 12. Scatter / Radar Chart (chartRadar)
  const radarSeries = [
    { name: "Competency Level", data: [65, 80, 70, 85, 90, 75] },
  ];
  const radarOptions: ApexCharts.ApexOptions = {
    chart: { type: "radar", height: 260, toolbar: { show: false } },
    colors: ["#44c4fa"],
    xaxis: { categories: ["Speed", "Reliability", "Comfort", "Safety", "Efficiency", "Design"] },
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Chart.js</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            SmartHR Chart.js component showcase featuring 12 standard visualization patterns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Charts Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Bar Chart */}
        <PreviewCard
          title="Bar Chart"
          description="Classic single series monthly sales bars."
          code={`<Chart options={bar1Options} series={bar1Series} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartBar1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={bar1Options} series={bar1Series} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 2. Transparency */}
        <PreviewCard
          title="Transparency"
          description="Semi-transparent bar chart with 50% opacity."
          code={`<Chart options={bar2Options} series={bar2Series} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartBar2">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={bar2Options} series={bar2Series} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 3. Gradient Bar Chart */}
        <PreviewCard
          title="Gradient Bar Chart"
          description="Vertical multi-color gradient applied across columns."
          code={`<Chart options={bar3Options} series={bar3Series} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartBar3">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={bar3Options} series={bar3Series} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 4. Horizontal Bar Chart */}
        <PreviewCard
          title="Horizontal Bar Chart"
          description="Individual distinct bar colors per month."
          code={`<Chart options={bar4Options} series={bar4Series} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartBar4">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={bar4Options} series={bar4Series} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 5. Horizontal Bar Chart Style 2 */}
        <PreviewCard
          title="Horizontal Bar Chart Style2"
          description="Dual series horizontal target vs achievement bars."
          code={`<Chart options={bar5Options} series={bar5Series} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartBar5">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={bar5Options} series={bar5Series} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 6. Vertical Stacked Bar Chart */}
        <PreviewCard
          title="Vertical Stacked Bar Chart"
          description="Cumulative stacked columns comparing concurrent segments."
          code={`<Chart options={stacked1Options} series={stacked1Series} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartStacked1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={stacked1Options} series={stacked1Series} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 7. Horizontal Stacked Bar Chart */}
        <PreviewCard
          title="Horizontal Stacked Bar Chart"
          description="Transposed stacked horizontal segment breakdown."
          code={`<Chart options={stacked2Options} series={stacked1Series} type="bar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartStacked2">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={stacked2Options} series={stacked1Series} type="bar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 8. Line Chart */}
        <PreviewCard
          title="Line Chart"
          description="Dual metric 12-month trajectory line comparison."
          code={`<Chart options={line1Options} series={line1Series} type="line" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartLine1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={line1Options} series={line1Series} type="line" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 9. Donut Chart */}
        <PreviewCard
          title="Donut Chart"
          description="5-slice proportional doughnut distribution."
          code={`<Chart options={donutOptions} series={pieData} type="donut" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartPie">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={donutOptions} series={pieData} type="donut" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 10. Pie Chart */}
        <PreviewCard
          title="Pie Chart"
          description="Solid segmented circular proportional chart."
          code={`<Chart options={pieOptions} series={pieData} type="pie" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartDonut">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={pieOptions} series={pieData} type="pie" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 11. Area Chart */}
        <PreviewCard
          title="Area Chart"
          description="Smooth dual-gradient area curves over 12 months."
          code={`<Chart options={area1Options} series={area1Series} type="area" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartArea1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={area1Options} series={area1Series} type="area" height={260} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 12. Scatter / Radar Chart */}
        <PreviewCard
          title="Scatter / Radar Chart"
          description="Multi-axis competency radar matrix."
          code={`<Chart options={radarOptions} series={radarSeries} type="radar" height={260} />`}
        >
          <div className="h-[270px] w-full" id="chartRadar">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={radarOptions} series={radarSeries} type="radar" height={260} />
            </Suspense>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
