"use client";

import React, { lazy, Suspense, useState, useEffect } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

// Dynamic import with SSR disabled for ApexCharts
const Chart = lazy(() => import("react-apexcharts"));

export default function ChartMorrisPage() {
  const years = ["2006", "2007", "2008", "2009", "2010", "2011", "2012"];
  const seriesA = [12, 18, 15, 25, 30, 18, 12];
  const seriesB = [18, 22, 18, 28, 35, 28, 18];

  // 1. Bar Chart 1
  const bar1Series = [
    { name: "Series A", data: seriesA },
    { name: "Series B", data: seriesB },
  ];
  const bar1Options: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 250, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    xaxis: { categories: years },
    plotOptions: { bar: { columnWidth: "60%", borderRadius: 3 } },
    dataLabels: { enabled: false },
  };

  // 2. Bar Chart 2 (Stacked)
  const barStackedOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 250, stacked: true, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    xaxis: { categories: years },
    plotOptions: { bar: { columnWidth: "60%", borderRadius: 3 } },
    dataLabels: { enabled: false },
  };

  // 3. Line Chart
  const line1Options: ApexCharts.ApexOptions = {
    chart: { type: "line", height: 250, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { width: 1, curve: "straight" },
    xaxis: { categories: years },
    yaxis: { max: 50 },
  };

  // 4. Area Chart
  const areaSeries = [
    { name: "Series A", data: [10, 25, 80, 25, 30, 18, 12] },
    { name: "Series B", data: [15, 22, 60, 28, 35, 28, 18] },
  ];
  const areaOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", height: 250, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { width: 1, curve: "straight" },
    fill: { opacity: 0.9 },
    xaxis: { categories: years },
    yaxis: { max: 100 },
  };

  // 5. Sine / Cosine Wave Live Chart (morrisBar6)
  const [sineWave, setSineWave] = useState(() => {
    const cats: string[] = [];
    const y: number[] = [];
    const z: number[] = [];
    for (let x = 0; x <= 360; x += 10) {
      cats.push(x.toString());
      y.push(Number(Math.sin((Math.PI * x) / 180).toFixed(4)));
      z.push(Number(Math.cos((Math.PI * x) / 180).toFixed(4)));
    }
    return { cats, y, z };
  });

  useEffect(() => {
    let reload = 0;
    const timer = setInterval(() => {
      reload++;
      const y: number[] = [];
      const z: number[] = [];
      const offset = (5 * reload) % 360;
      for (let x = 0; x <= 360; x += 10) {
        const v = (offset + x) % 360;
        y.push(Number(Math.sin((Math.PI * v) / 180).toFixed(4)));
        z.push(Number(Math.cos((Math.PI * v) / 180).toFixed(4)));
      }
      setSineWave((prev) => ({ ...prev, y, z }));
    }, 600);
    return () => clearInterval(timer);
  }, []);

  const sineSeries = [
    { name: "data1", data: sineWave.y },
    { name: "data2", data: sineWave.z },
  ];
  const sineOptions: ApexCharts.ApexOptions = {
    chart: { type: "line", height: 250, animations: { enabled: false }, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { width: 1, curve: "straight" },
    markers: { size: 0 },
    xaxis: { categories: sineWave.cats, labels: { show: false } },
    yaxis: { min: -1, max: 1 },
  };

  // 6. Licensed / SORN Line Chart (morrisBar7)
  const dateDates = [
    "2012-10-01",
    "2012-09-30",
    "2012-09-29",
    "2012-09-20",
    "2012-09-19",
    "2012-09-18",
    "2012-09-17",
    "2012-09-16",
    "2012-09-15",
    "2012-09-10",
  ];
  const dateSeries = [
    { name: "Licensed", data: [3407, 3351, 3269, 3246, 3257, 3248, 3171, 3171, 3201, 3215] },
    { name: "SORN", data: [660, 629, 618, 661, 667, 627, 660, 676, 656, 622] },
  ];
  const dateOptions: ApexCharts.ApexOptions = {
    chart: { type: "line", height: 250, toolbar: { show: false } },
    colors: ["#664dc9", "#44c4fa"],
    stroke: { width: 1, curve: "straight" },
    xaxis: { categories: dateDates },
  };

  // 7. Donut Chart
  const donutSeries = [50, 30, 20];
  const donutOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut", height: 250 },
    labels: ["Sales", "Pending", "Process"],
    colors: ["#664dc9", "#44c4fa", "#38cb89"],
  };

  // 8. Single Series Line Chart (morrisline)
  const singleLineSeries = [{ name: "Licensed", data: [20, 10, 15, 10, 20, 10] }];
  const singleLineOptions: ApexCharts.ApexOptions = {
    chart: { type: "line", height: 250, toolbar: { show: false } },
    colors: ["#664dc9"],
    stroke: { width: 1, curve: "straight" },
    xaxis: {
      categories: ["2012-10-01", "2012-09-30", "2012-09-29", "2012-09-20", "2012-09-19", "2012-09-18"],
    },
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Morris Charts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            SmartHR Morris chart patterns implemented with modern vector telemetry and live harmonics.
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
          description="Dual series volume distribution across annual checkpoints."
          code={`<Chart options={bar1Options} series={bar1Series} type="bar" height={250} />`}
        >
          <div className="h-[260px] w-full" id="morrisBar1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={bar1Options} series={bar1Series} type="bar" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 2. Stacked Bar Chart */}
        <PreviewCard
          title="Stacked Bar Chart"
          description="Stacked annual series visualizing cumulative growth."
          code={`<Chart options={barStackedOptions} series={bar1Series} type="bar" height={250} />`}
        >
          <div className="h-[260px] w-full" id="morrisBar3">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={barStackedOptions} series={bar1Series} type="bar" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 3. Line Chart */}
        <PreviewCard
          title="Line Chart"
          description="Straight-segment dual line tracking annual variances."
          code={`<Chart options={line1Options} series={bar1Series} type="line" height={250} />`}
        >
          <div className="h-[260px] w-full" id="morrisLine1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={line1Options} series={bar1Series} type="line" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 4. Area Chart */}
        <PreviewCard
          title="Area Chart"
          description="Solid layered area chart displaying volume envelopes."
          code={`<Chart options={areaOptions} series={areaSeries} type="area" height={250} />`}
        >
          <div className="h-[260px] w-full" id="morrisArea1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={areaOptions} series={areaSeries} type="area" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 5. Sine / Cosine Wave Live Chart */}
        <PreviewCard
          title="Oscillating Harmonic Sine Wave"
          description="Dynamic real-time sinusoidal frequency line chart."
          code={`<Chart options={sineOptions} series={sineSeries} type="line" height={250} />`}
        >
          <div className="h-[260px] w-full" id="morrisBar6">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={sineOptions} series={sineSeries} type="line" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 6. Date Timeline Series */}
        <PreviewCard
          title="Date Timeline Series"
          description="Daily licensed vs SORN vehicle registration tracking."
          code={`<Chart options={dateOptions} series={dateSeries} type="line" height={250} />`}
        >
          <div className="h-[260px] w-full" id="morrisBar7">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={dateOptions} series={dateSeries} type="line" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 7. Donut Chart */}
        <PreviewCard
          title="Donut Chart"
          description="Status breakdown across Sales, Pending, and Process."
          code={`<Chart options={donutOptions} series={donutSeries} type="donut" height={250} />`}
        >
          <div className="h-[260px] w-full" id="morrisDonut1">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={donutOptions} series={donutSeries} type="donut" height={250} />
            </Suspense>
          </div>
        </PreviewCard>

        {/* 8. Single Series Line Chart */}
        <PreviewCard
          title="Single Series Trend"
          description="Focused single-metric line trajectory across registration dates."
          code={`<Chart options={singleLineOptions} series={singleLineSeries} type="line" height={250} />`}
        >
          <div className="h-[260px] w-full" id="morrisline">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={singleLineOptions} series={singleLineSeries} type="line" height={250} />
            </Suspense>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
