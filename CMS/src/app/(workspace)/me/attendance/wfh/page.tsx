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

export default function EmployeeWorkFromHomePage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const [form, setForm] = useState({
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  // Queries
  const { data: wfhData, isLoading } = useQuery({
    queryKey: ["my-wfh-requests"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/wfh");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const allRecords: any[] = Array.isArray(wfhData) ? wfhData : [];

  // Filter for current user's records
  const currentEmpId = profile?.id;
  const currentEmail = profile?.email;

  const myRecords = allRecords.filter((r: any) => {
    if (!currentEmpId && !currentEmail) return true;
    return r.employeeId === currentEmpId || r.employee?.id === currentEmpId || r.employee?.email === currentEmail;
  });

  const displayList = myRecords.length > 0 ? myRecords : allRecords;

  // Mutation
  const createMut = useMutation({
    mutationFn: (payload: any) => api.post("/wfh", { ...payload, employeeId: profile?.id }),
    onSuccess: () => {
      toast.success("Work from home application submitted!");
      qc.invalidateQueries({ queryKey: ["my-wfh-requests"] });
      setAddOpen(false);
      setForm({
        fromDate: new Date().toISOString().split("T")[0],
        toDate: new Date().toISOString().split("T")[0],
        reason: "",
      });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit request."),
  });

  const pending = displayList.filter((r: any) => r.status === "pending").length;
  const approved = displayList.filter((r: any) => r.status === "approved").length;
  const completed = displayList.filter((r: any) => r.status === "completed").length;
  const rejected = displayList.filter((r: any) => r.status === "rejected").length;

  const days = (from: string, to: string) => {
    try {
      return differenceInCalendarDays(new Date(to), new Date(from)) + 1;
    } catch {
      return "-";
    }
  };

  const filtered = displayList.filter((r: any) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  return (
    <div className="w-full space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Work From Home"
        description="Submit remote work applications, manage planned remote schedules, and track manager approval statuses."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/me/attendance/records">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-clock text-sm" />
                <span>Attendance Log</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-plus text-sm" />
              <span>Apply for WFH</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Pending Requests</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-clock text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{pending} Pending</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">In manager review pipeline</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-hourglass-high text-xs" />
              <span>Under Review</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Approved Remote Days</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{approved} Active</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Authorized remote work days</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-house-line text-xs" />
              <span>Scheduled WFH</span>
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
              <p className="text-[11px] text-muted-foreground mt-0.5">Completed remote attendance</p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-clock-counter-clockwise text-xs" />
              <span>Past Records</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Rejected</span>
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <i className="ph ph-x-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-rose-600">{rejected} Requests</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Declined applications</p>
            </div>
            <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-prohibit text-xs" />
              <span>Declined</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="text-xs text-muted-foreground font-semibold">
          Showing {filtered.length} of {displayList.length} applications
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Applications Data Table ── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">From Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">To Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Duration</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Reason / Objectives</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    Loading your applications...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground italic">
                    No work from home applications found. Click &quot;Apply for WFH&quot; to submit one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((record: any) => (
                  <TableRow key={record.id} className="hover:bg-muted/40 transition-colors text-xs">
                    <TableCell className="p-3 tabular-nums font-bold text-foreground">
                      {record.fromDate ? format(new Date(record.fromDate), "dd MMM yyyy") : "—"}
                    </TableCell>

                    <TableCell className="p-3 tabular-nums font-bold text-foreground">
                      {record.toDate ? format(new Date(record.toDate), "dd MMM yyyy") : "—"}
                    </TableCell>

                    <TableCell className="p-3 tabular-nums font-bold text-primary">
                      {days(record.fromDate, record.toDate)} day(s)
                    </TableCell>

                    <TableCell className="p-3 max-w-[240px] truncate text-muted-foreground" title={record.reason}>
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

                    <TableCell className="p-3 text-right text-muted-foreground text-[11px] max-w-[180px] truncate" title={record.reviewRemarks}>
                      {record.reviewRemarks || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Dialog: Apply for WFH ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-house-line text-primary text-lg" />
              <span>Apply for Work From Home</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit planned remote work dates and your primary deliverables for supervisor authorization.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.fromDate || !form.toDate || !form.reason) {
                toast.error("Please fill in all required fields.");
                return;
              }
              createMut.mutate(form);
            }}
            className="space-y-4 py-2"
          >
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
              <Label className="text-xs font-semibold">Reason & Deliverables <span className="text-rose-500">*</span></Label>
              <Textarea
                placeholder="Reason for remote work and planned tasks for the day..."
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                className="text-xs min-h-[90px]"
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
                Submit Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
