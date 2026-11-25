"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const todayISO = () => new Date().toISOString().slice(0, 10);
const currentYM = () => new Date().toISOString().slice(0, 7);

export default function HrReimbursementsLoansPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"loans" | "reimbursements">("loans");
  const [search, setSearch] = useState("");

  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanForm, setLoanForm] = useState({
    employeeId: "",
    loanType: "personal",
    principal: "",
    interestRate: "0",
    tenureMonths: "12",
    deductionStartMonth: currentYM(),
    reason: "",
  });

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({
    employeeId: "",
    title: "",
    amount: "",
    expenseDate: todayISO(),
    description: "",
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-dropdown"],
    queryFn: async () => {
      const res = await api.get("/employees", { params: { limit: 200 } });
      const raw = res?.employees ?? res?.data?.employees ?? res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const { data: loans = [], isLoading: loansLoading } = useQuery<any[]>({
    queryKey: ["hr-payroll-loans"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/loans");
      const payload = res?.data ?? res ?? {};
      return Array.isArray(payload.loans) ? payload.loans : [];
    },
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery<any[]>({
    queryKey: ["hr-payroll-reimbursements"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/reimbursements");
      const payload = res?.data ?? res ?? {};
      return Array.isArray(payload.reimbursements) ? payload.reimbursements : [];
    },
  });

  const createLoanMutation = useMutation({
    mutationFn: () =>
      api.post("/api/v1/hr/payroll/loans", {
        ...loanForm,
        principal: Number(loanForm.principal) || 0,
        interestRate: Number(loanForm.interestRate) || 0,
        tenureMonths: Number(loanForm.tenureMonths) || 12,
      }),
    onSuccess: () => {
      toast.success("Employee loan created with EMI schedule");
      setLoanModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-loans"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create loan"),
  });

  const toggleLoanStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/hr/payroll/loans/${id}`, { status }),
    onSuccess: () => {
      toast.success("Loan status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-loans"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update loan"),
  });

  const deleteLoanMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/hr/payroll/loans/${id}`),
    onSuccess: () => {
      toast.success("Loan deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-loans"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete loan"),
  });

  const createClaimMutation = useMutation({
    mutationFn: () =>
      api.post("/api/v1/hr/payroll/reimbursements", {
        ...claimForm,
        amount: Number(claimForm.amount) || 0,
      }),
    onSuccess: () => {
      toast.success("Payroll reimbursement added");
      setClaimModalOpen(false);
      setClaimForm({ employeeId: "", title: "", amount: "", expenseDate: todayISO(), description: "" });
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-reimbursements"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create reimbursement"),
  });

  const updateClaimMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/hr/payroll/reimbursements/${id}`, { status }),
    onSuccess: () => {
      toast.success("Reimbursement updated");
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-reimbursements"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update reimbursement"),
  });

  const deleteClaimMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/hr/payroll/reimbursements/${id}`),
    onSuccess: () => {
      toast.success("Reimbursement deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-reimbursements"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete reimbursement"),
  });

  const q = search.trim().toLowerCase();
  const filteredLoans = loans.filter((l: any) => {
    if (!q) return true;
    const emp = `${l.employee?.firstName || ""} ${l.employee?.lastName || ""}`.toLowerCase();
    return emp.includes(q) || String(l.loanType || "").toLowerCase().includes(q);
  });
  const filteredClaims = claims.filter((c: any) => {
    if (!q) return true;
    const emp = `${c.employee?.firstName || ""} ${c.employee?.lastName || ""}`.toLowerCase();
    return emp.includes(q) || String(c.title || "").toLowerCase().includes(q);
  });

  const totalOutstanding = loans.reduce((s, l) => s + Number(l.outstandingBalance || 0), 0);
  const monthlyEmiTotal = loans
    .filter((l) => l.status === "active" || l.status === "approved")
    .reduce((s, l) => s + Number(l.emiAmount || 0), 0);
  const totalClaimsAmount = claims.reduce((s, c) => s + Number(c.amount || 0), 0);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Reimbursements &amp; Loans
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage employee salary advances, EMI deductions, and payroll reimbursements synced to Payroll Runs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setClaimModalOpen(true)}
            className="h-9 gap-1.5"
          >
            <i className="ph ph-receipt text-base" />
            <span>Add Reimbursement</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setLoanModalOpen(true)}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <i className="ph ph-plus text-base" />
            <span>Issue Loan / Advance</span>
          </Button>
        </div>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Total Loan Outstanding</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {formatINR(totalOutstanding)}
            </div>
            <div className="text-xs text-primary mt-1">{loans.length} loan record(s)</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
            <i className="ph ph-credit-card text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Monthly EMI Deductions</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {formatINR(monthlyEmiTotal)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Auto-deducted in Payroll Runs</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center">
            <i className="ph ph-trend-down text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Payroll Reimbursements</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {formatINR(totalClaimsAmount)}
            </div>
            <div className="text-xs text-emerald-600 mt-1">{claims.length} claim(s) queued</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <i className="ph ph-currency-inr text-xl" />
          </div>
        </div>
      </div>

      {/* Tabs + Search Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("loans")}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "loans"
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <i className="ph ph-bank text-base" />
              <span>Employee Loans ({loans.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reimbursements")}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "reimbursements"
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <i className="ph ph-receipt text-base" />
              <span>Payroll Reimbursements ({claims.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee or type..."
              className="pl-9 h-9 w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {activeTab === "loans" ? (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Principal</th>
                  <th className="py-3 px-3 text-right">Monthly EMI</th>
                  <th className="py-3 px-3 text-right">Outstanding</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {loansLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      Loading loans...
                    </td>
                  </tr>
                ) : filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No employee loans recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan: any) => (
                    <tr key={loan.id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {loan.employee
                          ? `${loan.employee.firstName} ${loan.employee.lastName}`
                          : "Employee"}
                      </td>
                      <td className="py-3.5 px-3 capitalize text-muted-foreground">
                        {loan.loanType || "Personal"}
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium">
                        {formatINR(Number(loan.principal || 0))}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-rose-600">
                        {formatINR(Number(loan.emiAmount || 0))}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold">
                        {formatINR(Number(loan.outstandingBalance || 0))}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                            loan.status === "closed"
                              ? "bg-muted text-muted-foreground border-border"
                              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                          }`}
                        >
                          {loan.status || "active"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title={loan.status === "closed" ? "Reopen Loan" : "Mark Closed"}
                            onClick={() =>
                              toggleLoanStatusMutation.mutate({
                                id: loan.id,
                                status: loan.status === "closed" ? "active" : "closed",
                              })
                            }
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <i className="ph ph-check-circle text-base" />
                          </button>
                          <button
                            type="button"
                            title="Delete Loan"
                            onClick={() => deleteLoanMutation.mutate(loan.id)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <i className="ph ph-trash text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Claim Title</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {claimsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading reimbursements...
                    </td>
                  </tr>
                ) : filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      No payroll reimbursements queued yet.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim: any) => (
                    <tr key={claim.id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {claim.employee
                          ? `${claim.employee.firstName} ${claim.employee.lastName}`
                          : "Employee"}
                      </td>
                      <td className="py-3.5 px-3 text-foreground">{claim.title}</td>
                      <td className="py-3.5 px-3 text-xs text-muted-foreground">
                        {claim.expenseDate ? new Date(claim.expenseDate).toISOString().slice(0, 10) : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-emerald-600">
                        {formatINR(Number(claim.amount || 0))}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-700 border-emerald-500/20 capitalize">
                          {String(claim.status || "approved").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="Mark Paid"
                            onClick={() =>
                              updateClaimMutation.mutate({ id: claim.id, status: "paid" })
                            }
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <i className="ph ph-check-circle text-base" />
                          </button>
                          <button
                            type="button"
                            title="Delete Claim"
                            onClick={() => deleteClaimMutation.mutate(claim.id)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <i className="ph ph-trash text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Loan Modal */}
      <Dialog open={loanModalOpen} onOpenChange={setLoanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Employee Loan / Advance</DialogTitle>
            <DialogDescription>
              EMI deductions will automatically sync into monthly Payroll Runs.
            </DialogDescription>
          </DialogHeader>
          <form
            id="loan-form"
            onSubmit={(e) => {
              e.preventDefault();
              createLoanMutation.mutate();
            }}
            className="space-y-3.5 py-1"
          >
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <select
                value={loanForm.employeeId}
                onChange={(e) => setLoanForm({ ...loanForm, employeeId: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {`${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Loan Type *</Label>
                <select
                  value={loanForm.loanType}
                  onChange={(e) => setLoanForm({ ...loanForm, loanType: e.target.value })}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="personal">Personal Loan</option>
                  <option value="salary_advance">Salary Advance</option>
                  <option value="medical">Medical Emergency</option>
                  <option value="housing">Housing / Relocation</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Principal (INR) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={loanForm.principal}
                  onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })}
                  placeholder="50000"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label>Interest (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={loanForm.interestRate}
                  onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tenure (Mos) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={loanForm.tenureMonths}
                  onChange={(e) => setLoanForm({ ...loanForm, tenureMonths: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start Month *</Label>
                <Input
                  type="month"
                  value={loanForm.deductionStartMonth}
                  onChange={(e) => setLoanForm({ ...loanForm, deductionStartMonth: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                rows={2}
                value={loanForm.reason}
                onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })}
                placeholder="Reason for advance or loan..."
              />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLoanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="loan-form"
              disabled={createLoanMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createLoanMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reimbursement Modal */}
      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payroll Reimbursement</DialogTitle>
            <DialogDescription>
              Approved reimbursements are added automatically during Payroll Runs.
            </DialogDescription>
          </DialogHeader>
          <form
            id="claim-form"
            onSubmit={(e) => {
              e.preventDefault();
              createClaimMutation.mutate();
            }}
            className="space-y-3.5 py-1"
          >
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <select
                value={claimForm.employeeId}
                onChange={(e) => setClaimForm({ ...claimForm, employeeId: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {`${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Claim Title *</Label>
              <Input
                value={claimForm.title}
                onChange={(e) => setClaimForm({ ...claimForm, title: e.target.value })}
                placeholder="e.g., Internet & Mobile Allowance"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (INR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={claimForm.amount}
                  onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expense Date *</Label>
                <Input
                  type="date"
                  value={claimForm.expenseDate}
                  onChange={(e) => setClaimForm({ ...claimForm, expenseDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={claimForm.description}
                onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
              />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClaimModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="claim-form"
              disabled={createClaimMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createClaimMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
