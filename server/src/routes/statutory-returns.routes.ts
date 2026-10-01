import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { resolveTenantContext } from '../middleware/tenant-context.middleware';
import { StatutoryReturnService } from '../services/statutory-return.service';

export const statutoryReturnsRouter = Router();

// Enforce authentication & tenant isolation
statutoryReturnsRouter.use(requireAuth, resolveTenantContext);

/**
 * 1. GET /api/payroll/statutory/filings
 * List generated statutory return filings
 */
statutoryReturnsRouter.get('/filings', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { returnType, wageYear, wageMonth, status } = req.query;
    const where: any = { tenantId };

    if (returnType) where.returnType = String(returnType);
    if (wageYear) where.wageYear = Number(wageYear);
    if (wageMonth) where.wageMonth = Number(wageMonth);
    if (status) where.status = String(status);

    const filings = await prisma.statutoryReturnFiling.findMany({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch statutory filings' });
  }
});

/**
 * 2. POST /api/payroll/statutory/epf/generate
 * Generate EPFO ECR v2.0 text file
 */
statutoryReturnsRouter.post('/epf/generate', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { payrollRunId, establishmentId } = req.body;
    if (!payrollRunId) {
      return res.status(400).json({ error: 'payrollRunId is required' });
    }

    const result = await StatutoryReturnService.generateEpfEcr({
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
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to generate EPFO ECR return' });
  }
});

/**
 * 3. POST /api/payroll/statutory/esic/generate
 * Generate ESIC Monthly Return (.xlsx or .csv)
 */
statutoryReturnsRouter.post('/esic/generate', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { payrollRunId, establishmentId, format = 'xlsx' } = req.body;
    if (!payrollRunId) {
      return res.status(400).json({ error: 'payrollRunId is required' });
    }

    const result = await StatutoryReturnService.generateEsicReturn({
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
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to generate ESIC return' });
  }
});

/**
 * 4. GET /api/payroll/statutory/filings/:id/download
 * Download generated statutory return file
 */
statutoryReturnsRouter.get('/filings/:id/download', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;

    const filing = await prisma.statutoryReturnFiling.findFirst({
      where: { id, tenantId },
    });

    if (!filing || !filing.filePath || !fs.existsSync(filing.filePath)) {
      return res.status(404).json({ error: 'Statutory return file not found on disk.' });
    }

    const ext = filing.fileFormat === 'xlsx' ? 'xlsx' : filing.fileFormat === 'csv' ? 'csv' : 'txt';
    const mime =
      ext === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : ext === 'csv'
        ? 'text/csv'
        : 'text/plain';

    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filing.filePath)}"`);
    res.setHeader('Content-Type', mime);
    res.setHeader('X-File-Hash-SHA256', filing.fileHash || '');

    const fileStream = fs.createReadStream(filing.filePath);
    return fileStream.pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Download failed' });
  }
});

/**
 * 5. POST /api/payroll/statutory/filings/:id/record-challan
 * Record portal submission TRRN or Challan payment confirmation
 */
statutoryReturnsRouter.post('/filings/:id/record-challan', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { challanTrrn, status = 'paid' } = req.body;

    if (!challanTrrn) {
      return res.status(400).json({ error: 'challanTrrn is required (EPFO TRRN or ESIC Challan Number)' });
    }

    const filing = await prisma.statutoryReturnFiling.findFirst({
      where: { id, tenantId },
    });

    if (!filing) return res.status(404).json({ error: 'Filing not found' });

    const updated = await prisma.statutoryReturnFiling.update({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to record challan' });
  }
});
