import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartOfAccountsTable } from "@/components/accounting/chart-of-accounts-table";
import { BankAccountsManager } from "@/components/accounting/bank-accounts-manager";
import { FinancialStatementsView } from "@/components/accounting/financial-statements-view";
import {
  Landmark,
  Plus,
  Search,
  Scale,
  TrendingUp,
  TrendingDown,
  Building2,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  DollarSign,
  ArrowRightLeft,
  Check,
  CreditCard,
  Users,
  ShieldCheck,
  Clock,
  Printer,
  ChevronRight,
  PieChart,
  BarChart3,
  Receipt,
  FileText,
  Percent,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  AlertCircle,
  Boxes,
  FileDown,
  ExternalLink,
} from "lucide-react";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/accounting")({
  component: AccountingAppSuite,
  head: () => ({ meta: [{ title: "Accountant & General Ledger — Master ERP" }] }),
});

export function AccountingAppSuite() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || "default";

  const [activeTab, setActiveTab] = useState("overview");
  const [accountFilter, setAccountFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [trialBalanceSearch, setTrialBalanceSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string | null>(null);
  const canManagePeriods = Boolean((user as any)?.roles?.some((role: string) => ["admin", "super_admin", "Workspace Admin"].includes(role)));

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // New Account Form State
  const [accountForm, setAccountForm] = useState({
    accountCode: "",
    accountName: "",
    accountType: "asset",
    category: "current_asset",
    description: "",
    balance: "0",
  });

  // New Journal Entry Form State
  const [journalForm, setJournalForm] = useState({
    description: "",
    reference: "",
    entryDate: new Date().toISOString().split("T")[0],
    items: [
      { accountId: "", debit: "0", credit: "0", notes: "" },
      { accountId: "", debit: "0", credit: "0", notes: "" },
    ],
  });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    fromAccount: "1020",
    toAccount: "1010",
    amount: "",
    reference: "",
    notes: "",
  });

  // 1. Fetch Dashboard KPI & Summary
  const { data: dashboardData } = useQuery({
    queryKey: ["accounting-dashboard", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/accounting/dashboard");
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  // 2. Fetch Chart of Accounts
  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery({
    queryKey: ["accounting-accounts", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/accounting/accounts");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const { data: fiscalYears = [], isLoading: isFiscalYearsLoading } = useQuery({
    queryKey: ["accounting-fiscal-years", tenantId],
    queryFn: async () => {
      const res = await api.get("/accounting/fiscal-years");
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const periodStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "close" | "reopen" }) => api.post(`/accounting/periods/${id}/${action}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounting-fiscal-years", tenantId] }); toast.success("Accounting period status updated"); },
    onError: (err: any) => toast.error(err?.response?.data?.error || err.message || "Unable to update period"),
  });

  // 3. Fetch Journal Entries
  const { data: journalEntries = [], isLoading: isJournalsLoading } = useQuery({
    queryKey: ["accounting-journal-entries", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/accounting/journal-entries");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch Financial Statements (Balance Sheet & P&L)
  const { data: statementsData } = useQuery({
    queryKey: ["accounting-financial-statements", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/accounting/reports/financial-statements");
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  // 5. Fetch Aging & Tax Reports
  const { data: agingData } = useQuery({
    queryKey: ["accounting-aging-reports", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/accounting/reports/aging");
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  // 6. Fetch Trial Balance Report
  const { data: trialBalanceData, isLoading: isTrialBalanceLoading } = useQuery({
    queryKey: ["accounting-trial-balance", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/accounting/reports/trial-balance");
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  // 7. Fetch Inventory Valuation Report (WAC & GL 1040 Reconciliation)
  const { data: inventoryValuationData, isLoading: isValuationLoading } = useQuery({
    queryKey: ["accounting-inventory-valuation", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/accounting/reports/inventory-valuation");
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  // 8. Fetch Account Ledger Statement
  const { data: ledgerStatement, isLoading: isLedgerLoading } = useQuery({
    queryKey: ["accounting-account-ledger", tenantId, selectedLedgerAccount],
    queryFn: async () => {
      if (!selectedLedgerAccount) return null;
      try {
        const res = await api.get(`/accounting/reports/ledger/${selectedLedgerAccount}`);
        return res?.data || null;
      } catch {
        return null;
      }
    },
    enabled: !!selectedLedgerAccount,
  });

  // Bank Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: async (payload: typeof transferForm) => {
      return await api.post("/accounting/transfers", payload);
    },
    onSuccess: () => {
      toast.success("Internal bank/cash transfer executed & posted to General Ledger!");
      setIsTransferModalOpen(false);
      setTransferForm({ fromAccount: "1020", toAccount: "1010", amount: "", reference: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["accounting-accounts", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-journal-entries", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-financial-statements", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-trial-balance", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-inventory-valuation", tenantId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || "Failed to execute transfer");
    },
  });

  // Create Account Mutation
  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/accounting/accounts", payload);
    },
    onSuccess: () => {
      toast.success("Account created successfully!");
      setIsAccountModalOpen(false);
      setAccountForm({ accountCode: "", accountName: "", accountType: "asset", category: "current_asset", description: "", balance: "0" });
      qc.invalidateQueries({ queryKey: ["accounting-accounts", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard", tenantId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create account"),
  });

  // Create Journal Entry Mutation
  const createJournalMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/accounting/journal-entries", payload);
    },
    onSuccess: () => {
      toast.success("Balanced Journal Entry posted successfully!");
      setIsJournalModalOpen(false);
      setJournalForm({
        description: "",
        reference: "",
        entryDate: new Date().toISOString().split("T")[0],
        items: [
          { accountId: "", debit: "0", credit: "0", notes: "" },
          { accountId: "", debit: "0", credit: "0", notes: "" },
        ],
      });
      qc.invalidateQueries({ queryKey: ["accounting-journal-entries", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-accounts", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard", tenantId] });
      qc.invalidateQueries({ queryKey: ["accounting-financial-statements", tenantId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to post journal entry"),
  });

  // Calculations for Journal Form Total
  const totalDebit = journalForm.items.reduce((sum, i) => sum + (parseFloat(i.debit) || 0), 0);
  const totalCredit = journalForm.items.reduce((sum, i) => sum + (parseFloat(i.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  // Filtered Inventory Valuation Products
  const filteredValuationProducts = (inventoryValuationData?.products || []).filter((p: any) => {
    return (
      p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(inventorySearch.toLowerCase()))
    );
  });

  const exportValuationCSV = () => {
    if (!inventoryValuationData?.products?.length) return;
    const headers = ["SKU", "Product Name", "Category", "Unit", "On-Hand Qty", "WAC Unit Cost", "Selling Price", "Asset Valuation", "Sales Valuation", "Gross Margin %"];
    const rows = inventoryValuationData.products.map((p: any) => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.unit}"`,
      p.onHandQuantity,
      Number(p.weightedAverageCost || 0).toFixed(2),
      Number(p.salePrice || 0).toFixed(2),
      Number(p.assetValuation || 0).toFixed(2),
      Number(p.salesValuation || 0).toFixed(2),
      Number(p.potentialMargin || 0).toFixed(1),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Inventory_Valuation_WAC_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PlanGuard moduleName="Double-Entry Accounting" requiredPlan="starter">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Landmark className="size-6 text-primary" /> Advanced Accounting & General Ledger
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Double-entry bookkeeping, balanced journal vouchers, banking, customer/vendor ledgers & financial statements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTransferModalOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <ArrowRightLeft className="size-3.5 text-indigo-500" /> Bank Transfer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAccountModalOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Plus className="size-3.5 text-primary" /> New Account
            </Button>
            <Button
              size="sm"
              onClick={() => setIsJournalModalOpen(true)}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
            >
              <Scale className="size-3.5" /> Post Journal Entry
            </Button>
          </div>
        </div>

        {/* Multi-Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto gap-1 border">
            <TabsTrigger value="overview" className="text-xs gap-1.5 py-1.5">
              <BarChart3 className="size-3.5" /> Overview & KPIs
            </TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs gap-1.5 py-1.5">
              <Layers className="size-3.5" /> Chart of Accounts ({accounts.length})
            </TabsTrigger>
            <TabsTrigger value="journals" className="text-xs gap-1.5 py-1.5">
              <Scale className="size-3.5" /> Journal Entries ({journalEntries.length})
            </TabsTrigger>
            <TabsTrigger value="periods" className="text-xs gap-1.5 py-1.5">
              <Calendar className="size-3.5" /> Fiscal Periods
            </TabsTrigger>
            <TabsTrigger value="banking" className="text-xs gap-1.5 py-1.5">
              <CreditCard className="size-3.5" /> Banking & Transfers
            </TabsTrigger>
            <TabsTrigger value="statements" className="text-xs gap-1.5 py-1.5">
              <FileSpreadsheet className="size-3.5" /> Balance Sheet & P&L
            </TabsTrigger>
            <TabsTrigger value="trial-balance" className="text-xs gap-1.5 py-1.5">
              <Scale className="size-3.5 text-primary" /> Trial Balance
            </TabsTrigger>
            <TabsTrigger value="inventory-valuation" className="text-xs gap-1.5 py-1.5">
              <Boxes className="size-3.5 text-amber-500" /> Inventory Valuation (WAC)
            </TabsTrigger>
            <TabsTrigger value="aging" className="text-xs gap-1.5 py-1.5">
              <Clock className="size-3.5" /> Aging & Tax Reports
            </TabsTrigger>
          </TabsList>

          {/* ========================================================= */}
          {/* TAB 1: OVERVIEW & KPIS */}
          {/* ========================================================= */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Total Assets</span>
                  <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center">
                    <TrendingUp className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black tracking-tight">
                    {formatSystemAmount(dashboardData?.totalAssets || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Cash, Bank, Receivables & Equipment</p>
                </CardContent>
              </Card>

              <Card className="border shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Total Liabilities</span>
                  <div className="size-7 rounded-lg bg-rose-500/10 text-rose-600 grid place-items-center">
                    <TrendingDown className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black tracking-tight">
                    {formatSystemAmount(dashboardData?.totalLiabilities || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Accounts Payable, GST & Salaries Due</p>
                </CardContent>
              </Card>

              <Card className="border shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Customer Payments</span>
                  <div className="size-7 rounded-lg bg-sky-500/10 text-sky-600 grid place-items-center">
                    <Users className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black tracking-tight">
                    {formatSystemAmount(dashboardData?.totalCustomerPayments || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {dashboardData?.totalClients ?? 0} Active Clients
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Vendor Payments</span>
                  <div className="size-7 rounded-lg bg-purple-500/10 text-purple-600 grid place-items-center">
                    <Building2 className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black tracking-tight">
                    {formatSystemAmount(dashboardData?.totalVendorPayments || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {dashboardData?.totalVendors ?? 0} Registered Vendors
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Revenues & Expenses (Last 5 Days) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ArrowUpRight className="size-4 text-emerald-500" /> Recent Operating Revenues
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">
                      Income Range 4000–4999
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y text-xs">
                  {dashboardData?.recentRevenues?.map((rev: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <div className="font-bold text-foreground">{rev.description}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {rev.number} • {rev.date}
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">+{formatSystemAmount(rev.amount)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ArrowDownRight className="size-4 text-rose-500" /> Recent Operating Expenses
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700">
                      Expense Range 5000–6999
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y text-xs">
                  {dashboardData?.recentExpenses?.map((exp: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <div className="font-bold text-foreground">{exp.description}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {exp.number} • {exp.date}
                        </div>
                      </div>
                      <span className="font-bold text-rose-600">-{formatSystemAmount(exp.amount)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="periods" className="space-y-4">
            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm">Fiscal Years & Monthly Accounting Periods</CardTitle>
                <CardDescription className="text-xs">Closed periods reject all new and backdated ledger postings.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {isFiscalYearsLoading ? <p className="p-4 text-xs text-muted-foreground">Loading fiscal periods…</p> : fiscalYears.length === 0 ? <p className="p-4 text-xs text-muted-foreground">No fiscal year has been configured yet.</p> : fiscalYears.map((year: any) => (
                  <div key={year.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">{year.name}</p><p className="text-xs text-muted-foreground">{new Date(year.startDate).toLocaleDateString()} – {new Date(year.endDate).toLocaleDateString()}</p></div><Badge className={year.status === "closed" ? "bg-rose-600" : "bg-emerald-600"}>{year.status}</Badge></div>
                    <div className="rounded-md border divide-y">{year.periods?.map((period: any) => <div key={period.id} className="flex items-center justify-between p-2.5 text-xs"><span>{period.name} · {new Date(period.startDate).toLocaleDateString()} – {new Date(period.endDate).toLocaleDateString()}</span><div className="flex items-center gap-2"><Badge variant="outline" className={period.status === "closed" ? "border-rose-300 text-rose-700" : "border-emerald-300 text-emerald-700"}>{period.status}</Badge>{canManagePeriods && <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={periodStatusMutation.isPending} onClick={() => periodStatusMutation.mutate({ id: period.id, action: period.status === "closed" ? "reopen" : "close" })}>{period.status === "closed" ? "Reopen" : "Close"}</Button>}</div></div>)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 2: CHART OF ACCOUNTS */}
          {/* ========================================================= */}
          <TabsContent value="accounts" className="space-y-4">
            <ChartOfAccountsTable
              accounts={accounts}
              isLoading={isAccountsLoading}
              onSelectLedgerAccount={setSelectedLedgerAccount}
              onCreateAccount={async (data) => createAccountMutation.mutateAsync(data)}
              isCreating={createAccountMutation.isPending}
            />
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 3: JOURNAL ENTRIES */}
          {/* ========================================================= */}
          <TabsContent value="journals" className="space-y-4">
            <Card className="border shadow-xs overflow-hidden">
              <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Double-Entry Journal Postings</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Strict equation enforcement: Total Debits must equal Total Credits.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsJournalModalOpen(true)}
                  className="h-8 text-xs font-bold gap-1 bg-primary"
                >
                  <Plus className="size-3.5" /> Post Entry
                </Button>
              </div>

              <div className="divide-y text-xs">
                {journalEntries.map((je: any) => (
                  <div key={je.id} className="p-4 space-y-2.5 hover:bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-primary">{je.entryNumber}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-semibold text-foreground">{je.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px] font-mono">
                          {new Date(je.entryDate).toLocaleDateString()}
                        </span>
                        <Badge className="text-[9px] bg-emerald-500 text-white uppercase font-bold">
                          POSTED
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 bg-muted/40 p-2.5 rounded-lg font-mono text-[11px]">
                      <div className="col-span-6 font-bold text-muted-foreground uppercase">Account</div>
                      <div className="col-span-3 text-right font-bold text-muted-foreground uppercase">Debit</div>
                      <div className="col-span-3 text-right font-bold text-muted-foreground uppercase">Credit</div>

                      {je.items?.map((item: any) => (
                        <div key={item.id} className="col-span-12 grid grid-cols-12 border-t pt-1.5 border-border/40">
                          <div className="col-span-6 truncate font-sans text-foreground">
                            <span className="font-mono font-bold text-primary mr-1.5">
                              {item.account?.accountCode}
                            </span>
                            {item.account?.accountName}
                          </div>
                          <div className="col-span-3 text-right font-mono text-emerald-600 font-semibold">
                            {Number(item.debit) > 0 ? formatSystemAmount(item.debit) : "—"}
                          </div>
                          <div className="col-span-3 text-right font-mono text-rose-600 font-semibold">
                            {Number(item.credit) > 0 ? formatSystemAmount(item.credit) : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 4: BANKING & TRANSFERS */}
          {/* ========================================================= */}
          <TabsContent value="banking" className="space-y-4">
            <BankAccountsManager
              accounts={accounts}
              isLoading={isAccountsLoading}
              onExecuteTransfer={async (data) => transferMutation.mutateAsync(data as any)}
              isTransferring={transferMutation.isPending}
            />
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 5: BALANCE SHEET & PROFIT AND LOSS */}
          {/* ========================================================= */}
          <TabsContent value="statements" className="space-y-4">
            <FinancialStatementsView
              statementsData={statementsData}
              trialBalanceData={trialBalanceData}
              isLoading={isTrialBalanceLoading}
              onSelectLedgerAccount={setSelectedLedgerAccount}
            />
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 6: AGING & TAX REPORTS */}
          {/* ========================================================= */}
          <TabsContent value="aging" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold">Customer Invoice Aging</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b font-bold text-[10px] text-muted-foreground uppercase">
                      <tr>
                        <th className="p-2.5">Customer</th>
                        <th className="p-2.5 text-right">Current</th>
                        <th className="p-2.5 text-right">1-30 D</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono text-[11px]">
                      {agingData?.invoiceAging?.map((row: any, i: number) => (
                        <tr key={i}>
                          <td className="p-2.5 font-sans font-semibold text-foreground">{row.customer}</td>
                          <td className="p-2.5 text-right text-emerald-600">{formatSystemAmount(row.current)}</td>
                          <td className="p-2.5 text-right text-amber-600">{formatSystemAmount(row.days30)}</td>
                          <td className="p-2.5 text-right font-bold">{formatSystemAmount(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="border shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold">Tax & GST Reconciliation Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b">
                    <span>GST Output Collected on Sales</span>
                    <span className="font-mono font-bold text-emerald-600">
                      +{formatSystemAmount(agingData?.taxSummary?.salesGstCollected || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span>GST Input Tax Credit (ITC) on Purchases</span>
                    <span className="font-mono font-bold text-rose-600">
                      -{formatSystemAmount(agingData?.taxSummary?.purchaseGstPaid || 0)}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/60 rounded-xl flex justify-between font-bold text-sm">
                    <span>Net GST Tax Payable to Government</span>
                    <span className="font-mono text-primary">
                      {formatSystemAmount(agingData?.taxSummary?.netGstPayable || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB: TRIAL BALANCE */}
          {/* ========================================================= */}
          <TabsContent value="trial-balance" className="space-y-4">
            <FinancialStatementsView
              statementsData={statementsData}
              trialBalanceData={trialBalanceData}
              isLoading={isTrialBalanceLoading}
              onSelectLedgerAccount={setSelectedLedgerAccount}
            />
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB: INVENTORY VALUATION (WAC & GL RECONCILIATION) */}
          {/* ========================================================= */}
          <TabsContent value="inventory-valuation" className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Total Stock Units</span>
                  <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <Boxes className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight font-mono">
                    {inventoryValuationData?.totalStockUnits?.toLocaleString() ?? 0}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Across all warehouses</p>
                </CardContent>
              </Card>

              <Card className="border shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Asset Valuation (WAC Cost)</span>
                  <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center">
                    <DollarSign className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight font-mono text-emerald-600">
                    {formatSystemAmount(inventoryValuationData?.totalAssetValuation || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Weighted Average Cost (WAC)</p>
                </CardContent>
              </Card>

              <Card className="border shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Expected Sales Value</span>
                  <div className="size-7 rounded-lg bg-sky-500/10 text-sky-600 grid place-items-center">
                    <TrendingUp className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight font-mono text-sky-600">
                    {formatSystemAmount(inventoryValuationData?.totalSalesValuation || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">At active retail catalog prices</p>
                </CardContent>
              </Card>

              <Card className="border shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Unrealized Gross Profit</span>
                  <div className="size-7 rounded-lg bg-purple-500/10 text-purple-600 grid place-items-center">
                    <Percent className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight font-mono text-purple-600">
                    {formatSystemAmount(inventoryValuationData?.unrealizedGrossProfit || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Potential gross retail profit</p>
                </CardContent>
              </Card>
            </div>

            {/* General Ledger Account #1040 Reconciliation Banner */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              inventoryValuationData?.isReconciled ? "bg-emerald-50/50 border-emerald-200" : "bg-amber-50/50 border-amber-200"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`size-5 ${inventoryValuationData?.isReconciled ? "text-emerald-600" : "text-amber-600"}`} />
                  <span className="font-bold text-sm">
                    {inventoryValuationData?.isReconciled
                      ? "General Ledger Account #1040 (Merchandise Inventory) Reconciled"
                      : "General Ledger Reconciliation Variance Detected"}
                  </span>
                  {inventoryValuationData?.isReconciled ? (
                    <Badge className="bg-emerald-600 text-white text-[10px]">100% RECONCILED</Badge>
                  ) : (
                    <Badge className="bg-amber-600 text-white text-[10px]">VARIANCE ALERT</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  GL Account #{inventoryValuationData?.glInventoryAccount?.accountCode || "1040"} Balance:{" "}
                  <strong className="font-mono text-foreground">
                    {formatSystemAmount(inventoryValuationData?.glInventoryAccount?.balance || 0)}
                  </strong>{" "}
                  vs Physical On-Hand Stock Asset Valuation:{" "}
                  <strong className="font-mono text-foreground">
                    {formatSystemAmount(inventoryValuationData?.totalAssetValuation || 0)}
                  </strong>.
                  {!inventoryValuationData?.isReconciled && (
                    <span className="text-amber-700 ml-1 font-semibold">
                      Discrepancy of {formatSystemAmount(Math.abs(inventoryValuationData?.discrepancy || 0))}. You can post an inventory shrinkage/adjustment journal voucher.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportValuationCSV}
                  disabled={!inventoryValuationData?.products?.length}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <FileDown className="size-3.5" /> Export Valuation CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsJournalModalOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Scale className="size-3.5" /> Post Adjustment Entry
                </Button>
              </div>
            </div>

            {/* Product Valuation Breakdown Table */}
            <Card className="border shadow-xs overflow-hidden">
              <div className="p-3 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search product, SKU or category..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing {filteredValuationProducts.length} of {inventoryValuationData?.products?.length ?? 0} SKUs
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">In-Stock Qty</th>
                      <th className="p-3 text-right">WAC Cost</th>
                      <th className="p-3 text-right">Selling Price</th>
                      <th className="p-3 text-right">Asset Valuation</th>
                      <th className="p-3 text-right">Sales Valuation</th>
                      <th className="p-3 text-right">Margin %</th>
                      <th className="p-3">Warehouse Stock Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {filteredValuationProducts.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-primary">{p.sku}</td>
                        <td className="p-3 font-semibold text-foreground">{p.name}</td>
                        <td className="p-3 text-muted-foreground text-[11px]">{p.category}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span className={p.isLowStock ? "text-amber-600" : ""}>
                            {p.onHandQuantity} {p.unit}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {formatSystemAmount(p.weightedAverageCost)}
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          {formatSystemAmount(p.salePrice)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {formatSystemAmount(p.assetValuation)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-sky-600">
                          {formatSystemAmount(p.salesValuation)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-purple-600">
                          {p.potentialMargin.toFixed(1)}%
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {p.warehouseBreakdown?.length > 0 ? (
                              p.warehouseBreakdown.map((wh: any, widx: number) => (
                                <Badge
                                  key={widx}
                                  variant="outline"
                                  className="text-[9px] font-mono py-0 h-4 bg-background"
                                >
                                  {wh.warehouseName}: {wh.quantity}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">No warehouse allocated</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL 1: CREATE ACCOUNT */}
        <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Create New Account
              </DialogTitle>
              <DialogDescription className="text-xs">
                Add an account to the 5-tier General Ledger Chart of Accounts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Account Code *</Label>
                  <Input
                    placeholder="e.g. 1050"
                    value={accountForm.accountCode}
                    onChange={(e) => setAccountForm({ ...accountForm, accountCode: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Account Classification *</Label>
                  <Select
                    value={accountForm.accountType}
                    onValueChange={(val) => setAccountForm({ ...accountForm, accountType: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset (1000–1999)</SelectItem>
                      <SelectItem value="liability">Liability (2000–2999)</SelectItem>
                      <SelectItem value="equity">Equity (3000–3999)</SelectItem>
                      <SelectItem value="revenue">Revenue (4000–4999)</SelectItem>
                      <SelectItem value="expense">Expense (5000–6999)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Account Title / Name *</Label>
                <Input
                  placeholder="e.g. ICICI Bank Primary Operating A/C"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={accountForm.balance}
                  onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsAccountModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={createAccountMutation.isPending || !accountForm.accountCode || !accountForm.accountName}
                onClick={() => createAccountMutation.mutate(accountForm)}
              >
                {createAccountMutation.isPending ? "Creating..." : "Save Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: POST BALANCED JOURNAL ENTRY */}
        <Dialog open={isJournalModalOpen} onOpenChange={setIsJournalModalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Scale className="size-4 text-primary" /> Post Balanced Journal Entry
              </DialogTitle>
              <DialogDescription className="text-xs">
                Every transaction must balance ($Total Debits = Total Credits$).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Entry Date</Label>
                  <Input
                    type="date"
                    value={journalForm.entryDate}
                    onChange={(e) => setJournalForm({ ...journalForm, entryDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Reference No / Invoice #</Label>
                  <Input
                    placeholder="e.g. INV-2026-001"
                    value={journalForm.reference}
                    onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Transaction Description *</Label>
                <Input
                  placeholder="e.g. Office rent payment via HDFC Bank"
                  value={journalForm.description}
                  onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[11px] uppercase text-muted-foreground">Line Items</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setJournalForm({
                        ...journalForm,
                        items: [...journalForm.items, { accountId: "", debit: "0", credit: "0", notes: "" }],
                      })
                    }
                    className="h-6 text-[10px] text-primary"
                  >
                    + Add Line
                  </Button>
                </div>

                {journalForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-6">
                      <Select
                        value={item.accountId}
                        onValueChange={(val) => {
                          const updated = [...journalForm.items];
                          updated[idx].accountId = val;
                          setJournalForm({ ...journalForm, items: updated });
                        }}
                      >
                        <SelectTrigger className="h-7 text-[11px]">
                          <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a: any) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.accountCode} - {a.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Debit"
                        value={item.debit}
                        onChange={(e) => {
                          const updated = [...journalForm.items];
                          updated[idx].debit = e.target.value;
                          setJournalForm({ ...journalForm, items: updated });
                        }}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Credit"
                        value={item.credit}
                        onChange={(e) => {
                          const updated = [...journalForm.items];
                          updated[idx].credit = e.target.value;
                          setJournalForm({ ...journalForm, items: updated });
                        }}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-2 border-t font-mono text-xs font-bold">
                  <span>Total Equation</span>
                  <div className="flex gap-4">
                    <span className="text-emerald-600">DR: ₹{totalDebit.toFixed(2)}</span>
                    <span className="text-rose-600">CR: ₹{totalCredit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsJournalModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={createJournalMutation.isPending || !isJournalBalanced || !journalForm.description}
                onClick={() => createJournalMutation.mutate(journalForm)}
                className="bg-primary text-primary-foreground"
              >
                {createJournalMutation.isPending ? "Posting..." : "Post Balanced Entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: BANK TRANSFER */}
        <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="size-4 text-primary" /> Internal Bank / Cash Transfer
              </DialogTitle>
              <DialogDescription className="text-xs">
                Transfer funds between checking, savings, and petty cash vaults with double-entry audit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>From Account</Label>
                  <Select
                    value={transferForm.fromAccount}
                    onValueChange={(val) => setTransferForm({ ...transferForm, fromAccount: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Source Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a: any) => a.accountType === "asset")
                        .map((a: any) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            {a.accountCode} - {a.accountName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>To Account</Label>
                  <Select
                    value={transferForm.toAccount}
                    onValueChange={(val) => setTransferForm({ ...transferForm, toAccount: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Target Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a: any) => a.accountType === "asset")
                        .map((a: any) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            {a.accountCode} - {a.accountName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Transfer Amount (₹) *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 25000"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label>Reference Note</Label>
                <Input
                  placeholder="e.g. Weekly Petty Cash Replenishment"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={
                  transferMutation.isPending ||
                  !transferForm.amount ||
                  parseFloat(transferForm.amount) <= 0 ||
                  transferForm.fromAccount === transferForm.toAccount
                }
                onClick={() => transferMutation.mutate(transferForm)}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {transferMutation.isPending ? "Executing Transfer..." : "Process Transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 4: ACCOUNT GENERAL LEDGER REGISTER */}
        <Dialog open={!!selectedLedgerAccount} onOpenChange={(open) => !open && setSelectedLedgerAccount(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="size-4 text-primary" />
                    Account Ledger Statement: {ledgerStatement?.account?.accountName} ({ledgerStatement?.account?.accountCode})
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Historical double-entry voucher audit register with real-time running balance.
                  </DialogDescription>
                </div>
                {ledgerStatement?.account && (
                  <Badge variant="secondary" className="capitalize text-xs font-bold font-mono">
                    {ledgerStatement.account.accountType} • {ledgerStatement.account.category?.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {isLedgerLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
                Loading live ledger postings from MySQL...
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto flex-1 py-2">
                {/* Summary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Debits</span>
                    <div className="text-sm font-black font-mono text-emerald-600 mt-0.5">
                      {formatSystemAmount(ledgerStatement?.summary?.totalDebit || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Credits</span>
                    <div className="text-sm font-black font-mono text-rose-600 mt-0.5">
                      {formatSystemAmount(ledgerStatement?.summary?.totalCredit || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Closing Balance</span>
                    <div className="text-sm font-black font-mono text-primary mt-0.5">
                      {formatSystemAmount(ledgerStatement?.summary?.closingBalance || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Transactions</span>
                    <div className="text-sm font-black font-mono mt-0.5">
                      {ledgerStatement?.summary?.transactionCount ?? 0} Vouchers
                    </div>
                  </div>
                </div>

                {/* Ledger Register Table */}
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Voucher #</th>
                        <th className="p-2.5">Ref / Source</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Offset / Counter-Account</th>
                        <th className="p-2.5 text-right">Debit (DR)</th>
                        <th className="p-2.5 text-right">Credit (CR)</th>
                        <th className="p-2.5 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono text-[11px]">
                      {ledgerStatement?.transactions?.length > 0 ? (
                        ledgerStatement.transactions.map((txn: any) => (
                          <tr key={txn.id} className="hover:bg-muted/20 font-sans">
                            <td className="p-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{txn.entryDate}</td>
                            <td className="p-2.5 font-mono font-bold text-primary whitespace-nowrap">{txn.entryNumber}</td>
                            <td className="p-2.5 font-mono text-[10px] text-muted-foreground">{txn.reference || txn.referenceType || "manual"}</td>
                            <td className="p-2.5 text-foreground max-w-xs truncate">{txn.description}</td>
                            <td className="p-2.5 text-muted-foreground text-[11px] italic max-w-[150px] truncate">{txn.counterAccount}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                              {txn.debit > 0 ? formatSystemAmount(txn.debit) : "—"}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                              {txn.credit > 0 ? formatSystemAmount(txn.credit) : "—"}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-foreground">
                              {formatSystemAmount(txn.runningBalance)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-xs text-muted-foreground italic">
                            No journal transactions posted to this ledger account yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter className="border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setSelectedLedgerAccount(null)}>
                Close Statement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
export default AccountingAppSuite;
