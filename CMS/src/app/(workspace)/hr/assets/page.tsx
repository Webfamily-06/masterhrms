"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AssetTypeOption {
  id: string;
  name: string;
  prefix?: string;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  avatarUrl?: string | null;
}

interface AssetDocumentItem {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

interface AssetRecord {
  id: string;
  name: string;
  assetTag: string;
  category: string;
  categoryId?: string | null;
  categoryRel?: { id: string; name: string } | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchasePrice: number;
  status: string;
  condition: string;
  notes?: string | null;
  location?: string | null;
  vendor?: string | null;
  warrantyInfo?: string;
  warrantyExpiry?: string | null;
  imageUrl?: string | null;
  imageName?: string;
  documents?: AssetDocumentItem[];
  depreciationMethod?: string;
  usefulLifeMonths?: number;
  salvageValue?: number;
  assignedEmployee?: EmployeeOption | null;
}

interface AssetsListResponse {
  assets: AssetRecord[];
  counts: {
    all: number;
    available: number;
    assigned: number;
    maintenance: number;
    disposed: number;
  };
}

type SortKey = "name" | "purchaseDate" | "purchasePrice";

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const formatDateISO = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  available: {
    label: "Available",
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  },
  assigned: {
    label: "Assigned",
    cls: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  },
  maintenance: {
    label: "Maintenance",
    cls: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  disposed: {
    label: "Disposed",
    cls: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  },
};

const emptyAssetForm = {
  name: "",
  categoryId: "",
  serialNumber: "",
  assetTag: "",
  purchaseDate: todayISO(),
  purchasePrice: "",
  status: "available",
  condition: "good",
  notes: "",
  location: "Main Office",
  vendor: "",
  warrantyInfo: "",
  warrantyExpiry: "",
  imageUrl: "",
  imageName: "",
  documents: [] as AssetDocumentItem[],
  depreciationMethod: "straight_line",
  usefulLifeYears: "5",
  salvageValue: "",
};

export default function HrAssetsListPage() {
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  // Filters & Tabs
  const [searchInput, setSearchInput] = useState("");
  const [conditionInput, setConditionInput] = useState("all");
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    condition: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Sort & Pagination
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);
  const [assetForm, setAssetForm] = useState(emptyAssetForm);

  const [assignTarget, setAssignTarget] = useState<AssetRecord | null>(null);
  const [assignForm, setAssignForm] = useState({
    employeeId: "",
    checkoutDate: todayISO(),
    expectedReturnDate: "",
    checkoutCondition: "good",
    notes: "",
  });

  const [returnTarget, setReturnTarget] = useState<AssetRecord | null>(null);
  const [returnForm, setReturnForm] = useState({
    checkInDate: todayISO(),
    checkInCondition: "good",
    notes: "",
  });

  const [maintTarget, setMaintTarget] = useState<AssetRecord | null>(null);
  const [maintForm, setMaintForm] = useState({
    maintenanceType: "preventive",
    startDate: todayISO(),
    endDate: "",
    cost: "",
    details: "",
    supplier: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<AssetRecord | null>(null);

  // Queries
  const { data: assetTypes = [] } = useQuery<AssetTypeOption[]>({
    queryKey: ["hr-asset-types-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/types");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    },
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-dropdown"],
    queryFn: async () => {
      const res = await api.get("/employees", { params: { limit: 200 } });
      const raw = res?.employees ?? res?.data?.employees ?? res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const { data: assetsResponse, isLoading } = useQuery<AssetsListResponse>({
    queryKey: ["hr-assets-list", activeTab, appliedFilters],
    queryFn: async () => {
      const res = await api.get("/hr/assets", {
        params: {
          ...(activeTab !== "all" ? { status: activeTab } : {}),
          ...(appliedFilters.condition !== "all" ? { condition: appliedFilters.condition } : {}),
          ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
          ...(appliedFilters.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
          ...(appliedFilters.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
        },
      });
      const payload = res?.data ?? res ?? {};
      const list = Array.isArray(payload.assets)
        ? payload.assets
        : Array.isArray(payload)
        ? payload
        : [];
      return {
        assets: list,
        counts: payload.counts ?? {
          all: list.length,
          available: list.filter((a: AssetRecord) => a.status === "available").length,
          assigned: list.filter((a: AssetRecord) => a.status === "assigned").length,
          maintenance: list.filter((a: AssetRecord) => a.status === "maintenance").length,
          disposed: list.filter((a: AssetRecord) => a.status === "disposed").length,
        },
      };
    },
  });

  const sortedAssets = useMemo(() => {
    const list = [...(assetsResponse?.assets ?? [])];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.name || "").localeCompare(b.name || "");
      } else if (sortKey === "purchaseDate") {
        cmp =
          (a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0) -
          (b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0);
      } else {
        cmp = (Number(a.purchasePrice) || 0) - (Number(b.purchasePrice) || 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [assetsResponse?.assets, sortKey, sortAsc]);

  const totalResults = sortedAssets.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedAssets = sortedAssets.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  // Mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["hr-assets-list"] });
    queryClient.invalidateQueries({ queryKey: ["hr-asset-depreciation-report"] });
    queryClient.invalidateQueries({ queryKey: ["hr-asset-types"] });
  };

  const saveAssetMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: assetForm.name.trim(),
        categoryId: assetForm.categoryId || null,
        serialNumber: assetForm.serialNumber.trim(),
        assetTag: assetForm.assetTag.trim(),
        purchaseDate: assetForm.purchaseDate || null,
        purchasePrice: Number(assetForm.purchasePrice) || 0,
        status: assetForm.status,
        condition: assetForm.condition,
        notes: assetForm.notes.trim(),
        location: assetForm.location.trim(),
        vendor: assetForm.vendor.trim(),
        warrantyInfo: assetForm.warrantyInfo.trim(),
        warrantyExpiry: assetForm.warrantyExpiry || null,
        imageUrl: assetForm.imageUrl || null,
        imageName: assetForm.imageName || "",
        documents: assetForm.documents,
        depreciationMethod: assetForm.depreciationMethod,
        usefulLifeYears: Number(assetForm.usefulLifeYears) || 5,
        salvageValue: Number(assetForm.salvageValue) || 0,
      };
      if (editingAsset) {
        return api.put(`/hr/assets/${editingAsset.id}`, payload);
      }
      return api.post("/hr/assets", payload);
    },
    onSuccess: () => {
      toast.success(editingAsset ? "Asset updated successfully" : "Asset created successfully");
      invalidateAll();
      setIsAssetModalOpen(false);
      setEditingAsset(null);
      setAssetForm(emptyAssetForm);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save asset");
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      api.post(`/hr/assets/${assignTarget!.id}/assign`, {
        employeeId: assignForm.employeeId,
        checkoutDate: assignForm.checkoutDate,
        expectedReturnDate: assignForm.expectedReturnDate || null,
        checkoutCondition: assignForm.checkoutCondition,
        notes: assignForm.notes.trim(),
      }),
    onSuccess: () => {
      toast.success("Asset assigned successfully");
      invalidateAll();
      setAssignTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to assign asset");
    },
  });

  const returnMutation = useMutation({
    mutationFn: () =>
      api.post(`/hr/assets/${returnTarget!.id}/return`, {
        checkInDate: returnForm.checkInDate,
        checkInCondition: returnForm.checkInCondition,
        notes: returnForm.notes.trim(),
      }),
    onSuccess: () => {
      toast.success("Asset returned successfully");
      invalidateAll();
      setReturnTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to return asset");
    },
  });

  const maintMutation = useMutation({
    mutationFn: () =>
      api.post(`/hr/assets/${maintTarget!.id}/maintenance`, {
        maintenanceType: maintForm.maintenanceType,
        startDate: maintForm.startDate,
        endDate: maintForm.endDate || null,
        cost: Number(maintForm.cost) || 0,
        details: maintForm.details.trim(),
        supplier: maintForm.supplier.trim(),
      }),
    onSuccess: () => {
      toast.success("Maintenance scheduled successfully");
      invalidateAll();
      setMaintTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to schedule maintenance");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/assets/${id}`),
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      invalidateAll();
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete asset");
    },
  });

  // Handlers
  const openAddModal = () => {
    setEditingAsset(null);
    setAssetForm({
      ...emptyAssetForm,
      categoryId: assetTypes[0]?.id || "",
    });
    setIsAssetModalOpen(true);
  };

  const openEditModal = (asset: AssetRecord) => {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name || "",
      categoryId: asset.categoryId || asset.categoryRel?.id || "",
      serialNumber: asset.serialNumber || "",
      assetTag: asset.assetTag || "",
      purchaseDate: asset.purchaseDate ? formatDateISO(asset.purchaseDate) : todayISO(),
      purchasePrice: asset.purchasePrice !== undefined ? String(asset.purchasePrice) : "",
      status: asset.status || "available",
      condition: asset.condition || "good",
      notes: asset.notes || "",
      location: asset.location || "",
      vendor: asset.vendor || "",
      warrantyInfo: asset.warrantyInfo || "",
      warrantyExpiry: asset.warrantyExpiry ? formatDateISO(asset.warrantyExpiry) : "",
      imageUrl: asset.imageUrl || "",
      imageName: asset.imageName || (asset.imageUrl ? "asset-image.png" : ""),
      documents: Array.isArray(asset.documents) ? asset.documents : [],
      depreciationMethod: asset.depreciationMethod || "straight_line",
      usefulLifeYears: asset.usefulLifeMonths
        ? String(Math.max(1, Math.round((asset.usefulLifeMonths / 12) * 10) / 10))
        : "5",
      salvageValue: asset.salvageValue !== undefined ? String(asset.salvageValue) : "",
    });
    setIsAssetModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be smaller than 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAssetForm((prev) => ({
        ...prev,
        imageUrl: String(reader.result || ""),
        imageName: file.name,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Document must be smaller than 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const nextDoc: AssetDocumentItem = {
        name: file.name,
        url: String(reader.result || ""),
        mimeType: file.type,
        size: file.size,
      };
      setAssetForm((prev) => ({
        ...prev,
        documents: [...prev.documents, nextDoc],
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters({
      search: searchInput.trim(),
      condition: conditionInput,
      dateFrom: dateFromInput,
      dateTo: dateToInput,
    });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setConditionInput("all");
    setDateFromInput("");
    setDateToInput("");
    setPage(1);
    setAppliedFilters({ search: "", condition: "all", dateFrom: "", dateTo: "" });
  };

  const counts = assetsResponse?.counts ?? {
    all: 0,
    available: 0,
    assigned: 0,
    maintenance: 0,
    disposed: 0,
  };

  const tabs = [
    { key: "all", label: "All", count: counts.all, icon: "ph-squares-four" },
    { key: "available", label: "Available", count: counts.available, icon: "ph-check-circle" },
    { key: "assigned", label: "Assigned", count: counts.assigned, icon: "ph-user-check" },
    { key: "maintenance", label: "Maintenance", count: counts.maintenance, icon: "ph-wrench" },
    { key: "disposed", label: "Disposed", count: counts.disposed, icon: "ph-trash" },
  ];

  const hasActiveFilter =
    Boolean(appliedFilters.search) ||
    appliedFilters.condition !== "all" ||
    Boolean(appliedFilters.dateFrom) ||
    Boolean(appliedFilters.dateTo);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage company assets and their assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/asset-dashboard">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <i className="ph ph-chart-bar text-base" />
              <span>Dashboard</span>
            </Button>
          </Link>
          <Link href="/hr/assets/depreciation">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <i className="ph ph-trend-down text-base" />
              <span>Depreciation Report</span>
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={openAddModal}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <i className="ph ph-plus text-base" />
            <span>Add Asset</span>
          </Button>
        </div>
      </div>

      {/* Filter & Status Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-border/70">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
            <div className="relative">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
              <Input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === "") {
                    setAppliedFilters((p) => ({ ...p, search: "" }));
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                placeholder="Search..."
                className="pl-9 h-9 w-full"
              />
            </div>

            <select
              value={conditionInput}
              onChange={(e) => setConditionInput(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by condition"
            >
              <option value="all">All Conditions</option>
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>

            <Input
              type="date"
              value={dateFromInput}
              onChange={(e) => setDateFromInput(e.target.value)}
              className="h-9 w-full"
              aria-label="Purchase Date From"
            />

            <Input
              type="date"
              value={dateToInput}
              onChange={(e) => setDateToInput(e.target.value)}
              className="h-9 w-full"
              aria-label="Purchase Date To"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 flex-1 sm:flex-none"
              onClick={handleApplyFilters}
            >
              <i className="ph ph-funnel text-base" />
              <span>Filters</span>
            </Button>
            {hasActiveFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-3 sm:px-4 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`ph ${tab.icon} text-base`} />
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Assets Table Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                <th className="py-3 px-3 w-12">#</th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Name</span>
                    <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-3">Assigned To</th>
                <th className="py-3 px-3 whitespace-nowrap">Asset Code</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort("purchaseDate")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Purchase Date</span>
                    <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort("purchasePrice")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Purchase Cost</span>
                    <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <i className="ph ph-spinner-gap animate-spin text-xl mr-2 align-middle" />
                    Loading assets...
                  </td>
                </tr>
              ) : paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <i className="ph ph-package text-3xl block mx-auto mb-2 opacity-50" />
                    No assets found. Click &quot;Add Asset&quot; to register one.
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset, idx) => {
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  const statusInfo = STATUS_BADGE[asset.status?.toLowerCase()] ?? {
                    label: asset.status || "Available",
                    cls: "bg-muted text-foreground border-border",
                  };
                  const emp = asset.assignedEmployee;
                  const empInitials = emp
                    ? `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase()
                    : "";

                  return (
                    <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-3 text-muted-foreground font-medium">{rowNum}</td>
                      <td className="py-3.5 px-3">
                        <Link
                          href={`/hr/assets/${asset.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="h-9 w-9 shrink-0 rounded-full border border-border/80 bg-muted/40 overflow-hidden flex items-center justify-center">
                            {asset.imageUrl ? (
                              <img
                                src={asset.imageUrl}
                                alt={asset.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <i className="ph ph-cube text-base text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {asset.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {asset.categoryRel?.name || asset.category || "Uncategorized"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        {emp ? (
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-semibold overflow-hidden">
                              {emp.avatarUrl ? (
                                <img
                                  src={emp.avatarUrl}
                                  alt={`${emp.firstName} ${emp.lastName}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                empInitials || "E"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {emp.firstName} {emp.lastName}
                              </div>
                              {emp.email && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {emp.email}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-foreground">{asset.assetTag}</div>
                        {asset.serialNumber && (
                          <div className="text-xs text-muted-foreground">{asset.serialNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.cls}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          <span>{formatDateISO(asset.purchaseDate)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-foreground">
                        {formatINR(asset.purchasePrice)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-foreground">
                        {asset.location || "—"}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <Link
                            href={`/hr/assets/${asset.id}`}
                            title="View Asset Details"
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className="ph ph-eye text-base" />
                          </Link>
                          <button
                            type="button"
                            title="Edit Asset"
                            onClick={() => openEditModal(asset)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className="ph ph-note-pencil text-base" />
                          </button>
                          <button
                            type="button"
                            title="Assign Asset"
                            disabled={asset.status === "assigned"}
                            onClick={() => {
                              setAssignTarget(asset);
                              setAssignForm({
                                employeeId: "",
                                checkoutDate: todayISO(),
                                expectedReturnDate: "",
                                checkoutCondition: asset.condition || "good",
                                notes: "",
                              });
                            }}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-35 disabled:pointer-events-none transition-colors"
                          >
                            <i className="ph ph-user-plus text-base" />
                          </button>
                          <button
                            type="button"
                            title="Return Asset"
                            disabled={asset.status !== "assigned"}
                            onClick={() => {
                              setReturnTarget(asset);
                              setReturnForm({
                                checkInDate: todayISO(),
                                checkInCondition: asset.condition || "good",
                                notes: "",
                              });
                            }}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-sky-600 hover:bg-sky-500/10 disabled:opacity-35 disabled:pointer-events-none transition-colors"
                          >
                            <i className="ph ph-arrow-u-down-left text-base" />
                          </button>
                          <button
                            type="button"
                            title="Schedule Maintenance"
                            onClick={() => {
                              setMaintTarget(asset);
                              setMaintForm({
                                maintenanceType: "preventive",
                                startDate: todayISO(),
                                endDate: "",
                                cost: "",
                                details: "",
                                supplier: asset.vendor || "",
                              });
                            }}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                          >
                            <i className="ph ph-wrench text-base" />
                          </button>
                          <button
                            type="button"
                            title="Delete Asset"
                            onClick={() => setDeleteTarget(asset)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          >
                            <i className="ph ph-trash text-base" />
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
        <div className="px-4 py-3 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing {totalResults === 0 ? 0 : (safePage - 1) * rowsPerPage + 1} to{" "}
            {Math.min(safePage * rowsPerPage, totalResults)} of {totalResults} results
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === safePage ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 p-0 text-xs ${
                      pNum === safePage
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        : ""
                    }`}
                  >
                    {pNum}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. ADD / EDIT ASSET MODAL */}
      <Dialog
        open={isAssetModalOpen}
        onOpenChange={(open) => {
          setIsAssetModalOpen(open);
          if (!open) setEditingAsset(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/80">
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
            <DialogDescription className="sr-only">
              Create or update company asset details
            </DialogDescription>
          </DialogHeader>

          <form
            id="asset-crud-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!assetForm.name.trim()) {
                toast.error("Asset Name is required");
                return;
              }
              saveAssetMutation.mutate();
            }}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
          >
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder="e.g., TP-Link Wireless Router"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Asset Type <span className="text-rose-500">*</span>
              </Label>
              <select
                value={assetForm.categoryId}
                onChange={(e) => setAssetForm({ ...assetForm, categoryId: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select Asset Type</option>
                {assetTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Serial Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                placeholder="e.g., SN-102938"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Asset Code <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={assetForm.assetTag}
                onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                placeholder="e.g., NET002"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Purchase Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={assetForm.purchaseDate}
                onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Purchase Cost (INR) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={assetForm.purchasePrice}
                onChange={(e) => setAssetForm({ ...assetForm, purchasePrice: e.target.value })}
                placeholder="e.g. 15000.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <select
                value={assetForm.status}
                onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="maintenance">Maintenance</option>
                <option value="disposed">Disposed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Condition <span className="text-rose-500">*</span>
              </Label>
              <select
                value={assetForm.condition}
                onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                placeholder="e.g. Additional details about the asset..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Location <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={assetForm.location}
                onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                placeholder="e.g. Head Office - Floor 2"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input
                value={assetForm.vendor}
                onChange={(e) => setAssetForm({ ...assetForm, vendor: e.target.value })}
                placeholder="e.g. Dell Technologies"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Warranty Information</Label>
              <Input
                value={assetForm.warrantyInfo}
                onChange={(e) => setAssetForm({ ...assetForm, warrantyInfo: e.target.value })}
                placeholder="e.g. 2 Year On-site Warranty"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Warranty Expiry Date</Label>
              <Input
                type="date"
                value={assetForm.warrantyExpiry}
                onChange={(e) => setAssetForm({ ...assetForm, warrantyExpiry: e.target.value })}
              />
            </div>

            {/* Images Upload */}
            <div className="space-y-2">
              <Label>Images</Label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={assetForm.imageName || ""}
                  placeholder="Select image file..."
                  className="flex-1 bg-muted/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  className="gap-1.5 shrink-0"
                >
                  <i className="ph ph-image text-base" />
                  <span>Browse</span>
                </Button>
                {assetForm.imageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAssetForm((p) => ({ ...p, imageUrl: "", imageName: "" }))
                    }
                    className="h-10 w-10 p-0 shrink-0"
                    title="Remove image"
                  >
                    <i className="ph ph-x text-base" />
                  </Button>
                )}
              </div>
              {assetForm.imageUrl && (
                <div className="h-24 w-24 rounded-lg border border-border/80 overflow-hidden bg-muted/20">
                  <img
                    src={assetForm.imageUrl}
                    alt="Asset preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Documents Upload */}
            <div className="space-y-2">
              <Label>Documents</Label>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={handleDocumentSelect}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    assetForm.documents.length
                      ? `${assetForm.documents.length} document(s) attached`
                      : ""
                  }
                  placeholder="Select document file..."
                  className="flex-1 bg-muted/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => docInputRef.current?.click()}
                  className="gap-1.5 shrink-0"
                >
                  <i className="ph ph-file-arrow-up text-base" />
                  <span>Browse</span>
                </Button>
              </div>
              {assetForm.documents.length > 0 && (
                <div className="space-y-1.5">
                  {assetForm.documents.map((doc, i) => (
                    <div
                      key={`${doc.name}-${i}`}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-muted/20 text-xs"
                    >
                      <span className="truncate font-medium text-foreground">{doc.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAssetForm((p) => ({
                            ...p,
                            documents: p.documents.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="text-muted-foreground hover:text-rose-600"
                      >
                        <i className="ph ph-x text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Depreciation Method</Label>
              <select
                value={assetForm.depreciationMethod}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, depreciationMethod: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="straight_line">Straight Line</option>
                <option value="declining_balance">Declining Balance</option>
                <option value="double_declining">Double Declining</option>
                <option value="units_of_production">Units of Production</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Useful Life (Years)</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                value={assetForm.usefulLifeYears}
                onChange={(e) => setAssetForm({ ...assetForm, usefulLifeYears: e.target.value })}
                placeholder="5"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Salvage Value (INR)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={assetForm.salvageValue}
                onChange={(e) => setAssetForm({ ...assetForm, salvageValue: e.target.value })}
                placeholder="e.g. 2000.00"
              />
            </div>
          </form>

          <DialogFooter className="px-6 py-3.5 border-t border-border/80 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="asset-crud-form"
              disabled={saveAssetMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saveAssetMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. ASSIGN ASSET MODAL */}
      <Dialog open={Boolean(assignTarget)} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>
              Checkout <span className="font-semibold text-foreground">{assignTarget?.name}</span>{" "}
              to an employee.
            </DialogDescription>
          </DialogHeader>

          <form
            id="assign-asset-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!assignForm.employeeId) {
                toast.error("Please select an employee");
                return;
              }
              assignMutation.mutate();
            }}
            className="space-y-4 py-1"
          >
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-rose-500">*</span>
              </Label>
              <select
                value={assignForm.employeeId}
                onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {`${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Checkout Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={assignForm.checkoutDate}
                onChange={(e) => setAssignForm({ ...assignForm, checkoutDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Expected Return Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={assignForm.expectedReturnDate}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Checkout Condition <span className="text-rose-500">*</span>
              </Label>
              <select
                value={assignForm.checkoutCondition}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, checkoutCondition: e.target.value })
                }
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                placeholder="e.g. Assigned for project use until end of quarter..."
              />
            </div>
          </form>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="assign-asset-form"
              disabled={assignMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {assignMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. RETURN ASSET MODAL */}
      <Dialog open={Boolean(returnTarget)} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Asset</DialogTitle>
            <DialogDescription>
              Check in <span className="font-semibold text-foreground">{returnTarget?.name}</span>{" "}
              and mark it available.
            </DialogDescription>
          </DialogHeader>

          <form
            id="return-asset-form"
            onSubmit={(e) => {
              e.preventDefault();
              returnMutation.mutate();
            }}
            className="space-y-4 py-1"
          >
            <div className="space-y-1.5">
              <Label>
                Check-in Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={returnForm.checkInDate}
                onChange={(e) => setReturnForm({ ...returnForm, checkInDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Check-in Condition <span className="text-rose-500">*</span>
              </Label>
              <select
                value={returnForm.checkInCondition}
                onChange={(e) =>
                  setReturnForm({ ...returnForm, checkInCondition: e.target.value })
                }
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={returnForm.notes}
                onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                placeholder="e.g. Returned in good working condition with charger..."
              />
            </div>
          </form>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReturnTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="return-asset-form"
              disabled={returnMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {returnMutation.isPending ? "Returning..." : "Confirm Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. SCHEDULE MAINTENANCE MODAL */}
      <Dialog open={Boolean(maintTarget)} onOpenChange={(o) => !o && setMaintTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>
              Log a maintenance service for{" "}
              <span className="font-semibold text-foreground">{maintTarget?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <form
            id="maint-asset-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!maintForm.details.trim()) {
                toast.error("Maintenance details are required");
                return;
              }
              maintMutation.mutate();
            }}
            className="space-y-4 py-1"
          >
            <div className="space-y-1.5">
              <Label>
                Maintenance Type <span className="text-rose-500">*</span>
              </Label>
              <select
                value={maintForm.maintenanceType}
                onChange={(e) => setMaintForm({ ...maintForm, maintenanceType: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective / Repair</option>
                <option value="upgrade">Upgrade</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={maintForm.startDate}
                  onChange={(e) => setMaintForm({ ...maintForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={maintForm.endDate}
                  onChange={(e) => setMaintForm({ ...maintForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Cost (INR) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={maintForm.cost}
                onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
                placeholder="e.g. 2500.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Supplier / Service Center</Label>
              <Input
                value={maintForm.supplier}
                onChange={(e) => setMaintForm({ ...maintForm, supplier: e.target.value })}
                placeholder="e.g. Authorized Service Center"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Details <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                rows={3}
                value={maintForm.details}
                onChange={(e) => setMaintForm({ ...maintForm, details: e.target.value })}
                placeholder="Describe the maintenance work required..."
                required
              />
            </div>
          </form>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMaintTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="maint-asset-form"
              disabled={maintMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {maintMutation.isPending ? "Scheduling..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span> (
              {deleteTarget?.assetTag})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
