const fs = require('fs');
const file = 'server/src/routes/media.routes.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `      const folder = req.body.folder || "system/branding";
      const tags = req.body.tags ? (typeof req.body.tags === "string" ? req.body.tags.split(",") : req.body.tags) : ["branding"];
      const isSuper = req.user?.roles?.includes("super_admin");
      let tenantId: string | null = null;`;

const replacement = `      const folder = req.body.folder || "tenant/documents";
      const tags = req.body.tags ? (typeof req.body.tags === "string" ? req.body.tags.split(",") : req.body.tags) : ["document"];
      const isSuper = req.user?.roles?.includes("super_admin");

      // TASK-P1-04 (GAP-VAL-015, GAP-DB-API-011): Restrict system branding folder uploads to super_admin only
      if ((folder.startsWith("system/branding") || folder.startsWith("branding") || folder.startsWith("platform/branding")) && !isSuper) {
        return res.status(403).json({
          error: "Forbidden: Public branding directory uploads are restricted to Super Administrators.",
          code: "PUBLIC_FOLDER_UPLOAD_RESTRICTED",
        });
      }

      let tenantId: string | null = null;`;

const targetCRLF = target.replace(/\n/g, '\r\n');
const replacementCRLF = replacement.replace(/\n/g, '\r\n');

if (code.includes(targetCRLF)) {
  code = code.replace(targetCRLF, replacementCRLF);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully patched media.routes.ts (CRLF)');
} else if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully patched media.routes.ts (LF)');
} else {
  console.error('Target not found in media.routes.ts');
  process.exit(1);
}

