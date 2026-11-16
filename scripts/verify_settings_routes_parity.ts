import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

function verifySettingsParity() {
  console.log("================================================================================");
  console.log("🧪 MASTERHRMS — DUAL-FRONTEND SETTINGS ROUTE & PARITY VERIFICATION");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err?.message || err}`);
      failed++;
    }
  }

  const rootDir = process.cwd();

  console.log("--- 1. Dual-Frontend Route File Presence ---");

  const requiredRoutes = [
    {
      scope: "Super Admin (/super/settings)",
      tanstack: "src/routes/_authenticated/super/settings.tsx",
      cms: "CMS/src/app/super/settings/page.tsx",
    },
    {
      scope: "Tenant Admin (/tenant/settings)",
      tanstack: "src/routes/_authenticated/tenant/settings.tsx",
      cms: "CMS/src/app/(workspace)/tenant/settings/page.tsx",
    },
    {
      scope: "HR Admin (/hr/settings)",
      tanstack: "src/routes/_authenticated/hr/settings.tsx",
      cms: "CMS/src/app/(workspace)/hr/settings/page.tsx",
    },
    {
      scope: "Employee Personal (/me/settings)",
      tanstack: "src/routes/_authenticated/me/settings.tsx",
      cms: "CMS/src/app/(workspace)/me/settings/page.tsx",
    },
  ];

  for (const r of requiredRoutes) {
    test(`Route files exist for ${r.scope}`, () => {
      const tanstackPath = path.join(rootDir, r.tanstack);
      const cmsPath = path.join(rootDir, r.cms);

      assert.ok(fs.existsSync(tanstackPath), `TanStack route missing: ${r.tanstack}`);
      assert.ok(fs.existsSync(cmsPath), `CMS route missing: ${r.cms}`);

      const tanstackStat = fs.statSync(tanstackPath);
      const cmsStat = fs.statSync(cmsPath);

      assert.ok(tanstackStat.size > 500, `TanStack route file too small: ${tanstackStat.size} bytes`);
      assert.ok(cmsStat.size > 500, `CMS route file too small: ${cmsStat.size} bytes`);
    });
  }

  console.log("\n--- 2. Employee Sidebar & Navigation Registry Integration ---");

  test("Employee sidebar manifest includes /me/settings", () => {
    const sidebarPath = path.join(rootDir, "src/nav/employee-sidebar.ts");
    const content = fs.readFileSync(sidebarPath, "utf8");
    assert.ok(content.includes('path: "/me/settings"'), "src/nav/employee-sidebar.ts must include path: '/me/settings'");
  });

  test("TanStack navigation registry includes me-settings", () => {
    const registryPath = path.join(rootDir, "src/lib/navigation-registry.ts");
    const content = fs.readFileSync(registryPath, "utf8");
    assert.ok(content.includes('"id": "me-settings"'), "src/lib/navigation-registry.ts must include id: 'me-settings'");
    assert.ok(content.includes('"route": "/me/settings"'), "src/lib/navigation-registry.ts must include route: '/me/settings'");
  });

  test("CMS navigation registry includes me-settings", () => {
    const registryPath = path.join(rootDir, "CMS/src/lib/navigation-registry.ts");
    const content = fs.readFileSync(registryPath, "utf8");
    assert.ok(content.includes('"id": "me-settings"'), "CMS/src/lib/navigation-registry.ts must include id: 'me-settings'");
    assert.ok(content.includes('"route": "/me/settings"'), "CMS/src/lib/navigation-registry.ts must include route: '/me/settings'");
  });

  test("TanStack Router route tree contains /me/settings registration", () => {
    const routeTreePath = path.join(rootDir, "src/routeTree.gen.ts");
    const content = fs.readFileSync(routeTreePath, "utf8");
    assert.ok(content.includes("AuthenticatedMeSettingsRouteImport"), "routeTree.gen.ts must import AuthenticatedMeSettingsRouteImport");
    assert.ok(content.includes("AuthenticatedMeSettingsRoute"), "routeTree.gen.ts must declare AuthenticatedMeSettingsRoute");
    assert.ok(content.includes("'/me/settings'"), "routeTree.gen.ts must register '/me/settings'");
  });

  console.log("\n================================================================================");
  console.log(`📊 PARITY EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

verifySettingsParity();
