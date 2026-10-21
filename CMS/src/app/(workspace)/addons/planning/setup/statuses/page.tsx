'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute  } from "@/src/lib/router-compat";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/setup/statuses"
)({
  component: SetupStatusesPage,
});

export default function SetupStatusesPage() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    color: "#2563eb",
    sortOrder: 1,
    isActive: true,
  });

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/planning/statuses", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setStatuses(json.data || (Array.isArray(json) ? json : []));
      }
    } catch {
      toast.error("Failed to load statuses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      color: "#2563eb",
      sortOrder: statuses.length + 1,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (sta: any) => {
    setEditingId(sta.id);
    setForm({
      name: sta.name,
      color: sta.color || "#2563eb",
      sortOrder: sta.sortOrder,
      isActive: sta.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Status name is required");

    try {
      setSaving(true);
      const url = editingId
        ? `/api/v1/addons/planning/statuses/${editingId}`
        : "/api/v1/addons/planning/statuses";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(editingId ? "Status updated" : "Status created");
        setModalOpen(false);
        fetchStatuses();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save status");
      }
    } catch {
      toast.error("Error saving status");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete status "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/addons/planning/statuses/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Status deleted");
        fetchStatuses();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to delete status");
      }
    } catch {
      toast.error("Network error deleting status");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <PlanningNavHeader active="statuses" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Charter Statuses</h1>
          <p className="text-xs text-muted-foreground">
            Configure state markers (Not Started, Active, On Hold, Completed) for charters.
          </p>
        </div>
        <Button onClick={openCreateModal} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Status
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Status Name</TableHead>
                  <TableHead className="w-28">Color</TableHead>
                  <TableHead className="w-24">Active</TableHead>
                  <TableHead className="text-right w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((sta) => (
                  <TableRow key={sta.id}>
                    <TableCell className="font-mono text-xs">{sta.sortOrder}</TableCell>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sta.color }} />
                        {sta.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{sta.color}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          sta.isActive
                            ? "bg-green-500/10 text-green-600 border border-green-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {sta.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(sta)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(sta.id, sta.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Status" : "Add Status"}</DialogTitle>
            <DialogDescription>Define a status label for strategic models.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Status Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. In Planning"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-10 p-0 border rounded cursor-pointer"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border p-2.5 rounded-lg">
              <div>
                <Label className="text-xs">Active Status</Label>
                <p className="text-[11px] text-muted-foreground">Available in dropdown selectors</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
