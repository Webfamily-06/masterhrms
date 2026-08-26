import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  Save,
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
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Globe,
  Palette,
  AlignLeft,
  Grid,
  Table as TableIcon,
  Folder,
  ArrowRight,
  Info,
  BookOpen,
  Newspaper,
  Store,
  UserCheck,
  TrendingUp,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/cms")({
  component: CmsStudio,
  head: () => ({ meta: [{ title: "CMS Content Studio — Master ERP Super Admin" }] }),
});

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

function CmsStudio() {
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<PageCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function getCategoryForSlug(slug: string): PageCategory {
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
    if (["home", "benefits", "compare", "pricing", "about", "contact"].includes(slug))
      return "core";
    return "custom";
  }

  // Fetch CMS Pages from MySQL API
  const {
    data: pages = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["cms-pages"],
    queryFn: async () => {
      try {
        const list = await api.get("/cms/pages");
        return Array.isArray(list) ? (list as CmsPage[]) : [];
      } catch {
        return [];
      }
    },
  });

  const filteredPages = useMemo(() => {
    if (!pages) return [];
    return pages.filter((p) => {
      const catMatch =
        selectedCategory === "all" || getCategoryForSlug(p.slug) === selectedCategory;
      const searchMatch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [pages, selectedCategory, searchQuery]);

  const selectedPage = pages?.find((p) => p.id === selectedId) ?? filteredPages[0] ?? pages?.[0];

  useEffect(() => {
    if (!selectedId && pages && pages.length > 0) {
      setSelectedId(pages[0].id);
    }
  }, [pages, selectedId]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">CMS Content Studio & Page Manager</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="size-3 text-primary" /> Visual & JSON Editor
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Edit marketing pages, Blogs, Case Studies, ERP Solutions, Legal Docs, and Footer
            settings with real-time sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh Studio
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="size-4" /> Create New Page
          </Button>
        </div>
      </div>

      {/* Main Studio Grid */}
      {isLoading ? (
        <div className="min-h-[400px] grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading CMS pages, blogs, and templates...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* Left Sidebar: Filters & Page Selection */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-3 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages or blogs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Category Pills */}
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-1.5 pb-1">
                  {CATEGORIES.map((cat) => {
                    const count =
                      cat.id === "all"
                        ? (pages?.length ?? 0)
                        : (pages?.filter((p) => getCategoryForSlug(p.slug) === cat.id).length ?? 0);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          selectedCategory === cat.id
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-secondary/60 hover:bg-secondary text-muted-foreground"
                        }`}
                      >
                        <cat.icon className="size-3" />
                        <span>{cat.label}</span>
                        <span className="opacity-70 font-mono text-[10px]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardHeader>

            <CardContent className="p-2">
              <ScrollArea className="h-[600px] pr-2">
                <div className="space-y-1 pr-2">
                  {filteredPages.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No pages matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredPages.map((p) => {
                      const isSelected = selectedPage?.id === p.id;
                      const category = getCategoryForSlug(p.slug);
                      const getPublicUrl = (slug: string) => {
                        if (slug === "home") return "/";
                        if (slug.startsWith("legal-"))
                          return `/legal/${slug.replace("legal-", "")}`;
                        if (slug.startsWith("blog-")) return `/p/${slug}`;
                        if (slug.startsWith("case-study-")) return `/p/${slug}`;
                        return `/p/${slug}`;
                      };

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedId(p.id)}
                          className={`group relative p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "bg-primary/5 border-primary shadow-xs"
                              : "border-transparent hover:bg-secondary/60 hover:border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-xs leading-tight line-clamp-1 text-foreground">
                              {p.title}
                            </div>
                            <Badge
                              variant={p.published ? "default" : "outline"}
                              className={`text-[9px] px-1.5 py-0 shrink-0 uppercase tracking-wider ${
                                p.published
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {p.published ? "Live" : "Draft"}
                            </Badge>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                            <span className="truncate">{getPublicUrl(p.slug)}</span>
                            <Badge variant="secondary" className="text-[9px] py-0 capitalize">
                              {category}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Editor & Preview Pane */}
          {selectedPage ? (
            <PageEditorForm
              key={selectedPage.id}
              page={selectedPage}
              onSaved={() => qc.invalidateQueries({ queryKey: ["cms-pages"] })}
              onDelete={() => setIsDeleteOpen(true)}
            />
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              Select a page or blog from the left sidebar to start editing.
            </Card>
          )}
        </div>
      )}

      {/* Create New Page Dialog */}
      <CreatePageDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(newPageId) => {
          qc.invalidateQueries({ queryKey: ["cms-pages"] });
          setSelectedId(newPageId);
        }}
      />

      {/* Delete Page Dialog */}
      {selectedPage && (
        <DeletePageDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          page={selectedPage}
          onDeleted={() => {
            qc.invalidateQueries({ queryKey: ["cms-pages"] });
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}

function PageEditorForm({
  page,
  onSaved,
  onDelete,
}: {
  page: CmsPage;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [meta, setMeta] = useState(page.meta_description ?? "");
  const [published, setPublished] = useState(page.published);
  const [activeTab, setActiveTab] = useState<"visual" | "preview" | "json">("visual");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Content JSON state
  const [content, setContent] = useState<Record<string, any>>(page.content ?? {});
  const [jsonText, setJsonText] = useState(JSON.stringify(page.content ?? {}, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sync content state when switching tabs
  useEffect(() => {
    setTitle(page.title);
    setSlug(page.slug);
    setMeta(page.meta_description ?? "");
    setPublished(page.published);
    setContent(page.content ?? {});
    setJsonText(JSON.stringify(page.content ?? {}, null, 2));
    setJsonError(null);
  }, [page]);

  const updateContentField = (field: string, value: any) => {
    const updated = { ...content, [field]: value };
    setContent(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setContent(parsed);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON syntax");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalContent = content;
      if (activeTab === "json") {
        try {
          finalContent = JSON.parse(jsonText);
        } catch {
          throw new Error("Cannot save: Invalid JSON string");
        }
      }

      await api.put(`/cms/pages/${slug}`, {
        title,
        meta_description: meta,
        content: finalContent,
        published,
      });
    },
    onSuccess: () => {
      toast.success(`Saved changes for "${title}"`);
      onSaved();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const publicUrl = useMemo(() => {
    if (slug === "home") return "/";
    if (slug.startsWith("legal-")) return `/legal/${slug.replace("legal-", "")}`;
    return `/p/${slug}`;
  }, [slug]);

  const isProtectedCorePage = ["home", "footer", "compare", "benefits"].includes(page.slug);

  return (
    <Card className="shadow-sm border">
      {/* Editor Header Bar */}
      <CardHeader className="p-5 border-b bg-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{title || "Untitled Page"}</h2>
              <Badge variant="outline" className="font-mono text-[11px] bg-secondary/50">
                {slug}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Public Route:</span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-1 font-mono"
              >
                {publicUrl} <ExternalLink className="size-3" />
              </a>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border px-3 py-1.5 rounded-lg bg-background text-xs">
              <Switch checked={published} onCheckedChange={setPublished} id="published-toggle" />
              <Label htmlFor="published-toggle" className="cursor-pointer font-medium text-xs">
                {published ? "Published (Live)" : "Draft (Hidden)"}
              </Label>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !!jsonError}
              className="gap-2 min-w-[120px]"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Page
            </Button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-t pt-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <div className="flex items-center justify-between w-full">
              <TabsList className="grid grid-cols-3 w-[360px]">
                <TabsTrigger value="visual" className="gap-2 text-xs">
                  <LayoutTemplate className="size-3.5" /> Visual Editor
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2 text-xs">
                  <Eye className="size-3.5" /> Live Preview
                </TabsTrigger>
                <TabsTrigger value="json" className="gap-2 text-xs">
                  <Code className="size-3.5" /> Raw JSON
                </TabsTrigger>
              </TabsList>

              {/* Viewport switch in Preview Mode */}
              {activeTab === "preview" && (
                <div className="flex items-center gap-1 border p-1 rounded-lg bg-background">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1 rounded text-xs ${
                      previewDevice === "desktop"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-muted-foreground"
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor className="size-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("tablet")}
                    className={`p-1 rounded text-xs ${
                      previewDevice === "tablet"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-muted-foreground"
                    }`}
                    title="Tablet Preview (768px)"
                  >
                    <Tablet className="size-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1 rounded text-xs ${
                      previewDevice === "mobile"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-muted-foreground"
                    }`}
                    title="Mobile Preview (375px)"
                  >
                    <Smartphone className="size-4" />
                  </button>
                </div>
              )}

              {!isProtectedCorePage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-destructive hover:bg-destructive/10 gap-1.5 text-xs ml-auto"
                >
                  <Trash2 className="size-3.5" /> Delete Page
                </Button>
              )}
            </div>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* TAB 1: VISUAL SECTION EDITOR */}
        {activeTab === "visual" && (
          <div className="space-y-8">
            {/* Meta & Basic Info Card */}
            <div className="p-4 rounded-xl border bg-secondary/10 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-foreground">
                <Sliders className="size-4 text-primary" /> Page Settings & SEO Meta
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Page Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. ERP AI Transformation"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">URL Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={isProtectedCorePage}
                    placeholder="e.g. blog-ai-payroll"
                  />
                  {isProtectedCorePage && (
                    <p className="text-[11px] text-muted-foreground">System page slug is locked.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Meta Description (SEO)</Label>
                <Textarea
                  value={meta}
                  onChange={(e) => setMeta(e.target.value)}
                  rows={2}
                  placeholder="Summary for search engine preview snippets..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* SPECIALIZED FOOTER EDITOR IF SLUG IS 'FOOTER' */}
            {slug === "footer" ? (
              <FooterSectionEditor content={content} updateContentField={updateContentField} />
            ) : (
              <>
                {/* HERO SECTION EDITOR */}
                <HeroSectionEditor content={content} updateContentField={updateContentField} />

                {/* BLOG / CASE STUDY SPECIFIC METADATA EDITOR */}
                {(slug.includes("blog") || slug.includes("case-study")) && (
                  <BlogCaseStudyEditor content={content} updateContentField={updateContentField} />
                )}

                {/* BODY CONTENT EDITOR */}
                <BodySectionEditor content={content} updateContentField={updateContentField} />

                {/* SECTIONS & CARDS GRID EDITOR */}
                <CardsSectionEditor content={content} updateContentField={updateContentField} />

                {/* VENDORS COMPARISON TABLE EDITOR */}
                {(slug === "compare" || content.vendors) && (
                  <VendorSectionEditor content={content} updateContentField={updateContentField} />
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: LIVE INTERACTIVE PREVIEW */}
        {activeTab === "preview" && (
          <div className="bg-secondary/30 p-6 rounded-xl border min-h-[500px] flex justify-center items-start overflow-x-auto">
            <div
              className={`bg-background border rounded-2xl shadow-xl transition-all duration-300 overflow-hidden ${
                previewDevice === "desktop"
                  ? "w-full max-w-5xl"
                  : previewDevice === "tablet"
                    ? "w-[768px]"
                    : "w-[375px]"
              }`}
            >
              {/* Fake Browser Window Header */}
              <div className="bg-secondary/60 border-b px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-red-400" />
                  <div className="size-2.5 rounded-full bg-amber-400" />
                  <div className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 bg-background px-3 py-1 rounded text-center font-mono text-[11px] truncate mx-4 border">
                  https://masterhrms.com{publicUrl}
                </div>
              </div>

              {/* Rendered Live Component Preview */}
              <div className="p-6 md:p-10 space-y-10">
                {slug === "footer" ? (
                  <FooterPreview f={content} />
                ) : (
                  <>
                    {/* Hero Preview */}
                    {content.hero && (
                      <div className="text-center max-w-3xl mx-auto space-y-4 py-6">
                        {content.hero.eyebrow && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold bg-primary/10 text-primary">
                            <Sparkles className="size-3" /> {content.hero.eyebrow}
                          </span>
                        )}
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                          {content.hero.title || title}
                        </h1>
                        {content.hero.subtitle && (
                          <p className="text-base text-muted-foreground leading-relaxed">
                            {content.hero.subtitle}
                          </p>
                        )}
                        <div className="flex justify-center gap-3 pt-2">
                          <Button size="sm">
                            {content.hero.primary_cta_text || "Get Started"}
                          </Button>
                          <Button size="sm" variant="outline">
                            {content.hero.secondary_cta_text || "Learn More"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Blog & Case Study Meta Bar Preview */}
                    {(content.author || content.client || content.impact) && (
                      <div className="max-w-3xl mx-auto p-4 rounded-xl bg-secondary/30 border flex flex-wrap items-center justify-between text-xs gap-4 font-mono">
                        {content.author && (
                          <div>
                            ✍️ Author: <strong className="text-foreground">{content.author}</strong>
                          </div>
                        )}
                        {content.client && (
                          <div>
                            🏢 Client: <strong className="text-foreground">{content.client}</strong>
                          </div>
                        )}
                        {content.impact && (
                          <div className="text-emerald-600 font-bold">{content.impact}</div>
                        )}
                      </div>
                    )}

                    {/* Body Text Preview */}
                    {content.body && (
                      <div className="max-w-3xl mx-auto border-t pt-6">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                          {content.body}
                        </p>
                      </div>
                    )}

                    {/* Cards Grid Preview */}
                    {content.sections && content.sections.length > 0 && (
                      <div className="space-y-4 border-t pt-6">
                        <h3 className="font-bold text-lg text-center">
                          Feature & Content Highlights
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {content.sections.map((s: any, idx: number) => (
                            <div key={idx} className="p-5 rounded-xl border bg-card space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">
                                  {s.title || "Untitled Card"}
                                </h4>
                                {s.badge && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {s.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {s.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vendors Table Preview */}
                    {content.vendors && content.vendors.length > 0 && (
                      <div className="space-y-4 border-t pt-6">
                        <h3 className="font-bold text-lg">Vendor Comparison</h3>
                        <div className="border rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-secondary/60 font-semibold border-b">
                              <tr>
                                <th className="p-3">Vendor Name</th>
                                <th className="p-3">Notes / Features</th>
                                <th className="p-3">Recommendation</th>
                              </tr>
                            </thead>
                            <tbody>
                              {content.vendors.map((v: any, idx: number) => (
                                <tr key={idx} className="border-b last:border-0">
                                  <td className="p-3 font-semibold">{v.name}</td>
                                  <td className="p-3 text-muted-foreground">{v.notes}</td>
                                  <td className="p-3">
                                    {v.us ? (
                                      <Badge className="bg-emerald-600 text-white">
                                        ✓ Our Platform
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RAW JSON CODE EDITOR */}
        {activeTab === "json" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono font-semibold">
                Raw Page Content Object (JSON)
              </Label>
              {jsonError ? (
                <Badge variant="destructive" className="text-[10px] font-mono">
                  Syntax Error
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono text-emerald-600 border-emerald-500/30"
                >
                  Valid JSON Syntax
                </Badge>
              )}
            </div>

            <Textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={22}
              className="font-mono text-xs leading-relaxed border bg-slate-950 text-emerald-400 p-4 rounded-xl shadow-inner"
            />
            {jsonError && (
              <p className="text-xs text-destructive font-mono font-semibold">{jsonError}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* Sub-components for Visual Section Editors */
function HeroSectionEditor({
  content,
  updateContentField,
}: {
  content: Record<string, any>;
  updateContentField: (f: string, v: any) => void;
}) {
  const hero = content.hero || {};
  const updateHero = (key: string, val: string) => {
    updateContentField("hero", { ...hero, [key]: val });
  };

  return (
    <div className="p-4 rounded-xl border bg-card space-y-4 shadow-xs">
      <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
        <Sparkles className="size-4 text-primary" /> Hero Header Section
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Eyebrow Tagline</Label>
          <Input
            value={hero.eyebrow || ""}
            onChange={(e) => updateHero("eyebrow", e.target.value)}
            placeholder="e.g. Next-Gen Cloud ERP"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Hero Main Headline</Label>
          <Input
            value={hero.title || ""}
            onChange={(e) => updateHero("title", e.target.value)}
            placeholder="e.g. Financials & Global Payroll"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Hero Subtitle Paragraph</Label>
        <Textarea
          value={hero.subtitle || ""}
          onChange={(e) => updateHero("subtitle", e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>
    </div>
  );
}

function BlogCaseStudyEditor({
  content,
  updateContentField,
}: {
  content: Record<string, any>;
  updateContentField: (f: string, v: any) => void;
}) {
  return (
    <div className="p-4 rounded-xl border bg-card space-y-4 shadow-xs">
      <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
        <BookOpen className="size-4 text-primary" /> Blog / Case Study Metadata
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Author / Editorial Team</Label>
          <Input
            value={content.author || ""}
            onChange={(e) => updateContentField("author", e.target.value)}
            placeholder="e.g. Master ERP Editorial"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Client Name (Case Study)</Label>
          <Input
            value={content.client || ""}
            onChange={(e) => updateContentField("client", e.target.value)}
            placeholder="e.g. Apex Manufacturing Group"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Key Metric Impact</Label>
          <Input
            value={content.impact || ""}
            onChange={(e) => updateContentField("impact", e.target.value)}
            placeholder="e.g. ↑ 42% ROI Improvement"
          />
        </div>
      </div>
    </div>
  );
}

function BodySectionEditor({
  content,
  updateContentField,
}: {
  content: Record<string, any>;
  updateContentField: (f: string, v: any) => void;
}) {
  return (
    <div className="p-4 rounded-xl border bg-card space-y-3 shadow-xs">
      <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
        <AlignLeft className="size-4 text-primary" /> Main Article Body Content
      </div>
      <Textarea
        value={content.body || ""}
        onChange={(e) => updateContentField("body", e.target.value)}
        rows={6}
        placeholder="Enter main paragraph body text for this article or page..."
        className="text-xs leading-relaxed font-sans"
      />
    </div>
  );
}

function CardsSectionEditor({
  content,
  updateContentField,
}: {
  content: Record<string, any>;
  updateContentField: (f: string, v: any) => void;
}) {
  const sections: any[] = content.sections || [];

  const updateSection = (index: number, key: string, val: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [key]: val };
    updateContentField("sections", updated);
  };

  const addSection = () => {
    updateContentField("sections", [
      ...sections,
      { title: "New Section Card", body: "Card details and feature points.", badge: "Feature" },
    ]);
  };

  const removeSection = (index: number) => {
    const updated = sections.filter((_, i) => i !== index);
    updateContentField("sections", updated);
  };

  return (
    <div className="p-4 rounded-xl border bg-card space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Grid className="size-4 text-primary" /> Highlight Section Cards ({sections.length})
        </div>
        <Button size="sm" variant="outline" onClick={addSection} className="gap-1.5 text-xs">
          <Plus className="size-3.5" /> Add Section Card
        </Button>
      </div>

      <div className="space-y-3">
        {sections.map((s, idx) => (
          <div key={idx} className="p-3.5 rounded-lg border bg-secondary/20 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={s.title || ""}
                  onChange={(e) => updateSection(idx, "title", e.target.value)}
                  placeholder="Card Title"
                  className="text-xs font-semibold"
                />
                <Input
                  value={s.badge || ""}
                  onChange={(e) => updateSection(idx, "badge", e.target.value)}
                  placeholder="Badge"
                  className="text-xs w-28"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeSection(idx)}
                className="text-destructive shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea
              value={s.body || ""}
              onChange={(e) => updateSection(idx, "body", e.target.value)}
              rows={2}
              placeholder="Card body text..."
              className="text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function VendorSectionEditor({
  content,
  updateContentField,
}: {
  content: Record<string, any>;
  updateContentField: (f: string, v: any) => void;
}) {
  const vendors: any[] = content.vendors || [];

  const updateVendor = (index: number, key: string, val: any) => {
    const updated = [...vendors];
    updated[index] = { ...updated[index], [key]: val };
    updateContentField("vendors", updated);
  };

  const addVendor = () => {
    updateContentField("vendors", [
      ...vendors,
      { name: "Competitor ERP X", notes: "Legacy monolith system", us: false },
    ]);
  };

  const removeVendor = (index: number) => {
    const updated = vendors.filter((_, i) => i !== index);
    updateContentField("vendors", updated);
  };

  return (
    <div className="p-4 rounded-xl border bg-card space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <TableIcon className="size-4 text-primary" /> Vendor Comparison Table ({vendors.length})
        </div>
        <Button size="sm" variant="outline" onClick={addVendor} className="gap-1.5 text-xs">
          <Plus className="size-3.5" /> Add Vendor
        </Button>
      </div>

      <div className="space-y-3">
        {vendors.map((v, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-lg border bg-secondary/20 flex items-center justify-between gap-3"
          >
            <Input
              value={v.name || ""}
              onChange={(e) => updateVendor(idx, "name", e.target.value)}
              placeholder="Vendor Name"
              className="text-xs font-semibold w-40"
            />
            <Input
              value={v.notes || ""}
              onChange={(e) => updateVendor(idx, "notes", e.target.value)}
              placeholder="Notes & Feature Matrix"
              className="text-xs flex-1"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <Switch checked={!!v.us} onCheckedChange={(val) => updateVendor(idx, "us", val)} />
              <span className="text-xs font-medium">Our Platform</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeVendor(idx)}
              className="text-destructive shrink-0"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterSectionEditor({
  content,
  updateContentField,
}: {
  content: Record<string, any>;
  updateContentField: (f: string, v: any) => void;
}) {
  return (
    <div className="p-4 rounded-xl border bg-card space-y-4 shadow-xs">
      <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
        <Palette className="size-4 text-primary" /> Global Footer & Brand Settings
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Footer Brand Name</Label>
          <Input
            value={content.logo_text || ""}
            onChange={(e) => updateContentField("logo_text", e.target.value)}
            placeholder="e.g. Master ERP & HRMS"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Tagline Phrase</Label>
          <Input
            value={content.tagline || ""}
            onChange={(e) => updateContentField("tagline", e.target.value)}
            placeholder="e.g. Next-Gen Enterprise Suite"
          />
        </div>
      </div>
    </div>
  );
}

function FooterPreview({ f }: { f: Record<string, any> }) {
  return (
    <div className="p-6 rounded-xl border bg-slate-900 text-slate-100 space-y-4">
      <div className="font-bold text-lg">{f.logo_text || "Master ERP & HRMS"}</div>
      <p className="text-xs text-slate-400">
        {f.tagline || "Next-Gen Enterprise Resource Planning Suite."}
      </p>
    </div>
  );
}

function CreatePageDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (newId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState("blog");
  const [meta, setMeta] = useState("");

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(
      template === "blog"
        ? `blog-${autoSlug}`
        : template === "casestudy"
          ? `case-study-${autoSlug}`
          : autoSlug,
    );
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title || !slug) throw new Error("Title and slug are required");

      let defaultContent: Record<string, any> = {};
      if (template === "blog") {
        defaultContent = {
          hero: {
            title,
            eyebrow: "Blog & Insights",
            subtitle: "Latest enterprise technology trends and best practices.",
          },
          author: "Master ERP Editorial Team",
          date: new Date().toISOString().split("T")[0],
          body: "Detailed analysis on enterprise cloud digital transformation.",
          sections: [
            {
              title: "Key Takeaway 1",
              body: "Implementation details and ROI benefits.",
              badge: "Insight",
            },
          ],
        };
      } else if (template === "casestudy") {
        defaultContent = {
          hero: {
            title,
            eyebrow: "Customer Case Study",
            subtitle: "How global enterprise companies scale with Master ERP.",
          },
          client: "Global Enterprise Corp",
          impact: "↑ 45% Productivity Gain",
          body: "Case study narrative outlining the enterprise challenge, implementation strategy, and ROI results.",
          sections: [
            {
              title: "Implementation Highlights",
              body: "Multi-tenant deployment and automated payroll runs.",
              badge: "Results",
            },
          ],
        };
      } else if (template === "landing") {
        defaultContent = {
          hero: { title, eyebrow: "ERP Module", subtitle: "Explore enterprise capabilities." },
          sections: [
            { title: "Module Highlight", body: "Description of key feature point.", badge: "ERP" },
          ],
        };
      } else {
        defaultContent = {
          body: `Documentation content for ${title}.`,
        };
      }

      const res = await api.post("/cms/pages", {
        title,
        slug,
        meta_description: meta || title,
        content: defaultContent,
        published: true,
      });

      return res?.id || slug;
    },
    onSuccess: (newId) => {
      toast.success("CMS Page / Blog created successfully!");
      onOpenChange(false);
      setTitle("");
      setSlug("");
      setMeta("");
      onCreated(newId);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" /> Create CMS Page, Blog or Case Study
          </DialogTitle>
          <DialogDescription>
            Add a new public marketing page, blog article, or customer case study.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Page Title</Label>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. AI-Powered Global Payroll Trends"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Page Category & Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog">📝 Blog & Insights Article</SelectItem>
                <SelectItem value="casestudy">🏢 Enterprise Case Study</SelectItem>
                <SelectItem value="landing">🚀 ERP Feature / Landing Page</SelectItem>
                <SelectItem value="legal">📜 Legal Terms & Policy</SelectItem>
                <SelectItem value="blank">📄 Blank Page Template</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">URL Slug Path</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1.5 rounded border">
                /p/
              </span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. blog-ai-payroll"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Meta Description (SEO)</Label>
            <Textarea
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              rows={2}
              placeholder="Short description for search engines..."
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{" "}
            Create Page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletePageDialog({
  open,
  onOpenChange,
  page,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: CmsPage;
  onDeleted: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/cms/pages/${page.slug}`);
    },
    onSuccess: () => {
      toast.success(`Deleted page "${page.title}"`);
      onOpenChange(false);
      onDeleted();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="size-5" /> Delete Page?
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete <strong>"{page.title}"</strong> (
            <code>/{page.slug}</code>)? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{" "}
            Permanently Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
