'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute, useNavigate, Link  } from "@/src/lib/router-compat";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Copy, Download, Trash2, Save, FileText, Check, Calendar, User, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/api";
import { PdfPreviewModal } from "@/components/ai/pdf-preview-modal";

const Route = createFileRoute(
  "/_authenticated/_app/addons/ai-document/history/$id"
)({
  component: AiDocumentViewPage,
});

export default function AiDocumentViewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchDoc();
  }, [id]);

  const fetchDoc = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/addons/ai-document/documents/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const document = data.data || data;
        setDoc(document);
        setContent(document?.content || "");
      } else {
        toast.error("Document not found");
        navigate({ to: "/addons/ai-document/history" });
      }
    } catch {
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/addons/ai-document/documents/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        toast.success("Document content updated successfully");
        fetchDoc();
      } else {
        toast.error("Failed to save changes");
      }
    } catch {
      toast.error("Error saving document");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: "txt" | "docx" | "pdf" | "md") => {
    try {
      const res = await fetch(`/api/v1/addons/ai-document/documents/${id}/export?format=${format}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(doc?.title || "document").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported as .${format}`);
    } catch {
      toast.error(`Failed to export document`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document permanently?")) return;
    try {
      const res = await fetch(`/api/v1/addons/ai-document/documents/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Document deleted");
        navigate({ to: "/addons/ai-document/history" });
      } else {
        toast.error("Failed to delete document");
      }
    } catch {
      toast.error("Error deleting document");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <AiDocumentNavHeader active="history" />
        <Skeleton className="h-10 w-48 mb-4" />
        <Card className="p-8 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <AiDocumentNavHeader active="history" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate({ to: "/addons/ai-document/history" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {doc?.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {doc?.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy h:mm a") : ""}
              </span>
              <span>•</span>
              <span>Template: {doc?.template?.title || "Custom"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="default" size="sm" onClick={() => setPreviewOpen(true)} className="gap-1.5" data-testid="preview-pdf-button">
            <Eye className="h-4 w-4" />
            Preview PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("txt")}>
            <Download className="h-4 w-4 mr-1" />
            .txt
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("docx")}>
            <Download className="h-4 w-4 mr-1" />
            .docx
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <Download className="h-4 w-4 mr-1" />
            .pdf
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Document Editor</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{content.trim() ? content.trim().split(/\s+/).length : 0} words</span>
                  <span>•</span>
                  <span>{content.length} characters</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                className="font-mono text-sm leading-relaxed min-h-[420px] resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Tone</span>
                <Badge variant="secondary">{doc?.tone?.name || "Standard"}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Language</span>
                <Badge variant="outline">{doc?.language || "English"}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Creativity</span>
                <span className="font-semibold">{doc?.creativity}/10</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Keywords</span>
                <p className="font-mono bg-muted p-2 rounded text-xs break-all">
                  {doc?.keywords || "None"}
                </p>
              </div>
              {doc?.instructions && (
                <div>
                  <span className="text-muted-foreground block mb-1">Additional Instructions</span>
                  <p className="bg-muted p-2 rounded text-xs">{doc.instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PdfPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        documentId={id}
        documentTitle={doc?.title || "Document"}
      />
    </div>
  );
}
