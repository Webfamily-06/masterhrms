const fs = require('fs');
const path = require('path');

// 1. Patch certificate-folder.service.ts
const folderServicePath = path.join(__dirname, '../server/src/services/files/certificate-folder.service.ts');
let s = fs.readFileSync(folderServicePath, 'utf8');

s = s.replace(
  /checkCertificateAssetUsage\(\s*tenantId:\s*string\s*\|\s*null,\s*fileId:\s*string,\s*filePath\?:\s*string\s*\)/m,
  'checkCertificateAssetUsage(\n    tenantId: string | null,\n    fileId: string,\n    filePath?: string,\n    excludeAssetId?: string\n  )'
);

s = s.replace(
  /const brandingAssetCount = await \(prisma\.organizationBrandingAsset as any\)\.count\(\{\s*where: \{\s*tenantId,\s*isActive: true,\s*OR: \[\s*\{ fileId: fileId \},\s*\.\.\.\(filePath \? \[\{ storagePath: filePath \}\] : \[\]\),\s*\],\s*\},\s*\}\);/m,
  `const assetWhere: any = {
      tenantId,
      isActive: true,
      OR: [
        { fileId: fileId },
        ...(filePath ? [{ storagePath: filePath }] : []),
      ],
    };
    if (excludeAssetId) {
      assetWhere.id = { not: excludeAssetId };
    }
    const brandingAssetCount = await (prisma.organizationBrandingAsset as any).count({ where: assetWhere });`
);

s = s.replace(
  /const brandingAssets = await \(prisma\.organizationBrandingAsset as any\)\.findMany\(\{\s*where: \{\s*tenantId,\s*isActive: true,\s*OR: \[\s*\{ fileId: fileId \},\s*\.\.\.\(filePath \? \[\{ storagePath: filePath \}\] : \[\]\),\s*\],\s*\},\s*select: \{ id: true, assetName: true, assetType: true \},\s*\}\);/m,
  `const brandingAssets = await (prisma.organizationBrandingAsset as any).findMany({
      where: assetWhere,
      select: { id: true, assetName: true, assetType: true },
    });`
);

fs.writeFileSync(folderServicePath, s, 'utf8');
console.log('Patched certificate-folder.service.ts');

// 2. Patch certificate-studio.service.ts
const studioServicePath = path.join(__dirname, '../server/src/services/certificate-studio.service.ts');
let studio = fs.readFileSync(studioServicePath, 'utf8');

studio = studio.replace(
  /const usage = await CertificateFolderService\.checkCertificateAssetUsage\(\s*tenantId,\s*\(asset as any\)\.fileId \|\| asset\.id,\s*asset\.storagePath\s*\);/m,
  `const usage = await CertificateFolderService.checkCertificateAssetUsage(
      tenantId,
      (asset as any).fileId || asset.id,
      asset.storagePath,
      assetId
    );`
);

fs.writeFileSync(studioServicePath, studio, 'utf8');
console.log('Patched certificate-studio.service.ts');

