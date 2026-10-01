import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { rawPrisma as prisma } from '../prisma';
import { getBankAdapter, BankBatchHeader, PayoutBeneficiaryRecord } from './bank-adapters';
import { DigitalSignatureService } from './digital-signature.service';

export interface CreateBatchInput {
  tenantId: string;
  payrollRunId: string;
  bankCode: 'ICICI' | 'HDFC' | 'SBI';
  debitAccountNumber: string;
  clientCode?: string;
  narration?: string;
  generatedBy?: string;
}

export class BankPayoutService {
  /**
   * Helper: Mask bank account number for UI/API security (e.g. ••••••••1234)
   */
  static maskAccountNumber(accountNumber: string): string {
    const clean = (accountNumber || '').trim();
    if (!clean) return '—';
    if (clean.length <= 4) return clean;
    return '•'.repeat(clean.length - 4) + clean.slice(-4);
  }

  /**
   * Creates a draft bank payout batch from an approved/finalized payroll run.
   * Enforces double-payment prevention and validates employee banking credentials.
   */
  static async createPayoutBatch(input: CreateBatchInput) {
    const { tenantId, payrollRunId, bankCode, debitAccountNumber, clientCode, narration, generatedBy } = input;

    // 1. Fetch and validate source PayrollRun
    const payrollRun = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, tenantId },
      include: {
        payslips: {
          include: {
            employee: true,
          },
        },
        snapshots: true,
      },
    });

    if (!payrollRun) {
      throw new Error('Payroll run not found or does not belong to this tenant.');
    }

    // Require payroll run to be calculated, approved, or finalized
    const validApprovalStates = ['approved', 'finalized', 'calculated', 'completed'];
    if (!validApprovalStates.includes(payrollRun.approvalStatus) && payrollRun.status !== 'completed') {
      throw new Error(
        `Cannot create payout batch for payroll run in status "${payrollRun.approvalStatus}". Payroll must be calculated, approved, or finalized first.`
      );
    }

    if (payrollRun.payslips.length === 0) {
      throw new Error('Payroll run contains zero employee payslips.');
    }

    // 2. Double-Payment Prevention: Check for already active/disbursed items in this run
    const existingActiveItems = await prisma.bankDisbursementItem.findMany({
      where: {
        batch: {
          tenantId,
          payrollRunId,
          status: { in: ['approved', 'generated', 'disbursed', 'reconciled'] },
        },
      },
      select: { employeeId: true },
    });

    const alreadyDisbursedEmployeeIds = new Set(existingActiveItems.map((item) => item.employeeId));

    // 3. Prepare Beneficiary Records
    const eligibleRecords: PayoutBeneficiaryRecord[] = [];
    const skippedRecords: Array<{ employeeId: string; name: string; reason: string }> = [];

    for (const payslip of payrollRun.payslips) {
      const emp = payslip.employee;

      if (alreadyDisbursedEmployeeIds.has(emp.id)) {
        skippedRecords.push({
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          reason: 'Employee is already part of an active/disbursed payout batch for this payroll period.',
        });
        continue;
      }

      const netPay = Number(payslip.netSalary);
      if (netPay <= 0) {
        skippedRecords.push({
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          reason: `Zero or negative net salary (₹${netPay}). Excluded from disbursement.`,
        });
        continue;
      }

      eligibleRecords.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        beneficiaryName: `${emp.firstName} ${emp.lastName}`.trim(),
        accountNumber: emp.bankAccount || '',
        ifscCode: emp.bankIfsc || '',
        bankName: emp.bankName || '',
        amount: netPay,
        paymentMode: 'NEFT',
        email: emp.email || undefined,
        remarks: narration || `Salary ${payrollRun.periodMonth}/${payrollRun.periodYear}`,
      });
    }

    if (eligibleRecords.length === 0) {
      throw new Error(
        `No eligible employees available for disbursement. All ${payrollRun.payslips.length} employees have either been disbursed or have zero net pay.`
      );
    }

    // 4. Pre-Disbursement Validation with Target Bank Adapter
    const adapter = getBankAdapter(bankCode);
    const validation = adapter.validate(eligibleRecords);

    // 5. Generate Unique Batch Reference
    const dateSuffix = `${payrollRun.periodYear}${String(payrollRun.periodMonth).padStart(2, '0')}`;
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const batchReference = `PAY-${bankCode}-${dateSuffix}-${randomHex}`;
    const totalAmount = eligibleRecords.reduce((sum, r) => sum + r.amount, 0);

    // 6. Persist Batch & Items in DB Transaction
    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.bankDisbursementBatch.create({
        data: {
          tenantId,
          payrollRunId,
          bankCode,
          batchReference,
          debitAccountNumber: (debitAccountNumber || '').trim(),
          totalBeneficiaries: eligibleRecords.length,
          totalDisbursementAmount: totalAmount,
          currency: 'INR',
          formatType: adapter.formatType,
          status: 'draft',
          generatedBy: generatedBy || 'system',
        },
      });

      for (const rec of eligibleRecords) {
        await tx.bankDisbursementItem.create({
          data: {
            batchId: newBatch.id,
            employeeId: rec.employeeId,
            beneficiaryName: rec.beneficiaryName,
            accountNumber: rec.accountNumber,
            ifscCode: rec.ifscCode,
            amount: rec.amount,
            paymentMode: rec.paymentMode || 'NEFT',
            status: 'pending',
          },
        });
      }

      return newBatch;
    });

    return {
      batch,
      validation,
      eligibleCount: eligibleRecords.length,
      skippedCount: skippedRecords.length,
      skippedRecords,
    };
  }

  /**
   * Generates bank disbursement file for an approved batch, computes SHA-256 hash,
   * signs if requested, and stores encrypted in tenant storage.
   */
  static async generateBatchFile(tenantId: string, batchId: string, options: { digitallySign?: boolean; signerName?: string } = {}) {
    const batch = await prisma.bankDisbursementBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        payrollRun: true,
        items: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!batch) {
      throw new Error('Disbursement batch not found.');
    }

    if (batch.status === 'cancelled') {
      throw new Error('Cannot generate file for a cancelled payout batch.');
    }

    const adapter = getBankAdapter(batch.bankCode);

    const records: PayoutBeneficiaryRecord[] = batch.items.map((item) => ({
      employeeId: item.employeeId,
      employeeCode: item.employee.employeeCode,
      beneficiaryName: item.beneficiaryName,
      accountNumber: item.accountNumber,
      ifscCode: item.ifscCode,
      bankName: item.employee.bankName || undefined,
      amount: Number(item.amount),
      paymentMode: (item.paymentMode as any) || 'NEFT',
      email: item.employee.email || undefined,
      remarks: `Salary ${batch.payrollRun.periodMonth}/${batch.payrollRun.periodYear}`,
    }));

    const header: BankBatchHeader = {
      batchReference: batch.batchReference,
      clientCode: 'CORP',
      debitAccountNumber: batch.debitAccountNumber,
      valueDate: new Date(),
      totalCount: records.length,
      totalAmount: Number(batch.totalDisbursementAmount),
    };

    const formatted = adapter.generateFile(header, records);

    // Save to tenant storage directory
    const storageDir = path.join(process.cwd(), 'storage', 'tenants', tenantId, 'payouts');
    fs.mkdirSync(storageDir, { recursive: true });
    const filePath = path.join(storageDir, formatted.fileName);
    fs.writeFileSync(filePath, formatted.content, 'utf8');

    let isSigned = false;
    let signatureDigest: string | null = null;
    let signatureFileUrl: string | null = null;
    let signerIdentity: string | null = null;
    let signedAt: Date | null = null;

    if (options.digitallySign) {
      const signer = options.signerName || 'Finance Controller';
      const sigResult = DigitalSignatureService.signPayoutFile(formatted.content, signer);
      isSigned = true;
      signatureDigest = sigResult.signatureDigest;
      signerIdentity = signer;
      signedAt = sigResult.signedAt;

      // Save detached signature file (.sig)
      const sigFileName = `${formatted.fileName}.sig`;
      const sigFilePath = path.join(storageDir, sigFileName);
      fs.writeFileSync(sigFilePath, sigResult.signatureBuffer);
      signatureFileUrl = `/api/payroll/disbursement/batches/${batchId}/signature`;
    }

    // Update batch in DB
    const updated = await prisma.bankDisbursementBatch.update({
      where: { id: batchId },
      data: {
        fileHash: formatted.fileHash,
        filePath,
        status: batch.status === 'draft' ? 'generated' : batch.status,
        isDigitallySigned: isSigned,
        signatureDigest,
        signatureFileUrl,
        signerIdentity,
        signedAt,
      },
    });

    return {
      batch: updated,
      fileName: formatted.fileName,
      fileHash: formatted.fileHash,
      fileExtension: formatted.fileExtension,
      content: formatted.content,
      isDigitallySigned: isSigned,
      signatureDigest,
    };
  }

  /**
   * Transitions batch from draft to approved status (Finance authorization).
   */
  static async approveBatch(tenantId: string, batchId: string, approvedBy: string) {
    const batch = await prisma.bankDisbursementBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'draft') {
      throw new Error(`Batch cannot be approved from status "${batch.status}".`);
    }

    return prisma.bankDisbursementBatch.update({
      where: { id: batchId },
      data: {
        status: 'approved',
        generatedBy: approvedBy,
      },
    });
  }

  /**
   * Finalizes disbursement: marks batch as 'disbursed', updates item statuses.
   * If all employees are paid, updates PayrollRun status to 'paid'.
   */
  static async disburseBatch(tenantId: string, batchId: string, disbursedBy: string, notes?: string) {
    const batch = await prisma.bankDisbursementBatch.findFirst({
      where: { id: batchId, tenantId },
      include: { items: true },
    });
    if (!batch) throw new Error('Batch not found');
    if (batch.status === 'disbursed') {
      throw new Error('Batch is already marked as disbursed.');
    }

    return prisma.$transaction(async (tx) => {
      // Mark all items as success
      await tx.bankDisbursementItem.updateMany({
        where: { batchId },
        data: { status: 'success' },
      });

      // Mark batch as disbursed
      const updatedBatch = await tx.bankDisbursementBatch.update({
        where: { id: batchId },
        data: {
          status: 'disbursed',
          reconciledAt: new Date(),
          reconciledBy: disbursedBy,
        },
      });

      // Check if all payroll run payslips are now disbursed
      const remainingPendingPayslips = await tx.bankDisbursementItem.count({
        where: {
          batch: { payrollRunId: batch.payrollRunId, tenantId },
          status: { not: 'success' },
        },
      });

      if (remainingPendingPayslips === 0) {
        await tx.payrollRun.update({
          where: { id: batch.payrollRunId },
          data: { status: 'paid', approvalStatus: 'paid' },
        });
      }

      return updatedBatch;
    });
  }

  /**
   * Cancels a draft/generated batch, releasing employees for inclusion in future batches.
   */
  static async cancelBatch(tenantId: string, batchId: string, reason?: string) {
    const batch = await prisma.bankDisbursementBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    if (!batch) throw new Error('Batch not found');
    if (batch.status === 'disbursed') {
      throw new Error('Cannot cancel a batch that has already been disbursed.');
    }

    return prisma.bankDisbursementBatch.update({
      where: { id: batchId },
      data: { status: 'cancelled' },
    });
  }
}
