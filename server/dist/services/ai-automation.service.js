"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAutomationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const settings_service_1 = require("./settings/settings.service");
const audit_service_1 = require("./audit.service");
const outbox_service_1 = require("./outbox.service");
// Allowed MIME types and size limit for document uploads
const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/tiff"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
// Financial threshold above which human review is mandatory
const FINANCIAL_REVIEW_THRESHOLD = 100000; // 1 Lakh INR
const MIN_CONFIDENCE_THRESHOLD = 0.85;
// In-memory tenant OCR jobs store
const ocrJobsStore = new Map();
class AiAutomationService {
    /**
     * Validate file size and mime type
     */
    static validateDocument(file) {
        if (!file)
            throw new Error("No document file provided.");
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`Document exceeds maximum size of 10MB (actual: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
            throw new Error(`Unsupported document MIME type: ${file.mimetype}. Allowed: PDF, PNG, JPEG, TIFF.`);
        }
        return true;
    }
    /**
     * Get tenant AI service configuration (masked secrets)
     */
    static async getTenantConfig(tenantId) {
        const key = "ai.service.config";
        const config = await settings_service_1.SettingsService.get("TENANT", tenantId, key, { decryptSecrets: true });
        if (!config) {
            return {
                configured: false,
                provider: "mock-sandbox",
                model: "mock-engine-v1",
                usageCreditsRemaining: 1000,
                status: "not_configured",
            };
        }
        const masked = { ...config };
        if (masked.apiKey)
            masked.apiKey = "••••••••••••••••";
        return {
            configured: true,
            status: config._status || "connected",
            ...masked,
        };
    }
    /**
     * Save tenant AI configuration with AES-256-GCM encryption
     */
    static async saveTenantConfig(tenantId, data, actorId) {
        const key = "ai.service.config";
        const existing = await settings_service_1.SettingsService.get("TENANT", tenantId, key, { decryptSecrets: true });
        const toSave = {
            provider: data.provider || "mock-sandbox",
            model: data.model || "mock-engine-v1",
            apiKey: data.apiKey && data.apiKey !== "••••••••••••••••" ? data.apiKey : existing?.apiKey,
            usageCreditsRemaining: existing?.usageCreditsRemaining ?? 1000,
            _status: "connected",
            _updatedAt: new Date().toISOString(),
        };
        await settings_service_1.SettingsService.set("TENANT", tenantId, key, toSave, actorId);
        await audit_service_1.AuditService.log({
            tenantId,
            userId: actorId || "system",
            action: "AI_CONFIG_SAVED",
            entityType: "AiService",
            entityId: toSave.provider,
            changes: { provider: toSave.provider, model: toSave.model },
        });
        return {
            success: true,
            message: "AI configuration saved successfully.",
            status: "connected",
        };
    }
    /**
     * Process document OCR with confidence scoring, human review flagging, and local fixtures
     */
    static async processDocumentOcr(params) {
        const { tenantId, fileName, fileSizeBytes, mimeType, actorId, overrideConfidence, overrideTotal } = params;
        // 1. Validation
        this.validateDocument({ originalname: fileName, size: fileSizeBytes, mimetype: mimeType });
        // 2. Check credits
        const config = await this.getTenantConfig(tenantId);
        if ((config.usageCreditsRemaining ?? 1000) <= 0) {
            throw new Error("AI usage credits exhausted. Please replenish credits or contact administrator.");
        }
        const jobId = `ocr_${Date.now()}_${crypto_1.default.randomBytes(4).toString("hex")}`;
        const job = {
            jobId,
            tenantId,
            fileName,
            fileSizeBytes,
            mimeType,
            status: "processing",
            createdAt: new Date().toISOString(),
        };
        const tenantJobs = ocrJobsStore.get(tenantId) || [];
        tenantJobs.unshift(job);
        ocrJobsStore.set(tenantId, tenantJobs);
        // 3. Deterministic Extraction (Sandbox / Mock mode to avoid paid external calls)
        const confidenceScore = overrideConfidence !== undefined ? overrideConfidence : 0.94;
        const totalAmount = overrideTotal !== undefined ? overrideTotal : 45500;
        const subtotal = Math.round(totalAmount / 1.18);
        const taxAmount = totalAmount - subtotal;
        // Determine if human review is required
        let requiresHumanReview = false;
        let reviewReason;
        if (confidenceScore < MIN_CONFIDENCE_THRESHOLD) {
            requiresHumanReview = true;
            reviewReason = `Low OCR confidence (${(confidenceScore * 100).toFixed(1)}% < 85%). Manual verification required.`;
        }
        else if (totalAmount >= FINANCIAL_REVIEW_THRESHOLD) {
            requiresHumanReview = true;
            reviewReason = `High financial amount (₹${totalAmount.toLocaleString("en-IN")} exceeds review threshold ₹1,00,000). Manual review mandatory.`;
        }
        const extracted = {
            vendorName: "Apex Supplies Pvt Ltd",
            vendorGst: "27AABCA1234F1Z8",
            invoiceNumber: "INV-2026-9021",
            invoiceDate: "2026-10-01",
            dueDate: "2026-10-31",
            lineItems: [
                {
                    description: "Office Consumables Batch A",
                    qty: 10,
                    rate: Math.round(subtotal / 10),
                    amount: subtotal,
                },
            ],
            subtotal,
            taxPercent: 18,
            taxAmount,
            totalAmount,
            currency: "INR",
            confidenceScore,
            requiresHumanReview,
            reviewReason,
        };
        job.status = "completed";
        job.extractedData = extracted;
        job.completedAt = new Date().toISOString();
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "AI_DOCUMENT_OCR_COMPLETED",
            entityType: "DocumentOcrJob",
            entityId: jobId,
            payload: {
                tenantId,
                fileName,
                confidenceScore,
                requiresHumanReview,
                totalAmount,
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            userId: actorId || "system",
            action: "AI_OCR_COMPLETED",
            entityType: "DocumentOcrJob",
            entityId: jobId,
            changes: {
                fileName,
                confidenceScore,
                requiresHumanReview,
                totalAmount,
            },
        });
        return job;
    }
    /**
     * Retrieve tenant OCR jobs history
     */
    static getTenantOcrJobs(tenantId) {
        return ocrJobsStore.get(tenantId) || [];
    }
}
exports.AiAutomationService = AiAutomationService;
