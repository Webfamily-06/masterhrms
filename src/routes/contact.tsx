import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Loader2, Clock, HeadphonesIcon, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact & Architecture Walkthrough — Master ERP & HRMS" },
      { name: "description", content: "Get in touch with the Master ERP engineering and architecture team." },
    ],
  }),
});

const DEFAULT_CONTACT = {
  email: "sales@masterhrms.com",
  phone: "+1 (555) 010-2026",
  support_email: "support@masterhrms.com",
  address: "Global Cloud HQ — Bengaluru, India",
  response_time: "Sub-4 hours",
  hero_title: "Let's architect your enterprise cloud",
  hero_subtitle:
    "Whether you want a personalized product walkthrough, custom module pricing, or migration support — our engineering architects are ready.",
};

function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", size: "", message: "" });

  const { data: cmsPage } = useQuery({
    queryKey: ["cms-contact-page"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/contact");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

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

  const c = { ...DEFAULT_CONTACT, ...cmsPage };
  const appName = sysConfig?.appName || "Master ERP";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    toast.success(`Thanks ${form.name} — our enterprise team will reach out within ${c.response_time}.`);
    setForm({ name: "", email: "", company: "", size: "", message: "" });
  }

  const contactItems = [
    { icon: Mail, title: "Enterprise Sales", value: c.email },
    { icon: Phone, title: "Direct Phone", value: c.phone },
    { icon: MapPin, title: "Global Cloud HQ", value: c.address },
    { icon: Clock, title: "SLA Response", value: `${c.response_time}` },
  ];

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="VIP Direct Channel"
        title={c.hero_title}
        subtitle={c.hero_subtitle}
      />

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 grid gap-10 lg:grid-cols-5 items-start">
          {/* Left: Contact Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-8 rounded-3xl border border-border/80 bg-card shadow-xs space-y-6">
              <Badge variant="outline" className="text-xs px-3 py-1 font-mono">
                Direct Channels
              </Badge>

              <div className="space-y-4">
                {contactItems.map((ci) => (
                  <div key={ci.title} className="flex gap-4 items-start">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                      <ci.icon className="size-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-muted-foreground">{ci.title}</div>
                      <div className="text-sm font-semibold text-foreground font-mono mt-0.5">{ci.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <HeadphonesIcon className="size-4 text-primary" /> 24/7 Dedicated SLA Support
                </div>
                <p className="leading-relaxed">
                  Existing organization? Reach out directly to <span className="text-primary font-mono font-bold">{c.support_email}</span> or trigger a ticket from your workspace console.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-3">
            <div className="p-8 rounded-3xl border border-border/80 bg-card shadow-xs">
              <form onSubmit={submit} className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">Send Instant Inquiry</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-foreground">Full Name</Label>
                    <Input
                      id="name"
                      required
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-foreground">Work Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="jane@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="company" className="text-xs font-bold text-foreground">Organization / Company</Label>
                    <Input
                      id="company"
                      placeholder="Acme Global Inc."
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="size" className="text-xs font-bold text-foreground">Workforce Size</Label>
                    <Input
                      id="size"
                      placeholder="e.g. 50–200 Employees"
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-xs font-bold text-foreground">Inquiry Details</Label>
                  <Textarea
                    id="message"
                    required
                    rows={4}
                    placeholder="Tell us about your HR, POS, or multi-tenant database migration requirements..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 font-bold text-xs h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {loading ? "Transmitting..." : "Send Enterprise Inquiry"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}


