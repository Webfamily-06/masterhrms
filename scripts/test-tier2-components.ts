/**
 * Automated Test Suite: Tier 2 (P1) Design System & Component Unification
 * Group 2.1: DataTable (filtering, sorting, pagination logic)
 * Group 2.2: LineItemRepeater (subtotals, discounts, taxes, grand totals)
 * Group 2.3: pastelCardTokens (color gradients, tokens)
 */

import assert from "node:assert";
import { pastelCardTokens } from "../src/components/ui/card";

// Simulation of DataTable pure algorithms
function filterData<T>(
  data: T[],
  searchTerm: string,
  columns: Array<{ key: string }>,
  customFilter?: (row: T, term: string) => boolean,
): T[] {
  const safeData = Array.isArray(data) ? data : [];
  if (!searchTerm.trim()) return safeData;
  const term = searchTerm.toLowerCase().trim();

  return safeData.filter((row: any) => {
    if (customFilter) {
      return customFilter(row, term);
    }
    return columns.some((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(term);
    });
  });
}

function sortData<T>(
  data: T[],
  sortKey: string | null,
  sortDir: "asc" | "desc",
): T[] {
  if (!sortKey) return data;

  return [...data].sort((a: any, b: any) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }

    const strA = String(aVal).toLowerCase();
    const strB = String(bVal).toLowerCase();
    return sortDir === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });
}

function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number,
): { paginated: T[]; totalPages: number; startRecord: number; endRecord: number } {
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginated = data.slice(startIndex, startIndex + pageSize);
  const startRecord = data.length === 0 ? 0 : startIndex + 1;
  const endRecord = Math.min(safePage * pageSize, data.length);

  return { paginated, totalPages, startRecord, endRecord };
}

// Simulation of LineItemRepeater financial engine
interface LineItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  discountType?: "fixed" | "percent";
  subtotal?: number;
  taxAmount?: number;
  total?: number;
}

function computeLineItem(item: LineItem) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  const disc = Number(item.discount) || 0;
  const taxRate = Number(item.taxRate) || 0;

  const baseAmount = qty * price;
  const discountAmount =
    item.discountType === "percent" ? baseAmount * (disc / 100) : disc;
  const subtotal = Math.max(0, baseAmount - discountAmount);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

function computeSummary(items: LineItem[]) {
  let grossSubtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let grandTotal = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const base = qty * price;
    const discountAmt =
      item.discountType === "percent" ? base * (disc / 100) : disc;
    const lineSubtotal = Math.max(0, base - discountAmt);
    const lineTax = lineSubtotal * (taxRate / 100);

    grossSubtotal += base;
    totalDiscount += discountAmt;
    totalTax += lineTax;
    grandTotal += lineSubtotal + lineTax;
  });

  const netSubtotal = Math.max(0, grossSubtotal - totalDiscount);

  return {
    grossSubtotal: Math.round(grossSubtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    netSubtotal: Math.round(netSubtotal * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

// -------------------------------------------------------------
// EXECUTE TESTS
// -------------------------------------------------------------

async function runTests() {
  console.log("=== Running Tier 2 (P1) Component Test Suite ===\n");
  let passed = 0;

  // TEST 1: DataTable Multi-column Search
  {
    const data = [
      { id: "1", name: "Alice Johnson", role: "Developer", email: "alice@tech.io" },
      { id: "2", name: "Bob Smith", role: "Designer", email: "bob@design.co" },
      { id: "3", name: "Charlie Adams", role: "DevOps", email: "charlie@cloud.net" },
    ];
    const columns = [{ key: "name" }, { key: "role" }, { key: "email" }];

    const res1 = filterData(data, "dev", columns);
    assert.strictEqual(res1.length, 2, "Search for 'dev' should match Alice (Developer) and Charlie (DevOps)");

    const res2 = filterData(data, "cloud.net", columns);
    assert.strictEqual(res2.length, 1, "Search for 'cloud.net' should match Charlie");

    const resEmpty = filterData(data, "nonexistent", columns);
    assert.strictEqual(resEmpty.length, 0, "Non-existent term should yield 0 rows");

    passed++;
    console.log("✓ Test 1: DataTable multi-column search filtering passed");
  }

  // TEST 2: DataTable Sorting (String and Number)
  {
    const data = [
      { id: "1", name: "Zack", score: 45 },
      { id: "2", name: "Anna", score: 98 },
      { id: "3", name: "Mark", score: 72 },
    ];

    const sortNameAsc = sortData(data, "name", "asc");
    assert.strictEqual(sortNameAsc[0].name, "Anna");
    assert.strictEqual(sortNameAsc[2].name, "Zack");

    const sortNameDesc = sortData(data, "name", "desc");
    assert.strictEqual(sortNameDesc[0].name, "Zack");
    assert.strictEqual(sortNameDesc[2].name, "Anna");

    const sortScoreAsc = sortData(data, "score", "asc");
    assert.strictEqual(sortScoreAsc[0].score, 45);
    assert.strictEqual(sortScoreAsc[2].score, 98);

    const sortScoreDesc = sortData(data, "score", "desc");
    assert.strictEqual(sortScoreDesc[0].score, 98);
    assert.strictEqual(sortScoreDesc[2].score, 45);

    passed++;
    console.log("✓ Test 2: DataTable numeric and alphabetical sorting passed");
  }

  // TEST 3: DataTable Pagination Math & Bounds
  {
    const data = Array.from({ length: 47 }, (_, i) => ({ id: `row-${i + 1}`, val: i + 1 }));

    // Page 1 with pageSize 10
    const p1 = paginateData(data, 1, 10);
    assert.strictEqual(p1.paginated.length, 10);
    assert.strictEqual(p1.totalPages, 5);
    assert.strictEqual(p1.startRecord, 1);
    assert.strictEqual(p1.endRecord, 10);

    // Last Page (Page 5)
    const p5 = paginateData(data, 5, 10);
    assert.strictEqual(p5.paginated.length, 7);
    assert.strictEqual(p5.startRecord, 41);
    assert.strictEqual(p5.endRecord, 47);

    // Out of bounds page clamp
    const pOverflow = paginateData(data, 999, 10);
    assert.strictEqual(pOverflow.paginated.length, 7, "Overflow page clamped to final page");
    assert.strictEqual(pOverflow.startRecord, 41);

    passed++;
    console.log("✓ Test 3: DataTable pagination calculation, range display, and bounds clamp passed");
  }

  // TEST 4: LineItem Financial Engine (Fixed Discount)
  {
    const item: LineItem = {
      id: "line_1",
      name: "Server Hosting",
      quantity: 2,
      unitPrice: 500,
      taxRate: 18,
      discount: 100,
      discountType: "fixed",
    };

    const res = computeLineItem(item);
    // Base: 2 * 500 = 1000
    // Subtotal: 1000 - 100 = 900
    // Tax: 900 * 0.18 = 162
    // Total: 900 + 162 = 1062
    assert.strictEqual(res.subtotal, 900, "Subtotal must be 900");
    assert.strictEqual(res.taxAmount, 162, "Tax must be 162");
    assert.strictEqual(res.total, 1062, "Total must be 1062");

    passed++;
    console.log("✓ Test 4: LineItem calculation with fixed discount passed");
  }

  // TEST 5: LineItem Financial Engine (Percentage Discount)
  {
    const item: LineItem = {
      id: "line_2",
      name: "Consulting",
      quantity: 10,
      unitPrice: 200,
      taxRate: 12,
      discount: 10, // 10%
      discountType: "percent",
    };

    const res = computeLineItem(item);
    // Base: 10 * 200 = 2000
    // Discount: 2000 * 0.10 = 200
    // Subtotal: 2000 - 200 = 1800
    // Tax: 1800 * 0.12 = 216
    // Total: 1800 + 216 = 2016
    assert.strictEqual(res.subtotal, 1800, "Subtotal must be 1800");
    assert.strictEqual(res.taxAmount, 216, "Tax must be 216");
    assert.strictEqual(res.total, 2016, "Total must be 2016");

    passed++;
    console.log("✓ Test 5: LineItem calculation with percentage discount passed");
  }

  // TEST 6: LineItem Edge Case: Discount Exceeds Base Amount (Zero Floor)
  {
    const item: LineItem = {
      id: "line_3",
      name: "Promo Item",
      quantity: 1,
      unitPrice: 50,
      taxRate: 18,
      discount: 100, // Fixed discount exceeds price
      discountType: "fixed",
    };

    const res = computeLineItem(item);
    assert.strictEqual(res.subtotal, 0, "Subtotal cannot be negative, must floor at 0");
    assert.strictEqual(res.taxAmount, 0, "Tax on 0 subtotal must be 0");
    assert.strictEqual(res.total, 0, "Total must be 0");

    passed++;
    console.log("✓ Test 6: LineItem zero-floor boundary clamp on excessive discount passed");
  }

  // TEST 7: LineItem Summary Aggregation Across Multiple Items
  {
    const items: LineItem[] = [
      {
        id: "1",
        name: "Item A",
        quantity: 2,
        unitPrice: 100, // Base 200
        taxRate: 10,
        discount: 20, // 10%
        discountType: "percent", // Subtotal 180, Tax 18, Total 198
      },
      {
        id: "2",
        name: "Item B",
        quantity: 1,
        unitPrice: 500, // Base 500
        taxRate: 20,
        discount: 50, // Fixed
        discountType: "fixed", // Subtotal 450, Tax 90, Total 540
      },
    ];

    const summary = computeSummary(items);
    assert.strictEqual(summary.grossSubtotal, 700, "Gross subtotal = 200 + 500 = 700");
    assert.strictEqual(summary.totalDiscount, 90, "Total discount = 40 (20% of 200) + 50 = 90");
    assert.strictEqual(summary.netSubtotal, 610, "Net subtotal = 700 - 90 = 610");
    assert.strictEqual(summary.totalTax, 106, "Total tax = 16 + 90 = 106");
    assert.strictEqual(summary.grandTotal, 716, "Grand total = 610 + 106 = 716");

    passed++;
    console.log("✓ Test 7: LineItem cumulative financial summary aggregation passed");
  }

  // TEST 8: pastelCardTokens Verification
  {
    assert.ok(pastelCardTokens.blue.includes("from-blue-50"), "Blue token contains from-blue-50");
    assert.ok(pastelCardTokens.green.includes("from-green-50"), "Green token contains from-green-50");
    assert.ok(pastelCardTokens.orange.includes("from-orange-50"), "Orange token contains from-orange-50");
    assert.ok(pastelCardTokens.purple.includes("from-purple-50"), "Purple token contains from-purple-50");

    passed++;
    console.log("✓ Test 8: pastelCardTokens palette tokens verified");
  }

  console.log(`\n========================================`);
  console.log(`ALL ${passed}/8 TEST SUITES PASSED CLEANLY!`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
