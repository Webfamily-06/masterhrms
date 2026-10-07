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
  FileSpreadsheet,
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

export const Route = createFileRoute("/_authenticated/me/attendance/timesheet")({
  component: MeAttendanceTimesheetPage,
});

export default function MeAttendanceTimesheetPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    hours: 8,
    description: "",
  });

  const { data: timesheets = [], isLoading, refetch } = useQuery({
    queryKey: ["me-timesheets"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/attendance/timesheets");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/me/attendance/timesheets", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Timesheet entry logged successfully");
      queryClient.invalidateQueries({ queryKey: ["me-timesheets"] });
      setModalOpen(false);
      setForm({ date: new Date().toISOString().slice(0, 10), hours: 8, description: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to log timesheet"),
  });

  const approvedCount = timesheets.filter((t: any) => t.status === "approved").length;
  const pendingCount = timesheets.filter((t: any) => t.status === "pending").length;
  const totalHours = timesheets.reduce((acc: number, t: any) => acc + Number(t.hours || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Timesheet"
        description="Submit your daily worked hours, task descriptions, and project work for manager signoff."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Log Hours
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Logged" value={timesheets.length} icon={<FileSpreadsheet className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Approved Entries" value={approvedCount} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Pending Review" value={pendingCount} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Cumulative Hours" value={`${totalHours} hrs`} icon={<Clock className="w-5 h-5 text-purple-500" />} />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">Logged Timesheet Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Hours</th>
                  <th className="py-3 px-4 text-left">Description</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Reviewed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {timesheets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No timesheets logged yet
                    </td>
                  </tr>
                ) : (
                  timesheets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {t.hours} hrs
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-sm truncate" title={t.description}>
                        {t.description || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            t.status === "approved"
                              ? "default"
                              : t.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize text-xs"
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {t.reviewedAt ? new Date(t.reviewedAt).toLocaleDateString() : "Pending"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Log Timesheet */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Daily Timesheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                <label className="text-xs font-semibold">Hours Worked</label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Task Description</label>
              <Input
                placeholder="What did you work on today?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.date || !form.hours || createMutation.isPending}
            >
              Submit Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
