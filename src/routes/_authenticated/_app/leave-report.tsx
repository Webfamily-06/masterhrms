import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarX2,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  TrendingUp,
  Loader2,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/leave-report")({
  component: LeaveReportPage,
  head: () => ({
    meta: [{ title: "Leave Report — Master HRMS" }],
  }),
});

export function LeaveReportPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Query Leave Types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/leave/types");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Query Leave Requests
  const { data: leaveData, isLoading } = useQuery({
    queryKey: ["leave-report", tenantId, selectedStatus, selectedType],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedStatus !== "all") params.append("status", selectedStatus);
        if (selectedType !== "all") params.append("leaveTypeId", selectedType);
        params.append("limit", "100");
        const res: any = await api.get(`/leave/requests?${params.toString()}`);
        return Array.isArray(res) ? res : (res?.data || []);
      } catch {
        return [];
      }
    },
  });

  const requests: any[] = Array.isArray(leaveData) ? leaveData : [];

  // Filter locally by search term
  const filtered = requests.filter((r) => {
    const emp = r.employee || {};
    const empName = `${emp.firstName || ""} ${emp.lastName || ""}`;
    const empCode = emp.employeeCode || "";
    const reason = r.reason || "";
    return (
      empName.toLowerCase().includes(search.toLowerCase()) ||
      empCode.toLowerCase().includes(search.toLowerCase()) ||
      reason.toLowerCase().includes(search.toLowerCase())
    );
  });

  // KPIs
  const totalLeaves = requests.length;
  const approvedLeaves = requests.filter((r) => r.status === "approved").length;
  const pendingLeaves = requests.filter((r) => r.status === "pending").length;
  const rejectedLeaves = requests.filter((r) => r.status === "rejected").length;
  const totalDaysApproved = requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + (Number(r.days) || 0), 0);

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No leave records to export");
    const headers = [
      "Employee Code",
      "Employee Name",
      "Department",
      "Leave Type",
      "From Date",
      "To Date",
      "Days",
      "Reason",
      "Status",
      "Applied Date",
    ];
    const rows = filtered.map((r) => {
      const emp = r.employee || {};
      return [
        `"${emp.employeeCode || ""}"`,
        `"${emp.firstName || ""} ${emp.lastName || ""}"`,
        `"${emp.department?.name || "General"}"`,
        `"${r.leaveType?.name || "Casual Leave"}"`,
        r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : "",
        r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : "",
        r.days || 1,
        `"${(r.reason || "").replace(/"/g, '""')}"`,
        r.status,
        r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `leave-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Leave report exported successfully!");
  }

  return (
    <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
      {/* ── Breadcrumb & Top Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CalendarX2 className="size-6 text-primary" /> Leave & PTO Report
          </h1>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Link to="/hrm-dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <Link to="/leave" className="hover:text-foreground transition-colors">
              Leave & PTO
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="font-semibold text-foreground">Leave Report</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="size-3.5" /> Export Report (CSV)
          </Button>
        </div>
      </div>

      {/* ── KPI Visual Progress Cards (matching ui-2/leave-report.html) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Total Leave Applications</span>
            <div className="size-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <Calendar className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight">{totalLeaves} Applications</div>
            <div className="mt-2 p-1.5 rounded bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Total Days Approved:</span>
              <strong className="text-foreground font-mono">{totalDaysApproved} days</strong>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Approved Leaves</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 grid place-items-center text-emerald-600">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-emerald-600">
              {approvedLeaves} Approved
            </div>
            <div className="mt-2 p-1.5 rounded bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span>Approval Rate:</span>
              <strong className="font-mono">
                {totalLeaves > 0 ? ((approvedLeaves / totalLeaves) * 100).toFixed(0) : 100}%
              </strong>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Pending Approval</span>
            <div className="size-8 rounded-lg bg-amber-500/10 grid place-items-center text-amber-600">
              <Clock className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-amber-600">
              {pendingLeaves} Requests
            </div>
            <div className="mt-2 p-1.5 rounded bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>Awaiting Manager Review</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Rejected / Cancelled</span>
            <div className="size-8 rounded-lg bg-rose-500/10 grid place-items-center text-rose-600">
              <XCircle className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-rose-600">
              {rejectedLeaves} Requests
            </div>
            <div className="mt-2 p-1.5 rounded bg-rose-500/10 text-[11px] text-rose-700 dark:text-rose-400 flex items-center justify-between">
              <span>Non-Compliant or Conflict</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
      <Card className="p-4 border shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name, code, or reason..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[160px] text-xs h-9">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px] text-xs h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Leave Records Table ─────────────────────────────────────────── */}
      <Card className="border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Employee
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Leave Type
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  From Date
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  To Date
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Duration
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Reason / Notes
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading leave report...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No leave requests found for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const emp = r.employee || {};
                  const empName = `${emp.firstName || "Employee"} ${emp.lastName || ""}`;
                  const empCode = emp.employeeCode || "EMP";
                  const deptName = emp.department?.name || "General";

                  const statusMap: Record<string, { label: string; className: string }> = {
                    approved: {
                      label: "APPROVED",
                      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                    },
                    pending: {
                      label: "PENDING",
                      className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                    },
                    rejected: {
                      label: "REJECTED",
                      className: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
                    },
                  };

                  const currentStatus = statusMap[r.status] || {
                    label: r.status,
                    className: "bg-muted text-muted-foreground",
                  };

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border">
                            <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                              {empName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {empName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {empCode} • {deptName}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold"
                          style={{
                            borderColor: r.leaveType?.color || "#3B82F6",
                            color: r.leaveType?.color || "#3B82F6",
                          }}
                        >
                          {r.leaveType?.name || "Casual Leave"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.startDate
                          ? new Date(r.startDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.endDate
                          ? new Date(r.endDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {r.days || 1} {r.days === 1 ? "day" : "days"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {r.reason || "Personal work"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-bold border-0 ${currentStatus.className}`}>
                          {currentStatus.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
