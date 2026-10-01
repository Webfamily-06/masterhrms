import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  UserCheck,
  UserX,
  CheckSquare,
  Clock,
  Download,
  Calendar,
  Search,
  RotateCw,
  Home,
  User,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/daily-report")({
  component: DailyReportPage,
  head: () => ({ meta: [{ title: "Daily Attendance & Operations Report — Master ERP" }] }),
});

function fmtReportDate(d: string | null | undefined) {
  if (!d) return "-";
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return String(d);
  }
}

export function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");

  // ─── Query ────────────────────────────────────────────────────────────────
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["attendance-daily-report", selectedDate, statusFilter, sortOrder],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (selectedDate) p.append("date", selectedDate);
      if (statusFilter && statusFilter !== "all") p.append("status", statusFilter);
      p.append("sort", sortOrder);
      const res = await api.get(`/attendance/daily-report?${p.toString()}`);
      return res?.data || res || {};
    },
  });

  const metrics = reportData?.metrics || {
    totalPresent: 300,
    completedTasks: 100,
    totalAbsent: 15,
    pendingTasks: 125,
  };

  const records: any[] = reportData?.records || [];
  const monthlyTrends: any[] = reportData?.monthlyTrends || [
    { month: "Jan", present: 220, absent: 14 },
    { month: "Feb", present: 235, absent: 18 },
    { month: "Mar", present: 240, absent: 12 },
    { month: "Apr", present: 250, absent: 15 },
    { month: "May", present: 230, absent: 20 },
    { month: "Jun", present: 260, absent: 10 },
    { month: "Jul", present: 245, absent: 16 },
    { month: "Aug", present: 255, absent: 14 },
    { month: "Sep", present: 240, absent: 15 },
    { month: "Oct", present: 265, absent: 11 },
    { month: "Nov", present: 250, absent: 13 },
    { month: "Dec", present: 270, absent: 9 },
  ];

  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const headers = ["Employee Name", "Email", "Department", "Date", "Status", "Hours"];
    const rows = filteredRecords.map((r) => [
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.department}"`,
      `"${fmtReportDate(r.date)}"`,
      `"${r.status}"`,
      r.hours,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Daily report exported successfully");
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* ─── Breadcrumb & Top Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/" className="hover:text-primary flex items-center gap-1">
              <Home className="size-3" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <span className="text-muted-foreground">Reports</span>
            <span>/</span>
            <span className="text-foreground font-medium">Daily Report</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="size-6 text-primary" />
            <span>Daily Report</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-departmental daily operational status, employee attendance, and task execution progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs gap-1.5 h-8"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs gap-1.5 h-8"
          >
            <RotateCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ─── Top Stats & Attendance Chart ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Side: 4 KPI Cards (2x2) */}
        <div className="xl:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Total Present */}
          <Card className="shadow-none border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Total Present
                </p>
                <h3 className="text-2xl font-bold text-foreground">
                  {metrics.totalPresent}
                </h3>
              </div>
              <div className="size-11 rounded-full border border-primary/20 bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="size-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Completed Tasks */}
          <Card className="shadow-none border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Completed Tasks
                </p>
                <h3 className="text-2xl font-bold text-foreground">
                  {metrics.completedTasks}
                </h3>
              </div>
              <div className="size-11 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckSquare className="size-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Total Absent */}
          <Card className="shadow-none border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Total Absent
                </p>
                <h3 className="text-2xl font-bold text-foreground">
                  {metrics.totalAbsent}
                </h3>
              </div>
              <div className="size-11 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <UserX className="size-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Pending Tasks */}
          <Card className="shadow-none border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Pending Tasks
                </p>
                <h3 className="text-2xl font-bold text-foreground">
                  {metrics.pendingTasks}
                </h3>
              </div>
              <div className="size-11 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Clock className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Daily Attendance Chart Card */}
        <div className="xl:col-span-6">
          <Card className="shadow-none border h-full">
            <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">Daily Attendance Trends</CardTitle>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="size-2.5 rounded bg-emerald-500" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="size-2.5 rounded bg-rose-500" />
                  <span>Absent</span>
                </div>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-7 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              {/* Monthly Visual Comparison Bars */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-center pt-2">
                {monthlyTrends.map((t: any) => {
                  const maxVal = 300;
                  const presentH = Math.round((t.present / maxVal) * 90);
                  const absentH = Math.round((t.absent / maxVal) * 90);

                  return (
                    <div key={t.month} className="flex flex-col items-center">
                      <div className="h-[95px] w-full flex items-end justify-center gap-0.5 pb-1">
                        <div
                          className="w-2 sm:w-2.5 bg-emerald-500 rounded-t-sm"
                          style={{ height: `${presentH}px` }}
                          title={`Present: ${t.present}`}
                        />
                        <div
                          className="w-2 sm:w-2.5 bg-rose-500 rounded-t-sm"
                          style={{ height: `${absentH}px` }}
                          title={`Absent: ${t.absent}`}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                        {t.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Daily Attendance List ─────────────────────────────────────────── */}
      <Card className="shadow-none border">
        <CardHeader className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Daily Attendance List</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input */}
            <div className="relative w-44 sm:w-56">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(v: "desc" | "asc") => setSortOrder(v)}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Sort: Newest</SelectItem>
                <SelectItem value="asc">Sort: Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <RotateCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
              Loading daily report...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No attendance records found for this criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Working Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r) => {
                  const isPresent = r.status === "present";
                  const isAbsent = r.status === "absent";
                  const isLate = r.status === "late";

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs border">
                            {r.name?.charAt(0) || "E"}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">
                              {r.name}
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {r.email || r.position || "-"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtReportDate(r.date)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {r.department}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {r.hours ? `${r.hours} hrs` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-medium gap-1",
                            isPresent &&
                              "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
                            isAbsent &&
                              "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
                            isLate &&
                              "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
                            !isPresent &&
                              !isAbsent &&
                              !isLate &&
                              "bg-blue-50 text-blue-700 border-blue-200"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              isPresent && "bg-emerald-500",
                              isAbsent && "bg-rose-500",
                              isLate && "bg-amber-500"
                            )}
                          />
                          <span className="capitalize">{r.status}</span>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
