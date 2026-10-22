'use client';

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Loader2,
  Plus,
  Trash2,
  Eye,
  Search,
  Sparkles,
  Layers,
  FileText,
  Shield,
  HelpCircle,
  ExternalLink,
  Code,
  LayoutTemplate,
  CheckCircle2,
  RefreshCw,
  Globe,
  Palette,
  BookOpen,
  Newspaper,
  Award,
  ArrowUp,
  ArrowDown,
  Edit,
  Copy,
  Check,
  Filter,
  ArrowRight,
  Clock,
  Grid,
  List,
  AlertTriangle,
  Folder,
} from "lucide-react";
import { BlogManagerStudio } from "@/components/cms/blog-manager-studio";
import { GuideManagerStudio } from "@/components/cms/guide-manager-studio";

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  meta_description?: string | null;
  content: any;
  published: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PageCategory =
  | "all"
  | "core"
  | "landing"
  | "blogs"
  | "casestudies"
  | "resources"
  | "legal"
  | "footer"
  | "custom";

const CATEGORIES: { id: PageCategory; label: string; icon: any }[] = [
  { id: "all", label: "All Pages", icon: Layers },
  { id: "core", label: "Core Pages", icon: LayoutTemplate },
  { id: "landing", label: "Landing & Features", icon: Globe },
  { id: "blogs", label: "Blog Insights", icon: BookOpen },
  { id: "casestudies", label: "Case Studies", icon: Newspaper },
  { id: "resources", label: "Resources", icon: FileText },
  { id: "legal", label: "Legal Docs", icon: Shield },
  { id: "footer", label: "Footer & Theme", icon: Palette },
  { id: "custom", label: "Custom Pages", icon: Folder },
];

export function getCategoryForSlug(slug: string): PageCategory {
  if (slug === "footer" || slug === "header") return "footer";
  if (slug.startsWith("legal-")) return "legal";
  if (slug.startsWith("blog-") || slug.startsWith("resource-blogs") || slug.includes("blog"))
    return "blogs";
  if (
    slug.startsWith("case-study-") ||
    slug.startsWith("resource-case-studies") ||
    slug.includes("case-study") ||
    slug.includes("casestudy")
  )
    return "casestudies";
  if (slug.startsWith("solution-") || slug.startsWith("industry-")) return "landing";
  if (slug.startsWith("resource-")) return "resources";
  if (["home", "benefits", "compare", "pricing", "about", "contact", "team"].includes(slug))
    return "core";
  return "custom";
}

export function getPublicUrlForPage(slug: string): string {
  if (slug === "home" || slug === "footer") return "/";
  if (slug === "about") return "/about";
  if (slug === "team") return "/team";
  if (slug === "pricing") return "/pricing";
  if (slug === "contact") return "/contact";
  if (slug.startsWith("legal-")) return `/legal/${slug.replace("legal-", "")}`;
  if (slug.startsWith("blog-")) return `/p/${slug}`;
  if (slug.startsWith("case-study-")) return `/p/${slug}`;
  return `/p/${slug}`;
}

const PROTECTED_SYSTEM_SLUGS = new Set([
  "home",
  "footer",
  "header",
  "compare",
  "benefits",
  "about",
  "team",
  "pricing",
  "contact",
  "system-platform-settings",
  "system-monetization-plans",
  "system-email-templates",
  "system-audit-logs",
]);

function CmsStudio() {
  const router = useRouter();
  const qc = useQueryClient();
  const [cmsTab, setCmsTab] = useState<"pages" | "blogs" | "faqs" | "testimonials" | "guides">("pages");
  const [selectedCategory, setSelectedCategory] = useState<PageCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingPage, setDeletingPage] = useState<CmsPage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Fetch all CMS Pages from backend API
  const {
    data: pages = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["cms-pages"],
    queryFn: async () => {
      const res = await api.get("/cms/pages");
      return Array.isArray(res) ? (res as CmsPage[]) : Array.isArray((res as any)?.data) ? ((res as any).data as CmsPage[]) : [];
    },
  });

  // Fast toggle publication status mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      await api.put(`/cms/pages/by-id/${id}`, { published });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.published ? "Page published successfully" : "Page unpublished (moved to draft)");
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update publication status");
    },
  });

  // Delete page mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cms/pages/by-id/${id}`);
    },
    onSuccess: () => {
      toast.success("Page deleted successfully");
      setDeletingPage(null);
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to delete page");
    },
  });

  // Copy ID helper
  const handleCopyId = (id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      toast.success("Page ID copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filtered pages computation
  const filteredPages = useMemo(() => {
    if (!pages) return [];
    return pages.filter((p) => {
      const cat = getCategoryForSlug(p.slug);
      const catMatch = selectedCategory === "all" || cat === selectedCategory;
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "published" && p.published) ||
        (statusFilter === "draft" && !p.published);
      const query = searchQuery.trim().toLowerCase();
      const searchMatch =
        !query ||
        p.title.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        (p.meta_description && p.meta_description.toLowerCase().includes(query));
      return catMatch && statusMatch && searchMatch;
    });
  }, [pages, selectedCategory, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredPages.length / pageSize) || 1;
  const paginatedPages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPages.slice(start, start + pageSize);
  }, [filteredPages, currentPage, pageSize]);

  // Summary counts
  const totalCount = pages.length;
  const publishedCount = pages.filter((p) => p.published).length;
  const draftCount = totalCount - publishedCount;
  const coreCount = pages.filter((p) => getCategoryForSlug(p.slug) === "core").length;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-4" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">CMS Content Studio & Page Manager</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="size-3 text-primary" /> Visual & HTML Editor
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Authoritative dynamic page manager for core marketing routes, blogs, solutions, and custom CMS pages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => router.push("/super/cms/new")}
            className="gap-2 text-xs shadow-xs"
          >
            <Plus className="size-4" /> Create New Page
          </Button>
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 flex-wrap">
        <Button
          variant={cmsTab === "pages" ? "default" : "outline"}
          size="sm"
          onClick={() => setCmsTab("pages")}
          className="gap-2 text-xs"
        >
          <LayoutTemplate className="size-3.5" />
          Pages & Layouts ({totalCount})
        </Button>
        <Button
          variant={cmsTab === "blogs" ? "default" : "outline"}
          size="sm"
          onClick={() => setCmsTab("blogs")}
          className="gap-2 text-xs"
        >
          <BookOpen className="size-3.5" />
          Blogs & Insights
        </Button>
        <Button
          variant={cmsTab === "faqs" ? "default" : "outline"}
          size="sm"
          onClick={() => setCmsTab("faqs")}
          className="gap-2 text-xs"
        >
          <HelpCircle className="size-3.5" />
          FAQs Management
        </Button>
        <Button
          variant={cmsTab === "testimonials" ? "default" : "outline"}
          size="sm"
          onClick={() => setCmsTab("testimonials")}
          className="gap-2 text-xs"
        >
          <Award className="size-3.5" />
          Testimonials Management
        </Button>
        <Button
          variant={cmsTab === "guides" ? "default" : "outline"}
          size="sm"
          onClick={() => setCmsTab("guides")}
          className="gap-2 text-xs"
        >
          <FileText className="size-3.5" />
          Guides & Playbooks
        </Button>
      </div>

      {cmsTab === "blogs" ? (
        <BlogManagerStudio />
      ) : cmsTab === "faqs" ? (
        <FaqManagerStudio />
      ) : cmsTab === "testimonials" ? (
        <TestimonialsManagerStudio />
      ) : cmsTab === "guides" ? (
        <GuideManagerStudio />
      ) : (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-border/60 shadow-xs bg-muted/10">
              <div className="text-xs font-medium text-muted-foreground">Total CMS Pages</div>
              <div className="text-2xl font-bold mt-1 text-foreground">{totalCount}</div>
            </Card>
            <Card className="p-4 border-border/60 shadow-xs bg-muted/10">
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live Published</div>
              <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{publishedCount}</div>
            </Card>
            <Card className="p-4 border-border/60 shadow-xs bg-muted/10">
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Draft Pages</div>
              <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{draftCount}</div>
            </Card>
            <Card className="p-4 border-border/60 shadow-xs bg-muted/10">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Core System Pages</div>
              <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{coreCount}</div>
            </Card>
          </div>

          {/* Filtering and Search Controls */}
          <Card className="p-4 border-border/60 shadow-xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search pages by title, slug, or ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Selector */}
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => {
                    setSelectedCategory(val as PageCategory);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Selector */}
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val as any);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="published" className="text-xs">Live (Published)</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft Only</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-md p-0.5 bg-muted/40">
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => setViewMode("table")}
                    title="Table View"
                  >
                    <List className="size-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => setViewMode("grid")}
                    title="Grid View"
                  >
                    <Grid className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Page Listing Section */}
          {isLoading ? (
            <div className="min-h-[350px] grid place-items-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading authoritative CMS pages...</p>
              </div>
            </div>
          ) : isError ? (
            <Card className="p-12 text-center border-destructive/30 bg-destructive/5">
              <AlertTriangle className="size-8 text-destructive mx-auto mb-3" />
              <h3 className="text-base font-semibold text-destructive">Failed to Load CMS Pages</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {(error as any)?.message || "A server or network error occurred while querying CMS pages."}
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-4 gap-2">
                <RefreshCw className="size-3.5" /> Retry Loading
              </Button>
            </Card>
          ) : filteredPages.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <p className="text-sm font-medium">No CMS pages found.</p>
              <p className="text-xs mt-1">Try adjusting your search terms or filters.</p>
            </Card>
          ) : viewMode === "table" ? (
            <Card className="border border-border/60 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 font-semibold border-b border-border/60 text-[11px] text-muted-foreground uppercase">
                    <tr>
                      <th className="p-3 pl-4">Page Title & Type</th>
                      <th className="p-3">Persistent ID</th>
                      <th className="p-3">Slug & Public URL</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Last Updated</th>
                      <th className="p-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {paginatedPages.map((page) => {
                      const category = getCategoryForSlug(page.slug);
                      const publicUrl = getPublicUrlForPage(page.slug);
                      const isProtected = PROTECTED_SYSTEM_SLUGS.has(page.slug);
                      const isCopied = copiedId === page.id;

                      return (
                        <tr key={page.id} className="hover:bg-muted/20 transition-colors">
                          {/* Title & Type */}
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-foreground text-xs">{page.title}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              {page.content?.template && (
                                <span className="font-mono bg-muted/60 px-1 py-0.2 rounded text-[10px]">
                                  template: {page.content.template}
                                </span>
                              )}
                              {page.content?.html && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-400 text-blue-600">
                                  HTML
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Persistent ID */}
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                              <span title={page.id} className="truncate max-w-[120px]">
                                {page.id}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-5 hover:bg-muted"
                                onClick={() => handleCopyId(page.id)}
                                title="Copy Persistent ID"
                              >
                                {isCopied ? (
                                  <Check className="size-3 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </Button>
                            </div>
                          </td>

                          {/* Slug & Public URL */}
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-foreground font-medium">/{page.slug}</span>
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                title="Open Public URL"
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-3">
                            <Badge variant="secondary" className="capitalize text-[10px] py-0">
                              {category}
                            </Badge>
                          </td>

                          {/* Status & Quick Toggle */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-2">
                              <Badge
                                variant={page.published ? "default" : "outline"}
                                className={`text-[9px] uppercase tracking-wider ${
                                  page.published
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {page.published ? "Live" : "Draft"}
                              </Badge>
                              <Switch
                                checked={page.published}
                                onCheckedChange={(checked) =>
                                  togglePublishMutation.mutate({ id: page.id, published: checked })
                                }
                                disabled={togglePublishMutation.isPending}
                                className="scale-75"
                                title={page.published ? "Click to unpublish" : "Click to publish"}
                              />
                            </div>
                          </td>

                          {/* Last Updated */}
                          <td className="p-3 text-[11px] text-muted-foreground">
                            {page.updated_at
                              ? new Date(page.updated_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>

                          {/* Actions */}
                          <td className="p-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs gap-1 shadow-xs"
                                onClick={() => router.push(`/super/cms/${page.id}/edit`)}
                                title="Open Dedicated Page Editor"
                              >
                                <Edit className="size-3 text-primary" /> Edit
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                asChild
                                title="Preview Page"
                              >
                                <a href={publicUrl} target="_blank" rel="noreferrer">
                                  <Eye className="size-3.5" />
                                </a>
                              </Button>
                              {!isProtected && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                  onClick={() => setDeletingPage(page)}
                                  title="Delete Page"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
                  <div>
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredPages.length)} of {filteredPages.length} pages
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-[11px] px-2 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedPages.map((page) => {
                const category = getCategoryForSlug(page.slug);
                const publicUrl = getPublicUrlForPage(page.slug);
                const isProtected = PROTECTED_SYSTEM_SLUGS.has(page.slug);

                return (
                  <Card key={page.id} className="p-4 border-border/60 shadow-xs flex flex-col justify-between hover:border-primary/50 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="secondary" className="capitalize text-[10px] py-0">
                          {category}
                        </Badge>
                        <Badge
                          variant={page.published ? "default" : "outline"}
                          className={`text-[9px] uppercase tracking-wider ${
                            page.published
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "text-muted-foreground"
                          }`}
                        >
                          {page.published ? "Live" : "Draft"}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-sm text-foreground mt-2 line-clamp-1">
                        {page.title}
                      </h3>

                      <div className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                        /{page.slug}
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground mt-2 bg-muted/40 p-1 rounded">
                        <span className="truncate flex-1">ID: {page.id}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-4"
                          onClick={() => handleCopyId(page.id)}
                          title="Copy ID"
                        >
                          <Copy className="size-2.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 mt-4">
                      <div className="text-[10px] text-muted-foreground">
                        {page.updated_at
                          ? new Date(page.updated_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs gap-1 shadow-xs"
                          onClick={() => router.push(`/super/cms/${page.id}/edit`)}
                        >
                          <Edit className="size-3 text-primary" /> Edit
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" asChild>
                          <a href={publicUrl} target="_blank" rel="noreferrer">
                            <Eye className="size-3.5" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Delete Page Confirmation Dialog */}
          <Dialog open={!!deletingPage} onOpenChange={(open) => !open && setDeletingPage(null)}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="size-5" /> Delete CMS Page?
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete <strong>"{deletingPage?.title}"</strong> (
                  <code>/{deletingPage?.slug}</code>)? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="mt-4">
                <Button variant="outline" size="sm" onClick={() => setDeletingPage(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deletingPage && deleteMutation.mutate(deletingPage.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Permanently Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

// ==========================================
// P10: FAQ MANAGEMENT STUDIO COMPONENT
// ==========================================
function FaqManagerStudio() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<any | null>(null);
  const [form, setForm] = useState({
    question: "",
    answer: "",
    category: "General",
    isActive: true,
  });

  const { data: faqs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["super-cms-faqs"],
    queryFn: async () => {
      const res = await api.get("/cms/faqs");
      return Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingFaq) {
        const res = await api.put(`/cms/faqs/${editingFaq.id}`, form);
        return res.data;
      } else {
        const res = await api.post("/cms/faqs", form);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingFaq ? "FAQ updated successfully!" : "FAQ created successfully!");
      setIsModalOpen(false);
      setEditingFaq(null);
      setForm({ question: "", answer: "", category: "General", isActive: true });
      qc.invalidateQueries({ queryKey: ["super-cms-faqs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to save FAQ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cms/faqs/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("FAQ deleted successfully");
      setDeletingFaq(null);
      qc.invalidateQueries({ queryKey: ["super-cms-faqs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to delete FAQ");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await api.patch("/cms/faqs/reorder", { orderedIds });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-cms-faqs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to reorder FAQs");
    },
  });

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= faqs.length) return;
    const items = [...faqs];
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);
    reorderMutation.mutate(items.map((i: any) => i.id));
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return faqs.filter(
      (f: any) =>
        !q ||
        (f.question || "").toLowerCase().includes(q) ||
        (f.answer || "").toLowerCase().includes(q) ||
        (f.category || "").toLowerCase().includes(q)
    );
  }, [faqs, search]);

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <Card className="p-4 border-border/60 shadow-xs bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1 text-xs">
              <HelpCircle className="size-3.5 text-primary" /> {faqs.length} Total FAQs
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2.5 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search FAQs by question or answer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingFaq(null);
                setForm({ question: "", answer: "", category: "General", isActive: true });
                setIsModalOpen(true);
              }}
              className="h-8 text-xs gap-1.5 shadow-xs"
            >
              <Plus className="size-3.5" /> Add FAQ
            </Button>
          </div>
        </div>
      </Card>

      {/* FAQs Table */}
      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border border-border/60 shadow-xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 font-semibold border-b border-border/60 text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="p-3 pl-4 w-12 text-center">#</th>
                <th className="p-3">Question & Answer</th>
                <th className="p-3 w-40">Category</th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-28 text-center">Order</th>
                <th className="p-3 pr-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    No FAQs found. Click "Add FAQ" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((item: any, idx: number) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 pl-4 text-center font-mono text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-foreground text-xs">{item.question}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {item.answer}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {item.category || "General"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={item.isActive !== false ? "default" : "outline"}
                        className={`text-[9px] uppercase tracking-wider ${
                          item.isActive !== false
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.isActive !== false ? "Live" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={idx === 0 || reorderMutation.isPending}
                          onClick={() => handleMove(idx, "up")}
                          title="Move Up"
                        >
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={idx === filtered.length - 1 || reorderMutation.isPending}
                          onClick={() => handleMove(idx, "down")}
                          title="Move Down"
                        >
                          <ArrowDown className="size-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setEditingFaq(item);
                            setForm({
                              question: item.question,
                              answer: item.answer,
                              category: item.category || "General",
                              isActive: item.isActive !== false,
                            });
                            setIsModalOpen(true);
                          }}
                          title="Edit FAQ"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          onClick={() => setDeletingFaq(item)}
                          title="Delete FAQ"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Add / Edit FAQ Dialog ─── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="size-5 text-primary" />
              {editingFaq ? "Edit FAQ" : "Add New FAQ"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage public-facing frequently asked questions displayed on the landing page and help center.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Input
                value={form.question}
                onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                placeholder="e.g. How does biometric sync work?"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Answer</Label>
              <Textarea
                rows={4}
                value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                placeholder="Detailed answer explanation..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="Billing & Plans / Features / General"
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label className="text-xs font-semibold">Active & Visible</Label>
                <p className="text-[11px] text-muted-foreground">Show this FAQ publicly on the landing page</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saveMutation.isPending || !form.question.trim() || !form.answer.trim()}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              {editingFaq ? "Update FAQ" : "Create FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete FAQ Dialog ─── */}
      <Dialog open={!!deletingFaq} onOpenChange={(open) => !open && setDeletingFaq(null)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="size-5" /> Delete FAQ?
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Are you sure you want to permanently delete FAQ:{" "}
            <strong className="text-foreground">"{deletingFaq?.question}"</strong>?
          </p>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setDeletingFaq(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingFaq.id)}
            >
              {deleteMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Delete FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// P11: TESTIMONIAL MANAGEMENT STUDIO COMPONENT
// ==========================================
function TestimonialsManagerStudio() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    role: "",
    company: "",
    rating: 5,
    content: "",
    avatar: "/avatars/avatar-1.png",
    isActive: true,
  });

  const { data: testimonials = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["super-cms-testimonials"],
    queryFn: async () => {
      const res = await api.get("/cms/testimonials");
      return Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingItem) {
        const res = await api.put(`/cms/testimonials/${editingItem.id}`, form);
        return res.data;
      } else {
        const res = await api.post("/cms/testimonials", form);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? "Testimonial updated successfully!" : "Testimonial created successfully!");
      setIsModalOpen(false);
      setEditingItem(null);
      setForm({ name: "", role: "", company: "", rating: 5, content: "", avatar: "/avatars/avatar-1.png", isActive: true });
      qc.invalidateQueries({ queryKey: ["super-cms-testimonials"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to save testimonial");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cms/testimonials/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Testimonial deleted successfully");
      setDeletingItem(null);
      qc.invalidateQueries({ queryKey: ["super-cms-testimonials"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to delete testimonial");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await api.patch("/cms/testimonials/reorder", { orderedIds });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-cms-testimonials"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to reorder testimonials");
    },
  });

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= testimonials.length) return;
    const items = [...testimonials];
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);
    reorderMutation.mutate(items.map((i: any) => i.id));
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return testimonials.filter(
      (t: any) =>
        !q ||
        (t.name || "").toLowerCase().includes(q) ||
        (t.role || "").toLowerCase().includes(q) ||
        (t.company || "").toLowerCase().includes(q) ||
        (t.content || "").toLowerCase().includes(q)
    );
  }, [testimonials, search]);

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <Card className="p-4 border-border/60 shadow-xs bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Award className="size-3.5 text-primary" /> {testimonials.length} Customer Testimonials
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2.5 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search testimonials by customer or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setForm({ name: "", role: "", company: "", rating: 5, content: "", avatar: "/avatars/avatar-1.png", isActive: true });
                setIsModalOpen(true);
              }}
              className="h-8 text-xs gap-1.5 shadow-xs"
            >
              <Plus className="size-3.5" /> Add Review
            </Button>
          </div>
        </div>
      </Card>

      {/* Testimonials Table */}
      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border border-border/60 shadow-xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 font-semibold border-b border-border/60 text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="p-3 pl-4 w-12 text-center">#</th>
                <th className="p-3 w-56">Customer</th>
                <th className="p-3 w-28">Rating</th>
                <th className="p-3">Review Content</th>
                <th className="p-3 w-24 text-center">Status</th>
                <th className="p-3 w-28 text-center">Order</th>
                <th className="p-3 pr-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    No testimonials found. Click "Add Review" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((item: any, idx: number) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 pl-4 text-center font-mono text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-foreground text-xs">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.role} {item.company ? `· ${item.company}` : ""}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`size-3 ${
                              star <= (item.rating || 5)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-muted-foreground italic line-clamp-2">
                        "{item.content}"
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={item.isActive !== false ? "default" : "outline"}
                        className={`text-[9px] uppercase tracking-wider ${
                          item.isActive !== false
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.isActive !== false ? "Live" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={idx === 0 || reorderMutation.isPending}
                          onClick={() => handleMove(idx, "up")}
                          title="Move Up"
                        >
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={idx === filtered.length - 1 || reorderMutation.isPending}
                          onClick={() => handleMove(idx, "down")}
                          title="Move Down"
                        >
                          <ArrowDown className="size-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setEditingItem(item);
                            setForm({
                              name: item.name,
                              role: item.role || "",
                              company: item.company || "",
                              rating: item.rating || 5,
                              content: item.content,
                              avatar: item.avatar || "/avatars/avatar-1.png",
                              isActive: item.isActive !== false,
                            });
                            setIsModalOpen(true);
                          }}
                          title="Edit Review"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          onClick={() => setDeletingItem(item)}
                          title="Delete Review"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Add / Edit Testimonial Dialog ─── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Award className="size-5 text-primary" />
              {editingItem ? "Edit Customer Review" : "Add Customer Review"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage verified customer testimonials showcased on public marketing pages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label>Customer Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sarah Jenkins"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role / Title</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  placeholder="Head of People"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  placeholder="FinTech Global"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Star Rating</Label>
              <Select
                value={String(form.rating)}
                onValueChange={(val) => setForm((p) => ({ ...p, rating: parseInt(val, 10) }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">★★★★★ (5 Stars - Exceptional)</SelectItem>
                  <SelectItem value="4">★★★★☆ (4 Stars - Great)</SelectItem>
                  <SelectItem value="3">★★★☆☆ (3 Stars - Average)</SelectItem>
                  <SelectItem value="2">★★☆☆☆ (2 Stars - Fair)</SelectItem>
                  <SelectItem value="1">★☆☆☆☆ (1 Star - Poor)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Review Text</Label>
              <Textarea
                rows={3}
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Customer review quotes and results..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label className="text-xs font-semibold">Active & Visible</Label>
                <p className="text-[11px] text-muted-foreground">Show this testimonial on the landing page</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saveMutation.isPending || !form.name.trim() || !form.content.trim()}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              {editingItem ? "Update Review" : "Create Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Testimonial Dialog ─── */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="size-5" /> Delete Review?
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Are you sure you want to permanently delete the review by{" "}
            <strong className="text-foreground">"{deletingItem?.name}"</strong>?
          </p>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setDeletingItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingItem.id)}
            >
              {deleteMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Delete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CmsStudio;
