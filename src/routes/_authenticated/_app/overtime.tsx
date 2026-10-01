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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  UserCheck,
  Clock,
  AlertCircle,
  XCircle,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  MoreVertical,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/overtime")({
  component: OvertimePage,
  head: () => ({ meta: [{ title: "Overtime — Master HRMS" }] }),
});

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  pending:  { label: "Pending",  class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved: { label: "Approved", class: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejected", class: "bg-red-100 text-red-700 border-red-200" },
};

const OT_TYPES = ["regular", "holiday", "weekend"];

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

export function OvertimePage() {
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

  // Add form
  const [form, setForm] = useState({
    employeeId: "",
    overtimeDate: new Date().toISOString().split("T")[0],
    hoursRequested: "",
    overtimeType: "regular",
    reason: "",
  });

  // Review form
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [reviewRemarks, setReviewRemarks] = useState("");

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: statsData } = useQuery({
    queryKey: ["overtime-stats"],
    queryFn: () => api.get("/overtime/stats"),
  });
  const stats = statsData ?? { total: 0, pending: 0, approved: 0, rejected: 0, totalApprovedHours: 0 };

  const { data: overtimeData, isLoading } = useQuery({
    queryKey: ["overtime", statusFilter, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.append("status", statusFilter);
      if (search) p.append("search", search);
      return api.get(`/overtime?${p}`);
    },
  });
  const records: any[] = overtimeData?.data ?? [];

  const { data: empData } = useQuery({
    queryKey: ["employees-mini"],
    queryFn: () => api.get("/employees?limit=200"),
  });
  const employees: any[] = empData?.data ?? empData?.employees ?? [];

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (payload: any) => api.post("/overtime", payload),
    onSuccess: () => {
      toast.success("Overtime request added.");
      qc.invalidateQueries({ queryKey: ["overtime"] });
      qc.invalidateQueries({ queryKey: ["overtime-stats"] });
      setAddOpen(false);
      setForm({ employeeId: "", overtimeDate: new Date().toISOString().split("T")[0], hoursRequested: "", overtimeType: "regular", reason: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create request."),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks: string }) =>
      api.put(`/overtime/${id}/review`, { status, reviewRemarks: remarks }),
    onSuccess: () => {
      toast.success("Request reviewed.");
      qc.invalidateQueries({ queryKey: ["overtime"] });
      qc.invalidateQueries({ queryKey: ["overtime-stats"] });
      setReviewOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to review request."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/overtime/${id}`),
    onSuccess: () => {
      toast.success("Deleted.");
      qc.invalidateQueries({ queryKey: ["overtime"] });
      qc.invalidateQueries({ queryKey: ["overtime-stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete."),
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function openReview(record: any, status: "approved" | "rejected") {
    setSelected(record);
    setReviewStatus(status);
    setReviewRemarks("");
    setReviewOpen(true);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const statCards = [
    { label: "Overtime Employee", value: stats.total, icon: UserCheck, color: "text-primary border-primary bg-primary/10" },
    { label: "Overtime Hours",    value: Number(stats.totalApprovedHours).toFixed(1), icon: Clock, color: "text-pink-600 border-pink-400 bg-pink-50" },
    { label: "Pending Request",   value: stats.pending,  icon: AlertCircle, color: "text-purple-600 border-purple-400 bg-purple-50" },
    { label: "Rejected",          value: stats.rejected, icon: XCircle, color: "text-sky-600 border-sky-400 bg-sky-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Overtime</h2>
          <nav className="text-sm text-muted-foreground mt-1">
            <span>Home</span> / <span>Attendance</span> / <span className="text-foreground">Overtime</span>
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
            <Plus className="h-4 w-4" /> Add Overtime
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
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
          <h5 className="font-semibold">Overtime</h5>
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                className="pl-8 h-9 w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    No overtime requests found.
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
                          <span className="font-medium text-sm">
                            {emp?.firstName} {emp?.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{emp?.position ?? "-"}</TableCell>
                      <TableCell className="text-sm">{emp?.department?.name ?? "-"}</TableCell>
                      <TableCell className="text-sm">{fmtDate(r.overtimeDate)}</TableCell>
                      <TableCell className="text-sm font-medium">{r.hoursRequested}h</TableCell>
                      <TableCell className="text-sm capitalize">{r.overtimeType}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate" title={r.reason ?? ""}>
                        {r.reason ?? "-"}
                      </TableCell>
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
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this overtime request?")) deleteMut.mutate(r.id);
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

      {/* ── Add Overtime Modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Overtime</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Employee <span className="text-destructive">*</span></Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
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
                <Label>Overtime Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.overtimeDate}
                  onChange={(e) => setForm({ ...form, overtimeDate: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Hours <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  placeholder="e.g. 2"
                  value={form.hoursRequested}
                  onChange={(e) => setForm({ ...form, hoursRequested: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Overtime Type</Label>
              <Select value={form.overtimeType} onValueChange={(v) => setForm({ ...form, overtimeType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Textarea
                placeholder="Reason for overtime..."
                rows={3}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.employeeId || !form.overtimeDate || !form.hoursRequested || createMut.isPending}
              onClick={() => createMut.mutate(form)}
            >
              {createMut.isPending ? "Saving…" : "Add Overtime"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review Modal ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewStatus === "approved" ? "Approve" : "Reject"} Overtime Request
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Employee: <strong>{selected.employee?.firstName} {selected.employee?.lastName}</strong>
                {" — "}{fmtDate(selected.overtimeDate)} • {selected.hoursRequested}h
              </p>
              <div className="grid gap-1.5">
                <Label>Remarks</Label>
                <Textarea
                  rows={3}
                  placeholder="Optional remarks..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button
              variant={reviewStatus === "approved" ? "default" : "destructive"}
              disabled={reviewMut.isPending}
              onClick={() => reviewMut.mutate({ id: selected.id, status: reviewStatus, remarks: reviewRemarks })}
            >
              {reviewMut.isPending ? "Saving…" : reviewStatus === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
