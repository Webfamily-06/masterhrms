import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { StatsOverviewGrid } from "@/components/ui/stats-overview-grid";
import { StatCard } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { EmptyState } from "@/components/system-states/empty-state";

export const Route = createFileRoute("/_authenticated/_app/expenses-report")({
  component: ExpensesReportPage,
  head: () => ({
    meta: [{ title: "Expense Report — Master HRMS" }],
  }),
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

  // Aggregate Metrics (preserved exactly from original)
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
      <PageHeader
        title="Expense Report"
        description="Monitor staff expense claims, approval lifecycles, and reimbursement statuses."
        breadcrumbs={[
          { label: "Reports", href: "/expenses-report" },
          { label: "Expense Report" },
        ]}
        actions={
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <Download className="size-3.5 text-muted-foreground" />
            Export CSV
          </Button>
        }
      />

      {/* KPI Overview Grid */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Expenses"
          value={`${currencySymbol}${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<Receipt className="size-4" />}
          description={`${claims.length} claims logged to date`}
          variant="default"
        />
        <StatCard
          label="Approved / Settled"
          value={`${currencySymbol}${approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<CheckCircle2 className="size-4" />}
          description={`${totalAmount > 0 ? Math.round((approvedAmount / totalAmount) * 100) : 0}% completion rate`}
          variant="success"
        />
        <StatCard
          label="Pending Review"
          value={`${currencySymbol}${pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<Clock className="size-4" />}
          description={`${claims.filter((c) => c.status === "pending").length} claims awaiting review`}
          variant="warning"
        />
        <StatCard
          label="Rejected Claims"
          value={`${currencySymbol}${rejectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<XCircle className="size-4" />}
          description={`${claims.filter((c) => c.status === "rejected").length} claims flagged or declined`}
          variant="rose"
        />
      </StatsOverviewGrid>

      {/* Filter Toolbar */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search code, staff, vendor...",
        }}
        filters={
          <>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-8.5 text-xs">
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
              <SelectTrigger className="w-[150px] h-8.5 text-xs">
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
          </>
        }
      />

      {/* Main Expense Table Card */}
      <Card className="border border-border/80 shadow-2xs overflow-hidden">
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
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span>Loading expense claims...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClaims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={Receipt}
                        title="No expense claims found"
                        description="No expense records match your current search or filter criteria."
                        compact
                      />
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
