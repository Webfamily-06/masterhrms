'use client';

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE, getAuthToken } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Building2,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  Receipt,
  SlidersHorizontal,
} from "lucide-react";
import { PaymentProviderBadge, getPaymentProviderMeta } from "@/components/payment-provider-badge";
import { getSocketClient } from "@/lib/socket";

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

interface CanonicalInvoicePreview {
  invoiceNo: string;
  classification: string;
  status: string;
  issueDate: string;
  settlementDate?: string | null;
  billingPeriod?: string | null;
  supplier?: {
    name?: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
  };
  customer?: {
    name?: string;
    slug?: string | null;
    email?: string;
    address?: string | null;
    taxId?: string | null;
  };
  payment?: {
    gateway?: string;
    reference?: string | null;
    paymentDate?: string | null;
    currency?: string;
  };
  items?: Array<{
    description: string;
    subDescription?: string | null;
    sacCode?: string | null;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxableAmount: number;
    taxRate?: number;
    taxAmount: number;
    totalAmount: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  taxBreakup?: {
    cgst?: number;
    sgst?: number;
    igst?: number;
  } | null;
  total: number;
  currency: string;
  notes?: string | null;
  verification?: {
    status?: string;
    summary?: string;
    provider?: string;
    orderId?: string | null;
    paymentId?: string | null;
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

const ALLOWED_TRANSACTION_STATUSES = [
  { value: "paid", label: "Paid", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "open", label: "Open", badgeClass: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  { value: "pending", label: "Pending", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "failed", label: "Failed", badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  { value: "void", label: "Void", badgeClass: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
] as const;

type AllowedStatusValue = (typeof ALLOWED_TRANSACTION_STATUSES)[number]["value"];

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const label = now.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return { start: toIsoDate(first), end: toIsoDate(last), label };
}

function formatCurrency(val: number | string, curr: string = "USD") {
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

function isManualVerification(tx?: DatabaseTransaction | null): boolean {
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

function getTransactionStatusMeta(tx: DatabaseTransaction): TransactionStatusMeta {
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
    tx.rawStatus === "declined" ||
    tx.rawStatus === "void";

  let paymentStatusLabel: string;
  let paymentStatusClass: string;
  let paymentStatusIconType: "check" | "clock" | "alert" | "point" = "point";

  if (isPaid) {
    paymentStatusLabel = "Paid";
    paymentStatusClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    paymentStatusIconType = "check";
  } else if (tx.rawStatus === "void") {
    paymentStatusLabel = "Void";
    paymentStatusClass = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    paymentStatusIconType = "alert";
  } else if (isFailed) {
    if (isManual) {
      paymentStatusLabel = tx.status === "Rejected" ? "Rejected" : "Failed";
      paymentStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    } else {
      paymentStatusLabel = tx.rawStatus === "declined" ? "Declined" : "Failed";
      paymentStatusClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
    paymentStatusIconType = "alert";
  } else if (tx.rawStatus === "open") {
    paymentStatusLabel = "Open";
    paymentStatusClass = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    paymentStatusIconType = "clock";
  } else {
    if (isManual) {
      paymentStatusLabel = "Pending Review";
      paymentStatusClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      paymentStatusIconType = "clock";
    } else {
      paymentStatusLabel = "Processing";
      paymentStatusClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      paymentStatusIconType = "clock";
    }
  }

  let verificationStatusLabel: string;
  let verificationStatusClass: string;
  let verificationIconType: "shieldCheck" | "shieldAlert" | "clock" | "alert" = "clock";

  if (isPaid || tx.verificationStatus === "VERIFIED" || tx.verification?.status === "VERIFIED") {
    verificationStatusLabel = "VERIFIED";
    verificationStatusClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    verificationIconType = "shieldCheck";
  } else if (isFailed || tx.verificationStatus === "REJECTED") {
    verificationStatusLabel = isManual ? "REJECTED" : "FAILED";
    verificationStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    verificationIconType = "shieldAlert";
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
  const currentMonth = useMemo(() => getCurrentMonthRange(), []);

  // Search & Filter State — initialized to current month range
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

  // Selection & Dialog States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewInvoice, setViewInvoice] = useState<DatabaseTransaction | null>(null);
  const [previewTargetTx, setPreviewTargetTx] = useState<DatabaseTransaction | null>(null);
  const [statusEditTx, setStatusEditTx] = useState<DatabaseTransaction | null>(null);
  const [newTxStatus, setNewTxStatus] = useState<AllowedStatusValue>("paid");
  const [statusNotes, setStatusNotes] = useState("");

  // Bulk status update state
  const [bulkStatusTarget, setBulkStatusTarget] = useState<AllowedStatusValue>("paid");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const [approveConfirmTx, setApproveConfirmTx] = useState<DatabaseTransaction | null>(null);
  const [proofPreviewTx, setProofPreviewTx] = useState<DatabaseTransaction | null>(null);
  const [rejectTargetTx, setRejectTargetTx] = useState<DatabaseTransaction | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
  }, [
    debouncedSearch,
    paymentMethodFilter,
    verificationModeFilter,
    statusFilter,
    sortBy,
    startDate,
    endDate,
    currentPage,
    pageSize,
  ]);

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
      return (res as any)?.data || res || { transactions: [], pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 } };
    },
    staleTime: 10_000,
  });

  // Live Invoice Preview query via GET /super/transactions/:id/preview
  const {
    data: invoicePreviewRes,
    isLoading: isLoadingPreview,
    isError: isPreviewError,
    error: previewError,
  } = useQuery<{ invoice?: CanonicalInvoicePreview }>({
    queryKey: ["super-transaction-preview", previewTargetTx?.id],
    queryFn: async () => {
      const res = await api.get(`/super/transactions/${previewTargetTx!.id}/preview`);
      return res?.data || res || {};
    },
    enabled: Boolean(previewTargetTx?.id),
  });

  const previewInvoice: CanonicalInvoicePreview | null = invoicePreviewRes?.invoice || null;

  // Mutation: Single transaction status update via PATCH /super/transactions/:id/status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: AllowedStatusValue; notes?: string }) => {
      return await api.patch(`/super/transactions/${id}/status`, { status, notes: notes || undefined });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Transaction status updated successfully.");
      setStatusEditTx(null);
      setStatusNotes("");
      queryClient.invalidateQueries({ queryKey: ["super-transactions-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update transaction status.");
    },
  });

  // Real-time Socket.IO invalidation
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

  const exportRowsToCsv = (items: DatabaseTransaction[], filenamePrefix: string) => {
    if (items.length === 0) {
      toast.error("No transactions available to export.");
      return;
    }

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

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} transaction record(s) to CSV.`);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
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
      exportRowsToCsv(items, "super_admin_transactions");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export transactions");
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkExportCSV = () => {
    const selectedItems = transactions.filter((tx) => selectedIds.includes(tx.id));
    exportRowsToCsv(selectedItems, "selected_transactions");
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    let succeeded = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await api.patch(`/super/transactions/${id}/status`, { status: bulkStatusTarget });
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
    setIsBulkUpdating(false);
    setBulkConfirmOpen(false);
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ["super-transactions-list"] });
    refetch();
    if (failed === 0) {
      toast.success(`Updated ${succeeded} transaction(s) to '${bulkStatusTarget}'.`);
    } else {
      toast.warning(`Updated ${succeeded} transaction(s); ${failed} failed.`);
    }
  };

  const handleDownloadInvoice = async (id: string, invoiceId: string) => {
    const loadingToast = toast.loading(`Generating PDF for Invoice #${invoiceId}...`);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/super/transactions/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Failed to download invoice PDF (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
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

  const openStatusEditor = (tx: DatabaseTransaction) => {
    const normalized = String(tx.rawStatus || tx.status || "pending").toLowerCase();
    const matched = ALLOWED_TRANSACTION_STATUSES.find((s) => s.value === normalized)?.value || "pending";
    setNewTxStatus(matched);
    setStatusNotes("");
    setStatusEditTx(tx);
  };

  // Real dynamic date range display (never hardcoded)
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
    return `All Dates (${currentMonth.label})`;
  }, [startDate, endDate, currentMonth.label]);

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Purchase Transactions"
        description="Inspect platform billing invoices, preview canonical tax documents, verify offline payment proofs, and update transaction statuses."
        icon={Receipt}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                queryClient.invalidateQueries({ queryKey: ["super-transactions-list"] });
                toast.info("Refreshed transaction records");
              }}
              disabled={isFetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting} className="gap-1.5 text-xs">
                  {isExporting ? (
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2">
                  <FileText className="size-3.5 text-emerald-600" />
                  Export Filtered Data (CSV)
                </DropdownMenuItem>
                {selectedIds.length > 0 && (
                  <DropdownMenuItem onClick={handleBulkExportCSV} className="cursor-pointer gap-2">
                    <FileCheck className="size-3.5 text-primary" />
                    Export Selected ({selectedIds.length}) CSV
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Badge className="bg-primary text-primary-foreground tabular-nums">{selectedIds.length}</Badge>
            <span className="font-semibold text-foreground">
              transaction{selectedIds.length === 1 ? "" : "s"} selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkExportCSV}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="size-3.5" />
              Export Selected CSV
            </Button>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Bulk target status"
                value={bulkStatusTarget}
                onChange={(e) => setBulkStatusTarget(e.target.value as AllowedStatusValue)}
                className="h-8 px-2.5 rounded-md border border-border bg-background text-xs text-foreground"
              >
                {ALLOWED_TRANSACTION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    Set Status: {s.label}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => setBulkConfirmOpen(true)}
                className="h-8 text-xs gap-1.5"
              >
                <SlidersHorizontal className="size-3.5" />
                Apply Status
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Main Transaction List Card */}
      <div className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-foreground">Transaction Ledger</h2>
            <Badge variant="secondary"className="text-[11px] tabular-nums">
              {pagination.total} total
            </Badge>
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
                className="pl-8 pr-7 py-1.5 text-xs bg-background border border-border rounded-md w-44 sm:w-48 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

            {/* Dynamic Date Range Filter Popover */}
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

                  {/* Dynamic Date Presets */}
                  <div className="pt-2 border-t border-border flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(currentMonth.start);
                        setEndDate(currentMonth.end);
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold rounded bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      This Month ({currentMonth.label})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const past = new Date();
                        past.setDate(today.getDate() - 7);
                        setStartDate(toIsoDate(past));
                        setEndDate(toIsoDate(today));
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                      className="px-2 py-1 text-[10px] rounded bg-muted hover:bg-accent text-foreground"
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const past = new Date();
                        past.setDate(today.getDate() - 30);
                        setStartDate(toIsoDate(past));
                        setEndDate(toIsoDate(today));
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                      className="px-2 py-1 text-[10px] rounded bg-muted hover:bg-accent text-foreground"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setCurrentPage(1);
                        setIsDatePopoverOpen(false);
                      }}
                      className="px-2 py-1 text-[10px] rounded bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground ml-auto"
                    >
                      Reset
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
              <DropdownMenuContent align="end" className="w-40 text-xs">
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
                    className={`cursor-pointer ${paymentMethodFilter === method ? "font-bold text-primary" : ""}`}
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
              <DropdownMenuContent align="end" className="w-36 text-xs">
                {["Select Status", "Paid", "Open", "Pending", "Failed", "Void"].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                    }}
                    className={`cursor-pointer ${statusFilter === status ? "font-bold text-primary" : ""}`}
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
              <DropdownMenuContent align="end" className="w-44 text-xs">
                {["All Modes", "Automatic Gateway", "Manual Review"].map((mode) => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => {
                      setVerificationModeFilter(mode);
                      setCurrentPage(1);
                    }}
                    className={`cursor-pointer ${verificationModeFilter === mode ? "font-bold text-primary" : ""}`}
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
              <DropdownMenuContent align="end" className="w-48 text-xs">
                {["Sort By : Last 7 Days", "Recently Added", "Ascending", "Descending", "Last Month"].map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => {
                      setSortBy(s);
                      setCurrentPage(1);
                    }}
                    className={`cursor-pointer ${sortBy === s ? "font-bold text-primary" : ""}`}
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
              <tr className="border-b border-border">
                <th className="bg-muted/50 p-3 w-10">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 whitespace-nowrap">
                  Transaction ID
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 whitespace-nowrap">
                  Invoice
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                  Tenant / Company
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 whitespace-nowrap">
                  Method & Provider
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 whitespace-nowrap">
                  Amount
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 whitespace-nowrap">
                  Payment Status
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 whitespace-nowrap">
                  Verification
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 whitespace-nowrap">
                  Date
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="font-medium text-foreground">Loading purchase transactions...</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
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
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <FileText className="size-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">No transactions found.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {debouncedSearch ||
                      paymentMethodFilter !== "Payment Method" ||
                      statusFilter !== "Select Status" ||
                      startDate ||
                      endDate
                        ? "No transactions match your current active filters."
                        : "There are no purchase transactions recorded yet."}
                    </p>
                    {(debouncedSearch ||
                      paymentMethodFilter !== "Payment Method" ||
                      statusFilter !== "Select Status" ||
                      startDate ||
                      endDate) && (
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
                    <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>

                      <td className="p-3 tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                        <span title={tx.id}>
                          {tx.transactionNo || (tx.id.length > 12 ? `${tx.id.slice(0, 10)}...` : tx.id)}
                        </span>
                      </td>

                      <td className="p-3 tabular-nums font-semibold text-foreground whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPreviewTargetTx(tx)}
                          className="text-primary hover:underline cursor-pointer"
                          title="Open canonical invoice preview"
                        >
                          {tx.invoiceId || tx.transactionNo}
                        </button>
                      </td>

                      <td className="p-3 max-w-[200px]">
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
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate" title={tx.customerName}>
                              {tx.customerName}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {tx.customerEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <PaymentProviderBadge provider={tx.paymentMethod} />
                          <span className="text-[11px] text-muted-foreground">{providerMeta.displayName}</span>
                        </div>
                      </td>

                      <td className="p-3 font-bold text-foreground whitespace-nowrap tabular-nums">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.paymentStatusClass}`}
                        >
                          {statusMeta.paymentStatusIconType === "check" ? (
                            <CheckCircle2 className="size-3" />
                          ) : statusMeta.paymentStatusIconType === "clock" ? (
                            <Clock className="size-3" />
                          ) : (
                            <AlertTriangle className="size-3" />
                          )}
                          {statusMeta.paymentStatusLabel}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
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

                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewTargetTx(tx)}
                            className="h-7 px-2 rounded-md border border-border bg-card text-foreground hover:bg-accent text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                            title="Invoice Preview"
                          >
                            <Receipt className="size-3 text-primary" />
                            Preview
                          </button>

                          <button
                            type="button"
                            onClick={() => setViewInvoice(tx)}
                            className="size-7 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                            title="Ledger & Verification Details"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openStatusEditor(tx)}
                            className="size-7 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent cursor-pointer"
                            title="Update Transaction Status"
                          >
                            <SlidersHorizontal className="size-3.5" />
                          </button>

                          {statusMeta.isManual && hasProof && (
                            <button
                              type="button"
                              onClick={() => setProofPreviewTx(tx)}
                              className="h-7 px-2 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                              title="View Payment Proof"
                            >
                              <FileCheck className="size-3" />
                              Proof
                            </button>
                          )}

                          {statusMeta.canApproveOrReject && (
                            <>
                              <button
                                type="button"
                                disabled={isProcessingAction}
                                onClick={() => setApproveConfirmTx(tx)}
                                className="h-7 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                                className="h-7 px-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Reject Manual Payment"
                              >
                                <AlertTriangle className="size-3" />
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDownloadInvoice(tx.id, tx.invoiceId || tx.transactionNo)}
                            className="size-7 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                            title="Download Invoice PDF"
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

        {/* Pagination Footer */}
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
            of <span className="font-semibold text-foreground">{pagination.total}</span> entries
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-accent disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(7, Math.max(1, pagination.totalPages)) }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`px-2.5 py-1 rounded border font-semibold ${
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
              className="px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-accent disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── CANONICAL INVOICE PREVIEW DIALOG (GET /super/transactions/:id/preview) ─── */}
      <Dialog open={Boolean(previewTargetTx)} onOpenChange={(o) => !o && setPreviewTargetTx(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <span className="flex items-center gap-2 text-base">
                <Receipt className="size-4 text-primary" />
                Invoice Preview — {previewInvoice?.invoiceNo || previewTargetTx?.invoiceId || previewTargetTx?.transactionNo}
              </span>
              {previewInvoice?.status && (
                <Badge
                  variant="outline"
                  className={
                    previewInvoice.status === "PAID"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : previewInvoice.status === "FAILED"
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }
                >
                  {previewInvoice.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {previewInvoice?.classification || "Canonical Billing Document Preview"}
            </DialogDescription>
          </DialogHeader>

          {isLoadingPreview ? (
            <div className="py-14 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">Loading canonical invoice preview...</p>
            </div>
          ) : isPreviewError || !previewInvoice ? (
            <Alert variant="danger">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                {(previewError as any)?.message || "Could not load invoice preview for this transaction."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              {/* Supplier & Customer Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Issued By (Supplier)
                  </span>
                  <p className="font-bold text-foreground">{previewInvoice.supplier?.name || "Platform Billing"}</p>
                  {previewInvoice.supplier?.address && (
                    <p className="text-muted-foreground">{previewInvoice.supplier.address}</p>
                  )}
                  {previewInvoice.supplier?.email && (
                    <p className="tabular-nums text-[11px]">{previewInvoice.supplier.email}</p>
                  )}
                  {previewInvoice.supplier?.gstin && (
                    <p className="tabular-nums text-[11px] text-muted-foreground">
                      GSTIN: {previewInvoice.supplier.gstin}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Billed To (Customer)
                  </span>
                  <p className="font-bold text-foreground">{previewInvoice.customer?.name || "Tenant Workspace"}</p>
                  {previewInvoice.customer?.slug && (
                    <p className="tabular-nums text-[11px] text-muted-foreground">@{previewInvoice.customer.slug}</p>
                  )}
                  {previewInvoice.customer?.email && (
                    <p className="tabular-nums text-[11px]">{previewInvoice.customer.email}</p>
                  )}
                  {previewInvoice.customer?.taxId && (
                    <p className="tabular-nums text-[11px] text-muted-foreground">
                      Tax ID: {previewInvoice.customer.taxId}
                    </p>
                  )}
                </div>
              </div>

              {/* Document Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Issue Date</span>
                  <span className="font-semibold text-foreground">{previewInvoice.issueDate || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Settlement Date</span>
                  <span className="font-semibold text-foreground">{previewInvoice.settlementDate || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Payment Gateway</span>
                  <span className="font-semibold text-foreground">{previewInvoice.payment?.gateway || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Reference</span>
                  <span className="tabular-nums text-[11px] text-foreground truncate block">
                    {previewInvoice.payment?.reference || "—"}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              {Array.isArray(previewInvoice.items) && previewInvoice.items.length > 0 && (
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80">
                        <th className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground p-2.5">
                          Description
                        </th>
                        <th className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground p-2.5 text-right">
                          Qty
                        </th>
                        <th className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground p-2.5 text-right">
                          Unit Price
                        </th>
                        <th className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground p-2.5 text-right">
                          Tax
                        </th>
                        <th className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground p-2.5 text-right">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {previewInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5">
                            <div className="font-semibold text-foreground">{item.description}</div>
                            {item.subDescription && (
                              <div className="text-[11px] text-muted-foreground">{item.subDescription}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">{item.quantity}</td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatCurrency(item.unitPrice, previewInvoice.currency)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatCurrency(item.taxAmount, previewInvoice.currency)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums font-semibold text-foreground">
                            {formatCurrency(item.totalAmount, previewInvoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals Breakdown */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(previewInvoice.subtotal, previewInvoice.currency)}</span>
                </div>
                {previewInvoice.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatCurrency(previewInvoice.discount, previewInvoice.currency)}</span>
                  </div>
                )}
                {previewInvoice.tax > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="tabular-nums">{formatCurrency(previewInvoice.tax, previewInvoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border font-bold text-sm text-foreground">
                  <span>Total Payable</span>
                  <span className="tabular-nums text-primary">
                    {formatCurrency(previewInvoice.total, previewInvoice.currency)}
                  </span>
                </div>
              </div>

              {previewInvoice.notes && (
                <p className="text-[11px] text-muted-foreground italic">{previewInvoice.notes}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {previewTargetTx && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleDownloadInvoice(
                    previewTargetTx.id,
                    previewInvoice?.invoiceNo || previewTargetTx.invoiceId || previewTargetTx.transactionNo
                  )
                }
                className="gap-1.5 text-xs"
              >
                <Download className="size-3.5" />
                Download PDF
              </Button>
            )}
            <Button size="sm" onClick={() => setPreviewTargetTx(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── UPDATE TRANSACTION STATUS DIALOG (PATCH /super/transactions/:id/status) ─── */}
      <Dialog open={Boolean(statusEditTx)} onOpenChange={(o) => !o && setStatusEditTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="size-4 text-primary" />
              Update Transaction Status
            </DialogTitle>
            <DialogDescription className="text-xs">
              Override billing ledger status for{" "}
              <strong className="tabular-nums">{statusEditTx?.invoiceId || statusEditTx?.transactionNo}</strong> (
              {statusEditTx?.customerName}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="tx-status-select" className="text-xs font-semibold">
                Target Status *
              </Label>
              <select
                id="tx-status-select"
                value={newTxStatus}
                onChange={(e) => setNewTxStatus(e.target.value as AllowedStatusValue)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground"
              >
                {ALLOWED_TRANSACTION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({s.value})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-status-notes" className="text-xs font-semibold">
                Audit Notes (Optional)
              </Label>
              <textarea
                id="tx-status-notes"
                rows={3}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Reason for manual status reconciliation..."
                className="w-full p-2.5 rounded-md border border-border bg-background text-xs text-foreground"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatusEditTx(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (!statusEditTx) return;
                updateStatusMutation.mutate({
                  id: statusEditTx.id,
                  status: newTxStatus,
                  notes: statusNotes.trim() || undefined,
                });
              }}
              className="gap-1.5"
            >
              {updateStatusMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── FULL LEDGER & VERIFICATION DETAILS MODAL ─── */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg bg-card text-foreground border-border shadow-xl">
          {viewInvoice && (() => {
            const drawerMeta = getTransactionStatusMeta(viewInvoice);
            const isDrawerManual = drawerMeta.isManual;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2 pr-6">
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
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${drawerMeta.paymentStatusClass}`}>
                      {drawerMeta.paymentStatusLabel}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Authoritative transaction ledger & verification metadata
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2 text-xs border-y border-border/80 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Customer Company:</span>
                    <span className="font-semibold text-foreground">{viewInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Workspace Tenant:</span>
                    <span className="tabular-nums text-foreground font-medium">@{viewInvoice.tenantSlug ||"system"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Billing Email:</span>
                    <span className="tabular-nums text-foreground">{viewInvoice.customerEmail}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subscription Plan:</span>
                    <span className="font-semibold text-foreground">
                      {viewInvoice.planName} ({viewInvoice.billingCycle})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Verification Mode:</span>
                    <span className="font-semibold text-foreground">
                      {isDrawerManual ? "MANUAL — Admin Review" : "AUTOMATIC — Gateway"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Reference / Payment ID:</span>
                    <span className="tabular-nums text-[11px] text-foreground">
                      {viewInvoice.bankTransferRef || viewInvoice.gatewayPaymentId || viewInvoice.gatewayOrderId || "None"}
                    </span>
                  </div>
                  {viewInvoice.rejectionReason && (
                    <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs">
                      <span className="font-bold text-rose-600 block mb-0.5">Rejection Reason:</span>
                      <p>{viewInvoice.rejectionReason}</p>
                    </div>
                  )}

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const target = viewInvoice;
                        setViewInvoice(null);
                        setPreviewTargetTx(target);
                      }}
                      className="gap-1.5 text-xs"
                    >
                      <Receipt className="size-3.5" />
                      Invoice Preview
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const target = viewInvoice;
                        setViewInvoice(null);
                        openStatusEditor(target);
                      }}
                      className="gap-1.5 text-xs"
                    >
                      <SlidersHorizontal className="size-3.5" />
                      Change Status
                    </Button>
                    {drawerMeta.canApproveOrReject && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isProcessingAction}
                          onClick={() => setApproveConfirmTx(viewInvoice)}
                          className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isProcessingAction}
                          onClick={() => {
                            setRejectTargetTx(viewInvoice);
                            setRejectDialogOpen(true);
                          }}
                          className="gap-1 text-xs"
                        >
                          <AlertTriangle className="size-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                  <Button type="button" size="sm" onClick={() => setViewInvoice(null)} className="text-xs">
                    Close
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Approve Manual Payment Confirmation */}
      <ConfirmationDialog
        open={Boolean(approveConfirmTx)}
        onOpenChange={(open) => !open && setApproveConfirmTx(null)}
        title={`Approve payment for ${approveConfirmTx?.invoiceId || approveConfirmTx?.transactionNo}?`}
        description={
          approveConfirmTx
            ? `Confirming will mark ${formatCurrency(approveConfirmTx.amount, approveConfirmTx.currency)} for ${approveConfirmTx.customerName} as PAID, activate the subscription, and dispatch a confirmation email.`
            : ""
        }
        confirmLabel="Approve Payment"
        variant="default"
        icon={<CheckCircle2 className="size-5 text-emerald-600" />}
        isLoading={isProcessingAction}
        onConfirm={() => {
          if (approveConfirmTx) void handleApprovePayment(approveConfirmTx.id);
        }}
      />

      {/* Bulk Status Update Confirmation */}
      <ConfirmationDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={`Update ${selectedIds.length} transaction(s) to "${bulkStatusTarget}"?`}
        description="This will apply PATCH /super/transactions/:id/status to each selected record in the billing ledger."
        confirmLabel={`Set ${selectedIds.length} to ${bulkStatusTarget}`}
        variant={bulkStatusTarget === "void" || bulkStatusTarget === "failed" ? "destructive" : "default"}
        isLoading={isBulkUpdating}
        onConfirm={handleBulkStatusUpdate}
      />

      {/* Payment Proof Preview Dialog */}
      <Dialog open={!!proofPreviewTx} onOpenChange={() => setProofPreviewTx(null)}>
        <DialogContent className="max-w-2xl bg-card text-foreground border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileCheck className="size-4 text-purple-600" />
              Payment Proof
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Customer-uploaded payment proof for Invoice #{proofPreviewTx?.invoiceId || proofPreviewTx?.transactionNo} ({proofPreviewTx?.customerName})
            </DialogDescription>
          </DialogHeader>

          {proofPreviewTx?.proofUrl && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-border bg-black/5 dark:bg-black/30 overflow-hidden flex flex-col items-center justify-center min-h-[260px] max-h-[480px]">
                {proofPreviewTx.proofUrl.toLowerCase().includes(".pdf") ? (
                  <iframe
                    src={proofPreviewTx.proofUrl}
                    className="w-full h-[420px] border-0"
                    title="PDF Payment Proof"
                  />
                ) : (
                  <img
                    src={proofPreviewTx.proofUrl}
                    alt="Payment Proof"
                    className="max-h-[420px] w-auto object-contain cursor-pointer"
                    onClick={() => window.open(proofPreviewTx.proofUrl || "", "_blank")}
                  />
                )}
              </div>
              {proofPreviewTx.proofNotes && (
                <p className="text-xs text-muted-foreground italic">{proofPreviewTx.proofNotes}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {proofPreviewTx?.proofUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(proofPreviewTx.proofUrl || "", "_blank")}
                className="text-xs gap-1.5"
              >
                <ExternalLink className="size-3.5" />
                Open Full Size
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => setProofPreviewTx(null)}>
              Close
            </Button>
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
              Provide a clear reason for rejecting this payment proof. This explanation will be emailed to the tenant billing contact.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <label className="text-xs font-semibold text-foreground">Rejection Reason:</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. UTR reference number not found in bank statement, or amount mismatch."
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
              className="text-xs"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SuperPurchaseTransactionsPage;
