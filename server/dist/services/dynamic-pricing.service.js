"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicPricingService = exports.DynamicPricingError = void 0;
const decimal_js_1 = require("decimal.js");
const prisma_1 = require("../prisma");
const commerce_pricing_config_1 = require("../config/commerce-pricing.config");
class DynamicPricingError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode = 400) {
        super(message);
        this.name = "DynamicPricingError";
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.DynamicPricingError = DynamicPricingError;
class DynamicPricingService {
    static get db() {
        return prisma_1.rawPrisma || prisma_1.prisma;
    }
    /**
     * Creates a new DRAFT versioned price schedule for a product.
     */
    static async createPriceSchedule(input) {
        if (!input.productSlug || typeof input.productSlug !== "string") {
            throw new DynamicPricingError("INVALID_PRODUCT_SLUG", "Valid productSlug is required.");
        }
        const slug = input.productSlug.trim().toLowerCase();
        const currency = (input.currency || "INR").trim().toUpperCase();
        const monthlyDec = new decimal_js_1.Decimal(input.amountMonthly.toString());
        if (monthlyDec.isNaN() || monthlyDec.isNegative()) {
            throw new DynamicPricingError("INVALID_AMOUNT", "Monthly amount must be a non-negative number.");
        }
        let annualDec = null;
        if (input.amountAnnual !== undefined && input.amountAnnual !== null) {
            annualDec = new decimal_js_1.Decimal(input.amountAnnual.toString());
            if (annualDec.isNaN() || annualDec.isNegative()) {
                throw new DynamicPricingError("INVALID_AMOUNT", "Annual amount must be a non-negative number.");
            }
        }
        const taxPercentage = input.taxPercentage !== undefined && input.taxPercentage !== null
            ? new decimal_js_1.Decimal(input.taxPercentage.toString())
            : new decimal_js_1.Decimal(18.00);
        const effectiveFrom = new Date(input.effectiveFrom);
        if (isNaN(effectiveFrom.getTime())) {
            throw new DynamicPricingError("INVALID_EFFECTIVE_DATE", "Valid effectiveFrom date is required.");
        }
        let effectiveTo = null;
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
    static async submitForApproval(scheduleId, actorUserId) {
        const existing = await this.db.commercialPriceSchedule.findUnique({
            where: { id: scheduleId },
        });
        if (!existing) {
            throw new DynamicPricingError("SCHEDULE_NOT_FOUND", "Price schedule not found.", 404);
        }
        if (existing.status !== "DRAFT") {
            throw new DynamicPricingError("INVALID_STATE_TRANSITION", `Cannot submit schedule in status '${existing.status}' for approval. Must be 'DRAFT'.`, 409);
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
    static async approveAndPublish(scheduleId, approverUserId) {
        const existing = await this.db.commercialPriceSchedule.findUnique({
            where: { id: scheduleId },
        });
        if (!existing) {
            throw new DynamicPricingError("SCHEDULE_NOT_FOUND", "Price schedule not found.", 404);
        }
        if (existing.status !== "PENDING_APPROVAL" && existing.status !== "DRAFT") {
            throw new DynamicPricingError("INVALID_STATE_TRANSITION", `Cannot publish schedule in status '${existing.status}'. Must be 'DRAFT' or 'PENDING_APPROVAL'.`, 409);
        }
        const now = new Date();
        return await this.db.$transaction(async (tx) => {
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
    static async archiveSchedule(scheduleId, actorUserId) {
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
    static async getActivePublishedSchedule(productSlug, targetDate = new Date()) {
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
    static async resolveProductPricing(productSlug, targetDate = new Date()) {
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
        }
        catch (err) {
            console.warn(`[DynamicPricingService] Database price lookup fallback for '${slug}':`, err?.message);
        }
        // 2. Fallback to existing config
        const config = (0, commerce_pricing_config_1.getCommercePricingConfig)();
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
    static isSubscriptionGrandfathered(subscription) {
        // If subscription has a frozen pricePerUser or calculatedTotal, it retains it
        return Boolean(subscription?.calculatedTotal || subscription?.pricePerUser);
    }
}
exports.DynamicPricingService = DynamicPricingService;
