"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankDisbursementRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const bank_payout_service_1 = require("../services/bank-payout.service");
const bank_adapters_1 = require("../services/bank-adapters");
const digital_signature_service_1 = require("../services/digital-signature.service");
exports.bankDisbursementRouter = (0, express_1.Router)();
// Enforce authentication & tenant isolation
exports.bankDisbursementRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * 1. GET /api/payroll/disbursement/banks
 * List supported corporate banking adapters & capabilities
 */
exports.bankDisbursementRouter.get('/banks', (req, res) => {
    return res.json({
        banks: (0, bank_adapters_1.getSupportedBanks)(),
    });
});
/**
 * 2. GET /api/payroll/disbursement/batches
 * List payout batches for the tenant
 */
exports.bankDisbursementRouter.get('/batches', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant context required' });
        const { status, bankCode, payrollRunId } = req.query;
        const where = { tenantId };
        if (status)
            where.status = String(status);
        if (bankCode)
            where.bankCode = String(bankCode).toUpperCase();
        if (payrollRunId)
            where.payrollRunId = String(payrollRunId);
        const batches = await prisma_1.prisma.bankDisbursementBatch.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                payrollRun: {
                    select: {
                        id: true,
                        periodMonth: true,
                        periodYear: true,
                        approvalStatus: true,
                        status: true,
                    },
                },
                _count: {
                    select: { items: true },
                },
            },
        });
        return res.json({ batches });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to fetch payout batches' });
    }
});
/**
 * 3. GET /api/payroll/disbursement/batches/:id
 * Get single batch details with masked account numbers
 */
exports.bankDisbursementRouter.get('/batches/:id', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const batch = await prisma_1.prisma.bankDisbursementBatch.findFirst({
            where: { id, tenantId },
            include: {
                payrollRun: true,
                items: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                employeeCode: true,
                                firstName: true,
                                lastName: true,
                                department: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!batch)
            return res.status(404).json({ error: 'Payout batch not found' });
        // Mask sensitive bank account numbers in API response
        const maskedItems = batch.items.map((item) => ({
            ...item,
            accountNumber: bank_payout_service_1.BankPayoutService.maskAccountNumber(item.accountNumber),
        }));
        return res.json({
            batch: {
                ...batch,
                debitAccountNumber: bank_payout_service_1.BankPayoutService.maskAccountNumber(batch.debitAccountNumber),
                items: maskedItems,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to fetch batch details' });
    }
});
/**
 * 4. POST /api/payroll/disbursement/batches
 * Create a new payout batch from an eligible payroll run
 */
exports.bankDisbursementRouter.post('/batches', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant context required' });
        const { payrollRunId, bankCode, debitAccountNumber, clientCode, narration } = req.body;
        if (!payrollRunId || !bankCode || !debitAccountNumber) {
            return res.status(400).json({
                error: 'Missing required parameters: payrollRunId, bankCode, and debitAccountNumber are mandatory.',
            });
        }
        const result = await bank_payout_service_1.BankPayoutService.createPayoutBatch({
            tenantId,
            payrollRunId,
            bankCode: bankCode.toUpperCase(),
            debitAccountNumber,
            clientCode,
            narration,
            generatedBy: req.user?.email || 'admin',
        });
        return res.status(201).json({
            success: true,
            message: `Bank disbursement batch ${result.batch.batchReference} created successfully.`,
            batch: result.batch,
            validation: result.validation,
            eligibleCount: result.eligibleCount,
            skippedCount: result.skippedCount,
            skippedRecords: result.skippedRecords,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || 'Failed to create payout batch' });
    }
});
/**
 * 5. POST /api/payroll/disbursement/batches/:id/approve
 * Finance approval of payout batch
 */
exports.bankDisbursementRouter.post('/batches/:id/approve', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const updated = await bank_payout_service_1.BankPayoutService.approveBatch(tenantId, id, req.user?.email || 'finance_admin');
        return res.json({
            success: true,
            message: 'Batch approved for bank file generation.',
            batch: updated,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || 'Approval failed' });
    }
});
/**
 * 6. POST /api/payroll/disbursement/batches/:id/generate
 * Generate the bank file and optionally apply detached digital signature
 */
exports.bankDisbursementRouter.post('/batches/:id/generate', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const { digitallySign = false, signerName } = req.body;
        const result = await bank_payout_service_1.BankPayoutService.generateBatchFile(tenantId, id, {
            digitallySign: Boolean(digitallySign),
            signerName: signerName || req.user?.email,
        });
        return res.json({
            success: true,
            message: `File ${result.fileName} generated successfully.`,
            batch: result.batch,
            fileName: result.fileName,
            fileHash: result.fileHash,
            isDigitallySigned: result.isDigitallySigned,
            signatureDigest: result.signatureDigest,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || 'File generation failed' });
    }
});
/**
 * 7. GET /api/payroll/disbursement/batches/:id/download
 * Download generated bank file
 */
exports.bankDisbursementRouter.get('/batches/:id/download', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const batch = await prisma_1.prisma.bankDisbursementBatch.findFirst({
            where: { id, tenantId },
        });
        if (!batch || !batch.filePath || !fs_1.default.existsSync(batch.filePath)) {
            return res.status(404).json({ error: 'Payout file not found or not yet generated.' });
        }
        // Increment download audit counter
        await prisma_1.prisma.bankDisbursementBatch.update({
            where: { id },
            data: { downloadCount: { increment: 1 } },
        });
        res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(batch.filePath)}"`);
        res.setHeader('Content-Type', batch.formatType === 'csv' ? 'text/csv' : 'text/plain');
        res.setHeader('X-File-Hash-SHA256', batch.fileHash || '');
        const fileStream = fs_1.default.createReadStream(batch.filePath);
        return fileStream.pipe(res);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Download failed' });
    }
});
/**
 * 8. GET /api/payroll/disbursement/batches/:id/signature
 * Download detached PKCS#7 digital signature file (.sig)
 */
exports.bankDisbursementRouter.get('/batches/:id/signature', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const batch = await prisma_1.prisma.bankDisbursementBatch.findFirst({
            where: { id, tenantId },
        });
        if (!batch || !batch.isDigitallySigned || !batch.signatureDigest) {
            return res.status(404).json({ error: 'Digital signature not found for this batch.' });
        }
        const sigBuffer = Buffer.from(batch.signatureDigest, 'base64');
        res.setHeader('Content-Disposition', `attachment; filename="${batch.batchReference}.sig"`);
        res.setHeader('Content-Type', 'application/pkcs7-signature');
        return res.send(sigBuffer);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to download signature' });
    }
});
/**
 * 9. POST /api/payroll/disbursement/batches/:id/verify-signature
 * Verify detached digital signature against stored file
 */
exports.bankDisbursementRouter.post('/batches/:id/verify-signature', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const batch = await prisma_1.prisma.bankDisbursementBatch.findFirst({
            where: { id, tenantId },
        });
        if (!batch || !batch.filePath || !fs_1.default.existsSync(batch.filePath)) {
            return res.status(404).json({ error: 'Payout file not found.' });
        }
        if (!batch.isDigitallySigned || !batch.signatureDigest) {
            return res.status(400).json({ error: 'Batch is not digitally signed.' });
        }
        const fileContent = fs_1.default.readFileSync(batch.filePath);
        const verification = digital_signature_service_1.DigitalSignatureService.verifySignature(fileContent, batch.signatureDigest);
        return res.json({
            batchReference: batch.batchReference,
            signerIdentity: batch.signerIdentity,
            signedAt: batch.signedAt,
            verification,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Verification failed' });
    }
});
/**
 * 10. POST /api/payroll/disbursement/batches/:id/disburse
 * Finalize batch disbursement (money transmitted to bank)
 */
exports.bankDisbursementRouter.post('/batches/:id/disburse', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const { notes } = req.body;
        const updated = await bank_payout_service_1.BankPayoutService.disburseBatch(tenantId, id, req.user?.email || 'finance_admin', notes);
        return res.json({
            success: true,
            message: `Batch ${updated.batchReference} marked as disbursed.`,
            batch: updated,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || 'Disbursement finalization failed' });
    }
});
/**
 * 11. POST /api/payroll/disbursement/batches/:id/cancel
 * Cancel draft/generated batch
 */
exports.bankDisbursementRouter.post('/batches/:id/cancel', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const { reason } = req.body;
        const updated = await bank_payout_service_1.BankPayoutService.cancelBatch(tenantId, id, reason);
        return res.json({
            success: true,
            message: 'Batch cancelled. Included employees are now unlocked for fresh batch creation.',
            batch: updated,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || 'Cancellation failed' });
    }
});
