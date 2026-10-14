import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Smile, 
  Plus, 
  RotateCw, 
  Trash2, 
  Edit, 
  Save, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/addons/ai-document/tones")({
  component: AiDocTonesPage,
});

interface ToneItem {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

function AiDocTonesPage() {
  const [tones, setTones] = useState<ToneItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Form state
  const [editingTone, setEditingTone] = useState<ToneItem | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  const fetchTones = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/ai-document/tones", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTones(Array.isArray(data) ? data : data.tones || []);
      }
    } catch (err: any) {
      toast.error("Failed to load tones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTones();
  }, []);

  const handleStartCreate = () => {
    setEditingTone({ id: "", name: "", isActive: true, sortOrder: tones.length + 1 });
    setName("");
    setSortOrder(tones.length + 1);
  };

  const handleStartEdit = (tone: ToneItem) => {
    setEditingTone(tone);
    setName(tone.name);
    setSortOrder(tone.sortOrder);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tone name is required");
      return;
    }

    try {
      setSaving(true);
      const isNew = !editingTone?.id;
      const url = isNew
        ? "/api/v1/addons/ai-document/tones"
        : `/api/v1/addons/ai-document/tones/${editingTone?.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          sortOrder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save tone");
      }

      toast.success(isNew ? "Tone added" : "Tone updated");
      setEditingTone(null);
      fetchTones();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tone: ToneItem) => {
    if (!confirm(`Are you sure you want to delete tone "${tone.name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/addons/ai-document/tones/${tone.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cannot delete tone (in use by documents)");
      }
      toast.success("Tone deleted");
      fetchTones();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PlanGuard moduleName="AI Document" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <AiDocumentNavHeader activeTab="tones" />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Smile className="w-5 h-5 text-primary" />
                  <span>Communication Tones</span>
                </CardTitle>
                <CardDescription>
                  Configure vocabulary styles applied during document generation (Professional, Casual, Creative, etc.).
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={fetchTones} disabled={loading}>
                  <RotateCw className="w-4 h-4 mr-1.5" /> Refresh
                </Button>
                <Button size="sm" onClick={handleStartCreate}>
                  <Plus className="w-4 h-4 mr-1.5" /> New Tone
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Inline Editor if active */}
            {editingTone && (
              <form onSubmit={handleSave} className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold text-sm">
                    {editingTone.id ? "Edit Tone" : "Add New Tone"}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setEditingTone(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Tone Name *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Persuasive / Executive"
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sort Order</Label>
                    <Input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingTone(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    <Save className="w-4 h-4 mr-1.5" />
                    {saving ? "Saving..." : "Save Tone"}
                  </Button>
                </div>
              </form>
            )}

            {/* Tones List Table */}
            {loading ? (
              <div className="py-12 text-center text-muted-foreground text-xs flex justify-center items-center space-x-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Loading tones...</span>
              </div>
            ) : tones.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs border rounded-md">
                No tones configured. Click "New Tone" to add one.
              </div>
            ) : (
              <div className="border rounded-md divide-y overflow-hidden text-xs">
                <div className="bg-muted/40 px-4 py-2 font-semibold grid grid-cols-12 gap-2 text-muted-foreground">
                  <span className="col-span-2">Sort Order</span>
                  <span className="col-span-8">Tone Name</span>
                  <span className="col-span-2 text-right">Actions</span>
                </div>
                {tones.map((tone) => (
                  <div
                    key={tone.id}
                    className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20 transition-colors"
                  >
                    <span className="col-span-2 font-mono text-muted-foreground">#{tone.sortOrder}</span>
                    <span className="col-span-8 font-semibold text-foreground text-sm flex items-center">
                      <Smile className="w-3.5 h-3.5 mr-2 text-primary" />
                      {tone.name}
                    </span>
                    <div className="col-span-2 flex justify-end space-x-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStartEdit(tone)}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600"
                        onClick={() => handleDelete(tone)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlanGuard>
  );
}
