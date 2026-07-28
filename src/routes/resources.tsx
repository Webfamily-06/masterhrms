import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { BookOpen, FileText, Newspaper, HelpCircle, ArrowRight, Globe, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/resources")({
  component: ResourcesPage,
  head: () => ({
    meta: [
      { title: "ERP & HRMS Resources, Blogs & Case Studies — Master HRMS" },
      { name: "description", content: "Enterprise cloud ERP guides, customer case studies, blog insights, and API docs." },
      { property: "og:title", content: "Resources — Master HRMS" },
      { property: "og:description", content: "Playbooks, customer success stories, and ERP insights." },
    ],
  }),
});

function ResourcesPage() {
  // Dynamically query real blogs & case studies from Supabase cms_pages
  const { data: cmsArticles } = useQuery({
    queryKey: ["public-resources-articles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("published", true)
        .or("slug.ilike.blog-%,slug.ilike.case-study-%,slug.eq.resource-blogs,slug.eq.resource-case-studies")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const blogs = (cmsArticles || []).filter((a) => a.slug.startsWith("blog-") || a.slug === "resource-blogs");
  const caseStudies = (cmsArticles || []).filter((a) => a.slug.startsWith("case-study-") || a.slug === "resource-case-studies");

  // Fallback items if database is empty initially
  const defaultBlogs = [
    { title: "Modern Cloud ERP Transformation Trends in 2026", tag: "ERP Systems", slug: "blog-erp-transformation", read: "6 min" },
    { title: "AI-Powered Global Payroll & Tax Automation", tag: "Payroll", slug: "blog-ai-payroll", read: "8 min" },
    { title: "OKRs vs KPIs: Scaling Enterprise Performance", tag: "Performance", slug: "solution-okr", read: "5 min" },
  ];

  const defaultCaseStudies = [
    { company: "Apex Manufacturing Group", result: "Cut payroll processing time by 68% across 14 plants", slug: "case-study-manufacturing-scale" },
    { company: "Nova Health System", result: "Automated 24×7 geo-attendance for 3,200 staff", slug: "industry-healthcare" },
    { company: "Zenith Retail Cloud", result: "Unified 140 multi-location stores on one cloud ERP", slug: "industry-retail" },
  ];

  const guides = [
    { title: "Enterprise ERP & HR Compliance Checklist 2026", type: "PDF · 24 pages" },
    { title: "Multi-Currency Payroll Setup Playbook", type: "Playbook" },
    { title: "Performance Review & OKR Cascades", type: "Toolkit" },
    { title: "Employee Master Directory Setup Guide", type: "Template" },
  ];

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
                  Inspect og:title, og:description, and og:image tags for any webpage link with CORS proxy support.
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
              {blogs.length > 0 ? `${blogs.length} Live Articles` : "Dynamic Supabase Stream"}
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogs.length > 0
              ? blogs.map((b) => {
                  const contentObj = (b.content as any) || {};
                  const cover = contentObj.coverImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80";
                  return (
                    <Link
                      key={b.id}
                      to={`/p/${b.slug}` as any}
                      className="group rounded-xl border bg-card overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-[16/9] relative bg-secondary/40 overflow-hidden">
                        <img src={cover} alt={b.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                            {b.meta_description || contentObj.hero?.subtitle || "Read full article..."}
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
                      <Badge className="w-fit bg-primary/90 text-primary-foreground text-[10px]">{b.tag}</Badge>
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
                  const cover = contentObj.coverImage || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80";
                  return (
                    <Link key={cs.id} to={`/p/${cs.slug}` as any} className="group rounded-xl border bg-card overflow-hidden hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between">
                      <div className="aspect-[16/9] relative bg-secondary/40 overflow-hidden">
                        <img src={cover} alt={cs.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <Badge variant="outline" className="absolute bottom-3 left-3 text-[10px] font-mono bg-emerald-500/90 text-white border-none">
                          {contentObj.industry || "Success Story"}
                        </Badge>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="text-xs font-bold text-primary mb-1">{contentObj.clientCompany || cs.title}</div>
                          <h3 className="font-bold text-base group-hover:text-primary transition-colors leading-snug">{cs.title}</h3>
                          <p className="text-xs text-emerald-600 font-semibold mt-2 line-clamp-2">{cs.meta_description || contentObj.roiResult || "Transformed enterprise operations..."}</p>
                        </div>
                        <div className="pt-2 border-t text-xs font-semibold text-primary flex items-center gap-1">
                          Read Case Study <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              : defaultCaseStudies.map((c) => (
                  <Link key={c.company} to={`/p/${c.slug}` as any} className="group p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/40 transition-all space-y-3">
                    <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Success Story
                    </Badge>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{c.company}</h3>
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
            {guides.map((g) => (
              <div key={g.title} className="p-5 rounded-xl border bg-card space-y-3 hover:border-primary/30 transition-all">
                <div className="text-xs font-semibold text-muted-foreground font-mono">{g.type}</div>
                <h3 className="font-semibold text-sm leading-snug">{g.title}</h3>
                <Button variant="outline" size="sm" className="w-full text-xs">Download Playbook</Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
