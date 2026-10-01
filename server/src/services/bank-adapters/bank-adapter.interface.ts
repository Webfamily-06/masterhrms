/**
 * WAVE 2.4 — Corporate Bank Disbursement Adapter Architecture
 * Standardized interface for multi-bank corporate salary file generation.
 */

export interface PayoutBeneficiaryRecord {
  employeeId: string;
  employeeCode: string;
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  amount: number; // Net pay in INR
  paymentMode?: 'NEFT' | 'RTGS' | 'IFT';
  remarks?: string;
  email?: string;
  location?: string;
}

export interface BankBatchHeader {
  batchReference: string;
  clientCode: string;
  debitAccountNumber: string;
  valueDate: Date;
  totalCount: number;
  totalAmount: number;
  narration?: string;
}

export interface ValidationErrorItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
  validCount: number;
  totalCount: number;
}

export interface FormattedFileResult {
  content: string;
  fileName: string;
  fileExtension: 'txt' | 'csv';
  formatType: 'pipe_delimited' | 'csv' | 'fixed_width';
  mimeType: string;
  totalRecords: number;
  totalAmount: number;
  fileHash: string; // SHA-256 hex digest
}

export interface BankPayoutAdapter {
  readonly bankCode: 'ICICI' | 'HDFC' | 'SBI';
  readonly bankName: string;
  readonly formatType: 'pipe_delimited' | 'csv' | 'fixed_width';
  readonly fileExtension: 'txt' | 'csv';

  /**
   * Pre-disbursement validation of bank details (IFSC, Account length, Name sanity, Non-zero amount).
   */
  validate(records: PayoutBeneficiaryRecord[]): ValidationResult;

  /**
   * Generates bank-compliant flat file / spreadsheet string according to official corporate specification.
   */
  generateFile(header: BankBatchHeader, records: PayoutBeneficiaryRecord[]): FormattedFileResult;
}
