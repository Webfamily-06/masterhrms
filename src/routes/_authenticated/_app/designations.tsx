import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Briefcase,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  Users,
  ChevronRight,
  Award,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/designations")({
  component: DesignationsPage,
  head: () => ({
    meta: [{ title: "Designations — Master HRMS" }],
  }),
});

export interface DesignationRecord {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  gradeLevel?: string;
  status: "active" | "inactive";
  employeeCount?: number;
}

export function DesignationsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"title-asc" | "title-desc" | "dept-asc">("title-asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<DesignationRecord | null>(null);
  const [deletingDesig, setDeletingDesig] = useState<DesignationRecord | null>(null);

  // Form inputs
  const [formTitle, setFormTitle] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formGrade, setFormGrade] = useState("Mid (L3)");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  // Query Departments
  const { data: rawDepartments = [] } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Query Employees (for computing active positions)
  const { data: rawEmployees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/employees");
        return Array.isArray(res) ? res : (res?.data || []);
      } catch {
        return [];
      }
    },
  });

  // Query Designations stored in MySQL Database
  const { data: rawDesignations = [], isLoading: desigLoading } = useQuery({
    queryKey: ["workspace-designations", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/workspace/designations");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const savedDesignations: DesignationRecord[] = rawDesignations.map((d: any) => ({
    id: d.id,
    title: d.name,
    departmentId: d.departmentId || "",
    departmentName: d.department?.name || "General Operations",
    gradeLevel: d.description || "Standard",
    status: "active" as const,
  }));

  // Create Mutation
  const createMut = useMutation({
    mutationFn: async (data: { name: string; departmentId?: string; description?: string }) => {
      return await api.post("/workspace/designations", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-designations", tenantId] });
      setIsAddOpen(false);
      toast.success("Designation created successfully in database!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create designation"),
  });

  // Update Mutation
  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; departmentId?: string; description?: string } }) => {
      return await api.put(`/workspace/designations/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-designations", tenantId] });
      setEditingDesig(null);
      toast.success("Designation updated successfully in database!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update designation"),
  });

  // Delete Mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/workspace/designations/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-designations", tenantId] });
      setDeletingDesig(null);
      toast.success("Designation removed successfully from database!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete designation"),
  });

  // Map employee counts to designations
  const mappedDesignations: DesignationRecord[] = savedDesignations.map((desig) => {
    const count = rawEmployees.filter(
      (e: any) =>
        e.position?.trim().toLowerCase() === desig.title.trim().toLowerCase()
    ).length;
    return {
      ...desig,
      employeeCount: count,
    };
  });

  // Filtered & sorted
  const filtered = mappedDesignations
    .filter((d) => {
      const matchSearch =
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.departmentName.toLowerCase().includes(search.toLowerCase()) ||
        (d.gradeLevel && d.gradeLevel.toLowerCase().includes(search.toLowerCase()));
      const matchDept = deptFilter === "all" ? true : d.departmentId === deptFilter || d.departmentName === deptFilter;
      const matchStatus = statusFilter === "all" ? true : d.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "title-asc") return a.title.localeCompare(b.title);
      if (sortBy === "title-desc") return b.title.localeCompare(a.title);
      if (sortBy === "dept-asc") return a.departmentName.localeCompare(b.departmentName);
      return 0;
    });

  // KPI calculations
  const totalDesignations = mappedDesignations.length;
  const activeDesignations = mappedDesignations.filter((d) => d.status === "active").length;
  const uniqueDeptsCount = new Set(mappedDesignations.map((d) => d.departmentName)).size;
  const totalEmpsAssigned = mappedDesignations.reduce((sum, d) => sum + (d.employeeCount || 0), 0);

  function handleOpenAdd() {
    setFormTitle("");
    const defaultDept = rawDepartments[0]?.id || "";
    setFormDeptId(defaultDept);
    setFormGrade("Mid (L3)");
    setFormStatus("active");
    setIsAddOpen(true);
  }

  function handleOpenEdit(desig: DesignationRecord) {
    setEditingDesig(desig);
    setFormTitle(desig.title);
    setFormDeptId(desig.departmentId);
    setFormGrade(desig.gradeLevel || "Mid (L3)");
    setFormStatus(desig.status);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return toast.error("Designation title is required");

    createMut.mutate({
      name: formTitle.trim(),
      departmentId: formDeptId || undefined,
      description: formGrade,
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDesig) return;
    if (!formTitle.trim()) return toast.error("Designation title is required");

    updateMut.mutate({
      id: editingDesig.id,
      data: {
        name: formTitle.trim(),
        departmentId: formDeptId || undefined,
        description: formGrade,
      },
    });
  }

  function handleDelete() {
    if (!deletingDesig) return;
    deleteMut.mutate(deletingDesig.id);
  }

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No designations to export");
    const headers = ["Designation Title", "Department", "Grade Level", "Assigned Staff", "Status"];
    const rows = filtered.map((d) => [
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.departmentName.replace(/"/g, '""')}"`,
      `"${d.gradeLevel || "—"}"`,
      d.employeeCount || 0,
      d.status,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `designations-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Designations CSV exported successfully!");
  }

  return (
    <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/hrm-dashboard" },
          { label: "Workforce", href: "/hr/employees" },
          { label: "Designations" },
        ]}
        icon={<Briefcase className="size-5" />}
        title="Designations"
        description="Job positions, role seniority bands, and departmental workforce titles."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5 text-xs font-bold h-8.5"
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1.5 font-bold text-xs h-8.5 bg-primary text-primary-foreground shadow-2xs"
            >
              <Plus className="size-4" /> Add Designation
            </Button>
          </>
        }
      />

      {/* ── KPI Metric Cards ────────────────────────────────────────────── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Designations"
          value={totalDesignations}
          icon={<Award className="size-5" />}
          variant="primary"
          description="Registered role titles"
        />

        <StatCard
          label="Active Designations"
          value={activeDesignations}
          icon={<CheckCircle2 className="size-5" />}
          variant="success"
          description="Operational job tracks"
        />

        <StatCard
          label="Departments Covered"
          value={uniqueDeptsCount}
          icon={<Building2 className="size-5" />}
          variant="info"
          description="Across workforce units"
        />

        <StatCard
          label="Assigned Workforce"
          value={totalEmpsAssigned}
          icon={<Users className="size-5" />}
          variant="warning"
          description="Assigned employees"
        />
      </StatsOverviewGrid>

      {/* ── Filter & Search Bar ─────────────────────────────────────────── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search designation title, department, or grade...",
        }}
        filters={
          <>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[160px] text-xs h-8.5 bg-background">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {rawDepartments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] text-xs h-8.5 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-[150px] text-xs h-8.5 bg-background">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title-asc">Title (A – Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z – A)</SelectItem>
                <SelectItem value="dept-asc">Department</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* ── Designations Table ──────────────────────────────────────────── */}
      <Card className="border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      filtered.length > 0 && selectedIds.length === filtered.length
                    }
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedIds(filtered.map((d) => d.id));
                      else setSelectedIds([]);
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Designation
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Department
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Grade Level
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Staff Members
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {desigLoading || employeesLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading designations...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No designations found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((desig) => {
                  const isChecked = selectedIds.includes(desig.id);
                  const isDesigActive = desig.status === "active";

                  return (
                    <TableRow key={desig.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedIds((prev) => [...prev, desig.id]);
                            else setSelectedIds((prev) => prev.filter((i) => i !== desig.id));
                          }}
                          aria-label={`Select ${desig.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                            <Briefcase className="size-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {desig.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              REF: {desig.id.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs">
                          {desig.departmentName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {desig.gradeLevel || "Standard"}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/hr/employees" })}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/80 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        >
                          <Users className="size-3 text-muted-foreground" />
                          <span className="font-mono">{desig.employeeCount || 0}</span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isDesigActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-bold"
                              : "bg-muted text-muted-foreground text-[10px] font-bold"
                          }
                        >
                          <span
                            className={`size-1.5 rounded-full mr-1.5 ${
                              isDesigActive ? "bg-emerald-500" : "bg-muted-foreground"
                            }`}
                          />
                          {isDesigActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:bg-secondary/80"
                            onClick={() => handleOpenEdit(desig)}
                            title="Edit Designation"
                          >
                            <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => setDeletingDesig(desig)}
                            title="Delete Designation"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── ADD DESIGNATION MODAL (#add_designation) ────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="size-4 text-primary" /> Add Designation
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Designation Title *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Lead Solutions Architect, Financial Analyst"
                className="text-xs"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Department *</Label>
              <Select value={formDeptId} onValueChange={setFormDeptId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {rawDepartments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                  {rawDepartments.length === 0 && (
                    <SelectItem value="dept-gen">General Operations</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Grade / Seniority Level</Label>
              <Select value={formGrade} onValueChange={setFormGrade}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entry (L1)">Entry (L1)</SelectItem>
                  <SelectItem value="Junior (L2)">Junior (L2)</SelectItem>
                  <SelectItem value="Mid (L3)">Mid (L3)</SelectItem>
                  <SelectItem value="Senior (L4)">Senior (L4)</SelectItem>
                  <SelectItem value="Staff / Lead (L5)">Staff / Lead (L5)</SelectItem>
                  <SelectItem value="Director (L6)">Director (L6)</SelectItem>
                  <SelectItem value="Executive (L7)">Executive (L7)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={createMut.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending}
                className="font-bold bg-primary text-primary-foreground"
              >
                {createMut.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> Creating...
                  </>
                ) : (
                  "Create Designation"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DESIGNATION MODAL (#edit_designation) ───────────────────── */}
      {editingDesig && (
        <Dialog open={!!editingDesig} onOpenChange={(o) => !o && setEditingDesig(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit2 className="size-4 text-primary" /> Edit Designation
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Designation Title *</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department *</Label>
                <Select value={formDeptId} onValueChange={setFormDeptId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rawDepartments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                    {rawDepartments.length === 0 && (
                      <SelectItem value={editingDesig.departmentId}>
                        {editingDesig.departmentName}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Grade / Seniority Level</Label>
                <Select value={formGrade} onValueChange={setFormGrade}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entry (L1)">Entry (L1)</SelectItem>
                    <SelectItem value="Junior (L2)">Junior (L2)</SelectItem>
                    <SelectItem value="Mid (L3)">Mid (L3)</SelectItem>
                    <SelectItem value="Senior (L4)">Senior (L4)</SelectItem>
                    <SelectItem value="Staff / Lead (L5)">Staff / Lead (L5)</SelectItem>
                    <SelectItem value="Director (L6)">Director (L6)</SelectItem>
                    <SelectItem value="Executive (L7)">Executive (L7)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDesig(null)}
                  disabled={updateMut.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="font-bold bg-primary text-primary-foreground"
                >
                  {updateMut.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DELETE DESIGNATION MODAL (#delete_modal) ─────────────────────── */}
      <ConfirmationDialog
        open={!!deletingDesig}
        onOpenChange={(o) => !o && setDeletingDesig(null)}
        title="Delete Designation?"
        description={
          deletingDesig ? (
            <span>
              Are you sure you want to remove <strong>{deletingDesig.title}</strong>?
            </span>
          ) : undefined
        }
        confirmLabel="Confirm Delete"
        onConfirm={handleDelete}
        isLoading={deleteMut.isPending}
      >
        {(deletingDesig?.employeeCount || 0) > 0 && (
          <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-left text-[11px] flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              Warning: <strong>{deletingDesig?.employeeCount}</strong> staff members currently
              hold this designation.
            </span>
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
}
