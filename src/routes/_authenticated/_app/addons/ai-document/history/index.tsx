import React, { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trash2, Eye, Calendar, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute(
  "/_authenticated/_app/addons/ai-document/history/"
)({
  component: AiDocumentHistoryPage,
});

export default function AiDocumentHistoryPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/addons/ai-document/documents?search=${encodeURIComponent(search)}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || (Array.isArray(data) ? data : []));
      }
    } catch (err: any) {
      toast.error("Failed to load document history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this generated document?")) return;
    try {
      setDeleteLoading(id);
      const res = await fetch(`/api/v1/addons/ai-document/documents/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Document removed from history");
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        toast.error("Failed to delete document");
      }
    } catch {
      toast.error("Network error deleting document");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <AiDocumentNavHeader active="history" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents by title..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => navigate({ to: "/addons/ai-document/generate" })}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate New Document
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-24 w-full mb-4" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-muted-foreground mb-6">
            {search ? "No documents match your search query." : "Generate your first document using an AI template."}
          </p>
          <Button onClick={() => navigate({ to: "/addons/ai-document/generate" })}>
            <Sparkles className="mr-2 h-4 w-4" /> Start Generating
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate({ to: `/addons/ai-document/history/${doc.id}` })}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-1">{doc.title}</CardTitle>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {doc.template?.title || "Custom"}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  {doc.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy h:mm a") : "Recent"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {doc.language && (
                    <Badge variant="secondary" className="text-xs">
                      {doc.language}
                    </Badge>
                  )}
                  {doc.tone?.name && (
                    <Badge variant="secondary" className="text-xs">
                      {doc.tone.name}
                    </Badge>
                  )}
                  {doc.wordCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {doc.wordCount} words
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed font-sans bg-muted/40 p-2.5 rounded-md">
                  {doc.content || "Empty content"}
                </p>
              </CardContent>
              <CardFooter className="pt-0 flex items-center justify-between border-t p-4 mt-auto">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/addons/ai-document/history/$id" params={{ id: doc.id }}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={deleteLoading === doc.id}
                  onClick={(e) => handleDelete(doc.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
