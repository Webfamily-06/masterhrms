import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  Plus,
  Search,
  FileSpreadsheet,
  ChevronDown,
  Edit2,
  Trash2,
  X,
  Loader2,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/escalation-rules")({
  component: SuperEscalationRulesPage,
});

export type EscalationRuleRecord = {
  id: string;
  ruleId: string;
  triggerType: string;
  priority: "Critical" | "High" | "Medium" | "Low" | string;
  condition: string;
  escalationLevel: string;
  escalatesTo: string;
  timeThreshold: string;
  status: "Active" | "Inactive" | string;
  actionType: "Notify" | "Notify + Assign" | "Reminder" | string;
};

export default function SuperEscalationRulesPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editRule, setEditRule] = useState<EscalationRuleRecord | null>(null);
  const [deleteRule, setDeleteRule] = useState<EscalationRuleRecord | null>(null);

  // New rule form
  const [newRule, setNewRule] = useState({
    triggerType: "SLA Breach",
    priority: "Critical",
    condition: "No resolution",
    escalationLevel: "Level 1",
    escalatesTo: "Team Lead",
    timeThreshold: "30 mins",
    status: "Active",
    actionType: "Notify",
  });

  const { data: rules = [], isLoading } = useQuery<EscalationRuleRecord[]>({
    queryKey: ["super-escalation-rules"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/super/support/escalation-rules");
        return Array.isArray(res) ? res : res?.data || [];
      } catch (err) {
        console.error("Failed to load escalation rules", err);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newRule) => {
      return api.post("/api/super/support/escalation-rules", payload);
    },
    onSuccess: () => {
      toast.success("Escalation rule created successfully");
      queryClient.invalidateQueries({ queryKey: ["super-escalation-rules"] });
      setIsAddModalOpen(false);
      setNewRule({
        triggerType: "SLA Breach",
        priority: "Critical",
        condition: "No resolution",
        escalationLevel: "Level 1",
        escalatesTo: "Team Lead",
        timeThreshold: "30 mins",
        status: "Active",
        actionType: "Notify",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create rule");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EscalationRuleRecord> }) => {
      return api.put(`/api/super/support/escalation-rules/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Escalation rule updated");
      queryClient.invalidateQueries({ queryKey: ["super-escalation-rules"] });
      setEditRule(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update rule");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/super/support/escalation-rules/${id}`);
    },
    onSuccess: () => {
      toast.success("Escalation rule deleted");
      queryClient.invalidateQueries({ queryKey: ["super-escalation-rules"] });
      setDeleteRule(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete rule");
    },
  });

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchSearch =
        r.ruleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.triggerType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.condition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.escalatesTo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPriority =
        priorityFilter === "all" ? true : r.priority.toLowerCase() === priorityFilter.toLowerCase();

      return matchSearch && matchPriority;
    });
  }, [rules, searchTerm, priorityFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRules.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const exportCSV = () => {
    const headers = ["Rule ID", "Trigger Type", "Priority", "Condition", "Level", "Escalates To", "Threshold", "Status", "Action"];
    const rows = filteredRules.map((r) => [
      `"${r.ruleId}"`,
      `"${r.triggerType}"`,
      `"${r.priority}"`,
      `"${r.condition}"`,
      `"${r.escalationLevel}"`,
      `"${r.escalatesTo}"`,
      `"${r.timeThreshold}"`,
      `"${r.status}"`,
      `"${r.actionType}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `escalation_rules_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Escalation rules exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Escalation Rules
          </h2>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="hover:text-primary cursor-pointer">Tickets</span>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Escalation Rules</span>
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

          {/* Add New Rule Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Rule</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">Escalation Rules List</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
              {filteredRules.length} rules
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search rule ID or condition..."
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
              <p className="text-xs">Loading escalation rules...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No escalation rules configured</p>
              <p className="text-xs text-slate-400">Click "Add New Rule" to create automated response triggers.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredRules.length && filteredRules.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Rule ID</th>
                  <th className="py-3 px-4">Trigger Type</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Escalation Level</th>
                  <th className="py-3 px-4">Escalates To</th>
                  <th className="py-3 px-4">Time Threshold</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredRules.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Rule ID */}
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {r.ruleId}
                    </td>

                    {/* Trigger Type */}
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-100">
                      {r.triggerType}
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      {r.priority === "Critical" ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">Critical</span>
                      ) : r.priority === "High" ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">High</span>
                      ) : r.priority === "Medium" ? (
                        <span className="font-semibold text-sky-600 dark:text-sky-400">Medium</span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Low</span>
                      )}
                    </td>

                    {/* Condition */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{r.condition}</td>

                    {/* Level */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.escalationLevel}</td>

                    {/* Escalates To */}
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {r.escalatesTo}
                    </td>

                    {/* Time Threshold */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.timeThreshold}</td>

                    {/* Status badge */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {r.status}
                      </span>
                    </td>

                    {/* Action badge */}
                    <td className="py-3 px-4">
                      {r.actionType === "Notify + Assign" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border border-pink-300 text-pink-700 bg-pink-50/50">
                          Notify + Assign
                        </span>
                      ) : r.actionType === "Reminder" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border border-rose-300 text-rose-700 bg-rose-50/50">
                          Reminder
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border border-purple-300 text-purple-700 bg-purple-50/50">
                          Notify
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          title="Edit Rule"
                          onClick={() => setEditRule(r)}
                          className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete Rule"
                          onClick={() => setDeleteRule(r)}
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

      {/* Add New Rule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Add Escalation Rule</h4>
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
                createMutation.mutate(newRule);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Trigger Type *
                  </label>
                  <select
                    value={newRule.triggerType}
                    onChange={(e) => setNewRule({ ...newRule, triggerType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="SLA Breach">SLA Breach</option>
                    <option value="Status Based">Status Based</option>
                    <option value="Priority Based">Priority Based</option>
                    <option value="Time Based">Time Based</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Priority *
                  </label>
                  <select
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Trigger Condition *
                </label>
                <input
                  type="text"
                  placeholder="e.g. No resolution within SLA limits"
                  value={newRule.condition}
                  onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Escalation Level
                  </label>
                  <select
                    value={newRule.escalationLevel}
                    onChange={(e) => setNewRule({ ...newRule, escalationLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Level 1">Level 1</option>
                    <option value="Level 2">Level 2</option>
                    <option value="Level 3">Level 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Escalates To
                  </label>
                  <select
                    value={newRule.escalatesTo}
                    onChange={(e) => setNewRule({ ...newRule, escalatesTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Team Lead">Team Lead</option>
                    <option value="Support Lead">Support Lead</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Admin">Admin</option>
                    <option value="Operations Director">Operations Director</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Time Threshold
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 30 mins, 1 hour"
                    value={newRule.timeThreshold}
                    onChange={(e) => setNewRule({ ...newRule, timeThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Automated Action
                  </label>
                  <select
                    value={newRule.actionType}
                    onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Notify">Notify</option>
                    <option value="Notify + Assign">Notify + Assign</option>
                    <option value="Reminder">Reminder</option>
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
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Edit Rule ({editRule.ruleId})</h4>
              <button
                onClick={() => setEditRule(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editRule.id,
                  data: {
                    triggerType: editRule.triggerType,
                    priority: editRule.priority,
                    condition: editRule.condition,
                    escalationLevel: editRule.escalationLevel,
                    escalatesTo: editRule.escalatesTo,
                    timeThreshold: editRule.timeThreshold,
                    actionType: editRule.actionType,
                  },
                });
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Trigger Type
                  </label>
                  <select
                    value={editRule.triggerType}
                    onChange={(e) => setEditRule({ ...editRule, triggerType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="SLA Breach">SLA Breach</option>
                    <option value="Status Based">Status Based</option>
                    <option value="Priority Based">Priority Based</option>
                    <option value="Time Based">Time Based</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Priority
                  </label>
                  <select
                    value={editRule.priority}
                    onChange={(e) => setEditRule({ ...editRule, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Condition
                </label>
                <input
                  type="text"
                  value={editRule.condition}
                  onChange={(e) => setEditRule({ ...editRule, condition: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Escalation Level
                  </label>
                  <select
                    value={editRule.escalationLevel}
                    onChange={(e) => setEditRule({ ...editRule, escalationLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Level 1">Level 1</option>
                    <option value="Level 2">Level 2</option>
                    <option value="Level 3">Level 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Escalates To
                  </label>
                  <select
                    value={editRule.escalatesTo}
                    onChange={(e) => setEditRule({ ...editRule, escalatesTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Team Lead">Team Lead</option>
                    <option value="Support Lead">Support Lead</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Admin">Admin</option>
                    <option value="Operations Director">Operations Director</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Time Threshold
                  </label>
                  <input
                    type="text"
                    value={editRule.timeThreshold}
                    onChange={(e) => setEditRule({ ...editRule, timeThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Action
                  </label>
                  <select
                    value={editRule.actionType}
                    onChange={(e) => setEditRule({ ...editRule, actionType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Notify">Notify</option>
                    <option value="Notify + Assign">Notify + Assign</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditRule(null)}
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
      {deleteRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-base text-slate-900 dark:text-white">Delete Rule?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove rule <strong className="text-slate-700 dark:text-slate-200">{deleteRule.ruleId}</strong>?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeleteRule(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteRule.id)}
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
