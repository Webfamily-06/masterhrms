import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/ai-payroll-forecast")({
  component: AIPayrollForecastPage,
  head: () => ({
    meta: [
      { title: "AI Payroll Forecast | Dreams ERP" },
      { name: "description", content: "Predictive payroll modelling, compensation projections, budget variance, and department trajectory." },
    ],
  }),
});

export default function AIPayrollForecastPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [budgetMonth, setBudgetMonth] = useState("July 2026");
  const [forecastYear, setForecastYear] = useState("2026");
  const [varianceYear, setVarianceYear] = useState("2026");
  const [isReforecasting, setIsReforecasting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleReforecast = () => {
    setIsReforecasting(true);
    toast.info("Running LSTM time-series forecast engine...");
    setTimeout(() => {
      setIsReforecasting(false);
      toast.success("Reforecast complete: 94.2% statistical confidence achieved.");
    }, 1200);
  };

  // 1. Main Payroll Forecast Line Chart
  const payrollForecastOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 320,
        type: "line",
        toolbar: { show: false },
      },
      colors: ["#FF6B00", "#0E82FD"],
      stroke: {
        width: [3, 3],
        dashArray: [0, 5],
        curve: "straight",
      },
      grid: {
        borderColor: "#f1f5f9",
      },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
          formatter: (v: number) => `$${v}M`,
        },
      },
      legend: { position: "top", fontSize: "12px", labels: { colors: "#6B7280" } },
    }),
    []
  );

  const payrollForecastSeries = [
    { name: "Actual Payroll", data: [8.2, 8.4, 8.5, 8.8, 9.1, 9.6, null, null, null, null, null, null] },
    { name: "AI Projected Trajectory", data: [8.2, 8.4, 8.5, 8.8, 9.1, 9.6, 10.1, 10.4, 11.0, 11.5, 12.0, 12.6] },
  ];

  // 2. Variance Bar Chart
  const varianceOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 260, type: "bar", toolbar: { show: false } },
      colors: ["#0E82FD", "#FF6B00"],
      plotOptions: { bar: { columnWidth: "45%", borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["Q1", "Q2", "Q3 (Est)", "Q4 (Est)"],
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
          formatter: (v: number) => `$${v}M`,
        },
      },
      legend: { position: "top", fontSize: "12px", labels: { colors: "#6B7280" } },
      grid: { borderColor: "#f1f5f9" },
    }),
    []
  );

  const varianceSeries = [
    { name: "Budget Allocated", data: [25.5, 27.0, 29.0, 31.0] },
    { name: "Actual / Predicted Spend", data: [25.1, 27.5, 30.2, 31.8] },
  ];

  return (
    <div className="space-y-4">
      {/* ── Page Header / Breadcrumb (Dreams ERP Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">AI Payroll Forecast</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/payroll-dashboard" className="hover:text-primary">Payroll</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Predictive Cost Telemetry</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReforecast}
            disabled={isReforecasting}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i className={`ph-bold ${isReforecasting ? "ph-spinner animate-spin" : "ph-arrows-clockwise"} text-xs`}></i>
            <span>{isReforecasting ? "Calculating..." : "Re-run AI Forecast"}</span>
          </button>
        </div>
      </div>

      {/* ── Top 4 Insight Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Current YTD Disbursed</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">$9.6M</h2>
          <span className="text-[11px] text-success font-medium">Actuals through June 2026</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Projected Annual Total</span>
          <h2 className="text-xl font-bold text-primary mb-0.5">$12.6M</h2>
          <span className="text-[11px] text-default font-medium">Model confidence: 94.2%</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Estimated Budget Variance</span>
          <h2 className="text-xl font-bold text-danger mb-0.5">+$420,000</h2>
          <span className="text-[11px] text-danger font-medium">+3.4% over initial allocation</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Headcount Expansion Impact</span>
          <h2 className="text-xl font-bold text-blue-600 mb-0.5">+18 Hires</h2>
          <span className="text-[11px] text-default font-medium">Scheduled for Q3 &amp; Q4</span>
        </div>
      </div>

      {/* ── Section 2: Main Forecast Chart ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-color mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              12-Month Payroll Expenditure &amp; Neural Projection
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              LSTM neural network projection factoring planned hires, seasonal bonuses, and historical merit increases.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{forecastYear}</span>
        </div>

        {isMounted && (
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
            <Chart options={payrollForecastOptions} series={payrollForecastSeries} type="line" height={320} />
          </Suspense>
        )}
      </div>

      {/* ── Section 3: Variance & Departmental Breakdown ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Quarterly Variance */}
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Quarterly Budget vs. Actual / Forecast</h3>
            <span className="text-xs text-muted-foreground font-mono">{varianceYear}</span>
          </div>
          {isMounted && (
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
              <Chart options={varianceOptions} series={varianceSeries} type="bar" height={260} />
            </Suspense>
          )}
        </div>

        {/* Department Trajectory Risk */}
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div className="pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Departmental Cost Variance Risk</h3>
          </div>

          <div className="space-y-3 my-auto py-2">
            {[
              { dept: "Engineering & Platform", status: "Over Budget (+8.2%)", risk: "High", color: "text-danger bg-danger-transparent" },
              { dept: "Sales & Client Success", status: "Over Budget (+5.1%)", risk: "Medium", color: "text-warning bg-warning-transparent" },
              { dept: "Product & UX Design", status: "On Target (-0.4%)", risk: "Low", color: "text-success bg-success-transparent" },
              { dept: "Human Resources & Ops", status: "Under Budget (-2.8%)", risk: "Safe", color: "text-success bg-success-transparent" },
            ].map((item, idx) => (
              <div key={idx} className="p-2.5 rounded border border-border-color flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.dept}</h4>
                  <span className="text-[11px] text-muted-foreground">{item.status}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${item.color}`}>
                  {item.risk} Risk
                </span>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-border-color/60 text-[11px] text-default mt-2">
            Recommendation: Freeze supplemental contractor spend in Engineering to prevent fiscal year overruns.
          </div>
        </div>
      </div>
    </div>
  );
}
