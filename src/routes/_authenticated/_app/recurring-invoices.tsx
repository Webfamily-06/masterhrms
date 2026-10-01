import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Repeat,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Printer,
  Calendar,
  RotateCcw,
  Search,
  Download,
  MoreVertical,
  Play,
  Pause,
  Pencil,
  FileSpreadsheet,
  FileText,
  Clock,
  DollarSign,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/recurring-invoices")({
  component: RecurringInvoicesPage,
  head: () => ({ meta: [{ title: "Recurring Invoices — Master ERP" }] }),
});

export type RecurringInvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
};

export type RecurringInvoiceRecord = {
  id: string;
  recurringInvoiceNo: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerId?: string;
  reference?: string;
  cycle: string;
  startDate: string;
  dueDate?: string | null;
  nextIssueDate: string;
  endDate?: string | null;
  status: "Active" | "Paused" | "Cancelled" | "Draft" | "Completed";
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  shippingCharge: number;
  totalAmount: number;
  issuesSentCount: number;
  lastIssueDate?: string | null;
  notes?: string;
  terms?: string;
  items: RecurringInvoiceItem[];
  history?: {
    id: string;
    invoiceNo: string;
    date: string;
    dueDate?: string | null;
    total: number;
    paymentStatus: string;
  }[];
};

export default function RecurringInvoicesPage() {
  const queryClient = useQueryClient();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Selected schedule for preview / edit / delete
  const [selectedRecord, setSelectedRecord] = useState<RecurringInvoiceRecord | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    id?: string;
    recurringInvoiceNo: string;
    customerName: string;
    customerEmail: string;
    customerAddress: string;
    reference: string;
    cycle: string;
    startDate: string;
    dueDate: string;
    nextIssueDate: string;
    endDate: string;
    status: "Active" | "Paused" | "Cancelled" | "Draft";
    taxRate: number;
    discountRate: number;
    shippingCharge: number;
    notes: string;
    terms: string;
    items: RecurringInvoiceItem[];
  }>({
    recurringInvoiceNo: "",
    customerName: "",
    customerEmail: "",
    customerAddress: "",
    reference: "",
    cycle: "Monthly",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    nextIssueDate: new Date().toISOString().split("T")[0],
    endDate: "",
    status: "Active",
    taxRate: 18,
    discountRate: 0,
    shippingCharge: 0,
    notes: "Thank you for your business. Invoices are automatically billed on schedule.",
    terms: "Payment is due within 15 days of issue date.",
    items: [
      {
        description: "Monthly Software License & Cloud Hosting",
        quantity: 1,
        unitPrice: 1250,
        discount: 0,
        amount: 1250,
      },
    ],
  });

  // Query Recurring Invoices
  const { data: response, isLoading, refetch } = useQuery<{
    data: RecurringInvoiceRecord[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    summary: { totalActive: number; totalPaused: number; totalCancelled: number; totalVolume: number };
  }>({
    queryKey: [
      "recurring-invoices",
      searchTerm,
      statusFilter,
      cycleFilter,
      sortBy,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        cycle: cycleFilter,
        sortBy,
        page: page.toString(),
        limit: pageSize.toString(),
      });
      const res = await api.get(`/api/invoices/recurring?${params.toString()}`);
      return res.data;
    },
  });

  const records = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const summary = response?.summary || { totalActive: 0, totalPaused: 0, totalCancelled: 0, totalVolume: 0 };

  // Fetch single recurring invoice details when previewed
  const { data: previewDetails, isLoading: previewLoading } = useQuery<RecurringInvoiceRecord>({
    queryKey: ["recurring-invoice-details", selectedRecord?.id],
    queryFn: async () => {
      if (!selectedRecord?.id) throw new Error("No record selected");
      const res = await api.get(`/api/invoices/recurring/${selectedRecord.id}`);
      return res.data;
    },
    enabled: !!selectedRecord?.id && previewModalOpen,
  });

  // Calculations for Form
  const formSubtotal = useMemo(() => {
    return formData.items.reduce((acc, it) => acc + (it.unitPrice * it.quantity - it.discount), 0);
  }, [formData.items]);

  const formTaxAmount = useMemo(() => {
    return Math.round((formSubtotal * (formData.taxRate / 100)) * 100) / 100;
  }, [formSubtotal, formData.taxRate]);

  const formDiscountAmount = useMemo(() => {
    return Math.round((formSubtotal * (formData.discountRate / 100)) * 100) / 100;
  }, [formSubtotal, formData.discountRate]);

  const formTotalAmount = useMemo(() => {
    return formSubtotal + formTaxAmount - formDiscountAmount + Number(formData.shippingCharge || 0);
  }, [formSubtotal, formTaxAmount, formDiscountAmount, formData.shippingCharge]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post("/api/invoices/recurring", payload)).data;
    },
    onSuccess: () => {
      toast.success("Recurring invoice schedule created successfully");
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      setCreateModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create recurring invoice");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return (await api.put(`/api/invoices/recurring/${id}`, payload)).data;
    },
    onSuccess: () => {
      toast.success("Recurring invoice updated successfully");
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-details"] });
      setEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update recurring invoice");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return (await api.patch(`/api/invoices/recurring/${id}/status`, { status })).data;
    },
    onSuccess: (data) => {
      toast.success(`Schedule status changed to ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/api/invoices/recurring/${id}`)).data;
    },
    onSuccess: () => {
      toast.success("Recurring invoice schedule deleted");
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      setDeleteModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete recurring invoice");
    },
  });

  const generateNowMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/api/invoices/recurring/${id}/generate`)).data;
    },
    onSuccess: (data) => {
      if (data.status === "already_generated") {
        toast.info(data.error || "Invoice already generated for current cycle.");
      } else {
        toast.success(`Invoice ${data.invoiceNo} successfully generated!`);
      }
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-details"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to generate invoice");
    },
  });

  const processDueMutation = useMutation({
    mutationFn: async () => {
      return (await api.post("/api/invoices/recurring/process-due")).data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Due recurring invoices processed successfully.");
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to run batch generator");
    },
  });

  // Modal Handlers
  const handleOpenCreate = () => {
    setFormData({
      recurringInvoiceNo: "",
      customerName: "",
      customerEmail: "",
      customerAddress: "",
      reference: "",
      cycle: "Monthly",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      nextIssueDate: new Date().toISOString().split("T")[0],
      endDate: "",
      status: "Active",
      taxRate: 18,
      discountRate: 0,
      shippingCharge: 0,
      notes: "Thank you for your business. Invoices are automatically billed on schedule.",
      terms: "Payment is due within 15 days of issue date.",
      items: [
        {
          description: "Monthly Service Subscription",
          quantity: 1,
          unitPrice: 1000,
          discount: 0,
          amount: 1000,
        },
      ],
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (rec: RecurringInvoiceRecord) => {
    setSelectedRecord(rec);
    setFormData({
      id: rec.id,
      recurringInvoiceNo: rec.recurringInvoiceNo,
      customerName: rec.customerName,
      customerEmail: rec.customerEmail || "",
      customerAddress: rec.customerAddress || "",
      reference: rec.reference || "",
      cycle: rec.cycle,
      startDate: rec.startDate ? rec.startDate.split("T")[0] : "",
      dueDate: rec.dueDate ? rec.dueDate.split("T")[0] : "",
      nextIssueDate: rec.nextIssueDate ? rec.nextIssueDate.split("T")[0] : "",
      endDate: rec.endDate ? rec.endDate.split("T")[0] : "",
      status: rec.status === "Completed" ? "Active" : (rec.status as any),
      taxRate: rec.taxRate || 18,
      discountRate: rec.discountRate || 0,
      shippingCharge: rec.shippingCharge || 0,
      notes: rec.notes || "",
      terms: rec.terms || "",
      items: rec.items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        amount: it.amount,
      })),
    });
    setEditModalOpen(true);
  };

  const handleOpenPreview = (rec: RecurringInvoiceRecord) => {
    setSelectedRecord(rec);
    setPreviewModalOpen(true);
  };

  const handleOpenDelete = (rec: RecurringInvoiceRecord) => {
    setSelectedRecord(rec);
    setDeleteModalOpen(true);
  };

  // Line item helpers
  const handleItemChange = (index: number, field: keyof RecurringInvoiceItem, value: any) => {
    const updated = [...formData.items];
    const item = { ...updated[index], [field]: value };
    item.amount = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0);
    updated[index] = item;
    setFormData({ ...formData, items: updated });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: "Additional Subscription / Service",
          quantity: 1,
          unitPrice: 250,
          discount: 0,
          amount: 250,
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) {
      toast.warning("At least one line item is required");
      return;
    }
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  // Submit Create
  const handleCreateSubmit = (statusOverride?: "Active" | "Draft") => {
    if (!formData.customerName.trim()) {
      toast.error("Please enter a customer name");
      return;
    }
    createMutation.mutate({
      ...formData,
      status: statusOverride || formData.status,
      subtotal: formSubtotal,
      taxAmount: formTaxAmount,
      discountAmount: formDiscountAmount,
      totalAmount: formTotalAmount,
    });
  };

  // Submit Edit
  const handleEditSubmit = () => {
    if (!selectedRecord?.id) return;
    if (!formData.customerName.trim()) {
      toast.error("Please enter a customer name");
      return;
    }
    updateMutation.mutate({
      id: selectedRecord.id,
      payload: {
        ...formData,
        subtotal: formSubtotal,
        taxAmount: formTaxAmount,
        discountAmount: formDiscountAmount,
        totalAmount: formTotalAmount,
      },
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.warning("No recurring invoices to export");
      return;
    }
    const headers = [
      "RI ID",
      "Customer",
      "Email",
      "Cycle",
      "Start Date",
      "Next Issue",
      "Subtotal",
      "Tax Amount",
      "Total Amount",
      "Status",
      "Issues Sent",
    ];
    const rows = records.map((r) => [
      `"${r.recurringInvoiceNo}"`,
      `"${r.customerName}"`,
      `"${r.customerEmail || ""}"`,
      `"${r.cycle}"`,
      `"${r.startDate ? r.startDate.split("T")[0] : ""}"`,
      `"${r.nextIssueDate ? r.nextIssueDate.split("T")[0] : ""}"`,
      r.subtotal,
      r.taxAmount,
      r.totalAmount,
      `"${r.status}"`,
      r.issuesSentCount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recurring_invoices_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully");
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* ─── PAGE HEADER (Exact match to ui/recurring-invoices.html) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">Recurring Invoices</span>
          </div>
          <h1 className="text-gray-900 text-xl font-bold tracking-tight mb-0">Recurring Invoices</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Print Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5 text-xs font-medium border-border-color bg-white hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="size-3.5 text-gray-500" />
            <span>Print</span>
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium border-border-color bg-white hover:bg-slate-50 cursor-pointer"
              >
                <Download className="size-3.5 text-gray-500" />
                <span>Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="size-4 text-emerald-600" />
                <span>Export as Excel / CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                <FileText className="size-4 text-rose-600" />
                <span>Export as PDF (Print)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Process Due Now (Scheduler trigger) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => processDueMutation.mutate()}
            disabled={processDueMutation.isPending}
            className="h-8 gap-1.5 text-xs font-medium border-border-color bg-white hover:bg-slate-50 cursor-pointer"
            title="Scan and generate due invoices for active recurring schedules"
          >
            {processDueMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : (
              <Play className="size-3.5 text-primary" />
            )}
            <span>Process Due</span>
          </Button>

          {/* Add New Button */}
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 gap-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-primary-hover cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add New</span>
          </Button>
        </div>
      </div>

      {/* ─── SUMMARY KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border-color shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Schedules</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{summary.totalActive}</p>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500"></span> Generating on schedule
              </p>
            </div>
            <div className="size-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Repeat className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border-color shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Monthly Active Volume</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatSystemAmount(summary.totalVolume)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recurring revenue run-rate</p>
            </div>
            <div className="size-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border-color shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Paused Schedules</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{summary.totalPaused}</p>
              <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-amber-500"></span> Temporarily on hold
              </p>
            </div>
            <div className="size-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Pause className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border-color shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cancelled Schedules</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{summary.totalCancelled}</p>
              <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-rose-500"></span> Terminated contracts
              </p>
            </div>
            <div className="size-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── MAIN CONTENT CONTAINER (Matching ui/recurring-invoices.html) ─── */}
      <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="size-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search RI ID, Customer..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pr-8 h-8 text-xs border-border-color rounded-md bg-white focus:ring-0"
              />
            </div>

            {/* Cycle Filter */}
            <div className="w-36">
              <Select
                value={cycleFilter}
                onValueChange={(val) => {
                  setCycleFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs border-border-color bg-white">
                  <SelectValue placeholder="Cycle: All" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Cycles</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-36">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs border-border-color bg-white">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-normal border-border-color bg-white hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowUpDown className="size-3 text-gray-500" />
                  <span>
                    Sort: {sortBy === "newest" ? "Newest" : sortBy === "oldest" ? "Oldest" : sortBy === "high" ? "Highest" : sortBy === "low" ? "Lowest" : sortBy.toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                <DropdownMenuItem onClick={() => setSortBy("newest")} className="cursor-pointer">
                  Newest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")} className="cursor-pointer">
                  Oldest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("az")} className="cursor-pointer">
                  A - Z (Customer)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("za")} className="cursor-pointer">
                  Z - A (Customer)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("high")} className="cursor-pointer">
                  Highest Amount
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("low")} className="cursor-pointer">
                  Lowest Amount
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="size-8 p-0 border-border-color bg-white hover:bg-slate-50 cursor-pointer"
              title="Refresh"
            >
              <RotateCcw className="size-3.5 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* ─── DATA TABLE ─── */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border-color text-gray-500 font-semibold bg-slate-50/60">
                <th className="py-2.5 px-3 text-gray-900 font-semibold">RI ID</th>
                <th className="py-2.5 px-3 text-gray-900 font-semibold">Customer</th>
                <th className="py-2.5 px-3 text-gray-900 font-semibold">Cycle</th>
                <th className="py-2.5 px-3 text-gray-900 font-semibold">Next Issue</th>
                <th className="py-2.5 px-3 text-gray-900 font-semibold">Amount</th>
                <th className="py-2.5 px-3 text-gray-900 font-semibold">Status</th>
                <th className="py-2.5 px-3 text-gray-900 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span>Loading recurring invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    <p className="font-medium text-gray-700">No recurring invoices found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create your first automated recurring invoice schedule using the "Add New" button.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const isDue = new Date(rec.nextIssueDate) <= new Date() && rec.status === "Active";

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* RI ID */}
                      <td className="py-2.5 px-3 font-medium text-primary cursor-pointer hover:underline">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(rec)}
                          className="font-medium text-primary hover:underline text-left cursor-pointer"
                        >
                          {rec.recurringInvoiceNo}
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-gray-900 leading-tight">{rec.customerName}</p>
                        {rec.customerEmail && (
                          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                            {rec.customerEmail}
                          </p>
                        )}
                      </td>

                      {/* Cycle */}
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="font-normal text-[11px] bg-slate-50 border-border-color">
                          {rec.cycle}
                        </Badge>
                      </td>

                      {/* Next Issue */}
                      <td className="py-2.5 px-3 text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {new Date(rec.nextIssueDate).toLocaleDateString("en-US", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {isDue && (
                            <span
                              className="size-2 rounded-full bg-amber-500 animate-pulse"
                              title="Invoice is currently due for generation"
                            />
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {formatSystemAmount(rec.totalAmount)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        {rec.status === "Active" && (
                          <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                            Active
                          </span>
                        )}
                        {rec.status === "Paused" && (
                          <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">
                            Paused
                          </span>
                        )}
                        {rec.status === "Cancelled" && (
                          <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-medium">
                            Cancelled
                          </span>
                        )}
                        {(rec.status === "Draft" || rec.status === "Completed") && (
                          <span className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium">
                            {rec.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 border border-border-color rounded-md hover:bg-slate-100 cursor-pointer"
                            >
                              <MoreVertical className="size-3.5 text-gray-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuItem
                              onClick={() => handleOpenPreview(rec)}
                              className="gap-2 cursor-pointer"
                            >
                              <Eye className="size-3.5 text-gray-500" />
                              <span>Preview Schedule</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => generateNowMutation.mutate(rec.id)}
                              disabled={generateNowMutation.isPending}
                              className="gap-2 cursor-pointer text-indigo-600 font-medium"
                            >
                              <Play className="size-3.5 text-indigo-600" />
                              <span>Generate Invoice Now</span>
                            </DropdownMenuItem>

                            {rec.status === "Active" ? (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: rec.id, status: "Paused" })}
                                className="gap-2 cursor-pointer text-amber-600"
                              >
                                <Pause className="size-3.5 text-amber-600" />
                                <span>Pause Schedule</span>
                              </DropdownMenuItem>
                            ) : rec.status === "Paused" ? (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: rec.id, status: "Active" })}
                                className="gap-2 cursor-pointer text-emerald-600"
                              >
                                <Play className="size-3.5 text-emerald-600" />
                                <span>Resume Schedule</span>
                              </DropdownMenuItem>
                            ) : null}

                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(rec)}
                              className="gap-2 cursor-pointer"
                            >
                              <Pencil className="size-3.5 text-gray-500" />
                              <span>Edit Schedule</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenDelete(rec)}
                              className="gap-2 cursor-pointer text-rose-600 hover:text-rose-700"
                            >
                              <Trash2 className="size-3.5 text-rose-600" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── PAGINATION (Exact match to ui/recurring-invoices.html) ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-color text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 text-xs border-border-color bg-white w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="10">10 / Page</SelectItem>
                <SelectItem value="25">25 / Page</SelectItem>
                <SelectItem value="50">50 / Page</SelectItem>
                <SelectItem value="100">100 / Page</SelectItem>
              </SelectContent>
            </Select>
            <span>of {pagination.total} records</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-7 px-2 border-border-color text-xs cursor-pointer"
            >
              Prev
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pNum = i + 1;
              return (
                <Button
                  key={pNum}
                  variant={pNum === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pNum)}
                  className={cn(
                    "size-7 p-0 text-xs cursor-pointer",
                    pNum === page ? "bg-gray-900 text-white" : "border-border-color text-gray-900"
                  )}
                >
                  {pNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="h-7 px-2 border-border-color text-xs cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ─── CREATE / EDIT RECURRING INVOICE MODAL (Matching ui/add-recurring-invoice.html) ─── */}
      <Dialog
        open={createModalOpen || editModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false);
            setEditModalOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {editModalOpen ? "Edit Recurring Invoice Schedule" : "Create New Recurring Invoice"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define customer details, recurring frequency, and billing line items for automatic invoice generation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-2 text-xs">
            {/* Top Grid: Company/Customer & Schedule Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-border-color">
              {/* Left Column: Customer details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Customer Details</h3>

                <div>
                  <Label className="text-xs font-semibold text-gray-900 mb-1 block">
                    Customer Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Alexander Kenn / TechCorp Inc"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="h-8 text-xs border-border-color bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-900 mb-1 block">Customer Email</Label>
                  <Input
                    type="email"
                    placeholder="billing@customer.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="h-8 text-xs border-border-color bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-900 mb-1 block">Billing Address</Label>
                  <Input
                    placeholder="123 Business Ave, New York, NY"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    className="h-8 text-xs border-border-color bg-white"
                  />
                </div>
              </div>

              {/* Right Column: Recurring Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Schedule & Frequency</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-900 mb-1 block">
                      RI ID / Reference
                    </Label>
                    <Input
                      placeholder="e.g. #RI0021"
                      value={formData.recurringInvoiceNo}
                      onChange={(e) => setFormData({ ...formData, recurringInvoiceNo: e.target.value })}
                      className="h-8 text-xs border-border-color bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-900 mb-1 block">
                      Frequency <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={formData.cycle}
                      onValueChange={(val) => setFormData({ ...formData, cycle: val })}
                    >
                      <SelectTrigger className="h-8 text-xs border-border-color bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Weekly">Weekly (Every 7 days)</SelectItem>
                        <SelectItem value="Monthly">Monthly (Every month)</SelectItem>
                        <SelectItem value="Quarterly">Quarterly (Every 3 months)</SelectItem>
                        <SelectItem value="Yearly">Yearly (Every 12 months)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-900 mb-1 block">
                      Start Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="h-8 text-xs border-border-color bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-900 mb-1 block">
                      Next Issue Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formData.nextIssueDate}
                      onChange={(e) => setFormData({ ...formData, nextIssueDate: e.target.value })}
                      className="h-8 text-xs border-border-color bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-900 mb-1 block">Due Date (Payment Terms)</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="h-8 text-xs border-border-color bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-900 mb-1 block">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger className="h-8 text-xs border-border-color bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Paused">Paused</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table (Matching ui/add-recurring-invoice.html) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs gap-1 border-border-color bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  <Plus className="size-3" />
                  <span>Add Line Item</span>
                </Button>
              </div>

              <div className="border border-border-color rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-color bg-slate-50 text-gray-700 font-semibold">
                      <th className="py-2 px-3 text-left w-2/5">Description</th>
                      <th className="py-2 px-3 text-center w-24">Qty</th>
                      <th className="py-2 px-3 text-right w-28">Unit Price</th>
                      <th className="py-2 px-3 text-right w-24">Discount</th>
                      <th className="py-2 px-3 text-right w-28">Total</th>
                      <th className="py-2 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="p-2">
                          <Input
                            placeholder="Service or Product description"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                            className="h-8 text-xs border-border-color bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                            className="h-8 text-xs text-center border-border-color bg-white w-20 mx-auto"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right border-border-color bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => handleItemChange(idx, "discount", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right border-border-color bg-white"
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-gray-900">
                          {formatSystemAmount(item.amount)}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(idx)}
                            className="size-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Row: Notes & Summary Financial Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-border-color">
              <div className="md:col-span-7 space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-900 mb-1 block">Notes / Customer Memo</Label>
                  <Textarea
                    rows={2}
                    placeholder="Enter additional billing notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="text-xs border-border-color"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-900 mb-1 block">Terms & Conditions</Label>
                  <Textarea
                    rows={2}
                    placeholder="Enter standard payment terms..."
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    className="text-xs border-border-color"
                  />
                </div>
              </div>

              <div className="md:col-span-5 space-y-2 bg-slate-50 p-4 rounded-md border border-border-color">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatSystemAmount(formSubtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-muted-foreground">Tax ({formData.taxRate}%)</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                      className="h-6 w-12 text-xs text-right p-1"
                    />
                    <span className="font-medium text-gray-900">{formatSystemAmount(formTaxAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-muted-foreground">Discount ({formData.discountRate}%)</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={formData.discountRate}
                      onChange={(e) => setFormData({ ...formData, discountRate: parseFloat(e.target.value) || 0 })}
                      className="h-6 w-12 text-xs text-right p-1"
                    />
                    <span className="font-medium text-gray-900">-{formatSystemAmount(formDiscountAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-muted-foreground">Shipping / Setup</span>
                  <Input
                    type="number"
                    value={formData.shippingCharge}
                    onChange={(e) => setFormData({ ...formData, shippingCharge: parseFloat(e.target.value) || 0 })}
                    className="h-6 w-20 text-xs text-right p-1"
                  />
                </div>

                <div className="pt-2 border-t border-border-color flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-900">Total Per Cycle</span>
                  <span className="text-primary text-base font-bold">{formatSystemAmount(formTotalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCreateModalOpen(false);
                setEditModalOpen(false);
              }}
              className="text-xs border-border-color cursor-pointer"
            >
              Cancel
            </Button>
            {!editModalOpen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCreateSubmit("Draft")}
                disabled={createMutation.isPending}
                className="text-xs border-border-color cursor-pointer"
              >
                Save as Draft
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => (editModalOpen ? handleEditSubmit() : handleCreateSubmit())}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="text-xs bg-gray-900 text-white hover:bg-primary-hover cursor-pointer"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="size-3.5 mr-1.5" />
              )}
              <span>{editModalOpen ? "Update Schedule" : "Save Invoice Schedule"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PREVIEW / DETAILS MODAL (Exact match to ui/recurring-invoice-details.html) ─── */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="border-b border-border-color pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                  <span>Recurring Invoices</span>
                  <span>/</span>
                  <span className="font-semibold text-primary">{selectedRecord?.recurringInvoiceNo}</span>
                </div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Recurring Invoice Preview
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 text-xs gap-1.5 border-border-color bg-white hover:bg-slate-50 cursor-pointer"
                >
                  <Printer className="size-3.5 text-gray-500" />
                  <span>Print</span>
                </Button>
                {selectedRecord && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setPreviewModalOpen(false);
                      handleOpenEdit(selectedRecord);
                    }}
                    className="h-8 text-xs gap-1.5 bg-gray-900 text-white hover:bg-primary-hover cursor-pointer"
                  >
                    <Pencil className="size-3.5" />
                    <span>Edit</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {previewLoading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Loading invoice passport...</span>
            </div>
          ) : (
            <div className="space-y-6 py-2 text-xs">
              {/* Top Banner: Company & RI ID */}
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Dreams ERP</h2>
                  <p className="text-muted-foreground text-xs">
                    123 Business Ave, Suite 500<br />
                    New York, NY 10001
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold tracking-wider text-gray-900">RECURRING INVOICE</h3>
                  <p className="font-semibold text-primary text-sm mt-0.5">{previewDetails?.recurringInvoiceNo || selectedRecord?.recurringInvoiceNo}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1 font-semibold text-[10px]",
                      previewDetails?.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {previewDetails?.status || selectedRecord?.status}
                  </Badge>
                </div>
              </div>

              {/* Bill To & Schedule Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-md bg-slate-50 border border-border-color">
                <div>
                  <p className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wide mb-1">Bill To</p>
                  <p className="text-sm font-bold text-gray-900">{previewDetails?.customerName || selectedRecord?.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {previewDetails?.customerEmail || selectedRecord?.customerEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {previewDetails?.customerAddress || selectedRecord?.customerAddress || "No billing address provided"}
                  </p>
                </div>

                <div className="space-y-1 text-right text-xs">
                  <div>
                    <span className="text-muted-foreground">Billing Cycle:</span>{" "}
                    <span className="font-semibold text-gray-900">{previewDetails?.cycle || selectedRecord?.cycle}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start Date:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {new Date(previewDetails?.startDate || selectedRecord?.startDate || "").toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Issue:</span>{" "}
                    <span className="font-semibold text-primary">
                      {new Date(previewDetails?.nextIssueDate || selectedRecord?.nextIssueDate || "").toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issues Sent:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {previewDetails?.issuesSentCount || selectedRecord?.issuesSentCount || 0} / Ongoing
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border-color rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-color bg-slate-100/70 text-gray-700 font-semibold">
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {(previewDetails?.items || selectedRecord?.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-gray-900">{it.description}</td>
                        <td className="py-2.5 px-3 text-right">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right">{formatSystemAmount(it.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                          {formatSystemAmount(it.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {formatSystemAmount(previewDetails?.subtotal || selectedRecord?.subtotal || 0)}
                    </span>
                  </div>
                  {Number(previewDetails?.taxAmount || selectedRecord?.taxAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium text-gray-900">
                        {formatSystemAmount(previewDetails?.taxAmount || selectedRecord?.taxAmount || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border-color text-sm font-bold">
                    <span className="text-gray-900">Total per Cycle</span>
                    <span className="text-primary font-bold">
                      {formatSystemAmount(previewDetails?.totalAmount || selectedRecord?.totalAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated Invoices History */}
              {previewDetails?.history && previewDetails.history.length > 0 && (
                <div className="pt-4 border-t border-border-color">
                  <h4 className="font-semibold text-gray-900 mb-2">Recently Generated Invoices</h4>
                  <div className="border border-border-color rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-border-color text-gray-600 font-medium">
                          <th className="py-1.5 px-3 text-left">Invoice No</th>
                          <th className="py-1.5 px-3 text-left">Issue Date</th>
                          <th className="py-1.5 px-right text-right">Amount</th>
                          <th className="py-1.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {previewDetails.history.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-3 font-medium text-primary">{inv.invoiceNo}</td>
                            <td className="py-1.5 px-3 text-muted-foreground">
                              {new Date(inv.date).toLocaleDateString()}
                            </td>
                            <td className="py-1.5 px-3 text-right font-medium text-gray-900">
                              {formatSystemAmount(inv.total)}
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              <Badge variant="outline" className="text-[10px] font-normal uppercase">
                                {inv.paymentStatus}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-border-color pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewModalOpen(false)}
              className="text-xs border-border-color cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION MODAL (Exact match to ui/recurring-invoices.html) ─── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm p-6 text-center">
          <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="size-6 text-rose-600" />
          </div>
          <DialogTitle className="text-base font-bold text-gray-900 mb-1">
            Delete Confirmation
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mb-4">
            Are you sure you want to delete recurring invoice schedule{" "}
            <span className="font-semibold text-gray-900">
              {selectedRecord?.recurringInvoiceNo}
            </span>{" "}
            for <span className="font-semibold text-gray-900">{selectedRecord?.customerName}</span>? This action cannot be undone.
          </DialogDescription>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => selectedRecord && deleteMutation.mutate(selectedRecord.id)}
              disabled={deleteMutation.isPending}
              className="w-full text-xs font-semibold cursor-pointer"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : null}
              <span>Yes, Delete</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="w-full text-xs border-border-color cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
