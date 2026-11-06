"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificateStudioRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const certificate_studio_service_1 = require("../services/certificate-studio.service");
const certificate_folder_service_1 = require("../services/files/certificate-folder.service");
const awards_routes_1 = require("./awards.routes");
exports.certificateStudioRouter = (0, express_1.Router)();
// Multer memory storage for validating magic bytes and processing buffer
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
// Guard: All endpoints require authenticated user with valid tenant context
exports.certificateStudioRouter.use(auth_1.requireAuth);
exports.certificateStudioRouter.use(tenant_context_middleware_1.resolveTenantContext);
/**
 * Helper to ensure user is HR authorized
 */
function assertHR(req, res) {
    if (!(0, awards_routes_1.isHRAwardAuthorized)(req)) {
        res.status(403).json({ error: "Access denied: HR Manager or Administrator authorization required." });
        return false;
    }
    return true;
}
// ============================================================================
// 1. PLACEHOLDERS REGISTRY
// ============================================================================
exports.certificateStudioRouter.get("/placeholders", (req, res) => {
    return res.json({ placeholders: certificate_studio_service_1.PLACEHOLDER_REGISTRY });
});
// ============================================================================
// 2. BRANDING ASSETS
// ============================================================================
exports.certificateStudioRouter.get("/branding", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const assets = await certificate_studio_service_1.CertificateStudioService.getBrandingAssets(tenantId);
        return res.json({ assets });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch branding assets." });
    }
});
exports.certificateStudioRouter.post("/branding", upload.single("file"), async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        if (!req.file) {
            return res.status(400).json({ error: "No asset file provided." });
        }
        const { assetType, assetName, metadata } = req.body;
        if (!assetType || !assetName) {
            return res.status(400).json({ error: "assetType and assetName are required." });
        }
        let parsedMeta = {};
        if (metadata) {
            try {
                parsedMeta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
            }
            catch { }
        }
        const asset = await certificate_studio_service_1.CertificateStudioService.saveBrandingAsset({
            tenantId,
            assetType,
            assetName,
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
            metadata: parsedMeta,
            actorUserId: req.user?.userId
        });
        return res.status(201).json({ asset });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to save branding asset." });
    }
});
// Preview branding asset binary with inline disposition and proper MIME type
exports.certificateStudioRouter.get("/branding/:id/preview", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        return await certificate_studio_service_1.CertificateStudioService.streamBrandingAsset(tenantId, req.params.id, res);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to stream branding asset preview." });
    }
});
// Replace existing branding asset
exports.certificateStudioRouter.post("/branding/replace", upload.single("file"), async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        if (!req.file)
            return res.status(400).json({ error: "No replacement asset file provided." });
        const { oldAssetId, assetType, assetName, metadata } = req.body;
        if (!oldAssetId || !assetType || !assetName) {
            return res.status(400).json({ error: "oldAssetId, assetType, and assetName are required." });
        }
        let parsedMeta = {};
        if (metadata) {
            try {
                parsedMeta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
            }
            catch { }
        }
        const newAsset = await certificate_studio_service_1.CertificateStudioService.replaceBrandingAsset({
            tenantId,
            oldAssetId,
            assetType,
            assetName,
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
            metadata: parsedMeta,
            actorUserId: req.user?.userId
        });
        return res.status(201).json({ asset: newAsset });
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Failed to replace branding asset." });
    }
});
// Retrieve or ensure Certificates folder hierarchy
exports.certificateStudioRouter.get("/folders", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const folders = await certificate_folder_service_1.CertificateFolderService.ensureCertificatesFolders(tenantId, req.user?.userId);
        return res.json({ folders });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve certificates folders." });
    }
});
exports.certificateStudioRouter.delete("/branding/:id", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        await certificate_studio_service_1.CertificateStudioService.deleteBrandingAsset(tenantId, req.params.id, req.user?.userId);
        return res.json({ success: true, message: "Asset deactivated successfully." });
    }
    catch (err) {
        const status = err.status || (err.code === "CERTIFICATE_ASSET_IN_USE" ? 409 : 400);
        return res.status(status).json({
            error: err.message || "Failed to deactivate asset.",
            code: err.code || "DELETION_FAILED",
            references: err.references
        });
    }
});
// ============================================================================
// 3. SIGNATORIES
// ============================================================================
// Preview signatory signature binary with verified tenant isolation
exports.certificateStudioRouter.get("/signatories/:id/signature-preview", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        return await certificate_studio_service_1.CertificateStudioService.streamSignatorySignature(tenantId, req.params.id, res);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to stream signature preview." });
    }
});
exports.certificateStudioRouter.get("/signatories", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const signatories = await certificate_studio_service_1.CertificateStudioService.getSignatories(tenantId);
        return res.json({ signatories });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch signatories." });
    }
});
exports.certificateStudioRouter.post("/signatories", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { name, designation, department, signatureAssetId, signatoryType, effectiveFrom, effectiveTo } = req.body;
        const signatory = await certificate_studio_service_1.CertificateStudioService.createSignatory({
            tenantId,
            name,
            designation,
            department,
            signatureAssetId,
            signatoryType,
            effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
            effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
            actorUserId: req.user?.userId
        });
        return res.status(201).json({ signatory });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to create signatory." });
    }
});
exports.certificateStudioRouter.put("/signatories/:id", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const updated = await certificate_studio_service_1.CertificateStudioService.updateSignatory(tenantId, req.params.id, {
            ...req.body,
            actorUserId: req.user?.userId
        });
        return res.json({ signatory: updated });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to update signatory." });
    }
});
exports.certificateStudioRouter.post("/signatories/:id/authorize", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { status } = req.body;
        if (!["AUTHORIZED", "PENDING", "REVOKED"].includes(status)) {
            return res.status(400).json({ error: "Invalid authorization status. Must be AUTHORIZED, PENDING, or REVOKED." });
        }
        const updated = await certificate_studio_service_1.CertificateStudioService.authorizeSignatory(tenantId, req.params.id, status, req.user?.userId);
        return res.json({ signatory: updated });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to change signatory status." });
    }
});
// ============================================================================
// 4. TEMPLATE LIBRARY
// ============================================================================
exports.certificateStudioRouter.get("/templates", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { category, search, orientation, isSystemOnly } = req.query;
        const templates = await certificate_studio_service_1.CertificateStudioService.listTemplates(tenantId, {
            category: category,
            search: search,
            orientation: orientation,
            isSystemOnly: isSystemOnly === "true"
        });
        return res.json({
            templates,
            count: templates.length
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list certificate templates." });
    }
});
exports.certificateStudioRouter.get("/templates/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const template = await certificate_studio_service_1.CertificateStudioService.getTemplateById(tenantId, req.params.id);
        return res.json({ template });
    }
    catch (err) {
        return res.status(404).json({ error: err.message || "Template not found." });
    }
});
exports.certificateStudioRouter.post("/templates/:id/duplicate", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { customName } = req.body;
        const duplicated = await certificate_studio_service_1.CertificateStudioService.duplicateTemplate(tenantId, req.params.id, req.user?.userId, customName);
        return res.status(201).json({ template: duplicated });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to duplicate template." });
    }
});
exports.certificateStudioRouter.post("/templates/:id/publish", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const published = await certificate_studio_service_1.CertificateStudioService.publishTemplate(tenantId, req.params.id, req.user?.userId);
        return res.json({ template: published, message: "Template published successfully." });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to publish template." });
    }
});
// ============================================================================
// 5. VISUAL DESIGNER SAVE & PREVIEW
// ============================================================================
exports.certificateStudioRouter.post("/templates/:id/save-design", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { designJson } = req.body;
        if (!designJson)
            return res.status(400).json({ error: "designJson payload required." });
        const result = await certificate_studio_service_1.CertificateStudioService.saveDesign({
            tenantId,
            templateId: req.params.id,
            designJson,
            actorUserId: req.user?.userId
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to save design." });
    }
});
exports.certificateStudioRouter.post("/templates/preview-pdf", async (req, res) => {
    try {
        const { designJson, sampleData } = req.body;
        if (!designJson)
            return res.status(400).json({ error: "designJson required." });
        const contextMap = {
            "{{employee.name}}": sampleData?.name || "Dr. Alex Vance",
            "{{employee.employeeCode}}": sampleData?.code || "EMP-2026-9901",
            "{{employee.designation}}": sampleData?.designation || "Principal Systems Architect",
            "{{employee.department}}": sampleData?.department || "Core Engineering & Cloud Infrastructure",
            "{{award.title}}": sampleData?.awardTitle || "Executive Leadership Distinction 2026",
            "{{award.description}}": sampleData?.awardDescription || "For pioneering enterprise-grade architectures and driving exemplary excellence across global organizations.",
            "{{award.date}}": sampleData?.date || new Date().toISOString().split("T")[0],
            "{{award.category}}": sampleData?.category || "Leadership & Performance",
            "{{organization.name}}": sampleData?.orgName || "MASTERHRMS Global Enterprise",
            "{{certificate.number}}": "PREVIEW-2026-X89A",
            "{{certificate.verificationCode}}": "VERIFY-PREVIEW-CODE-A1B2C3D4",
            "{{certificate.verificationUrl}}": "https://masterhrms.io/verify-certificate?code=PREVIEW"
        };
        const pdfBuffer = await certificate_studio_service_1.CertificateStudioService.renderTemplateToPdf(designJson, contextMap);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'inline; filename="preview-certificate.pdf"');
        res.setHeader("Content-Length", pdfBuffer.length);
        return res.send(pdfBuffer);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate preview PDF." });
    }
});
// ============================================================================
// 6. HYBRID IMPORT (HTML & BACKGROUND)
// ============================================================================
exports.certificateStudioRouter.post("/templates/import/html", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { name, category, orientation, pageSize, htmlContent, cssContent } = req.body;
        const template = await certificate_studio_service_1.CertificateStudioService.importHtmlCssTemplate({
            tenantId,
            name,
            category,
            orientation,
            pageSize,
            htmlContent,
            cssContent,
            actorUserId: req.user?.userId
        });
        return res.status(201).json({ template });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to import HTML template." });
    }
});
exports.certificateStudioRouter.post("/templates/import/background", upload.single("file"), async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        if (!req.file)
            return res.status(400).json({ error: "Background artwork file required." });
        const { name, category, orientation, pageSize } = req.body;
        const template = await certificate_studio_service_1.CertificateStudioService.importBackgroundTemplate({
            tenantId,
            name,
            category,
            orientation,
            pageSize,
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
            actorUserId: req.user?.userId
        });
        return res.status(201).json({ template });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to import background template." });
    }
});
// ============================================================================
// 7. AWARD TYPE TEMPLATE ASSIGNMENT
// ============================================================================
exports.certificateStudioRouter.get("/assignments/:awardTypeId", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const assignment = await certificate_studio_service_1.CertificateStudioService.getAssignment(tenantId, req.params.awardTypeId);
        return res.json({ assignment });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to get assignment." });
    }
});
exports.certificateStudioRouter.post("/assignments", async (req, res) => {
    try {
        if (!assertHR(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { awardTypeId, templateId, signatoryConfiguration, isDefault } = req.body;
        if (!awardTypeId || !templateId) {
            return res.status(400).json({ error: "awardTypeId and templateId are required." });
        }
        const assignment = await certificate_studio_service_1.CertificateStudioService.setAssignment(tenantId, awardTypeId, templateId, signatoryConfiguration, isDefault);
        return res.json({ assignment, message: "Template successfully assigned to award type." });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to save template assignment." });
    }
});
