"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  Lock,
  Trash2,
  FileText,
  Calendar,
  Clock,
  RefreshCw,
  Hash,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

interface ContractTypeItem {
  id: string;
  name: string;
  description?: string | null;
  defaultDurationMonths?: number | null;
  probationPeriodMonths: number;
  noticePeriodDays: number;
  isRenewable: boolean;
  status: "active" | "inactive";
  contractsCount: number;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  defaultDurationMonths: "",
  probationPeriodMonths: "",
  noticePeriodDays: "",
  isRenewable: false,
  status: "" as "" | "active" | "inactive",
};

export default function HrContractTypesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContractTypeItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<ContractTypeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractTypeItem | null>(null);

  const { data: contractTypes = [], isLoading } = useQuery<ContractTypeItem[]>({
    queryKey: ["hr-contract-types"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contract-types");
      return unwrapArray<ContractTypeItem>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const body = {
        name: payload.name.trim(),
        description: payload.description.trim(),
        defaultDurationMonths:
          payload.defaultDurationMonths !== "" ? Number(payload.defaultDurationMonths) : null,
        probationPeriodMonths: Number(payload.probationPeriodMonths || 0),
        noticePeriodDays: Number(payload.noticePeriodDays || 0),
        isRenewable: payload.isRenewable,
        status: payload.status || "active",
      };
      if (editing) {
        return api.put(`/hr/documents/contract-types/${editing.id}`, body);
      }
      return api.post("/hr/documents/contract-types", body);
    },
    onSuccess: () => {
      toast.success(editing ? "Contract type updated" : "Contract type created");
      queryClient.invalidateQueries({ queryKey: ["hr-contract-types"] });
      setFormOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save contract type"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: ContractTypeItem) =>
      api.patch(`/hr/documents/contract-types/${item.id}/status`, {
        status: item.status === "active" ? "inactive" : "active",
      }),
    onSuccess: () => {
      toast.success("Contract type status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-contract-types"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/documents/contract-types/${id}`),
    onSuccess: () => {
      toast.success("Contract type deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-contract-types"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete contract type"),
  });

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contractTypes.filter((ct) => {
      if (!q) return true;
      return `${ct.name} ${ct.description || ""}`.toLowerCase().includes(q);
    });
  }, [contractTypes, search]);

  const counts = useMemo(
    () => ({
      all: baseFiltered.length,
      active: baseFiltered.filter((c) => c.status !== "inactive").length,
      inactive: baseFiltered.filter((c) => c.status === "inactive").length,
    }),
    [baseFiltered]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((c) => c.status === activeTab);
    return [...list].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [baseFiltered, activeTab, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAdd = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: ContractTypeItem) => {
    setEditing(item);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      defaultDurationMonths:
        item.defaultDurationMonths !== null && item.defaultDurationMonths !== undefined
          ? String(item.defaultDurationMonths)
          : "",
      probationPeriodMonths: String(item.probationPeriodMonths ?? 0),
      noticePeriodDays: String(item.noticePeriodDays ?? 0),
      isRenewable: Boolean(item.isRenewable),
      status: item.status === "inactive" ? "inactive" : "active",
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Contract Type Name is required");
    if (formData.probationPeriodMonths === "") return toast.error("Probation Period is required");
    if (formData.noticePeriodDays === "") return toast.error("Notice Period is required");
    if (!formData.status) return toast.error("Please select Status");
    saveMutation.mutate(formData);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Contract Types"
        description="Manage employment contract types, probation periods, and notice terms."
        actions={
          <Button
            onClick={openAdd}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Contract Type
          </Button>
        }
      />

      {/* Filter & Tabs Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-[280px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9 bg-background"
            />
          </div>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="h-9 text-xs">
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/70 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: counts.all, Icon: LayoutGrid },
            { key: "active" as const, label: "Active", count: counts.active, Icon: CheckCircle2 },
            { key: "inactive" as const, label: "Inactive", count: counts.inactive, Icon: XCircle },
          ].map(({ key, label, count, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setPage(1);
                }}
                className={`py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="p-3.5 text-xs font-semibold text-muted-foreground w-12">#</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setSortAsc((p) => !p)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Name</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Duration</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  Probation Period
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Notice Period</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Contracts</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                    Loading contract types...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                    No contract types found. Click &ldquo;+ Add Contract Type&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((ct, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const isActive = ct.status !== "inactive";
                  return (
                    <tr key={ct.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3.5">
                        <div className="text-sm font-semibold text-foreground">{ct.name}</div>
                        {ct.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                            {ct.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {ct.defaultDurationMonths ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {ct.defaultDurationMonths} months
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                            Permanent
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-sm text-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {ct.probationPeriodMonths} months
                        </span>
                      </td>
                      <td className="p-3.5 text-sm text-foreground whitespace-nowrap">
                        {ct.noticePeriodDays} days
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border/70">
                          {ct.contractsCount ?? 0} contracts
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Details"
                            onClick={() => setViewItem(ct)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                            title="Edit Contract Type"
                            onClick={() => openEdit(ct)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600"
                            title={isActive ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatusMutation.mutate(ct)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                            title="Delete Contract Type"
                            onClick={() => setDeleteTarget(ct)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
        <div className="px-4 py-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-medium text-foreground">
              {totalResults === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(safePage * pageSize, totalResults)}
            </span>{" "}
            of <span className="font-medium text-foreground">{totalResults}</span> results
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === safePage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 p-0 text-xs ${
                      pNum === safePage
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
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
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Type Details Modal */}
      <Dialog open={Boolean(viewItem)} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </span>
              <span>Contract Type Details</span>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Contract Type Name</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">{viewItem.name}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Status</span>
                </div>
                <div className="mt-1.5">
                  {viewItem.status !== "inactive" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Duration</span>
                </div>
                <div className="mt-1.5">
                  {viewItem.defaultDurationMonths ? (
                    <span className="text-sm font-semibold text-foreground">
                      {viewItem.defaultDurationMonths} months
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 border border-sky-500/20">
                      Permanent
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Probation Period</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {viewItem.probationPeriodMonths} months
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Notice Period</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {viewItem.noticePeriodDays} days
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Renewable</span>
                </div>
                <div className="mt-1.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground border border-border/80">
                    {viewItem.isRenewable ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  <span>Contracts</span>
                </div>
                <div className="mt-1.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border/80">
                    {viewItem.contractsCount ?? 0} contracts
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Description</span>
                </div>
                <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">
                  {viewItem.description || "No description provided."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Contract Type Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Contract Type" : "Add New Contract Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>
                Contract Type Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Full-time Permanent"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Standard full-time permanent employment contract..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Default Duration (months)</Label>
              <Input
                type="number"
                min={1}
                value={formData.defaultDurationMonths}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, defaultDurationMonths: e.target.value }))
                }
                placeholder="e.g. 12"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Probation Period (months) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={formData.probationPeriodMonths}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, probationPeriodMonths: e.target.value }))
                }
                placeholder="e.g. 3"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Notice Period (days) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={formData.noticePeriodDays}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, noticePeriodDays: e.target.value }))
                }
                placeholder="e.g. 30"
                required
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isRenewable}
                onChange={(e) => setFormData((p) => ({ ...p, isRenewable: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-emerald-500"
              />
              <span className="text-sm font-semibold text-foreground">Renewable Contract</span>
            </label>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, status: val as "active" | "inactive" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Contract Type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
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
