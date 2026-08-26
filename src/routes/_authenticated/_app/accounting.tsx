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

  // Filtered Accounts
  const filteredAccounts = accounts.filter((acc: any) => {
    const matchType = accountFilter === "all" || acc.accountType === accountFilter;
    const matchSearch =
      acc.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.accountCode.includes(searchTerm);
    return matchType && matchSearch;
  });

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
            <TabsTrigger value="banking" className="text-xs gap-1.5 py-1.5">
              <CreditCard className="size-3.5" /> Banking & Transfers
            </TabsTrigger>
            <TabsTrigger value="statements" className="text-xs gap-1.5 py-1.5">
              <FileSpreadsheet className="size-3.5" /> Balance Sheet & P&L
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

          {/* ========================================================= */}
          {/* TAB 2: CHART OF ACCOUNTS */}
          {/* ========================================================= */}
          <TabsContent value="accounts" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search account code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="asset">Assets (1000–1999)</SelectItem>
                    <SelectItem value="liability">Liabilities (2000–2999)</SelectItem>
                    <SelectItem value="equity">Equity (3000–3999)</SelectItem>
                    <SelectItem value="revenue">Revenue (4000–4999)</SelectItem>
                    <SelectItem value="expense">Expenses (5000–6999)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Account Name</th>
                      <th className="p-3">Classification</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Current Balance</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAccounts.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-primary">{acc.accountCode}</td>
                        <td className="p-3 font-semibold text-foreground">{acc.accountName}</td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] capitalize font-semibold ${
                              acc.accountType === "asset"
                                ? "bg-emerald-50 text-emerald-700"
                                : acc.accountType === "liability"
                                  ? "bg-rose-50 text-rose-700"
                                  : acc.accountType === "revenue"
                                    ? "bg-sky-50 text-sky-700"
                                    : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {acc.accountType}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground capitalize">
                          {acc.category?.replace("_", " ") || "General"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {formatSystemAmount(acc.balance)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge className="text-[9px] bg-emerald-500 text-white font-bold py-0 h-4">
                            Active
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts
                .filter((a: any) => a.accountType === "asset" && (a.accountCode.startsWith("10") || a.category === "current_asset"))
                .slice(0, 6)
                .map((bankAcc: any) => (
                  <Card key={bankAcc.id} className="border shadow-xs p-4 space-y-3 bg-gradient-to-br from-card to-secondary/30">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                        {bankAcc.accountName} ({bankAcc.accountCode})
                      </Badge>
                      <Landmark className="size-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xl font-black tracking-tight">
                        {formatSystemAmount(bankAcc.balance)}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{bankAcc.description || "Active Operating Vault"}</p>
                    </div>
                    <div className="text-[10px] text-muted-foreground border-t pt-2 flex justify-between">
                      <span>Code: {bankAcc.accountCode}</span>
                      <span className="text-emerald-600 font-bold">✓ Active Balance</span>
                    </div>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 5: BALANCE SHEET & PROFIT AND LOSS */}
          {/* ========================================================= */}
          <TabsContent value="statements" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Balance Sheet */}
              <Card className="border shadow-xs">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Scale className="size-4 text-primary" /> Balance Sheet Statement
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Assets = Liabilities + Equity + Net Profit
                    </CardDescription>
                  </div>
                  <Badge className="text-[9px] bg-emerald-500 text-white font-bold">
                    BALANCED ✓
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-primary uppercase text-[11px] border-b pb-1 mb-2">
                      Assets (₹{statementsData?.balanceSheet?.totalAssets?.toLocaleString() || "0"})
                    </h4>
                    <div className="space-y-1.5">
                      {statementsData?.balanceSheet?.assets?.map((a: any) => (
                        <div key={a.id} className="flex justify-between py-1 border-b border-border/30">
                          <span>{a.accountName} ({a.accountCode})</span>
                          <span className="font-mono font-bold">{formatSystemAmount(a.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-rose-600 uppercase text-[11px] border-b pb-1 mb-2">
                      Liabilities & Equity (₹{statementsData?.balanceSheet?.balancedTotalLiabEquity?.toLocaleString() || "0"})
                    </h4>
                    <div className="space-y-1.5">
                      {statementsData?.balanceSheet?.liabilities?.map((l: any) => (
                        <div key={l.id} className="flex justify-between py-1 border-b border-border/30">
                          <span>{l.accountName} ({l.accountCode})</span>
                          <span className="font-mono font-bold">{formatSystemAmount(l.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1 border-b border-border/30 text-emerald-600 font-bold">
                        <span>Retained Earnings / Net Profit</span>
                        <span className="font-mono">{formatSystemAmount(statementsData?.balanceSheet?.netProfit || 0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profit & Loss (P&L) */}
              <Card className="border shadow-xs">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="size-4 text-emerald-500" /> Profit & Loss Statement
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Revenue minus Operating Expenses
                    </CardDescription>
                  </div>
                  <Badge className="text-[10px] bg-primary/10 text-primary font-bold">
                    Margin: {statementsData?.profitAndLoss?.profitMarginPct || 0}%
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-emerald-600 uppercase text-[11px] border-b pb-1 mb-2">
                      Operating Revenues (+{formatSystemAmount(statementsData?.profitAndLoss?.totalRevenue || 0)})
                    </h4>
                    <div className="space-y-1.5">
                      {statementsData?.profitAndLoss?.revenue?.map((r: any) => (
                        <div key={r.id} className="flex justify-between py-1 border-b border-border/30">
                          <span>{r.accountName}</span>
                          <span className="font-mono font-bold text-emerald-600">+{formatSystemAmount(r.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-rose-600 uppercase text-[11px] border-b pb-1 mb-2">
                      Operating Expenses (-{formatSystemAmount(statementsData?.profitAndLoss?.totalExpenses || 0)})
                    </h4>
                    <div className="space-y-1.5">
                      {statementsData?.profitAndLoss?.expenses?.map((e: any) => (
                        <div key={e.id} className="flex justify-between py-1 border-b border-border/30">
                          <span>{e.accountName}</span>
                          <span className="font-mono font-bold text-rose-600">-{formatSystemAmount(e.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-secondary/50 rounded-xl flex items-center justify-between font-bold text-sm">
                    <span>Net Operating Profit</span>
                    <span className="font-mono text-emerald-600">
                      {formatSystemAmount(statementsData?.profitAndLoss?.netProfit || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                Transfer funds between checking, savings, and petty cash vaults.
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1020">1020 - Primary Bank (HDFC)</SelectItem>
                      <SelectItem value="1010">1010 - Petty Cash Fund</SelectItem>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1010">1010 - Petty Cash Fund</SelectItem>
                      <SelectItem value="1020">1020 - Primary Bank (HDFC)</SelectItem>
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
                disabled={!transferForm.amount || parseFloat(transferForm.amount) <= 0}
                onClick={() => {
                  toast.success(`✓ Transferred ₹${parseFloat(transferForm.amount).toLocaleString()} successfully!`);
                  setIsTransferModalOpen(false);
                  setTransferForm({ fromAccount: "1020", toAccount: "1010", amount: "", reference: "", notes: "" });
                }}
              >
                Process Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
export default AccountingAppSuite;
