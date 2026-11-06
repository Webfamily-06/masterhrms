"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateFolderService = void 0;
const prisma_1 = require("../../prisma");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
class CertificateFolderService {
    /**
     * Protected subfolder names under Certificates/
     */
    static SUBFOLDERS = [
        { key: "branding", name: "Branding", page: "branding", desc: "Organization logos, seals, watermarks, borders" },
        { key: "signatures", name: "Signatures", page: "signatures", desc: "Authorized signatory signatures" },
        { key: "templates", name: "Templates", page: "templates", desc: "Imported background artwork and template assets" },
        { key: "generated", name: "Generated", page: "generated", desc: "Generated certificate PDFs" },
    ];
    /**
     * Determines if a MediaFile node represents the protected Certificates root or one of its 4 managed subfolders.
     */
    static isCertificatesSystemFolder(node) {
        if (!node)
            return false;
        if (!node.isFolder && node.type !== "FOLDER")
            return false;
        // Check systemModule attribute
        if (node.systemModule === "certificates") {
            return true;
        }
        // Check root folder by name and parentId
        const nameLower = (node.fileName || "").trim().toLowerCase();
        if (node.parentId === null && nameLower === "certificates") {
            return true;
        }
        // Check child folders
        if (node.materializedPath && node.materializedPath.startsWith("/Certificates/")) {
            const parts = node.materializedPath.split("/").filter(Boolean);
            if (parts.length <= 2 && ["branding", "signatures", "templates", "generated"].includes(nameLower)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Ensures the existence of the protected Certificates folder hierarchy:
     * Certificates/
     * ├── Branding/
     * ├── Signatures/
     * ├── Templates/
     * └── Generated/
     *
     * Idempotent and thread-safe. Reuses existing folders and prevents duplicate creations.
     */
    static async ensureCertificatesFolders(tenantId, actorId = "system") {
        if (!tenantId) {
            throw new Error("Tenant ID is required to ensure certificates folder hierarchy.");
        }
        // 1. Root: Certificates/
        let rootFolder = await prisma.mediaFile.findFirst({
            where: {
                tenantId,
                isFolder: true,
                parentId: null,
                nameKey: "certificates",
                deletedAt: null,
            },
        });
        if (!rootFolder) {
            try {
                rootFolder = await prisma.mediaFile.create({
                    data: {
                        tenantId,
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
                        uploadedBy: actorId,
                        type: "FOLDER",
                        category: "System",
                        status: "ACTIVE",
                        materializedPath: "/Certificates/",
                        depth: 0,
                        systemModule: "certificates",
                        systemPage: "root",
                        tags: ["system", "certificates", "protected"],
                    },
                });
            }
            catch (err) {
                // Concurrency catch: if another request created it in parallel
                rootFolder = await prisma.mediaFile.findFirst({
                    where: {
                        tenantId,
                        isFolder: true,
                        parentId: null,
                        nameKey: "certificates",
                        deletedAt: null,
                    },
                });
                if (!rootFolder)
                    throw err;
            }
        }
        else if (!rootFolder.systemModule || rootFolder.systemModule !== "certificates") {
            // Ensure system markers are intact
            rootFolder = await prisma.mediaFile.update({
                where: { id: rootFolder.id },
                data: {
                    systemModule: "certificates",
                    systemPage: "root",
                    ownerType: "SYSTEM",
                    status: "ACTIVE",
                },
            });
        }
        // 2. Child Folders: Branding, Signatures, Templates, Generated
        const childFolders = {};
        for (const sub of this.SUBFOLDERS) {
            let folder = await prisma.mediaFile.findFirst({
                where: {
                    tenantId,
                    isFolder: true,
                    parentId: rootFolder.id,
                    nameKey: sub.key,
                    deletedAt: null,
                },
            });
            if (!folder) {
                try {
                    folder = await prisma.mediaFile.create({
                        data: {
                            tenantId,
                            fileName: sub.name,
                            nameKey: sub.key,
                            filePath: `Certificates/${sub.name}`,
                            url: "",
                            storageDisk: "LOCAL",
                            mimeType: "inode/directory",
                            fileSize: 0,
                            checksumSha: "",
                            folder: "Certificates",
                            isFolder: true,
                            parentId: rootFolder.id,
                            ownerType: "SYSTEM",
                            ownerId: "system",
                            uploadedBy: actorId,
                            type: "FOLDER",
                            category: "System",
                            status: "ACTIVE",
                            materializedPath: `/Certificates/${sub.name}/`,
                            depth: 1,
                            systemModule: "certificates",
                            systemPage: sub.page,
                            tags: ["system", "certificates", sub.key, "protected"],
                        },
                    });
                }
                catch (err) {
                    // Concurrency catch
                    folder = await prisma.mediaFile.findFirst({
                        where: {
                            tenantId,
                            isFolder: true,
                            parentId: rootFolder.id,
                            nameKey: sub.key,
                            deletedAt: null,
                        },
                    });
                    if (!folder)
                        throw err;
                }
            }
            else if (!folder.systemModule || folder.systemModule !== "certificates") {
                folder = await prisma.mediaFile.update({
                    where: { id: folder.id },
                    data: {
                        systemModule: "certificates",
                        systemPage: sub.page,
                        ownerType: "SYSTEM",
                        status: "ACTIVE",
                    },
                });
            }
            childFolders[sub.key] = folder;
        }
        return {
            rootFolder,
            brandingFolder: childFolders["branding"],
            signaturesFolder: childFolders["signatures"],
            templatesFolder: childFolders["templates"],
            generatedFolder: childFolders["generated"],
        };
    }
    /**
     * Inspects all database references across the certificate module to determine if a MediaFile is in active use.
     */
    static async checkCertificateAssetUsage(tenantId, fileId, filePath, excludeAssetId) {
        if (!tenantId || !fileId) {
            return {
                inUse: false,
                references: { brandingAssets: 0, signatories: 0, templateVersions: 0, certificates: 0 },
            };
        }
        // 1. Check organization_branding_assets
        const assetWhere = {
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
        const brandingAssetCount = await prisma.organizationBrandingAsset.count({ where: assetWhere });
        // Get any branding asset IDs linked to this file
        const brandingAssets = await prisma.organizationBrandingAsset.findMany({
            where: assetWhere,
            select: { id: true, assetName: true, assetType: true },
        });
        const brandingAssetIds = brandingAssets.map((a) => a.id);
        // 2. Check organization_signatories
        let signatoryCount = 0;
        if (brandingAssetIds.length > 0) {
            signatoryCount = await prisma.organizationSignatory.count({
                where: {
                    tenantId,
                    isActive: true,
                    signatureAssetId: { in: brandingAssetIds },
                },
            });
        }
        // 3. Check certificate_template_versions
        let templateVersionCount = 0;
        if (brandingAssetIds.length > 0) {
            templateVersionCount = await prisma.certificateTemplateVersion.count({
                where: {
                    backgroundAssetId: { in: brandingAssetIds },
                },
            });
        }
        // 4. Check employee_award_certificates
        const certWhere = {
            tenantId,
            status: { not: "REVOKED" },
            OR: [
                { fileId: fileId },
                ...(filePath ? [{ storagePath: filePath }] : []),
            ],
        };
        const certificateCount = await prisma.employeeAwardCertificate.count({
            where: certWhere,
        });
        const totalUsage = brandingAssetCount + signatoryCount + templateVersionCount + certificateCount;
        if (totalUsage > 0) {
            const parts = [];
            if (brandingAssetCount > 0)
                parts.push(`${brandingAssetCount} branding asset configuration(s)`);
            if (signatoryCount > 0)
                parts.push(`${signatoryCount} authorized signatory profile(s)`);
            if (templateVersionCount > 0)
                parts.push(`${templateVersionCount} certificate template(s)`);
            if (certificateCount > 0)
                parts.push(`${certificateCount} issued employee certificate(s)`);
            return {
                inUse: true,
                reason: `Cannot delete asset: file is actively referenced by ${parts.join(", ")}.`,
                references: {
                    brandingAssets: brandingAssetCount,
                    signatories: signatoryCount,
                    templateVersions: templateVersionCount,
                    certificates: certificateCount,
                },
            };
        }
        return {
            inUse: false,
            references: { brandingAssets: 0, signatories: 0, templateVersions: 0, certificates: 0 },
        };
    }
}
exports.CertificateFolderService = CertificateFolderService;
