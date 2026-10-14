import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  FileText, 
  Plus, 
  Search, 
  RotateCw, 
  Copy, 
  Trash2, 
  Edit, 
  Filter,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/addons/ai-document/templates/")({
  component: AiDocTemplatesListPage,
});

interface TemplateItem {
  id: string;
  title: string;
  categoryId: string;
  categoryName?: string;
  status: "Active" | "Inactive";
  description: string;
  promptTemplate: string;
}

interface CategoryItem {
  id: string;
  name: string;
}

function AiDocTemplatesListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tplRes, catRes] = await Promise.all([
        fetch("/api/v1/addons/ai-document/templates", { headers: getAuthHeaders() }),
        fetch("/api/v1/addons/ai-document/categories", { headers: getAuthHeaders() }),
      ]);
      if (tplRes.ok) {
        const d = await tplRes.json();
        setTemplates(Array.isArray(d) ? d : d.templates || []);
      }
      if (catRes.ok) {
        const c = await catRes.json();
        setCategories(Array.isArray(c) ? c : c.categories || []);
      }
    } catch (err: any) {
      toast.error("Failed to load prompt templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/addons/ai-document/templates/${id}/duplicate`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to duplicate template");
      toast.success("Template duplicated successfully");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete template "${title}"?`)) return;
    try {
      const res = await fetch(`/api/v1/addons/ai-document/templates/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete template");
      toast.success("Template deleted successfully");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.title.toLowerCase().includes(search.toLowerCase()) ||
      tpl.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "all" || tpl.categoryId === selectedCategory;
    const matchesStatus = selectedStatus === "all" || tpl.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <PlanGuard moduleName="AI Document" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        <AiDocumentNavHeader activeTab="templates" />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Document Prompt Templates</span>
                </CardTitle>
                <CardDescription>
                  Manage parameterized prompt templates with placeholders {"{title}"}, {"{keywords}"}, {"{tone}"}, and {"{language}"}.
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RotateCw className="w-4 h-4 mr-1.5" /> Refresh
                </Button>
                <Button asChild size="sm">
                  <Link to="/addons/ai-document/templates/new">
                    <Plus className="w-4 h-4 mr-1.5" /> Create Template
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates by title or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border text-xs bg-background"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border text-xs bg-background"
                >
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Templates List Table */}
            {loading ? (
              <div className="py-12 text-center text-muted-foreground text-xs flex justify-center items-center space-x-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Loading templates...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs border rounded-md">
                No matching document templates found.
              </div>
            ) : (
              <div className="border rounded-md divide-y overflow-hidden text-xs">
                <div className="bg-muted/40 px-4 py-2.5 font-semibold grid grid-cols-12 gap-2 text-muted-foreground">
                  <span className="col-span-4">Template Title & Overview</span>
                  <span className="col-span-3">Category</span>
                  <span className="col-span-2 text-center">Status</span>
                  <span className="col-span-3 text-right">Actions</span>
                </div>
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20 transition-colors"
                  >
                    <div className="col-span-4 space-y-0.5">
                      <div className="font-semibold text-foreground text-sm">{tpl.title}</div>
                      <div className="text-muted-foreground line-clamp-1">{tpl.description}</div>
                    </div>

                    <div className="col-span-3">
                      <Badge variant="outline" className="text-[11px]">
                        {tpl.categoryName || "General"}
                      </Badge>
                    </div>

                    <div className="col-span-2 text-center">
                      <Badge variant={tpl.status === "Active" ? "default" : "secondary"} className="text-[10px]">
                        {tpl.status}
                      </Badge>
                    </div>

                    <div className="col-span-3 flex justify-end space-x-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Duplicate Template"
                        onClick={() => handleDuplicate(tpl.id)}
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Edit Template">
                        <Link to="/addons/ai-document/templates/$id/edit" params={{ id: tpl.id }}>
                          <Edit className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600"
                        title="Delete Template"
                        onClick={() => handleDelete(tpl.id, tpl.title)}
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
