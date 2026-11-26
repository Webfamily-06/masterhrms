"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Star, Tag, Code2 } from "lucide-react";

interface TemplateDetail {
  id: string;
  title: string;
  category: string;
  categoryColor?: string;
  description: string;
  fileFormat: string;
  isDefault: boolean;
  content: string;
  contentLength: number;
  placeholders: string[];
  defaultValues: Record<string, string>;
  isActive: boolean;
  createdAt?: string;
}

function formatDateYmd(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().split("T")[0];
}

export default function ViewDocumentTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = params?.id;

  const { data: template, isLoading } = useQuery<TemplateDetail>({
    queryKey: ["hr-document-template-detail", templateId],
    enabled: Boolean(templateId),
    queryFn: async () => {
      const res = await api.get(`/hr/documents/templates/${templateId}`);
      return unwrapData<TemplateDetail>(res);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Loading document template...
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => router.push("/hr/documents/templates")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Document template not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="View Document Template"
        description="Preview the content and details of this document template."
        actions={
          <Button variant="outline" onClick={() => router.push("/hr/documents/templates")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      {/* Basic Information */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
        <h2 className="text-base font-bold text-foreground">Basic Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <div className="text-xs text-muted-foreground">Template Name</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div
                className="h-7 w-7 rounded-md text-white flex items-center justify-center shrink-0"
                style={{ backgroundColor: template.categoryColor || "#F59E0B" }}
              >
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-foreground">{template.title}</span>
              {template.isDefault && (
                <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Category</div>
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground mt-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{template.category}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">File Format</div>
            <div className="mt-1.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-muted text-foreground border border-border/80">
                {template.fileFormat || "PDF"}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="mt-1.5">
              {template.isActive !== false ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-border/60">
          <div>
            <div className="text-xs text-muted-foreground">Description</div>
            <p className="text-sm font-medium text-foreground mt-1">
              {template.description || "No description provided."}
            </p>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Created At</div>
            <div className="text-sm font-semibold text-foreground mt-1">
              {formatDateYmd(template.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Template Content */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-3">
        <h2 className="text-base font-bold text-foreground">Template Content</h2>
        <pre className="p-5 rounded-xl bg-muted/40 border border-border/80 text-sm tabular-nums whitespace-pre-wrap leading-relaxed text-foreground">
          {template.content}
        </pre>
        <div className="text-xs text-muted-foreground">{template.contentLength} characters</div>
      </div>

      {/* Placeholders & Default Values */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-bold text-foreground">Placeholders</h2>
          <span className="text-xs text-muted-foreground">
            ({template.placeholders?.length ?? 0})
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(template.placeholders || []).length === 0 ? (
            <span className="text-xs text-muted-foreground">No placeholders defined.</span>
          ) : (
            (template.placeholders || []).map((ph) => (
              <span
                key={ph}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs tabular-nums bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20"
              >
                {`{{${ph}}}`}
              </span>
            ))
          )}
        </div>

        <div className="space-y-1.5 pt-2">
          <div className="text-xs font-semibold text-muted-foreground">Default Values</div>
          <pre className="p-4 rounded-xl bg-muted/40 border border-border/80 text-xs tabular-nums text-foreground overflow-x-auto">
            {JSON.stringify(template.defaultValues || {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
