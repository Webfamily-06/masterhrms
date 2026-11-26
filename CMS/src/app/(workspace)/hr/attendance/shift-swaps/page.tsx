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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function HrShiftSwapsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Swap Request Form State
  const [requesterEmployeeId, setRequesterEmployeeId] = useState("");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");

  // Fetch all shift swap requests
  const { data: swapRequests = [], isLoading: swapsLoading } = useQuery({
    queryKey: ["hr-shift-swap-requests", statusFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("status", statusFilter);
        const res: any = await api.get(`/shifts/swaps?${params.toString()}`);
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch employees list for requester/target selection
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-mini"],
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

  // Create Swap Request Mutation
  const createSwapMut = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/shifts/swaps", payload);
    },
    onSuccess: () => {
      toast.success("Shift swap request created successfully!");
      qc.invalidateQueries({ queryKey: ["hr-shift-swap-requests"] });
      setIsAddModalOpen(false);
      setReason("");
      setTargetEmployeeId("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit shift swap request.");
    },
  });

  // Manager/HR Action Mutation (Authorize / Reject)
  const managerActionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      return await api.put(`/shifts/swaps/${id}/manager-action`, { action });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Shift swap decision recorded.");
      qc.invalidateQueries({ queryKey: ["hr-shift-swap-requests"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Action failed.");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reqId = requesterEmployeeId || employees[0]?.id;
    if (!reqId || !targetEmployeeId || !shiftDate || !reason) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (reqId === targetEmployeeId) {
      toast.error("Requester and substitute peer cannot be the same colleague.");
      return;
    }
    createSwapMut.mutate({
      requesterEmployeeId: reqId,
      targetEmployeeId,
      shiftDate,
      reason,
    });
  };

  const filteredSwaps = swapRequests.filter((swap: any) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    const reqName = `${swap.requesterEmployee?.firstName || ""} ${swap.requesterEmployee?.lastName || ""}`.toLowerCase();
    const tgtName = `${swap.targetEmployee?.firstName || ""} ${swap.targetEmployee?.lastName || ""}`.toLowerCase();
    const empCode = (swap.requesterEmployee?.employeeCode || "").toLowerCase();
    return reqName.includes(s) || tgtName.includes(s) || empCode.includes(s);
  });

  const pendingPeerCount = swapRequests.filter((s: any) => s.status === "pending_peer").length;
  const pendingMgrCount = swapRequests.filter((s: any) => s.status === "pending_manager").length;
  const approvedCount = swapRequests.filter((s: any) => s.status === "approved").length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Shift Swap Requests"
        description="Monitor organization-wide shift swaps, peer colleague acceptances, and manager authorizations."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/hr/attendance/shifts">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-clock text-sm" />
                <span>Shift Schedule</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-plus text-sm" />
              <span>Create Swap</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Pending Peer Review</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-users text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{pendingPeerCount} Requests</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting substitute peer confirmation</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-hourglass-high text-xs" />
              <span>Colleague Handshake</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Awaiting Manager Authorization</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ph ph-shield-check text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-sky-600">{pendingMgrCount} Requests</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Peer accepted, awaiting manager sign-off</p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-check-square-offset text-xs" />
              <span>Requires Sign-off</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Approved & Synchronized</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{approvedCount} Swaps</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Roster updated and biometric aligned</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-calendar-check text-xs" />
              <span>Active Roster</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="relative w-full sm:w-80">
          <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
          <Input
            placeholder="Search employee or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_peer">Pending Peer</SelectItem>
              <SelectItem value="pending_manager">Pending Manager</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
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
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Emp ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Requester</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Substitute Colleague</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Target Shift Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Reason / Note</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {swapsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    Loading shift swap requests...
                  </TableCell>
                </TableRow>
              ) : filteredSwaps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground italic">
                    No shift swap requests found matching your filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSwaps.map((swap: any) => (
                  <TableRow key={swap.id} className="hover:bg-muted/40 transition-colors text-xs">
                    <TableCell className="p-3 tabular-nums font-bold text-muted-foreground">
                      {swap.requesterEmployee?.employeeCode || "EMP-001"}
                    </TableCell>

                    <TableCell className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 border border-border/60">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {swap.requesterEmployee?.firstName?.[0]}
                            {swap.requesterEmployee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground block">
                            {swap.requesterEmployee?.firstName} {swap.requesterEmployee?.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {swap.requesterEmployee?.position || swap.requesterEmployee?.department?.name || "Staff"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 border border-border/60">
                          <AvatarFallback className="text-[10px] font-bold bg-sky-500/10 text-sky-600">
                            {swap.targetEmployee?.firstName?.[0]}
                            {swap.targetEmployee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground block">
                            {swap.targetEmployee?.firstName} {swap.targetEmployee?.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {swap.targetEmployee?.employeeCode}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="p-3 tabular-nums font-bold text-primary">
                      {new Date(swap.shiftDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="p-3 max-w-[200px] truncate text-muted-foreground" title={swap.reason}>
                      {swap.reason}
                    </TableCell>

                    <TableCell className="p-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold capitalize",
                          swap.status === "approved" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                          swap.status === "pending_manager" && "bg-sky-500/10 text-sky-600 border-sky-500/30",
                          swap.status === "pending_peer" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                          swap.status === "rejected" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                        )}
                      >
                        {swap.status.replace("_", " ")}
                      </Badge>
                    </TableCell>

                    <TableCell className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {swap.status === "pending_manager" && (
                          <>
                            <Button
                              size="xs"
                              variant="success"
                              onClick={() => managerActionMut.mutate({ id: swap.id, action: "approve" })}
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-check text-xs" />
                              <span>Authorize</span>
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => managerActionMut.mutate({ id: swap.id, action: "reject" })}
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-x text-xs" />
                              <span>Reject</span>
                            </Button>
                          </>
                        )}

                        {swap.status === "approved" && (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                            <i className="ph ph-check-circle text-xs" />
                            <span>Shift Updated</span>
                          </span>
                        )}

                        {swap.status === "rejected" && (
                          <span className="text-[11px] text-rose-600 font-medium">Declined</span>
                        )}

                        {swap.status === "pending_peer" && (
                          <span className="text-[11px] text-amber-600 font-medium">Awaiting Peer</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Dialog: Add New Shift Swap Request ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-arrows-left-right text-primary text-lg" />
              <span>Create Shift Swap Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Schedule a shift swap between two employees. Once the peer accepts, the manager can authorize the roster change.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Requesting Employee</Label>
              <Select
                value={requesterEmployeeId || (employees[0]?.id || "")}
                onValueChange={setRequesterEmployeeId}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Requester" />
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Substitute Colleague <span className="text-rose-500">*</span>
              </Label>
              <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Colleague to swap with..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => e.id !== (requesterEmployeeId || employees[0]?.id))
                    .map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.position || emp.department?.name || "Staff"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Target Shift Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Reason / Justification <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                placeholder="Reason for requesting this shift coverage..."
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
                disabled={createSwapMut.isPending}
                className="font-bold"
              >
                Submit Swap Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
