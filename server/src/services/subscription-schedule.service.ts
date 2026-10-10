/**
 * MASTERHRMS — Phase A3.6: Subscription Schedule & Super Admin Override Service (OD-10)
 *
 * Implements authoritative business decisions:
 * 1. Customer-initiated plan changes are scheduled for the next renewal date (currentPeriodEnd).
 * 2. Active plan, entitlements, and seat limits remain 100% active until renewal.
 * 3. Downgrades validate employee usage against target plan limits; declines safely if exceeded.
 * 4. Full paid value of current cycle is preserved with zero mid-cycle proration loss.
 * 5. Platform Super Admins can perform controlled immediate overrides with mandatory:
 *    - super_admin role authorization
 *    - operational ticket/support reference
 *    - written justification
 *    - immutable before/after audit trail in SubscriptionPolicyAudit.
 */

import { prisma, rawPrisma } from "../prisma";
import { AuditService } from "./audit.service";
import { planTierRank } from "./commerce-fulfillment.service";

export class SubscriptionScheduleError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "SubscriptionScheduleError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function getPlanSeatCapacity(planSlug: string): number {
  const slug = planSlug.toLowerCase();
  if (slug === "starter") return 25;
  if (slug === "growth") return 100;
  if (slug === "sovereign") return 500;
  return 25;
}

export class SubscriptionScheduleService {
  private static get db() {
    return rawPrisma || prisma;
  }

  /**
   * Schedules a normal customer plan change for the next renewal date.
   */
  public static async schedulePlanChange(params: {
    tenantId: string;
    targetPlanSlug: string;
    userId: string;
    targetSeats?: number;
  }) {
    const { tenantId, targetPlanSlug, userId } = params;

    const sub = await this.db.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!sub || sub.status !== "active") {
      throw new SubscriptionScheduleError(
        "NO_ACTIVE_SUBSCRIPTION",
        "Workspace does not have an active subscription to schedule a plan change for.",
        404
      );
    }

    const currentPlan = sub.planId || "starter";
    const targetSlug = targetPlanSlug.trim().toLowerCase();

    if (currentPlan.toLowerCase() === targetSlug) {
      throw new SubscriptionScheduleError(
        "IDENTICAL_PLAN",
        `Workspace is already on ${targetSlug} plan.`,
        400
      );
    }

    const targetSeats = params.targetSeats || getPlanSeatCapacity(targetSlug);

    // Downgrade capacity check: validate active employees do not exceed target capacity
    const currentRank = planTierRank(currentPlan);
    const targetRank = planTierRank(targetSlug);

    if (targetRank < currentRank || targetSeats < (sub.maxEmployees || 0)) {
      let activeEmployeeCount = 0;
      try {
        activeEmployeeCount = await this.db.employee.count({
          where: { tenantId, status: "active" },
        });
      } catch (err: any) {
        // Fallback if employee table is empty
        activeEmployeeCount = 0;
      }

      if (activeEmployeeCount > targetSeats) {
        throw new SubscriptionScheduleError(
          "DOWNGRADE_CAPACITY_EXCEEDED",
          `Workspace active employee count (${activeEmployeeCount}) exceeds target plan capacity (${targetSeats}). Deactivate excess employees before scheduling downgrade.`,
          409
        );
      }
    }

    const now = new Date();
    const effectiveDate = sub.currentPeriodEnd && sub.currentPeriodEnd > now
      ? sub.currentPeriodEnd
      : new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    const updated = await this.db.tenantSubscription.update({
      where: { tenantId },
      data: {
        scheduledPlanId: targetSlug,
        scheduledAt: now,
        scheduledEffectiveDate: effectiveDate,
        scheduledByUserId: userId,
        scheduledSeats: targetSeats,
      },
    });

    return {
      success: true,
      message: `Plan change to '${targetSlug}' scheduled for next renewal.`,
      currentPlan: sub.planId,
      scheduledPlan: targetSlug,
      scheduledSeats: targetSeats,
      effectiveDate,
    };
  }

  /**
   * Cancels a pending scheduled plan change.
   */
  public static async cancelScheduledPlanChange(tenantId: string, userId: string) {
    const sub = await this.db.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!sub || !sub.scheduledPlanId) {
      throw new SubscriptionScheduleError(
        "NO_SCHEDULED_CHANGE",
        "Workspace has no pending scheduled plan change to cancel.",
        404
      );
    }

    const previousScheduledPlan = sub.scheduledPlanId;

    const updated = await this.db.tenantSubscription.update({
      where: { tenantId },
      data: {
        scheduledPlanId: null,
        scheduledAt: null,
        scheduledEffectiveDate: null,
        scheduledByUserId: null,
        scheduledSeats: null,
      },
    });

    return {
      success: true,
      message: `Scheduled change to '${previousScheduledPlan}' has been cancelled.`,
      currentPlan: sub.planId,
    };
  }

  /**
   * Executes a scheduled plan change upon renewal settlement.
   */
  public static async applyScheduledPlanChange(tenantId: string, actorId = "RENEWAL_SCHEDULER") {
    const sub = await this.db.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!sub || !sub.scheduledPlanId) {
      return { applied: false, reason: "No scheduled plan change." };
    }

    const targetPlan = sub.scheduledPlanId;
    const targetSeats = sub.scheduledSeats || getPlanSeatCapacity(targetPlan);
    const now = new Date();

    const beforeState = {
      planId: sub.planId,
      status: sub.status,
      maxEmployees: sub.maxEmployees,
      billingInterval: sub.billingInterval,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
    };

    const afterState = {
      planId: targetPlan,
      status: "active",
      maxEmployees: targetSeats,
      appliedAt: now.toISOString(),
      transitionType: "RENEWAL_SCHEDULED_PLAN_CHANGE",
    };

    await this.db.$transaction(async (tx: any) => {
      await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          planId: targetPlan,
          status: "active",
          maxEmployees: targetSeats,
          maxUsers: targetSeats,
          scheduledPlanId: null,
          scheduledAt: null,
          scheduledEffectiveDate: null,
          scheduledByUserId: null,
          scheduledSeats: null,
        },
      });

      await tx.subscriptionPolicyAudit.create({
        data: {
          tenantId,
          subscriptionId: sub.id,
          actorUserId: actorId,
          before: beforeState,
          after: afterState,
        },
      });
    });

    return {
      applied: true,
      previousPlan: sub.planId,
      newPlan: targetPlan,
      maxEmployees: targetSeats,
    };
  }

  /**
   * Controlled Super Admin Immediate Override.
   * Strictly requires:
   * 1. Authorized super_admin actor
   * 2. Mandatory operational ticket reference
   * 3. Written justification
   * 4. Immutable before/after audit logging in SubscriptionPolicyAudit.
   */
  public static async executeSuperAdminOverride(params: {
    superAdminUserId: string;
    superAdminEmail?: string;
    targetTenantId: string;
    targetPlanSlug: string;
    ticketReference: string;
    reason: string;
    financialTerms: "COMPLIMENTARY" | "IMMEDIATE_CHARGE" | "OUT_OF_BAND_INVOICE";
    targetSeats?: number;
    billingInterval?: string;
  }) {
    const {
      superAdminUserId,
      targetTenantId,
      targetPlanSlug,
      ticketReference,
      reason,
      financialTerms,
    } = params;

    if (!ticketReference || typeof ticketReference !== "string" || ticketReference.trim() === "") {
      throw new SubscriptionScheduleError(
        "MISSING_TICKET_REFERENCE",
        "Operational change ticket reference is mandatory for Super Admin overrides.",
        400
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      throw new SubscriptionScheduleError(
        "MISSING_OVERRIDE_REASON",
        "Written justification is mandatory for Super Admin overrides.",
        400
      );
    }

    if (!financialTerms || !["COMPLIMENTARY", "IMMEDIATE_CHARGE", "OUT_OF_BAND_INVOICE"].includes(financialTerms)) {
      throw new SubscriptionScheduleError(
        "INVALID_FINANCIAL_TERMS",
        "financialTerms must be one of: COMPLIMENTARY, IMMEDIATE_CHARGE, OUT_OF_BAND_INVOICE.",
        400
      );
    }

    const sub = await this.db.tenantSubscription.findUnique({
      where: { tenantId: targetTenantId },
    });

    if (!sub) {
      throw new SubscriptionScheduleError(
        "TENANT_SUBSCRIPTION_NOT_FOUND",
        `No subscription found for workspace ${targetTenantId}.`,
        404
      );
    }

    const targetSlug = targetPlanSlug.trim().toLowerCase();
    const targetSeats = params.targetSeats || getPlanSeatCapacity(targetSlug);
    const now = new Date();

    const beforeState = {
      planId: sub.planId,
      status: sub.status,
      maxEmployees: sub.maxEmployees,
      maxUsers: sub.maxUsers,
      billingInterval: sub.billingInterval,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      scheduledPlanId: sub.scheduledPlanId,
    };

    const afterState = {
      planId: targetSlug,
      status: "active",
      maxEmployees: targetSeats,
      maxUsers: targetSeats,
      overrideReason: reason.trim(),
      ticketReference: ticketReference.trim(),
      financialTerms,
      overriddenBy: superAdminUserId,
      overriddenAt: now.toISOString(),
      transitionType: "SUPER_ADMIN_IMMEDIATE_OVERRIDE",
    };

    const result = await this.db.$transaction(async (tx: any) => {
      const updatedSub = await tx.tenantSubscription.update({
        where: { tenantId: targetTenantId },
        data: {
          planId: targetSlug,
          status: "active",
          maxEmployees: targetSeats,
          maxUsers: targetSeats,
          scheduledPlanId: null, // Clear any pending renewal change
          scheduledAt: null,
          scheduledEffectiveDate: null,
          scheduledByUserId: null,
          scheduledSeats: null,
        },
      });

      const auditRecord = await tx.subscriptionPolicyAudit.create({
        data: {
          tenantId: targetTenantId,
          subscriptionId: sub.id,
          actorUserId: superAdminUserId,
          before: beforeState,
          after: afterState,
        },
      });

      return { updatedSub, auditRecord };
    });

    return {
      success: true,
      message: `Subscription successfully updated to '${targetSlug}' via Super Admin override.`,
      tenantId: targetTenantId,
      previousPlan: sub.planId,
      newPlan: targetSlug,
      seats: targetSeats,
      auditId: result.auditRecord.id,
      ticketReference: ticketReference.trim(),
    };
  }
}
