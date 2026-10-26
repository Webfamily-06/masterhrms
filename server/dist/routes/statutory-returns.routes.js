"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statutoryReturnsRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const statutory_return_service_1 = require("../services/statutory-return.service");
exports.statutoryReturnsRouter = (0, express_1.Router)();
// Enforce authentication & tenant isolation
exports.statutoryReturnsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * 1. GET /api/payroll/statutory/filings
 * List generated statutory return filings
 */
exports.statutoryReturnsRouter.get('/filings', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant context required' });
        const { returnType, wageYear, wageMonth, status } = req.query;
        const where = { tenantId };
        if (returnType)
            where.returnType = String(returnType);
        if (wageYear)
            where.wageYear = Number(wageYear);
        if (wageMonth)
            where.wageMonth = Number(wageMonth);
        if (status)
            where.status = String(status);
        const filings = await prisma_1.prisma.statutoryReturnFiling.findMany({
            where,
            orderBy: [{ wageYear: 'desc' }, { wageMonth: 'desc' }, { createdAt: 'desc' }],
            include: {
                establishment: {
                    select: {
                        id: true,
                        name: true,
                        epfCode: true,
                        esicCode: true,
                        stateCode: true,
                    },
                },
                payrollRun: {
                    select: {
                        id: true,
                        periodMonth: true,
                        periodYear: true,
                        approvalStatus: true,
                    },
                },
            },
        });
        return res.json({ filings });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to fetch statutory filings' });
    }
});
/**
 * 2. POST /api/payroll/statutory/epf/generate
 * Generate EPFO ECR v2.0 text file
 */
exports.statutoryReturnsRouter.post('/epf/generate', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant context required' });
        const { payrollRunId, establishmentId } = req.body;
        if (!payrollRunId) {
            return res.status(400).json({ error: 'payrollRunId is required' });
        }
        const result = await statutory_return_service_1.StatutoryReturnService.generateEpfEcr({
            tenantId,
            payrollRunId,
            establishmentId,
            generatedBy: req.user?.email || 'admin',
        });
        return res.status(201).json({
            success: true,
            message: `EPFO ECR file ${result.fileName} generated successfully for ${result.totalMembers} members.`,
            filing: result.filing,
            fileName: result.fileName,
            fileHash: result.fileHash,
            totalMembers: result.totalMembers,
            totalChallan: result.totalChallan,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || 'Failed to generate EPFO ECR return' });
    }
});
/**
 * 3. POST /api/payroll/statutory/esic/generate
 * Generate ESIC Monthly Return (.xlsx or .csv)
 */
exports.statutoryReturnsRouter.post('/esic/generate', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant context required' });
        const { payrollRunId, establishmentId, format = 'xlsx' } = req.body;
        if (!payrollRunId) {
            return res.status(400).json({ error: 'payrollRunId is required' });
        }
        const result = await statutory_return_service_1.StatutoryReturnService.generateEsicReturn({
            tenantId,
            payrollRunId,
            establishmentId,
            format: format === 'csv' ? 'csv' : 'xlsx',
            generatedBy: req.user?.email || 'admin',
        });
        return res.status(201).json({
            success: true,
            message: `ESIC Monthly Return ${result.fileName} generated successfully for ${result.totalMembers} members.`,
            filing: result.filing,
            fileName: result.fileName,
            fileHash: result.fileHash,
            totalMembers: result.totalMembers,
            totalChallan: result.totalChallan,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || 'Failed to generate ESIC return' });
    }
});
/**
 * 4. GET /api/payroll/statutory/filings/:id/download
 * Download generated statutory return file
 */
exports.statutoryReturnsRouter.get('/filings/:id/download', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const filing = await prisma_1.prisma.statutoryReturnFiling.findFirst({
            where: { id, tenantId },
        });
        if (!filing || !filing.filePath || !fs_1.default.existsSync(filing.filePath)) {
            return res.status(404).json({ error: 'Statutory return file not found on disk.' });
        }
        const ext = filing.fileFormat === 'xlsx' ? 'xlsx' : filing.fileFormat === 'csv' ? 'csv' : 'txt';
        const mime = ext === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : ext === 'csv'
                ? 'text/csv'
                : 'text/plain';
        res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(filing.filePath)}"`);
        res.setHeader('Content-Type', mime);
        res.setHeader('X-File-Hash-SHA256', filing.fileHash || '');
        const fileStream = fs_1.default.createReadStream(filing.filePath);
        return fileStream.pipe(res);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Download failed' });
    }
});
/**
 * 5. POST /api/payroll/statutory/filings/:id/record-challan
 * Record portal submission TRRN or Challan payment confirmation
 */
exports.statutoryReturnsRouter.post('/filings/:id/record-challan', async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const { challanTrrn, status = 'paid' } = req.body;
        if (!challanTrrn) {
            return res.status(400).json({ error: 'challanTrrn is required (EPFO TRRN or ESIC Challan Number)' });
        }
        const filing = await prisma_1.prisma.statutoryReturnFiling.findFirst({
            where: { id, tenantId },
        });
        if (!filing)
            return res.status(404).json({ error: 'Filing not found' });
        const updated = await prisma_1.prisma.statutoryReturnFiling.update({
            where: { id },
            data: {
                challanTrrn: String(challanTrrn).trim(),
                status,
                uploadedAt: new Date(),
            },
        });
        return res.json({
            success: true,
            message: `Challan reference ${challanTrrn} recorded successfully.`,
            filing: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to record challan' });
    }
});
