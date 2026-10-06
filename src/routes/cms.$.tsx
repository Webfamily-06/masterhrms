import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { useAppConfig } from "@/lib/useAppConfig";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/cms/$")({
  component: CmsWildcardPage,
});

function CmsWildcardPage() {
  const params = Route.useParams() as { _splat?: string };
  const slug = params._splat || "overview";
  const { appConfig } = useAppConfig();

  const { data, isLoading } = useQuery({
    queryKey: ["cms-content-page", slug],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/${slug}`);
        if (page) return page;
      } catch {}
      return null;
    },
  });

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Content Management System"
        title={data?.title || `${appConfig.appName} CMS Portal`}
        subtitle={
          data?.content?.hero?.subtitle ||
          `Enterprise Content Hub for /cms/${slug}. This section is rendered with official Platform branding.`
        }
      />
      <div className="mx-auto max-w-5xl px-6 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-border-color bg-card text-card-foreground shadow-sm">
              <h2 className="text-xl font-bold mb-2">CMS Content Stream: {slug}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {data?.content?.body ||
                  `Welcome to the authoritative Content Management System for ${appConfig.appName}. Operating within the Platform identity scope.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </MarketingLayout>
  );
}
