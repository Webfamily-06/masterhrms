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
  Plus, FileSpreadsheet, Download, MoreVertical, Trash2,
  TrendingUp, TrendingDown, ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Canonical Wave 4 composites & system states
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingState } from "@/components/system-states/loading-state";
import { EmptyState } from "@/components/system-states/empty-state";

export const Route = createFileRoute("/_authenticated/_app/promotions")({
  component: PromotionsPage,
  head: () => ({ meta: [{ title: "Promotions — Master HRMS" }] }),
});

const TYPE_BADGE: Record<string, { label: string; class: string }> = {
  promotion: { label: "Promotion", class: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" },
  demotion:  { label: "Demotion",  class: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" },
  lateral:   { label: "Lateral",   class: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" },
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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  // Metrics calculation
  const totalPromotions = records.filter((r) => r.promotionType === "promotion").length;
  const totalDemotions = records.filter((r) => r.promotionType === "demotion").length;
  const totalLateral = records.filter((r) => r.promotionType === "lateral").length;

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (payload: any) => api.post("/promotions", payload),
    onSuccess: () => {
      toast.success("Promotion record added.");
      qc.invalidateQueries({ queryKey: ["promotions"] });
      setAddOpen(false);
      setForm({
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
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add record."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/${id}`),
    onSuccess: () => {
      toast.success("Record deleted.");
      qc.invalidateQueries({ queryKey: ["promotions"] });
      setDeleteTargetId(null);
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Failed to delete.");
      setDeleteTargetId(null);
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ─── PageHeader with Breadcrumbs and Actions ───────────────────────── */}
      <PageHeader
        title="Promotions"
        description="Employee career transitions, promotions, demotions, and lateral department movements."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "HRM" },
          { label: "Promotions" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <FileSpreadsheet className="size-4" />
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="size-4 mr-2" />
                  <span>Export as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="size-4 mr-2" />
                  <span>Export as Excel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAdmin && (
              <Button size="sm" className="gap-1.5 h-9" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                <span>Add Promotion</span>
              </Button>
            )}
          </div>
        }
      />

      {/* ─── KPI Metrics Overview ──────────────────────────────────────────── */}
      <StatsOverviewGrid columns={3}>
        <StatCard
          label="Promotions"
          value={totalPromotions}
          variant="success"
          icon={<TrendingUp className="size-5" />}
          description="Career advancement records"
        />
        <StatCard
          label="Demotions"
          value={totalDemotions}
          variant="rose"
          icon={<TrendingDown className="size-5" />}
          description="Role re-evaluations"
        />
        <StatCard
          label="Lateral Transfers"
          value={totalLateral}
          variant="info"
          icon={<ArrowRightLeft className="size-5" />}
          description="Cross-department movements"
        />
      </StatsOverviewGrid>

      {/* ─── FilterToolbar ─────────────────────────────────────────────────── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search employee by name...",
        }}
        filters={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8.5 text-xs w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="promotion">Promotion</SelectItem>
              <SelectItem value="demotion">Demotion</SelectItem>
              <SelectItem value="lateral">Lateral</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <Badge variant="outline" className="text-xs">
            {records.length} {records.length === 1 ? "record" : "records"}
          </Badge>
        }
      />

      {/* ─── Table Card ────────────────────────────────────────────────────── */}
      <Card className="border border-border/70 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingState variant="table" rows={6} message="Loading promotion records..." />
            </div>
          ) : records.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={TrendingUp}
                title="No promotion records found"
                description={
                  search || typeFilter !== "all"
                    ? "Try adjusting your search criteria or type filter."
                    : "No employee promotions or career transitions recorded yet."
                }
                actionLabel={isAdmin ? "Add Promotion" : undefined}
                onAction={isAdmin ? () => setAddOpen(true) : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-xs">Emp ID</TableHead>
                    <TableHead className="font-semibold text-xs">Name</TableHead>
                    <TableHead className="font-semibold text-xs">Prev. Designation</TableHead>
                    <TableHead className="font-semibold text-xs">New Designation</TableHead>
                    <TableHead className="font-semibold text-xs">Prev. Department</TableHead>
                    <TableHead className="font-semibold text-xs">New Department</TableHead>
                    <TableHead className="font-semibold text-xs">Prev. Salary</TableHead>
                    <TableHead className="font-semibold text-xs">New Salary</TableHead>
                    <TableHead className="font-semibold text-xs">Date</TableHead>
                    <TableHead className="font-semibold text-xs">Type</TableHead>
                    {isAdmin && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r: any) => {
                    const emp = r.employee;
                    const badge = TYPE_BADGE[r.promotionType] ?? TYPE_BADGE.promotion;
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium text-primary text-xs font-mono">
                          {emp?.employeeCode ?? "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 border">
                              <AvatarFallback className="text-[10px] font-semibold">
                                {getInitials(emp?.firstName, emp?.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">
                              {emp?.firstName} {emp?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.previousDesignation ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {r.newDesignation}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.previousDepartment ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {r.newDepartment ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {r.previousSalary ? `₹${Number(r.previousSalary).toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium text-foreground">
                          {r.newSalary ? `₹${Number(r.newSalary).toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(r.promotionDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-medium border", badge.class)}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive text-xs"
                                  onClick={() => setDeleteTargetId(r.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Add Promotion Modal ────────────────────────────────────────────── */}
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

      {/* ─── ConfirmationDialog for Deleting Record ────────────────────────── */}
      <ConfirmationDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Promotion Record"
        description="Are you sure you want to delete this promotion record? This action cannot be undone."
        confirmLabel="Delete Record"
        variant="destructive"
        isLoading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMut.mutate(deleteTargetId);
          }
        }}
      />
    </div>
  );
}

