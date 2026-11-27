'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Plus,
  Search,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Headphones,
  Users,
  CheckSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";

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

const AGENT_ROLES = [
  "Senior Support Agent",
  "Junior Support Agent",
  "Technical Lead",
  "Billing Specialist",
  "Customer Success",
];

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

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
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

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
      const res = await api.get("/super/support/agents");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newAgent) => {
      return api.post("/super/support/agents", payload);
    },
    onSuccess: () => {
      toast.success("Support agent added successfully.");
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
      toast.error(err?.message || "Failed to create agent.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AgentRecord> }) => {
      return api.put(`/super/support/agents/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Agent details updated.");
      queryClient.invalidateQueries({ queryKey: ["super-support-agents"] });
      setEditAgent(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update agent.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/super/support/agents/${id}`);
    },
    onSuccess: (_data, deletedId) => {
      toast.success("Agent removed from directory.");
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ["super-support-agents"] });
      setDeleteAgent(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete agent.");
    },
  });

  const bulkAvailabilityMutation = useMutation({
    mutationFn: async ({ ids, availability }: { ids: string[]; availability: "Available" | "Not Available" }) => {
      await Promise.all(
        ids.map((id) => api.put(`/super/support/agents/${id}`, { availability })),
      );
      return { count: ids.length, availability };
    },
    onSuccess: ({ count, availability }) => {
      toast.success(`Updated ${count} ${count === 1 ? "agent" : "agents"} to "${availability}".`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["super-support-agents"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Bulk availability update failed.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/super/support/agents/${id}`)));
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`Removed ${count} ${count === 1 ? "agent" : "agents"} from directory.`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["super-support-agents"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Bulk delete failed.");
    },
  });

  const filteredAgents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return agents
      .filter((a) => {
        const matchSearch =
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.agentId.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q);

        const matchStatus =
          statusFilter === "all" ? true : a.availability.toLowerCase() === statusFilter.toLowerCase();

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "asc") return a.name.localeCompare(b.name);
        if (sortBy === "desc") return b.name.localeCompare(a.name);
        return (b.ticketsAssigned || 0) - (a.ticketsAssigned || 0);
      });
  }, [agents, searchTerm, statusFilter, sortBy]);

  const availableCount = useMemo(
    () => agents.filter((a) => a.availability === "Available").length,
    [agents],
  );
  const totalResolved = useMemo(
    () => agents.reduce((sum, a) => sum + (Number(a.ticketsResolved) || 0), 0),
    [agents],
  );

  const allFilteredSelected =
    filteredAgents.length > 0 && filteredAgents.every((a) => selectedIds.includes(a.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgents.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const exportCSV = () => {
    if (filteredAgents.length === 0) {
      toast.error("No agents to export.");
      return;
    }
    const headers = ["Agent ID", "Name", "Email", "Role", "Tickets Assigned", "Tickets Resolved", "Availability"];
    const rows = filteredAgents.map((a) => [
      escapeCsvCell(a.agentId),
      escapeCsvCell(a.name),
      escapeCsvCell(a.email),
      escapeCsvCell(a.role),
      escapeCsvCell(a.ticketsAssigned ?? 0),
      escapeCsvCell(a.ticketsResolved ?? 0),
      escapeCsvCell(a.availability),
    ]);
    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `support_agents_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredAgents.length} support agents to CSV.`);
  };

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Support Agents Directory"
        description="Manage platform support engineers, availability status, and cross-tenant ticket coverage."
        icon={Headphones}
        badge={
          <Badge variant="soft">
            {agents.length} {agents.length === 1 ? "Agent" : "Agents"}
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="size-3.5" />
              Add New Agent
            </Button>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Agents"
          value={agents.length}
          description="Registered platform support staff"
          icon={Users}
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          label="Available Online"
          value={availableCount}
          description={`${agents.length - availableCount} currently unavailable`}
          icon={CheckCircle2}
          variant="success"
          isLoading={isLoading}
        />
        <StatCard
          label="Tickets Resolved"
          value={totalResolved}
          description="Cumulative resolutions across directory"
          icon={Headphones}
          variant="info"
          isLoading={isLoading}
        />
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-primary/25 bg-primary/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <CheckSquare className="size-4 text-primary" />
            <span>
              {selectedIds.length} {selectedIds.length === 1 ? "agent" : "agents"} selected
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={bulkAvailabilityMutation.isPending}
              onClick={() =>
                bulkAvailabilityMutation.mutate({ ids: selectedIds, availability: "Available" })
              }
            >
              <CheckCircle2 className="size-3 text-emerald-600" />
              Mark Available
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={bulkAvailabilityMutation.isPending}
              onClick={() =>
                bulkAvailabilityMutation.mutate({ ids: selectedIds, availability: "Not Available" })
              }
            >
              <XCircle className="size-3 text-rose-600" />
              Mark Unavailable
            </Button>
            <Button
              size="xs"
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => setIsBulkDeleteOpen(true)}
            >
              <Trash2 className="size-3" />
              Delete Selected
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              aria-label="Clear selection"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Agents Roster</h2>
            <Badge variant="secondary" className="text-[11px]">
              {filteredAgents.length} shown
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search agent name, ID, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="not available">Not Available</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Highest Assigned</SelectItem>
                <SelectItem value="asc">Name (A-Z)</SelectItem>
                <SelectItem value="desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-14 text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary mb-2" />
              <p className="text-xs">Loading support agents directory...</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Headphones className="size-9 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No support agents found</p>
              <p className="text-xs mt-1">
                {searchTerm || statusFilter !== "all"
                  ? "Adjust your search or availability filter."
                  : 'Click "Add New Agent" to register platform support staff.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80">
                  <th className="bg-muted/50 p-3 pl-4 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all agents"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Agent ID
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Agent Name
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Email
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Role
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Assigned
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Resolved
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Availability
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pr-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAgents.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3 pl-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${a.name}`}
                        checked={selectedIds.includes(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="rounded border-border text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 tabular-nums font-bold text-primary">
                      <button
                        type="button"
                        onClick={() => setEditAgent(a)}
                        className="hover:underline cursor-pointer"
                      >
                        {a.agentId}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full border border-border bg-muted flex items-center justify-center font-bold text-[11px] text-primary shrink-0 overflow-hidden">
                          {a.avatar ? (
                            <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                          ) : (
                            a.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="font-medium text-foreground">{a.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.email}</td>
                    <td className="p-3 font-medium text-foreground">{a.role}</td>
                    <td className="p-3 tabular-nums font-semibold text-foreground">{a.ticketsAssigned ?? 0}</td>
                    <td className="p-3 tabular-nums font-semibold text-foreground">{a.ticketsResolved ?? 0}</td>
                    <td className="p-3">
                      <Badge variant={a.availability === "Available" ? "success" : "destructive"} className="text-[10px]">
                        {a.availability}
                      </Badge>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          title="Edit Agent"
                          onClick={() => setEditAgent(a)}
                          className="px-2"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          title="Delete Agent"
                          onClick={() => setDeleteAgent(a)}
                          className="px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add New Agent Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add New Support Agent</DialogTitle>
            <DialogDescription className="text-xs">
              Register a support engineer into the Super Admin ticket desk roster.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newAgent.name.trim() || !newAgent.email.trim()) {
                toast.error("Please fill in agent name and email.");
                return;
              }
              createMutation.mutate({
                ...newAgent,
                name: newAgent.name.trim(),
                email: newAgent.email.trim(),
              });
            }}
            className="space-y-4 text-xs"
          >
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. William Parsons"
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="e.g. william@company.com"
                value={newAgent.email}
                onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={newAgent.role}
                  onValueChange={(val) => setNewAgent({ ...newAgent, role: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Availability</Label>
                <Select
                  value={newAgent.availability}
                  onValueChange={(val) =>
                    setNewAgent({
                      ...newAgent,
                      availability: val as "Available" | "Not Available",
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Not Available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Register Agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={Boolean(editAgent)} onOpenChange={(open) => !open && setEditAgent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Agent: {editAgent?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              {editAgent?.agentId}
            </DialogDescription>
          </DialogHeader>

          {editAgent && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editAgent.id,
                  data: {
                    name: editAgent.name.trim(),
                    email: editAgent.email.trim(),
                    role: editAgent.role,
                    availability: editAgent.availability,
                  },
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={editAgent.name}
                  onChange={(e) => setEditAgent({ ...editAgent, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={editAgent.email}
                  onChange={(e) => setEditAgent({ ...editAgent, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={editAgent.role}
                    onValueChange={(val) => setEditAgent({ ...editAgent, role: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                      {!AGENT_ROLES.includes(editAgent.role) && (
                        <SelectItem value={editAgent.role}>{editAgent.role}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Availability</Label>
                  <Select
                    value={editAgent.availability}
                    onValueChange={(val) =>
                      setEditAgent({
                        ...editAgent,
                        availability: val as "Available" | "Not Available",
                      })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Not Available">Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditAgent(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Delete ConfirmationDialog */}
      <ConfirmationDialog
        open={Boolean(deleteAgent)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteAgent(null);
        }}
        title="Delete Support Agent?"
        description={
          deleteAgent ? (
            <>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{deleteAgent.name}</strong> ({deleteAgent.agentId}) from the support staff directory?
            </>
          ) : undefined
        }
        confirmLabel="Remove Agent"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteAgent) deleteMutation.mutate(deleteAgent.id);
        }}
      />

      {/* Bulk Delete ConfirmationDialog */}
      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !bulkDeleteMutation.isPending) setIsBulkDeleteOpen(false);
        }}
        title={`Delete ${selectedIds.length} Selected Agents?`}
        description="Selected agents will be permanently removed from the support directory. This action cannot be undone."
        confirmLabel="Delete Selected"
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
      />
    </div>
  );
}
