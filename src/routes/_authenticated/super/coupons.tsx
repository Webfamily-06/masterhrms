import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Copy,
  Trash2,
  Edit2,
  Calendar,
  Percent,
  IndianRupee,
  RefreshCw,
  Loader2,
  AlertCircle,
  Layers,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ACTIVE_BILLING_DURATIONS,
  HISTORICAL_BILLING_DURATIONS,
  getBillingDurationLabel,
  toKolkataDateInputString,
  toKolkataDisplayDate,
  isCouponExpired,
  getCouponDisplayStatus,
  BillingDurationOption,
} from "@/lib/billing-durations";

export const Route = createFileRoute("/_authenticated/super/coupons")({
  component: SuperCouponsPage,
  head: () => ({ meta: [{ title: "Discount Coupons — Super Admin Console" }] }),
});

export type CouponItem = {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  applicablePlanIds: string[] | null;
  applicableDurations: string[] | null;
  minPurchaseAmount: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  perTenantLimit: number;
  startsAt: string | null;
  expiresAt: string | null;
  status: "active" | "inactive";
  createdAt: string;
  _count?: { redemptions: number };
};

export function SuperCouponsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minPurchaseAmount, setMinPurchaseAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perTenantLimit, setPerTenantLimit] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

  // 1. Fetch Coupons from Database
  const { data: coupons = [], isLoading, refetch } = useQuery<CouponItem[]>({
    queryKey: ["super-coupons-list"],
    queryFn: async () => {
      const res = await api.get("/super/coupons");
      return Array.isArray(res) ? res : [];
    },
  });

  // 2. Fetch Authoritative Durations from Backend API
  const { data: durationApiData } = useQuery<{
    activeDurations: BillingDurationOption[];
    historicalDurations: BillingDurationOption[];
  }>({
    queryKey: ["billing-durations"],
    queryFn: async () => {
      try {
        const res = await api.get("/billing/durations");
        return res;
      } catch {
        return {
          activeDurations: ACTIVE_BILLING_DURATIONS,
          historicalDurations: HISTORICAL_BILLING_DURATIONS,
        };
      }
    },
  });

  // Authoritative duration options from API with canonical fallback
  const activeDurations = durationApiData?.activeDurations || ACTIVE_BILLING_DURATIONS;
  const historicalDurations = durationApiData?.historicalDurations || HISTORICAL_BILLING_DURATIONS;

  // 3. Fetch Plans for selection
  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["super-plans-list"],
    queryFn: async () => {
      const res = await api.get("/super/plans");
      return Array.isArray(res) ? res : [];
    },
  });

  // Plan ID to Name lookup map
  const planMap = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((p) => {
      map.set(p.id, p.name);
    });
    return map;
  }, [plans]);

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingCoupon) {
        return await api.put(`/super/coupons/${editingCoupon.id}`, payload);
      }
      return await api.post("/super/coupons", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-coupons-list"] });
      toast.success(editingCoupon ? "Coupon updated successfully" : "Coupon created successfully");
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save coupon");
    },
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "inactive" }) => {
      return await api.put(`/super/coupons/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-coupons-list"] });
      toast.success("Coupon status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/super/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-coupons-list"] });
      toast.success("Coupon deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete coupon");
    },
  });

  function openCreateModal() {
    setEditingCoupon(null);
    setCode("");
    setName("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinPurchaseAmount("");
    setMaxRedemptions("");
    setPerTenantLimit("1");
    setExpiresAt("");
    setStatus("active");
    setSelectedDurations([]);
    setSelectedPlanIds([]);
    setIsModalOpen(true);
  }

  function openEditModal(c: CouponItem) {
    setEditingCoupon(c);
    setCode(c.code);
    setName(c.name || "");
    setDescription(c.description || "");
    setDiscountType(c.discountType);
    setDiscountValue(String(c.discountValue));
    setMinPurchaseAmount(c.minPurchaseAmount ? String(c.minPurchaseAmount) : "");
    setMaxRedemptions(c.maxRedemptions ? String(c.maxRedemptions) : "");
    setPerTenantLimit(String(c.perTenantLimit || 1));
    setExpiresAt(toKolkataDateInputString(c.expiresAt));
    setStatus(c.status);
    setSelectedDurations(c.applicableDurations || []);
    setSelectedPlanIds(c.applicablePlanIds || []);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCoupon(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    const numValue = Number(discountValue);
    if (!discountValue || isNaN(numValue) || numValue <= 0) {
      toast.error("Valid positive discount value is required");
      return;
    }
    if (discountType === "percentage" && numValue > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim() || null,
      description: description.trim() || null,
      discountType,
      discountValue: numValue,
      applicablePlanIds: selectedPlanIds.length > 0 ? selectedPlanIds : null,
      applicableDurations: selectedDurations.length > 0 ? selectedDurations : null,
      minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : null,
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
      perTenantLimit: Number(perTenantLimit) || 1,
      // Pass clean YYYY-MM-DD or ISO string; backend normalizes with Asia/Kolkata end-of-day
      expiresAt: expiresAt ? expiresAt : null,
      status,
    };

    saveMutation.mutate(payload);
  }

  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter === "all") return matchesSearch;
    const displayStatus = getCouponDisplayStatus(c);
    return matchesSearch && displayStatus === statusFilter;
  });

  const activeCount = coupons.filter((c) => getCouponDisplayStatus(c) === "active").length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.redemptionCount || 0), 0);

  function copyCode(c: string) {
    navigator.clipboard.writeText(c);
    toast.success(`Copied "${c}" to clipboard`);
  }

  /**
   * Determine available duration choices for the form:
   * - For NEW coupons: strictly active customer-facing durations (1 Month, 1 Year).
   * - For EDITING an existing coupon: if that coupon contains historical durations (e.g. 3 Months, 6 Months),
   *   we include them with a (Legacy) tag so historical data is safely visible and editable.
   */
  const availableDurationOptions = useMemo(() => {
    if (!editingCoupon) {
      return activeDurations;
    }
    const activeKeys = new Set(activeDurations.map((d) => d.key));
    const editingKeys = editingCoupon.applicableDurations || [];
    const legacyItemsInCoupon = historicalDurations.filter(
      (h) => !activeKeys.has(h.key) && editingKeys.includes(h.key)
    );
    return [...activeDurations, ...legacyItemsInCoupon];
  }, [editingCoupon, activeDurations, historicalDurations]);

  function toggleDuration(key: string) {
    if (selectedDurations.includes(key)) {
      setSelectedDurations(selectedDurations.filter((d) => d !== key));
    } else {
      setSelectedDurations([...selectedDurations, key]);
    }
  }

  function togglePlan(planId: string) {
    if (selectedPlanIds.includes(planId)) {
      setSelectedPlanIds(selectedPlanIds.filter((id) => id !== planId));
    } else {
      setSelectedPlanIds([...selectedPlanIds, planId]);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="size-6 text-purple-600" />
            Promo Coupons
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create and manage promotional discount coupons for subscription plans and billing cycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="cursor-pointer gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button
            onClick={openCreateModal}
            className="cursor-pointer gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            <Plus className="size-3.5" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Coupons</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{coupons.length}</div>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Active Codes</div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{activeCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 shadow-2xs">
          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Total Redemptions</div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">{totalRedemptions}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search coupon code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {(["all", "active", "inactive", "expired"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-colors cursor-pointer ${
                statusFilter === s
                  ? s === "expired"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : s === "inactive"
                      ? "bg-slate-600 text-white shadow-2xs"
                      : s === "active"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-purple-600" />
            Loading coupons from database...
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <AlertCircle className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            No promo coupons found. Click "Create Coupon" to add your first discount code.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Code</th>
                  <th className="py-3 px-4 font-bold">Campaign & Scope</th>
                  <th className="py-3 px-4 font-bold">Discount</th>
                  <th className="py-3 px-4 font-bold">Billing Durations</th>
                  <th className="py-3 px-4 font-bold">Redemptions</th>
                  <th className="py-3 px-4 font-bold">Expiry</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCoupons.map((c) => {
                  const displayStatus = getCouponDisplayStatus(c);
                  const expired = displayStatus === "expired";
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCode(c.code)}
                            className="text-slate-400 hover:text-purple-600 cursor-pointer p-0.5"
                            title="Copy code"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{c.name || "—"}</div>
                        {c.description && <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{c.description}</div>}
                        {c.applicablePlanIds && c.applicablePlanIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.applicablePlanIds.map((pId) => (
                              <Badge key={pId} variant="secondary" className="text-[9px] py-0 px-1 font-normal bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {planMap.get(pId) || pId}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal">Applies to all plans</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                        {c.discountType === "percentage" ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600">
                            <Percent className="size-3" />
                            {c.discountValue}% OFF
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-blue-600">
                            <IndianRupee className="size-3" />
                            ₹{Number(c.discountValue).toLocaleString("en-IN")} FLAT
                          </span>
                        )}
                        {c.minPurchaseAmount && (
                          <div className="text-[10px] text-slate-400 font-normal">Min ₹{c.minPurchaseAmount}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.applicableDurations && c.applicableDurations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.applicableDurations.map((d) => {
                              const isLegacy = d === "3_months" || d === "6_months";
                              return (
                                <Badge
                                  key={d}
                                  variant="outline"
                                  className={`text-[10px] uppercase font-mono py-0 px-1.5 ${
                                    isLegacy
                                      ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                      : "border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                                  }`}
                                >
                                  {getBillingDurationLabel(d)}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">All Durations</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold">{c.redemptionCount}</span>
                        {c.maxRedemptions && <span className="text-slate-400"> / {c.maxRedemptions}</span>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {c.expiresAt ? (
                          <span className={expired ? "text-rose-600 font-semibold" : ""}>
                            {toKolkataDisplayDate(c.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No Expiry</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const newStatus = c.status === "active" ? "inactive" : "active";
                            toggleStatusMutation.mutate({ id: c.id, newStatus });
                          }}
                          className="cursor-pointer"
                          title="Click to toggle status"
                        >
                          {displayStatus === "active" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100">
                              Active
                            </Badge>
                          ) : displayStatus === "expired" ? (
                            <Badge variant="outline" className="text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100">
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-slate-300 hover:bg-slate-100">
                              Inactive
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="p-1 text-slate-500 hover:text-purple-600 cursor-pointer rounded"
                            title="Edit Coupon"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete coupon "${c.code}"?`)) {
                                deleteMutation.mutate(c.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer rounded"
                            title="Delete Coupon"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Discount Coupon" : "Create Discount Coupon"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Coupon Code *</Label>
                <Input
                  placeholder="e.g. SUMMER50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={Boolean(editingCoupon)}
                  className="font-mono uppercase font-bold text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Campaign Name</Label>
                <Input
                  placeholder="e.g. Summer Promo 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Optional internal notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Discount Type</Label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs mt-1"
                >
                  <option value="percentage">Percentage (% OFF)</option>
                  <option value="fixed">Fixed Amount (₹ FLAT)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Discount Value *</Label>
                <Input
                  type="number"
                  min="0.01"
                  max={discountType === "percentage" ? "100" : undefined}
                  step="any"
                  placeholder={discountType === "percentage" ? "e.g. 20 (Max 100%)" : "e.g. 500"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="text-xs mt-1"
                  required
                />
              </div>
            </div>

            {/* Applicable Billing Durations (Current Pricing Model Source of Truth) */}
            <div>
              <Label className="text-xs mb-1.5 block">Applicable Billing Durations</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableDurationOptions.map((opt) => {
                  const isChecked = selectedDurations.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleDuration(opt.key)}
                      className={`p-2.5 rounded-md border text-center transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 font-bold"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.isLegacy && (
                        <Badge variant="outline" className="text-[9px] text-amber-700 border-amber-300 py-0 px-1 ml-1">
                          Legacy
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {selectedDurations.length === 0
                  ? "Applies to all billing durations (1 Month, 1 Year)."
                  : `Applies strictly to selected duration(s): ${selectedDurations.map(getBillingDurationLabel).join(", ")}.`}
              </p>
            </div>

            {/* Applicable Subscription Plans (Standard & Custom Plans) */}
            <div>
              <Label className="text-xs mb-1.5 block">Applicable Subscription Plans</Label>
              {plans.length === 0 ? (
                <p className="text-[11px] text-slate-400">Loading plans...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {plans.map((p) => {
                    const isChecked = selectedPlanIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlan(p.id)}
                        className={`p-2 rounded-md border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 font-bold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {p.planType === "custom" && (
                          <Badge variant="outline" className="text-[9px] text-purple-600 border-purple-300 py-0 px-1 ml-1 shrink-0">
                            Custom
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {selectedPlanIds.length === 0
                  ? "Applies to all subscription plans (standard & custom)."
                  : `Restricted to ${selectedPlanIds.length} selected plan(s).`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Purchase (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Optional min amount"
                  value={minPurchaseAmount}
                  onChange={(e) => setMinPurchaseAmount(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Max Total Redemptions</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited if blank"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Per-Tenant Redemption Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={perTenantLimit}
                  onChange={(e) => setPerTenantLimit(e.target.value)}
                  className="text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs mt-1"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="text-xs mt-1"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Coupon will remain valid through 23:59:59 IST on the chosen date.
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={closeModal} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                {editingCoupon ? "Save Changes" : "Create Coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
