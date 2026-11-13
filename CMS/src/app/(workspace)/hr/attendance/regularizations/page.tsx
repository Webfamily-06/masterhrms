'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  FileCheck2,
  Calendar,
  ArrowRight,
  User,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function HrAttendanceRegularizationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comments, setComments] = useState("");
  const [actionModalOpen, setActionModalOpen] = useState(false);

  // 1. Fetch Regularizations
  const { data: regularizations = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-attendance-regularizations"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/regularizations");
      return res.data;
    },
  });

  // Mutation: Approve / Reject
  const actionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      const res = await api.post(`/api/v1/hr/attendance/regularizations/${id}/action`, { action, comments });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(`Regularization request ${vars.action === "approve" ? "approved" : "rejected"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-regularizations"] });
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-records"] });
      setActionModalOpen(false);
      setSelectedReg(null);
      setComments("");
    },
    onError: (err: any) => {
      if (err.status === 423 || err.response?.status === 423) {
        toast.error("This attendance period is locked. Modifications are prohibited.");
      } else {
        toast.error(err.response?.data?.error || "Failed to process regularization");
      }
    },
  });

  const pendingCount = regularizations.filter((r: any) => r.status === "PENDING").length;
  const approvedCount = regularizations.filter((r: any) => r.status === "APPROVED").length;
  const rejectedCount = regularizations.filter((r: any) => r.status === "REJECTED").length;

  const filtered = regularizations.filter((r: any) => {
    if (statusFilter !== "all" && r.status !== statusFilter.toUpperCase()) return false;
    if (searchTerm) {
      const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
      const code = (r.employee?.employeeCode || "").toLowerCase();
      const reason = (r.reason || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!name.includes(s) && !code.includes(s) && !reason.includes(s)) return false;
    }
    return true;
  });

  const openAction = (reg: any, type: "approve" | "reject") => {
    setSelectedReg(reg);
    setActionType(type);
    setComments("");
    setActionModalOpen(true);
  };

  const submitAction = () => {
    if (!selectedReg) return;
    actionMutation.mutate({ id: selectedReg.id, action: actionType, comments });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Attendance Regularizations"
        description="Review, verify, and approve employee attendance punch corrections."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="text-xs">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Summary KPI Cards (Reference Screenshot 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={regularizations.length}
          icon={<FileCheck2 className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          label="Pending Review"
          value={pendingCount}
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
          className="border-amber-200 bg-amber-50/20"
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          className="border-emerald-200 bg-emerald-50/20"
        />
        <StatCard
          label="Rejected"
          value={rejectedCount}
          icon={<XCircle className="w-5 h-5 text-rose-500" />}
          className="border-rose-200 bg-rose-50/20"
        />
      </div>

      {/* Toolbar & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search employee name, code, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
              {[
                { key: "all", label: "All", count: regularizations.length },
                { key: "pending", label: "Pending", count: pendingCount },
                { key: "approved", label: "Approved", count: approvedCount },
                { key: "rejected", label: "Rejected", count: rejectedCount },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    statusFilter === tab.key
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regularization Request Cards Grid (Screenshot 3 Reference) */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          Loading regularization requests...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No regularization requests found matching this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((reg: any) => {
            const isPending = reg.status === "PENDING";
            const isApproved = reg.status === "APPROVED";
            const isRejected = reg.status === "REJECTED";

            return (
              <Card key={reg.id} className="overflow-hidden border shadow-xs hover:shadow-sm transition-shadow">
                <CardHeader className="p-4 pb-3 border-b bg-muted/15 flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                      {reg.employee?.firstName?.[0]}
                      {reg.employee?.lastName?.[0]}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {reg.employee?.firstName} {reg.employee?.lastName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {reg.employee?.employeeCode} • {reg.employee?.department?.name || "General"}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={isApproved ? "default" : isRejected ? "destructive" : "secondary"}
                    className={`capitalize text-[11px] font-semibold ${
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                        : isPending
                        ? "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800"
                        : "bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-800"
                    }`}
                  >
                    {reg.status}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5 text-xs">
                  {/* Date & Request info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border bg-muted/30">
                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                        Target Date
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {new Date(reg.attendanceDate).toISOString().slice(0, 10)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/30">
                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                        Submitted On
                      </span>
                      <span className="text-foreground mt-0.5 block">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Proposed Timings Comparison */}
                  <div className="p-3 rounded-lg border bg-card space-y-1.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                      Proposed Punch Correction
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono font-semibold">
                          {reg.proposedIn ? new Date(reg.proposedIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono font-semibold">
                          {reg.proposedOut ? new Date(reg.proposedOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {reg.proposedIn && reg.proposedOut
                          ? `${Math.round(((new Date(reg.proposedOut).getTime() - new Date(reg.proposedIn).getTime()) / (1000 * 60 * 60)) * 10) / 10} hrs`
                          : "Full Day"}
                      </Badge>
                    </div>
                  </div>

                  {/* Reason Callout */}
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">Reason</span>
                    <p className="text-foreground mt-0.5 leading-relaxed">{reg.reason}</p>
                  </div>

                  {/* Review comments if already processed */}
                  {reg.reviewComments && (
                    <div className="p-2.5 rounded-lg border bg-muted/40 text-muted-foreground">
                      <span className="text-[10px] uppercase font-medium block">Reviewer Remarks</span>
                      <p className="mt-0.5 text-foreground">{reg.reviewComments}</p>
                    </div>
                  )}

                  {/* Actions for Pending Requests */}
                  {isPending && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAction(reg, "reject")}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openAction(reg, "approve")}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve & Recalculate
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: Review Action (Approve / Reject) */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {actionType === "approve" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-500" />
              )}
              {actionType === "approve" ? "Approve Regularization" : "Reject Regularization"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionType === "approve"
                ? "Approving will apply the corrected check-in/out and transactionally recalculate attendance working hours, late arrival, and overtime metrics."
                : "Rejecting requires reviewer comments detailing why the correction cannot be approved."}
            </DialogDescription>
          </DialogHeader>

          {selectedReg && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
                <p className="font-semibold text-foreground">
                  Employee: {selectedReg.employee?.firstName} {selectedReg.employee?.lastName}
                </p>
                <p className="text-muted-foreground">
                  Target Date: {new Date(selectedReg.attendanceDate).toISOString().slice(0, 10)}
                </p>
                <p className="text-muted-foreground">Reason: {selectedReg.reason}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Reviewer Comments {actionType === "reject" ? "*" : "(Optional)"}
                </label>
                <Input
                  placeholder={
                    actionType === "reject"
                      ? "Reason for rejection (required)..."
                      : "Optional remarks for audit history..."
                  }
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              size="sm"
              onClick={submitAction}
              disabled={actionMutation.isPending || (actionType === "reject" && !comments.trim())}
              className={actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            >
              {actionMutation.isPending
                ? "Processing..."
                : actionType === "approve"
                ? "Confirm & Recalculate"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
