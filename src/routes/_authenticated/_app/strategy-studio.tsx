import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  TrendingUp,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/strategy-studio")({
  component: StrategyStudioPage,
  head: () => ({ meta: [{ title: "Strategy Studio (SWOT & PESTEL) — Master ERP" }] }),
});

interface StrategyItem {
  id: string;
  text: string;
  impactScore?: number;
  addedBy?: string;
  createdAt: string;
}

interface StrategyDocument {
  id: string;
  tenantId: string;
  matrixType: "swot" | "pestel";
  title: string;
  description?: string;
  categories: Record<string, StrategyItem[]>;
  createdAt: string;
  updatedAt: string;
}

export function StrategyStudioPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || "default";

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMatrixType, setNewMatrixType] = useState<"swot" | "pestel">("swot");

  // Add Item Dialog state
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string>("");
  const [itemText, setItemText] = useState("");
  const [itemScore, setItemScore] = useState<number>(3);

  // 1. Fetch Strategy Documents
  const {
    data: documentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["strategy-studio-documents", tenantId],
    queryFn: async () => {
      const res = await api.get("/strategy-studio/documents");
      return (res?.documents || []) as StrategyDocument[];
    },
  });

  const documents = documentsData || [];
  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0] || null;

  // 2. Create Document Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/strategy-studio/documents", {
        matrixType: newMatrixType,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      return res?.document as StrategyDocument;
    },
    onSuccess: (newDoc) => {
      qc.invalidateQueries({ queryKey: ["strategy-studio-documents", tenantId] });
      setCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      if (newDoc?.id) setSelectedDocId(newDoc.id);
      toast.success("Strategy matrix created successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create strategy document");
    },
  });

  // 3. Add Item Mutation
  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDoc) throw new Error("No active document selected");
      const res = await api.post(`/strategy-studio/documents/${selectedDoc.id}/items`, {
        category: targetCategory,
        text: itemText.trim(),
        impactScore: itemScore,
      });
      return res?.document as StrategyDocument;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategy-studio-documents", tenantId] });
      setAddItemOpen(false);
      setItemText("");
      setItemScore(3);
      toast.success("Strategy item added!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add item");
    },
  });

  // 4. Export Handler
  async function handleExport() {
    if (!selectedDoc) return;
    try {
      const res = await api.get(`/strategy-studio/documents/${selectedDoc.id}/export`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${selectedDoc.title.replace(/\s+/g, "_")}_export.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Strategy matrix exported successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export strategy document");
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Target className="size-6 text-primary" />
            Strategy Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and collaborate on SWOT Analysis and PESTEL Strategic Matrices with scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedDoc && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="size-4" />
              Export JSON
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" />
            New Strategic Matrix
          </Button>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Loading strategy documents...</p>
        </Card>
      ) : isError ? (
        <Card className="p-8 border-destructive/30 bg-destructive/5 text-center">
          <AlertCircle className="size-8 text-destructive mx-auto mb-2" />
          <h3 className="text-base font-semibold text-destructive">Failed to load Strategy Studio</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {(error as any)?.message || "A server or entitlement error occurred while fetching strategic documents."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </Card>
      ) : documents.length === 0 ? (
        /* Empty State */
        <Card className="p-12 text-center border-dashed">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Layers className="size-6" />
          </div>
          <h3 className="text-lg font-bold">No Strategic Analyses Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
            Create your workspace's first SWOT analysis or PESTEL macro-environment framework to guide business planning.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Create Your First Matrix
          </Button>
        </Card>
      ) : (
        /* Document Selector and Active Matrix View */
        <div className="space-y-6">
          {/* Document Picker Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {documents.map((doc) => {
              const isActive = (selectedDoc?.id || "") === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted text-foreground border-border"
                  }`}
                >
                  <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px] uppercase">
                    {doc.matrixType}
                  </Badge>
                  <span>{doc.title}</span>
                </button>
              );
            })}
          </div>

          {selectedDoc && (
            <Card>
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {selectedDoc.title}
                      <Badge variant="outline" className="text-xs uppercase font-mono">
                        {selectedDoc.matrixType}
                      </Badge>
                    </CardTitle>
                    {selectedDoc.description && (
                      <CardDescription className="mt-1">{selectedDoc.description}</CardDescription>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(selectedDoc.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Dynamic Category Grid */}
                <div
                  className={`grid gap-4 ${
                    selectedDoc.matrixType === "swot"
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  }`}
                >
                  {Object.entries(selectedDoc.categories || {}).map(([catKey, items]) => (
                    <div
                      key={catKey}
                      className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b pb-2 mb-3">
                          <h4 className="font-bold text-sm tracking-tight capitalize flex items-center gap-1.5 text-foreground">
                            <span className="size-2 rounded-full bg-primary" />
                            {catKey}
                          </h4>
                          <span className="text-xs text-muted-foreground font-mono font-medium">
                            {items.length} {items.length === 1 ? "item" : "items"}
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-4 text-center">
                            No {catKey} factors recorded yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-start justify-between gap-2"
                              >
                                <span className="leading-relaxed flex-1 text-foreground">{item.text}</span>
                                {item.impactScore && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] shrink-0 font-mono font-bold"
                                  >
                                    Score: {item.impactScore}/5
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTargetCategory(catKey);
                          setAddItemOpen(true);
                        }}
                        className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground justify-center gap-1 border border-dashed border-border"
                      >
                        <Plus className="size-3.5" />
                        Add Factor to {catKey}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog: Create Strategic Matrix */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Strategic Analysis Matrix</DialogTitle>
            <DialogDescription>
              Select a framework and enter title details for your new strategic canvas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="matrixType">Framework Type</Label>
              <Select
                value={newMatrixType}
                onValueChange={(v: "swot" | "pestel") => setNewMatrixType(v)}
              >
                <SelectTrigger id="matrixType">
                  <SelectValue placeholder="Select Framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="swot">SWOT (Strengths, Weaknesses, Opportunities, Threats)</SelectItem>
                  <SelectItem value="pestel">
                    PESTEL (Political, Economic, Social, Technological, Environmental, Legal)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Matrix Title</Label>
              <Input
                id="title"
                placeholder="e.g. FY 2026 Enterprise Expansion Plan"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Strategic Goal / Notes</Label>
              <Input
                id="description"
                placeholder="Optional notes or context for this evaluation"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle.trim() || createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Create Matrix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Category Item */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Strategic Factor</DialogTitle>
            <DialogDescription>
              Record an analytical factor for category:{" "}
              <span className="font-bold text-foreground capitalize">{targetCategory}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="factorText">Factor Description</Label>
              <Input
                id="factorText"
                placeholder="e.g. Strong brand presence in regional markets"
                value={itemText}
                onChange={(e) => setItemText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="factorScore">Impact Priority (1 to 5)</Label>
              <Select
                value={String(itemScore)}
                onValueChange={(v) => setItemScore(parseInt(v, 10))}
              >
                <SelectTrigger id="factorScore">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Minor Significance</SelectItem>
                  <SelectItem value="2">2 — Low Impact</SelectItem>
                  <SelectItem value="3">3 — Moderate Priority</SelectItem>
                  <SelectItem value="4">4 — High Significance</SelectItem>
                  <SelectItem value="5">5 — Critical Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addItemMutation.mutate()}
              disabled={!itemText.trim() || addItemMutation.isPending}
              className="gap-2"
            >
              {addItemMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Save Factor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
