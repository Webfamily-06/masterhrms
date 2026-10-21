'use client';
import {  createFileRoute, redirect  } from "@/src/lib/router-compat";
import { isTenantWorkspaceHost } from "@/lib/platform-domain";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { useAppConfig } from "@/lib/useAppConfig";

const Route = createFileRoute("/cms/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && isTenantWorkspaceHost()) {
      throw redirect({ to: "/auth" });
    }
  },
  component: CmsIndexPage,
});

function CmsIndexPage() {
  const { appConfig } = useAppConfig();
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Platform CMS"
        title={`${appConfig.appName} Content Hub`}
        subtitle="Authoritative Platform Content Management Portal."
      />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="p-6 rounded-xl border border-border-color bg-card text-card-foreground shadow-sm">
          <h2 className="text-xl font-bold mb-2">Platform CMS Overview</h2>
          <p className="text-muted-foreground text-sm">
            Content management studio operating under Platform branding.
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}

export default CmsIndexPage;
