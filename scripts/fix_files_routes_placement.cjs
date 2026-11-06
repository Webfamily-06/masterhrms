const fs = require('fs');

const path = 'server/src/routes/files.routes.ts';
let content = fs.readFileSync(path, 'utf8');

const certBlock = `// ============================================================================
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
});`;

// Remove from before filesRouter declaration
content = content.replace(certBlock, '');

// Place after getAuthContext
const afterContext = `  return { isSuper, tenantId, userId, userRoles, userPermissions };
}`;

content = content.replace(afterContext, afterContext + '\n\n' + certBlock);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed placement in server/src/routes/files.routes.ts');
