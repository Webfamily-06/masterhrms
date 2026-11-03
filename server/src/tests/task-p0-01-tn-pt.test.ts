import assert from "assert";
import { calculateProfessionalTax } from "../services/payroll-engine.service";

console.log("================================================================================");
console.log("TASK-P0-01 TEST: Tamil Nadu Professional Tax Slab Verification");
console.log("================================================================================");

// Case 1: Gross <= 21,000 half-yearly (monthly <= 3,500) -> 0
const pt0 = calculateProfessionalTax(3000, "TN", 1);
assert.strictEqual(pt0, 0, `Expected 0 for 3,000 monthly gross, got ${pt0}`);
console.log(`✓ Monthly gross ₹3,000 -> PT: ₹${pt0} (Nil)`);

// Case 2: Gross in 21,001 - 30,000 half-yearly (e.g. 4,500/mo = 27,000 HY) -> 100/6 = 16.67
const pt1 = calculateProfessionalTax(4500, "TN", 1);
assert.strictEqual(pt1, 16.67, `Expected 16.67 for 4,500 monthly gross, got ${pt1}`);
console.log(`✓ Monthly gross ₹4,500 -> PT: ₹${pt1} (Half-yearly ₹100 / 6)`);

// Case 3: Gross in 30,001 - 45,000 half-yearly (e.g. 6,000/mo = 36,000 HY) -> 235/6 = 39.17
const pt2 = calculateProfessionalTax(6000, "TN", 1);
assert.strictEqual(pt2, 39.17, `Expected 39.17 for 6,000 monthly gross, got ${pt2}`);
console.log(`✓ Monthly gross ₹6,000 -> PT: ₹${pt2} (Half-yearly ₹235 / 6)`);

// Case 4: Gross in 45,001 - 60,000 half-yearly (e.g. 9,000/mo = 54,000 HY) -> 510/6 = 85.00
const pt3 = calculateProfessionalTax(9000, "TN", 1);
assert.strictEqual(pt3, 85.00, `Expected 85.00 for 9,000 monthly gross, got ${pt3}`);
console.log(`✓ Monthly gross ₹9,000 -> PT: ₹${pt3} (Half-yearly ₹510 / 6)`);

// Case 5: Gross in 60,001 - 75,000 half-yearly (e.g. 11,000/mo = 66,000 HY) -> 760/6 = 126.67
const pt4 = calculateProfessionalTax(11000, "TN", 1);
assert.strictEqual(pt4, 126.67, `Expected 126.67 for 11,000 monthly gross, got ${pt4}`);
console.log(`✓ Monthly gross ₹11,000 -> PT: ₹${pt4} (Half-yearly ₹760 / 6)`);

// Case 6: Gross > 75,000 half-yearly (e.g. ₹55,000/mo = 3,30,000 HY) -> 1,250/6 = 208.33
const pt5 = calculateProfessionalTax(55000, "TN", 1);
assert.strictEqual(pt5, 208.33, `Expected 208.33 for 55,000 monthly gross, got ${pt5}`);
console.log(`✓ Monthly gross ₹55,000 -> PT: ₹${pt5} (NO INVERSION: Deducts ₹208.33 instead of faulty ₹510)`);

// Case 7: High earner gross ₹1,00,000/mo -> 1,250/6 = 208.33
const pt6 = calculateProfessionalTax(100000, "TN", 1);
assert.strictEqual(pt6, 208.33, `Expected 208.33 for 1,00,000 monthly gross, got ${pt6}`);
console.log(`✓ Monthly gross ₹1,00,000 -> PT: ₹${pt6} (Matches constitutional ceiling)`);

// Verify Annual Ceiling under Article 276(2)
const annualDeduction = pt6 * 12;
assert.ok(annualDeduction <= 2500, `Annual deduction ${annualDeduction} exceeds Art. 276(2) ceiling of ₹2,500`);
console.log(`✓ Annual PT deduction: ₹${annualDeduction.toFixed(2)} <= ₹2,500.00 Constitutional Ceiling`);

console.log("================================================================================");
console.log("ALL TASK-P0-01 TEST CASES PASSED SUCCESSFULLY!");
console.log("================================================================================");

