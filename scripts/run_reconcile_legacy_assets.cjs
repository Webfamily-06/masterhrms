const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getUploadsRoot() {
  return process.env.UPLOADS_DIR || path.resolve(__dirname, '../uploads');
}

async function main() {
  console.log('Reconciling legacy assets via direct DB updates...');
  const assets = await prisma.organizationBrandingAsset.findMany({
    where: { isActive: true }
  });

  console.log(`Found ${assets.length} branding assets.`);
  const uploadsRoot = getUploadsRoot();

  for (const a of assets) {
    console.log(`\nChecking asset: ${a.assetName} (${a.assetType}) [id: ${a.id}]`);
    console.log(`  Current fileId: ${a.fileId}, storagePath: ${a.storagePath}`);

    const absPath = path.resolve(uploadsRoot, a.storagePath);
    const exists = fs.existsSync(absPath);
    console.log(`  Physical file exists: ${exists} (at ${absPath})`);

    if (exists && !a.fileId) {
      // 1. Ensure root Certificates folder
      let rootFolder = await prisma.mediaFile.findFirst({
        where: { tenantId: a.tenantId, parentId: null, nameKey: "certificates", deletedAt: null }
      });
      if (!rootFolder) {
        rootFolder = await prisma.mediaFile.create({
          data: {
            tenantId: a.tenantId,
            fileName: "Certificates",
            nameKey: "certificates",
            filePath: "Certificates",
            url: "",
            storageDisk: "LOCAL",
            mimeType: "inode/directory",
            fileSize: 0,
            checksumSha: "",
            folder: "Certificates",
            isFolder: true,
            parentId: null,
            ownerType: "SYSTEM",
            ownerId: "system",
            type: "FOLDER",
            category: "System",
            status: "ACTIVE",
            materializedPath: "/Certificates/",
            depth: 0,
            systemModule: "certificates",
            systemPage: "root",
            tags: ["system", "certificates", "protected"]
          }
        });
      }

      // 2. Ensure subfolder
      let subKey = "branding";
      let subName = "Branding";
      if (a.assetType === "SIGNATURE") {
        subKey = "signatures";
        subName = "Signatures";
      } else if (a.assetType === "BACKGROUND") {
        subKey = "templates";
        subName = "Templates";
      }

      let subFolder = await prisma.mediaFile.findFirst({
        where: { tenantId: a.tenantId, parentId: rootFolder.id, nameKey: subKey, deletedAt: null }
      });
      if (!subFolder) {
        subFolder = await prisma.mediaFile.create({
          data: {
            tenantId: a.tenantId,
            fileName: subName,
            nameKey: subKey,
            filePath: `Certificates/${subName}`,
            url: "",
            storageDisk: "LOCAL",
            mimeType: "inode/directory",
            fileSize: 0,
            checksumSha: "",
            folder: `Certificates/${subName}`,
            isFolder: true,
            parentId: rootFolder.id,
            ownerType: "SYSTEM",
            ownerId: "system",
            type: "FOLDER",
            category: "System",
            status: "ACTIVE",
            materializedPath: `/Certificates/${subName}/`,
            depth: 1,
            systemModule: "certificates",
            systemPage: subKey,
            tags: ["system", "certificates", subKey, "protected"]
          }
        });
      }

      // 3. Create MediaFile
      const buffer = fs.readFileSync(absPath);
      const checksumSha = crypto.createHash("sha256").update(buffer).digest("hex");
      const stat = fs.statSync(absPath);
      const fileName = path.basename(absPath);
      const ext = path.extname(absPath).replace(".", "").toLowerCase();

      let mediaFile = await prisma.mediaFile.findFirst({
        where: { tenantId: a.tenantId, parentId: subFolder.id, checksumSha, status: "ACTIVE" }
      });

      if (!mediaFile) {
        mediaFile = await prisma.mediaFile.create({
          data: {
            tenantId: a.tenantId,
            fileName,
            nameKey: fileName.toLowerCase(),
            filePath: a.storagePath,
            url: `/api/v1/files/stream?key=${encodeURIComponent(a.storagePath)}`,
            storageDisk: "LOCAL",
            mimeType: a.mimeType || "application/octet-stream",
            fileSize: stat.size,
            checksumSha,
            folder: `Certificates/${subName}`,
            isFolder: false,
            parentId: subFolder.id,
            ownerType: "USER",
            ownerId: a.createdBy || "system",
            type: "FILE",
            category: subName,
            status: "ACTIVE",
            materializedPath: `/Certificates/${subName}/${fileName}`,
            depth: 2,
            extension: ext,
            tags: ["certificates", subKey, "reconciled"]
          }
        });
      }

      await prisma.organizationBrandingAsset.update({
        where: { id: a.id },
        data: { fileId: mediaFile.id }
      });
      console.log(`  ✓ Linked to MediaFile: ${mediaFile.id}`);
    }
  }

  // Also check employee_award_certificates
  const certs = await prisma.employeeAwardCertificate.findMany({
    where: { fileId: null, status: "ACTIVE" }
  });
  console.log(`\nFound ${certs.length} certificates without fileId.`);
  for (const c of certs) {
    const absPath = path.resolve(uploadsRoot, c.storagePath);
    if (fs.existsSync(absPath)) {
      let rootFolder = await prisma.mediaFile.findFirst({
        where: { tenantId: c.tenantId, parentId: null, nameKey: "certificates", deletedAt: null }
      });
      if (!rootFolder) {
        rootFolder = await prisma.mediaFile.create({
          data: {
            tenantId: c.tenantId,
            fileName: "Certificates",
            nameKey: "certificates",
            filePath: "Certificates",
            url: "",
            storageDisk: "LOCAL",
            mimeType: "inode/directory",
            fileSize: 0,
            checksumSha: "",
            folder: "Certificates",
            isFolder: true,
            parentId: null,
            ownerType: "SYSTEM",
            ownerId: "system",
            type: "FOLDER",
            category: "System",
            status: "ACTIVE",
            materializedPath: "/Certificates/",
            depth: 0,
            systemModule: "certificates",
            systemPage: "root",
            tags: ["system", "certificates", "protected"]
          }
        });
      }

      let genFolder = await prisma.mediaFile.findFirst({
        where: { tenantId: c.tenantId, parentId: rootFolder.id, nameKey: "generated", deletedAt: null }
      });
      if (!genFolder) {
        genFolder = await prisma.mediaFile.create({
          data: {
            tenantId: c.tenantId,
            fileName: "Generated",
            nameKey: "generated",
            filePath: "Certificates/Generated",
            url: "",
            storageDisk: "LOCAL",
            mimeType: "inode/directory",
            fileSize: 0,
            checksumSha: "",
            folder: "Certificates/Generated",
            isFolder: true,
            parentId: rootFolder.id,
            ownerType: "SYSTEM",
            ownerId: "system",
            type: "FOLDER",
            category: "System",
            status: "ACTIVE",
            materializedPath: "/Certificates/Generated/",
            depth: 1,
            systemModule: "certificates",
            systemPage: "generated",
            tags: ["system", "certificates", "generated", "protected"]
          }
        });
      }

      const buffer = fs.readFileSync(absPath);
      const checksumSha = crypto.createHash("sha256").update(buffer).digest("hex");
      const stat = fs.statSync(absPath);
      const fileName = path.basename(absPath);

      let mediaFile = await prisma.mediaFile.findFirst({
        where: { tenantId: c.tenantId, parentId: genFolder.id, checksumSha, status: "ACTIVE" }
      });

      if (!mediaFile) {
        mediaFile = await prisma.mediaFile.create({
          data: {
            tenantId: c.tenantId,
            fileName,
            nameKey: fileName.toLowerCase(),
            filePath: c.storagePath,
            url: `/api/v1/files/stream?key=${encodeURIComponent(c.storagePath)}`,
            storageDisk: "LOCAL",
            mimeType: "application/pdf",
            fileSize: stat.size,
            checksumSha,
            folder: "Certificates/Generated",
            isFolder: false,
            parentId: genFolder.id,
            ownerType: "USER",
            ownerId: c.employeeId,
            type: "FILE",
            category: "Documents",
            status: "ACTIVE",
            materializedPath: `/Certificates/Generated/${fileName}`,
            depth: 2,
            extension: "pdf",
            tags: ["certificates", "generated", c.certificateNumber]
          }
        });
      }

      await prisma.employeeAwardCertificate.update({
        where: { id: c.id },
        data: { fileId: mediaFile.id }
      });
      console.log(`  ✓ Linked cert ${c.certificateNumber} to MediaFile ${mediaFile.id}`);
    }
  }

  console.log('\nReconciliation completed successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
