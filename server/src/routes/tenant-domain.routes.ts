import { Router, Response } from "express";
import crypto from "crypto";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { validateCustomDomain, normalizeDomain } from "../lib/domain-normalization";
import {
  getRequiredDnsRecords,
  verifyDomainDns,
  getPlatformCnameTarget,
} from "../services/domain-dns.service";
import {
  invalidateCustomDomainCache,
  getBaseDomain,
  getWorkspaceUrl,
  getCustomDomainUrl,
} from "../lib/workspace-host";

export const tenantDomainRouter = Router();

// ─────────────────────────────────────────────
// 1. GET /api/workspace/custom-domain
// Returns all custom domains registered for the current workspace
// ─────────────────────────────────────────────
tenantDomainRouter.get(
  "/",
  requireAuth,
  resolveTenantContext,
  async (req: AuthRequest, res: Response) => {
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
        const requiredDns = getRequiredDnsRecords(d.domain, d.verificationToken || "");
        const isActive = d.status === "approved" && d.dnsStatus === "verified";
        return {
          id: d.id,
          domain: d.domain,
          subdomain: d.subdomain,
          targetCname: d.targetCname || getPlatformCnameTarget(),
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
          customDomainUrl: getCustomDomainUrl(d.domain),
        };
      });

      return res.json({
        success: true,
        tenantId,
        defaultWorkspaceUrl: tenant?.slug ? getWorkspaceUrl(tenant.slug) : null,
        domains: formatted,
      });
    } catch (err: any) {
      console.error("[Tenant Custom Domain GET Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch custom domains" });
    }
  }
);

// ─────────────────────────────────────────────
// 2. POST /api/workspace/custom-domain
// Request / Register a new custom domain
// ─────────────────────────────────────────────
tenantDomainRouter.post(
  "/",
  requireAuth,
  resolveTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(403).json({ error: "Tenant context missing" });
      }

      // Check workspace admin permission
      const isTenantAdmin = req.user?.roles?.some((r) =>
        ["admin", "hr_admin", "super_admin"].includes(r)
      );
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
      const validation = validateCustomDomain(rawDomain);
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
      const verificationToken = `mhrms_verify_${crypto.randomBytes(16).toString("hex")}`;
      const targetCname = getPlatformCnameTarget();

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
      invalidateCustomDomainCache(normalizedDomain);

      const requiredDns = getRequiredDnsRecords(normalizedDomain, verificationToken);

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
          customDomainUrl: getCustomDomainUrl(created.domain),
        },
      });
    } catch (err: any) {
      console.error("[Tenant Custom Domain POST Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to register custom domain" });
    }
  }
);

// ─────────────────────────────────────────────
// 3. POST /api/workspace/custom-domain/:id/verify
// Trigger server-side DNS verification
// ─────────────────────────────────────────────
tenantDomainRouter.post(
  "/:id/verify",
  requireAuth,
  resolveTenantContext,
  async (req: AuthRequest, res: Response) => {
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
      const mockSuccess =
        req.headers["x-test-mock-dns"] === "true" ||
        process.env.MOCK_DNS_VERIFY === "true";
      const mockFailReason = req.headers["x-test-mock-dns-fail"] as string | undefined;

      // Run real or simulated server-side DNS verification
      const dnsResult = await verifyDomainDns(
        domainRecord.domain,
        domainRecord.verificationToken || "",
        { mockSuccess, mockFailReason }
      );

      // Auto-approval hook if configured or in mock test mode
      const autoApprove =
        dnsResult.verified &&
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

      invalidateCustomDomainCache(domainRecord.domain);

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
    } catch (err: any) {
      console.error("[Tenant Custom Domain Verify Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to verify DNS" });
    }
  }
);

// ─────────────────────────────────────────────
// 4. PUT /api/workspace/custom-domain/:id/primary
// Set a custom domain as the tenant's primary domain
// ─────────────────────────────────────────────
tenantDomainRouter.put(
  "/:id/primary",
  requireAuth,
  resolveTenantContext,
  async (req: AuthRequest, res: Response) => {
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

      invalidateCustomDomainCache();

      return res.json({
        success: true,
        message: `Primary domain set to https://${domainRecord.domain}. Default workspace URL remains accessible.`,
        domain: domainRecord.domain,
        isPrimary: true,
      });
    } catch (err: any) {
      console.error("[Tenant Custom Domain Set Primary Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to set primary domain" });
    }
  }
);

// ─────────────────────────────────────────────
// 5. DELETE /api/workspace/custom-domain/:id
// Remove a custom domain from the workspace
// ─────────────────────────────────────────────
tenantDomainRouter.delete(
  "/:id",
  requireAuth,
  resolveTenantContext,
  async (req: AuthRequest, res: Response) => {
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

      invalidateCustomDomainCache(domainRecord.domain);

      return res.json({
        success: true,
        message: `Custom domain ${domainRecord.domain} has been detached successfully.`,
      });
    } catch (err: any) {
      console.error("[Tenant Custom Domain Delete Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to remove custom domain" });
    }
  }
);
