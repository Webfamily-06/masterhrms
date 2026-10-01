import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
  Settings,
  Globe,
  Tablet,
  Server,
  CircleDollarSign,
  Sliders,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/custom-fields")({
  component: CustomFieldsPage,
  head: () => ({ meta: [{ title: "Custom Fields — Settings" }] }),
});

interface CustomField {
  id: string;
  tenantId: string;
  module: string;
  label: string;
  fieldType: string;
  defaultValue: string | null;
  options: string | null;
  isRequired: boolean;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const MODULES = [
  "Employees",
  "Projects",
  "Tasks",
  "Invoices",
  "Clients",
  "Leads",
  "Recruitment",
  "Candidates",
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "textarea", label: "Textarea" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
  { value: "date", label: "Date" },
];

export function CustomFieldsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<CustomField | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({
    module: "Employees",
    label: "",
    fieldType: "text",
    defaultValue: "",
    options: "",
    isRequired: true,
    status: "active",
  });

  // Queries
  const { data, isLoading } = useQuery<{ success: boolean; data: CustomField[]; total: number }>({
    queryKey: ["custom-fields", selectedModule],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedModule !== "all") params.append("module", selectedModule);
      return api.get(`/custom-fields?${params}`);
    },
  });

  const fields: CustomField[] = data?.data ?? [];

  const filteredFields = fields.filter((f) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      f.label.toLowerCase().includes(s) ||
      f.module.toLowerCase().includes(s) ||
      f.fieldType.toLowerCase().includes(s) ||
      (f.defaultValue && f.defaultValue.toLowerCase().includes(s))
    );
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newField: typeof form) => api.post("/custom-fields", newField),
    onSuccess: () => {
      toast.success("Custom field created successfully");
      qc.invalidateQueries({ queryKey: ["custom-fields"] });
      setAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create custom field"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      api.put(`/custom-fields/${id}`, data),
    onSuccess: () => {
      toast.success("Custom field updated successfully");
      qc.invalidateQueries({ queryKey: ["custom-fields"] });
      setEditItem(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update custom field"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/custom-fields/${id}`),
    onSuccess: () => {
      toast.success("Custom field deleted successfully");
      qc.invalidateQueries({ queryKey: ["custom-fields"] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete custom field"),
  });

  const resetForm = () => {
    setForm({
      module: "Employees",
      label: "",
      fieldType: "text",
      defaultValue: "",
      options: "",
      isRequired: true,
      status: "active",
    });
  };

  const handleOpenEdit = (field: CustomField) => {
    setEditItem(field);
    setForm({
      module: field.module,
      label: field.label,
      fieldType: field.fieldType,
      defaultValue: field.defaultValue || "",
      options: field.options || "",
      isRequired: field.isRequired,
      status: field.status,
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredFields.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFields.map((f) => f.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="page-wrapper min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h2>
          <nav className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <Link to="/dashboard" className="hover:text-primary flex items-center gap-1">
              <span>Home</span>
            </Link>
            <ChevronRight className="size-3 text-slate-400" />
            <span>App Settings</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-900 font-medium">Custom Fields</span>
          </nav>
        </div>
      </div>

      {/* ─── Top Category Tabs (Matching SmartHR Architecture) ───────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <Link
          to="/settings"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 border-b-2 border-transparent whitespace-nowrap"
        >
          <Settings className="size-4" />
          General Settings
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 border-b-2 border-transparent whitespace-nowrap"
        >
          <Globe className="size-4" />
          Website Settings
        </Link>
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary border-b-2 border-primary whitespace-nowrap bg-primary/5 rounded-t-md">
          <Layers className="size-4" />
          App Settings
        </div>
        <Link
          to="/cronjob"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 border-b-2 border-transparent whitespace-nowrap"
        >
          <Server className="size-4" />
          System Settings
        </Link>
        <Link
          to="/accounting"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 border-b-2 border-transparent whitespace-nowrap"
        >
          <CircleDollarSign className="size-4" />
          Financial Settings
        </Link>
      </div>

      {/* ─── Settings Master-Detail Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Submenu Navigation */}
        <div className="lg:col-span-3">
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-3">
              <div className="flex flex-col space-y-1">
                <Link
                  to="/settings"
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span>Salary Settings</span>
                </Link>
                <Link
                  to="/workflows"
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span>Approval Settings</span>
                </Link>
                <Link
                  to="/invoices"
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span>Invoice Settings</span>
                </Link>
                <Link
                  to="/leave"
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span>Leave Type</span>
                </Link>
                <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-md bg-primary text-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="size-4" />
                    <span>Custom Fields</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    {fields.length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Main Content */}
        <div className="lg:col-span-9 space-y-4">
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            {/* Header with Title and Add Button */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Custom Fields</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure extended dynamic fields for Employees, Projects, Tasks, and Invoices.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    resetForm();
                    setAddModalOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="size-4" />
                  <span>Add Fields</span>
                </Button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search custom fields..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Module:</span>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md bg-white px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Modules</option>
                  {MODULES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Fields Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredFields.length > 0 &&
                          selectedIds.length === filteredFields.length
                        }
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Label</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Default Value</th>
                    <th className="py-3 px-4">Required / Optional</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Loading custom fields...
                      </td>
                    </tr>
                  ) : filteredFields.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <AlertCircle className="size-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold">No custom fields configured</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Add Fields" above to create your first dynamic field.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredFields.map((field) => (
                      <tr key={field.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(field.id)}
                            onChange={() => handleToggleSelect(field.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {field.module}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {field.label}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 capitalize">
                          <Badge variant="outline" className="text-xs bg-slate-50">
                            {field.fieldType}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {field.defaultValue || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {field.isRequired ? (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Required
                            </span>
                          ) : (
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Optional
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {field.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="size-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                              <span className="size-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-slate-900">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(field)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Edit className="size-4 text-slate-500" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(field.id)}
                                className="flex items-center gap-2 text-rose-600 focus:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="size-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Add Custom Field Modal ────────────────────────────────────────── */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Add Custom Field</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Module *</Label>
              <select
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Label *</Label>
              <Input
                placeholder="e.g. Preferred Language, Project Type, Task Category"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Default Value</Label>
              <Input
                placeholder="Enter default fallback value"
                value={form.defaultValue}
                onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Input Type *</Label>
              <select
                value={form.fieldType}
                onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {["select", "radio", "checkbox"].includes(form.fieldType) && (
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Options (Comma-separated)
                </Label>
                <Input
                  placeholder="e.g. Option 1, Option 2, Option 3"
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex items-center gap-6 pt-1">
              <Label className="text-xs font-semibold text-slate-700">Required</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="required_add"
                    checked={form.isRequired}
                    onChange={() => setForm({ ...form, isRequired: true })}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="required_add"
                    checked={!form.isRequired}
                    onChange={() => setForm({ ...form, isRequired: false })}
                    className="text-primary focus:ring-primary"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.label.trim()) {
                  toast.error("Please enter a field label");
                  return;
                }
                createMutation.mutate(form);
              }}
              disabled={createMutation.isPending}
              className="bg-primary text-white"
            >
              {createMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Custom Field Modal ───────────────────────────────────────── */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Custom Field</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Module *</Label>
              <select
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Label *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Default Value</Label>
              <Input
                value={form.defaultValue}
                onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Input Type *</Label>
              <select
                value={form.fieldType}
                onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {["select", "radio", "checkbox"].includes(form.fieldType) && (
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Options (Comma-separated)
                </Label>
                <Input
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex items-center gap-6 pt-1">
              <Label className="text-xs font-semibold text-slate-700">Required</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="required_edit"
                    checked={form.isRequired}
                    onChange={() => setForm({ ...form, isRequired: true })}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="required_edit"
                    checked={!form.isRequired}
                    onChange={() => setForm({ ...form, isRequired: false })}
                    className="text-primary focus:ring-primary"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editItem) return;
                if (!form.label.trim()) {
                  toast.error("Please enter a field label");
                  return;
                }
                updateMutation.mutate({ id: editItem.id, data: form });
              }}
              disabled={updateMutation.isPending}
              className="bg-primary text-white"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Delete Custom Field?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-600">
            Are you sure you want to delete this custom field? All associated employee/project values for this field will also be permanently deleted.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
