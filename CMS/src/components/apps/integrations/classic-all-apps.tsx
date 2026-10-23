"use client";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Grid,
  RefreshCw,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
  ChevronDown,
  ExternalLink,
  Settings,
  Archive,
  BookOpen,
  SlidersHorizontal,
  Star,
  CheckCircle2,
  Lock,
  Globe,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddonItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  tagline?: string;
  status: string;
  icon?: string;
  priceMonthly?: number;
  featured?: boolean;
}

const FALLBACK_ADDONS: AddonItem[] = [
  {
    id: "add_1",
    name: "Outbound Webhooks Gateway",
    slug: "outbound-webhooks",
    category: "Integrations",
    description: "HMAC-SHA256 Signed Event Delivery with SSRF & DNS Rebinding Defenses.",
    status: "active",
  },
  {
    id: "add_2",
    name: "Two-Factor Authentication (2FA)",
    slug: "two-factor-auth",
    category: "Security and Authentication",
    description: "RFC 6238 TOTP Multi-Factor Security with Recovery Codes.",
    status: "active",
  },
  {
    id: "add_3",
    name: "Tenant Backup & Restore",
    slug: "backup-restore",
    category: "Security and Authentication",
    description: "Isolated JSON Snapshots with SHA-256 Checksums & Safe Restores.",
    status: "active",
  },
  {
    id: "add_4",
    name: "SMS Gateway Integration",
    slug: "sms-gateway",
    category: "Integrations",
    description: "Multi-Provider MSG91, Fast2SMS & Twilio SMS with DLT Sender IDs.",
    status: "active",
  },
  {
    id: "add_5",
    name: "Developer Public API & Docs",
    slug: "public-api",
    category: "Mobility and Communication",
    description: "Scoped API Keys, Rate Limiting & OpenAPI 3.0 Documentation.",
    status: "active",
  },
  {
    id: "add_6",
    name: "Enterprise Audit & Activity Logs",
    slug: "activity-logs",
    category: "Operations",
    description: "Immutable System Audit Trail with PII Redaction & RFC 4180 CSV Export.",
    status: "active",
  },
  {
    id: "add_7",
    name: "Internal Reminders & Follow-ups",
    slug: "internal-reminders",
    category: "Operations",
    description: "Contextual Entity Reminders with Automated Invoice Due Scanning.",
    status: "active",
  },
  {
    id: "add_8",
    name: "Smart Automations & Workflow Engine",
    slug: "smart-automations",
    category: "Productivity",
    description: "Automated trigger-action workflows across ERP modules.",
    status: "active",
  },
];

export function ClassicAllApps() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBrowse, setActiveBrowse] = useState("all_apps");

  // Query published Super Admin add-ons from PostgreSQL via /api/cms/addons
  const { data: serverAddons = [], isLoading } = useQuery({
    queryKey: ["cms-addons"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/cms/addons");
        const list = Array.isArray(res) ? res : res?.data || [];
        return (list as AddonItem[]).filter((a) => a.status === "active");
      } catch {
        return [];
      }
    },
  });

  // Query tenant entitlements
  const { data: entitlements = {} } = useQuery({
    queryKey: ["addon-entitlements"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/addons/entitlements");
        return res?.entitlements || res || {};
      } catch {
        return {};
      }
    },
  });

  const displayAddons = serverAddons.length > 0 ? serverAddons : FALLBACK_ADDONS;

  const categories = [
    "All",
    ...Array.from(new Set(displayAddons.map((a) => a.category).filter(Boolean))),
  ];

  const filteredAddons = displayAddons.filter((item) => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAction = async (addon: AddonItem) => {
    toast.success(`Configuring ${addon.name} for your organization...`);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background border-t border-border">
      {/* ─── LEFT SIDEBAR (Browse & Categories) ─── */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border bg-card flex flex-col justify-between">
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Search by categories input */}
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by categories, name"
              className="text-xs h-8.5 pl-8 bg-muted/20 border-border"
            />
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 text-xs font-semibold">
            <button
              onClick={() => toast.info("Integrations hub")}
              className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Layers className="size-4 text-muted-foreground" />
              <span>Integrations</span>
            </button>
            <button
              onClick={() => toast.info("Updates feed")}
              className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="size-4" />
              <span>Updates</span>
            </button>
          </div>

          {/* Browse Section */}
          <div>
            <h5 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
              Browse
            </h5>
            <div className="space-y-1 text-xs font-semibold">
              <button
                onClick={() => setActiveBrowse("all_apps")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                  activeBrowse === "all_apps"
                    ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Grid className="size-4 text-teal-600" />
                <span>All Apps</span>
              </button>
              <button
                onClick={() => setActiveBrowse("popular")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                  activeBrowse === "popular"
                    ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Star className="size-4" />
                <span>Popular</span>
              </button>
              <button
                onClick={() => setActiveBrowse("new_apps")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                  activeBrowse === "new_apps"
                    ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Sparkles className="size-4" />
                <span>New Apps</span>
              </button>
            </div>
          </div>

          {/* Categories List */}
          <div>
            <h5 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
              Categories
            </h5>
            <div className="space-y-1 text-xs text-muted-foreground">
              {["Design", "Marketing", "Technology", "API", "SEO Tools", "Management"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span className="size-1.5 rounded-full bg-teal-600" />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Toolbar Icons */}
        <div className="p-3 border-t border-border flex items-center justify-around text-muted-foreground">
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Settings">
            <Settings className="size-4" />
          </button>
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Archive">
            <Archive className="size-4" />
          </button>
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Notes">
            <BookOpen className="size-4" />
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main className="flex-1 flex flex-col bg-card overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-foreground">All Apps</h2>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by categories, name, tag..."
                className="text-xs h-8.5 w-64 bg-muted/20 border-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 bg-muted/20 cursor-pointer">
                  <span>Popular</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer">Popular</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Newest</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Alphabetical</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Header Title Section */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                Organization Add-on &amp; Integration Hub
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Explore and connect verified enterprise extensions, APIs, and business workflows.
              </p>
            </div>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search extensions..."
                className="text-xs h-8.5 w-52 bg-muted/20 border-border"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3.5 py-1 text-xs rounded-full font-medium transition-all cursor-pointer border",
                  selectedCategory === cat
                    ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid of Addon Cards (4 per row on large displays) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAddons.map((addon) => {
              const isEntitled = entitlements[addon.slug]?.hasAccess ?? true;
              return (
                <div
                  key={addon.id}
                  className="p-5 rounded-2xl border border-border/80 bg-card hover:border-teal-600 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Top Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="size-11 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center font-bold text-sm text-foreground shadow-2xs">
                        {addon.name.slice(0, 1)}
                      </div>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                        INSTALLED
                      </Badge>
                    </div>

                    <h4 className="font-bold text-sm text-foreground group-hover:text-teal-700 transition-colors line-clamp-1">
                      {addon.name}
                    </h4>
                    <p className="text-[11px] font-medium text-teal-700 dark:text-teal-400 mt-0.5">
                      {addon.category}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                      {addon.description || addon.tagline || "Enterprise grade add-on published by Super Admin."}
                    </p>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60 text-xs">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <CheckCircle2 className="size-3 text-emerald-500" />
                      Verified
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(addon)}
                      className="text-xs h-7.5 px-3 border-teal-700/60 text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg cursor-pointer"
                    >
                      Configured
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
