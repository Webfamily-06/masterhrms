"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  Eye,
  FileText,
  Download,
  Edit,
  Lock,
  Trash2,
  Star,
  Code2,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  FileDown,
  X,
} from "lucide-react";

interface ContractTypeOption {
  id: string;
  name: string;
}

interface ContractTemplateItem {
  id: string;
  title: string;
  name: string;
  contractTypeId?: string | null;
  contractType: string;
  description: string;
  isDefault: boolean;
  content: string;
  contentLength: number;
  variables: string[];
  clauses: string[];
  isActive: boolean;
  status: "active" | "inactive";
  createdAt?: string;
}

function formatDateYmd(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().split("T")[0];
}

function humanizeVar(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HrContractTemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [defaultFilter, setDefaultFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [previewItem, setPreviewItem] = useState<ContractTemplateItem | null>(null);
  const [generateItem, setGenerateItem] = useState<ContractTemplateItem | null>(null);
  const [genValues, setGenValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContractTemplateItem | null>(null);

  const { data: templates = [], isLoading } = useQuery<ContractTemplateItem[]>({
    queryKey: ["hr-contract-templates"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contract-templates");
      return unwrapArray<ContractTemplateItem>(res);
    },
  });

  const { data: contractTypes = [] } = useQuery<ContractTypeOption[]>({
    queryKey: ["hr-contract-types"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contract-types");
      return unwrapArray<ContractTypeOption>(res);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: ContractTemplateItem) =>
      api.patch(`/hr/documents/contract-templates/${item.id}/status`, {
        isActive: !item.isActive,
      }),
    onSuccess: () => {
      toast.success("Contract template status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-contract-templates"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/documents/contract-templates/${id}`),
    onSuccess: () => {
      toast.success("Contract template deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-contract-templates"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete template"),
  });

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (selectedType !== "all" && t.contractTypeId !== selectedType && t.contractType !== selectedType) {
        return false;
      }
      if (defaultFilter === "default" && !t.isDefault) return false;
      if (q) {
        const text = `${t.title} ${t.description || ""} ${t.contractType || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [templates, search, selectedType, defaultFilter]);

  const counts = useMemo(
    () => ({
      all: baseFiltered.length,
      active: baseFiltered.filter((t) => t.isActive !== false).length,
      inactive: baseFiltered.filter((t) => t.isActive === false).length,
    }),
    [baseFiltered]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((t) => (activeTab === "active" ? t.isActive !== false : t.isActive === false));
    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      const da = formatDateYmd(a.createdAt);
      const db = formatDateYmd(b.createdAt);
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
    });
  }, [baseFiltered, activeTab, sortBy, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters = Boolean(search || selectedType !== "all" || defaultFilter !== "all");

  const openGenerate = (item: ContractTemplateItem) => {
    setGenerateItem(item);
    const initial: Record<string, string> = {};
    for (const v of item.variables || []) initial[v] = "";
    setGenValues(initial);
  };

  const handleGeneratePdf = async () => {
    if (!generateItem) return;
    setGenerating(true);
    try {
      let rendered = generateItem.content || "";
      for (const [key, val] of Object.entries(genValues)) {
        const re = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
        rendered = rendered.replace(re, val || `[${key}]`);
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(generateItem.title, 48, 60);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(rendered, 500);
      let y = 92;
      for (const line of lines) {
        if (y > 780) {
          doc.addPage();
          y = 56;
        }
        doc.text(line, 48, y);
        y += 16;
      }

      const safeFilename = generateItem.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      doc.save(`${safeFilename || "contract"}.pdf`);
      toast.success("Contract PDF generated and downloaded");
      setGenerateItem(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate contract PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Contract Templates"
        description="Reusable templates for generating employee contracts."
        actions={
          <Button
            onClick={() => router.push("/hr/documents/contract-templates/create")}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Template
          </Button>
        }
      />

      {/* Filter & Tabs Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-[280px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9 bg-background"
            />
          </div>

          <Select
            value={selectedType}
            onValueChange={(val) => {
              setSelectedType(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[175px] h-9 bg-background">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {contractTypes.map((ct) => (
                <SelectItem key={ct.id} value={ct.id}>
                  {ct.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={defaultFilter}
            onValueChange={(val) => {
              setDefaultFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px] h-9 bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="default">Default Only</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedType("all");
                  setDefaultFilter("all");
                  setPage(1);
                }}
                className="h-9 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/70 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: counts.all, Icon: LayoutGrid },
            { key: "active" as const, label: "Active", count: counts.active, Icon: CheckCircle2 },
            { key: "inactive" as const, label: "Inactive", count: counts.inactive, Icon: XCircle },
          ].map(({ key, label, count, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setPage(1);
                }}
                className={`py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="p-3.5 text-xs font-semibold text-muted-foreground w-10">#</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("name");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Template Name</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Contract Type</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Variables</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Clauses</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  Content Length
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("createdAt");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Created</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-sm text-muted-foreground">
                    Loading contract templates...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-sm text-muted-foreground">
                    No contract templates found. Click &ldquo;+ Add Template&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((tpl, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const isActive = tpl.isActive !== false;
                  return (
                    <tr key={tpl.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3.5">
                        <div className="flex items-start gap-2.5 min-w-[230px]">
                          <FileText className="h-4 w-4 text-sky-600 shrink-0 mt-1" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-foreground">
                                {tpl.title}
                              </span>
                              {tpl.isDefault && (
                                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                              )}
                            </div>
                            {tpl.description && (
                              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {tpl.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-sm font-medium text-foreground">
                        {tpl.contractType}
                      </td>
                      <td className="p-3.5 text-xs text-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold">{tpl.variables?.length ?? 0}</span>
                          <span className="text-muted-foreground">variables</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-xs whitespace-nowrap">
                        <div className="font-semibold text-foreground">{tpl.clauses?.length ?? 0}</div>
                        <div className="text-muted-foreground">clauses</div>
                      </td>
                      <td className="p-3.5 text-xs whitespace-nowrap">
                        <div className="font-medium text-foreground">{tpl.contentLength}</div>
                        <div className="text-muted-foreground">characters</div>
                      </td>
                      <td className="p-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateYmd(tpl.createdAt)}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Contract Template"
                            onClick={() =>
                              router.push(`/hr/documents/contract-templates/${tpl.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-indigo-600"
                            title="Template Preview"
                            onClick={() => setPreviewItem(tpl)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600"
                            title="Generate Contract"
                            onClick={() => openGenerate(tpl)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                            title="Edit Contract Template"
                            onClick={() =>
                              router.push(`/hr/documents/contract-templates/${tpl.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600"
                            title={isActive ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatusMutation.mutate(tpl)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                            title="Delete Template"
                            onClick={() => setDeleteTarget(tpl)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-medium text-foreground">
              {totalResults === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(safePage * pageSize, totalResults)}
            </span>{" "}
            of <span className="font-medium text-foreground">{totalResults}</span> results
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === safePage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 p-0 text-xs ${
                      pNum === safePage
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                        : ""
                    }`}
                  >
                    {pNum}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      <Dialog open={Boolean(previewItem)} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewItem?.title}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4 pt-1">
              <pre className="p-4 rounded-xl bg-muted/40 border border-border/80 text-sm font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                {previewItem.content}
              </pre>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-foreground">Available Variables:</div>
                <div className="flex flex-wrap gap-1.5">
                  {(previewItem.variables || []).map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-sky-500/10 text-sky-700 border border-sky-500/20"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Contract Modal */}
      <Dialog open={Boolean(generateItem)} onOpenChange={(o) => !o && setGenerateItem(null)}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <FileDown className="h-4 w-4" />
              </span>
              <div>
                <div className="text-base font-bold">Generate Contract</div>
                <div className="text-xs font-normal text-muted-foreground mt-0.5">
                  {generateItem?.title}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          {generateItem && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Fill in the values for the template variables below.
              </p>
              <div className="space-y-3">
                {(generateItem.variables || []).map((v) => (
                  <div key={v} className="space-y-1">
                    <Label className="text-xs font-semibold">{humanizeVar(v)}</Label>
                    <Input
                      value={genValues[v] ?? ""}
                      onChange={(e) => setGenValues((prev) => ({ ...prev, [v]: e.target.value }))}
                      placeholder={`Enter ${humanizeVar(v).toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setGenerateItem(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={generating}
                  onClick={handleGeneratePdf}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <FileDown className="h-4 w-4 mr-1.5" />
                  {generating ? "Generating..." : "Generate PDF"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Contract Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.title}</span>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
