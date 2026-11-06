const fs = require('fs');

const path = 'server/src/services/files/files.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add CertificateFolderService import
if (!content.includes('CertificateFolderService')) {
  content = content.replace(
    'import { SystemFolderService } from "./system-folder.service";',
    'import { SystemFolderService } from "./system-folder.service";\r\nimport { CertificateFolderService } from "./certificate-folder.service";'
  );
  if (!content.includes('CertificateFolderService')) {
    content = content.replace(
      'import { SystemFolderService } from "./system-folder.service";',
      'import { SystemFolderService } from "./system-folder.service";\nimport { CertificateFolderService } from "./certificate-folder.service";'
    );
  }
}

// 2. In renameItem: protected check
const renameTarget = 'if (item.systemModule || item.systemPage || item.ownerType === "SYSTEM") {';
const renameReplacement = `if (CertificateFolderService.isCertificatesSystemFolder(item)) {
      const err: any = new Error("Protected system folder 'Certificates' and its managed subfolders cannot be renamed.");
      err.status = 403;
      err.code = "PROTECTED_SYSTEM_FOLDER";
      throw err;
    }

    if (item.systemModule || item.systemPage || item.ownerType === "SYSTEM") {`;

if (!content.includes("Protected system folder 'Certificates' and its managed subfolders cannot be renamed.")) {
  content = content.replace(renameTarget, renameReplacement);
}

// 3. In moveItem: protected check
const moveTarget = 'if (item.systemModule || item.systemPage || item.ownerType === "SYSTEM") {';
// Note: second occurrence of moveTarget in file corresponds to moveItem
const moveIndex = content.indexOf(moveTarget, content.indexOf(renameReplacement) + renameReplacement.length);
if (moveIndex !== -1 && !content.includes("Protected system folder 'Certificates' and its managed subfolders cannot be moved.")) {
  const moveReplacement = `if (CertificateFolderService.isCertificatesSystemFolder(item)) {
      const err: any = new Error("Protected system folder 'Certificates' and its managed subfolders cannot be moved.");
      err.status = 403;
      err.code = "PROTECTED_SYSTEM_FOLDER";
      throw err;
    }

    if (item.systemModule || item.systemPage || item.ownerType === "SYSTEM") {`;
  content = content.substring(0, moveIndex) + moveReplacement + content.substring(moveIndex + moveTarget.length);
}

// 4. In trashItems: protected check and usage check
const trashTarget = 'if (file.systemModule || file.systemPage) {';
const trashReplacement = `if (CertificateFolderService.isCertificatesSystemFolder(file)) {
        const err: any = new Error("Protected system folder 'Certificates' and its managed subfolders cannot be moved to trash.");
        err.status = 403;
        err.code = "PROTECTED_SYSTEM_FOLDER";
        throw err;
      }

      // Check certificate asset reference protection
      const certUsage = await CertificateFolderService.checkCertificateAssetUsage(file.tenantId, file.id, file.filePath);
      if (certUsage.inUse && !options.force) {
        const err: any = new Error(certUsage.reason);
        err.status = 409;
        err.code = "CERTIFICATE_ASSET_IN_USE";
        err.references = certUsage.references;
        throw err;
      }

      if (file.systemModule || file.systemPage) {`;

if (!content.includes("Protected system folder 'Certificates' and its managed subfolders cannot be moved to trash.")) {
  content = content.replace(trashTarget, trashReplacement);
}

// 5. In deleteItemPermanently: protected check and usage check
const deleteTarget = '// Protection Guard: Block deletion if file is under active legal hold';
const deleteReplacement = `// Protection Guard: Block deletion of protected system folder
    if (CertificateFolderService.isCertificatesSystemFolder(file)) {
      const err: any = new Error("Protected system folder 'Certificates' and its managed subfolders cannot be deleted.");
      err.status = 403;
      err.code = "PROTECTED_SYSTEM_FOLDER";
      throw err;
    }

    // Protection Guard: Block deletion if referenced by certificate branding, signatories, templates, or issued awards
    const certUsage = await CertificateFolderService.checkCertificateAssetUsage(file.tenantId, file.id, file.filePath);
    if (certUsage.inUse) {
      const err: any = new Error(certUsage.reason);
      err.status = 409;
      err.code = "CERTIFICATE_ASSET_IN_USE";
      err.references = certUsage.references;
      throw err;
    }

    // Protection Guard: Block deletion if file is under active legal hold`;

if (!content.includes("Protected system folder 'Certificates' and its managed subfolders cannot be deleted.")) {
  content = content.replace(deleteTarget, deleteReplacement);
}

// 6. In listFiles: ensure Certificates hierarchy at root and guard subfolders
const listFilesTarget = 'if (options.category === "Chat") {';
const listFilesReplacement = `// Ensure Certificates system folder exists for tenant when root is queried
    if (options.tenantId && (options.parentId === null || options.parentId === undefined) && !options.trashed && view !== "trash") {
      try {
        await CertificateFolderService.ensureCertificatesFolders(options.tenantId, options.userId);
      } catch (e: any) {
        console.warn("[FilesService] Could not ensure certificates folder:", e?.message);
      }
    }

    // Authorization guard for browsing Certificates folders
    if (options.parentId && options.parentId !== "root") {
      try {
        const parentNode = await prisma.mediaFile.findUnique({ where: { id: options.parentId } });
        if (parentNode && CertificateFolderService.isCertificatesSystemFolder(parentNode)) {
          const isHR = options.isSuper || (options.userRoles || []).some((r: string) =>
            ["admin", "tenant_admin", "hr_admin", "hr_manager", "hr_director"].includes(r.toLowerCase())
          );
          if (!isHR && parentNode.systemPage !== "generated") {
            const err: any = new Error("Access denied: HR Manager or Administrator authorization required to view Certificate assets.");
            err.status = 403;
            throw err;
          }
        }
      } catch (checkErr: any) {
        if (checkErr.status === 403) throw checkErr;
      }
    }

    if (options.category === "Chat") {`;

if (!content.includes("Ensure Certificates system folder exists for tenant when root is queried")) {
  content = content.replace(listFilesTarget, listFilesReplacement);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated server/src/services/files/files.service.ts');
