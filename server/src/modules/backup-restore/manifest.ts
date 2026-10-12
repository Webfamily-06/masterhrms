import { AddonManifest } from "../manifest.types";

export const backupRestoreManifest: AddonManifest = {
  slug: "backup-restore",
  name: "Backup and Restore",
  category: "Security and Authentication",
  type: "security",
  surface: "app",
  routePrefix: "/backup-restore",
  engine: "E9",
  version: "1.0.0",
  entitlementKey: "backup-restore",
  provides: {
    nav: [
      {
        app: "backup-restore",
        heading: "Data Protection",
        label: "Backups & Snapshots",
        path: "/backup-restore",
        permission: "backup-restore.manage",
        icon: "DatabaseBackup",
      },
      {
        app: "backup-restore",
        heading: "Data Protection",
        label: "Restore & Disaster Recovery",
        path: "/backup-restore/restore",
        permission: "backup-restore.restore",
        icon: "History",
      },
      {
        app: "backup-restore",
        heading: "Configuration",
        label: "Backup Schedules & Policy",
        path: "/backup-restore/policy",
        permission: "backup-restore.manage",
        icon: "Clock",
      },
    ],
    permissions: [
      "backup-restore.view",
      "backup-restore.manage",
      "backup-restore.export",
      "backup-restore.restore",
    ],
    settings: [
      "addon.backup-restore.retention_days",
      "addon.backup-restore.schedule_frequency",
      "addon.backup-restore.require_admin_approval",
    ],
    jobs: ["backup-restore.nightly_backup"],
    events: [
      "backup.created",
      "backup.downloaded",
      "backup.deleted",
      "restore.dry_run_completed",
      "restore.completed",
      "restore.failed",
    ],
  },
  marketplace: {
    tagline: "Tenant-isolated automated snapshots, encrypted exports, and safe disaster recovery",
    description:
      "Enterprise automated database backups with SHA-256 integrity verification, safe dry-run preview, and strictly isolated single-tenant restore safeguards.",
    features: [
      "Strict single-tenant database snapshot generation",
      "SHA-256 cryptographic bundle integrity verification",
      "Automated secret and credential redaction on export",
      "Pre-restore dry-run conflict and dependency analysis",
      "Anti-cross-tenant restore locks preventing data overwrites",
    ],
  },
};
