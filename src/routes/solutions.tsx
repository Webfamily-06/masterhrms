import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Building2, Factory, HeartPulse, ShoppingBag, Landmark, School, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/solutions")({
  component: SolutionsPage,
  head: () => ({
    meta: [
      { title: "Solutions by industry — Master HRMS" },
      { name: "description", content: "Master HRMS tailored for IT, Manufacturing, Healthcare, Retail, BFSI, and Education." },
      { property: "og:title", content: "Solutions by industry — Master HRMS" },
      { property: "og:description", content: "HR built for your industry's workflows and compliance." },
    ],
  }),
});

const industries = [
  { id: "it", icon: Building2, title: "IT & Software", desc: "Distributed teams, contractor management, and rapid hiring.",
    highlights: ["Remote-first attendance", "Contractor & vendor onboarding", "Certification tracking for tech skills", "Fast, high-volume recruitment"] },
  { id: "manufacturing", icon: Factory, title: "Manufacturing", desc: "Shift rosters, statutory compliance, and shop-floor attendance.",
    highlights: ["Rotational shifts & overtime", "Biometric device integration", "Factories Act compliance", "Safety training via LMS"] },
  { id: "healthcare", icon: HeartPulse, title: "Healthcare", desc: "Rosters, credentials, and 24×7 workforce scheduling.",
    highlights: ["Credential & license expiry alerts", "24×7 shift roster", "On-call & standby pay", "Mandatory training compliance"] },
  { id: "retail", icon: ShoppingBag, title: "Retail", desc: "Multi-location workforce, seasonal hiring, and mobile-first HR.",
    highlights: ["Store-level attendance", "Seasonal & temp staff", "Mobile-first self-service", "Sales incentive payroll"] },
  { id: "bfsi", icon: Landmark, title: "BFSI", desc: "Audit-ready HR with strong security and role-based controls.",
    highlights: ["Detailed audit logs", "SSO / SAML", "Role-based access control", "Regulatory training"] },
  { id: "education", icon: School, title: "Education", desc: "Faculty, staff, and academic-year workflows in one system.",
    highlights: ["Academic-year leave policies", "Faculty appraisals", "Substitution management", "Payroll for allowances"] },
];

function SolutionsPage() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Solutions"
        title="HR built for your industry"
        subtitle="Master HRMS adapts to the workflows, compliance, and scale of your sector."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {industries.map((i) => (
            <div key={i.id} id={i.id} className="rounded-2xl border bg-card p-6 scroll-mt-24 hover:shadow-md hover:border-primary/30 transition-all">
              <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <i.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{i.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{i.desc}</p>
              <ul className="mt-4 space-y-2">
                {i.highlights.map((h) => (
                  <li key={h} className="flex gap-2 items-start text-sm">
                    <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" /> {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 border-t bg-secondary/40">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Not sure which fits you?</h2>
          <p className="mt-4 text-muted-foreground">Talk to our team — we'll map Master HRMS to your industry's playbook.</p>
          <div className="mt-8">
            <Link to="/contact"><Button size="lg" className="gap-2">Talk to sales <ArrowRight className="size-4" /></Button></Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
