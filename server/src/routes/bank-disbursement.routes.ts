import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { resolveTenantContext } from '../middleware/tenant-context.middleware';
import { BankPayoutService } from '../services/bank-payout.service';
import { getSupportedBanks } from '../services/bank-adapters';
import { DigitalSignatureService } from '../services/digital-signature.service';

export const bankDisbursementRouter = Router();

// Enforce authentication & tenant isolation
bankDisbursementRouter.use(requireAuth, resolveTenantContext);

/**
 * 1. GET /api/payroll/disbursement/banks
 * List supported corporate banking adapters & capabilities
 */
bankDisbursementRouter.get('/banks', (req: AuthRequest, res: Response) => {
  return res.json({
    banks: getSupportedBanks(),
  });
});

/**
 * 2. GET /api/payroll/disbursement/batches
 * List payout batches for the tenant
 */
bankDisbursementRouter.get('/batches', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { status, bankCode, payrollRunId } = req.query;
    const where: any = { tenantId };

    if (status) where.status = String(status);
    if (bankCode) where.bankCode = String(bankCode).toUpperCase();
    if (payrollRunId) where.payrollRunId = String(payrollRunId);

    const batches = await prisma.bankDisbursementBatch.findMany({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch payout batches' });
  }
});

/**
 * 3. GET /api/payroll/disbursement/batches/:id
 * Get single batch details with masked account numbers
 */
bankDisbursementRouter.get('/batches/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;

    const batch = await prisma.bankDisbursementBatch.findFirst({
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

    if (!batch) return res.status(404).json({ error: 'Payout batch not found' });

    // Mask sensitive bank account numbers in API response
    const maskedItems = batch.items.map((item) => ({
      ...item,
      accountNumber: BankPayoutService.maskAccountNumber(item.accountNumber),
    }));

    return res.json({
      batch: {
        ...batch,
        debitAccountNumber: BankPayoutService.maskAccountNumber(batch.debitAccountNumber),
        items: maskedItems,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch batch details' });
  }
});

/**
 * 4. POST /api/payroll/disbursement/batches
 * Create a new payout batch from an eligible payroll run
 */
bankDisbursementRouter.post('/batches', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { payrollRunId, bankCode, debitAccountNumber, clientCode, narration } = req.body;

    if (!payrollRunId || !bankCode || !debitAccountNumber) {
      return res.status(400).json({
        error: 'Missing required parameters: payrollRunId, bankCode, and debitAccountNumber are mandatory.',
      });
    }

    const result = await BankPayoutService.createPayoutBatch({
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
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create payout batch' });
  }
});

/**
 * 5. POST /api/payroll/disbursement/batches/:id/approve
 * Finance approval of payout batch
 */
bankDisbursementRouter.post('/batches/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;

    const updated = await BankPayoutService.approveBatch(tenantId, id, req.user?.email || 'finance_admin');
    return res.json({
      success: true,
      message: 'Batch approved for bank file generation.',
      batch: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Approval failed' });
  }
});

/**
 * 6. POST /api/payroll/disbursement/batches/:id/generate
 * Generate the bank file and optionally apply detached digital signature
 */
bankDisbursementRouter.post('/batches/:id/generate', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { digitallySign = false, signerName } = req.body;

    const result = await BankPayoutService.generateBatchFile(tenantId, id, {
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
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'File generation failed' });
  }
});

/**
 * 7. GET /api/payroll/disbursement/batches/:id/download
 * Download generated bank file
 */
bankDisbursementRouter.get('/batches/:id/download', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;

    const batch = await prisma.bankDisbursementBatch.findFirst({
      where: { id, tenantId },
    });

    if (!batch || !batch.filePath || !fs.existsSync(batch.filePath)) {
      return res.status(404).json({ error: 'Payout file not found or not yet generated.' });
    }

    // Increment download audit counter
    await prisma.bankDisbursementBatch.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(batch.filePath)}"`);
    res.setHeader('Content-Type', batch.formatType === 'csv' ? 'text/csv' : 'text/plain');
    res.setHeader('X-File-Hash-SHA256', batch.fileHash || '');

    const fileStream = fs.createReadStream(batch.filePath);
    return fileStream.pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Download failed' });
  }
});

/**
 * 8. GET /api/payroll/disbursement/batches/:id/signature
 * Download detached PKCS#7 digital signature file (.sig)
 */
bankDisbursementRouter.get('/batches/:id/signature', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;

    const batch = await prisma.bankDisbursementBatch.findFirst({
      where: { id, tenantId },
    });

    if (!batch || !batch.isDigitallySigned || !batch.signatureDigest) {
      return res.status(404).json({ error: 'Digital signature not found for this batch.' });
    }

    const sigBuffer = Buffer.from(batch.signatureDigest, 'base64');
    res.setHeader('Content-Disposition', `attachment; filename="${batch.batchReference}.sig"`);
    res.setHeader('Content-Type', 'application/pkcs7-signature');

    return res.send(sigBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to download signature' });
  }
});

/**
 * 9. POST /api/payroll/disbursement/batches/:id/verify-signature
 * Verify detached digital signature against stored file
 */
bankDisbursementRouter.post('/batches/:id/verify-signature', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;

    const batch = await prisma.bankDisbursementBatch.findFirst({
      where: { id, tenantId },
    });

    if (!batch || !batch.filePath || !fs.existsSync(batch.filePath)) {
      return res.status(404).json({ error: 'Payout file not found.' });
    }

    if (!batch.isDigitallySigned || !batch.signatureDigest) {
      return res.status(400).json({ error: 'Batch is not digitally signed.' });
    }

    const fileContent = fs.readFileSync(batch.filePath);
    const verification = DigitalSignatureService.verifySignature(fileContent, batch.signatureDigest);

    return res.json({
      batchReference: batch.batchReference,
      signerIdentity: batch.signerIdentity,
      signedAt: batch.signedAt,
      verification,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

/**
 * 10. POST /api/payroll/disbursement/batches/:id/disburse
 * Finalize batch disbursement (money transmitted to bank)
 */
bankDisbursementRouter.post('/batches/:id/disburse', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { notes } = req.body;

    const updated = await BankPayoutService.disburseBatch(
      tenantId,
      id,
      req.user?.email || 'finance_admin',
      notes
    );

    return res.json({
      success: true,
      message: `Batch ${updated.batchReference} marked as disbursed.`,
      batch: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Disbursement finalization failed' });
  }
});

/**
 * 11. POST /api/payroll/disbursement/batches/:id/cancel
 * Cancel draft/generated batch
 */
bankDisbursementRouter.post('/batches/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { reason } = req.body;

    const updated = await BankPayoutService.cancelBatch(tenantId, id, reason);
    return res.json({
      success: true,
      message: 'Batch cancelled. Included employees are now unlocked for fresh batch creation.',
      batch: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Cancellation failed' });
  }
});
