'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export default function AttendanceDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTrendRange, setActiveTrendRange] = useState<"1D" | "7D" | "1M" | "1Y">("1Y");
  const [applyLeaveOpen, setApplyLeaveOpen] = useState(false);

  // AI Assistant chat
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "👋 Welcome to your AI Attendance Copilot! I monitor shifts, detect punch anomalies, and audit overtime compliance." },
  ]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: attendanceData } = useQuery({
    queryKey: ["dashboard-attendance-realtime"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/hrm");
        return res?.data || res || {};
      } catch {
        return null;
      }
    },
  });

  // Chart 1: Attendance Trends (Stacked Columns)
  const attendanceTrendChart: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 260, stacked: true, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: "30%", borderRadius: 4 } },
      series: [
        { name: "Present", data: [85, 88, 82, 89, 92, 78, 86, 90, 87, 91, 88, 86] },
        { name: "Late", data: [8, 6, 11, 7, 5, 12, 8, 5, 9, 6, 8, 9] },
        { name: "Absent", data: [7, 6, 7, 4, 3, 10, 6, 5, 4, 3, 4, 5] },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
      colors: ["#0d6efd", "#f59e0b", "#f43f5e"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { position: "top", horizontalAlign: "right" },
      dataLabels: { enabled: false },
    }),
    []
  );

  // Chart 2: Office vs Remote (Area Chart)
  const officeVsRemoteChart: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 200, toolbar: { show: false } },
      series: [
        { name: "Office", data: [1950, 2100, 2050, 2200, 2150, 2300, 2458] },
        { name: "Remote", data: [350, 320, 380, 290, 310, 280, 187] },
      ],
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
      colors: ["#0d6efd", "#6366f1"],
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
      legend: { show: false },
    }),
    []
  );

  // Chart 3: Violations Donut
  const violationsChart: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 160 },
      series: [89, 9, 22],
      labels: ["Late Arrivals", "Missing Punches", "Below 75%"],
      colors: ["#0d6efd", "#6366f1", "#10b981"],
      stroke: { width: 0 },
      dataLabels: { enabled: false },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              total: { show: true, label: "Violations", fontSize: "10px", color: "#64748B", formatter: () => "120" },
            },
          },
        },
      },
    }),
    []
  );

  const handleSendAiMessage = (promptText?: string) => {
    const textToSend = promptText || aiMessage;
    if (!textToSend.trim()) return;

    setAiMessages((prev) => [...prev, { sender: "user", text: textToSend }]);
    setAiMessage("");

    setTimeout(() => {
      let reply = "Attendance analysis confirmed. Overall check-in rate is 86.3% with peak clock-in activity between 8:50 AM and 9:15 AM.";
      if (textToSend.includes("Late") || textToSend.includes("punctuality")) {
        reply = "Late arrivals report: 89 employees flagged today. Administration and Finance show the highest delay ratios (+25 mins avg).";
      } else if (textToSend.includes("Missing") || textToSend.includes("Punches")) {
        reply = "Missing punches alert: 9 critical punch misses detected for yesterday's evening shift. Automated reminder emails dispatched.";
      }
      setAiMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 600);
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Attendance Dashboard"
        description="Real-time daily workforce presence, punctuality telemetry, time-tracking, and regularization."
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 p-1.5 border border-border rounded-lg bg-card text-xs">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <span className="size-2 rounded-full bg-primary"></span> 06 Total Leaves Today
              </span>
              <div className="flex -space-x-1.5 ms-2">
                {["/ui-assets/avatar-02.jpg", "/ui-assets/avatar-03.jpg", "/ui-assets/avatar-04.jpg"].map((src, i) => (
                  <img key={i} src={src} className="size-6 rounded-full border border-card object-cover" alt="leave" />
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setApplyLeaveOpen(true)}
            >
              <i className="ph-bold ph-plus me-1.5"></i> Apply Leave
            </Button>
          </div>
        }
      />

      {/* ── 6 Overview Statistics Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Employees", value: "2,847", change: "+12%", up: true, color: "text-primary", bg: "bg-primary/10", icon: "ph-users" },
          { label: "Present Today", value: "2,458", change: "-3.2%", up: false, color: "text-emerald-600", bg: "bg-emerald-500/10", icon: "ph-user-check" },
          { label: "Absent Today", value: "124", change: "+1.4%", up: true, color: "text-amber-500", bg: "bg-amber-500/10", icon: "ph-user-minus" },
          { label: "Late Arrivals", value: "89", change: "+12%", up: true, color: "text-rose-500", bg: "bg-rose-500/10", icon: "ph-clock-countdown" },
          { label: "Attendance Rate", value: "86.3%", change: "+2.5%", up: true, color: "text-sky-500", bg: "bg-sky-500/10", icon: "ph-chart-pie-slice" },
          { label: "Pending Regularize", value: "42", change: "-7%", up: false, color: "text-purple-600", bg: "bg-purple-500/10", icon: "ph-clock" },
        ].map((item, idx) => (
          <Card key={idx} className="p-3.5 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground truncate">{item.label}</span>
              <div className={`size-7 rounded-md ${item.bg} ${item.color} flex items-center justify-center text-xs shrink-0`}>
                <i className={`ph ${item.icon}`}></i>
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground mb-1">{item.value}</h4>
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${item.up ? "text-emerald-600" : "text-rose-600"}`}>
                <i className={`ph-bold ${item.up ? "ph-arrow-up-right" : "ph-arrow-down-right"}`}></i>
                {item.change} vs yesterday
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Row 2: Attendance Trends (8 cols) & Attendance Status Dark Card (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Attendance Trends */}
        <Card className="p-5 lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-base font-bold text-foreground">Attendance Trends</h3>
                <p className="text-xs text-muted-foreground">Historical compliance across Present, Late, and Absent workers</p>
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                {(["1D", "7D", "1M", "1Y"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setActiveTrendRange(range)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      activeTrendRange === range ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={attendanceTrendChart} series={attendanceTrendChart.series} type="bar" height={260} />
              </Suspense>
            )}
          </div>
        </Card>

        {/* Attendance Status Dark Card */}
        <div className="lg:col-span-4 rounded-xl bg-slate-900 text-white p-5 border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Attendance Status</h3>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
                15-Apr-2025
              </span>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-400">Total Working Days</p>
              <h4 className="text-3xl font-bold text-white">300</h4>
            </div>

            {/* Stacked Progress Bar */}
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden flex mb-5 p-0.5 border border-slate-700/60">
              <div className="h-full bg-primary rounded-l-full" style={{ width: "40%" }} title="Present"></div>
              <div className="h-full bg-blue-400" style={{ width: "20%" }} title="WFH"></div>
              <div className="h-full bg-amber-500" style={{ width: "10%" }} title="Late"></div>
              <div className="h-full bg-sky-500" style={{ width: "10%" }} title="Leave"></div>
              <div className="h-full bg-rose-500 rounded-r-full" style={{ width: "20%" }} title="Absent"></div>
            </div>

            {/* Detailed Percent Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="size-2 rounded-full bg-primary"></span> Present
                </span>
                <span className="font-semibold text-white font-mono">2,458</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="size-2 rounded-full bg-blue-400"></span> WFH (Remote)
                </span>
                <span className="font-semibold text-white font-mono">187</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="size-2 rounded-full bg-amber-500"></span> Late Logins
                </span>
                <span className="font-semibold text-white font-mono">89</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="size-2 rounded-full bg-sky-500"></span> Approved Leaves
                </span>
                <span className="font-semibold text-white font-mono">78</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="size-2 rounded-full bg-rose-500"></span> Absent
                </span>
                <span className="font-semibold text-white font-mono">124</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Office vs Remote (6 cols) & Attendance Summary Metrics (6 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Office vs Remote */}
        <Card className="p-5 lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-base font-bold text-foreground">Office vs Remote</h3>
                <p className="text-xs text-muted-foreground">Workplace location distribution</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"></span> Office</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-500"></span> Remote</span>
              </div>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={officeVsRemoteChart} series={officeVsRemoteChart.series} type="area" height={200} />
              </Suspense>
            )}
          </div>
        </Card>

        {/* Attendance Summary */}
        <Card className="p-5 lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Attendance Summary</h3>
                <p className="text-xs text-muted-foreground">Daily clock-in velocity and avg duration</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">Realtime</span>
            </div>

            {/* Avg Hours Track */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-foreground">Average Working Hours</span>
                <span className="font-bold text-primary font-mono">9.5 hrs / day</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-1.5">
                <div className="h-full bg-primary rounded-full" style={{ width: "78%" }}></div>
              </div>
              <span className="text-[11px] text-rose-600 flex items-center gap-1 font-semibold">
                <i className="ph-bold ph-arrow-down-right"></i> 3.2% compared to yesterday
              </span>
            </div>

            {/* 3 Metric cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 border border-border/50 rounded-lg bg-card">
                <h4 className="text-lg font-bold text-foreground">2,458</h4>
                <p className="text-[11px] text-muted-foreground">Check-in Count</p>
              </div>
              <div className="p-3 border border-border/50 rounded-lg bg-card">
                <h4 className="text-lg font-bold text-foreground">2,201</h4>
                <p className="text-[11px] text-muted-foreground">Check-out Count</p>
              </div>
              <div className="p-3 border border-border/50 rounded-lg bg-card">
                <h4 className="text-lg font-bold text-primary font-mono">9:12 AM</h4>
                <p className="text-[11px] text-muted-foreground">Avg Clock-in</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 4: Frequent Late Arrivals, Missing Punches, Violations ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Frequent Late Arrivals */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-sm font-bold text-foreground">Frequent Late Arrivals</h3>
                <p className="text-xs text-muted-foreground">Repeated delay flags</p>
              </div>
              <Badge variant="soft" className="bg-purple-500/10 text-purple-600">Warnings</Badge>
            </div>
            <p className="text-xs text-muted-foreground">No of Employees</p>
            <h4 className="text-2xl font-bold text-foreground mb-3">22 Employees</h4>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex -space-x-1.5">
                {["/ui-assets/avatar-01.jpg", "/ui-assets/avatar-02.jpg", "/ui-assets/avatar-03.jpg", "/ui-assets/avatar-04.jpg"].map((src, i) => (
                  <img key={i} src={src} className="size-7 rounded-full border border-card object-cover" alt="avatar" />
                ))}
                <span className="size-7 rounded-full bg-muted border border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  +18
                </span>
              </div>
              <span className="text-xs font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                +15.5% <i className="ph-bold ph-arrow-down-right"></i>
              </span>
            </div>
          </div>
        </Card>

        {/* Missing Punches */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="border-l-2 border-rose-500 pl-2.5">
                <h3 className="text-sm font-bold text-foreground">Missing Punches</h3>
                <p className="text-xs text-muted-foreground">Incomplete biometric logs</p>
              </div>
              <Badge variant="soft" className="bg-rose-500/10 text-rose-600">Critical</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Total Incomplete Punches</p>
            <h4 className="text-2xl font-bold text-foreground mb-3">09 Exceptions</h4>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex -space-x-1.5">
                {["/ui-assets/avatar-05.jpg", "/ui-assets/avatar-06.jpg", "/ui-assets/avatar-07.jpg"].map((src, i) => (
                  <img key={i} src={src} className="size-7 rounded-full border border-card object-cover" alt="avatar" />
                ))}
                <span className="size-7 rounded-full bg-muted border border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  +6
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                +18.5% <i className="ph-bold ph-arrow-up-right"></i>
              </span>
            </div>
          </div>
        </Card>

        {/* Violations Statistics */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Violations Statistics</h3>
                <p className="text-xs text-muted-foreground">Attendance infractions</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary"></span> Late Arrivals
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-indigo-500"></span> Missing Punches
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500"></span> Below 75%
                </p>
              </div>
              <div>
                {isMounted && (
                  <Suspense fallback={<div className="h-28"></div>}>
                    <Chart options={violationsChart} series={violationsChart.series} type="donut" height={140} />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 5: Late Arrivals Feed (7 cols) & AI Copilot (5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Late Arrivals Feed */}
        <Card className="p-5 lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Late Arrivals & Anomaly Alerts</h3>
                <p className="text-xs text-muted-foreground">Real-time attendance anomalies logged today</p>
              </div>
              <span className="text-[11px] text-muted-foreground">Today</span>
            </div>

            <div className="space-y-2.5">
              {[
                { name: "Michael Johnson", role: "Administration Head", checkIn: "09:45 AM", avatar: "/ui-assets/avatar-02.jpg", delay: "+45 Min" },
                { name: "Emily Davis", role: "Frontend Developer", checkIn: "09:30 AM", avatar: "/ui-assets/avatar-03.jpg", delay: "+30 Min" },
                { name: "Robert Martinez", role: "Finance Manager", checkIn: "09:25 AM", avatar: "/ui-assets/avatar-04.jpg", delay: "+25 Min" },
                { name: "Megan Walker", role: "SEO Analyst", checkIn: "09:10 AM", avatar: "/ui-assets/avatar-05.jpg", delay: "+10 Min" },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-muted/40 rounded-lg border border-border/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.avatar} alt={item.name} className="size-8 rounded-full object-cover border border-border shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-medium text-foreground">Check-in: {item.checkIn}</span>
                    <Badge variant="soft" className="bg-rose-500/10 text-rose-600 text-[10px]">
                      {item.delay}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* AI Attendance Copilot */}
        <Card className="p-5 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base">
                  <i className="ph-duotone ph-sparkle"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">AI Attendance Copilot</h4>
                  <p className="text-[11px] text-muted-foreground">Anomaly detection & regularization</p>
                </div>
              </div>
              <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 text-[10px]">Online</Badge>
            </div>

            <div className="space-y-1.5 mb-3">
              <button
                type="button"
                onClick={() => handleSendAiMessage("Analyze late arrival patterns")}
                className="w-full text-left text-[11px] p-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground transition-colors"
              >
                ⏱️ Analyze late arrival patterns across departments
              </button>
              <button
                type="button"
                onClick={() => handleSendAiMessage("Resolve missing punches")}
                className="w-full text-left text-[11px] p-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground transition-colors"
              >
                ⚠️ Auto-verify 9 missing punches with badge logs
              </button>
            </div>

            <div className="h-36 overflow-y-auto space-y-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs mb-3">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-2 rounded-lg max-w-[90%] text-[11px] ${msg.sender === "user" ? "bg-primary text-white" : "bg-card border border-border text-foreground"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendAiMessage()}
              placeholder="Ask anything about shifts or regularizations..."
              className="w-full text-xs bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none"
            />
            <Button size="xs" variant="primary" onClick={() => handleSendAiMessage()}>
              <i className="ph-bold ph-paper-plane-tilt"></i>
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Apply Leave Dialog ── */}
      <Dialog open={applyLeaveOpen} onOpenChange={setApplyLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Leave Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Leave Type</label>
              <select className="w-full border border-border rounded-md p-2 bg-card text-foreground">
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Earned Leave</option>
                <option>Unpaid Leave</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">From Date</label>
                <input type="date" className="w-full border border-border rounded-md p-2 bg-card text-foreground" />
              </div>
              <div>
                <label className="font-semibold block mb-1">To Date</label>
                <input type="date" className="w-full border border-border rounded-md p-2 bg-card text-foreground" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Reason for Absence</label>
              <textarea rows={3} placeholder="Please describe reason..." className="w-full border border-border rounded-md p-2 bg-card text-foreground"></textarea>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setApplyLeaveOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.success("Leave application submitted for supervisor approval!");
                  setApplyLeaveOpen(false);
                }}
              >
                Submit Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
