import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
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
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatsOverviewGrid } from "@/components/ui/stats-overview-grid";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { toast } from "sonner";
import {
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
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

  // Calculate Metrics
  const totalLeaves = requests.length;
  const approvedLeaves = requests.filter((r) => r.status === "approved").length;
  const pendingLeaves = requests.filter((r) => r.status === "pending").length;
  const rejectedLeaves = requests.filter((r) => r.status === "rejected").length;

  function exportCSV() {
    if (filtered.length === 0) {
      toast.error("No leave records available to export");
      return;
    }

    const headers = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Leave Type",
      "Start Date",
      "End Date",
      "Days",
      "Reason",
      "Status",
      "Created At",
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
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Leave & PTO Report"
        description="Workforce absence analytics, leave allowance utilization, and approval statuses."
        breadcrumbs={[
          { label: "Home" },
          { label: "Leave & PTO" },
          { label: "Leave Report" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Download className="size-3.5 text-muted-foreground" />
            Export Report (CSV)
          </Button>
        }
      />

      {/* ── KPI Visual Stat Cards ── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Applications"
          value={totalLeaves}
          icon={<Calendar className="size-5" />}
          variant="default"
          isLoading={isLoading}
        />
        <StatCard
          label="Approved Leaves"
          value={approvedLeaves}
          icon={<CheckCircle2 className="size-5" />}
          variant="success"
          isLoading={isLoading}
        />
        <StatCard
          label="Pending Approval"
          value={pendingLeaves}
          icon={<Clock className="size-5" />}
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Rejected / Cancelled"
          value={rejectedLeaves}
          icon={<XCircle className="size-5" />}
          variant="rose"
          isLoading={isLoading}
        />
      </StatsOverviewGrid>

      {/* ── Filter Toolbar ── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search employee name, code, or reason...",
        }}
        filters={
          <div className="flex items-center gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px] h-8.5 text-xs">
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
              <SelectTrigger className="w-[130px] h-8.5 text-xs">
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
        }
      />

      {/* ── Leave Applications Table ── */}
      <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">Employee</TableHead>
                <TableHead className="w-36">Leave Type</TableHead>
                <TableHead className="w-24 text-center">Days</TableHead>
                <TableHead className="w-48">Date Range</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-28 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Loading leave records...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    No leave requests found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const emp = r.employee || {};
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border">
                            <AvatarImage src={emp.avatarUrl || ""} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                              {(emp.firstName?.[0] || "E") + (emp.lastName?.[0] || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-xs font-bold text-foreground">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {emp.employeeCode || "EMP-000"} • {emp.department?.name || "General"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold bg-muted/30">
                          {r.leaveType?.name || "Casual Leave"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs font-mono">
                        {r.days || 1}d
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.startDate ? new Date(r.startDate).toLocaleDateString() : "-"}
                        {" → "}
                        {r.endDate ? new Date(r.endDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground max-w-sm truncate" title={r.reason || ""}>
                          {r.reason || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            r.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                              : r.status === "rejected"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                          }
                        >
                          {r.status || "pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
