import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Save, Columns } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/setup/stages"
)({
  component: SetupStagesPage,
});

export default function SetupStagesPage() {
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    color: "#3b82f6",
    sortOrder: 1,
    isActive: true,
  });

  const fetchStages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/planning/stages", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setStages(json.data || (Array.isArray(json) ? json : []));
      }
    } catch {
      toast.error("Failed to load stages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      color: "#3b82f6",
      sortOrder: stages.length + 1,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (stg: any) => {
    setEditingId(stg.id);
    setForm({
      name: stg.name,
      color: stg.color || "#3b82f6",
      sortOrder: stg.sortOrder,
      isActive: stg.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Stage name is required");

    try {
      setSaving(true);
      const url = editingId
        ? `/api/v1/addons/planning/stages/${editingId}`
        : "/api/v1/addons/planning/stages";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(editingId ? "Stage updated" : "Stage created");
        setModalOpen(false);
        fetchStages();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save stage");
      }
    } catch {
      toast.error("Error saving stage");
    } finally {
      setSaving(false);
    }
  };

  const moveStage = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    const orderedIds = newStages.map((s) => s.id);
    setStages(newStages);

    try {
      const res = await fetch("/api/v1/addons/planning/stages/reorder", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) {
        toast.error("Failed to reorder stages");
        fetchStages();
      }
    } catch {
      toast.error("Network error reordering stages");
      fetchStages();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete stage "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/addons/planning/stages/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Stage deleted");
        fetchStages();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to delete stage");
      }
    } catch {
      toast.error("Network error deleting stage");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <PlanningNavHeader active="stages" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Kanban Stages</h1>
          <p className="text-xs text-muted-foreground">
            Configure the sequential columns used across the strategic Kanban boards.
          </p>
        </div>
        <Button onClick={openCreateModal} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Stage
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
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead>Stage Name</TableHead>
                  <TableHead className="w-28">Color</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((stg, idx) => (
                  <TableRow key={stg.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => moveStage(idx, "up")}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === stages.length - 1}
                          onClick={() => moveStage(idx, "down")}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: stg.color }} />
                        {stg.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{stg.color}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          stg.isActive
                            ? "bg-green-500/10 text-green-600 border border-green-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {stg.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(stg)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(stg.id, stg.name)}
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
            <DialogTitle>{editingId ? "Edit Stage" : "Add Stage"}</DialogTitle>
            <DialogDescription>Define a step in the strategic charter lifecycle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Stage Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. In Progress or Executive Review"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Badge / Column Color</Label>
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
                <p className="text-[11px] text-muted-foreground">Visible on kanban boards</p>
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
