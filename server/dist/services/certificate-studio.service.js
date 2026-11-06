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
    { key: "{{certificate.verificationUrl}}", name: "Verification Public URL", module: "Certificate", sample: "https://masterhrms.io/verify-certificate?code=VERIFY-9C81B27D8310E476A841", required: true },
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
        const asset = await prisma_1.prisma.organizationBrandingAsset.findFirst({
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
        await prisma_1.prisma.organizationBrandingAsset.update({
            where: { id: assetId },
            data: { isActive: false, updatedBy: actorUserId },
        });
        // If fileId is present, check if other active branding records share this file
        if (asset.fileId) {
            const otherUses = await prisma_1.prisma.organizationBrandingAsset.count({
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
                        if (el.type === "shape" && el.shapeType === "rectangle") {
                            doc.rect(el.x, el.y, el.width, el.height);
                            if (el.stroke) {
                                doc.lineWidth(el.strokeWidth || 1).strokeColor(el.stroke).stroke();
                            }
                            if (el.fill && el.fill !== "transparent") {
                                doc.fillColor(el.fill).fill();
                            }
                        }
                        else if (el.type === "text") {
                            const rawText = el.text || "";
                            const resolvedText = CertificateStudioService.replacePlaceholders(rawText, context);
                            const fontSize = el.fontSize || 12;
                            doc.fontSize(fontSize);
                            if (el.color)
                                doc.fillColor(el.color);
                            // Use standard built-in PDFKit fonts mapping
                            const isSerif = el.fontFamily?.toLowerCase().includes("cinzel") || el.fontFamily?.toLowerCase().includes("playfair") || el.fontFamily?.toLowerCase().includes("georgia");
                            const isBold = el.fontWeight === "bold" || el.fontSize > 20;
                            let fontName = "Helvetica";
                            if (isSerif) {
                                fontName = isBold ? "Times-Bold" : "Times-Roman";
                            }
                            else {
                                fontName = isBold ? "Helvetica-Bold" : "Helvetica";
                            }
                            doc.font(fontName);
                            doc.text(resolvedText, el.x, el.y, {
                                width: el.width,
                                align: el.textAlign || "left",
                                lineGap: el.lineHeight ? el.lineHeight * 2 : 2,
                                underline: !!el.underline
                            });
                        }
                        else if (el.type === "qrcode") {
                            const qrText = context["{{certificate.verificationUrl}}"] || "https://masterhrms.io/verify";
                            const qrPngBuffer = await qrcode_1.default.toBuffer(qrText, {
                                width: el.width,
                                margin: 1,
                                color: { dark: "#000000", light: "#FFFFFF" }
                            });
                            doc.image(qrPngBuffer, el.x, el.y, { width: el.width, height: el.height });
                        }
                        else if (el.type === "seal") {
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
                        else if (el.type === "signature") {
                            const lineY = el.y + el.height - 18;
                            doc.moveTo(el.x, lineY).lineTo(el.x + el.width, lineY).lineWidth(1).strokeColor(canvas.primaryColor || "#374151").stroke();
                            doc.fontSize(8.5).font("Helvetica").fillColor(canvas.primaryColor || "#374151").text(el.signatoryName || "Authorized Signatory", el.x, lineY + 3, {
                                width: el.width,
                                align: "center"
                            });
                        }
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
        const asset = await prisma_1.prisma.organizationBrandingAsset.findFirst({
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
