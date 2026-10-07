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
  Search,
  CheckCircle2,
  DollarSign,
  Users,
  Clock,
  Layers,
  FileCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/payroll/reimbursements-loans")({
  component: HrReimbursementsLoansPage,
});

export default function HrReimbursementsLoansPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("loans");
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  // New Loan Form
  const [loanForm, setLoanForm] = useState({
    employeeId: "",
    loanType: "personal",
    principal: 50000,
    interestRate: 0,
    tenureMonths: 10,
    deductionStartMonth: "2026-10",
    reason: "Salary advance / personal emergency",
  });

  // 1. Fetch Loans
  const { data: loansData, isLoading: loansLoading, refetch: refetchLoans } = useQuery({
    queryKey: ["hr-payroll-loans"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/loans");
      return res.data;
    },
  });

  // 2. Fetch Reimbursements
  const { data: claimsData, isLoading: claimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ["hr-payroll-reimbursements"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/reimbursements");
      return res.data;
    },
  });

  // 3. Fetch Employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ["hr-employees-list-payroll"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/employees");
      return res.data;
    },
  });

  const loans = loansData?.loans || [];
  const claims = claimsData?.reimbursements || [];
  const employees = employeesData?.employees || [];

  // Create Loan Mutation
  const createLoanMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/api/v1/hr/payroll/loans", payload);
    },
    onSuccess: () => {
      toast.success("Employee loan created with repayment schedule");
      setLoanModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-loans"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create loan");
    },
  });

  const totalOutstanding = loans.reduce((acc: number, l: any) => acc + Number(l.outstandingBalance || 0), 0);
  const activeLoansCount = loans.filter((l: any) => l.status === "active").length;
  const pendingClaimsTotal = claims.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Reimbursements & Employee Loans"
        description="Manage expense claim payroll credits and employee loan repayment EMI schedules with automated payroll recovery."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLoans();
              refetchClaims();
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setLoanModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Issue New Loan / Advance
          </Button>
        </div>
      </PageHeader>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Loans"
          value={activeLoansCount}
          description="In monthly repayment"
          icon={CreditCard}
        />
        <StatCard
          title="Outstanding Portfolio"
          value={`₹${totalOutstanding.toLocaleString("en-IN")}`}
          description="Principal awaiting recovery"
          icon={DollarSign}
        />
        <StatCard
          title="Pending Reimbursements"
          value={`₹${pendingClaimsTotal.toLocaleString("en-IN")}`}
          description="Approved for payroll addition"
          icon={FileCheck}
        />
        <StatCard
          title="Recovery Method"
          value="Automated EMI"
          description="Deducted at monthly batch run"
          icon={CheckCircle2}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="loans" className="gap-2">
            <CreditCard className="h-4 w-4" /> Employee Loans & Advances ({loans.length})
          </TabsTrigger>
          <TabsTrigger value="reimbursements" className="gap-2">
            <FileCheck className="h-4 w-4" /> Expense Reimbursements ({claims.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Loans */}
        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Loan Portfolio</CardTitle>
              <CardDescription>
                Loans with structured monthly EMI recovery integrated directly into monthly payroll batch runs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-3 text-left font-medium">Employee</th>
                      <th className="p-3 text-left font-medium">Type</th>
                      <th className="p-3 text-right font-medium">Principal</th>
                      <th className="p-3 text-right font-medium">Monthly EMI</th>
                      <th className="p-3 text-center font-medium">Tenure</th>
                      <th className="p-3 text-right font-medium">Outstanding Balance</th>
                      <th className="p-3 text-center font-medium">Status</th>
                      <th className="p-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loansLoading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          Loading loans...
                        </td>
                      </tr>
                    ) : loans.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No employee loans recorded. Click "Issue New Loan / Advance" to create.
                        </td>
                      </tr>
                    ) : (
                      loans.map((l: any) => (
                        <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-semibold">
                            <div>{l.employee?.firstName} {l.employee?.lastName}</div>
                            <span className="text-xs text-muted-foreground font-mono">{l.employee?.employeeCode}</span>
                          </td>
                          <td className="p-3 capitalize">{l.loanType.replace(/_/g, " ")}</td>
                          <td className="p-3 text-right font-medium">
                            ₹{Number(l.principal).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-right font-bold text-destructive">
                            ₹{Number(l.monthlyEmi).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center">{l.tenureMonths} mo</td>
                          <td className="p-3 text-right font-bold">
                            ₹{Number(l.outstandingBalance).toLocaleString("en-IN")}
                          </td>
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
                              <Layers className="h-3.5 w-3.5" /> Schedule
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

        {/* Tab 2: Reimbursements */}
        <TabsContent value="reimbursements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approved Expense Reimbursements</CardTitle>
              <CardDescription>
                Claims approved for payout via payroll addition. Will be added to employee earnings in the matching period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-3 text-left font-medium">Employee</th>
                      <th className="p-3 text-left font-medium">Title & Merchant</th>
                      <th className="p-3 text-left font-medium">Category</th>
                      <th className="p-3 text-right font-medium">Amount</th>
                      <th className="p-3 text-center font-medium">Status</th>
                      <th className="p-3 text-center font-medium">Payout Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {claimsLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Loading claims...
                        </td>
                      </tr>
                    ) : claims.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No expense claims queued for payroll addition.
                        </td>
                      </tr>
                    ) : (
                      claims.map((c: any) => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-semibold">
                            {c.employee?.firstName} {c.employee?.lastName}
                          </td>
                          <td className="p-3">
                            <div>{c.title}</div>
                            <span className="text-xs text-muted-foreground">{c.merchant}</span>
                          </td>
                          <td className="p-3">{c.category?.name || "General"}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            ₹{Number(c.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="capitalize">{c.status.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary">Payroll Addition</Badge>
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

      {/* New Loan Dialog */}
      <Dialog open={loanModalOpen} onOpenChange={setLoanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Employee Loan or Salary Advance</DialogTitle>
            <DialogDescription>
              Sets up a structured repayment schedule automatically deducted during monthly payroll.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <select
                value={loanForm.employeeId}
                onChange={(e) => setLoanForm({ ...loanForm, employeeId: e.target.value })}
                className="w-full border rounded-md p-2 bg-background text-sm"
              >
                <option value="">-- Select Employee --</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Principal Amount (₹)</label>
                <Input
                  type="number"
                  value={loanForm.principal}
                  onChange={(e) => setLoanForm({ ...loanForm, principal: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tenure (Months)</label>
                <Input
                  type="number"
                  value={loanForm.tenureMonths}
                  onChange={(e) => setLoanForm({ ...loanForm, tenureMonths: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monthly EMI Deduction</label>
                <div className="p-2 border rounded-md bg-muted/20 font-bold text-destructive">
                  ₹{Math.round(loanForm.principal / loanForm.tenureMonths).toLocaleString("en-IN")}/mo
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deduction Start Period</label>
                <Input
                  value={loanForm.deductionStartMonth}
                  onChange={(e) => setLoanForm({ ...loanForm, deductionStartMonth: e.target.value })}
                  placeholder="YYYY-MM (e.g. 2026-10)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Disbursement Purpose</label>
              <Input
                value={loanForm.reason}
                onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })}
                placeholder="Reason for advance or loan"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createLoanMutation.mutate(loanForm)}
              disabled={createLoanMutation.isPending || !loanForm.employeeId}
            >
              Authorize & Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Schedule Dialog */}
      <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Repayment Schedule — {selectedLoan?.employee?.firstName} {selectedLoan?.employee?.lastName}</DialogTitle>
            <DialogDescription>
              Principal: ₹{Number(selectedLoan?.principal).toLocaleString("en-IN")} • Outstanding: ₹{Number(selectedLoan?.outstandingBalance).toLocaleString("en-IN")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="border rounded-md overflow-hidden text-sm">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-2.5 text-left font-medium">#</th>
                    <th className="p-2.5 text-left font-medium">Period</th>
                    <th className="p-2.5 text-right font-medium">EMI Amount</th>
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
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedLoan(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
