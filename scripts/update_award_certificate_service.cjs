const fs = require('fs');

const path = 'server/src/services/award-certificate.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add CertificateFolderService and FilesService imports
if (!content.includes('CertificateFolderService')) {
  content = content.replace(
    'import { AuditService } from "./audit.service";',
    'import { AuditService } from "./audit.service";\r\nimport { CertificateFolderService } from "./files/certificate-folder.service";\r\nimport { FilesService } from "./files/files.service";'
  );
  if (!content.includes('CertificateFolderService')) {
    content = content.replace(
      'import { AuditService } from "./audit.service";',
      'import { AuditService } from "./audit.service";\nimport { CertificateFolderService } from "./files/certificate-folder.service";\nimport { FilesService } from "./files/files.service";'
    );
  }
}

// 2. In generateCertificate: Save generated PDF to Certificates/Generated in File Manager
const targetStep7 = '// 7. Write to Tenant-Isolated Local Storage';
const replacementStep7 = `// 7. Store to File Manager under Certificates/Generated
    const folders = await CertificateFolderService.ensureCertificatesFolders(tenantId, actorUserId || "system");
    const fileName = \`certificate-\${certificateNumber}.pdf\`;

    let mediaFile: any = null;
    try {
      mediaFile = await FilesService.uploadFile({
        buffer: pdfBuffer,
        originalFilename: fileName,
        tenantId,
        userId: actorUserId || "system",
        parentId: folders.generatedFolder.id,
        folder: "Certificates/Generated",
        category: "Documents",
        tags: ["certificates", "generated", certificateNumber],
      });
    } catch (uploadErr: any) {
      console.warn("[AwardCertificateService] File Manager upload warning:", uploadErr?.message);
    }

    const uploadsRoot = getUploadsRoot();
    const relativeStoragePath = mediaFile?.filePath || path.join("Certificates", "Generated", fileName).replace(/\\\\/g, "/");
    const absoluteFilePath = path.resolve(uploadsRoot, relativeStoragePath);

    if (!fs.existsSync(absoluteFilePath)) {
      await fs.promises.mkdir(path.dirname(absoluteFilePath), { recursive: true });
      await fs.promises.writeFile(absoluteFilePath, pdfBuffer);
    }

    // 7b. Legacy Storage fallback`;

if (!content.includes('// 7. Store to File Manager under Certificates/Generated')) {
  content = content.replace(targetStep7, replacementStep7);
}

// 3. In employeeAwardCertificate.create: Include fileId
const certCreateTarget = 'storagePath: relativeStoragePath,';
const certCreateReplacement = `storagePath: relativeStoragePath,
          fileId: mediaFile?.id || null,`;

if (!content.includes('fileId: mediaFile?.id || null,')) {
  content = content.replace(certCreateTarget, certCreateReplacement);
}

// 4. In getCertificateFile: Self-healing File Manager sync
const healTarget = 'if (freshBuffer) {';
const healReplacement = `if (freshBuffer) {
        try {
          const healFolders = await CertificateFolderService.ensureCertificatesFolders(cert.tenantId, "system");
          const healMediaFile = await FilesService.uploadFile({
            buffer: freshBuffer,
            originalFilename: cert.fileName || path.basename(absolutePath),
            tenantId: cert.tenantId,
            userId: options.actorUserId || "system",
            parentId: healFolders.generatedFolder.id,
            folder: "Certificates/Generated",
            category: "Documents",
            tags: ["certificates", "self-healed", cert.certificateNumber],
          });
          if (healMediaFile) {
            await db.employeeAwardCertificate.update({
              where: { id: cert.id },
              data: { fileId: healMediaFile.id, storagePath: healMediaFile.filePath }
            });
          }
        } catch (healSyncErr: any) {
          console.warn("[getCertificateFile] File Manager self-heal sync warning:", healSyncErr?.message);
        }`;

if (!content.includes('const healFolders = await CertificateFolderService.ensureCertificatesFolders')) {
  content = content.replace(healTarget, healReplacement);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated server/src/services/award-certificate.service.ts');
