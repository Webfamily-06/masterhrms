import crypto from 'crypto';
import {
  BankPayoutAdapter,
  BankBatchHeader,
  PayoutBeneficiaryRecord,
  ValidationResult,
  ValidationErrorItem,
  FormattedFileResult,
} from './bank-adapter.interface';

/**
 * State Bank of India (SBI) Corporate Multi-Payment System (CMP) Adapter
 * Official Specification: Caret Delimited Flat File with TXN Records & TRL Trailer
 */
export class SbiCmpAdapter implements BankPayoutAdapter {
  readonly bankCode = 'SBI' as const;
  readonly bankName = 'State Bank of India Corporate Multi-Payment (CMP)';
  readonly formatType = 'pipe_delimited' as const;
  readonly fileExtension = 'txt' as const;

  private static readonly IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  validate(records: PayoutBeneficiaryRecord[]): ValidationResult {
    const errors: ValidationErrorItem[] = [];
    const warnings: ValidationErrorItem[] = [];
    let validCount = 0;

    for (const record of records) {
      let hasError = false;

      // 1. Account Number Validation
      const cleanAcc = (record.accountNumber || '').trim();
      if (!cleanAcc) {
        errors.push({
          employeeId: record.employeeId,
          employeeCode: record.employeeCode,
          employeeName: record.beneficiaryName,
          field: 'accountNumber',
          message: 'Bank account number is missing',
          severity: 'error',
        });
        hasError = true;
      } else if (!/^\d{9,18}$/.test(cleanAcc)) {
        errors.push({
          employeeId: record.employeeId,
          employeeCode: record.employeeCode,
          employeeName: record.beneficiaryName,
          field: 'accountNumber',
          message: `Invalid bank account number "${cleanAcc.slice(-4).padStart(cleanAcc.length, '•')}" (must be 9-18 digits)`,
          severity: 'error',
        });
        hasError = true;
      }

      // 2. IFSC Code Validation
      const cleanIfsc = (record.ifscCode || '').trim().toUpperCase();
      if (!cleanIfsc) {
        errors.push({
          employeeId: record.employeeId,
          employeeCode: record.employeeCode,
          employeeName: record.beneficiaryName,
          field: 'ifscCode',
          message: 'Bank IFSC code is missing',
          severity: 'error',
        });
        hasError = true;
      } else if (!SbiCmpAdapter.IFSC_REGEX.test(cleanIfsc)) {
        errors.push({
          employeeId: record.employeeId,
          employeeCode: record.employeeCode,
          employeeName: record.beneficiaryName,
          field: 'ifscCode',
          message: `Invalid IFSC code "${cleanIfsc}" (must match 11-character RBI standard ^[A-Z]{4}0[A-Z0-9]{6}$)`,
          severity: 'error',
        });
        hasError = true;
      }

      // 3. Amount Validation
      if (record.amount <= 0 || isNaN(record.amount)) {
        errors.push({
          employeeId: record.employeeId,
          employeeCode: record.employeeCode,
          employeeName: record.beneficiaryName,
          field: 'amount',
          message: `Net payable amount (₹${record.amount}) must be greater than zero`,
          severity: 'error',
        });
        hasError = true;
      }

      // 4. Beneficiary Name Validation
      const cleanName = (record.beneficiaryName || '').trim();
      if (!cleanName) {
        errors.push({
          employeeId: record.employeeId,
          employeeCode: record.employeeCode,
          employeeName: 'Unknown',
          field: 'beneficiaryName',
          message: 'Beneficiary name is required',
          severity: 'error',
        });
        hasError = true;
      } else if (cleanName.length > 40) {
        warnings.push({
          employeeId: record.employeeId,
          employeeCode: record.employeeCode,
          employeeName: cleanName,
          field: 'beneficiaryName',
          message: 'Beneficiary name exceeds 40 characters and will be truncated for SBI CMP',
          severity: 'warning',
        });
      }

      if (!hasError) validCount++;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validCount,
      totalCount: records.length,
    };
  }

  generateFile(header: BankBatchHeader, records: PayoutBeneficiaryRecord[]): FormattedFileResult {
    const valResult = this.validate(records);
    if (!valResult.isValid) {
      throw new Error(`Pre-disbursement validation failed with ${valResult.errors.length} error(s). Please correct employee bank details before generating file.`);
    }

    const cleanSenderAcc = (header.debitAccountNumber || '').trim();
    const batchRef = header.batchReference.trim();
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    const lines: string[] = [];

    // Header record: HDR^<BatchRef>^<SenderAccount>^<RecordCount>^<TotalAmount>
    lines.push(`HDR^${batchRef}^${cleanSenderAcc}^${records.length}^${totalAmount.toFixed(2)}`);

    // Detail records: TXN^<SenderAccount>^<BeneficiaryIFSC>^<BeneficiaryAccount>^<BeneficiaryName>^<Amount>^<Narration>
    for (const record of records) {
      const cleanIfsc = record.ifscCode.trim().toUpperCase();
      const cleanAcc = record.accountNumber.trim();
      const cleanName = (record.beneficiaryName || '').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 40);
      const amountStr = record.amount.toFixed(2);
      const narration = (record.remarks || header.narration || `SAL_${batchRef}`).replace(/[\^|\r\n]/g, ' ').trim().slice(0, 30);

      lines.push(`TXN^${cleanSenderAcc}^${cleanIfsc}^${cleanAcc}^${cleanName}^${amountStr}^${narration}`);
    }

    // Trailer record: TRL^<TotalTransactions>^<TotalAmount>
    lines.push(`TRL^${records.length}^${totalAmount.toFixed(2)}`);

    const content = lines.join('\r\n');
    const fileName = `${batchRef}_SBI_CMP.txt`;
    const fileHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

    return {
      content,
      fileName,
      fileExtension: 'txt',
      formatType: 'pipe_delimited',
      mimeType: 'text/plain',
      totalRecords: records.length,
      totalAmount,
      fileHash,
    };
  }
}
