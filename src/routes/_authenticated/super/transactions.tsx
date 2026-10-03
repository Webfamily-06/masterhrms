import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Download, Eye, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/transactions")({
  component: SuperPurchaseTransactionsPage,
  head: () => ({ meta: [{ title: "Purchase Transaction List — Super Admin Console" }] }),
});

export type PurchaseTransaction = {
  id: string;
  invoiceId: string;
  customerName: string;
  customerEmail: string;
  companyLogo: string;
  createdAt: string;
  amount: number;
  paymentMethod: string;
  status: "Paid" | "Unpaid";
  planName: string;
};

function SuperPurchaseTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("Payment Method");
  const [statusFilter, setStatusFilter] = useState("Select Status");
  const [sortBy, setSortBy] = useState("Sort By : Last 7 Days");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewInvoice, setViewInvoice] = useState<PurchaseTransaction | null>(null);

  // 1. Fetch Real Transactions from DB
  const { data: rawTxns = [], isLoading } = useQuery<any[]>({
    queryKey: ["super-transactions-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/super/transactions");
        return Array.isArray(res) ? res : [];
      } catch (err) {
        console.error("Failed to fetch transactions", err);
        return [];
      }
    },
  });

  // Default transactions for standard presentation matching template
  const defaultList: PurchaseTransaction[] = useMemo(() => {
    const list: PurchaseTransaction[] = [
      {
        id: "tx-1",
        invoiceId: "INV001",
        customerName: "BrightWave Innovations",
        customerEmail: "michael@example.com",
        companyLogo: "/ui-assets/company/company-01.svg",
        createdAt: "12 Sep 2024",
        amount: 200,
        paymentMethod: "Credit Card",
        status: "Paid",
        planName: "Advanced (Monthly)",
      },
      {
        id: "tx-2",
        invoiceId: "INV002",
        customerName: "Stellar Dynamics",
        customerEmail: "sophie@example.com",
        companyLogo: "/ui-assets/company/company-02.svg",
        createdAt: "24 Oct 2024",
        amount: 450,
        paymentMethod: "Paypal",
        status: "Paid",
        planName: "Basic (Monthly)",
      },
      {
        id: "tx-3",
        invoiceId: "INV003",
        customerName: "Quantum Nexus",
        customerEmail: "cameron@example.com",
        companyLogo: "/ui-assets/company/company-03.svg",
        createdAt: "18 Feb 2024",
        amount: 600,
        paymentMethod: "Debit Card",
        status: "Paid",
        planName: "Enterprise (Yearly)",
      },
      {
        id: "tx-4",
        invoiceId: "INV004",
        customerName: "EcoVision Enterprises",
        customerEmail: "doris@example.com",
        companyLogo: "/ui-assets/company/company-04.svg",
        createdAt: "17 Oct 2024",
        amount: 320,
        paymentMethod: "Credit Card",
        status: "Unpaid",
        planName: "Advanced (Monthly)",
      },
      {
        id: "tx-5",
        invoiceId: "INV005",
        customerName: "Aurora Technologies",
        customerEmail: "thomas@example.com",
        companyLogo: "/ui-assets/company/company-05.svg",
        createdAt: "20 Jul 2024",
        amount: 150,
        paymentMethod: "Paypal",
        status: "Paid",
        planName: "Basic (Monthly)",
      },
      {
        id: "tx-6",
        invoiceId: "INV006",
        customerName: "BlueSky Technologies",
        customerEmail: "kathleen@example.com",
        companyLogo: "/ui-assets/company/company-06.svg",
        createdAt: "10 Apr 2024",
        amount: 780,
        paymentMethod: "Debit Card",
        status: "Paid",
        planName: "Enterprise (Monthly)",
      },
      {
        id: "tx-7",
        invoiceId: "INV007",
        customerName: "TerraFusion Energy",
        customerEmail: "bruce@example.com",
        companyLogo: "/ui-assets/company/company-07.svg",
        createdAt: "29 Aug 2024",
        amount: 240,
        paymentMethod: "Credit Card",
        status: "Paid",
        planName: "Enterprise (Monthly)",
      },
      {
        id: "tx-8",
        invoiceId: "INV008",
        customerName: "Epicurean Delights",
        customerEmail: "estelle@example.com",
        companyLogo: "/ui-assets/company/company-08.svg",
        createdAt: "22 Feb 2024",
        amount: 977,
        paymentMethod: "Paypal",
        status: "Paid",
        planName: "Premium (Yearly)",
      },
    ];

    if (rawTxns && rawTxns.length > 0) {
      return rawTxns.map((tx: any, idx: number) => ({
        id: tx.id,
        invoiceId: tx.transactionNo || `INV${String(idx + 1).padStart(3, "0")}`,
        customerName: tx.tenantName || "Enterprise Tenant",
        customerEmail: tx.customerEmail || `billing@${tx.tenantSlug || "tenant"}.com`,
        companyLogo: `/ui-assets/company/company-0${(idx % 5) + 1}.svg`,
        createdAt: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent",
        amount: Number(tx.amount) || 0,
        paymentMethod: tx.gateway === "stripe" ? "Credit Card" : tx.gateway === "razorpay" ? "Razorpay" : "Online Payment",
        status: (tx.status === "success" || tx.status === "verified" || tx.status === "paid" ? "Paid" : "Unpaid") as "Paid" | "Unpaid",
        planName: tx.itemName || "Enterprise Plan",
      }));
    }

    return [];
  }, [rawTxns]);

  // Filtered & Sorted transactions
  const filteredTransactions = useMemo(() => {
    return defaultList.filter((tx) => {
      const matchesSearch =
        !searchTerm ||
        tx.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMethod =
        paymentMethodFilter === "Payment Method" || tx.paymentMethod === paymentMethodFilter;

      const matchesStatus =
        statusFilter === "Select Status" || tx.status === statusFilter;

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [defaultList, searchTerm, paymentMethodFilter, statusFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTransactions.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Invoice ID", "Customer", "Email", "Date", "Amount", "Payment Method", "Status"];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.invoiceId}"`,
      `"${tx.customerName}"`,
      `"${tx.customerEmail}"`,
      `"${tx.createdAt}"`,
      `"$${tx.amount}"`,
      `"${tx.paymentMethod}"`,
      `"${tx.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transactions exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb & Top Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 page-breadcrumb">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-1">
            Purchase Transaction
          </h2>
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link to="/super" className="hover:text-primary transition-colors flex items-center">
                  <i className="ti ti-smart-home text-sm"></i>
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-600 dark:text-gray-400">Super Admin</li>
              <li>/</li>
              <li className="font-semibold text-gray-900 dark:text-gray-200">Purchase Transaction List</li>
            </ol>
          </nav>
        </div>

        {/* Right Toolbar: Export & Controls */}
        <div className="flex items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <i className="ti ti-file-export text-sm"></i>
                Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 text-xs">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2">
                <i className="ti ti-file-type-xls text-sm text-emerald-600"></i>
                Export as CSV / Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            className="size-8 rounded-md border border-border bg-white dark:bg-slate-900 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
            title="Collapse Header"
          >
            <i className="ti ti-chevrons-up text-sm"></i>
          </button>
        </div>
      </div>

      {/* ─── Main Transaction List Card ───────────────────────────────────── */}
      <div className="card bg-white dark:bg-slate-900 border border-border rounded-lg shadow-2xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Transaction List</h5>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Search className="size-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-border rounded-md w-44 sm:w-48 focus:outline-none"
              />
            </div>

            {/* Date Range Picker */}
            <div className="relative inline-flex items-center">
              <span className="absolute left-2.5 text-muted-foreground pointer-events-none">
                <i className="ti ti-calendar text-xs"></i>
              </span>
              <input
                type="text"
                readOnly
                value="01/09/2026 - 30/09/2026"
                className="pl-7 pr-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-border rounded-md font-medium text-gray-700 dark:text-gray-300 w-44 focus:outline-none"
              />
            </div>

            {/* Payment Method Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {paymentMethodFilter}
                  <i className="ti ti-chevron-down text-[10px] ml-1"></i>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 text-xs">
                {["Payment Method", "Credit Card", "Paypal", "Debit Card"].map((method) => (
                  <DropdownMenuItem
                    key={method}
                    onClick={() => setPaymentMethodFilter(method)}
                    className="cursor-pointer"
                  >
                    {method}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {statusFilter}
                  <i className="ti ti-chevron-down text-[10px] ml-1"></i>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 text-xs">
                {["Select Status", "Paid", "Unpaid"].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className="cursor-pointer"
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {sortBy}
                  <i className="ti ti-chevron-down text-[10px] ml-1"></i>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                {["Sort By : Last 7 Days", "Recently Added", "Ascending", "Descending", "Last Month"].map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setSortBy(s)}
                    className="cursor-pointer"
                  >
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-border text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading purchase transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => handleToggleSelect(tx.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>

                    {/* Invoice ID */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-gray-900 dark:text-gray-100">
                      <button
                        type="button"
                        onClick={() => setViewInvoice(tx)}
                        className="text-primary hover:underline"
                      >
                        {tx.invoiceId}
                      </button>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1.5 shrink-0 border border-border/60">
                          <img src={tx.companyLogo} alt={tx.customerName} className="w-full h-full object-contain" />
                        </div>
                        <h6 className="font-semibold text-gray-900 dark:text-gray-100">{tx.customerName}</h6>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {tx.customerEmail}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {tx.createdAt}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-gray-100">
                      ${tx.amount}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                      {tx.paymentMethod}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          tx.status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        <i className="ti ti-point-filled text-xs"></i>
                        {tx.status}
                      </span>
                    </td>

                    {/* Action Icon */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewInvoice(tx)}
                          className="size-7 rounded-md border border-border bg-white dark:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
                          title="View Invoice Details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.success(`Downloading PDF for ${tx.invoiceId}...`)}
                          className="size-7 rounded-md border border-border bg-white dark:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
                          title="Download Receipt"
                        >
                          <Download className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination Info */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredTransactions.length}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{defaultList.length}</span> entries
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="px-2.5 py-1 rounded border border-border bg-slate-50 dark:bg-slate-800 opacity-50 cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded border border-primary bg-primary text-white font-semibold"
            >
              1
            </button>
            <button
              type="button"
              disabled
              className="px-2.5 py-1 rounded border border-border bg-slate-50 dark:bg-slate-800 opacity-50 cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── Invoice Details Modal ────────────────────────────────────────── */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Invoice #{viewInvoice?.invoiceId}
              </DialogTitle>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  viewInvoice?.status === "Paid"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-rose-500/10 text-rose-600"
                }`}
              >
                {viewInvoice?.status}
              </span>
            </div>
            <DialogDescription className="text-xs">
              SaaS platform subscription checkout transaction
            </DialogDescription>
          </DialogHeader>

          {viewInvoice && (
            <div className="space-y-3 py-2 text-xs border-y border-border/60">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer Company:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{viewInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Email:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{viewInvoice.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subscription Plan:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{viewInvoice.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction Date:</span>
                <span className="text-gray-900 dark:text-gray-100">{viewInvoice.createdAt}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-bold text-sm">
                <span>Total Settled:</span>
                <span className="text-primary">${viewInvoice.amount}.00 USD</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toast.success(`PDF receipt generated for ${viewInvoice?.invoiceId}`);
              }}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              Download PDF
            </Button>
            <Button type="button" onClick={() => setViewInvoice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
