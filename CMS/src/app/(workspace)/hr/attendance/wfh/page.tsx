'use client';

import { useState } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { format, differenceInCalendarDays } from "date-fns";

export default function HrWorkFromHomePage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected" | "completed">("approved");
  const [reviewRemarks, setReviewRemarks] = useState("");

  const [form, setForm] = useState({
    employeeId: "",
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  // Queries
  const { data: wfhData, isLoading } = useQuery({
    queryKey: ["hr-wfh-requests", statusFilter, search],
    queryFn: async () => {
      try {
        const p = new URLSearchParams();
        if (statusFilter !== "all") p.append("status", statusFilter);
        if (search) p.append("search", search);
        const res: any = await api.get(`/wfh?${p.toString()}`);
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const records: any[] = Array.isArray(wfhData) ? wfhData : [];

  const { data: empData } = useQuery({
    queryKey: ["employees-mini-wfh"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/employees?limit=200");
        return res?.data || res?.employees || (Array.isArray(res) ? res : []);
      } catch {
        return [];
      }
    },
  });
  const employees: any[] = Array.isArray(empData) ? empData : [];

  // Mutations
  const createMut = useMutation({
    mutationFn: (payload: any) => api.post("/wfh", payload),
    onSuccess: () => {
      toast.success("Work from home request created.");
      qc.invalidateQueries({ queryKey: ["hr-wfh-requests"] });
      setAddOpen(false);
      setForm({
        employeeId: "",
        fromDate: new Date().toISOString().split("T")[0],
        toDate: new Date().toISOString().split("T")[0],
        reason: "",
      });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create WFH request."),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks: string }) =>
      api.put(`/wfh/${id}/review`, { status, reviewRemarks: remarks }),
    onSuccess: () => {
      toast.success("Work from home request decision saved.");
      qc.invalidateQueries({ queryKey: ["hr-wfh-requests"] });
      setReviewOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save decision."),
  });

  const allForStats = records;
  const pending = allForStats.filter((r: any) => r.status === "pending").length;
  const approved = allForStats.filter((r: any) => r.status === "approved").length;
  const rejected = allForStats.filter((r: any) => r.status === "rejected").length;
  const completed = allForStats.filter((r: any) => r.status === "completed").length;

  function openReview(record: any, status: "approved" | "rejected" | "completed") {
    setSelected(record);
    setReviewStatus(status);
    setReviewRemarks("");
    setReviewOpen(true);
  }

  const days = (from: string, to: string) => {
    try {
      return differenceInCalendarDays(new Date(to), new Date(from)) + 1;
    } catch {
      return "-";
    }
  };

  const filtered = records.filter((r: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
    const code = (r.employee?.employeeCode || "").toLowerCase();
    const reason = (r.reason || "").toLowerCase();
    return name.includes(s) || code.includes(s) || reason.includes(s);
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Work From Home Management"
        description="Review, authorize, and track remote work schedules, employee locations, and attendance adjustments."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/hr/attendance/live">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-broadcast text-sm" />
                <span>Live Attendance</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-plus text-sm" />
              <span>Add WFH Request</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Pending Approval</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-clock text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{pending} Requests</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting manager authorization</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-hourglass-high text-xs" />
              <span>Action Required</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Active & Approved</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{approved} Approved</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Permitted for remote execution</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-house-line text-xs" />
              <span>Remote Staff</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Completed</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ph ph-calendar-check text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-sky-600">{completed} Periods</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Successfully served and logged</p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-clock-counter-clockwise text-xs" />
              <span>Archived Records</span>
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
              <h3 className="text-2xl font-bold tracking-tight text-rose-600">{rejected} Requests</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Disallowed due to office policies</p>
            </div>
            <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-prohibit text-xs" />
              <span>Declined Queue</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="relative w-full sm:w-80">
          <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
          <Input
            placeholder="Search employee, employee ID or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Date Range</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Duration</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Reason</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                    Loading work from home applications...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground italic">
                    No work from home applications found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((record: any) => {
                  const emp = record.employee;
                  const fullName = `${emp?.firstName ?? ""} ${emp?.lastName ?? ""}`.trim() || "Staff Member";

                  return (
                    <TableRow key={record.id} className="hover:bg-muted/40 transition-colors text-xs">
                      <TableCell className="p-3 font-mono font-bold text-muted-foreground">
                        {emp?.employeeCode ?? "EMP-001"}
                      </TableCell>

                      <TableCell className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8 border border-border/60">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {emp?.firstName?.[0] ?? "E"}{emp?.lastName?.[0] ?? "M"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground block">{fullName}</span>
                            <span className="text-[10px] text-muted-foreground">{emp?.position ?? "Employee"}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="p-3 text-muted-foreground">
                        {emp?.department?.name ?? "—"}
                      </TableCell>

                      <TableCell className="p-3 font-mono text-muted-foreground">
                        {record.fromDate ? format(new Date(record.fromDate), "dd MMM yyyy") : "—"} →{" "}
                        {record.toDate ? format(new Date(record.toDate), "dd MMM yyyy") : "—"}
                      </TableCell>

                      <TableCell className="p-3 font-mono font-bold text-foreground">
                        {days(record.fromDate, record.toDate)} day(s)
                      </TableCell>

                      <TableCell className="p-3 max-w-[200px] truncate text-muted-foreground" title={record.reason}>
                        {record.reason || "—"}
                      </TableCell>

                      <TableCell className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold capitalize",
                            record.status === "approved" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            record.status === "completed" && "bg-sky-500/10 text-sky-600 border-sky-500/30",
                            record.status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                            record.status === "rejected" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          )}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-3 text-right">
                        {record.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="xs"
                              variant="success"
                              onClick={() => openReview(record, "approved")}
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-check text-xs" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => openReview(record, "rejected")}
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-x text-xs" />
                              <span>Reject</span>
                            </Button>
                          </div>
                        ) : record.status === "approved" ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => openReview(record, "completed")}
                            className="gap-1 font-bold text-sky-600"
                          >
                            <i className="ph ph-check-circle text-xs" />
                            <span>Mark Completed</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium">Archived</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Dialog: Add WFH Request ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-house-line text-primary text-lg" />
              <span>Create Work From Home Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Authorize remote work dates on behalf of an employee.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.employeeId || !form.fromDate || !form.toDate || !form.reason) {
                toast.error("Please fill in all required fields.");
                return;
              }
              createMut.mutate(form);
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Employee <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={form.employeeId}
                onValueChange={(val) => setForm((p) => ({ ...p, employeeId: val }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">From Date <span className="text-rose-500">*</span></Label>
                <Input
                  type="date"
                  value={form.fromDate}
                  onChange={(e) => setForm((p) => ({ ...p, fromDate: e.target.value }))}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">To Date <span className="text-rose-500">*</span></Label>
                <Input
                  type="date"
                  value={form.toDate}
                  onChange={(e) => setForm((p) => ({ ...p, toDate: e.target.value }))}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason <span className="text-rose-500">*</span></Label>
              <Textarea
                placeholder="Reason for remote work..."
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                className="text-xs min-h-[80px]"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createMut.isPending}
                className="font-bold"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Review WFH Request ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-shield-check text-primary text-lg" />
              <span>Review Work From Home Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm authorization decision and provide optional supervisor notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Action / Status</Label>
              <Select
                value={reviewStatus}
                onValueChange={(val: any) => setReviewStatus(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve Application</SelectItem>
                  <SelectItem value="rejected">Reject Application</SelectItem>
                  <SelectItem value="completed">Mark as Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supervisor Remarks</Label>
              <Textarea
                placeholder="Remarks or conditions for remote work approval..."
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewStatus === "rejected" ? "destructive" : "primary"}
              size="sm"
              disabled={reviewMut.isPending}
              onClick={() => {
                if (!selected?.id) return;
                reviewMut.mutate({
                  id: selected.id,
                  status: reviewStatus,
                  remarks: reviewRemarks,
                });
              }}
              className="font-bold"
            >
              Confirm Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
