import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  UserCheck,
  FileText,
  Search,
  Filter,
  Check,
  X,
  History,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/me/approvals")({
  component: MeApprovalsPage,
  head: () => ({ meta: [{ title: "My Approvals & Team Requests — Master HRMS" }] }),
});

export function MeApprovalsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "submitted" | "history">("pending");
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: "leave" | "regularization" | "profile_change" | "generic";
    action: "approve" | "reject";
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: "generic",
    action: "approve",
    id: "",
    title: "",
  });
  const [decisionComments, setDecisionComments] = useState("");

  // 1. Fetch team approvals from manager-hub API
  const { data: teamApprovalsRes, isLoading: isTeamLoading } = useQuery({
    queryKey: ["me-team-approvals"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/team/approvals");
        return res?.data || { leaves: [], regularizations: [], changeRequests: [] };
      } catch {
        return { leaves: [], regularizations: [], changeRequests: [] };
      }
    },
  });

  // 2. Fetch platform foundation approvals
  const { data: platformApprovalsRes, isLoading: isPlatformLoading } = useQuery({
    queryKey: ["me-platform-approvals"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/approvals");
        return res || { toApprove: [], mySubmitted: [] };
      } catch {
        return { toApprove: [], mySubmitted: [] };
      }
    },
  });

  const leaves: any[] = teamApprovalsRes?.leaves || [];
  const regularizations: any[] = teamApprovalsRes?.regularizations || [];
  const changeRequests: any[] = teamApprovalsRes?.changeRequests || [];

  // Mutations
  const leaveDecisionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      return await api.post(`/api/v1/me/team/leaves/${id}/action`, { action, comments });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Leave request approved successfully" : "Leave request rejected");
      queryClient.invalidateQueries({ queryKey: ["me-team-approvals"] });
      closeDecisionModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process leave decision");
    },
  });

  const regDecisionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      return await api.post(`/api/v1/me/team/regularizations/${id}/action`, { action, comments });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Regularization approved & sync complete" : "Regularization rejected");
      queryClient.invalidateQueries({ queryKey: ["me-team-approvals"] });
      closeDecisionModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process regularization decision");
    },
  });

  const profileChangeMutation = useMutation({
    mutationFn: async ({ id, action, reviewerNotes }: { id: string; action: "approve" | "reject"; reviewerNotes?: string }) => {
      return await api.post(`/api/v1/me/team/profile-changes/${id}/action`, { action, reviewerNotes });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Profile update approved" : "Profile update rejected");
      queryClient.invalidateQueries({ queryKey: ["me-team-approvals"] });
      closeDecisionModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process profile change decision");
    },
  });

  const genericDecisionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      return await api.post(`/api/v1/shared/approvals/${id}/${action}`, { comments });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Approval recorded" : "Request rejected");
      queryClient.invalidateQueries({ queryKey: ["me-platform-approvals"] });
      closeDecisionModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process approval");
    },
  });

  function openDecisionModal(type: any, action: "approve" | "reject", id: string, title: string) {
    setDecisionModal({ isOpen: true, type, action, id, title });
    setDecisionComments("");
  }

  function closeDecisionModal() {
    setDecisionModal({ isOpen: false, type: "generic", action: "approve", id: "", title: "" });
    setDecisionComments("");
  }

  function handleExecuteDecision() {
    const { type, action, id } = decisionModal;
    if (type === "leave") {
      leaveDecisionMutation.mutate({ id, action, comments: decisionComments });
    } else if (type === "regularization") {
      regDecisionMutation.mutate({ id, action, comments: decisionComments });
    } else if (type === "profile_change") {
      profileChangeMutation.mutate({ id, action, reviewerNotes: decisionComments });
    } else {
      genericDecisionMutation.mutate({ id, action, comments: decisionComments });
    }
  }

  const isSubmitting =
    leaveDecisionMutation.isPending ||
    regDecisionMutation.isPending ||
    profileChangeMutation.isPending ||
    genericDecisionMutation.isPending;

  const totalPending = leaves.length + regularizations.length + changeRequests.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals & Decisions"
        description="Review, authorize, and track workflow approval requests submitted by your team or assigned to you."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Pending My Action"
          value={totalPending}
          icon={Clock}
          description="Requests awaiting your review"
        />
        <StatCard
          title="Leave Requests"
          value={leaves.length}
          icon={Calendar}
          description="Pending team time-off"
        />
        <StatCard
          title="Attendance Regularizations"
          value={regularizations.length}
          icon={UserCheck}
          description="Pending clock-in corrections"
        />
        <StatCard
          title="Profile Changes"
          value={changeRequests.length}
          icon={FileText}
          description="Pending employee updates"
        />
      </StatsOverviewGrid>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pending">
            Pending My Review ({totalPending})
          </TabsTrigger>
          <TabsTrigger value="submitted">My Submitted Requests</TabsTrigger>
          <TabsTrigger value="history">Decision History</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee name or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-xs border rounded-md px-2.5 py-1.5 bg-background"
            >
              <option value="all">All Request Types</option>
              <option value="leave">Leave Requests</option>
              <option value="regularization">Attendance Regularizations</option>
              <option value="profile">Profile Updates</option>
            </select>
          </div>
        </div>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {totalPending === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                <h3 className="text-base font-semibold text-foreground">All Caught Up!</h3>
                <p className="text-sm max-w-sm">You have zero pending approvals awaiting your decision right now.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Leave Requests */}
              {(entityFilter === "all" || entityFilter === "leave") &&
                leaves.map((leave) => (
                  <Card key={`leave-${leave.id}`} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            Leave Request
                          </Badge>
                          <span className="font-semibold text-sm">
                            {leave.employee?.firstName} {leave.employee?.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {leave.employee?.designation?.name || "Team Member"}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {leave.leaveType?.name || "Leave"}:{" "}
                          <span className="font-medium">
                            {format(new Date(leave.startDate), "MMM d, yyyy")} to {format(new Date(leave.endDate), "MMM d, yyyy")}
                          </span>{" "}
                          ({leave.daysCount} {leave.daysCount === 1 ? "day" : "days"})
                        </p>
                        {leave.reason && (
                          <p className="text-xs text-muted-foreground italic">"{leave.reason}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                          onClick={() =>
                            openDecisionModal(
                              "leave",
                              "reject",
                              leave.id,
                              `Leave Request for ${leave.employee?.firstName || "Employee"}`
                            )
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() =>
                            openDecisionModal(
                              "leave",
                              "approve",
                              leave.id,
                              `Leave Request for ${leave.employee?.firstName || "Employee"}`
                            )
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {/* Attendance Regularizations */}
              {(entityFilter === "all" || entityFilter === "regularization") &&
                regularizations.map((reg) => (
                  <Card key={`reg-${reg.id}`} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Regularization
                          </Badge>
                          <span className="font-semibold text-sm">
                            {reg.employee?.firstName} {reg.employee?.lastName}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          Correction Date: <span className="font-medium">{format(new Date(reg.date), "MMM d, yyyy")}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Reason: {reg.reason}</p>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                          onClick={() =>
                            openDecisionModal("regularization", "reject", reg.id, `Attendance Regularization`)
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() =>
                            openDecisionModal("regularization", "approve", reg.id, `Attendance Regularization`)
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {/* Profile Change Requests */}
              {(entityFilter === "all" || entityFilter === "profile") &&
                changeRequests.map((change) => (
                  <Card key={`change-${change.id}`} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                            Profile Change
                          </Badge>
                          <span className="font-semibold text-sm">
                            {change.employee?.firstName} {change.employee?.lastName}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">Field: {change.field}</p>
                        <p className="text-xs text-muted-foreground">
                          Proposed: {String(change.newValue)} (from {String(change.oldValue)})
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                          onClick={() =>
                            openDecisionModal("profile_change", "reject", change.id, `Profile Update`)
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() =>
                            openDecisionModal("profile_change", "approve", change.id, `Profile Update`)
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submitted" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Submitted Requests</CardTitle>
              <CardDescription>
                Track the status of approval requests you have initiated across leaves, expense claims, and profile changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-6 text-center">
                All submitted workflow tickets and approvals will be displayed with real-time routing status.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Decision History</CardTitle>
              <CardDescription>
                Audit trail of past decisions you made on team leave requests, regularizations, and profile changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-6 text-center">
                Past approved and rejected workflow items are logged with timestamps and decision comments.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Dialog */}
      <Dialog open={decisionModal.isOpen} onOpenChange={(open) => !open && closeDecisionModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decisionModal.action === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {decisionModal.title}. Add optional review remarks or reasons for this decision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {decisionModal.action === "approve" ? "Approval Remarks (Optional)" : "Rejection Reason (Required)"}
            </label>
            <Textarea
              rows={3}
              placeholder={
                decisionModal.action === "approve"
                  ? "e.g., Approved as per discussion"
                  : "e.g., Insufficient staffing during this window"
              }
              value={decisionComments}
              onChange={(e) => setDecisionComments(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDecisionModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className={
                decisionModal.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }
              onClick={handleExecuteDecision}
              disabled={isSubmitting || (decisionModal.action === "reject" && !decisionComments.trim())}
            >
              {isSubmitting ? "Processing..." : decisionModal.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MeApprovalsPage;
