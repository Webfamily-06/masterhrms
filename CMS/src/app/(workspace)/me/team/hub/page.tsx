'use client';

import { useState, useEffect } from "react";
import { Link, Route } from "@/src/lib/router-compat";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { z } from "zod";

const managerHubSearchSchema = z.object({
  tab: z.enum(["approvals", "team"]).catch("approvals").optional(),
});

export default function ManagerHubPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const search = Route.useSearch();

  const [activeTab, setActiveTab] = useState<"approvals" | "team">(search?.tab || "approvals");
  const [searchTeam, setSearchTeam] = useState("");

  // Sync tab if search param changes
  useEffect(() => {
    if (search?.tab && (search.tab === "approvals" || search.tab === "team")) {
      setActiveTab(search.tab);
    }
  }, [search?.tab]);

  // Rejection dialog state
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    type: "leave" | "regularization" | "changeRequest" | null;
    id: string | null;
    title: string;
  }>({
    open: false,
    type: null,
    id: null,
    title: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  // Fetch direct reports
  const { data: teamRes, isLoading: isTeamLoading } = useQuery({
    queryKey: ["my-team-members"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/team");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const teamMembers: any[] = teamRes || [];

  // Fetch pending approvals
  const { data: approvalsRes, isLoading: isApprovalsLoading } = useQuery({
    queryKey: ["my-team-approvals"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/team/approvals");
        return res?.data || { leaves: [], regularizations: [], changeRequests: [] };
      } catch {
        return { leaves: [], regularizations: [], changeRequests: [] };
      }
    },
  });

  const leaves: any[] = approvalsRes?.leaves || [];
  const regularizations: any[] = approvalsRes?.regularizations || [];
  const changeRequests: any[] = approvalsRes?.changeRequests || [];
  const totalPendingCount = leaves.length + regularizations.length + changeRequests.length;

  // Leave decision mutation
  const leaveActionMut = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      return await api.post(`/api/v1/me/team/leaves/${id}/action`, { action, comments });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Leave request approved successfully!" : "Leave request rejected.");
      qc.invalidateQueries({ queryKey: ["my-team-approvals"] });
      closeRejectModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process leave decision.");
    },
  });

  // Regularization decision mutation
  const regActionMut = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      return await api.post(`/api/v1/me/team/regularizations/${id}/action`, { action, comments });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Regularization approved & attendance synchronized!" : "Regularization rejected.");
      qc.invalidateQueries({ queryKey: ["my-team-approvals"] });
      closeRejectModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process regularization decision.");
    },
  });

  // Profile change decision mutation
  const changeActionMut = useMutation({
    mutationFn: async ({ id, action, reviewerNotes }: { id: string; action: "approve" | "reject"; reviewerNotes?: string }) => {
      return await api.post(`/api/v1/me/team/profile-changes/${id}/action`, { action, reviewerNotes });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Change request approved & profile updated!" : "Change request rejected.");
      qc.invalidateQueries({ queryKey: ["my-team-approvals"] });
      closeRejectModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process change request decision.");
    },
  });

  const closeRejectModal = () => {
    setRejectDialog({ open: false, type: null, id: null, title: "" });
    setRejectReason("");
  };

  const handleConfirmReject = () => {
    if (!rejectDialog.id || !rejectDialog.type) return;

    if (rejectDialog.type === "leave") {
      leaveActionMut.mutate({ id: rejectDialog.id, action: "reject", comments: rejectReason });
    } else if (rejectDialog.type === "regularization") {
      regActionMut.mutate({ id: rejectDialog.id, action: "reject", comments: rejectReason });
    } else if (rejectDialog.type === "changeRequest") {
      changeActionMut.mutate({ id: rejectDialog.id, action: "reject", reviewerNotes: rejectReason });
    }
  };

  const filteredTeam = teamMembers.filter((m: any) => {
    if (!searchTeam) return true;
    const term = searchTeam.toLowerCase();
    const name = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
    const email = (m.email || "").toLowerCase();
    const code = (m.employeeCode || "").toLowerCase();
    return name.includes(term) || email.includes(term) || code.includes(term);
  });

  return (
    <div className="w-full space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Manager Self-Service Hub"
        description="Oversee direct reports, review pending leave requests, attendance punch corrections, and statutory profile changes."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/me/team">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-users-three text-sm" />
                <span>Team Roster</span>
              </Button>
            </Link>
            <Link to="/me/approvals">
              <Button variant="primary" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-check-circle text-sm" />
                <span>Approvals Console</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Direct Reports</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className="ph ph-users-three text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{teamMembers.length} Members</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Assigned to your reporting hierarchy</p>
            </div>
            <div className="text-[11px] text-primary font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-user-check text-xs" />
              <span>Active Team Roster</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Pending Leave Requests</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-calendar text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{leaves.length} Applications</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Vacation, sick & casual leaves</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-clock text-xs" />
              <span>Awaiting Manager Sign-Off</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Attendance & Profile Edits</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ph ph-shield-check text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {regularizations.length + changeRequests.length} Requests
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {regularizations.length} Regularizations • {changeRequests.length} Profile Changes
              </p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-check-square-offset text-xs" />
              <span>Audit Verified Queue</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed View ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 flex gap-1 w-full sm:w-auto justify-start border border-border/80 rounded-lg">
          <TabsTrigger value="approvals" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-tray text-amber-600 text-sm" />
            <span>Pending Approvals ({totalPendingCount})</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-card">
            <i className="ph ph-users text-primary text-sm" />
            <span>My Team Roster ({teamMembers.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Approvals Inbox ── */}
        <TabsContent value="approvals" className="space-y-6">
          {totalPendingCount === 0 && (
            <Card className="border border-dashed border-border/80 rounded-xl bg-card shadow-xs">
              <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <i className="ph ph-check-circle text-2xl" />
                </div>
                <h3 className="text-base font-bold text-foreground">No Pending Approvals</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  You are completely caught up! When team members submit leave applications, missed punch corrections, or profile change requests, they will appear here.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 1. Pending Leaves Section */}
          {leaves.length > 0 && (
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <i className="ph ph-calendar text-amber-600 text-base" />
                    <span>Pending Leave Applications ({leaves.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Review requested dates, duration, and rationale before authorizing leave balances.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Employee</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Leave Type</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Date Range</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Duration</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Reason</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave: any) => (
                        <TableRow key={leave.id} className="hover:bg-muted/40 transition-colors text-xs">
                          <TableCell className="p-3">
                            <div className="font-bold text-foreground">
                              {leave.employee?.firstName} {leave.employee?.lastName}
                            </div>
                            <div className="text-[10px] text-muted-foreground tabular-nums">
                              {leave.employee?.employeeCode || "EMP"}
                            </div>
                          </TableCell>
                          <TableCell className="p-3">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold"
                              style={{ borderColor: leave.leaveType?.color, color: leave.leaveType?.color }}
                            >
                              {leave.leaveType?.name || "Leave"}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-3 tabular-nums text-muted-foreground">
                            {new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="p-3 tabular-nums font-bold text-foreground">
                            {leave.days} day(s)
                          </TableCell>
                          <TableCell className="p-3 max-w-[200px] truncate text-muted-foreground" title={leave.reason}>
                            {leave.reason || "—"}
                          </TableCell>
                          <TableCell className="p-3 text-right space-x-1.5">
                            <Button
                              size="xs"
                              variant="success"
                              disabled={leaveActionMut.isPending}
                              onClick={() => leaveActionMut.mutate({ id: leave.id, action: "approve" })}
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-check text-xs" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              disabled={leaveActionMut.isPending}
                              onClick={() =>
                                setRejectDialog({
                                  open: true,
                                  type: "leave",
                                  id: leave.id,
                                  title: `Reject Leave for ${leave.employee?.firstName} ${leave.employee?.lastName}`,
                                })
                              }
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-x text-xs" />
                              <span>Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. Pending Regularizations Section */}
          {regularizations.length > 0 && (
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <i className="ph ph-clock text-sky-600 text-base" />
                    <span>Attendance Regularization Requests ({regularizations.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Missed biometric punches or work-from-home timings submitted for official adjustment.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Employee</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Attendance Date</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Proposed Timings</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Reason</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regularizations.map((reg: any) => (
                        <TableRow key={reg.id} className="hover:bg-muted/40 transition-colors text-xs">
                          <TableCell className="p-3">
                            <div className="font-bold text-foreground">
                              {reg.employee?.firstName} {reg.employee?.lastName}
                            </div>
                            <div className="text-[10px] text-muted-foreground tabular-nums">
                              {reg.employee?.employeeCode || "EMP"}
                            </div>
                          </TableCell>
                          <TableCell className="p-3 tabular-nums font-bold text-foreground">
                            {new Date(reg.attendanceDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </TableCell>
                          <TableCell className="p-3 tabular-nums text-muted-foreground">
                            {reg.proposedIn ? new Date(reg.proposedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                            {" → "}
                            {reg.proposedOut ? new Date(reg.proposedOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </TableCell>
                          <TableCell className="p-3 max-w-[200px] truncate text-muted-foreground" title={reg.reason}>
                            {reg.reason}
                          </TableCell>
                          <TableCell className="p-3 text-right space-x-1.5">
                            <Button
                              size="xs"
                              variant="success"
                              disabled={regActionMut.isPending}
                              onClick={() => regActionMut.mutate({ id: reg.id, action: "approve" })}
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-check text-xs" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              disabled={regActionMut.isPending}
                              onClick={() =>
                                setRejectDialog({
                                  open: true,
                                  type: "regularization",
                                  id: reg.id,
                                  title: `Reject Regularization for ${reg.employee?.firstName} ${reg.employee?.lastName}`,
                                })
                              }
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-x text-xs" />
                              <span>Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. Sensitive Profile Change Requests */}
          {changeRequests.length > 0 && (
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <i className="ph ph-shield-check text-purple-600 text-base" />
                    <span>Sensitive Profile Change Requests ({changeRequests.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Bank accounts, statutory IDs, and official details submitted for manager authorization.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Employee</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Change Field</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Proposed Value</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Submitted On</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeRequests.map((req: any) => (
                        <TableRow key={req.id} className="hover:bg-muted/40 transition-colors text-xs">
                          <TableCell className="p-3">
                            <div className="font-bold text-foreground">
                              {req.employee?.firstName} {req.employee?.lastName}
                            </div>
                            <div className="text-[10px] text-muted-foreground tabular-nums">
                              {req.employee?.employeeCode || "EMP"}
                            </div>
                          </TableCell>
                          <TableCell className="p-3 font-semibold text-foreground">
                            {req.fieldName || req.category || "Profile Field"}
                          </TableCell>
                          <TableCell className="p-3 tabular-nums text-muted-foreground">
                            {typeof req.newValue === "object" ? JSON.stringify(req.newValue) : String(req.newValue || "—")}
                          </TableCell>
                          <TableCell className="p-3 tabular-nums text-muted-foreground">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="p-3 text-right space-x-1.5">
                            <Button
                              size="xs"
                              variant="success"
                              disabled={changeActionMut.isPending}
                              onClick={() => changeActionMut.mutate({ id: req.id, action: "approve" })}
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-check text-xs" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              disabled={changeActionMut.isPending}
                              onClick={() =>
                                setRejectDialog({
                                  open: true,
                                  type: "changeRequest",
                                  id: req.id,
                                  title: `Reject Profile Change for ${req.employee?.firstName} ${req.employee?.lastName}`,
                                })
                              }
                              className="gap-1 font-bold"
                            >
                              <i className="ph ph-x text-xs" />
                              <span>Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 2: Team Roster ── */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
            <div className="relative w-full sm:w-80">
              <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
              <Input
                placeholder="Search direct reports..."
                value={searchTeam}
                onChange={(e) => setSearchTeam(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              Showing {filteredTeam.length} of {teamMembers.length} team members
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeam.map((member: any) => {
              const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Team Member";
              const initials = `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}` || "EM";

              return (
                <Card key={member.id} className="border border-border/80 rounded-xl bg-card shadow-xs hover:border-primary/40 transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-11 border border-border/60">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-foreground truncate">{fullName}</h4>
                        <p className="text-[11px] text-muted-foreground truncate">{member.position || member.designation?.name || "Team Member"}</p>
                        <Badge variant="soft" className="text-[10px] mt-1 tabular-nums">
                          {member.employeeCode || "EMP"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                      {member.department && (
                        <div className="flex items-center gap-2 truncate">
                          <i className="ph ph-buildings text-sm text-muted-foreground/70" />
                          <span className="truncate">{member.department.name}</span>
                        </div>
                      )}
                      {member.email && (
                        <div className="flex items-center gap-2 truncate">
                          <i className="ph ph-envelope text-sm text-muted-foreground/70" />
                          <a href={`mailto:${member.email}`} className="truncate hover:text-foreground">
                            {member.email}
                          </a>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2 truncate">
                          <i className="ph ph-phone text-sm text-muted-foreground/70" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTeam.length === 0 && (
            <Card className="border border-dashed border-border/80 rounded-xl bg-card shadow-xs">
              <CardContent className="p-8 text-center text-muted-foreground text-xs">
                No team members found matching your search.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Rejection Confirmation Dialog ── */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && closeRejectModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <i className="ph ph-warning-circle text-lg" />
              <span>{rejectDialog.title || "Confirm Rejection"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please enter an explanation or feedback so the employee knows why this request was not approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="rejectReason" className="text-xs font-semibold">
              Rejection Reason / Comments <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="rejectReason"
              placeholder="e.g., Conflicting project deadlines, insufficient notice period, or missing receipts..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs min-h-[90px]"
              required
            />
          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={closeRejectModal}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={
                !rejectReason.trim() ||
                leaveActionMut.isPending ||
                regActionMut.isPending ||
                changeActionMut.isPending
              }
              className="font-bold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
