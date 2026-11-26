'use client';

import { useState } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { format } from "date-fns";

export default function HrLeaveReportPage() {
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
        const res: any = await api.get("/leave/types");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Query Leave Requests
  const { data: leaveData, isLoading } = useQuery({
    queryKey: ["hr-leave-report", tenantId, selectedStatus, selectedType],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedStatus !== "all") params.append("status", selectedStatus);
        if (selectedType !== "all") params.append("leaveTypeId", selectedType);
        params.append("limit", "100");
        const res: any = await api.get(`/leave/requests?${params.toString()}`);
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
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
    const term = search.toLowerCase();
    return (
      empName.toLowerCase().includes(term) ||
      empCode.toLowerCase().includes(term) ||
      reason.toLowerCase().includes(term)
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
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Leave & PTO Report"
        description="Comprehensive workforce absence analytics, leave allowance utilization, and approval statuses across departments."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/hr/leave/balances">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-hourglass-high text-sm" />
                <span>Leave Balances</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-download-simple text-sm" />
              <span>Export CSV</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Visual Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Total Applications</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className="ph ph-calendar text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{totalLeaves} Leaves</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recorded in current cycle</p>
            </div>
            <div className="text-[11px] text-primary font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-chart-line-up text-xs" />
              <span>All Types</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Approved Leaves</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{approvedLeaves} Authorized</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Deducted from employee balances</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-shield-check text-xs" />
              <span>Authorized Absence</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Pending Approval</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-clock text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{pendingLeaves} Pending</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting manager authorization</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-hourglass-high text-xs" />
              <span>In Pipeline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Rejected / Cancelled</span>
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <i className="ph ph-x-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-rose-600">{rejectedLeaves} Rejected</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Declined or withdrawn requests</p>
            </div>
            <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-prohibit text-xs" />
              <span>Declined</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="relative w-full sm:w-80">
          <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
          <Input
            placeholder="Search employee, ID or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-9 text-xs w-40">
              <SelectValue placeholder="All Leave Types" />
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
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Data Table ── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Emp ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Employee</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Department</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Leave Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Dates</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Days</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Reason</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                    Loading leave report records...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground italic">
                    No leave records found matching your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r: any) => {
                  const emp = r.employee || {};
                  const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Staff Member";

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/40 transition-colors text-xs">
                      <TableCell className="p-3 tabular-nums font-bold text-muted-foreground">
                        {emp.employeeCode || "EMP-001"}
                      </TableCell>

                      <TableCell className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8 border border-border/60">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {emp.firstName?.[0] || "E"}{emp.lastName?.[0] || "M"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground block">{fullName}</span>
                            <span className="text-[10px] text-muted-foreground">{emp.position || "Employee"}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="p-3 text-muted-foreground">
                        {emp.department?.name || "General"}
                      </TableCell>

                      <TableCell className="p-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold"
                          style={{
                            borderColor: r.leaveType?.color ? `${r.leaveType.color}40` : undefined,
                            color: r.leaveType?.color,
                          }}
                        >
                          {r.leaveType?.name || "Leave"}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-3 tabular-nums text-muted-foreground">
                        {r.startDate ? format(new Date(r.startDate), "dd MMM yyyy") : "—"} →{" "}
                        {r.endDate ? format(new Date(r.endDate), "dd MMM yyyy") : "—"}
                      </TableCell>

                      <TableCell className="p-3 tabular-nums font-bold text-primary">
                        {r.days || 1} day(s)
                      </TableCell>

                      <TableCell className="p-3 max-w-[200px] truncate text-muted-foreground" title={r.reason}>
                        {r.reason || "—"}
                      </TableCell>

                      <TableCell className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold capitalize",
                            r.status === "approved" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            r.status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                            r.status === "rejected" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          )}
                        >
                          {r.status}
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
