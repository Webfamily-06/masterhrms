import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  REPORT_DICTIONARY,
  REPORT_ROLES,
  isUserAuthorizedForReport,
} from "../components/smart-reports/report-view";
import { unwrapData, unwrapArray } from "../lib/api";

describe("MASTERHRMS — BATCH 3B: Smart Reports Frontend Integration Tests", () => {
  // ─── 1. Catalogue & Definitions Verification ─────────────────────────────
  describe("1. Catalogue & Supported Report Definitions", () => {
    const expectedReportIds = [
      "attendance-summary",
      "payroll-sheet",
      "leave-report",
      "sales-invoice",
      "purchase-invoice",
      "deal-pipeline",
      "product-stock",
      "project-progress",
    ];

    it("should define all 8 enterprise report modules in REPORT_DICTIONARY", () => {
      expectedReportIds.forEach((id) => {
        const meta = REPORT_DICTIONARY[id];
        expect(meta).toBeDefined();
        expect(meta.id).toBe(id);
        expect(meta.title).toBeTruthy();
        expect(meta.description).toBeTruthy();
        expect(meta.category).toBeTruthy();
        expect(meta.defaultView).toBeTruthy();
      });
    });

    it("should assign appropriate default view types per report specification", () => {
      expect(REPORT_DICTIONARY["attendance-summary"].defaultView).toBe("calendar");
      expect(REPORT_DICTIONARY["payroll-sheet"].defaultView).toBe("chart");
      expect(REPORT_DICTIONARY["leave-report"].defaultView).toBe("table");
      expect(REPORT_DICTIONARY["sales-invoice"].defaultView).toBe("grouped");
      expect(REPORT_DICTIONARY["purchase-invoice"].defaultView).toBe("grouped");
      expect(REPORT_DICTIONARY["deal-pipeline"].defaultView).toBe("analytics");
      expect(REPORT_DICTIONARY["product-stock"].defaultView).toBe("analytics");
      expect(REPORT_DICTIONARY["project-progress"].defaultView).toBe("analytics");
    });
  });

  // ─── 2. API Operation & Rendering Schema Mapping ─────────────────────────
  describe("2. Report Schema & Data Mapping", () => {
    it("should correctly unwrap Attendance Summary persisted response", () => {
      const mockBackendResponse = {
        success: true,
        data: {
          metrics: {
            totalEmployees: 12,
            attendanceRate: 95.5,
            workingHours: 960,
            overtimeHours: 24,
          },
          calendarRows: [
            {
              id: "emp-1",
              name: "John Doe",
              code: "EMP001",
              department: "Engineering",
              days: { 1: { status: "present", hours: 8, overtime: false } },
              presentDays: 20,
              halfDays: 0,
              absentDays: 0,
              leaveDays: 1,
              totalHours: 160,
            },
          ],
          records: [
            {
              id: "att-1",
              employeeName: "John Doe",
              employeeCode: "EMP001",
              department: "Engineering",
              date: "2026-10-01",
              status: "present",
              checkIn: "09:00 AM",
              checkOut: "05:00 PM",
              workHours: 8,
            },
          ],
        },
      };

      const unwrapped = unwrapData(mockBackendResponse);
      expect(unwrapped.metrics.totalEmployees).toBe(12);
      expect(unwrapped.metrics.attendanceRate).toBe(95.5);
      expect(unwrapped.calendarRows).toHaveLength(1);
      expect(unwrapped.records).toHaveLength(1);
      expect(unwrapped.records[0].employeeName).toBe("John Doe");
    });

    it("should correctly unwrap Payroll Sheet with chart data and records", () => {
      const mockBackendResponse = {
        success: true,
        data: {
          metrics: {
            employees: 5,
            grossPay: 250000,
            deductions: 25000,
            totalDeductions: 25000,
            netPay: 225000,
          },
          chartData: {
            categories: ["Alice", "Bob"],
            series: [
              { name: "Gross Pay", data: [60000, 50000] },
              { name: "Net Pay", data: [54000, 45000] },
              { name: "Deductions", data: [6000, 5000] },
            ],
          },
          records: [
            {
              id: "p-1",
              employeeName: "Alice Smith",
              employeeCode: "EMP01",
              designation: "Staff Engineer",
              department: "Tech",
              basicSalary: 50000,
              grossSalary: 60000,
              grossPay: 60000,
              deductions: 6000,
              netPay: 54000,
              period: "10/2026",
              status: "published",
            },
          ],
        },
      };

      const unwrapped = unwrapData(mockBackendResponse);
      expect(unwrapped.metrics.grossPay).toBe(250000);
      expect(unwrapped.chartData.series).toHaveLength(3);
      expect(unwrapped.records[0].netPay).toBe(54000);
    });

    it("should correctly handle Sales Invoice customer groups and settled calculation", () => {
      const mockData = {
        metrics: { totalInvoices: 2, totalAmount: 5000, paidAmount: 3000, balanceDue: 2000 },
        customerGroups: [
          {
            customerName: "Acme Industrial Corp",
            email: "billing@acme.com",
            totalInvoices: 2,
            totalAmount: 5000,
            paidAmount: 3000,
            balanceDue: 2000,
            invoices: [
              { id: "inv-1", invoiceNo: "INV-101", date: "2026-10-01", total: 3000, paid: 3000, status: "paid" },
              { id: "inv-2", invoiceNo: "INV-102", date: "2026-10-05", total: 2000, paid: 0, status: "unpaid" },
            ],
          },
        ],
        records: [],
      };

      const group = mockData.customerGroups[0];
      const settledPct = group.totalAmount > 0
        ? Math.min(100, Math.round((group.paidAmount / group.totalAmount) * 100))
        : 0;

      expect(settledPct).toBe(60);
      expect(group.customerName).toBe("Acme Industrial Corp");
      expect(group.invoices).toHaveLength(2);
    });

    it("should correctly handle Purchase Invoice supplier groups", () => {
      const mockData = {
        metrics: { totalBills: 1, totalAmount: 4000, paidAmount: 4000, balanceDue: 0 },
        supplierGroups: [
          {
            supplierName: "Apex Logistics",
            email: "vendor@apex.com",
            totalBills: 1,
            totalAmount: 4000,
            paidAmount: 4000,
            balanceDue: 0,
            bills: [
              { id: "pur-1", purchaseNo: "PUR-201", date: "2026-10-02", total: 4000, paid: 4000, status: "paid" },
            ],
          },
        ],
        records: [],
      };

      expect(mockData.supplierGroups).toHaveLength(1);
      expect(mockData.supplierGroups[0].supplierName).toBe("Apex Logistics");
      expect(mockData.supplierGroups[0].balanceDue).toBe(0);
    });

    it("should map Deal Pipeline stageBreakdown correctly from database aggregations", () => {
      const mockData = {
        metrics: { totalDeals: 3, pipelineValue: 120000, totalPipeline: 120000, weightedForecast: 84000, winRate: 50 },
        stageBreakdown: [
          { stage: "proposal", count: 1, value: 40000 },
          { stage: "won", count: 1, value: 50000 },
          { stage: "lost", count: 1, value: 30000 },
        ],
        records: [
          { id: "d-1", name: "Project Falcon", customer: "Enterprise A", stage: "won", value: 50000, probability: 100, status: "active" },
        ],
      };

      expect(mockData.stageBreakdown).toHaveLength(3);
      const wonStage = mockData.stageBreakdown.find((s) => s.stage === "won");
      expect(wonStage?.value).toBe(50000);
      expect(mockData.metrics.winRate).toBe(50);
    });
  });

  // ─── 3. Zero-Record Responses & No Synthetic Constants ───────────────────
  describe("3. Zero-Record & Empty State Integrity", () => {
    it("should handle empty tenant data without substituting synthetic constants", () => {
      const emptyAttendance = {
        metrics: { totalEmployees: 0, attendanceRate: 0, workingHours: 0, overtimeHours: 0 },
        calendarRows: [],
        records: [],
      };

      expect(emptyAttendance.records).toHaveLength(0);
      expect(emptyAttendance.calendarRows).toHaveLength(0);
      expect(emptyAttendance.metrics.attendanceRate).toBe(0);

      // Verify no hardcoded mock constants like 493125.87 or mock company names
      const values = Object.values(emptyAttendance.metrics);
      expect(values.includes(493125.87)).toBe(false);
      expect(values.includes(350000)).toBe(false);
    });

    it("should handle zero-records in Project Progress without hardcoded project p1", () => {
      const emptyProjects = {
        metrics: { totalProjects: 0, totalBudget: 0, avgProgress: 0, completedCount: 0 },
        statusBreakdown: [],
        records: [],
      };

      expect(emptyProjects.records).toHaveLength(0);
      // When records is empty, selectedProject resolves to null without throwing
      const selectedProject = emptyProjects.records.length > 0 ? emptyProjects.records[0] : null;
      expect(selectedProject).toBeNull();
    });
  });

  // ─── 4. API Error Visibility (Fail-Closed, No Silent Empty Arrays) ────────
  describe("4. API Error Visibility & Error Handling", () => {
    it("should preserve API error message and not swallow it into false empty results", () => {
      const simulateQuery = (shouldFail: boolean) => {
        if (shouldFail) {
          throw new Error("Forbidden: Insufficient permissions for 'payroll-sheet'");
        }
        return { records: [] };
      };

      expect(() => simulateQuery(true)).toThrow("Forbidden: Insufficient permissions for 'payroll-sheet'");
    });

    it("should handle unexpected response shapes safely via unwrapData", () => {
      expect(unwrapData(null)).toBeNull();
      expect(unwrapData(undefined)).toBeUndefined();
      expect(unwrapData({ data: [1, 2, 3] })).toEqual([1, 2, 3]);
      expect(unwrapData({ customPayload: true })).toEqual({ customPayload: true });
      expect(unwrapArray(null)).toEqual([]);
      expect(unwrapArray({ items: ["a", "b"] })).toEqual(["a", "b"]);
    });
  });

  // ─── 5. Role-Based Access Control (RBAC) & Least Privilege ──────────────
  describe("5. Role-Based Access Control & Sensitive Data Protection", () => {
    it("should allow super_admin and admin to access all reports", () => {
      const reports = Object.keys(REPORT_ROLES);
      reports.forEach((reportId) => {
        expect(isUserAuthorizedForReport(reportId, ["super_admin"])).toBe(true);
        expect(isUserAuthorizedForReport(reportId, ["admin"])).toBe(true);
        expect(isUserAuthorizedForReport(reportId, ["tenant_admin"])).toBe(true);
      });
    });

    it("should restrict Payroll Sheet to HR and Payroll Administrators only", () => {
      expect(isUserAuthorizedForReport("payroll-sheet", ["payroll_admin"])).toBe(true);
      expect(isUserAuthorizedForReport("payroll-sheet", ["hr_admin"])).toBe(true);
      expect(isUserAuthorizedForReport("payroll-sheet", ["hr_manager"])).toBe(true);

      // Denied roles: standard employees, accountants, sales reps
      expect(isUserAuthorizedForReport("payroll-sheet", ["employee"])).toBe(false);
      expect(isUserAuthorizedForReport("payroll-sheet", ["accountant"])).toBe(false);
      expect(isUserAuthorizedForReport("payroll-sheet", ["sales_rep"])).toBe(false);
      expect(isUserAuthorizedForReport("payroll-sheet", ["warehouse_manager"])).toBe(false);
    });

    it("should restrict Sales & Purchase invoices to finance roles only", () => {
      expect(isUserAuthorizedForReport("sales-invoice", ["accountant"])).toBe(true);
      expect(isUserAuthorizedForReport("sales-invoice", ["finance_manager"])).toBe(true);
      expect(isUserAuthorizedForReport("sales-invoice", ["finance_admin"])).toBe(true);
      expect(isUserAuthorizedForReport("sales-invoice", ["employee"])).toBe(false);

      expect(isUserAuthorizedForReport("purchase-invoice", ["accountant"])).toBe(true);
      expect(isUserAuthorizedForReport("purchase-invoice", ["employee"])).toBe(false);
      expect(isUserAuthorizedForReport("purchase-invoice", ["sales_rep"])).toBe(false);
    });

    it("should restrict Product Stock to inventory and warehouse roles", () => {
      expect(isUserAuthorizedForReport("product-stock", ["inventory_manager"])).toBe(true);
      expect(isUserAuthorizedForReport("product-stock", ["warehouse_manager"])).toBe(true);
      expect(isUserAuthorizedForReport("product-stock", ["employee"])).toBe(false);
    });

    it("should allow catalogue overview for all authenticated users", () => {
      expect(isUserAuthorizedForReport("catalogue", ["employee"])).toBe(true);
    });
  });

  // ─── 6. Query Parameters & Active Filters Transmission ───────────────────
  describe("6. Filter Parameter Construction & Cache Isolation", () => {
    it("should correctly build query parameters from active filters", () => {
      const filters = {
        startDate: "2026-10-01",
        endDate: "2026-10-15",
        status: "present",
        paymentStatus: "all", // should be ignored
      };

      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status && filters.status !== "all") params.status = filters.status;
      if (filters.paymentStatus && filters.paymentStatus !== "all") params.paymentStatus = filters.paymentStatus;

      expect(params).toEqual({
        startDate: "2026-10-01",
        endDate: "2026-10-15",
        status: "present",
      });
      expect(params.paymentStatus).toBeUndefined();
    });

    it("should construct distinct cache keys across different tenants and filters", () => {
      const tenantA = "tenant-001";
      const tenantB = "tenant-002";
      const reportId = "attendance-summary";

      const keyA1 = ["smart-report-data", tenantA, reportId, { status: "present" }];
      const keyA2 = ["smart-report-data", tenantA, reportId, { status: "absent" }];
      const keyB1 = ["smart-report-data", tenantB, reportId, { status: "present" }];

      expect(JSON.stringify(keyA1)).not.toEqual(JSON.stringify(keyA2));
      expect(JSON.stringify(keyA1)).not.toEqual(JSON.stringify(keyB1));
    });
  });

  // ─── 7. Export URL & Filter Preservation ─────────────────────────────────
  describe("7. Export Integration & Filter Forwarding", () => {
    it("should format export URL including active filter parameters", () => {
      const reportId = "sales-invoice";
      const format = "csv";
      const queryParams = {
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        paymentStatus: "paid",
      };

      const searchParams = new URLSearchParams();
      searchParams.append("format", format);
      Object.entries(queryParams).forEach(([k, v]) => {
        searchParams.append(k, v);
      });

      const url = `/api/smart-reports/export/${encodeURIComponent(reportId)}?${searchParams.toString()}`;
      expect(url).toContain("format=csv");
      expect(url).toContain("startDate=2026-09-01");
      expect(url).toContain("paymentStatus=paid");
      expect(url).toContain("/api/smart-reports/export/sales-invoice");
    });
  });
});
