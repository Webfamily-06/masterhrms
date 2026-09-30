import { describe, it, expect } from "vitest";
import { pastelCardTokens } from "../../../src/components/ui/card";

describe("Tier 2 (P1) Design System & Component Unification", () => {
  describe("Group 2.1: DataTable Logic & Algorithms", () => {
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
    ) {
      const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const startIndex = (safePage - 1) * pageSize;
      const paginated = data.slice(startIndex, startIndex + pageSize);
      const startRecord = data.length === 0 ? 0 : startIndex + 1;
      const endRecord = Math.min(safePage * pageSize, data.length);

      return { paginated, totalPages, startRecord, endRecord };
    }

    it("1. Correctly filters across multi-column fields and ignores case", () => {
      const data = [
        { id: "1", name: "Alice Johnson", role: "Developer", email: "alice@tech.io" },
        { id: "2", name: "Bob Smith", role: "Designer", email: "bob@design.co" },
        { id: "3", name: "Charlie Adams", role: "DevOps Lead", email: "charlie@cloud.net" },
      ];
      const columns = [{ key: "name" }, { key: "role" }, { key: "email" }];

      const devMatches = filterData(data, "dev", columns);
      expect(devMatches).toHaveLength(2);
      expect(devMatches.map((m) => m.name)).toEqual(["Alice Johnson", "Charlie Adams"]);

      const emailMatches = filterData(data, "design.co", columns);
      expect(emailMatches).toHaveLength(1);
      expect(emailMatches[0].name).toBe("Bob Smith");

      const noMatches = filterData(data, "cybersecurity", columns);
      expect(noMatches).toHaveLength(0);
    });

    it("2. Correctly sorts alphabetical and numerical values in asc and desc", () => {
      const data = [
        { id: "1", name: "Gamma", priority: 3 },
        { id: "2", name: "Alpha", priority: 1 },
        { id: "3", name: "Beta", priority: 2 },
      ];

      const sortedNameAsc = sortData(data, "name", "asc");
      expect(sortedNameAsc.map((d) => d.name)).toEqual(["Alpha", "Beta", "Gamma"]);

      const sortedNameDesc = sortData(data, "name", "desc");
      expect(sortedNameDesc.map((d) => d.name)).toEqual(["Gamma", "Beta", "Alpha"]);

      const sortedPriorityAsc = sortData(data, "priority", "asc");
      expect(sortedPriorityAsc.map((d) => d.name)).toEqual(["Alpha", "Beta", "Gamma"]);

      const sortedPriorityDesc = sortData(data, "priority", "desc");
      expect(sortedPriorityDesc.map((d) => d.name)).toEqual(["Gamma", "Beta", "Alpha"]);
    });

    it("3. Handles pagination slicing, total pages, and record counter ranges", () => {
      const data = Array.from({ length: 35 }, (_, i) => ({ id: i + 1, name: `Record ${i + 1}` }));

      const page1 = paginateData(data, 1, 10);
      expect(page1.paginated).toHaveLength(10);
      expect(page1.totalPages).toBe(4);
      expect(page1.startRecord).toBe(1);
      expect(page1.endRecord).toBe(10);

      const page4 = paginateData(data, 4, 10);
      expect(page4.paginated).toHaveLength(5);
      expect(page4.startRecord).toBe(31);
      expect(page4.endRecord).toBe(35);
    });
  });

  describe("Group 2.2: LineItem Financial Calculations", () => {
    function computeLineItem(item: {
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount: number;
      discountType?: "fixed" | "percent";
    }) {
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

    function computeSummary(items: Array<{
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount: number;
      discountType?: "fixed" | "percent";
    }>) {
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

    it("4. Correctly computes line items with fixed discount and GST", () => {
      const res = computeLineItem({
        quantity: 3,
        unitPrice: 1000,
        taxRate: 18,
        discount: 300,
        discountType: "fixed",
      });
      // Base: 3000, discount: 300 -> subtotal: 2700, tax: 486, total: 3186
      expect(res.subtotal).toBe(2700);
      expect(res.taxAmount).toBe(486);
      expect(res.total).toBe(3186);
    });

    it("5. Correctly computes line items with percentage discount and GST", () => {
      const res = computeLineItem({
        quantity: 5,
        unitPrice: 200,
        taxRate: 12,
        discount: 15, // 15%
        discountType: "percent",
      });
      // Base: 1000, discount: 150 -> subtotal: 850, tax: 102, total: 952
      expect(res.subtotal).toBe(850);
      expect(res.taxAmount).toBe(102);
      expect(res.total).toBe(952);
    });

    it("6. Clamps subtotal at zero if discount exceeds base price", () => {
      const res = computeLineItem({
        quantity: 1,
        unitPrice: 100,
        taxRate: 18,
        discount: 500,
        discountType: "fixed",
      });
      expect(res.subtotal).toBe(0);
      expect(res.taxAmount).toBe(0);
      expect(res.total).toBe(0);
    });

    it("7. Aggregates multi-item financial summary with precision", () => {
      const items = [
        {
          quantity: 2,
          unitPrice: 500,
          taxRate: 18,
          discount: 10,
          discountType: "percent" as const, // base 1000, disc 100, subtotal 900, tax 162, total 1062
        },
        {
          quantity: 1,
          unitPrice: 2000,
          taxRate: 12,
          discount: 200,
          discountType: "fixed" as const, // base 2000, disc 200, subtotal 1800, tax 216, total 2016
        },
      ];

      const summary = computeSummary(items);
      expect(summary.grossSubtotal).toBe(3000);
      expect(summary.totalDiscount).toBe(300);
      expect(summary.netSubtotal).toBe(2700);
      expect(summary.totalTax).toBe(378);
      expect(summary.grandTotal).toBe(3078);
    });
  });

  describe("Group 2.3: Visual Palette Tokens", () => {
    it("8. Validates pastel card tokens exist for corporate aesthetics", () => {
      expect(pastelCardTokens.blue).toContain("from-blue-50");
      expect(pastelCardTokens.green).toContain("from-green-50");
      expect(pastelCardTokens.orange).toContain("from-orange-50");
      expect(pastelCardTokens.purple).toContain("from-purple-50");
    });
  });
});
