"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IciciCibAdapter = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * ICICI Bank Corporate Internet Banking (CIB) Adapter
 * Official Specification: Caret/Pipe Delimited ASCII Bulk Upload Format
 */
class IciciCibAdapter {
    bankCode = 'ICICI';
    bankName = 'ICICI Bank Corporate Internet Banking (CIB)';
    formatType = 'pipe_delimited';
    fileExtension = 'txt';
    // RBI IFSC Regex: 4 alphabetic letters, 1 zero, 6 alphanumeric characters
    static IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    validate(records) {
        const errors = [];
        const warnings = [];
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
            }
            else if (!/^\d{9,18}$/.test(cleanAcc)) {
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
            }
            else if (!IciciCibAdapter.IFSC_REGEX.test(cleanIfsc)) {
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
            else if (cleanName.length > 35) {
                warnings.push({
                    employeeId: record.employeeId,
                    employeeCode: record.employeeCode,
                    employeeName: cleanName,
                    field: 'beneficiaryName',
                    message: `Beneficiary name exceeds 35 characters and will be truncated by ICICI CIB`,
                    severity: 'warning',
                });
            }
            if (!hasError)
                validCount++;
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            validCount,
            totalCount: records.length,
        };
    }
    generateFile(header, records) {
        const valResult = this.validate(records);
        if (!valResult.isValid) {
            throw new Error(`Pre-disbursement validation failed with ${valResult.errors.length} error(s). Please correct employee bank details before generating file.`);
        }
        const valueDateStr = this.formatDate(header.valueDate);
        const cleanDebitAcc = (header.debitAccountNumber || '').trim();
        const clientCode = (header.clientCode || 'CORP').trim().toUpperCase();
        const batchRef = header.batchReference.trim();
        const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
        const lines = [];
        // Header record: H^<ClientCode>^<BatchRef>^<ValueDate>^<TotalCount>^<TotalAmount>
        lines.push(`H^${clientCode}^${batchRef}^${valueDateStr}^${records.length}^${totalAmount.toFixed(2)}`);
        // Detail records: D^<Mode>^<DebitAcc>^<ValueDate>^<Amount>^<BeneName>^<BeneAcc>^<IFSC>^<Remarks>
        for (const record of records) {
            const cleanIfsc = record.ifscCode.trim().toUpperCase();
            const cleanAcc = record.accountNumber.trim();
            const cleanName = this.sanitizeName(record.beneficiaryName, 35);
            const amountStr = record.amount.toFixed(2);
            const mode = this.determinePaymentMode(cleanIfsc, record.amount, record.paymentMode);
            const remarks = this.sanitizeText(record.remarks || header.narration || 'SALARY PAYOUT', 30);
            lines.push(`D^${mode}^${cleanDebitAcc}^${valueDateStr}^${amountStr}^${cleanName}^${cleanAcc}^${cleanIfsc}^${remarks}`);
        }
        const content = lines.join('\r\n');
        const fileName = `${batchRef}_ICICI_CIB.txt`;
        const fileHash = crypto_1.default.createHash('sha256').update(content, 'utf8').digest('hex');
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
    determinePaymentMode(ifsc, amount, preferredMode) {
        if (preferredMode === 'IFT' || ifsc.startsWith('ICIC')) {
            return 'IFT'; // Internal ICICI Fund Transfer
        }
        if (amount >= 200000 || preferredMode === 'RTGS') {
            return 'RTG'; // RTGS for >= 2 Lakhs
        }
        return 'NFT'; // NEFT default
    }
    formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    sanitizeName(name, maxLen) {
        // Keep alphanumeric and space, remove illegal characters
        return (name || '')
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .trim()
            .slice(0, maxLen);
    }
    sanitizeText(text, maxLen) {
        return (text || '')
            .replace(/[\^|\r\n]/g, ' ')
            .trim()
            .slice(0, maxLen);
    }
}
exports.IciciCibAdapter = IciciCibAdapter;
