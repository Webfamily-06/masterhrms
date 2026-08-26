import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Users, Rocket, Globe, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Us — Master ERP & HRMS" },
      {
        name: "description",
        content: "Master ERP is on a mission to modernize enterprise software for growing companies worldwide.",
      },
    ],
  }),
});

const values = [
  {
    icon: Users,
    title: "People First",
    desc: "We build for growing organizations and the people they empower every single day.",
  },
  {
    icon: Rocket,
    title: "High Velocity",
    desc: "Autonomous releases, sub-second latency, and continuous performance optimization.",
  },
  {
    icon: Globe,
    title: "Global by Default",
    desc: "Multi-currency, localized tax engines, and distributed clusters in 5 global regions.",
  },
  {
    icon: Heart,
    title: "Craft & Ergonomics",
    desc: "Enterprise software should inspire. Modern interfaces designed with intuitive ergonomics.",
  },
];

const stats = [
  { v: "2020", l: "Engine Founded" },
  { v: "180+", l: "Core Contributors" },
  { v: "1,200+", l: "Global Enterprises" },
  { v: "50,000+", l: "Workforce Managed" },
];

function AboutPage() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Our Mission & Philosophy"
        title="Building the unified operating system for modern business"
        subtitle="Master ERP is on a mission to unify workforce management, point of sale, accounting, and 500+ ecosystem plugins inside an inspiring, reliable cloud platform."
      />

      {/* Metrics Row */}
      <section className="py-16 border-b bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.l} className="p-6 text-center rounded-3xl border border-border/80 bg-card shadow-xs">
              <div className="text-3xl md:text-4xl font-black font-mono text-primary">{s.v}</div>
              <div className="mt-1 text-xs font-semibold text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Principles */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline" className="text-xs font-mono px-3 py-1">
              Operating Values
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">&quot;Culture is what you do, not what you say.&quot;</h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              We believe manager capability is the primary driver of organizational engagement, and growth is a retention lever.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="p-6 rounded-3xl border border-border/80 bg-card shadow-xs hover:border-primary/50 hover:shadow-md transition-all">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
                  <v.icon className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{v.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}


