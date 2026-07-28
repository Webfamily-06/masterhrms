import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, BookOpen, Download, Star } from "lucide-react";

export const Route = createFileRoute("/addons/$slug")({
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

function AddonDetail() {
  const { slug } = Route.useParams();
  const { data: addon, isLoading } = useQuery({
    queryKey: ["addon", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("addons").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as AddonRow | null;
    },
  });

  if (isLoading)
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </MarketingLayout>
    );

  if (!addon) {
    return (
      <MarketingLayout>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Addon not found</h1>
          <Link to="/addons" className="mt-4 inline-block text-primary hover:underline">
            Back to marketplace
          </Link>
        </div>
      </MarketingLayout>
    );
  }

  const features = Array.isArray(addon.features) ? addon.features : [];
  const screenshots = Array.isArray(addon.screenshots) ? addon.screenshots : [];

  return (
    <MarketingLayout>
      <PageHero eyebrow={addon.category} title={addon.name} subtitle={addon.tagline ?? undefined}>
        <div className="flex flex-col items-center gap-4">
          {addon.icon && (addon.icon.startsWith("http") || addon.icon.startsWith("data:")) && (
            <div className="size-16 rounded-2xl border bg-background/90 p-2 shadow-sm grid place-items-center">
              <img src={addon.icon} alt={addon.name} className="size-12 object-contain rounded-lg" />
            </div>
          )}

          <div className="flex gap-2 flex-wrap justify-center items-center">
            <Badge variant="outline">{addon.status}</Badge>
            {addon.featured && (
              <Badge className="bg-amber-500 text-white">
                <Star className="size-3 mr-1" /> Featured
              </Badge>
            )}
            <Badge variant="secondary">v{addon.version ?? "1.0.0"}</Badge>
            <Badge variant="secondary" className="font-mono">
              {addon.price_monthly === 0 ? "Free" : `₹${addon.price_monthly > 100 ? addon.price_monthly : addon.price_monthly * 80}/mo`}
            </Badge>
          </div>
        </div>
      </PageHero>

      <section className="py-14">
        <div className="mx-auto max-w-5xl px-6 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <Link
                to="/addons"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="size-3.5" /> Back to marketplace
              </Link>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">{addon.description}</p>
            {addon.long_description && (
              <div className="prose prose-neutral max-w-none whitespace-pre-line text-foreground/90">
                {addon.long_description}
              </div>
            )}

            {features.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">What's included</h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {features.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary mt-1">✓</span> <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {screenshots.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Screenshots</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {screenshots.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`${addon.name} screenshot ${i + 1}`}
                      className="rounded-lg border w-full object-cover aspect-video"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-6 space-y-4 sticky top-24">
              <div>
                <div className="text-xs text-muted-foreground uppercase">Developer</div>
                <div className="font-semibold">{addon.developer ?? "Master HRMS"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase">Pricing</div>
                <div className="text-2xl font-bold">
                  ${addon.price_monthly}
                  <span className="text-sm text-muted-foreground font-normal">/mo</span>
                </div>
              </div>
              {addon.install_url ? (
                <Button asChild className="w-full">
                  <a href={addon.install_url} target="_blank" rel="noreferrer">
                    <Download className="mr-2 size-4" /> Install
                  </a>
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  Install
                </Button>
              )}
              {addon.docs_url && (
                <Button asChild variant="outline" className="w-full">
                  <a href={addon.docs_url} target="_blank" rel="noreferrer">
                    <BookOpen className="mr-2 size-4" /> Documentation
                  </a>
                </Button>
              )}
            </div>
          </aside>
        </div>
      </section>
    </MarketingLayout>
  );
}
