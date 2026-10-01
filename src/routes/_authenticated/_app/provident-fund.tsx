import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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
  Plus, Download, Search, MoreVertical, Trash2, Edit2, ShieldCheck,
  CheckCircle2, Clock, Landmark, Users, Check, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/provident-fund")({
  component: ProvidentFundPage,
  head: () => ({ meta: [{ title: "Provident Fund Administration — Master HRMS" }] }),
});

function getInitials(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "EP";
}

export function ProvidentFundPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState({
    employeeId: "",
    pfType: "Employee Provident Fund",
    employeeSharePercent: "12",
    employeeShareAmount: "0",
    orgSharePercent: "12",
    orgShareAmount: "0",
    status: "Approved",
    description: "",
  });

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: listData, isLoading, error } = useQuery({
    queryKey: ["provident-funds", typeFilter, statusFilter, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (typeFilter !== "all") p.append("pfType", typeFilter);
      if (statusFilter !== "all") p.append("status", statusFilter);
      if (search) p.append("search", search);
      return api.get(`/provident-funds?${p}`);
    },
  });
  const records: any[] = listData?.data ?? [];

  const { data: summaryData } = useQuery({
    queryKey: ["provident-funds-summary"],
    queryFn: () => api.get("/provident-funds/summary"),
  });

  const { data: empData } = useQuery({
    queryKey: ["employees-mini"],
    queryFn: () => api.get("/employees?limit=200"),
  });
  const employees: any[] = empData?.data ?? empData ?? [];

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post("/provident-funds", data),
    onSuccess: () => {
      toast.success("Provident Fund enrollment saved successfully");
      qc.invalidateQueries({ queryKey: ["provident-funds"] });
      qc.invalidateQueries({ queryKey: ["provident-funds-summary"] });
      setAddOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create PF record"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/provident-funds/${id}`, data),
    onSuccess: () => {
      toast.success("Provident Fund configuration updated");
      qc.invalidateQueries({ queryKey: ["provident-funds"] });
      qc.invalidateQueries({ queryKey: ["provident-funds-summary"] });
      setEditItem(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update PF record"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/provident-funds/${id}`),
    onSuccess: () => {
      toast.success("PF record removed");
      qc.invalidateQueries({ queryKey: ["provident-funds"] });
      qc.invalidateQueries({ queryKey: ["provident-funds-summary"] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete PF record"),
  });

  function resetForm() {
    setForm({
      employeeId: "",
      pfType: "Employee Provident Fund",
      employeeSharePercent: "12",
      employeeShareAmount: "0",
      orgSharePercent: "12",
      orgShareAmount: "0",
      status: "Approved",
      description: "",
    });
  }

  function handleOpenEdit(r: any) {
    setEditItem({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`,
      pfType: r.pfType,
      employeeSharePercent: String(r.employeeSharePercent ?? 0),
      employeeShareAmount: String(r.employeeShareAmount ?? 0),
      orgSharePercent: String(r.orgSharePercent ?? 0),
      orgShareAmount: String(r.orgShareAmount ?? 0),
      status: r.status,
      description: r.description || "",
    });
  }

  function exportCSV() {
    if (!records.length) {
      toast.error("No data to export");
      return;
    }
    const escapeCsv = (str: any) => `"${String(str ?? "").replace(/"/g, '""')}"`;
    const headers = ["Employee Code", "Employee Name", "Department", "PF Type", "Employee Share (%)", "Org Share (%)", "Status"];
    const rows = records.map((r: any) => [
      escapeCsv(r.employee?.employeeCode),
      escapeCsv(`${r.employee?.firstName ?? ""} ${r.employee?.lastName ?? ""}`.trim()),
      escapeCsv(r.employee?.department?.name ?? "-"),
      escapeCsv(r.pfType),
      escapeCsv(`${r.employeeSharePercent ?? 0}%`),
      escapeCsv(`${r.orgSharePercent ?? 0}%`),
      escapeCsv(r.status),
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Provident_Fund_Registry_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Provident Fund records exported");
  }

  const summary = summaryData || {
    totalEnrolled: records.length,
    approved: records.filter((r: any) => r.status === "Approved").length,
    pending: records.filter((r: any) => r.status === "Pending").length,
    vpfCount: records.filter((r: any) => r.pfType === "Voluntary Provident Fund").length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="size-6 text-primary" />
            <span>Provident Fund Administration</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage Employee Provident Fund (EPF), Voluntary PF (VPF) contribution shares, and statutory compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs gap-1.5 h-8">
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>

          {isAdmin && (
            <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }} className="text-xs gap-1.5 h-8">
              <Plus className="size-3.5" />
              <span>Add Provident Fund</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── Metric KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total Enrolled</p>
            <Users className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{summary.totalEnrolled ?? 0}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Employees under PF schemes</p>
        </Card>

        <Card className="border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-600">Approved Plans</p>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{summary.approved ?? 0}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Active statutory deductions</p>
        </Card>

        <Card className="border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-amber-600">Pending Approvals</p>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{summary.pending ?? 0}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Awaiting HR authorization</p>
        </Card>

        <Card className="border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-600">VPF Opt-ins</p>
            <ShieldCheck className="size-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{summary.vpfCount ?? 0}</p>
          <p className="text-[11px] text-blue-600 mt-0.5">Voluntary excess contribution</p>
        </Card>
      </div>

      {/* ─── Search & Filter Bar ─────────────────────────────────────────── */}
      <Card className="border bg-card p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, ID, or dept..."
              className="pl-8 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="text-xs h-9 w-[190px]">
                <SelectValue placeholder="All Schemes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schemes</SelectItem>
                <SelectItem value="Employee Provident Fund">Employee PF (EPF)</SelectItem>
                <SelectItem value="Voluntary Provident Fund">Voluntary PF (VPF)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs h-9 w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ─── Data Table ──────────────────────────────────────────────────── */}
      <Card className="border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-semibold">Employee Name</TableHead>
                <TableHead className="text-xs font-semibold">Provident Fund Type</TableHead>
                <TableHead className="text-xs font-semibold">Employee Share</TableHead>
                <TableHead className="text-xs font-semibold">Organization Share</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    Loading Provident Fund records...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-destructive">
                    <p className="font-semibold">Failed to load Provident Fund records</p>
                    <p className="text-muted-foreground mt-1">{(error as any)?.message || "Please check your network and session."}</p>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    <Landmark className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">No Provident Fund records found</p>
                    <p className="mt-1">Add an employee enrollment to begin tracking statutory PF contributions.</p>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r: any) => {
                  const emp = r.employee;
                  const isVPF = r.pfType === "Voluntary Provident Fund";

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      {/* Employee Info */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 rounded-full border bg-muted">
                            <AvatarFallback className="text-xs font-bold text-primary">
                              {getInitials(emp?.firstName, emp?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-semibold text-foreground leading-none">
                              {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {emp?.employeeCode ? `${emp.employeeCode} • ` : ""}
                              {emp?.department?.name || emp?.position || "General Staff"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* PF Type */}
                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-medium border px-2 py-0.5",
                            isVPF
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                          )}
                        >
                          {r.pfType}
                        </Badge>
                      </TableCell>

                      {/* Employee Share */}
                      <TableCell className="py-2.5 text-xs font-semibold text-foreground">
                        {Number(r.employeeSharePercent) > 0 ? `${r.employeeSharePercent}%` : "-"}
                        {Number(r.employeeShareAmount) > 0 && (
                          <span className="text-[11px] font-normal text-muted-foreground ml-1.5">
                            ({formatSystemAmount(Number(r.employeeShareAmount))})
                          </span>
                        )}
                      </TableCell>

                      {/* Org Share */}
                      <TableCell className="py-2.5 text-xs font-semibold text-foreground">
                        {Number(r.orgSharePercent) > 0 ? `${r.orgSharePercent}%` : "-"}
                        {Number(r.orgShareAmount) > 0 && (
                          <span className="text-[11px] font-normal text-muted-foreground ml-1.5">
                            ({formatSystemAmount(Number(r.orgShareAmount))})
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2.5">
                        {isAdmin ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-6 px-2 text-[11px] gap-1 font-medium",
                                  r.status === "Approved"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30"
                                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30"
                                )}
                              >
                                <span className={cn(
                                  "size-1.5 rounded-full",
                                  r.status === "Approved" ? "bg-emerald-500" : "bg-amber-500"
                                )} />
                                <span>{r.status}</span>
                                <ChevronDown className="size-3 opacity-60 ml-0.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="text-xs">
                              <DropdownMenuItem
                                onClick={() => updateMutation.mutate({ id: r.id, data: { status: "Approved" } })}
                                className="gap-2"
                              >
                                <Check className="size-3.5 text-emerald-600" />
                                <span>Approved</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateMutation.mutate({ id: r.id, data: { status: "Pending" } })}
                                className="gap-2"
                              >
                                <Clock className="size-3.5 text-amber-600" />
                                <span>Pending</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-medium border px-2 py-0.5",
                              r.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            {r.status}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => handleOpenEdit(r)} className="gap-2">
                              <Edit2 className="size-3.5 text-muted-foreground" />
                              <span>Edit Configuration</span>
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(r.id)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                                <span>Delete Record</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ─── Add Provident Fund Dialog ─────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Landmark className="size-5 text-primary" />
              <span>Add New Provident Fund</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Employee Name *</Label>
              <Select
                value={form.employeeId}
                onValueChange={(val) => setForm(f => ({ ...f, employeeId: val }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeCode || "No ID"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Provident Fund Type *</Label>
                <Select
                  value={form.pfType}
                  onValueChange={(val) => setForm(f => ({ ...f, pfType: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee Provident Fund">Employee Provident Fund</SelectItem>
                    <SelectItem value="Voluntary Provident Fund">Voluntary Provident Fund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Approval Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm(f => ({ ...f, status: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee Share (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.employeeSharePercent}
                  onChange={(e) => setForm(f => ({ ...f, employeeSharePercent: e.target.value }))}
                  placeholder="e.g. 12"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Organization Share (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.orgSharePercent}
                  onChange={(e) => setForm(f => ({ ...f, orgSharePercent: e.target.value }))}
                  placeholder="e.g. 12"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee Share (Fixed Amount)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.employeeShareAmount}
                  onChange={(e) => setForm(f => ({ ...f, employeeShareAmount: e.target.value }))}
                  placeholder="0.00"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Organization Share (Fixed Amount)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.orgShareAmount}
                  onChange={(e) => setForm(f => ({ ...f, orgShareAmount: e.target.value }))}
                  placeholder="0.00"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              <Label className="text-xs">Description / Compliance Notes</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional notes or UAN verification status..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createMutation.isPending || !form.employeeId}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "Adding..." : "Add Provident Fund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Provident Fund Dialog ────────────────────────────────────── */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="size-5 text-primary" />
              <span>Edit Provident Fund — {editItem?.employeeName}</span>
            </DialogTitle>
          </DialogHeader>

          {editItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Provident Fund Type</Label>
                  <Select
                    value={editItem.pfType}
                    onValueChange={(val) => setEditItem((prev: any) => ({ ...prev, pfType: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee Provident Fund">Employee Provident Fund</SelectItem>
                      <SelectItem value="Voluntary Provident Fund">Voluntary Provident Fund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Approval Status</Label>
                  <Select
                    value={editItem.status}
                    onValueChange={(val) => setEditItem((prev: any) => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employee Share (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editItem.employeeSharePercent}
                    onChange={(e) => setEditItem((prev: any) => ({ ...prev, employeeSharePercent: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Organization Share (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editItem.orgSharePercent}
                    onChange={(e) => setEditItem((prev: any) => ({ ...prev, orgSharePercent: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employee Share (Amount)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editItem.employeeShareAmount}
                    onChange={(e) => setEditItem((prev: any) => ({ ...prev, employeeShareAmount: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Organization Share (Amount)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editItem.orgShareAmount}
                    onChange={(e) => setEditItem((prev: any) => ({ ...prev, orgShareAmount: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <Label className="text-xs">Description</Label>
                <Textarea
                  rows={2}
                  value={editItem.description}
                  onChange={(e) => setEditItem((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => {
                if (!editItem) return;
                updateMutation.mutate({
                  id: editItem.id,
                  data: {
                    pfType: editItem.pfType,
                    employeeSharePercent: editItem.employeeSharePercent,
                    employeeShareAmount: editItem.employeeShareAmount,
                    orgSharePercent: editItem.orgSharePercent,
                    orgShareAmount: editItem.orgShareAmount,
                    status: editItem.status,
                    description: editItem.description,
                  },
                });
              }}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              <span>Delete Provident Fund Record</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Are you sure you want to delete this employee provident fund record? This action will remove the statutory contribution settings from upcoming payroll generation runs.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
