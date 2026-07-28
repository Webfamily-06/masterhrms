import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Check, X, Sparkles } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Master ERP & HRMS" },
      { name: "description", content: "Simple, per-employee pricing for Master ERP & HRMS. Start free, scale as you grow." },
      { property: "og:title", content: "Pricing — Master ERP & HRMS" },
      { property: "og:description", content: "Transparent per-employee pricing. Start free." },
    ],
  }),
});

export function PricingPage() {
  const [yearly, setYearly] = useState(true);

  // REALTIME SYSTEM SETTINGS QUERY FROM SUPER ADMIN PANEL
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "system-platform-settings")
        .maybeSingle();
      return data?.content as any;
    },
  });

  const currencyCode = sysConfig?.defaultCurrency || "INR";
  const isUSD = currencyCode === "USD";
  const isEUR = currencyCode === "EUR";
  const isGBP = currencyCode === "GBP";

  // Base pricing scaling depending on selected global currency
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
      name: "Starter",
      price: { monthly: starterMonthly, yearly: starterYearly },
      tag: "Small teams",
      desc: "For teams getting started with modern ERP & HRMS.",
      features: ["Core HR & directory", "Attendance & leave", "Employee self-service", "Email support", "Up to 50 employees"],
      excluded: ["Financials", "Global Payroll", "Recruitment", "Performance"],
    },
    {
      name: "Growth",
      price: { monthly: growthMonthly, yearly: growthYearly },
      tag: "Most popular",
      popular: true,
      desc: "Everything a growing enterprise team needs.",
      features: ["Everything in Starter", "Financials & Accounting", "Global Payroll & payslips", "Recruitment (ATS)", "Performance & OKRs", "Helpdesk", "Priority support"],
      excluded: ["Dedicated CSM"],
    },
    {
      name: "Enterprise",
      price: { monthly: null, yearly: null },
      tag: "Custom",
      desc: "Advanced controls for large organizations.",
      features: ["Everything in Growth", "Supply Chain & Inventory", "CRM & Sales Pipeline", "Custom ERP Workflows", "Dedicated CSM", "SLA & audit logs"],
      excluded: [],
    },
  ];

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Pricing Plans"
        title={`Simple, per-employee pricing in ${currencyCode} (${sysConfig?.currencySymbol || "₹"})`}
        subtitle="Only pay for what you use. Cancel or downgrade anytime."
      >
        <div className="inline-flex rounded-lg border bg-background p-1 text-sm shadow-sm">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 py-1.5 rounded-md font-semibold transition-all ${!yearly ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-md font-semibold inline-flex items-center gap-2 transition-all ${yearly ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            Yearly <span className="text-[10px] rounded-full bg-emerald-500/20 text-emerald-600 px-2 py-0.5 font-mono font-bold">-20%</span>
          </button>
        </div>
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-6 grid-cols-1 md:grid-cols-3">
          {plans.map((p) => {
            const rawVal = yearly ? p.price.yearly : p.price.monthly;
            const formattedPrice = rawVal !== null ? formatSystemAmount(rawVal, sysConfig) : "Custom";

            return (
              <div
                key={p.name}
                className={`rounded-2xl border bg-card p-8 flex flex-col hover:border-primary/50 transition-all ${
                  p.popular ? "border-primary ring-2 ring-primary/20 shadow-xl relative" : ""
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-bold shadow-md">
                    Most popular
                  </div>
                )}
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{p.tag}</div>
                <h3 className="mt-2 text-2xl font-black">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                <div className="mt-6">
                  {p.price.monthly === null ? (
                    <div className="text-4xl font-black">Custom</div>
                  ) : (
                    <>
                      <span className="text-4xl font-black font-mono">{formattedPrice}</span>
                      <span className="text-muted-foreground text-sm font-medium"> / employee / month</span>
                    </>
                  )}
                </div>
                <Link
                  to={p.name === "Enterprise" ? "/contact" : "/auth"}
                  search={p.name === "Enterprise" ? undefined : ({ mode: "signup" } as never)}
                  className="mt-6"
                >
                  <Button className="w-full font-bold h-11" variant={p.popular ? "default" : "outline"}>
                    {p.name === "Enterprise" ? "Contact sales" : "Start free trial"}
                  </Button>
                </Link>
                <ul className="mt-8 space-y-3 flex-1 border-t pt-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 items-start text-sm">
                      <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                  {p.excluded.map((f) => (
                    <li key={f} className="flex gap-2.5 items-start text-sm text-muted-foreground/60">
                      <X className="size-4 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </MarketingLayout>
  );
}
