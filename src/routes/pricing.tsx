import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Check, X, Sparkles } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Transparent Pricing — Master ERP & HRMS" },
      {
        name: "description",
        content: "Simple, transparent per-employee pricing for Master ERP & Autonomous HRMS.",
      },
    ],
  }),
});

export function PricingPage() {
  const [yearly, setYearly] = useState(true);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const currencyCode = sysConfig?.defaultCurrency || "INR";
  const isUSD = currencyCode === "USD";
  const isEUR = currencyCode === "EUR";
  const isGBP = currencyCode === "GBP";

  let starterMonthly = 249;
  let starterYearly = 199;
  let growthMonthly = 499;
  let growthYearly = 399;

  if (isUSD) {
    starterMonthly = 24;
    starterYearly = 19;
    growthMonthly = 59;
    growthYearly = 49;
  } else if (isEUR) {
    starterMonthly = 22;
    starterYearly = 18;
    growthMonthly = 55;
    growthYearly = 45;
  } else if (isGBP) {
    starterMonthly = 19;
    starterYearly = 15;
    growthMonthly = 49;
    growthYearly = 39;
  }

  const plans = [
    {
      name: "Starter Cloud",
      price: { monthly: starterMonthly, yearly: starterYearly },
      tag: "Small Teams",
      desc: "For teams getting started with modern ERP & HRMS.",
      features: [
        "Core HR & Employee Directory",
        "Biometric Attendance & Leave",
        "Employee Self-Service Portal",
        "Standard Email Support",
        "Up to 50 Employees",
      ],
      excluded: ["General Ledger", "Global Multi-Currency Payroll", "Recruitment ATS"],
    },
    {
      name: "Growth Enterprise",
      price: { monthly: growthMonthly, yearly: growthYearly },
      tag: "Most Popular",
      popular: true,
      desc: "Complete 16-Module HRM Suite, Advanced Accounting & 500+ Addons.",
      features: [
        "Everything in Starter Cloud",
        "Financials & General Ledger",
        "Global Automated Payroll & Payslips",
        "Recruitment (ATS) Pipeline",
        "Visual CMS Studio 2.0",
        "500+ Ecosystem Addons",
        "Priority 24/7 SLA Support",
      ],
      excluded: ["Dedicated Private Database Pod"],
    },
    {
      name: "Sovereign Cluster",
      price: { monthly: null, yearly: null },
      tag: "Custom Cloud",
      desc: "Dedicated single-tenant infrastructure with custom compliance.",
      features: [
        "Everything in Growth Enterprise",
        "Dedicated MySQL 8.0 Pod",
        "Custom Single-Sign-On (SAML/Okta)",
        "Custom Workflows & ERP Rules",
        "Dedicated Technical Account Manager",
        "99.999% SLA Uptime Guarantee",
      ],
      excluded: [],
    },
  ];

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Pricing Matrix"
        title={`Predictable, scalable pricing in ${currencyCode} (${sysConfig?.currencySymbol || "₹"})`}
        subtitle="Experience the full power of Master ERP with flexible monthly or discounted annual billing."
      >
        <div className="inline-flex rounded-2xl border border-border/80 bg-card p-1 text-sm shadow-xs">
          <button
            onClick={() => setYearly(false)}
            className={`px-5 py-2 rounded-xl font-bold transition-all ${
              !yearly ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-5 py-2 rounded-xl font-bold inline-flex items-center gap-2 transition-all ${
              yearly ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual Billing{" "}
            <span className="text-[10px] rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 font-mono font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-8 grid-cols-1 md:grid-cols-3">
          {plans.map((p) => {
            const rawVal = yearly ? p.price.yearly : p.price.monthly;
            const formattedPrice =
              rawVal !== null ? formatSystemAmount(rawVal, sysConfig) : "Custom";

            return (
              <div
                key={p.name}
                className={`p-8 rounded-3xl flex flex-col justify-between transition-all ${
                  p.popular
                    ? "bg-card border-2 border-primary shadow-2xl relative"
                    : "bg-card border border-border/80 shadow-xs hover:border-primary/50"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider shadow-md">
                    Most Popular Tier
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      {p.tag}
                    </span>
                  </div>
                  <h3 className="mt-2 text-2xl font-black text-foreground">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                  <div className="mt-6">
                    {p.price.monthly === null ? (
                      <div className="text-4xl font-black text-foreground">Custom Quote</div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black font-mono text-foreground">{formattedPrice}</span>
                        <span className="text-muted-foreground text-xs font-medium"> / employee / mo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    to={p.name === "Sovereign Cluster" ? "/contact" : "/auth"}
                    search={p.name === "Sovereign Cluster" ? undefined : ({ mode: "signup" } as never)}
                    className="block"
                  >
                    <Button
                      className={`w-full font-bold h-11 rounded-xl ${
                        p.popular
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "border-border hover:bg-muted"
                      }`}
                      variant={p.popular ? "default" : "outline"}
                    >
                      {p.name === "Sovereign Cluster" ? "Contact Enterprise Sales" : "Start Free Sandbox"}
                    </Button>
                  </Link>

                  <ul className="mt-8 space-y-3 border-t border-border/60 pt-6 text-xs text-foreground font-medium">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5 items-start">
                        <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                    {p.excluded.map((f) => (
                      <li key={f} className="flex gap-2.5 items-start text-muted-foreground/60">
                        <X className="size-4 shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </MarketingLayout>
  );
}


