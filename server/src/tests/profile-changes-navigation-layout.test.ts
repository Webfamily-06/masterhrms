import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("MASTERHRMS — Profile Change Requests Layout & Navigation Verification", () => {
  const rootDir = process.cwd();

  it("1. Layout: CMS profile-changes page has no max-w-7xl constraint and uses root-defined width", () => {
    const cmsPagePath = path.join(rootDir, "CMS/src/app/(workspace)/hr/requests/profile-changes/page.tsx");
    assert.ok(fs.existsSync(cmsPagePath), "CMS profile-changes page must exist");
    const content = fs.readFileSync(cmsPagePath, "utf8");

    // Must not contain max-w-7xl or mx-auto or p-6 on root container
    assert.ok(!content.includes("p-6 max-w-7xl mx-auto"), "Root container must not constrain with p-6 max-w-7xl mx-auto");
    assert.ok(content.includes('<div className="space-y-6">'), "Root container must use standard space-y-6");

    // Breadcrumbs must reflect new hierarchy: HR Workspace > Approval > Profile Change Requests
    assert.ok(
      content.includes('{ label: "Approval", href: "/hr/approvals" }'),
      "Breadcrumbs must link to Approval (/hr/approvals)"
    );
    assert.ok(
      content.includes('{ label: "Profile Change Requests" }'),
      "Breadcrumbs must have Profile Change Requests as leaf item"
    );

    // Summary cards grid must be responsive (lg:grid-cols-5 for 5 cards in 1 row on desktop)
    assert.ok(
      content.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"),
      "Summary cards grid must use responsive 1/2/5 column layout"
    );
  });

  it("2. Layout: TanStack profile-changes route has no max-w-7xl constraint and uses root-defined width", () => {
    const routePath = path.join(rootDir, "src/routes/_authenticated/hr/requests.profile-changes.tsx");
    assert.ok(fs.existsSync(routePath), "TanStack profile-changes route must exist");
    const content = fs.readFileSync(routePath, "utf8");

    // Must not contain max-w-7xl or mx-auto or p-6 on root container
    assert.ok(!content.includes("p-6 max-w-7xl mx-auto"), "Root container must not constrain with p-6 max-w-7xl mx-auto");
    assert.ok(content.includes('<div className="space-y-6">'), "Root container must use standard space-y-6");

    // Breadcrumbs must reflect new hierarchy: HR Workspace > Approval > Profile Change Requests
    assert.ok(
      content.includes('{ label: "Approval", href: "/hr/approvals" }'),
      "Breadcrumbs must link to Approval (/hr/approvals)"
    );

    // Summary cards grid must be responsive
    assert.ok(
      content.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"),
      "Summary cards grid must use responsive 1/2/5 column layout"
    );
  });

  it("3. Navigation: CMS hr-sidebar.ts places Profile Change Requests under Approval", () => {
    const cmsSidebarPath = path.join(rootDir, "CMS/src/nav/hr-sidebar.ts");
    const content = fs.readFileSync(cmsSidebarPath, "utf8");

    // Approval must have children containing Profile Change Requests
    assert.ok(content.includes('label: "Approval"'), "Approval parent menu must exist");
    assert.ok(content.includes('path: "/hr/requests/profile-changes"'), "Profile Change Requests route must be defined");
    assert.ok(content.includes('label: "Profile Change Requests"'), "Profile Change Requests label must be defined");

    // Check that Profile Change Requests is NOT duplicated under Employees in Workspace Management
    const wmIndex = content.indexOf('label: "Workspace Management"');
    const employeesIndex = content.indexOf('label: "Employees"', wmIndex);
    const orgIndex = content.indexOf('label: "Organization"', wmIndex);
    const betweenEmployeesAndOrg = content.substring(employeesIndex, orgIndex);
    assert.ok(
      !betweenEmployeesAndOrg.includes("Profile Change Requests"),
      "Profile Change Requests must not be duplicated under Workspace Management -> Employees"
    );
  });

  it("4. Navigation: src hr-sidebar.ts places Profile Change Requests under Approval", () => {
    const srcSidebarPath = path.join(rootDir, "src/nav/hr-sidebar.ts");
    const content = fs.readFileSync(srcSidebarPath, "utf8");

    assert.ok(content.includes('label: "Approval"'), "Approval parent menu must exist");
    assert.ok(content.includes('path: "/hr/requests/profile-changes"'), "Profile Change Requests route must be defined");

    const wmIndex = content.indexOf('label: "Workspace Management"');
    const employeesIndex = content.indexOf('label: "Employees"', wmIndex);
    const orgIndex = content.indexOf('label: "Organization"', wmIndex);
    const betweenEmployeesAndOrg = content.substring(employeesIndex, orgIndex);
    assert.ok(
      !betweenEmployeesAndOrg.includes("Profile Change Requests"),
      "Profile Change Requests must not be duplicated under Workspace Management -> Employees"
    );
  });

  it("5. Navigation: dreams-sidebar.tsx supports Approval submenu and auto-expansion", () => {
    const dreamsSidebarPath = path.join(rootDir, "CMS/src/components/dreams-sidebar.tsx");
    const content = fs.readFileSync(dreamsSidebarPath, "utf8");

    // HR_SUBMENU_KEY_MAP
    assert.ok(content.includes('Approval: "hrApprovals"'), "Approval must be mapped in HR_SUBMENU_KEY_MAP");
    // HR_ICON_MAP
    assert.ok(content.includes('Approval: "ph-check-circle"'), "Approval icon must be mapped in HR_ICON_MAP");
    // openMenus initial state
    assert.ok(content.includes("hrApprovals: false"), "hrApprovals must exist in openMenus initial state");
    // Auto-expand route watcher
    assert.ok(
      content.includes('currentPath.startsWith("/hr/requests/profile-changes")'),
      "dreams-sidebar must auto-expand hrApprovals for /hr/requests/profile-changes"
    );
  });

  it("6. Navigation Registry: navigation-registry.ts defines hr-approvals with children", () => {
    const srcNavPath = path.join(rootDir, "src/lib/navigation-registry.ts");
    const cmsNavPath = path.join(rootDir, "CMS/src/lib/navigation-registry.ts");

    for (const p of [srcNavPath, cmsNavPath]) {
      const content = fs.readFileSync(p, "utf8");
      assert.ok(content.includes('"id": "hr-approvals"'), "hr-approvals must exist");
      assert.ok(content.includes('"id": "hr-profile-changes"'), "hr-profile-changes must exist as child");
      assert.ok(content.includes('"/hr/requests/profile-changes"'), "route /hr/requests/profile-changes must exist");
    }
  });
});

