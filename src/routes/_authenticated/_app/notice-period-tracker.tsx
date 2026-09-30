import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  CalendarDays,
  Clock,
  LogOut,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Check,
  ShieldCheck,
  Laptop,
  Landmark,
  Building,
  UserCheck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/notice-period-tracker")({
  component: NoticePeriodTrackerPage,
  head: () => ({ meta: [{ title: "Notice Period Tracker — Master HRMS" }] }),
});

export function NoticePeriodTrackerPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExitForClearance, setSelectedExitForClearance] = useState<any | null>(null);

  // Form State
  const [employeeId, setEmployeeId] = useState("");
  const [resignationDate, setResignationDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [noticePeriodDays, setNoticePeriodDays] = useState(60);
  const [reason, setReason] = useState("");

  // Auto-calculated last working day
  const calculatedLastWorkingDay = (() => {
    try {
      const d = new Date(resignationDate);
      d.setDate(d.getDate() + Number(noticePeriodDays));
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  })();

  // Fetch Exits List
  const { data: exitsResponse, isLoading: exitsLoading } = useQuery({
    queryKey: ["employee-exits-tracker", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      return await api.get(`/offboarding?${params.toString()}`);
    },
  });

  const exits: any[] = exitsResponse?.data || exitsResponse?.exits || (Array.isArray(exitsResponse) ? exitsResponse : []);

  // Fetch employees list
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-mini"],
    queryFn: async () => {
      const res = await api.get("/employees?limit=100");
      return res.data || res.employees || res || [];
    },
  });
  const employees: any[] = Array.isArray(employeesData) ? employeesData : [];

  // Create Exit Mutation
  const createExitMut = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/offboarding", payload);
    },
    onSuccess: () => {
      toast.success("Employee notice period registered successfully!");
      qc.invalidateQueries({ queryKey: ["employee-exits-tracker"] });
      setIsAddModalOpen(false);
      setReason("");
      setEmployeeId("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register notice period.");
    },
  });

  // Department Clearance Mutation
  const clearanceMut = useMutation({
    mutationFn: async ({ id, department, approved, notes }: { id: string; department: string; approved: boolean; notes?: string }) => {
      return await api.post(`/offboarding/${id}/clearance`, { department, approved, notes });
    },
    onSuccess: (res) => {
      toast.success(res.message || "Clearance status updated.");
      qc.invalidateQueries({ queryKey: ["employee-exits-tracker"] });
      if (selectedExitForClearance && res.exit) {
        setSelectedExitForClearance(res.exit);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update clearance.");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !resignationDate || !reason) {
      toast.error("Please fill in all required fields.");
      return;
    }
    createExitMut.mutate({
      employeeId,
      resignationDate,
      lastWorkingDay: calculatedLastWorkingDay,
      noticePeriodDays: Number(noticePeriodDays),
      reason,
      exitType: "resignation",
    });
  };

  const filteredExits = exits.filter((exit: any) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    const name = `${exit.employee?.firstName || ""} ${exit.employee?.lastName || ""}`.toLowerCase();
    const code = (exit.exitCode || "").toLowerCase();
    const empCode = (exit.employee?.employeeCode || "").toLowerCase();
    return name.includes(s) || code.includes(s) || empCode.includes(s);
  });

  // Calculate metrics
  const activeNoticeCount = exits.filter((e) => e.status === "serving_notice").length;
  const clearancePendingCount = exits.filter((e) => e.status === "clearance_pending").length;
  const completedCount = exits.filter((e) => e.status === "completed" || e.status === "fnf_settled").length;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Page Header matching ui-2/notice-period-tracker.html ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/dashboard" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link to="/offboarding" className="hover:text-foreground">HRM</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Notice Period Tracker</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LogOut className="size-6 text-primary" />
            <span>Notice Period Tracker</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor served vs remaining notice days, handover checklists, and departmental clearance workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5 h-9 font-bold bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="size-4" />
            <span>Add Resignation / Notice</span>
          </Button>
        </div>
      </div>

      {/* ── Top Analytics Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Currently Serving Notice</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{activeNoticeCount}</h3>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Clearance In-Progress</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">{clearancePendingCount}</h3>
            </div>
            <div className="size-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">FnF Settled / Relieved</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</h3>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tracker Table Card ── */}
      <Card className="shadow-xs">
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">Resignations & Notice Timeline</CardTitle>
            <CardDescription className="text-xs">
              Real-time day count, transition progress, and 4-way clearance checklist sign-offs.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search employee, ID or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-36 bg-background">
                <SelectValue placeholder="All Status" />
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
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold">Emp ID</TableHead>
                <TableHead className="text-xs font-bold">Employee</TableHead>
                <TableHead className="text-xs font-bold">Start Date</TableHead>
                <TableHead className="text-xs font-bold">Last Working Day</TableHead>
                <TableHead className="text-xs font-bold w-44">Notice Progress</TableHead>
                <TableHead className="text-xs font-bold">Clearances</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exitsLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                    Loading notice period tracker...
                  </TableCell>
                </TableRow>
              ) : filteredExits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground italic">
                    No active notice period records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExits.map((exit: any) => {
                  const startDate = new Date(exit.resignationDate);
                  const endDate = new Date(exit.lastWorkingDay);
                  const today = new Date();
                  const totalDays = Math.max(1, exit.noticePeriodDays || 60);
                  const daysServed = Math.max(
                    0,
                    Math.min(totalDays, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                  );
                  const daysRemaining = Math.max(0, totalDays - daysServed);
                  const progressPct = Math.min(100, Math.round((daysServed / totalDays) * 100));

                  const clearancesDone = [
                    exit.itClearance,
                    exit.financeClearance,
                    exit.hrClearance,
                    exit.adminClearance,
                  ].filter(Boolean).length;

                  return (
                    <TableRow key={exit.id} className="hover:bg-muted/30 text-xs">
                      <TableCell className="font-mono font-bold text-muted-foreground">
                        {exit.employee?.employeeCode || "EMP-001"}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 border">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {exit.employee?.firstName?.[0]}
                              {exit.employee?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground block">
                              {exit.employee?.firstName} {exit.employee?.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {exit.employee?.position || exit.employee?.department?.name || "Staff"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-muted-foreground">
                        {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>

                      <TableCell className="font-mono font-bold text-foreground">
                        {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-medium">
                            <span className="text-muted-foreground">{daysServed}d served</span>
                            <span className="font-bold text-amber-600">{daysRemaining}d left</span>
                          </div>
                          <Progress value={progressPct} className="h-1.5" />
                        </div>
                      </TableCell>

                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setSelectedExitForClearance(exit)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border text-[11px] font-medium hover:bg-muted/40 transition-colors"
                        >
                          <ShieldCheck className={cn("size-3.5", clearancesDone === 4 ? "text-emerald-600" : "text-amber-500")} />
                          <span>{clearancesDone} / 4 Cleared</span>
                        </button>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold capitalize",
                            exit.status === "completed" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            exit.status === "fnf_settled" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                            exit.status === "clearance_pending" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                            exit.status === "serving_notice" && "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          )}
                        >
                          {exit.status.replace("_", " ")}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedExitForClearance(exit)}
                          className="h-7 text-[11px] font-bold gap-1"
                        >
                          <span>Clearance Hub</span>
                          <ArrowRight className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog: Add New Notice Period / Resignation ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <LogOut className="size-5 text-primary" />
              <span>Record Employee Resignation / Notice</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Initialize notice period tracking. Last working day and departmental clearances will be automatically calculated.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Resigning Employee <span className="text-destructive">*</span></Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notice Served From</Label>
                <Input
                  type="date"
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notice Period (Days)</Label>
                <Select
                  value={String(noticePeriodDays)}
                  onValueChange={(v) => setNoticePeriodDays(Number(v))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Days (1 Month)</SelectItem>
                    <SelectItem value="60">60 Days (2 Months)</SelectItem>
                    <SelectItem value="90">90 Days (3 Months)</SelectItem>
                    <SelectItem value="15">15 Days (Probation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>Calculated Last Working Day:</span>
                <span className="font-mono text-primary font-bold">{calculatedLastWorkingDay}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                All 4 departmental clearance items (IT, Finance, HR, Admin) will be auto-generated.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Departure <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Higher education / Relocation / Career growth opportunity"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs min-h-[64px]"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createExitMut.isPending}
                className="font-bold bg-primary text-primary-foreground"
              >
                {createExitMut.isPending ? "Recording..." : "Start Notice Tracking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: 4-Way Department Clearance Modal ── */}
      {selectedExitForClearance && (
        <Dialog open={!!selectedExitForClearance} onOpenChange={() => setSelectedExitForClearance(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <span>Departmental Exit Clearance</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Clearance for {selectedExitForClearance.employee?.firstName} {selectedExitForClearance.employee?.lastName} ({selectedExitForClearance.employee?.employeeCode}).
                All 4 departments must sign off before final settlement and relieving letter generation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* IT Clearance Card */}
              <div className="p-3 rounded-lg border flex items-center justify-between bg-card text-xs">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Laptop className="size-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground">IT Equipment & Access Revocation</h5>
                    <p className="text-[11px] text-muted-foreground">Laptop, VPN token, Google Workspace, GitHub access</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={selectedExitForClearance.itClearance ? "outline" : "default"}
                  onClick={() =>
                    clearanceMut.mutate({
                      id: selectedExitForClearance.id,
                      department: "IT",
                      approved: !selectedExitForClearance.itClearance,
                    })
                  }
                  className={cn(
                    "h-7 text-xs font-bold",
                    selectedExitForClearance.itClearance && "text-emerald-600 border-emerald-500/30 bg-emerald-50"
                  )}
                >
                  {selectedExitForClearance.itClearance ? (
                    <span className="flex items-center gap-1"><Check className="size-3" /> IT Cleared</span>
                  ) : (
                    "Mark IT Cleared"
                  )}
                </Button>
              </div>

              {/* Finance Clearance Card */}
              <div className="p-3 rounded-lg border flex items-center justify-between bg-card text-xs">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Landmark className="size-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground">Finance & Expense Claims</h5>
                    <p className="text-[11px] text-muted-foreground">Credit card dues, advances, pending expense reimbursements</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={selectedExitForClearance.financeClearance ? "outline" : "default"}
                  onClick={() =>
                    clearanceMut.mutate({
                      id: selectedExitForClearance.id,
                      department: "Finance",
                      approved: !selectedExitForClearance.financeClearance,
                    })
                  }
                  className={cn(
                    "h-7 text-xs font-bold",
                    selectedExitForClearance.financeClearance && "text-emerald-600 border-emerald-500/30 bg-emerald-50"
                  )}
                >
                  {selectedExitForClearance.financeClearance ? (
                    <span className="flex items-center gap-1"><Check className="size-3" /> Finance Cleared</span>
                  ) : (
                    "Mark Finance Cleared"
                  )}
                </Button>
              </div>

              {/* Admin / Facilities Clearance Card */}
              <div className="p-3 rounded-lg border flex items-center justify-between bg-card text-xs">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Building className="size-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground">Admin & Facilities</h5>
                    <p className="text-[11px] text-muted-foreground">ID access card, drawer keys, parking decal surrender</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={selectedExitForClearance.adminClearance ? "outline" : "default"}
                  onClick={() =>
                    clearanceMut.mutate({
                      id: selectedExitForClearance.id,
                      department: "Admin",
                      approved: !selectedExitForClearance.adminClearance,
                    })
                  }
                  className={cn(
                    "h-7 text-xs font-bold",
                    selectedExitForClearance.adminClearance && "text-emerald-600 border-emerald-500/30 bg-emerald-50"
                  )}
                >
                  {selectedExitForClearance.adminClearance ? (
                    <span className="flex items-center gap-1"><Check className="size-3" /> Admin Cleared</span>
                  ) : (
                    "Mark Admin Cleared"
                  )}
                </Button>
              </div>

              {/* HR Clearance Card */}
              <div className="p-3 rounded-lg border flex items-center justify-between bg-card text-xs">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <UserCheck className="size-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground">HR & Exit Interview</h5>
                    <p className="text-[11px] text-muted-foreground">Exit interview conducted, gratuity calculation, relieving letter</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={selectedExitForClearance.hrClearance ? "outline" : "default"}
                  onClick={() =>
                    clearanceMut.mutate({
                      id: selectedExitForClearance.id,
                      department: "HR",
                      approved: !selectedExitForClearance.hrClearance,
                    })
                  }
                  className={cn(
                    "h-7 text-xs font-bold",
                    selectedExitForClearance.hrClearance && "text-emerald-600 border-emerald-500/30 bg-emerald-50"
                  )}
                >
                  {selectedExitForClearance.hrClearance ? (
                    <span className="flex items-center gap-1"><Check className="size-3" /> HR Cleared</span>
                  ) : (
                    "Mark HR Cleared"
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" onClick={() => setSelectedExitForClearance(null)}>
                Close Hub
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
