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
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck,
} from "lucide-react";
import { PaymentProviderBadge, getPaymentProviderMeta } from "@/components/payment-provider-badge";
import { getSocketClient } from "@/lib/socket";

export const Route = createFileRoute("/_authenticated/super/transactions")({
  component: SuperPurchaseTransactionsPage,
  head: () => ({ meta: [{ title: "Purchase Transaction List — Super Admin Console" }] }),
});

export interface DatabaseTransaction {
  id: string;
  invoiceId: string;
  transactionNo: string;
  classification?: string;
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
  proofUrl?: string | null;
  proofNotes?: string | null;
  proofStatus?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sourceType: "billing_invoice" | "gateway_transaction";
  verificationMode?: "AUTOMATIC" | "MANUAL";
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  verification?: {
    status: "VERIFIED" | "MISMATCH" | "PENDING VERIFICATION";
    summary: string;
    provider: string;
    orderId: string | null;
    paymentId: string | null;
    gatewayAmount: number | null;
    gatewayCurrency: string | null;
    internalAmount: number;
    internalCurrency: string;
    gatewayStatus: string | null;
    internalStatus: string;
    mismatchReason?: string;
    diagnosticComparison?: {
      expectedAmount: number;
      gatewayAmount: number | null;
      expectedCurrency: string;
      gatewayCurrency: string | null;
      expectedOrderId: string | null;
      gatewayOrderId: string | null;
      expectedStatus: string;
      gatewayStatus: string | null;
    };
  };
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

export function formatCurrency(val: number | string, curr: string = "USD") {
  const num = typeof val === "number" ? val : parseFloat(String(val || "0"));
  const safeNum = isNaN(num) ? 0 : num;
  const normalizedCurr = (curr || "USD").toUpperCase();

  let formatted = "";
  try {
    if (normalizedCurr === "INR") {
      formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(safeNum);
    } else if (normalizedCurr === "EUR") {
      formatted = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(safeNum);
    } else {
      formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: normalizedCurr,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(safeNum);
    }
  } catch {
    formatted = `${normalizedCurr} ${safeNum.toFixed(2)}`;
  }

  // Ensure authoritative ISO currency code is appended if not already present
  if (!formatted.includes(normalizedCurr)) {
    return `${formatted} ${normalizedCurr}`;
  }
  return formatted;
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

export function isManualVerification(tx?: DatabaseTransaction | null): boolean {
  if (!tx) return false;
  if (tx.verificationMode) {
    return tx.verificationMode === "MANUAL";
  }
  const method = (tx.rawPaymentMethod || tx.paymentMethod || "").toLowerCase().trim();
  const provider = (tx.verification?.provider || "").toLowerCase().trim();
  if (
    provider.includes("razorpay") ||
    provider.includes("stripe") ||
    provider.includes("paypal") ||
    method.includes("razorpay") ||
    method.includes("stripe") ||
    method.includes("paypal")
  ) {
    return false;
  }
  return (
    method.includes("bank") ||
    method.includes("manual") ||
    method.includes("offline") ||
    method.includes("wire") ||
    method.includes("cash") ||
    method.includes("net_banking") ||
    method.includes("net banking")
  );
}

export interface TransactionStatusMeta {
  isManual: boolean;
  isAutomatic: boolean;
  isPaid: boolean;
  isFailed: boolean;
  canApproveOrReject: boolean;
  paymentStatusLabel: string;
  paymentStatusClass: string;
  paymentStatusIconType: "check" | "clock" | "alert" | "point";
  verificationStatusLabel: string;
  verificationStatusClass: string;
  verificationIconType: "shieldCheck" | "shieldAlert" | "clock" | "alert";
}

export function getTransactionStatusMeta(tx: DatabaseTransaction): TransactionStatusMeta {
  const isManual = isManualVerification(tx);
  const isAutomatic = !isManual;
  const isPaid =
    tx.status === "Paid" ||
    tx.rawStatus === "paid" ||
    tx.rawStatus === "captured" ||
    tx.rawStatus === "verified" ||
    tx.rawStatus === "success";
  const isFailed =
    tx.status === "Failed" ||
    tx.status === "Rejected" ||
    tx.rawStatus === "failed" ||
    tx.rawStatus === "rejected" ||
    tx.rawStatus === "declined";

  // 1. Payment Status Presentation
  let paymentStatusLabel: string;
  let paymentStatusClass: string;
  let paymentStatusIconType: "check" | "clock" | "alert" | "point" = "point";

  if (isPaid) {
    paymentStatusLabel = "Paid";
    paymentStatusClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    paymentStatusIconType = "check";
  } else if (isFailed) {
    if (isManual) {
      paymentStatusLabel = tx.status === "Rejected" ? "Rejected" : "Failed";
      paymentStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    } else {
      // Gateway failures: MUST NOT be called "Rejected" (admin rejection)
      paymentStatusLabel = tx.rawStatus === "declined" ? "Declined" : "Failed";
      paymentStatusClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
    paymentStatusIconType = "alert";
  } else {
    // In-progress / Pending / Processing
    if (isManual) {
      paymentStatusLabel = "Pending Review";
      paymentStatusClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      paymentStatusIconType = "clock";
    } else {
      // Automatic Gateway in-progress
      paymentStatusLabel = "Processing";
      paymentStatusClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      paymentStatusIconType = "clock";
    }
  }

  // 2. Verification Status Presentation
  let verificationStatusLabel: string;
  let verificationStatusClass: string;
  let verificationIconType: "shieldCheck" | "shieldAlert" | "clock" | "alert" = "clock";

  if (isPaid || tx.verificationStatus === "VERIFIED" || tx.verification?.status === "VERIFIED") {
    verificationStatusLabel = "VERIFIED";
    verificationStatusClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    verificationIconType = "shieldCheck";
  } else if (isFailed || tx.verificationStatus === "REJECTED") {
    if (isManual) {
      verificationStatusLabel = "REJECTED";
      verificationStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      verificationIconType = "shieldAlert";
    } else {
      // Automatic Gateway failure: display FAILED, NOT REJECTED!
      verificationStatusLabel = "FAILED";
      verificationStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      verificationIconType = "shieldAlert";
    }
  } else if (tx.verification?.status === "MISMATCH") {
    verificationStatusLabel = "MISMATCH";
    verificationStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    verificationIconType = "alert";
  } else {
    if (isManual) {
      verificationStatusLabel = "PENDING REVIEW";
      verificationStatusClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      verificationIconType = "clock";
    } else {
      verificationStatusLabel = "GATEWAY PROCESSING";
      verificationStatusClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      verificationIconType = "clock";
    }
  }

  // 3. Action Rendering Permission: STRICTLY per Section 11 pseudo-code
  // Manual only, pending verification, and neither paid nor failed
  const canApproveOrReject = isManual && tx.verificationStatus === "PENDING" && !isPaid && !isFailed;

  return {
    isManual,
    isAutomatic,
    isPaid,
    isFailed,
    canApproveOrReject,
    paymentStatusLabel,
    paymentStatusClass,
    paymentStatusIconType,
    verificationStatusLabel,
    verificationStatusClass,
    verificationIconType,
  };
}

function SuperPurchaseTransactionsPage() {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("Payment Method");
  const [verificationModeFilter, setVerificationModeFilter] = useState("All Modes");
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
  const [approveConfirmTx, setApproveConfirmTx] = useState<DatabaseTransaction | null>(null);
  const [proofPreviewTx, setProofPreviewTx] = useState<DatabaseTransaction | null>(null);
  const [rejectTargetTx, setRejectTargetTx] = useState<DatabaseTransaction | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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
    if (verificationModeFilter === "Automatic Gateway") params.append("verificationMode", "AUTOMATIC");
    if (verificationModeFilter === "Manual Review") params.append("verificationMode", "MANUAL");
    if (statusFilter !== "Select Status") params.append("status", statusFilter);
    if (sortBy) params.append("sortBy", sortBy);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("page", String(currentPage));
    params.append("pageSize", String(pageSize));
    return params.toString();
  }, [debouncedSearch, paymentMethodFilter, verificationModeFilter, statusFilter, sortBy, startDate, endDate, currentPage, pageSize]);

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

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    const socket = getSocketClient();
    const handleLiveInvalidation = () => {
      refetch();
    };

    socket.on("payment:confirmed", handleLiveInvalidation);
    socket.on("payment:rejected", handleLiveInvalidation);
    socket.on("subscription:activated", handleLiveInvalidation);
    socket.on("super:transaction_updated", handleLiveInvalidation);

    return () => {
      socket.off("payment:confirmed", handleLiveInvalidation);
      socket.off("payment:rejected", handleLiveInvalidation);
      socket.off("subscription:activated", handleLiveInvalidation);
      socket.off("super:transaction_updated", handleLiveInvalidation);
    };
  }, [refetch]);

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
        "Document Classification",
        "Transaction No",
        "Customer / Company",
        "Tenant Workspace",
        "Customer Email",
        "Amount",
        "Currency",
        "Formatted Amount",
        "Payment Method",
        "Status",
        "Plan / Description",
        "Billing Cycle",
        "Gateway Order ID",
        "Gateway Payment ID",
        "Created Date",
        "Paid Date",
      ];

      const csvRows = items.map((tx) => [
        `"${tx.invoiceId || ""}"`,
        `"${tx.classification || "TRANSACTION VOUCHER"}"`,
        `"${tx.transactionNo || ""}"`,
        `"${(tx.customerName || "").replace(/"/g, '""')}"`,
        `"${tx.tenantSlug || ""}"`,
        `"${tx.customerEmail || ""}"`,
        `"${tx.amount}"`,
        `"${tx.currency}"`,
        `"${formatCurrency(tx.amount, tx.currency)}"`,
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

  // Download genuine vector PDF document (Phase 7 & Phase G)
  const handleDownloadInvoice = async (id: string, invoiceId: string) => {
    const loadingToast = toast.loading(`Generating PDF for Invoice #${invoiceId}...`);
    try {
      const token = localStorage.getItem("hrms_auth_token");
      const res = await fetch(`${API_BASE}/super/transactions/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Failed to download invoice PDF (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);

      // Direct silent download to user disk - no preview window / tab opened
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(`Invoice #${invoiceId} PDF downloaded successfully`);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Failed to download invoice PDF");
    }
  };

  const handleApprovePayment = async (txId: string) => {
    setIsProcessingAction(true);
    const toastId = toast.loading("Approving payment and registering authoritative ledger...");
    try {
      const res = await api.post<any>(`/super/transactions/${txId}/approve`);
      toast.dismiss(toastId);
      toast.success(res?.message || "Payment approved and verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["super-transactions-list"] });
      refetch();
      setViewInvoice(null);
      setApproveConfirmTx(null);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Failed to approve payment.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectPayment = async () => {
    const target = rejectTargetTx || viewInvoice;
    if (!target) return;
    setIsProcessingAction(true);
    const toastId = toast.loading("Rejecting payment verification...");
    try {
      const res = await api.post<any>(`/super/transactions/${target.id}/reject`, {
        reason: rejectionReason.trim() || "Payment proof could not be verified by Super Admin.",
      });
      toast.dismiss(toastId);
      toast.success(res?.message || "Payment verification rejected.");
      queryClient.invalidateQueries({ queryKey: ["super-transactions-list"] });
      refetch();
      setRejectDialogOpen(false);
      setRejectTargetTx(null);
      setRejectionReason("");
      setViewInvoice(null);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Failed to reject payment.");
    } finally {
      setIsProcessingAction(false);
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
                  "PayPal",
                  "Credit Card",
                  "Net Banking",
                  "Offline Payment",
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

            {/* Verification Mode Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                >
                  <span>{verificationModeFilter}</span>
                  <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-xs bg-popover text-popover-foreground border-border shadow-lg">
                {[
                  "All Modes",
                  "Automatic Gateway",
                  "Manual Review",
                ].map((mode) => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => {
                      setVerificationModeFilter(mode);
                      setCurrentPage(1);
                    }}
                    className={`cursor-pointer focus:bg-accent focus:text-accent-foreground ${
                      verificationModeFilter === mode ? "font-bold text-primary" : ""
                    }`}
                  >
                    {mode}
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
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">Transaction ID</th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">Invoice Number</th>
                <th className="py-3 px-3 font-semibold text-foreground">Tenant / Company</th>
                <th className="py-3 px-3 font-semibold text-foreground">Customer Email</th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">Payment Method</th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">Provider</th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">Amount</th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">Payment Status</th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">Verification Status</th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">Submitted Date</th>
                <th className="py-3 px-3 font-semibold text-foreground whitespace-nowrap text-center">Receipt</th>
                <th className="py-3 px-3 text-right font-semibold text-foreground whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="py-14 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="font-medium text-foreground">Loading purchase transactions...</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Querying PostgreSQL database records</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-muted-foreground">
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
                  <td colSpan={13} className="py-12 text-center text-muted-foreground">
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
                transactions.map((tx) => {
                  const statusMeta = getTransactionStatusMeta(tx);
                  const providerMeta = getPaymentProviderMeta(tx.paymentMethod);
                  const hasProof = !!tx.proofUrl;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>

                      {/* Transaction ID */}
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        <span title={tx.id}>
                          {tx.transactionNo || (tx.id.length > 12 ? `${tx.id.slice(0, 10)}...` : tx.id)}
                        </span>
                      </td>

                      {/* Invoice Number */}
                      <td className="py-3 px-3 font-mono font-semibold text-foreground whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewInvoice(tx)}
                          className="text-primary hover:underline cursor-pointer focus:outline-none"
                          title="Click to view full transaction details"
                        >
                          {tx.invoiceId || tx.transactionNo}
                        </button>
                      </td>

                      {/* Tenant / Company */}
                      <td className="py-3 px-3 max-w-[180px]">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-muted border border-border/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                            {tx.companyLogo && (tx.companyLogo.startsWith("http") || tx.companyLogo.startsWith("/")) ? (
                              <img
                                src={tx.companyLogo}
                                alt={tx.customerName}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <Building2 className="size-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="truncate">
                            <h6
                              className="font-semibold text-foreground truncate max-w-[140px] text-xs"
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

                      {/* Customer Email */}
                      <td className="py-3 px-3 text-muted-foreground max-w-[160px]">
                        <span className="truncate block font-mono text-xs" title={tx.customerEmail}>
                          {tx.customerEmail}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-3 text-foreground whitespace-nowrap">
                        <PaymentProviderBadge provider={tx.paymentMethod} />
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center text-xs font-medium text-foreground">
                          {providerMeta.displayName}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.paymentStatusClass}`}
                        >
                          {statusMeta.paymentStatusIconType === "check" ? (
                            <CheckCircle2 className="size-3" />
                          ) : statusMeta.paymentStatusIconType === "clock" ? (
                            <Clock className="size-3" />
                          ) : statusMeta.paymentStatusIconType === "alert" ? (
                            <AlertTriangle className="size-3" />
                          ) : (
                            <i className="ti ti-point-filled text-xs"></i>
                          )}
                          {statusMeta.paymentStatusLabel}
                        </span>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.verificationStatusClass}`}
                        >
                          {statusMeta.verificationIconType === "shieldCheck" ? (
                            <ShieldCheck className="size-3 text-emerald-500" />
                          ) : statusMeta.verificationIconType === "shieldAlert" ? (
                            <ShieldAlert className="size-3 text-rose-500" />
                          ) : statusMeta.verificationIconType === "alert" ? (
                            <AlertTriangle className="size-3 text-rose-500" />
                          ) : (
                            <Clock className={`size-3 ${statusMeta.isManual ? "text-amber-500" : "text-blue-500"}`} />
                          )}
                          {statusMeta.verificationStatusLabel}
                        </span>
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>

                      {/* Column 11: Generated Platform Receipt / Invoice Document */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(tx.id, tx.invoiceId || tx.transactionNo)}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                            statusMeta.isPaid
                              ? "text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 border-primary/20"
                              : "text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-accent border-border"
                          }`}
                          title={statusMeta.isPaid ? "Download Official Payment Receipt PDF" : "Download Official Invoice PDF"}
                        >
                          <FileText className="size-3" />
                          {statusMeta.isPaid ? "Receipt" : "Invoice"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Full Details Button */}
                          <button
                            type="button"
                            onClick={() => setViewInvoice(tx)}
                            className="size-7 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          {/* Customer Payment Proof ONLY for manual transactions that have submitted evidence */}
                          {statusMeta.isManual && hasProof && (
                            <button
                              type="button"
                              onClick={() => setProofPreviewTx(tx)}
                              className="h-7 px-2 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 font-medium text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                              title="View Customer Uploaded Payment Proof"
                            >
                              <FileCheck className="size-3 text-purple-600 dark:text-purple-400" />
                              Payment Proof
                            </button>
                          )}

                          {/* Approve / Reject: ONLY FOR MANUAL PAYMENTS with pending verification */}
                          {statusMeta.canApproveOrReject && (
                            <>
                              <button
                                type="button"
                                disabled={isProcessingAction}
                                onClick={() => setApproveConfirmTx(tx)}
                                className="h-7 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Approve Manual Payment"
                              >
                                <CheckCircle2 className="size-3" />
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isProcessingAction}
                                onClick={() => {
                                  setRejectTargetTx(tx);
                                  setRejectDialogOpen(true);
                                }}
                                className="h-7 px-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Reject Manual Payment"
                              >
                                <AlertTriangle className="size-3" />
                                Reject
                              </button>
                            </>
                          )}

                          {/* Automatic Gateway Processing: never shows manual approve/reject */}
                          {!statusMeta.isManual && !statusMeta.isPaid && !statusMeta.isFailed && (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              Gateway Processing
                            </span>
                          )}

                          {statusMeta.isPaid && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded inline-flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              {!statusMeta.isManual ? "Gateway Verified" : "Verified"}
                            </span>
                          )}

                          {statusMeta.isFailed && (
                            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded inline-flex items-center gap-1">
                              <AlertTriangle className="size-3" />
                              {!statusMeta.isManual ? "Failed" : "Rejected"}
                            </span>
                          )}

                          {/* Download Genuine Invoice PDF */}
                          <button
                            type="button"
                            onClick={() => handleDownloadInvoice(tx.id, tx.invoiceId || tx.transactionNo)}
                            className="size-7 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
                            title="Download Printable Invoice PDF"
                          >
                            <Download className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* ─── Real Database Transaction Details Modal (Section 8 Strict Separation) ─── */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg bg-card text-foreground border-border shadow-xl">
          {viewInvoice && (() => {
            const drawerMeta = getTransactionStatusMeta(viewInvoice);
            const isDrawerManual = drawerMeta.isManual;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                        <FileText className="size-4 text-primary" />
                        {viewInvoice.invoiceId || viewInvoice.transactionNo}
                      </DialogTitle>
                      {viewInvoice.classification && (
                        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {viewInvoice.classification}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Verification Mode Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isDrawerManual
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {isDrawerManual ? "MANUAL — Admin Review" : "AUTOMATIC — Gateway"}
                      </span>
                      {/* Payment Status Badge */}
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${drawerMeta.paymentStatusClass}`}>
                        {drawerMeta.paymentStatusLabel}
                      </span>
                    </div>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Authoritative PostgreSQL transaction ledger record
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2 text-xs border-y border-border/80 max-h-[60vh] overflow-y-auto pr-1">
                  {viewInvoice.classification && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Classification:</span>
                      <span className="font-semibold text-primary">{viewInvoice.classification}</span>
                    </div>
                  )}
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

                  {/* Section 8: Specific Mode Rendering */}
                  {drawerMeta.isAutomatic ? (
                    /* ─── AUTOMATIC GATEWAY TRANSACTION DETAILS ─── */
                    <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center font-semibold text-blue-600 dark:text-blue-400 border-b border-blue-500/20 pb-1.5">
                        <span>Verification Mode:</span>
                        <span className="font-bold">AUTOMATIC — Gateway</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="font-semibold text-foreground">
                          {viewInvoice.verification?.provider || viewInvoice.paymentMethod}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Gateway Transaction ID:</span>
                        <span className="font-mono text-[11px] text-foreground">
                          {viewInvoice.gatewayOrderId || viewInvoice.id}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Gateway Reference:</span>
                        <span className="font-mono text-[11px] text-foreground">
                          {viewInvoice.gatewayPaymentId || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Payment Status:</span>
                        <span className="font-semibold text-foreground">{drawerMeta.paymentStatusLabel}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Verification Status:</span>
                        <span className="font-semibold text-foreground">{drawerMeta.verificationStatusLabel}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Verified At:</span>
                        <span className="text-foreground">
                          {viewInvoice.verifiedAt || viewInvoice.paidAt
                            ? formatDate(viewInvoice.verifiedAt || viewInvoice.paidAt)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Verified By:</span>
                        <span className="font-mono text-foreground font-medium">
                          {drawerMeta.isPaid ? (viewInvoice.verifiedBy || "SYSTEM_GATEWAY") : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* ─── MANUAL REVIEW TRANSACTION DETAILS ─── */
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center font-semibold text-amber-600 dark:text-amber-400 border-b border-amber-500/20 pb-1.5">
                        <span>Verification Mode:</span>
                        <span className="font-bold">MANUAL — Admin Review</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Payment Method:</span>
                        <span className="font-semibold text-foreground">{viewInvoice.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">UTR / Reference:</span>
                        <span className="font-mono text-[11px] font-bold text-foreground">
                          {viewInvoice.bankTransferRef || viewInvoice.gatewayPaymentId || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Submitted Date:</span>
                        <span className="text-foreground">{formatDate(viewInvoice.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Payment Status:</span>
                        <span className="font-semibold text-foreground">{drawerMeta.paymentStatusLabel}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Verification Status:</span>
                        <span className="font-semibold text-foreground">{drawerMeta.verificationStatusLabel}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Reviewer:</span>
                        <span className="font-mono text-foreground font-medium">
                          {drawerMeta.isPaid ? (viewInvoice.verifiedBy || "Super Admin") : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Verified At:</span>
                        <span className="text-foreground">
                          {viewInvoice.verifiedAt || viewInvoice.paidAt
                            ? formatDate(viewInvoice.verifiedAt || viewInvoice.paidAt)
                            : "—"}
                        </span>
                      </div>

                      {viewInvoice.rejectionReason && (
                        <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs mt-1">
                          <span className="font-bold text-rose-600 dark:text-rose-400 block mb-0.5">Rejection Reason:</span>
                          <p className="text-rose-700 dark:text-rose-300">{viewInvoice.rejectionReason}</p>
                        </div>
                      )}

                      {/* Manual Payment Proof Evidence Section */}
                      <div className="pt-2 border-t border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <FileCheck className="size-3.5 text-purple-600" />
                            Payment Proof:
                          </span>
                          {viewInvoice.proofUrl ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const target = viewInvoice;
                                  setViewInvoice(null);
                                  setProofPreviewTx(target);
                                }}
                                className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="size-3" />
                                View Proof
                              </button>
                              <a
                                href={viewInvoice.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center gap-0.5"
                              >
                                <ExternalLink className="size-3" />
                                Open ↗
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">No proof uploaded</span>
                          )}
                        </div>

                        {viewInvoice.proofUrl && (
                          <div className="mt-2 relative rounded-md overflow-hidden border border-border bg-black/5 dark:bg-black/40 min-h-[140px] max-h-56 flex items-center justify-center">
                            {viewInvoice.proofUrl.toLowerCase().includes(".pdf") ? (
                              <iframe
                                src={viewInvoice.proofUrl}
                                className="w-full h-52 border-0"
                                title="Payment Proof PDF"
                              />
                            ) : (
                              <img
                                src={viewInvoice.proofUrl}
                                alt="Customer Payment Proof"
                                className="max-h-52 w-auto object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => {
                                  const target = viewInvoice;
                                  setViewInvoice(null);
                                  setProofPreviewTx(target);
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                          </div>
                        )}
                        {viewInvoice.proofNotes && (
                          <p className="text-[11px] text-muted-foreground italic mt-1">
                            Notes: {viewInvoice.proofNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gateway Cross-Verification Card (Diagnostic Comparison) */}
                  {drawerMeta.isAutomatic && viewInvoice.verification && (
                    <div
                      className={`p-3 rounded-lg border text-xs space-y-2 mt-2 ${
                        viewInvoice.verification.status === "VERIFIED"
                          ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                          : viewInvoice.verification.status === "MISMATCH"
                          ? "bg-rose-500/5 border-rose-500/20 text-foreground"
                          : "bg-muted/40 border-border text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          {viewInvoice.verification.status === "VERIFIED" ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          ) : viewInvoice.verification.status === "MISMATCH" ? (
                            <AlertTriangle className="size-3.5 text-rose-500" />
                          ) : (
                            <Clock className="size-3.5 text-amber-500" />
                          )}
                          Gateway Cryptographic Verification:
                        </span>
                        <span
                          className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                            viewInvoice.verification.status === "VERIFIED"
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : viewInvoice.verification.status === "MISMATCH"
                              ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                              : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {viewInvoice.verification.summary || viewInvoice.verification.status}
                        </span>
                      </div>

                      {viewInvoice.verification.status === "MISMATCH" && (
                        <div className="mt-2 p-2 rounded bg-rose-500/10 border border-rose-500/20 space-y-1.5 text-[11px]">
                          <div className="font-semibold text-rose-600 dark:text-rose-400">
                            Diagnostic Discrepancy Comparison:
                          </div>
                          {viewInvoice.verification.mismatchReason && (
                            <p className="text-muted-foreground italic">
                              {viewInvoice.verification.mismatchReason}
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-rose-500/20">
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Expected Amount:</span>
                              <span className="font-mono font-medium">
                                {formatCurrency(
                                  viewInvoice.verification.diagnosticComparison?.expectedAmount ?? viewInvoice.amount,
                                  viewInvoice.verification.diagnosticComparison?.expectedCurrency ?? viewInvoice.currency
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Gateway Amount:</span>
                              <span className="font-mono font-medium text-rose-500">
                                {viewInvoice.verification.diagnosticComparison?.gatewayAmount !== null &&
                                viewInvoice.verification.diagnosticComparison?.gatewayAmount !== undefined
                                  ? formatCurrency(
                                      viewInvoice.verification.diagnosticComparison.gatewayAmount,
                                      viewInvoice.verification.diagnosticComparison?.gatewayCurrency ?? viewInvoice.currency
                                    )
                                  : "N/A"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Expected Order:</span>
                              <span className="font-mono truncate block text-[10px]">
                                {viewInvoice.verification.diagnosticComparison?.expectedOrderId || "None"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Gateway Order:</span>
                              <span className="font-mono truncate block text-[10px]">
                                {viewInvoice.verification.diagnosticComparison?.gatewayOrderId || "None"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
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

                <DialogFooter className="gap-2 sm:justify-between flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        handleDownloadInvoice(viewInvoice.id, viewInvoice.invoiceId || viewInvoice.transactionNo);
                      }}
                      className="gap-1.5 text-xs border-border"
                    >
                      <Download className="size-3.5" />
                      Download Invoice PDF
                    </Button>

                    {/* Section 8 & 11: Approve / Reject strictly for MANUAL transactions with pending verification */}
                    {drawerMeta.canApproveOrReject && (
                      <>
                        <Button
                          type="button"
                          variant="default"
                          disabled={isProcessingAction}
                          onClick={() => setApproveConfirmTx(viewInvoice)}
                          className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Approve Payment
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={isProcessingAction}
                          onClick={() => {
                            setRejectTargetTx(viewInvoice);
                            setRejectDialogOpen(true);
                          }}
                          className="gap-1 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          <AlertTriangle className="size-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>

                  <Button type="button" onClick={() => setViewInvoice(null)} className="text-xs">
                    Close
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Dedicated Approve Confirmation Dialog ────────────────────────── */}
      <Dialog open={!!approveConfirmTx} onOpenChange={() => setApproveConfirmTx(null)}>
        <DialogContent className="max-w-md bg-card text-foreground border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="size-5 text-emerald-500" />
              Approve this payment?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirming will authorize the payment, mark the invoice as PAID, activate the tenant's subscription, create an authoritative ledger entry, and send a confirmation email.
            </DialogDescription>
          </DialogHeader>

          {approveConfirmTx && (
            <div className="space-y-2.5 py-3 text-xs border-y border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-mono font-bold text-foreground">
                  {approveConfirmTx.invoiceId || approveConfirmTx.transactionNo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tenant / Company:</span>
                <span className="font-semibold text-foreground">
                  {approveConfirmTx.customerName} (@{approveConfirmTx.tenantSlug})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium text-foreground">{approveConfirmTx.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Settlement Amount:</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(approveConfirmTx.amount, approveConfirmTx.currency)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isProcessingAction}
              onClick={() => setApproveConfirmTx(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessingAction}
              onClick={async () => {
                if (!approveConfirmTx) return;
                const tx = approveConfirmTx;
                await handleApprovePayment(tx.id);
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isProcessingAction && <Loader2 className="size-3.5 animate-spin" />}
              Approve Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dedicated Customer Payment Proof Preview Dialog (Section 9) ─── */}
      <Dialog open={!!proofPreviewTx} onOpenChange={() => setProofPreviewTx(null)}>
        <DialogContent className="max-w-2xl bg-card text-foreground border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileCheck className="size-4 text-purple-600" />
              Payment Proof
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Customer-uploaded manual payment proof evidence for Invoice #{proofPreviewTx?.invoiceId || proofPreviewTx?.transactionNo} ({proofPreviewTx?.customerName})
            </DialogDescription>
          </DialogHeader>

          {proofPreviewTx?.proofUrl && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-2.5 rounded-md bg-muted/40 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Invoice:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {proofPreviewTx.invoiceId || proofPreviewTx.transactionNo}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Tenant:</span>
                  <span className="font-semibold text-foreground truncate block">
                    {proofPreviewTx.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Amount:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(proofPreviewTx.amount, proofPreviewTx.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Reference / UTR:</span>
                  <span className="font-mono font-bold text-foreground truncate block">
                    {proofPreviewTx.bankTransferRef || proofPreviewTx.gatewayPaymentId || "None"}
                  </span>
                </div>
              </div>

              {/* Preview Box */}
              <div className="rounded-lg border border-border bg-black/5 dark:bg-black/30 overflow-hidden flex flex-col items-center justify-center min-h-[300px] max-h-[500px]">
                {proofPreviewTx.proofUrl.toLowerCase().includes(".pdf") ? (
                  <iframe
                    src={proofPreviewTx.proofUrl}
                    className="w-full h-[450px] border-0"
                    title="PDF Payment Proof"
                  />
                ) : (
                  <img
                    src={proofPreviewTx.proofUrl}
                    alt="Payment Proof"
                    className="max-h-[450px] w-auto object-contain cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(proofPreviewTx.proofUrl || "", "_blank")}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>

              {proofPreviewTx.proofNotes && (
                <p className="text-xs text-muted-foreground italic px-1">
                  Tenant Submission Notes: {proofPreviewTx.proofNotes}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between flex-wrap">
            <div className="flex items-center gap-2">
              {proofPreviewTx?.proofUrl && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(proofPreviewTx.proofUrl || "", "_blank")}
                    className="text-xs gap-1.5"
                  >
                    <ExternalLink className="size-3.5" />
                    Open Full Size ↗
                  </Button>
                  <a
                    href={proofPreviewTx.proofUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <Download className="size-3.5" />
                    Download Proof File
                  </a>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {proofPreviewTx && (() => {
                const proofMeta = getTransactionStatusMeta(proofPreviewTx);
                return (
                  <>
                    {proofMeta.canApproveOrReject && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          onClick={() => {
                            const target = proofPreviewTx;
                            setProofPreviewTx(null);
                            setApproveConfirmTx(target);
                          }}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="text-xs gap-1 bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={() => {
                            const target = proofPreviewTx;
                            setProofPreviewTx(null);
                            setRejectTargetTx(target);
                            setRejectDialogOpen(true);
                          }}
                        >
                          <AlertTriangle className="size-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setProofPreviewTx(null)}
                      className="text-xs"
                    >
                      Close
                    </Button>
                  </>
                );
              })()}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Modal */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md bg-card text-foreground border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-500" />
              Reject Payment Verification
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide a safe explanation for why this payment proof was rejected. This reason will be emailed to the tenant billing contact.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Rejection Reason:
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. UTR reference number not found in bank statement, screenshot illegible, or amount does not match."
              rows={3}
              className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectTargetTx(null);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isProcessingAction}
              onClick={handleRejectPayment}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
