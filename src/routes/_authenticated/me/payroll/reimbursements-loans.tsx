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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  RefreshCw,
  DollarSign,
  FileCheck,
  Calendar,
  Layers,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/me/payroll/reimbursements-loans")({
  component: MeReimbursementsLoansPage,
});

export default function MeReimbursementsLoansPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("loans");
  const [loanRequestModalOpen, setLoanRequestModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  const [loanRequestForm, setLoanRequestForm] = useState({
    principal: 30000,
    tenureMonths: 6,
    deductionStartMonth: "2026-10",
    reason: "Medical expense / family emergency",
    loanType: "salary_advance",
  });

  const { data: dataResponse, isLoading, refetch } = useQuery({
    queryKey: ["me-payroll-reimbursements-loans"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/payroll/reimbursements-loans");
      return res.data;
    },
  });

  const claims = dataResponse?.claims || [];
  const loans = dataResponse?.loans || [];

  const requestLoanMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/api/v1/me/payroll/loans/request", payload);
    },
    onSuccess: () => {
      toast.success("Loan / advance application submitted for HR approval");
      setLoanRequestModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["me-payroll-reimbursements-loans"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit loan request");
    },
  });

  const totalOutstanding = loans.reduce((acc: number, l: any) => acc + Number(l.outstandingBalance || 0), 0);
  const monthlyEmiTotal = loans
    .filter((l: any) => l.status === "active")
    .reduce((acc: number, l: any) => acc + Number(l.monthlyEmi || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Reimbursements & Loans"
        description="Track your approved expense claim payouts and active loan / advance EMI schedules."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setLoanRequestModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Request Loan / Advance
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Loans"
          value={loans.filter((l: any) => l.status === "active").length}
          description="In monthly repayment"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          title="Outstanding Balance"
          value={`₹${totalOutstanding.toLocaleString("en-IN")}`}
          description="Principal remaining"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Monthly EMI Deducted"
          value={`₹${monthlyEmiTotal.toLocaleString("en-IN")}`}
          description="Automated payroll recovery"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Expense Claims"
          value={claims.length}
          description="Submitted for reimbursement"
          icon={<FileCheck className="h-5 w-5" />}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="loans" className="gap-2">
            <CreditCard className="h-4 w-4" /> My Loans & Advances ({loans.length})
          </TabsTrigger>
          <TabsTrigger value="reimbursements" className="gap-2">
            <FileCheck className="h-4 w-4" /> Expense Claims ({claims.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Loans */}
        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan Repayment Portfolio</CardTitle>
              <CardDescription>
                Track your active loan installments deducted each month from your salary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto text-sm">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-3 text-left font-medium">Type</th>
                      <th className="p-3 text-right font-medium">Principal</th>
                      <th className="p-3 text-right font-medium">Monthly EMI</th>
                      <th className="p-3 text-center font-medium">Tenure</th>
                      <th className="p-3 text-right font-medium">Outstanding</th>
                      <th className="p-3 text-center font-medium">Status</th>
                      <th className="p-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Loading your loans...
                        </td>
                      </tr>
                    ) : loans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No loans or advances active. Click "Request Loan / Advance" to apply.
                        </td>
                      </tr>
                    ) : (
                      loans.map((l: any) => (
                        <tr key={l.id} className="hover:bg-muted/20">
                          <td className="p-3 font-semibold capitalize">{l.loanType.replace(/_/g, " ")}</td>
                          <td className="p-3 text-right font-medium">₹{Number(l.principal).toLocaleString("en-IN")}</td>
                          <td className="p-3 text-right font-bold text-destructive">₹{Number(l.monthlyEmi).toLocaleString("en-IN")}</td>
                          <td className="p-3 text-center">{l.tenureMonths} mo</td>
                          <td className="p-3 text-right font-bold">₹{Number(l.outstandingBalance).toLocaleString("en-IN")}</td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                l.status === "active"
                                  ? "default"
                                  : l.status === "completed"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="capitalize"
                            >
                              {l.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedLoan(l)}
                              className="gap-1"
                            >
                              <Layers className="h-3.5 w-3.5" /> EMI Schedule
                            </Button>
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

        {/* Tab 2: Claims */}
        <TabsContent value="reimbursements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Expense Reimbursements</CardTitle>
              <CardDescription>
                Business expenses and travel claims submitted for payroll credit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto text-sm">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-3 text-left font-medium">Expense Title</th>
                      <th className="p-3 text-left font-medium">Category</th>
                      <th className="p-3 text-right font-medium">Claim Amount</th>
                      <th className="p-3 text-center font-medium">Approval Status</th>
                      <th className="p-3 text-center font-medium">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {claims.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No expense claims filed.
                        </td>
                      </tr>
                    ) : (
                      claims.map((c: any) => (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="p-3 font-semibold">{c.title}</td>
                          <td className="p-3">{c.category?.name || "General"}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            ₹{Number(c.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="capitalize">{c.status.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="p-3 text-center text-xs text-muted-foreground">
                            {c.reimbursementMethod || "Direct Transfer"}
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

      {/* Loan Request Dialog */}
      <Dialog open={loanRequestModalOpen} onOpenChange={setLoanRequestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Employee Loan or Salary Advance</DialogTitle>
            <DialogDescription>
              Submit an application for emergency funds or salary advance. Requires HR approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Request Type</label>
              <select
                value={loanRequestForm.loanType}
                onChange={(e) => setLoanRequestForm({ ...loanRequestForm, loanType: e.target.value })}
                className="w-full border rounded-md p-2 bg-background text-sm"
              >
                <option value="salary_advance">Salary Advance (Short Term)</option>
                <option value="personal">Personal Loan</option>
                <option value="emergency">Medical Emergency Fund</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Requested Principal (₹)</label>
                <Input
                  type="number"
                  value={loanRequestForm.principal}
                  onChange={(e) => setLoanRequestForm({ ...loanRequestForm, principal: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Repayment Tenure (Months)</label>
                <Input
                  type="number"
                  value={loanRequestForm.tenureMonths}
                  onChange={(e) => setLoanRequestForm({ ...loanRequestForm, tenureMonths: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="p-3 border rounded-md bg-muted/20 text-xs flex justify-between items-center">
              <span>Estimated Monthly Deduction:</span>
              <span className="font-bold text-destructive text-sm">
                ₹{Math.round(loanRequestForm.principal / loanRequestForm.tenureMonths).toLocaleString("en-IN")}/mo
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason & Justification</label>
              <Input
                value={loanRequestForm.reason}
                onChange={(e) => setLoanRequestForm({ ...loanRequestForm, reason: e.target.value })}
                placeholder="Reason for advance or loan"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => requestLoanMutation.mutate(loanRequestForm)}
              disabled={requestLoanMutation.isPending}
            >
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMI Schedule Dialog */}
      <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Repayment Schedule</DialogTitle>
            <DialogDescription>
              Principal: ₹{Number(selectedLoan?.principal).toLocaleString("en-IN")} • Outstanding: ₹{Number(selectedLoan?.outstandingBalance).toLocaleString("en-IN")}
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-md overflow-hidden text-sm max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-2.5 text-left font-medium">#</th>
                  <th className="p-2.5 text-left font-medium">Period</th>
                  <th className="p-2.5 text-right font-medium">EMI Deduction</th>
                  <th className="p-2.5 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedLoan?.installments?.map((inst: any) => (
                  <tr key={inst.id} className="hover:bg-muted/20">
                    <td className="p-2.5 font-mono">{inst.installmentNumber}</td>
                    <td className="p-2.5 font-semibold">{inst.periodMonth}/{inst.periodYear}</td>
                    <td className="p-2.5 text-right font-bold text-destructive">
                      ₹{Number(inst.emiAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge
                        variant={inst.status === "deducted" ? "default" : "outline"}
                        className={inst.status === "deducted" ? "bg-emerald-600" : ""}
                      >
                        {inst.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedLoan(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
