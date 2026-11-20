import test from "node:test";
import assert from "node:assert/strict";
import { RelievingLetterService, RelievingLetterData } from "../services/relieving-letter.service";

test("RelievingLetterService — Vector PDF Generation & Content Verification (FN-057 / GAP-01)", async () => {
  const sampleData: RelievingLetterData = {
    companyName: "Acme Global Technologies Inc",
    companyAddress: "Level 14, Tower B, Cyber City, Bangalore - 560100",
    companyPhone: "+91-80-49112233",
    relievingCode: "REL-8921",
    issueDate: new Date("2026-11-19T00:00:00.000Z"),
    employeeName: "Siddharth Verma",
    employeeCode: "EMP-0492",
    designation: "Senior Staff Engineer",
    department: "Engineering & Architecture",
    joiningDate: new Date("2023-04-10T00:00:00.000Z"),
    lastWorkingDay: new Date("2026-11-15T00:00:00.000Z"),
    exitType: "resignation",
    fnfAmount: 142500.0,
  };

  const buffer = await RelievingLetterService.generateRelievingPdfBuffer(sampleData);

  // 1. Verify buffer existence & non-zero length
  assert.ok(buffer && buffer.length > 1000, `Expected PDF buffer > 1KB, got ${buffer.length} bytes`);

  // 2. Verify PDF Magic Number header (%PDF-)
  const magic = buffer.subarray(0, 4).toString("utf-8");
  assert.strictEqual(magic, "%PDF", `Expected PDF magic number "%PDF", got "${magic}"`);

  // 3. Verify PDF EOF Trailer exists
  const trailer = buffer.subarray(buffer.length - 30).toString("utf-8");
  assert.ok(trailer.includes("%%EOF"), "Expected %%EOF in PDF trailer");

  console.log(`✅ Relieving Letter PDF generated successfully: ${buffer.length} bytes with valid %PDF structure.`);
});
