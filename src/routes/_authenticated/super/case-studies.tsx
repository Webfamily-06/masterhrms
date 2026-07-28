import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Building2,
  TrendingUp,
  Sparkles,
  Award,
} from "lucide-react";
import type { CmsPage } from "@/routes/_authenticated/super/cms";

export const Route = createFileRoute("/_authenticated/super/case-studies")({
  component: DedicatedCaseStudiesManager,
  head: () => ({ meta: [{ title: "Case Studies & ROI Manager — Super Admin" }] }),
});

const INDUSTRIES = [
  "All Industries",
  "Manufacturing & Plant Ops",
  "Healthcare & Hospital Systems",
  "Retail & Multi-Location E-Com",
  "Logistics & Supply Chain",
  "Telecommunications & Tech",
  "Financial Services & Banking",
];

function DedicatedCaseStudiesManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("All Industries");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCaseStudy, setEditingCaseStudy] = useState<CmsPage | null>(null);

  // Dedicated Case Study Form State
  const [form, setForm] = useState({
    title: "",
    slug: "",
    clientCompany: "",
    industry: "Manufacturing & Plant Ops",
    roiResult: "Cut payroll processing by 68%",
    coverImage: "",
    excerpt: "",
    body: "",
    published: true,
  });

  // 1. REALTIME QUERY: Fetch all Case Studies (slug starts with "case-study-") from Supabase cms_pages
  const { data: caseStudies = [], isLoading } = useQuery({
    queryKey: ["super-dedicated-case-studies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .or("slug.ilike.case-study-%,slug.eq.resource-case-studies")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as CmsPage[]) || [];
    },
  });

  // Filter Case Studies by Search & Industry
  const filteredCaseStudies = useMemo(() => {
    return caseStudies.filter((cs) => {
      const ind = cs.content?.industry || "Manufacturing & Plant Ops";
      const indMatch = selectedIndustry === "All Industries" || ind === selectedIndustry;
      const searchMatch =
        !search ||
        cs.title.toLowerCase().includes(search.toLowerCase()) ||
        cs.slug.toLowerCase().includes(search.toLowerCase()) ||
        (cs.content?.clientCompany || "").toLowerCase().includes(search.toLowerCase());
      return indMatch && searchMatch;
    });
  }, [caseStudies, selectedIndustry, search]);

  // Handle Thumbnail Image Upload
  function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Url = ev.target?.result as string;
      setForm((prev) => ({ ...prev, coverImage: base64Url }));
      toast.success(`Case Study thumbnail "${file.name}" uploaded!`);
    };
    reader.readAsDataURL(file);
  }

  // Open Dialog for Creating New Case Study
  function handleOpenCreate() {
    setEditingCaseStudy(null);
    setForm({
      title: "",
      slug: "",
      clientCompany: "",
      industry: "Manufacturing & Plant Ops",
      roiResult: "Cut operational costs by 45%",
      coverImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80",
      excerpt: "",
      body: "",
      published: true,
    });
    setIsCreateOpen(true);
  }

  // Open Dialog for Editing Existing Case Study
  function handleOpenEdit(cs: CmsPage) {
    setEditingCaseStudy(cs);
    setForm({
      title: cs.title,
      slug: cs.slug.replace(/^case-study-/, ""),
      clientCompany: cs.content?.clientCompany || cs.title.split(" ")[0] || "Client Company",
      industry: cs.content?.industry || "Manufacturing & Plant Ops",
      roiResult: cs.content?.roiResult || cs.meta_description || "Cut operational costs by 45%",
      coverImage: cs.content?.coverImage || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80",
      excerpt: cs.meta_description || cs.content?.hero?.subtitle || "",
      body: cs.content?.body || "",
      published: cs.published,
    });
    setIsCreateOpen(true);
  }

  // 2. Save Case Study Mutation (Create / Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.clientCompany.trim()) {
        throw new Error("Case Study Title and Client Company Name are required");
      }

      const cleanSlug = (form.slug || form.clientCompany.toLowerCase().replace(/[^a-z0-9-]/g, "-")).replace(/^case-study-/, "");
      const finalSlug = `case-study-${cleanSlug}`;

      const contentObj = {
        category: "Case Studies",
        clientCompany: form.clientCompany,
        industry: form.industry,
        roiResult: form.roiResult,
        coverImage: form.coverImage,
        body: form.body,
        hero: {
          title: form.title,
          eyebrow: form.industry,
          subtitle: form.excerpt,
        },
      };

      if (editingCaseStudy) {
        const { error } = await supabase
          .from("cms_pages")
          .update({
            title: form.title,
            slug: finalSlug,
            meta_description: form.roiResult || form.excerpt,
            content: contentObj as never,
            published: form.published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCaseStudy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cms_pages")
          .insert({
            title: form.title,
            slug: finalSlug,
            meta_description: form.roiResult || form.excerpt,
            content: contentObj as never,
            published: form.published,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingCaseStudy ? "Case Study updated in real-time!" : "New Case Study published to public site!");
      qc.invalidateQueries({ queryKey: ["super-dedicated-case-studies"] });
      qc.invalidateQueries({ queryKey: ["public-resources-articles"] });
      setIsCreateOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete Case Study Handler
  async function handleDeleteCaseStudy(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete case study "${title}"?`)) return;
    try {
      const { error } = await supabase.from("cms_pages").delete().eq("id", id);
      if (error) throw error;
      toast.success("Case Study deleted from CMS");
      qc.invalidateQueries({ queryKey: ["super-dedicated-case-studies"] });
      qc.invalidateQueries({ queryKey: ["public-resources-articles"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete case study");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Case Studies & ROI Manager</h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <Briefcase className="size-3 text-primary" /> Dedicated Case Studies CMS
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Create customer success stories, upload plant/office thumbnails, record ROI metrics, and showcase transformation stories.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenCreate} className="gap-2 bg-primary font-bold">
          <Plus className="size-4" /> Create New Case Study
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search case studies by client, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="h-9 text-xs w-[210px]">
              <SelectValue placeholder="Industry filter" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind} className="text-xs">
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Case Studies Grid */}
      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredCaseStudies.length === 0 ? (
        <Card className="p-12 text-center text-xs text-muted-foreground italic space-y-2">
          <Briefcase className="size-8 mx-auto opacity-30" />
          <p>No case studies found. Click "Create New Case Study" to add customer ROI success stories.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCaseStudies.map((cs) => {
            const cover =
              cs.content?.coverImage ||
              "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80";

            return (
              <Card key={cs.id} className="flex flex-col justify-between overflow-hidden hover:border-primary/60 transition-all group">
                <div>
                  {/* Case Study Thumbnail Cover */}
                  <div className="h-44 relative bg-secondary/40 overflow-hidden">
                    <img src={cover} alt={cs.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-emerald-600 text-white font-mono text-[9px] shadow-sm">
                        {cs.content?.industry || "Manufacturing"}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant={cs.published ? "default" : "secondary"} className="text-[9px] font-mono">
                        {cs.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="p-4 pb-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                      <Building2 className="size-3.5" /> {cs.content?.clientCompany || cs.title}
                    </div>

                    <CardTitle className="text-base font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {cs.title}
                    </CardTitle>

                    {/* ROI Metric Badge Strip */}
                    <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-2">
                      <TrendingUp className="size-4 shrink-0 text-emerald-600" />
                      <span className="truncate">{cs.content?.roiResult || cs.meta_description || "Transformed enterprise ops"}</span>
                    </div>
                  </CardHeader>
                </div>

                <CardContent className="p-4 pt-0">
                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]" title={cs.slug}>
                      /{cs.slug}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => handleOpenEdit(cs)} title="Edit Case Study">
                        <Edit className="size-3.5 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDeleteCaseStudy(cs.id, cs.title)} title="Delete">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* DEDICATED CASE STUDY EDITOR MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="size-5 text-primary" /> {editingCaseStudy ? "Edit Customer Case Study" : "Create New Case Study"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish customer success story, record ROI metrics, and upload plant/office thumbnail images.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Client Company Name & Industry */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Client Company Name *</Label>
                <Input
                  placeholder="e.g. Apex Manufacturing Group"
                  value={form.clientCompany}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      clientCompany: val,
                      title: prev.title || `${val} Cloud Transformation`,
                      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    }));
                  }}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Industry Sector</Label>
                <Select value={form.industry} onValueChange={(val) => setForm((prev) => ({ ...prev, industry: val }))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.filter((i) => i !== "All Industries").map((ind) => (
                      <SelectItem key={ind} value={ind} className="text-xs">
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Case Study Title & Slug */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Case Study Title *</Label>
                <Input
                  placeholder="e.g. Cut payroll processing time by 68% across 14 plants"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">URL Slug (slug: case-study-*)</Label>
                <div className="flex items-center">
                  <span className="bg-secondary px-2.5 py-1.5 rounded-l-md border border-r-0 font-mono text-[10px] text-muted-foreground">case-study-</span>
                  <Input
                    placeholder="apex-manufacturing"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="rounded-l-none text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* ROI Result Badge */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Key ROI / Impact Result Badge</Label>
              <Input
                placeholder="e.g. Cut payroll processing time by 68% across 14 plants"
                value={form.roiResult}
                onChange={(e) => setForm((prev) => ({ ...prev, roiResult: e.target.value }))}
                className="text-xs font-semibold text-emerald-600"
              />
            </div>

            {/* Thumbnail Cover Image Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Case Study Cover / Facility Thumbnail</span>
                <span className="text-[10px] text-muted-foreground">Upload file or paste URL</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={form.coverImage}
                  onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                  className="text-xs flex-1"
                />
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 shrink-0 text-xs">
                  <Upload className="size-3.5" /> Upload Thumbnail
                </Button>
              </div>

              {/* Thumbnail Image Preview Box */}
              {form.coverImage && (
                <div className="h-28 relative rounded-xl border bg-secondary/30 overflow-hidden mt-2">
                  <img src={form.coverImage} alt="Thumbnail Preview" className="size-full object-cover" />
                  <Badge variant="outline" className="absolute bottom-2 left-2 text-[9px] bg-background/80 font-mono">
                    Facility / Office Thumbnail Preview
                  </Badge>
                </div>
              )}
            </div>

            {/* Full Story & Solution Body */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Full Case Study Solution & Results (Markdown / HTML)</Label>
              <Textarea
                placeholder="Write the complete case study story: Challenge, Solution, and Results..."
                rows={6}
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Published Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/30 pt-2">
              <div>
                <p className="font-bold text-xs">Publish to Customer Success Portal</p>
                <p className="text-[11px] text-muted-foreground">Make this case study visible on public /resources and customer pages</p>
              </div>
              <Switch checked={form.published} onCheckedChange={(val) => setForm((prev) => ({ ...prev, published: val }))} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-primary font-bold gap-2">
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {editingCaseStudy ? "Save Changes" : "Publish Case Study"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
