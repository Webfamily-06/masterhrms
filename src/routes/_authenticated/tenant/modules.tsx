import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  UserPlus,
  Plus,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { AddonConfigDrawer } from "@/components/addons/AddonConfigDrawer";

export const Route = createFileRoute("/_authenticated/tenant/modules")({
  component: TenantAddonStorePage,
  head: () => ({
    meta: [{ title: "Integrations & apps — Master HRMS" }],
  }),
});

interface AppIntegrationItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  icon: React.ReactNode;
  defaultConnected?: boolean;
}

export default function TenantAddonStorePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>("All integration");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPromoBanner, setShowPromoBanner] = useState<boolean>(true);
  const [selectedApp, setSelectedApp] = useState<{
    slug: string;
    name: string;
    description: string;
  } | null>(null);

  // 1. Fetch server workspace modules & entitlements status
  const { data: serverModules } = useQuery<any[]>({
    queryKey: ["workspace-modules-status"],
    queryFn: async () => {
      const res = await api.get<any[]>("/workspace/modules");
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: entitlementsData } = useQuery<{ entitlements: Record<string, any> }>({
    queryKey: ["tenant-addon-entitlements"],
    queryFn: async () => {
      const res = await api.get<{ entitlements: Record<string, any> }>("/api/addons/entitlements");
      return res;
    },
  });

  // Map of connected status
  const connectedMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (serverModules) {
      serverModules.forEach((m) => {
        if (m.isEnabled !== false) {
          map.set(m.key, true);
        }
      });
    }
    if (entitlementsData?.entitlements) {
      Object.entries(entitlementsData.entitlements).forEach(([slug, ent]) => {
        if (ent.isActive || ent.isInstalled || ent.isEnabled) {
          map.set(slug, true);
        }
      });
    }
    return map;
  }, [serverModules, entitlementsData]);

  // 2. Comprehensive Apps Catalog with Pixel-Perfect SVG Logos (Exact 16 from Screenshot + Enterprise Hub)
  const APPS_CATALOG: AppIntegrationItem[] = [
    {
      id: "google-chrome",
      name: "Google Chrome",
      slug: "google-chrome",
      description: "Access and share availbility on any web page.",
      category: "Most used",
      tags: ["All integration", "Most used"],
      defaultConnected: true,
      icon: (
        <svg viewBox="0 0 48 48" className="h-9 w-9">
          <circle cx="24" cy="24" r="20" fill="#EA4335" />
          <path d="M24 10a14 14 0 0 1 12.124 7H24z" fill="#4285F4" />
          <path d="M36.124 17A14 14 0 0 1 24 38l6.062-10.5z" fill="#34A853" />
          <path d="M24 38A14 14 0 0 1 11.876 17H24z" fill="#FBBC05" />
          <circle cx="24" cy="24" r="8" fill="#FFFFFF" />
          <circle cx="24" cy="24" r="6" fill="#1A73E8" />
        </svg>
      ),
    },
    {
      id: "gmail",
      name: "Gmail",
      slug: "gmail",
      description: "Send automated emails from your Gmail account.",
      category: "Email messaging",
      tags: ["All integration", "Email messaging", "Most used"],
      defaultConnected: false,
      icon: (
        <svg viewBox="0 0 48 48" className="h-9 w-9">
          <path fill="#4285F4" d="M41 10H7a3 3 0 0 0-3 3v22a3 3 0 0 0 3 3h34a3 3 0 0 0 3-3V13a3 3 0 0 0-3-3z"/>
          <path fill="#EA4335" d="M4 14l20 14L44 14v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1z"/>
          <path fill="#FBBC05" d="M4 35V13.8l17 11.9-17 9.3z"/>
          <path fill="#34A853" d="M44 35V13.8l-17 11.9 17 9.3z"/>
        </svg>
      ),
    },
    {
      id: "microsoft-edge",
      name: "Microsoft Edge",
      slug: "microsoft-edge",
      description: "Access and share availbility on any web page.",
      category: "Most used",
      tags: ["All integration", "Most used"],
      defaultConnected: true,
      icon: (
        <svg viewBox="0 0 48 48" className="h-9 w-9">
          <path fill="#0C84D4" d="M24 4C13 4 4 13 4 24c0 8 4.7 15 11.5 18.2C13.6 38.6 13 34 13 30c0-9.9 8.1-18 18-18 2 0 4 .3 6 .9C34.2 7.7 29.5 4 24 4z"/>
          <path fill="#0078D4" d="M37 13c-1.9-.6-3.9-.9-6-.9-9.9 0-18 8.1-18 18 0 4 .6 8.6 2.5 12.2C20.4 43.4 22.1 44 24 44c11 0 20-9 20-20 0-4.1-1.3-7.9-3.5-11H37z"/>
          <path fill="#25D366" d="M40.5 33C37.3 39.5 30.7 44 24 44c-1.9 0-3.6-.6-5.5-1.8C24.5 40 30 35 30 30c0-4.4-3.6-8-8-8-1.5 0-3 .4-4.2 1.2C20 18.2 24.8 15 30 15c6.6 0 12 5.4 12 12 0 2.2-.5 4.3-1.5 6z" opacity=".8"/>
        </svg>
      ),
    },
    {
      id: "intercom",
      name: "Intercom",
      slug: "intercom",
      description: "Embed your booking page in intercom chat.",
      category: "Email messaging",
      tags: ["All integration", "Email messaging", "Sales and CRM"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#1F8CEB] flex items-center justify-center p-1.5 shadow-xs">
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path d="M19.5 3.5h-15A2.5 2.5 0 0 0 2 6v12a2.5 2.5 0 0 0 2.5 2.5h15a2.5 2.5 0 0 0 2.5-2.5V6a2.5 2.5 0 0 0-2.5-2.5zM7 16H5v-7h2v7zm4 0H9V7h2v9zm4 0h-2V7h2v9zm4 0h-2v-7h2v7z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "linkedin",
      name: "Linkedin Message",
      slug: "linkedin-message",
      description: "Access and share your availbility in LinkedIn.",
      category: "Marketing",
      tags: ["All integration", "Marketing", "Sales and CRM"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#0A66C2] flex items-center justify-center p-1.5 shadow-xs">
          <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.45 1.45 0 0 0 1.45-1.45 1.45 1.45 0 0 0-1.45-1.45 1.45 1.45 0 0 0-1.45 1.45 1.45 1.45 0 0 0 1.45 1.45m1.39 9.74v-8.37H5.07v8.37h2.78z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "mailchimp",
      name: "Mailchimp",
      slug: "mailchimp",
      description: "Create and update contacts as meetings are scheduled.",
      category: "Marketing",
      tags: ["All integration", "Marketing", "Email messaging", "Most used"],
      defaultConnected: true,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#FFE01B] flex items-center justify-center p-1 shadow-xs">
          <svg viewBox="0 0 24 24" fill="#241C15" className="h-6 w-6">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "microsoft-teams",
      name: "Microsoft Teams",
      slug: "microsoft-teams",
      description: "Include Teams conferencing details in your Casyns events.",
      category: "Video conferencing",
      tags: ["All integration", "Video conferencing"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#464EB8] flex items-center justify-center p-1.5 shadow-xs">
          <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
            <path d="M19.5 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-1 2h2a2 2 0 0 1 2 2v3.5a1 1 0 0 1-2 0V12h-2v6h-2v-6.5a2 2 0 0 1 2-2zM9 5.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-2.5 3h5a3 3 0 0 1 3 3v7a1.5 1.5 0 0 1-3 0V15H7v3.5a1.5 1.5 0 0 1-3 0v-7a3 3 0 0 1 2.5-3z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "paypal",
      name: "Paypal",
      slug: "paypal",
      description: "Collect payment before the meeting",
      category: "Payments",
      tags: ["All integration", "Payments"],
      defaultConnected: true,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-1 shadow-xs">
          <svg viewBox="0 0 24 24" className="h-6 w-6">
            <path fill="#003087" d="M7.5 4.5h5.5c2.5 0 4.2 1.5 3.8 4-.5 3-2.8 4.5-5.5 4.5H9.2l-1.1 6.5H5.8L7.5 4.5z"/>
            <path fill="#0079C1" d="M9.8 8h4.5c2 0 3.4 1.1 3 3.2-.5 2.5-2.2 3.8-4.5 3.8h-2l-1 5.5H7.5L9.8 8z" opacity=".85"/>
          </svg>
        </div>
      ),
    },
    {
      id: "slack",
      name: "Slack",
      slug: "slack",
      description: "Access and share your Casync links in Slack.",
      category: "Email messaging",
      tags: ["All integration", "Email messaging", "Most used"],
      defaultConnected: true,
      icon: (
        <svg viewBox="0 0 48 48" className="h-9 w-9">
          <path fill="#E01E5A" d="M14 26a4 4 0 0 1-4-4 4 4 0 0 1 4-4h4v4a4 4 0 0 1-4 4zm6 0a4 4 0 0 1-4 4 4 4 0 0 1-4-4V12a4 4 0 0 1 4-4 4 4 0 0 1 4 4v14z"/>
          <path fill="#36C5F0" d="M22 14a4 4 0 0 1 4-4 4 4 0 0 1 4 4v4h-4a4 4 0 0 1-4-4zm0 6a4 4 0 0 1-4-4 4 4 0 0 1 4-4h14a4 4 0 0 1 4 4 4 4 0 0 1-4 4H22z"/>
          <path fill="#2EB67D" d="M34 22a4 4 0 0 1 4 4 4 4 0 0 1-4 4h-4v-4a4 4 0 0 1 4-4zm-6 0a4 4 0 0 1 4-4 4 4 0 0 1 4 4v14a4 4 0 0 1-4 4 4 4 0 0 1-4-4V22z"/>
          <path fill="#ECB22E" d="M26 34a4 4 0 0 1-4 4 4 4 0 0 1-4-4v-4h4a4 4 0 0 1 4 4zm0-6a4 4 0 0 1 4 4 4 4 0 0 1-4 4H12a4 4 0 0 1-4-4 4 4 0 0 1 4-4h14z"/>
        </svg>
      ),
    },
    {
      id: "zoom",
      name: "Zoom",
      slug: "zoom",
      description: "Include Zoom details in your Casync events.",
      category: "Video conferencing",
      tags: ["All integration", "Video conferencing", "Most used"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#2D8CFF] flex items-center justify-center p-1.5 shadow-xs">
          <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h8A2.5 2.5 0 0 1 17 6.5v6.2l4.2-3.1a1 1 0 0 1 1.6.8v7.2a1 1 0 0 1-1.6.8L17 15.3v-2.8A2.5 2.5 0 0 1 14.5 15h-8A2.5 2.5 0 0 1 4 12.5v-6z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "wordpress",
      name: "Wordpress",
      slug: "wordpress",
      description: "Embed your booking page on your website.",
      category: "Marketing",
      tags: ["All integration", "Marketing"],
      defaultConnected: true,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#21759B] flex items-center justify-center p-1 shadow-xs">
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-8.2 10c0-1.4.35-2.72.97-3.88l4.47 12.26C5.58 18.77 3.8 15.6 3.8 12zm8.2 8.2c-.88 0-1.72-.16-2.5-.46l2.84-8.24 2.91 7.98c-1 .47-2.1.72-3.25.72zm5.7-4.14l-2.6-7.55c.78-.04 1.5-.12 1.5-.12.44-.04.39-.7-.05-.7 0 0-1.33.13-2.2.13-.82 0-2.17-.13-2.17-.13-.44 0-.49.66-.05.7 0 0 .7.08 1.41.12l-2.09 6.26-1.7-5.07c.5-.04 1-.11 1-.11.44-.04.39-.7-.05-.7 0 0-1.33.13-2.2.13-.19 0-.42 0-.67-.02l5.05 15.02C17.06 19.34 19.4 16 19.4 12c0-2.4-.95-4.58-2.5-6.2.8 1.43 1.25 3.09 1.25 4.86 0 1.95-.56 3.78-1.54 5.34z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "firefox",
      name: "Firefox",
      slug: "firefox",
      description: "Access and share availbility on any web page.",
      category: "Most used",
      tags: ["All integration", "Most used"],
      defaultConnected: false,
      icon: (
        <svg viewBox="0 0 48 48" className="h-9 w-9">
          <circle cx="24" cy="24" r="20" fill="#FF7139"/>
          <circle cx="24" cy="24" r="14" fill="#6A1B9A"/>
          <circle cx="24" cy="24" r="9" fill="#00C4FF"/>
        </svg>
      ),
    },
    {
      id: "microsoft-dynamics-365",
      name: "Microsoft Dynamics 365",
      slug: "microsoft-dynamics-365",
      description: "Create and update records as meetings are scheduled.",
      category: "Sales and CRM",
      tags: ["All integration", "Sales and CRM"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#002050] flex items-center justify-center p-1.5 shadow-xs">
          <svg viewBox="0 0 24 24" fill="#0078D4" className="h-6 w-6">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.5l6.5 3.6L12 11.7 5.5 8.1 12 4.5zM4.8 9.7l6.2 3.5v7l-6.2-3.4V9.7zm8.2 10.5v-7l6.2-3.5v7.1l-6.2 3.4z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "icloud-calendar",
      name: "iCloud Calendar",
      slug: "icloud-calendar",
      description: "Add events to your calendar and prevent double-booking.",
      category: "Calendars",
      tags: ["All integration", "Calendars"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#38A5F8] to-[#6BC8FD] flex items-center justify-center p-1.5 shadow-xs">
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "google-analytics",
      name: "Google Analytics",
      slug: "google-analytics",
      description: "Track engagement with your booking pages.",
      category: "Marketing",
      tags: ["All integration", "Marketing"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#FFF8E7] flex items-center justify-center p-1.5 shadow-xs border border-amber-200">
          <svg viewBox="0 0 24 24" className="h-6 w-6">
            <rect x="3" y="14" width="4" height="7" rx="1" fill="#F9AB00" />
            <rect x="10" y="8" width="4" height="13" rx="1" fill="#E37400" />
            <rect x="17" y="3" width="4" height="18" rx="1" fill="#EA4335" />
          </svg>
        </div>
      ),
    },
    {
      id: "google-calendar",
      name: "Google Calendar",
      slug: "google-calendar",
      description: "Add events to your calendar and prevent double-booking.",
      category: "Calendars",
      tags: ["All integration", "Calendars", "Most used"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-1 shadow-xs">
          <div className="h-7 w-7 rounded-md bg-[#1A73E8] flex flex-col items-center justify-center text-white">
            <span className="text-[7px] font-bold uppercase leading-none mt-0.5">MAY</span>
            <span className="text-xs font-bold leading-tight">31</span>
          </div>
        </div>
      ),
    },
    // Enterprise HRMS Connectors
    {
      id: "whatsapp-alerts",
      name: "WhatsApp Business Hub",
      slug: "whatsapp-alerts",
      description: "Deliver real-time transactional WhatsApp notifications, payslip PDFs, and attendance alerts.",
      category: "Email messaging",
      tags: ["All integration", "Email messaging", "Sales and CRM", "HR & Operations", "Most used"],
      defaultConnected: true,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#25D366] flex items-center justify-center p-1.5 shadow-xs">
          <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zM17.5 14.7c-.24.68-1.39 1.33-1.92 1.41-.5.08-1.12.11-3.64-.93-3.21-1.33-5.26-4.6-5.42-4.82-.16-.22-1.3-1.74-1.3-3.32s.82-2.36 1.12-2.68c.29-.32.64-.4.86-.4.21 0 .43 0 .61.01.2 0 .46-.08.72.54.27.64.91 2.22.99 2.38.08.16.13.35.03.56-.11.22-.16.35-.32.54-.16.19-.34.42-.49.56-.16.16-.33.34-.14.66.19.32.84 1.38 1.8 2.24 1.24 1.1 2.28 1.44 2.61 1.6.32.16.51.14.7-.08.19-.22.8-1.02 1.02-1.37.21-.35.43-.29.72-.19.29.11 1.83.86 2.15 1.02.32.16.54.24.62.38.08.14.08.8-.16 1.48z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "razorpay-gateway",
      name: "Razorpay Payments",
      slug: "razorpay-gateway",
      description: "Automate subscription invoicing, payouts, and salary settlements with Webhook HMAC verification.",
      category: "Payments",
      tags: ["All integration", "Payments", "Most used"],
      defaultConnected: true,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#0C2340] flex items-center justify-center p-1.5 shadow-xs">
          <svg viewBox="0 0 24 24" fill="#3395FF" className="h-5 w-5">
            <path d="M14.5 3L6 14h6.5L8 21l10-11h-6.5L14.5 3z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "biometric-sync",
      name: "Biometric Hardware Sync",
      slug: "biometric-sync",
      description: "Direct ZKTeco, eSSL & Anviz biometric terminal clock-in sync with duplicate punch guards.",
      category: "HR & Operations",
      tags: ["All integration", "HR & Operations", "Most used"],
      defaultConnected: true,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#008080] flex items-center justify-center p-1.5 shadow-xs text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M12 2a10 10 0 0 0-10 10c0 4.4 2.9 8.2 7 9.5"/>
            <path d="M12 6a6 6 0 0 0-6 6c0 2.2 1.2 4.1 3 5.1"/>
            <path d="M12 10a2 2 0 0 0-2 2c0 1.1.9 2 2 2"/>
            <path d="M12 14v4"/>
            <circle cx="17" cy="17" r="4"/>
            <path d="m20 20 2 2"/>
          </svg>
        </div>
      ),
    },
    {
      id: "tally-importer",
      name: "Tally ERP Connector",
      slug: "tally-importer",
      description: "Two-way automated XML ledger synchronization and balanced double-entry voucher mapping.",
      category: "Sales and CRM",
      tags: ["All integration", "Sales and CRM", "Payments"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#004D40] flex items-center justify-center p-1.5 shadow-xs text-white font-bold text-xs tracking-wider">
          TALLY
        </div>
      ),
    },
    {
      id: "shopify-sync",
      name: "Shopify eCommerce",
      slug: "shopify-sync",
      description: "Bi-directional customer, sales order, and inventory stock decrement synchronizer.",
      category: "Sales and CRM",
      tags: ["All integration", "Sales and CRM", "Marketing"],
      defaultConnected: false,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-[#96BF48] flex items-center justify-center p-1.5 shadow-xs text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M15.3 4.2c-.1-.7-.8-1.2-1.5-1.2h-.4c-.3-1.6-1.7-2.8-3.4-2.8-1.7 0-3.1 1.2-3.4 2.8h-.4c-.7 0-1.4.5-1.5 1.2L3 21.2c-.1.9.6 1.7 1.5 1.7h15c.9 0 1.6-.8 1.5-1.7l-1.7-17zM10 2.2c.7 0 1.3.5 1.4 1.2H8.6c.1-.7.7-1.2 1.4-1.2zm2.8 11.3l-2.4 1.4c-.3.2-.6 0-.6-.3V9.4c0-.3.3-.5.6-.3l2.4 1.4c.3.2.3.6 0 .8z"/>
          </svg>
        </div>
      ),
    },
    {
      id: "ai-assistant",
      name: "AI Document & HR Studio",
      slug: "ai-assistant",
      description: "Generative AI for offer letters, job descriptions, employee reviews, and intelligent summaries.",
      category: "HR & Operations",
      tags: ["All integration", "HR & Operations", "Most used"],
      defaultConnected: true,
      icon: (
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center p-1.5 shadow-xs text-white">
          <Sparkles className="h-5 w-5" />
        </div>
      ),
    },
  ];

  // 3. Category Tabs (Matching Exact Screenshot Order)
  const CATEGORIES = [
    "All integration",
    "Most used",
    "Video conferencing",
    "Calendars",
    "Marketing",
    "Payments",
    "Email messaging",
    "Sales and CRM",
  ];

  // 4. Filter Catalog
  const filteredApps = useMemo(() => {
    return APPS_CATALOG.filter((app) => {
      const matchesCategory =
        activeTab === "All integration" ? true : app.tags.includes(activeTab);
      const matchesQuery =
        searchQuery.trim() === ""
          ? true
          : app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-background text-foreground pb-20">
      {/* 1. Promotional Header Banner (Matching Provided Design with Abstract Swirl Graphics) */}
      {showPromoBanner && (
        <div className="relative overflow-hidden bg-[#1E60FF] text-white px-4 py-2.5 shadow-xs">
          {/* Decorative Abstract Swirls / Waves */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <svg
              className="w-full h-full"
              viewBox="0 0 1200 44"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-50 20 C150 -10, 200 50, 400 15 C600 -20, 650 45, 850 15 C1050 -15, 1150 40, 1250 10"
                stroke="#60A5FA"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M100 40 C250 10, 350 45, 500 20 C650 -5, 750 40, 950 10 C1050 -5, 1150 35, 1220 20"
                stroke="#EC4899"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M50 0 C180 35, 300 0, 480 30 C620 60, 780 0, 920 35"
                stroke="#FACC15"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="relative max-w-7xl mx-auto flex items-center justify-center gap-3 text-xs sm:text-sm font-medium">
            <span>Upgrade your subscription today! ⚡ Get 30% Discount for all plan.</span>
            <button
              onClick={() => navigate({ to: "/tenant/subscription" })}
              className="bg-black hover:bg-black/90 text-white text-xs px-3.5 py-1 rounded-full font-semibold transition-all shadow-xs"
            >
              Get Now
            </button>
          </div>
          <button
            onClick={() => setShowPromoBanner(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-1 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 space-y-6">
        {/* 2. Top Navigation & Action Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
              Integrations & apps
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.info("Exploring integrations guide and documentation...")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-pink-200/90 text-[#D946EF] bg-white dark:bg-card dark:border-pink-900/60 text-xs font-medium hover:bg-pink-50/50 transition-colors shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#D946EF]" />
              <span>Take a look around</span>
            </button>
            <button
              onClick={() => navigate({ to: "/tenant/users" })}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-700 dark:text-slate-200 bg-white dark:bg-card text-xs font-medium hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <UserPlus className="h-3.5 w-3.5 text-slate-500" />
              <span>Invite user</span>
            </button>
            <button
              onClick={() => toast.success("Create custom webhook or third-party connector.")}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-blue-600 text-blue-600 bg-white dark:bg-card dark:border-blue-500 dark:text-blue-400 text-xs font-semibold hover:bg-blue-50/60 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Create</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center text-white cursor-pointer shadow-2xs">
              <span className="font-bold text-xs tracking-tighter">⚡</span>
            </div>
          </div>
        </div>

        {/* 3. Horizontal Category Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-border/60">
          <div className="flex items-center gap-7 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = activeTab === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`text-sm font-medium whitespace-nowrap pb-3 transition-colors relative ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 dark:border-blue-400"
                      : "text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-56 pb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 -mt-1 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-white dark:bg-card border-slate-200 dark:border-slate-800 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* 4. Responsive 4-Column Card Grid (Matching Image Exactly) */}
        {filteredApps.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-sm">No integrations found matching "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredApps.map((app) => {
              const isConnected =
                connectedMap.has(app.slug) ||
                connectedMap.has(app.id) ||
                app.defaultConnected;

              return (
                <div
                  key={app.id}
                  onClick={() =>
                    setSelectedApp({
                      slug: app.slug,
                      name: app.name,
                      description: app.description,
                    })
                  }
                  className="rounded-xl border border-slate-200/90 dark:border-border/80 bg-white dark:bg-card p-5 shadow-2xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Card Top: Logo & Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="shrink-0">{app.icon}</div>
                      {isConnected ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-[#22C55E] text-[#16A34A] bg-transparent">
                          Connected
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp({
                              slug: app.slug,
                              name: app.name,
                              description: app.description,
                            });
                          }}
                          className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-slate-300 hover:text-slate-900 transition-colors"
                        >
                          Connect
                        </button>
                      )}
                    </div>

                    {/* Card Title & Description */}
                    <div className="mt-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-foreground line-clamp-1">
                        {app.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 line-clamp-2 leading-relaxed min-h-[34px]">
                        {app.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Dynamic Integration Config Drawer */}
      {selectedApp && (
        <AddonConfigDrawer
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          addonSlug={selectedApp.slug}
          addonName={selectedApp.name}
          addonDescription={selectedApp.description}
        />
      )}
    </div>
  );
}
