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
  FileSpreadsheet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/attendance/timesheets")({
  component: HrAttendanceTimesheetsPage,
});

export default function HrAttendanceTimesheetsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: timesheets = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-timesheets"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/timesheets");
      return res.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const res = await api.post(`/api/v1/hr/attendance/timesheets/${id}/action`, { action });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(`Timesheet ${vars.action === "approve" ? "approved" : "rejected"}`);
      queryClient.invalidateQueries({ queryKey: ["hr-timesheets"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update timesheet"),
  });

  const pendingCount = timesheets.filter((t: any) => t.status === "pending").length;
  const approvedCount = timesheets.filter((t: any) => t.status === "approved").length;
  const totalHours = timesheets.reduce((acc: number, t: any) => acc + Number(t.hours || 0), 0);

  const filtered = timesheets.filter((t: any) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (searchTerm) {
      const name = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
      const code = (t.employee?.employeeCode || "").toLowerCase();
      const proj = (t.project?.name || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!name.includes(s) && !code.includes(s) && !proj.includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheet Approvals"
        description="Verify employee project task hours and cross-reference with logged attendance."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Timesheets" value={timesheets.length} icon={<FileSpreadsheet className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Pending Review" value={pendingCount} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Approved" value={approvedCount} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Logged Hours" value={`${totalHours} hrs`} icon={<Clock className="w-5 h-5 text-purple-500" />} />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-semibold">Timesheet Submissions</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-52 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
                {["all", "pending", "approved", "rejected"].map((st) => (
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
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Project</th>
                  <th className="py-3 px-4 text-left">Hours</th>
                  <th className="py-3 px-4 text-left">Description</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No timesheets found
                    </td>
                  </tr>
                ) : (
                  filtered.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-medium">{t.employee?.firstName} {t.employee?.lastName}</div>
                        <div className="text-xs text-muted-foreground">{t.employee?.employeeCode} • {t.employee?.department?.name || "General"}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{t.project?.name || "Internal HRMS"}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {t.hours} hrs
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate" title={t.description}>
                        {t.description || "—"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
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
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {t.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => actionMutation.mutate({ id: t.id, action: "approve" })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-rose-600 border-rose-200"
                              onClick={() => actionMutation.mutate({ id: t.id, action: "reject" })}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t.reviewedAt ? new Date(t.reviewedAt).toLocaleDateString() : "Reviewed"}
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
    </div>
  );
}
