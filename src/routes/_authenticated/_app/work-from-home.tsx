import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home, CheckCircle2, XCircle, Clock, Plus, FileSpreadsheet,
  Download, Search, MoreVertical, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/work-from-home")({
  component: WorkFromHomePage,
  head: () => ({ meta: [{ title: "Work From Home — Master HRMS" }] }),
});

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  pending:   { label: "Pending",   class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved:  { label: "Approved",  class: "bg-green-100 text-green-700 border-green-200" },
  rejected:  { label: "Rejected",  class: "bg-red-100 text-red-700 border-red-200" },
  completed: { label: "Completed", class: "bg-blue-100 text-blue-700 border-blue-200" },
};

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return String(d); }
}

export function WorkFromHomePage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin", "manager"].includes(r)
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const [form, setForm] = useState({
    employeeId: "",
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    reason: "",
  });
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected" | "completed">("approved");
  const [reviewRemarks, setReviewRemarks] = useState("");

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: wfhData, isLoading } = useQuery({
    queryKey: ["wfh", statusFilter, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.append("status", statusFilter);
      if (search) p.append("search", search);
      return api.get(`/wfh?${p}`);
    },
  });
  const records: any[] = wfhData?.data ?? [];

  const { data: empData } = useQuery({
    queryKey: ["employees-mini"],
    queryFn: () => api.get("/employees?limit=200"),
  });
  const employees: any[] = empData?.data ?? empData?.employees ?? [];

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (payload: any) => api.post("/wfh", payload),
    onSuccess: () => {
      toast.success("WFH request submitted.");
      qc.invalidateQueries({ queryKey: ["wfh"] });
      setAddOpen(false);
      setForm({ employeeId: "", fromDate: new Date().toISOString().split("T")[0], toDate: new Date().toISOString().split("T")[0], reason: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit."),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks: string }) =>
      api.put(`/wfh/${id}/review`, { status, reviewRemarks: remarks }),
    onSuccess: () => {
      toast.success("Request updated.");
      qc.invalidateQueries({ queryKey: ["wfh"] });
      setReviewOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/wfh/${id}`),
    onSuccess: () => {
      toast.success("Deleted.");
      qc.invalidateQueries({ queryKey: ["wfh"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete."),
  });

  // ─── Derived stats from list ────────────────────────────────────────────────

  const allForStats = records;
  const pending   = allForStats.filter((r: any) => r.status === "pending").length;
  const approved  = allForStats.filter((r: any) => r.status === "approved").length;
  const rejected  = allForStats.filter((r: any) => r.status === "rejected").length;
  const completed = allForStats.filter((r: any) => r.status === "completed").length;

  const statCards = [
    { label: "Pending",   value: pending,   icon: Clock,         color: "text-yellow-600 border-yellow-400 bg-yellow-50" },
    { label: "Approved",  value: approved,  icon: CheckCircle2,  color: "text-green-600 border-green-400 bg-green-50" },
    { label: "Rejected",  value: rejected,  icon: XCircle,       color: "text-red-600 border-red-400 bg-red-50" },
    { label: "Completed", value: completed, icon: Home,          color: "text-blue-600 border-blue-400 bg-blue-50" },
  ];

  function openReview(record: any, status: "approved" | "rejected" | "completed") {
    setSelected(record);
    setReviewStatus(status);
    setReviewRemarks("");
    setReviewOpen(true);
  }

  const days = (from: string, to: string) => {
    try {
      return differenceInCalendarDays(new Date(to), new Date(from)) + 1;
    } catch { return "-"; }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Work From Home Management</h2>
          <nav className="text-sm text-muted-foreground mt-1">
            <span>Home</span> / <span>Attendance</span> / <span className="text-foreground">Work From Home Management</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <FileSpreadsheet className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Download className="h-4 w-4 mr-2" />Export as PDF</DropdownMenuItem>
              <DropdownMenuItem><Download className="h-4 w-4 mr-2" />Export as Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add New Request
          </Button>
        </div>
      </div>

      {/* Stat Cards (derived from current page data) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <h4 className="text-2xl font-bold mt-0.5">{s.value}</h4>
              </div>
              <span className={cn("p-2 rounded-lg border flex items-center justify-center", s.color)}>
                <s.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b">
          <h5 className="font-semibold">WFH Management</h5>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                className="pl-8 h-9 w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emp ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    No WFH requests found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r: any) => {
                  const emp = r.employee;
                  const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-primary text-sm">
                        {emp?.employeeCode ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border">
                            <AvatarFallback className="text-xs">
                              {getInitials(emp?.firstName, emp?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{emp?.firstName} {emp?.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{emp?.position ?? "-"}</TableCell>
                      <TableCell className="text-sm">{emp?.department?.name ?? "-"}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate" title={r.reason ?? ""}>
                        {r.reason ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(r.fromDate)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(r.toDate)}</TableCell>
                      <TableCell className="text-sm">{days(r.fromDate, r.toDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs font-medium border", badge.class)}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {r.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => openReview(r, "approved")}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openReview(r, "rejected")}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" /> Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {r.status === "approved" && (
                                <DropdownMenuItem onClick={() => openReview(r, "completed")}>
                                  <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" /> Mark Completed
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this WFH request?")) deleteMut.mutate(r.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Add WFH Modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add WFH Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Employee <span className="text-destructive">*</span></Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.employeeCode} – {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>From Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>To Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.toDate} min={form.fromDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Textarea rows={3} placeholder="Reason for WFH..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.employeeId || !form.fromDate || !form.toDate || createMut.isPending}
              onClick={() => createMut.mutate(form)}
            >
              {createMut.isPending ? "Saving…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review Modal ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewStatus === "approved" ? "Approve" : reviewStatus === "rejected" ? "Reject" : "Mark Completed"} WFH Request
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Employee: <strong>{selected.employee?.firstName} {selected.employee?.lastName}</strong>
                {" — "}{fmtDate(selected.fromDate)} to {fmtDate(selected.toDate)}
              </p>
              <div className="grid gap-1.5">
                <Label>Remarks</Label>
                <Textarea rows={3} placeholder="Optional remarks..." value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button
              variant={reviewStatus === "rejected" ? "destructive" : "default"}
              disabled={reviewMut.isPending}
              onClick={() => reviewMut.mutate({ id: selected.id, status: reviewStatus, remarks: reviewRemarks })}
            >
              {reviewMut.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
