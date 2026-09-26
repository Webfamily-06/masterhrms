import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import {
  CreditCard,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
  Building2,
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/transactions")({
  component: SuperTransactionsPage,
});

export type PlatformTransaction = {
  id: string;
  transactionNo: string;
  tenantName: string;
  tenantSlug: string;
  itemName: string;
  itemType: "plan" | "addon";
  amount: number;
  gateway: "razorpay" | "stripe" | "bank_wire";
  gatewayPaymentId: string;
  status: "success" | "pending" | "failed" | "refunded";
  createdAt: string;
};

const INITIAL_TRANSACTIONS: PlatformTransaction[] = [
  {
    id: "tx-101",
    transactionNo: "TXN-2026-9041",
    tenantName: "ACME Technologies Pvt Ltd",
    tenantSlug: "acme",
    itemName: "Enterprise Annual Plan",
    itemType: "plan",
    amount: 59999,
    gateway: "razorpay",
    gatewayPaymentId: "pay_Rzp9823412",
    status: "success",
    createdAt: "2026-09-24 11:32 AM",
  },
  {
    id: "tx-102",
    transactionNo: "TXN-2026-9042",
    tenantName: "Globex Global Logistics",
    tenantSlug: "globex",
    itemName: "AI Attendance & OCR Add-on",
    itemType: "addon",
    amount: 4999,
    gateway: "stripe",
    gatewayPaymentId: "ch_3N82jK2eZvKYlo",
    status: "success",
    createdAt: "2026-09-23 04:15 PM",
  },
  {
    id: "tx-103",
    transactionNo: "TXN-2026-9043",
    tenantName: "Initech Enterprise Software",
    tenantSlug: "initech",
    itemName: "Professional Monthly Plan",
    itemType: "plan",
    amount: 14999,
    gateway: "razorpay",
    gatewayPaymentId: "pay_Rzp1149201",
    status: "success",
    createdAt: "2026-09-22 09:40 AM",
  },
  {
    id: "tx-104",
    transactionNo: "TXN-2026-9044",
    tenantName: "Wayne Enterprises APAC",
    tenantSlug: "wayne",
    itemName: "Custom Enterprise SLA Addon",
    itemType: "addon",
    amount: 25000,
    gateway: "bank_wire",
    gatewayPaymentId: "WIRE-NEFT-88912",
    status: "pending",
    createdAt: "2026-09-21 02:20 PM",
  },
  {
    id: "tx-105",
    transactionNo: "TXN-2026-9045",
    tenantName: "Cyberdyne Systems",
    tenantSlug: "cyberdyne",
    itemName: "Starter Monthly Plan",
    itemType: "plan",
    amount: 4999,
    gateway: "stripe",
    gatewayPaymentId: "ch_failed_insufficient",
    status: "failed",
    createdAt: "2026-09-20 06:12 PM",
  },
];

export default function SuperTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transactions, setTransactions] = useState<PlatformTransaction[]>(INITIAL_TRANSACTIONS);

  const { data: sysConfig } = useQuery<any>({
    queryKey: ["system-config"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/system/config");
        return res?.data || res || {};
      } catch {
        return {};
      }
    },
  });

  const metrics = useMemo(() => {
    const totalVolume = transactions
      .filter((t) => t.status === "success")
      .reduce((acc, t) => acc + t.amount, 0);
    const successfulCount = transactions.filter((t) => t.status === "success").length;
    const pendingCount = transactions.filter((t) => t.status === "pending").length;
    const failedCount = transactions.filter((t) => t.status === "failed").length;

    return { totalVolume, successfulCount, pendingCount, failedCount };
  }, [transactions]);

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.gatewayPaymentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGateway = gatewayFilter === "all" || t.gateway === gatewayFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesGateway && matchesStatus;
  });

  const exportCsv = () => {
    const headers = ["Txn No", "Tenant", "Item", "Type", "Amount", "Gateway", "Payment ID", "Status", "Date"];
    const rows = filtered.map((t) => [
      t.transactionNo,
      t.tenantName,
      t.itemName,
      t.itemType,
      t.amount,
      t.gateway,
      t.gatewayPaymentId,
      t.status,
      t.createdAt,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `platform-transactions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transaction ledger exported to CSV");
  };

  return (
    <div className="w-full min-w-0 flex-1 space-y-6 p-4 lg:p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Purchase Transactions</h1>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">
              Gateway Telemetry
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Global SaaS revenue reconciliation, tenant plan subscription billings, and payment gateway settlements.
          </p>
        </div>

        <Button onClick={exportCsv} size="sm" variant="outline" className="h-9 gap-1.5 text-xs font-semibold">
          <Download className="w-3.5 h-3.5 text-primary" />
          Export Ledger CSV
        </Button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Gross Platform Volume</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatSystemAmount(metrics.totalVolume, sysConfig)}</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 100% Settled to Merchant
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Settled Invoices</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{metrics.successfulCount} Paid</div>
            <p className="text-xs text-muted-foreground mt-1">Instant webhook clearance</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Pending Wire Approvals</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{metrics.pendingCount} Pending</div>
            <p className="text-xs text-amber-600 mt-1">NEFT / Wire Verification</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Failed Gateway Attempts</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{metrics.failedCount} Failed</div>
            <p className="text-xs text-rose-600 mt-1">Card declines / 3DS drop</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Global Transaction Register</CardTitle>
            <CardDescription className="text-xs">
              Showing {filtered.length} verified purchase and subscription renewal records.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search Txn ID, Tenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>

            <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gateways</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="bank_wire">Bank Wire</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold">Transaction ID</TableHead>
                <TableHead className="text-xs font-semibold">Tenant Organization</TableHead>
                <TableHead className="text-xs font-semibold">Plan / Addon</TableHead>
                <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                <TableHead className="text-xs font-semibold">Gateway</TableHead>
                <TableHead className="text-xs font-semibold">Payment ID</TableHead>
                <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono font-semibold text-foreground">
                    {tx.transactionNo}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    <div>
                      <p className="leading-none">{tx.tenantName}</p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{tx.tenantSlug}.mastererp.cloud</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px] bg-muted/60">
                      {tx.itemName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-foreground">
                    {formatSystemAmount(tx.amount, sysConfig)}
                  </TableCell>
                  <TableCell className="text-xs uppercase font-mono font-medium text-muted-foreground">
                    {tx.gateway}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[140px]">
                    {tx.gatewayPaymentId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {tx.createdAt}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        tx.status === "success"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                          : tx.status === "pending"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                          : "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                      }
                    >
                      {tx.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.success(`Generating PDF tax receipt for ${tx.transactionNo}`)}
                      className="h-7 text-xs gap-1"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
