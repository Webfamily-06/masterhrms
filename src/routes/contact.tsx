import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Loader2, Clock, HeadphonesIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — Master HRMS" },
      { name: "description", content: "Get in touch with the Master HRMS sales and support team." },
      { property: "og:title", content: "Contact — Master HRMS" },
      { property: "og:description", content: "Talk to sales, request a demo, or reach support." },
    ],
  }),
});

const DEFAULT_CONTACT = {
  email: "sales@masterhrms.com",
  phone: "+1 (555) 010-2026",
  support_email: "support@masterhrms.com",
  address: "Global HQ — Bengaluru, India",
  response_time: "1 business day",
  hero_title: "Let's talk about your ERP",
  hero_subtitle: "Whether you want a demo, custom pricing, or data migration support — our ERP architects are ready.",
};

function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", size: "", message: "" });

  // ── CMS Dynamic Content ──────────────────────────────────────
  const { data: cmsPage } = useQuery({
    queryKey: ["cms-contact-page"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "contact")
        .maybeSingle();
      return (data?.content as any) || null;
    },
  });

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

  const c = { ...DEFAULT_CONTACT, ...cmsPage };
  const appName = sysConfig?.appName || "Master HRMS";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    toast.success(`Thanks — our team will reach out within ${c.response_time}.`);
    setForm({ name: "", email: "", company: "", size: "", message: "" });
  }

  const contactItems = [
    { icon: Mail, title: "Email", value: c.email },
    { icon: Phone, title: "Phone", value: c.phone },
    { icon: MapPin, title: "Office", value: c.address },
    { icon: Clock, title: "Response", value: `Within ${c.response_time}` },
  ];

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Contact us"
        title={c.hero_title || `Let's talk about your HR`}
        subtitle={c.hero_subtitle}
      />

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 grid gap-10 lg:grid-cols-5">
          {/* Left: Contact Details from CMS */}
          <div className="lg:col-span-2 space-y-5">
            {contactItems.map((ci) => (
              <div key={ci.title} className="flex gap-4 items-start">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <ci.icon className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{ci.title}</div>
                  <div className="text-sm text-muted-foreground">{ci.value}</div>
                </div>
              </div>
            ))}

            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                <HeadphonesIcon className="size-4 text-primary" /> Support
              </div>
              <p className="text-sm text-muted-foreground">
                Existing customer? Reach out at{" "}
                <span className="text-foreground font-medium">{c.support_email}</span>{" "}
                or open a ticket from your {appName} workspace.
              </p>
            </div>
          </div>

          {/* Right: Contact Form */}
          <form onSubmit={submit} className="lg:col-span-3 rounded-2xl border bg-card p-8 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Company size</Label>
                <Input id="size" placeholder="e.g. 50–200 employees" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                required
                rows={4}
                placeholder="Tell us about your current tools, team size, or what you need..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
