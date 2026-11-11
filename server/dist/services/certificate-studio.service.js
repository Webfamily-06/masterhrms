"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateStudioService = exports.PLACEHOLDER_REGISTRY = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const db = prisma_1.rawPrisma || prisma_1.prisma;
const media_service_1 = require("./media/media.service");
const audit_service_1 = require("./audit.service");
const certificate_folder_service_1 = require("./files/certificate-folder.service");
const files_service_1 = require("./files/files.service");
const qrcode_1 = __importDefault(require("qrcode"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const sharp_1 = __importDefault(require("sharp"));
const certificate_verification_resolver_1 = require("../lib/certificate-verification-resolver");
// Dynamic Placeholder Registry
exports.PLACEHOLDER_REGISTRY = [
    { key: "{{employee.name}}", name: "Employee Full Name", module: "Employee", sample: "Johnathan Doe", required: true },
    { key: "{{employee.employeeCode}}", name: "Employee Code / ID", module: "Employee", sample: "EMP-2026-0891", required: false },
    { key: "{{employee.designation}}", name: "Designation / Role", module: "Employee", sample: "Principal Software Engineer", required: true },
    { key: "{{employee.department}}", name: "Department", module: "Employee", sample: "Technology & Platform Operations", required: false },
    { key: "{{award.title}}", name: "Award Title", module: "Award", sample: "Governor Excellence Award 2026", required: true },
    { key: "{{award.description}}", name: "Award Citation / Description", module: "Award", sample: "For exceptional leadership, sustained engineering innovation, and organizational impact.", required: false },
    { key: "{{award.date}}", name: "Award Date", module: "Award", sample: "November 06, 2026", required: true },
    { key: "{{award.category}}", name: "Award Category", module: "Award", sample: "Employee Excellence", required: false },
    { key: "{{organization.name}}", name: "Organization Name", module: "Organization", sample: "MASTERHRMS Global Technologies", required: true },
    { key: "{{organization.logo}}", name: "Primary Logo Asset", module: "Organization", sample: "/images/logo/logo.webp", required: false },
    { key: "{{organization.address}}", name: "Organization Address", module: "Organization", sample: "Cyber City, Suite 500", required: false },
    { key: "{{organization.website}}", name: "Organization Website", module: "Organization", sample: "https://masterhrms.io", required: false },
    { key: "{{signatures.hr}}", name: "HR Manager Signature", module: "Signatures", sample: "Head of People", required: false },
    { key: "{{signatures.director}}", name: "HR Director Signature", module: "Signatures", sample: "HR Managing Director", required: false },
    { key: "{{signatures.ceo}}", name: "CEO / MD Signature", module: "Signatures", sample: "Chief Executive Officer", required: false },
    { key: "{{certificate.number}}", name: "Certificate Serial Number", module: "Certificate", sample: "CERT-2026-8F29A10C", required: true },
    { key: "{{certificate.verificationCode}}", name: "Unguessable Verification Code", module: "Certificate", sample: "VERIFY-9C81B27D8310E476A841", required: true },
    { key: "{{certificate.verificationUrl}}", name: "Verification Public URL", module: "Certificate", sample: (0, certificate_verification_resolver_1.resolveCertificateVerificationUrl)("VERIFY-9C81B27D8310E476A841"), required: true },
    { key: "{{certificate.qrCode}}", name: "Verification QR Code", module: "Certificate", sample: "[QR_CODE_IMAGE]", required: false },
];
class CertificateStudioService {
    /**
     * Sanitizes SVG content by stripping dangerous tags and attributes.
     */
    static sanitizeSvg(content) {
        let sanitized = content;
        // Strip <script>...</script>
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        // Strip on* event handlers (e.g. onload, onclick, onerror)
        sanitized = sanitized.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
        sanitized = sanitized.replace(/\son\w+\s*=\s*[^>\s]+/gi, "");
        // Strip <iframe...>, <object...>, <embed...>
        sanitized = sanitized.replace(/<(iframe|object|embed|foreignObject)\b[^>]*>.*?<\/\1>/gi, "");
        sanitized = sanitized.replace(/<(iframe|object|embed|foreignObject)\b[^>]*\/?>/gi, "");
        // Strip javascript: URLs
        sanitized = sanitized.replace(/href\s*=\s*['"]javascript:[^'"]*['"]/gi, 'href="#"');
        sanitized = sanitized.replace(/xlink:href\s*=\s*['"]javascript:[^'"]*['"]/gi, 'xlink:href="#"');
        return sanitized;
    }
    /**
     * Sanitizes HTML/CSS template code for Mode B import.
     */
    static sanitizeHtmlTemplate(html, css = "") {
        let cleanHtml = html;
        let cleanCss = css;
        // Disallow script, iframe, object, embed, link, form, input
        cleanHtml = cleanHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        cleanHtml = cleanHtml.replace(/<(iframe|object|embed|form|input|button)\b[^>]*>.*?<\/\1>/gi, "");
        cleanHtml = cleanHtml.replace(/<(iframe|object|embed|form|input|button)\b[^>]*\/?>/gi, "");
        // Strip inline event handlers
        cleanHtml = cleanHtml.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
        cleanHtml = cleanHtml.replace(/\son\w+\s*=\s*[^>\s]+/gi, "");
        // Strip javascript: pseudo protocols
        cleanHtml = cleanHtml.replace(/href\s*=\s*['"]javascript:[^'"]*['"]/gi, 'href="#"');
        // CSS sanitization: strip external @import, @charset, behavior, expression, url(http...)
        cleanCss = cleanCss.replace(/@import\s+[^;]+;/gi, "");
        cleanCss = cleanCss.replace(/expression\s*\(.*?\)/gi, "");
        cleanCss = cleanCss.replace(/behavior\s*:[^;]+;/gi, "");
        cleanCss = cleanCss.replace(/url\s*\(\s*['"]?(?:https?:)?\/\/[^'")]+['"]?\s*\)/gi, "none");
        return { sanitizedHtml: cleanHtml, sanitizedCss: cleanCss };
    }
    /**
     * 1. BRANDING ASSETS
     */
    static async getBrandingAssets(tenantId) {
        return prisma_1.prisma.organizationBrandingAsset.findMany({
            where: { tenantId, isActive: true },
            orderBy: { createdAt: "desc" }
        });
    }
    /**
     * Authoritatively resolves the organization active primary logo asset.
     * If an explicit LOGO_PRIMARY asset is registered, returns it.
     * Fallback to tenant.logoUrl or system default if none exists.
     */
    static async getPrimaryLogoAsset(tenantId) {
        const primaryAsset = await db.organizationBrandingAsset.findFirst({
            where: {
                tenantId,
                assetType: { in: ["LOGO_PRIMARY", "PRIMARY_LOGO"] },
                isActive: true
            },
            orderBy: { createdAt: "desc" }
        });
        if (primaryAsset) {
            return {
                id: primaryAsset.id,
                assetName: primaryAsset.assetName,
                assetType: primaryAsset.assetType,
                fileId: primaryAsset.fileId,
                storagePath: primaryAsset.storagePath,
                mimeType: primaryAsset.mimeType,
                url: `/api/certificate-studio/branding/${primaryAsset.id}/preview`
            };
        }
        // Secondary fallback: tenant table logoUrl
        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, logoUrl: true }
        });
        if (tenant?.logoUrl) {
            return {
                id: "tenant-primary-logo",
                assetName: `${tenant.name} Logo`,
                assetType: "LOGO_PRIMARY",
                fileId: null,
                storagePath: null,
                mimeType: "image/webp",
                url: tenant.logoUrl
            };
        }
        return null;
    }
    /**
     * Resolves binary asset buffer from branding asset URL, signatory preview URL, or local path.
     * Automatically executes SVG to PNG rasterization with Sharp for PDFKit vector embedding.
     */
    static async resolveAssetBuffer(resolvedUrl) {
        if (!resolvedUrl || typeof resolvedUrl !== "string")
            return null;
        let imageBuffer = null;
        const uploadsRoot = (0, media_service_1.getUploadsRoot)();
        try {
            // 1. Branding asset preview URL e.g. /api/certificate-studio/branding/:id/preview
            if (resolvedUrl.includes("/branding/") && resolvedUrl.includes("/preview")) {
                const assetIdMatch = resolvedUrl.match(/\/branding\/([^/?]+)/);
                if (assetIdMatch) {
                    const brandingAsset = await db.organizationBrandingAsset.findUnique({
                        where: { id: assetIdMatch[1] }
                    });
                    if (brandingAsset && brandingAsset.storagePath) {
                        const filePath = path_1.default.resolve(uploadsRoot, brandingAsset.storagePath.replace(/^\/+/, ""));
                        if (fs_1.default.existsSync(filePath)) {
                            imageBuffer = fs_1.default.readFileSync(filePath);
                            if (brandingAsset.mimeType === "image/svg+xml" || filePath.endsWith(".svg")) {
                                imageBuffer = await (0, sharp_1.default)(imageBuffer).png().toBuffer();
                            }
                        }
                    }
                }
            }
            // 2. Signatory preview URL e.g. /api/certificate-studio/signatories/:id/signature-preview
            else if (resolvedUrl.includes("/signatories/") && resolvedUrl.includes("/signature-preview")) {
                const sigIdMatch = resolvedUrl.match(/\/signatories\/([^/?]+)/);
                if (sigIdMatch) {
                    const signatory = await db.organizationSignatory.findUnique({
                        where: { id: sigIdMatch[1] },
                        include: { signatureAsset: true }
                    });
                    if (signatory?.signatureAsset?.storagePath) {
                        const filePath = path_1.default.resolve(uploadsRoot, signatory.signatureAsset.storagePath.replace(/^\/+/, ""));
                        if (fs_1.default.existsSync(filePath)) {
                            imageBuffer = fs_1.default.readFileSync(filePath);
                            if (signatory.signatureAsset.mimeType === "image/svg+xml" || filePath.endsWith(".svg")) {
                                imageBuffer = await (0, sharp_1.default)(imageBuffer).png().toBuffer();
                            }
                        }
                    }
                }
            }
            // 3. Direct local file or public path
            else {
                const cleaned = resolvedUrl.replace(/^\//, "");
                const candidatePublic = path_1.default.resolve(process.cwd(), "public", cleaned);
                const candidateUploads = path_1.default.resolve(uploadsRoot, cleaned);
                if (fs_1.default.existsSync(candidatePublic)) {
                    imageBuffer = fs_1.default.readFileSync(candidatePublic);
                }
                else if (fs_1.default.existsSync(candidateUploads)) {
                    imageBuffer = fs_1.default.readFileSync(candidateUploads);
                }
                if (imageBuffer) {
                    const lower = (resolvedUrl || "").toLowerCase();
                    if (lower.endsWith(".svg") || lower.endsWith(".webp") || lower.includes(".svg") || lower.includes(".webp")) {
                        try {
                            imageBuffer = await (0, sharp_1.default)(imageBuffer).png().toBuffer();
                        }
                        catch (sharpErr) {
                            console.warn("[resolveAssetBuffer] sharp conversion to PNG failed:", sharpErr);
                        }
                    }
                }
            }
        }
        catch (err) {
            console.warn("[resolveAssetBuffer] Asset read failed for:", resolvedUrl, err);
        }
        return imageBuffer;
    }
    /**
     * Retrieves authoritative real-time preview context for Certificate Studio:
     * Organization profile, primary logo, official seal, authorized signatories, active employees,
     * award types, and centralized verification URL.
     */
    static async getPreviewContext(tenantId) {
        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, slug: true, logoUrl: true }
        });
        const primaryLogo = await this.getPrimaryLogoAsset(tenantId);
        // Official Seal
        const sealAsset = await db.organizationBrandingAsset.findFirst({
            where: {
                tenantId,
                assetType: { in: ["OFFICIAL_SEAL", "SEAL"] },
                isActive: true
            },
            orderBy: { createdAt: "desc" }
        });
        // Watermark
        const watermarkAsset = await db.organizationBrandingAsset.findFirst({
            where: {
                tenantId,
                assetType: "WATERMARK",
                isActive: true
            },
            orderBy: { createdAt: "desc" }
        });
        // Background
        const backgroundAsset = await db.organizationBrandingAsset.findFirst({
            where: {
                tenantId,
                assetType: "BACKGROUND",
                isActive: true
            },
            orderBy: { createdAt: "desc" }
        });
        // Active Signatories
        const now = new Date();
        const signatories = await db.organizationSignatory.findMany({
            where: {
                tenantId,
                isActive: true,
                authorizationStatus: "AUTHORIZED"
            },
            include: { signatureAsset: true },
            orderBy: { createdAt: "asc" }
        });
        const formattedSignatories = signatories.map(sig => ({
            id: sig.id,
            name: sig.name,
            designation: sig.designation,
            department: sig.department || "",
            signatoryType: sig.signatoryType,
            authorizationStatus: sig.authorizationStatus,
            signatureAssetId: sig.signatureAssetId,
            signatureUrl: sig.signatureAssetId ? `/api/certificate-studio/signatories/${sig.id}/signature-preview` : null,
            isCurrent: sig.effectiveFrom <= now && (!sig.effectiveTo || sig.effectiveTo >= now)
        }));
        // Find specific signatories by role
        const hrSignatory = formattedSignatories.find(s => s.signatoryType.includes("HR")) || formattedSignatories[0] || null;
        const directorSignatory = formattedSignatories.find(s => s.signatoryType.includes("DIRECTOR")) || formattedSignatories[1] || null;
        const ceoSignatory = formattedSignatories.find(s => s.signatoryType.includes("CEO") || s.signatoryType.includes("MD")) || formattedSignatories[2] || null;
        // Recent / Active Employees
        const employees = await db.employee.findMany({
            where: { tenantId, status: "active" },
            take: 30,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                position: true,
                department: { select: { id: true, name: true } },
                designation: { select: { id: true, name: true } }
            },
            orderBy: { firstName: "asc" }
        });
        const formattedEmployees = employees.map(emp => ({
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`.trim(),
            employeeCode: emp.employeeCode,
            designation: emp.designation?.name || emp.position || "Staff Professional",
            department: emp.department?.name || "Operations"
        }));
        // Active Award Types
        const awardTypes = await db.awardType.findMany({
            where: { tenantId, status: "active" },
            take: 30,
            select: {
                id: true,
                name: true,
                description: true,
                icon: true
            },
            orderBy: { name: "asc" }
        });
        const formattedAwards = awardTypes.map(aw => ({
            id: aw.id,
            title: aw.name,
            description: aw.description || "In recognition of outstanding performance, sustained innovation, and exemplary commitment to organizational values.",
            category: "Excellence & Distinction"
        }));
        const sampleVerificationCode = "VERIFY-9C81B27D8310E476A841";
        const sampleVerificationUrl = (0, certificate_verification_resolver_1.resolveCertificateVerificationUrl)(sampleVerificationCode);
        return {
            organization: {
                id: tenant?.id || tenantId,
                name: tenant?.name || "MASTERHRMS Global Technologies",
                slug: tenant?.slug || "masterhrms",
                logoUrl: primaryLogo?.url || tenant?.logoUrl || "/logo.webp"
            },
            branding: {
                primaryLogo: primaryLogo || {
                    id: "default-logo",
                    assetName: "Master HRMS Logo",
                    url: "/logo.webp"
                },
                officialSeal: sealAsset ? {
                    id: sealAsset.id,
                    assetName: sealAsset.assetName,
                    url: `/api/certificate-studio/branding/${sealAsset.id}/preview`
                } : null,
                watermark: watermarkAsset ? {
                    id: watermarkAsset.id,
                    assetName: watermarkAsset.assetName,
                    url: `/api/certificate-studio/branding/${watermarkAsset.id}/preview`
                } : null,
                background: backgroundAsset ? {
                    id: backgroundAsset.id,
                    assetName: backgroundAsset.assetName,
                    url: `/api/certificate-studio/branding/${backgroundAsset.id}/preview`
                } : null,
            },
            signatories: formattedSignatories,
            signatoryRoles: {
                hr: hrSignatory,
                director: directorSignatory,
                ceo: ceoSignatory
            },
            employees: formattedEmployees,
            awards: formattedAwards,
            sampleCertificate: {
                certificateNumber: "CERT-2026-8F29A10C",
                verificationCode: sampleVerificationCode,
                verificationUrl: sampleVerificationUrl,
                isSample: true
            }
        };
    }
    static async saveBrandingAsset(dto) {
        const { tenantId, assetType, assetName, buffer, mimeType, fileName, metadata, actorUserId } = dto;
        // Validate size limit (5MB max)
        if (buffer.length > 5 * 1024 * 1024) {
            throw new Error("Branding asset size exceeds 5MB limit.");
        }
        const allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"];
        if (!allowedMimes.includes(mimeType.toLowerCase())) {
            throw new Error(`Unsupported asset mime type: ${mimeType}. Allowed: PNG, JPEG, WEBP, SVG, PDF.`);
        }
        let finalBuffer = buffer;
        if (mimeType.toLowerCase() === "image/svg+xml") {
            const sanitizedSvg = this.sanitizeSvg(buffer.toString("utf-8"));
            finalBuffer = Buffer.from(sanitizedSvg, "utf-8");
        }
        // 1. Ensure Certificates folder hierarchy in File Manager
        const folders = await certificate_folder_service_1.CertificateFolderService.ensureCertificatesFolders(tenantId, actorUserId || "system");
        // Determine target subfolder based on assetType
        let targetFolder = folders.brandingFolder;
        let targetCategory = "Branding";
        let targetFolderName = "Certificates/Branding";
        if (assetType === "SIGNATURE") {
            targetFolder = folders.signaturesFolder;
            targetCategory = "Signatures";
            targetFolderName = "Certificates/Signatures";
        }
        else if (assetType === "BACKGROUND" || assetType === "TEMPLATE_ASSET") {
            targetFolder = folders.templatesFolder;
            targetCategory = "Templates";
            targetFolderName = "Certificates/Templates";
        }
        // 2. Safe duplicate detection via content SHA-256 hash
        const checksumSha = crypto_1.default.createHash("sha256").update(finalBuffer).digest("hex");
        const existingMediaFile = await prisma_1.prisma.mediaFile.findFirst({
            where: {
                tenantId,
                parentId: targetFolder.id,
                checksumSha,
                status: "ACTIVE",
                deletedAt: null,
            },
        });
        let mediaFile;
        let isReused = false;
        if (existingMediaFile) {
            // Check if an active branding asset already references this exact file
            const existingAsset = await prisma_1.prisma.organizationBrandingAsset.findFirst({
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
        }
        else {
            // 3. Upload file through canonical File Manager service
            const safeExt = path_1.default.extname(fileName) || (mimeType === "image/svg+xml" ? ".svg" : ".png");
            const cleanBase = assetName.replace(/[^a-zA-Z0-9_-]/g, "_");
            const safeFileName = `${cleanBase}-${Date.now()}${safeExt}`;
            mediaFile = await files_service_1.FilesService.uploadFile({
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
        const assetId = crypto_1.default.randomUUID();
        const asset = await prisma_1.prisma.organizationBrandingAsset.create({
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
            await audit_service_1.AuditService.log({
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
    static async deleteBrandingAsset(tenantId, assetId, actorUserId) {
        const asset = await db.organizationBrandingAsset.findFirst({
            where: { id: assetId, tenantId },
        });
        if (!asset) {
            const err = new Error("Branding asset not found.");
            err.status = 404;
            throw err;
        }
        // Reference Protection Guard: Check active signatories
        const activeSig = await prisma_1.prisma.organizationSignatory.findFirst({
            where: { tenantId, signatureAssetId: assetId, isActive: true },
        });
        if (activeSig) {
            const err = new Error(`Cannot delete "${asset.assetName}": asset is actively assigned as the digital signature for signatory "${activeSig.name}" (${activeSig.designation}).`);
            err.status = 409;
            err.code = "CERTIFICATE_ASSET_IN_USE";
            err.references = { signatories: 1, templateVersions: 0, certificates: 0, brandingAssets: 1 };
            throw err;
        }
        // Reference Protection Guard: Check active template versions
        const activeTmpl = await db.certificateTemplateVersion.findFirst({
            where: { backgroundAssetId: assetId },
            include: { template: true },
        });
        if (activeTmpl) {
            const err = new Error(`Cannot delete "${asset.assetName}": asset is used as background artwork in template "${activeTmpl.template?.name || activeTmpl.templateId}" (v${activeTmpl.versionNumber}).`);
            err.status = 409;
            err.code = "CERTIFICATE_ASSET_IN_USE";
            err.references = { signatories: 0, templateVersions: 1, certificates: 0, brandingAssets: 1 };
            throw err;
        }
        // Reference Protection Guard: Check overall certificate usage
        const usage = await certificate_folder_service_1.CertificateFolderService.checkCertificateAssetUsage(tenantId, asset.fileId || asset.id, asset.storagePath, assetId);
        if (usage.inUse) {
            const err = new Error(usage.reason);
            err.status = 409;
            err.code = "CERTIFICATE_ASSET_IN_USE";
            err.references = usage.references;
            throw err;
        }
        // Soft-deactivate branding record
        await db.organizationBrandingAsset.update({
            where: { id: assetId },
            data: { isActive: false, updatedBy: actorUserId },
        });
        // If fileId is present, check if other active branding records share this file
        if (asset.fileId) {
            const otherUses = await db.organizationBrandingAsset.count({
                where: { tenantId, fileId: asset.fileId, isActive: true, id: { not: assetId } },
            });
            if (otherUses === 0) {
                try {
                    await files_service_1.FilesService.trashItems({
                        ids: [asset.fileId],
                        tenantId,
                        userId: actorUserId || "system",
                        force: true,
                    });
                }
                catch (trashErr) {
                    console.warn("[deleteBrandingAsset] Trash file warning:", trashErr.message);
                }
            }
        }
        if (actorUserId) {
            await audit_service_1.AuditService.log({
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
    static async replaceBrandingAsset(dto) {
        // 1. Upload new asset
        const newAsset = await this.saveBrandingAsset(dto);
        // 2. If replacement saved and old asset specified, attempt safe cleanup
        if (dto.oldAssetId && dto.oldAssetId !== newAsset.id) {
            try {
                await this.deleteBrandingAsset(dto.tenantId, dto.oldAssetId, dto.actorUserId);
            }
            catch (err) {
                // If old asset cannot be deleted because of historical references, preserve it safely
                console.info(`[replaceBrandingAsset] Preserving historical reference for old asset ${dto.oldAssetId}: ${err.message}`);
            }
        }
        return newAsset;
    }
    /**
     * 2. SIGNATORIES
     */
    static async getSignatories(tenantId) {
        return prisma_1.prisma.organizationSignatory.findMany({
            where: { tenantId, isActive: true },
            include: {
                signatureAsset: true
            },
            orderBy: { createdAt: "desc" }
        });
    }
    static async createSignatory(dto) {
        const { tenantId, name, designation, department, signatureAssetId, signatoryType, effectiveFrom, effectiveTo, actorUserId } = dto;
        if (!name || !designation)
            throw new Error("Name and designation are required for signatory.");
        const signatory = await prisma_1.prisma.organizationSignatory.create({
            data: {
                tenantId,
                name,
                designation,
                department,
                signatureAssetId,
                signatoryType: signatoryType || "HR_MANAGER",
                authorizationStatus: "AUTHORIZED", // Initialized as authorized when created by admin
                effectiveFrom: effectiveFrom || new Date(),
                effectiveTo,
                isActive: true,
                createdBy: actorUserId,
                updatedBy: actorUserId
            },
            include: { signatureAsset: true }
        });
        if (actorUserId) {
            await audit_service_1.AuditService.log({
                tenantId,
                userId: actorUserId,
                action: "SIGNATORY_CREATED",
                resourceType: "OrganizationSignatory",
                resourceId: signatory.id,
                details: { name, designation, signatoryType: signatory.signatoryType }
            });
        }
        return signatory;
    }
    static async updateSignatory(tenantId, id, data) {
        const existing = await prisma_1.prisma.organizationSignatory.findFirst({ where: { id, tenantId } });
        if (!existing)
            throw new Error("Signatory not found.");
        const updated = await prisma_1.prisma.organizationSignatory.update({
            where: { id },
            data: {
                name: data.name ?? existing.name,
                designation: data.designation ?? existing.designation,
                department: data.department ?? existing.department,
                signatureAssetId: data.signatureAssetId ?? existing.signatureAssetId,
                signatoryType: data.signatoryType ?? existing.signatoryType,
                effectiveTo: data.effectiveTo ?? existing.effectiveTo,
                updatedBy: data.actorUserId
            },
            include: { signatureAsset: true }
        });
        return updated;
    }
    static async authorizeSignatory(tenantId, id, status, actorUserId) {
        const existing = await prisma_1.prisma.organizationSignatory.findFirst({ where: { id, tenantId } });
        if (!existing)
            throw new Error("Signatory not found.");
        const updated = await prisma_1.prisma.organizationSignatory.update({
            where: { id },
            data: {
                authorizationStatus: status,
                updatedBy: actorUserId
            }
        });
        if (actorUserId) {
            await audit_service_1.AuditService.log({
                tenantId,
                userId: actorUserId,
                action: "SIGNATORY_STATUS_CHANGED",
                resourceType: "OrganizationSignatory",
                resourceId: id,
                details: { previousStatus: existing.authorizationStatus, newStatus: status }
            });
        }
        return updated;
    }
    /**
     * 3. TEMPLATE LIBRARY
     */
    static async listTemplates(tenantId, options = {}) {
        const { category, search, orientation, isSystemOnly } = options;
        const where = {
            status: { not: "ARCHIVED" },
            OR: [
                { isSystem: true },
                { tenantId }
            ]
        };
        if (isSystemOnly) {
            delete where.OR;
            where.isSystem = true;
        }
        if (category && category !== "All") {
            where.category = category;
        }
        if (orientation) {
            where.orientation = orientation;
        }
        if (search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { description: { contains: search, mode: "insensitive" } }
                    ]
                }
            ];
        }
        const templates = await db.certificateTemplate.findMany({
            where,
            orderBy: [
                { isSystem: "desc" },
                { createdAt: "desc" }
            ],
            include: {
                versions: {
                    orderBy: { versionNumber: "desc" },
                    take: 1
                }
            }
        });
        return templates;
    }
    static async getTemplateById(tenantId, templateId) {
        const template = await db.certificateTemplate.findFirst({
            where: {
                id: templateId,
                OR: [
                    { isSystem: true },
                    { tenantId }
                ]
            },
            include: {
                versions: {
                    orderBy: { versionNumber: "desc" }
                }
            }
        });
        if (!template)
            throw new Error("Certificate template not found.");
        // Fetch active version
        const activeVersion = template.currentPublishedVersionId
            ? template.versions.find(v => v.id === template.currentPublishedVersionId) || template.versions[0]
            : template.versions[0];
        return { ...template, activeVersion };
    }
    static async duplicateTemplate(tenantId, templateId, actorUserId, customName) {
        const source = await this.getTemplateById(tenantId, templateId);
        const newId = crypto_1.default.randomUUID();
        const newVersionId = crypto_1.default.randomUUID();
        const activeVer = source.activeVersion;
        const duplicated = await db.certificateTemplate.create({
            data: {
                id: newId,
                tenantId,
                name: customName || `${source.name} (Copy)`,
                description: `Customized duplicate of ${source.name}`,
                category: source.category,
                tags: source.tags || [],
                templateType: source.templateType,
                pageSize: source.pageSize,
                orientation: source.orientation,
                status: "DRAFT",
                isSystem: false,
                thumbnailUrl: source.thumbnailUrl,
                currentPublishedVersionId: newVersionId,
                createdBy: actorUserId,
                updatedBy: actorUserId
            }
        });
        await db.certificateTemplateVersion.create({
            data: {
                id: newVersionId,
                templateId: newId,
                versionNumber: 1,
                designJson: activeVer?.designJson || {},
                htmlContent: activeVer?.htmlContent,
                cssContent: activeVer?.cssContent,
                placeholderSchema: activeVer?.placeholderSchema || [],
                validationStatus: "VALIDATED",
                createdBy: actorUserId
            }
        });
        if (actorUserId) {
            await audit_service_1.AuditService.log({
                tenantId,
                userId: actorUserId,
                action: "TEMPLATE_DUPLICATED",
                resourceType: "CertificateTemplate",
                resourceId: newId,
                details: { sourceTemplateId: templateId, newName: duplicated.name }
            });
        }
        return duplicated;
    }
    static async publishTemplate(tenantId, templateId, actorUserId) {
        const template = await db.certificateTemplate.findFirst({
            where: { id: templateId, tenantId }
        });
        if (!template)
            throw new Error("Template not found or cannot publish system template.");
        const latestVersion = await db.certificateTemplateVersion.findFirst({
            where: { templateId },
            orderBy: { versionNumber: "desc" }
        });
        if (!latestVersion)
            throw new Error("No version exists to publish.");
        await db.certificateTemplateVersion.update({
            where: { id: latestVersion.id },
            data: { publishedAt: new Date() }
        });
        const updated = await db.certificateTemplate.update({
            where: { id: templateId },
            data: {
                status: "PUBLISHED",
                currentPublishedVersionId: latestVersion.id,
                updatedBy: actorUserId
            }
        });
        if (actorUserId) {
            await audit_service_1.AuditService.log({
                tenantId,
                userId: actorUserId,
                action: "TEMPLATE_PUBLISHED",
                resourceType: "CertificateTemplate",
                resourceId: templateId,
                details: { versionId: latestVersion.id, versionNumber: latestVersion.versionNumber }
            });
        }
        return updated;
    }
    /**
     * 4. VISUAL DESIGNER SAVE
     */
    static async saveDesign(dto) {
        const { tenantId, templateId, designJson, actorUserId } = dto;
        const template = await db.certificateTemplate.findFirst({
            where: { id: templateId }
        });
        if (!template)
            throw new Error("Template not found.");
        // System templates must not be directly edited by tenant administrators; must duplicate first
        if (template.isSystem) {
            throw new Error("System templates are immutable. Please duplicate to create a tenant custom template first.");
        }
        if (template.tenantId !== tenantId) {
            throw new Error("Unauthorized: Template belongs to another tenant.");
        }
        // Find latest draft or create next version
        const latestVersion = await db.certificateTemplateVersion.findFirst({
            where: { templateId },
            orderBy: { versionNumber: "desc" }
        });
        let targetVersionId = latestVersion?.id;
        if (latestVersion && latestVersion.publishedAt) {
            // Create new draft version
            const nextVerNum = (latestVersion.versionNumber || 1) + 1;
            const newVer = await db.certificateTemplateVersion.create({
                data: {
                    templateId,
                    versionNumber: nextVerNum,
                    designJson,
                    validationStatus: "VALIDATED",
                    createdBy: actorUserId
                }
            });
            targetVersionId = newVer.id;
        }
        else if (latestVersion) {
            // Update existing draft version
            await db.certificateTemplateVersion.update({
                where: { id: latestVersion.id },
                data: {
                    designJson,
                    validationStatus: "VALIDATED"
                }
            });
        }
        else {
            const firstVer = await db.certificateTemplateVersion.create({
                data: {
                    templateId,
                    versionNumber: 1,
                    designJson,
                    validationStatus: "VALIDATED",
                    createdBy: actorUserId
                }
            });
            targetVersionId = firstVer.id;
        }
        await db.certificateTemplate.update({
            where: { id: templateId },
            data: { updatedBy: actorUserId }
        });
        return { success: true, versionId: targetVersionId };
    }
    /**
     * 5. HYBRID IMPORT: MODE B (HTML/CSS)
     */
    static async importHtmlCssTemplate(dto) {
        const { tenantId, name, category, orientation = "LANDSCAPE", pageSize = "A4", htmlContent, cssContent = "", actorUserId } = dto;
        if (!name || !htmlContent)
            throw new Error("Template name and HTML content are required.");
        const { sanitizedHtml, sanitizedCss } = this.sanitizeHtmlTemplate(htmlContent, cssContent);
        const templateId = crypto_1.default.randomUUID();
        const versionId = crypto_1.default.randomUUID();
        const template = await db.certificateTemplate.create({
            data: {
                id: templateId,
                tenantId,
                name,
                description: "Imported custom HTML/CSS certificate template.",
                category: category || "Corporate / Special Achievement",
                templateType: "HTML_CSS",
                pageSize,
                orientation,
                status: "PUBLISHED",
                isSystem: false,
                currentPublishedVersionId: versionId,
                createdBy: actorUserId,
                updatedBy: actorUserId
            }
        });
        await db.certificateTemplateVersion.create({
            data: {
                id: versionId,
                templateId,
                versionNumber: 1,
                designJson: { mode: "HTML_CSS", orientation, pageSize },
                htmlContent: sanitizedHtml,
                cssContent: sanitizedCss,
                validationStatus: "VALIDATED",
                publishedAt: new Date(),
                createdBy: actorUserId
            }
        });
        if (actorUserId) {
            await audit_service_1.AuditService.log({
                tenantId,
                userId: actorUserId,
                action: "TEMPLATE_IMPORTED_HTML",
                resourceType: "CertificateTemplate",
                resourceId: templateId,
                details: { name, category }
            });
        }
        return template;
    }
    /**
     * 6. HYBRID IMPORT: MODE C (BACKGROUND DESIGN OVERLAY)
     */
    static async importBackgroundTemplate(dto) {
        const { tenantId, name, category, orientation = "LANDSCAPE", pageSize = "A4", buffer, mimeType, fileName, actorUserId } = dto;
        if (!name || !buffer)
            throw new Error("Template name and background file are required.");
        // Save background asset
        const bgAsset = await this.saveBrandingAsset({
            tenantId,
            assetType: "BACKGROUND",
            assetName: `${name} Background Artwork`,
            buffer,
            mimeType,
            fileName,
            actorUserId
        });
        const isLandscape = orientation === "LANDSCAPE";
        const width = isLandscape ? 841.89 : 595.28;
        const height = isLandscape ? 595.28 : 841.89;
        const overlayDesign = {
            canvas: { width, height, unit: "pt", orientation, backgroundColor: "#FFFFFF" },
            backgroundAssetId: bgAsset.id,
            backgroundAssetPath: bgAsset.storagePath,
            elements: [
                // Background image layer
                {
                    id: "el-bg-imported",
                    type: "backgroundImage",
                    name: "Background Artwork",
                    x: 0,
                    y: 0,
                    width,
                    height,
                    assetId: bgAsset.id,
                    assetPath: bgAsset.storagePath,
                    locked: true,
                    zIndex: 1
                },
                // Dynamic Overlays
                {
                    id: "el-recip-name",
                    type: "text",
                    name: "Recipient Name Overlay",
                    x: 60,
                    y: height / 2 - 20,
                    width: width - 120,
                    height: 40,
                    text: "{{employee.name}}",
                    fontFamily: "Cinzel",
                    fontSize: 28,
                    fontWeight: "bold",
                    color: "#1E3A8A",
                    textAlign: "center",
                    zIndex: 10
                },
                {
                    id: "el-award-title",
                    type: "text",
                    name: "Award Title Overlay",
                    x: 80,
                    y: height / 2 + 30,
                    width: width - 160,
                    height: 30,
                    text: "{{award.title}}",
                    fontFamily: "Inter",
                    fontSize: 16,
                    fontWeight: "semibold",
                    color: "#D97706",
                    textAlign: "center",
                    zIndex: 11
                },
                {
                    id: "el-award-date",
                    type: "text",
                    name: "Date Overlay",
                    x: 60,
                    y: height - 100,
                    width: 200,
                    height: 20,
                    text: "Date: {{award.date}}",
                    fontFamily: "Inter",
                    fontSize: 10,
                    color: "#374151",
                    textAlign: "left",
                    zIndex: 12
                },
                {
                    id: "el-qr-code",
                    type: "qrcode",
                    name: "QR Code Overlay",
                    x: width - 90,
                    y: height - 90,
                    width: 50,
                    height: 50,
                    placeholder: "{{certificate.verificationUrl}}",
                    zIndex: 15
                }
            ]
        };
        const templateId = crypto_1.default.randomUUID();
        const versionId = crypto_1.default.randomUUID();
        const template = await db.certificateTemplate.create({
            data: {
                id: templateId,
                tenantId,
                name,
                description: "Background artwork certificate with dynamic field overlays.",
                category: category || "Corporate / Special Achievement",
                templateType: "BACKGROUND_OVERLAY",
                pageSize,
                orientation,
                status: "PUBLISHED",
                isSystem: false,
                thumbnailUrl: bgAsset.storagePath,
                currentPublishedVersionId: versionId,
                createdBy: actorUserId,
                updatedBy: actorUserId
            }
        });
        await db.certificateTemplateVersion.create({
            data: {
                id: versionId,
                templateId,
                versionNumber: 1,
                designJson: overlayDesign,
                backgroundAssetId: bgAsset.id,
                validationStatus: "VALIDATED",
                publishedAt: new Date(),
                createdBy: actorUserId
            }
        });
        if (actorUserId) {
            await audit_service_1.AuditService.log({
                tenantId,
                userId: actorUserId,
                action: "TEMPLATE_IMPORTED_BACKGROUND",
                resourceType: "CertificateTemplate",
                resourceId: templateId,
                details: { name, backgroundAssetId: bgAsset.id }
            });
        }
        return template;
    }
    /**
     * 7. AWARD TYPE ASSIGNMENT
     */
    static async getAssignment(tenantId, awardTypeId) {
        return db.certificateTemplateAssignment.findUnique({
            where: {
                tenantId_awardTypeId: { tenantId, awardTypeId }
            },
            include: {
                template: true,
                templateVersion: true
            }
        });
    }
    static async setAssignment(tenantId, awardTypeId, templateId, signatoryConfig, isDefault = false) {
        const template = await db.certificateTemplate.findFirst({
            where: {
                id: templateId,
                OR: [{ isSystem: true }, { tenantId }]
            }
        });
        if (!template)
            throw new Error("Template not found.");
        const assignment = await db.certificateTemplateAssignment.upsert({
            where: {
                tenantId_awardTypeId: { tenantId, awardTypeId }
            },
            create: {
                tenantId,
                awardTypeId,
                templateId,
                templateVersionId: template.currentPublishedVersionId,
                signatoryConfiguration: signatoryConfig || {},
                isDefault
            },
            update: {
                templateId,
                templateVersionId: template.currentPublishedVersionId,
                signatoryConfiguration: signatoryConfig || {},
                isDefault
            },
            include: {
                template: true
            }
        });
        return assignment;
    }
    /**
     * 8. PLACEHOLDER REPLACEMENT & VECTOR PDF COMPILATION
     */
    static replacePlaceholders(text, context) {
        let result = text;
        for (const [key, value] of Object.entries(context)) {
            result = result.split(key).join(value || "");
        }
        return result;
    }
    /**
     * Compiles design JSON elements into an authoritative PDFBuffer.
     */
    static async renderTemplateToPdf(designJson, context) {
        return new Promise(async (resolve, reject) => {
            try {
                const canvas = designJson.canvas || { width: 841.89, height: 595.28, orientation: "LANDSCAPE" };
                const isLandscape = canvas.orientation === "LANDSCAPE";
                const width = canvas.width || (isLandscape ? 841.89 : 595.28);
                const height = canvas.height || (isLandscape ? 595.28 : 841.89);
                const doc = new pdfkit_1.default({
                    size: [width, height],
                    margins: { top: 0, bottom: 0, left: 0, right: 0 },
                    info: {
                        Title: `Certificate - ${context["{{certificate.number}}"] || "MasterHRMS"}`,
                        Author: "MasterHRMS Enterprise Certificate Studio",
                        Subject: context["{{award.title}}"] || "Certificate of Recognition"
                    }
                });
                const buffers = [];
                doc.on("data", (chunk) => buffers.push(chunk));
                doc.on("end", () => resolve(Buffer.concat(buffers)));
                doc.on("error", (err) => reject(err));
                // Background Fill
                if (canvas.backgroundColor) {
                    doc.rect(0, 0, width, height).fill(canvas.backgroundColor);
                }
                const elements = (designJson.elements || []);
                for (const el of elements) {
                    try {
                        if (el.hidden)
                            continue;
                        doc.save();
                        // Opacity
                        if (el.opacity !== undefined && el.opacity < 1 && el.opacity >= 0) {
                            doc.opacity(el.opacity);
                        }
                        // Rotation
                        if (el.rotation) {
                            const cx = el.x + (el.width || 0) / 2;
                            const cy = el.y + (el.height || 0) / 2;
                            doc.rotate(el.rotation, { origin: [cx, cy] });
                        }
                        if (el.type === "shape") {
                            if (el.shapeType === "line" || (el.height <= 3 && !el.shapeType)) {
                                const lineY = el.y + (el.height || 2) / 2;
                                doc.moveTo(el.x, lineY).lineTo(el.x + el.width, lineY);
                                const strokeColor = el.stroke || el.fill || canvas.primaryColor || "#1E3A8A";
                                doc.lineWidth(el.strokeWidth || el.height || 2).strokeColor(strokeColor);
                                if (el.lineStyle === "dashed")
                                    doc.dash(4, { space: 2 });
                                else if (el.lineStyle === "dotted")
                                    doc.dash(2, { space: 2 });
                                doc.stroke();
                                doc.undash();
                            }
                            else if (el.shapeType === "circle") {
                                const cx = el.x + (el.width || 0) / 2;
                                const cy = el.y + (el.height || 0) / 2;
                                const r = Math.min(el.width || 0, el.height || 0) / 2;
                                doc.circle(cx, cy, r);
                                if (el.fill && el.fill !== "transparent") {
                                    doc.fillColor(el.fill);
                                    if (el.stroke && el.strokeWidth) {
                                        doc.lineWidth(el.strokeWidth).strokeColor(el.stroke);
                                        if (el.lineStyle === "dashed")
                                            doc.dash(4, { space: 2 });
                                        else if (el.lineStyle === "dotted")
                                            doc.dash(2, { space: 2 });
                                        doc.fillAndStroke();
                                        doc.undash();
                                    }
                                    else {
                                        doc.fill();
                                    }
                                }
                                else if (el.stroke) {
                                    doc.lineWidth(el.strokeWidth || 1).strokeColor(el.stroke);
                                    if (el.lineStyle === "dashed")
                                        doc.dash(4, { space: 2 });
                                    else if (el.lineStyle === "dotted")
                                        doc.dash(2, { space: 2 });
                                    doc.stroke();
                                    doc.undash();
                                }
                            }
                            else {
                                if (el.borderRadius && el.borderRadius > 0) {
                                    doc.roundedRect(el.x, el.y, el.width, el.height, el.borderRadius);
                                }
                                else {
                                    doc.rect(el.x, el.y, el.width, el.height);
                                }
                                if (el.fill && el.fill !== "transparent") {
                                    doc.fillColor(el.fill);
                                    if (el.stroke && el.strokeWidth) {
                                        doc.lineWidth(el.strokeWidth).strokeColor(el.stroke);
                                        if (el.lineStyle === "dashed")
                                            doc.dash(4, { space: 2 });
                                        else if (el.lineStyle === "dotted")
                                            doc.dash(2, { space: 2 });
                                        doc.fillAndStroke();
                                        doc.undash();
                                    }
                                    else {
                                        doc.fill();
                                    }
                                }
                                else if (el.stroke) {
                                    doc.lineWidth(el.strokeWidth || 1).strokeColor(el.stroke);
                                    if (el.lineStyle === "dashed")
                                        doc.dash(4, { space: 2 });
                                    else if (el.lineStyle === "dotted")
                                        doc.dash(2, { space: 2 });
                                    doc.stroke();
                                    doc.undash();
                                }
                            }
                        }
                        else if (el.type === "text") {
                            const rawText = el.text || "";
                            let resolvedText = CertificateStudioService.replacePlaceholders(rawText, context);
                            if (el.textTransform === "uppercase")
                                resolvedText = resolvedText.toUpperCase();
                            else if (el.textTransform === "lowercase")
                                resolvedText = resolvedText.toLowerCase();
                            else if (el.textTransform === "capitalize")
                                resolvedText = resolvedText.replace(/\b\w/g, (c) => c.toUpperCase());
                            const fontSize = el.fontSize || 12;
                            doc.fontSize(fontSize);
                            if (el.color)
                                doc.fillColor(el.color);
                            // Use standard built-in PDFKit fonts mapping
                            const fontLower = (el.fontFamily || "").toLowerCase();
                            const isSerif = fontLower.includes("cinzel") || fontLower.includes("playfair") || fontLower.includes("georgia") || fontLower.includes("times") || fontLower.includes("baskerville") || fontLower.includes("garamond") || fontLower.includes("merriweather");
                            const isMonospace = fontLower.includes("mono") || fontLower.includes("code") || fontLower.includes("courier");
                            const isBold = el.fontWeight === "bold" || el.fontWeight === "700" || el.fontWeight === "800" || el.fontSize > 22;
                            const isItalic = el.fontStyle === "italic";
                            let fontName = "Helvetica";
                            if (isMonospace) {
                                fontName = isBold ? (isItalic ? "Courier-BoldOblique" : "Courier-Bold") : (isItalic ? "Courier-Oblique" : "Courier");
                            }
                            else if (isSerif) {
                                fontName = isBold ? (isItalic ? "Times-BoldItalic" : "Times-Bold") : (isItalic ? "Times-Italic" : "Times-Roman");
                            }
                            else {
                                fontName = isBold ? (isItalic ? "Helvetica-BoldOblique" : "Helvetica-Bold") : (isItalic ? "Helvetica-Oblique" : "Helvetica");
                            }
                            doc.font(fontName);
                            doc.text(resolvedText, el.x, el.y, {
                                width: el.width,
                                align: el.textAlign || "left",
                                lineGap: el.lineHeight ? el.lineHeight * 2 : 2,
                                characterSpacing: el.letterSpacing || 0,
                                underline: !!el.underline
                            });
                        }
                        else if (el.type === "qrcode" || el.type === "qr" || el.id?.toLowerCase().includes("qr")) {
                            const qrText = context["{{certificate.verificationUrl}}"] || el.placeholder || (0, certificate_verification_resolver_1.resolveCertificateVerificationUrl)("VERIFY-CODE");
                            const renderWidth = Math.max(256, Math.round((el.width || 45) * 4));
                            const qrPngBuffer = await qrcode_1.default.toBuffer(qrText, {
                                width: renderWidth,
                                margin: 1,
                                errorCorrectionLevel: "M",
                                color: { dark: "#0F172A", light: "#FFFFFF" }
                            });
                            doc.image(qrPngBuffer, el.x, el.y, { width: el.width, height: el.height });
                        }
                        else if (el.type === "seal" || el.isSeal || el.id?.toLowerCase().includes("seal") || (el.name && el.name.toLowerCase().includes("seal"))) {
                            const sealUrl = (el.url && !el.url.includes("{{") ? el.url : null) || context["{{organization.seal}}"] || context.officialSealUrl;
                            let sealBuffer = null;
                            if (sealUrl) {
                                sealBuffer = await CertificateStudioService.resolveAssetBuffer(sealUrl);
                            }
                            if (sealBuffer) {
                                doc.image(sealBuffer, el.x, el.y, { fit: [el.width, el.height], align: "center" });
                            }
                            else {
                                const sealColor = el.fill || canvas.secondaryColor || "#D97706";
                                const cx = el.x + el.width / 2;
                                const cy = el.y + el.height / 2;
                                const r = el.width / 2;
                                doc.circle(cx, cy, r).lineWidth(2).strokeColor(sealColor).stroke();
                                doc.circle(cx, cy, r - 5).lineWidth(1).strokeColor(sealColor).stroke();
                                doc.fontSize(7).font("Helvetica-Bold").fillColor(sealColor).text("OFFICIAL SEAL", el.x, cy - 4, {
                                    width: el.width,
                                    align: "center"
                                });
                            }
                        }
                        else if (el.type === "signature" || el.id?.toLowerCase().includes("sig") || (el.name && el.name.toLowerCase().includes("signature"))) {
                            const lineY = el.y + el.height - 18;
                            const effectiveSigType = el.signatoryType || (el.id?.toLowerCase().includes("hr") || el.name?.toLowerCase().includes("hr") ? "HR" : (el.id?.toLowerCase().includes("ceo") || el.name?.toLowerCase().includes("ceo")) ? "CEO" : (el.id?.toLowerCase().includes("dir") || el.name?.toLowerCase().includes("dir")) ? "DIRECTOR" : "HR");
                            let sigUrl = el.signatureUrl || (el.url && !el.url.includes("{{") ? el.url : null);
                            if (!sigUrl) {
                                if (effectiveSigType.includes("HR"))
                                    sigUrl = context["{{signatures.hr.image}}"] || context.hrSignatureUrl;
                                else if (effectiveSigType.includes("DIRECTOR"))
                                    sigUrl = context["{{signatures.director.image}}"] || context.directorSignatureUrl;
                                else if (effectiveSigType.includes("CEO") || effectiveSigType.includes("MD"))
                                    sigUrl = context["{{signatures.ceo.image}}"] || context.ceoSignatureUrl;
                                if (!sigUrl)
                                    sigUrl = context.hrSignatureUrl || context.ceoSignatureUrl;
                            }
                            let sigBuffer = null;
                            if (sigUrl) {
                                sigBuffer = await CertificateStudioService.resolveAssetBuffer(sigUrl);
                            }
                            if (sigBuffer) {
                                doc.image(sigBuffer, el.x, el.y, { fit: [el.width, Math.max(10, el.height - 20)], align: "center" });
                            }
                            doc.moveTo(el.x, lineY).lineTo(el.x + el.width, lineY).lineWidth(1).strokeColor(canvas.primaryColor || "#374151").stroke();
                            const sigName = el.signatoryName || (el.placeholder ? context[el.placeholder] : "") || (effectiveSigType.includes("HR") ? (context["{{signatures.hr.name}}"] || "Sarah Jenkins") : (context["{{signatures.ceo.name}}"] || "Marcus Sterling")) || "Authorized Signatory";
                            doc.fontSize(8.5).font("Helvetica-Bold").fillColor(canvas.primaryColor || "#374151").text(sigName, el.x, lineY + 3, {
                                width: el.width,
                                align: "center"
                            });
                            const sigDesig = el.signatoryDesignation || (effectiveSigType.includes("HR") ? (context["{{signatures.hr.title}}"] || "Director of People & Culture") : (context["{{signatures.ceo.title}}"] || "Chief Executive Officer"));
                            if (sigDesig) {
                                doc.fontSize(7).font("Helvetica").fillColor("#64748B").text(sigDesig, el.x, lineY + 12, {
                                    width: el.width,
                                    align: "center"
                                });
                            }
                        }
                        else if (el.type === "logo" || el.type === "image" || el.isLogo || el.id?.toLowerCase().includes("logo") || el.placeholder === "{{organization.logo}}") {
                            let resolvedUrl = (el.url && !el.url.includes("{{")) ? el.url : (context["{{organization.logo}}"] || context.primaryLogoUrl || "/logo.webp");
                            let imageBuffer = await CertificateStudioService.resolveAssetBuffer(resolvedUrl);
                            if (!imageBuffer) {
                                const defaultLogo = path_1.default.resolve(process.cwd(), "public", "logo.webp");
                                if (fs_1.default.existsSync(defaultLogo)) {
                                    imageBuffer = await (0, sharp_1.default)(fs_1.default.readFileSync(defaultLogo)).png().toBuffer();
                                }
                            }
                            if (imageBuffer) {
                                doc.image(imageBuffer, el.x, el.y, { fit: [el.width, el.height], align: el.align || "center" });
                            }
                        }
                        doc.restore();
                    }
                    catch (itemErr) {
                        console.error("Error rendering canvas element:", itemErr);
                    }
                }
                doc.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
    /**
     * Streams a branding asset binary with verified tenant isolation, proper MIME type, and inline caching.
     */
    static async streamBrandingAsset(tenantId, assetId, res) {
        const asset = await db.organizationBrandingAsset.findFirst({
            where: { id: assetId, tenantId }
        });
        if (!asset) {
            return res.status(404).json({ error: "Branding asset not found." });
        }
        const uploadsRoot = (0, media_service_1.getUploadsRoot)();
        const relativePath = asset.storagePath;
        const absPath = path_1.default.resolve(uploadsRoot, relativePath);
        // Guard path traversal
        if (!absPath.startsWith(path_1.default.resolve(uploadsRoot))) {
            return res.status(400).json({ error: "Invalid storage path: traversal detected." });
        }
        if (!fs_1.default.existsSync(absPath)) {
            return res.status(404).json({ error: "Physical branding file not found on storage disk." });
        }
        const stat = fs_1.default.statSync(absPath);
        const ext = path_1.default.extname(absPath).toLowerCase();
        const mimeMap = {
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
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(asset.assetName)}"`);
        res.setHeader("Cache-Control", "private, max-age=3600");
        const stream = fs_1.default.createReadStream(absPath);
        return stream.pipe(res);
    }
    /**
     * Streams an authorized signatory signature binary with verified tenant isolation.
     */
    static async streamSignatorySignature(tenantId, signatoryId, res) {
        const signatory = await prisma_1.prisma.organizationSignatory.findFirst({
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
    static async reconcileLegacyAssets(tenantId) {
        const where = { isActive: true };
        if (tenantId)
            where.tenantId = tenantId;
        const assets = await prisma_1.prisma.organizationBrandingAsset.findMany({
            where: { ...where, fileId: null },
            take: 200
        });
        const uploadsRoot = (0, media_service_1.getUploadsRoot)();
        let reconciledCount = 0;
        for (const a of assets) {
            try {
                const absPath = path_1.default.resolve(uploadsRoot, a.storagePath);
                if (!fs_1.default.existsSync(absPath))
                    continue;
                const folders = await certificate_folder_service_1.CertificateFolderService.ensureCertificatesFolders(a.tenantId, "system");
                let targetFolder = folders.brandingFolder;
                if (a.assetType === "SIGNATURE")
                    targetFolder = folders.signaturesFolder;
                else if (a.assetType === "BACKGROUND")
                    targetFolder = folders.templatesFolder;
                const fileBuffer = fs_1.default.readFileSync(absPath);
                const checksumSha = crypto_1.default.createHash("sha256").update(fileBuffer).digest("hex");
                let mediaFile = await prisma_1.prisma.mediaFile.findFirst({
                    where: { tenantId: a.tenantId, parentId: targetFolder.id, checksumSha, status: "ACTIVE" }
                });
                if (!mediaFile) {
                    mediaFile = await files_service_1.FilesService.uploadFile({
                        buffer: fileBuffer,
                        originalFilename: path_1.default.basename(a.storagePath),
                        tenantId: a.tenantId,
                        userId: a.createdBy || "system",
                        parentId: targetFolder.id,
                        category: targetFolder.nameKey === "signatures" ? "Signatures" : "Branding",
                        tags: ["certificates", "legacy-reconciled"]
                    });
                }
                await prisma_1.prisma.organizationBrandingAsset.update({
                    where: { id: a.id },
                    data: { fileId: mediaFile.id, storagePath: mediaFile.filePath }
                });
                reconciledCount++;
            }
            catch (err) {
                console.warn(`[reconcileLegacyAssets] Warning for asset ${a.id}:`, err?.message);
            }
        }
        return { reconciledCount };
    }
}
exports.CertificateStudioService = CertificateStudioService;
