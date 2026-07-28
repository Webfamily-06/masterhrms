import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/legal/$slug")({
  component: LegalPage,
});

function LegalPage() {
  const { slug } = Route.useParams();
  const cmsSlug = `legal-${slug}`;
  const { data, isLoading } = useQuery({
    queryKey: ["cms-page", cmsSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("title, meta_description, content")
        .eq("slug", cmsSlug)
        .eq("published", true)
        .maybeSingle();
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

  if (!data) {
    return (
      <MarketingLayout>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Legal document not found</h1>
        </div>
      </MarketingLayout>
    );
  }

  const body = ((data.content ?? {}) as { body?: string }).body ?? "";

  return (
    <MarketingLayout>
      <PageHero eyebrow="Legal" title={data.title} subtitle={data.meta_description ?? undefined} />
      <section className="py-14">
        <article className="mx-auto max-w-3xl px-6 prose prose-neutral">
          <p className="whitespace-pre-line text-muted-foreground leading-relaxed">{body}</p>
        </article>
      </section>
    </MarketingLayout>
  );
}
