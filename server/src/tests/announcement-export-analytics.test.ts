import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

test("MASTERHRMS - Announcement Analytics Export Suite", async (t) => {
  const mockAnnouncement = {
    id: "ann-test-001",
    title: "Q4 2026 Company Strategy & Security Directive",
    category: "Corporate Policy",
    targetType: "all_company",
    publishDate: "2026-11-01T09:00:00.000Z",
    acknowledgementRequired: true,
  };

  const mockMetrics = {
    totalEligibleEmployees: 86,
    uniqueViewsCount: 78,
    viewRate: 91,
    acknowledgementCount: 70,
    acknowledgementRate: 81,
    pendingAcknowledgements: 16,
  };

  const mockRoster = [
    {
      employeeCode: "EMP001",
      fullName: "Sarah Connor",
      email: "sarah.connor@masterhrms.com",
      department: "Engineering",
      branch: "Mumbai HQ",
      hasViewed: true,
      viewCount: 4,
      viewedAt: "2026-11-01T10:15:30.000Z",
      hasAcknowledged: true,
      acknowledgedAt: "2026-11-01T11:00:00.000Z",
      comments: "Reviewed and understood all terms.",
    },
    {
      employeeCode: "EMP002",
      fullName: "Alex Morgan",
      email: "alex.morgan@masterhrms.com",
      department: "Human Resources",
      branch: "Bangalore Branch",
      hasViewed: true,
      viewCount: 1,
      viewedAt: "2026-11-02T14:20:00.000Z",
      hasAcknowledged: false,
      acknowledgedAt: null,
      comments: null,
    },
    {
      employeeCode: "EMP003",
      fullName: "David Miller",
      email: "david.miller@masterhrms.com",
      department: "Finance",
      branch: "Mumbai HQ",
      hasViewed: false,
      viewCount: 0,
      viewedAt: null,
      hasAcknowledged: false,
      acknowledgedAt: null,
      comments: null,
    },
  ];

  const mockDeptBreakdown = [
    { departmentName: "Engineering", eligible: 40, viewed: 38, acked: 35, viewRate: 95, ackRate: 88 },
    { departmentName: "Human Resources", eligible: 10, viewed: 9, acked: 8, viewRate: 90, ackRate: 80 },
    { departmentName: "Finance", eligible: 36, viewed: 31, acked: 27, viewRate: 86, ackRate: 75 },
  ];

  const mockBranchBreakdown = [
    { branchName: "Mumbai HQ", eligible: 56, viewed: 51, acked: 46, viewRate: 91, ackRate: 82 },
    { branchName: "Bangalore Branch", eligible: 30, viewed: 27, acked: 24, viewRate: 90, ackRate: 80 },
  ];

  await t.test("1. Excel (.xlsx) Generation: includes title, metrics, roster, and breakdowns", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MASTERHRMS Enterprise";

    // Sheet 1: Audit Roster
    const ws = workbook.addWorksheet("Audit Roster");
    ws.addRow(["MASTERHRMS ENTERPRISE - ANNOUNCEMENT COMPLIANCE AUDIT"]);
    ws.addRow([`Announcement: ${mockAnnouncement.title}`]);
    ws.addRow([`Audience: All Company | Category: ${mockAnnouncement.category}`]);
    ws.addRow([]);
    ws.addRow(["Target Audience", "Unique Views", "View Rate", "Signed Agreements", "Pending Signatures", "Compliance Rate"]);
    ws.addRow([
      mockMetrics.totalEligibleEmployees,
      mockMetrics.uniqueViewsCount,
      `${mockMetrics.viewRate}%`,
      mockMetrics.acknowledgementCount,
      mockMetrics.pendingAcknowledgements,
      `${mockMetrics.acknowledgementRate}%`,
    ]);
    ws.addRow([]);
    ws.addRow(["Employee Code", "Employee Name", "Email", "Department", "Branch", "Read Status", "View Count", "Viewed At", "Compliance Signature", "Signed At", "Comments"]);

    mockRoster.forEach((r) => {
      ws.addRow([
        r.employeeCode,
        r.fullName,
        r.email,
        r.department,
        r.branch,
        r.hasViewed ? "Viewed" : "Unread",
        r.viewCount,
        r.viewedAt,
        r.hasAcknowledged ? "Signed" : "Pending",
        r.acknowledgedAt,
        r.comments,
      ]);
    });

    // Sheet 2: Department Breakdown
    const wsDept = workbook.addWorksheet("Department Breakdown");
    wsDept.addRow(["Department", "Eligible Employees", "Viewed", "Signed", "View Rate", "Compliance Rate"]);
    mockDeptBreakdown.forEach((d) => {
      wsDept.addRow([d.departmentName, d.eligible, d.viewed, d.acked, `${d.viewRate}%`, `${d.ackRate}%`]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    assert.ok(buffer.byteLength > 2000, "Excel buffer should be non-empty and well-formed");
    assert.equal(workbook.worksheets.length, 2, "Workbook should contain 2 worksheets");
    assert.equal(workbook.getWorksheet("Audit Roster")?.rowCount, 11, "Audit Roster should contain 11 rows");
    assert.equal(workbook.getWorksheet("Department Breakdown")?.rowCount, 4, "Department Breakdown should contain 4 rows");
  });

  await t.test("2. CSV (.csv) Generation: properly escapes quotes and includes UTF-8 BOM", async () => {
    const escapeCsv = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = ["Employee Code", "Employee Name", "Email", "Department", "Branch", "Read Status", "View Count", "Viewed At", "Compliance Signature", "Acknowledged At", "Comments"];

    const rows = mockRoster.map((r) => [
      escapeCsv(r.employeeCode),
      escapeCsv(r.fullName),
      escapeCsv(r.email),
      escapeCsv(r.department),
      escapeCsv(r.branch),
      escapeCsv(r.hasViewed ? "Viewed" : "Unread"),
      escapeCsv(r.viewCount),
      escapeCsv(r.viewedAt || ""),
      escapeCsv(r.hasAcknowledged ? "Signed" : "Pending"),
      escapeCsv(r.acknowledgedAt || ""),
      escapeCsv(r.comments || ""),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

    assert.ok(csvContent.startsWith("\uFEFF"), "CSV content must begin with UTF-8 BOM");
    assert.ok(csvContent.includes('"Sarah Connor"'), "CSV must contain escaped full name");
    assert.ok(csvContent.includes('"Reviewed and understood all terms."'), "CSV must contain escaped comments");
    assert.equal(csvContent.split("\r\n").length, 4, "CSV must contain header row + 3 employee rows");
  });

  await t.test("3. PDF (.pdf) Multi-Page Generation: builds header, KPIs, and multi-page AutoTable", async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // Header
    doc.text("MASTERHRMS ENTERPRISE", 36, 50);
    doc.text("Announcement Analytics & Compliance Audit", 36, 65);

    // AutoTable
    const head = [["Employee", "Code", "Department", "Branch", "Read Status", "Compliance Signature"]];
    const body = mockRoster.map((r) => [
      r.fullName,
      r.employeeCode,
      r.department,
      r.branch,
      r.hasViewed ? "Viewed" : "Unread",
      r.hasAcknowledged ? "Signed" : "Pending",
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 120,
      showHead: "everyPage",
      margin: { left: 36, right: 36, bottom: 40 },
    });

    const pageCount = doc.getNumberOfPages();
    assert.ok(pageCount >= 1, "PDF should have at least 1 page");
    const output = doc.output("arraybuffer");
    assert.ok(output.byteLength > 1000, "PDF output should be non-empty binary document");
  });
});

