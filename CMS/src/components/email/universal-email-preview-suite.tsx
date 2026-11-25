"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_PLATFORM_BRANDING,
  renderUniversalEmail,
  type UniversalEmailBranding,
  type UniversalEmailTemplateConfig,
} from "@/lib/email-design-system";

interface ValidationScenario {
  id: string;
  number: number;
  title: string;
  description: string;
  branding: UniversalEmailBranding;
  config: UniversalEmailTemplateConfig;
}

const STANDARD_PLATFORM = {
  ...DEFAULT_PLATFORM_BRANDING,
  logoUrl: "/logo.webp",
  supportEmail: "support@masterhrms.com",
  websiteUrl: "https://masterhrms.com",
  websiteLabel: "masterhrms.com",
  copyrightText: "© 2026 MasterHRMS. All rights reserved.",
  playStoreUrl: "https://play.google.com/store",
  appStoreUrl: "https://apps.apple.com",
  privacyPolicyUrl: "https://masterhrms.com/privacy-policy",
  socialLinks: [
    { label: "Facebook", url: "https://facebook.com" },
    { label: "X", url: "https://x.com" },
    { label: "Instagram", url: "https://instagram.com" },
    { label: "LinkedIn", url: "https://linkedin.com" },
    { label: "YouTube", url: "https://youtube.com" },
  ],
};

const SAMPLE_TENANT_SVG_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="36" viewBox="0 0 120 36"><rect width="36" height="36" rx="8" fill="#1d4ed8"/><path d="M10 25L18 11L26 25H21.5L18 18.5L14.5 25H10Z" fill="#ffffff"/><text x="44" y="23" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">NORTHSTAR</text></svg>`
  );

function buildValidationScenarios(liveBranding?: UniversalEmailBranding | null): ValidationScenario[] {
  const defaultTenant = {
    companyName: liveBranding?.tenant?.companyName || "Northstar Technologies Pvt. Ltd.",
    logoUrl: liveBranding?.tenant?.logoUrl || SAMPLE_TENANT_SVG_LOGO,
    tagline: liveBranding?.tenant?.tagline || "Cloud Engineering & Digital Operations",
    brandColor: liveBranding?.tenant?.brandColor || "#1d4ed8",
  };
  const platform = liveBranding?.platform?.supportEmail
    ? {
        ...STANDARD_PLATFORM,
        ...liveBranding.platform,
      }
    : STANDARD_PLATFORM;

  return [
    {
      id: "short-notification",
      number: 1,
      title: "Short Notification",
      description: "Minimal greeting + concise status update with zero empty sections.",
      branding: { tenant: defaultTenant, platform },
      config: {
        id: "val-short",
        subject: "Attendance Regularization Approved",
        category: "Attendance",
        heroTitle: "Attendance Regularization Approved",
        statusBadge: { label: "Approved", tone: "success" },
        greeting: "Hello Alex Morgan,",
        messages: [
          "Your attendance regularization request for 25 Nov 2026 (09:05 AM – 06:15 PM) has been approved by Sarah Jenkins.",
        ],
      },
    },
    {
      id: "long-notification",
      number: 2,
      title: "Long Notification",
      description: "Multi-paragraph policy communication verifying typography, line-height, and vertical rhythm.",
      branding: { tenant: defaultTenant, platform },
      config: {
        id: "val-long",
        subject: "Annual Information Security & Hybrid Work Policy Update — 2026",
        category: "HR Policy & Compliance",
        heroTitle: "Annual Policy & Compliance Update",
        heroSubtitle: "Effective December 1, 2026 for all global employees",
        statusBadge: { label: "Policy Notice", tone: "info" },
        greeting: "Dear Team,",
        messages: [
          "As part of our annual governance review, we have updated the Employee Handbook, Hybrid Work Guidelines, and Information Security Compliance Policy across all regional offices. These revisions clarify core collaboration hours, remote workstation security standards, and quarterly equipment reimbursement eligibility.",
          "All full-time, part-time, and fixed-term contract employees are requested to review the updated documentation in the HR Document Vault. Managers will also host brief Q&A sessions during next week's department stand-ups to address team-specific questions.",
          "Please complete your digital acknowledgment before the compliance deadline so your employee profile remains in good standing for the Q4 audit cycle.",
        ],
        detailsTitle: "Policy Reference",
        details: [
          { label: "Document Code", value: "POL-2026-SEC-04" },
          { label: "Effective Date", value: "December 1, 2026" },
          { label: "Acknowledgment Due", value: "December 15, 2026" },
        ],
        primaryAction: {
          label: "Review & Acknowledge",
          url: "https://app.masterhrms.com/hr/documents",
          tone: "primary",
        },
      },
    },
    {
      id: "primary-cta",
      number: 3,
      title: "Primary CTA",
      description: "Single high-contrast primary action button with structured details card.",
      branding: { tenant: defaultTenant, platform },
      config: {
        id: "val-primary-cta",
        subject: "Action Required: Document Assigned — Employee Code of Conduct 2026",
        category: "HR Documents",
        heroTitle: "New Document Assigned",
        heroSubtitle: "Review and digital acknowledgment required",
        statusBadge: { label: "Action Required", tone: "info" },
        greeting: "Hello Alex Morgan,",
        messages: [
          "A new compliance document has been assigned to your employee profile by Sarah Jenkins.",
        ],
        detailsTitle: "Document Details",
        details: [
          { label: "Document", value: "Employee Code of Conduct 2026" },
          { label: "Category", value: "Compliance Documents" },
          { label: "Assigned By", value: "Sarah Jenkins" },
          { label: "Due Date", value: "December 5, 2026" },
        ],
        primaryAction: {
          label: "Review & Acknowledge",
          url: "https://app.masterhrms.com/hr/documents/acknowledgements",
          tone: "primary",
        },
      },
    },
    {
      id: "multiple-actions",
      number: 4,
      title: "Multiple Actions",
      description: "Primary + Secondary CTA buttons side-by-side for approval workflows.",
      branding: { tenant: defaultTenant, platform },
      config: {
        id: "val-multi-cta",
        subject: "Leave Approval Request — Priya Sharma (3 Days)",
        category: "Leave Management",
        heroTitle: "Leave Request Awaiting Approval",
        heroSubtitle: "Submitted by Priya Sharma • Engineering",
        statusBadge: { label: "Pending Approval", tone: "warning" },
        greeting: "Hello Sarah Jenkins,",
        messages: [
          "Priya Sharma has submitted an Annual Leave request for your review. You can approve or decline directly using the actions below.",
        ],
        detailsTitle: "Leave Request Summary",
        details: [
          { label: "Employee", value: "Priya Sharma (Senior Software Engineer)" },
          { label: "Leave Type", value: "Annual Leave" },
          { label: "Dates", value: "Dec 10, 2026 – Dec 12, 2026 (3 Days)" },
          { label: "Leave Balance", value: "11 Days Remaining" },
        ],
        primaryAction: {
          label: "Approve Request",
          url: "https://app.masterhrms.com/hr/leave/applications?action=approve",
          tone: "primary",
        },
        secondaryAction: {
          label: "Reject Request",
          url: "https://app.masterhrms.com/hr/leave/applications?action=reject",
        },
      },
    },
    {
      id: "data-table",
      number: 5,
      title: "Data Table",
      description: "Structured EmailDataTable component for payroll, approvals, or billing breakdowns.",
      branding: { tenant: defaultTenant, platform },
      config: {
        id: "val-data-table",
        subject: "Monthly Payroll Summary — November 2026",
        category: "Payroll",
        heroTitle: "Payroll Statement Ready",
        heroSubtitle: "Pay Period: November 1 – November 30, 2026",
        statusBadge: { label: "Disbursed", tone: "success" },
        greeting: "Hello Alex Morgan,",
        messages: [
          "Your salary for November 2026 has been processed. Below is a summary of your earnings and deductions.",
        ],
        table: {
          caption: "Compensation Breakdown (November 2026)",
          columns: [
            { header: "Component", align: "left" },
            { header: "Type", align: "left" },
            { header: "Amount", align: "right" },
          ],
          rows: [
            ["Basic Salary", "Earning", "₹65,000.00"],
            ["House Rent Allowance", "Earning", "₹26,000.00"],
            ["Special Allowance", "Earning", "₹14,000.00"],
            ["Provident Fund & Tax", "Deduction", "-₹10,000.00"],
            ["<strong>Net Disbursed Pay</strong>", "<strong>Total</strong>", "<strong>₹95,000.00</strong>"],
          ],
        },
        primaryAction: {
          label: "Download Payslip",
          url: "https://app.masterhrms.com/hr/payroll/payslips",
          tone: "primary",
        },
      },
    },
    {
      id: "reminder-banner",
      number: 6,
      title: "Reminder Banner",
      description: "Highlighted EmailReminderBanner callout for deadline & compliance alerts.",
      branding: { tenant: defaultTenant, platform },
      config: {
        id: "val-reminder",
        subject: "Reminder: Q4 Performance Self-Review Due Tomorrow",
        category: "Performance",
        heroTitle: "Performance Review Deadline Tomorrow",
        heroSubtitle: "Q4 2026 Appraisal Cycle",
        statusBadge: { label: "Due in 24 Hours", tone: "warning" },
        greeting: "Hello Alex Morgan,",
        messages: [
          "Your Q4 2026 self-assessment is still in draft status. Please submit your completed review before the cycle closes.",
        ],
        reminder: {
          title: "Submission Window Closes Nov 27 at 6:00 PM IST",
          message:
            "Late submissions may delay manager calibration and annual compensation review. Save and submit your form today.",
          tone: "warning",
        },
        primaryAction: {
          label: "Complete Self-Review",
          url: "https://app.masterhrms.com/hr/performance/appraisals",
          tone: "primary",
        },
      },
    },
    {
      id: "missing-tenant-logo",
      number: 7,
      title: "Missing Tenant Logo",
      description: "Clean text + monogram identity fallback when no tenant logo is configured.",
      branding: {
        tenant: {
          companyName: "Meridian Logistics Group",
          logoUrl: "",
          tagline: "Global Freight & Supply Chain",
          brandColor: "#0f766e",
        },
        platform,
      },
      config: {
        id: "val-missing-logo",
        subject: "Interview Scheduled — Operations Coordinator",
        category: "Recruitment",
        heroTitle: "Interview Scheduled",
        heroSubtitle: "Video interview via MasterHRMS Meetings",
        statusBadge: { label: "Confirmed", tone: "info" },
        greeting: "Hello Candidate,",
        messages: [
          "Your interview with Meridian Logistics Group has been scheduled. Please join 5 minutes before the start time.",
        ],
        detailsTitle: "Interview Details",
        details: [
          { label: "Role", value: "Operations Coordinator" },
          { label: "Date & Time", value: "Nov 28, 2026 • 11:00 AM IST" },
          { label: "Interviewer", value: "Marcus Vance" },
        ],
        primaryAction: {
          label: "Join Meeting",
          url: "https://app.masterhrms.com/hr/meetings",
          tone: "primary",
        },
      },
    },
    {
      id: "long-tenant-branding",
      number: 8,
      title: "Long Tenant Branding",
      description: "Stress-tests wrapping and alignment with an extra-long organization name and tagline.",
      branding: {
        tenant: {
          companyName:
            "International Precision Aerospace & Sustainable Energy Manufacturing Corporation Limited",
          logoUrl: "",
          tagline:
            "Global Engineering Excellence, Next-Generation Propulsion Systems & Workforce Innovation Across 42 Countries",
          brandColor: "#1d4ed8",
        },
        platform,
      },
      config: {
        id: "val-long-branding",
        subject: "Employee Transfer Confirmed — Munich Engineering Hub",
        category: "Employee Lifecycle",
        heroTitle: "Employee Transfer Confirmed",
        heroSubtitle: "Official branch & department relocation notice",
        statusBadge: { label: "Approved", tone: "success" },
        greeting: "Hello Elena Rostova,",
        messages: [
          "Your inter-branch transfer request has been approved by Human Resources and Regional Operations.",
        ],
        detailsTitle: "Transfer Details",
        details: [
          { label: "From Branch", value: "Bengaluru R&D Center" },
          { label: "To Branch", value: "Munich Engineering Hub" },
          { label: "Effective Date", value: "January 5, 2027" },
        ],
        primaryAction: {
          label: "View Details",
          url: "https://app.masterhrms.com/hr/lifecycle/transfers",
          tone: "primary",
        },
      },
    },
  ];
}

export function UniversalEmailPreviewSuite({
  liveBranding,
}: {
  liveBranding?: UniversalEmailBranding | null;
}) {
  const scenarios = useMemo(() => buildValidationScenarios(liveBranding), [liveBranding]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0].id);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [blockImages, setBlockImages] = useState(false);

  const activeScenario =
    scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];

  const renderedHtml = useMemo(() => {
    const html = renderUniversalEmail(activeScenario.config, activeScenario.branding);
    if (!blockImages) return html;
    // Simulate email clients blocking remote images (alt text preserved)
    return html.replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/gi, (_m, alt) => {
      return `<span style="display:inline-block;padding:4px 8px;border:1px dashed #94a3b8;border-radius:4px;font-size:11px;color:#64748b;">[Image blocked: ${alt}]</span>`;
    });
  }, [activeScenario, blockImages]);

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
      {/* Scenario Selector */}
      <Card className="p-3 border border-border/80 rounded-xl bg-card shadow-xs space-y-2">
        <div className="flex items-center justify-between px-1 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <i className="ph-duotone ph-checks text-primary text-base" />
            <span>Validation Scenarios</span>
          </div>
          <Badge variant="soft" className="text-[11px] font-mono">
            8 / 8
          </Badge>
        </div>

        <div className="space-y-1">
          {scenarios.map((scenario) => {
            const isActive = scenario.id === activeScenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenarioId(scenario.id)}
                className={`w-full text-left p-3 rounded-lg text-xs transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`size-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {scenario.number}
                  </span>
                  <span className="truncate">{scenario.title}</span>
                </div>
                <p
                  className={`text-[11px] mt-1 line-clamp-2 ${
                    isActive
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {scenario.description}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Interactive Viewport & Email-Client Simulation */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Scenario {activeScenario.number}: {activeScenario.title}
              </h2>
              <Badge variant="soft" className="text-[11px]">
                {activeScenario.config.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeScenario.description}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={viewport === "desktop" ? "primary" : "outline"}
              onClick={() => setViewport("desktop")}
              className="gap-1.5 text-xs"
            >
              <i className="ph ph-desktop text-sm" />
              Desktop
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewport === "mobile" ? "primary" : "outline"}
              onClick={() => setViewport("mobile")}
              className="gap-1.5 text-xs"
            >
              <i className="ph ph-device-mobile text-sm" />
              Mobile (375px)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={blockImages ? "warning" : "outline"}
              onClick={() => setBlockImages((prev) => !prev)}
              className="gap-1.5 text-xs"
            >
              <i className="ph ph-image-broken text-sm" />
              {blockImages ? "Images Blocked" : "Simulate Blocked Images"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/40 p-4 flex flex-col items-center">
          <div
            className="w-full transition-all duration-200"
            style={{ maxWidth: viewport === "mobile" ? 375 : 680 }}
          >
            <div className="bg-card border border-border/80 rounded-t-lg p-3 text-xs border-b flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Subject:</span>
              <span className="text-foreground font-medium truncate">
                {activeScenario.config.subject}
              </span>
            </div>
            <iframe
              title={`Universal Email Scenario ${activeScenario.number}`}
              srcDoc={renderedHtml}
              className="w-full h-[640px] border-0 rounded-b-lg bg-white shadow-xs"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
