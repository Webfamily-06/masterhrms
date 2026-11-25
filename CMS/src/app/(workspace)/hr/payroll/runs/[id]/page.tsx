"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

export default function HrPayrollRunDetailPage() {
  const params = useParams();
  const runId = String(params?.id || "");
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [adminOverride, setAdminOverride] = useState(false);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["hr-payroll-run-detail", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const res = await api.get(`/api/v1/hr/payroll/runs/${runId}`);
      return res?.data ?? res;
    },
  });

  const { data: checklist, refetch: refetchChecklist } = useQuery<any>({
    queryKey: ["hr-payroll-run-checklist", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const res = await api.get(`/api/v1/hr/payroll/runs/${runId}/checklist`);
      return res?.data ?? res;
    },
  });

  const syncAgentMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/hr/payroll/runs/${runId}/sync-agent`, {}),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Pre-Payroll Sync Agent completed");
      refetchChecklist();
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-run-detail", runId] });
    },
    onError: (err: any) => toast.error(err?.message || "Sync Agent failed"),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/hr/payroll/runs/${runId}/generate-payslips`, {}),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Payslips generated successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-run-detail", runId] });
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-run-checklist", runId] });
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-payslips"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to generate payslips"),
  });

  if (isLoading) {
    return (
      <div className="w-full px-4 py-16 text-center text-muted-foreground">
        <i className="ph ph-spinner-gap animate-spin text-2xl mr-2 align-middle" />
        Loading payroll run details...
      </div>
    );
  }

  const run = data?.run;
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  if (!run) {
    return (
      <div className="w-full px-4 py-16 text-center space-y-3">
        <p className="text-muted-foreground">Payroll run not found.</p>
        <Link href="/hr/payroll/runs">
          <Button variant="outline">Back to Payroll Runs</Button>
        </Link>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{run.title}</h1>
          <p className="text-sm text-muted-foreground">
            Payroll entries, earnings, and deductions for this run.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await api.download(
                  `/api/v1/hr/payroll/runs/${runId}/export/master-excel`,
                  `Master_Payroll_${run.periodYear}_${String(run.periodMonth).padStart(2, "0")}.xlsx`
                );
                toast.success("Master Payroll Excel downloaded");
              } catch (err: any) {
                toast.error(err?.message || "Failed to export Master Excel");
              }
            }}
            className="h-9 gap-1.5"
          >
            <i className="ph ph-file-xls text-base text-emerald-600" />
            <span>Master Excel</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={syncAgentMutation.isPending}
            onClick={() => syncAgentMutation.mutate()}
            className="h-9 gap-1.5"
          >
            <i className={`ph ph-robot text-base text-emerald-600 ${syncAgentMutation.isPending ? "animate-spin" : ""}`} />
            <span>{syncAgentMutation.isPending ? "Syncing..." : "Run Sync Agent"}</span>
          </Button>
          <Button
            size="sm"
            disabled={
              generateMutation.isPending ||
              (checklist && !checklist.canRun && !adminOverride)
            }
            onClick={() => generateMutation.mutate()}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <i className="ph ph-download-simple text-base" />
            <span>{generateMutation.isPending ? "Generating..." : "Generate Payslips"}</span>
          </Button>
          <Link href="/hr/payroll/runs">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <i className="ph ph-arrow-left text-base" />
              <span>Back</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Total Employees</div>
            <div className="text-2xl font-bold text-foreground mt-1">{run.employeeCount}</div>
            <div className="text-xs text-muted-foreground mt-1">In this run</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
            <i className="ph ph-users text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">Gross Pay</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 truncate">
              {formatINR(run.grossPay)}
            </div>
            <div className="text-xs text-emerald-600 mt-1">Before deductions</div>
          </div>
          <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <i className="ph ph-trend-up text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">Total Deductions</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 truncate">
              {formatINR(run.totalDeductions)}
            </div>
            <div className="text-xs text-rose-600 mt-1">Withheld amount</div>
          </div>
          <div className="h-11 w-11 shrink-0 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center">
            <i className="ph ph-trend-down text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">Net Pay</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 truncate">
              {formatINR(run.netPay)}
            </div>
            <div className="text-xs text-primary mt-1">Take-home amount</div>
          </div>
          <div className="h-11 w-11 shrink-0 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
            <i className="ph ph-currency-inr text-xl" />
          </div>
        </div>
      </div>

      {/* Pay Period Info Bar */}
      <div className="rounded-xl border border-border/80 border-l-4 border-l-emerald-600 bg-card px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="ph ph-calendar-blank text-sm" />
            <strong className="text-foreground">Pay Period:</strong> {run.payPeriodStart} →{" "}
            {run.payPeriodEnd}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="ph ph-clock text-sm" />
            <strong className="text-foreground">Pay Date:</strong> {run.payDate}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
            {run.frequency}
          </span>
        </div>

        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border bg-emerald-500/10 text-emerald-700 border-emerald-500/20 capitalize">
          {run.displayStatus}
        </span>
      </div>

      {/* Pre-Payroll Readiness Checklist & Sync Agent Card */}
      {checklist && (
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
                <i className="ph ph-robot text-xl" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Pre-Payroll Readiness Checklist &amp; Sync Agent
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {checklist.readyCount} of {checklist.totalCount} checks ready
                  {checklist.lastSyncedAt
                    ? ` • Last synced ${new Date(checklist.lastSyncedAt).toLocaleString("en-IN")}`
                    : " • Click Run Sync Agent to reconcile attendance, LOP & claims before generating payslips"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!checklist.canRun && (
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none px-2.5 py-1.5 rounded-lg border border-border/80 bg-muted/30">
                  <input
                    type="checkbox"
                    checked={adminOverride}
                    onChange={(e) => setAdminOverride(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  <span>Admin Override</span>
                </label>
              )}
              <Button
                size="sm"
                onClick={() => syncAgentMutation.mutate()}
                disabled={syncAgentMutation.isPending}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                <i className="ph ph-arrows-clockwise text-sm" />
                <span>{syncAgentMutation.isPending ? "Syncing..." : "Sync All Data"}</span>
              </Button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(checklist.checks || []).map((chk: any) => {
              const tone =
                chk.status === "passed"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : chk.status === "warning"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-rose-500/30 bg-rose-500/5";
              const iconCls =
                chk.status === "passed"
                  ? "ph-check-circle text-emerald-600"
                  : chk.status === "warning"
                  ? "ph-warning-circle text-amber-600"
                  : "ph-x-circle text-rose-600";

              return (
                <div key={chk.id} className={`rounded-xl border p-3.5 space-y-2 ${tone}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <i className={`ph ${iconCls} text-lg shrink-0`} />
                      <span className="text-xs font-bold text-foreground truncate">
                        {chk.title}
                      </span>
                    </div>
                    <Link
                      href={chk.fixUrl}
                      className="text-[11px] font-medium text-primary hover:underline shrink-0"
                    >
                      {chk.fixLabel}
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {chk.description}
                  </p>
                  {Array.isArray(chk.affectedItems) && chk.affectedItems.length > 0 && (
                    <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50 truncate">
                      Affected: {chk.affectedItems.join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payroll Calculation Reference */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <i className="ph ph-calculator text-emerald-600 text-base" />
          <span>Payroll Calculation Reference</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <div className="text-xs font-semibold text-foreground">Gross Pay</div>
            <div className="text-xs text-muted-foreground mt-1">
              Total Earnings − LOP Deduction − Unpaid Leave + Overtime
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <div className="text-xs font-semibold text-foreground">Net Pay</div>
            <div className="text-xs text-muted-foreground mt-1">
              Gross Pay − Total Component Deductions
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <div className="text-xs font-semibold text-foreground">LOP Deduction</div>
            <div className="text-xs text-muted-foreground mt-1">
              (Basic Salary ÷ Working Days) × LOP Days
            </div>
          </div>
        </div>
      </div>

      {/* Employee Payroll Entries Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/70">
          <h2 className="text-base font-bold text-foreground">Employee Payroll Entries</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {entries.length} employee{entries.length === 1 ? "" : "s"} in this payroll run
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3 text-center">Working Days</th>
                <th className="py-3 px-3 text-center">Present</th>
                <th className="py-3 px-3 text-center">LOP</th>
                <th className="py-3 px-3 text-right">Gross Pay</th>
                <th className="py-3 px-3 text-right">Deductions</th>
                <th className="py-3 px-3 text-right">Net Pay</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No entries generated yet. Click &quot;Generate Payslips&quot; above to calculate
                    payroll for all active employees.
                  </td>
                </tr>
              ) : (
                entries.map((entry: any) => {
                  const isExpanded = Boolean(expandedIds[entry.id]);
                  const emp = entry.employee;
                  const empName = emp
                    ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
                    : "Employee";
                  const initials = emp
                    ? `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase()
                    : "E";

                  return (
                    <Fragment key={entry.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-semibold overflow-hidden">
                              {emp?.avatarUrl ? (
                                <img
                                  src={emp.avatarUrl}
                                  alt={empName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate">
                                {empName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Basic: {formatINR(entry.basicSalary)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-medium text-foreground">
                          {entry.workingDays}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-emerald-600">
                          {Number(entry.presentDays).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-rose-600">
                          {Number(entry.lopDays).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                          {formatINR(entry.grossPay)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-rose-600 whitespace-nowrap">
                          {formatINR(entry.deductions)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-primary whitespace-nowrap">
                          {formatINR(entry.netPay)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpand(entry.id)}
                            className="h-8 text-xs gap-1"
                          >
                            <i
                              className={`ph ${
                                isExpanded ? "ph-caret-up" : "ph-caret-down"
                              } text-xs`}
                            />
                            <span>{isExpanded ? "Less" : "Details"}</span>
                          </Button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={8} className="p-4 space-y-4">
                            {/* Earnings & Deductions Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-border/80 border-l-4 border-l-emerald-600 bg-card p-4 space-y-2 text-xs">
                                <div className="font-bold text-emerald-700 text-sm mb-2">
                                  Earnings
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Basic Salary</span>
                                  <span className="font-semibold text-foreground">
                                    {formatINR(entry.basicSalary)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Component Earnings</span>
                                  <span className="font-semibold text-primary">
                                    {formatINR(entry.componentEarnings)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Overtime</span>
                                  <span className="font-semibold text-emerald-600">
                                    {formatINR(entry.otAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-border/70 font-bold text-sm">
                                  <span>Gross Pay</span>
                                  <span className="text-emerald-600">
                                    {formatINR(entry.grossPay)}
                                  </span>
                                </div>
                              </div>

                              <div className="rounded-xl border border-border/80 border-l-4 border-l-rose-600 bg-card p-4 space-y-2 text-xs">
                                <div className="font-bold text-rose-700 text-sm mb-2">
                                  Deductions
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    LOP Deduction ({Number(entry.lopDays).toFixed(2)} days)
                                  </span>
                                  <span className="font-semibold text-rose-600">
                                    {formatINR(entry.lopDeduction)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Component Deductions
                                  </span>
                                  <span className="font-semibold text-rose-600">
                                    {formatINR(entry.componentDeductions)}
                                  </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-border/70 font-bold text-sm">
                                  <span>Net Pay</span>
                                  <span className="text-rose-600">
                                    {formatINR(entry.netPay)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Attendance Summary */}
                            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                              <div className="text-xs font-semibold text-muted-foreground">
                                Attendance Summary
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
                                <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                                  <div className="text-[11px] text-muted-foreground">
                                    Working Days
                                  </div>
                                  <div className="text-sm font-bold text-foreground mt-0.5">
                                    {entry.workingDays}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                  <div className="text-[11px] text-emerald-700">Present Days</div>
                                  <div className="text-sm font-bold text-emerald-700 mt-0.5">
                                    {Number(entry.presentDays).toFixed(2)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5">
                                  <div className="text-[11px] text-rose-700">LOP Days</div>
                                  <div className="text-sm font-bold text-rose-700 mt-0.5">
                                    {Number(entry.lopDays).toFixed(2)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                                  <div className="text-[11px] text-amber-700">Unpaid Leave</div>
                                  <div className="text-sm font-bold text-amber-700 mt-0.5">
                                    {Number(entry.unpaidLeave).toFixed(2)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-2.5">
                                  <div className="text-[11px] text-sky-700">OT Hours</div>
                                  <div className="text-sm font-bold text-sky-700 mt-0.5">
                                    {Number(entry.otHours).toFixed(2)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-2.5">
                                  <div className="text-[11px] text-sky-700">OT Amount</div>
                                  <div className="text-sm font-bold text-sky-700 mt-0.5">
                                    {formatINR(entry.otAmount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
