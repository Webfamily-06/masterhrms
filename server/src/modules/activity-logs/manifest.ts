import { AddonManifest } from "../manifest.types";

export const activityLogsManifest: AddonManifest = {
  slug: "activity-logs",
  name: "Activity Logs",
  category: "Operations",
  type: "ops",
  surface: "app",
  routePrefix: "/activity-logs",
  engine: "E10",
  version: "1.0.0",
  entitlementKey: "activity-logs",
  provides: {
    nav: [
      {
        app: "activity-logs",
        heading: "Audit & Governance",
        label: "Audit Trail",
        path: "/activity-logs",
        permission: "activity-logs.view",
        icon: "ShieldAlert",
      },
      {
        app: "activity-logs",
        heading: "Audit & Governance",
        label: "Activity Exports",
        path: "/activity-logs/exports",
        permission: "activity-logs.export",
        icon: "FileSpreadsheet",
      },
    ],
    permissions: [
      "activity-logs.view",
      "activity-logs.export",
      "activity-logs.manage",
    ],
    settings: [
      "addon.activity-logs.retention_days",
      "addon.activity-logs.redact_sensitive_fields",
    ],
    events: ["activity_log.exported"],
  },
  marketplace: {
    tagline: "Comprehensive tenant-isolated audit log viewer, activity search, and redacted CSV export",
    description:
      "Enterprise audit governance system providing real-time activity tracking, actor and date filtering, pagination, secret redaction, and compliance-ready CSV exports.",
    features: [
      "Tenant-scoped audit event viewing and searching",
      "Actor, date range, entity type, and action filters",
      "Automatic redaction of passwords, tokens, API keys, and sensitive PII",
      "RFC 4180 compliant CSV export for statutory compliance",
      "Sub-second paginated queries with tenant boundary enforcement",
    ],
  },
};
