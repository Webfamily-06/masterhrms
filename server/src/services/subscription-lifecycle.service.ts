import { prisma, rawPrisma } from "../prisma";
import { getIO, broadcastToTenant } from "../socket";
import { sendSubscriptionLifecycleEmail, getDynamicEmailConfig } from "../lib/email";

export interface SuspendTenantOptions {
  tenantId: string;
  reason?: string;
  actorEmail?: string;
}

export interface ReactivateTenantOptions {
  tenantId: string;
  actorEmail?: string;
}

/**
 * Handle tenant workspace suspension:
 * - Update database status to 'suspended'
 * - Sever live socket connections
 * - Broadcast real-time suspension event
 * - Send email to Tenant Primary Admin
 * - Send email to Platform Super Admin
 * - Record notification attempt in SubscriptionNotificationEvent
 */
export async function handleTenantSuspension(options: SuspendTenantOptions): Promise<{
  success: boolean;
  status: string;
  emailsSent: number;
  message: string;
}> {
  const db = rawPrisma || prisma;
  const { tenantId, reason, actorEmail } = options;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!tenant) {
    throw new Error("Tenant workspace not found.");
  }

  // 1. Persist subscription status to 'suspended'
  const sub = await db.tenantSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      status: "suspended",
    },
    update: {
      status: "suspended",
    },
    include: { plan: true },
  });

  // 2. Disconnect real-time sockets
  try {
    getIO()?.in(`tenant:${tenantId}`).disconnectSockets(true);
  } catch (err: any) {
    console.warn(`[handleTenantSuspension] socket disconnect warning: ${err.message}`);
  }

  // 3. Broadcast real-time event to workspace
  broadcastToTenant(tenantId, "subscription:suspended", {
    status: "suspended",
    reason: reason || "Account administrative suspension.",
    timestamp: new Date().toISOString(),
  });

  // 4. Resolve email recipients and config
  const config = await getDynamicEmailConfig();
  const superAdminEmail = actorEmail || config.smtpFromEmail || "superadmin@masterhrms.com";
  const now = new Date();
  const suspensionDateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";

  const cycleKey = `suspend_${now.toISOString().slice(0, 10)}`;
  const suspensionReason = reason?.trim() || "Administrative account suspension or billing overdue policy.";

  // Resolve Primary Admin Email
  let tenantAdminEmail: string | null = null;
  let adminName = "Workspace Administrator";

  const adminUserRole = await db.userRole.findFirst({
    where: {
      tenantId,
      role: { in: ["hr_admin", "super_admin", "manager"] },
    },
    include: {
      user: {
        include: { profile: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (adminUserRole?.user?.email) {
    tenantAdminEmail = adminUserRole.user.email;
    adminName = adminUserRole.user.profile?.fullName || adminName;
  } else {
    const profile = await db.profile.findFirst({
      where: { tenantId },
      include: { user: true },
    });
    if (profile?.email || profile?.user?.email) {
      tenantAdminEmail = profile.email || profile.user.email;
      adminName = profile.fullName || adminName;
    }
  }

  let emailsSent = 0;

  // 5. Send Suspension Email to Tenant Admin (idempotent for this suspension cycle)
  if (tenantAdminEmail) {
    const existingTenantEvent = await db.subscriptionNotificationEvent.findUnique({
      where: {
        subscriptionId_cycleKey_eventType: {
          subscriptionId: sub.id,
          cycleKey,
          eventType: "suspended",
        },
      },
    });

    if (!existingTenantEvent || existingTenantEvent.status !== "sent") {
      const emailRes = await sendSubscriptionLifecycleEmail({
        toEmail: tenantAdminEmail,
        templateId: "tenant-account-suspended",
        variables: {
          company_name: tenant.name,
          tenant_name: tenant.name,
          tenant_id: tenant.id,
          plan_name: sub.plan?.name || "Active Tier",
          expiry_date: sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "N/A",
          days_remaining: "0",
          suspension_date: suspensionDateStr,
          suspension_reason: suspensionReason,
          support_email: config.smtpFromEmail || "support@masterhrms.com",
          renewal_url: `${process.env.APP_BASE_URL || "https://masterhrms.com"}/subscription`,
          admin_name: adminName,
        },
      });

      await db.subscriptionNotificationEvent.upsert({
        where: {
          subscriptionId_cycleKey_eventType: {
            subscriptionId: sub.id,
            cycleKey,
            eventType: "suspended",
          },
        },
        create: {
          tenantId,
          subscriptionId: sub.id,
          cycleKey,
          eventType: "suspended",
          recipientEmail: tenantAdminEmail,
          status: emailRes.success ? "sent" : "failed",
          sentAt: emailRes.success ? new Date() : null,
          errorMessage: emailRes.error || null,
        },
        update: {
          recipientEmail: tenantAdminEmail,
          status: emailRes.success ? "sent" : "failed",
          sentAt: emailRes.success ? new Date() : null,
          errorMessage: emailRes.error || null,
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      if (emailRes.success) emailsSent++;
    }
  }

  // 6. Send Suspension Notice to Platform Super Admin
  if (superAdminEmail && superAdminEmail !== tenantAdminEmail) {
    const superCycleKey = `super_suspend_${now.toISOString().slice(0, 10)}`;
    const existingSuperEvent = await db.subscriptionNotificationEvent.findUnique({
      where: {
        subscriptionId_cycleKey_eventType: {
          subscriptionId: sub.id,
          cycleKey: superCycleKey,
          eventType: "suspended_super_admin",
        },
      },
    });

    if (!existingSuperEvent || existingSuperEvent.status !== "sent") {
      const emailRes = await sendSubscriptionLifecycleEmail({
        toEmail: superAdminEmail,
        templateId: "tenant-account-suspended",
        variables: {
          company_name: `[SUPER ADMIN AUDIT] ${tenant.name}`,
          tenant_name: tenant.name,
          tenant_id: tenant.id,
          plan_name: sub.plan?.name || "Active Tier",
          expiry_date: sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "N/A",
          days_remaining: "0",
          suspension_date: suspensionDateStr,
          suspension_reason: suspensionReason,
          support_email: config.smtpFromEmail || "support@masterhrms.com",
          renewal_url: `${process.env.APP_BASE_URL || "https://masterhrms.com"}/super/tenants`,
          admin_name: "Platform Super Administrator",
        },
      });

      await db.subscriptionNotificationEvent.upsert({
        where: {
          subscriptionId_cycleKey_eventType: {
            subscriptionId: sub.id,
            cycleKey: superCycleKey,
            eventType: "suspended_super_admin",
          },
        },
        create: {
          tenantId,
          subscriptionId: sub.id,
          cycleKey: superCycleKey,
          eventType: "suspended_super_admin",
          recipientEmail: superAdminEmail,
          status: emailRes.success ? "sent" : "failed",
          sentAt: emailRes.success ? new Date() : null,
          errorMessage: emailRes.error || null,
        },
        update: {
          recipientEmail: superAdminEmail,
          status: emailRes.success ? "sent" : "failed",
          sentAt: emailRes.success ? new Date() : null,
          errorMessage: emailRes.error || null,
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      if (emailRes.success) emailsSent++;
    }
  }

  return {
    success: true,
    status: "suspended",
    emailsSent,
    message: `Tenant workspace '${tenant.name}' suspended successfully.`,
  };
}

/**
 * Handle tenant workspace reactivation:
 * - Update database status to 'active'
 * - Send email to Tenant Primary Admin
 * - Broadcast reactivation event
 */
export async function handleTenantReactivation(options: ReactivateTenantOptions): Promise<{
  success: boolean;
  status: string;
  message: string;
}> {
  const db = rawPrisma || prisma;
  const { tenantId } = options;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!tenant) {
    throw new Error("Tenant workspace not found.");
  }

  const sub = await db.tenantSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      status: "active",
    },
    update: {
      status: "active",
    },
    include: { plan: true },
  });

  broadcastToTenant(tenantId, "subscription:reactivated", {
    status: "active",
    timestamp: new Date().toISOString(),
  });

  // Send reactivation email
  const config = await getDynamicEmailConfig();
  const adminUserRole = await db.userRole.findFirst({
    where: {
      tenantId,
      role: { in: ["hr_admin", "super_admin"] },
    },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "asc" },
  });

  const tenantAdminEmail = adminUserRole?.user?.email;
  if (tenantAdminEmail) {
    await sendSubscriptionLifecycleEmail({
      toEmail: tenantAdminEmail,
      templateId: "tenant-account-reactivated",
      variables: {
        company_name: tenant.name,
        tenant_name: tenant.name,
        tenant_id: tenant.id,
        plan_name: sub.plan?.name || "Active Plan",
        expiry_date: sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "Active",
        days_remaining: "Active",
        support_email: config.smtpFromEmail || "support@masterhrms.com",
        renewal_url: `${process.env.APP_BASE_URL || "https://masterhrms.com"}/dashboard`,
        admin_name: adminUserRole?.user?.profile?.fullName || "Administrator",
      },
    });
  }

  return {
    success: true,
    status: "active",
    message: `Tenant workspace '${tenant.name}' reactivated successfully.`,
  };
}
