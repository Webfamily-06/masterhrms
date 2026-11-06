import { Router, Response } from "express";
import multer from "multer";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { CertificateStudioService, PLACEHOLDER_REGISTRY } from "../services/certificate-studio.service";
import { CertificateFolderService } from "../services/files/certificate-folder.service";
import { isHRAwardAuthorized } from "./awards.routes";
import { prisma } from "../prisma";

export const certificateStudioRouter = Router();

// Multer memory storage for validating magic bytes and processing buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Guard: All endpoints require authenticated user with valid tenant context
certificateStudioRouter.use(requireAuth);
certificateStudioRouter.use(resolveTenantContext);

/**
 * Helper to ensure user is HR authorized
 */
function assertHR(req: AuthRequest, res: Response): boolean {
  if (!isHRAwardAuthorized(req)) {
    res.status(403).json({ error: "Access denied: HR Manager or Administrator authorization required." });
    return false;
  }
  return true;
}

// ============================================================================
// 1. PLACEHOLDERS REGISTRY
// ============================================================================
certificateStudioRouter.get("/placeholders", (req: AuthRequest, res: Response) => {
  return res.json({ placeholders: PLACEHOLDER_REGISTRY });
});

// ============================================================================
// 2. BRANDING ASSETS
// ============================================================================
certificateStudioRouter.get("/branding", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const assets = await CertificateStudioService.getBrandingAssets(tenantId);
    return res.json({ assets });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch branding assets." });
  }
});

certificateStudioRouter.post("/branding", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    if (!req.file) {
      return res.status(400).json({ error: "No asset file provided." });
    }

    const { assetType, assetName, metadata } = req.body;
    if (!assetType || !assetName) {
      return res.status(400).json({ error: "assetType and assetName are required." });
    }

    let parsedMeta = {};
    if (metadata) {
      try { parsedMeta = typeof metadata === "string" ? JSON.parse(metadata) : metadata; } catch {}
    }

    const asset = await CertificateStudioService.saveBrandingAsset({
      tenantId,
      assetType,
      assetName,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      metadata: parsedMeta,
      actorUserId: req.user?.userId
    });

    return res.status(201).json({ asset });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to save branding asset." });
  }
});

// Preview branding asset binary with inline disposition and proper MIME type
certificateStudioRouter.get("/branding/:id/preview", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    return await CertificateStudioService.streamBrandingAsset(tenantId, req.params.id, res);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Failed to stream branding asset preview." });
  }
});

// Replace existing branding asset
certificateStudioRouter.post("/branding/replace", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    if (!req.file) return res.status(400).json({ error: "No replacement asset file provided." });

    const { oldAssetId, assetType, assetName, metadata } = req.body;
    if (!oldAssetId || !assetType || !assetName) {
      return res.status(400).json({ error: "oldAssetId, assetType, and assetName are required." });
    }

    let parsedMeta = {};
    if (metadata) {
      try { parsedMeta = typeof metadata === "string" ? JSON.parse(metadata) : metadata; } catch {}
    }

    const newAsset = await CertificateStudioService.replaceBrandingAsset({
      tenantId,
      oldAssetId,
      assetType,
      assetName,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      metadata: parsedMeta,
      actorUserId: req.user?.userId
    });

    return res.status(201).json({ asset: newAsset });
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to replace branding asset." });
  }
});

// Retrieve or ensure Certificates folder hierarchy
certificateStudioRouter.get("/folders", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const folders = await CertificateFolderService.ensureCertificatesFolders(tenantId, req.user?.userId);
    return res.json({ folders });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve certificates folders." });
  }
});

certificateStudioRouter.delete("/branding/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    await CertificateStudioService.deleteBrandingAsset(tenantId, req.params.id, req.user?.userId);
    return res.json({ success: true, message: "Asset deactivated successfully." });
  } catch (err: any) {
    const status = err.status || (err.code === "CERTIFICATE_ASSET_IN_USE" ? 409 : 400);
    return res.status(status).json({
      error: err.message || "Failed to deactivate asset.",
      code: err.code || "DELETION_FAILED",
      references: err.references
    });
  }
});

// ============================================================================
// 3. SIGNATORIES
// ============================================================================
// Preview signatory signature binary with verified tenant isolation
certificateStudioRouter.get("/signatories/:id/signature-preview", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    return await CertificateStudioService.streamSignatorySignature(tenantId, req.params.id, res);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Failed to stream signature preview." });
  }
});

certificateStudioRouter.get("/signatories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const signatories = await CertificateStudioService.getSignatories(tenantId);
    return res.json({ signatories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch signatories." });
  }
});

certificateStudioRouter.post("/signatories", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { name, designation, department, signatureAssetId, signatoryType, effectiveFrom, effectiveTo } = req.body;
    const signatory = await CertificateStudioService.createSignatory({
      tenantId,
      name,
      designation,
      department,
      signatureAssetId,
      signatoryType,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
      actorUserId: req.user?.userId
    });

    return res.status(201).json({ signatory });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create signatory." });
  }
});

certificateStudioRouter.put("/signatories/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const updated = await CertificateStudioService.updateSignatory(tenantId, req.params.id, {
      ...req.body,
      actorUserId: req.user?.userId
    });
    return res.json({ signatory: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to update signatory." });
  }
});

certificateStudioRouter.post("/signatories/:id/authorize", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { status } = req.body;
    if (!["AUTHORIZED", "PENDING", "REVOKED"].includes(status)) {
      return res.status(400).json({ error: "Invalid authorization status. Must be AUTHORIZED, PENDING, or REVOKED." });
    }

    const updated = await CertificateStudioService.authorizeSignatory(tenantId, req.params.id, status, req.user?.userId);
    return res.json({ signatory: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to change signatory status." });
  }
});

// ============================================================================
// 4. TEMPLATE LIBRARY
// ============================================================================
certificateStudioRouter.get("/templates", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { category, search, orientation, isSystemOnly } = req.query;
    const templates = await CertificateStudioService.listTemplates(tenantId, {
      category: category as string,
      search: search as string,
      orientation: orientation as string,
      isSystemOnly: isSystemOnly === "true"
    });

    return res.json({
      templates,
      count: templates.length
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list certificate templates." });
  }
});

certificateStudioRouter.get("/templates/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const template = await CertificateStudioService.getTemplateById(tenantId, req.params.id);
    return res.json({ template });
  } catch (err: any) {
    return res.status(404).json({ error: err.message || "Template not found." });
  }
});

certificateStudioRouter.post("/templates/:id/duplicate", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { customName } = req.body;
    const duplicated = await CertificateStudioService.duplicateTemplate(tenantId, req.params.id, req.user?.userId, customName);
    return res.status(201).json({ template: duplicated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to duplicate template." });
  }
});

certificateStudioRouter.post("/templates/:id/publish", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const published = await CertificateStudioService.publishTemplate(tenantId, req.params.id, req.user?.userId);
    return res.json({ template: published, message: "Template published successfully." });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to publish template." });
  }
});

// ============================================================================
// 5. VISUAL DESIGNER SAVE & PREVIEW
// ============================================================================
certificateStudioRouter.post("/templates/:id/save-design", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { designJson } = req.body;
    if (!designJson) return res.status(400).json({ error: "designJson payload required." });

    const result = await CertificateStudioService.saveDesign({
      tenantId,
      templateId: req.params.id,
      designJson,
      actorUserId: req.user?.userId
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to save design." });
  }
});

certificateStudioRouter.post("/templates/preview-pdf", async (req: AuthRequest, res: Response) => {
  try {
    const { designJson, sampleData } = req.body;
    if (!designJson) return res.status(400).json({ error: "designJson required." });

    const contextMap: Record<string, string> = {
      "{{employee.name}}": sampleData?.name || "Dr. Alex Vance",
      "{{employee.employeeCode}}": sampleData?.code || "EMP-2026-9901",
      "{{employee.designation}}": sampleData?.designation || "Principal Systems Architect",
      "{{employee.department}}": sampleData?.department || "Core Engineering & Cloud Infrastructure",
      "{{award.title}}": sampleData?.awardTitle || "Executive Leadership Distinction 2026",
      "{{award.description}}": sampleData?.awardDescription || "For pioneering enterprise-grade architectures and driving exemplary excellence across global organizations.",
      "{{award.date}}": sampleData?.date || new Date().toISOString().split("T")[0],
      "{{award.category}}": sampleData?.category || "Leadership & Performance",
      "{{organization.name}}": sampleData?.orgName || "MASTERHRMS Global Enterprise",
      "{{certificate.number}}": "PREVIEW-2026-X89A",
      "{{certificate.verificationCode}}": "VERIFY-PREVIEW-CODE-A1B2C3D4",
      "{{certificate.verificationUrl}}": "https://masterhrms.io/verify-certificate?code=PREVIEW"
    };

    const pdfBuffer = await CertificateStudioService.renderTemplateToPdf(designJson, contextMap);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="preview-certificate.pdf"');
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate preview PDF." });
  }
});

// ============================================================================
// 6. HYBRID IMPORT (HTML & BACKGROUND)
// ============================================================================
certificateStudioRouter.post("/templates/import/html", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { name, category, orientation, pageSize, htmlContent, cssContent } = req.body;
    const template = await CertificateStudioService.importHtmlCssTemplate({
      tenantId,
      name,
      category,
      orientation,
      pageSize,
      htmlContent,
      cssContent,
      actorUserId: req.user?.userId
    });

    return res.status(201).json({ template });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to import HTML template." });
  }
});

certificateStudioRouter.post("/templates/import/background", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    if (!req.file) return res.status(400).json({ error: "Background artwork file required." });

    const { name, category, orientation, pageSize } = req.body;
    const template = await CertificateStudioService.importBackgroundTemplate({
      tenantId,
      name,
      category,
      orientation,
      pageSize,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      actorUserId: req.user?.userId
    });

    return res.status(201).json({ template });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to import background template." });
  }
});

// ============================================================================
// 7. AWARD TYPE TEMPLATE ASSIGNMENT
// ============================================================================
certificateStudioRouter.get("/assignments/:awardTypeId", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const assignment = await CertificateStudioService.getAssignment(tenantId, req.params.awardTypeId);
    return res.json({ assignment });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to get assignment." });
  }
});

certificateStudioRouter.post("/assignments", async (req: AuthRequest, res: Response) => {
  try {
    if (!assertHR(req, res)) return;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { awardTypeId, templateId, signatoryConfiguration, isDefault } = req.body;
    if (!awardTypeId || !templateId) {
      return res.status(400).json({ error: "awardTypeId and templateId are required." });
    }

    const assignment = await CertificateStudioService.setAssignment(
      tenantId,
      awardTypeId,
      templateId,
      signatoryConfiguration,
      isDefault
    );

    return res.json({ assignment, message: "Template successfully assigned to award type." });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to save template assignment." });
  }
});
