"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantDomainRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const domain_normalization_1 = require("../lib/domain-normalization");
const domain_dns_service_1 = require("../services/domain-dns.service");
const workspace_host_1 = require("../lib/workspace-host");
exports.tenantDomainRouter = (0, express_1.Router)();
// ─────────────────────────────────────────────
// 1. GET /api/workspace/custom-domain
// Returns all custom domains registered for the current workspace
// ─────────────────────────────────────────────
exports.tenantDomainRouter.get("/", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: "Tenant context missing" });
        }
        const domains = await prisma.tenantDomain.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
        });
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, slug: true, name: true },
        });
        const formatted = domains.map((d) => {
            const requiredDns = (0, domain_dns_service_1.getRequiredDnsRecords)(d.domain, d.verificationToken || "");
            const isActive = d.status === "approved" && d.dnsStatus === "verified";
            return {
                id: d.id,
                domain: d.domain,
                subdomain: d.subdomain,
                targetCname: d.targetCname || (0, domain_dns_service_1.getPlatformCnameTarget)(),
                isPrimary: d.isPrimary,
                status: d.status,
                sslStatus: d.sslStatus,
                dnsStatus: d.dnsStatus,
                isActive,
                verificationToken: d.verificationToken,
                verificationMethod: d.verificationMethod,
                verifiedAt: d.verifiedAt?.toISOString(),
                approvedAt: d.approvedAt?.toISOString(),
                sslIssuedAt: d.sslIssuedAt?.toISOString(),
                lastCheckedAt: d.lastCheckedAt?.toISOString(),
                lastDnsError: d.lastDnsError,
                rejectedReason: d.rejectedReason,
                createdAt: d.createdAt.toISOString(),
                requiredDns,
                customDomainUrl: (0, workspace_host_1.getCustomDomainUrl)(d.domain),
            };
        });
        return res.json({
            success: true,
            tenantId,
            defaultWorkspaceUrl: tenant?.slug ? (0, workspace_host_1.getWorkspaceUrl)(tenant.slug) : null,
            domains: formatted,
        });
    }
    catch (err) {
        console.error("[Tenant Custom Domain GET Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch custom domains" });
    }
});
// ─────────────────────────────────────────────
// 2. POST /api/workspace/custom-domain
// Request / Register a new custom domain
// ─────────────────────────────────────────────
exports.tenantDomainRouter.post("/", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: "Tenant context missing" });
        }
        // Check workspace admin permission
        const isTenantAdmin = req.user?.roles?.some((r) => ["admin", "hr_admin", "super_admin"].includes(r));
        if (!isTenantAdmin) {
            return res.status(403).json({
                error: "Forbidden: Only workspace administrators can manage custom domains.",
            });
        }
        const { domain: rawDomain } = req.body;
        if (!rawDomain) {
            return res.status(400).json({
                error: "Domain name is required.",
                code: "DOMAIN_REQUIRED",
            });
        }
        // 1. Strict domain normalization and validation
        const validation = (0, domain_normalization_1.validateCustomDomain)(rawDomain);
        if (!validation.valid || !validation.normalized) {
            return res.status(400).json({
                error: validation.message || "Invalid domain name syntax.",
                code: "INVALID_DOMAIN",
                reason: validation.reason,
            });
        }
        const normalizedDomain = validation.normalized;
        // 2. Database level uniqueness check across all tenants
        const existing = await prisma.tenantDomain.findUnique({
            where: { domain: normalizedDomain },
        });
        if (existing) {
            if (existing.tenantId === tenantId) {
                return res.status(409).json({
                    error: "You have already requested this custom domain.",
                    code: "DOMAIN_ALREADY_REQUESTED_BY_YOU",
                });
            }
            return res.status(409).json({
                error: "This domain is already registered or requested by another organization.",
                code: "DOMAIN_ALREADY_TAKEN",
            });
        }
        // 3. Cryptographic verification challenge token
        const verificationToken = `mhrms_verify_${crypto_1.default.randomBytes(16).toString("hex")}`;
        const targetCname = (0, domain_dns_service_1.getPlatformCnameTarget)();
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, slug: true, name: true },
        });
        // 4. Create TenantDomain record in PostgreSQL
        const created = await prisma.tenantDomain.create({
            data: {
                tenantId,
                domain: normalizedDomain,
                subdomain: validation.subdomain || null,
                targetCname,
                isPrimary: false,
                status: "pending",
                sslStatus: "provisioning",
                dnsStatus: "pending",
                verificationToken,
                verificationMethod: "cname",
                requestedBy: req.user?.userId || "system",
            },
        });
        // Invalidate any potential cache
        (0, workspace_host_1.invalidateCustomDomainCache)(normalizedDomain);
        const requiredDns = (0, domain_dns_service_1.getRequiredDnsRecords)(normalizedDomain, verificationToken);
        return res.status(201).json({
            success: true,
            message: "Custom domain request submitted successfully. Please configure the required DNS records.",
            domain: {
                id: created.id,
                domain: created.domain,
                subdomain: created.subdomain,
                targetCname: created.targetCname,
                isPrimary: created.isPrimary,
                status: created.status,
                sslStatus: created.sslStatus,
                dnsStatus: created.dnsStatus,
                isActive: false,
                verificationToken: created.verificationToken,
                createdAt: created.createdAt.toISOString(),
                requiredDns,
                customDomainUrl: (0, workspace_host_1.getCustomDomainUrl)(created.domain),
            },
        });
    }
    catch (err) {
        console.error("[Tenant Custom Domain POST Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to register custom domain" });
    }
});
// ─────────────────────────────────────────────
// 3. POST /api/workspace/custom-domain/:id/verify
// Trigger server-side DNS verification
// ─────────────────────────────────────────────
exports.tenantDomainRouter.post("/:id/verify", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const domainRecord = await prisma.tenantDomain.findUnique({
            where: { id },
        });
        if (!domainRecord || domainRecord.tenantId !== tenantId) {
            return res.status(404).json({
                error: "Custom domain record not found in this workspace.",
                code: "DOMAIN_NOT_FOUND",
            });
        }
        // Check mock test headers or options
        const mockSuccess = req.headers["x-test-mock-dns"] === "true" ||
            (process.env.NODE_ENV === "test" && process.env.MOCK_DNS_VERIFY === "true");
        const mockFailReason = req.headers["x-test-mock-dns-fail"];
        // Run real or simulated server-side DNS verification
        const dnsResult = await (0, domain_dns_service_1.verifyDomainDns)(domainRecord.domain, domainRecord.verificationToken || "", { mockSuccess, mockFailReason });
        // Auto-approval hook if configured or in mock test mode
        const autoApprove = dnsResult.verified &&
            (process.env.AUTO_APPROVE_CUSTOM_DOMAINS === "true" ||
                req.headers["x-test-auto-approve"] === "true");
        const newStatus = autoApprove ? "approved" : domainRecord.status;
        const newSslStatus = autoApprove ? "active" : domainRecord.sslStatus;
        const verifiedAt = dnsResult.verified ? new Date() : domainRecord.verifiedAt;
        const approvedAt = autoApprove ? new Date() : domainRecord.approvedAt;
        const sslIssuedAt = autoApprove ? new Date() : domainRecord.sslIssuedAt;
        const updated = await prisma.tenantDomain.update({
            where: { id },
            data: {
                dnsStatus: dnsResult.status,
                status: newStatus,
                sslStatus: newSslStatus,
                verifiedAt,
                approvedAt,
                sslIssuedAt,
                lastCheckedAt: dnsResult.checkedAt,
                lastDnsError: dnsResult.errorMessage || null,
            },
        });
        (0, workspace_host_1.invalidateCustomDomainCache)(domainRecord.domain);
        const isActive = updated.status === "approved" && updated.dnsStatus === "verified";
        return res.json({
            success: true,
            verified: dnsResult.verified,
            status: updated.status,
            dnsStatus: updated.dnsStatus,
            sslStatus: updated.sslStatus,
            isActive,
            details: dnsResult.details,
            errorMessage: dnsResult.errorMessage,
            message: dnsResult.verified
                ? autoApprove
                    ? "Domain DNS verified and approved! Domain is now active."
                    : "Domain DNS verified successfully. Awaiting Super Admin approval."
                : `DNS verification failed: ${dnsResult.errorMessage || "DNS records not yet propagated."}`,
        });
    }
    catch (err) {
        console.error("[Tenant Custom Domain Verify Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to verify DNS" });
    }
});
// ─────────────────────────────────────────────
// 4. PUT /api/workspace/custom-domain/:id/primary
// Set a custom domain as the tenant's primary domain
// ─────────────────────────────────────────────
exports.tenantDomainRouter.put("/:id/primary", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const domainRecord = await prisma.tenantDomain.findUnique({
            where: { id },
        });
        if (!domainRecord || domainRecord.tenantId !== tenantId) {
            return res.status(404).json({
                error: "Custom domain record not found.",
                code: "DOMAIN_NOT_FOUND",
            });
        }
        // Domain must be active (approved + verified) to become primary
        if (domainRecord.status !== "approved" || domainRecord.dnsStatus !== "verified") {
            return res.status(400).json({
                error: "Only fully verified and approved active custom domains can be designated as primary.",
                code: "DOMAIN_NOT_ACTIVE",
            });
        }
        // Transaction: unset other primaries for this tenant, set this one primary
        await prisma.$transaction([
            prisma.tenantDomain.updateMany({
                where: { tenantId },
                data: { isPrimary: false },
            }),
            prisma.tenantDomain.update({
                where: { id },
                data: { isPrimary: true },
            }),
        ]);
        (0, workspace_host_1.invalidateCustomDomainCache)();
        return res.json({
            success: true,
            message: `Primary domain set to https://${domainRecord.domain}. Default workspace URL remains accessible.`,
            domain: domainRecord.domain,
            isPrimary: true,
        });
    }
    catch (err) {
        console.error("[Tenant Custom Domain Set Primary Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to set primary domain" });
    }
});
// ─────────────────────────────────────────────
// 5. DELETE /api/workspace/custom-domain/:id
// Remove a custom domain from the workspace
// ─────────────────────────────────────────────
exports.tenantDomainRouter.delete("/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const domainRecord = await prisma.tenantDomain.findUnique({
            where: { id },
        });
        if (!domainRecord || domainRecord.tenantId !== tenantId) {
            return res.status(404).json({
                error: "Custom domain record not found in this workspace.",
                code: "DOMAIN_NOT_FOUND",
            });
        }
        await prisma.tenantDomain.delete({
            where: { id },
        });
        (0, workspace_host_1.invalidateCustomDomainCache)(domainRecord.domain);
        return res.json({
            success: true,
            message: `Custom domain ${domainRecord.domain} has been detached successfully.`,
        });
    }
    catch (err) {
        console.error("[Tenant Custom Domain Delete Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to remove custom domain" });
    }
});
