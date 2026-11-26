"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
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
  isActive?: boolean;
}

export default function CreateDocumentTemplatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fileFormat, setFileFormat] = useState("PDF");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [content, setContent] = useState("");
  const [placeholdersText, setPlaceholdersText] = useState("");
  const [defaultValuesText, setDefaultValuesText] = useState("{\n  \n}");

  const { data: categories = [] } = useQuery<DocCategoryOption[]>({
    queryKey: ["hr-document-categories"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/categories");
      return unwrapArray<DocCategoryOption>(res);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let parsedDefaults: Record<string, string> = {};
      if (defaultValuesText.trim()) {
        try {
          parsedDefaults = JSON.parse(defaultValuesText);
        } catch {
          throw new Error("Default Values must be a valid JSON object");
        }
      }
      return api.post("/hr/documents/templates", {
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
      toast.success("Document template created");
      queryClient.invalidateQueries({ queryKey: ["hr-document-templates"] });
      router.push("/hr/documents/templates");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create template"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Template Name is required");
    if (!categoryId && categories.length > 0) return toast.error("Please select a Category");
    if (!content.trim()) return toast.error("Template Content is required");
    createMutation.mutate();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Create Document Template"
        description="Build a new reusable document template."
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
                placeholder="Enter template name"
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
              <Label>
                File Format <span className="text-rose-500">*</span>
              </Label>
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
              placeholder="Enter description"
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
              placeholder="Enter template content..."
              className="tabular-nums text-sm"
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
              placeholder="employee_name, company_name, date"
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
              className="tabular-nums text-xs"
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
              disabled={createMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {createMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
