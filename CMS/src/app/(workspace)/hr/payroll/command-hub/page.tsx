'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Calendar,
  Lock,
  ArrowRight,
  Send,
  XCircle,
  Hash,
  ExternalLink,
  ChevronRight,
  CreditCard,
  Receipt,
  FileCheck,
} from "lucide-react";

interface LifecycleStage {
  stage: number;
  name: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "APPROVED" | "UNDER_REVIEW" | "PASSED";
}

interface PayrollCycleData {
  id: string;
  periodMonth: number;
  periodYear: number;
  periodDisplay: string;
  state: string;
  status: string;
  headcount: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  approvedBy?: string | null;
  approvedAt?: string | null;
  processedAt?: string | null;
  isPublished?: boolean;
  publishedAt?: string | null;
  varianceSummary?: any;
  statutoryManifest?: any;
  stages: LifecycleStage[];
}

export default function PayrollCommandHubPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch all available cycles for tenant
  const { data: cyclesData, isLoading: isLoadingList, refetch: refetchCycles } = useQuery({
    queryKey: ["payroll-cycles-list"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; cycles: any[] }>("/api/payroll/cycles");
      return res.cycles || [];
    },
  });

  // Selected cycle query
  const activeCycle = cyclesData?.find(
    (c: any) => c.periodMonth === selectedMonth && c.periodYear === selectedYear
  );

  const { data: cycleDetail, isLoading: isLoadingDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["payroll-cycle-detail", activeCycle?.id],
    queryFn: async () => {
      if (!activeCycle?.id) return null;
      const res = await api.get<{ success: boolean; cycle: PayrollCycleData }>(
        `/api/payroll/cycles/${activeCycle.id}`
      );
      return res.cycle || null;
    },
    enabled: !!activeCycle?.id,
  });

  // Fetch Stage 11 Pre-Run Variance Report
  const { data: varianceReport, refetch: refetchVariance } = useQuery({
    queryKey: ["payroll-cycle-variance", activeCycle?.id],
    queryFn: async () => {
      if (!activeCycle?.id) return null;
      const res = await api.get<{ success: boolean; report: any }>(
        `/api/payroll/cycles/${activeCycle.id}/variance`
      );
      return res.report || null;
    },
    enabled: !!activeCycle?.id && ["CALCULATED", "PREVIEW_READY", "UNDER_REVIEW", "APPROVED", "OUTPUTS_GENERATED", "CLOSED"].includes(activeCycle?.state),
  });

  const clearAlerts = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  // Stage 1: Initialize Period
  const initMutation = useMutation({
    mutationFn: async () => {
      clearAlerts();
      return await api.post("/api/payroll/cycles", {
        periodMonth: selectedMonth,
        periodYear: selectedYear,
      });
    },
    onSuccess: (res: any) => {
      setActionSuccess(res?.message || "Cycle initialized.");
      queryClient.invalidateQueries({ queryKey: ["payroll-cycles-list"] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || err.message);
    },
  });

  // Stages 3 & 4: Lock Attendance
  const lockAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle?.id) return;
      clearAlerts();
      return await api.post(`/api/payroll/cycles/${activeCycle.id}/lock-attendance`, {
        notes: "Authorized attendance and LOP reconciliation lock.",
      });
    },
    onSuccess: () => {
      setActionSuccess("Attendance & LOP locked successfully. Ready for batch calculation.");
      queryClient.invalidateQueries({ queryKey: ["payroll-cycles-list"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-cycle-detail"] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || err.message);
    },
  });

  // Stages 5-10: Batch Calculation & Variance Gate
  const calculateMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle?.id) return;
      clearAlerts();
      return await api.post(`/api/payroll/cycles/${activeCycle.id}/calculate`, {});
    },
    onSuccess: (res: any) => {
      setActionSuccess(res?.message || "Batch payroll calculation executed.");
      queryClient.invalidateQueries({ queryKey: ["payroll-cycles-list"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-cycle-detail"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-cycle-variance"] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || err.message);
    },
  });

  // Stage 12a: HR Submit for Finance Review
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle?.id) return;
      clearAlerts();
      return await api.patch(`/api/payroll/cycles/${activeCycle.id}/submit-review`, {
        comments: "HR Manager sign-off: Attendance, structures, and variance gate reconciled.",
      });
    },
    onSuccess: () => {
      setActionSuccess("Payroll submitted for Finance Director authorization.");
      queryClient.invalidateQueries({ queryKey: ["payroll-cycles-list"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-cycle-detail"] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || err.message);
    },
  });

  // Stage 12b: Finance Director Authorization
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle?.id) return;
      clearAlerts();
      return await api.patch(`/api/payroll/cycles/${activeCycle.id}/approve`, {
        notes: "Finance Director sign-off: Statutory and net cash disbursements authorized.",
      });
    },
    onSuccess: () => {
      setActionSuccess("Payroll approved. Authorized for ledger posting & finalization.");
      queryClient.invalidateQueries({ queryKey: ["payroll-cycles-list"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-cycle-detail"] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || err.message);
    },
  });

  // Stage 12 Rejection
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle?.id || !rejectReason.trim()) return;
      clearAlerts();
      return await api.patch(`/api/payroll/cycles/${activeCycle.id}/reject`, {
        reason: rejectReason.trim(),
      });
    },
    onSuccess: () => {
      setActionSuccess("Payroll rejected and returned to DRAFT state for remediation.");
      setShowRejectModal(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["payroll-cycles-list"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-cycle-detail"] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || err.message);
    },
  });

  // Stage 13: Finalization & Output Generation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle?.id) return;
      clearAlerts();
      return await api.post(`/api/payroll/cycles/${activeCycle.id}/finalize`, {});
    },
    onSuccess: () => {
      setActionSuccess("Payroll finalized, posted to General Ledger, and statutory outputs compiled!");
      queryClient.invalidateQueries({ queryKey: ["payroll-cycles-list"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-cycle-detail"] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || err.message);
    },
  });

  const cycleState = cycleDetail?.state || activeCycle?.state || "NOT_INITIALIZED";

  const getStatusBadgeVariant = (state: string) => {
    switch (state) {
      case "DRAFT":
        return "secondary";
      case "ATTENDANCE_LOCKED":
        return "outline";
      case "CALCULATED":
        return "warning";
      case "PREVIEW_READY":
        return "default";
      case "UNDER_REVIEW":
        return "secondary";
      case "APPROVED":
        return "default";
      case "FINALIZING":
        return "secondary";
      case "OUTPUTS_GENERATED":
      case "CLOSED":
        return "success";
      default:
        return "outline";
    }
  };

  const cryptographicHash =
    cycleDetail?.statutoryManifest?.cryptographicHash ||
    activeCycle?.statutoryManifest?.cryptographicHash ||
    null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Monthly Payroll Command Hub"
        description="End-to-end 16-stage automated lifecycle, dual approval gates, and failure-resilient orchestration"
      >
        <div className="flex items-center gap-3">
          <Badge variant={getStatusBadgeVariant(cycleState) as any} className="px-3 py-1 text-sm font-semibold uppercase">
            {cycleState.replace(/_/g, " ")}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchCycles();
              refetchDetail();
              refetchVariance();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-green-600 font-bold">×</button>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-600 font-bold">×</button>
        </div>
      )}

      {/* Period Selector Controls */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Payroll Period:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
            >
              {[
                { m: 1, name: "January" },
                { m: 2, name: "February" },
                { m: 3, name: "March" },
                { m: 4, name: "April" },
                { m: 5, name: "May" },
                { m: 6, name: "June" },
                { m: 7, name: "July" },
                { m: 8, name: "August" },
                { m: 9, name: "September" },
                { m: 10, name: "October" },
                { m: 11, name: "November" },
                { m: 12, name: "December" },
              ].map((item) => (
                <option key={item.m} value={item.m}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {!activeCycle ? (
              <Button
                onClick={() => initMutation.mutate()}
                disabled={initMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <Building2 className="w-4 h-4 mr-2" />
                {initMutation.isPending ? "Initializing..." : "Initialize Period (Stage 1)"}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Cycle ID: <code className="bg-muted px-2 py-0.5 rounded">{activeCycle.id.slice(0, 8)}...</code>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Financial Overview */}
      {activeCycle && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Gross Earnings</CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                ₹{(cycleDetail?.totalGross ?? activeCycle.totalGross).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Stages 6–7 Earned Allowances</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Statutory & Loans</CardDescription>
              <CardTitle className="text-2xl font-bold text-red-600">
                ₹{(cycleDetail?.totalDeductions ?? activeCycle.totalDeductions).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">EPF, ESI, PT, TDS & Loan EMI</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Net Disbursement</CardDescription>
              <CardTitle className="text-2xl font-bold text-green-600">
                ₹{(cycleDetail?.totalNet ?? activeCycle.totalNet).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Bank payment advice basis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Eligible Headcount</CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {cycleDetail?.headcount ?? activeCycle.headcount} Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Stage 2 Eligibility Verified</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 16-Stage Interactive Stepper */}
      {cycleDetail && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              16-Stage Monthly Payroll Lifecycle Stepper
            </CardTitle>
            <CardDescription>
              Automated sequencing from period initialization to ESS payslip publishing and statutory archiving
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {cycleDetail.stages.map((stg: LifecycleStage) => {
                const isPassed = ["COMPLETED", "APPROVED", "PASSED"].includes(stg.status);
                const isCurrent = ["UNDER_REVIEW", "IN_PROGRESS"].includes(stg.status);
                const isBlocked = stg.status === "BLOCKED";

                return (
                  <div
                    key={stg.stage}
                    className={`p-3 rounded-lg border text-center flex flex-col justify-between ${
                      isPassed
                        ? "bg-green-50 border-green-200 text-green-900"
                        : isBlocked
                        ? "bg-red-50 border-red-200 text-red-900"
                        : isCurrent
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : "bg-muted/40 border-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/80">
                        #{stg.stage}
                      </span>
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : isBlocked ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>
                    <p className="text-xs font-semibold leading-tight line-clamp-2 my-1">{stg.name}</p>
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">
                      {stg.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Action Controls */}
      {activeCycle && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Lifecycle Action Gates</CardTitle>
            <CardDescription>
              Execute permitted state machine transitions according to governance rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Stage 3-4 */}
              {cycleState === "DRAFT" && (
                <Button
                  onClick={() => lockAttendanceMutation.mutate()}
                  disabled={lockAttendanceMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {lockAttendanceMutation.isPending ? "Locking..." : "Lock Attendance & Leave (Stages 3–4)"}
                </Button>
              )}

              {/* Stages 5-10 */}
              {["DRAFT", "ATTENDANCE_LOCKED"].includes(cycleState) && (
                <Button
                  onClick={() => calculateMutation.mutate()}
                  disabled={calculateMutation.isPending}
                  variant={cycleState === "ATTENDANCE_LOCKED" ? "default" : "secondary"}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${calculateMutation.isPending ? "animate-spin" : ""}`} />
                  {calculateMutation.isPending ? "Calculating..." : "Execute Batch Calculation (Stages 5–10)"}
                </Button>
              )}

              {/* Stage 12a: HR Submit */}
              {["PREVIEW_READY", "CALCULATED"].includes(cycleState) && (
                <Button
                  onClick={() => submitReviewMutation.mutate()}
                  disabled={submitReviewMutation.isPending || (varianceReport && varianceReport.blockerCount > 0)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitReviewMutation.isPending ? "Submitting..." : "Submit for Finance Authorization (Stage 12a)"}
                </Button>
              )}

              {/* Stage 12b: Finance Approval */}
              {cycleState === "UNDER_REVIEW" && (
                <>
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {approveMutation.isPending ? "Authorizing..." : "Approve Payroll (Finance Director Sign-off)"}
                  </Button>
                  <Button
                    onClick={() => setShowRejectModal(true)}
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject & Return to Draft
                  </Button>
                </>
              )}

              {/* Stage 13: Finalize */}
              {cycleState === "APPROVED" && (
                <Button
                  onClick={() => finalizeMutation.mutate()}
                  disabled={finalizeMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {finalizeMutation.isPending
                    ? "Posting to Ledger..."
                    : "Execute Finalization & Ledger Commit (Stage 13)"}
                </Button>
              )}
            </div>

            {/* Cryptographic Seal Notice */}
            {cryptographicHash && (
              <div className="p-3 bg-background border rounded-md flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-green-600" />
                  <span className="text-muted-foreground">SHA-256 Cryptographic Seal:</span>
                  <span className="text-foreground font-bold">{cryptographicHash}</span>
                </div>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Immutability Locked
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pre-Run Variance & Anomaly Audit Findings (Stage 11 Gate) */}
      {varianceReport && (
        <Card className={varianceReport.blockerCount > 0 ? "border-red-300" : "border-green-300"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-primary" />
                  Stage 11: Pre-Run Variance & Anomaly Gate
                </CardTitle>
                <CardDescription>
                  16 automated checks covering net pay swings, negative pay, missing bank details, and statutory caps
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={varianceReport.blockerCount > 0 ? "destructive" : "default"}>
                  {varianceReport.blockerCount} Blockers
                </Badge>
                <Badge variant="outline">{varianceReport.warningCount} Warnings</Badge>
                <Badge variant="secondary">{varianceReport.infoCount} Info</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {varianceReport.findings.length === 0 ? (
              <div className="p-4 bg-green-50 text-green-800 rounded-md flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>All 16 variance and anomaly checks passed with zero discrepancies.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {varianceReport.findings.map((f: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-md border text-sm flex items-start justify-between ${
                      f.severity === "BLOCKER"
                        ? "bg-red-50/60 border-red-200"
                        : f.severity === "WARNING"
                        ? "bg-amber-50/60 border-amber-200"
                        : "bg-muted/40 border-muted"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            f.severity === "BLOCKER"
                              ? "destructive"
                              : f.severity === "WARNING"
                              ? "outline"
                              : "secondary"
                          }
                          className="text-[10px] font-bold"
                        >
                          {f.severity}
                        </Badge>
                        <code className="text-xs font-mono font-semibold">{f.code}</code>
                        {f.employeeName && (
                          <span className="text-xs text-muted-foreground">
                            • {f.employeeName} ({f.employeeCode})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground">{f.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <strong>Remediation:</strong> {f.actionableRemediation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post-Finalization Output Bundle Cards (Stages 14–16) */}
      {activeCycle && ["OUTPUTS_GENERATED", "CLOSED"].includes(cycleState) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Statutory Forms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Statutory Registers (Forms U–S)
              </CardTitle>
              <CardDescription>5 dedicated statutory registers generated via Workstream C</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href={`${API_BASE}/api/payroll/statutory-registers/bundle?month=${selectedMonth}&year=${selectedYear}&format=xlsx`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <Download className="w-4 h-4 mr-2" />
                Download 5-Register XLSX
              </a>
              <a
                href={`/hr/payroll/statutory-registers?month=${selectedMonth}&year=${selectedYear}`}
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium text-primary hover:underline"
              >
                View Registers Hub <ChevronRight className="w-4 h-4 ml-1" />
              </a>
            </CardContent>
          </Card>

          {/* Client Staffing Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                Contract Client Invoicing
              </CardTitle>
              <CardDescription>Draft invoices with MMU & GST compiled via Workstream B</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href={`/hr/payroll/billing?runId=${activeCycle.id}`}
                className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Review Staffing Invoices
              </a>
              <p className="text-xs text-muted-foreground text-center">
                Draft invoices require Finance sign-off prior to dispatch
              </p>
            </CardContent>
          </Card>

          {/* Bank Payment Advice */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Bank Payment Advice
              </CardTitle>
              <CardDescription>Disbursement file matching net pay to 0.00 rupee variance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href={`${API_BASE}/api/payroll/cycles/${activeCycle.id}/bank-export`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Bank Advice (CSV)
              </a>
              <a
                href={`${API_BASE}/api/payroll/cycles/${activeCycle.id}/bank-export?masked=true`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center text-xs text-muted-foreground hover:underline"
              >
                Download Masked Preview
              </a>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg border max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Reject Payroll Cycle</h3>
            <p className="text-sm text-muted-foreground">
              Returning this cycle to DRAFT will require the HR Manager to address anomalies and re-run batch calculations.
            </p>
            <div>
              <label className="text-xs font-semibold text-foreground">Mandatory Rejection Reason:</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify required corrections (e.g. Overtime disparity in Lead Engineer cohort)..."
                className="w-full mt-1.5 p-2 text-sm border rounded-md bg-background"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
