const fs = require('fs');

const path = 'server/src/services/certificate-studio.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports for CertificateFolderService and FilesService
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

// 2. Replace saveBrandingAsset and deleteBrandingAsset
const oldSaveAndDelStart = 'public static async saveBrandingAsset(dto: SaveBrandingAssetDto) {';
const oldSaveAndDelEnd = '/**\r\n   * 2. SIGNATORIES\r\n   */';
const oldSaveAndDelEndLf = '/**\n   * 2. SIGNATORIES\n   */';

let endIdx = content.indexOf(oldSaveAndDelEnd);
if (endIdx === -1) endIdx = content.indexOf(oldSaveAndDelEndLf);

const startIdx = content.indexOf(oldSaveAndDelStart);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `public static async saveBrandingAsset(dto: SaveBrandingAssetDto) {
    const { tenantId, assetType, assetName, buffer, mimeType, fileName, metadata, actorUserId } = dto;

    // Validate size limit (5MB max)
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error("Branding asset size exceeds 5MB limit.");
    }

    const allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      throw new Error(\`Unsupported asset mime type: \${mimeType}. Allowed: PNG, JPEG, WEBP, SVG, PDF.\`);
    }

    let finalBuffer = buffer;
    if (mimeType.toLowerCase() === "image/svg+xml") {
      const sanitizedSvg = this.sanitizeSvg(buffer.toString("utf-8"));
      finalBuffer = Buffer.from(sanitizedSvg, "utf-8");
    }

    // 1. Ensure Certificates folder hierarchy in File Manager
    const folders = await CertificateFolderService.ensureCertificatesFolders(tenantId, actorUserId || "system");

    // Determine target subfolder based on assetType
    let targetFolder = folders.brandingFolder;
    let targetCategory = "Branding";
    let targetFolderName = "Certificates/Branding";

    if (assetType === "SIGNATURE") {
      targetFolder = folders.signaturesFolder;
      targetCategory = "Signatures";
      targetFolderName = "Certificates/Signatures";
    } else if (assetType === "BACKGROUND" || assetType === "TEMPLATE_ASSET") {
      targetFolder = folders.templatesFolder;
      targetCategory = "Templates";
      targetFolderName = "Certificates/Templates";
    }

    // 2. Safe duplicate detection via content SHA-256 hash
    const checksumSha = crypto.createHash("sha256").update(finalBuffer).digest("hex");

    const existingMediaFile = await prisma.mediaFile.findFirst({
      where: {
        tenantId,
        parentId: targetFolder.id,
        checksumSha,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    let mediaFile: any;
    let isReused = false;

    if (existingMediaFile) {
      // Check if an active branding asset already references this exact file
      const existingAsset = await prisma.organizationBrandingAsset.findFirst({
        where: {
          tenantId,
          fileId: existingMediaFile.id,
          assetType,
          isActive: true,
        },
      });

      if (existingAsset) {
        return { ...existingAsset, reused: true, file: existingMediaFile };
      }

      mediaFile = existingMediaFile;
      isReused = true;
    } else {
      // 3. Upload file through canonical File Manager service
      const safeExt = path.extname(fileName) || (mimeType === "image/svg+xml" ? ".svg" : ".png");
      const cleanBase = assetName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeFileName = \`\${cleanBase}-\${Date.now()}\${safeExt}\`;

      mediaFile = await FilesService.uploadFile({
        buffer: finalBuffer,
        originalFilename: safeFileName,
        tenantId,
        userId: actorUserId || "system",
        parentId: targetFolder.id,
        folder: targetFolderName,
        category: targetCategory,
        tags: ["certificates", targetCategory.toLowerCase(), assetType.toLowerCase()],
      });
    }

    // 4. Create OrganizationBrandingAsset linked to canonical File Manager fileId
    const assetId = crypto.randomUUID();
    const asset = await prisma.organizationBrandingAsset.create({
      data: {
        id: assetId,
        tenantId,
        assetType,
        assetName,
        fileId: mediaFile.id,
        storagePath: mediaFile.filePath,
        mimeType: mediaFile.mimeType || mimeType,
        fileSize: Number(mediaFile.fileSize || finalBuffer.length),
        metadata: metadata || {},
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    if (actorUserId) {
      await AuditService.log({
        tenantId,
        userId: actorUserId,
        action: "BRANDING_ASSET_UPLOADED",
        resourceType: "OrganizationBrandingAsset",
        resourceId: asset.id,
        details: {
          assetType,
          assetName,
          fileId: mediaFile.id,
          storagePath: mediaFile.filePath,
          reused: isReused,
        },
      });
    }

    return { ...asset, reused: isReused, file: mediaFile };
  }

  public static async deleteBrandingAsset(tenantId: string, assetId: string, actorUserId?: string) {
    const asset = await prisma.organizationBrandingAsset.findFirst({
      where: { id: assetId, tenantId },
    });
    if (!asset) {
      const err: any = new Error("Branding asset not found.");
      err.status = 404;
      throw err;
    }

    // Reference Protection Guard: Check active signatories
    const activeSig = await prisma.organizationSignatory.findFirst({
      where: { tenantId, signatureAssetId: assetId, isActive: true },
    });
    if (activeSig) {
      const err: any = new Error(
        \`Cannot delete "\${asset.assetName}": asset is actively assigned as the digital signature for signatory "\${activeSig.name}" (\${activeSig.designation}).\`
      );
      err.status = 409;
      err.code = "CERTIFICATE_ASSET_IN_USE";
      err.references = { signatories: 1, templateVersions: 0, certificates: 0, brandingAssets: 1 };
      throw err;
    }

    // Reference Protection Guard: Check active template versions
    const activeTmpl = await prisma.certificateTemplateVersion.findFirst({
      where: { backgroundAssetId: assetId },
      include: { template: true },
    });
    if (activeTmpl) {
      const err: any = new Error(
        \`Cannot delete "\${asset.assetName}": asset is used as background artwork in template "\${activeTmpl.template?.name || activeTmpl.templateId}" (v\${activeTmpl.versionNumber}).\`
      );
      err.status = 409;
      err.code = "CERTIFICATE_ASSET_IN_USE";
      err.references = { signatories: 0, templateVersions: 1, certificates: 0, brandingAssets: 1 };
      throw err;
    }

    // Reference Protection Guard: Check overall certificate usage
    const usage = await CertificateFolderService.checkCertificateAssetUsage(
      tenantId,
      asset.fileId || asset.id,
      asset.storagePath
    );
    if (usage.inUse) {
      const err: any = new Error(usage.reason);
      err.status = 409;
      err.code = "CERTIFICATE_ASSET_IN_USE";
      err.references = usage.references;
      throw err;
    }

    // Soft-deactivate branding record
    await prisma.organizationBrandingAsset.update({
      where: { id: assetId },
      data: { isActive: false, updatedBy: actorUserId },
    });

    // If fileId is present, check if other active branding records share this file
    if (asset.fileId) {
      const otherUses = await prisma.organizationBrandingAsset.count({
        where: { tenantId, fileId: asset.fileId, isActive: true, id: { not: assetId } },
      });
      if (otherUses === 0) {
        try {
          await FilesService.trashItems({
            ids: [asset.fileId],
            tenantId,
            userId: actorUserId || "system",
            force: true,
          });
        } catch (trashErr: any) {
          console.warn("[deleteBrandingAsset] Trash file warning:", trashErr.message);
        }
      }
    }

    if (actorUserId) {
      await AuditService.log({
        tenantId,
        userId: actorUserId,
        action: "BRANDING_ASSET_DEACTIVATED",
        resourceType: "OrganizationBrandingAsset",
        resourceId: assetId,
        details: { assetName: asset.assetName },
      });
    }

    return { success: true };
  }

  public static async replaceBrandingAsset(dto: SaveBrandingAssetDto & { oldAssetId: string }) {
    // 1. Upload new asset
    const newAsset = await this.saveBrandingAsset(dto);

    // 2. If replacement saved and old asset specified, attempt safe cleanup
    if (dto.oldAssetId && dto.oldAssetId !== newAsset.id) {
      try {
        await this.deleteBrandingAsset(dto.tenantId, dto.oldAssetId, dto.actorUserId);
      } catch (err: any) {
        // If old asset cannot be deleted because of historical references, preserve it safely
        console.info(\`[replaceBrandingAsset] Preserving historical reference for old asset \${dto.oldAssetId}: \${err.message}\`);
      }
    }

    return newAsset;
  }

  `;

  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully updated CertificateStudioService saveBrandingAsset and deleteBrandingAsset');
} else {
  console.error('Could not locate saveBrandingAsset markers in CertificateStudioService');
  process.exit(1);
}
