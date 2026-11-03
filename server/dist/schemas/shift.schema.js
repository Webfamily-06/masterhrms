"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateShiftSchema = exports.createShiftSchema = exports.TIME_24H_REGEX = void 0;
exports.normalizeTimeString = normalizeTimeString;
exports.calculateShiftDurationMinutes = calculateShiftDurationMinutes;
const zod_1 = require("zod");
exports.TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
/**
 * Normalizes time string: pads single-digit hour "9:30" -> "09:30"
 */
function normalizeTimeString(val) {
    if (typeof val !== "string")
        return "";
    let trimmed = val.trim();
    if (/^\d:[0-5]\d$/.test(trimmed)) {
        trimmed = "0" + trimmed;
    }
    return trimmed;
}
/**
 * Calculates duration between two 24h time strings in minutes
 * Accurately supports overnight shifts (e.g. 22:00 -> 06:00 = 8h = 480m)
 */
function calculateShiftDurationMinutes(startTime, endTime) {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes <= 0 && !(startH === endH && startM === endM)) {
        totalMinutes += 24 * 60; // Crosses midnight
    }
    return totalMinutes;
}
exports.createShiftSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1, "Shift name is required").max(100, "Shift name cannot exceed 100 characters"),
    code: zod_1.z.string().trim().min(1, "Shift code is required").max(50, "Shift code cannot exceed 50 characters").toUpperCase(),
    startTime: zod_1.z
        .string()
        .transform(normalizeTimeString)
        .refine((val) => exports.TIME_24H_REGEX.test(val), {
        message: "startTime must be a valid 24-hour time format (HH:mm) between 00:00 and 23:59",
    })
        .default("09:30"),
    endTime: zod_1.z
        .string()
        .transform(normalizeTimeString)
        .refine((val) => exports.TIME_24H_REGEX.test(val), {
        message: "endTime must be a valid 24-hour time format (HH:mm) between 00:00 and 23:59",
    })
        .default("18:30"),
    breakMinutes: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((val) => Number(val))
        .refine((num) => !isNaN(num) && num >= 0 && num <= 480, {
        message: "breakMinutes must be a number between 0 and 480",
    })
        .default(60),
    allowance: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((val) => Number(val))
        .refine((num) => !isNaN(num) && num >= 0, {
        message: "allowance must be a non-negative number",
    })
        .default(0),
    isOvertimeEligible: zod_1.z.boolean().optional().default(true),
    color: zod_1.z.string().trim().max(50).optional().default("blue"),
})
    .refine((data) => {
    const duration = calculateShiftDurationMinutes(data.startTime, data.endTime);
    // If it's not a 0-duration shift (like Weekly Off 00:00 - 00:00), break must be less than duration
    if (duration > 0 && data.breakMinutes >= duration) {
        return false;
    }
    return true;
}, {
    message: "breakMinutes must be strictly less than total shift duration",
    path: ["breakMinutes"],
});
exports.updateShiftSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(100).optional(),
    code: zod_1.z.string().trim().min(1).max(50).toUpperCase().optional(),
    startTime: zod_1.z
        .string()
        .transform(normalizeTimeString)
        .refine((val) => exports.TIME_24H_REGEX.test(val), {
        message: "startTime must be a valid 24-hour time format (HH:mm)",
    })
        .optional(),
    endTime: zod_1.z
        .string()
        .transform(normalizeTimeString)
        .refine((val) => exports.TIME_24H_REGEX.test(val), {
        message: "endTime must be a valid 24-hour time format (HH:mm)",
    })
        .optional(),
    breakMinutes: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((val) => Number(val))
        .refine((num) => !isNaN(num) && num >= 0 && num <= 480, {
        message: "breakMinutes must be a number between 0 and 480",
    })
        .optional(),
    allowance: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((val) => Number(val))
        .refine((num) => !isNaN(num) && num >= 0, {
        message: "allowance must be a non-negative number",
    })
        .optional(),
    isOvertimeEligible: zod_1.z.boolean().optional(),
    color: zod_1.z.string().trim().max(50).optional(),
});
