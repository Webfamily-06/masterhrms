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
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  FileCheck2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/attendance/regularizations")({
  component: HrAttendanceRegularizationsPage,
});

export default function HrAttendanceRegularizationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comments, setComments] = useState("");
  const [actionModalOpen, setActionModalOpen] = useState(false);

  const { data: regularizations = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-attendance-regularizations"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/regularizations");
      return res.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      const res = await api.post(`/api/v1/hr/attendance/regularizations/${id}/action`, { action, comments });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(`Regularization request ${vars.action === "approve" ? "approved" : "rejected"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-regularizations"] });
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-records"] });
      setActionModalOpen(false);
      setSelectedReg(null);
      setComments("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to process regularization");
    },
  });

  const pendingCount = regularizations.filter((r: any) => r.status === "PENDING").length;
  const approvedCount = regularizations.filter((r: any) => r.status === "APPROVED").length;
  const rejectedCount = regularizations.filter((r: any) => r.status === "REJECTED").length;

  const filtered = regularizations.filter((r: any) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchTerm) {
      const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
      const code = (r.employee?.employeeCode || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!name.includes(s) && !code.includes(s)) return false;
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
      <PageHeader
        title="Attendance Regularizations"
        description="Review, verify, and approve employee attendance punch corrections."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={regularizations.length} icon={<FileCheck2 className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Pending Review" value={pendingCount} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Approved" value={approvedCount} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Rejected" value={rejectedCount} icon={<XCircle className="w-5 h-5 text-rose-500" />} className="border-rose-200 bg-rose-50/20" />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-semibold">Regularization Queue</CardTitle>
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
                {["all", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      statusFilter === st ? "bg-background shadow font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {st === "all" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
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
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Proposed Punch</th>
                  <th className="py-3 px-4 text-left">Reason</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No regularization requests found
                    </td>
                  </tr>
                ) : (
                  filtered.map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {item.employee?.firstName} {item.employee?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.employee?.employeeCode} • {item.employee?.department?.name || "General"}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                        {new Date(item.attendanceDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                        <div>In: {item.proposedIn ? new Date(item.proposedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                        <div>Out: {item.proposedOut ? new Date(item.proposedOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-xs text-muted-foreground" title={item.reason}>
                        {item.reason}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            item.status === "APPROVED"
                              ? "default"
                              : item.status === "REJECTED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize text-xs"
                        >
                          {item.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {item.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => openAction(item, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-rose-600 hover:text-rose-700 border-rose-200"
                              onClick={() => openAction(item, "reject")}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : "Processed"}
                          </span>
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

      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Regularization" : "Reject Regularization"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <p className="text-sm text-muted-foreground">
              {actionType === "approve"
                ? "Approving this request will automatically correct the employee's attendance record and worked hours for this date."
                : "Please state the reason for rejecting this regularization request."}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Reviewer Notes (Optional)</label>
              <Input
                placeholder="Add comments..."
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
              onClick={submitAction}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? "Processing..." : actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
