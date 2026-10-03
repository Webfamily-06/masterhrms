import { prisma, rawPrisma } from "../prisma";
import { broadcastToTenant } from "../socket";
import { sendSubscriptionLifecycleEmail, getDynamicEmailConfig } from "../lib/email";
import { getBaseDomain, getWorkspaceUrl, getRootUrl } from "../lib/workspace-host";

export interface ReminderProcessResult {
  totalChecked: number;
  remindersSent: number;
  remindersFailed: number;
  alreadyProcessed: number;
  expiredCount: number;
  details: Array<{
    tenantId: string;
    tenantName: string;
    eventType: string;
    recipientEmail: string;
    status: "sent" | "failed" | "skipped";
    message?: string;
  }>;
}

const REMINDER_THRESHOLDS: Array<{ days: number; eventType: string; templateId: string }> = [
  { days: 1, eventType: "reminder_1d", templateId: "subscription-reminder-1d" },
  { days: 2, eventType: "reminder_2d", templateId: "subscription-reminder-2d" },
  { days: 3, eventType: "reminder_3d", templateId: "subscription-reminder-3d" },
  { days: 5, eventType: "reminder_5d", templateId: "subscription-reminder-5d" },
  { days: 10, eventType: "reminder_10d", templateId: "subscription-reminder-10d" },
  { days: 15, eventType: "reminder_15d", templateId: "subscription-reminder-15d" },
];

/**
 * Execute central platform cron to evaluate all tenant subscriptions, calculate remaining days,
 * and dispatch automated lifecycle warning emails idempotently.
 */
export async function runSubscriptionExpiryRemindersCron(): Promise<ReminderProcessResult> {
  const db = rawPrisma || prisma;
  const now = new Date();
  const config = await getDynamicEmailConfig();

  const result: ReminderProcessResult = {
    totalChecked: 0,
    remindersSent: 0,
    remindersFailed: 0,
    alreadyProcessed: 0,
    expiredCount: 0,
    details: [],
  };

  // Find all active/trialing/past_due subscriptions with an authoritative expiry date
  const subscriptions = await db.tenantSubscription.findMany({
    where: {
      status: { notIn: ["suspended", "cancelled"] },
      expiresAt: { not: null },
    },
    include: {
      tenant: true,
      plan: true,
    },
  });

  result.totalChecked = subscriptions.length;

  for (const sub of subscriptions) {
    if (!sub.expiresAt) continue;

    const expiryTime = new Date(sub.expiresAt).getTime();
    const nowTime = now.getTime();
    const diffMs = expiryTime - nowTime;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const cycleKey = `exp_${new Date(sub.expiresAt).toISOString().slice(0, 10)}`;

    // 1. Expired state handling
    if (diffDays <= 0) {
      result.expiredCount++;
      // Check if expired notice was already dispatched
      const existingExpiredEvent = await db.subscriptionNotificationEvent.findUnique({
        where: {
          subscriptionId_cycleKey_eventType: {
            subscriptionId: sub.id,
            cycleKey,
            eventType: "expired",
          },
        },
      });

      if (!existingExpiredEvent || existingExpiredEvent.status !== "sent") {
        const recipientEmail = await resolveTenantAdminEmail(db, sub.tenantId);
        if (recipientEmail) {
          const emailRes = await sendSubscriptionLifecycleEmail({
            toEmail: recipientEmail,
            templateId: "subscription-expired",
            variables: {
              company_name: sub.tenant?.name || "Company Workspace",
              tenant_name: sub.tenant?.name || "Company Workspace",
              tenant_id: sub.tenantId,
              plan_name: sub.plan?.name || "Active Plan",
              expiry_date: formatDateDisplay(sub.expiresAt),
              days_remaining: "0",
              support_email: config.smtpFromEmail || `support@${getBaseDomain()}`,
              renewal_url: `${sub.tenant?.slug ? getWorkspaceUrl(sub.tenant.slug) : getRootUrl()}/subscription`,
              admin_name: "Workspace Administrator",
            },
          });

          await db.subscriptionNotificationEvent.upsert({
            where: {
              subscriptionId_cycleKey_eventType: {
                subscriptionId: sub.id,
                cycleKey,
                eventType: "expired",
              },
            },
            create: {
              tenantId: sub.tenantId,
              subscriptionId: sub.id,
              cycleKey,
              eventType: "expired",
              recipientEmail,
              status: emailRes.success ? "sent" : "failed",
              sentAt: emailRes.success ? new Date() : null,
              errorMessage: emailRes.error || null,
            },
            update: {
              recipientEmail,
              status: emailRes.success ? "sent" : "failed",
              sentAt: emailRes.success ? new Date() : null,
              errorMessage: emailRes.error || null,
              attemptCount: { increment: 1 },
              lastAttemptAt: new Date(),
            },
          });

          if (emailRes.success) {
            broadcastToTenant(sub.tenantId, "subscription:expired", {
              status: "expired",
              expiresAt: sub.expiresAt,
              message: "Workspace subscription has expired. Workspace access is locked.",
            });
          }
        }
      }
      continue;
    }

    // 2. Reminder thresholds evaluation: match exact active threshold
    const threshold = REMINDER_THRESHOLDS.find((t) => diffDays <= t.days);
    if (!threshold) continue;

    // Check idempotency record
    const existingEvent = await db.subscriptionNotificationEvent.findUnique({
      where: {
        subscriptionId_cycleKey_eventType: {
          subscriptionId: sub.id,
          cycleKey,
          eventType: threshold.eventType,
        },
      },
    });

    if (existingEvent && existingEvent.status === "sent") {
      result.alreadyProcessed++;
      continue;
    }

    // Target primary admin or billing contact
    const recipientEmail = await resolveTenantAdminEmail(db, sub.tenantId);
    if (!recipientEmail) {
      result.details.push({
        tenantId: sub.tenantId,
        tenantName: sub.tenant?.name || sub.tenantId,
        eventType: threshold.eventType,
        recipientEmail: "N/A",
        status: "skipped",
        message: "No admin email configured for tenant",
      });
      continue;
    }

    const emailRes = await sendSubscriptionLifecycleEmail({
      toEmail: recipientEmail,
      templateId: threshold.templateId,
      variables: {
        company_name: sub.tenant?.name || "Company Workspace",
        tenant_name: sub.tenant?.name || "Company Workspace",
        tenant_id: sub.tenantId,
        plan_name: sub.plan?.name || "Pro Plan",
        expiry_date: formatDateDisplay(sub.expiresAt),
        days_remaining: String(diffDays),
        support_email: config.smtpFromEmail || `support@${getBaseDomain()}`,
        renewal_url: `${sub.tenant?.slug ? getWorkspaceUrl(sub.tenant.slug) : getRootUrl()}/subscription`,
        admin_name: "Workspace Administrator",
      },
    });

    // Record attempt in database
    await db.subscriptionNotificationEvent.upsert({
      where: {
        subscriptionId_cycleKey_eventType: {
          subscriptionId: sub.id,
          cycleKey,
          eventType: threshold.eventType,
        },
      },
      create: {
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        cycleKey,
        eventType: threshold.eventType,
        recipientEmail,
        status: emailRes.success ? "sent" : "failed",
        sentAt: emailRes.success ? new Date() : null,
        errorMessage: emailRes.error || null,
      },
      update: {
        recipientEmail,
        status: emailRes.success ? "sent" : "failed",
        sentAt: emailRes.success ? new Date() : null,
        errorMessage: emailRes.error || null,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    if (emailRes.success) {
      result.remindersSent++;
      result.details.push({
        tenantId: sub.tenantId,
        tenantName: sub.tenant?.name || sub.tenantId,
        eventType: threshold.eventType,
        recipientEmail,
        status: "sent",
      });

      broadcastToTenant(sub.tenantId, "subscription:warning", {
        remainingDays: diffDays,
        expiresAt: sub.expiresAt,
        planName: sub.plan?.name || "Standard",
      });
    } else {
      result.remindersFailed++;
      result.details.push({
        tenantId: sub.tenantId,
        tenantName: sub.tenant?.name || sub.tenantId,
        eventType: threshold.eventType,
        recipientEmail,
        status: "failed",
        message: emailRes.error,
      });
    }
  }

  console.log(
    `[subscription-reminder-cron] Processed: ${result.totalChecked} checked, ${result.remindersSent} sent, ${result.remindersFailed} failed, ${result.alreadyProcessed} idempotent skips.`
  );
  return result;
}

/**
 * Resolve tenant primary admin email
 */
async function resolveTenantAdminEmail(db: any, tenantId: string): Promise<string | null> {
  try {
    // 1. First search user roles for designated hr_admin or tenant admin
    const adminUserRole = await db.userRole.findFirst({
      where: {
        tenantId,
        role: { in: ["hr_admin", "super_admin"] },
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (adminUserRole?.user?.email) {
      return adminUserRole.user.email;
    }

    // 2. Profile fallback
    const profile = await db.profile.findFirst({
      where: { tenantId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return profile?.email || profile?.user?.email || null;
  } catch (err: any) {
    console.error(`[resolveTenantAdminEmail] Error for ${tenantId}:`, err.message);
    return null;
  }
}

function formatDateDisplay(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
