'use client';
import {  createFileRoute, Link  } from "@/src/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import {
  BookOpen,
  FileText,
  Newspaper,
  HelpCircle,
  ArrowRight,
  Globe,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Route = createFileRoute("/resources")({
  component: ResourcesPage,
  head: () => ({
    meta: [
      { title: "ERP & HRMS Resources, Blogs & Case Studies — Master HRMS" },
      {
        name: "description",
        content: "Enterprise cloud ERP guides, customer case studies, blog insights, and API docs.",
      },
      { property: "og:title", content: "Resources — Master HRMS" },
      {
        property: "og:description",
        content: "Playbooks, customer success stories, and ERP insights.",
      },
    ],
  }),
});

function ResourcesPage() {
  // Dynamically query real blogs & case studies from MySQL API
  const { data: cmsArticles = [] } = useQuery({
    queryKey: ["public-resources-articles"],
    queryFn: async () => {
      try {
        const pages = await api.get("/cms/pages");
        return Array.isArray(pages) ? pages : [];
      } catch {
        return [];
      }
    },
  });

  const blogs = (cmsArticles || []).filter(
    (a) => a.slug.startsWith("blog-") || a.slug === "resource-blogs",
  );
  const caseStudies = (cmsArticles || []).filter(
    (a) => a.slug.startsWith("case-study-") || a.slug === "resource-case-studies",
  );

  // Fallback items if database is empty initially
  const defaultBlogs = [
    {
      title: "Modern Cloud ERP Transformation Trends in 2026",
      tag: "ERP Systems",
      slug: "blog-erp-transformation",
      read: "6 min",
    },
    {
      title: "AI-Powered Global Payroll & Tax Automation",
      tag: "Payroll",
      slug: "blog-ai-payroll",
      read: "8 min",
    },
    {
      title: "OKRs vs KPIs: Scaling Enterprise Performance",
      tag: "Performance",
      slug: "solution-okr",
      read: "5 min",
    },
  ];

  const defaultCaseStudies = [
    {
      company: "Apex Manufacturing Group",
      result: "Cut payroll processing time by 68% across 14 plants",
      slug: "case-study-manufacturing-scale",
    },
    {
      company: "Nova Health System",
      result: "Automated 24×7 geo-attendance for 3,200 staff",
      slug: "industry-healthcare",
    },
    {
      company: "Zenith Retail Cloud",
      result: "Unified 140 multi-location stores on one cloud ERP",
      slug: "industry-retail",
    },
  ];

  const DEFAULT_GUIDES = [
    {
      id: "guide-1",
      slug: "enterprise-erp-compliance-checklist-2026",
      title: "Enterprise ERP & HR Compliance Checklist 2026",
      description: "Complete statutory audit and labor compliance checklist for multinational enterprises.",
      category: "Compliance",
      type: "PDF · 24 pages",
      downloadUrl: "/downloads/enterprise-erp-compliance-checklist-2026.pdf",
      coverImage: "/images/resources/guide-compliance.jpg",
      coverImageAlt: "ERP Compliance Checklist",
      order: 1,
      isActive: true,
    },
    {
      id: "guide-2",
      slug: "multi-currency-payroll-setup-playbook",
      title: "Multi-Currency Payroll Setup Playbook",
      description: "Step-by-step implementation guide for multi-country salary structures, FX conversion, and tax deductions.",
      category: "Payroll",
      type: "Playbook · 18 pages",
      downloadUrl: "/downloads/multi-currency-payroll-setup-playbook.pdf",
      coverImage: "/images/resources/guide-payroll.jpg",
      coverImageAlt: "Multi-Currency Payroll Playbook",
      order: 2,
      isActive: true,
    },
    {
      id: "guide-3",
      slug: "performance-review-okr-cascades",
      title: "Performance Review & OKR Cascades",
      description: "Strategic framework for cascading corporate OKRs into quarterly departmental goals and reviews.",
      category: "Performance",
      type: "Toolkit · 12 pages",
      downloadUrl: "/downloads/performance-review-okr-cascades.pdf",
      coverImage: "/images/resources/guide-okr.jpg",
      coverImageAlt: "OKR Performance Review Toolkit",
      order: 3,
      isActive: true,
    },
    {
      id: "guide-4",
      slug: "employee-master-directory-setup-guide",
      title: "Employee Master Directory Setup Guide",
      description: "Best practices for configuring single source of truth employee directories, custom schemas, and role permissions.",
      category: "Core HR",
      type: "Template · 15 pages",
      downloadUrl: "/downloads/employee-master-directory-setup-guide.pdf",
      coverImage: "/images/resources/guide-directory.jpg",
      coverImageAlt: "Employee Directory Setup Guide",
      order: 4,
      isActive: true,
    },
  ];

  const { data: guides = DEFAULT_GUIDES } = useQuery({
    queryKey: ["public-resource-guides"],
    queryFn: async () => {
      try {
        const res = await api.get("/cms/guides");
        return Array.isArray(res) && res.length > 0 ? res : DEFAULT_GUIDES;
      } catch {
        return DEFAULT_GUIDES;
      }
    },
  });

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Resources & Insights"
        title="Learn, scale, and transform with Master ERP & HRMS"
        subtitle="Enterprise playbooks, real customer success stories, and technical insights to help you run a modern cloud enterprise."
      />

      {/* Developer Tool Banner */}
      <section className="pt-8 pb-4">
        <div className="mx-auto max-w-7xl px-6">
          <Card className="bg-gradient-to-r from-primary/10 via-background to-secondary border-primary/30 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                  <Sparkles className="size-3.5" /> Developer Tools & Open Graph
                </div>
                <h3 className="text-xl font-bold">Open Graph Meta Tag Fetcher & Previewer</h3>
                <p className="text-sm text-muted-foreground">
                  Inspect og:title, og:description, and og:image tags for any webpage link with CORS
                  proxy support.
                </p>
              </div>
              <Button asChild size="lg" className="shrink-0 gap-2">
                <Link to="/og-preview">
                  Try OG Previewer <Globe className="size-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* DYNAMIC BLOGS & INSIGHTS SECTION */}
      <section id="blog" className="py-16 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between mb-8 border-b pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <BookOpen className="size-4" /> Editorial Insights
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Latest ERP & HR Blogs</h2>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {blogs.length > 0 ? `${blogs.length} Live Articles` : "Dynamic MySQL Stream"}
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogs.length > 0
              ? blogs.map((b) => {
                  const contentObj = (b.content as any) || {};
                  const cover =
                    contentObj.coverImage || "";
                  return (
                    <Link
                      key={b.id}
                      to={`/p/${b.slug}` as any}
                      className="group rounded-xl border bg-card overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-[16/9] relative bg-secondary/40 overflow-hidden">
                        <img
                          src={cover}
                          alt={b.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                         loading="lazy"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <Badge className="absolute bottom-3 left-3 bg-primary/90 text-primary-foreground text-[10px]">
                          {contentObj.category || "ERP Systems"}
                        </Badge>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h3 className="font-bold text-base group-hover:text-primary transition-colors leading-snug">
                            {b.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                            {b.meta_description ||
                              contentObj.hero?.subtitle ||
                              "Read full article..."}
                          </p>
                        </div>
                        <div className="pt-2 border-t flex items-center justify-between text-xs text-primary font-semibold">
                          <span>Read full article</span>
                          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              : defaultBlogs.map((b) => (
                  <Link
                    key={b.title}
                    to={`/p/${b.slug}` as any}
                    className="group rounded-xl border bg-card overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 via-secondary to-primary/10 p-6 flex flex-col justify-end">
                      <Badge className="w-fit bg-primary/90 text-primary-foreground text-[10px]">
                        {b.tag}
                      </Badge>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-bold text-base group-hover:text-primary transition-colors leading-snug">
                          {b.title}
                        </h3>
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between text-xs text-primary font-semibold">
                        <span>Read article · {b.read}</span>
                        <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* DYNAMIC CASE STUDIES SECTION */}
      <section id="case-studies" className="py-16 border-t bg-secondary/30 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between mb-8 border-b pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Newspaper className="size-4" /> Customer Stories
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Enterprise Case Studies</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {caseStudies.length > 0
              ? caseStudies.map((cs) => {
                  const contentObj = (cs.content as any) || {};
                  const cover =
                    contentObj.coverImage || "";
                  return (
                    <Link
                      key={cs.id}
                      to={`/p/${cs.slug}` as any}
                      className="group rounded-xl border bg-card overflow-hidden hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-[16/9] relative bg-secondary/40 overflow-hidden">
                        <img
                          src={cover}
                          alt={cs.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                         loading="lazy"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <Badge
                          variant="outline"
                          className="absolute bottom-3 left-3 text-[10px] font-mono bg-emerald-500/90 text-white border-none"
                        >
                          {contentObj.industry || "Success Story"}
                        </Badge>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="text-xs font-bold text-primary mb-1">
                            {contentObj.clientCompany || cs.title}
                          </div>
                          <h3 className="font-bold text-base group-hover:text-primary transition-colors leading-snug">
                            {cs.title}
                          </h3>
                          <p className="text-xs text-emerald-600 font-semibold mt-2 line-clamp-2">
                            {cs.meta_description ||
                              contentObj.roiResult ||
                              "Transformed enterprise operations..."}
                          </p>
                        </div>
                        <div className="pt-2 border-t text-xs font-semibold text-primary flex items-center gap-1">
                          Read Case Study{" "}
                          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              : defaultCaseStudies.map((c) => (
                  <Link
                    key={c.company}
                    to={`/p/${c.slug}` as any}
                    className="group p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/40 transition-all space-y-3"
                  >
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    >
                      Success Story
                    </Badge>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {c.company}
                    </h3>
                    <p className="text-xs text-emerald-600 font-bold">{c.result}</p>
                    <div className="pt-2 text-xs font-semibold text-primary flex items-center gap-1">
                      Read Case Study <ArrowRight className="size-3.5" />
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* DOWNLOADABLE PLAYBOOKS & GUIDES */}
      <section id="guides" className="py-16 border-t scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <FileText className="size-4" /> Playbooks
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Playbooks and Templates</h2>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {guides.map((g: any) => (
              <div
                key={g.id || g.slug || g.title}
                className="p-5 rounded-xl border bg-card flex flex-col justify-between space-y-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground font-mono">
                      {g.type || "PDF"}
                    </span>
                    {g.category && (
                      <Badge variant="outline" className="text-[10px] font-medium bg-primary/5 text-primary border-primary/20">
                        {g.category}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2">{g.title}</h3>
                  {g.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {g.description}
                    </p>
                  )}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full text-xs gap-1.5 mt-auto">
                  <a
                    href={g.downloadUrl || "#"}
                    target={g.downloadUrl?.startsWith("http") ? "_blank" : undefined}
                    rel={g.downloadUrl?.startsWith("http") ? "noopener noreferrer" : undefined}
                    download
                  >
                    <FileText className="size-3.5" /> Download {g.type?.includes("PDF") ? "PDF" : "Playbook"}
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export default ResourcesPage;
