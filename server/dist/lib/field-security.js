"use strict";
/**
 * Server-side Field-Level Security and Sensitive Data Masking Engine
 *
 * Enforces field-level redaction on statutory and financial attributes:
 * - Aadhaar numbers
 * - Permanent Account Numbers (PAN)
 * - Bank account & IFSC numbers
 * - Compensation, salary, CTC, tax deductions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFieldSecurityMask = void 0;
exports.maskAadhaar = maskAadhaar;
exports.maskPan = maskPan;
exports.maskBankAccount = maskBankAccount;
exports.sanitizeSensitiveFields = sanitizeSensitiveFields;
function maskAadhaar(val) {
    if (!val)
        return null;
    const clean = val.replace(/\s+/g, "");
    if (clean.length < 4)
        return "•••• •••• ••••";
    const last4 = clean.slice(-4);
    return `•••• •••• ${last4}`;
}
function maskPan(val) {
    if (!val)
        return null;
    const clean = val.trim();
    if (clean.length < 4)
        return "••••••••••";
    const last4 = clean.slice(-4);
    return `••••••${last4}`;
}
function maskBankAccount(val) {
    if (!val)
        return null;
    const clean = val.trim();
    if (clean.length < 4)
        return "••••••••••••";
    const last4 = clean.slice(-4);
    return `••••••••${last4}`;
}
const SENSITIVE_STATUTORY_KEYS = new Set([
    "aadhaar",
    "aadhaarNumber",
    "aadhaar_number",
    "pan",
    "panNumber",
    "pan_number",
    "bankAccount",
    "bankAccountNumber",
    "accountNumber",
    "account_number",
    "ifsc",
    "ifscCode",
    "ifsc_code",
    "passportNumber",
    "passport_number",
]);
const COMPENSATION_KEYS = new Set([
    "salary",
    "annualSalary",
    "ctc",
    "baseSalary",
    "base_salary",
    "grossSalary",
    "gross_salary",
    "netSalary",
    "net_salary",
    "hourlyRate",
    "hourly_rate",
    "basicPay",
    "basic_pay",
    "salaryComponents",
    "salary_components",
    "totalEarnings",
    "totalDeductions",
]);
/**
 * Redacts sensitive fields from a single entity or array of entities.
 */
function sanitizeSensitiveFields(data, options = {}) {
    if (!data || typeof data !== "object") {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => sanitizeSensitiveFields(item, options));
    }
    const clone = { ...data };
    for (const [key, value] of Object.entries(clone)) {
        // 1. Sensitive statutory IDs (PAN, Aadhaar, Bank)
        if (SENSITIVE_STATUTORY_KEYS.has(key)) {
            if (!options.canViewSensitive && !options.isSelf) {
                if (key.toLowerCase().includes("aadhaar")) {
                    clone[key] = maskAadhaar(value);
                }
                else if (key.toLowerCase().includes("pan")) {
                    clone[key] = maskPan(value);
                }
                else if (key.toLowerCase().includes("account") || key.toLowerCase().includes("bank")) {
                    clone[key] = maskBankAccount(value);
                }
                else {
                    clone[key] = "••••••••";
                }
            }
        }
        // 2. Compensation & Salary fields
        if (COMPENSATION_KEYS.has(key)) {
            if (!options.canViewCompensation && !options.isSelf) {
                clone[key] = null;
            }
        }
        // Recurse into nested objects (e.g. employee.profile, employee.salaryAssignment)
        // Avoid decomposing Prisma.Decimal instances or functions
        const isDecimal = value &&
            typeof value === "object" &&
            (typeof value.toNumber === "function" ||
                typeof value.toFixed === "function" ||
                "d" in value);
        if (value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            !(value instanceof Date) &&
            !isDecimal) {
            clone[key] = sanitizeSensitiveFields(value, options);
        }
        else if (Array.isArray(value)) {
            clone[key] = value.map((nested) => sanitizeSensitiveFields(nested, options));
        }
    }
    return clone;
}
exports.applyFieldSecurityMask = sanitizeSensitiveFields;
