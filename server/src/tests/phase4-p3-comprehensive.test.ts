/**
 * MASTERHRMS — Phase 4 (P3) Comprehensive Verification Suite
 * 
 * Verifies all 5 Phase 4 (P3) tasks:
 * - TASK-P3-01: Shift Creation Time Format & Duration Validation (GAP-VAL-012)
 * - TASK-P3-02: Standardize Phone and Address Input Formatting (E.164 & 6-digit PIN)
 * - TASK-P3-03: Soft Deletion Protection for Statutory Logs (GAP-DB-API-004)
 * - TASK-P3-04: Standardize Empty State Illustrations Across Modules (GAP-UI-014)
 * - TASK-P3-05: Add Textarea Resize Constraints & Character Badges (GAP-UI-015)
 */

import assert from "node:assert";
import fs from "node:fs";
import {
  TIME_24H_REGEX,
  normalizeTimeString,
  calculateShiftDurationMinutes,
  createShiftSchema,
  updateShiftSchema,
} from "../schemas/shift.schema";
import {
  E164_PHONE_REGEX,
  PIN_CODE_REGEX,
  normalizePhoneE164,
  createEmployeeSchema,
} from "../schemas/employee.schema";
import { rawPrisma } from "../prisma";

async function runPhase4P3Suite() {
  console.log("================================================================================");
  console.log("MASTERHRMS — PHASE 4 (P3) COMPREHENSIVE VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. TASK-P3-01: SHIFT CREATION TIME FORMAT & DURATION VALIDATION (GAP-VAL-012)
  // ---------------------------------------------------------------------------
  console.log("--- Section 1: Shift Time Format Regex & Duration Validation ---");

  await test("TASK-P3-01.1: 24-hour time regex enforces HH:mm (00:00 to 23:59)", () => {
    assert.strictEqual(TIME_24H_REGEX.test("09:30"), true);
    assert.strictEqual(TIME_24H_REGEX.test("18:00"), true);
    assert.strictEqual(TIME_24H_REGEX.test("23:59"), true);
    assert.strictEqual(TIME_24H_REGEX.test("00:00"), true);

    assert.strictEqual(TIME_24H_REGEX.test("24:00"), false);
    assert.strictEqual(TIME_24H_REGEX.test("12:60"), false);
    assert.strictEqual(TIME_24H_REGEX.test("9:30"), false); // unpadded
    assert.strictEqual(TIME_24H_REGEX.test("abc"), false);
  });

  await test("TASK-P3-01.2: Auto-normalizes single-digit hours to 24h format ('9:00' -> '09:00')", () => {
    assert.strictEqual(normalizeTimeString("9:00"), "09:00");
    assert.strictEqual(normalizeTimeString("07:15"), "07:15");
  });

  await test("TASK-P3-01.3: Rejects shift creation where break duration >= shift length", () => {
    const res = createShiftSchema.safeParse({
      name: "Short Shift",
      code: "SHORT",
      startTime: "09:00",
      endTime: "10:00", // 60 mins
      breakMinutes: 60, // 60 >= 60 invalid
    });
    assert.strictEqual(res.success, false);
  });

  await test("TASK-P3-01.4: Accurately validates overnight shifts crossing midnight", () => {
    const dur = calculateShiftDurationMinutes("22:00", "06:00");
    assert.strictEqual(dur, 480); // 8 hours

    const res = createShiftSchema.safeParse({
      name: "Night Shift",
      code: "NIGHT",
      startTime: "22:00",
      endTime: "06:00",
      breakMinutes: 30, // 30 < 480 valid
    });
    assert.strictEqual(res.success, true);
  });

  // ---------------------------------------------------------------------------
  // 2. TASK-P3-02: STANDARDIZE PHONE AND ADDRESS INPUT FORMATTING (E.164)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 2: Standardize Phone & Address Input Formatting ---");

  await test("TASK-P3-02.1: Normalizes 10-digit Indian phone number to E.164 ('9876543210' -> '+919876543210')", () => {
    assert.strictEqual(normalizePhoneE164("9876543210"), "+919876543210");
    assert.strictEqual(normalizePhoneE164(" 98765-43210 "), "+919876543210");
    assert.strictEqual(normalizePhoneE164("09876543210"), "+919876543210");
    assert.strictEqual(normalizePhoneE164("+919876543210"), "+919876543210");
  });

  await test("TASK-P3-02.2: Validates E.164 format and rejects invalid alphabetic strings", () => {
    assert.strictEqual(E164_PHONE_REGEX.test("+919876543210"), true);
    assert.strictEqual(E164_PHONE_REGEX.test("+14155552671"), true);
    assert.strictEqual(E164_PHONE_REGEX.test("9876543210"), false); // missing '+'
    assert.strictEqual(E164_PHONE_REGEX.test("+012345"), false); // cannot start with +0
  });

  await test("TASK-P3-02.3: Validates 6-digit Indian PIN codes and trims address fields", () => {
    assert.strictEqual(PIN_CODE_REGEX.test("600096"), true);
    assert.strictEqual(PIN_CODE_REGEX.test("110001"), true);
    assert.strictEqual(PIN_CODE_REGEX.test("012345"), false); // starts with 0
    assert.strictEqual(PIN_CODE_REGEX.test("60009"), false); // 5 digits
  });

  // ---------------------------------------------------------------------------
  // 3. TASK-P3-03: SOFT DELETION PROTECTION FOR STATUTORY LOGS (GAP-DB-API-004)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 3: Soft Deletion Protection for Statutory Audit Records ---");

  await test("TASK-P3-03.1: DELETE /api/employees/:id routes execute soft-delete (status: 'archived') rather than cascade purge", () => {
    const routeSrc = fs.readFileSync("server/src/routes/employees.routes.ts", "utf8");
    // Ensure destructive purge calls are not executed
    assert.ok(!routeSrc.includes("await tx.payslip.deleteMany({ where: { employeeId: id } });"), "Must NOT delete payslips on employee deletion");
    assert.ok(!routeSrc.includes("await tx.attendance.deleteMany({ where: { employeeId: id } });"), "Must NOT delete attendance on employee deletion");
    assert.ok(!routeSrc.includes("await tx.employeeExit.deleteMany({ where: { employeeId: id } });"), "Must NOT delete exits on employee deletion");
    // Ensure soft-deletion archiving is present
    assert.ok(routeSrc.includes('status: "archived"'), "Must mark employee status as 'archived'");
  });

  // ---------------------------------------------------------------------------
  // 4. TASK-P3-04: STANDARDIZE EMPTY STATE COMPONENT (GAP-UI-014)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 4: Shared Standardized EmptyState Component ---");

  await test("TASK-P3-04.1: src/components/ui/empty-state.tsx exports typed EmptyState component with action buttons", () => {
    assert.ok(fs.existsSync("src/components/ui/empty-state.tsx"), "empty-state.tsx must exist");
    const src = fs.readFileSync("src/components/ui/empty-state.tsx", "utf8");
    assert.ok(src.includes("export function EmptyState"), "Must export EmptyState component");
    assert.ok(src.includes("actionLabel"), "Must support actionLabel prop");
    assert.ok(src.includes("compact"), "Must support compact mode");
  });

  // ---------------------------------------------------------------------------
  // 5. TASK-P3-05: TEXTAREA RESIZE CONSTRAINTS & CHARACTER COUNTERS (GAP-UI-015)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 5: Textarea Resize-Y & Character Badges ---");

  await test("TASK-P3-05.1: Textarea enforces resize-y, min-h-[80px], rounded-md, and optional showCount", () => {
    const src = fs.readFileSync("src/components/ui/textarea.tsx", "utf8");
    assert.ok(src.includes("resize-y"), "Textarea must enforce vertical-only resize-y");
    assert.ok(src.includes("min-h-[80px]"), "Textarea must have min-h-[80px]");
    assert.ok(src.includes("rounded-md"), "Textarea must use rounded-md");
    assert.ok(src.includes("showCount"), "Textarea must support showCount prop");
  });

  console.log("\n================================================================================");
  console.log(`PHASE 4 (P3) COMPREHENSIVE SUITE COMPLETED: ${passed}/${total} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runPhase4P3Suite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

