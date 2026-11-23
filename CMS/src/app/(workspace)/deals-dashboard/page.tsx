'use client';

import { useState, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/lib/router-compat";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DealsDashboardPage() {
  const [dateRange, setDateRange] = useState("This Week");

  // Chart 1: Pipeline Stages
  const pipelineChartOptions: any = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "50%",
        borderRadius: 4,
        distributed: true,
      },
    },
    colors: ["#0d6efd", "#0dcaf0", "#ffc107", "#198754", "#6f42c1"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Marketing", "Sales", "Email", "Chat", "Operational"],
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "11px" } } },
    grid: { borderColor: "rgba(100, 116, 139, 0.15)", strokeDashArray: 4 },
    legend: { show: false },
  };
  const pipelineChartSeries = [{ name: "Value ($)", data: [522145, 30424, 21135, 15235, 10557] }];

  // Chart 2: Deals by Stage
  const dealsStageOptions: any = {
    chart: { type: "area", height: 210, toolbar: { show: false }, sparkline: { enabled: false } },
    colors: ["#16a34a"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "11px" } } },
    grid: { borderColor: "rgba(100, 116, 139, 0.15)", strokeDashArray: 4 },
  };
  const dealsStageSeries = [{ name: "Deals Value", data: [12000, 18500, 15000, 24000, 20245, 26000] }];

  // Chart 3: Top Deals Donut
  const topDealsDonutOptions: any = {
    chart: { type: "donut", height: 210 },
    labels: ["Marketing", "Chat", "Email"],
    colors: ["#0d6efd", "#0dcaf0", "#ffc107"],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Top Deals",
              fontSize: "12px",
              color: "#64748b",
              formatter: () => "$1.23M",
            },
          },
        },
      },
    },
  };
  const topDealsDonutSeries = [569877, 484575, 184575];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Deals Dashboard"
        description="Comprehensive sales pipeline stage conversion, deal volume valuation, regional revenue distribution and recent enterprise deals."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Exporting Deals Analytics PDF...")}
            >
              <i className="ti ti-file-export mr-1.5 text-sm" />
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => toast.info("Create deal dialog opened")}
            >
              <i className="ti ti-plus mr-1.5 text-sm" />
              Create Deal
            </Button>
          </div>
        }
      />

      {/* Row 1: Pipeline Funnel + 6 Metric KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pipeline Stages Funnel */}
        <div className="lg:col-span-6 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Pipeline Stages</h4>
            <Badge variant="soft">{dateRange}</Badge>
          </div>
          <div className="min-h-[260px]">
            <Suspense fallback={<div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">Loading Pipeline Chart...</div>}>
              <Chart options={pipelineChartOptions} series={pipelineChartSeries} type="bar" height={260} />
            </Suspense>
          </div>
          <div>
            <h6 className="text-xs font-semibold text-muted-foreground mb-2">Leads Values By Stages</h6>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="border border-border/70 rounded p-2 bg-muted/20">
                <span className="text-[10px] text-muted-foreground block truncate">Marketing</span>
                <span className="font-bold text-foreground">$522,145</span>
              </div>
              <div className="border border-border/70 rounded p-2 bg-muted/20">
                <span className="text-[10px] text-muted-foreground block truncate">Sales</span>
                <span className="font-bold text-foreground">$30,424</span>
              </div>
              <div className="border border-border/70 rounded p-2 bg-muted/20">
                <span className="text-[10px] text-muted-foreground block truncate">Email</span>
                <span className="font-bold text-foreground">$21,135</span>
              </div>
              <div className="border border-border/70 rounded p-2 bg-muted/20">
                <span className="text-[10px] text-muted-foreground block truncate">Chat</span>
                <span className="font-bold text-foreground">$15,235</span>
              </div>
              <div className="border border-border/70 rounded p-2 bg-muted/20">
                <span className="text-[10px] text-muted-foreground block truncate">Operations</span>
                <span className="font-bold text-foreground">$10,557</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Metric KPI Cards Grid */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total Deals</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className="ti ti-delta text-base" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground">$45,221,45</h4>
              <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <i className="ti ti-arrow-wave-right-up" /> -4.01% from last week
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total Deal Value</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ti ti-currency text-base" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground">$12,545,68</h4>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <i className="ti ti-arrow-wave-right-up" /> +20.01% from last week
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Revenue This Month</span>
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <i className="ti ti-stairs-up text-base" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground">$46,548,48</h4>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <i className="ti ti-arrow-wave-right-up" /> +55% from last week
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total Customers</span>
              <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <i className="ti ti-users-group text-base" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground">9,895</h4>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <i className="ti ti-arrow-wave-right-up" /> +55% from last week
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Conversion Rate</span>
              <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <i className="ti ti-swipe text-base" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground">51.96%</h4>
              <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <i className="ti ti-arrow-wave-right-up" /> -6.01% from last week
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Active Customers</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ti ti-star text-base" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground">8,987</h4>
              <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <i className="ti ti-arrow-wave-right-up" /> -3.22% from last week
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Deals by Stage, Companies & Top Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deals by Stage Chart */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Deals By Stage</h4>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              +12% vs last year
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">$20,245</h3>
            <span className="text-xs text-muted-foreground">Aggregated deal stage progression</span>
          </div>
          <div className="min-h-[210px]">
            <Suspense fallback={<div className="h-[210px] flex items-center justify-center text-xs text-muted-foreground">Loading Deals Stage Chart...</div>}>
              <Chart options={dealsStageOptions} series={dealsStageSeries} type="area" height={210} />
            </Suspense>
          </div>
        </div>

        {/* Deals by Companies List */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Deals By Companies</h4>
            <Link to="/companies" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-2.5">
            {[
              { name: "Pitch Technologies", date: "Closing: 05 Apr 2026", amount: "$3,655" },
              { name: "Initech Global", date: "Closing: 05 May 2026", amount: "$2,185" },
              { name: "Umbrella Corp", date: "Closing: 29 Apr 2026", amount: "$1,583" },
              { name: "Capital Partners", date: "Closing: 23 Mar 2026", amount: "$6,584" },
              { name: "Massive Dynamic", date: "Closing: 23 Feb 2026", amount: "$2,153" },
            ].map((c) => (
              <div key={c.name} className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between text-xs">
                <div>
                  <h6 className="font-semibold text-foreground">{c.name}</h6>
                  <span className="text-[11px] text-muted-foreground">{c.date}</span>
                </div>
                <span className="font-bold text-primary">{c.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Deals Donut Chart */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Top Deals By Channel</h4>
            <Badge variant="soft">Live Channel</Badge>
          </div>
          <div className="min-h-[210px] flex items-center justify-center">
            <Suspense fallback={<div className="h-[210px] flex items-center justify-center text-xs text-muted-foreground">Loading Donut...</div>}>
              <Chart options={topDealsDonutOptions} series={topDealsDonutSeries} type="donut" height={210} />
            </Suspense>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Marketing
              </span>
              <span className="font-medium text-foreground">$569,877</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-cyan-500" /> Chat
              </span>
              <span className="font-medium text-foreground">$484,575</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" /> Email
              </span>
              <span className="font-medium text-foreground">$184,575</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Deals by Country, Won Deals Stages & Follow Up */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deals By Country */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Deals By Country</h4>
            <span className="text-xs text-muted-foreground">Global Markets</span>
          </div>
          <div className="divide-y divide-border/60">
            {[
              { country: "United States", deals: 350, value: "$1,065,000" },
              { country: "United Arab Emirates", deals: 221, value: "$966,000" },
              { country: "Singapore", deals: 236, value: "$959,000" },
              { country: "France", deals: 589, value: "$879,000" },
              { country: "Norway", deals: 221, value: "$632,000" },
            ].map((cnt) => (
              <div key={cnt.country} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <h6 className="font-semibold text-foreground">{cnt.country}</h6>
                  <span className="text-[11px] text-muted-foreground">{cnt.deals} Deals</span>
                </div>
                <span className="font-bold text-foreground">{cnt.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Won Deals Stage Summary */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground text-sm">Won Deals Stages</h4>
              <Badge variant="soft">Annual</Badge>
            </div>
            <div className="text-center py-2">
              <span className="text-xs text-muted-foreground block">Stages Won This Year</span>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">$45,899,79</h3>
              <span className="text-xs text-rose-600 font-semibold inline-flex items-center gap-1 mt-1">
                <i className="ti ti-arrow-narrow-down" /> -12% vs projection
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-center">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-xs text-muted-foreground block">Conversion</span>
                <span className="text-lg font-bold text-primary">48%</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs text-muted-foreground block">Calls</span>
                <span className="text-lg font-bold text-rose-600">24%</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs text-muted-foreground block">Email</span>
                <span className="text-lg font-bold text-amber-600">39%</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-muted-foreground block">Chats</span>
                <span className="text-lg font-bold text-emerald-600">20%</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2">
            View Stage Progression
          </Button>
        </div>

        {/* Recent Follow-ups */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Recent Follow-ups</h4>
            <Link to="/contacts" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { name: "Alexander Jermai", role: "UI/UX Designer", action: "mail" },
              { name: "Doglas Martini", role: "Product Lead", action: "phone" },
              { name: "Daniel Esbella", role: "Project Manager", action: "mail" },
              { name: "Stephan Peralt", role: "Technical Lead", action: "chat" },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {f.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h6 className="font-semibold text-foreground">{f.name}</h6>
                    <span className="text-[11px] text-muted-foreground">{f.role}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="size-7 rounded-lg border border-border/70 hover:bg-primary hover:text-white transition-colors flex items-center justify-center text-muted-foreground cursor-pointer"
                  onClick={() => toast.success(`Contacting ${f.name}...`)}
                >
                  <i className={cn("text-xs", f.action === "mail" ? "ti ti-mail" : f.action === "phone" ? "ti ti-phone" : "ti ti-brand-hipchat")} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Deals Data Table */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-foreground text-sm">Recent Deals</h4>
            <p className="text-xs text-muted-foreground">Recently active deal pipeline opportunities</p>
          </div>
          <Link to="/pipeline" className="text-xs text-primary hover:underline">
            Open Pipeline Board
          </Link>
        </div>

        <div className="overflow-x-auto border border-border/80 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Deal Name</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Deal Value</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Closed Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {[
                { name: "Collins Logistics App", stage: "Quality To Buy", value: "$450,000", owner: "Anthony Lewis", date: "14 Jan 2026" },
                { name: "Konopelski Enterprise Suite", stage: "Proposal Made", value: "$315,000", owner: "Brian Villalobos", date: "21 Jan 2026" },
                { name: "Adams Financial Cloud", stage: "Contact Made", value: "$840,000", owner: "Harvey Smith", date: "20 Feb 2026" },
                { name: "Schumm Healthcare CMS", stage: "Quality To Buy", value: "$610,000", owner: "Stephan Peralt", date: "15 Mar 2026" },
                { name: "Wisozk Retail Portal", stage: "Presentation", value: "$240,000", owner: "Doglas Martini", date: "28 Mar 2026" },
              ].map((deal) => (
                <tr key={deal.name} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-semibold text-foreground">{deal.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      {deal.stage}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-foreground">{deal.value}</td>
                  <td className="p-3 text-muted-foreground">{deal.owner}</td>
                  <td className="p-3 text-muted-foreground">{deal.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
