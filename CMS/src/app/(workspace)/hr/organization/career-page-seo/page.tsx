'use client';

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Globe,
  Share2,
  Upload,
  Save,
  Lightbulb,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CareerSeoData {
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  metaSocialImage: string;
  tenantName?: string;
  tenantSlug?: string;
}

function applySeoToDocumentHead(seo: CareerSeoData) {
  if (typeof document === "undefined") return;
  if (seo.metaTitle.trim()) {
    document.title = seo.metaTitle.trim();
  }
  const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
    if (!content.trim()) return;
    let tag = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attr, key);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content.trim());
  };
  upsertMeta("name", "description", seo.metaDescription);
  upsertMeta("name", "keywords", seo.metaKeywords);
  upsertMeta("property", "og:title", seo.metaTitle);
  upsertMeta("property", "og:description", seo.metaDescription);
  if (seo.metaSocialImage) {
    upsertMeta("property", "og:image", seo.metaSocialImage);
    upsertMeta("name", "twitter:image", seo.metaSocialImage);
  }
  upsertMeta("name", "twitter:title", seo.metaTitle);
  upsertMeta("name", "twitter:description", seo.metaDescription);
}

export default function CareerPageSeoPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaSocialImage, setMetaSocialImage] = useState("");
  const [bannerFileName, setBannerFileName] = useState("");
  const [previewHost, setPreviewHost] = useState("careers.masterhrms.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPreviewHost(window.location.host);
    }
  }, []);

  const { data: seoResponse, isLoading } = useQuery<CareerSeoData>({
    queryKey: ["career-page-seo"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/career-seo");
      return res?.data || res || {
        metaTitle: "",
        metaKeywords: "",
        metaDescription: "",
        metaSocialImage: "",
      };
    },
  });

  useEffect(() => {
    if (!seoResponse) return;
    setMetaTitle(seoResponse.metaTitle || "");
    setMetaKeywords(seoResponse.metaKeywords || "");
    setMetaDescription(seoResponse.metaDescription || "");
    setMetaSocialImage(seoResponse.metaSocialImage || "");
  }, [seoResponse]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await api.put("/hr/organization/career-seo", {
        metaTitle: metaTitle.trim(),
        metaKeywords: metaKeywords.trim(),
        metaDescription: metaDescription.trim(),
        metaSocialImage,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Career Page SEO saved and applied live!");
      queryClient.invalidateQueries({ queryKey: ["career-page-seo"] });
      queryClient.invalidateQueries({ queryKey: ["public-careers"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save SEO settings.");
    },
  });

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Banner image must be 5MB or smaller.");
      return;
    }
    setBannerFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMetaSocialImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaTitle.trim()) {
      toast.error("Meta Title is required.");
      return;
    }
    if (!metaKeywords.trim()) {
      toast.error("Meta Keywords are required.");
      return;
    }
    if (!metaDescription.trim()) {
      toast.error("Meta Description is required.");
      return;
    }
    saveMutation.mutate();
  };

  const publicCareerPath = seoResponse?.tenantSlug
    ? `/careers?tenant=${encodeURIComponent(seoResponse.tenantSlug)}`
    : "/careers";
  const previewDomain = seoResponse?.tenantSlug
    ? `${previewHost}/careers?tenant=${seoResponse.tenantSlug}`
    : `${previewHost}/careers`;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Career Page SEO"
        description="Configure SEO settings and meta tags for your public career portal."
        actions={
          <a href={publicCareerPath} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
              <ExternalLink className="h-3.5 w-3.5" />
              Open Public Career Page
            </Button>
          </a>
        }
      />

      {/* ── 2-Column Split Container ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: SEO Configuration Card */}
        <div className="lg:col-span-7 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-border/70">
            <h2 className="text-base font-bold text-foreground">SEO Configuration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specify meta tags and preview images to maximize reach and attract qualified candidates.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading SEO configuration...
              </div>
            ) : (
              <>
                {/* Meta Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="seo-meta-title" className="text-xs font-semibold text-foreground">
                      Meta Title <span className="text-rose-500">*</span>
                    </Label>
                    <span
                      className={cn(
                        "text-[11px]",
                        metaTitle.length > 60 ? "text-amber-600 font-medium" : "text-muted-foreground"
                      )}
                    >
                      {metaTitle.length}/60 recommended
                    </span>
                  </div>
                  <Input
                    id="seo-meta-title"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="e.g., Careers & Job Openings at Company Name"
                    className="h-10 text-sm"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This title appears as the clickable headline in search engine results and social previews.
                  </p>
                </div>

                {/* Meta Keywords */}
                <div className="space-y-1.5">
                  <Label htmlFor="seo-meta-keywords" className="text-xs font-semibold text-foreground">
                    Meta Keywords <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="seo-meta-keywords"
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    placeholder="e.g., Careers, Job Openings, Hiring, HR, Engineering Jobs"
                    className="h-10 text-sm"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Provide relevant keywords separated by commas to describe your job opportunities.
                  </p>
                </div>

                {/* Meta Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="seo-meta-description" className="text-xs font-semibold text-foreground">
                      Meta Description <span className="text-rose-500">*</span>
                    </Label>
                    <span
                      className={cn(
                        "text-[11px]",
                        metaDescription.length > 160 ? "text-amber-600 font-medium" : "text-muted-foreground"
                      )}
                    >
                      {metaDescription.length}/160
                    </span>
                  </div>
                  <Textarea
                    id="seo-meta-description"
                    rows={4}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Write a concise overview of your company culture and why candidates should join your team..."
                    className="text-sm"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    A compelling summary encourages prospective candidates to click and explore your open positions.
                  </p>
                </div>

                {/* Meta Social Image */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Meta Social Image</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between gap-2 h-10 px-3 rounded-md border border-border/80 bg-background hover:bg-muted/40 transition-colors">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-xs font-medium text-foreground flex-1 text-left cursor-pointer truncate"
                    >
                      <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {bannerFileName || (metaSocialImage ? "Banner Image Uploaded (Click to Replace)" : "Upload Banner Image")}
                      </span>
                    </button>
                    {metaSocialImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setMetaSocialImage("");
                          setBannerFileName("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-muted-foreground hover:text-rose-600 p-1 cursor-pointer"
                        aria-label="Remove banner image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Optimal dimensions: 1200×630px (PNG, JPG, or WEBP up to 5MB). Displayed when sharing your career link.
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="h-10 px-5 gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Right Column: Live SEO Preview Card */}
        <div className="lg:col-span-5 rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-5">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Live SEO Preview
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Preview how your career page appears in search engines and social platforms.
            </p>
          </div>

          {/* Google Search Snippet */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Google Search Snippet
            </div>
            <div
              data-testid="seo-google-preview"
              className="rounded-xl border border-border/80 bg-background p-4 space-y-1 shadow-2xs"
            >
              <p className="text-[11px] text-muted-foreground truncate">{previewDomain}</p>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 leading-snug line-clamp-1">
                {metaTitle.trim() || "Your Career Portal Title Goes Here"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {metaDescription.trim() ||
                  "Your career page meta description will be displayed here in search engine rankings."}
              </p>
            </div>
          </div>

          {/* Social Media Card */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Share2 className="h-3.5 w-3.5" />
              Social Media Card
            </div>
            <div
              data-testid="seo-social-preview"
              className="rounded-xl border border-border/80 bg-background overflow-hidden shadow-2xs"
            >
              <div className="aspect-[1200/630] w-full bg-muted/50 flex flex-col items-center justify-center overflow-hidden border-b border-border/60">
                {metaSocialImage ? (
                  <img
                    src={metaSocialImage}
                    alt="Social preview banner"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 space-y-1.5 text-muted-foreground">
                    <Upload className="h-6 w-6 mx-auto opacity-60" />
                    <p className="text-xs font-medium">1200 × 630px Banner Image</p>
                    <p className="text-[11px] opacity-80">Upload an image to see live preview</p>
                  </div>
                )}
              </div>
              <div className="p-3.5 space-y-1">
                <p className="text-[11px] text-muted-foreground truncate">{previewDomain}</p>
                <p className="text-sm font-bold text-foreground line-clamp-1">
                  {metaTitle.trim() || "Your Career Page Title"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {metaDescription.trim() ||
                    "Your career page meta description will be shown here when shared on LinkedIn, Twitter, Facebook, and messaging apps."}
                </p>
              </div>
            </div>
          </div>

          {/* Best Practice SEO Tips */}
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
              <Lightbulb className="h-3.5 w-3.5" />
              Best Practice SEO Tips
            </div>
            <ul className="text-[11px] text-sky-800/90 dark:text-sky-200/90 space-y-1 list-disc pl-4">
              <li>
                <strong>Title:</strong> Keep between 50–60 characters for best Google display.
              </li>
              <li>
                <strong>Description:</strong> Aim for 140–160 characters highlighting culture &amp; open roles.
              </li>
              <li>
                <strong>Social Image:</strong> Use a crisp 1200×630px banner for LinkedIn &amp; X cards.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
