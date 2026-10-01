import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ExternalLink,
  Flame,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/termination")({
  component: TerminationPage,
});

interface TerminationRecord {
  id: string;
  exitCode: string;
  employeeId: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  exitType: string;
  status: string;
  noticePeriodDays: number;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    jobTitle?: string | null;
    department?: {
      id: string;
      name: string;
    } | null;
  };
}

const TERMINATION_TYPES = [
  { value: "termination", label: "Termination (Disciplinary/Misconduct)" },
  { value: "poor_performance", label: "Poor Performance / PIP Failure" },
  { value: "layoff", label: "Layoff / Redundancy / Restructuring" },
  { value: "contract_end", label: "Contract Expiration" },
  { value: "mutual_separation", label: "Mutual Separation Agreement" },
];

export function TerminationPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenantId;

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TerminationRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Add form states
  const [employeeId, setEmployeeId] = useState("");
  const [terminationType, setTerminationType] = useState("termination");
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split("T")[0]);
  const [lastWorkingDay, setLastWorkingDay] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");

  // Edit form states
  const [editTerminationType, setEditTerminationType] = useState("termination");
  const [editNoticeDate, setEditNoticeDate] = useState("");
  const [editLastWorkingDay, setEditLastWorkingDay] = useState("");
  const [editReason, setEditReason] = useState("");

  // Fetch Exits that are not voluntary resignation
  const { data: exits = [], isLoading } = useQuery<TerminationRecord[]>({
    queryKey: ["exits", "termination", tenantId],
    queryFn: async () => {
      const res: TerminationRecord[] = await api.get("/api/offboarding/exits");
      // Exclude regular voluntary resignations
      return res.filter((e) => e.exitType !== "resignation");
    },
    enabled: !!tenantId,
  });

  // Fetch Employees for assignment
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["employees-list", tenantId],
    queryFn: async () => {
      const res = await api.get("/api/employees");
      return Array.isArray(res) ? res : res.data || [];
    },
    enabled: !!tenantId,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("/api/offboarding/exits", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exits"] });
      toast.success("Termination case recorded successfully");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create termination case");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/api/offboarding/exits/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exits"] });
      toast.success("Termination case updated");
      setEditingRecord(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update record");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/offboarding/exits/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exits"] });
      toast.success("Termination record removed");
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete record");
    },
  });

  const resetForm = () => {
    setEmployeeId("");
    setTerminationType("termination");
    setNoticeDate(new Date().toISOString().split("T")[0]);
    setLastWorkingDay(new Date().toISOString().split("T")[0]);
    setReason("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !reason) {
      toast.error("Please fill in required fields");
      return;
    }
    createMutation.mutate({
      employeeId,
      resignationDate: noticeDate,
      lastWorkingDay,
      reason,
      exitType: terminationType,
      noticePeriodDays: 0,
    });
  };

  const openEdit = (record: TerminationRecord) => {
    setEditingRecord(record);
    setEditTerminationType(record.exitType || "termination");
    setEditNoticeDate(
      record.resignationDate ? new Date(record.resignationDate).toISOString().split("T")[0] : ""
    );
    setEditLastWorkingDay(
      record.lastWorkingDay ? new Date(record.lastWorkingDay).toISOString().split("T")[0] : ""
    );
    setEditReason(record.reason || "");
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    updateMutation.mutate({
      id: editingRecord.id,
      body: {
        exitType: editTerminationType,
        resignationDate: editNoticeDate,
        lastWorkingDay: editLastWorkingDay,
        reason: editReason,
      },
    });
  };

  // Filtered List
  const filteredExits = exits.filter((item) => {
    const fullName = `${item.employee?.firstName || ""} ${item.employee?.lastName || ""}`.toLowerCase();
    const dept = item.employee?.department?.name?.toLowerCase() || "";
    const resReason = item.reason?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    const matchesSearch = fullName.includes(term) || dept.includes(term) || resReason.includes(term);

    const matchesType = typeFilter === "all" || item.exitType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Metrics
  const totalCount = exits.length;
  const disciplinaryCount = exits.filter((e) => e.exitType === "termination").length;
  const layoffCount = exits.filter((e) => e.exitType === "layoff").length;
  const settledCount = exits.filter((e) => e.status === "fnf_settled" || e.status === "completed").length;

  const formatExitTypeLabel = (val: string) => {
    const found = TERMINATION_TYPES.find((t) => t.value === val);
    return found ? found.label : val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/hrm" className="hover:text-primary transition-colors">HRM</Link>
            <span>/</span>
            <Link to="/offboarding" className="hover:text-primary transition-colors">Employee Lifecycle</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Termination</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            Termination Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record, audit, and track non-voluntary employee terminations, contract endings, and disciplinary separations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/offboarding">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Full Offboarding Hub
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Termination
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Involuntary Exits</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{totalCount}</h3>
            <span className="text-xs text-muted-foreground">Historical cases</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Disciplinary / Misconduct</p>
            <h3 className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{disciplinaryCount}</h3>
            <span className="text-xs text-muted-foreground">Immediate cause</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <Flame className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Layoffs / Restructure</p>
            <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{layoffCount}</h3>
            <span className="text-xs text-muted-foreground">Workforce realignment</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Clearance Closed</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{settledCount}</h3>
            <span className="text-xs text-muted-foreground">Assets & settlement completed</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Table Toolbar ── */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search terminated employee, dept, reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Termination Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Termination Types</SelectItem>
                {TERMINATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Data Table ── */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[80px]">Exit Code</TableHead>
                <TableHead>Terminated Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Termination Type</TableHead>
                <TableHead>Notice Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Loading termination cases...
                  </TableCell>
                </TableRow>
              ) : filteredExits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                    <p className="text-sm font-medium">No termination records found</p>
                    <p className="text-xs mt-1">Click "Add Termination" to record an involuntary separation</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExits.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs font-semibold text-destructive">
                      {item.exitCode}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-semibold text-xs shrink-0">
                          {item.employee?.firstName?.[0] || "E"}
                          {item.employee?.lastName?.[0] || ""}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {item.employee?.firstName} {item.employee?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.employee?.jobTitle || "Employee"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {item.employee?.department?.name || "General"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-xs">
                        {formatExitTypeLabel(item.exitType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {item.resignationDate
                        ? new Date(item.resignationDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                      {item.reason}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                      {item.lastWorkingDay
                        ? new Date(item.lastWorkingDay).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Record
                          </DropdownMenuItem>
                          <Link to="/offboarding">
                            <DropdownMenuItem>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Manage Clearances
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem
                            onClick={() => setDeleteTargetId(item.id)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Add Termination Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Termination</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Terminated Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department?.name || "General"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Termination Type *</Label>
              <Select value={terminationType} onValueChange={setTerminationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMINATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Notice Date *</Label>
                <Input
                  type="date"
                  value={noticeDate}
                  onChange={(e) => setNoticeDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Effective Date *</Label>
                <Input
                  type="date"
                  value={lastWorkingDay}
                  onChange={(e) => setLastWorkingDay(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason / Documentation *</Label>
              <Textarea
                placeholder="Specific justification and notes for separation..."
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Submitting..." : "Save Termination"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Termination Dialog ── */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Termination Case</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Terminated Employee</Label>
              <Input
                disabled
                value={`${editingRecord?.employee?.firstName || ""} ${editingRecord?.employee?.lastName || ""}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Termination Type</Label>
              <Select value={editTerminationType} onValueChange={setEditTerminationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMINATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Notice Date</Label>
                <Input
                  type="date"
                  value={editNoticeDate}
                  onChange={(e) => setEditNoticeDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={editLastWorkingDay}
                  onChange={(e) => setEditLastWorkingDay(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason / Documentation</Label>
              <Textarea
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Delete Termination Case</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this termination case? This will permanently remove the record and any associated clearances.
          </p>
          <DialogFooter className="mt-4 sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
