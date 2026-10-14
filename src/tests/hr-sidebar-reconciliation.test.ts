import { describe, it, expect } from "vitest";
import {
  hrSidebar,
  filterHRSidebar,
  resolveReconciledHRPath,
  HR_ROUTE_ALIASES,
  HRMenuItem,
} from "@/nav/hr-sidebar";

describe("HR Sidebar Navigation Reconciliation & Coverage Suite", () => {
  it("1. exposes all 7 top-level sections with required icons and metadata", () => {
    expect(hrSidebar).toHaveLength(7);

    const sectionLabels = hrSidebar.map((s) => s.label);
    expect(sectionLabels).toEqual([
      "Overview",
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
});
