import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  Download,
  Star,
  RotateCcw,
  Puzzle,
  MessageSquare,
  Fingerprint,
  Sparkles,
  Store,
  Layers,
  Landmark,
  Cpu,
  CreditCard,
  Lock,
  ShieldCheck,
  Users,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";

export const Route = createFileRoute("/addons_/$slug")({
  component: AddonDetail,
});

type AddonRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  category: string;
  icon: string | null;
  price_monthly: number;
  developer: string | null;
  status: string;
  featured: boolean;
  install_url: string | null;
  docs_url: string | null;
  version: string | null;
  features: string[] | null;
  screenshots: string[] | null;
};

// Robust Icon Resolver supporting uploaded image URLs, persisted Lucide names, and category fallbacks
function resolveAddonIcon(icon: string | null | undefined, category: string, addonName: string) {
  const iconStr = (icon || "").trim();
  const cat = (category || "").toLowerCase();
  const name = (addonName || "").toLowerCase();

  const isUploadedUrl =
    iconStr.startsWith("http://") ||
    iconStr.startsWith("https://") ||
    iconStr.startsWith("/uploads/") ||
    iconStr.startsWith("data:") ||
    iconStr.startsWith("blob:") ||
    iconStr.startsWith("/");

  if (isUploadedUrl) {
    return { type: "image" as const, url: iconStr };
  }

  // Exact icon name matching
  const iconLower = iconStr.toLowerCase();
  if (iconLower === "messagesquare" || iconLower === "message-square") return { type: "lucide" as const, Icon: MessageSquare };
  if (iconLower === "fingerprint") return { type: "lucide" as const, Icon: Fingerprint };
  if (iconLower === "sparkles") return { type: "lucide" as const, Icon: Sparkles };
  if (iconLower === "store") return { type: "lucide" as const, Icon: Store };
  if (iconLower === "layers") return { type: "lucide" as const, Icon: Layers };
  if (iconLower === "landmark") return { type: "lucide" as const, Icon: Landmark };
  if (iconLower === "cpu") return { type: "lucide" as const, Icon: Cpu };
  if (iconLower === "creditcard" || iconLower === "credit-card") return { type: "lucide" as const, Icon: CreditCard };
  if (iconLower === "lock") return { type: "lucide" as const, Icon: Lock };
  if (iconLower === "shieldcheck" || iconLower === "shield-check") return { type: "lucide" as const, Icon: ShieldCheck };
  if (iconLower === "users") return { type: "lucide" as const, Icon: Users };

  // Fallback derived from category and name
  if (cat.includes("message") || cat.includes("communication") || name.includes("whatsapp") || name.includes("slack"))
    return { type: "lucide" as const, Icon: MessageSquare };
  if (cat.includes("hardware") || cat.includes("biometric") || name.includes("biometric") || name.includes("device"))
    return { type: "lucide" as const, Icon: Fingerprint };
  if (cat.includes("ai") || cat.includes("automation") || name.includes("ocr") || name.includes("neural"))
    return { type: "lucide" as const, Icon: Sparkles };
  if (cat.includes("commerce") || cat.includes("retail") || cat.includes("pos") || name.includes("pos"))
    return { type: "lucide" as const, Icon: Store };
  if (cat.includes("accounting") || name.includes("tally") || name.includes("quickbooks"))
    return { type: "lucide" as const, Icon: Layers };
  if (cat.includes("finance") || name.includes("currency") || name.includes("forex"))
    return { type: "lucide" as const, Icon: Landmark };
  if (cat.includes("payment") || name.includes("stripe") || name.includes("razorpay"))
    return { type: "lucide" as const, Icon: CreditCard };
  if (cat.includes("auth") || name.includes("sso") || name.includes("google"))
    return { type: "lucide" as const, Icon: Lock };
  if (cat.includes("security"))
    return { type: "lucide" as const, Icon: ShieldCheck };
  if (cat.includes("hr") || name.includes("payroll"))
    return { type: "lucide" as const, Icon: Users };

  return { type: "lucide" as const, Icon: Puzzle };
}

function AddonDetail() {
  const { slug } = Route.useParams();

  // Authoritative System Platform Settings for consistent currency display
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: addon,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["addon", slug],
    queryFn: async () => {
      try {
        const res = await api.get<AddonRow>(`/cms/addons/${slug}`);
        return res || null;
      } catch (err: any) {
        if (err?.status === 404 || err?.response?.status === 404) return null;
        throw err;
      }
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Public Release History & Changelog Query — executes in parallel with addon query
  const { data: releaseData } = useQuery({
    queryKey: ["addon-public-releases", slug],
    queryFn: async () => {
      try {
        return await api.get<{
          addonSlug: string;
          currentVersion: string;
          totalReleases: number;
          releases: Array<{
            id: string;
            version: string;
            previousVersion: string | null;
            changeSummary: string;
            releaseNotes: string | null;
            createdAt: string;
          }>;
        }>(`/cms/addons/${slug}/releases`);
      } catch {
        return null;
      }
    },
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-mono">Loading extension details...</p>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  if (isError) {
    return (
      <MarketingLayout>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center space-y-4">
          <div className="size-14 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
            <Puzzle className="size-7" />
          </div>
          <h1 className="text-2xl font-black">Unable to Load Extension</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {(error as any)?.message || "A network or server error occurred while retrieving this add-on."}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button size="sm" variant="default" onClick={() => refetch()} className="gap-1.5 font-bold">
              <RotateCcw className="size-3.5" /> Try Again
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/addons">
                <ArrowLeft className="size-3.5 mr-1" /> Back to Marketplace
              </Link>
            </Button>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  if (!addon) {
    return (
      <MarketingLayout>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center space-y-4">
          <div className="size-14 rounded-2xl bg-secondary text-muted-foreground grid place-items-center mx-auto">
            <Puzzle className="size-7" />
          </div>
          <h1 className="text-2xl font-black">Add-on Not Found</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The requested add-on <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">{slug}</code> does not exist or is not currently published.
          </p>
          <div className="pt-2">
            <Button size="sm" variant="default" asChild>
              <Link to="/addons">
                <ArrowLeft className="size-3.5 mr-1" /> Browse All Add-ons
              </Link>
            </Button>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  const iconInfo = resolveAddonIcon(addon.icon, addon.category, addon.name);
  const features = Array.isArray(addon.features) ? addon.features.filter(Boolean) : [];
  const validScreenshots = Array.isArray(addon.screenshots)
    ? addon.screenshots.filter(
        (s) =>
          typeof s === "string" &&
          (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/uploads/") || s.startsWith("/"))
      )
    : [];

  const basePrice = addon.price_monthly ?? 0;
  const priceFormatted = basePrice === 0 ? "Free" : `${formatSystemAmount(basePrice, sysConfig)}/mo`;

  return (
    <MarketingLayout>
      <PageHero eyebrow={addon.category || "Extension"} title={addon.name} subtitle={addon.tagline ?? undefined}>
        <div className="flex flex-col items-center gap-4">
          {/* Resolved Icon: Uploaded Media or Neutral Design-System Fallback Icon */}
          <div className="size-20 rounded-2xl border bg-background/90 p-2 shadow-md grid place-items-center">
            {iconInfo.type === "image" ? (
              <img
                src={iconInfo.url}
                alt={addon.name}
                width={64}
                height={64}
                className="size-16 object-contain rounded-xl"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="size-full rounded-xl bg-primary/10 grid place-items-center text-primary">
                <iconInfo.Icon className="size-8" />
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap justify-center items-center">
            <Badge variant="outline" className="capitalize font-mono text-xs">
              {addon.status}
            </Badge>
            {addon.featured && (
              <Badge className="bg-amber-500 text-white font-mono text-xs shadow-xs">
                <Star className="size-3 mr-1 fill-white" /> Featured
              </Badge>
            )}
            <Badge variant="secondary" className="font-mono text-xs">
              v{addon.version ?? "1.0.0"}
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
              {priceFormatted}
            </Badge>
          </div>
        </div>
      </PageHero>

      <section className="py-14 bg-background">
        <div className="mx-auto max-w-5xl px-6 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <Link
                to="/addons"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="size-3.5" /> Back to All Add-ons
              </Link>
            </div>

            {/* Overview / Tagline & Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-foreground">Overview</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                {addon.description || addon.tagline || `Extend your Master ERP instance with ${addon.name}.`}
              </p>
              {addon.long_description && (
                <div className="prose prose-neutral max-w-none whitespace-pre-line text-foreground/90 text-sm leading-relaxed border-t pt-4">
                  {addon.long_description}
                </div>
              )}
            </div>

            {/* Key Features */}
            {features.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-bold text-foreground">Key Capabilities & Features</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border bg-card/60 shadow-xs">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-foreground leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Screenshots Gallery or Clean Neutral Preview Banner */}
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-lg font-bold text-foreground">Product Preview</h2>
              {validScreenshots.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {validScreenshots.map((src, i) => (
                    <div key={i} className="overflow-hidden rounded-xl border bg-card shadow-sm group">
                      <img
                        src={src}
                        alt={`${addon.name} preview ${i + 1}`}
                        width={480}
                        height={270}
                        className="w-full object-cover aspect-video group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border bg-secondary/20 flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                    <PackageCheck className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground">Verified Master ERP Architecture</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      This extension runs directly inside the isolated tenant perimeter with native role-based permissions and zero third-party telemetry.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Version History & Changelog */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Release History & Changelog</h2>
                <Badge variant="outline" className="font-mono text-xs">
                  Current: v{addon.version ?? "1.0.0"}
                </Badge>
              </div>

              {releaseData?.releases && releaseData.releases.length > 0 ? (
                <div className="space-y-3">
                  {releaseData.releases.map((rel) => (
                    <div key={rel.id} className="p-4 rounded-xl border bg-card/60 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                            v{rel.version}
                          </span>
                          {rel.previousVersion && (
                            <span className="text-xs text-muted-foreground font-mono">
                              (upgrade from v{rel.previousVersion})
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rel.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        {rel.changeSummary}
                      </p>
                      {rel.releaseNotes && (
                        <p className="text-xs text-muted-foreground whitespace-pre-line border-t pt-2">
                          {rel.releaseNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-xl border bg-secondary/15 flex items-center gap-3.5">
                  <BookOpen className="size-5 text-muted-foreground shrink-0" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    This extension is operating on official release <span className="font-mono font-bold text-foreground">v{addon.version ?? "1.0.0"}</span>. Verified release notes and changelog entries will appear here as updates are released.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sticky Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-card p-6 space-y-5 sticky top-24 shadow-sm">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  Developer
                </div>
                <div className="font-bold text-sm text-foreground mt-0.5">
                  {addon.developer ?? "Master ERP Platform Official"}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  Category
                </div>
                <div className="font-bold text-sm text-foreground mt-0.5 capitalize">
                  {addon.category || "Extension"}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  Monthly Subscription
                </div>
                <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
                  {priceFormatted}
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                {addon.install_url ? (
                  <Button asChild className="w-full font-bold">
                    <a href={addon.install_url} target="_blank" rel="noreferrer">
                      <Download className="mr-2 size-4" /> Install Extension
                    </a>
                  </Button>
                ) : (
                  <Button asChild className="w-full font-bold">
                    <Link to="/marketplace">
                      <Download className="mr-2 size-4" /> Install in Workspace
                    </Link>
                  </Button>
                )}

                {addon.docs_url && (
                  <Button asChild variant="outline" className="w-full font-semibold">
                    <a href={addon.docs_url} target="_blank" rel="noreferrer">
                      <BookOpen className="mr-2 size-4" /> Technical Documentation
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </MarketingLayout>
  );
}

export default AddonDetail;
