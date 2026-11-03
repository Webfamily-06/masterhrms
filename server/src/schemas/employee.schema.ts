import { z } from "zod";

// PAN Regex: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F)
export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Aadhaar Regex: exactly 12 digits or formatted with spaces / hyphens
export const aadhaarRegex = /^(?:\d{12}|\d{4}[ -]\d{4}[ -]\d{4})$/;

// IFSC Regex: 4 uppercase alphabets, '0', then 6 alphanumeric characters (e.g. SBIN0001234)
export const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// E.164 Phone Regex: International format (+ followed by 1 to 15 digits)
export const E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

// Indian Postal PIN Code Regex: 6 digits, non-zero starting digit
export const PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;

/**
 * Normalizes phone numbers to standard E.164 format.
 * Automatically prefixes Indian 10-digit mobile numbers with '+91'.
 */
export function normalizePhoneE164(phone: unknown): string | null {
  if (phone === null || phone === undefined) return null;
  if (typeof phone !== "string") return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

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
function isAtLeast18YearsOld(dobStr: string | Date): boolean {
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100, "First name cannot exceed 100 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name cannot exceed 100 characters"),
  email: z.string().trim().email("Invalid email address format").toLowerCase(),
  phone: z
    .union([z.string(), z.null(), z.undefined()])
    .transform(normalizePhoneE164)
    .refine((val) => val === null || val === undefined || E164_PHONE_REGEX.test(val), {
      message: "Phone number must conform to E.164 international standard (e.g. +919876543210)",
    })
    .optional(),
  employeeCode: z.string().trim().max(50).nullable().optional(),
  departmentId: z.string().uuid("Invalid department ID").nullable().optional(),
  designationId: z.string().uuid("Invalid designation ID").nullable().optional(),
  branchId: z.string().uuid("Invalid branch ID").nullable().optional(),
  shiftId: z.string().uuid("Invalid shift ID").nullable().optional(),
  reportingToId: z.string().uuid("Invalid reporting manager ID").nullable().optional(),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern", "probation"]).optional().default("full_time"),
  joinedAt: z.union([z.string(), z.date()]).optional(),
  salary: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((num) => !isNaN(num) && num >= 0, {
    message: "Salary must be a non-negative number",
  }).optional(),
  dateOfBirth: z.union([z.string(), z.date()]).refine((dob) => isAtLeast18YearsOld(dob), {
    message: "Employee must be at least 18 years old",
  }).nullable().optional(),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]).nullable().optional(),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).nullable().optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).nullable().optional(),

  // Statutory & Bank validations
  pan: z.string().trim().toUpperCase().regex(panRegex, "Invalid PAN format (expected e.g. ABCDE1234F)").nullable().optional().or(z.literal("")),
  aadhaar: z.string().trim().regex(aadhaarRegex, "Invalid Aadhaar format (expected 12 digits)").nullable().optional().or(z.literal("")),
  uan: z.string().trim().regex(/^\d{12}$/, "Invalid UAN format (expected 12 digits)").nullable().optional().or(z.literal("")),
  bankName: z.string().trim().max(100).nullable().optional(),
  bankAccount: z.string().trim().max(50).nullable().optional(),
  bankIfsc: z.string().trim().toUpperCase().regex(ifscRegex, "Invalid IFSC format (expected e.g. HDFC0001234)").nullable().optional().or(z.literal("")),
  bankBranch: z.string().trim().max(100).nullable().optional(),

  // Address fields
  addressLine1: z.string().trim().max(255).nullable().optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  district: z.string().trim().max(100).nullable().optional(),
  postalCode: z
    .string()
    .trim()
    .refine((val) => !val || /^[1-9][0-9]{5}$/.test(val) || /^[a-zA-Z0-9\s\-]{3,10}$/.test(val), {
      message: "Invalid postal code format",
    })
    .nullable()
    .optional(),
  emergencyContactName: z.string().trim().max(100).nullable().optional(),
  emergencyContactRelationship: z.string().trim().max(50).nullable().optional(),
  emergencyContactPhone: z
    .union([z.string(), z.null(), z.undefined()])
    .transform(normalizePhoneE164)
    .refine((val) => val === null || val === undefined || E164_PHONE_REGEX.test(val), {
      message: "Emergency contact phone must conform to E.164 international standard (e.g. +919876543210)",
    })
    .optional(),
}).passthrough();

export const updateEmployeeSchema = createEmployeeSchema.partial();
