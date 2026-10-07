import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CreditCard,
  Download,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { StatsOverviewGrid } from "@/components/ui/stats-overview-grid";
import { StatCard } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { EmptyState } from "@/components/system-states/empty-state";

export const Route = createFileRoute("/_authenticated/_app/payment-report")({
  component: PaymentReportPage,
  head: () => ({
    meta: [{ title: "Payment Report — Master HRMS" }],
  }),
});

interface PaymentItem {
  id: string;
  amount: number;
  method: string;
  referenceNo?: string;
  notes?: string;
  paidAt: string;
  sale?: {
    id: string;
    invoiceNo: string;
    customerName: string;
    customerEmail?: string;
    total: number;
    status: string;
  };
}

export function PaymentReportPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  // Filter states
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

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

  // Fetch Payments from backend
  const { data: rawPayments = [], isLoading } = useQuery({
    queryKey: ["payments-report", tenantId, methodFilter],
    queryFn: async () => {
      try {
        const query = new URLSearchParams();
        if (methodFilter !== "all") query.set("method", methodFilter);
        const qStr = query.toString();
        const res: any = await api.get(`/payments${qStr ? `?${qStr}` : ""}`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Razorpay metrics
  const { data: gatewayData } = useQuery({
    queryKey: ["payments-gateway-metrics", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/payments/razorpay/transactions");
      } catch {
        return null;
      }
    },
  });

  const payments: PaymentItem[] = useMemo(() => {
    return rawPayments.map((p: any) => ({
      id: p.id,
      amount: Number(p.amount) || 0,
      method: p.method || "Cash",
      referenceNo: p.referenceNo || `TXN-${String(p.id).slice(0, 8).toUpperCase()}`,
      notes: p.notes,
      paidAt: p.paidAt || new Date().toISOString(),
      sale: p.sale,
    }));
  }, [rawPayments]);

  // Client search filtering
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.referenceNo?.toLowerCase().includes(search.toLowerCase()) ||
        p.method.toLowerCase().includes(search.toLowerCase()) ||
        (p.sale?.invoiceNo && p.sale.invoiceNo.toLowerCase().includes(search.toLowerCase())) ||
        (p.sale?.customerName && p.sale.customerName.toLowerCase().includes(search.toLowerCase()));

      return matchSearch;
    });
  }, [payments, search]);

  // Calculations (preserved exactly from original)
  const totalSettled = payments.reduce((acc, p) => acc + p.amount, 0);
  const paymentCount = payments.length;
  const failedCount = gatewayData?.metrics?.failed || 0;
  const totalTransactionsCount = paymentCount + failedCount;
  const successRate = totalTransactionsCount > 0 ? Math.round((paymentCount / totalTransactionsCount) * 100) : 100;

  // Method distributions
  const methodDist = useMemo(() => {
    const counts: Record<string, number> = {};
    payments.forEach((p) => {
      const m = p.method || "Other";
      counts[m] = (counts[m] || 0) + p.amount;
    });
    return counts;
  }, [payments]);

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No payments to export");
    const headers = [
      "Payment ID / Ref",
      "Invoice No",
      "Customer Name",
      "Payment Method",
      "Payment Date",
      "Amount Paid",
      "Notes",
    ];

    const rows = filtered.map((p) => [
      `"${p.referenceNo || p.id}"`,
      `"${p.sale?.invoiceNo || "N/A"}"`,
      `"${(p.sale?.customerName || "Customer").replace(/"/g, '""')}"`,
      `"${p.method}"`,
      new Date(p.paidAt).toISOString().slice(0, 10),
      p.amount,
      `"${(p.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: (string | number)[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `payment-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payment report exported successfully!");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Report"
        description="Track customer transaction settlements, payment channels, and gateway conversion metrics."
        breadcrumbs={[
          { label: "Reports", href: "/payment-report" },
          { label: "Payment Report" },
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
          label="Total Collected"
          value={`${currencySymbol}${totalSettled.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<CreditCard className="size-4" />}
          description={`${paymentCount} settlements processed across accounts`}
          variant="default"
        />
        <StatCard
          label="Settled Invoices"
          value={paymentCount}
          icon={<CheckCircle2 className="size-4" />}
          description="100% verified gateway / cash settlements"
          variant="success"
        />
        <StatCard
          label="Failed Gateway Attempts"
          value={failedCount}
          icon={<AlertTriangle className="size-4" />}
          description="Gateway drops recorded"
          variant="rose"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={<TrendingUp className="size-4" />}
          description="High payment conversion health"
          variant="purple"
        />
      </StatsOverviewGrid>

      {/* Methods Breakdown Card */}
      {Object.keys(methodDist).length > 0 && (
        <Card className="border border-border/80 shadow-2xs">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              Payments By Method
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(methodDist).map(([method, amount]) => (
                <div key={method} className="bg-muted/40 p-3 rounded-md border border-border/60">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{method}</p>
                  <p className="text-base font-bold mt-0.5 text-foreground">
                    {currencySymbol}
                    {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {totalSettled > 0 ? Math.round((amount / totalSettled) * 100) : 0}% of revenue
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Toolbar */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search invoice, customer, ref...",
        }}
        filters={
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[160px] h-8.5 text-xs">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank">Bank Transfer</SelectItem>
              <SelectItem value="Razorpay">Razorpay Gateway</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Main Payment Table Card */}
      <Card className="border border-border/80 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-32 text-xs font-semibold pl-5">Payment Ref</TableHead>
                  <TableHead className="text-xs font-semibold">Invoice No</TableHead>
                  <TableHead className="text-xs font-semibold">Customer / Client</TableHead>
                  <TableHead className="text-xs font-semibold">Payment Method</TableHead>
                  <TableHead className="text-xs font-semibold">Paid Date</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount Paid</TableHead>
                  <TableHead className="text-xs font-semibold text-center pr-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span>Loading payment records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={CreditCard}
                        title="No payment settlements found"
                        description="No payment transactions match the selected criteria."
                        compact
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3 pl-5 font-mono text-xs font-bold text-primary">
                        {payment.referenceNo}
                      </TableCell>
                      <TableCell className="py-3 font-medium text-xs">
                        {payment.sale?.invoiceNo || "INV-GEN"}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-medium text-xs text-foreground">
                          {payment.sale?.customerName || "Customer"}
                        </div>
                        {payment.sale?.customerEmail && (
                          <div className="text-[11px] text-muted-foreground">
                            {payment.sale.customerEmail}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {payment.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {new Date(payment.paidAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {currencySymbol}
                        {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-3 text-center pr-5">
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Captured
                        </Badge>
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
