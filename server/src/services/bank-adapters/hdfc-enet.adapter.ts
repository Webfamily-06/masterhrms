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
 * HDFC Bank Enet Corporate Banking Adapter
 * Official Specification: 11-column CSV Bulk Salary Payout Format
 */
export class HdfcEnetAdapter implements BankPayoutAdapter {
  readonly bankCode = 'HDFC' as const;
  readonly bankName = 'HDFC Bank Enet Corporate Banking';
  readonly formatType = 'csv' as const;
  readonly fileExtension = 'csv' as const;

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
      } else if (!HdfcEnetAdapter.IFSC_REGEX.test(cleanIfsc)) {
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

    const valueDateStr = this.formatDate(header.valueDate);
    const batchRef = header.batchReference.trim();
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    const rows: string[] = [];

    // Optional Header Row for Enet CSV
    rows.push('Transaction Type,Beneficiary Code,Beneficiary Account Number,Amount,Beneficiary Name,Drawee Location,Print Location,Beneficiary Email,Payment Reference Number,Value Date,Beneficiary IFSC Code');

    // 11 Columns per official HDFC Enet format
    records.forEach((record, index) => {
      const cleanEmpCode = (record.employeeCode || `EMP${index + 1}`).trim();
      const cleanAcc = record.accountNumber.trim();
      const amountStr = record.amount.toFixed(2);
      const cleanName = this.escapeCsv(record.beneficiaryName.trim());
      const draweeLoc = this.escapeCsv(record.location || 'MUMBAI');
      const printLoc = '';
      const email = (record.email || '').trim();
      const itemRef = `${batchRef}-${String(index + 1).padStart(4, '0')}`;
      const cleanIfsc = record.ifscCode.trim().toUpperCase();

      rows.push(`P,${cleanEmpCode},${cleanAcc},${amountStr},${cleanName},${draweeLoc},${printLoc},${email},${itemRef},${valueDateStr},${cleanIfsc}`);
    });

    const content = rows.join('\r\n');
    const fileName = `${batchRef}_HDFC_ENET.csv`;
    const fileHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

    return {
      content,
      fileName,
      fileExtension: 'csv',
      formatType: 'csv',
      mimeType: 'text/csv',
      totalRecords: records.length,
      totalAmount,
      fileHash,
    };
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private escapeCsv(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
