const fs = require('fs');

const path = 'server/src/routes/files.routes.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add CertificateFolderService import if missing
if (!content.includes('CertificateFolderService')) {
  content = content.replace(
    'import { SystemFolderService } from "../services/files/system-folder.service";',
    'import { SystemFolderService } from "../services/files/system-folder.service";\r\nimport { CertificateFolderService } from "../services/files/certificate-folder.service";'
  );
  if (!content.includes('CertificateFolderService')) {
    content = content.replace(
      'import { SystemFolderService } from "../services/files/system-folder.service";',
      'import { SystemFolderService } from "../services/files/system-folder.service";\nimport { CertificateFolderService } from "../services/files/certificate-folder.service";'
    );
  }
}

// 2. Add .svg to mimeMap in /stream
if (!content.includes('".svg": "image/svg+xml",')) {
  content = content.replace(
    '".webp": "image/webp",',
    '".webp": "image/webp",\r\n        ".svg": "image/svg+xml",'
  );
  if (!content.includes('".svg": "image/svg+xml",')) {
    content = content.replace(
      '".webp": "image/webp",',
      '".webp": "image/webp",\n        ".svg": "image/svg+xml",'
    );
  }
}

// 3. Add certificate folder endpoints before export
if (!content.includes('/certificates/ensure-folders')) {
  const endpointCode = `
// ============================================================================
// CERTIFICATES SYSTEM FOLDER MANAGEMENT
// ============================================================================

/**
 * POST /api/v1/files/certificates/ensure-folders
 * Ensures tenant-isolated protected Certificates folder hierarchy.
 */
filesRouter.post("/certificates/ensure-folders", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const hierarchy = await CertificateFolderService.ensureCertificatesFolders(tenantId, userId);
    return res.json({ success: true, folders: hierarchy });
  } catch (err: any) {
    console.error("[Ensure Certificates Folders Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to ensure certificates folder hierarchy." });
  }
});

/**
 * GET /api/v1/files/certificates/folders
 * Retrieves the tenant's Certificates system folder hierarchy.
 */
filesRouter.get("/certificates/folders", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const hierarchy = await CertificateFolderService.ensureCertificatesFolders(tenantId, userId);
    return res.json({ success: true, folders: hierarchy });
  } catch (err: any) {
    console.error("[Get Certificates Folders Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve certificates folder hierarchy." });
  }
});
`;

  content = content.replace('export const filesRouter', endpointCode + '\nexport const filesRouter');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated server/src/routes/files.routes.ts');
