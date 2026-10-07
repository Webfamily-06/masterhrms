import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  Plus,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calculator,
  Ban,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/me/leave/applications")({
  component: MeLeaveApplicationsPage,
});

export default function MeLeaveApplicationsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    halfDay: false,
    reason: "",
  });

  const [dryRunData, setDryRunData] = useState<any>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);

  // 1. Fetch my applications
  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ["me-leave-applications"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/applications");
      return res.data;
    },
  });

  // 2. Fetch leave types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["me-leave-types"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/balance");
      return res.data;
    },
  });

  // 3. Dry-run preview calculation effect
  useEffect(() => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      setDryRunData(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsDryRunning(true);
        const res = await api.post("/api/v1/me/leave/applications/dry-run", {
          leaveTypeId: form.leaveTypeId,
          startDate: form.startDate,
          endDate: form.endDate,
          halfDay: form.halfDay,
          reason: form.reason || "Dry run preview",
        });
        setDryRunData(res.data);
      } catch (err: any) {
        setDryRunData({ error: err.response?.data?.error || "Validation failed" });
      } finally {
        setIsDryRunning(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.leaveTypeId, form.startDate, form.endDate, form.halfDay]);

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/me/leave/applications", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Leave application submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["me-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["me-leave-balance"] });
      setModalOpen(false);
      setForm({
        leaveTypeId: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        halfDay: false,
        reason: "",
      });
      setDryRunData(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to submit leave"),
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/api/v1/me/leave/applications/${id}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Leave application withdrawn / cancelled");
      queryClient.invalidateQueries({ queryKey: ["me-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["me-leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["me-attendance-records"] });
      setCancelModalOpen(false);
      setSelectedApp(null);
      setCancelReason("");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to cancel leave"),
  });

  const pendingCount = applications.filter((a: any) => a.status === "pending").length;
  const approvedCount = applications.filter((a: any) => a.status === "approved").length;
  const rejectedCount = applications.filter((a: any) => a.status === "rejected").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Leave Applications"
        description="Submit leave requests with real-time dry-run quota validation and track approval status."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Apply for Leave
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Applications" value={applications.length} icon={<FileText className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Pending Approval" value={pendingCount} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Approved Leaves" value={approvedCount} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Rejected / Cancelled" value={rejectedCount} icon={<XCircle className="w-5 h-5 text-rose-500" />} />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">My Leave History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 text-left">Leave Type</th>
                  <th className="py-3 px-4 text-left">Dates</th>
                  <th className="py-3 px-4 text-left">Duration</th>
                  <th className="py-3 px-4 text-left">Reason</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No leave applications submitted yet
                    </td>
                  </tr>
                ) : (
                  applications.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <Badge variant="outline">{a.leaveType?.name || "Leave"}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                        {new Date(a.startDate).toLocaleDateString()} to {new Date(a.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {a.days} day(s) {a.isHalfDay ? "(Half-day)" : ""}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-sm truncate" title={a.reason}>
                        {a.reason}
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
                      <td className="py-3 px-4 text-right">
                        {(a.status === "pending" || a.status === "approved") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-rose-600 hover:text-rose-700"
                            onClick={() => {
                              setSelectedApp(a);
                              setCancelModalOpen(true);
                            }}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" />
                            Withdraw
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

      {/* Modal: Apply for Leave with Dry-Run Preview */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold">Leave Type</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.leaveTypeId}
                onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              >
                <option value="">-- Choose Leave Category --</option>
                {leaveTypes.map((t: any) => (
                  <option key={t.leaveTypeId} value={t.leaveTypeId}>
                    {t.leaveTypeName} (Available: {t.available} days)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">End Date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="me-halfDay"
                checked={form.halfDay}
                onChange={(e) => setForm({ ...form, halfDay: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="me-halfDay" className="text-xs font-medium cursor-pointer">
                Apply as Half-Day Leave (0.5 day deduction)
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold">Reason for Absence</label>
              <Input
                placeholder="Personal reasons, medical visit, etc."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            {/* Dry-Run Calculation Preview Card */}
            {isDryRunning ? (
              <div className="p-3 border rounded-lg bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Calculating authoritative dry-run breakdown...
              </div>
            ) : dryRunData ? (
              <div
                className={`p-3 border rounded-lg text-xs space-y-1.5 ${
                  dryRunData.error || !dryRunData.sufficientBalance
                    ? "border-rose-200 bg-rose-50/30 text-rose-800"
                    : "border-emerald-200 bg-emerald-50/30 text-emerald-800"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" />
                    Dry-Run Validation Result
                  </span>
                  <span>
                    {dryRunData.error
                      ? "Invalid"
                      : `${dryRunData.computedDays} Day(s) Deducted`}
                  </span>
                </div>
                {dryRunData.error ? (
                  <p className="text-rose-600">{dryRunData.error}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>Available Quota: {dryRunData.availableBalance} days</div>
                    <div>Remaining After: {dryRunData.availableBalance - dryRunData.computedDays} days</div>
                    {dryRunData.sandwichDaysAdded > 0 && (
                      <div className="col-span-2 text-amber-700">
                        Sandwich Rule: +{dryRunData.sandwichDaysAdded} day(s) added due to weekend/holiday overlap
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitMutation.mutate(form)}
              disabled={
                !form.leaveTypeId ||
                !form.reason ||
                !dryRunData ||
                dryRunData.error ||
                !dryRunData.sufficientBalance ||
                submitMutation.isPending
              }
            >
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Withdraw / Cancel */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Leave Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Cancelling this leave will restore your quota balance and remove the absence from your schedule.
            </p>
            <div>
              <label className="text-xs font-semibold">Reason for Cancellation</label>
              <Input
                placeholder="Plans cancelled, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate({ id: selectedApp.id, reason: cancelReason })}
              disabled={cancelMutation.isPending}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
