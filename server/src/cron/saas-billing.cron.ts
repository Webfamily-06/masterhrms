import { prisma, rawPrisma } from "../prisma";
import { broadcastToTenant } from "../socket";

/**
 * Daily Cron Job: Expire Trials
 * Moves subscriptions from 'trialing' to 'past_due' if trialEndsAt has passed.
 */
export async function runExpireTrialsCron(): Promise<{ expiredCount: number }> {
  const db = rawPrisma || prisma;
  const now = new Date();

  const expiredTrials = await db.tenantSubscription.findMany({
    where: {
      status: "trialing",
      trialEndsAt: { lt: now },
    },
  });

  let expiredCount = 0;
  for (const sub of expiredTrials) {
    await db.tenantSubscription.update({
      where: { id: sub.id },
      data: { status: "past_due" },
    });

    // Notify workspace
    broadcastToTenant(sub.tenantId, "subscription:status", {
      status: "past_due",
      message: "Your free trial has ended. Please choose a plan to continue without interruption.",
    });

    expiredCount++;
  }

  console.log(`[expire-trials-cron] Checked at ${now.toISOString()}: ${expiredCount} trials expired to past_due.`);
  return { expiredCount };
}

/**
 * Daily Cron Job: Renewals & Suspension Enforcement
 * Tenants in 'past_due' status for more than graceDays (default 7 days) are transitioned to 'suspended'.
 */
export async function runRenewalsAndGraceCron(graceDays = 7): Promise<{ suspendedCount: number }> {
  const db = rawPrisma || prisma;
  const cutoffDate = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);

  // Find past_due subscriptions that have exceeded the grace window
  const overdueSubs = await db.tenantSubscription.findMany({
    where: {
      status: "past_due",
      updatedAt: { lt: cutoffDate },
    },
  });

  let suspendedCount = 0;
  for (const sub of overdueSubs) {
    await db.tenantSubscription.update({
      where: { id: sub.id },
      data: { status: "suspended" },
    });

    broadcastToTenant(sub.tenantId, "subscription:suspended", {
      status: "suspended",
      code: "SUBSCRIPTION_SUSPENDED",
      message: "Workspace subscription suspended due to overdue payment.",
    });

    suspendedCount++;
  }

  console.log(`[renewals-grace-cron] ${suspendedCount} workspaces transitioned from past_due to suspended.`);
  return { suspendedCount };
}
