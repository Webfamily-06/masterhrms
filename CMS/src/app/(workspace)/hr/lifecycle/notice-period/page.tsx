'use client';

import { useState } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
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
import { toast } from "sonner";
import { format, differenceInCalendarDays } from "date-fns";

export default function HrNoticePeriodTrackerPage() {
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
    queryKey: ["hr-notice-period-exits", statusFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("status", statusFilter);
        const res: any = await api.get(`/offboarding?${params.toString()}`);
        return res?.data || res?.exits || (Array.isArray(res) ? res : []);
      } catch {
        return [];
      }
    },
  });

  const exits: any[] = Array.isArray(exitsResponse) ? exitsResponse : [];

  // Fetch employees list
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-mini-notice"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/employees?limit=100");
        return res?.data || res?.employees || (Array.isArray(res) ? res : []);
      } catch {
        return [];
      }
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
      qc.invalidateQueries({ queryKey: ["hr-notice-period-exits"] });
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
    onSuccess: (res: any) => {
      toast.success(res?.message || "Clearance status updated.");
      qc.invalidateQueries({ queryKey: ["hr-notice-period-exits"] });
      if (selectedExitForClearance && res?.exit) {
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
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Notice Period & Offboarding Tracker"
        description="Monitor served vs remaining notice days, knowledge handover checklists, asset recovery, and departmental clearances."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/hr/lifecycle/exits">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-sign-out text-sm" />
                <span>Exit Clearance</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-plus text-sm" />
              <span>Register Notice</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Visual Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Serving Notice</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-hourglass-high text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{activeNoticeCount} Staff</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Currently serving contractual notice</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-clock text-xs" />
              <span>In Notice Pipeline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Clearances Pending</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ph ph-shield-check text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-sky-600">{clearancePendingCount} Exits</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting IT, Finance & Admin sign-off</p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-check-square-offset text-xs" />
              <span>Action Required</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Settled & Completed</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{completedCount} Exited</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Full & Final settlement completed</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-seal-check text-xs" />
              <span>FnF Disbursed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="relative w-full sm:w-80">
          <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
          <Input
            placeholder="Search employee, ID or exit code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="serving_notice">Serving Notice</SelectItem>
              <SelectItem value="clearance_pending">Clearance Pending</SelectItem>
              <SelectItem value="completed">Completed / Settled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Data Table ── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Exit ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Employee</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Resignation Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Last Working Day</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Notice Progress</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exitsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    Loading notice period tracker records...
                  </TableCell>
                </TableRow>
              ) : filteredExits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground italic">
                    No active notice period records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExits.map((exit: any) => {
                  const emp = exit.employee || {};
                  const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Staff Member";
                  
                  // Progress calculation
                  const resDate = new Date(exit.resignationDate || Date.now());
                  const lwd = new Date(exit.lastWorkingDay || Date.now());
                  const totalDays = exit.noticePeriodDays || 60;
                  const elapsedDays = Math.max(0, differenceInCalendarDays(new Date(), resDate));
                  const progressPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
                  const remainingDays = Math.max(0, differenceInCalendarDays(lwd, new Date()));

                  return (
                    <TableRow key={exit.id} className="hover:bg-muted/40 transition-colors text-xs">
                      <TableCell className="p-3 tabular-nums font-bold text-muted-foreground">
                        {exit.exitCode || "EXT-001"}
                      </TableCell>

                      <TableCell className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8 border border-border/60">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {emp.firstName?.[0] || "E"}{emp.lastName?.[0] || "M"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground block">{fullName}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {emp.employeeCode || "EMP"} • {emp.department?.name || "Staff"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="p-3 tabular-nums text-muted-foreground">
                        {exit.resignationDate ? format(new Date(exit.resignationDate), "dd MMM yyyy") : "—"}
                      </TableCell>

                      <TableCell className="p-3 tabular-nums font-bold text-foreground">
                        {exit.lastWorkingDay ? format(new Date(exit.lastWorkingDay), "dd MMM yyyy") : "—"}
                      </TableCell>

                      <TableCell className="p-3 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span>{elapsedDays} days served</span>
                            <span className="text-muted-foreground">{remainingDays} left</span>
                          </div>
                          <Progress value={progressPct} className="h-1.5" />
                        </div>
                      </TableCell>

                      <TableCell className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold capitalize",
                            exit.status === "completed" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            exit.status === "fnf_settled" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            exit.status === "serving_notice" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                            exit.status === "clearance_pending" && "bg-sky-500/10 text-sky-600 border-sky-500/30"
                          )}
                        >
                          {(exit.status || "serving_notice").replace("_", " ")}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-3 text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setSelectedExitForClearance(exit)}
                          className="gap-1 font-semibold text-xs"
                        >
                          <i className="ph ph-shield-check text-xs" />
                          <span>Clearances</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Dialog: Register Notice Period ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-sign-out text-primary text-lg" />
              <span>Register Employee Notice Period</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record employee resignation and establish statutory notice timeline.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Employee <span className="text-rose-500">*</span></Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Resigning Employee" />
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
                <Label className="text-xs font-semibold">Resignation Date <span className="text-rose-500">*</span></Label>
                <Input
                  type="date"
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notice Duration (Days)</Label>
                <Input
                  type="number"
                  min="0"
                  max="180"
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(Number(e.target.value))}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Calculated Last Working Day</Label>
              <Input
                type="date"
                value={calculatedLastWorkingDay}
                disabled
                className="h-9 text-xs bg-muted/50 tabular-nums font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Resignation <span className="text-rose-500">*</span></Label>
              <Textarea
                placeholder="Career growth, relocation, higher education..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs min-h-[80px]"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createExitMut.isPending}
                className="font-bold"
              >
                Register Notice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Department Clearances ── */}
      <Dialog open={!!selectedExitForClearance} onOpenChange={(open) => !open && setSelectedExitForClearance(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-shield-check text-primary text-lg" />
              <span>Departmental Offboarding Clearance</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Employee: {selectedExitForClearance?.employee?.firstName} {selectedExitForClearance?.employee?.lastName} ({selectedExitForClearance?.employee?.employeeCode})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {[
              { key: "it", label: "IT & Hardware", desc: "Laptops, monitors, security tokens & VPN access revocation", icon: "ph-laptop" },
              { key: "finance", label: "Finance & Accounts", desc: "Travel advances, company credit card & petty cash recovery", icon: "ph-bank" },
              { key: "admin", label: "Administration", desc: "Access badges, office parking passes & physical keys", icon: "ph-identification-badge" },
              { key: "hr", label: "HR Operations", desc: "Exit interview, FnF clearance certificate & relieving letter", icon: "ph-user-check" },
            ].map((dept) => {
              const clearanceData = selectedExitForClearance?.clearances?.[dept.key];
              const isCleared = clearanceData?.approved ?? false;

              return (
                <div key={dept.key} className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-card">
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "size-8 rounded-lg flex items-center justify-center text-sm",
                      isCleared ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                    )}>
                      <i className={cn("ph", dept.icon)} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{dept.label}</h4>
                      <p className="text-[11px] text-muted-foreground">{dept.desc}</p>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant={isCleared ? "outline" : "primary"}
                    disabled={clearanceMut.isPending}
                    onClick={() => {
                      clearanceMut.mutate({
                        id: selectedExitForClearance.id,
                        department: dept.key,
                        approved: !isCleared,
                      });
                    }}
                    className="font-bold text-xs gap-1"
                  >
                    {isCleared ? (
                      <>
                        <i className="ph ph-check text-xs text-emerald-600" />
                        <span>Cleared</span>
                      </>
                    ) : (
                      <>
                        <i className="ph ph-circle text-xs" />
                        <span>Sign Off</span>
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedExitForClearance(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
