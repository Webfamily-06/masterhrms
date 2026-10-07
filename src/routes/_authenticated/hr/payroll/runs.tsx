import { createFileRoute } from "@tanstack/react-router";
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
  Play,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/payroll/runs")({
  component: HrPayrollRunsPage,
});

export default function HrPayrollRunsPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [varianceModalOpen, setVarianceModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [newRunMonth, setNewRunMonth] = useState(String(currentMonth));
  const [newRunYear, setNewRunYear] = useState(String(currentYear));

  // 1. Fetch Runs
  const { data: runsData, isLoading, refetch } = useQuery({
    queryKey: ["hr-payroll-runs"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/runs");
      return res.data;
    },
  });

  const runs = runsData?.runs || [];

  // 2. Fetch Selected Run Variance
  const { data: varianceData } = useQuery({
    queryKey: ["hr-payroll-variance", selectedRunId],
    queryFn: async () => {
      if (!selectedRunId) return null;
      const res = await api.get(`/api/v1/hr/payroll/runs/${selectedRunId}/variance`);
      return res.data;
    },
    enabled: !!selectedRunId,
  });

  // Mutations
  const createRunMutation = useMutation({
    mutationFn: async (payload: { periodMonth: number; periodYear: number }) => {
      return api.post("/api/v1/hr/payroll/runs", payload);
    },
    onSuccess: () => {
      toast.success("Payroll run initialized");
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to initialize run");
    },
  });

  const calculateRunMutation = useMutation({
    mutationFn: async (runId: string) => {
      return api.post(`/api/v1/hr/payroll/runs/${runId}/calculate`, {});
    },
    onSuccess: (res) => {
      toast.success(`Calculated payroll for ${res.data.employeeCount} employees`);
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Calculation failed");
    },
  });

  const approveRunMutation = useMutation({
    mutationFn: async (runId: string) => {
      return api.post(`/api/v1/hr/payroll/runs/${runId}/approve`, {});
    },
    onSuccess: () => {
      toast.success("Payroll run approved");
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Approval failed");
    },
  });

  const publishRunMutation = useMutation({
    mutationFn: async (runId: string) => {
      return api.post(`/api/v1/hr/payroll/runs/${runId}/publish`, {});
    },
    onSuccess: () => {
      toast.success("Payroll published and payslips released to employees");
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Publish failed");
    },
  });

  const totalDisbursed = runs.reduce((acc: number, r: any) => acc + Number(r.totalNet || 0), 0);
  const totalEmployees = runs[0]?.employeeCount || 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Monthly Payroll Runs"
        description="Authoritative payroll batches, batch calculations, variance audits, and maker-checker approvals."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Initialize Run
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Runs"
          value={runs.length}
          description="Total payroll periods managed"
          icon={Play}
        />
        <StatCard
          title="Recent Headcount"
          value={totalEmployees}
          description="Processed in latest run"
          icon={Users}
        />
        <StatCard
          title="Total Net Pay"
          value={`₹${totalDisbursed.toLocaleString("en-IN")}`}
          description="Aggregate net disbursement"
          icon={DollarSign}
        />
        <StatCard
          title="Audit Compliance"
          value="100%"
          description="Maker-checker protected"
          icon={Lock}
        />
      </div>

      {/* Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll History & Execution</CardTitle>
          <CardDescription>
            Deterministic batch calculation consuming P3 attendance, leave LOP, approved loans, and expense claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 text-left font-medium">Period</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Employees</th>
                  <th className="p-3 text-right font-medium">Gross Amount</th>
                  <th className="p-3 text-right font-medium">Deductions</th>
                  <th className="p-3 text-right font-medium">Net Disbursed</th>
                  <th className="p-3 text-center font-medium">Published</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading payroll runs...
                    </td>
                  </tr>
                ) : runs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No payroll runs created yet. Click "Initialize Run" to begin.
                    </td>
                  </tr>
                ) : (
                  runs.map((run: any) => (
                    <tr key={run.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold">
                        {new Date(run.periodYear, run.periodMonth - 1).toLocaleString("default", {
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            run.approvalStatus === "approved" || run.approvalStatus === "finalized"
                              ? "default"
                              : run.approvalStatus === "calculated"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {run.approvalStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-medium">{run.employeeCount}</td>
                      <td className="p-3 text-right font-medium">
                        ₹{Number(run.totalAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-medium text-destructive">
                        -₹{Number(run.totalDeductions || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        ₹{Number(run.totalNet || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-center">
                        {run.isPublished ? (
                          <Badge variant="default" className="bg-emerald-600 text-white">
                            Released
                          </Badge>
                        ) : (
                          <Badge variant="outline">Draft</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {/* Calculate button */}
                        {run.approvalStatus !== "approved" && run.approvalStatus !== "finalized" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => calculateRunMutation.mutate(run.id)}
                            disabled={calculateRunMutation.isPending}
                            className="gap-1"
                          >
                            <Play className="h-3.5 w-3.5 text-blue-600" />
                            {run.approvalStatus === "calculated" ? "Recalculate" : "Calculate"}
                          </Button>
                        )}

                        {/* Variance button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRunId(run.id);
                            setVarianceModalOpen(true);
                          }}
                          className="gap-1"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Variance
                        </Button>

                        {/* Approve button */}
                        {run.approvalStatus === "calculated" && (
                          <Button
                            size="sm"
                            onClick={() => approveRunMutation.mutate(run.id)}
                            disabled={approveRunMutation.isPending}
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}

                        {/* Publish button */}
                        {run.approvalStatus === "approved" && !run.isPublished && (
                          <Button
                            size="sm"
                            onClick={() => publishRunMutation.mutate(run.id)}
                            disabled={publishRunMutation.isPending}
                            className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Send className="h-3.5 w-3.5" /> Publish
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

      {/* Initialize Run Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initialize Payroll Period</DialogTitle>
            <DialogDescription>
              Create a new period batch to process attendance, statutory contributions, and payroll calculations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <select
                  value={newRunMonth}
                  onChange={(e) => setNewRunMonth(e.target.value)}
                  className="w-full border rounded-md p-2 bg-background text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Input
                  type="number"
                  value={newRunYear}
                  onChange={(e) => setNewRunYear(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createRunMutation.mutate({
                  periodMonth: Number(newRunMonth),
                  periodYear: Number(newRunYear),
                })
              }
              disabled={createRunMutation.isPending}
            >
              Initialize Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variance Audit Dialog */}
      <Dialog open={varianceModalOpen} onOpenChange={setVarianceModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Previous Period Variance Analysis</DialogTitle>
            <DialogDescription>
              Comparative audit between current payroll batch and previous comparable period.
            </DialogDescription>
          </DialogHeader>
          {varianceData?.varianceSummary ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 border rounded-lg bg-muted/20">
                  <span className="text-xs text-muted-foreground">Gross Variance</span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-lg">
                    {varianceData.varianceSummary.grossDelta >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    ₹{Math.abs(varianceData.varianceSummary.grossDelta).toLocaleString("en-IN")}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({varianceData.varianceSummary.grossDeltaPct}%)
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-muted/20">
                  <span className="text-xs text-muted-foreground">Net Variance</span>
                  <div className="text-lg font-bold mt-1">
                    ₹{varianceData.varianceSummary.netDelta.toLocaleString("en-IN")}
                  </div>
                  <span className="text-xs text-muted-foreground">Disbursement delta</span>
                </div>
                <div className="p-3 border rounded-lg bg-muted/20">
                  <span className="text-xs text-muted-foreground">Headcount Delta</span>
                  <div className="text-lg font-bold mt-1">
                    {varianceData.varianceSummary.headcountDelta >= 0 ? "+" : ""}
                    {varianceData.varianceSummary.headcountDelta}
                  </div>
                  <span className="text-xs text-muted-foreground">Employees processed</span>
                </div>
              </div>
              <div className="p-4 border rounded-md bg-muted/10 text-xs space-y-1">
                <p><strong>Baseline Period:</strong> {varianceData.varianceSummary.previousPeriod}</p>
                <p><strong>Previous Gross:</strong> ₹{Number(varianceData.varianceSummary.previousGross).toLocaleString("en-IN")}</p>
                <p><strong>Current Gross:</strong> ₹{Number(varianceData.varianceSummary.currentGross).toLocaleString("en-IN")}</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No prior comparable month found to evaluate variance.
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVarianceModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
