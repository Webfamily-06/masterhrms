'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { SmartHRHeader } from "@/components/ui/smarthr-header";

const Chart = lazy(() => import("react-apexcharts"));

export default function SupportDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: supData } = useQuery({
    queryKey: ["dashboard-support"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/support");
        return res?.data || res || {};
      } catch (err) {
        return {};
      }
    },
    refetchInterval: 30000,
  });

  // 1. Ticket Trends Area Chart
  const ticketTrendsOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 260, toolbar: { show: false } },
      series: [
        { name: "Tickets Created", data: [45, 60, 75, 50, 65, 80, 95, 70, 85, 90, 110, 125] },
        { name: "Tickets Resolved", data: [40, 55, 70, 48, 60, 75, 90, 68, 80, 85, 105, 120] },
      ],
      colors: ["#0d6efd", "#10b981"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.15 },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
      dataLabels: { enabled: false },
    }),
    []
  );

  // 2. Tickets By Status Donut Chart
  const ticketsByStatusOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 260 },
      labels: ["Resolved", "Pending", "Open", "Overdue"],
      series: [540, 210, 160, 58],
      colors: ["#10b981", "#f59e0b", "#0d6efd", "#f43f5e"],
      legend: { position: "bottom", fontSize: "11px" },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: "72%" } } },
    }),
    []
  );

  // 3. SLA Compliance Radial Chart
  const slaComplianceOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "radialBar", height: 220 },
      series: [94.6],
      colors: ["#10b981"],
      plotOptions: {
        radialBar: {
          hollow: { size: "70%" },
          dataLabels: {
            name: { show: false },
            value: { fontSize: "24px", fontWeight: "bold", color: "#1e293b", offsetY: 8, formatter: (v) => `${v}%` },
          },
        },
      },
    }),
    []
  );

  // 4. Backlog Growth Line Chart
  const backlogGrowthOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 220, toolbar: { show: false } },
      series: [{ name: "Backlog Items", data: [45, 52, 48, 62, 58, 42, 38, 49, 44, 40] }],
      colors: ["#f59e0b"],
      stroke: { curve: "smooth", width: 2.5 },
      xaxis: {
        categories: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "10px" } } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
    }),
    []
  );

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* ── Breadcrumb & Actions Header ── */}
      <SmartHRHeader title="Help Desk Dashboard" dateValue="2026" />

      {/* ── ROW 1: 6 Top Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Tickets", val: "2,847", change: "+12%", color: "text-primary", bg: "bg-primary/10", icon: "ti-ticket" },
          { label: "Open Tickets", val: "342", change: "+5%", color: "text-amber-500", bg: "bg-amber-500/10", icon: "ti-folder-open" },
          { label: "Resolved Tickets", val: "128", change: "-3%", color: "text-emerald-600", bg: "bg-emerald-500/10", icon: "ti-circle-check" },
          { label: "Avg Response", val: "2.4h", change: "-15m", color: "text-indigo-600", bg: "bg-indigo-500/10", icon: "ti-clock" },
          { label: "Pending Tickets", val: "23", change: "+2%", color: "text-pink-600", bg: "bg-pink-500/10", icon: "ti-hourglass-low" },
          { label: "Overdue Tickets", val: "42", change: "-8%", color: "text-rose-600", bg: "bg-rose-500/10", icon: "ti-alert-triangle" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className={`size-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center text-base`}>
                <i className={`ti ${item.icon}`}></i>
              </span>
              <span className="text-[10px] font-semibold text-emerald-600">{item.change}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">{item.val}</h3>
            <p className="text-[11px] text-slate-500 truncate">{item.label}</p>
          </div>
        ))}
      </div>

      {/* ── ROW 2: Ticket Trends (8 cols) + Tickets By Status (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ticket Trends */}
        <div className="lg:col-span-8 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ticket Trends
              </h2>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={ticketTrendsOptions} series={ticketTrendsOptions.series} type="area" height={260} />
              </Suspense>
            )}
          </div>
        </div>

        {/* Tickets By Status */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Tickets By Status
              </h2>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={ticketsByStatusOptions} series={ticketsByStatusOptions.series} type="donut" height={260} />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 3: SLA Compliance (6 cols) + Backlog Growth (6 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* SLA Compliance */}
        <div className="lg:col-span-6 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                SLA Compliance
              </h2>
            </div>
            <div className="flex items-center justify-around py-2">
              <div className="text-center">
                {isMounted && (
                  <Suspense fallback={<div className="h-44"></div>}>
                    <Chart options={slaComplianceOptions} series={slaComplianceOptions.series} type="radialBar" height={200} />
                  </Suspense>
                )}
                <p className="text-xs font-semibold text-emerald-600 mt-1">First Response SLA: 98.2%</p>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                  <p className="text-slate-400 text-[11px] mb-0.5">Met SLA</p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">2,692 tickets</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                  <p className="text-slate-400 text-[11px] mb-0.5">Breached SLA</p>
                  <p className="font-bold text-rose-500 text-sm">155 tickets</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Backlog Growth */}
        <div className="lg:col-span-6 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Backlog Growth
              </h2>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-52 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={backlogGrowthOptions} series={backlogGrowthOptions.series} type="line" height={200} />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 4: Tickets by Category ── */}
      <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs">
        <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Tickets by Category
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { cat: "Technical Support", count: 485, pct: "35%", color: "bg-blue-600" },
            { cat: "Billing & Invoicing", count: 342, pct: "25%", color: "bg-indigo-600" },
            { cat: "Account Access", count: 268, pct: "19%", color: "bg-purple-600" },
            { cat: "General Inquiries", count: 195, pct: "14%", color: "bg-pink-600" },
            { cat: "Feature Request", count: 412, pct: "30%", color: "bg-amber-500" },
            { cat: "Feedback & Other", count: 145, pct: "10%", color: "bg-emerald-600" },
          ].map((c, idx) => (
            <div key={idx} className="p-3 rounded-xl border border-border-color bg-slate-50/70 dark:bg-slate-800/40">
              <p className="text-[11px] text-slate-500 mb-1 truncate">{c.cat}</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{c.count}</h4>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full ${c.color} rounded-full`} style={{ width: c.pct }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ROW 5: Agent Performance (7 cols) + Activity Feed (5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Agent Performance */}
        <div className="lg:col-span-7 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs">
          <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Agent Performance
            </h2>
            <Link to="/helpdesk" className="text-xs text-primary hover:underline font-semibold">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-color text-slate-400 text-left">
                  <th className="pb-2 font-semibold">Agent</th>
                  <th className="pb-2 font-semibold text-center">Resolved</th>
                  <th className="pb-2 font-semibold text-center">Avg Time</th>
                  <th className="pb-2 font-semibold text-right">CSAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {[
                  { name: "Michael Johnson", role: "Sr. Support Agent", resolved: 142, avgTime: "1.8h", csat: "98%", avatar: "/assets/img/users/user-26.jpg" },
                  { name: "Emily Davis", role: "Help Desk Lead", resolved: 128, avgTime: "2.1h", csat: "96%", avatar: "/assets/img/users/user-31.jpg" },
                  { name: "Robert Martinez", role: "Technical Specialist", resolved: 115, avgTime: "2.4h", csat: "94%", avatar: "/assets/img/users/user-27.jpg" },
                  { name: "Megan Walker", role: "Customer Advocate", resolved: 98, avgTime: "3.0h", csat: "92%", avatar: "/assets/img/users/user-56.jpg" },
                ].map((agent, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <img src={agent.avatar} alt={agent.name} className="size-7 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{agent.name}</p>
                          <p className="text-[10px] text-slate-400">{agent.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">{agent.resolved}</td>
                    <td className="py-2.5 text-center text-slate-500">{agent.avgTime}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">{agent.csat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-5 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Activity Feed
              </h2>
            </div>

            <div className="space-y-3">
              {[
                { title: "Michael Chen replied to TKT-1247", time: "10 mins ago", icon: "ti-message-dots text-primary bg-primary/10" },
                { title: "New ticket assigned to Sarah Johnson", time: "25 mins ago", icon: "ti-user-plus text-indigo-600 bg-indigo-500/10" },
                { title: "TKT-1240 marked as resolved", time: "1 hour ago", icon: "ti-check text-emerald-600 bg-emerald-500/10" },
                { title: "SLA deadline approaching for TKT-1235", time: "2 hours ago", icon: "ti-alarm text-amber-500 bg-amber-500/10" },
              ].map((act, idx) => (
                <div key={idx} className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-border-color flex items-center gap-3">
                  <span className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${act.icon}`}>
                    <i className="text-sm"></i>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{act.title}</p>
                    <p className="text-[10px] text-slate-400">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
