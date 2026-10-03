import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/ai-team-performance-insights")({
  component: AITeamPerformanceInsightsPage,
  head: () => ({
    meta: [
      { title: "AI Team Performance Insights | Dreams ERP" },
      { name: "description", content: "AI-evaluated OKRs, productivity velocities, cross-functional collaboration scores, and quality audits." },
    ],
  }),
});

export default function AITeamPerformanceInsightsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [yearFilter, setYearFilter] = useState("2026");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDeepAnalysis = () => {
    toast.info("Running Deep AI Team Performance Analysis across 250 employees...");
    setTimeout(() => {
      toast.success("Deep Analysis complete: Team average is 89% with high productivity.");
    }, 1200);
  };

  // Stacked Bar Options
  const ppeOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 300,
        type: "bar",
        stacked: true,
        toolbar: { show: false },
      },
      colors: ["#FF6B00", "#0E82FD", "#03C95A"],
      plotOptions: {
        bar: {
          columnWidth: "40%",
          borderRadius: 4,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
          formatter: (v: number) => `${v}%`,
        },
      },
      legend: { position: "top", fontSize: "12px", labels: { colors: "#6B7280" } },
      grid: { borderColor: "#f1f5f9" },
    }),
    []
  );

  const ppeSeries = [
    { name: "Productivity Velocity", data: [40, 45, 52, 48, 55, 60, 58, 62, 65, 68, 70, 72] },
    { name: "Engagement Score", data: [30, 28, 25, 32, 28, 25, 27, 24, 22, 20, 18, 16] },
    { name: "Quality Assurance", data: [15, 18, 15, 12, 12, 10, 10, 10, 10, 9, 8, 8] },
  ];

  return (
    <div className="space-y-4">
      {/* ── Page Header / Breadcrumb (Dreams ERP Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">AI Team Performance Insights</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/hrm-dashboard" className="hover:text-primary">Dashboard</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Evaluation &amp; OKR Telemetry</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDeepAnalysis}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i className="ph-bold ph-brain text-xs"></i>
            <span>Run Deep Analysis</span>
          </button>
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Overall Org Performance</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">89.4%</h2>
          <span className="text-[11px] text-success font-medium">+4.2% vs previous quarter</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">OKR Delivery Velocity</span>
          <h2 className="text-xl font-bold text-primary mb-0.5">92.1%</h2>
          <span className="text-[11px] text-success font-medium">18 of 20 objectives met</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Cross-Team Collaboration</span>
          <h2 className="text-xl font-bold text-blue-600 mb-0.5">84.6%</h2>
          <span className="text-[11px] text-default font-medium">Based on 360 peer feedback</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Flight Risk Index</span>
          <h2 className="text-xl font-bold text-success mb-0.5">3.2% (Low)</h2>
          <span className="text-[11px] text-default font-medium">Retention health strong</span>
        </div>
      </div>

      {/* ── Section 2: Stacked Chart ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-color mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Productivity, Engagement &amp; Quality Ratio
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multivariate AI score evaluating sprint completion rate, code reviews, and manager appraisals.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{yearFilter}</span>
        </div>

        {isMounted && (
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
            <Chart options={ppeOptions} series={ppeSeries} type="bar" height={300} />
          </Suspense>
        )}
      </div>

      {/* ── Section 3: High Performers & Needs Coaching ── */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <i className="ph-duotone ph-star text-warning text-base"></i>
              Top Performing Employees (Q2 2026)
            </h3>
          </div>

          <div className="space-y-3">
            {[
              { name: "Stephan Peralt", role: "Senior Product Designer", score: "98.5%", avatar: "/ui-assets/avatar-03.jpg" },
              { name: "Sophia Martinez", role: "Financial Analyst", score: "96.2%", avatar: "/ui-assets/avatar-04.jpg" },
              { name: "Ethan Walker", role: "Engineering Lead", score: "95.8%", avatar: "/ui-assets/avatar-05.jpg" },
            ].map((emp, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border border-border-color text-xs">
                <div className="flex items-center gap-2.5">
                  <img src={emp.avatar} alt={emp.name} className="size-8 rounded-full border border-border-color" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{emp.name}</h4>
                    <span className="text-[10px] text-muted-foreground">{emp.role}</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-success text-sm">{emp.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <i className="ph-duotone ph-chalkboard-teacher text-primary text-base"></i>
              Upskilling Recommendations
            </h3>
          </div>

          <div className="space-y-3">
            {[
              { name: "Harvey Smith", role: "IT Support", gap: "Cloud Architecture Fundamentals", urgency: "Medium" },
              { name: "Brian Villalobos", role: "App Developer", gap: "Automated End-to-End Testing", urgency: "High" },
              { name: "Avery Thompson", role: "Operations Lead", gap: "Kanban Process Analytics", urgency: "Low" },
            ].map((rec, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border border-border-color text-xs">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{rec.name}</h4>
                  <span className="text-[11px] text-primary">{rec.gap}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  rec.urgency === "High" ? "bg-danger-transparent text-danger" : "bg-warning-transparent text-warning"
                }`}>
                  {rec.urgency} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
