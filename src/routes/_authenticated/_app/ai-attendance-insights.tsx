import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/ai-attendance-insights")({
  component: AIAttendanceInsightsPage,
  head: () => ({
    meta: [
      { title: "AI Attendance Insights | Dreams ERP" },
      { name: "description", content: "Predictive absenteeism patterns, anomaly detection, geo-tagging alerts, and attendance compliance telemetry." },
    ],
  }),
});

export default function AIAttendanceInsightsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [timeframe, setTimeframe] = useState("This Month");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRunScan = () => {
    setIsScanning(true);
    toast.info("Running attendance anomaly detection scan...");
    setTimeout(() => {
      setIsScanning(false);
      toast.success("Anomaly scan complete: 4 pattern deviations flagged for review.");
    }, 1200);
  };

  // Weekly Trend Area Chart
  const trendOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 260, type: "area", toolbar: { show: false } },
      colors: ["#03C95A", "#FF6B00"],
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 },
      },
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri"],
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

  const trendSeries = [
    { name: "Actual Attendance Rate", data: [96, 94, 95, 91, 88] },
    { name: "Predicted Baseline", data: [95, 95, 94, 92, 89] },
  ];

  return (
    <div className="space-y-4">
      {/* ── Page Header / Breadcrumb (Dreams ERP Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">AI Attendance Insights</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/hrm-dashboard" className="hover:text-primary">Dashboard</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Anomaly &amp; Punctuality Telemetry</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunScan}
            disabled={isScanning}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i className={`ph-bold ${isScanning ? "ph-spinner animate-spin" : "ph-radar"} text-xs`}></i>
            <span>{isScanning ? "Scanning..." : "Scan For Anomalies"}</span>
          </button>
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Overall Attendance</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">94.8%</h2>
          <span className="text-[11px] text-success font-medium">+1.2% vs 30-day baseline</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Habitual Tardy Rate</span>
          <h2 className="text-xl font-bold text-warning mb-0.5">3.8%</h2>
          <span className="text-[11px] text-default font-medium">Avg delay: 14 mins</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Unscheduled Absences</span>
          <h2 className="text-xl font-bold text-danger mb-0.5">7 Events</h2>
          <span className="text-[11px] text-danger font-medium">Flagged on Mondays &amp; Fridays</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <span className="text-xs text-default block mb-1">Geo-Fence Deviations</span>
          <h2 className="text-xl font-bold text-blue-600 mb-0.5">2 Detected</h2>
          <span className="text-[11px] text-default font-medium">Off-premise check-ins</span>
        </div>
      </div>

      {/* ── Section 2: Attendance Weekly Flow & Anomaly Alerts ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Attendance Rate Trend */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Weekly Attendance vs Baseline</h3>
            <span className="text-xs text-muted-foreground font-mono">{timeframe}</span>
          </div>

          {isMounted && (
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
              <Chart options={trendOptions} series={trendSeries} type="area" height={260} />
            </Suspense>
          )}
        </div>

        {/* Flagged Irregularities */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div className="pb-3 border-b border-border-color mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Flagged Anomalies (Today)</h3>
            <span className="text-[10px] text-danger bg-danger-transparent px-2 py-0.5 rounded font-semibold">
              4 Critical
            </span>
          </div>

          <div className="space-y-2.5 my-auto py-2">
            {[
              {
                user: "Marcus Vance",
                role: "DevOps Engineer",
                issue: "Multiple missed punches for 3 consecutive days",
                severity: "High",
                color: "text-danger bg-danger-transparent",
              },
              {
                user: "Chloe Bennett",
                role: "Account Executive",
                issue: "Geo-fence location mismatch (+12.4 km from assigned branch)",
                severity: "Medium",
                color: "text-warning bg-warning-transparent",
              },
              {
                user: "David Ross",
                role: "Customer Support",
                issue: "Sudden shift tardiness pattern after weekend shifts",
                severity: "Medium",
                color: "text-warning bg-warning-transparent",
              },
              {
                user: "Rachel Green",
                role: "Content Specialist",
                issue: "Excess break duration logged (1h 45m)",
                severity: "Low",
                color: "text-default bg-slate-100 dark:bg-slate-800",
              },
            ].map((item, idx) => (
              <div key={idx} className="p-2.5 rounded border border-border-color text-xs flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.user}</h4>
                  <span className="text-[10px] text-muted-foreground block">{item.role}</span>
                  <p className="text-[11px] text-default mt-1">{item.issue}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${item.color}`}>
                  {item.severity}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => toast.success("Notified team leads of flagged anomalies.")}
            className="w-full py-2 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer shadow-xs mt-2"
          >
            Dispatch Alerts to Line Managers
          </button>
        </div>
      </div>
    </div>
  );
}
