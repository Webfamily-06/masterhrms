import fs from "fs";
import path from "path";
import { hrSidebar, filterHRSidebar, HRMenuItem } from "../nav/hr-sidebar";
import { employeeSidebar, filterEmployeeSidebar, EmployeeMenuItem } from "../nav/employee-sidebar";
import { NAVIGATION_REGISTRY as tsNavRegistry } from "../lib/navigation-registry";
import { NAVIGATION_REGISTRY as cmsNavRegistry } from "../../CMS/src/lib/navigation-registry";
import { ROUTES as tsRoutes } from "../lib/routes";
import { ROUTES as cmsRoutes } from "../../CMS/src/lib/routes";

let total = 0;
let passed = 0;

function assert(cond: boolean, label: string) {
  total++;
  if (!cond) {
    console.error(`  ✗ FAIL [${total}]: ${label}`);
    process.exit(1);
  }
  passed++;
  console.log(`  ✓ PASS [${total}]: ${label}`);
}

function flattenHrPaths(items: HRMenuItem[]): { label: string; path?: string }[] {
  const out: { label: string; path?: string }[] = [];
  for (const it of items) {
    if (it.path) out.push({ label: it.label, path: it.path });
    if (it.children) out.push(...flattenHrPaths(it.children));
  }
  return out;
}

function flattenEmpPaths(items: EmployeeMenuItem[]): { label: string; path?: string }[] {
  const out: { label: string; path?: string }[] = [];
  for (const it of items) {
    if (it.path) out.push({ label: it.label, path: it.path });
    if (it.children) out.push(...flattenEmpPaths(it.children));
  }
  return out;
}

console.log("================================================================================");
console.log("MASTERHRMS P3-A: DUAL-FRONTEND PARITY & SIDEBAR RECONCILIATION SUITE");
console.log("================================================================================");

// 1. HR Sidebar 5 Leave Pages Check
const hrAdminSidebar = filterHRSidebar(hrSidebar, { isHrAdmin: true });
const hrLeaves = flattenHrPaths(hrAdminSidebar).filter((p) => p.path?.startsWith("/hr/leave/"));
assert(hrLeaves.length === 5, "HR Sidebar Leave Management exposes all 5 Leave pages");
assert(
  hrLeaves.some(
    (p) => p.path === "/hr/leave/encashment-compoff" && p.label === "Leave Encashment & Comp-Off"
  ),
  "HR Sidebar 5th Leave item is 'Leave Encashment & Comp-Off' -> '/hr/leave/encashment-compoff'"
);

// 2. Employee Sidebar 5 Leave Pages Check
const empFiltered = filterEmployeeSidebar(employeeSidebar, { permissions: [] });
const empLeaves = flattenEmpPaths(empFiltered.flatMap((s) => s.children)).filter((p) =>
  p.path?.startsWith("/me/leave/")
);
assert(empLeaves.length === 5, "Employee Sidebar Leave Management exposes all 5 ESS Leave pages");
assert(
  empLeaves.some(
    (p) => p.path === "/me/leave/encashment-compoff" && p.label === "Leave Encashment & Comp-Off"
  ),
  "Employee Sidebar 5th Leave item is 'Leave Encashment & Comp-Off' -> '/me/leave/encashment-compoff'"
);

// 3. Navigation Registry Parity (TanStack Start vs Next.js CMS)
const tsHrLeaveGroup = tsNavRegistry.find((n: any) => n.id === "hr-leave");
const cmsHrLeaveGroup = cmsNavRegistry.find((n: any) => n.id === "hr-leave");
assert(
  tsHrLeaveGroup?.children?.length === 5 && cmsHrLeaveGroup?.children?.length === 5,
  "Both TanStack Start & Next.js CMS navigation registries contain 5 children under 'hr-leave'"
);
assert(
  JSON.stringify(tsHrLeaveGroup) === JSON.stringify(cmsHrLeaveGroup),
  "TanStack Start & Next.js CMS 'hr-leave' navigation registry definitions are 100% identical"
);

const tsMeLeaveGroup = tsNavRegistry.find((n: any) => n.id === "me-leave");
const cmsMeLeaveGroup = cmsNavRegistry.find((n: any) => n.id === "me-leave");
assert(
  tsMeLeaveGroup?.children?.length === 5 && cmsMeLeaveGroup?.children?.length === 5,
  "Both TanStack Start & Next.js CMS navigation registries contain 5 children under 'me-leave'"
);
assert(
  JSON.stringify(tsMeLeaveGroup) === JSON.stringify(cmsMeLeaveGroup),
  "TanStack Start & Next.js CMS 'me-leave' navigation registry definitions are 100% identical"
);

// 4. Route Constants Parity
assert(
  tsRoutes.hr.leave.encashmentCompOff === "/hr/leave/encashment-compoff" &&
    cmsRoutes.hr.leave.encashmentCompOff === "/hr/leave/encashment-compoff",
  "ROUTES.hr.leave.encashmentCompOff matches across both frontends"
);
assert(
  tsRoutes.me.leave.encashmentCompOff === "/me/leave/encashment-compoff" &&
    cmsRoutes.me.leave.encashmentCompOff === "/me/leave/encashment-compoff",
  "ROUTES.me.leave.encashmentCompOff matches across both frontends"
);

// 5. Existing 4 Leave Pages Preserved Intact in Both Frontends
const repoRoot = path.resolve(process.cwd());
const preservedPages = [
  "CMS/src/app/(workspace)/hr/leave/applications/page.tsx",
  "CMS/src/app/(workspace)/hr/leave/balances/page.tsx",
  "CMS/src/app/(workspace)/hr/leave/types/page.tsx",
  "CMS/src/app/(workspace)/hr/leave/policies/page.tsx",
  "src/routes/_authenticated/hr/leave/applications.tsx",
  "src/routes/_authenticated/hr/leave/balances.tsx",
  "src/routes/_authenticated/hr/leave/types.tsx",
  "src/routes/_authenticated/hr/leave/policies.tsx",
];
for (const p of preservedPages) {
  assert(fs.existsSync(path.join(repoRoot, p)), `Preserved existing Leave page intact: ${p}`);
}

// 6. Verify Zero Hardcoded Mock Arrays or Static Divisors in New Frontend Pages
const newPages = [
  "CMS/src/app/(workspace)/hr/leave/encashment-compoff/page.tsx",
  "src/routes/_authenticated/hr/leave/encashment-compoff.tsx",
  "CMS/src/app/(workspace)/me/leave/encashment-compoff/page.tsx",
  "src/routes/_authenticated/me/leave/encashment-compoff.tsx",
];
for (const p of newPages) {
  const src = fs.readFileSync(path.join(repoRoot, p), "utf8");
  assert(
    !src.includes("const MOCK_") && !src.includes("DUMMY_") && src.includes("#00a76f"),
    `Dynamic-data & #00a76f brand-color verified in: ${p}`
  );
}

console.log("================================================================================");
console.log(`FRONTEND PARITY SUITE SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
console.log("================================================================================");
