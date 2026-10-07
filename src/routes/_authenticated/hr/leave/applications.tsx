import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  FileText,
  Ban,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/leave/applications")({
  component: HrLeaveApplicationsPage,
});

export default function HrLeaveApplicationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "cancel">("approve");
  const [comments, setComments] = useState("");
  const [actionModalOpen, setActionModalOpen] = useState(false);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ["hr-leave-applications", statusFilter],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/applications", {
        params: { status: statusFilter },
      });
      return res.data;
    },
  });

  const applications = response?.data || [];

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      const res = await api.post(`/api/v1/hr/leave/applications/${id}/action`, { action, comments });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(`Leave application ${vars.action === "approve" ? "approved" : "rejected"}`);
      queryClient.invalidateQueries({ queryKey: ["hr-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-records"] });
      setActionModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to process leave application"),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/api/v1/hr/leave/applications/${id}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Leave cancelled and compensatory ledger entry generated");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-records"] });
      setActionModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to cancel leave"),
  });

  const pendingCount = applications.filter((a: any) => a.status === "pending").length;
  const approvedCount = applications.filter((a: any) => a.status === "approved").length;
  const rejectedCount = applications.filter((a: any) => a.status === "rejected").length;

  const filtered = applications.filter((a: any) => {
    if (searchTerm) {
      const name = `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.toLowerCase();
      const code = (a.employee?.employeeCode || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!name.includes(s) && !code.includes(s)) return false;
    }
    return true;
  });

  const openAction = (app: any, type: "approve" | "reject" | "cancel") => {
    setSelectedApp(app);
    setActionType(type);
    setComments("");
    setActionModalOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedApp) return;
    if (actionType === "cancel") {
      cancelMutation.mutate({ id: selectedApp.id, reason: comments || "HR Administrative cancellation" });
    } else {
      actionMutation.mutate({ id: selectedApp.id, action: actionType, comments });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Applications"
        description="Review employee leave requests, check balance quotas, and process approvals or cancellations."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={applications.length} icon={<FileText className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Pending Review" value={pendingCount} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Approved Leaves" value={approvedCount} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Rejected" value={rejectedCount} icon={<XCircle className="w-5 h-5 text-rose-500" />} className="border-rose-200 bg-rose-50/20" />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-semibold">Leave Applications Log</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-48 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
                {["all", "pending", "approved", "rejected", "cancelled"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      statusFilter === st ? "bg-background shadow font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {st === "all" ? "All" : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 text-left">Employee</th>
                  <th className="py-3 px-4 text-left">Leave Type</th>
                  <th className="py-3 px-4 text-left">Dates & Duration</th>
                  <th className="py-3 px-4 text-left">Reason</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No leave applications found
                    </td>
                  </tr>
                ) : (
                  filtered.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-medium">{a.employee?.firstName} {a.employee?.lastName}</div>
                        <div className="text-xs text-muted-foreground">{a.employee?.employeeCode} • {a.employee?.department?.name || "General"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{a.leaveType?.name || "Leave"}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <div>
                          {new Date(a.startDate).toLocaleDateString()} to {new Date(a.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground">{a.days} day(s) {a.isHalfDay ? "(Half-day)" : ""}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate" title={a.reason}>
                        {a.reason || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            a.status === "approved"
                              ? "default"
                              : a.status === "rejected"
                              ? "destructive"
                              : a.status === "cancelled"
                              ? "outline"
                              : "secondary"
                          }
                          className="capitalize text-xs"
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {a.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => openAction(a, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-rose-600 border-rose-200"
                              onClick={() => openAction(a, "reject")}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {a.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-amber-600 border-amber-200"
                            onClick={() => openAction(a, "cancel")}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" />
                            Cancel & Reverse
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? "Approve Leave Request"
                : actionType === "reject"
                ? "Reject Leave Request"
                : "Cancel Approved Leave"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {actionType === "approve"
                ? "Approving this leave will immediately deduct quota from the employee ledger and update the attendance calendar to 'On Leave'."
                : actionType === "reject"
                ? "Please specify comments for rejecting this leave request."
                : "Cancelling an approved leave creates an authoritative reversal CREDIT in the ledger and removes the 'On Leave' attendance lock."}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Remarks (Optional)</label>
              <Input
                placeholder="Add comments or justification..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleConfirm}
              disabled={actionMutation.isPending || cancelMutation.isPending}
            >
              {actionMutation.isPending || cancelMutation.isPending
                ? "Processing..."
                : actionType === "approve"
                ? "Confirm Approval"
                : actionType === "reject"
                ? "Confirm Rejection"
                : "Confirm Reversal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
