import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Building2,
  CreditCard,
  Download,
  Eye,
  Calendar,
  Wallet,
  Sparkles,
  Plane,
  Coffee,
  Laptop,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  X,
  Settings2,
  Landmark,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/expenses")({
  component: ExpensesPage,
  head: () => ({ meta: [{ title: "Expense Claims & Reimbursements — Master HRMS" }] }),
});

const CATEGORY_ICON_MAP: Record<string, any> = {
  Plane: Plane,
  Coffee: Coffee,
  Laptop: Laptop,
  Layers: Layers,
  Plus: Plus,
  Receipt: Receipt,
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", label: "Pending Review" },
  manager_approved: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", label: "Manager Approved" },
  finance_approved: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30", label: "Finance Approved" },
  reimbursed: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", label: "Reimbursed" },
  rejected: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", label: "Rejected" },
};

export function ExpensesPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("claims");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isSubmitClaimOpen, setIsSubmitClaimOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [selectedClaimPassport, setSelectedClaimPassport] = useState<any>(null);
  const [isReimburseModalOpen, setIsReimburseModalOpen] = useState(false);
  const [claimToReimburse, setClaimToReimburse] = useState<any>(null);

  // Forms
  const [claimForm, setClaimForm] = useState({
    employeeId: "",
    categoryId: "",
    title: "",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    merchant: "",
    description: "",
    receiptUrl: "",
    receiptName: "receipt_proof.pdf",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    code: "",
    monthlyLimit: "",
    requiresReceipt: true,
    icon: "Receipt",
  });

  const [reimburseForm, setReimburseForm] = useState({
    reimbursementMethod: "payroll_addition",
    payrollMonth: new Date().toISOString().slice(0, 7),
    approverNotes: "Approved and scheduled for payroll credit",
  });

  // Queries
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

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["expense-categories", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/expenses/categories");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: claims = [], isLoading: isClaimsLoading } = useQuery({
    queryKey: ["expense-claims", tenantId, selectedStatusFilter, selectedCategoryFilter, searchQuery],
    queryFn: async () => {
      try {
        let url = `/expenses/claims?status=${selectedStatusFilter}&categoryId=${selectedCategoryFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["expense-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/expenses/summary");
      } catch {
        return { pendingAmount: 0, approvedAmount: 0, reimbursedAmount: 0, totalClaims: 0 };
      }
    },
  });

  // Mutations
  const createClaimMut = useMutation({
    mutationFn: async (payload: any) => api.post("/expenses/claims", payload),
    onSuccess: () => {
      toast.success("Expense claim submitted successfully!");
      qc.invalidateQueries({ queryKey: ["expense-claims"] });
      qc.invalidateQueries({ queryKey: ["expense-summary"] });
      setIsSubmitClaimOpen(false);
      resetClaimForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit expense claim"),
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status, approverNotes }: { id: string; status: string; approverNotes?: string }) =>
      api.put(`/expenses/claims/${id}/status`, { status, approverNotes }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Expense claim status updated!");
      qc.invalidateQueries({ queryKey: ["expense-claims"] });
      qc.invalidateQueries({ queryKey: ["expense-summary"] });
      if (selectedClaimPassport) {
        setSelectedClaimPassport(res.claim);
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to update status"),
  });

  const reimburseMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.post(`/expenses/claims/${id}/reimburse`, payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Expense reimbursed and added to payroll!");
      qc.invalidateQueries({ queryKey: ["expense-claims"] });
      qc.invalidateQueries({ queryKey: ["expense-summary"] });
      setIsReimburseModalOpen(false);
      if (selectedClaimPassport) {
        setSelectedClaimPassport(res.claim);
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to process reimbursement"),
  });

  const createCategoryMut = useMutation({
    mutationFn: async (payload: any) => api.post("/expenses/categories", payload),
    onSuccess: () => {
      toast.success("Expense category created!");
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      setIsCategoryModalOpen(false);
      resetCategoryForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create category"),
  });

  const updateCategoryMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/expenses/categories/${id}`, data),
    onSuccess: () => {
      toast.success("Expense category updated!");
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      setIsEditCategoryOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update category"),
  });

  const deleteCategoryMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/expenses/categories/${id}`),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete category"),
  });

  const deleteClaimMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/expenses/claims/${id}`),
    onSuccess: () => {
      toast.success("Expense claim deleted");
      qc.invalidateQueries({ queryKey: ["expense-claims"] });
      qc.invalidateQueries({ queryKey: ["expense-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete claim"),
  });

  function resetClaimForm() {
    setClaimForm({
      employeeId: employees[0]?.id || "",
      categoryId: categories[0]?.id || "",
      title: "",
      amount: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      merchant: "",
      description: "",
      receiptUrl: "",
      receiptName: "receipt_proof.pdf",
    });
  }

  function resetCategoryForm() {
    setCategoryForm({
      name: "",
      code: "",
      monthlyLimit: "",
      requiresReceipt: true,
      icon: "Receipt",
    });
  }

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Receipt className="size-6 text-primary" /> Expense Claims & Reimbursements
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multi-category employee claims, digital receipts, multi-tier approvals, and 1-click payroll settlements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetCategoryForm();
              setIsCategoryModalOpen(true);
            }}
            className="text-xs font-semibold h-8 shadow-2xs gap-1.5"
          >
            <Settings2 className="size-3.5 text-primary" />
            <span>Spending Limits & Categories</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetClaimForm();
              setIsSubmitClaimOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Submit Expense Claim</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500" /> Pending Review
          </span>
          <div className="text-xl font-black font-mono text-amber-600">
            {formatSystemAmount(summary?.pendingAmount || 0, sysConfig?.currency)}
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-blue-500" /> Approved for Payout
          </span>
          <div className="text-xl font-black font-mono text-blue-600">
            {formatSystemAmount(summary?.approvedAmount || 0, sysConfig?.currency)}
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
            <Wallet className="size-3.5" /> Reimbursed Total
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
            {formatSystemAmount(summary?.reimbursedAmount || 0, sysConfig?.currency)}
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Receipt className="size-3.5 text-purple-500" /> Total Processed
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.totalClaims || 0} Claims
          </div>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-1 rounded-xl border">
          <TabsList className="bg-transparent h-8 p-0 gap-1">
            <TabsTrigger value="claims" className="text-xs font-bold h-7 gap-1.5">
              <Receipt className="size-3.5" />
              <span>Claims Directory ({claims.length})</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs font-bold h-7 gap-1.5">
              <Settings2 className="size-3.5" />
              <span>Expense Categories ({categories.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search claim code, merchant..."
                className="h-7 text-xs pl-8 w-44 bg-background"
              />
            </div>

            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger className="h-7 text-xs w-36 bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-36 bg-background">
                <SelectValue placeholder="All Statuses" />
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
          </div>
        </div>

        {/* ===================== TAB 1: CLAIMS DIRECTORY ===================== */}
        <TabsContent value="claims" className="space-y-4 pt-1">
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Claim Code & Title</TableHead>
                    <TableHead className="text-xs">Staff Member</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Merchant & Date</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Receipt Proof</TableHead>
                    <TableHead className="text-xs">Approval Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isClaimsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-xs">
                        Loading expense claims...
                      </TableCell>
                    </TableRow>
                  ) : claims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-xs italic">
                        No expense claims found matching filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    claims.map((claim: any) => {
                      const st = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
                      const IconComp = CATEGORY_ICON_MAP[claim.category?.icon] || Receipt;

                      return (
                        <TableRow key={claim.id} className="hover:bg-muted/20 text-xs">
                          <TableCell>
                            <div className="space-y-0.5">
                              <span className="font-mono font-black text-foreground block">{claim.claimCode}</span>
                              <span className="text-[11px] text-muted-foreground font-semibold truncate block max-w-[180px]">
                                {claim.title}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-6 border">
                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                  {claim.employee?.firstName?.[0]}
                                  {claim.employee?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-bold text-foreground block">
                                  {claim.employee?.firstName} {claim.employee?.lastName}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {claim.employee?.department?.name || "General"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-bold gap-1">
                              <IconComp className="size-3 text-primary" />
                              <span>{claim.category?.name || "General"}</span>
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-0.5">
                              <span className="font-semibold text-foreground block">{claim.merchant}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(claim.expenseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono font-black text-xs text-primary">
                            {formatSystemAmount(Number(claim.amount), sysConfig?.currency)}
                          </TableCell>

                          <TableCell>
                            {claim.receiptUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(claim.receiptUrl, "_blank")}
                                className="h-6 text-[10px] font-semibold gap-1"
                              >
                                <FileText className="size-3 text-primary" />
                                <span>View Receipt</span>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-[10px] italic">No receipt</span>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-bold ${st.bg} ${st.text} ${st.border}`}>
                              {st.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {claim.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMut.mutate({ id: claim.id, status: "manager_approved" })}
                                  className="h-6 text-[10px] font-bold text-blue-600 border-blue-500/30"
                                >
                                  Approve
                                </Button>
                              )}

                              {claim.status === "manager_approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMut.mutate({ id: claim.id, status: "finance_approved" })}
                                  className="h-6 text-[10px] font-bold text-indigo-600 border-indigo-500/30"
                                >
                                  Finance OK
                                </Button>
                              )}

                              {claim.status === "finance_approved" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setClaimToReimburse(claim);
                                    setIsReimburseModalOpen(true);
                                  }}
                                  className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Reimburse
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedClaimPassport(claim)}
                                className="h-6 text-[10px] font-bold"
                              >
                                <Eye className="size-3" />
                              </Button>

                              {claim.status !== "reimbursed" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm(`Delete claim ${claim.claimCode}?`)) {
                                      deleteClaimMut.mutate(claim.id);
                                    }
                                  }}
                                  className="size-6 text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: SPENDING CATEGORIES STUDIO ===================== */}
        <TabsContent value="categories" className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Settings2 className="size-4 text-primary" /> Workspace Expense Categories & Monthly Limits
              </h2>
              <p className="text-xs text-muted-foreground">
                Define policy spending caps, mandatory receipt attachments, and budget thresholds.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                resetCategoryForm();
                setIsCategoryModalOpen(true);
              }}
              className="text-xs font-bold h-8 gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Create Category</span>
            </Button>
          </div>

          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Category Name & Code</TableHead>
                    <TableHead className="text-xs">Monthly Budget Cap</TableHead>
                    <TableHead className="text-xs">Receipt Attachment Policy</TableHead>
                    <TableHead className="text-xs text-center">Total Claims Filed</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {categories.map((cat: any) => {
                    const IconComp = CATEGORY_ICON_MAP[cat.icon] || Receipt;
                    return (
                      <TableRow key={cat.id} className="hover:bg-muted/20 text-xs">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center">
                              <IconComp className="size-4 text-primary" />
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">{cat.name}</span>
                              <span className="font-mono text-[10px] text-muted-foreground font-bold">{cat.code}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono font-bold text-emerald-600">
                          {cat.monthlyLimit ? (
                            formatSystemAmount(Number(cat.monthlyLimit), sysConfig?.currency) + " / month"
                          ) : (
                            <span className="text-muted-foreground font-normal">No limit set</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              cat.requiresReceipt
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {cat.requiresReceipt ? "Mandatory Receipt Proof" : "Optional Receipt"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold">
                          {cat._count?.claims || 0}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => {
                                setEditingCategory(cat);
                                setCategoryForm({
                                  name: cat.name,
                                  code: cat.code,
                                  monthlyLimit: String(cat.monthlyLimit || ""),
                                  requiresReceipt: cat.requiresReceipt,
                                  icon: cat.icon,
                                });
                                setIsEditCategoryOpen(true);
                              }}
                              title="Edit"
                            >
                              <Edit2 className="size-3.5 text-muted-foreground" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-rose-600 hover:bg-rose-50"
                              onClick={() => {
                                if (confirm(`Delete category "${cat.name}"?`)) {
                                  deleteCategoryMut.mutate(cat.id);
                                }
                              }}
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL 1: SUBMIT EXPENSE CLAIM ─── */}
      <Dialog open={isSubmitClaimOpen} onOpenChange={setIsSubmitClaimOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              <span>Submit Reimbursement Claim</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Attach receipt proof and submit expense for manager and finance verification.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createClaimMut.mutate(claimForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Staff Member *</Label>
              <Select
                required
                value={claimForm.employeeId}
                onValueChange={(v) => setClaimForm({ ...claimForm, employeeId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expense Category *</Label>
                <Select
                  required
                  value={claimForm.categoryId}
                  onValueChange={(v) => setClaimForm({ ...claimForm, categoryId: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Claim Amount (₹) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2450.00"
                  value={claimForm.amount}
                  onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Expense Title / Item *</Label>
              <Input
                required
                placeholder="e.g. Client Dinner at Marriott / Flight to Delhi"
                value={claimForm.title}
                onChange={(e) => setClaimForm({ ...claimForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Merchant / Vendor *</Label>
                <Input
                  required
                  placeholder="e.g. Uber, Indigo, Marriott"
                  value={claimForm.merchant}
                  onChange={(e) => setClaimForm({ ...claimForm, merchant: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expense Date *</Label>
                <Input
                  type="date"
                  required
                  value={claimForm.expenseDate}
                  onChange={(e) => setClaimForm({ ...claimForm, expenseDate: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Receipt Document / Invoice URL</Label>
              <Input
                placeholder="https://storage.googleapis.com/... or Google Drive URL"
                value={claimForm.receiptUrl}
                onChange={(e) => setClaimForm({ ...claimForm, receiptUrl: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Business Justification & Notes</Label>
              <Textarea
                rows={2}
                placeholder="Details of client meeting, travel itinerary, or project purpose..."
                value={claimForm.description}
                onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsSubmitClaimOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createClaimMut.isPending} className="text-xs font-bold">
                Submit Claim
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: CREATE / EDIT EXPENSE CATEGORY ─── */}
      <Dialog open={isCategoryModalOpen || isEditCategoryOpen} onOpenChange={(o) => {
        if (!o) {
          setIsCategoryModalOpen(false);
          setIsEditCategoryOpen(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              <span>{isEditCategoryOpen ? "Edit Expense Category" : "Create Expense Category"}</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isEditCategoryOpen && editingCategory) {
                updateCategoryMut.mutate({ id: editingCategory.id, data: categoryForm });
              } else {
                createCategoryMut.mutate(categoryForm);
              }
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category Name *</Label>
                <Input
                  required
                  placeholder="e.g. Travel & Lodging"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category Code *</Label>
                <Input
                  required
                  maxLength={6}
                  placeholder="e.g. TRV"
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Monthly Limit (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={categoryForm.monthlyLimit}
                  onChange={(e) => setCategoryForm({ ...categoryForm, monthlyLimit: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Icon</Label>
                <Select
                  value={categoryForm.icon}
                  onValueChange={(v) => setCategoryForm({ ...categoryForm, icon: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plane">Plane (Travel)</SelectItem>
                    <SelectItem value="Coffee">Coffee (Meals)</SelectItem>
                    <SelectItem value="Laptop">Laptop (IT & Hardware)</SelectItem>
                    <SelectItem value="Layers">Layers (Software & Cloud)</SelectItem>
                    <SelectItem value="Plus">Plus (Medical)</SelectItem>
                    <SelectItem value="Receipt">Receipt (General)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Mandatory Receipt Attachment</span>
                <span className="text-[10px] text-muted-foreground">Require invoice/bill proof during claim submission</span>
              </div>
              <input
                type="checkbox"
                checked={categoryForm.requiresReceipt}
                onChange={(e) => setCategoryForm({ ...categoryForm, requiresReceipt: e.target.checked })}
                className="size-4 text-primary rounded"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => {
                setIsCategoryModalOpen(false);
                setIsEditCategoryOpen(false);
              }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createCategoryMut.isPending || updateCategoryMut.isPending} className="text-xs font-bold">
                {isEditCategoryOpen ? "Update Category" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: 1-CLICK REIMBURSEMENT DISBURSEMENT ─── */}
      {claimToReimburse && (
        <Dialog open={isReimburseModalOpen} onOpenChange={setIsReimburseModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Wallet className="size-5 text-emerald-600" />
                <span>Authorize Reimbursement Payout</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Claim: {claimToReimburse.claimCode} — {formatSystemAmount(Number(claimToReimburse.amount), sysConfig?.currency)} to {claimToReimburse.employee?.firstName} {claimToReimburse.employee?.lastName}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reimburseMut.mutate({ id: claimToReimburse.id, payload: reimburseForm });
              }}
              className="space-y-3 py-2 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Settlement / Reimbursement Mode</Label>
                <Select
                  value={reimburseForm.reimbursementMethod}
                  onValueChange={(v) => setReimburseForm({ ...reimburseForm, reimbursementMethod: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payroll_addition">Payroll Addition (Credit in Monthly Payslip)</SelectItem>
                    <SelectItem value="direct_bank_transfer">Direct NEFT / Bank Account Transfer</SelectItem>
                    <SelectItem value="petty_cash">Company Petty Cash Box</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reimburseForm.reimbursementMethod === "payroll_addition" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Target Payroll Month (YYYY-MM)</Label>
                  <Input
                    value={reimburseForm.payrollMonth}
                    onChange={(e) => setReimburseForm({ ...reimburseForm, payrollMonth: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Finance Settlement Notes</Label>
                <Input
                  value={reimburseForm.approverNotes}
                  onChange={(e) => setReimburseForm({ ...reimburseForm, approverNotes: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsReimburseModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={reimburseMut.isPending} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                  Confirm & Reimburse
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 4: CLAIM PASSPORT DRAWER ─── */}
      {selectedClaimPassport && (
        <Dialog open={!!selectedClaimPassport} onOpenChange={(o) => !o && setSelectedClaimPassport(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <Receipt className="size-5 text-primary" />
                  <span>Claim Passport: {selectedClaimPassport.claimCode}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    STATUS_CONFIG[selectedClaimPassport.status]?.bg
                  } ${STATUS_CONFIG[selectedClaimPassport.status]?.text} ${
                    STATUS_CONFIG[selectedClaimPassport.status]?.border
                  }`}
                >
                  {STATUS_CONFIG[selectedClaimPassport.status]?.label}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Claim Amount</span>
                  <div className="text-xl font-black font-mono text-primary">
                    {formatSystemAmount(Number(selectedClaimPassport.amount), sysConfig?.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Category</span>
                  <div className="font-bold text-xs">{selectedClaimPassport.category?.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border bg-card space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Staff Member</span>
                  <div className="font-bold">
                    {selectedClaimPassport.employee?.firstName} {selectedClaimPassport.employee?.lastName}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border bg-card space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Merchant / Vendor</span>
                  <div className="font-bold">{selectedClaimPassport.merchant}</div>
                </div>
              </div>

              {selectedClaimPassport.description && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Claim Description</Label>
                  <div className="p-2.5 rounded-lg border bg-muted/10 text-xs text-muted-foreground">
                    {selectedClaimPassport.description}
                  </div>
                </div>
              )}

              {selectedClaimPassport.receiptUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(selectedClaimPassport.receiptUrl, "_blank")}
                  className="w-full h-8 text-xs font-semibold gap-1.5 shadow-2xs"
                >
                  <FileText className="size-3.5 text-primary" />
                  <span>Open Attached Receipt Invoice</span>
                  <ExternalLink className="size-3 text-muted-foreground" />
                </Button>
              )}

              {selectedClaimPassport.status === "reimbursed" && (
                <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 space-y-1 text-emerald-700 dark:text-emerald-300">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Reimbursed via {selectedClaimPassport.reimbursementMethod?.replace("_", " ")}</span>
                  </div>
                  {selectedClaimPassport.payrollMonth && (
                    <div className="text-[11px] font-mono">
                      Credited in Payslip: {selectedClaimPassport.payrollMonth}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedClaimPassport(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
