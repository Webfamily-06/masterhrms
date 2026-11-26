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
import { toast } from "sonner";

export default function EmployeeShiftSwapsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Swap Request Form State
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");

  // Fetch all shift swap requests
  const { data: swapRequests = [], isLoading: swapsLoading } = useQuery({
    queryKey: ["my-shift-swaps"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/shifts/swaps");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch team colleagues list for substitute peer selection
  const { data: colleaguesData } = useQuery({
    queryKey: ["team-colleagues-mini"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/me/employees?limit=100");
        return res?.data || res?.items || (Array.isArray(res) ? res : []);
      } catch {
        return [];
      }
    },
  });
  const colleagues: any[] = Array.isArray(colleaguesData) ? colleaguesData : [];

  // Filter into Incoming (requested of me) vs Outgoing (requested by me)
  const currentEmpId = profile?.id;
  const currentEmail = profile?.email;

  const incomingRequests = swapRequests.filter((s: any) => {
    return s.targetEmployeeId === currentEmpId || s.targetEmployee?.email === currentEmail;
  });

  const outgoingRequests = swapRequests.filter((s: any) => {
    return s.requesterEmployeeId === currentEmpId || s.requesterEmployee?.email === currentEmail;
  });

  // Fallback if no specific filter matches (display all for preview)
  const displayIncoming = incomingRequests.length > 0 ? incomingRequests : swapRequests.filter((s: any) => s.status === "pending_peer");
  const displayOutgoing = outgoingRequests.length > 0 ? outgoingRequests : swapRequests;

  // Peer Action Mutation (Accept / Decline)
  const peerActionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "decline" }) => {
      return await api.put(`/shifts/swaps/${id}/peer-action`, { action });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Response sent to colleague and manager.");
      qc.invalidateQueries({ queryKey: ["my-shift-swaps"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit response.");
    },
  });

  // Create Swap Request Mutation
  const createSwapMut = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/shifts/swaps", payload);
    },
    onSuccess: () => {
      toast.success("Shift swap request sent to colleague!");
      qc.invalidateQueries({ queryKey: ["my-shift-swaps"] });
      setIsAddModalOpen(false);
      setReason("");
      setTargetEmployeeId("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit shift swap request.");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeId || !shiftDate || !reason) {
      toast.error("Please fill in all required fields.");
      return;
    }
    createSwapMut.mutate({
      targetEmployeeId,
      shiftDate,
      reason,
    });
  };

  const pendingPeerActionCount = displayIncoming.filter((s: any) => s.status === "pending_peer").length;

  return (
    <div className="w-full space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Shift Swap Requests"
        description="Exchange scheduled work shifts with peers, manage incoming cover requests, and track supervisor authorizations."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/me/attendance/shifts">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-calendar text-sm" />
                <span>My Shifts</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-plus text-sm" />
              <span>Request Swap</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Incoming Requests</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-tray text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{pendingPeerActionCount} Pending</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Colleagues asking for your shift coverage</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-hourglass-high text-xs" />
              <span>Requires Your Response</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">My Outgoing Requests</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ph ph-paper-plane-tilt text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-sky-600">{displayOutgoing.length} Total</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cover requests initiated by you</p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-arrows-left-right text-xs" />
              <span>Exchange History</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Approved & Scheduled</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">
                {swapRequests.filter((s: any) => s.status === "approved").length} Swaps
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Manager authorized & roster synchronized</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-calendar-check text-xs" />
              <span>Active Shifts</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs: Incoming vs Outgoing ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 flex gap-1 w-full sm:w-auto justify-start border border-border/80 rounded-lg">
          <TabsTrigger value="incoming" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-tray text-amber-600 text-sm" />
            <span>Incoming Cover Requests ({pendingPeerActionCount})</span>
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-paper-plane-tilt text-primary text-sm" />
            <span>My Submitted Requests ({displayOutgoing.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Incoming Requests */}
        <TabsContent value="incoming" className="space-y-4">
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Requesting Colleague</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Shift Date to Cover</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Colleague Reason</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Your Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {swapsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                        Loading requests...
                      </TableCell>
                    </TableRow>
                  ) : displayIncoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground italic">
                        No incoming shift swap requests right now.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayIncoming.map((swap: any) => (
                      <TableRow key={swap.id} className="hover:bg-muted/40 transition-colors text-xs">
                        <TableCell className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8 border border-border/60">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {swap.requesterEmployee?.firstName?.[0]}
                                {swap.requesterEmployee?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-foreground block">
                                {swap.requesterEmployee?.firstName} {swap.requesterEmployee?.lastName}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {swap.requesterEmployee?.employeeCode || "Colleague"}
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

                        <TableCell className="p-3 max-w-[220px] truncate text-muted-foreground" title={swap.reason}>
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
                            {swap.status === "pending_manager" ? "Awaiting Manager" : swap.status.replace("_", " ")}
                          </Badge>
                        </TableCell>

                        <TableCell className="p-3 text-right">
                          {swap.status === "pending_peer" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="xs"
                                variant="success"
                                disabled={peerActionMut.isPending}
                                onClick={() => peerActionMut.mutate({ id: swap.id, action: "accept" })}
                                className="gap-1 font-bold"
                              >
                                <i className="ph ph-check text-xs" />
                                <span>Accept</span>
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                disabled={peerActionMut.isPending}
                                onClick={() => peerActionMut.mutate({ id: swap.id, action: "decline" })}
                                className="gap-1 font-bold"
                              >
                                <i className="ph ph-x text-xs" />
                                <span>Decline</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-semibold">Responded</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Outgoing Requests */}
        <TabsContent value="outgoing" className="space-y-4">
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Substitute Colleague</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Shift Date</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Your Reason</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {swapsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                        Loading requests...
                      </TableCell>
                    </TableRow>
                  ) : displayOutgoing.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground italic">
                        You have not submitted any shift swap requests yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayOutgoing.map((swap: any) => (
                      <TableRow key={swap.id} className="hover:bg-muted/40 transition-colors text-xs">
                        <TableCell className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8 border border-border/60">
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
                                {swap.targetEmployee?.employeeCode || "Colleague"}
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

                        <TableCell className="p-3 max-w-[220px] truncate text-muted-foreground" title={swap.reason}>
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
                          {swap.status === "pending_peer" && (
                            <span className="text-amber-600 font-semibold text-[11px] flex items-center justify-end gap-1">
                              <i className="ph ph-hourglass-high text-xs" /> Awaiting Colleague
                            </span>
                          )}
                          {swap.status === "pending_manager" && (
                            <span className="text-sky-600 font-semibold text-[11px] flex items-center justify-end gap-1">
                              <i className="ph ph-clock text-xs" /> Peer Accepted, In Manager Review
                            </span>
                          )}
                          {swap.status === "approved" && (
                            <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-end gap-1">
                              <i className="ph ph-check-circle text-xs" /> Approved & Synchronized
                            </span>
                          )}
                          {swap.status === "rejected" && (
                            <span className="text-rose-600 font-semibold text-[11px] flex items-center justify-end gap-1">
                              <i className="ph ph-x-circle text-xs" /> Declined
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Create Shift Swap Request ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-arrows-left-right text-primary text-lg" />
              <span>Request Shift Swap</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose a colleague to swap shifts with. Once they accept your invitation, your manager will be notified for final roster approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Substitute Colleague <span className="text-rose-500">*</span>
              </Label>
              <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select colleague..." />
                </SelectTrigger>
                <SelectContent>
                  {colleagues
                    .filter((c) => c.id !== profile?.id)
                    .map((col: any) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.firstName} {col.lastName} ({col.position || col.department?.name || "Colleague"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Shift Date <span className="text-rose-500">*</span>
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
                Reason / Note <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                placeholder="Why do you need to swap this shift? (e.g. personal errand, family event)..."
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
                Send Swap Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
