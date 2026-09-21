import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  UserMinus,
  CheckCircle2,
  Clock,
  Laptop,
  Wallet,
  FileText,
  Download,
  AlertCircle,
  Plus,
  ShieldCheck,
  Calendar,
  Sparkles,
  Award,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Trash2,
  Edit2,
  ArrowRight,
  Printer,
  Building2,
  Key,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/offboarding")({
  component: OffboardingPage,
  head: () => ({ meta: [{ title: "Exit & Offboarding Clearance — Master HRMS" }] }),
});

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  serving_notice: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", label: "Serving Notice" },
  clearance_pending: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", label: "Clearance In Progress" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", label: "Settled & Relieved" },
};

export function OffboardingPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isInitiateExitOpen, setIsInitiateExitOpen] = useState(false);
  const [selectedExitPassport, setSelectedExitPassport] = useState<any>(null);
  const [selectedRelievingLetter, setSelectedRelievingLetter] = useState<any>(null);
  const [isFnfModalOpen, setIsFnfModalOpen] = useState(false);

  // Forms
  const [exitForm, setExitForm] = useState({
    employeeId: "",
    resignationDate: new Date().toISOString().slice(0, 10),
    lastWorkingDay: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    reason: "",
    exitType: "resignation",
    noticePeriodDays: "60",
    fnfSettlementAmount: "0",
  });

  const [fnfForm, setFnfForm] = useState({
    fnfSettlementAmount: "45000",
    exitInterviewNotes: "Employee completed formal knowledge transfer. Clean separation.",
  });

  // Queries
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: exits = [], isLoading: isExitsLoading } = useQuery({
    queryKey: ["offboarding-exits", tenantId, selectedStatusFilter, selectedDepartmentFilter, searchQuery],
    queryFn: async () => {
      try {
        let url = `/offboarding/exits?status=${selectedStatusFilter}&departmentId=${selectedDepartmentFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["offboarding-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/offboarding/summary");
      } catch {
        return { totalExits: 0, servingNoticeCount: 0, clearancePendingCount: 0, completedCount: 0, totalFnfAmount: 0 };
      }
    },
  });

  // Mutations
  const initiateExitMut = useMutation({
    mutationFn: async (payload: any) => api.post("/offboarding/exits", payload),
    onSuccess: () => {
      toast.success("Employee exit initiated and clearance checklists generated!");
      qc.invalidateQueries({ queryKey: ["offboarding-exits"] });
      qc.invalidateQueries({ queryKey: ["offboarding-summary"] });
      setIsInitiateExitOpen(false);
      resetExitForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to initiate exit"),
  });

  const updateClearanceMut = useMutation({
    mutationFn: async ({ id, department, isCleared, notes }: { id: string; department: string; isCleared: boolean; notes?: string }) =>
      api.put(`/offboarding/exits/${id}/clearance`, { department, isCleared, notes }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Clearance status updated!");
      qc.invalidateQueries({ queryKey: ["offboarding-exits"] });
      qc.invalidateQueries({ queryKey: ["offboarding-summary"] });
      if (selectedExitPassport) {
        setSelectedExitPassport(res.exit);
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to update clearance"),
  });

  const toggleChecklistMut = useMutation({
    mutationFn: async ({ exitId, itemId, isCompleted }: { exitId: string; itemId: string; isCompleted: boolean }) =>
      api.put(`/offboarding/exits/${exitId}/checklist/${itemId}`, { isCompleted }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offboarding-exits"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update checklist item"),
  });

  const settleFnfMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      api.post(`/offboarding/exits/${id}/settle-fnf`, data),
    onSuccess: (res: any) => {
      toast.success(res.message || "Full & Final settlement completed and Relieving Letter issued!");
      qc.invalidateQueries({ queryKey: ["offboarding-exits"] });
      qc.invalidateQueries({ queryKey: ["offboarding-summary"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      setIsFnfModalOpen(false);
      if (selectedExitPassport) {
        setSelectedExitPassport(res.exit);
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to settle FnF"),
  });

  const deleteExitMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/offboarding/exits/${id}`),
    onSuccess: () => {
      toast.success("Exit record deleted");
      qc.invalidateQueries({ queryKey: ["offboarding-exits"] });
      qc.invalidateQueries({ queryKey: ["offboarding-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete exit"),
  });

  function resetExitForm() {
    setExitForm({
      employeeId: employees[0]?.id || "",
      resignationDate: new Date().toISOString().slice(0, 10),
      lastWorkingDay: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      reason: "",
      exitType: "resignation",
      noticePeriodDays: "60",
      fnfSettlementAmount: "0",
    });
  }

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <UserMinus className="size-6 text-primary" /> Offboarding & Employee Exit Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multi-department clearance (IT, Finance, HR, Admin), asset recoveries, exit interviews, and Full & Final (FnF) settlements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              resetExitForm();
              setIsInitiateExitOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Initiate Employee Exit</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500" /> Serving Notice Period
          </span>
          <div className="text-xl font-black font-mono text-amber-600">
            {summary?.servingNoticeCount || 0} Staff
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Laptop className="size-3.5 text-blue-500" /> Clearances In Progress
          </span>
          <div className="text-xl font-black font-mono text-blue-600">
            {summary?.clearancePendingCount || 0} Cases
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
            <Wallet className="size-3.5" /> FnF Settlements Total
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
            {formatSystemAmount(summary?.totalFnfAmount || 0, sysConfig?.currency)}
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-purple-500" /> Relieved & Completed
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.completedCount || 0} Exits
          </div>
        </Card>
      </div>

      {/* Main Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff, exit code..."
              className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
            />
          </div>

          <Select value={selectedDepartmentFilter} onValueChange={setSelectedDepartmentFilter}>
            <SelectTrigger className="h-7 text-xs w-40 bg-background">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
          <SelectTrigger className="h-7 text-xs w-44 bg-background">
            <SelectValue placeholder="All Exit Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exit Statuses</SelectItem>
            <SelectItem value="serving_notice">Serving Notice</SelectItem>
            <SelectItem value="clearance_pending">Clearance In Progress</SelectItem>
            <SelectItem value="completed">Settled & Relieved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Exit Pipelines Table */}
      <Card className="border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead className="text-xs">Exit Code & Staff</TableHead>
                <TableHead className="text-xs">Resignation Date</TableHead>
                <TableHead className="text-xs">Last Working Day (LWD)</TableHead>
                <TableHead className="text-xs">Department Clearances</TableHead>
                <TableHead className="text-xs">FnF Settlement</TableHead>
                <TableHead className="text-xs">Exit Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isExitsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs">
                    Loading offboarding records...
                  </TableCell>
                </TableRow>
              ) : exits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs italic">
                    No active offboarding records found. Click "Initiate Employee Exit" to start an exit workflow.
                  </TableCell>
                </TableRow>
              ) : (
                exits.map((exit: any) => {
                  const st = STATUS_CONFIG[exit.status] || STATUS_CONFIG.serving_notice;

                  return (
                    <TableRow key={exit.id} className="hover:bg-muted/20 text-xs">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 border">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {exit.employee?.firstName?.[0]}
                              {exit.employee?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-mono font-black text-primary block">{exit.exitCode}</span>
                            <span className="font-bold text-foreground block">
                              {exit.employee?.firstName} {exit.employee?.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {exit.employee?.department?.name || "General"} · {exit.employee?.position || "Staff"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono">
                        {new Date(exit.resignationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-foreground block">
                            {new Date(exit.lastWorkingDay).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {exit.noticePeriodDays} days notice
                          </span>
                        </div>
                      </TableCell>

                      {/* 4 Clearance Badges */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold px-1.5 py-0 ${
                              exit.itClearance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            IT {exit.itClearance ? "✓" : "—"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold px-1.5 py-0 ${
                              exit.financeClearance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            Finance {exit.financeClearance ? "✓" : "—"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold px-1.5 py-0 ${
                              exit.hrClearance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            HR {exit.hrClearance ? "✓" : "—"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold px-1.5 py-0 ${
                              exit.adminClearance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            Admin {exit.adminClearance ? "✓" : "—"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono font-black text-xs text-foreground">
                        {exit.fnfSettlementAmount > 0
                          ? formatSystemAmount(Number(exit.fnfSettlementAmount), sysConfig?.currency)
                          : "Pending Calc"}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${st.bg} ${st.text} ${st.border}`}>
                          {st.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedExitPassport(exit)}
                            className="h-6 text-[10px] font-bold gap-1"
                          >
                            <Eye className="size-3 text-primary" />
                            <span>Clearance Passport</span>
                          </Button>

                          {exit.status === "completed" && exit.relievingLetterCode && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRelievingLetter(exit)}
                              className="h-6 text-[10px] font-bold text-emerald-600 border-emerald-500/30 gap-1"
                            >
                              <Award className="size-3" /> Relieving Letter
                            </Button>
                          )}

                          {exit.status !== "completed" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Delete offboarding record ${exit.exitCode}?`)) {
                                  deleteExitMut.mutate(exit.id);
                                }
                              }}
                              className="size-6 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── MODAL 1: INITIATE EMPLOYEE EXIT ─── */}
      <Dialog open={isInitiateExitOpen} onOpenChange={setIsInitiateExitOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserMinus className="size-5 text-primary" />
              <span>Initiate Employee Offboarding</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Start formal separation workflow, calculate notice periods, and generate multi-department checklists.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              initiateExitMut.mutate(exitForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Employee *</Label>
              <Select
                required
                value={exitForm.employeeId}
                onValueChange={(v) => setExitForm({ ...exitForm, employeeId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose Staff Member" /></SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e: any) => e.status === "active")
                    .map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.employee_code}) · {e.position || "Staff"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Resignation Date *</Label>
                <Input
                  type="date"
                  required
                  value={exitForm.resignationDate}
                  onChange={(e) => setExitForm({ ...exitForm, resignationDate: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Working Day (LWD) *</Label>
                <Input
                  type="date"
                  required
                  value={exitForm.lastWorkingDay}
                  onChange={(e) => setExitForm({ ...exitForm, lastWorkingDay: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Separation Type</Label>
                <Select
                  value={exitForm.exitType}
                  onValueChange={(v) => setExitForm({ ...exitForm, exitType: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resignation">Voluntary Resignation</SelectItem>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="termination">Company Termination</SelectItem>
                    <SelectItem value="contract_end">Contract Completion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Notice Period (Days)</Label>
                <Input
                  type="number"
                  value={exitForm.noticePeriodDays}
                  onChange={(e) => setExitForm({ ...exitForm, noticePeriodDays: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Separation *</Label>
              <Textarea
                required
                rows={2}
                placeholder="Details of career opportunity, relocation, or reason for leaving..."
                value={exitForm.reason}
                onChange={(e) => setExitForm({ ...exitForm, reason: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsInitiateExitOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={initiateExitMut.isPending} className="text-xs font-bold">
                Initiate Offboarding
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: CLEARANCE PASSPORT DRAWER ─── */}
      {selectedExitPassport && (
        <Dialog open={!!selectedExitPassport} onOpenChange={(o) => !o && setSelectedExitPassport(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  <span>Exit Clearance Passport: {selectedExitPassport.exitCode}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    STATUS_CONFIG[selectedExitPassport.status]?.bg
                  } ${STATUS_CONFIG[selectedExitPassport.status]?.text} ${
                    STATUS_CONFIG[selectedExitPassport.status]?.border
                  }`}
                >
                  {STATUS_CONFIG[selectedExitPassport.status]?.label}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Employee Summary Card */}
              <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border">
                    <AvatarFallback className="font-bold text-sm bg-primary/10 text-primary">
                      {selectedExitPassport.employee?.firstName?.[0]}
                      {selectedExitPassport.employee?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-extrabold text-sm text-foreground block">
                      {selectedExitPassport.employee?.firstName} {selectedExitPassport.employee?.lastName}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {selectedExitPassport.employee?.department?.name || "General"} · {selectedExitPassport.employee?.position || "Staff"}
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Last Working Day</span>
                  <div className="font-mono font-bold text-xs text-primary">
                    {new Date(selectedExitPassport.lastWorkingDay).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </div>

              {/* 4 Department Clearance Tabs */}
              <div className="grid grid-cols-2 gap-3">
                {/* IT Clearance Card */}
                <div className="p-3 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Laptop className="size-3.5 text-blue-500" /> IT Asset Clearance
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        selectedExitPassport.itClearance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {selectedExitPassport.itClearance ? "Cleared ✓" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Laptops, monitors, security tokens, and email accounts.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateClearanceMut.mutate({
                        id: selectedExitPassport.id,
                        department: "IT",
                        isCleared: !selectedExitPassport.itClearance,
                      })
                    }
                    className="w-full h-7 text-[10px] font-bold"
                  >
                    {selectedExitPassport.itClearance ? "Revoke IT Clearance" : "Mark IT Cleared"}
                  </Button>
                </div>

                {/* Finance Clearance Card */}
                <div className="p-3 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Wallet className="size-3.5 text-emerald-500" /> Finance Clearance
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        selectedExitPassport.financeClearance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {selectedExitPassport.financeClearance ? "Cleared ✓" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Expense audits, gratuity, leave encashment, and loans.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateClearanceMut.mutate({
                        id: selectedExitPassport.id,
                        department: "Finance",
                        isCleared: !selectedExitPassport.financeClearance,
                      })
                    }
                    className="w-full h-7 text-[10px] font-bold"
                  >
                    {selectedExitPassport.financeClearance ? "Revoke Finance" : "Mark Finance Cleared"}
                  </Button>
                </div>

                {/* HR Clearance Card */}
                <div className="p-3 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <ShieldCheck className="size-3.5 text-purple-500" /> HR Exit Interview
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        selectedExitPassport.hrClearance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {selectedExitPassport.hrClearance ? "Cleared ✓" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Exit interview feedback, handover documentation.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateClearanceMut.mutate({
                        id: selectedExitPassport.id,
                        department: "HR",
                        isCleared: !selectedExitPassport.hrClearance,
                      })
                    }
                    className="w-full h-7 text-[10px] font-bold"
                  >
                    {selectedExitPassport.hrClearance ? "Revoke HR" : "Mark HR Cleared"}
                  </Button>
                </div>

                {/* Admin Clearance Card */}
                <div className="p-3 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Key className="size-3.5 text-amber-500" /> Admin & Access Badges
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        selectedExitPassport.adminClearance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {selectedExitPassport.adminClearance ? "Cleared ✓" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Physical ID card, parking tag, and cabinet keys.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateClearanceMut.mutate({
                        id: selectedExitPassport.id,
                        department: "Admin",
                        isCleared: !selectedExitPassport.adminClearance,
                      })
                    }
                    className="w-full h-7 text-[10px] font-bold"
                  >
                    {selectedExitPassport.adminClearance ? "Revoke Admin" : "Mark Admin Cleared"}
                  </Button>
                </div>
              </div>

              {/* Checklist Items Table */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Multi-Department Action Items ({selectedExitPassport.checklists?.length || 0})
                </Label>
                <div className="space-y-1.5">
                  {selectedExitPassport.checklists?.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        toggleChecklistMut.mutate({
                          exitId: selectedExitPassport.id,
                          itemId: item.id,
                          isCompleted: !item.isCompleted,
                        })
                      }
                      className="p-2.5 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => {}}
                          className="size-4 text-primary rounded"
                        />
                        <span className={`text-xs ${item.isCompleted ? "line-through text-muted-foreground" : "font-medium text-foreground"}`}>
                          {item.title}
                        </span>
                      </div>

                      <Badge variant="outline" className="text-[9px] font-mono font-bold">
                        {item.department}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 flex-wrap pt-3 border-t">
              {selectedExitPassport.status !== "completed" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setFnfForm({
                      fnfSettlementAmount: String(selectedExitPassport.fnfSettlementAmount || "50000"),
                      exitInterviewNotes: "Employee completed formal knowledge transfer. Clean separation.",
                    });
                    setIsFnfModalOpen(true);
                  }}
                  className="text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 mr-auto shadow-sm"
                >
                  <Wallet className="size-3.5" />
                  <span>1-Click Settle FnF & Issue Relieving Letter</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRelievingLetter(selectedExitPassport)}
                  className="text-xs font-bold h-8 text-emerald-600 border-emerald-500/30 gap-1.5 mr-auto"
                >
                  <Award className="size-3.5" />
                  <span>View Official Relieving Letter</span>
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => setSelectedExitPassport(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 3: FULL & FINAL SETTLEMENT DIALOG ─── */}
      <Dialog open={isFnfModalOpen} onOpenChange={setIsFnfModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Wallet className="size-5 text-emerald-600" />
              <span>Full & Final (FnF) Settlement Authorization</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm final payout, update employee status to resigned, and generate official Relieving Letter code.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              settleFnfMut.mutate({
                id: selectedExitPassport.id,
                data: fnfForm,
              });
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Final FnF Settlement Amount (₹) *</Label>
              <Input
                required
                type="number"
                value={fnfForm.fnfSettlementAmount}
                onChange={(e) => setFnfForm({ ...fnfForm, fnfSettlementAmount: e.target.value })}
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-muted-foreground">
                Includes final salary + leave encashment + statutory gratuity.
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Exit Interview & Handover Notes</Label>
              <Textarea
                rows={2}
                value={fnfForm.exitInterviewNotes}
                onChange={(e) => setFnfForm({ ...fnfForm, exitInterviewNotes: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsFnfModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={settleFnfMut.isPending} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                Authorize & Finalize Exit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: OFFICIAL RELIEVING & WORK EXPERIENCE LETTER ─── */}
      {selectedRelievingLetter && (
        <Dialog open={!!selectedRelievingLetter} onOpenChange={(o) => !o && setSelectedRelievingLetter(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-primary" />
                  <span>Official Relieving & Experience Letter</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="h-7 text-xs font-bold gap-1">
                  <Printer className="size-3" /> Print
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 rounded-xl border bg-card space-y-4 text-xs font-serif leading-relaxed text-foreground shadow-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold uppercase tracking-wider font-sans text-primary">
                    {profile?.tenant?.name || "Global Enterprise Corp"}
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-mono">People Operations & Human Resources</p>
                </div>
                <div className="text-right font-mono text-[10px] text-muted-foreground">
                  <div>Ref: {selectedRelievingLetter.relievingLetterCode}</div>
                  <div>Date: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div className="text-center font-bold text-sm font-sans pt-2">
                TO WHOMSOEVER IT MAY CONCERN
              </div>

              <p>
                This is to certify that{" "}
                <strong>
                  {selectedRelievingLetter.employee?.firstName} {selectedRelievingLetter.employee?.lastName}
                </strong>{" "}
                (Employee Code: <code>{selectedRelievingLetter.employee?.employeeCode}</code>) was employed with us in the Department of{" "}
                <strong>{selectedRelievingLetter.employee?.department?.name || "General"}</strong> as{" "}
                <strong>{selectedRelievingLetter.employee?.position || "Team Member"}</strong>.
              </p>

              <p>
                Their tenure with our organization was from{" "}
                <strong>
                  {new Date(selectedRelievingLetter.employee?.joinedAt || selectedRelievingLetter.resignationDate).toLocaleDateString()}
                </strong>{" "}
                to{" "}
                <strong>
                  {new Date(selectedRelievingLetter.lastWorkingDay).toLocaleDateString()}
                </strong>
                .
              </p>

              <p>
                During their tenure, they demonstrated exemplary professionalism, dedication, and technical competence. They have completed all department clearances, handed over assigned company assets, and fulfilled Full & Final financial settlement.
              </p>

              <p>
                We relieve them from their duties effective from the close of business hours on{" "}
                <strong>{new Date(selectedRelievingLetter.lastWorkingDay).toLocaleDateString()}</strong>, and wish them the very best in all their future career endeavors.
              </p>

              <div className="pt-6 flex items-end justify-between border-t font-sans text-[11px]">
                <div className="space-y-1">
                  <div className="font-bold text-foreground">Authorized Signatory</div>
                  <div className="text-muted-foreground">Human Resources Department</div>
                  <div className="text-[9px] font-mono text-muted-foreground">Master HRMS Enterprise Verification Portal</div>
                </div>

                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-mono">
                  ✓ Verified Digital Credential
                </Badge>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedRelievingLetter(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
