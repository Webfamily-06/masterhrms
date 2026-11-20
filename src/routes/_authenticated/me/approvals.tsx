import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { invalidateLeaveApplications, extractLeaveErrorMessage } from "@/lib/leave-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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

  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<{
    isOpen: boolean;
    action: "approve" | "reject";
  }>({
    isOpen: false,
    action: "approve",
  });
  const [bulkReason, setBulkReason] = useState("");

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
        return unwrapData(res) || { leaves: [], regularizations: [], changeRequests: [] };
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
    onSuccess: async (_, vars) => {
      toast.success(vars.action === "approve" ? "Leave request approved successfully" : "Leave request rejected");
      await invalidateLeaveApplications(queryClient);
      closeDecisionModal();
    },
    onError: (err: any) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to process leave decision"));
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

  const bulkDecisionMutation = useMutation({
    mutationFn: async ({
      action,
      reason,
      items,
    }: {
      action: "approve" | "reject";
      reason?: string;
      items: Array<{ id: string; type: string }>;
    }) => {
      return await api.post("/api/v1/me/team/approvals/bulk-action", {
        action,
        reason,
        items,
      });
    },
    onSuccess: async (_, vars) => {
      toast.success(
        vars.action === "approve"
          ? `Successfully approved ${vars.items.length} requests in bulk.`
          : `Successfully rejected ${vars.items.length} requests in bulk.`
      );
      setSelectedItemKeys(new Set());
      closeBulkModal();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me-team-approvals"] }),
        invalidateLeaveApplications(queryClient),
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to process bulk decision");
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

  function openBulkModal(action: "approve" | "reject") {
    setBulkModal({ isOpen: true, action });
    setBulkReason("");
  }

  function closeBulkModal() {
    setBulkModal({ isOpen: false, action: "approve" });
    setBulkReason("");
  }

  function handleExecuteBulkDecision() {
    const items: Array<{ id: string; type: string }> = [];
    selectedItemKeys.forEach((key) => {
      const [type, id] = key.split(":");
      if (type && id) {
        items.push({ id, type });
      }
    });

    if (items.length === 0) return;

    bulkDecisionMutation.mutate({
      action: bulkModal.action,
      reason: bulkReason.trim() || undefined,
      items,
    });
  }

  // Filter items by search query
  const queryLower = search.toLowerCase().trim();

  const filteredLeaves = leaves.filter((leave) => {
    if (!queryLower) return true;
    const name = `${leave.employee?.firstName || ""} ${leave.employee?.lastName || ""}`.toLowerCase();
    const reason = (leave.reason || "").toLowerCase();
    const type = (leave.leaveType?.name || "").toLowerCase();
    return name.includes(queryLower) || reason.includes(queryLower) || type.includes(queryLower);
  });

  const filteredRegularizations = regularizations.filter((reg) => {
    if (!queryLower) return true;
    const name = `${reg.employee?.firstName || ""} ${reg.employee?.lastName || ""}`.toLowerCase();
    const reason = (reg.reason || "").toLowerCase();
    return name.includes(queryLower) || reason.includes(queryLower);
  });

  const filteredChangeRequests = changeRequests.filter((change) => {
    if (!queryLower) return true;
    const name = `${change.employee?.firstName || ""} ${change.employee?.lastName || ""}`.toLowerCase();
    const field = (change.field || change.fieldCategory || "").toLowerCase();
    return name.includes(queryLower) || field.includes(queryLower);
  });

  // Calculate visible items on current filter
  const visibleItems: Array<{ type: "leave" | "regularization" | "profile_change"; id: string }> = [];
  if (entityFilter === "all" || entityFilter === "leave") {
    filteredLeaves.forEach((l) => visibleItems.push({ type: "leave", id: l.id }));
  }
  if (entityFilter === "all" || entityFilter === "regularization") {
    filteredRegularizations.forEach((r) => visibleItems.push({ type: "regularization", id: r.id }));
  }
  if (entityFilter === "all" || entityFilter === "profile") {
    filteredChangeRequests.forEach((c) => visibleItems.push({ type: "profile_change", id: c.id }));
  }

  const allVisibleKeys = visibleItems.map((i) => `${i.type}:${i.id}`);
  const areAllVisibleSelected =
    allVisibleKeys.length > 0 && allVisibleKeys.every((k) => selectedItemKeys.has(k));
  const hasSomeVisibleSelected =
    allVisibleKeys.some((k) => selectedItemKeys.has(k));

  function toggleSelectItem(type: string, id: string) {
    const key = `${type}:${id}`;
    setSelectedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (areAllVisibleSelected) {
      setSelectedItemKeys((prev) => {
        const next = new Set(prev);
        allVisibleKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelectedItemKeys((prev) => {
        const next = new Set(prev);
        allVisibleKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  }

  const isSubmitting =
    leaveDecisionMutation.isPending ||
    regDecisionMutation.isPending ||
    profileChangeMutation.isPending ||
    genericDecisionMutation.isPending ||
    bulkDecisionMutation.isPending;

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
          icon={<Clock className="h-5 w-5" />}
          description="Requests awaiting your review"
        />
        <StatCard
          title="Leave Requests"
          value={leaves.length}
          icon={<Calendar className="h-5 w-5" />}
          description="Pending team time-off"
        />
        <StatCard
          title="Attendance Regularizations"
          value={regularizations.length}
          icon={<UserCheck className="h-5 w-5" />}
          description="Pending clock-in corrections"
        />
        <StatCard
          title="Profile Changes"
          value={changeRequests.length}
          icon={<FileText className="h-5 w-5" />}
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
          {/* Bulk Action Sticky Toolbar */}
          {selectedItemKeys.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-semibold">
                  {selectedItemKeys.size} Selected
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Ready for bulk processing
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedItemKeys(new Set())}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openBulkModal("reject")}
                  disabled={isSubmitting}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Bulk Reject ({selectedItemKeys.size})
                </Button>
                <Button
                  size="sm"
                  onClick={() => openBulkModal("approve")}
                  disabled={isSubmitting}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Bulk Approve ({selectedItemKeys.size})
                </Button>
              </div>
            </div>
          )}

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
              {/* Select All on Page Header */}
              {visibleItems.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border rounded-lg text-xs font-medium text-muted-foreground">
                  <div
                    className="flex items-center gap-2 cursor-pointer select-none"
                    onClick={toggleSelectAllVisible}
                  >
                    <Checkbox
                      checked={
                        areAllVisibleSelected
                          ? true
                          : hasSomeVisibleSelected
                          ? "indeterminate"
                          : false
                      }
                      onCheckedChange={toggleSelectAllVisible}
                    />
                    <span>
                      Select All ({visibleItems.length} {visibleItems.length === 1 ? "request" : "requests"} on current view)
                    </span>
                  </div>
                  {selectedItemKeys.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedItemKeys(new Set())}
                      className="text-primary hover:underline"
                    >
                      Deselect all ({selectedItemKeys.size})
                    </button>
                  )}
                </div>
              )}

              {/* Leave Requests */}
              {(entityFilter === "all" || entityFilter === "leave") &&
                filteredLeaves.map((leave) => (
                  <Card key={`leave-${leave.id}`} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedItemKeys.has(`leave:${leave.id}`)}
                          onCheckedChange={() => toggleSelectItem("leave", leave.id)}
                          className="mt-1"
                          aria-label={`Select leave request for ${leave.employee?.firstName} ${leave.employee?.lastName}`}
                        />
                        <div className="space-y-1 flex-1">
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
                filteredRegularizations.map((reg) => (
                  <Card key={`reg-${reg.id}`} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedItemKeys.has(`regularization:${reg.id}`)}
                          onCheckedChange={() => toggleSelectItem("regularization", reg.id)}
                          className="mt-1"
                          aria-label={`Select regularization request for ${reg.employee?.firstName} ${reg.employee?.lastName}`}
                        />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              Regularization
                            </Badge>
                            <span className="font-semibold text-sm">
                              {reg.employee?.firstName} {reg.employee?.lastName}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">
                            Correction Date: <span className="font-medium">{format(new Date(reg.date || reg.attendanceDate), "MMM d, yyyy")}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Reason: {reg.reason}</p>
                        </div>
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
                filteredChangeRequests.map((change) => (
                  <Card key={`change-${change.id}`} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedItemKeys.has(`profile_change:${change.id}`)}
                          onCheckedChange={() => toggleSelectItem("profile_change", change.id)}
                          className="mt-1"
                          aria-label={`Select profile change request for ${change.employee?.firstName} ${change.employee?.lastName}`}
                        />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                              Profile Change
                            </Badge>
                            <span className="font-semibold text-sm">
                              {change.employee?.firstName} {change.employee?.lastName}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">Field: {change.field || change.fieldCategory}</p>
                          <p className="text-xs text-muted-foreground">
                            Proposed: {String(change.newValue || "")} (from {String(change.oldValue || "")})
                          </p>
                        </div>
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

      {/* Bulk Decision Dialog */}
      <Dialog open={bulkModal.isOpen} onOpenChange={(open) => !open && closeBulkModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkModal.action === "approve"
                ? `Bulk Approve (${selectedItemKeys.size} Requests)`
                : `Bulk Reject (${selectedItemKeys.size} Requests)`}
            </DialogTitle>
            <DialogDescription>
              {bulkModal.action === "approve"
                ? `You are about to approve ${selectedItemKeys.size} selected requests simultaneously. All requests will be processed atomically in a single transaction.`
                : `You are about to reject ${selectedItemKeys.size} selected requests simultaneously. Please provide a clear rejection reason.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {bulkModal.action === "approve" ? "Bulk Remarks (Optional)" : "Rejection Reason (Required)"}
            </label>
            <Textarea
              rows={3}
              placeholder={
                bulkModal.action === "approve"
                  ? "e.g., Bulk approved for the team as discussed"
                  : "e.g., Please resubmit with updated documentation / date adjustment"
              }
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeBulkModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className={
                bulkModal.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }
              onClick={handleExecuteBulkDecision}
              disabled={
                isSubmitting ||
                (bulkModal.action === "reject" && !bulkReason.trim())
              }
            >
              {isSubmitting
                ? "Processing Bulk Action..."
                : bulkModal.action === "approve"
                ? `Confirm Bulk Approval (${selectedItemKeys.size})`
                : `Confirm Bulk Rejection (${selectedItemKeys.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MeApprovalsPage;
