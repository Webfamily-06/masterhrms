import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/p/$slug")({
  component: CmsPage,
});

type Content = {
  hero?: { eyebrow?: string; title?: string; subtitle?: string };
  body?: string;
  sections?: { title: string; body: string }[];
  vendors?: { name: string; us?: boolean; notes?: string }[];
};

function CmsPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("title, meta_description, content, published")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      </MarketingLayout>
    );
  }

  if (error || !data) {
    return (
      <MarketingLayout>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Page not found</h1>
          <p className="mt-3 text-muted-foreground">The page you requested does not exist yet.</p>
        </div>
      </MarketingLayout>
    );
  }

  const content = (data.content ?? {}) as Content;
  const title = content.hero?.title ?? data.title;
  const subtitle = content.hero?.subtitle;
  const eyebrow = content.hero?.eyebrow;

  return (
    <MarketingLayout>
      <PageHero eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <section className="py-14">
        <div className="mx-auto max-w-4xl px-6 space-y-8">
          {content.body && <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">{content.body}</p>}

          {content.sections && content.sections.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {content.sections.map((s) => (
                <div key={s.title} className="rounded-xl border bg-card p-6">
                  <h3 className="font-semibold text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          )}

          {content.vendors && content.vendors.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="text-left p-3">Vendor</th>
                    <th className="text-left p-3">Notes</th>
                    <th className="text-left p-3">Recommended</th>
                  </tr>
                </thead>
                <tbody>
                  {content.vendors.map((v) => (
                    <tr key={v.name} className="border-t">
                      <td className="p-3 font-medium">{v.name}</td>
                      <td className="p-3 text-muted-foreground">{v.notes}</td>
                      <td className="p-3">{v.us ? <span className="text-primary font-semibold">✓ Us</span> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
