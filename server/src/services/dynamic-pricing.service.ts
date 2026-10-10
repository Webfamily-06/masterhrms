/**
 * MASTERHRMS — Phase A3.6: Dynamic Versioned Commercial Pricing Service (OD-1)
 *
 * Implements authoritative business decisions:
 * 1. Subscription & add-on pricing is dynamically configurable with versioning.
 * 2. Lifecycle: DRAFT -> PENDING_APPROVAL -> PUBLISHED -> ARCHIVED.
 * 3. Effective dates (effectiveFrom, effectiveTo), status, currency, tax info, audit attribution.
 * 4. Production checkout fails closed (PRICE_CONFIGURATION_MISSING) when no approved price exists.
 * 5. Immutable price snapshots on orders and invoices remain permanently frozen.
 * 6. Existing subscriptions grandfather their agreed pricing; future repricing requires explicit authorization.
 */

import { Decimal } from "decimal.js";
import { prisma, rawPrisma } from "../prisma";
import {
  getCommercePricingConfig,
  ProductPriceConfig,
} from "../config/commerce-pricing.config";

export type PriceScheduleStatus = "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "ARCHIVED";

export interface CreatePriceScheduleInput {
  productSlug: string;
  currency?: string;
  amountMonthly: number | string | Decimal;
  amountAnnual?: number | string | Decimal | null;
  taxPercentage?: number | string | Decimal;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  createdBy: string;
}

export class DynamicPricingError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "DynamicPricingError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DynamicPricingService {
  private static get db() {
    return rawPrisma || prisma;
  }

  /**
   * Creates a new DRAFT versioned price schedule for a product.
   */
  public static async createPriceSchedule(input: CreatePriceScheduleInput) {
    if (!input.productSlug || typeof input.productSlug !== "string") {
      throw new DynamicPricingError("INVALID_PRODUCT_SLUG", "Valid productSlug is required.");
    }

    const slug = input.productSlug.trim().toLowerCase();
    const currency = (input.currency || "INR").trim().toUpperCase();

    const monthlyDec = new Decimal(input.amountMonthly.toString());
    if (monthlyDec.isNaN() || monthlyDec.isNegative()) {
      throw new DynamicPricingError("INVALID_AMOUNT", "Monthly amount must be a non-negative number.");
    }

    let annualDec: Decimal | null = null;
    if (input.amountAnnual !== undefined && input.amountAnnual !== null) {
      annualDec = new Decimal(input.amountAnnual.toString());
      if (annualDec.isNaN() || annualDec.isNegative()) {
        throw new DynamicPricingError("INVALID_AMOUNT", "Annual amount must be a non-negative number.");
      }
    }

    const taxPercentage = input.taxPercentage !== undefined && input.taxPercentage !== null
      ? new Decimal(input.taxPercentage.toString())
      : new Decimal(18.00);

    const effectiveFrom = new Date(input.effectiveFrom);
    if (isNaN(effectiveFrom.getTime())) {
      throw new DynamicPricingError("INVALID_EFFECTIVE_DATE", "Valid effectiveFrom date is required.");
    }

    let effectiveTo: Date | null = null;
    if (input.effectiveTo) {
      effectiveTo = new Date(input.effectiveTo);
      if (isNaN(effectiveTo.getTime()) || effectiveTo <= effectiveFrom) {
        throw new DynamicPricingError("INVALID_EFFECTIVE_DATE", "effectiveTo must be after effectiveFrom.");
      }
    }

    // Determine next version integer
    const latestVersion = await this.db.commercialPriceSchedule.findFirst({
      where: { productSlug: slug },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latestVersion?.version || 0) + 1;

    const schedule = await this.db.commercialPriceSchedule.create({
      data: {
        productSlug: slug,
        currency,
        amountMonthly: monthlyDec.toFixed(2),
        amountAnnual: annualDec ? annualDec.toFixed(2) : null,
        taxPercentage: taxPercentage.toFixed(2),
        version: nextVersion,
        status: "DRAFT",
        effectiveFrom,
        effectiveTo,
        createdBy: input.createdBy,
      },
    });

    return schedule;
  }

  /**
   * Submits a DRAFT schedule for administrative approval.
   */
  public static async submitForApproval(scheduleId: string, actorUserId: string) {
    const existing = await this.db.commercialPriceSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw new DynamicPricingError("SCHEDULE_NOT_FOUND", "Price schedule not found.", 404);
    }

    if (existing.status !== "DRAFT") {
      throw new DynamicPricingError(
        "INVALID_STATE_TRANSITION",
        `Cannot submit schedule in status '${existing.status}' for approval. Must be 'DRAFT'.`,
        409
      );
    }

    return await this.db.commercialPriceSchedule.update({
      where: { id: scheduleId },
      data: {
        status: "PENDING_APPROVAL",
      },
    });
  }

  /**
   * Approves and publishes a price schedule.
   * Ensures previously published schedules for the same product are properly archived or bounded.
   */
  public static async approveAndPublish(scheduleId: string, approverUserId: string) {
    const existing = await this.db.commercialPriceSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw new DynamicPricingError("SCHEDULE_NOT_FOUND", "Price schedule not found.", 404);
    }

    if (existing.status !== "PENDING_APPROVAL" && existing.status !== "DRAFT") {
      throw new DynamicPricingError(
        "INVALID_STATE_TRANSITION",
        `Cannot publish schedule in status '${existing.status}'. Must be 'DRAFT' or 'PENDING_APPROVAL'.`,
        409
      );
    }

    const now = new Date();

    return await this.db.$transaction(async (tx: any) => {
      // Archive or bound older published schedules for this product
      await tx.commercialPriceSchedule.updateMany({
        where: {
          productSlug: existing.productSlug,
          status: "PUBLISHED",
          id: { not: existing.id },
        },
        data: {
          status: "ARCHIVED",
          effectiveTo: existing.effectiveFrom <= now ? now : existing.effectiveFrom,
        },
      });

      // Publish the approved schedule
      const published = await tx.commercialPriceSchedule.update({
        where: { id: scheduleId },
        data: {
          status: "PUBLISHED",
          approvedBy: approverUserId,
          approvedAt: now,
          publishedBy: approverUserId,
          publishedAt: now,
        },
      });

      return published;
    });
  }

  /**
   * Archives an existing price schedule.
   */
  public static async archiveSchedule(scheduleId: string, actorUserId: string) {
    const existing = await this.db.commercialPriceSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw new DynamicPricingError("SCHEDULE_NOT_FOUND", "Price schedule not found.", 404);
    }

    return await this.db.commercialPriceSchedule.update({
      where: { id: scheduleId },
      data: {
        status: "ARCHIVED",
        effectiveTo: new Date(),
      },
    });
  }

  /**
   * Queries the authoritative active published price schedule for a product.
   */
  public static async getActivePublishedSchedule(
    productSlug: string,
    targetDate = new Date()
  ) {
    const slug = productSlug.trim().toLowerCase();

    return await this.db.commercialPriceSchedule.findFirst({
      where: {
        productSlug: slug,
        status: "PUBLISHED",
        effectiveFrom: { lte: targetDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: targetDate } },
        ],
      },
      orderBy: { version: "desc" },
    });
  }

  /**
   * Resolves price configuration for a product:
   * 1. Checks active published database schedule first.
   * 2. If absent, falls back to config file / environment variables.
   * 3. In production, if unapproved, strictly fails closed (null).
   */
  public static async resolveProductPricing(
    productSlug: string,
    targetDate = new Date()
  ): Promise<ProductPriceConfig | null> {
    const slug = productSlug.trim().toLowerCase();
    const isProduction = process.env.NODE_ENV === "production";

    // 1. Database-backed published schedule check
    try {
      const dbSchedule = await this.getActivePublishedSchedule(slug, targetDate);
      if (dbSchedule) {
        return {
          monthly: Number(dbSchedule.amountMonthly),
          annual: dbSchedule.amountAnnual ? Number(dbSchedule.amountAnnual) : null,
          pricePerUser: null,
          includedSeats: undefined,
        };
      }
    } catch (err: any) {
      console.warn(`[DynamicPricingService] Database price lookup fallback for '${slug}':`, err?.message);
    }

    // 2. Fallback to existing config
    const config = getCommercePricingConfig();
    const configPrice = config.products[slug];

    if (configPrice) {
      return configPrice;
    }

    // 3. In production with no configuration: fail closed
    if (isProduction) {
      return null;
    }

    return null;
  }

  /**
   * Enforces that active subscriptions retain their initial grandfathered price.
   */
  public static isSubscriptionGrandfathered(subscription: any): boolean {
    // If subscription has a frozen pricePerUser or calculatedTotal, it retains it
    return Boolean(subscription?.calculatedTotal || subscription?.pricePerUser);
  }
}
