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

export default function FinanceDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // AI Assistant Chat state
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "👋 Hi! I'm your AI HR Finance Assistant. I can help analyze payroll costs, forecast operating budgets, and audit compensation variances." },
  ]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: financeData } = useQuery({
    queryKey: ["finance-dashboard-realtime"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/finance");
        return res?.data || res || {};
      } catch {
        return null;
      }
    },
  });

  // Chart 1: Payroll Sparkline
  const payrollSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 50, sparkline: { enabled: true } },
      series: [{ data: [1.2, 1.5, 1.8, 2.1, 2.3, 2.45] }],
      colors: ["#10b981"],
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    }),
    []
  );

  // Chart 2: Reimbursement Sparkline
  const reimbursementSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 50, sparkline: { enabled: true } },
      series: [{ data: [85, 92, 110, 105, 118, 124.2] }],
      colors: ["#f43f5e"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.2 },
    }),
    []
  );

  // Chart 3: Headcount vs Payroll Growth (Dual Column / Line)
  const headcountChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 240, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: "40%", borderRadius: 4 } },
      series: [
        { name: "Payroll Growth", data: [45, 52, 68, 85] },
        { name: "Head Count", data: [35, 42, 50, 62] },
      ],
      xaxis: {
        categories: ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" }, formatter: (v) => `${v}%` } },
      colors: ["#0d6efd", "#94a3b8"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { position: "top", horizontalAlign: "right" },
      dataLabels: { enabled: false },
    }),
    []
  );

  // Chart 4: HR Cost Breakdown Donut
  const costBreakdownOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 180 },
      series: [184, 89, 66, 96, 42, 56],
      labels: ["Salaries", "Benefits", "Bonuses", "Overtime", "Training", "Incentives"],
      colors: ["#0d6efd", "#4f46e5", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"],
      stroke: { width: 0 },
      dataLabels: { enabled: false },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              total: { show: true, label: "Total Cost", fontSize: "10px", color: "#64748B", formatter: () => "$533K" },
            },
          },
        },
      },
    }),
    []
  );

  // Chart 5: Department Budget vs Actual
  const budgetVsActualOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 230, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: "45%", borderRadius: 4 } },
      series: [
        { name: "Budget Allocated", data: [650, 420, 310, 280, 240, 190] },
        { name: "Actual Spent", data: [590, 395, 305, 295, 210, 175] },
      ],
      xaxis: {
        categories: ["Engineering", "Sales", "HR Ops", "Finance", "Marketing", "Support"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" }, formatter: (v) => `$${v}K` } },
      colors: ["#0d6efd", "#10b981"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { position: "top", horizontalAlign: "right" },
      dataLabels: { enabled: false },
    }),
    []
  );

  // Chart 6: Financial Health Area
  const financialHealthOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 160, toolbar: { show: false } },
      series: [{ name: "Capital Balance", data: [380, 410, 395, 430, 445, 456.5] }],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { show: false },
      colors: ["#0d6efd"],
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
      grid: { show: false },
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
      let reply = "Financial budget telemetry analyzed. Overall variance is within 3.8% of planned cap, with HR Operations running well below allowance.";
      if (textToSend.includes("forecast") || textToSend.includes("budget")) {
        reply = "Q1-Q2 Budget Forecast: Projected workforce spend is $4.9M, factoring in 18 approved new hires and standard annual compensation increments.";
      } else if (textToSend.includes("variance") || textToSend.includes("actual")) {
        reply = "Variance alert: Marketing spent $295K against a $280K budget (+5.3% variance) driven by Q4 campaign media buys.";
      }
      setAiMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 600);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Finance Dashboard"
        description="Comprehensive real-time overview of workforce compensation budgets, department allocations, and disbursements."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-muted text-muted-foreground border border-border px-3 py-1.5 rounded-md flex items-center gap-1.5">
              <i className="ph ph-calendar"></i> FY 2025 - 2026
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Exporting financial ledger as CSV...")}
            >
              <i className="ph ph-file-arrow-down me-1.5"></i> Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Row 1: Budget Remaining (6 cols), Total Payroll (3 cols), Reimbursement (3 cols) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Budget Remaining Card */}
        <Card className="p-5 lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg">
                <i className="ph-duotone ph-vault"></i>
              </div>
              <span className="text-xs text-muted-foreground">Updated: 15 Jan 2026</span>
            </div>
            <div className="mb-4">
              <p className="text-xs text-muted-foreground">Budget Remaining</p>
              <div className="flex items-center gap-2">
                <h3 className="text-3xl font-bold text-foreground">$2,458,900</h3>
                <span className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs">
                  <i className="ph-bold ph-caret-up"></i>
                </span>
              </div>
            </div>

            {/* 3 Progress Bars */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Salary Budget</p>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
                  <div className="h-full bg-primary rounded-full" style={{ width: "100%" }}></div>
                </div>
                <p className="text-xs font-bold text-foreground font-mono">$1,229,450</p>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Benefits</p>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: "100%" }}></div>
                </div>
                <p className="text-xs font-bold text-foreground font-mono">$491,780</p>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground mb-1">HR Operations</p>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
                  <div className="h-full bg-slate-700 rounded-full" style={{ width: "100%" }}></div>
                </div>
                <p className="text-xs font-bold text-foreground font-mono">$737,670</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Total Payroll Card */}
        <Card className="p-5 lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg">
                <i className="ph-duotone ph-money"></i>
              </div>
              <span className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs">
                <i className="ph-bold ph-caret-up"></i>
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Payroll</p>
              <h3 className="text-2xl font-bold text-foreground mb-2">$2,458,900</h3>
            </div>
          </div>
          <div className="pt-2">
            {isMounted && (
              <Suspense fallback={<div className="h-12"></div>}>
                <Chart options={payrollSparkline} series={payrollSparkline.series} type="bar" height={50} />
              </Suspense>
            )}
          </div>
        </Card>

        {/* Reimbursement Card */}
        <Card className="p-5 lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-lg">
                <i className="ph-duotone ph-receipt"></i>
              </div>
              <span className="size-6 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-xs">
                <i className="ph-bold ph-caret-down"></i>
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reimbursements</p>
              <h3 className="text-2xl font-bold text-foreground mb-2">$124,200</h3>
            </div>
          </div>
          <div className="pt-2">
            {isMounted && (
              <Suspense fallback={<div className="h-12"></div>}>
                <Chart options={reimbursementSparkline} series={reimbursementSparkline.series} type="area" height={50} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 2: Headcount vs Payroll Growth (8 cols) & HR Cost Breakdown (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Headcount vs Payroll Growth */}
        <Card className="p-5 lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-base font-bold text-foreground">Headcount vs Payroll Growth</h3>
                <p className="text-xs text-muted-foreground">Quarterly compensation trajectory comparison</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                  +14% YoY
                </span>
              </div>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={headcountChartOptions} series={headcountChartOptions.series} type="bar" height={240} />
              </Suspense>
            )}
          </div>
        </Card>

        {/* HR Cost Breakdown */}
        <Card className="p-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-2">
              <h3 className="text-base font-bold text-foreground">HR Cost Breakdown</h3>
              <p className="text-xs text-muted-foreground">Operational expenditure categories</p>
            </div>

            <div className="py-1">
              {isMounted && (
                <Suspense fallback={<div className="h-44 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                  <Chart options={costBreakdownOptions} series={costBreakdownOptions.series} type="donut" height={180} />
                </Suspense>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-xs">
              <div className="border-l-2 border-blue-600 pl-2">
                <p className="text-[11px] text-muted-foreground">Salaries</p>
                <h5 className="font-bold text-foreground font-mono">184K</h5>
              </div>
              <div className="border-l-2 border-indigo-600 pl-2">
                <p className="text-[11px] text-muted-foreground">Benefits</p>
                <h5 className="font-bold text-foreground font-mono">89K</h5>
              </div>
              <div className="border-l-2 border-cyan-500 pl-2">
                <p className="text-[11px] text-muted-foreground">Bonuses</p>
                <h5 className="font-bold text-foreground font-mono">66K</h5>
              </div>
              <div className="border-l-2 border-amber-500 pl-2">
                <p className="text-[11px] text-muted-foreground">Overtime</p>
                <h5 className="font-bold text-foreground font-mono">96K</h5>
              </div>
              <div className="border-l-2 border-pink-500 pl-2">
                <p className="text-[11px] text-muted-foreground">Training</p>
                <h5 className="font-bold text-foreground font-mono">42K</h5>
              </div>
              <div className="border-l-2 border-emerald-600 pl-2">
                <p className="text-[11px] text-muted-foreground">Incentives</p>
                <h5 className="font-bold text-foreground font-mono">56K</h5>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 3: AI HR Finance Assistant (4 cols) & Dept Budget vs Actual (8 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* AI Assistant */}
        <Card className="p-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base">
                  <i className="ph-duotone ph-robot"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">AI HR Finance Assistant</h4>
                  <p className="text-[11px] text-muted-foreground">Predictive compensation analytics</p>
                </div>
              </div>
              <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 text-[10px]">Online</Badge>
            </div>

            <div className="space-y-1.5 mb-3">
              <button
                type="button"
                onClick={() => handleSendAiMessage("Forecast next quarter payroll budget")}
                className="w-full text-left text-[11px] p-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground transition-colors"
              >
                📈 Forecast next quarter payroll budget
              </button>
              <button
                type="button"
                onClick={() => handleSendAiMessage("Analyze department budget variances")}
                className="w-full text-left text-[11px] p-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground transition-colors"
              >
                📊 Analyze department budget variances
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
              placeholder="Ask about payroll trends, budgets, or audits..."
              className="w-full text-xs bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none"
            />
            <Button size="xs" variant="primary" onClick={() => handleSendAiMessage()}>
              <i className="ph-bold ph-paper-plane-tilt"></i>
            </Button>
          </div>
        </Card>

        {/* Department Budget vs Actual */}
        <Card className="p-5 lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Department Budget vs Actual</h3>
                <p className="text-xs text-muted-foreground">Expenditure comparison across main cost centers</p>
              </div>
              <span className="text-xs text-muted-foreground">YTD 2026</span>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={budgetVsActualOptions} series={budgetVsActualOptions.series} type="bar" height={230} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 4: Financial Health (6 cols), Payroll Forecast Promo (3 cols), Pending Payments (3 cols) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Financial Health */}
        <Card className="p-5 lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Financial Health</h3>
                <p className="text-xs text-muted-foreground">Rolling available operating liquidity</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">
                +2.5% vs Last Year
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-8">
                {isMounted && (
                  <Suspense fallback={<div className="h-36"></div>}>
                    <Chart options={financialHealthOptions} series={financialHealthOptions.series} type="area" height={160} />
                  </Suspense>
                )}
              </div>
              <div className="sm:col-span-4 text-center sm:text-right">
                <p className="text-xs text-muted-foreground">Total Capital Reserves</p>
                <h3 className="text-2xl font-bold text-foreground font-mono">$4,565,450</h3>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">Solvent & Verified</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payroll Forecast Promo Card */}
        <div className="lg:col-span-3 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 bg-indigo-800/50 px-2 py-0.5 rounded">
              AI Powered Feature
            </span>
            <h4 className="text-base font-bold text-white mt-2 mb-1">Payroll Forecasting</h4>
            <p className="text-xs text-slate-300">Predict upcoming salary expenses, model new headcount impact, and optimize operating cash flow.</p>
          </div>
          <Button variant="primary" size="sm" className="w-full mt-4" onClick={() => toast.success("Payroll Forecasting module enabled!")}>
            Explore Forecast Model
          </Button>
        </div>

        {/* Pending Payments Card */}
        <Card className="p-5 lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-amber-500 pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Pending Payments</h3>
                <p className="text-xs text-muted-foreground">Reimbursements in queue</p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-muted-foreground">Total Queued Amount</p>
              <h3 className="text-2xl font-bold text-foreground font-mono">$69,856</h3>
            </div>

            <div className="flex -space-x-1.5 mb-4">
              {["/ui-assets/avatar-01.jpg", "/ui-assets/avatar-02.jpg", "/ui-assets/avatar-03.jpg", "/ui-assets/avatar-04.jpg"].map((src, i) => (
                <img key={i} src={src} className="size-7 rounded-full border border-card object-cover" alt="claimant" />
              ))}
              <span className="size-7 rounded-full bg-muted border border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                +9
              </span>
            </div>
          </div>

          <Button variant="primary" size="sm" className="w-full" onClick={() => setTransferModalOpen(true)}>
            <i className="ph ph-paper-plane-tilt me-1"></i> Transfer Now
          </Button>
        </Card>
      </div>

      {/* ── Row 5: Recent HR Transactions Data Table ── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="border-l-2 border-primary pl-2.5">
            <h3 className="text-base font-bold text-foreground">Recent HR Transactions</h3>
            <p className="text-xs text-muted-foreground">Ledger of processed bonuses, trainings, and employee expense reimbursements</p>
          </div>
          <Button variant="outline" size="xs" onClick={() => toast.info("Opening all transaction ledger...")}>
            View All Transactions
          </Button>
        </div>

        <div className="overflow-x-auto border border-border/80 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-semibold">Transaction ID</th>
                <th className="p-3 font-semibold">Employee</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold">Amount</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { id: "TRX565545878", name: "Anthony Lewis", avatar: "/ui-assets/avatar-02.jpg", category: "Bonus", amount: "$15,000", date: "Jan 06, 2026", status: "Approved", badge: "bg-emerald-500/10 text-emerald-600" },
                { id: "TRX654412454", name: "Brian Villalobos", avatar: "/ui-assets/avatar-03.jpg", category: "Training", amount: "$2,500", date: "Jan 05, 2026", status: "Pending", badge: "bg-pink-500/10 text-pink-600" },
                { id: "TRX552145547", name: "Harvey Smith", avatar: "/ui-assets/avatar-04.jpg", category: "Commission", amount: "$124,500", date: "Jan 04, 2026", status: "Processing", badge: "bg-purple-500/10 text-purple-600" },
                { id: "TRX254124457", name: "Stephan Peralt", avatar: "/ui-assets/avatar-05.jpg", category: "Salary Advance", amount: "$7,200", date: "Jan 03, 2026", status: "Approved", badge: "bg-emerald-500/10 text-emerald-600" },
                { id: "TRX142589632", name: "Doglas Martini", avatar: "/ui-assets/avatar-06.jpg", category: "Hardware Reimbursement", amount: "$1,850", date: "Jan 02, 2026", status: "Approved", badge: "bg-emerald-500/10 text-emerald-600" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-mono font-medium text-primary">{row.id}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img src={row.avatar} alt={row.name} className="size-7 rounded-full object-cover border border-border" />
                      <span className="font-semibold text-foreground">{row.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{row.category}</td>
                  <td className="p-3 font-mono font-bold text-foreground">{row.amount}</td>
                  <td className="p-3 text-muted-foreground">{row.date}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.badge}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => toast.success(`Receipt printed for ${row.id}`)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Print Voucher"
                    >
                      <i className="ph ph-printer text-base"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Transfer Confirmation Dialog ── */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Pending Disbursements</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground">
              You are about to initiate ACH/Direct Deposit transfers for 13 approved employee expense and commission claims.
            </p>
            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
              <div className="flex justify-between"><span>Total Batch Count:</span><span className="font-bold">13 Claims</span></div>
              <div className="flex justify-between"><span>Total Outflow:</span><span className="font-bold font-mono text-primary">$69,856.00</span></div>
              <div className="flex justify-between"><span>Settlement Date:</span><span>Immediate (Next-Day ACH)</span></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.success("Disbursement file dispatched to banking network!");
                  setTransferModalOpen(false);
                }}
              >
                Confirm Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
