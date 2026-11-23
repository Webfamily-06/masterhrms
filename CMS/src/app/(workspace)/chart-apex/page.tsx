"use client";

import React, { lazy, Suspense } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

// Dynamic import with SSR disabled for ApexCharts
const Chart = lazy(() => import("react-apexcharts"));

export default function ChartApexPage() {
  // 1. Simple Line Chart (s-line)
  const lineSeries = [
    {
      name: "Desktops",
      data: [10, 41, 35, 51, 49, 62, 69, 91, 148],
    },
  ];
  const lineOptions: ApexCharts.ApexOptions = {
    chart: { height: 350, type: "line", zoom: { enabled: false }, toolbar: { show: false } },
    colors: ["#F26522"],
    dataLabels: { enabled: false },
    stroke: { curve: "straight", width: 3 },
    title: { text: "Product Trends by Month", align: "left" },
    grid: {
      row: { colors: ["#f1f2f3", "transparent"], opacity: 0.5 },
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    },
  };

  // 2. Simple Line Area Chart (s-line-area)
  const areaSeries = [
    { name: "series1", data: [31, 40, 28, 51, 42, 109, 100] },
    { name: "series2", data: [11, 32, 45, 32, 34, 52, 41] },
  ];
  const areaOptions: ApexCharts.ApexOptions = {
    chart: { height: 350, type: "area", toolbar: { show: false } },
    colors: ["#F26522", "#888ea8"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      type: "datetime",
      categories: [
        "2018-09-19T00:00:00",
        "2018-09-19T01:30:00",
        "2018-09-19T02:30:00",
        "2018-09-19T03:30:00",
        "2018-09-19T04:30:00",
        "2018-09-19T05:30:00",
        "2018-09-19T06:30:00",
      ],
    },
    tooltip: { x: { format: "dd/MM/yy HH:mm" } },
  };

  // 3. Simple Column Chart (s-col)
  const colSeries = [
    { name: "Net Profit", data: [44, 55, 57, 56, 61, 58, 63, 60, 66] },
    { name: "Revenue", data: [76, 85, 101, 98, 87, 105, 91, 114, 94] },
  ];
  const colOptions: ApexCharts.ApexOptions = {
    chart: { height: 350, type: "bar", toolbar: { show: false } },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "55%", borderRadius: 4 },
    },
    colors: ["#F26522", "#4361ee"],
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: { categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"] },
    yaxis: { title: { text: "$ (thousands)" } },
    fill: { opacity: 1 },
  };

  // 4. Column Stacked Chart (s-col-stacked)
  const colStackedSeries = [
    { name: "PRODUCT A", data: [44, 55, 41, 67, 22, 43] },
    { name: "PRODUCT B", data: [13, 23, 20, 8, 13, 27] },
    { name: "PRODUCT C", data: [11, 17, 15, 15, 21, 14] },
    { name: "PRODUCT D", data: [21, 7, 25, 13, 22, 8] },
  ];
  const colStackedOptions: ApexCharts.ApexOptions = {
    chart: { height: 350, type: "bar", stacked: true, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false } },
    colors: ["#F26522", "#E70D0D", "#03C95A", "#1B84FF"],
    xaxis: {
      type: "datetime",
      categories: [
        "01/01/2011 GMT",
        "01/02/2011 GMT",
        "01/03/2011 GMT",
        "01/04/2011 GMT",
        "01/05/2011 GMT",
        "01/06/2011 GMT",
      ],
    },
    legend: { position: "right", offsetY: 40 },
    fill: { opacity: 1 },
  };

  // 5. Simple Horizontal Bar Chart (s-bar)
  const barSeries = [
    { data: [400, 430, 448, 470, 540, 580, 690, 1100, 1200, 1380] },
  ];
  const barOptions: ApexCharts.ApexOptions = {
    chart: { height: 350, type: "bar", toolbar: { show: false } },
    colors: ["#F26522"],
    plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: [
        "South Korea",
        "Canada",
        "United Kingdom",
        "Netherlands",
        "Italy",
        "France",
        "Japan",
        "United States",
        "China",
        "Germany",
      ],
    },
  };

  // 6. Mixed Chart (mixed-chart)
  const mixedSeries = [
    {
      name: "Website Blog",
      type: "column",
      data: [440, 505, 414, 671, 227, 413, 201, 352, 752, 320, 257, 160],
    },
    {
      name: "Social Media",
      type: "line",
      data: [23, 42, 35, 27, 43, 22, 17, 31, 22, 22, 12, 16],
    },
  ];
  const mixedOptions: ApexCharts.ApexOptions = {
    chart: { height: 350, type: "line", toolbar: { show: false } },
    colors: ["#F26522", "#888ea8"],
    stroke: { width: [0, 4] },
    title: { text: "Traffic Sources" },
    labels: [
      "01 Jan 2001",
      "02 Jan 2001",
      "03 Jan 2001",
      "04 Jan 2001",
      "05 Jan 2001",
      "06 Jan 2001",
      "07 Jan 2001",
      "08 Jan 2001",
      "09 Jan 2001",
      "10 Jan 2001",
      "11 Jan 2001",
      "12 Jan 2001",
    ],
    xaxis: { type: "datetime" },
    yaxis: [
      { title: { text: "Website Blog" } },
      { opposite: true, title: { text: "Social Media" } },
    ],
  };

  // 7. Donut Chart (donut-chart)
  const donutSeries = [44, 55, 41, 17];
  const donutOptions: ApexCharts.ApexOptions = {
    chart: { height: 350, type: "donut", toolbar: { show: false } },
    colors: ["#F26522", "#4361ee", "#888ea8", "#e3e4eb"],
    legend: { position: "bottom" },
    responsive: [
      {
        breakpoint: 480,
        options: { chart: { width: 200 }, legend: { position: "bottom" } },
      },
    ],
  };

  // 8. Radial Chart (radial-chart)
  const radialSeries = [44, 55, 67, 83];
  const radialOptions: ApexCharts.ApexOptions = {
    chart: { height: 350, type: "radialBar", toolbar: { show: false } },
    colors: ["#F26522", "#4361ee", "#888ea8", "#e3e4eb"],
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { fontSize: "22px" },
          value: { fontSize: "16px" },
          total: {
            show: true,
            label: "Total",
            formatter: () => "249",
          },
        },
      },
    },
    labels: ["Apples", "Oranges", "Bananas", "Berries"],
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
        {/* 1. Apex Simple Line */}
        <PreviewCard
          title="Apex Simple Line"
          description="Product Trends by Month linear time series."
          code={`<Chart options={lineOptions} series={lineSeries} type="line" height={350} />`}
        >
          <div className="h-[360px] w-full" id="s-line">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={lineOptions} series={lineSeries} type="line" height={350} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 2. Area Chart */}
        <PreviewCard
          title="Area Chart"
          description="Smooth dual-series area chart tracking concurrent streams."
          code={`<Chart options={areaOptions} series={areaSeries} type="area" height={350} />`}
        >
          <div className="h-[360px] w-full" id="s-line-area">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={areaOptions} series={areaSeries} type="area" height={350} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 3. Column Chart */}
        <PreviewCard
          title="Column Chart"
          description="Net profit vs revenue column comparison."
          code={`<Chart options={colOptions} series={colSeries} type="bar" height={350} />`}
        >
          <div className="h-[360px] w-full" id="s-col">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={colOptions} series={colSeries} type="bar" height={350} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 4. Column Stacked Chart */}
        <PreviewCard
          title="Column Stacked Chart"
          description="Stacked product volume across consecutive fiscal checkpoints."
          code={`<Chart options={colStackedOptions} series={colStackedSeries} type="bar" height={350} />`}
        >
          <div className="h-[360px] w-full" id="s-col-stacked">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={colStackedOptions} series={colStackedSeries} type="bar" height={350} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 5. Bar Chart */}
        <PreviewCard
          title="Bar Chart"
          description="Horizontal categorical ranking of regional sales volume."
          code={`<Chart options={barOptions} series={barSeries} type="bar" height={350} />`}
        >
          <div className="h-[360px] w-full" id="s-bar">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={barOptions} series={barSeries} type="bar" height={350} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 6. Mixed Chart */}
        <PreviewCard
          title="Mixed Chart"
          description="Dual-axis column and line chart for traffic sources."
          code={`<Chart options={mixedOptions} series={mixedSeries} type="line" height={350} />`}
        >
          <div className="h-[360px] w-full" id="mixed-chart">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={mixedOptions} series={mixedSeries} type="line" height={350} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 7. Donut Chart */}
        <PreviewCard
          title="Donut Chart"
          description="Percentage distribution across segmented categories."
          code={`<Chart options={donutOptions} series={donutSeries} type="donut" height={350} />`}
        >
          <div className="h-[360px] w-full" id="donut-chart">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={donutOptions} series={donutSeries} type="donut" height={350} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 8. Radial Chart */}
        <PreviewCard
          title="Radial Chart"
          description="Multi-tier radial gauge tracking item progress and aggregate totals."
          code={`<Chart options={radialOptions} series={radialSeries} type="radialBar" height={350} />`}
        >
          <div className="h-[360px] w-full" id="radial-chart">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={radialOptions} series={radialSeries} type="radialBar" height={350} />
            </Suspense>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
