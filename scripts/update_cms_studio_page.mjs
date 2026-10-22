import fs from 'fs';
import path from 'path';

const filePath = path.resolve('CMS/src/app/super/cms/page.tsx');
const originalContent = fs.readFileSync(filePath, 'utf-8');

const splitMarker = 'function FaqManagerStudio()';
const splitIndex = originalContent.indexOf(splitMarker);

if (splitIndex === -1) {
  console.error('Split marker not found!');
  process.exit(1);
}

const tailContent = originalContent.slice(splitIndex);

const newHeaderAndStudio = `'use client';

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
  if (slug.startsWith("legal-")) return \`/legal/\${slug.replace("legal-", "")}\`;
  if (slug.startsWith("blog-")) return \`/p/\${slug}\`;
  if (slug.startsWith("case-study-")) return \`/p/\${slug}\`;
  return \`/p/\${slug}\`;
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
      await api.put(\`/cms/pages/by-id/\${id}\`, { published });
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
      await api.delete(\`/cms/pages/by-id/\${id}\`);
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
            <RefreshCw className={\`size-3.5 \${isRefetching ? "animate-spin" : ""}\`} /> Refresh
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
                                className={\`text-[9px] uppercase tracking-wider \${
                                  page.published
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "text-muted-foreground"
                                }\`}
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
                                onClick={() => router.push(\`/super/cms/\${page.id}/edit\`)}
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
                          className={\`text-[9px] uppercase tracking-wider \${
                            page.published
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "text-muted-foreground"
                          }\`}
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
                          onClick={() => router.push(\`/super/cms/\${page.id}/edit\`)}
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
`;

const finalContent = newHeaderAndStudio + tailContent;
fs.writeFileSync(filePath, finalContent, 'utf-8');
console.log('Successfully updated CMS/src/app/super/cms/page.tsx! New length:', finalContent.length);
