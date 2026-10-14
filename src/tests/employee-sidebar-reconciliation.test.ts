import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { employeeSidebar, filterEmployeeSidebar, EmployeeMenuItem } from "@/nav/employee-sidebar";

describe("MASTERHRMS — Employee Portal Sidebar Navigation & Reconciliation", () => {
  const routesDir = path.resolve(__dirname, "../routes/_authenticated/me");

  const flattenRoutes = (items: EmployeeMenuItem[]): string[] => {
    const list: string[] = [];
    for (const item of items) {
      if (item.path) {
        list.push(item.path);
      }
      if (item.children) {
        list.push(...flattenRoutes(item.children));
      }
    }
    return list;
  };

  it("1. Contains exactly the 11 approved canonical sections", () => {
    const sectionLabels = employeeSidebar.map((s) => s.label);
    expect(sectionLabels).toEqual([
      "Overview & Profile",
      "Attendance & Time Management",
      "Leave Management",
      "Recruitment & Career",
      "Employee Lifecycle",
      "Performance Management",
      "Training & Development",
      "Payroll & Finance",
      "Assets",
      "Meetings & Collaboration",
      "Documents & Files",
    ]);
  });

  it("2. Contains all 55 canonical employee portal routes", () => {
    const allRoutes = employeeSidebar.flatMap((section) => flattenRoutes(section.children));

    const expected55Routes = [
      // 1. Overview & Profile
      "/me/dashboard",
      "/me/calendar",
      "/me/todo",
      "/me/chat",
      "/me/notifications",
      "/me/profile",
      "/me/employees",
      "/me/organization/structure",
      "/me/organization/holidays",
      "/me/organization/announcements",

      // 2. Attendance & Time Management
      "/me/attendance/records",
      "/me/attendance/timesheet",
      "/me/attendance/regularizations",
      "/me/attendance/shifts",
      "/me/attendance/policies",
      "/me/attendance/requests",

      // 3. Leave Management
      "/me/leave/applications",
      "/me/leave/balance",
      "/me/leave/policies",
      "/me/leave/team-calendar",

      // 4. Recruitment & Career
      "/me/recruitment/job-postings",
      "/me/recruitment/interviews",
      "/me/recruitment/onboarding",
      "/me/recruitment/assessments",
      "/me/recruitment/career",

      // 5. Employee Lifecycle
      "/me/lifecycle/awards",
      "/me/lifecycle/promotions",
      "/me/lifecycle/transfers",
      "/me/lifecycle/warnings",
      "/me/lifecycle/resignation",
      "/me/lifecycle/exit",
      "/me/lifecycle/trips",
      "/me/lifecycle/complaints",

      // 6. Performance Management
      "/me/performance/reviews",
      "/me/performance/goals",
      "/me/performance/cycles",
      "/me/performance/indicators",

      // 7. Training & Development
      "/me/training/trainings",
      "/me/training/sessions",
      "/me/training/programs",

      // 8. Payroll & Finance
      "/me/payroll/payslips",
      "/me/payroll/salary",
      "/me/payroll/tax",
      "/me/payroll/reimbursements-loans",
      "/me/payroll/statutory-forms",

      // 9. Assets
      "/me/assets/dashboard",
      "/me/assets",
      "/me/assets/requests",

      // 10. Meetings & Collaboration
      "/me/meetings",
      "/me/meetings/action-items",

      // 11. Documents & Files
      "/me/documents",
      "/me/documents/contracts",
      "/me/documents/acknowledgements",
      "/me/documents/requests",
      "/me/media",
    ];

    expect(allRoutes).toHaveLength(55);
    for (const expectedRoute of expected55Routes) {
      expect(allRoutes).toContain(expectedRoute);
    }
  });

  it("3. Every route in employeeSidebar points to an existing TanStack file route", () => {
    const allRoutes = employeeSidebar.flatMap((section) => flattenRoutes(section.children));

    for (const routePath of allRoutes) {
      const relPath = routePath.replace(/^\/me/, "");
      const directFile = path.join(routesDir, `${relPath}.tsx`);
      const indexFile = path.join(routesDir, relPath, "index.tsx");
      const rootFile = path.join(routesDir, "index.tsx");

      const fileExists =
        (routePath === "/me" && fs.existsSync(rootFile)) ||
        fs.existsSync(directFile) ||
        fs.existsSync(indexFile);

      expect(fileExists, `Route file for ${routePath} must exist`).toBe(true);
    }
  });

  it("4. Gating: Interviewer portal is omitted when isInterviewer is false", () => {
    const filtered = filterEmployeeSidebar(employeeSidebar, {
      isInterviewer: false,
      permissions: [],
    });
    const routes = filtered.flatMap((s) => flattenRoutes(s.children));
    expect(routes).not.toContain("/me/recruitment/interviews");
  });

  it("5. Gating: Assessments is omitted when hasAssessments is false", () => {
    const filtered = filterEmployeeSidebar(employeeSidebar, {
      hasAssessments: false,
      permissions: [],
    });
    const routes = filtered.flatMap((s) => flattenRoutes(s.children));
    expect(routes).not.toContain("/me/recruitment/assessments");
  });

  it("6. Every section and item has an icon and label defined", () => {
    for (const section of employeeSidebar) {
      expect(section.label).toBeTruthy();
      expect(section.children.length).toBeGreaterThan(0);
      for (const item of section.children) {
        expect(item.label).toBeTruthy();
        expect(item.icon).toBeTruthy();
        if (item.children) {
          for (const child of item.children) {
            expect(child.label).toBeTruthy();
            expect(child.path).toBeTruthy();
          }
        } else {
          expect(item.path).toBeTruthy();
        }
      }
    }
  });
});
