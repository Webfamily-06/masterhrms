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
  CreditCard,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Building,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/payment-report")({
  component: PaymentReportPage,
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

  // Calculations
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
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Payment Report
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Reports</span>
            <span>/</span>
            <span className="text-foreground font-medium">Payment Report</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-blue-600" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Collected
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {currencySymbol}
                  {totalSettled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-emerald-600 font-medium flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {paymentCount} settlements
              </span>{" "}
              processed across accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Settled Invoices
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {paymentCount}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-emerald-600 font-medium">100%</span> verified gateway / cash settlements
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-rose-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Failed Gateway Attempts
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {failedCount}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-rose-600 font-medium">Gateway drops</span> recorded
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-purple-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Success Rate
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {successRate}%
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-purple-600 font-medium">High</span> payment conversion health
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Methods Breakdown Card */}
      {Object.keys(methodDist).length > 0 && (
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Payments By Method
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(methodDist).map(([method, amount]) => (
                <div key={method} className="bg-muted/40 p-3 rounded-md border border-border/60">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{method}</p>
                  <p className="text-base font-bold mt-0.5">
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

      {/* Main Payment Table Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Settlement Receipts</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filtered.length} records
              </Badge>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoice, customer, ref..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-32 text-xs font-semibold">Payment Ref</TableHead>
                  <TableHead className="text-xs font-semibold">Invoice No</TableHead>
                  <TableHead className="text-xs font-semibold">Customer / Client</TableHead>
                  <TableHead className="text-xs font-semibold">Payment Method</TableHead>
                  <TableHead className="text-xs font-semibold">Paid Date</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount Paid</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      Loading payment records...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No payment settlements found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {payment.referenceNo}
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        {payment.sale?.invoiceNo || "INV-GEN"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">
                          {payment.sale?.customerName || "Customer"}
                        </div>
                        {payment.sale?.customerEmail && (
                          <div className="text-[11px] text-muted-foreground">
                            {payment.sale.customerEmail}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {payment.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(payment.paidAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {currencySymbol}
                        {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
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
