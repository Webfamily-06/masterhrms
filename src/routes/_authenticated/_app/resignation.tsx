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
  Filter,
  MoreVertical,
  Trash2,
  Edit,
  UserX,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/resignation")({
  component: ResignationPage,
});

interface ExitRecord {
  id: string;
  exitCode: string;
  employeeId: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  exitType: string;
  status: string;
  noticePeriodDays: number;
  fnfSettlementAmount?: number;
  fnfSettlementStatus?: string;
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

export function ResignationPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenantId;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExitRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Employee Self-Service Resignation State
  const [isSelfResignOpen, setIsSelfResignOpen] = useState(false);
  const [selfResignForm, setSelfResignForm] = useState({
    preferredLastWorkingDay: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split("T")[0],
    reason: "",
  });

  // Query caller's self-service resignation status
  const { data: myResignation, isLoading: isMyResignationLoading } = useQuery({
    queryKey: ["my-resignation-status"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/resignation");
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  const selfResignMut = useMutation({
    mutationFn: async (payload: { preferredLastWorkingDay: string; reason: string }) =>
      api.post("/api/v1/me/resignation", payload),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Resignation submitted successfully to management.");
      qc.invalidateQueries({ queryKey: ["my-resignation-status"] });
      qc.invalidateQueries({ queryKey: ["exits"] });
      setIsSelfResignOpen(false);
      setSelfResignForm({
        preferredLastWorkingDay: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split("T")[0],
        reason: "",
      });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to submit resignation"),
  });

  // Form states
  const [employeeId, setEmployeeId] = useState("");
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split("T")[0]);
  const [resignationDate, setResignationDate] = useState(
    new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");

  // Edit form states
  const [editNoticeDate, setEditNoticeDate] = useState("");
  const [editResignationDate, setEditResignationDate] = useState("");
  const [editReason, setEditReason] = useState("");

  // Fetch Exits with exitType=resignation
  const { data: exits = [], isLoading } = useQuery<ExitRecord[]>({
    queryKey: ["exits", "resignation", tenantId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("exitType", "resignation");
      if (statusFilter !== "all") params.append("status", statusFilter);
      return api.get(`/api/offboarding/exits?${params.toString()}`);
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
      toast.success("Resignation record created successfully");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create resignation record");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/api/offboarding/exits/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exits"] });
      toast.success("Resignation record updated");
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
      toast.success("Resignation record removed");
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete record");
    },
  });

  const resetForm = () => {
    setEmployeeId("");
    setNoticeDate(new Date().toISOString().split("T")[0]);
    setResignationDate(new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split("T")[0]);
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
      lastWorkingDay: resignationDate,
      reason,
      exitType: "resignation",
    });
  };

  const openEdit = (record: ExitRecord) => {
    setEditingRecord(record);
    setEditNoticeDate(
      record.resignationDate ? new Date(record.resignationDate).toISOString().split("T")[0] : ""
    );
    setEditResignationDate(
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
        resignationDate: editNoticeDate,
        lastWorkingDay: editResignationDate,
        reason: editReason,
      },
    });
  };

  // Filtered Exits
  const filteredExits = exits.filter((item) => {
    const fullName = `${item.employee?.firstName || ""} ${item.employee?.lastName || ""}`.toLowerCase();
    const dept = item.employee?.department?.name?.toLowerCase() || "";
    const resReason = item.reason?.toLowerCase() || "";
    const code = item.exitCode?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();

    return fullName.includes(term) || dept.includes(term) || resReason.includes(term) || code.includes(term);
  });

  // Calculate Metrics
  const totalCount = exits.length;
  const servingNoticeCount = exits.filter((e) => e.status === "serving_notice").length;
  const clearancePendingCount = exits.filter((e) => e.status === "clearance_pending").length;
  const settledCount = exits.filter((e) => e.status === "fnf_settled" || e.status === "completed").length;

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
            <span className="text-foreground font-medium">Resignation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserX className="h-6 w-6 text-rose-500" />
            Resignation Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log and manage voluntary employee resignations, notice periods, and clearance handovers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSelfResignOpen(true)}
            className="gap-2 text-rose-600 border-rose-500/30 hover:bg-rose-50 shadow-sm"
          >
            <UserX className="h-4 w-4" />
            Submit My Resignation
          </Button>
          <Link to="/offboarding">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Full Offboarding Hub
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Resignation
          </Button>
        </div>
      </div>

      {/* ── My Personal Separation Status Banner ── */}
      {myResignation && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/20 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20 grid place-items-center">
                <UserX className="size-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  My Active Separation & Notice Tracker
                  <Badge variant="outline" className="text-[10px] uppercase font-bold bg-rose-500/10 text-rose-600 border-rose-500/30">
                    {myResignation.status?.replace(/_/g, " ")}
                  </Badge>
                </h4>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Exit Reference: {myResignation.exitCode}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Official Last Working Day</span>
              <span className="text-xs font-black font-mono text-foreground">
                {myResignation.lastWorkingDay ? new Date(myResignation.lastWorkingDay).toLocaleDateString() : "Pending Scheduling"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Submitted Reason</span>
              <p className="text-foreground font-medium line-clamp-2">{myResignation.reason}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Notice Period Policy</span>
              <p className="text-foreground font-medium font-mono">{myResignation.noticePeriodDays || 60} Days Required</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Clearance & FnF Status</span>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                {myResignation.fnfSettlementStatus || "Checklists in progress across IT, Finance, HR"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Resignations</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{totalCount}</h3>
            <span className="text-xs text-muted-foreground">Historical records</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <UserX className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Serving Notice</p>
            <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{servingNoticeCount}</h3>
            <span className="text-xs text-muted-foreground">Active in transition</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Clearance Pending</p>
            <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{clearancePendingCount}</h3>
            <span className="text-xs text-muted-foreground">4-Dept checklist open</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">FnF Settled & Relieved</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{settledCount}</h3>
            <span className="text-xs text-muted-foreground">Full handover closed</span>
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
                placeholder="Search employee, dept, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="serving_notice">Serving Notice</SelectItem>
                <SelectItem value="clearance_pending">Clearance Pending</SelectItem>
                <SelectItem value="fnf_settled">FnF Settled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
                <TableHead>Resigning Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Notice Date</TableHead>
                <TableHead>Resignation Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Loading resignation records...
                  </TableCell>
                </TableRow>
              ) : filteredExits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <UserX className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                    <p className="text-sm font-medium">No resignation records found</p>
                    <p className="text-xs mt-1">Click "Add Resignation" to record an employee departure</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExits.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {item.exitCode}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
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
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {item.reason}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {item.resignationDate
                        ? new Date(item.resignationDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                      {item.lastWorkingDay
                        ? new Date(item.lastWorkingDay).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {item.status === "serving_notice" && (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600">
                          Serving Notice
                        </Badge>
                      )}
                      {item.status === "clearance_pending" && (
                        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600">
                          Clearance Pending
                        </Badge>
                      )}
                      {(item.status === "fnf_settled" || item.status === "completed") && (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                          Settled & Closed
                        </Badge>
                      )}
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
                            Edit Details
                          </DropdownMenuItem>
                          <Link to="/offboarding">
                            <DropdownMenuItem>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Clearances
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

      {/* ── Add Resignation Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Resignation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Resigning Employee *</Label>
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
                <Label>Resignation Date *</Label>
                <Input
                  type="date"
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea
                placeholder="Reason for resignation..."
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Submitting..." : "Submit Resignation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Resignation Dialog ── */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Resignation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Resigning Employee</Label>
              <Input
                disabled
                value={`${editingRecord?.employee?.firstName || ""} ${editingRecord?.employee?.lastName || ""}`}
              />
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
                <Label>Resignation Date</Label>
                <Input
                  type="date"
                  value={editResignationDate}
                  onChange={(e) => setEditResignationDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
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
            <DialogTitle className="text-center">Delete Resignation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this resignation record? This action will remove all clearance checklists associated with this exit.
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
      {/* ── Employee Self-Service Resignation Dialog ── */}
      <Dialog open={isSelfResignOpen} onOpenChange={setIsSelfResignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserX className="size-5 text-rose-600" /> Submit Formal Resignation Letter
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selfResignForm.reason.trim()) {
                toast.error("Please provide a reason or statement for your resignation");
                return;
              }
              selfResignMut.mutate(selfResignForm);
            }}
            className="space-y-4 py-2 text-xs"
          >
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300">
              <p className="font-semibold text-xs">Standard Notice Period: 60 Days</p>
              <p className="text-[11px] mt-0.5 opacity-90">
                Submitting this formal notice will notify HR Operations and your line manager to initiate handover and departmental clearances.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Preferred Last Working Day *</Label>
              <Input
                type="date"
                required
                value={selfResignForm.preferredLastWorkingDay}
                onChange={(e) =>
                  setSelfResignForm({ ...selfResignForm, preferredLastWorkingDay: e.target.value })
                }
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Your manager will finalize the official last working day during clearance review.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Departure & Statement *</Label>
              <Textarea
                required
                rows={4}
                placeholder="Please share details regarding your career transition, relocation, or personal reasons..."
                value={selfResignForm.reason}
                onChange={(e) =>
                  setSelfResignForm({ ...selfResignForm, reason: e.target.value })
                }
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsSelfResignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={selfResignMut.isPending}
                className="font-bold gap-1 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {selfResignMut.isPending ? "Submitting..." : "Submit Formal Notice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
