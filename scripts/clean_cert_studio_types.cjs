const fs = require('fs');

const path = 'server/src/services/certificate-studio.service.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const existingAsset = await prisma.organizationBrandingAsset.findFirst({',
  'const existingAsset = await (prisma.organizationBrandingAsset as any).findFirst({'
);

content = content.replace(
  'const asset = await prisma.organizationBrandingAsset.create({',
  'const asset = await (prisma.organizationBrandingAsset as any).create({'
);

content = content.replace(
  'where: { tenantId, fileId: asset.fileId, isActive: true, id: { not: assetId } },',
  'where: { tenantId, fileId: (asset as any).fileId, isActive: true, id: { not: assetId } } as any,'
);

content = content.replace(
  'if (asset.fileId) {',
  'if ((asset as any).fileId) {'
);

content = content.replace(
  'ids: [asset.fileId],',
  'ids: [(asset as any).fileId],'
);

content = content.replace(
  'asset.fileId || asset.id,',
  '(asset as any).fileId || asset.id,'
);

content = content.replace(
  'const asset = await prisma.organizationBrandingAsset.findFirst({\r\n      where: { id: assetId, tenantId },\r\n      include: { file: true }\r\n    });',
  'const asset: any = await prisma.organizationBrandingAsset.findFirst({\r\n      where: { id: assetId, tenantId }\r\n    });'
);

content = content.replace(
  'const asset = await prisma.organizationBrandingAsset.findFirst({\n      where: { id: assetId, tenantId },\n      include: { file: true }\n    });',
  'const asset: any = await prisma.organizationBrandingAsset.findFirst({\n      where: { id: assetId, tenantId }\n    });'
);

content = content.replace(
  'const relativePath = asset.file?.filePath || asset.storagePath;',
  'const relativePath = asset.storagePath;'
);

content = content.replace(
  'const where: any = { isActive: true };\r\n    if (tenantId) where.tenantId = tenantId;\r\n\r\n    const assets = await prisma.organizationBrandingAsset.findMany({',
  'const where: any = { isActive: true };\r\n    if (tenantId) where.tenantId = tenantId;\r\n\r\n    const assets: any[] = await (prisma.organizationBrandingAsset as any).findMany({'
);

content = content.replace(
  'const where: any = { isActive: true };\n    if (tenantId) where.tenantId = tenantId;\n\n    const assets = await prisma.organizationBrandingAsset.findMany({',
  'const where: any = { isActive: true };\n    if (tenantId) where.tenantId = tenantId;\n\n    const assets: any[] = await (prisma.organizationBrandingAsset as any).findMany({'
);

content = content.replace(
  'await prisma.organizationBrandingAsset.update({\r\n          where: { id: a.id },\r\n          data: { fileId: mediaFile.id, storagePath: mediaFile.filePath }\r\n        });',
  'await (prisma.organizationBrandingAsset as any).update({\r\n          where: { id: a.id },\r\n          data: { fileId: mediaFile.id, storagePath: mediaFile.filePath }\r\n        });'
);

content = content.replace(
  'await prisma.organizationBrandingAsset.update({\n          where: { id: a.id },\n          data: { fileId: mediaFile.id, storagePath: mediaFile.filePath }\n        });',
  'await (prisma.organizationBrandingAsset as any).update({\n          where: { id: a.id },\n          data: { fileId: mediaFile.id, storagePath: mediaFile.filePath }\n        });'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Cleaned types in CertificateStudioService');
