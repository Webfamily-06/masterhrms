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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Clock,
  Home,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/me/attendance/requests")({
  component: MeAttendanceRequestsPage,
});

export default function MeAttendanceRequestsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overtime");
  const [modalOpen, setModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<"OVERTIME" | "WFH">("OVERTIME");

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    hours: 2,
    reason: "",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["me-attendance-requests"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/attendance/requests");
      return res.data;
    },
  });

  const overtime = data?.overtime || [];
  const wfh = data?.wfh || [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/me/attendance/requests", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Request submitted for approval");
      queryClient.invalidateQueries({ queryKey: ["me-attendance-requests"] });
      setModalOpen(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        fromDate: new Date().toISOString().slice(0, 10),
        toDate: new Date().toISOString().slice(0, 10),
        hours: 2,
        reason: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to submit request"),
  });

  const openModal = (type: "OVERTIME" | "WFH") => {
    setRequestType(type);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    createMutation.mutate({
      type: requestType,
      date: form.date,
      fromDate: form.fromDate,
      toDate: form.toDate,
      hours: form.hours,
      reason: form.reason,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Requests"
        description="Submit and track your Overtime and Work From Home (WFH) requests."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => openModal(activeTab === "overtime" ? "OVERTIME" : "WFH")}>
            <Plus className="w-4 h-4 mr-2" />
            New {activeTab === "overtime" ? "Overtime" : "WFH"} Request
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Overtime Requests" value={overtime.length} icon={<Clock className="w-5 h-5 text-blue-500" />} />
        <StatCard label="WFH Requests" value={wfh.length} icon={<Home className="w-5 h-5 text-emerald-500" />} />
        <StatCard
          label="Pending Review"
          value={
            overtime.filter((o: any) => o.status === "pending").length +
            wfh.filter((w: any) => w.status === "pending").length
          }
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
          className="border-amber-200 bg-amber-50/20"
        />
        <StatCard
          label="Approved"
          value={
            overtime.filter((o: any) => o.status === "approved").length +
            wfh.filter((w: any) => w.status === "approved").length
          }
          icon={<CheckCircle2 className="w-5 h-5 text-purple-500" />}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overtime">Overtime Requests</TabsTrigger>
          <TabsTrigger value="wfh">Work From Home (WFH)</TabsTrigger>
        </TabsList>

        <TabsContent value="overtime">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">My Overtime Applications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Overtime Date</th>
                      <th className="py-3 px-4 text-left">Hours Claimed</th>
                      <th className="py-3 px-4 text-left">Reason</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Reviewed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {overtime.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          No overtime requests submitted
                        </td>
                      </tr>
                    ) : (
                      overtime.map((o: any) => (
                        <tr key={o.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono text-xs font-semibold">
                            {new Date(o.overtimeDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {o.hoursRequested} hrs
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground max-w-sm truncate">
                            {o.reason || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                o.status === "approved"
                                  ? "default"
                                  : o.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="capitalize text-xs"
                            >
                              {o.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {o.reviewedAt ? new Date(o.reviewedAt).toLocaleDateString() : "Pending"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wfh">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">My WFH Applications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Dates</th>
                      <th className="py-3 px-4 text-left">Reason</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Submitted Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {wfh.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                          No WFH requests submitted
                        </td>
                      </tr>
                    ) : (
                      wfh.map((w: any) => (
                        <tr key={w.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono text-xs font-semibold">
                            {new Date(w.fromDate).toLocaleDateString()} to {new Date(w.toDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground max-w-sm truncate">
                            {w.reason || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                w.status === "approved"
                                  ? "default"
                                  : w.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="capitalize text-xs"
                            >
                              {w.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: New Request */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {requestType === "OVERTIME" ? "Request Overtime" : "Request Work From Home (WFH)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {requestType === "OVERTIME" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold">Date</label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Hours</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.hours}
                      onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">From Date</label>
                  <Input
                    type="date"
                    value={form.fromDate}
                    onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">To Date</label>
                  <Input
                    type="date"
                    value={form.toDate}
                    onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold">Reason</label>
              <Input
                placeholder="State project requirement or personal need"
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
              onClick={handleSubmit}
              disabled={!form.reason || createMutation.isPending}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
