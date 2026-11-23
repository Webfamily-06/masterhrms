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

export default function RecruitmentDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);

  // AI Assistant chat
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "👋 Welcome to your AI Recruitment Assistant! I can screen candidates, draft job descriptions, and benchmark hiring velocity." },
  ]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: recData } = useQuery({
    queryKey: ["dashboard-recruitment-realtime"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/recruitment");
        return res?.data || res || {};
      } catch {
        return null;
      }
    },
  });

  // Chart 1: Recruitment Funnel Donut Chart
  const recruitmentOverviewChart: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 210 },
      series: [45, 25, 18, 12],
      labels: ["Applications", "Shortlisted", "Interviewed", "Hired"],
      colors: ["#0d6efd", "#6366f1", "#f59e0b", "#10b981"],
      stroke: { width: 0 },
      dataLabels: { enabled: false },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "75%",
            labels: {
              show: true,
              total: { show: true, label: "Total Apps", fontSize: "11px", color: "#64748B", formatter: () => "2,384" },
            },
          },
        },
      },
    }),
    []
  );

  // Chart 2: Average Time To Hire Radial / Bar
  const avgHireTimeChart: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 160, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, barHeight: "45%", borderRadius: 4 } },
      series: [{ name: "Days", data: [5, 7, 10, 3] }],
      xaxis: {
        categories: ["Applied to Shortlisted", "Shortlisted", "Interview to Offer", "Acceptance"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { labels: { style: { colors: "#64748B", fontSize: "11px" } } },
      colors: ["#6366f1"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
    }),
    []
  );

  const handleSendAiMessage = (promptText?: string) => {
    const textToSend = promptText || aiMessage;
    if (!textToSend.trim()) return;

    setAiMessages((prev) => [...prev, { sender: "user", text: textToSend }]);
    setAiMessage("");

    setTimeout(() => {
      let reply = "Recruitment analysis complete. Candidate pipeline shows high applicant response in Engineering and Design roles.";
      if (textToSend.includes("Senior Developer")) {
        reply = "Top Senior Developer candidates: 1) Alex Rivera (94% match, 7 yrs React/Node), 2) Maya Lin (91% match, System Architecture specialist).";
      } else if (textToSend.includes("hiring report")) {
        reply = "Hiring report generated: Overall velocity is 25 days (12% faster than industry benchmark). Offer acceptance rate is strong at 74.4%.";
      }
      setAiMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 600);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Recruitment Dashboard"
        description="Monitor job requisitions, candidate pipeline conversions, interviews, and hiring velocity."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Downloading Recruitment Funnel Report...")}
            >
              <i className="ph ph-file-arrow-down me-1.5"></i> Download Report
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setNewJobOpen(true)}
            >
              <i className="ph-bold ph-plus me-1.5"></i> Add New Job
            </Button>
          </div>
        }
      />

      {/* ── Top Row: Candidates Hiring Analysis (8 cols) & Recruitment Overview (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Candidates Hiring Analysis Table */}
        <Card className="p-5 lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-base font-bold text-foreground">Candidates Hiring Analysis</h3>
                <p className="text-xs text-muted-foreground">Department-level funnel velocity across all stages</p>
              </div>
              <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md border border-border">
                Last 30 Days
              </span>
            </div>

            <div className="overflow-x-auto border border-border/80 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3 font-semibold">Department & Role</th>
                    <th className="p-3 font-semibold text-center">Applicants</th>
                    <th className="p-3 font-semibold text-center">Shortlisted</th>
                    <th className="p-3 font-semibold text-center">Interviewed</th>
                    <th className="p-3 font-semibold text-center">Offered</th>
                    <th className="p-3 font-semibold text-center">Hired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { dept: "Marketing", role: "Product Manager", app: 14, short: 8, int: 14, off: 14, hired: 14 },
                    { dept: "Data Analyst", role: "Jr Data Analyst", app: 16, short: 12, int: 14, off: 14, hired: 14 },
                    { dept: "Project Coordinator", role: "Jr Level", app: 24, short: 6, int: 14, off: 14, hired: 14 },
                    { dept: "Design Lead", role: "UI Designer", app: 12, short: 8, int: 6, off: 5, hired: 14 },
                    { dept: "Project Manager", role: "Senior Manager", app: 22, short: 20, int: 16, off: 12, hired: 4 },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-foreground">{row.dept}</p>
                        <p className="text-[11px] text-muted-foreground">{row.role}</p>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-md font-semibold bg-primary text-white text-[11px] font-mono">
                          {row.app}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-md font-semibold bg-indigo-500 text-white text-[11px] font-mono">
                          {row.short}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-md font-semibold bg-slate-800 text-white text-[11px] font-mono">
                          {row.int}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-md font-semibold bg-sky-500 text-white text-[11px] font-mono">
                          {row.off}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-md font-semibold bg-emerald-600 text-white text-[11px] font-mono">
                          {row.hired}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4 Summary Stat Metrics below table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/60 mt-4 text-center">
            <div className="p-2.5 border border-border/50 rounded-lg bg-muted/20">
              <div className="size-8 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                <i className="ph ph-briefcase"></i>
              </div>
              <h4 className="text-xl font-bold text-foreground">47</h4>
              <p className="text-[11px] text-muted-foreground">Open Positions</p>
            </div>
            <div className="p-2.5 border border-border/50 rounded-lg bg-muted/20">
              <div className="size-8 mx-auto rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-1">
                <i className="ph ph-users-three"></i>
              </div>
              <h4 className="text-xl font-bold text-foreground">2,384</h4>
              <p className="text-[11px] text-muted-foreground">Total Candidates</p>
            </div>
            <div className="p-2.5 border border-border/50 rounded-lg bg-muted/20">
              <div className="size-8 mx-auto rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-1">
                <i className="ph ph-calendar-check"></i>
              </div>
              <h4 className="text-xl font-bold text-foreground">12</h4>
              <p className="text-[11px] text-muted-foreground">Interviews Today</p>
            </div>
            <div className="p-2.5 border border-border/50 rounded-lg bg-muted/20">
              <div className="size-8 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1">
                <i className="ph ph-file-text"></i>
              </div>
              <h4 className="text-xl font-bold text-foreground">28</h4>
              <p className="text-[11px] text-muted-foreground">Offers Released</p>
            </div>
          </div>
        </Card>

        {/* Recruitment Overview Donut & Reminder (4 cols) */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-sm font-bold text-foreground">Recruitment Overview</h3>
                <p className="text-xs text-muted-foreground">Funnel efficiency benchmarks</p>
              </div>
              <span className="text-[11px] text-muted-foreground">Monthly</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center py-2 border-y border-border/50 my-2">
              <div>
                <p className="text-[11px] text-muted-foreground">Offer Acceptance</p>
                <h4 className="text-lg font-bold text-foreground">74.4%</h4>
              </div>
              <div className="border-l border-border/50">
                <p className="text-[11px] text-muted-foreground">Overall Hire Rate</p>
                <h4 className="text-lg font-bold text-emerald-600">2.7%</h4>
              </div>
            </div>

            <div className="py-1">
              {isMounted && (
                <Suspense fallback={<div className="h-44 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                  <Chart options={recruitmentOverviewChart} series={recruitmentOverviewChart.series} type="donut" height={210} />
                </Suspense>
              )}
            </div>
          </Card>

          {/* Quick Reminder Card */}
          <div className="rounded-xl p-4 bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 bg-indigo-800/50 px-2 py-0.5 rounded">
                Daily Priority
              </span>
              <h4 className="text-base font-bold text-white mt-2 mb-1">You have 21 Interviews Scheduled Today!</h4>
              <p className="text-xs text-slate-300">Keep hiring managers synchronized and ensure evaluations are submitted promptly.</p>
            </div>
            <div className="pt-3 mt-2 border-t border-indigo-800/60 flex items-center justify-between">
              <span className="text-xs text-indigo-200">21 Candidates in Queue</span>
              <Button size="xs" variant="primary" onClick={() => toast.info("Opening interview coordination schedule...")}>
                Schedule Now <i className="ph ph-arrow-right ms-1"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: AI Assistant, Average Time to Hire, Upcoming Schedules ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* AI Recruitment Assistant (4 cols) */}
        <Card className="p-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base">
                  <i className="ph-duotone ph-sparkle"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">AI Recruitment Assistant</h4>
                  <p className="text-[11px] text-muted-foreground">Screening & requisition copilot</p>
                </div>
              </div>
              <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 text-[10px]">Online</Badge>
            </div>

            <div className="space-y-1.5 mb-3">
              <button
                type="button"
                onClick={() => handleSendAiMessage("Analyze top candidates for Senior Developer role")}
                className="w-full text-left text-[11px] p-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground transition-colors"
              >
                🔍 Analyze top candidates for Senior Developer role
              </button>
              <button
                type="button"
                onClick={() => handleSendAiMessage("Generate hiring report")}
                className="w-full text-left text-[11px] p-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground transition-colors"
              >
                📊 Generate comprehensive hiring velocity report
              </button>
            </div>

            <div className="h-40 overflow-y-auto space-y-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs mb-3">
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
              placeholder="Ask anything about candidate requisitions..."
              className="w-full text-xs bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none"
            />
            <Button size="xs" variant="primary" onClick={() => handleSendAiMessage()}>
              <i className="ph-bold ph-paper-plane-tilt"></i>
            </Button>
          </div>
        </Card>

        {/* Average Time to Hire (4 cols) */}
        <Card className="p-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Average Time to Hire</h3>
                <p className="text-xs text-muted-foreground">Days per hiring lifecycle milestone</p>
              </div>
              <span className="text-[11px] text-muted-foreground">30 Days</span>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-36 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={avgHireTimeChart} series={avgHireTimeChart.series} type="bar" height={160} />
              </Suspense>
            )}

            <div className="space-y-2 mt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Applied to Shortlisted</span>
                <span className="font-semibold bg-muted px-2 py-0.5 rounded">05 Days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shortlisted</span>
                <span className="font-semibold bg-muted px-2 py-0.5 rounded">07 Days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Interview to Offer</span>
                <span className="font-semibold bg-muted px-2 py-0.5 rounded">10 Days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Offer Acceptance</span>
                <span className="font-semibold bg-muted px-2 py-0.5 rounded">03 Days</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
            <i className="ph-bold ph-trend-up text-base"></i>
            <span><strong>12% faster</strong> than current SaaS HR industry avg</span>
          </div>
        </Card>

        {/* Upcoming Schedules (4 cols) */}
        <Card className="p-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Upcoming Schedules</h3>
                <p className="text-xs text-muted-foreground">Confirmed candidate interviews</p>
              </div>
              <Link to="/hr/recruitment/interviews" className="text-xs text-primary font-medium hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {[
                { date: "Mar 02", role: "Product Designer", time: "09:00 AM - 10:30 AM", avatar: "/ui-assets/avatar-01.jpg" },
                { date: "Apr 22", role: "Marketing Manager", time: "01:00 PM - 02:00 PM", avatar: "/ui-assets/avatar-02.jpg" },
                { date: "May 11", role: "Sr. Data Science", time: "11:00 AM - 12:30 PM", avatar: "/ui-assets/avatar-03.jpg" },
                { date: "Jun 07", role: "Software Engineer", time: "02:00 PM - 03:30 PM", avatar: "/ui-assets/avatar-04.jpg" },
                { date: "Aug 18", role: "Financial Analyst", time: "03:00 PM - 04:00 PM", avatar: "/ui-assets/avatar-05.jpg" },
              ].map((item, idx) => (
                <div key={idx} className="p-2 bg-muted/40 rounded-lg border border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-md bg-card border border-border flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none">{item.date.split(" ")[0]}</span>
                      <span className="text-xs font-bold text-foreground leading-none mt-0.5">{item.date.split(" ")[1]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.role}</p>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                        <i className="ph ph-clock"></i> {item.time}
                      </p>
                    </div>
                  </div>
                  <img src={item.avatar} alt="candidate" className="size-7 rounded-full object-cover border border-border shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" size="xs" className="w-full mt-3" onClick={() => toast.info("Opening calendar sync...")}>
            View Complete Schedule
          </Button>
        </Card>
      </div>

      {/* ── Row 3: Stage Performance Funnel (5 Cards with colored progress bars) ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="border-l-2 border-primary pl-2.5">
            <h3 className="text-base font-bold text-foreground">Stage Performance Pipeline</h3>
            <p className="text-xs text-muted-foreground">Active applicant volume and conversion efficiency at each funnel stage</p>
          </div>
          <span className="text-xs text-muted-foreground">Rolling 30 Days</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { stage: "Applied", icon: "ph-identification-badge", count: "1,848", pct: "36.3%", color: "bg-blue-600", text: "text-blue-600", bgLight: "bg-blue-500/10" },
            { stage: "Shortlisted", icon: "ph-hourglass-simple", count: "2,384", pct: "37.4%", color: "bg-indigo-600", text: "text-indigo-600", bgLight: "bg-indigo-500/10" },
            { stage: "Interviewed", icon: "ph-calendar-check", count: "892", pct: "36.3%", color: "bg-slate-700", text: "text-slate-700", bgLight: "bg-slate-500/10" },
            { stage: "Offered", icon: "ph-file-text", count: "324", pct: "26.5%", color: "bg-sky-500", text: "text-sky-500", bgLight: "bg-sky-500/10" },
            { stage: "Hired", icon: "ph-user-check", count: "64", pct: "41.2%", color: "bg-emerald-600", text: "text-emerald-600", bgLight: "bg-emerald-500/10" },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-muted/40 rounded-xl border border-border/60 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-foreground">{item.stage}</span>
                <div className={`size-8 rounded-lg ${item.bgLight} ${item.text} flex items-center justify-center text-base`}>
                  <i className={`ph ${item.icon}`}></i>
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-foreground mb-1">{item.count}</h4>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Conversion rate</span>
                  <span className="font-semibold text-foreground">{item.pct}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: item.pct }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Add New Job Requisition Modal ── */}
      <Dialog open={newJobOpen} onOpenChange={setNewJobOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post New Job Requisition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Job Title</label>
              <input
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full border border-border rounded-md p-2 bg-card text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Department</label>
                <select className="w-full border border-border rounded-md p-2 bg-card text-foreground">
                  <option>Engineering</option>
                  <option>Design</option>
                  <option>Marketing</option>
                  <option>Sales</option>
                  <option>Finance</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Headcount Target</label>
                <input
                  type="number"
                  defaultValue={1}
                  className="w-full border border-border rounded-md p-2 bg-card text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Location / Work Mode</label>
              <select className="w-full border border-border rounded-md p-2 bg-card text-foreground">
                <option>Hybrid (Headquarters)</option>
                <option>On-Site (Office)</option>
                <option>Fully Remote</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setNewJobOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.success("Job requisition posted successfully!");
                  setNewJobOpen(false);
                }}
              >
                Create Requisition
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
