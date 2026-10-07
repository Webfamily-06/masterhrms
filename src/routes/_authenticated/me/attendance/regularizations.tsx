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
  Plus,
  RefreshCw,
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/me/attendance/regularizations")({
  component: MeAttendanceRegularizationsPage,
});

export default function MeAttendanceRegularizationsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    attendanceDate: new Date().toISOString().slice(0, 10),
    proposedIn: "09:30",
    proposedOut: "18:30",
    reason: "",
  });

  const { data: regularizations = [], isLoading, refetch } = useQuery({
    queryKey: ["me-regularizations"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/attendance/regularizations");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Build ISO date strings for proposedIn and proposedOut
      const inDate = new Date(`${payload.attendanceDate}T${payload.proposedIn}:00Z`);
      const outDate = new Date(`${payload.attendanceDate}T${payload.proposedOut}:00Z`);

      const res = await api.post("/api/v1/me/attendance/regularizations", {
        attendanceDate: payload.attendanceDate,
        proposedIn: inDate.toISOString(),
        proposedOut: outDate.toISOString(),
        reason: payload.reason,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Regularization request submitted for manager review");
      queryClient.invalidateQueries({ queryKey: ["me-regularizations"] });
      setModalOpen(false);
      setForm({
        attendanceDate: new Date().toISOString().slice(0, 10),
        proposedIn: "09:30",
        proposedOut: "18:30",
        reason: "",
      });
    },
    onError: (err: any) => {
      if (err.response?.status === 423) {
        toast.error("Cannot regularize: This attendance month is locked for payroll.");
      } else {
        toast.error(err.response?.data?.error || "Failed to submit regularization");
      }
    },
  });

  const pendingCount = regularizations.filter((r: any) => r.status === "PENDING").length;
  const approvedCount = regularizations.filter((r: any) => r.status === "APPROVED").length;
  const rejectedCount = regularizations.filter((r: any) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Regularization Requests"
        description="Submit punch adjustment requests for missed biometric scans or outdoor duties."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Request Regularization
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={regularizations.length} icon={<FileCheck2 className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Pending Signoff" value={pendingCount} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Approved" value={approvedCount} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Rejected" value={rejectedCount} icon={<XCircle className="w-5 h-5 text-rose-500" />} className="border-rose-200 bg-rose-50/20" />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">Regularization History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 text-left">Attendance Date</th>
                  <th className="py-3 px-4 text-left">Proposed In / Out</th>
                  <th className="py-3 px-4 text-left">Reason</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Reviewer Notes</th>
                  <th className="py-3 px-4 text-left">Submitted On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {regularizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No regularization requests submitted
                    </td>
                  </tr>
                ) : (
                  regularizations.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                        {new Date(r.attendanceDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                        <div>In: {r.proposedIn ? new Date(r.proposedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                        <div>Out: {r.proposedOut ? new Date(r.proposedOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            r.status === "APPROVED"
                              ? "default"
                              : r.status === "REJECTED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize text-xs"
                        >
                          {r.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {r.reviewComments || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Request Regularization */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Attendance Regularization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold">Attendance Date</label>
              <Input
                type="date"
                value={form.attendanceDate}
                onChange={(e) => setForm({ ...form, attendanceDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Proposed Check-In</label>
                <Input
                  type="time"
                  value={form.proposedIn}
                  onChange={(e) => setForm({ ...form, proposedIn: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Proposed Check-Out</label>
                <Input
                  type="time"
                  value={form.proposedOut}
                  onChange={(e) => setForm({ ...form, proposedOut: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Reason for Regularization</label>
              <Input
                placeholder="e.g. Biometric device offline upon arrival"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.attendanceDate || !form.reason || createMutation.isPending}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
