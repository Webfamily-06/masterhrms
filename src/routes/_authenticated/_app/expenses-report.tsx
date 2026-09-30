import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Receipt,
  Download,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Building2,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/expenses-report")({
  component: ExpensesReportPage,
});

interface ExpenseClaimItem {
  id: string;
  claimCode: string;
  title: string;
  amount: number;
  status: string;
  merchant?: string;
  expenseDate?: string;
  createdAt: string;
  paymentMethod?: string;
  receiptUrl?: string;
  category?: {
    id: string;
    name: string;
    code: string;
  };
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    department?: {
      name: string;
    };
  };
}

export function ExpensesReportPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // System currency config
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const currencySymbol = sysConfig?.currencySymbol || "$";

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/expenses/categories");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Claims
  const { data: rawClaims = [], isLoading } = useQuery({
    queryKey: ["expense-claims", tenantId, statusFilter, categoryFilter],
    queryFn: async () => {
      try {
        const query = new URLSearchParams();
        if (statusFilter !== "all") query.set("status", statusFilter);
        if (categoryFilter !== "all") query.set("categoryId", categoryFilter);
        const qStr = query.toString();
        const res: any = await api.get(`/expenses/claims${qStr ? `?${qStr}` : ""}`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Summary Stats
  const { data: summary } = useQuery({
    queryKey: ["expenses-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/expenses/summary");
      } catch {
        return null;
      }
    },
  });

  const claims: ExpenseClaimItem[] = useMemo(() => {
    return rawClaims.map((c: any) => ({
      id: c.id,
      claimCode: c.claimCode || `EXP-${String(c.id).slice(0, 6).toUpperCase()}`,
      title: c.title || "Business Expense",
      amount: Number(c.amount) || 0,
      status: c.status || "pending",
      merchant: c.merchant || "Direct Vendor",
      expenseDate: c.expenseDate || c.createdAt,
      createdAt: c.createdAt,
      paymentMethod: c.paymentMethod || "Corporate Card",
      receiptUrl: c.receiptUrl,
      category: c.category,
      employee: c.employee,
    }));
  }, [rawClaims]);

  // Client search filter
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchSearch =
        c.claimCode.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.merchant && c.merchant.toLowerCase().includes(search.toLowerCase())) ||
        (c.employee &&
          `${c.employee.firstName} ${c.employee.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase())) ||
        (c.category && c.category.name.toLowerCase().includes(search.toLowerCase()));

      return matchSearch;
    });
  }, [claims, search]);

  // Aggregate Metrics
  const totalAmount = claims.reduce((acc, c) => acc + c.amount, 0);
  const approvedAmount = claims
    .filter((c) => ["manager_approved", "finance_approved", "reimbursed"].includes(c.status))
    .reduce((acc, c) => acc + c.amount, 0);
  const pendingAmount = claims
    .filter((c) => c.status === "pending")
    .reduce((acc, c) => acc + c.amount, 0);
  const rejectedAmount = claims
    .filter((c) => c.status === "rejected")
    .reduce((acc, c) => acc + c.amount, 0);

  function exportCSV() {
    if (filteredClaims.length === 0) return toast.error("No expenses to export");
    const headers = [
      "Claim Code",
      "Title",
      "Employee",
      "Department",
      "Category",
      "Merchant",
      "Date",
      "Payment Method",
      "Amount",
      "Status",
    ];

    const rows = filteredClaims.map((c) => [
      `"${c.claimCode}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : "N/A"}"`,
      `"${c.employee?.department?.name || "General"}"`,
      `"${c.category?.name || "Uncategorized"}"`,
      `"${(c.merchant || "").replace(/"/g, '""')}"`,
      c.expenseDate ? new Date(c.expenseDate).toISOString().slice(0, 10) : "",
      `"${c.paymentMethod}"`,
      c.amount,
      c.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: (string | number)[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `expense-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expense report exported successfully!");
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finance_approved":
      case "manager_approved":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Approved</Badge>;
      case "reimbursed":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">Reimbursed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
      default:
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Expense Report
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Reports</span>
            <span>/</span>
            <span className="text-foreground font-medium">Expense Report</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-blue-600" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Expenses
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {currencySymbol}
                  {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-emerald-600 font-medium flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {claims.length} claims
              </span>{" "}
              logged to date
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Approved / Settled
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {currencySymbol}
                  {approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-emerald-600 font-medium">
                {totalAmount > 0 ? Math.round((approvedAmount / totalAmount) * 100) : 0}%
              </span>{" "}
              approval completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-amber-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pending Review
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {currencySymbol}
                  {pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-amber-600 font-medium">
                {claims.filter((c) => c.status === "pending").length} claims
              </span>{" "}
              awaiting managerial review
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-rose-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rejected Claims
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {currencySymbol}
                  {rejectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-rose-600 font-medium">
                {claims.filter((c) => c.status === "rejected").length} claims
              </span>{" "}
              flagged or declined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Expense Table Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Expense Claims</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredClaims.length} records
              </Badge>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search code, staff, vendor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="manager_approved">Manager Approved</SelectItem>
                  <SelectItem value="finance_approved">Finance Approved</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-28 text-xs font-semibold">Claim Code</TableHead>
                  <TableHead className="text-xs font-semibold">Title / Description</TableHead>
                  <TableHead className="text-xs font-semibold">Staff Member</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Expense Date</TableHead>
                  <TableHead className="text-xs font-semibold">Payment / Merchant</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      Loading expense claims...
                    </TableCell>
                  </TableRow>
                ) : filteredClaims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No expense records found matching filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClaims.map((claim) => (
                    <TableRow key={claim.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {claim.claimCode}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{claim.title}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">
                          {claim.employee
                            ? `${claim.employee.firstName} ${claim.employee.lastName}`
                            : "N/A"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {claim.employee?.department?.name || "General"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          {claim.category?.name || "General"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {claim.expenseDate
                          ? new Date(claim.expenseDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">{claim.merchant}</div>
                        <div className="text-[11px] text-muted-foreground">{claim.paymentMethod}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {currencySymbol}
                        {claim.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(claim.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
