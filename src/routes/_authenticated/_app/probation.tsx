import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card } from "@/components/ui/card";
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
import { Plus, FileSpreadsheet, Download, Search, MoreVertical, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/probation")({
  component: ProbationPage,
  head: () => ({ meta: [{ title: "Probation Management — Master HRMS" }] }),
});

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  active:     { label: "Active",     class: "bg-blue-100 text-blue-700 border-blue-200" },
  passed:     { label: "Passed",     class: "bg-green-100 text-green-700 border-green-200" },
  extended:   { label: "Extended",   class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  terminated: { label: "Terminated", class: "bg-red-100 text-red-700 border-red-200" },
};

const RATING_OPTIONS = ["excellent", "good", "average", "poor"];

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return String(d); }
}

function daysLeft(endDate: string) {
  try {
    const diff = differenceInCalendarDays(new Date(endDate), new Date());
    if (diff < 0) return "Overdue";
    return `${diff}d left`;
  } catch { return "-"; }
}

export function ProbationPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const [form, setForm] = useState({
    employeeId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    probationPeriodDays: "90",
    remarks: "",
  });

  const [updateForm, setUpdateForm] = useState({
    status: "passed",
    performanceRating: "good",
    remarks: "",
    extendedUntil: "",
  });

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: listData, isLoading } = useQuery({
    queryKey: ["probation", statusFilter, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.append("status", statusFilter);
      if (search) p.append("search", search);
      return api.get(`/probation?${p}`);
    },
  });
  const records: any[] = listData?.data ?? [];

  const { data: empData } = useQuery({
    queryKey: ["employees-mini"],
    queryFn: () => api.get("/employees?limit=200"),
  });
  const employees: any[] = empData?.data ?? empData?.employees ?? [];

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (payload: any) => api.post("/probation", payload),
    onSuccess: () => {
      toast.success("Probation record added.");
      qc.invalidateQueries({ queryKey: ["probation"] });
      setAddOpen(false);
      setForm({ employeeId: "", startDate: new Date().toISOString().split("T")[0], endDate: "", probationPeriodDays: "90", remarks: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add."),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/probation/${id}`, data),
    onSuccess: () => {
      toast.success("Record updated.");
      qc.invalidateQueries({ queryKey: ["probation"] });
      setUpdateOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/probation/${id}`),
    onSuccess: () => { toast.success("Deleted."); qc.invalidateQueries({ queryKey: ["probation"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete."),
  });

  // Auto-calc end date from start + days
  function handleStartOrDays(key: "startDate" | "probationPeriodDays", val: string) {
    const updated = { ...form, [key]: val };
    try {
      const start = new Date(updated.startDate);
      const d = parseInt(updated.probationPeriodDays) || 90;
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + d);
        updated.endDate = end.toISOString().split("T")[0];
      }
    } catch { /* ignore */ }
    setForm(updated);
  }

  function openUpdate(record: any) {
    setSelected(record);
    setUpdateForm({ status: record.status, performanceRating: record.performanceRating ?? "good", remarks: record.remarks ?? "", extendedUntil: record.extendedUntil?.split("T")[0] ?? "" });
    setUpdateOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Probation Management</h2>
          <nav className="text-sm text-muted-foreground mt-1">
            <span>Home</span> / <span>HRM</span> / <span className="text-foreground">Probation Management</span>
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
          {isAdmin && (
            <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Probation
            </Button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b">
          <h5 className="font-semibold">Probation Records</h5>
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
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
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Countdown</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    No probation records found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r: any) => {
                  const emp = r.employee;
                  const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.active;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-primary text-sm">{emp?.employeeCode ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border">
                            <AvatarFallback className="text-xs">{getInitials(emp?.firstName, emp?.lastName)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{emp?.firstName} {emp?.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{emp?.position ?? "-"}</TableCell>
                      <TableCell className="text-sm">{emp?.department?.name ?? "-"}</TableCell>
                      <TableCell className="text-sm">{fmtDate(r.startDate)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(r.endDate)}</TableCell>
                      <TableCell className="text-sm">{r.probationPeriodDays}d</TableCell>
                      <TableCell className="text-sm">
                        {r.status === "active" ? (
                          <span className={cn("text-xs font-medium", daysLeft(r.endDate).includes("Overdue") ? "text-red-600" : "text-orange-600")}>
                            {daysLeft(r.endDate)}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{r.performanceRating ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs font-medium border", badge.class)}>{badge.label}</Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openUpdate(r)}>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Update Status
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { if (confirm("Delete this probation record?")) deleteMut.mutate(r.id); }}
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

      {/* ── Add Probation Modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Probation Record</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Employee <span className="text-destructive">*</span></Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.employeeCode} – {e.firstName} {e.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.startDate} onChange={(e) => handleStartOrDays("startDate", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Duration (days)</Label>
                <Input type="number" min={1} value={form.probationPeriodDays} onChange={(e) => handleStartOrDays("probationPeriodDays", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Remarks</Label>
              <Textarea rows={3} placeholder="Optional notes..." value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.employeeId || !form.startDate || !form.endDate || createMut.isPending}
              onClick={() => createMut.mutate(form)}
            >
              {createMut.isPending ? "Saving…" : "Add Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Status Modal ── */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Update Probation Status</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                <strong>{selected.employee?.firstName} {selected.employee?.lastName}</strong>
                {" — "}{fmtDate(selected.startDate)} to {fmtDate(selected.endDate)}
              </p>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={updateForm.status} onValueChange={(v) => setUpdateForm({ ...updateForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {updateForm.status === "extended" && (
                <div className="grid gap-1.5">
                  <Label>Extended Until</Label>
                  <Input type="date" value={updateForm.extendedUntil} onChange={(e) => setUpdateForm({ ...updateForm, extendedUntil: e.target.value })} />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label>Performance Rating</Label>
                <Select value={updateForm.performanceRating} onValueChange={(v) => setUpdateForm({ ...updateForm, performanceRating: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Remarks</Label>
                <Textarea rows={3} value={updateForm.remarks} onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button
              disabled={updateMut.isPending}
              onClick={() => updateMut.mutate({ id: selected.id, ...updateForm })}
            >
              {updateMut.isPending ? "Saving…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
