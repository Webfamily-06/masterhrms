import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Download,
  Eye,
  FileText,
  RefreshCw,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
  CreditCard,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/transactions")({
  component: SuperPurchaseTransactionsPage,
  head: () => ({ meta: [{ title: "Purchase Transaction List — Super Admin Console" }] }),
});

export interface DatabaseTransaction {
  id: string;
  invoiceId: string;
  transactionNo: string;
  customerName: string;
  tenantSlug: string;
  customerEmail: string;
  companyLogo: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  rawPaymentMethod?: string;
  status: string;
  rawStatus?: string;
  planName: string;
  billingCycle: string;
  pricingModel: string;
  billableUsers?: number | null;
  pricePerUser?: number | null;
  discountAmount?: number;
  subtotalAmount?: number;
  taxAmount?: number;
  couponCode?: string | null;
  gatewayPaymentId?: string | null;
  gatewayOrderId?: string | null;
  bankTransferRef?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sourceType: "billing_invoice" | "gateway_transaction";
}

interface TransactionsApiResponse {
  transactions: DatabaseTransaction[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

function formatCurrency(val: number | string, curr = "USD") {
  const num = typeof val === "number" ? val : parseFloat(val || "0");
  const normalizedCurr = (curr || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(normalizedCurr === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: normalizedCurr,
      maximumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num);
  } catch {
    return `${normalizedCurr} ${num.toFixed(2)}`;
  }
}

function formatDate(isoString?: string | null) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

function SuperPurchaseTransactionsPage() {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("Payment Method");
  const [statusFilter, setStatusFilter] = useState("Select Status");
  const [sortBy, setSortBy] = useState("Sort By : Last 7 Days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selection & Details State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewInvoice, setViewInvoice] = useState<DatabaseTransaction | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Construct query string for API
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (paymentMethodFilter !== "Payment Method") params.append("paymentMethod", paymentMethodFilter);
    if (statusFilter !== "Select Status") params.append("status", statusFilter);
    if (sortBy) params.append("sortBy", sortBy);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("page", String(currentPage));
    params.append("pageSize", String(pageSize));
    return params.toString();
  }, [debouncedSearch, paymentMethodFilter, statusFilter, sortBy, startDate, endDate, currentPage, pageSize]);

  // Real-time Database Query using TanStack Query
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<TransactionsApiResponse>({
    queryKey: ["super-transactions-list", queryParams],
    queryFn: async () => {
      const res = await api.get<TransactionsApiResponse>(`/super/transactions?${queryParams}`);
      return res;
    },
    staleTime: 10_000,
  });

  const transactions = apiResponse?.transactions || [];
  const pagination = apiResponse?.pagination || {
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  // Row selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(transactions.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Real database export to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Request complete filtered dataset from database (export mode)
      const exportParams = new URLSearchParams();
      if (debouncedSearch) exportParams.append("search", debouncedSearch);
      if (paymentMethodFilter !== "Payment Method") exportParams.append("paymentMethod", paymentMethodFilter);
      if (statusFilter !== "Select Status") exportParams.append("status", statusFilter);
      if (sortBy) exportParams.append("sortBy", sortBy);
      if (startDate) exportParams.append("startDate", startDate);
      if (endDate) exportParams.append("endDate", endDate);
      exportParams.append("export", "true");

      const res = await api.get<{ transactions: DatabaseTransaction[]; total: number }>(
        `/super/transactions?${exportParams.toString()}`
      );

      const items = res?.transactions || transactions;

      const headers = [
        "Invoice ID",
        "Transaction No",
        "Customer / Company",
        "Tenant Workspace",
        "Customer Email",
        "Amount",
        "Currency",
        "Payment Method",
        "Status",
        "Plan Name",
        "Billing Cycle",
        "Gateway Order ID",
        "Gateway Payment ID",
        "Created Date",
        "Paid Date",
      ];

      const csvRows = items.map((tx) => [
        `"${tx.invoiceId || ""}"`,
        `"${tx.transactionNo || ""}"`,
        `"${(tx.customerName || "").replace(/"/g, '""')}"`,
        `"${tx.tenantSlug || ""}"`,
        `"${tx.customerEmail || ""}"`,
        `"${tx.amount}"`,
        `"${tx.currency}"`,
        `"${tx.paymentMethod}"`,
        `"${tx.status}"`,
        `"${(tx.planName || "").replace(/"/g, '""')}"`,
        `"${tx.billingCycle || ""}"`,
        `"${tx.gatewayOrderId || ""}"`,
        `"${tx.gatewayPaymentId || ""}"`,
        `"${tx.createdAt ? new Date(tx.createdAt).toISOString() : ""}"`,
        `"${tx.paidAt ? new Date(tx.paidAt).toISOString() : ""}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `super_admin_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${items.length} transaction records successfully`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export transactions");
    } finally {
      setIsExporting(false);
    }
  };

  // Download printable tax invoice / receipt
  const handleDownloadInvoice = async (id: string, invoiceId: string) => {
    try {
      const token = localStorage.getItem("hrms_auth_token");
      const res = await fetch(`${API_BASE}/super/transactions/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Failed to download invoice (HTTP ${res.status})`);
      }

      const htmlContent = await res.text();
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      // Open printable view in new window or trigger download
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice-${invoiceId}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      toast.success(`Printable Invoice #${invoiceId} generated`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download invoice");
    }
  };

  // Format date range text for the button
  const dateRangeDisplay = useMemo(() => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    if (startDate) {
      return `From ${formatDate(startDate)}`;
    }
    if (endDate) {
      return `Until ${formatDate(endDate)}`;
    }
    return "01/09/2026 - 30/09/2026";
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Breadcrumb ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 page-breadcrumb">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-1">
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
              <li className="text-muted-foreground">Super Admin</li>
              <li>/</li>
              <li className="font-semibold text-foreground">Purchase Transaction List</li>
            </ol>
          </nav>
        </div>

        {/* Right Toolbar: Export, Refresh & Collapse Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["super-transactions-list"] });
              toast.info("Refreshed transaction records from database");
            }}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-2xs cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-2xs cursor-pointer"
              >
                {isExporting ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : (
                  <i className="ti ti-file-export text-sm"></i>
                )}
                Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs bg-popover text-popover-foreground border-border shadow-lg">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2 focus:bg-accent focus:text-accent-foreground">
                <i className="ti ti-file-type-xls text-sm text-emerald-600"></i>
                Export Filtered Data (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            className="size-8 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs"
            title="Collapse Header"
          >
            <i className="ti ti-chevrons-up text-sm"></i>
          </button>
        </div>
      </div>

      {/* ─── Main Transaction List Card ───────────────────────────────────── */}
      <div className="card bg-card border border-border rounded-lg shadow-2xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h5 className="font-bold text-sm text-foreground">Transaction List</h5>
            {selectedIds.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Search className="size-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-background border border-border rounded-md w-44 sm:w-48 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Date Range Picker Popover */}
            <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative inline-flex items-center gap-1.5 pl-7 pr-3 py-1.5 text-xs bg-background border border-border rounded-md font-medium text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                >
                  <span className="absolute left-2.5 text-muted-foreground pointer-events-none">
                    <CalendarIcon className="size-3.5" />
                  </span>
                  <span>{dateRangeDisplay}</span>
                  {(startDate || endDate) && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setStartDate("");
                        setEndDate("");
                        setCurrentPage(1);
                      }}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      title="Clear date filter"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-3 text-xs bg-popover text-popover-foreground border-border shadow-lg">
                <div className="space-y-3">
                  <div className="font-semibold text-foreground border-b border-border pb-1.5">
                    Filter by Creation Date
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Date Quick Presets */}
                  <div className="pt-2 border-t border-border flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const past = new Date();
                        past.setDate(today.getDate() - 7);
                        setStartDate(past.toISOString().slice(0, 10));
                        setEndDate(today.toISOString().slice(0, 10));
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                      className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-accent text-foreground"
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const past = new Date();
                        past.setDate(today.getDate() - 30);
                        setStartDate(past.toISOString().slice(0, 10));
                        setEndDate(today.toISOString().slice(0, 10));
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                      className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-accent text-foreground"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("2026-09-01");
                        setEndDate("2026-09-30");
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                      className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-accent text-foreground"
                    >
                      Sep 2026
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                      className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground ml-auto"
                    >
                      Reset All
                    </button>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => {
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                    >
                      Apply Filter
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Payment Method Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                >
                  <span>{paymentMethodFilter}</span>
                  <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs bg-popover text-popover-foreground border-border shadow-lg">
                {[
                  "Payment Method",
                  "Razorpay",
                  "Credit Card",
                  "Paypal",
                  "Debit Card",
                  "Bank Transfer",
                ].map((method) => (
                  <DropdownMenuItem
                    key={method}
                    onClick={() => {
                      setPaymentMethodFilter(method);
                      setCurrentPage(1);
                    }}
                    className={`cursor-pointer focus:bg-accent focus:text-accent-foreground ${
                      paymentMethodFilter === method ? "font-bold text-primary" : ""
                    }`}
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                >
                  <span>{statusFilter}</span>
                  <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 text-xs bg-popover text-popover-foreground border-border shadow-lg">
                {[
                  "Select Status",
                  "Paid",
                  "Unpaid",
                  "Failed",
                  "Pending",
                  "Refunded",
                ].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                    }}
                    className={`cursor-pointer focus:bg-accent focus:text-accent-foreground ${
                      statusFilter === status ? "font-bold text-primary" : ""
                    }`}
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                >
                  <span>{sortBy}</span>
                  <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs bg-popover text-popover-foreground border-border shadow-lg">
                {[
                  "Sort By : Last 7 Days",
                  "Recently Added",
                  "Ascending",
                  "Descending",
                  "Last Month",
                ].map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => {
                      setSortBy(s);
                      setCurrentPage(1);
                    }}
                    className={`cursor-pointer focus:bg-accent focus:text-accent-foreground ${
                      sortBy === s ? "font-bold text-primary" : ""
                    }`}
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
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-semibold text-foreground">Invoice ID</th>
                <th className="py-3 px-4 font-semibold text-foreground">Customer</th>
                <th className="py-3 px-4 font-semibold text-foreground">Email</th>
                <th className="py-3 px-4 font-semibold text-foreground">Created Date</th>
                <th className="py-3 px-4 font-semibold text-foreground">Amount</th>
                <th className="py-3 px-4 font-semibold text-foreground">Payment Method</th>
                <th className="py-3 px-4 font-semibold text-foreground">Status</th>
                <th className="py-3 px-4 text-right font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="font-medium text-foreground">Loading purchase transactions...</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Querying PostgreSQL database records</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <AlertCircle className="size-8 mx-auto mb-2 text-destructive" />
                    <p className="font-semibold text-foreground">Unable to load purchase transactions.</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-3">
                      {(error as any)?.message || "A database or network error occurred."}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5 text-xs">
                      <RefreshCw className="size-3.5" />
                      Retry Request
                    </Button>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <FileText className="size-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">No transactions found.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {debouncedSearch || paymentMethodFilter !== "Payment Method" || statusFilter !== "Select Status" || startDate || endDate
                        ? "No transactions match your current active filters."
                        : "There are no purchase transactions recorded in PostgreSQL yet."}
                    </p>
                    {(debouncedSearch || paymentMethodFilter !== "Payment Method" || statusFilter !== "Select Status" || startDate || endDate) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchInput("");
                          setPaymentMethodFilter("Payment Method");
                          setStatusFilter("Select Status");
                          setSortBy("Sort By : Last 7 Days");
                          setStartDate("");
                          setEndDate("");
                          setCurrentPage(1);
                        }}
                        className="mt-3 text-xs"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-muted/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => handleToggleSelect(tx.id)}
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>

                    {/* Invoice ID */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                      <button
                        type="button"
                        onClick={() => setViewInvoice(tx)}
                        className="text-primary hover:underline cursor-pointer focus:outline-none"
                        title="Click to view full transaction details"
                      >
                        {tx.invoiceId || tx.transactionNo}
                      </button>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-muted border border-border/80 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          {tx.companyLogo && (tx.companyLogo.startsWith("http") || tx.companyLogo.startsWith("/")) ? (
                            <img
                              src={tx.companyLogo}
                              alt={tx.customerName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Fallback to icon on broken image
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <Building2 className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="truncate">
                          <h6
                            className="font-semibold text-foreground truncate max-w-[150px]"
                            title={tx.customerName}
                          >
                            {tx.customerName}
                          </h6>
                          {tx.tenantSlug && (
                            <span className="text-[10px] text-muted-foreground font-mono block truncate">
                              @{tx.tenantSlug}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-muted-foreground max-w-[180px]">
                      <span className="truncate block font-mono text-xs" title={tx.customerEmail}>
                        {tx.customerEmail}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold text-foreground whitespace-nowrap">
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {tx.paymentMethod?.toLowerCase().includes("paypal") ? (
                          <i className="ti ti-brand-paypal text-sky-500 text-sm"></i>
                        ) : tx.paymentMethod?.toLowerCase().includes("razorpay") ? (
                          <i className="ti ti-bolt text-blue-500 text-sm"></i>
                        ) : tx.paymentMethod?.toLowerCase().includes("card") || tx.paymentMethod?.toLowerCase().includes("stripe") ? (
                          <CreditCard className="size-3.5 text-muted-foreground" />
                        ) : (
                          <i className="ti ti-wallet text-muted-foreground text-sm"></i>
                        )}
                        <span>{tx.paymentMethod}</span>
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          tx.status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : tx.status === "Unpaid"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : tx.status === "Failed"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        <i className="ti ti-point-filled text-xs"></i>
                        {tx.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewInvoice(tx)}
                          className="size-7 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                          title="View Invoice Details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(tx.id, tx.invoiceId || tx.transactionNo)}
                          className="size-7 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                          title="Download Printable Invoice"
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
        <div className="p-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{pagination.total}</span> entries
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {Array.from({ length: Math.max(1, pagination.totalPages) }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`px-2.5 py-1 rounded border font-semibold transition-colors ${
                  pagination.page === pg
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent"
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── Real Database Transaction Details Modal ──────────────────────── */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg bg-card text-foreground border-border shadow-xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <FileText className="size-4 text-primary" />
                Invoice #{viewInvoice?.invoiceId || viewInvoice?.transactionNo}
              </DialogTitle>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  viewInvoice?.status === "Paid"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : viewInvoice?.status === "Unpaid"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                {viewInvoice?.status}
              </span>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Authoritative PostgreSQL transaction ledger record
            </DialogDescription>
          </DialogHeader>

          {viewInvoice && (
            <div className="space-y-3 py-2 text-xs border-y border-border/80">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customer Company:</span>
                <span className="font-semibold text-foreground">{viewInvoice.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Workspace Tenant:</span>
                <span className="font-mono text-foreground font-medium">@{viewInvoice.tenantSlug || "system"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Billing Email:</span>
                <span className="font-mono text-foreground">{viewInvoice.customerEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subscription Plan:</span>
                <span className="font-semibold text-foreground">
                  {viewInvoice.planName} ({viewInvoice.billingCycle})
                </span>
              </div>
              {viewInvoice.billableUsers && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Licensed Seats:</span>
                  <span className="text-foreground">{viewInvoice.billableUsers} users</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="text-foreground font-medium">{viewInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Gateway Order ID:</span>
                <span className="font-mono text-[11px] text-muted-foreground">{viewInvoice.gatewayOrderId || viewInvoice.transactionNo}</span>
              </div>
              {viewInvoice.gatewayPaymentId && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Gateway Payment Ref:</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{viewInvoice.gatewayPaymentId}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Creation Timestamp:</span>
                <span className="text-foreground">{formatDate(viewInvoice.createdAt)}</span>
              </div>
              {viewInvoice.paidAt && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Settlement Date:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatDate(viewInvoice.paidAt)}</span>
                </div>
              )}

              {/* Financial Summary */}
              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(viewInvoice.subtotalAmount ?? viewInvoice.amount, viewInvoice.currency)}</span>
                </div>
                {Number(viewInvoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount:</span>
                    <span>-{formatCurrency(viewInvoice.discountAmount || 0, viewInvoice.currency)}</span>
                  </div>
                )}
                {Number(viewInvoice.taxAmount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax:</span>
                    <span>{formatCurrency(viewInvoice.taxAmount || 0, viewInvoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-border font-bold text-sm text-foreground">
                  <span>Total Amount:</span>
                  <span className="text-primary">{formatCurrency(viewInvoice.amount, viewInvoice.currency)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (viewInvoice) {
                  handleDownloadInvoice(viewInvoice.id, viewInvoice.invoiceId || viewInvoice.transactionNo);
                }
              }}
              className="gap-1.5 text-xs border-border"
            >
              <Download className="size-3.5" />
              Download Printable Invoice
            </Button>
            <Button type="button" onClick={() => setViewInvoice(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
