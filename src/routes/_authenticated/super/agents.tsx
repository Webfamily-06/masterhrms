import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Users,
  Plus,
  Search,
  FileSpreadsheet,
  ChevronDown,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Headphones
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/agents")({
  component: SuperAgentsPage,
});

export type AgentRecord = {
  id: string;
  agentId: string;
  name: string;
  email: string;
  role: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  availability: "Available" | "Not Available";
  avatar?: string;
};

export default function SuperAgentsPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentRecord | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<AgentRecord | null>(null);

  // New agent form
  const [newAgent, setNewAgent] = useState({
    name: "",
    email: "",
    role: "Senior Support Agent",
    availability: "Available" as "Available" | "Not Available",
  });

  const { data: agents = [], isLoading } = useQuery<AgentRecord[]>({
    queryKey: ["super-support-agents"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/super/support/agents");
        return Array.isArray(res) ? res : res?.data || [];
      } catch (err) {
        console.error("Failed to load support agents", err);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newAgent) => {
      return api.post("/api/super/support/agents", payload);
    },
    onSuccess: () => {
      toast.success("Support agent added successfully");
      queryClient.invalidateQueries({ queryKey: ["super-support-agents"] });
      setIsAddModalOpen(false);
      setNewAgent({
        name: "",
        email: "",
        role: "Senior Support Agent",
        availability: "Available",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create agent");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AgentRecord> }) => {
      return api.put(`/api/super/support/agents/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Agent details updated");
      queryClient.invalidateQueries({ queryKey: ["super-support-agents"] });
      setEditAgent(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update agent");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/super/support/agents/${id}`);
    },
    onSuccess: () => {
      toast.success("Agent removed from directory");
      queryClient.invalidateQueries({ queryKey: ["super-support-agents"] });
      setDeleteAgent(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete agent");
    },
  });

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.agentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" ? true : a.availability.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    }).sort((a, b) => {
      if (sortBy === "asc") return a.name.localeCompare(b.name);
      if (sortBy === "desc") return b.name.localeCompare(a.name);
      return b.ticketsAssigned - a.ticketsAssigned;
    });
  }, [agents, searchTerm, statusFilter, sortBy]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAgents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgents.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const exportCSV = () => {
    const headers = ["Agent ID", "Name", "Email", "Role", "Assigned", "Resolved", "Availability"];
    const rows = filteredAgents.map((a) => [
      `"${a.agentId}"`,
      `"${a.name}"`,
      `"${a.email}"`,
      `"${a.role}"`,
      a.ticketsAssigned,
      a.ticketsResolved,
      `"${a.availability}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `support_agents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Agents list exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Agents</h2>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="hover:text-primary cursor-pointer">Tickets</span>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Agents</span>
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

          {/* Add New Agent Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Agent</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">Agents List</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
              {filteredAgents.length} agents
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search agent name, ID, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Select Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Select Status</option>
              <option value="available">Available</option>
              <option value="not available">Not Available</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="recent">Sort By: Highest Assigned</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs">Loading support agents directory...</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Headphones className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No agents found</p>
              <p className="text-xs text-slate-400">Click "Add New Agent" to register staff.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredAgents.length && filteredAgents.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Agent ID</th>
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Tickets Assigned</th>
                  <th className="py-3 px-4">Tickets Resolved</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredAgents.map((a, idx) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Agent ID */}
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      <a href="javascript:void(0);" className="hover:underline">
                        {a.agentId}
                      </a>
                    </td>

                    {/* Agent Name with Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-primary shrink-0 overflow-hidden">
                          {a.avatar ? (
                            <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                          ) : (
                            a.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {a.name}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{a.email}</td>

                    {/* Role */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-medium">
                      {a.role}
                    </td>

                    {/* Assigned */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-semibold">
                      {a.ticketsAssigned}
                    </td>

                    {/* Resolved */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-semibold">
                      {a.ticketsResolved}
                    </td>

                    {/* Availability */}
                    <td className="py-3 px-4">
                      {a.availability === "Available" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Not Available
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          title="Edit Agent"
                          onClick={() => setEditAgent(a)}
                          className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete Agent"
                          onClick={() => setDeleteAgent(a)}
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

      {/* Add New Agent Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Add New Support Agent</h4>
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
                if (!newAgent.name || !newAgent.email) {
                  toast.error("Please fill in agent name and email");
                  return;
                }
                createMutation.mutate(newAgent);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. William Parsons"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. william@example.com"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Role
                  </label>
                  <select
                    value={newAgent.role}
                    onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Senior Support Agent">Senior Support Agent</option>
                    <option value="Junior Support Agent">Junior Support Agent</option>
                    <option value="Technical Lead">Technical Lead</option>
                    <option value="Billing Specialist">Billing Specialist</option>
                    <option value="Customer Success">Customer Success</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Availability
                  </label>
                  <select
                    value={newAgent.availability}
                    onChange={(e) =>
                      setNewAgent({
                        ...newAgent,
                        availability: e.target.value as "Available" | "Not Available",
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
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
                  Register Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Edit Agent: {editAgent.name}</h4>
              <button
                onClick={() => setEditAgent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editAgent.id,
                  data: {
                    name: editAgent.name,
                    email: editAgent.email,
                    role: editAgent.role,
                    availability: editAgent.availability,
                  },
                });
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editAgent.name}
                  onChange={(e) => setEditAgent({ ...editAgent, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editAgent.email}
                  onChange={(e) => setEditAgent({ ...editAgent, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Role
                  </label>
                  <select
                    value={editAgent.role}
                    onChange={(e) => setEditAgent({ ...editAgent, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Senior Support Agent">Senior Support Agent</option>
                    <option value="Junior Support Agent">Junior Support Agent</option>
                    <option value="Technical Lead">Technical Lead</option>
                    <option value="Billing Specialist">Billing Specialist</option>
                    <option value="Customer Success">Customer Success</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Availability
                  </label>
                  <select
                    value={editAgent.availability}
                    onChange={(e) =>
                      setEditAgent({
                        ...editAgent,
                        availability: e.target.value as "Available" | "Not Available",
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditAgent(null)}
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
      {deleteAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-base text-slate-900 dark:text-white">Delete Agent?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove <strong className="text-slate-700 dark:text-slate-200">{deleteAgent.name}</strong> ({deleteAgent.agentId}) from the staff directory?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeleteAgent(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteAgent.id)}
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
