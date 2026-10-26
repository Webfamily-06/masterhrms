"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalRemindersManifest = void 0;
exports.internalRemindersManifest = {
    slug: "internal-reminders",
    name: "Internal Reminders",
    category: "Operations",
    type: "ops",
    surface: "app",
    routePrefix: "/reminders",
    engine: "E10",
    version: "1.0.0",
    entitlementKey: "internal-reminders",
    provides: {
        nav: [
            {
                app: "internal-reminders",
                heading: "Task & Time Management",
                label: "Contextual Reminders",
                path: "/reminders",
                permission: "internal-reminders.view",
                icon: "BellRing",
            },
            {
                app: "internal-reminders",
                heading: "Task & Time Management",
                label: "Due Date Calendar",
                path: "/reminders/calendar",
                permission: "internal-reminders.view",
                icon: "CalendarClock",
            },
        ],
        permissions: [
            "internal-reminders.view",
            "internal-reminders.manage",
            "internal-reminders.create",
        ],
        settings: [
            "addon.internal-reminders.auto_sync_invoices",
            "addon.internal-reminders.auto_sync_probations",
            "addon.internal-reminders.default_lead_days",
        ],
        jobs: ["internal-reminders.nightly_sync"],
        events: ["reminder.created", "reminder.completed", "reminder.deleted"],
    },
    marketplace: {
        tagline: "Context-aware automated and manual operational reminders linked across HR, CRM, and Invoices",
        description: "Intelligent persistent reminders system integrated across HR milestones (probations, reviews), CRM deal deadlines, and invoice payment due dates with duplicate prevention and tenant isolation.",
        features: [
            "Contextual linking to HR employees, CRM deals, and Invoices",
            "Automated idempotency and duplicate reminder prevention",
            "Strict multi-tenant security and user authorization boundaries",
            "Real-time due-date tracking, priority queues, and overdue alerts",
            "Audit trail and transactional outbox notifications",
        ],
    },
};
