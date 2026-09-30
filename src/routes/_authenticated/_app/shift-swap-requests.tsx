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
  ArrowLeftRight,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/shift-swap-requests")({
  component: ShiftSwapRequestsPage,
  head: () => ({ meta: [{ title: "Shift Swap Requests — Master HRMS" }] }),
});

export function ShiftSwapRequestsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const userRoles = profile?.roles || [];
  const isManagerOrAdmin = userRoles.some((r) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin", "manager"].includes(r)
  );

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
    queryKey: ["shift-swap-requests", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      return await api.get(`/shifts/swaps?${params.toString()}`);
    },
  });

  // Fetch employees list for requester/target selection
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-mini"],
    queryFn: async () => {
      const res = await api.get("/employees?limit=100");
      return res.data || res.employees || res || [];
    },
  });
  const employees: any[] = Array.isArray(employeesData) ? employeesData : [];

  // Create Swap Request Mutation
  const createSwapMut = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/shifts/swaps", payload);
    },
    onSuccess: () => {
      toast.success("Shift swap request submitted successfully!");
      qc.invalidateQueries({ queryKey: ["shift-swap-requests"] });
      setIsAddModalOpen(false);
      setReason("");
      setTargetEmployeeId("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit shift swap request.");
    },
  });

  // Peer Action Mutation (Accept / Decline)
  const peerActionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "decline" }) => {
      return await api.put(`/shifts/swaps/${id}/peer-action`, { action });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Peer response recorded.");
      qc.invalidateQueries({ queryKey: ["shift-swap-requests"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Action failed.");
    },
  });

  // Manager Action Mutation (Authorize / Reject)
  const managerActionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      return await api.put(`/shifts/swaps/${id}/manager-action`, { action });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Manager authorization recorded.");
      qc.invalidateQueries({ queryKey: ["shift-swap-requests"] });
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
      toast.error("Requester and target peer cannot be the same colleague.");
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Page Header matching ui-2/shift-swap-requests.html ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/dashboard" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link to="/attendance" className="hover:text-foreground">Attendance</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Shift Swap Requests</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowLeftRight className="size-6 text-primary" />
            <span>Shift Swap Requests</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Peer-to-peer shift swaps, colleague acceptance workflows, and manager authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5 h-9 font-bold bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="size-4" />
            <span>Add New Request</span>
          </Button>
        </div>
      </div>

      {/* ── Top Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Peer Review</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingPeerCount}</h3>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Awaiting Manager Approval</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{pendingMgrCount}</h3>
            </div>
            <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Approved & Executed</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</h3>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Swap Table Card ── */}
      <Card className="shadow-xs">
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">Shift Swap Requests List</CardTitle>
            <CardDescription className="text-xs">
              Review and manage incoming colleague shift transfer and cover requests.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search employee or ID..."
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
                <SelectItem value="pending_peer">Pending Peer</SelectItem>
                <SelectItem value="pending_manager">Pending Manager</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold">Emp ID</TableHead>
                <TableHead className="text-xs font-bold">Requester (Employee)</TableHead>
                <TableHead className="text-xs font-bold">Substitute Colleague</TableHead>
                <TableHead className="text-xs font-bold">Target Shift Date</TableHead>
                <TableHead className="text-xs font-bold">Reason / Note</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold text-right">Actions</TableHead>
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
                  <TableRow key={swap.id} className="hover:bg-muted/30 text-xs">
                    <TableCell className="font-mono font-bold text-muted-foreground">
                      {swap.requesterEmployee?.employeeCode || "EMP-001"}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 border">
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
                            {swap.requesterEmployee?.position || swap.requesterEmployee?.department?.name || "Team Member"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 border">
                          <AvatarFallback className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600">
                            {swap.targetEmployee?.firstName?.[0]}
                            {swap.targetEmployee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground block">
                            {swap.targetEmployee?.firstName} {swap.targetEmployee?.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {swap.targetEmployee?.employeeCode}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono font-bold text-primary">
                      {new Date(swap.shiftDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={swap.reason}>
                      {swap.reason}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold capitalize",
                          swap.status === "approved" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                          swap.status === "pending_manager" && "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
                          swap.status === "pending_peer" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                          swap.status === "rejected" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                        )}
                      >
                        {swap.status.replace("_", " ")}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {swap.status === "pending_peer" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => peerActionMut.mutate({ id: swap.id, action: "accept" })}
                              className="h-6 text-[10px] font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                            >
                              <Check className="size-3 mr-1" /> Peer Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => peerActionMut.mutate({ id: swap.id, action: "decline" })}
                              className="h-6 text-[10px] font-bold text-rose-600 border-rose-500/30 hover:bg-rose-50"
                            >
                              <X className="size-3 mr-1" /> Decline
                            </Button>
                          </>
                        )}

                        {swap.status === "pending_manager" && isManagerOrAdmin && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => managerActionMut.mutate({ id: swap.id, action: "approve" })}
                              className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="size-3 mr-1" /> Authorize Swap
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => managerActionMut.mutate({ id: swap.id, action: "reject" })}
                              className="h-6 text-[10px] font-bold text-rose-600"
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {swap.status === "approved" && (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Shift Updated
                          </span>
                        )}

                        {swap.status === "rejected" && (
                          <span className="text-[11px] text-rose-600 font-medium">Declined</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog: Add New Shift Swap Request matching #add_modal in template ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowLeftRight className="size-5 text-primary" />
              <span>Create Shift Swap Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Request a colleague to cover your scheduled shift. Once they accept, your manager will be notified for final roster approval.
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
              <Label className="text-xs font-semibold">Substitute Colleague <span className="text-destructive">*</span></Label>
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
              <Label className="text-xs font-semibold">Shift Date to Swap <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Swap Request <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Doctor's appointment / personal commitment, agreed to swap with Sarah."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs min-h-[72px]"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createSwapMut.isPending}
                className="font-bold bg-primary text-primary-foreground"
              >
                {createSwapMut.isPending ? "Submitting..." : "Submit Swap Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
