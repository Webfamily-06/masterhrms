import { useState, lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  CalendarCheck,
  Wallet,
  Clock,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Package,
  Briefcase,
  Download,
  ArrowLeft,
  Search,
  Loader2,
  Table as TableIcon,
  BarChart3,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

const Chart = lazy(() => import("react-apexcharts"));

export interface ReportMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: any;
  defaultView: "calendar" | "grouped" | "chart" | "analytics" | "table";
}

export const REPORT_DICTIONARY: Record<string, ReportMeta> = {
  "attendance-summary": {
    id: "attendance-summary",
    title: "Attendance Summary Report",
    description: "Employee work hours, present days, tardiness, and overtime logs.",
    category: "HRM & Workforce",
    icon: CalendarCheck,
    defaultView: "calendar",
  },
  "payroll-sheet": {
    id: "payroll-sheet",
    title: "Payroll Sheet Report",
    description: "Gross earnings, statutory deductions, and net salary disbursements.",
    category: "HRM & Payroll",
    icon: Wallet,
    defaultView: "chart",
  },
  "leave-report": {
    id: "leave-report",
    title: "Leave Utilization Report",
    description: "Annual leave quotas, taken days, pending requests, and balance allocations.",
    category: "HRM & Workforce",
    icon: Clock,
    defaultView: "table",
  },
  "sales-invoice": {
    id: "sales-invoice",
    title: "Sales Invoice Summary Report",
    description: "B2B client invoices, tax totals, paid amounts, and aging accounts receivable.",
    category: "Finance & Sales",
    icon: Receipt,
    defaultView: "grouped",
  },
  "purchase-invoice": {
    id: "purchase-invoice",
    title: "Purchase Invoice Summary Report",
    description: "Vendor bills, procurement costs, payment status, and pending accounts payable.",
    category: "Finance & Purchases",
    icon: ShoppingBag,
    defaultView: "grouped",
  },
  "deal-pipeline": {
    id: "deal-pipeline",
    title: "Deal Pipeline Report",
    description: "CRM opportunities, stage probabilities, expected close dates, and values.",
    category: "Sales & CRM",
    icon: TrendingUp,
    defaultView: "analytics",
  },
  "product-stock": {
    id: "product-stock",
    title: "Product Stock Inventory Report",
    description: "Warehouse on-hand quantities, cost valuation, and low stock warnings.",
    category: "Operations & Inventory",
    icon: Package,
    defaultView: "analytics",
  },
  "project-progress": {
    id: "project-progress",
    title: "Project Progress Report",
    description: "Client deliverables, task completion percentages, and milestone statuses.",
    category: "Operations & Delivery",
    icon: Briefcase,
    defaultView: "analytics",
  },
};

interface SmartReportDetailViewProps {
  reportId: string;
}

export function SmartReportDetailView({ reportId }: SmartReportDetailViewProps) {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { isEntitled, isLoading: isNavLoading } = useNavigationResolver();
  const hasEntitlement = isEntitled("smart-reports");

  const reportMeta = REPORT_DICTIONARY[reportId];

  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<string>(
    reportMeta?.defaultView || "table"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>("p1");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "XYZ Industries": true,
    "Apex Hardware Supplies": true,
  });

  const reportQuery = useQuery({
    queryKey: ["smart-report-data", tenantId, reportId],
    queryFn: async () => {
      try {
        const res = await api.get(`/smart-reports/${reportId}`);
        return res?.data;
      } catch (err: any) {
        if (err?.response?.status === 403) {
          throw new Error("RBAC_FORBIDDEN: Insufficient permissions to view this report.");
        }
        throw err;
      }
    },
    enabled: hasEntitlement && !!reportMeta,
  });

  const handleExport = async (format: "csv" | "json") => {
    try {
      const res = await api.get(`/smart-reports/export/${reportId}?format=${format}`);
      const blob = new Blob(
        [format === "csv" ? res?.csv || res : JSON.stringify(res, null, 2)],
        { type: format === "csv" ? "text/csv" : "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportId}-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${reportMeta?.title || reportId} as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export report data");
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isNavLoading && !hasEntitlement) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <AddonNotInstalled
          addonName="Smart Reports"
          addonSlug="smart-reports"
          category="Finance"
          description="Custom report builder with automated scheduling, drill-down financial metrics, and executive PDF summaries."
        />
      </div>
    );
  }

  if (!reportMeta) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <BreadcrumbNav />
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="text-center py-12">
            <div className="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="size-6" />
            </div>
            <CardTitle className="text-xl">Report Not Found</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2">
              The requested report identifier <span className="font-mono text-foreground font-semibold">"{reportId}"</span> does not exist in the Smart Reports catalogue.
            </CardDescription>
            <div className="pt-6">
              <Button asChild>
                <Link to="/smart-reports" search={{ report: undefined }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Reports Catalogue
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const Icon = reportMeta.icon;
  const data = reportQuery.data;

  // View toggle options per report type
  const getViewButtons = () => {
    switch (reportId) {
      case "attendance-summary":
        return [
          { key: "calendar", label: "Calendar View", icon: Calendar },
          { key: "table", label: "Table View", icon: TableIcon },
        ];
      case "payroll-sheet":
        return [
          { key: "chart", label: "Comparison Chart", icon: BarChart3 },
          { key: "table", label: "Salary Records", icon: TableIcon },
        ];
      case "sales-invoice":
      case "purchase-invoice":
        return [
          { key: "grouped", label: reportId === "sales-invoice" ? "By Customer" : "By Vendor", icon: Layers },
          { key: "table", label: "All Invoices", icon: TableIcon },
        ];
      case "deal-pipeline":
      case "project-progress":
      case "product-stock":
        return [
          { key: "analytics", label: "Analytics & Split", icon: BarChart3 },
          { key: "table", label: "Records Table", icon: TableIcon },
        ];
      default:
        return [
          { key: "table", label: "Table", icon: TableIcon },
          { key: "chart", label: "Chart", icon: BarChart3 },
        ];
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-3 mt-1">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link to="/smart-reports" search={{ report: undefined }} title="Back to Catalogue">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{reportMeta.title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">{reportMeta.category}</Badge>
                  <span className="text-xs text-muted-foreground">{reportMeta.description}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom View Selector */}
          <div className="flex items-center rounded-lg border p-1 bg-muted/40">
            {getViewButtons().map((b) => {
              const BIcon = b.icon;
              return (
                <Button
                  key={b.key}
                  variant={activeView === b.key ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs font-medium"
                  onClick={() => setActiveView(b.key)}
                >
                  <BIcon className="h-3.5 w-3.5 mr-1" />
                  {b.label}
                </Button>
              );
            })}
          </div>

          <Button size="sm" variant="outline" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button size="sm" onClick={() => handleExport("json")}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      {/* Loading & Error States */}
      {reportQuery.isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Fetching report data and compiling live analytics...</p>
        </div>
      ) : reportQuery.error ? (
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="text-center py-8">
            <div className="size-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="size-5" />
            </div>
            <CardTitle className="text-base font-semibold">Access Restricted</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-1">
              {(reportQuery.error as Error).message || "Unable to retrieve report records."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : data ? (
        <div className="space-y-6">
          {/* ─── SUMMARY KPI METRICS BAR ─── */}
          {data.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(data.metrics).map(([key, value]: [string, any]) => (
                <Card key={key} className="p-3">
                  <div className="text-[11px] font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </div>
                  <div className="text-lg font-bold mt-0.5">
                    {typeof value === "number" && (key.toLowerCase().includes("pay") || key.toLowerCase().includes("cost") || key.toLowerCase().includes("value") || key.toLowerCase().includes("invoiced") || key.toLowerCase().includes("budget") || key.toLowerCase().includes("amount") || key.toLowerCase().includes("due"))
                      ? `$${Math.round(value).toLocaleString()}`
                      : typeof value === "number" && (key.toLowerCase().includes("rate") || key.toLowerCase().includes("progress") || key.toLowerCase().includes("pct"))
                      ? `${value}%`
                      : value}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 1: ATTENDANCE CALENDAR MATRIX (image2.png)
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "attendance-summary" && activeView === "calendar" && data.calendarRows && (
            <div className="space-y-4">
              {/* Toolbar & Legend Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    Month: June 2026
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Showing daily presence for {data.calendarRows.length} active employees
                  </span>
                </div>

                {/* Legend matching image2.png */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-emerald-500" /> P: Present
                  </span>
                  <span className="flex items-center gap-1 font-medium text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-rose-500" /> A: Absent
                  </span>
                  <span className="flex items-center gap-1 font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-amber-500" /> HD: Half Day
                  </span>
                  <span className="flex items-center gap-1 font-medium text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-purple-500" /> L: Leave
                  </span>
                  <span className="flex items-center gap-1 font-medium text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-blue-500" /> H: Holiday
                  </span>
                  <span className="flex items-center gap-1 font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-muted-foreground" /> WE: Weekend
                  </span>
                </div>
              </div>

              {/* Matrix Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto max-h-[650px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-muted/70 sticky top-0 z-20 border-b">
                      <tr>
                        <th className="p-3 sticky left-0 z-30 bg-muted/90 min-w-[200px] border-r font-semibold">
                          Employee Details
                        </th>
                        {data.daysInView?.map((d: any) => (
                          <th
                            key={d.day}
                            className={`p-2 text-center min-w-[34px] border-r font-semibold text-[11px] ${
                              d.day === data.todayDay ? "bg-primary/20 text-primary border-primary/40" : ""
                            }`}
                          >
                            <div className="text-[9px] text-muted-foreground font-normal">{d.dow}</div>
                            <div>{d.day}</div>
                          </th>
                        ))}
                        <th className="p-2 text-center min-w-[60px] font-semibold bg-muted/80 border-r">Pres</th>
                        <th className="p-2 text-center min-w-[60px] font-semibold bg-muted/80 border-r">Abs</th>
                        <th className="p-2 text-center min-w-[60px] font-semibold bg-muted/80 border-r">Leave</th>
                        <th className="p-2 text-center min-w-[70px] font-semibold bg-muted/80">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.calendarRows.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-muted/30">
                          {/* Sticky Employee column */}
                          <td className="p-2.5 sticky left-0 z-10 bg-card border-r">
                            <div className="font-semibold text-foreground text-xs">{emp.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono">{emp.code}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground truncate max-w-[100px]">
                                {emp.department}
                              </span>
                            </div>
                          </td>

                          {/* Days Cells */}
                          {data.daysInView?.map((d: any) => {
                            const statusObj = emp.days?.[d.day] || { status: "weekend" };
                            const st = statusObj.status;
                            return (
                              <td
                                key={d.day}
                                className={`p-1 text-center border-r align-middle ${
                                  d.day === data.todayDay ? "bg-primary/5" : ""
                                }`}
                              >
                                {st === "present" ? (
                                  <span
                                    className={`inline-block size-6 leading-6 rounded text-[10px] font-bold text-center ${
                                      statusObj.overtime
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    }`}
                                    title={`Present - ${statusObj.hours || 8}h`}
                                  >
                                    P
                                  </span>
                                ) : st === "absent" ? (
                                  <span
                                    className="inline-block size-6 leading-6 rounded text-[10px] font-bold text-center bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                    title="Absent"
                                  >
                                    A
                                  </span>
                                ) : st === "half_day" ? (
                                  <span
                                    className="inline-block size-6 leading-6 rounded text-[10px] font-bold text-center bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                    title="Half Day (4h)"
                                  >
                                    HD
                                  </span>
                                ) : st === "on_leave" ? (
                                  <span
                                    className="inline-block size-6 leading-6 rounded text-[10px] font-bold text-center bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                    title="Approved Leave"
                                  >
                                    L
                                  </span>
                                ) : st === "holiday" ? (
                                  <span
                                    className="inline-block size-6 leading-6 rounded text-[10px] font-bold text-center bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                    title="Company Holiday"
                                  >
                                    H
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Summary numbers */}
                          <td className="p-2 text-center border-r font-semibold text-emerald-600">
                            {emp.presentDays}
                          </td>
                          <td className="p-2 text-center border-r font-semibold text-rose-600">
                            {emp.absentDays}
                          </td>
                          <td className="p-2 text-center border-r font-semibold text-purple-600">
                            {emp.leaveDays}
                          </td>
                          <td className="p-2 text-center font-bold">
                            {emp.totalHours}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 2: PAYROLL COMPARISON CHART (image6.png)
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "payroll-sheet" && activeView === "chart" && data.chartData && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-base font-semibold">Salary Breakdown Across Employees</h3>
                    <p className="text-xs text-muted-foreground">
                      Comparing Gross Pay, Net Pay, and Deductions across executive workforce
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-blue-500" /> Gross Pay</span>
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-emerald-500" /> Net Pay</span>
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-rose-500" /> Deductions</span>
                  </div>
                </div>

                <div className="h-96">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                    <Chart
                      type="line"
                      height="100%"
                      series={data.chartData.series}
                      options={{
                        chart: { toolbar: { show: false }, zoom: { enabled: false } },
                        colors: ["#3b82f6", "#10b981", "#ef4444"],
                        stroke: { curve: "smooth", width: [3, 3, 2] },
                        xaxis: {
                          categories: data.chartData.categories,
                          labels: { rotate: -25, style: { fontSize: "11px" } },
                        },
                        yaxis: {
                          labels: { formatter: (val: number) => `$${(val / 1000).toFixed(0)}k` },
                        },
                        markers: { size: 4 },
                        grid: { borderColor: "#f1f5f9" },
                      }}
                    />
                  </Suspense>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 3: SALES / PURCHASE GROUPED VIEW (image3.png)
             ═══════════════════════════════════════════════════════════════ */}
          {(reportId === "sales-invoice" || reportId === "purchase-invoice") && activeView === "grouped" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">
                    {reportId === "sales-invoice" ? "Invoices Grouped By Customer" : "Invoices Grouped By Vendor"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Collection efficiency and balance aging across client accounts
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {(data.customerGroups || data.vendorGroups)?.length || 0} Accounts
                </Badge>
              </div>

              {/* Grouped Accordion / Cards List */}
              <div className="space-y-3">
                {(data.customerGroups || data.vendorGroups)?.map((group: any) => {
                  const name = group.customerName || group.vendorName;
                  const isExpanded = !!expandedGroups[name];
                  const pct = group.collectionPct ?? group.paymentPct ?? 0;

                  return (
                    <Card key={name} className="overflow-hidden border">
                      <div
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => toggleGroup(name)}
                      >
                        <div className="flex items-center gap-3">
                          <button className="text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div>
                            <div className="font-bold text-sm text-foreground">{name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{group.email}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs md:text-right items-center">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Invoices</span>
                            <span className="font-semibold">{group.totalInvoices}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Total Amount</span>
                            <span className="font-semibold">${Math.round(group.totalAmount).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Paid Amount</span>
                            <span className="font-semibold text-emerald-600">${Math.round(group.paidAmount).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Balance Due</span>
                            <span className="font-semibold text-rose-600">${Math.round(group.balanceDue).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full md:w-36 space-y-1">
                          <div className="flex justify-between text-[10px] font-medium">
                            <span>Settled</span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </div>

                      {/* Expandable Invoices Table */}
                      {isExpanded && group.invoices?.length > 0 && (
                        <div className="border-t bg-muted/20 p-4">
                          <table className="w-full text-xs text-left">
                            <thead className="text-muted-foreground border-b text-[11px]">
                              <tr>
                                <th className="pb-2 font-medium">Invoice #</th>
                                <th className="pb-2 font-medium">Warehouse</th>
                                <th className="pb-2 font-medium">Date</th>
                                <th className="pb-2 font-medium">Due Date</th>
                                <th className="pb-2 font-medium">Total</th>
                                <th className="pb-2 font-medium">Paid</th>
                                <th className="pb-2 font-medium">Balance</th>
                                <th className="pb-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {group.invoices.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-muted/40">
                                  <td className="py-2 font-mono font-medium">{inv.invoiceNo}</td>
                                  <td className="py-2 text-muted-foreground">{inv.warehouse}</td>
                                  <td className="py-2">{inv.date}</td>
                                  <td className="py-2">{inv.dueDate}</td>
                                  <td className="py-2 font-semibold">${inv.amount.toLocaleString()}</td>
                                  <td className="py-2 text-emerald-600 font-medium">${inv.paidAmount.toLocaleString()}</td>
                                  <td className="py-2 text-rose-600 font-medium">${inv.balance.toLocaleString()}</td>
                                  <td className="py-2">
                                    <Badge variant="outline" className="text-[10px] capitalize">
                                      {inv.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 4: DEAL PIPELINE SPLIT VIEW (image4/image7)
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "deal-pipeline" && activeView === "analytics" && data.pipelineGroups && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Grouped Funnel Chart (image4.png) */}
              <Card className="lg:col-span-5 p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold">Deal Pipeline Stages</h3>
                  <p className="text-xs text-muted-foreground">Active, Won, and Lost deal distribution</p>
                </div>
                <div className="h-80 mt-4">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                    <Chart
                      type="bar"
                      height="100%"
                      series={data.chartSeries}
                      options={{
                        chart: { stacked: true, toolbar: { show: false } },
                        colors: ["#3b82f6", "#10b981", "#ef4444"],
                        plotOptions: { bar: { horizontal: true, barHeight: "60%" } },
                        xaxis: { categories: data.categories },
                        legend: { position: "top" },
                      }}
                    />
                  </Suspense>
                </div>
              </Card>

              {/* Right Column: Pipeline Group Table */}
              <Card className="lg:col-span-7 overflow-hidden">
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-sm font-semibold">Pipeline Performance Breakdown</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-3 font-semibold">Pipeline</th>
                        <th className="p-3 font-semibold text-center">Total Deals</th>
                        <th className="p-3 font-semibold text-center text-blue-600">Active</th>
                        <th className="p-3 font-semibold text-center text-emerald-600">Won</th>
                        <th className="p-3 font-semibold text-center text-rose-600">Loss</th>
                        <th className="p-3 font-semibold text-center">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.pipelineGroups.map((p: any) => {
                        const rate = Math.round((p.won / p.total) * 100);
                        return (
                          <tr key={p.pipeline} className="hover:bg-muted/30">
                            <td className="p-3 font-semibold">{p.pipeline}</td>
                            <td className="p-3 text-center">{p.total}</td>
                            <td className="p-3 text-center font-medium text-blue-600">{p.active}</td>
                            <td className="p-3 text-center font-medium text-emerald-600">{p.won}</td>
                            <td className="p-3 text-center font-medium text-rose-600">{p.loss}</td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="text-[10px]">
                                {rate}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 5: PROJECT PROGRESS SPLIT VIEW (image5.png)
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "project-progress" && activeView === "analytics" && data.projectBreakdown && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Projects Overview List */}
              <div className="lg:col-span-6 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Project to Inspect
                </h3>
                {data.projectBreakdown.map((proj: any) => (
                  <Card
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`p-4 cursor-pointer transition-all border ${
                      selectedProjectId === proj.id
                        ? "border-primary ring-1 ring-primary shadow-sm bg-primary/5"
                        : "hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{proj.name}</div>
                      <Badge
                        variant="outline"
                        className={
                          proj.health === "On Track"
                            ? "text-emerald-600 border-emerald-500/30"
                            : "text-amber-600 border-amber-500/30"
                        }
                      >
                        {proj.health}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{proj.dateRange}</div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span className="font-bold">{proj.progress}%</span>
                      </div>
                      <Progress value={proj.progress} className="h-1.5" />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Right Column: Selected Project Detail Card matching image5.png */}
              <div className="lg:col-span-6">
                {(() => {
                  const sel = data.projectBreakdown.find((p: any) => p.id === selectedProjectId) || data.projectBreakdown[0];
                  if (!sel) return null;
                  return (
                    <Card className="p-6 space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b">
                        <div>
                          <Badge variant="secondary" className="text-[10px] mb-1">{sel.status}</Badge>
                          <h3 className="text-xl font-bold">{sel.name}</h3>
                          <div className="text-xs text-muted-foreground mt-0.5">{sel.dateRange}</div>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-primary">
                          {sel.daysRemaining} Days Remaining
                        </Badge>
                      </div>

                      {/* 4 Metric Tiles from image5.png */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <span className="text-[11px] text-muted-foreground">Tasks Completed</span>
                          <div className="text-xl font-bold mt-1 text-emerald-600">
                            {sel.tasksCompleted} / {sel.totalTasks}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <span className="text-[11px] text-muted-foreground">Pending Tasks</span>
                          <div className="text-xl font-bold mt-1 text-amber-600">
                            {sel.tasksPending}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <span className="text-[11px] text-muted-foreground">Project Budget</span>
                          <div className="text-xl font-bold mt-1">
                            ${sel.budget.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <span className="text-[11px] text-muted-foreground">Milestone Cost</span>
                          <div className="text-xl font-bold mt-1 text-primary">
                            ${sel.milestoneCost.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Completion Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Overall Milestone Completion</span>
                          <span className="font-bold">{sel.progress}%</span>
                        </div>
                        <Progress value={sel.progress} className="h-2.5" />
                      </div>
                    </Card>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 6: PRODUCT STOCK SPLIT (Inventory vs Out)
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "product-stock" && activeView === "analytics" && data.categoryBreakdown && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-5 p-5">
                <h3 className="text-base font-semibold">Stock In-Hand by Category</h3>
                <p className="text-xs text-muted-foreground mb-4">Stock count distribution across store departments</p>
                <div className="h-72">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                    <Chart
                      type="bar"
                      height="100%"
                      series={[{ name: "In Stock Items", data: data.categoryBreakdown.map((c: any) => c.inStock) }]}
                      options={{
                        chart: { toolbar: { show: false } },
                        colors: ["#3b82f6"],
                        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
                        xaxis: { categories: data.categoryBreakdown.map((c: any) => c.category) },
                      }}
                    />
                  </Suspense>
                </div>
              </Card>

              <Card className="lg:col-span-7 overflow-hidden">
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-sm font-semibold">Warehouse Category Summary</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-3 font-semibold">Category</th>
                        <th className="p-3 font-semibold text-center">In Stock Items</th>
                        <th className="p-3 font-semibold text-center">Out of Stock</th>
                        <th className="p-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.categoryBreakdown.map((cat: any) => (
                        <tr key={cat.category} className="hover:bg-muted/30">
                          <td className="p-3 font-medium">{cat.category}</td>
                          <td className="p-3 text-center font-bold text-emerald-600">{cat.inStock}</td>
                          <td className="p-3 text-center font-bold text-muted-foreground">{cat.outOfStock}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                              Optimal
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STANDARD TABULAR VIEW (Fallback or toggled for all reports)
             ═══════════════════════════════════════════════════════════════ */}
          {(activeView === "table" || (!data.calendarRows && !data.chartData && !data.customerGroups && !data.pipelineGroups && !data.projectBreakdown && !data.categoryBreakdown)) && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search report records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Badge variant="outline" className="text-xs">
                    {data.records?.length || 0} Total Records
                  </Badge>
                </div>
              </div>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-y">
                        <tr>
                          {data.records?.length > 0 &&
                            Object.keys(data.records[0])
                              .filter((k) => k !== "id")
                              .map((col) => (
                                <th key={col} className="p-3 capitalize font-semibold whitespace-nowrap">
                                  {col.replace(/([A-Z])/g, " $1")}
                                </th>
                              ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.records?.length > 0 ? (
                          data.records
                            .filter((r: any) => {
                              if (!searchTerm) return true;
                              return JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase());
                            })
                            .map((r: any, idx: number) => (
                              <tr key={r.id || idx} className="hover:bg-muted/30">
                                {Object.entries(r)
                                  .filter(([k]) => k !== "id")
                                  .map(([k, val]: [string, any], vIdx) => (
                                    <td key={vIdx} className="p-3 whitespace-nowrap">
                                      {typeof val === "boolean" ? (
                                        <Badge variant={val ? "default" : "secondary"}>
                                          {val ? "Yes" : "No"}
                                        </Badge>
                                      ) : k === "status" || k === "paymentStatus" ? (
                                        <Badge
                                          variant="outline"
                                          className={`capitalize text-[10px] ${
                                            val === "paid" || val === "approved" || val === "in_stock" || val === "won"
                                              ? "text-emerald-600 border-emerald-500/30"
                                              : val === "pending" || val === "partial"
                                              ? "text-amber-600 border-amber-500/30"
                                              : ""
                                          }`}
                                        >
                                          {String(val)}
                                        </Badge>
                                      ) : typeof val === "number" && (k.toLowerCase().includes("pay") || k.toLowerCase().includes("salary") || k.toLowerCase().includes("total") || k.toLowerCase().includes("balance") || k.toLowerCase().includes("cost") || k.toLowerCase().includes("price") || k.toLowerCase().includes("value")) ? (
                                        <span className="font-semibold">${Math.round(val).toLocaleString()}</span>
                                      ) : (
                                        String(val ?? "-")
                                      )}
                                    </td>
                                  ))}
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-muted-foreground">
                              No records found for this report with active filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
