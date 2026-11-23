'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { SmartHRHeader } from "@/components/ui/smarthr-header";
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

interface PayrollRecord {
  id: string;
  employeeId: string;
  name: string;
  avatar: string;
  designation: string;
  department: string;
  basic: number;
  bonus: number;
  deductions: number;
  netPay: number;
  paymentDate: string;
  status: "Paid" | "Pending" | "Processing";
}

export default function PayrollDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("December 2025");
  const [activeTab, setActiveTab] = useState<"overview" | "register">("overview");

  // Filter States for Live Register
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal States
  const [runPayrollOpen, setRunPayrollOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // AI Assistant chat state
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "👋 Welcome to your AI Payroll Assistant! I'm here to help calculate pay runs, analyze tax trends, and resolve processing exceptions." },
  ]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch real-time DB payroll data
  const { data: dbPayroll = [] } = useQuery<any[]>({
    queryKey: ["payroll-register-data"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const records = useMemo<PayrollRecord[]>(() => {
    if (!Array.isArray(dbPayroll) || dbPayroll.length === 0) {
      // Elegant default fallback records matching SmartHR standard
      return [
        { id: "#PR0001", employeeId: "EMP-001", name: "Anthony Lewis", avatar: "/ui-assets/avatar-02.jpg", designation: "Finance Executive", department: "Finance", basic: 4500, bonus: 500, deductions: 450, netPay: 4550, paymentDate: "31 Dec 2025", status: "Paid" },
        { id: "#PR0002", employeeId: "EMP-002", name: "Brian Villalobos", avatar: "/ui-assets/avatar-03.jpg", designation: "Full Stack Engineer", department: "Engineering", basic: 6500, bonus: 800, deductions: 650, netPay: 6650, paymentDate: "31 Dec 2025", status: "Processing" },
        { id: "#PR0003", employeeId: "EMP-003", name: "Harvey Smith", avatar: "/ui-assets/avatar-04.jpg", designation: "HR Specialist", department: "Human Resources", basic: 4200, bonus: 300, deductions: 400, netPay: 4100, paymentDate: "31 Dec 2025", status: "Pending" },
        { id: "#PR0004", employeeId: "EMP-004", name: "Stephan Peralt", avatar: "/ui-assets/avatar-05.jpg", designation: "DevOps Engineer", department: "Engineering", basic: 7200, bonus: 1000, deductions: 750, netPay: 7450, paymentDate: "31 Dec 2025", status: "Paid" },
        { id: "#PR0005", employeeId: "EMP-005", name: "Doglas Martini", avatar: "/ui-assets/avatar-06.jpg", designation: "Marketing Specialist", department: "Marketing", basic: 3900, bonus: 400, deductions: 350, netPay: 3950, paymentDate: "31 Dec 2025", status: "Paid" },
      ];
    }
    return dbPayroll.map((p: any, idx: number) => {
      const emp = p.employee || {};
      const empName = emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : (emp.name || `Employee #${idx + 1}`);
      return {
        id: p.id || p.payrollCode || `#PR${String(idx + 1).padStart(4, "0")}`,
        employeeId: emp.employeeCode || emp.id || `EMP-${String(idx + 1).padStart(3, "0")}`,
        name: empName,
        avatar: emp.avatar || `/ui-assets/avatar-${String((idx % 12) + 1).padStart(2, "0")}.jpg`,
        designation: emp.designation?.title || emp.position || "Staff",
        department: emp.department?.name || "General",
        basic: Number(p.basicSalary || p.basic || 0),
        bonus: Number(p.bonus || p.allowances || 0),
        deductions: Number(p.deductions || 0),
        netPay: Number(p.netSalary || p.netPay || (Number(p.basicSalary || 0) + Number(p.bonus || 0) - Number(p.deductions || 0))),
        paymentDate: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "31 Dec 2025",
        status: p.status === "paid" || p.status === "Paid" ? "Paid" : p.status === "processing" ? "Processing" : "Pending",
      };
    });
  }, [dbPayroll]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === "All" || r.department === departmentFilter;
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [records, searchQuery, departmentFilter, statusFilter]);

  // Chart 1: Salary Range Distribution Area/Line
  const distributionChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 210, toolbar: { show: false } },
      series: [{ name: "Employees in Range", data: [285, 478, 342, 98, 45] }],
      xaxis: {
        categories: ["$30k-$50k", "$50k-$80k", "$80k-$120k", "$120k-$150k", "$150k+"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
      colors: ["#0d6efd"],
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 95] } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
    }),
    []
  );

  // Chart 2: 6 Months Tax & Deduction Dual Area Chart
  const taxTrendChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 200, toolbar: { show: false } },
      series: [
        { name: "Federal Tax", data: [180, 210, 240, 220, 260, 290] },
        { name: "Deductions", data: [120, 140, 155, 150, 175, 195] },
      ],
      xaxis: {
        categories: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" }, formatter: (v) => `$${v}K` } },
      colors: ["#6366f1", "#0d6efd"],
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
    }),
    []
  );

  // Sparklines for Insurance & 401(k)
  const lifeInsuranceSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 35, width: 80, sparkline: { enabled: true } },
      series: [{ data: [18, 22, 21, 24, 25, 24.87] }],
      stroke: { curve: "smooth", width: 2 },
      colors: ["#0d6efd"],
      tooltip: { fixed: { enabled: false } },
    }),
    []
  );

  const k401Sparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 35, width: 80, sparkline: { enabled: true } },
      series: [{ data: [8.5, 9.2, 9.8, 10.1, 10.3, 10.47] }],
      stroke: { curve: "smooth", width: 2 },
      colors: ["#10b981"],
      tooltip: { fixed: { enabled: false } },
    }),
    []
  );

  const healthInsuranceSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 35, width: 80, sparkline: { enabled: true } },
      series: [{ data: [22, 23.5, 25, 26, 26.5, 26.87] }],
      stroke: { curve: "smooth", width: 2 },
      colors: ["#f59e0b"],
      tooltip: { fixed: { enabled: false } },
    }),
    []
  );

  const handleSendAiMessage = (promptText?: string) => {
    const textToSend = promptText || aiMessage;
    if (!textToSend.trim()) return;

    setAiMessages((prev) => [...prev, { sender: "user", text: textToSend }]);
    setAiMessage("");

    setTimeout(() => {
      let reply = "I have analyzed the current payroll run. All tax formulas and overtime rules are verified compliant with federal and state regulations.";
      if (textToSend.includes("overtime")) {
        reply = "Overtime calculation complete: 34 employees clocked 128 OT hours totaling $6,240, applied at 1.5x regular pay.";
      } else if (textToSend.includes("tax")) {
        reply = "Tax report generated: Total federal withholding is $290K, state withholding is $95K, and FICA is $188K for December 2025.";
      } else if (textToSend.includes("Error") || textToSend.includes("Detection")) {
        reply = "Error Detection scan: Found 2 missing tax IDs and 1 bank account discrepancy in Engineering. Flags have been escalated.";
      }
      setAiMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 600);
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* ── Page Header ── */}
      <SmartHRHeader
        title="Payroll Dashboard"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "overview" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dashboard Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "register" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Payroll Register ({records.length})
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setRunPayrollOpen(true)}
            >
              <i className="ph-bold ph-lightning me-1.5"></i> Run Payroll
            </Button>
          </div>
        }
      />

      {/* ── Top Payroll Processing Status Banner ── */}
      <Card className="p-4 border-l-4 border-l-emerald-600 bg-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center flex-wrap gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 border-r border-border pr-4">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-muted-foreground">Payroll Status:</span>
              <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Processing
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 border-r border-border pr-4">
              <i className="ph ph-calendar text-muted-foreground"></i>
              <span className="text-muted-foreground">Cut-off:</span>
              <span className="text-foreground font-semibold">Dec 25, 2025</span>
            </div>
            <div className="flex items-center gap-1.5">
              <i className="ph ph-credit-card text-muted-foreground"></i>
              <span className="text-muted-foreground">Payment Date:</span>
              <span className="text-foreground font-semibold">Dec 31, 2025</span>
            </div>
          </div>
          <Button variant="primary" size="xs" onClick={() => setRunPayrollOpen(true)}>
            <i className="ph-bold ph-gear me-1"></i> Quick Process
          </Button>
        </div>
      </Card>

      {/* ── Tab 1: Dashboard Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Row 1: Dark Overview Card & 4 Salary Metric Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Dark Overview Card (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-slate-900 text-white p-5 border border-slate-800 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white">Payroll Overview</h2>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
                    {selectedPeriod}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl">
                      <i className="ph-duotone ph-money"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">$2,458,320</h3>
                      <p className="text-[11px] text-slate-400">Total Gross Payroll</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
                      <i className="ph-duotone ph-wallet"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">$1,987,450</h3>
                      <p className="text-[11px] text-slate-400">Net Payable Amount</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
                    <div className="size-7 mx-auto rounded-full bg-slate-700 flex items-center justify-center text-slate-300 mb-1">
                      <i className="ph ph-receipt text-xs"></i>
                    </div>
                    <h4 className="text-sm font-bold text-white">$470,870</h4>
                    <p className="text-[10px] text-slate-400 leading-tight">Total Deductions</p>
                  </div>

                  <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
                    <div className="size-7 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1">
                      <i className="ph ph-hourglass-simple text-xs"></i>
                    </div>
                    <h4 className="text-sm font-bold text-white">12</h4>
                    <p className="text-[10px] text-slate-400 leading-tight">Pending Approvals</p>
                  </div>

                  <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
                    <div className="size-7 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1">
                      <i className="ph ph-warning-circle text-xs"></i>
                    </div>
                    <h4 className="text-sm font-bold text-white">24</h4>
                    <p className="text-[10px] text-slate-400 leading-tight">Payroll Exceptions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Salary Metrics (7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <i className="ph ph-trend-up text-base"></i>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    +18% <i className="ph-bold ph-arrow-up-right"></i>
                  </span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-foreground">$24,500</h4>
                  <p className="text-xs font-semibold text-muted-foreground">Highest Salary</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">CTO - Engineering</p>
                </div>
              </Card>

              <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <i className="ph ph-coins text-base"></i>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    +18% <i className="ph-bold ph-arrow-up-right"></i>
                  </span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-foreground">$284K</h4>
                  <p className="text-xs font-semibold text-muted-foreground">Variable Pay</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Bonuses + Commissions</p>
                </div>
              </Card>

              <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <i className="ph ph-hand-coins text-base"></i>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    -16% <i className="ph-bold ph-arrow-down-right"></i>
                  </span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-foreground">$1.99M</h4>
                  <p className="text-xs font-semibold text-muted-foreground">After Deduction</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Employee take-home</p>
                </div>
              </Card>

              <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <i className="ph ph-chart-bar text-base"></i>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    +18% <i className="ph-bold ph-arrow-up-right"></i>
                  </span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-foreground">$78,450</h4>
                  <p className="text-xs font-semibold text-muted-foreground">Average Salary</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Median: $72,000</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Row 2: Salary Range Distribution & Progress Bars */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-base font-bold text-foreground">Salary Range Distribution</h3>
                <p className="text-xs text-muted-foreground">Workforce compensation tier mapping across 1,248 active employees</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Average Salary:</span>
                <span className="text-sm font-bold text-primary font-mono">$78,450</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7">
                {isMounted && (
                  <Suspense fallback={<div className="h-52 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                    <Chart options={distributionChartOptions} series={distributionChartOptions.series} type="area" height={210} />
                  </Suspense>
                )}
              </div>
              <div className="lg:col-span-5 space-y-3">
                {[
                  { range: "$30k - $50k", count: 285, pct: "22.8%", bar: 75, color: "bg-blue-600" },
                  { range: "$50k - $80k", count: 478, pct: "38.3%", bar: 85, color: "bg-indigo-600" },
                  { range: "$80k - $120k", count: 342, pct: "27.4%", bar: 72, color: "bg-sky-500" },
                  { range: "$120k - $150k", count: 98, pct: "7.8%", bar: 50, color: "bg-amber-500" },
                  { range: "$150k+", count: 45, pct: "3.6%", bar: 30, color: "bg-rose-500" },
                ].map((tier, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{tier.range}</span>
                      <span className="font-semibold text-muted-foreground">
                        {tier.count} <span className="text-[11px] font-normal">({tier.pct})</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${tier.color} rounded-full`} style={{ width: `${tier.bar}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Row 3: Batch Processing Status, 6M Tax Trend, Insurance & Deductions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Batch Processing Status (4 cols) */}
            <Card className="p-4 lg:col-span-4 flex flex-col justify-between">
              <div>
                <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Batch Processing Status</h3>
                    <p className="text-xs text-muted-foreground">3 distinct compensation cohorts</p>
                  </div>
                  <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600">3 Batches</Badge>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">Combined Total</p>
                  <h4 className="text-2xl font-bold text-foreground">$2,459,320</h4>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"></span> Full-Time Employees</span>
                      <span>$2,184,500</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">1,120 Staff members</p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-500"></span> Part-Time Employees</span>
                      <span>$124,850</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">60 Staff members</p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-700"></span> Independent Contractors</span>
                      <span>$154,850</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">63 Contractors</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 6 Months Tax & Deduction Trend (4 cols) */}
            <Card className="p-4 lg:col-span-4 flex flex-col justify-between">
              <div>
                <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">6M Tax & Deductions</h3>
                    <p className="text-xs text-muted-foreground">Withholding trajectories</p>
                  </div>
                  <span className="text-xs font-bold text-foreground font-mono">$1.71M</span>
                </div>
                {isMounted && (
                  <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                    <Chart options={taxTrendChartOptions} series={taxTrendChartOptions.series} type="area" height={200} />
                  </Suspense>
                )}
              </div>
              <div className="flex items-center justify-between text-xs pt-3 border-t border-border/50">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-indigo-500"></span> Federal Tax
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary"></span> Deductions
                </span>
              </div>
            </Card>

            {/* Insurance & Benefit Deductions (4 cols) */}
            <Card className="p-4 lg:col-span-4 flex flex-col justify-between space-y-3">
              <div className="border-l-2 border-primary pl-2.5 mb-1">
                <h3 className="text-sm font-bold text-foreground">Statutory Deductions</h3>
                <p className="text-xs text-muted-foreground">Per employee average allocation</p>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border border-border/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Life Insurance</h4>
                  <p className="text-[11px] text-muted-foreground">Per Employee: <span className="font-semibold text-foreground">$24.87</span></p>
                </div>
                {isMounted && (
                  <Suspense fallback={<div className="h-8 w-20"></div>}>
                    <Chart options={lifeInsuranceSparkline} series={lifeInsuranceSparkline.series} type="line" height={35} width={80} />
                  </Suspense>
                )}
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border border-border/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">401(k) Contribution</h4>
                  <p className="text-[11px] text-muted-foreground">Per Employee: <span className="font-semibold text-foreground">$10.47</span></p>
                </div>
                {isMounted && (
                  <Suspense fallback={<div className="h-8 w-20"></div>}>
                    <Chart options={k401Sparkline} series={k401Sparkline.series} type="line" height={35} width={80} />
                  </Suspense>
                )}
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border border-border/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Health Insurance</h4>
                  <p className="text-[11px] text-muted-foreground">Per Employee: <span className="font-semibold text-foreground">$26.87</span></p>
                </div>
                {isMounted && (
                  <Suspense fallback={<div className="h-8 w-20"></div>}>
                    <Chart options={healthInsuranceSparkline} series={healthInsuranceSparkline.series} type="line" height={35} width={80} />
                  </Suspense>
                )}
              </div>
            </Card>
          </div>

          {/* Row 4: Payroll Processing Pipeline (6 cols) & AI Assistant (6 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Payroll Processing Pipeline */}
            <Card className="p-5 lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="border-l-2 border-primary pl-2.5">
                    <h3 className="text-sm font-bold text-foreground">Payroll Processing Pipeline</h3>
                    <p className="text-xs text-muted-foreground">Step-by-step verification pipeline</p>
                  </div>
                  <Badge variant="soft" className="bg-rose-500/10 text-rose-600">Stage 4 of 6</Badge>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">Overall Pipeline Progress</span>
                    <span className="font-bold text-primary">68%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "68%" }}></div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { step: "Data Validation", desc: "All employee records validated", status: "Completed", time: "2 Min", badge: "bg-emerald-500/10 text-emerald-600" },
                    { step: "Attendance Calculation", desc: "Working days and hours calculated", status: "Completed", time: "4 Min", badge: "bg-emerald-500/10 text-emerald-600" },
                    { step: "Salary Computation", desc: "Base salary + allowances calculated", status: "Completed", time: "3 Min", badge: "bg-emerald-500/10 text-emerald-600" },
                    { step: "Deductions Processing", desc: "Tax, PF, and other deductions", status: "Running", time: "Active", badge: "bg-sky-500/10 text-sky-600" },
                    { step: "Final Verification", desc: "Admin authorization required", status: "Pending", time: "Queued", badge: "bg-muted text-muted-foreground" },
                    { step: "Payment Generation", desc: "Bank file ACH/SEPA creation", status: "Pending", time: "Queued", badge: "bg-muted text-muted-foreground" },
                  ].map((p, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/40 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx < 3 ? "bg-emerald-600 text-white" : idx === 3 ? "bg-primary text-white animate-pulse" : "bg-muted text-muted-foreground"}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{p.step}</p>
                          <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.badge}`}>
                          {p.status}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">{p.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/50">
                <Button variant="primary" size="sm" onClick={() => toast.success("Continuing deduction processing...")}>
                  <i className="ph ph-play me-1"></i> Continue Processing
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.info("Exporting audit snapshot...")}>
                  <i className="ph ph-file-arrow-down me-1"></i> Export Stage Logs
                </Button>
              </div>
            </Card>

            {/* AI Payroll Assistant (6 cols) */}
            <Card className="p-5 lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-full bg-slate-900 text-primary flex items-center justify-center text-lg">
                      <i className="ph-duotone ph-robot"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">AI Payroll Assistant</h4>
                      <p className="text-[11px] text-muted-foreground">Autonomous compensation & compliance engine</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-600"></span> Online
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Quick Analysis Triggers</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      "Calculate overtime pay",
                      "Generate tax report",
                      "Error Detection",
                      "Compliance Monitoring",
                    ].map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendAiMessage(tag)}
                        className="text-[11px] font-medium px-2.5 py-1 bg-muted hover:bg-primary/10 hover:text-primary rounded-md border border-border transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat window */}
                <div className="h-44 overflow-y-auto space-y-2.5 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`p-2.5 rounded-lg max-w-[85%] ${msg.sender === "user" ? "bg-primary text-white" : "bg-card border border-border text-foreground"}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <input
                  type="text"
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendAiMessage()}
                  placeholder="Ask me anything about payroll calculations, taxes, or deductions..."
                  className="w-full text-xs bg-muted/40 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="sm" variant="primary" onClick={() => handleSendAiMessage()}>
                  <i className="ph-bold ph-paper-plane-tilt"></i>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab 2: Live Payroll Register Data Table ── */}
      {activeTab === "register" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Payroll Register</h3>
              <p className="text-xs text-muted-foreground">Real-time ledger of processed and pending employee disbursements</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search employee or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs border border-border rounded-md px-3 py-1.5 bg-card text-foreground"
              />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2.5 py-1.5 bg-card text-foreground"
              >
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Human Resources">Human Resources</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2.5 py-1.5 bg-card text-foreground"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 font-semibold">Payroll Code</th>
                  <th className="p-3 font-semibold">Employee</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Basic</th>
                  <th className="p-3 font-semibold">Allowances</th>
                  <th className="p-3 font-semibold">Deductions</th>
                  <th className="p-3 font-semibold">Net Pay</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3 font-mono font-medium text-primary">{r.id}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img src={r.avatar} alt={r.name} className="size-7 rounded-full object-cover border border-border" />
                        <div>
                          <p className="font-semibold text-foreground">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.department}</td>
                    <td className="p-3 font-mono">${r.basic.toLocaleString()}</td>
                    <td className="p-3 font-mono text-emerald-600">+${r.bonus.toLocaleString()}</td>
                    <td className="p-3 font-mono text-rose-600">-${r.deductions.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-foreground">${r.netPay.toLocaleString()}</td>
                    <td className="p-3">
                      <Badge
                        variant="soft"
                        className={
                          r.status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : r.status === "Processing"
                            ? "bg-sky-500/10 text-sky-600"
                            : "bg-amber-500/10 text-amber-600"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setSelectedPayslip(r)}
                      >
                        Payslip
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Run Payroll Dialog ── */}
      <Dialog open={runPayrollOpen} onOpenChange={setRunPayrollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Payroll Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Pay Period</label>
              <input
                type="text"
                defaultValue="December 2025"
                className="w-full border border-border rounded-md p-2 bg-card text-foreground"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Cut-Off Date</label>
              <input
                type="date"
                defaultValue="2025-12-25"
                className="w-full border border-border rounded-md p-2 bg-card text-foreground"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Disbursement Date</label>
              <input
                type="date"
                defaultValue="2025-12-31"
                className="w-full border border-border rounded-md p-2 bg-card text-foreground"
              />
            </div>
            <div className="p-3 bg-muted/40 rounded-md border border-border space-y-1">
              <p className="font-semibold text-foreground">Estimated Run Summary:</p>
              <p className="text-muted-foreground">1,248 Employees • Approx. $2,458,320 Gross Outflow</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRunPayrollOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.success("Payroll calculation started in background!");
                  setRunPayrollOpen(false);
                }}
              >
                Confirm & Run
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Payslip Modal ── */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee Payslip - {selectedPayslip?.id}</DialogTitle>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <img src={selectedPayslip.avatar} alt={selectedPayslip.name} className="size-10 rounded-full object-cover border border-border" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{selectedPayslip.name}</h4>
                    <p className="text-muted-foreground">{selectedPayslip.designation} • {selectedPayslip.department}</p>
                  </div>
                </div>
                <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600">
                  {selectedPayslip.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                  <h5 className="font-bold text-foreground">Earnings</h5>
                  <div className="flex justify-between"><span>Basic Salary</span><span className="font-mono">${selectedPayslip.basic.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Allowances / Bonus</span><span className="font-mono text-emerald-600">+${selectedPayslip.bonus.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total Gross</span><span className="font-mono">${(selectedPayslip.basic + selectedPayslip.bonus).toLocaleString()}</span></div>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                  <h5 className="font-bold text-foreground">Deductions</h5>
                  <div className="flex justify-between"><span>Federal / State Tax</span><span className="font-mono">-${(selectedPayslip.deductions * 0.6).toFixed(0)}</span></div>
                  <div className="flex justify-between"><span>Insurance & 401(k)</span><span className="font-mono">-${(selectedPayslip.deductions * 0.4).toFixed(0)}</span></div>
                  <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total Deductions</span><span className="font-mono text-rose-600">-${selectedPayslip.deductions.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Net Disbursed Take-Home</p>
                  <h4 className="text-xl font-bold text-primary font-mono">${selectedPayslip.netPay.toLocaleString()}</h4>
                </div>
                <Button size="sm" variant="primary" onClick={() => toast.success("Downloading payslip PDF...")}>
                  <i className="ph ph-download-simple me-1"></i> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
