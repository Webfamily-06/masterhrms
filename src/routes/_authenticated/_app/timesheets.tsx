import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  ChevronRight,
  FolderGit2,
  TrendingUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/timesheets")({
  component: TimesheetsPage,
  head: () => ({
    meta: [{ title: "Timesheets — Master HRMS" }],
  }),
});

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  employeeRole?: string;
  date: string; // YYYY-MM-DD
  projectId: string;
  projectName: string;
  assignedHours: number;
  workedHours: number;
  description?: string;
}

export function TimesheetsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<TimesheetEntry | null>(null);

  // Form inputs
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAssignedHours, setFormAssignedHours] = useState("40");
  const [formWorkedHours, setFormWorkedHours] = useState("8");
  const [formDesc, setFormDesc] = useState("");

  // Query real employees
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

  // Query real projects
  const { data: rawProjects = [] } = useQuery({
    queryKey: ["projects", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/projects");
        return Array.isArray(res) ? res : (res?.data || []);
      } catch {
        return [];
      }
    },
  });

  // Query Timesheets from MySQL Database
  const { data: rawTimesheets = [], isLoading } = useQuery({
    queryKey: ["workspace-timesheets", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/workspace/timesheets");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const timesheets: TimesheetEntry[] = rawTimesheets.map((t: any) => ({
    id: t.id,
    employeeId: t.employeeId,
    employeeName: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : "Staff Member",
    employeeAvatar: t.employee?.avatarUrl || "",
    employeeRole: t.employee?.position || "Member",
    date: typeof t.date === "string" ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10),
    projectId: t.project || "proj-gen",
    projectName: t.project || "General Operations",
    assignedHours: 40,
    workedHours: Number(t.hoursWorked) || 0,
    description: t.description || t.task || "",
  }));

  // Create Mutation
  const createMut = useMutation({
    mutationFn: async (data: any) => api.post("/workspace/timesheets", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-timesheets", tenantId] });
      setIsAddOpen(false);
      toast.success("Timesheet entry logged in database!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to log timesheet"),
  });

  // Update Mutation
  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/workspace/timesheets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-timesheets", tenantId] });
      setEditingEntry(null);
      toast.success("Timesheet updated successfully!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update timesheet"),
  });

  // Delete Mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/workspace/timesheets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-timesheets", tenantId] });
      setDeletingEntry(null);
      toast.success("Timesheet entry deleted from database.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete timesheet"),
  });

  // Unique project names for filter
  const uniqueProjects = Array.from(
    new Set(timesheets.map((t) => t.projectName))
  );

  // Filtered entries
  const filtered = timesheets.filter((t) => {
    const matchSearch =
      t.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      t.projectName.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      t.date.includes(search);
    const matchProj = projectFilter === "all" ? true : t.projectName === projectFilter;
    return matchSearch && matchProj;
  });

  // Stats
  const totalWorked = timesheets.reduce((acc, t) => acc + Number(t.workedHours || 0), 0);
  const totalAssigned = timesheets.reduce((acc, t) => acc + Number(t.assignedHours || 0), 0);
  const overtimeCount = timesheets.filter((t) => Number(t.workedHours) > Number(t.assignedHours)).length;

  function handleOpenAdd() {
    const firstEmp = rawEmployees[0];
    setFormEmployeeId(firstEmp ? firstEmp.id : "");
    const firstProj = rawProjects[0];
    setFormProjectId(firstProj ? firstProj.name : "General Project");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormAssignedHours("40");
    setFormWorkedHours("8");
    setFormDesc("");
    setIsAddOpen(true);
  }

  function handleOpenEdit(entry: TimesheetEntry) {
    setEditingEntry(entry);
    setFormEmployeeId(entry.employeeId);
    setFormProjectId(entry.projectId);
    setFormDate(entry.date);
    setFormAssignedHours(String(entry.assignedHours));
    setFormWorkedHours(String(entry.workedHours));
    setFormDesc(entry.description || "");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmployeeId) {
      return toast.error("Please select an employee");
    }

    createMut.mutate({
      employeeId: formEmployeeId,
      date: formDate,
      hoursWorked: Number(formWorkedHours) || 8,
      project: formProjectId || "General Project",
      task: formDesc.trim() || "Daily Work",
      description: formDesc.trim(),
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;

    updateMut.mutate({
      id: editingEntry.id,
      data: {
        date: formDate,
        hoursWorked: Number(formWorkedHours) || editingEntry.workedHours,
        project: formProjectId || editingEntry.projectName,
        task: formDesc.trim() || editingEntry.description,
        description: formDesc.trim(),
      },
    });
  }

  function handleDelete() {
    if (!deletingEntry) return;
    deleteMut.mutate(deletingEntry.id);
  }

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No entries to export");
    const headers = ["Employee", "Date", "Project", "Assigned Hours", "Worked Hours", "Description"];
    const rows = filtered.map((t) => [
      `"${t.employeeName.replace(/"/g, '""')}"`,
      t.date,
      `"${t.projectName.replace(/"/g, '""')}"`,
      t.assignedHours,
      t.workedHours,
      `"${(t.description || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `timesheets-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Timesheets CSV exported successfully!");
  }

  return (
    <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
      {/* ── Breadcrumb & Top Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Clock className="size-6 text-primary" /> Timesheets
          </h1>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <Link to="/attendance" className="hover:text-foreground transition-colors">
              Attendance
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="font-semibold text-foreground">Timesheets</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="size-3.5" /> Export CSV
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="size-4" /> Add Today’s Work
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-xs bg-card flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
            <Clock className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Total Logged Hours</div>
            <div className="text-xl font-black font-mono tracking-tight">{totalWorked} hrs</div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card flex items-center gap-3">
          <div className="size-11 rounded-xl bg-blue-500/10 grid place-items-center text-blue-600 shrink-0">
            <FolderGit2 className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Active Projects</div>
            <div className="text-xl font-black font-mono tracking-tight text-blue-600">
              {uniqueProjects.length}
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card flex items-center gap-3">
          <div className="size-11 rounded-xl bg-emerald-500/10 grid place-items-center text-emerald-600 shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Capacity Assigned</div>
            <div className="text-xl font-black font-mono tracking-tight text-emerald-600">
              {totalAssigned} hrs
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card flex items-center gap-3">
          <div className="size-11 rounded-xl bg-amber-500/10 grid place-items-center text-amber-600 shrink-0">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Overtime Entries</div>
            <div className="text-xl font-black font-mono tracking-tight text-amber-600">
              {overtimeCount} logs
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filter & Search Bar ─────────────────────────────────────────── */}
      <Card className="p-4 border shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, project, or task note..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px] text-xs h-9">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {uniqueProjects.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Timesheets Table ────────────────────────────────────────────── */}
      <Card className="border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Employee
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Project
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Assigned
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Worked Hours
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
                    Loading timesheets...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    No timesheet logs found for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => {
                  const isOvertime = Number(entry.workedHours) > Number(entry.assignedHours);

                  return (
                    <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border">
                            <AvatarImage src={entry.employeeAvatar} />
                            <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                              {entry.employeeName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {entry.employeeName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {entry.employeeRole || "Engineering"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {new Date(entry.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                          {entry.projectName}
                          {entry.description && (
                            <span title={entry.description} className="cursor-help">
                              <Info className="size-3.5 text-muted-foreground" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {entry.assignedHours} hrs
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {entry.workedHours} hrs
                          </span>
                          {isOvertime && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40"
                            >
                              +{(entry.workedHours - entry.assignedHours).toFixed(1)} OT
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:bg-secondary/80"
                            onClick={() => handleOpenEdit(entry)}
                            title="Edit Timesheet"
                          >
                            <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => setDeletingEntry(entry)}
                            title="Delete Entry"
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

      {/* ── ADD TODAY'S WORK MODAL (#add_timesheet) ──────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Add Today’s Work
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Employee *</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {rawEmployees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name || e.firstName} {e.last_name || e.lastName} ({e.employee_code || e.employeeCode || "EMP"})
                    </SelectItem>
                  ))}
                  {rawEmployees.length === 0 && (
                    <SelectItem value="emp-1">Anthony Lewis (UI/UX)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Project *</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Choose project" />
                </SelectTrigger>
                <SelectContent>
                  {rawProjects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                  {rawProjects.length === 0 && (
                    <>
                      <SelectItem value="proj-1">Office Management ERP</SelectItem>
                      <SelectItem value="proj-2">Hospital Administration System</SelectItem>
                      <SelectItem value="proj-3">Cloud Migration & Terraform</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned (hrs)</Label>
                <Input
                  type="number"
                  value={formAssignedHours}
                  onChange={(e) => setFormAssignedHours(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Worked (hrs) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formWorkedHours}
                  onChange={(e) => setFormWorkedHours(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Work / Task Description</Label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="What did the staff work on today? e.g. Frontend layout redesign and bug fixes..."
                rows={3}
                className="w-full p-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
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
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> Logging...
                  </>
                ) : (
                  "Log Timesheet"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT TIMESHEET MODAL (#edit_timesheet) ──────────────────────── */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={(o) => !o && setEditingEntry(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit2 className="size-4 text-primary" /> Edit Timesheet Entry
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Project</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rawProjects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                    {rawProjects.length === 0 && (
                      <SelectItem value={editingEntry.projectId}>
                        {editingEntry.projectName}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date *</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Assigned (hrs)</Label>
                  <Input
                    type="number"
                    value={formAssignedHours}
                    onChange={(e) => setFormAssignedHours(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Worked (hrs) *</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formWorkedHours}
                    onChange={(e) => setFormWorkedHours(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Work / Task Description</Label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEntry(null)}
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

      {/* ── DELETE TIMESHEET MODAL (#delete_modal) ───────────────────────── */}
      {deletingEntry && (
        <Dialog open={!!deletingEntry} onOpenChange={(o) => !o && setDeletingEntry(null)}>
          <DialogContent className="max-w-sm text-center">
            <div className="size-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 mx-auto grid place-items-center mb-2">
              <AlertTriangle className="size-6" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-center">
                Delete Timesheet Entry?
              </DialogTitle>
            </DialogHeader>

            <div className="text-xs text-muted-foreground space-y-2 py-2">
              <p>
                Are you sure you want to remove the work log for{" "}
                <strong>{deletingEntry.employeeName}</strong> on {deletingEntry.date}?
              </p>
            </div>

            <DialogFooter className="gap-2 sm:justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingEntry(null)}
                disabled={deleteMut.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMut.isPending}
                className="font-bold"
              >
                {deleteMut.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
