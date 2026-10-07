import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  FileText,
  Download,
  DollarSign,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  Copy,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { StatsOverviewGrid } from "@/components/ui/stats-overview-grid";
import { StatCard } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { EmptyState } from "@/components/system-states/empty-state";

export const Route = createFileRoute("/_authenticated/_app/invoice-report")({
  component: InvoiceReportPage,
  head: () => ({
    meta: [{ title: "Invoice & Revenue Report — Master HRMS" }],
  }),
});

export function InvoiceReportPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Fetch invoices from backend
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices-report", tenantId],
    queryFn: async () => {
      const res = await api.get("/invoices");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Filtered dataset
  const filteredData = useMemo(() => {
    return invoices.filter((inv: any) => {
      const client = (inv.client || "").toLowerCase();
      const num = (inv.number || inv.invoiceNo || "").toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch = !search || client.includes(q) || num.includes(q);

      const status = (inv.status || "").toLowerCase();
      const isPaid = status === "paid" || Number(inv.balanceDue || 0) <= 0;
      const isOverdue =
        !isPaid && inv.dueDate && new Date(inv.dueDate) < new Date();

      let matchesStatus = true;
      if (selectedStatus === "paid") matchesStatus = isPaid;
      if (selectedStatus === "unpaid") matchesStatus = !isPaid && !isOverdue;
      if (selectedStatus === "overdue") matchesStatus = isOverdue;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, selectedStatus]);

  // Aggregate KPI metrics (preserved exactly from original)
  const metrics = useMemo(() => {
    let totalInvoices = invoices.length;
    let paidCount = 0;
    let overdueCount = 0;
    let unpaidCount = 0;
    let totalRevenue = 0;
    let totalOutstanding = 0;

    const now = new Date();

    invoices.forEach((inv: any) => {
      const total = Number(inv.total || 0);
      const paidAmt = Number(inv.paidAmount || 0);
      const balance = Number(inv.balanceDue !== undefined ? inv.balanceDue : total - paidAmt);
      const isPaid = inv.status === "paid" || balance <= 0;
      const isOverdue = !isPaid && inv.dueDate && new Date(inv.dueDate) < now;

      totalRevenue += paidAmt > 0 ? paidAmt : (isPaid ? total : 0);
      totalOutstanding += Math.max(0, balance);

      if (isPaid) {
        paidCount++;
      } else if (isOverdue) {
        overdueCount++;
      } else {
        unpaidCount++;
      }
    });

    return {
      totalInvoices,
      paidCount,
      overdueCount,
      unpaidCount,
      totalRevenue,
      totalOutstanding,
    };
  }, [invoices]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error("No invoices available to export.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Client Name",
      "GSTIN",
      "Created Date",
      "Due Date",
      "Subtotal",
      "Tax Amount",
      "Total Amount",
      "Paid Amount",
      "Balance Due",
      "Status",
    ];

    const rows = filteredData.map((inv: any) => {
      return [
        `"${inv.number || inv.invoiceNo || "N/A"}"`,
        `"${inv.client || "Walk-in"}"`,
        `"${inv.clientGstin || inv.client_gstin || "N/A"}"`,
        `"${inv.date ? new Date(inv.date).toLocaleDateString() : "N/A"}"`,
        `"${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "N/A"}"`,
        inv.subtotal || 0,
        inv.totalGst || inv.total_gst || 0,
        inv.total || 0,
        inv.paidAmount || 0,
        inv.balanceDue || 0,
        `"${inv.status || "sent"}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoice-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Invoice report exported successfully!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice & Revenue Report"
        description="Monitor client billing, cash collection cycles, tax invoices, and outstanding receivables."
        breadcrumbs={[
          { label: "Sales & Billing", href: "/invoices" },
          { label: "Reports", href: "/invoice-report" },
          { label: "Invoice Report" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <Download className="size-3.5 text-muted-foreground" />
              Export CSV
            </Button>
            <Button asChild size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-2xs">
              <Link to="/invoices">
                <Receipt className="size-3.5" />
                Manage Invoices
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Visual Cards */}
      <StatsOverviewGrid columns={5}>
        <StatCard
          label="Total Invoices"
          value={metrics.totalInvoices}
          icon={<FileText className="size-4" />}
          description="Generated across all clients"
          variant="default"
        />
        <StatCard
          label="Paid Invoices"
          value={metrics.paidCount}
          icon={<CheckCircle2 className="size-4" />}
          description="Fully cleared payments"
          variant="success"
        />
        <StatCard
          label="Overdue Invoices"
          value={metrics.overdueCount}
          icon={<AlertTriangle className="size-4" />}
          description="Requires payment follow-up"
          variant="rose"
        />
        <StatCard
          label="Pending Payments"
          value={metrics.unpaidCount}
          icon={<Clock className="size-4" />}
          description="Awaiting due dates"
          variant="warning"
        />
        <StatCard
          label="Total Revenue"
          value={formatSystemAmount(metrics.totalRevenue)}
          icon={<DollarSign className="size-4" />}
          description={`Outstanding: ${formatSystemAmount(metrics.totalOutstanding)}`}
          variant="info"
        />
      </StatsOverviewGrid>

      {/* Filter Toolbar */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search invoice no, client...",
        }}
        filters={
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px] h-8.5 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Invoices Table Card */}
      <Card className="border border-border/80 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-32 text-xs font-semibold pl-5">Invoice ID</TableHead>
                  <TableHead className="text-xs font-semibold">Client & Company</TableHead>
                  <TableHead className="text-xs font-semibold">Created Date</TableHead>
                  <TableHead className="text-xs font-semibold">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Invoice Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Balance Due</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-center pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span>Loading invoice registry...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={Receipt}
                        title="No invoices found"
                        description="Try adjusting your search or status filter criteria."
                        compact
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((inv: any) => {
                    const invNo = inv.number || inv.invoiceNo || `INV-${inv.id?.slice(0, 6)}`;
                    const clientName = inv.client || "Walk-in Customer";
                    const isPaid = inv.status === "paid" || Number(inv.balanceDue || 0) <= 0;
                    const isOverdue = !isPaid && inv.dueDate && new Date(inv.dueDate) < new Date();

                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3 pl-5 font-mono text-xs font-bold text-primary">
                          <Link to={`/portal/invoices/${invNo}` as any} className="hover:underline">
                            {invNo}
                          </Link>
                        </TableCell>

                        <TableCell className="py-3">
                          <p className="text-xs font-bold text-foreground">{clientName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {inv.clientGstin || inv.client_gstin ? `GST: ${inv.clientGstin || inv.client_gstin}` : "B2C Consumer"}
                          </p>
                        </TableCell>

                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {inv.date ? new Date(inv.date).toLocaleDateString() : "—"}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                        </TableCell>

                        <TableCell className="py-3 text-right text-xs font-bold text-foreground">
                          {formatSystemAmount(inv.total || 0)}
                        </TableCell>

                        <TableCell className="py-3 text-right text-xs font-medium text-rose-500">
                          {formatSystemAmount(inv.balanceDue !== undefined ? inv.balanceDue : (isPaid ? 0 : inv.total || 0))}
                        </TableCell>

                        <TableCell className="py-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-bold"
                                : isOverdue
                                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-bold"
                                : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-bold"
                            }
                          >
                            {isPaid ? "Paid" : isOverdue ? "Overdue" : "Sent"}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-center pr-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(inv)}
                            className="h-8 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Eye className="size-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Detail Passport Modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between border-b pb-3">
              <span className="flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                Invoice #{selectedInvoice?.number || selectedInvoice?.invoiceNo}
              </span>
              <Badge
                variant="outline"
                className={
                  selectedInvoice?.status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-300"
                }
              >
                {selectedInvoice?.status === "paid" ? "Paid" : "Sent / Pending"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 text-xs">
              <div className="bg-muted/40 p-3.5 rounded-lg border border-border/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{selectedInvoice.client || "Client"}</h4>
                  <p className="text-muted-foreground">GSTIN: {selectedInvoice.clientGstin || "N/A"}</p>
                  <p className="text-muted-foreground">{selectedInvoice.clientAddress || "Address on file"}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Issue Date</span>
                  <span className="text-xs font-bold text-foreground">
                    {selectedInvoice.date ? new Date(selectedInvoice.date).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>

              <div className="border border-border/60 rounded-lg p-3.5 space-y-2 bg-background">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatSystemAmount(selectedInvoice.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes (CGST/SGST/IGST):</span>
                  <span className="font-medium">{formatSystemAmount(selectedInvoice.totalGst || 0)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2 text-foreground text-sm">
                  <span>Grand Total:</span>
                  <span>{formatSystemAmount(selectedInvoice.total || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-500">
                  <span>Balance Due:</span>
                  <span>
                    {formatSystemAmount(
                      selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : selectedInvoice.total || 0
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t pt-3 flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedInvoice) {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/portal/invoices/${selectedInvoice.number || selectedInvoice.invoiceNo}`
                  );
                  toast.success("B2B Invoice portal link copied to clipboard!");
                }
              }}
              className="gap-1.5"
            >
              <Copy className="size-3.5" />
              Copy Portal Link
            </Button>
            <Button size="sm" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
