"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface DocCategoryOption {
  id: string;
  name: string;
}

export default function EditDocumentTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const templateId = params?.id;

  const [initialized, setInitialized] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fileFormat, setFileFormat] = useState("PDF");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [content, setContent] = useState("");
  const [placeholdersText, setPlaceholdersText] = useState("");
  const [defaultValuesText, setDefaultValuesText] = useState("{}");

  const { data: template, isLoading } = useQuery<any>({
    queryKey: ["hr-document-template-detail", templateId],
    enabled: Boolean(templateId),
    queryFn: async () => {
      const res = await api.get(`/hr/documents/templates/${templateId}`);
      return unwrapData(res);
    },
  });

  const { data: categories = [] } = useQuery<DocCategoryOption[]>({
    queryKey: ["hr-document-categories"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/categories");
      return unwrapArray<DocCategoryOption>(res);
    },
  });

  useEffect(() => {
    if (!template || initialized) return;
    setTitle(template.title || "");
    setCategoryId(template.categoryId || "");
    setFileFormat(template.fileFormat || "PDF");
    setStatus(template.isActive === false ? "inactive" : "active");
    setDescription(template.description || "");
    setIsDefault(Boolean(template.isDefault));
    setContent(template.content || "");
    setPlaceholdersText(Array.isArray(template.placeholders) ? template.placeholders.join(", ") : "");
    setDefaultValuesText(JSON.stringify(template.defaultValues || {}, null, 2));
    setInitialized(true);
  }, [template, initialized]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      let parsedDefaults: Record<string, string> = {};
      if (defaultValuesText.trim()) {
        try {
          parsedDefaults = JSON.parse(defaultValuesText);
        } catch {
          throw new Error("Default Values must be a valid JSON object");
        }
      }
      return api.put(`/hr/documents/templates/${templateId}`, {
        title: title.trim(),
        categoryId,
        fileFormat,
        status,
        isActive: status === "active",
        description: description.trim(),
        isDefault,
        content,
        placeholders: placeholdersText,
        defaultValues: parsedDefaults,
      });
    },
    onSuccess: () => {
      toast.success("Document template updated");
      queryClient.invalidateQueries({ queryKey: ["hr-document-templates"] });
      queryClient.invalidateQueries({ queryKey: ["hr-document-template-detail", templateId] });
      router.push("/hr/documents/templates");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update template"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Template Name is required");
    if (!content.trim()) return toast.error("Template Content is required");
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Loading template...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Edit Document Template"
        description="Update the content and settings of this document template."
        actions={
          <Button variant="outline" onClick={() => router.push("/hr/documents/templates")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Information */}
        <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
          <h2 className="text-base font-bold text-foreground">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>
                Template Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Category <span className="text-rose-500">*</span>
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>File Format</Label>
              <Select value={fileFormat} onValueChange={setFileFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="DOCX">DOCX</SelectItem>
                  <SelectItem value="HTML">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-emerald-500"
            />
            <span className="text-sm font-semibold text-foreground">
              Set as Default for Category
            </span>
          </label>
        </div>

        {/* Template Content */}
        <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-3">
          <h2 className="text-base font-bold text-foreground">Template Content</h2>
          <div className="space-y-1.5">
            <Label>
              Content <span className="text-rose-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Use {"{{placeholder_name}}"} for dynamic content
            </p>
            <Textarea
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-sm"
              required
            />
          </div>
        </div>

        {/* Placeholders & Default Values */}
        <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Placeholders &amp; Default Values</h2>

          <div className="space-y-1.5">
            <Label>
              Placeholders <span className="text-rose-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Comma-separated list of placeholder names (without {"{{}}"})
            </p>
            <Input
              value={placeholdersText}
              onChange={(e) => setPlaceholdersText(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Default Values</Label>
            <p className="text-xs text-muted-foreground">
              JSON object e.g. {`{"company_name": "Acme Inc"}`}
            </p>
            <Textarea
              rows={4}
              value={defaultValuesText}
              onChange={(e) => setDefaultValuesText(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/hr/documents/templates")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {updateMutation.isPending ? "Updating..." : "Update Template"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
