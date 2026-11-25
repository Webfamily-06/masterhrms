"use client";

import { useState } from "react";
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

interface SalaryComponentItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  type: "earning" | "deduction" | string;
  calculationType: "fixed" | "percentage" | string;
  defaultValue: number;
  isActive: boolean;
  status?: string;
}

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const emptyForm = {
  name: "",
  description: "",
  type: "earning",
  calculationType: "fixed",
  defaultValue: "",
  status: "active",
};

export default function HrPayrollComponentsPage() {
  const queryClient = useQueryClient();

  const [editingItem, setEditingItem] = useState<SalaryComponentItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [calcFilter, setCalcFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [deleteTarget, setDeleteTarget] = useState<SalaryComponentItem | null>(null);

  const { data: components = [], isLoading } = useQuery<SalaryComponentItem[]>({
    queryKey: ["hr-payroll-components", appliedSearch, typeFilter, calcFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/components", {
        params: {
          ...(appliedSearch ? { search: appliedSearch } : {}),
          ...(typeFilter !== "all" ? { type: typeFilter } : {}),
          ...(calcFilter !== "all" ? { calculationType: calcFilter } : {}),
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        },
      });
      const payload = res?.data ?? res ?? {};
      if (Array.isArray(payload.components)) return payload.components;
      if (Array.isArray(payload)) return payload;
      return [];
    },
  });

  const resetForm = () => {
    setEditingItem(null);
    setForm(emptyForm);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["hr-payroll-components"] });
    queryClient.invalidateQueries({ queryKey: ["hr-employee-salaries"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/api/v1/hr/payroll/components", {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        calculationType: form.calculationType,
        defaultValue: Number(form.defaultValue) || 0,
        status: form.status,
      }),
    onSuccess: () => {
      toast.success("Salary component added successfully");
      invalidate();
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add component"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put(`/api/v1/hr/payroll/components/${editingItem!.id}`, {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        calculationType: form.calculationType,
        defaultValue: Number(form.defaultValue) || 0,
        status: form.status,
      }),
    onSuccess: () => {
      toast.success("Salary component updated successfully");
      invalidate();
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update component"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (item: SalaryComponentItem) =>
      api.patch(`/api/v1/hr/payroll/components/${item.id}`, {
        isActive: !item.isActive,
      }),
    onSuccess: (_, item) => {
      toast.success(
        `${item.name} marked as ${item.isActive ? "Inactive" : "Active"}`
      );
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/hr/payroll/components/${id}`),
    onSuccess: () => {
      toast.success("Salary component deleted successfully");
      if (editingItem?.id === deleteTarget?.id) resetForm();
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete component"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Component Name is required");
      return;
    }
    if (editingItem) updateMutation.mutate();
    else createMutation.mutate();
  };

  const handleEdit = (item: SalaryComponentItem) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      type: item.type?.toLowerCase() === "deduction" ? "deduction" : "earning",
      calculationType:
        item.calculationType?.toLowerCase().includes("percent") ? "percentage" : "fixed",
      defaultValue: String(item.defaultValue ?? 0),
      status: item.isActive ? "active" : "inactive",
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Salary Components</h1>
        <p className="text-sm text-muted-foreground">
          Define earnings and deductions used in payroll calculations.
        </p>
      </div>

      {/* 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Card: Add / Edit Component */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border/70">
            <h2 className="text-base font-bold text-foreground">
              {editingItem ? "Edit Component" : "Add New Component"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingItem
                ? "Update the details of this salary component"
                : "Fill in the details to create a new salary component"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="comp-name">
                Component Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="comp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Basic Salary, HRA, Tax"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-desc">Description</Label>
              <Textarea
                id="comp-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the component"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-type">
                Type <span className="text-rose-500">*</span>
              </Label>
              <select
                id="comp-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-calc">
                Calculation Type <span className="text-rose-500">*</span>
              </Label>
              <select
                id="comp-calc"
                value={form.calculationType}
                onChange={(e) => setForm({ ...form, calculationType: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage of Basic</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-val">
                {form.calculationType === "percentage" ? "Percentage (%)" : "Fixed Amount (INR)"}{" "}
                <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="comp-val"
                type="number"
                step="0.01"
                min="0"
                value={form.defaultValue}
                onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                placeholder={form.calculationType === "percentage" ? "e.g., 12.00" : "0.00"}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-status">
                Status <span className="text-rose-500">*</span>
              </Label>
              <select
                id="comp-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 font-medium"
              >
                {isSaving
                  ? editingItem
                    ? "Updating..."
                    : "Adding..."
                  : editingItem
                  ? "Update Component"
                  : "Add Component"}
              </Button>
              {editingItem && (
                <Button type="button" variant="outline" onClick={resetForm} className="h-10">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Search, Filters & Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & 3 Dropdown Filters Card */}
          <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedSearch(searchInput.trim());
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <div className="relative flex-1">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
                <Input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (e.target.value === "") setAppliedSearch("");
                  }}
                  placeholder="Search components..."
                  className="pl-9 h-10 w-full"
                />
              </div>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 shrink-0"
              >
                Search
              </Button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                aria-label="Filter by type"
              >
                <option value="all">All Types</option>
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
              </select>

              <select
                value={calcFilter}
                onChange={(e) => setCalcFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                aria-label="Filter by calculation type"
              >
                <option value="all">All Calculations</option>
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage of Basic</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Components Table */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                    <th className="py-3.5 px-4">Component</th>
                    <th className="py-3.5 px-3 w-28">Type</th>
                    <th className="py-3.5 px-3 w-40">Amount</th>
                    <th className="py-3.5 px-3 w-28">Status</th>
                    <th className="py-3.5 px-4 w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        <i className="ph ph-spinner-gap animate-spin text-xl mr-2 align-middle" />
                        Loading salary components...
                      </td>
                    </tr>
                  ) : components.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        <i className="ph ph-sliders-horizontal text-3xl block mx-auto mb-2 opacity-50" />
                        No salary components found. Add one using the form on the left.
                      </td>
                    </tr>
                  ) : (
                    components.map((item) => {
                      const isDeduction = item.type?.toLowerCase() === "deduction";
                      const isPct = item.calculationType?.toLowerCase().includes("percent");
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            editingItem?.id === item.id ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center mt-0.5 ${
                                  isDeduction
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                }`}
                              >
                                <i
                                  className={`ph ${
                                    isDeduction ? "ph-trend-down" : "ph-trend-up"
                                  } text-lg`}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground leading-snug">
                                  {item.name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 break-words max-w-sm">
                                  {item.description || "No description provided"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                isDeduction
                                  ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              }`}
                            >
                              {isDeduction ? "Deduction" : "Earning"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-foreground">
                              {isPct
                                ? `${Number(item.defaultValue || 0).toFixed(2)}%`
                                : formatINR(item.defaultValue)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isPct ? "Of basic salary" : "Fixed amount"}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                item.isActive
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Edit Component"
                                onClick={() => handleEdit(item)}
                                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <i className="ph ph-note-pencil text-base" />
                              </button>
                              <button
                                type="button"
                                title={item.isActive ? "Deactivate Component" : "Activate Component"}
                                onClick={() => toggleStatusMutation.mutate(item)}
                                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                              >
                                <i
                                  className={`ph ${
                                    item.isActive ? "ph-lock-simple" : "ph-lock-simple-open"
                                  } text-base`}
                                />
                              </button>
                              <button
                                type="button"
                                title="Delete Component"
                                onClick={() => setDeleteTarget(item)}
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
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Salary Component</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This
              action cannot be undone.
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
