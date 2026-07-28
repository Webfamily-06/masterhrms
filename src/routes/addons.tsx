import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatSystemAmount } from "@/lib/currency";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Puzzle,
  Star,
  Loader2,
  MessageSquare,
  Cpu,
  Landmark,
  CreditCard,
  Lock,
  ShieldCheck,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/addons")({
  component: AddonsPage,
  head: () => ({
    meta: [
      { title: "Addons & Integration Marketplace — Master ERP & HRMS" },
      { name: "description", content: "Extend your Master ERP workspace with 500+ modular add-ons: WhatsApp alerts, Tally sync, biometric device integration, and global gateways." },
      { property: "og:title", content: "Addons & Integration Marketplace — Master ERP & HRMS" },
      { property: "og:description", content: "Extend your ERP workspace with 500+ modular add-ons." },
    ],
  }),
});

type Addon = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string;
  icon: string | null;
  image_url?: string | null;
  price_monthly: number;
  status: string;
  featured: boolean;
};

// Helper to resolve Category Icon for Addon Card Banner
function getCategoryIcon(category: string, addonName: string) {
  const cat = (category || "").toLowerCase();
  const name = (addonName || "").toLowerCase();

  if (cat.includes("message") || name.includes("whatsapp") || name.includes("slack")) return MessageSquare;
  if (cat.includes("hardware") || name.includes("biometric")) return Cpu;
  if (cat.includes("finance") || name.includes("tally") || name.includes("quickbooks")) return Landmark;
  if (cat.includes("payment") || name.includes("stripe") || name.includes("razorpay")) return CreditCard;
  if (cat.includes("auth") || name.includes("sso") || name.includes("google")) return Lock;
  if (cat.includes("security")) return ShieldCheck;
  if (cat.includes("hr") || name.includes("payroll")) return Users;
  return Puzzle;
}

function AddonsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  // REALTIME SYSTEM SETTINGS QUERY FROM SUPER ADMIN PANEL
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "system-platform-settings")
        .maybeSingle();
      return data?.content as any;
    },
  });

  const { data: addons, isLoading } = useQuery({
    queryKey: ["public-addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addons")
        .select("id, slug, name, tagline, description, category, icon, price_monthly, status, featured")
        .order("featured", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as Addon[];
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (addons ?? []).forEach((a) => set.add(a.category));
    return ["All", ...Array.from(set).sort()];
  }, [addons]);

  const filtered = useMemo(() => {
    return (addons ?? []).filter(
      (a) =>
        (cat === "All" || a.category.toLowerCase() === cat.toLowerCase()) &&
        (q === "" || a.name.toLowerCase().includes(q.toLowerCase()) || (a.tagline ?? "").toLowerCase().includes(q.toLowerCase()))
    );
  }, [addons, q, cat]);

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="500+ Ecosystem Addons"
        title="Addons Marketplace for Master ERP"
        subtitle="From WhatsApp automated alerts to Tally GST sync and biometric hardware — install what you need in 1-click."
      >
        <div className="w-full max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 500+ addons (e.g. WhatsApp, Biometric, Tally)..."
            className="pl-10 h-12 bg-background border-primary/20 shadow-md text-xs"
          />
        </div>
      </PageHero>

      <section className="py-12 bg-secondary/10 min-h-screen">
        <div className="mx-auto max-w-7xl px-6 space-y-8">
          {/* Category Filter Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b">
            <span className="text-xs font-bold text-muted-foreground shrink-0 uppercase tracking-wider text-[10px] mr-2">Filter Category:</span>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border capitalize ${
                  cat === c
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-secondary text-muted-foreground border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-24 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-mono mt-2">Loading marketplace addons catalog...</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((a) => {
                const CatIcon = getCategoryIcon(a.category, a.name);
                const hasImg = !!(a.icon && (a.icon.startsWith("http") || a.icon.startsWith("data:") || a.icon.startsWith("blob:")));
                
                const currCode = sysConfig?.defaultCurrency || "INR";
                const basePrice = a.price_monthly ?? 0;
                let priceNum = basePrice;
                if (currCode === "USD") priceNum = basePrice === 0 ? 0 : (basePrice > 100 ? Math.round(basePrice / 80) : basePrice);
                else if (currCode === "EUR") priceNum = basePrice === 0 ? 0 : (basePrice > 100 ? Math.round(basePrice / 85) : basePrice);
                else if (currCode === "GBP") priceNum = basePrice === 0 ? 0 : (basePrice > 100 ? Math.round(basePrice / 100) : basePrice);

                const priceFormatted = basePrice === 0 ? "Free" : `${formatSystemAmount(priceNum, sysConfig)}/mo`;

                return (
                  <Card
                    key={a.id}
                    className="hover:border-primary/70 hover:shadow-xl transition-all flex flex-col justify-between bg-card overflow-hidden group border"
                  >
                    {/* Top Thumbnail Banner / Category Icon Graphic Box */}
                    <div className="h-40 bg-gradient-to-br from-primary/10 via-purple-500/10 to-emerald-500/10 border-b relative flex items-center justify-center overflow-hidden">
                      {hasImg ? (
                        <img
                          src={a.icon!}
                          alt={a.name}
                          className="object-cover size-full group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="size-16 rounded-2xl bg-background/80 backdrop-blur-md border shadow-md grid place-items-center text-primary group-hover:scale-110 transition-transform">
                          <CatIcon className="size-8" />
                        </div>
                      )}

                      {/* Category Tag Overlay */}
                      <Badge
                        variant="secondary"
                        className="absolute top-2.5 left-2.5 text-[9px] font-mono font-bold bg-background/90 backdrop-blur-md border shadow-xs capitalize gap-1"
                      >
                        <CatIcon className="size-3 text-primary" /> {a.category || "Extension"}
                      </Badge>

                      {/* Featured Tag Overlay */}
                      {a.featured && (
                        <Badge className="absolute top-2.5 right-2.5 text-[9px] font-mono bg-amber-500 text-white shadow-xs">
                          ★ Featured
                        </Badge>
                      )}
                    </div>

                    {/* Card Content Details */}
                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
                          Category: {a.category || "Extension"}
                        </div>
                        <h3 className="text-sm font-extrabold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {a.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                          {a.tagline || a.description || `Integrate ${a.name} seamlessly into your Master ERP workspace.`}
                        </p>
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between mt-2">
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase font-semibold">Pricing</div>
                          <div className="font-mono text-xs font-extrabold text-emerald-600">{priceFormatted}</div>
                        </div>

                        <Button size="sm" variant="outline" asChild className="h-8 text-[11px] px-3 font-bold border-primary/30 hover:bg-primary hover:text-white transition-all">
                          <Link to="/addons/$slug" params={{ slug: a.slug }}>
                            View details <ArrowRight className="size-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground space-y-3">
              <Puzzle className="size-12 mx-auto text-primary/40" />
              <div className="font-bold text-sm">No addons found matching your search.</div>
              <p className="text-xs">Try selecting "All" categories or search with a different keyword.</p>
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
