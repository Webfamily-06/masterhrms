const fs = require('fs');

const path = 'server/src/routes/certificate-studio.routes.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add CertificateFolderService import
if (!content.includes('CertificateFolderService')) {
  content = content.replace(
    'import { CertificateStudioService, PLACEHOLDER_REGISTRY } from "../services/certificate-studio.service";',
    'import { CertificateStudioService, PLACEHOLDER_REGISTRY } from "../services/certificate-studio.service";\r\nimport { CertificateFolderService } from "../services/files/certificate-folder.service";'
  );
  if (!content.includes('CertificateFolderService')) {
    content = content.replace(
      'import { CertificateStudioService, PLACEHOLDER_REGISTRY } from "../services/certificate-studio.service";',
      'import { CertificateStudioService, PLACEHOLDER_REGISTRY } from "../services/certificate-studio.service";\nimport { CertificateFolderService } from "../services/files/certificate-folder.service";'
    );
  }
}

// 2. Add preview endpoints, replace endpoint, folder hierarchy endpoint, and update delete error status
const brandingRoutesTarget = 'certificateStudioRouter.delete("/branding/:id", async (req: AuthRequest, res: Response) => {';
const brandingRoutesReplacement = `// Preview branding asset binary with inline disposition and proper MIME type
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

certificateStudioRouter.delete("/branding/:id", async (req: AuthRequest, res: Response) => {`;

if (!content.includes('certificateStudioRouter.get("/branding/:id/preview"')) {
  content = content.replace(brandingRoutesTarget, brandingRoutesReplacement);
}

// 3. Update DELETE /branding/:id catch block to return 409 on reference conflict
const deleteCatchTarget = `    await CertificateStudioService.deleteBrandingAsset(tenantId, req.params.id, req.user?.userId);
    return res.json({ success: true, message: "Asset deactivated successfully." });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to deactivate asset." });
  }`;

const deleteCatchReplacement = `    await CertificateStudioService.deleteBrandingAsset(tenantId, req.params.id, req.user?.userId);
    return res.json({ success: true, message: "Asset deactivated successfully." });
  } catch (err: any) {
    const status = err.status || (err.code === "CERTIFICATE_ASSET_IN_USE" ? 409 : 400);
    return res.status(status).json({
      error: err.message || "Failed to deactivate asset.",
      code: err.code || "DELETION_FAILED",
      references: err.references
    });
  }`;

if (content.includes(deleteCatchTarget)) {
  content = content.replace(deleteCatchTarget, deleteCatchReplacement);
}

// 4. Add signatory signature preview route
const signatoryPreviewRoute = `// Preview signatory signature binary with verified tenant isolation
certificateStudioRouter.get("/signatories/:id/signature-preview", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    return await CertificateStudioService.streamSignatorySignature(tenantId, req.params.id, res);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Failed to stream signature preview." });
  }
});

`;

if (!content.includes('certificateStudioRouter.get("/signatories/:id/signature-preview"')) {
  content = content.replace('certificateStudioRouter.get("/signatories",', signatoryPreviewRoute + 'certificateStudioRouter.get("/signatories",');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated server/src/routes/certificate-studio.routes.ts');
