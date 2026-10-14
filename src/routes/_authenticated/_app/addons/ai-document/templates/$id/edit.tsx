import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Save, 
  RotateCw, 
  Eye, 
  FileText 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/addons/ai-document/templates/$id/edit")({
  component: EditAiDocTemplatePage,
});

interface CategoryItem {
  id: string;
  name: string;
}

function EditAiDocTemplatePage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [description, setDescription] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [tplRes, catRes] = await Promise.all([
          fetch(`/api/v1/addons/ai-document/templates/${id}`, { headers: getAuthHeaders() }),
          fetch("/api/v1/addons/ai-document/categories", { headers: getAuthHeaders() }),
        ]);

        if (catRes.ok) {
          const c = await catRes.json();
          setCategories(Array.isArray(c) ? c : c.categories || []);
        }

        if (tplRes.ok) {
          const tpl = await tplRes.json();
          setTitle(tpl.title || "");
          setCategoryId(tpl.categoryId || "");
          setStatus(tpl.status || "Active");
          setDescription(tpl.description || "");
          setPromptTemplate(tpl.promptTemplate || "");
        }
      } catch (err: any) {
        toast.error("Failed to load template data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleInsertPlaceholder = (placeholder: string) => {
    setPromptTemplate((prev) => `${prev} {${placeholder}} `);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !promptTemplate.trim()) {
      toast.error("Title and Prompt Template are required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/addons/ai-document/templates/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          categoryId,
          status,
          description: description.trim(),
          promptTemplate: promptTemplate.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update template");
      }

      toast.success("Document template updated successfully");
      navigate({ to: "/addons/ai-document/templates" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const previewPrompt = promptTemplate
    .replace(/{title}/gi, "Sample Document Title")
    .replace(/{keywords}/gi, "growth, efficiency, ROI")
    .replace(/{tone}/gi, "Professional")
    .replace(/{language}/gi, "English");

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <RotateCw className="w-5 h-5 animate-spin" />
          <span>Loading template...</span>
        </div>
      </div>
    );
  }

  return (
    <PlanGuard moduleName="AI Document" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <AiDocumentNavHeader activeTab="templates" />

        <div className="flex items-center space-x-3 border-b pb-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/addons/ai-document/templates">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Document Template</h1>
            <p className="text-xs text-muted-foreground">Modify prompt pattern, category classification, or tokens</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Template Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Short Description</Label>
                  <Input
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Prompt Template */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="prompt">Prompt Template Pattern *</Label>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-muted-foreground">Insert token:</span>
                    {["title", "keywords", "tone", "language"].map((tok) => (
                      <Badge
                        key={tok}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20 text-[10px] font-mono"
                        onClick={() => handleInsertPlaceholder(tok)}
                      >
                        +{tok}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Textarea
                  id="prompt"
                  rows={5}
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              {/* Live Preview */}
              {promptTemplate && (
                <div className="p-3 bg-muted/40 rounded border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center">
                    <Eye className="w-3.5 h-3.5 mr-1" /> Compiled Prompt Preview
                  </span>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed select-all">
                    {previewPrompt}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3">
            <Button asChild type="button" variant="outline">
              <Link to="/addons/ai-document/templates">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </PlanGuard>
  );
}
