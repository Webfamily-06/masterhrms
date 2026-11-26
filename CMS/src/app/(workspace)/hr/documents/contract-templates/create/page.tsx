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

interface ContractTypeOption {
  id: string;
  name: string;
}

export default function CreateContractTemplatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [contractTypeId, setContractTypeId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [content, setContent] = useState("");
  const [variablesText, setVariablesText] = useState("");

  const { data: contractTypes = [] } = useQuery<ContractTypeOption[]>({
    queryKey: ["hr-contract-types"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contract-types");
      return unwrapArray<ContractTypeOption>(res);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post("/hr/documents/contract-templates", {
        title: title.trim(),
        contractTypeId,
        status,
        isActive: status === "active",
        description: description.trim(),
        isDefault,
        content,
        variables: variablesText,
      }),
    onSuccess: () => {
      toast.success("Contract template created");
      queryClient.invalidateQueries({ queryKey: ["hr-contract-templates"] });
      router.push("/hr/documents/contract-templates");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create contract template"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Template Name is required");
    if (!contractTypeId && contractTypes.length > 0) {
      return toast.error("Please select a Contract Type");
    }
    if (!content.trim()) return toast.error("Template Content is required");
    createMutation.mutate();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Create Contract Template"
        description="Build a new reusable contract template."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push("/hr/documents/contract-templates")}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
          <h2 className="text-base font-bold text-foreground">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Contract Type <span className="text-rose-500">*</span>
              </Label>
              <Select value={contractTypeId} onValueChange={setContractTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Contract Type" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.name}
                    </SelectItem>
                  ))}
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
              Set as Default for Contract Type
            </span>
          </label>
        </div>

        <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-3">
          <h2 className="text-base font-bold text-foreground">Template Content</h2>
          <div className="space-y-1.5">
            <Label>
              Content <span className="text-rose-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Use {"{{variable_name}}"} for dynamic content
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

        <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Variables</h2>
          <div className="space-y-1.5">
            <Label>
              Variables <span className="text-rose-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Comma-separated list of variable names (without {"{{}}"})
            </p>
            <Input
              value={variablesText}
              onChange={(e) => setVariablesText(e.target.value)}
              placeholder="employee_name, company_name, start_date"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/hr/documents/contract-templates")}
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
