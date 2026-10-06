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
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  Check,
  X,
  FileText,
  UserCheck,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Sparkles,
  Inbox,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/manager-hub")({
  component: ManagerHubPage,
  head: () => ({ meta: [{ title: "Manager Self-Service Hub — Master HRMS" }] }),
});

export function ManagerHubPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [activeTab, setActiveTab] = useState<"approvals" | "team">("approvals");
  const [searchTeam, setSearchTeam] = useState("");
  
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/hrm-dashboard" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Manager Hub & Approvals</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <span>Manager Self-Service Hub</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Oversee direct reports, review pending leave requests, attendance punch corrections, and statutory profile changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "px-3 py-1 font-mono text-xs font-bold gap-1.5",
              totalPendingCount > 0 ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
            )}
          >
            {totalPendingCount > 0 ? (
              <>
                <Clock className="size-3.5" />
                <span>{totalPendingCount} Action(s) Pending</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                <span>Inbox Cleared</span>
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs text-muted-foreground font-semibold">Direct Reports</span>
            <div className="my-2">
              <h3 className="text-2xl font-bold text-primary">{teamMembers.length} Members</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Assigned to your reporting line</p>
            </div>
            <div className="text-[10px] text-primary font-bold flex items-center gap-1">
              <UserCheck className="size-3" /> Active Team Roster
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs text-muted-foreground font-semibold">Pending Leave Requests</span>
            <div className="my-2">
              <h3 className="text-2xl font-bold text-amber-600">{leaves.length} Applications</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Vacation, sick & casual leave</p>
            </div>
            <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
              <Calendar className="size-3" /> Awaiting Manager Sign-Off
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20 shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs text-muted-foreground font-semibold">Attendance & Profile Edits</span>
            <div className="my-2">
              <h3 className="text-2xl font-bold text-indigo-600">
                {regularizations.length + changeRequests.length} Requests
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {regularizations.length} Regularizations • {changeRequests.length} Profile Changes
              </p>
            </div>
            <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
              <ShieldCheck className="size-3" /> Audit Verified
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed View ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/40 h-10 p-1 flex gap-1 w-full justify-start border">
          <TabsTrigger value="approvals" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Inbox className="size-3.5 text-amber-600" />
            <span>Pending Approvals ({totalPendingCount})</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Users className="size-3.5 text-primary" />
            <span>My Team Roster ({teamMembers.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Approvals Inbox ── */}
        <TabsContent value="approvals" className="space-y-6">
          {totalPendingCount === 0 && (
            <Card className="shadow-xs border-dashed">
              <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">No Pending Approvals</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  You are all caught up! When team members submit leave applications, missed punch corrections, or profile change requests, they will appear here.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 1. Pending Leaves Section */}
          {leaves.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Calendar className="size-4 text-amber-600" />
                    <span>Pending Leave Applications ({leaves.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Review requested dates, duration, and rationale before authorizing leave balances.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Employee</TableHead>
                      <TableHead className="text-xs font-bold">Leave Type</TableHead>
                      <TableHead className="text-xs font-bold">Date Range</TableHead>
                      <TableHead className="text-xs font-bold">Duration</TableHead>
                      <TableHead className="text-xs font-bold">Reason</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave: any) => (
                      <TableRow key={leave.id} className="hover:bg-muted/30 text-xs">
                        <TableCell>
                          <div className="font-bold text-foreground">
                            {leave.employee?.firstName} {leave.employee?.lastName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {leave.employee?.employeeCode || "EMP"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold"
                            style={{ borderColor: leave.leaveType?.color, color: leave.leaveType?.color }}
                          >
                            {leave.leaveType?.name || "Leave"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {leave.days} day(s)
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={leave.reason}>
                          {leave.reason || "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={leaveActionMut.isPending}
                            onClick={() => leaveActionMut.mutate({ id: leave.id, action: "approve" })}
                            className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <Check className="size-3.5" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={leaveActionMut.isPending}
                            onClick={() =>
                              setRejectDialog({
                                open: true,
                                type: "leave",
                                id: leave.id,
                                title: `Reject Leave for ${leave.employee?.firstName} ${leave.employee?.lastName}`,
                              })
                            }
                            className="h-7 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 gap-1"
                          >
                            <X className="size-3.5" />
                            <span>Reject</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* 2. Pending Regularizations Section */}
          {regularizations.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Clock className="size-4 text-indigo-600" />
                    <span>Attendance Regularization Requests ({regularizations.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Missed biometric punches or work-from-home timings submitted for official adjustment.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Employee</TableHead>
                      <TableHead className="text-xs font-bold">Attendance Date</TableHead>
                      <TableHead className="text-xs font-bold">Proposed Timings</TableHead>
                      <TableHead className="text-xs font-bold">Reason</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regularizations.map((reg: any) => (
                      <TableRow key={reg.id} className="hover:bg-muted/30 text-xs">
                        <TableCell>
                          <div className="font-bold text-foreground">
                            {reg.employee?.firstName} {reg.employee?.lastName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {reg.employee?.employeeCode || "EMP"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {new Date(reg.attendanceDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {reg.proposedIn ? new Date(reg.proposedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          {" → "}
                          {reg.proposedOut ? new Date(reg.proposedOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={reg.reason}>
                          {reg.reason}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={regActionMut.isPending}
                            onClick={() => regActionMut.mutate({ id: reg.id, action: "approve" })}
                            className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <Check className="size-3.5" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={regActionMut.isPending}
                            onClick={() =>
                              setRejectDialog({
                                open: true,
                                type: "regularization",
                                id: reg.id,
                                title: `Reject Regularization for ${reg.employee?.firstName} ${reg.employee?.lastName}`,
                              })
                            }
                            className="h-7 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 gap-1"
                          >
                            <X className="size-3.5" />
                            <span>Reject</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* 3. Sensitive Profile Change Requests */}
          {changeRequests.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <ShieldCheck className="size-4 text-purple-600" />
                    <span>Sensitive Profile Change Requests ({changeRequests.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Bank accounts, statutory IDs (PAN, Aadhaar), and official details awaiting sign-off.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Employee</TableHead>
                      <TableHead className="text-xs font-bold">Category & Field</TableHead>
                      <TableHead className="text-xs font-bold">Old Value</TableHead>
                      <TableHead className="text-xs font-bold">Proposed Value</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeRequests.map((cr: any) => {
                      let parsedNew = cr.newValueJson;
                      let parsedOld = cr.oldValueJson;
                      try {
                        parsedNew = JSON.parse(cr.newValueJson);
                      } catch {}
                      try {
                        parsedOld = JSON.parse(cr.oldValueJson);
                      } catch {}

                      return (
                        <TableRow key={cr.id} className="hover:bg-muted/30 text-xs">
                          <TableCell>
                            <div className="font-bold text-foreground">
                              {cr.employee?.firstName} {cr.employee?.lastName}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {cr.employee?.employeeCode || "EMP"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {cr.fieldKey}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {parsedOld ? String(parsedOld) : "—"}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-primary">
                            {parsedNew ? String(parsedNew) : "—"}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={changeActionMut.isPending}
                              onClick={() => changeActionMut.mutate({ id: cr.id, action: "approve" })}
                              className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <Check className="size-3.5" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={changeActionMut.isPending}
                              onClick={() =>
                                setRejectDialog({
                                  open: true,
                                  type: "changeRequest",
                                  id: cr.id,
                                  title: `Reject Profile Change for ${cr.employee?.firstName} ${cr.employee?.lastName}`,
                                })
                              }
                              className="h-7 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 gap-1"
                            >
                              <X className="size-3.5" />
                              <span>Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 2: My Team Roster ── */}
        <TabsContent value="team" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Direct Reports Directory</CardTitle>
                <CardDescription className="text-xs">
                  Active team members reporting directly to your managerial supervisory line.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name, code or email..."
                    value={searchTeam}
                    onChange={(e) => setSearchTeam(e.target.value)}
                    className="h-8 text-xs pl-8 bg-background"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Employee</TableHead>
                    <TableHead className="text-xs font-bold">Department</TableHead>
                    <TableHead className="text-xs font-bold">Designation</TableHead>
                    <TableHead className="text-xs font-bold">Contact Info</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Joined Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isTeamLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                        Loading team members...
                      </TableCell>
                    </TableRow>
                  ) : filteredTeam.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground italic">
                        No direct reports found under your manager account.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeam.map((emp: any) => (
                      <TableRow key={emp.id} className="hover:bg-muted/30 text-xs">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {emp.firstName?.charAt(0) || "E"}{emp.lastName?.charAt(0) || ""}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-foreground">
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {emp.employeeCode || "EMP-001"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-foreground font-medium">
                            {emp.department?.name || "General"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {emp.designation?.name || "Member"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="size-3" />
                              <span>{emp.email}</span>
                            </div>
                            {emp.phone && (
                              <div className="flex items-center gap-1 font-mono">
                                <Phone className="size-3" />
                                <span>{emp.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold uppercase",
                              emp.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-slate-500/10 text-slate-500"
                            )}
                          >
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground text-[11px]">
                          {emp.joinedAt ? new Date(emp.joinedAt).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Reject Action Note ── */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => !o && closeRejectModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="size-5" />
              <span>{rejectDialog.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide feedback or a reason for declining this request. The employee will be notified with these notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Declining <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Critical project deadline / Insufficient leave balance / Please re-submit with documentation"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs min-h-[80px]"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
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
