import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  BookOpen,
  CreditCard,
  Users,
  Store,
  Boxes,
  Code2,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  ArrowRight,
  Sparkles,
  LifeBuoy,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/help-center")({
  component: HelpCenterPage,
  head: () => ({
    meta: [
      { title: "Help Center & Documentation — Master ERP" },
      { name: "description", content: "Knowledge base, tutorials, and guides for Master Workspace ERP." },
    ],
  }),
});

interface ArticleItem {
  id: string;
  category: string;
  title: string;
  description: string;
  readTime: string;
}

const ARTICLES: ArticleItem[] = [
  {
    id: "kb-01",
    category: "getting-started",
    title: "Initial Workspace Onboarding & Multi-Branch Setup",
    description: "Learn how to configure organizational metadata, base currencies, and connect first branch warehouses.",
    readTime: "4 min read",
  },
  {
    id: "kb-02",
    category: "billing",
    title: "Managing Enterprise Subscriptions, Upgrades & Invoices",
    description: "How prorated billing works, upgrading tiers, downloading official GST tax receipts, and payment retries.",
    readTime: "3 min read",
  },
  {
    id: "kb-03",
    category: "pos",
    title: "Operating the Offline-First Point of Sale (POS) Cashier Register",
    description: "Barcode scanning, thermal receipt printer pairing, offline IndexedDB sync, and shift closures.",
    readTime: "6 min read",
  },
  {
    id: "kb-04",
    category: "hrm",
    title: "Biometric Device Integration & Automated Attendance Sync",
    description: "Configuring ZKTeco and IP biometric attendance readers, shift rotas, and overtime calculations.",
    readTime: "5 min read",
  },
  {
    id: "kb-05",
    category: "security",
    title: "Two-Factor Authentication (2FA) Setup & Session Auditing",
    description: "Hardening tenant logins with mandatory OTP verification and inspecting active device sessions.",
    readTime: "3 min read",
  },
  {
    id: "kb-06",
    category: "integrations",
    title: "Shopify Store Sync & Tally XML Accounting Importer",
    description: "Bi-directional inventory sync with e-commerce storefronts and double-entry general ledger exports.",
    readTime: "7 min read",
  },
];

const FAQS = [
  {
    q: "How does multi-tenant data isolation work?",
    a: "Every database query enforces a strict tenant_id constraint at the Prisma query level. Tenants cannot view or access data belonging to any other organization under any circumstances.",
  },
  {
    q: "Can I upgrade or downgrade my subscription mid-cycle?",
    a: "Yes. Upgrades take effect immediately with prorated invoicing. Downgrade requests are scheduled to take effect at the conclusion of your active prepaid billing cycle.",
  },
  {
    q: "What happens if our internet connection drops at the retail store?",
    a: "Our POS terminal includes offline-first support. Sales and receipts are buffered locally and automatically sync back to the cloud when network connectivity is re-established.",
  },
  {
    q: "How do we request a custom enterprise integration or add-on?",
    a: "You can navigate to the Support Desk and open an 'Addon Upgrade' or 'Technical & API' ticket with your system specifications.",
  },
];

export function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Topics", icon: BookOpen },
    { id: "getting-started", label: "Getting Started", icon: Sparkles },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
    { id: "pos", label: "POS & Retail", icon: Store },
    { id: "hrm", label: "HRMS & Attendance", icon: Users },
    { id: "security", label: "Security & 2FA", icon: ShieldCheck },
  ];

  const filteredArticles = ARTICLES.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b bg-card/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 font-black text-lg">
          <BookOpen className="size-6 text-primary" />
          <span>Knowledge & Help Center</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost" className="text-xs font-semibold">
            <Link to="/support">Contact Support</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs font-bold">
            <Link to="/login">Sign In</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-card border-b py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
            Documentation & Guides
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            How Can We Assist Your Business?
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Search our knowledge base for answers, step-by-step tutorials, and operational best practices.
          </p>
          <div className="relative max-w-xl mx-auto pt-2">
            <Search className="absolute left-3.5 top-5 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search guides (e.g. biometric sync, billing, pos offline, onboarding)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-sm shadow-sm bg-background border-border"
            />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs gap-1.5 shrink-0 ${isSelected ? "font-bold" : "text-muted-foreground"}`}
              >
                <Icon className="size-3.5" />
                {cat.label}
              </Button>
            );
          })}
        </div>

        {/* Articles List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recommended Documentation & Articles</h2>
            <span className="text-xs text-muted-foreground font-mono">
              {filteredArticles.length} guides found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="border-border hover:border-primary/50 transition-all cursor-pointer group shadow-sm"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                      {article.category}
                    </Badge>
                    <span>{article.readTime}</span>
                  </div>
                  <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{article.title}</span>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {article.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" /> Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="p-4 rounded-xl border bg-card text-xs space-y-1.5">
                <p className="font-bold text-foreground">{faq.q}</p>
                <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Support Callout Banner */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-black text-base text-foreground">
                Still have questions or need personalized guidance?
              </h3>
              <p className="text-xs text-muted-foreground">
                Our customer engineering specialists can assist with onboarding walkthroughs and tailored integrations.
              </p>
            </div>
            <Button asChild className="font-bold text-xs gap-1.5 shrink-0">
              <Link to="/support">
                <LifeBuoy className="size-4" /> Open Support Ticket
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © 2026 Master Workspace ERP. All rights reserved.
      </footer>
    </div>
  );
}
