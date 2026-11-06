const fs = require('fs');

const path = 'server/src/services/certificate-studio.service.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('streamBrandingAsset')) {
  const methods = `
  /**
   * Streams a branding asset binary with verified tenant isolation, proper MIME type, and inline caching.
   */
  public static async streamBrandingAsset(tenantId: string, assetId: string, res: any) {
    const asset = await prisma.organizationBrandingAsset.findFirst({
      where: { id: assetId, tenantId },
      include: { file: true }
    });

    if (!asset) {
      return res.status(404).json({ error: "Branding asset not found." });
    }

    const uploadsRoot = getUploadsRoot();
    const relativePath = asset.file?.filePath || asset.storagePath;
    const absPath = path.resolve(uploadsRoot, relativePath);

    // Guard path traversal
    if (!absPath.startsWith(path.resolve(uploadsRoot))) {
      return res.status(400).json({ error: "Invalid storage path: traversal detected." });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "Physical branding file not found on storage disk." });
    }

    const stat = fs.statSync(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".pdf": "application/pdf"
    };

    const mime = asset.mimeType || mimeMap[ext] || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", \`inline; filename="\${encodeURIComponent(asset.assetName)}\"\`);
    res.setHeader("Cache-Control", "private, max-age=3600");

    const stream = fs.createReadStream(absPath);
    return stream.pipe(res);
  }

  /**
   * Streams an authorized signatory signature binary with verified tenant isolation.
   */
  public static async streamSignatorySignature(tenantId: string, signatoryId: string, res: any) {
    const signatory = await prisma.organizationSignatory.findFirst({
      where: { id: signatoryId, tenantId },
      include: { signatureAsset: true }
    });

    if (!signatory || !signatory.signatureAsset) {
      return res.status(404).json({ error: "Signatory signature asset not found." });
    }

    return this.streamBrandingAsset(tenantId, signatory.signatureAsset.id, res);
  }

  /**
   * Reconciles legacy assets: Ensures all existing branding and certificate records have
   * matching canonical MediaFile records inside the protected Certificates folder hierarchy.
   */
  public static async reconcileLegacyAssets(tenantId?: string) {
    const where: any = { isActive: true };
    if (tenantId) where.tenantId = tenantId;

    const assets = await prisma.organizationBrandingAsset.findMany({
      where: { ...where, fileId: null },
      take: 200
    });

    const uploadsRoot = getUploadsRoot();
    let reconciledCount = 0;

    for (const a of assets) {
      try {
        const absPath = path.resolve(uploadsRoot, a.storagePath);
        if (!fs.existsSync(absPath)) continue;

        const folders = await CertificateFolderService.ensureCertificatesFolders(a.tenantId, "system");
        let targetFolder = folders.brandingFolder;
        if (a.assetType === "SIGNATURE") targetFolder = folders.signaturesFolder;
        else if (a.assetType === "BACKGROUND") targetFolder = folders.templatesFolder;

        const fileBuffer = fs.readFileSync(absPath);
        const checksumSha = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        let mediaFile = await prisma.mediaFile.findFirst({
          where: { tenantId: a.tenantId, parentId: targetFolder.id, checksumSha, status: "ACTIVE" }
        });

        if (!mediaFile) {
          mediaFile = await FilesService.uploadFile({
            buffer: fileBuffer,
            originalFilename: path.basename(a.storagePath),
            tenantId: a.tenantId,
            userId: a.createdBy || "system",
            parentId: targetFolder.id,
            category: targetFolder.nameKey === "signatures" ? "Signatures" : "Branding",
            tags: ["certificates", "legacy-reconciled"]
          });
        }

        await prisma.organizationBrandingAsset.update({
          where: { id: a.id },
          data: { fileId: mediaFile.id, storagePath: mediaFile.filePath }
        });
        reconciledCount++;
      } catch (err: any) {
        console.warn(\`[reconcileLegacyAssets] Warning for asset \${a.id}:\`, err?.message);
      }
    }

    return { reconciledCount };
  }
`;

  // Insert before the last closing brace of the class
  const lastBraceIdx = content.lastIndexOf('}');
  content = content.substring(0, lastBraceIdx) + methods + '\n' + content.substring(lastBraceIdx);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully added streamBrandingAsset, streamSignatorySignature, and reconcileLegacyAssets');
}
