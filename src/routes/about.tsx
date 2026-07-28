import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Users, Rocket, Globe, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — Master HRMS" },
      { name: "description", content: "Master HRMS is on a mission to modernize HR for growing companies worldwide." },
      { property: "og:title", content: "About — Master HRMS" },
      { property: "og:description", content: "Our mission, values, and team." },
    ],
  }),
});

const values = [
  { icon: Users, title: "People first", desc: "We build for HR teams and the people they serve every day." },
  { icon: Rocket, title: "Ship fast", desc: "Weekly releases, monthly modules, quarterly leaps." },
  { icon: Globe, title: "Global by default", desc: "Localized for 40+ countries out of the box." },
  { icon: Heart, title: "Craft matters", desc: "Beautiful, fast software that HR teams love using." },
];

const stats = [
  { v: "2020", l: "Founded" },
  { v: "180+", l: "Team members" },
  { v: "1,200+", l: "Customers" },
  { v: "10k+", l: "Employees managed" },
];

function AboutPage() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="About us"
        title="Modernizing HR for growing companies"
        subtitle="Master HRMS is on a mission to make HR effortless for teams of every size, in every industry, everywhere."
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl border bg-card p-6 text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">{s.v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 border-t bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Our values</h2>
            <p className="mt-4 text-muted-foreground">
              We're a team of engineers, designers, and HR practitioners who believe HR software should feel modern,
              fast, and human. These principles guide how we build.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border bg-card p-6">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <v.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Made across the world</h2>
          <p className="mt-4 text-muted-foreground">
            Our distributed team spans 12 countries and serves customers in 40+. We believe great HR software should
            work as well in Bengaluru as in Berlin.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
