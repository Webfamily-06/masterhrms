import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/learning-analytics")({
  component: LearningAnalyticsPage,
  head: () => ({
    meta: [
      { title: "Learning Analytics | Dreams ERP" },
      { name: "description", content: "Corporate training programs, employee skill progression, and certification telemetry." },
    ],
  }),
});

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function LearningAnalyticsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [employeeYear, setEmployeeYear] = useState("2026");
  const [courseYear, setCourseYear] = useState("2026");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: summaryData } = useQuery({
    queryKey: ["training-summary"],
    queryFn: async () => {
      const res = await api.get<any>("/training/summary");
      return res;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["training-enrollments"],
    queryFn: async () => {
      const res = await api.get<any[]>("/training/enrollments");
      return res;
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredTrainees = useMemo(() => {
    return (enrollments || []).filter((t: any) => {
      const name = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.trim();
      const course = t.course?.title || "";
      const pos = t.employee?.position || "";
      const matchSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pos.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "All" || t.status?.toLowerCase() === statusFilter.toLowerCase().replace(" ", "_");
      return matchSearch && matchStatus;
    });
  }, [enrollments, searchQuery, statusFilter]);

  // Combo Bar + Line Chart
  const learnEmployeeOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 300, type: "line", stacked: true, toolbar: { show: false } },
      stroke: { width: [0, 0, 3], curve: "smooth" },
      plotOptions: { bar: { columnWidth: "40%", borderRadius: 4 } },
      colors: ["#FF6B00", "#0E82FD", "#03C95A"],
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      yaxis: {
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      legend: { position: "top", fontSize: "12px", labels: { colors: "#6B7280" } },
      grid: { borderColor: "#f1f5f9" },
    }),
    []
  );

  const learnEmployeeSeries = [
    { name: "In Progress", type: "column", data: [50, 70, 60, 180, 120, 90, 140, 80, 130, 100, 90, 75] },
    { name: "Completed", type: "column", data: [90, 130, 170, 260, 150, 130, 180, 220, 200, 280, 240, 300] },
    { name: "Total Enrolled", type: "line", data: [140, 200, 260, 460, 310, 260, 370, 340, 370, 420, 350, 430] },
  ];

  // Course Enrollment Bar Chart
  const enrollCourseOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 260, toolbar: { show: false } },
      colors: ["#FF6B00"],
      plotOptions: { bar: { horizontal: true, barHeight: "50%", borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["Web Dev", "UI/UX", "Data Analytics", "Cloud Arch", "Cybersecurity"],
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      yaxis: {
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      grid: { borderColor: "#f1f5f9" },
    }),
    []
  );

  return (
    <div className="space-y-4">
      {/* ── Page Header / Breadcrumb (Dreams ERP Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">Learning Analytics</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/hrm-dashboard" className="hover:text-primary">Dashboard</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Training &amp; Certifications</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.success("Exporting report as PDF...")}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <i className="ph-duotone ph-file-arrow-down text-sm"></i>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-default font-medium">Active Learners</span>
            <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <i className="ph-duotone ph-student text-lg"></i>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{summaryData?.totalEnrolled ?? 0}</h2>
          <span className="text-[11px] text-success font-medium">Enrolled across tenant</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-default font-medium">Certificates Issued</span>
            <div className="size-8 rounded-md bg-success-transparent text-success flex items-center justify-center">
              <i className="ph-duotone ph-certificate text-lg"></i>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{summaryData?.completedCount ?? 0}</h2>
          <span className="text-[11px] text-success font-medium">Graduated &amp; verified</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-default font-medium">Course Completion Rate</span>
            <div className="size-8 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <i className="ph-duotone ph-chart-line-up text-lg"></i>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{summaryData?.complianceRate ?? 0}%</h2>
          <span className="text-[11px] text-default font-medium">Overall academy metric</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-default font-medium">Active Courses</span>
            <div className="size-8 rounded-md bg-warning/10 text-warning flex items-center justify-center">
              <i className="ph-duotone ph-book-open text-lg"></i>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{summaryData?.totalCourses ?? 0}</h2>
          <span className="text-[11px] text-default font-medium">Curricula in catalog</span>
        </div>
      </div>

      {/* ── Section 2: Charts ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Enrolled vs Completed */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Learning &amp; Completion Progression</h3>
            <span className="text-xs text-muted-foreground font-mono">{employeeYear}</span>
          </div>
          {isMounted && (
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
              <Chart options={learnEmployeeOptions} series={learnEmployeeSeries} type="line" height={300} />
            </Suspense>
          )}
        </div>

        {/* Popular Courses */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Most Enrolled Tracks</h3>
            <span className="text-xs text-muted-foreground font-mono">{courseYear}</span>
          </div>
          {isMounted && (
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
              <Chart options={enrollCourseOptions} series={[{ name: "Enrollees", data: [95, 78, 62, 54, 41] }]} type="bar" height={260} />
            </Suspense>
          )}
          <p className="text-[11px] text-muted-foreground pt-2 border-t border-border-color">
            Web Development and UI/UX design tracks constitute <strong>48%</strong> of total course engagement.
          </p>
        </div>
      </div>

      {/* ── Section 3: Trainee Roster Table ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-64">
              <i className="ph ph-magnifying-glass absolute right-2.5 top-1/2 -translate-y-1/2 text-default text-xs"></i>
              <input
                type="text"
                placeholder="Search trainee, role, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 pe-8 py-1.5 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>

          <span className="text-xs text-muted-foreground">
            Showing <strong>{filteredTrainees.length}</strong> of {enrollments.length} enrollments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-default border-b border-border-color bg-slate-50/50 dark:bg-slate-800/40">
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Employee</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Designation</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Enrolled Course</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="text-center py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Score</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Completed On</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Certificate No</th>
                <th className="text-center py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrainees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-default">
                    No trainee enrollment records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTrainees.map((t: any) => {
                  const empName = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.trim() || "Staff Member";
                  const isCompleted = t.status === "completed";
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border-color hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                            {empName.charAt(0)}
                          </div>
                          <span className="font-semibold text-title">{empName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-default">{t.employee?.position || "Employee"}</td>
                      <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">{t.course?.title || "Course"}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block capitalize ${
                            isCompleted
                              ? "bg-success-transparent text-success"
                              : t.status === "in_progress"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-slate-100 dark:bg-slate-800 text-default"
                          }`}
                        >
                          {t.status ? t.status.replace("_", " ") : "Not Started"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold">
                        {t.score ? `${t.score}%` : "—"}
                      </td>
                      <td className="py-3 px-3 text-default">
                        {t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-3 text-default font-mono text-[11px]">{t.certificateId || "—"}</td>
                      <td className="py-3 px-3 text-center">
                        {t.certificateId ? (
                          <span className="text-[10px] font-semibold text-success bg-success-transparent px-2 py-0.5 rounded flex items-center justify-center gap-1 w-max mx-auto">
                            <i className="ph-bold ph-check text-xs"></i> Issued
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
