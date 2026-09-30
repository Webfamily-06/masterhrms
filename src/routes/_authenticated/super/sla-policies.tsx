import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ShieldCheck,
  Plus,
  Search,
  FileSpreadsheet,
  ChevronDown,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Clock,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/sla-policies")({
  component: SuperSlaPoliciesPage,
});

export type SlaPolicyRecord = {
  id: string;
  priority: "Critical" | "High" | "Medium" | "Low" | string;
  description: string;
  firstResponseTime: string;
  resolutionTime: string;
  escalationTime: string;
  escalatesTo: string;
};

export default function SuperSlaPoliciesPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<SlaPolicyRecord | null>(null);
  const [deletePolicy, setDeletePolicy] = useState<SlaPolicyRecord | null>(null);

  // New policy form
  const [newPolicy, setNewPolicy] = useState({
    priority: "Critical",
    description: "",
    firstResponseTime: "1 Hour",
    resolutionTime: "4 Hours",
    escalationTime: "1 hour",
    escalatesTo: "Support Lead",
  });

  const { data: policies = [], isLoading } = useQuery<SlaPolicyRecord[]>({
    queryKey: ["super-sla-policies"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/super/support/sla-policies");
        return Array.isArray(res) ? res : res?.data || [];
      } catch (err) {
        console.error("Failed to load SLA policies", err);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newPolicy) => {
      return api.post("/api/super/support/sla-policies", payload);
    },
    onSuccess: () => {
      toast.success("SLA policy added successfully");
      queryClient.invalidateQueries({ queryKey: ["super-sla-policies"] });
      setIsAddModalOpen(false);
      setNewPolicy({
        priority: "Critical",
        description: "",
        firstResponseTime: "1 Hour",
        resolutionTime: "4 Hours",
        escalationTime: "1 hour",
        escalatesTo: "Support Lead",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create policy");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SlaPolicyRecord> }) => {
      return api.put(`/api/super/support/sla-policies/${id}`, data);
    },
    onSuccess: () => {
      toast.success("SLA policy updated");
      queryClient.invalidateQueries({ queryKey: ["super-sla-policies"] });
      setEditPolicy(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update policy");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/super/support/sla-policies/${id}`);
    },
    onSuccess: () => {
      toast.success("SLA policy deleted");
      queryClient.invalidateQueries({ queryKey: ["super-sla-policies"] });
      setDeletePolicy(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete policy");
    },
  });

  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchSearch =
        p.priority.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.escalatesTo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPriority =
        priorityFilter === "all" ? true : p.priority.toLowerCase() === priorityFilter.toLowerCase();

      return matchSearch && matchPriority;
    });
  }, [policies, searchTerm, priorityFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPolicies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPolicies.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const exportCSV = () => {
    const headers = ["Priority", "Description", "First Response Time", "Resolution Time", "Escalation Time", "Escalates To"];
    const rows = filteredPolicies.map((p) => [
      `"${p.priority}"`,
      `"${p.description}"`,
      `"${p.firstResponseTime}"`,
      `"${p.resolutionTime}"`,
      `"${p.escalationTime}"`,
      `"${p.escalatesTo}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sla_policies_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("SLA policies exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            SLA Policies
          </h2>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="hover:text-primary cursor-pointer">Tickets</span>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">SLA Policies</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-sm text-slate-700 dark:text-slate-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Add New Policy Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Policy</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">SLA Policies List</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
              {filteredPolicies.length} policies
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search policy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Select Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Select Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs">Loading SLA policies...</p>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No SLA policies defined</p>
              <p className="text-xs text-slate-400">Click "Add New Policy" to create service levels.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredPolicies.length && filteredPolicies.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">First Response Time</th>
                  <th className="py-3 px-4">Resolution Time</th>
                  <th className="py-3 px-4">Escalation Time</th>
                  <th className="py-3 px-4">Escalates To</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredPolicies.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Priority badge */}
                    <td className="py-3 px-4">
                      {p.priority === "Critical" ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          Critical
                        </span>
                      ) : p.priority === "High" ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          High
                        </span>
                      ) : p.priority === "Medium" ? (
                        <span className="font-semibold text-sky-600 dark:text-sky-400">
                          Medium
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Low
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs">
                      {p.description}
                    </td>

                    {/* First Response Time */}
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                      {p.firstResponseTime}
                    </td>

                    {/* Resolution Time */}
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                      {p.resolutionTime}
                    </td>

                    {/* Escalation Time */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {p.escalationTime}
                    </td>

                    {/* Escalates To */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-medium">
                      {p.escalatesTo}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          title="Edit Policy"
                          onClick={() => setEditPolicy(p)}
                          className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete Policy"
                          onClick={() => setDeletePolicy(p)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add New Policy Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Add SLA Policy</h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPolicy.description) {
                  toast.error("Please enter a policy description");
                  return;
                }
                createMutation.mutate(newPolicy);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Priority Level *
                </label>
                <select
                  value={newPolicy.priority}
                  onChange={(e) => setNewPolicy({ ...newPolicy, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Core module failure affecting business workflows"
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    First Response Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Hour"
                    value={newPolicy.firstResponseTime}
                    onChange={(e) => setNewPolicy({ ...newPolicy, firstResponseTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Resolution Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4 Hours"
                    value={newPolicy.resolutionTime}
                    onChange={(e) => setNewPolicy({ ...newPolicy, resolutionTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Escalation Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 hour"
                    value={newPolicy.escalationTime}
                    onChange={(e) => setNewPolicy({ ...newPolicy, escalationTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Escalates To
                  </label>
                  <select
                    value={newPolicy.escalatesTo}
                    onChange={(e) => setNewPolicy({ ...newPolicy, escalatesTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Support Lead">Support Lead</option>
                    <option value="Engineering Escalation Team">Engineering Escalation Team</option>
                    <option value="Senior Support Agent">Senior Support Agent</option>
                    <option value="Customer Success">Customer Success</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-primary/20"
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      {editPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Edit Policy ({editPolicy.priority})</h4>
              <button
                onClick={() => setEditPolicy(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editPolicy.id,
                  data: {
                    priority: editPolicy.priority,
                    description: editPolicy.description,
                    firstResponseTime: editPolicy.firstResponseTime,
                    resolutionTime: editPolicy.resolutionTime,
                    escalationTime: editPolicy.escalationTime,
                    escalatesTo: editPolicy.escalatesTo,
                  },
                });
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editPolicy.description}
                  onChange={(e) => setEditPolicy({ ...editPolicy, description: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    First Response Time
                  </label>
                  <input
                    type="text"
                    value={editPolicy.firstResponseTime}
                    onChange={(e) => setEditPolicy({ ...editPolicy, firstResponseTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Resolution Time
                  </label>
                  <input
                    type="text"
                    value={editPolicy.resolutionTime}
                    onChange={(e) => setEditPolicy({ ...editPolicy, resolutionTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Escalation Time
                  </label>
                  <input
                    type="text"
                    value={editPolicy.escalationTime}
                    onChange={(e) => setEditPolicy({ ...editPolicy, escalationTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Escalates To
                  </label>
                  <select
                    value={editPolicy.escalatesTo}
                    onChange={(e) => setEditPolicy({ ...editPolicy, escalatesTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Support Lead">Support Lead</option>
                    <option value="Engineering Escalation Team">Engineering Escalation Team</option>
                    <option value="Senior Support Agent">Senior Support Agent</option>
                    <option value="Customer Success">Customer Success</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditPolicy(null)}
                  className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-primary/20"
                >
                  {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-base text-slate-900 dark:text-white">Delete Policy?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove the <strong className="text-slate-700 dark:text-slate-200">{deletePolicy.priority}</strong> SLA policy?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeletePolicy(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletePolicy.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
              >
                {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
