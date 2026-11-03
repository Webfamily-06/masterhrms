"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeSchema = exports.createEmployeeSchema = exports.PIN_CODE_REGEX = exports.E164_PHONE_REGEX = exports.ifscRegex = exports.aadhaarRegex = exports.panRegex = void 0;
exports.normalizePhoneE164 = normalizePhoneE164;
const zod_1 = require("zod");
// PAN Regex: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F)
exports.panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// Aadhaar Regex: exactly 12 digits or formatted with spaces / hyphens
exports.aadhaarRegex = /^(?:\d{12}|\d{4}[ -]\d{4}[ -]\d{4})$/;
// IFSC Regex: 4 uppercase alphabets, '0', then 6 alphanumeric characters (e.g. SBIN0001234)
exports.ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// E.164 Phone Regex: International format (+ followed by 1 to 15 digits)
exports.E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
// Indian Postal PIN Code Regex: 6 digits, non-zero starting digit
exports.PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;
/**
 * Normalizes phone numbers to standard E.164 format.
 * Automatically prefixes Indian 10-digit mobile numbers with '+91'.
 */
function normalizePhoneE164(phone) {
    if (phone === null || phone === undefined)
        return null;
    if (typeof phone !== "string")
        return null;
    const trimmed = phone.trim();
    if (!trimmed)
        return null;
    // Strip spaces, hyphens, dots, and parentheses
    const clean = trimmed.replace(/[\s\-\(\)\.]/g, "");
    // 10-digit Indian number starting with 6, 7, 8, or 9
    if (/^[6-9]\d{9}$/.test(clean)) {
        return `+91${clean}`;
    }
    // 11-digit starting with 0 (e.g. 09876543210)
    if (/^0[6-9]\d{9}$/.test(clean)) {
        return `+91${clean.substring(1)}`;
    }
    // 12-digit starting with 91 without plus (e.g. 919876543210)
    if (/^91[6-9]\d{9}$/.test(clean)) {
        return `+${clean}`;
    }
    // Already in international format with '+'
    if (clean.startsWith("+")) {
        return clean;
    }
    // Default digits
    return /^\d+$/.test(clean) ? `+${clean}` : clean;
}
// Age calculation helper
function isAtLeast18YearsOld(dobStr) {
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime()))
        return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age >= 18;
}
exports.createEmployeeSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1, "First name is required").max(100, "First name cannot exceed 100 characters"),
    lastName: zod_1.z.string().trim().min(1, "Last name is required").max(100, "Last name cannot exceed 100 characters"),
    email: zod_1.z.string().trim().email("Invalid email address format").toLowerCase(),
    phone: zod_1.z
        .union([zod_1.z.string(), zod_1.z.null(), zod_1.z.undefined()])
        .transform(normalizePhoneE164)
        .refine((val) => val === null || val === undefined || exports.E164_PHONE_REGEX.test(val), {
        message: "Phone number must conform to E.164 international standard (e.g. +919876543210)",
    })
        .optional(),
    employeeCode: zod_1.z.string().trim().max(50).nullable().optional(),
    departmentId: zod_1.z.string().uuid("Invalid department ID").nullable().optional(),
    designationId: zod_1.z.string().uuid("Invalid designation ID").nullable().optional(),
    branchId: zod_1.z.string().uuid("Invalid branch ID").nullable().optional(),
    shiftId: zod_1.z.string().uuid("Invalid shift ID").nullable().optional(),
    reportingToId: zod_1.z.string().uuid("Invalid reporting manager ID").nullable().optional(),
    employmentType: zod_1.z.enum(["full_time", "part_time", "contract", "intern", "probation"]).optional().default("full_time"),
    joinedAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    salary: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).transform((val) => Number(val)).refine((num) => !isNaN(num) && num >= 0, {
        message: "Salary must be a non-negative number",
    }).optional(),
    dateOfBirth: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).refine((dob) => isAtLeast18YearsOld(dob), {
        message: "Employee must be at least 18 years old",
    }).nullable().optional(),
    gender: zod_1.z.enum(["Male", "Female", "Other", "Prefer not to say"]).nullable().optional(),
    maritalStatus: zod_1.z.enum(["Single", "Married", "Divorced", "Widowed"]).nullable().optional(),
    bloodGroup: zod_1.z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).nullable().optional(),
    // Statutory & Bank validations
    pan: zod_1.z.string().trim().toUpperCase().regex(exports.panRegex, "Invalid PAN format (expected e.g. ABCDE1234F)").nullable().optional().or(zod_1.z.literal("")),
    aadhaar: zod_1.z.string().trim().regex(exports.aadhaarRegex, "Invalid Aadhaar format (expected 12 digits)").nullable().optional().or(zod_1.z.literal("")),
    uan: zod_1.z.string().trim().regex(/^\d{12}$/, "Invalid UAN format (expected 12 digits)").nullable().optional().or(zod_1.z.literal("")),
    bankName: zod_1.z.string().trim().max(100).nullable().optional(),
    bankAccount: zod_1.z.string().trim().max(50).nullable().optional(),
    bankIfsc: zod_1.z.string().trim().toUpperCase().regex(exports.ifscRegex, "Invalid IFSC format (expected e.g. HDFC0001234)").nullable().optional().or(zod_1.z.literal("")),
    bankBranch: zod_1.z.string().trim().max(100).nullable().optional(),
    // Address fields
    addressLine1: zod_1.z.string().trim().max(255).nullable().optional(),
    addressLine2: zod_1.z.string().trim().max(255).nullable().optional(),
    city: zod_1.z.string().trim().max(100).nullable().optional(),
    district: zod_1.z.string().trim().max(100).nullable().optional(),
    postalCode: zod_1.z
        .string()
        .trim()
        .refine((val) => !val || /^[1-9][0-9]{5}$/.test(val) || /^[a-zA-Z0-9\s\-]{3,10}$/.test(val), {
        message: "Invalid postal code format",
    })
        .nullable()
        .optional(),
    emergencyContactName: zod_1.z.string().trim().max(100).nullable().optional(),
    emergencyContactRelationship: zod_1.z.string().trim().max(50).nullable().optional(),
    emergencyContactPhone: zod_1.z
        .union([zod_1.z.string(), zod_1.z.null(), zod_1.z.undefined()])
        .transform(normalizePhoneE164)
        .refine((val) => val === null || val === undefined || exports.E164_PHONE_REGEX.test(val), {
        message: "Emergency contact phone must conform to E.164 international standard (e.g. +919876543210)",
    })
        .optional(),
}).passthrough();
exports.updateEmployeeSchema = exports.createEmployeeSchema.partial();
