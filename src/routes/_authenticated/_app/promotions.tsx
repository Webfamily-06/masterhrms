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
import { Plus, FileSpreadsheet, Download, Search, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/promotions")({
  component: PromotionsPage,
  head: () => ({ meta: [{ title: "Promotions — Master HRMS" }] }),
});

const TYPE_BADGE: Record<string, { label: string; class: string }> = {
  promotion: { label: "Promotion",  class: "bg-green-100 text-green-700 border-green-200" },
  demotion:  { label: "Demotion",   class: "bg-red-100 text-red-700 border-red-200" },
  lateral:   { label: "Lateral",    class: "bg-blue-100 text-blue-700 border-blue-200" },
};

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return String(d); }
}

export function PromotionsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    promotionDate: new Date().toISOString().split("T")[0],
    newDesignation: "",
    previousDesignation: "",
    previousDepartment: "",
    newDepartment: "",
    previousSalary: "",
    newSalary: "",
    promotionType: "promotion",
    remarks: "",
  });

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: listData, isLoading } = useQuery({
    queryKey: ["promotions", typeFilter, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (typeFilter !== "all") p.append("promotionType", typeFilter);
      if (search) p.append("search", search);
      return api.get(`/promotions?${p}`);
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
    mutationFn: (payload: any) => api.post("/promotions", payload),
    onSuccess: () => {
      toast.success("Promotion record added.");
      qc.invalidateQueries({ queryKey: ["promotions"] });
      setAddOpen(false);
      setForm({ employeeId: "", promotionDate: new Date().toISOString().split("T")[0], newDesignation: "", previousDesignation: "", previousDepartment: "", newDepartment: "", previousSalary: "", newSalary: "", promotionType: "promotion", remarks: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add record."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/${id}`),
    onSuccess: () => { toast.success("Deleted."); qc.invalidateQueries({ queryKey: ["promotions"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete."),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Promotion</h2>
          <nav className="text-sm text-muted-foreground mt-1">
            <span>Home</span> / <span>HRM</span> / <span className="text-foreground">Promotion</span>
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
              <Plus className="h-4 w-4" /> Add Promotion
            </Button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b">
          <h5 className="font-semibold">Promotion Records</h5>
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
                <SelectItem value="demotion">Demotion</SelectItem>
                <SelectItem value="lateral">Lateral</SelectItem>
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
                <TableHead>Prev. Designation</TableHead>
                <TableHead>New Designation</TableHead>
                <TableHead>Prev. Department</TableHead>
                <TableHead>New Department</TableHead>
                <TableHead>Prev. Salary</TableHead>
                <TableHead>New Salary</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
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
                    No promotion records found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r: any) => {
                  const emp = r.employee;
                  const badge = TYPE_BADGE[r.promotionType] ?? TYPE_BADGE.promotion;
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
                      <TableCell className="text-sm">{r.previousDesignation ?? "-"}</TableCell>
                      <TableCell className="text-sm font-medium">{r.newDesignation}</TableCell>
                      <TableCell className="text-sm">{r.previousDepartment ?? "-"}</TableCell>
                      <TableCell className="text-sm">{r.newDepartment ?? "-"}</TableCell>
                      <TableCell className="text-sm">{r.previousSalary ? `₹${Number(r.previousSalary).toLocaleString()}` : "-"}</TableCell>
                      <TableCell className="text-sm">{r.newSalary ? `₹${Number(r.newSalary).toLocaleString()}` : "-"}</TableCell>
                      <TableCell className="text-sm">{fmtDate(r.promotionDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs font-medium border", badge.class)}>{badge.label}</Badge>
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
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { if (confirm("Delete this record?")) deleteMut.mutate(r.id); }}
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

      {/* ── Add Promotion Modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Promotion</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="col-span-2 grid gap-1.5">
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

            <div className="grid gap-1.5">
              <Label>Promotion Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.promotionDate} onChange={(e) => setForm({ ...form, promotionDate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.promotionType} onValueChange={(v) => setForm({ ...form, promotionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="demotion">Demotion</SelectItem>
                  <SelectItem value="lateral">Lateral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Previous Designation</Label>
              <Input placeholder="e.g. Junior Developer" value={form.previousDesignation} onChange={(e) => setForm({ ...form, previousDesignation: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>New Designation <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Senior Developer" value={form.newDesignation} onChange={(e) => setForm({ ...form, newDesignation: e.target.value })} />
            </div>

            <div className="grid gap-1.5">
              <Label>Previous Department</Label>
              <Input placeholder="e.g. Engineering" value={form.previousDepartment} onChange={(e) => setForm({ ...form, previousDepartment: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>New Department</Label>
              <Input placeholder="e.g. Product" value={form.newDepartment} onChange={(e) => setForm({ ...form, newDepartment: e.target.value })} />
            </div>

            <div className="grid gap-1.5">
              <Label>Previous Salary</Label>
              <Input type="number" placeholder="0.00" value={form.previousSalary} onChange={(e) => setForm({ ...form, previousSalary: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>New Salary</Label>
              <Input type="number" placeholder="0.00" value={form.newSalary} onChange={(e) => setForm({ ...form, newSalary: e.target.value })} />
            </div>

            <div className="col-span-2 grid gap-1.5">
              <Label>Remarks</Label>
              <Textarea rows={3} placeholder="Additional notes..." value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.employeeId || !form.newDesignation || createMut.isPending}
              onClick={() => createMut.mutate(form)}
            >
              {createMut.isPending ? "Saving…" : "Add Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
