import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import {
  Users, Wallet, Clock, CalendarCheck, UserPlus, Target, GraduationCap, LifeBuoy,
  ArrowRight, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/product")({
  component: ProductPage,
  head: () => ({
    meta: [
      { title: "Product — Master HRMS" },
      { name: "description", content: "Explore all Master HRMS modules: Core HR, Payroll, Attendance, Leave, Recruitment, Performance, LMS, and Helpdesk." },
      { property: "og:title", content: "Product — Master HRMS" },
      { property: "og:description", content: "Eight integrated modules for the entire employee lifecycle." },
    ],
  }),
});

const modules = [
  {
    id: "core-hr", icon: Users, title: "Core HR",
    desc: "The single source of truth for your people data.",
    features: ["Employee master & documents", "Org chart & departments", "Lifecycle events (onboarding, transfers, exits)", "Custom fields & workflows", "Employee self-service portal"],
  },
  {
    id: "payroll", icon: Wallet, title: "Payroll",
    desc: "Statutory-ready payroll with automated pay runs.",
    features: ["Salary structures & CTC", "Automated tax, PF, ESI, PT", "Payslip generation & delivery", "Reimbursements & bonuses", "Year-end filings & Form 16"],
  },
  {
    id: "attendance", icon: Clock, title: "Attendance",
    desc: "Track time across web, mobile, biometric, and geo-fence.",
    features: ["Web & mobile clock-in", "Shift rosters & swaps", "Geo-fenced attendance", "Biometric device sync", "Overtime & regularization"],
  },
  {
    id: "leave", icon: CalendarCheck, title: "Leave",
    desc: "Policies, balances, and approval flows made simple.",
    features: ["Configurable leave policies", "Accrual & carry-forward rules", "Team calendars & holiday lists", "Multi-level approvals", "Leave encashment"],
  },
  {
    id: "recruitment", icon: UserPlus, title: "Recruitment",
    desc: "Applicant tracking from job post to offer letter.",
    features: ["Career site & job posts", "Candidate pipeline & Kanban", "Interview scheduling", "Feedback & scorecards", "Offer letters & onboarding handoff"],
  },
  {
    id: "performance", icon: Target, title: "Performance",
    desc: "Continuous performance across OKRs, reviews, and 1:1s.",
    features: ["OKR & goal management", "360° reviews & self-appraisals", "1:1 meeting notes", "Continuous feedback", "9-box talent grid"],
  },
  {
    id: "lms", icon: GraduationCap, title: "LMS",
    desc: "Build a learning culture with a native LMS.",
    features: ["Courses & learning paths", "Quizzes & certifications", "SCORM & video support", "Deadline reminders", "Learning analytics"],
  },
  {
    id: "helpdesk", icon: LifeBuoy, title: "Helpdesk",
    desc: "An internal helpdesk that employees actually use.",
    features: ["Categorized ticketing", "SLA & escalation rules", "Knowledge base", "Satisfaction ratings", "Reporting & dashboards"],
  },
];

function ProductPage() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Product"
        title="Everything HR, in one place"
        subtitle="Eight tightly integrated modules replace the patchwork of tools your HR team uses today."
      >
        <Link to="/auth" search={{ mode: "signup" } as never}>
          <Button size="lg" className="gap-2">Start free trial <ArrowRight className="size-4" /></Button>
        </Link>
        <Link to="/pricing"><Button size="lg" variant="outline">See pricing</Button></Link>
      </PageHero>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-24">
          {modules.map((m, i) => (
            <div key={m.id} id={m.id} className={`grid lg:grid-cols-2 gap-12 items-center scroll-mt-24 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <m.icon className="size-6" />
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight">{m.title}</h2>
                <p className="mt-3 text-lg text-muted-foreground">{m.desc}</p>
                <ul className="mt-6 space-y-2.5">
                  {m.features.map((f) => (
                    <li key={f} className="flex gap-2.5 items-start">
                      <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-secondary/40 aspect-[4/3] p-8 grid place-items-center">
                <m.icon className="size-32 text-primary/40" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 border-t bg-secondary/40">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">See Master HRMS in action</h2>
          <p className="mt-4 text-muted-foreground">Book a personalized demo with our HR product experts.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/contact"><Button size="lg">Book a demo</Button></Link>
            <Link to="/auth" search={{ mode: "signup" } as never}><Button size="lg" variant="outline">Start free</Button></Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
