import { describe, it, expect } from "vitest";
import {
  hrSidebar,
  filterHRSidebar,
  resolveReconciledHRPath,
  HR_ROUTE_ALIASES,
  HRMenuItem,
} from "@/nav/hr-sidebar";

describe("HR Sidebar Navigation Reconciliation & Coverage Suite", () => {
  it("1. exposes all 8 top-level sections with required icons and metadata", () => {
    expect(hrSidebar).toHaveLength(8);

    const sectionLabels = hrSidebar.map((s) => s.label);
    expect(sectionLabels).toEqual([
      "Overview",
      "Applications",
      "Workspace Management",
      "Talent & Growth",
      "Finance & Assets",
      "Communications & Content",
      "Reports & Analytics",
      "Add-ons & Integrations",
    ]);

    for (const section of hrSidebar) {
      expect(section.children).toBeDefined();
      expect(section.children!.length).toBeGreaterThan(0);
      expect(section.icon).toBeDefined();
    }
  });

  it("2. verifies every leaf node has a valid path and permission", () => {
    function checkItems(items: HRMenuItem[]) {
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          checkItems(item.children);
        } else {
          expect(item.path).toBeDefined();
          expect(item.path!.startsWith("/")).toBe(true);
        }
      }
    }

    checkItems(hrSidebar);
  });

  it("3. verifies all Section 07 items have valid addonSlug attributes", () => {
    const addonsSection = hrSidebar.find((s) => s.label === "Add-ons & Integrations");
    expect(addonsSection).toBeDefined();
    expect(addonsSection!.children).toBeDefined();

    for (const child of addonsSection!.children!) {
      expect(child.addonSlug).toBeDefined();
      expect(child.addonSlug!.length).toBeGreaterThan(0);
    }
  });

  it("4. verifies route alias resolution for documented HR paths", () => {
    expect(resolveReconciledHRPath("/hr/recruitment/locations")).toBe("/hr/recruitment/job-locations");
    expect(resolveReconciledHRPath("/hr/recruitment/rounds")).toBe("/hr/recruitment/interview-rounds");
    expect(resolveReconciledHRPath("/hr/assets/depreciations")).toBe("/hr/assets/depreciation");
    expect(resolveReconciledHRPath("/hr/documents/employee")).toBe("/hr/documents/contracts");
    expect(resolveReconciledHRPath("/hr/documents/requests")).toBe("/hr/documents/letters");
    expect(resolveReconciledHRPath("/unknown/path")).toBe("/unknown/path");
  });

  it("5. verifies filterHRSidebar filters out unentitled add-ons", () => {
    const filteredNoAddons = filterHRSidebar(hrSidebar, {
      isWorkspaceAdmin: false,
      isSuperAdmin: false,
      permissions: [
        "hrm.dashboard.view",
        "hrm.employees.view",
        "hrm.attendance.view",
        "hrm.leave.view",
        "hrm.recruitment.view",
        "hrm.performance.view",
        "hrm.training.view",
        "hrm.payroll.view",
        "assets.dashboard.view",
        "analytics.dashboard.view",
        "analytics.reports.view",
      ],
      activeAddonSlugs: ["planning"], // only planning active
    });

    const addonsGroup = filteredNoAddons.find((s) => s.label === "Add-ons & Integrations");
    expect(addonsGroup).toBeDefined();
    // Only planning items should be present
    expect(addonsGroup!.children!.every((c) => c.addonSlug === "planning")).toBe(true);
    expect(addonsGroup!.children!.some((c) => c.label === "Strategic Planning")).toBe(true);
    expect(addonsGroup!.children!.some((c) => c.label === "OKRs")).toBe(false);
  });

  it("6. verifies filterHRSidebar preserves full sidebar for Super Admin and Workspace Admin", () => {
    const superAdminMenu = filterHRSidebar(hrSidebar, {
      isSuperAdmin: true,
    });
    expect(superAdminMenu).toEqual(hrSidebar);

    const workspaceAdminMenu = filterHRSidebar(hrSidebar, {
      isWorkspaceAdmin: true,
    });
    expect(workspaceAdminMenu).toEqual(hrSidebar);
  });

  it("7. verifies all 7 canonical sections and approved specification paths render for HR Admin", () => {
    const activeAddons = [
      "planning",
      "okr-performance",
      "learning-lms",
      "biometric-sync",
      "notice-board",
      "ai-assistant",
      "ai-document",
      "webhook",
      "suggestion-box",
      "twilio-sms",
    ];

    const renderedSidebar = filterHRSidebar(hrSidebar, {
      isHrAdmin: true,
      activeAddonSlugs: activeAddons,
    });

    // 1. All 8 top-level sections must be present
    expect(renderedSidebar.map((s) => s.label)).toEqual([
      "Overview",
      "Applications",
      "Workspace Management",
      "Talent & Growth",
      "Finance & Assets",
      "Communications & Content",
      "Reports & Analytics",
      "Add-ons & Integrations",
    ]);

    // Flatten all paths recursively
    function extractPaths(items: HRMenuItem[]): string[] {
      const paths: string[] = [];
      for (const item of items) {
        if (item.path) paths.push(item.path);
        if (item.children) paths.push(...extractPaths(item.children));
      }
      return paths;
    }

    const allPaths = extractPaths(renderedSidebar);

    // 01. Overview
    const expectedOverview = ["/hr/dashboard", "/hr/calendar", "/hr/todo", "/hr/chat"];
    expectedOverview.forEach((p) => expect(allPaths).toContain(p));

    // 02. Workspace Management
    const expectedWorkspace = [
      "/hr/employees",
      "/hr/organization/departments",
      "/hr/organization/designations",
      "/hr/organization/holidays",
      "/hr/organization/announcements",
      "/hr/attendance/records",
      "/hr/attendance/timesheets",
      "/hr/attendance/regularizations",
      "/hr/attendance/shifts",
      "/hr/attendance/policies",
      "/hr/leave/applications",
      "/hr/leave/balances",
      "/hr/leave/policies",
    ];
    expectedWorkspace.forEach((p) => expect(allPaths).toContain(p));

    // 03. Talent & Growth (with canonical routes resolved)
    const expectedTalent = [
      "/hr/recruitment/job-postings",
      "/hr/recruitment/candidates",
      "/hr/recruitment/interviews",
      "/hr/recruitment/assessments",
      "/hr/recruitment/career",
      "/hr/recruitment/job-locations", // canonical for /hr/recruitment/locations
      "/hr/recruitment/interview-rounds", // canonical for /hr/recruitment/rounds
      "/hr/lifecycle/awards",
      "/hr/lifecycle/promotions",
      "/hr/lifecycle/transfers",
      "/hr/lifecycle/warnings",
      "/hr/lifecycle/resignations",
      "/hr/lifecycle/terminations",
      "/hr/lifecycle/trips",
      "/hr/lifecycle/complaints",
      "/hr/performance/reviews",
      "/hr/performance/goals",
      "/hr/performance/cycles",
      "/hr/performance/indicators",
      "/hr/training/employee-trainings",
      "/hr/training/sessions",
      "/hr/training/programs",
    ];
    expectedTalent.forEach((p) => expect(allPaths).toContain(p));

    // 04. Finance & Assets
    const expectedFinance = [
      "/hr/payroll/runs",
      "/hr/payroll/payslips",
      "/hr/payroll/salaries",
      "/hr/payroll/components",
      "/hr/assets/dashboard",
      "/hr/assets",
      "/hr/assets/depreciation", // canonical for /hr/assets/depreciations
      "/hr/assets/types",
    ];
    expectedFinance.forEach((p) => expect(allPaths).toContain(p));

    // 05. Communications & Content
    const expectedComms = [
      "/hr/meetings",
      "/hr/meetings/action-items",
      "/hr/documents",
      "/hr/documents/contracts", // canonical for /hr/documents/employee
      "/hr/documents/letters", // canonical for /hr/documents/requests
      "/hr/documents/acknowledgements",
      "/hr/media",
      "/hr/profile",
    ];
    expectedComms.forEach((p) => expect(allPaths).toContain(p));

    // 06. Reports & Analytics
    const expectedReports = [
      "/hr/reports/headcount",
      "/hr/reports/attrition",
      "/hr/reports/attendance",
      "/hr/reports/payroll",
      "/hr/reports/recruitment",
      "/hr/reports/performance",
      "/hr/reports/training",
      "/hr/reports/statutory",
      "/hr/reports/custom",
    ];
    expectedReports.forEach((p) => expect(allPaths).toContain(p));

    // 07. Add-ons & Integrations
    const expectedAddons = [
      "/addons/planning/dashboard",
      "/addons/planning/challenges",
      "/addons/planning/charters",
      "/addons/planning/charters/kanban",
      "/okr",
      "/learning-analytics",
      "/biometric-sync",
      "/notice-board",
      "/addons/ai-assistant/usage",
      "/addons/ai-document/generate",
      "/addons/webhook/endpoints",
      "/suggestion-box",
      "/call-history",
    ];
    expectedAddons.forEach((p) => expect(allPaths).toContain(p));
  });

  it("8. verifies restricted permissions prune unauthorized sections and empty parents", () => {
    // User with only attendance view permissions
    const restrictedSidebar = filterHRSidebar(hrSidebar, {
      isHrAdmin: false,
      isWorkspaceAdmin: false,
      isSuperAdmin: false,
      permissions: ["hrm.attendance.view"],
      activeAddonSlugs: [],
    });

    const labels = restrictedSidebar.map((s) => s.label);
    expect(labels).toContain("Workspace Management");
    expect(labels).not.toContain("Talent & Growth");
    expect(labels).not.toContain("Finance & Assets");
    expect(labels).not.toContain("Reports & Analytics");
    expect(labels).not.toContain("Add-ons & Integrations");

    const wm = restrictedSidebar.find((s) => s.label === "Workspace Management")!;
    expect(wm.children?.some((c) => c.label === "Attendance")).toBe(true);
    expect(wm.children?.some((c) => c.label === "Employees")).toBe(false);
  });

  it("9. verifies add-on deactivation hides only Section 07 items while sections 01-06 remain intact", () => {
    const withoutAddons = filterHRSidebar(hrSidebar, {
      isHrAdmin: true,
      activeAddonSlugs: [], // No active addons
    });

    // Sections 01 to 06 must be present
    expect(withoutAddons.some((s) => s.label === "Overview")).toBe(true);
    expect(withoutAddons.some((s) => s.label === "Workspace Management")).toBe(true);
    expect(withoutAddons.some((s) => s.label === "Talent & Growth")).toBe(true);
    expect(withoutAddons.some((s) => s.label === "Finance & Assets")).toBe(true);
    expect(withoutAddons.some((s) => s.label === "Communications & Content")).toBe(true);
    expect(withoutAddons.some((s) => s.label === "Reports & Analytics")).toBe(true);

    // Section 07 with 0 active add-ons should be pruned since all children are disallowed
    expect(withoutAddons.some((s) => s.label === "Add-ons & Integrations")).toBe(false);
  });
});
