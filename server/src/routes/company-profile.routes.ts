import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { prisma, rawPrisma } from "../prisma";
import {
  CompanyProfileService,
  CompanyProfileSchema,
  GSTRegistrationSchema,
} from "../services/company-profile/company-profile.service";
import { ZodError } from "zod";

export const companyProfileRouter = Router();

function resolveTenantId(req: AuthRequest): string {
  const isSuper = req.user?.roles?.includes("super_admin");
  const tenantId = (isSuper && req.query.tenantId)
    ? String(req.query.tenantId)
    : req.user?.tenantId;

  if (!tenantId) {
    const err: any = new Error("Tenant context is required");
    err.status = 400;
    throw err;
  }
  return tenantId;
}

function assertAdminOrHr(req: AuthRequest) {
  const isSuper = req.user?.roles?.includes("super_admin");
  const isAdmin = req.user?.roles?.includes("admin") || req.user?.roles?.includes("workspace_admin");
  const isHr = req.user?.roles?.includes("hr_admin");

  if (!isSuper && !isAdmin && !isHr) {
    const err: any = new Error("Forbidden: Admin or HR permissions required to manage company profile");
    err.status = 403;
    throw err;
  }
}

/**
 * GET /api/v1/company-profile
 * Retrieve company profile and GST registrations for the authenticated tenant.
 */
companyProfileRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    const profile = await CompanyProfileService.getProfile(tenantId);
    const gstRegistrations = profile?.gstRegistrations || [];
    const primaryGst = gstRegistrations.find((g: any) => g.isPrimary && g.status === "ACTIVE") || null;

    return res.json({
      success: true,
      profile,
      gstRegistrations,
      primaryGst,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to retrieve company profile",
    });
  }
});

/**
 * PUT /api/v1/company-profile
 * Upsert company legal identity, registered and billing addresses.
 */
companyProfileRouter.put("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    assertAdminOrHr(req);
    const tenantId = resolveTenantId(req);

    const updated = await CompanyProfileService.upsertProfile(tenantId, req.body, {
      userId: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({
      success: true,
      message: "Company profile updated successfully",
      profile: updated,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
      });
    }
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to update company profile",
    });
  }
});

/**
 * GET /api/v1/company-profile/gst
 * Retrieve GST registrations for tenant.
 */
companyProfileRouter.get("/gst", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    const profile = await CompanyProfileService.getProfile(tenantId);
    const gstRegistrations = profile?.gstRegistrations || [];
    const primaryGst = gstRegistrations.find((g: any) => g.isPrimary && g.status === "ACTIVE") || null;

    return res.json({
      success: true,
      gstRegistrations,
      primaryGst,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to retrieve GST registrations",
    });
  }
});

/**
 * PUT /api/v1/company-profile/gst
 * Upsert Primary GST registration for the tenant.
 */
companyProfileRouter.put("/gst", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    assertAdminOrHr(req);
    const tenantId = resolveTenantId(req);

    const upserted = await CompanyProfileService.upsertGstRegistration(tenantId, req.body, {
      userId: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({
      success: true,
      message: "GST registration saved successfully",
      gstRegistration: upserted,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
      });
    }
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to save GST registration",
    });
  }
});

/**
 * GET /api/v1/company-profile/tenant/:tenantId
 * Explicit Super Admin endpoint to inspect any tenant's authoritative CompanyProfile and GST.
 */
companyProfileRouter.get("/tenant/:tenantId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles?.includes("super_admin");
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Super Admin access required",
      });
    }

    const { tenantId } = req.params;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: "Valid tenantId parameter is required" });
    }

    const db = rawPrisma || prisma;
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: `Tenant not found: ${tenantId}` });
    }

    const profile = await CompanyProfileService.getProfile(tenantId);
    const gstRegistrations = profile?.gstRegistrations || [];
    const primaryGst = gstRegistrations.find((g: any) => g.isPrimary && g.status === "ACTIVE") || null;

    return res.json({
      success: true,
      profile,
      gstRegistrations,
      primaryGst,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to retrieve tenant company profile",
    });
  }
});

/**
 * GET /api/v1/company-profile/tenant/:tenantId/gst
 * Explicit Super Admin endpoint to inspect any tenant's GST registrations.
 */
companyProfileRouter.get("/tenant/:tenantId/gst", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles?.includes("super_admin");
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Super Admin access required",
      });
    }

    const { tenantId } = req.params;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: "Valid tenantId parameter is required" });
    }

    const db = rawPrisma || prisma;
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: `Tenant not found: ${tenantId}` });
    }

    const profile = await CompanyProfileService.getProfile(tenantId);
    const gstRegistrations = profile?.gstRegistrations || [];
    const primaryGst = gstRegistrations.find((g: any) => g.isPrimary && g.status === "ACTIVE") || null;

    return res.json({
      success: true,
      gstRegistrations,
      primaryGst,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to retrieve tenant GST registrations",
    });
  }
});

/**
 * GET /api/v1/company-profile/identity
 * Resolves canonical tenant legal identity for document and PDF generation.
 */
companyProfileRouter.get("/identity", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    const identity = await CompanyProfileService.resolveTenantCompanyIdentity(tenantId);

    return res.json({
      success: true,
      identity,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to resolve company identity",
    });
  }
});

/**
 * GET /api/v1/company-profile/tenant/:tenantId/identity
 * Explicit Super Admin endpoint to inspect any tenant's canonical company identity.
 */
companyProfileRouter.get("/tenant/:tenantId/identity", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles?.includes("super_admin");
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Super Admin access required",
      });
    }

    const { tenantId } = req.params;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: "Valid tenantId parameter is required" });
    }

    const identity = await CompanyProfileService.resolveTenantCompanyIdentity(tenantId);

    return res.json({
      success: true,
      identity,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to resolve tenant company identity",
    });
  }
});

