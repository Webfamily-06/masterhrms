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

export default function LeadsDashboardPage() {
  const [pipelinePeriod, setPipelinePeriod] = useState("2025 - 2026");

  // Chart 1: Revenue / Pipeline Volume Bar Chart
  const pipelineBarOptions: any = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#0d6efd", "#0dcaf0", "#6c757d"],
    plotOptions: {
      bar: { columnWidth: "50%", borderRadius: 4 },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "11px" } } },
    grid: { borderColor: "rgba(100, 116, 139, 0.15)", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "right" },
  };
  const pipelineBarSeries = [
    { name: "Contacted", data: [45, 52, 38, 65, 74, 82, 70, 68, 72, 85, 90, 95] },
    { name: "Opportunity", data: [25, 30, 22, 40, 48, 55, 45, 42, 50, 60, 64, 68] },
    { name: "Not Contacted", data: [15, 18, 12, 20, 22, 24, 20, 18, 20, 25, 26, 28] },
  ];

  // Chart 2: New Leads Acquisition Bar
  const newLeadsOptions: any = {
    chart: { type: "bar", height: 260, toolbar: { show: false } },
    colors: ["#16a34a"],
    plotOptions: {
      bar: { columnWidth: "45%", borderRadius: 4 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "11px" } } },
    grid: { borderColor: "rgba(100, 116, 139, 0.15)", strokeDashArray: 4 },
  };
  const newLeadsSeries = [{ name: "New Inbound Leads", data: [15, 24, 32, 28, 42, 18, 12] }];

  // Chart 3: Lost Leads Funnel/Bar
  const lostLeadsOptions: any = {
    chart: { type: "bar", height: 220, toolbar: { show: false } },
    colors: ["#e11d48"],
    plotOptions: {
      bar: { horizontal: true, barHeight: "45%", borderRadius: 4 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Budget Constraints", "Competitor Chosen", "Timing Not Right", "No Authority", "Unresponsive"],
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "11px" } } },
    grid: { borderColor: "rgba(100, 116, 139, 0.15)", strokeDashArray: 4 },
  };
  const lostLeadsSeries = [{ name: "Lost Leads", data: [12, 8, 5, 3, 2] }];

  // Chart 4: Leads by Source Donut
  const leadsSourceOptions: any = {
    chart: { type: "donut", height: 220 },
    labels: ["Google Search", "Paid Social", "Email Campaigns", "Referrals"],
    colors: ["#0d6efd", "#ffc107", "#e11d48", "#6f42c1"],
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
              label: "Primary Channel",
              fontSize: "11px",
              color: "#64748b",
              formatter: () => "Google (40%)",
            },
          },
        },
      },
    },
  };
  const leadsSourceSeries = [40, 35, 15, 10];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Leads Dashboard"
        description="Monitor inbound lead volumes, stage conversion rates, lead sources, and outreach follow-ups."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Exporting Leads Analytics PDF...")}
            >
              <i className="ti ti-file-export mr-1.5 text-sm" />
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => toast.info("Add new lead dialog opened")}
            >
              <i className="ti ti-plus mr-1.5 text-sm" />
              Add Lead
            </Button>
          </div>
        }
      />

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total No of Leads</span>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <i className="ti ti-delta text-base" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-foreground">6,000</h4>
            <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
              <i className="ti ti-arrow-wave-right-up" /> -4.01% from last week
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">New Inbound Leads</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <i className="ti ti-currency text-base" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-foreground">120</h4>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <i className="ti ti-arrow-wave-right-up" /> +20.01% from last week
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Lost Leads</span>
            <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <i className="ti ti-stairs-up text-base" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-foreground">30</h4>
            <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
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
            <h4 className="text-2xl font-bold text-foreground">9,895</h4>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <i className="ti ti-arrow-wave-right-up" /> +55% from last week
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Pipeline Stages Volume + New Leads Acquisition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground text-sm">Pipeline Stages</h4>
              <p className="text-xs text-muted-foreground">Volume breakdown across progression milestones</p>
            </div>
            <Badge variant="soft">{pipelinePeriod}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-2 text-center text-xs">
            <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20">
              <span className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
                <span className="size-2 rounded-full bg-primary" /> Contacted
              </span>
              <span className="text-base font-bold text-foreground mt-0.5 block">50,000</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20">
              <span className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
                <span className="size-2 rounded-full bg-cyan-500" /> Opportunity
              </span>
              <span className="text-base font-bold text-foreground mt-0.5 block">25,985</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20">
              <span className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
                <span className="size-2 rounded-full bg-slate-500" /> Not Contacted
              </span>
              <span className="text-base font-bold text-foreground mt-0.5 block">12,566</span>
            </div>
          </div>

          <div className="min-h-[260px]">
            <Suspense fallback={<div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">Loading Pipeline Chart...</div>}>
              <Chart options={pipelineBarOptions} series={pipelineBarSeries} type="bar" height={260} />
            </Suspense>
          </div>
        </div>

        {/* New Leads Weekly Acquisition */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">New Inbound Leads</h4>
            <span className="text-xs text-muted-foreground">This Week</span>
          </div>
          <div className="min-h-[260px]">
            <Suspense fallback={<div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">Loading Leads Chart...</div>}>
              <Chart options={newLeadsOptions} series={newLeadsSeries} type="bar" height={260} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Row 3: Lost Leads Stages, Leads by Companies & Leads by Source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lost Leads Stages */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Lost Leads Reasons</h4>
            <Badge variant="soft">Sales Pipeline</Badge>
          </div>
          <div className="min-h-[220px]">
            <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Loading Lost Leads Chart...</div>}>
              <Chart options={lostLeadsOptions} series={lostLeadsSeries} type="bar" height={220} />
            </Suspense>
          </div>
        </div>

        {/* Leads By Companies */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Leads By Companies</h4>
            <Link to="/companies" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-2.5">
            {[
              { name: "Pitch Technologies", value: "$45,985", status: "Not Contacted", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
              { name: "Initech Cloud", value: "$21,145", status: "Closed Won", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
              { name: "Umbrella Corp", value: "$15,685", status: "Contacted", color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
              { name: "Capital Partners", value: "$12,105", status: "Contacted", color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
              { name: "Massive Dynamic", value: "$2,546", status: "Lost", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
            ].map((lead) => (
              <div key={lead.name} className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between text-xs">
                <div>
                  <h6 className="font-semibold text-foreground">{lead.name}</h6>
                  <span className="text-[11px] text-muted-foreground">Est. Value: {lead.value}</span>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", lead.color)}>
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leads By Source Donut */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Leads By Source</h4>
            <span className="text-xs text-muted-foreground">Inbound Split</span>
          </div>
          <div className="min-h-[220px] flex items-center justify-center">
            <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Loading Donut...</div>}>
              <Chart options={leadsSourceOptions} series={leadsSourceSeries} type="donut" height={220} />
            </Suspense>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Google Search
              </span>
              <span className="font-medium text-foreground">40%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" /> Paid Advertising
              </span>
              <span className="font-medium text-foreground">35%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" /> Email Campaigns
              </span>
              <span className="font-medium text-foreground">15%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-purple-500" /> Direct Referrals
              </span>
              <span className="font-medium text-foreground">10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Follow Up & Recent Leads Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              { name: "Doglas Martini", role: "Product Designer", action: "phone" },
              { name: "Daniel Esbella", role: "Project Manager", action: "mail" },
              { name: "Stephan Peralt", role: "Team Lead", action: "chat" },
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

        {/* Recent Leads Table */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground text-sm">Recent Inbound Leads</h4>
              <p className="text-xs text-muted-foreground">New prospective client accounts requiring qualification</p>
            </div>
            <Link to="/leads" className="text-xs text-primary hover:underline">
              Manage All Leads
            </Link>
          </div>

          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Lead Name</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Value</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  { name: "John Carter", company: "Acme Logistics Corp", source: "Google Search", value: "$45,000", status: "Closed Won", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                  { name: "Maria Garcia", company: "TechFlow Systems", source: "Paid Social", value: "$28,000", status: "In Negotiation", color: "bg-primary/10 text-primary border-primary/20" },
                  { name: "Robert Chen", company: "Nexus AI Labs", source: "Referral", value: "$62,000", status: "Contacted", color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
                  { name: "Sarah Connor", company: "CyberDyne Dynamics", source: "Direct Website", value: "$18,000", status: "Proposal Made", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                ].map((lead) => (
                  <tr key={lead.name} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-semibold text-foreground">{lead.name}</td>
                    <td className="p-3 text-muted-foreground">{lead.company}</td>
                    <td className="p-3 text-muted-foreground">{lead.source}</td>
                    <td className="p-3 font-bold text-foreground">{lead.value}</td>
                    <td className="p-3">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", lead.color)}>
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
