import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Globe,
  Search,
  Loader2,
  AlertTriangle,
  FileQuestion,
  ExternalLink,
  CheckCircle2,
  Code,
  Image as ImageIcon,
  Copy,
  Sparkles,
  RefreshCw,
  Info,
  Link2,
} from "lucide-react";

export const Route = createFileRoute("/og-preview")({
  component: OgPreviewPage,
  head: () => ({
    meta: [
      { title: "Open Graph Metadata Previewer — Master HRMS Tools" },
      {
        name: "description",
        content: "Test and inspect Open Graph meta tags (og:title, og:description, og:image) for any website URL.",
      },
    ],
  }),
});

type OgData = {
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string;
  url: string;
  siteName?: string | null;
  rawTags?: Record<string, string>;
};

type ErrorType = "invalid_url" | "fetch_failed" | "no_og_data" | null;

function OgPreviewPage() {
  const [inputUrl, setInputUrl] = useState("https://github.com");
  const [loading, setLoading] = useState(false);
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validate URL format
  function validateAndNormalizeUrl(urlStr: string): { valid: boolean; normalizedUrl?: string; domain?: string } {
    let trimmed = urlStr.trim();
    if (!trimmed) return { valid: false };

    // Automatically prepend https:// if missing scheme
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = "https://" + trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      if (!parsed.hostname || !parsed.hostname.includes(".")) {
        return { valid: false };
      }
      return { valid: true, normalizedUrl: parsed.href, domain: parsed.hostname };
    } catch {
      return { valid: false };
    }
  }

  // Primary Fetch logic with multi-service fallbacks
  async function fetchOgData(targetUrl: string) {
    const { valid, normalizedUrl, domain } = validateAndNormalizeUrl(targetUrl);

    if (!valid || !normalizedUrl || !domain) {
      setErrorType("invalid_url");
      setErrorMessage("Invalid URL format. Please enter a valid URL (e.g., https://example.com)");
      setOgData(null);
      return;
    }

    setLoading(true);
    setErrorType(null);
    setErrorMessage(null);
    setOgData(null);

    try {
      // 1. Try Microlink API first (Fast, reliable, free CORS proxy service for OG data)
      const microRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(normalizedUrl)}`);
      
      if (microRes.ok) {
        const json = await microRes.json();
        if (json.status === "success" && json.data) {
          const d = json.data;
          const title = d.title || null;
          const description = d.description || null;
          const image = d.image?.url || d.logo?.url || null;

          // Check if page actually has OG metadata
          if (!title && !description && !image) {
            setErrorType("no_og_data");
            setErrorMessage("No Open Graph data found on this page. The webpage does not contain og:title, og:description, or og:image tags.");
            setLoading(false);
            return;
          }

          setOgData({
            title,
            description,
            image,
            domain,
            url: normalizedUrl,
            siteName: d.publisher || domain,
            rawTags: {
              "og:title": title || "Not specified",
              "og:description": description || "Not specified",
              "og:image": image || "Not specified",
              "og:url": normalizedUrl,
              "og:site_name": d.publisher || domain,
            },
          });
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to AllOrigins HTML parser proxy if Microlink fails
      const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`);
      if (!proxyRes.ok) throw new Error("Proxy fetch failed");

      const proxyData = await proxyRes.json();
      const htmlText = proxyData.contents;

      if (!htmlText) throw new Error("Empty HTML content received");

      // Parse HTML Meta tags via DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      const getMeta = (prop: string) =>
        doc.querySelector(`meta[property="${prop}"]`)?.getAttribute("content") ||
        doc.querySelector(`meta[name="${prop}"]`)?.getAttribute("content") ||
        null;

      const title = getMeta("og:title") || doc.querySelector("title")?.textContent || null;
      const description = getMeta("og:description") || getMeta("description") || null;
      const image = getMeta("og:image") || null;
      const siteName = getMeta("og:site_name") || domain;

      if (!title && !description && !image) {
        setErrorType("no_og_data");
        setErrorMessage("No Open Graph tags found on this page.");
        setLoading(false);
        return;
      }

      setOgData({
        title,
        description,
        image,
        domain,
        url: normalizedUrl,
        siteName,
        rawTags: {
          "og:title": title || "Not specified",
          "og:description": description || "Not specified",
          "og:image": image || "Not specified",
          "og:url": normalizedUrl,
          "og:site_name": siteName || domain,
        },
      });
    } catch (err: any) {
      console.error("OG fetch error:", err);
      setErrorType("fetch_failed");
      setErrorMessage("Failed to fetch webpage. The site may be down, unreachable, or blocking CORS proxy requests.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchOgData(inputUrl);
  }

  function handleTryExample(exampleUrl: string) {
    setInputUrl(exampleUrl);
    fetchOgData(exampleUrl);
  }

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Developer Tools"
        title="Open Graph Data Fetcher & Previewer"
        subtitle="Extract and validate og:title, og:description, and og:image metadata for any webpage link."
      />

      <section className="py-12 bg-secondary/10 min-h-[70vh]">
        <div className="mx-auto max-w-5xl px-6 space-y-8">
          {/* URL Submission Form */}
          <Card className="shadow-md border">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter URL (e.g. https://github.com)"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="pl-10 h-11 text-sm bg-background font-mono"
                    />
                  </div>
                  <Button type="submit" disabled={loading} size="lg" className="gap-2 shrink-0">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    Fetch OG Data
                  </Button>
                </div>

                {/* Quick Example Presets for Testing */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Try Test Cases:</span>
                  <button
                    type="button"
                    onClick={() => handleTryExample("https://github.com")}
                    className="px-2.5 py-1 rounded border bg-background hover:bg-secondary transition-colors font-mono"
                  >
                    GitHub (Popular OG Site)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTryExample("https://example.com")}
                    className="px-2.5 py-1 rounded border bg-background hover:bg-secondary transition-colors font-mono text-amber-700 dark:text-amber-400"
                  >
                    example.com (No OG Tags)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTryExample("invalid-url-example")}
                    className="px-2.5 py-1 rounded border bg-background hover:bg-secondary transition-colors font-mono text-red-600 dark:text-red-400"
                  >
                    invalid-url (Error Case)
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* LOADING STATE */}
          {loading && (
            <Card className="p-12 text-center shadow-xs border">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <h3 className="font-semibold text-base">Fetching Open Graph metadata...</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Connecting to URL and extracting <code>og:title</code>, <code>og:description</code>, and <code>og:image</code>.
                </p>
              </div>
            </Card>
          )}

          {/* ERROR HANDLING STATES */}
          {!loading && errorType && (
            <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
              <CardContent className="p-6 flex items-start gap-4">
                {errorType === "invalid_url" && <AlertTriangle className="size-6 text-destructive shrink-0 mt-0.5" />}
                {errorType === "fetch_failed" && <Link2 className="size-6 text-destructive shrink-0 mt-0.5" />}
                {errorType === "no_og_data" && <FileQuestion className="size-6 text-amber-600 shrink-0 mt-0.5" />}

                <div className="space-y-1">
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    {errorType === "invalid_url" && "Invalid URL Error"}
                    {errorType === "fetch_failed" && "Fetch Failed / Network Error"}
                    {errorType === "no_og_data" && "No Open Graph Tags Found"}
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {errorType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{errorMessage}</p>

                  {errorType === "no_og_data" && (
                    <p className="text-xs text-muted-foreground pt-2">
                      💡 <strong>Tip for Developers:</strong> Add <code>&lt;meta property="og:title" content="..."&gt;</code> and <code>&lt;meta property="og:image" content="..."&gt;</code> to your HTML <code>&lt;head&gt;</code> section.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SUCCESS PARSED OG DATA PREVIEW CARD */}
          {!loading && ogData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="gap-1 px-3 py-1 text-xs">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Open Graph Metadata Parsed Successfully
                </Badge>

                <a
                  href={ogData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-mono"
                >
                  {ogData.url} <ExternalLink className="size-3" />
                </a>
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-start">
                {/* Visual Social Card Preview Mock */}
                <Card className="overflow-hidden shadow-lg border group">
                  <CardHeader className="p-3 border-b bg-secondary/40 flex flex-row items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>Social Share Link Preview</span>
                    <span className="font-semibold text-foreground">{ogData.domain}</span>
                  </CardHeader>

                  {/* OG Image */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden border-b flex items-center justify-center">
                    {ogData.image ? (
                      <img
                        src={ogData.image}
                        alt={ogData.title || "OG Image Preview"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Image load error fallback
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400 p-6 text-center">
                        <ImageIcon className="size-10 opacity-50" />
                        <span className="text-xs font-mono">No og:image specified</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-5 space-y-2 bg-card">
                    {/* Domain tag */}
                    <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                      {ogData.domain}
                    </div>

                    {/* OG Title */}
                    <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2">
                      {ogData.title || <span className="text-muted-foreground italic">Untitled Page (no og:title)</span>}
                    </h3>

                    {/* OG Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {ogData.description || (
                        <span className="italic opacity-70">No og:description meta tag found on this webpage.</span>
                      )}
                    </p>
                  </CardContent>
                </Card>

                {/* Raw Metadata Details Table */}
                <Card className="shadow-md border">
                  <CardHeader className="p-4 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Code className="size-4 text-primary" /> Parsed Meta Tags Inspector
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Extracted meta tags used by social platforms (LinkedIn, Twitter, Facebook, Slack).
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="divide-y text-xs">
                      <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-mono text-muted-foreground font-semibold">Domain</span>
                        <span className="font-mono text-foreground font-bold">{ogData.domain}</span>
                      </div>

                      <div className="p-3.5 space-y-1">
                        <span className="font-mono text-muted-foreground font-semibold">og:title</span>
                        <div className="font-medium text-foreground bg-secondary/30 p-2 rounded border text-xs">
                          {ogData.title || "—"}
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1">
                        <span className="font-mono text-muted-foreground font-semibold">og:description</span>
                        <div className="text-muted-foreground bg-secondary/30 p-2 rounded border text-xs leading-relaxed">
                          {ogData.description || "—"}
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1">
                        <span className="font-mono text-muted-foreground font-semibold">og:image</span>
                        <div className="font-mono text-xs text-primary truncate bg-secondary/30 p-2 rounded border">
                          {ogData.image ? (
                            <a href={ogData.image} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                              {ogData.image} <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
