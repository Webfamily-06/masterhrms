import { getNavigationForPortal, NAVIGATION_REGISTRY } from "../src/lib/navigation-registry";

interface PersonaConfig {
  roleName: string;
  portal: "sa" | "hr" | "me" | "client";
  context: {
    roles: string[];
    permissions: string[];
    enabledModules: string[];
    isSuperAdmin?: boolean;
    isTenantAdmin?: boolean;
  };
}

const personas: PersonaConfig[] = [
  {
    roleName: "Super Admin",
    portal: "sa",
    context: {
      roles: ["super_admin"],
      permissions: ["*"],
      isSuperAdmin: true,
      enabledModules: ["core", "tenants", "billing", "system", "audit"],
    },
  },
  {
    roleName: "Tenant Admin",
    portal: "hr",
    context: {
      roles: ["tenant_admin"],
      permissions: ["*"],
      isTenantAdmin: true,
      enabledModules: ["core", "employees", "payroll", "leave", "attendance", "recruitment", "reports", "settings"],
    },
  },
  {
    roleName: "HR Admin",
    portal: "hr",
    context: {
      roles: ["hr_admin"],
      permissions: [
        "hr.manage",
        "hr.employees.view",
        "hr.employees.edit",
        "hr.payroll.view",
        "hr.leave.view",
        "hr.attendance.view",
      ],
      isSuperAdmin: false,
      isTenantAdmin: false,
      enabledModules: ["core", "employees", "payroll", "leave", "attendance"],
    },
  },
  {
    roleName: "HR Executive",
    portal: "hr",
    context: {
      roles: ["hr_executive"],
      permissions: [
        "hr.employees.view",
        "hr.leave.view",
        "hr.attendance.view",
      ],
      isSuperAdmin: false,
      isTenantAdmin: false,
      enabledModules: ["core", "employees", "leave", "attendance"],
    },
  },
  {
    roleName: "Reporting Manager",
    portal: "hr",
    context: {
      roles: ["manager"],
      permissions: ["manager.team.view", "leave.approve"],
      isSuperAdmin: false,
      isTenantAdmin: false,
      enabledModules: ["core", "approvals"],
    },
  },
  {
    roleName: "Employee (ESS)",
    portal: "me",
    context: {
      roles: ["employee"],
      permissions: ["me.view"],
      isSuperAdmin: false,
      isTenantAdmin: false,
      enabledModules: ["core", "leave", "attendance", "payroll", "documents"],
    },
  },
  {
    roleName: "Client Admin (Contractor/Client)",
    portal: "client",
    context: {
      roles: ["client_admin"],
      permissions: ["client.manage"],
      isSuperAdmin: false,
      isTenantAdmin: false,
      enabledModules: ["core", "client"],
    },
  },
];

console.log("================================================================================");
console.log("MASTERHRMS — ROLE-BASED NAVIGATION REGISTRY VERIFICATION");
console.log("================================================================================\n");

let totalIssues = 0;

for (const persona of personas) {
  console.log(`--- Verifying Persona: ${persona.roleName} (Portal: '${persona.portal}') ---`);
  const items = getNavigationForPortal(persona.portal, persona.context);
  console.log(`  Items retrieved: ${items.length}`);

  const seenRoutes = new Set<string>();
  const duplicates: string[] = [];
  const wrongPortalRoutes: string[] = [];

  const expectedPrefix = persona.portal === "sa" ? "/super" : `/${persona.portal}`;

  const checkItem = (item: any, isChild: boolean = false, parentRoute?: string) => {
    // If child shares parent route (e.g. accordion default landing tab), that is intentional alias
    if (seenRoutes.has(item.route)) {
      if (isChild && item.route === parentRoute) {
        // intentional parent-child default route mapping
      } else {
        duplicates.push(item.route);
      }
    }
    seenRoutes.add(item.route);

    // Verify portal path prefix
    if (!item.route.startsWith(expectedPrefix)) {
      wrongPortalRoutes.push(`${item.label} (${item.route})`);
    }

    if (item.children) {
      for (const child of item.children) {
        checkItem(child, true, item.route);
      }
    }
  };

  for (const item of items) {
    checkItem(item, false);
  }

  if (duplicates.length > 0) {
    console.error(`  ❌ Duplicate routes found: ${duplicates.join(", ")}`);
    totalIssues += duplicates.length;
  } else {
    console.log(`  ✓ Route Uniqueness: 100% Unique (${seenRoutes.size} distinct endpoints/views)`);
  }

  if (wrongPortalRoutes.length > 0) {
    console.error(`  ❌ Cross-portal route leakage: ${wrongPortalRoutes.join(", ")}`);
    totalIssues += wrongPortalRoutes.length;
  } else {
    console.log(`  ✓ Portal Boundary: Strict isolation under ${expectedPrefix}/*`);
  }

  // Print top 5 visible items for evidence report
  const sampleLabels = items.slice(0, 5).map(i => `${i.label} [${i.route}]`).join(", ");
  console.log(`  Sample visible items: ${sampleLabels}`);
  console.log("");
}

console.log("================================================================================");
if (totalIssues === 0) {
  console.log("ALL 7 PERSONAS PASSED NAVIGATION & PORTAL ISOLATION VERIFICATION (0 ISSUES)");
} else {
  console.error(`FAILED: ${totalIssues} navigation issues detected.`);
  process.exit(1);
}
console.log("================================================================================");
