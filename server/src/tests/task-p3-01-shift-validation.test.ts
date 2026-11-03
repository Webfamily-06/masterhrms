/**
 * TASK-P3-01: Shift Creation Time Format & Duration Validation Tests (GAP-VAL-012)
 */

import assert from "node:assert";
import {
  TIME_24H_REGEX,
  normalizeTimeString,
  calculateShiftDurationMinutes,
  createShiftSchema,
  updateShiftSchema,
} from "../schemas/shift.schema";

async function runShiftValidationTests() {
  console.log("================================================================================");
  console.log("TASK-P3-01: SHIFT CREATION TIME FORMAT & DURATION VALIDATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ [FAIL] ${name}:`, e.message);
      throw e;
    }
  }

  // 1. Time string normalization
  test("Normalizes single-digit hour: '9:30' -> '09:30'", () => {
    assert.strictEqual(normalizeTimeString("9:30"), "09:30");
    assert.strictEqual(normalizeTimeString("09:30"), "09:30");
    assert.strictEqual(normalizeTimeString(" 8:15 "), "08:15");
  });

  // 2. 24-hour time regex verification
  test("Rejects invalid 24-hour formats", () => {
    const invalid = ["25:00", "12:60", "99:99", "12:0", "12:000", "9:00am", "random"];
    for (const val of invalid) {
      assert.strictEqual(TIME_24H_REGEX.test(val), false, `Should reject ${val}`);
    }
  });

  test("Accepts valid 24-hour formats", () => {
    const valid = ["00:00", "09:30", "12:00", "18:45", "23:59"];
    for (const val of valid) {
      assert.strictEqual(TIME_24H_REGEX.test(val), true, `Should accept ${val}`);
    }
  });

  // 3. Shift duration calculation
  test("Calculates standard shift duration", () => {
    // 09:30 to 18:30 = 9 hours = 540 minutes
    const dur = calculateShiftDurationMinutes("09:30", "18:30");
    assert.strictEqual(dur, 540);
  });

  test("Calculates overnight shift duration crossing midnight", () => {
    // 22:00 to 06:00 = 8 hours = 480 minutes
    const dur = calculateShiftDurationMinutes("22:00", "06:00");
    assert.strictEqual(dur, 480);
  });

  // 4. Schema validation on createShiftSchema
  test("Rejects shift creation when breakMinutes >= totalShiftMinutes", () => {
    const res = createShiftSchema.safeParse({
      name: "Short Shift",
      code: "SHORT",
      startTime: "09:00",
      endTime: "10:00", // 60 minutes
      breakMinutes: 90, // 90 > 60
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.issues.some((i) => i.message.includes("breakMinutes must be strictly less")));
  });

  test("Accepts valid shift creation with auto-padded time and proper break duration", () => {
    const res = createShiftSchema.safeParse({
      name: "Morning Shift",
      code: "MORN",
      startTime: "9:00", // auto-pads to 09:00
      endTime: "17:30",
      breakMinutes: 45,
      allowance: 200,
    });
    assert.strictEqual(res.success, true);
    if (res.success) {
      assert.strictEqual(res.data.startTime, "09:00");
      assert.strictEqual(res.data.endTime, "17:30");
      assert.strictEqual(res.data.breakMinutes, 45);
      assert.strictEqual(res.data.code, "MORN");
    }
  });

  test("Rejects malformed time in updateShiftSchema", () => {
    const res = updateShiftSchema.safeParse({
      startTime: "26:15",
    });
    assert.strictEqual(res.success, false);
  });

  console.log("\n================================================================================");
  console.log(`TASK-P3-01 RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runShiftValidationTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});

