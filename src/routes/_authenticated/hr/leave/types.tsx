import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search,
  SquarePen,
  Trash2,
  Lock,
  Unlock,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/leave/types")({
  component: HrLeaveTypesPage,
});

export default function HrLeaveTypesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const initialForm = {
    name: "",
    description: "",
    daysPerYear: 0,
    color: "#3B82F6",
    isPaid: true,
    status: "active",
  };

  const [form, setForm] = useState(initialForm);

  // 1. Fetch Leave Types
  const { data: types = [], isLoading } = useQuery({
    queryKey: ["hr-leave-types", statusFilter, searchTerm],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/types", {
        params: { status: statusFilter, search: searchTerm },
      });
      return unwrapArray(res);
    },
  });

  // 2. Create or Update Leave Type Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingId) {
        const res = await api.put(`/api/v1/hr/leave/types/${editingId}`, payload);
        return res;
      } else {
        const res = await api.post("/api/v1/hr/leave/types", {
          ...payload,
          code: payload.name.slice(0, 3).toUpperCase(),
        });
        return res;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Leave type updated successfully" : "Leave type created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || err?.response?.data?.error || "Failed to save leave type"),
  });

  // 3. Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      const res = await api.patch(`/api/v1/hr/leave/types/${id}/status`, { status });
      return res;
    },
    onSuccess: () => {
      toast.success("Leave type status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-types"] });
    },
    onError: (err: any) => toast.error(err?.message || err?.response?.data?.error || "Failed to update status"),
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/hr/leave/types/${id}`);
      return res;
    },
    onSuccess: () => {
      toast.success("Leave type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-types"] });
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.error || "Failed to delete leave type");
      setDeleteTargetId(null);
    },
  });

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      description: item.description || "",
      daysPerYear: item.daysPerYear || 0,
      color: item.color || "#3B82F6",
      isPaid: item.isPaid ?? true,
      status: item.status || "active",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter a leave type name");
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header (Reference Screenshot 3) */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Types</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage leave types and their configurations.</p>
      </div>

      {/* 2. Asymmetric Two-Column Grid (Reference Screenshot 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Add / Edit Form (Reference Screenshot 3) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              {editingId ? "Edit Leave Type" : "Add New Leave Type"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              {editingId ? "Update details for this leave type" : "Fill in the details to create a new leave type"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type Name */}
              <div className="space-y-1.5">
                <Label htmlFor="typeName" className="text-xs font-semibold text-slate-700">
                  Leave Type Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="typeName"
                  placeholder="e.g., Casual Leave, Sick Leave"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-xs border-slate-200 rounded-lg"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="typeDesc" className="text-xs font-semibold text-slate-700">
                  Description
                </Label>
                <Textarea
                  id="typeDesc"
                  rows={3}
                  placeholder="Brief description of the leave policies"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="text-xs border-slate-200 rounded-lg resize-none"
                />
              </div>

              {/* Row: Max Days / Year & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="typeQuota" className="text-xs font-semibold text-slate-700">
                    Max Days / Year <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="typeQuota"
                    type="number"
                    min={0}
                    max={365}
                    value={form.daysPerYear}
                    onChange={(e) => setForm({ ...form, daysPerYear: parseInt(e.target.value, 10) || 0 })}
                    className="h-9 text-xs border-slate-200 rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Color <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        className="opacity-0 absolute inset-0 w-9 h-9 cursor-pointer z-10"
                      />
                      <div
                        className="w-9 h-9 rounded-md border border-slate-200 shadow-xs cursor-pointer"
                        style={{ backgroundColor: form.color }}
                      />
                    </div>
                    <Input
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="h-9 text-xs font-mono uppercase border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Paid Leave Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <div>
                  <Label className="text-xs font-semibold text-slate-800 cursor-pointer block">
                    Paid Leave
                  </Label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Employees will receive salary for these days
                  </p>
                </div>
                <Switch
                  checked={form.isPaid}
                  onCheckedChange={(checked) => setForm({ ...form, isPaid: checked })}
                  className="data-[state=checked]:bg-[#00a76f]"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm({ ...form, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs border-slate-200 rounded-lg bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full bg-[#00a76f] hover:bg-[#008f5d] text-white font-medium py-2.5 rounded-lg text-xs shadow-xs transition-colors mt-2"
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingId
                  ? "Update Leave Type"
                  : "Add Leave Type"}
              </Button>

              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="w-full text-xs text-slate-600 rounded-lg h-8"
                >
                  Cancel Edit
                </Button>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Search & Leave Types Table (Reference Screenshot 3) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Top Search Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            {/* Row 1: Search Input & Search Action Button */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search leave types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs border-slate-200 rounded-lg bg-white w-full"
                />
              </div>
              <Button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["hr-leave-types"] })}
                className="bg-[#00a76f] hover:bg-[#008f5d] text-white px-5 h-9 rounded-lg text-xs font-medium shrink-0 transition-colors"
              >
                Search
              </Button>
            </div>

            {/* Row 2: Status Filter Dropdown */}
            <div className="mt-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-52 h-9 text-xs border-slate-200 rounded-lg bg-white text-slate-700 font-medium">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Leave Types Table Card (Reference Screenshot 3) */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white border-b border-slate-200/80">
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 text-left">
                      Leave Type <span className="text-slate-400">↑</span>
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 text-left">
                      Days/Year
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 text-left">
                      Payment Type
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 text-left">
                      Status
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                        Loading leave types...
                      </TableCell>
                    </TableRow>
                  ) : types.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                        No leave types found. Create one using the form on the left.
                      </TableCell>
                    </TableRow>
                  ) : (
                    types.map((item: any) => {
                      const isExpanded = expandedRowId === item.id;
                      const hasLongDesc = item.description && item.description.length > 60;

                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                        >
                          {/* Leave Type: Icon + Name + Description */}
                          <TableCell className="py-3.5 px-4 align-top">
                            <div className="flex items-start gap-3">
                              {/* Colored Square Icon */}
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                                style={{ backgroundColor: item.color || "#3B82F6" }}
                              >
                                <Calendar className="w-4 h-4" />
                              </div>

                              <div className="min-w-0">
                                <h3 className="font-semibold text-xs text-slate-900 leading-tight">
                                  {item.name}
                                </h3>
                                <p
                                  className={`text-[11px] text-slate-500 mt-0.5 leading-relaxed ${
                                    isExpanded ? "" : "line-clamp-2"
                                  }`}
                                >
                                  {item.description || "Standard organizational leave entitlement"}
                                </p>
                                {hasLongDesc && (
                                  <button
                                    onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                                    className="text-[11px] text-slate-500 hover:text-slate-800 font-medium mt-0.5 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3 h-3" /> Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3" /> Show more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Days / Year */}
                          <TableCell className="py-3.5 px-4 align-middle text-xs font-bold text-slate-900 whitespace-nowrap">
                            {item.daysPerYear} Days
                          </TableCell>

                          {/* Payment Type */}
                          <TableCell className="py-3.5 px-4 align-middle whitespace-nowrap">
                            {item.isPaid ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f]">
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ffedd5] border border-[#fed7aa] text-[#ea580c]">
                                Unpaid
                              </span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3.5 px-4 align-middle whitespace-nowrap">
                            {item.status === "active" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f]">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600">
                                Inactive
                              </span>
                            )}
                          </TableCell>

                          {/* Actions: Edit, Lock/Toggle, Delete */}
                          <TableCell className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 text-slate-400">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1 hover:text-slate-800 transition-colors"
                                title="Edit Leave Type"
                              >
                                <SquarePen className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: item.id,
                                    status: item.status === "active" ? "inactive" : "active",
                                  })
                                }
                                className="p-1 hover:text-slate-800 transition-colors"
                                title={item.status === "active" ? "Deactivate" : "Activate"}
                              >
                                {item.status === "active" ? (
                                  <Lock className="w-4 h-4" />
                                ) : (
                                  <Unlock className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteTargetId(item.id)}
                                className="p-1 hover:text-red-600 transition-colors"
                                title="Delete Leave Type"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Sparkle Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => {
            resetForm();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="w-12 h-12 rounded-full bg-[#00a76f] hover:bg-[#008f5d] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          title="Create New Leave Type"
        >
          <Sparkles className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">Delete Leave Type?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to permanently delete this leave type? Any existing applications using this type will retain their historical records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
