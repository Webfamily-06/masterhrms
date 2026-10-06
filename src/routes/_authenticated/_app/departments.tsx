import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Building2,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  Users,
  ChevronRight,
  FolderTree,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowUpDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/departments")({
  component: DepartmentsPage,
  head: () => ({
    meta: [{ title: "Departments — Master HRMS" }],
  }),
});

interface DepartmentRecord {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  _count?: {
    employees: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export function DepartmentsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "employees-desc" | "recent">("name-asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [deletingDept, setDeletingDept] = useState<DepartmentRecord | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Query Departments
  const { data: rawDepartments = [], isLoading } = useQuery<DepartmentRecord[]>({
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

  // Query Employees (for cross-checking total count)
  const { data: rawEmployees = [] } = useQuery({
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

  // Create Department Mutation
  const createMut = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      return await api.post("/employees/departments", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setIsAddOpen(false);
      setName("");
      setDescription("");
      toast.success("Department created successfully!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create department"),
  });

  // Update Department Mutation
  const updateMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { name: string; description?: string } }) => {
      return await api.put(`/employees/departments/${id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setEditingDept(null);
      setName("");
      setDescription("");
      toast.success("Department updated successfully!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update department"),
  });

  // Delete Department Mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/employees/departments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setDeletingDept(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingDept?.id));
      toast.success("Department removed successfully!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove department"),
  });

  // Filtered & Sorted list
  const filtered = rawDepartments
    .filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "all" ? true : (d.status || "active") === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "employees-desc") {
        return (b._count?.employees || 0) - (a._count?.employees || 0);
      }
      return 0;
    });

  // Stats calculation
  const totalDepartments = rawDepartments.length;
  const totalAssignedStaff = rawDepartments.reduce((acc, d) => acc + (d._count?.employees || 0), 0);
  const activeDepartments = rawDepartments.filter((d) => (d.status || "active") === "active").length;
  const largestDepartment = [...rawDepartments].sort(
    (a, b) => (b._count?.employees || 0) - (a._count?.employees || 0)
  )[0];

  function handleOpenEdit(dept: DepartmentRecord) {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setStatus((dept.status as "active" | "inactive") || "active");
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(filtered.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  }

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No departments to export");
    const headers = ["Department Name", "Description", "Staff Count", "Status"];
    const rows = filtered.map((d) => [
      `"${d.name.replace(/"/g, '""')}"`,
      `"${(d.description || "").replace(/"/g, '""')}"`,
      d._count?.employees || 0,
      d.status || "active",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `departments-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Departments CSV exported successfully!");
  }

  return (
    <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/hrm-dashboard" },
          { label: "Workforce", href: "/employees" },
          { label: "Departments" },
        ]}
        icon={<Building2 className="size-5" />}
        title="Departments"
        description="Organizational structural units, workforce allocations, and department leadership."
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
              onClick={() => {
                setName("");
                setDescription("");
                setStatus("active");
                setIsAddOpen(true);
              }}
              className="gap-1.5 font-bold text-xs h-8.5 bg-primary text-primary-foreground shadow-2xs"
            >
              <Plus className="size-4" /> Add Department
            </Button>
          </>
        }
      />

      {/* ── KPI Summary Cards ───────────────────────────────────────────── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Departments"
          value={totalDepartments}
          icon={<FolderTree className="size-5" />}
          variant="primary"
          description="Total active units"
        />

        <StatCard
          label="Active Departments"
          value={activeDepartments}
          icon={<CheckCircle2 className="size-5" />}
          variant="success"
          description="Operational units"
        />

        <StatCard
          label="Assigned Workforce"
          value={totalAssignedStaff}
          icon={<Users className="size-5" />}
          variant="info"
          description="Active staff members"
        />

        <StatCard
          label="Largest Department"
          value={largestDepartment?.name || "N/A"}
          icon={<Building2 className="size-5" />}
          variant="warning"
          description={
            largestDepartment
              ? `${largestDepartment._count?.employees || 0} assigned staff`
              : "No assignments"
          }
        />
      </StatsOverviewGrid>

      {/* ── Filters & Search Bar ────────────────────────────────────────── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search department name or description...",
        }}
        filters={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] text-xs h-8.5 bg-background">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-[170px] text-xs h-8.5 bg-background">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A – Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z – A)</SelectItem>
                <SelectItem value="employees-desc">Staff Count (High – Low)</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* ── Departments Table ───────────────────────────────────────────── */}
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
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Department
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Description
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading departments...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    No departments found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => {
                  const empCount = d._count?.employees || 0;
                  const isChecked = selectedIds.includes(d.id);
                  const isDeptActive = (d.status || "active") === "active";

                  return (
                    <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleSelectOne(d.id, !!checked)}
                          aria-label={`Select ${d.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-primary/10 grid place-items-center text-primary font-bold text-xs shrink-0">
                            {d.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {d.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {d.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {d.description || "—"}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/employees" })}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/80 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        >
                          <Users className="size-3 text-muted-foreground" />
                          <span className="font-mono">{empCount}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {empCount === 1 ? "staff" : "staff"}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isDeptActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-bold"
                              : "bg-muted text-muted-foreground text-[10px] font-bold"
                          }
                        >
                          <span
                            className={`size-1.5 rounded-full mr-1.5 ${
                              isDeptActive ? "bg-emerald-500" : "bg-muted-foreground"
                            }`}
                          />
                          {isDeptActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:bg-secondary/80"
                            onClick={() => handleOpenEdit(d)}
                            title="Edit Department"
                          >
                            <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => setDeletingDept(d)}
                            title="Delete Department"
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

      {/* ── ADD DEPARTMENT MODAL (#add_department) ─────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Add Department
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return toast.error("Department name is required");
              createMut.mutate({ name: name.trim(), description: description.trim() });
            }}
            className="space-y-4 text-xs"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Department Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering, Sales, Human Resources"
                className="text-xs"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of department responsibilities and mandate..."
                rows={3}
                className="w-full p-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
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
                  "Create Department"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DEPARTMENT MODAL (#edit_department) ────────────────────── */}
      {editingDept && (
        <Dialog open={!!editingDept} onOpenChange={(o) => !o && setEditingDept(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit2 className="size-4 text-primary" /> Edit Department
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return toast.error("Department name is required");
                updateMut.mutate({
                  id: editingDept.id,
                  payload: { name: name.trim(), description: description.trim() },
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
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
                  onClick={() => setEditingDept(null)}
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

      {/* ── DELETE DEPARTMENT CONFIRMATION MODAL (#delete_modal) ────────── */}
      <ConfirmationDialog
        open={!!deletingDept}
        onOpenChange={(o) => !o && setDeletingDept(null)}
        title="Delete Department?"
        description={
          deletingDept ? (
            <span>
              Are you sure you want to remove <strong>{deletingDept.name}</strong>?
            </span>
          ) : undefined
        }
        confirmLabel="Confirm Delete"
        onConfirm={() => {
          if (deletingDept) deleteMut.mutate(deletingDept.id);
        }}
        isLoading={deleteMut.isPending}
      >
        {(deletingDept?._count?.employees || 0) > 0 && (
          <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-left text-[11px] flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              Warning: There are <strong>{deletingDept?._count?.employees}</strong> staff
              members currently assigned to this department. They will need to be reassigned.
            </span>
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
}
