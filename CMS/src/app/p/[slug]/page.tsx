'use client';
import {  createFileRoute, notFound  } from "@/src/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { DynamicTemplateRenderer } from "@/components/cms/dynamic-template-renderer";
import { Loader2 } from "lucide-react";

const Route = createFileRoute("/p/$slug")({
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
      try {
        const page = await api.get(`/cms/pages/${slug}`);
        if (!page) throw notFound();
        return page;
      } catch {
        throw notFound();
      }
    },
  });

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
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

  return (
    <MarketingLayout>
      <div className="pt-8">
        <DynamicTemplateRenderer content={content} fallbackTitle={data.title} />
      </div>
    </MarketingLayout>
  );
}

export default CmsPage;
