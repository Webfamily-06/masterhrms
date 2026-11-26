import { prisma as proxiedPrisma, rawPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;

export interface PermissionSeedDef {
  code: string;
  module: string;
  resource: string;
  action: string;
  name: string;
  description?: string;
}

/**
 * Authoritative HRM Permission Catalog matching the Tenant Manage Roles Matrix.
 * Note: `working-days` and `ip-restricts` are Tenant-Admin-only and intentionally
 * excluded from the HR Role default permission set (`TENANT ROLE SKIP`).
 */
const HRM_RESOURCE_ACTIONS: Array<{
  resource: string;
  actions: Array<{ action: string; name: string }>;
}> = [
  {
    resource: "dashboard",
    actions: [{ action: "manage", name: "Manage HRM Dashboard" }],
  },
  {
    resource: "hrm",
    actions: [{ action: "manage", name: "Manage Hrm" }],
  },
  {
    resource: "branches",
    actions: [
      { action: "manage", name: "Manage Branches" },
      { action: "manage_all", name: "Manage All Branches" },
      { action: "manage_own", name: "Manage Own Branches" },
      { action: "create", name: "Create Branches" },
      { action: "edit", name: "Edit Branches" },
      { action: "delete", name: "Delete Branches" },
    ],
  },
  {
    resource: "departments",
    actions: [
      { action: "manage", name: "Manage Departments" },
      { action: "manage_all", name: "Manage All Departments" },
      { action: "manage_own", name: "Manage Own Departments" },
      { action: "create", name: "Create Departments" },
      { action: "edit", name: "Edit Departments" },
      { action: "delete", name: "Delete Departments" },
    ],
  },
  {
    resource: "designations",
    actions: [
      { action: "manage", name: "Manage Designations" },
      { action: "manage_all", name: "Manage All Designations" },
      { action: "manage_own", name: "Manage Own Designations" },
      { action: "create", name: "Create Designations" },
      { action: "edit", name: "Edit Designations" },
      { action: "delete", name: "Delete Designations" },
    ],
  },
  {
    resource: "employee-document-types",
    actions: [
      { action: "manage", name: "Manage Document Types" },
      { action: "manage_all", name: "Manage All Document Types" },
      { action: "manage_own", name: "Manage Own Document Types" },
      { action: "create", name: "Create Document Types" },
      { action: "edit", name: "Edit Document Types" },
      { action: "delete", name: "Delete Document Types" },
    ],
  },
  {
    resource: "employees",
    actions: [
      { action: "manage", name: "Manage Employees" },
      { action: "manage_all", name: "Manage All Employees" },
      { action: "manage_own", name: "Manage Own Employees" },
      { action: "view", name: "View Employees" },
      { action: "create", name: "Create Employees" },
      { action: "edit", name: "Edit Employees" },
      { action: "delete", name: "Delete Employees" },
    ],
  },
  {
    resource: "award-types",
    actions: [
      { action: "manage", name: "Manage Award Types" },
      { action: "manage_all", name: "Manage All Award Types" },
      { action: "manage_own", name: "Manage Own Award Types" },
      { action: "create", name: "Create Award Types" },
      { action: "edit", name: "Edit Award Types" },
      { action: "delete", name: "Delete Award Types" },
    ],
  },
  {
    resource: "awards",
    actions: [
      { action: "manage", name: "Manage Awards" },
      { action: "manage_all", name: "Manage All Awards" },
      { action: "manage_own", name: "Manage Own Awards" },
      { action: "create", name: "Create Awards" },
      { action: "view", name: "View Awards" },
      { action: "edit", name: "Edit Awards" },
      { action: "delete", name: "Delete Awards" },
    ],
  },
  {
    resource: "promotions",
    actions: [
      { action: "manage", name: "Manage Promotions" },
      { action: "manage_all", name: "Manage All Promotions" },
      { action: "manage_own", name: "Manage Own Promotions" },
      { action: "manage_status", name: "Manage Promotions Status" },
      { action: "view", name: "View Promotions" },
      { action: "create", name: "Create Promotions" },
      { action: "edit", name: "Edit Promotions" },
      { action: "delete", name: "Delete Promotions" },
    ],
  },
  {
    resource: "resignations",
    actions: [
      { action: "manage", name: "Manage Resignations" },
      { action: "manage_all", name: "Manage All Resignations" },
      { action: "manage_own", name: "Manage Own Resignations" },
      { action: "manage_status", name: "Manage Resignation Status" },
      { action: "view", name: "View Resignations" },
      { action: "create", name: "Create Resignations" },
      { action: "edit", name: "Edit Resignations" },
      { action: "delete", name: "Delete Resignations" },
    ],
  },
  {
    resource: "termination-types",
    actions: [
      { action: "manage", name: "Manage Termination Types" },
      { action: "manage_all", name: "Manage All Termination Types" },
      { action: "manage_own", name: "Manage Own Termination Types" },
      { action: "create", name: "Create Termination Types" },
      { action: "edit", name: "Edit Termination Types" },
      { action: "delete", name: "Delete Termination Types" },
    ],
  },
  {
    resource: "terminations",
    actions: [
      { action: "manage", name: "Manage Terminations" },
      { action: "manage_all", name: "Manage All Terminations" },
      { action: "manage_own", name: "Manage Own Terminations" },
      { action: "manage_status", name: "Manage Termination Status" },
      { action: "view", name: "View Terminations" },
      { action: "create", name: "Create Terminations" },
      { action: "edit", name: "Edit Terminations" },
      { action: "delete", name: "Delete Terminations" },
    ],
  },
  {
    resource: "warning-types",
    actions: [
      { action: "manage", name: "Manage Warning Types" },
      { action: "manage_all", name: "Manage All Warning Types" },
      { action: "manage_own", name: "Manage Own Warning Types" },
      { action: "create", name: "Create Warning Types" },
      { action: "edit", name: "Edit Warning Types" },
      { action: "delete", name: "Delete Warning Types" },
    ],
  },
  {
    resource: "warnings",
    actions: [
      { action: "manage", name: "Manage Warnings" },
      { action: "manage_all", name: "Manage All Warnings" },
      { action: "manage_own", name: "Manage Own Warnings" },
      { action: "manage_response", name: "Manage Warning Response" },
      { action: "view", name: "View Warnings" },
      { action: "create", name: "Create Warnings" },
      { action: "edit", name: "Edit Warnings" },
      { action: "delete", name: "Delete Warnings" },
    ],
  },
  {
    resource: "complaint-types",
    actions: [
      { action: "manage", name: "Manage Complaint Types" },
      { action: "manage_all", name: "Manage All Complaint Types" },
      { action: "manage_own", name: "Manage Own Complaint Types" },
      { action: "create", name: "Create Complaint Types" },
      { action: "edit", name: "Edit Complaint Types" },
      { action: "delete", name: "Delete Complaint Types" },
    ],
  },
  {
    resource: "complaints",
    actions: [
      { action: "manage", name: "Manage Complaints" },
      { action: "manage_all", name: "Manage All Complaints" },
      { action: "manage_own", name: "Manage Own Complaints" },
      { action: "manage_status", name: "Manage Complaint Status" },
      { action: "view", name: "View Complaints" },
      { action: "create", name: "Create Complaints" },
      { action: "edit", name: "Edit Complaints" },
      { action: "delete", name: "Delete Complaints" },
    ],
  },
  {
    resource: "employee-transfers",
    actions: [
      { action: "manage", name: "Manage Employee Transfers" },
      { action: "manage_all", name: "Manage All Employee Transfers" },
      { action: "manage_own", name: "Manage Own Employee Transfers" },
      { action: "manage_status", name: "Manage Employee Transfers Status" },
      { action: "view", name: "View Employee Transfers" },
      { action: "create", name: "Create Employee Transfers" },
      { action: "edit", name: "Edit Employee Transfers" },
      { action: "delete", name: "Delete Employee Transfers" },
    ],
  },
  {
    resource: "holiday-types",
    actions: [
      { action: "manage", name: "Manage Holiday Types" },
      { action: "manage_all", name: "Manage All Holiday Types" },
      { action: "manage_own", name: "Manage Own Holiday Types" },
      { action: "create", name: "Create Holiday Types" },
      { action: "edit", name: "Edit Holiday Types" },
      { action: "delete", name: "Delete Holiday Types" },
    ],
  },
  {
    resource: "holidays",
    actions: [
      { action: "manage", name: "Manage Holidays" },
      { action: "manage_all", name: "Manage All Holidays" },
      { action: "manage_own", name: "Manage Own Holidays" },
      { action: "view", name: "View Holidays" },
      { action: "create", name: "Create Holidays" },
      { action: "edit", name: "Edit Holidays" },
      { action: "delete", name: "Delete Holidays" },
    ],
  },
  {
    resource: "document-categories",
    actions: [
      { action: "manage", name: "Manage Document Categories" },
      { action: "manage_all", name: "Manage All Document Categories" },
      { action: "manage_own", name: "Manage Own Document Categories" },
      { action: "create", name: "Create Document Categories" },
      { action: "edit", name: "Edit Document Categories" },
      { action: "delete", name: "Delete Document Categories" },
    ],
  },
  {
    resource: "hrm-documents",
    actions: [
      { action: "manage", name: "Manage Documents" },
      { action: "manage_all", name: "Manage All Documents" },
      { action: "manage_own", name: "Manage Own Documents" },
      { action: "manage_status", name: "Manage Documents Status" },
      { action: "view", name: "View Documents" },
      { action: "download", name: "Download Documents" },
      { action: "create", name: "Create Documents" },
      { action: "edit", name: "Edit Documents" },
      { action: "delete", name: "Delete Documents" },
    ],
  },
  {
    resource: "acknowledgments",
    actions: [
      { action: "manage", name: "Manage Acknowledgments" },
      { action: "manage_all", name: "Manage All Acknowledgments" },
      { action: "manage_own", name: "Manage Own Acknowledgments" },
      { action: "manage_status", name: "Manage Acknowledgment Status" },
      { action: "download", name: "Download Acknowledgment" },
      { action: "view", name: "View Acknowledgments" },
      { action: "create", name: "Create Acknowledgments" },
      { action: "edit", name: "Edit Acknowledgments" },
      { action: "delete", name: "Delete Acknowledgments" },
    ],
  },
  {
    resource: "announcement-categories",
    actions: [
      { action: "manage", name: "Manage Announcement Categories" },
      { action: "manage_all", name: "Manage All Announcement Categories" },
      { action: "manage_own", name: "Manage Own Announcement Categories" },
      { action: "create", name: "Create Announcement Categories" },
      { action: "edit", name: "Edit Announcement Categories" },
      { action: "delete", name: "Delete Announcement Categories" },
    ],
  },
  {
    resource: "announcements",
    actions: [
      { action: "manage", name: "Manage Announcements" },
      { action: "manage_all", name: "Manage All Announcements" },
      { action: "manage_own", name: "Manage Own Announcements" },
      { action: "manage_status", name: "Manage Announcement Status" },
      { action: "view", name: "View Announcements" },
      { action: "create", name: "Create Announcements" },
      { action: "edit", name: "Edit Announcements" },
      { action: "delete", name: "Delete Announcements" },
    ],
  },
  {
    resource: "event-types",
    actions: [
      { action: "manage", name: "Manage Event Types" },
      { action: "manage_all", name: "Manage All Event Types" },
      { action: "manage_own", name: "Manage Own Event Types" },
      { action: "create", name: "Create Event Types" },
      { action: "edit", name: "Edit Event Types" },
      { action: "delete", name: "Delete Event Types" },
    ],
  },
  {
    resource: "events",
    actions: [
      { action: "manage", name: "Manage Events" },
      { action: "manage_all", name: "Manage All Events" },
      { action: "manage_own", name: "Manage Own Events" },
      { action: "manage_status", name: "Manage Event Status" },
      { action: "view_calendar", name: "View Event Calendar" },
      { action: "view", name: "View Events" },
      { action: "create", name: "Create Events" },
      { action: "edit", name: "Edit Events" },
      { action: "delete", name: "Delete Events" },
    ],
  },
  {
    resource: "leave-types",
    actions: [
      { action: "manage", name: "Manage Leave Types" },
      { action: "manage_all", name: "Manage All Leave Types" },
      { action: "manage_own", name: "Manage Own Leave Types" },
      { action: "view", name: "View Leave Types" },
      { action: "create", name: "Create Leave Types" },
      { action: "edit", name: "Edit Leave Types" },
      { action: "delete", name: "Delete Leave Types" },
    ],
  },
  {
    resource: "leave-applications",
    actions: [
      { action: "manage", name: "Manage Leave Applications" },
      { action: "manage_all", name: "Manage All Leave Applications" },
      { action: "manage_own", name: "Manage Own Leave Applications" },
      { action: "manage_status", name: "Manage Leave Status" },
      { action: "view", name: "View Leave Applications" },
      { action: "create", name: "Create Leave Applications" },
      { action: "edit", name: "Edit Leave Applications" },
      { action: "delete", name: "Delete Leave Applications" },
    ],
  },
  {
    resource: "leave-balance",
    actions: [
      { action: "view", name: "View Leave Balance" },
      { action: "manage_all", name: "Manage All Leave Balance" },
      { action: "manage_own", name: "Manage Own Leave Balance" },
    ],
  },
  {
    resource: "shifts",
    actions: [
      { action: "manage", name: "Manage Shifts" },
      { action: "manage_all", name: "Manage All Shifts" },
      { action: "manage_own", name: "Manage Own Shifts" },
      { action: "view", name: "View Shifts" },
      { action: "create", name: "Create Shifts" },
      { action: "edit", name: "Edit Shifts" },
      { action: "delete", name: "Delete Shifts" },
    ],
  },
  {
    resource: "attendances",
    actions: [
      { action: "manage", name: "Manage Attendances" },
      { action: "manage_all", name: "Manage All Attendances" },
      { action: "manage_own", name: "Manage Own Attendances" },
      { action: "view", name: "View Attendances" },
      { action: "create", name: "Create Attendances" },
      { action: "edit", name: "Edit Attendances" },
      { action: "delete", name: "Delete Attendances" },
      { action: "clock_in", name: "Clock In" },
      { action: "clock_out", name: "Clock Out" },
    ],
  },
  {
    resource: "payslip",
    actions: [
      { action: "manage", name: "Manage Payslip" },
      { action: "manage_all", name: "Manage All Payslip" },
      { action: "manage_own", name: "Manage Own Payslip" },
      { action: "pay", name: "Pay Payslip" },
      { action: "download", name: "Download Payslip" },
      { action: "view", name: "View Payslip" },
      { action: "delete", name: "Delete Payslip" },
    ],
  },
  {
    resource: "set-salary",
    actions: [
      { action: "manage", name: "Manage Set Salary" },
      { action: "manage_all", name: "Manage All Set Salary" },
      { action: "manage_own", name: "Manage Own Set Salary" },
      { action: "view", name: "View Set Salary" },
      { action: "create", name: "Create Set Salary" },
      { action: "edit", name: "Edit Set Salary" },
      { action: "delete", name: "Delete Set Salary" },
    ],
  },
  {
    resource: "allowance-types",
    actions: [
      { action: "manage", name: "Manage Allowance Types" },
      { action: "manage_all", name: "Manage All Allowance Types" },
      { action: "manage_own", name: "Manage Own Allowance Types" },
      { action: "create", name: "Create Allowance Types" },
      { action: "edit", name: "Edit Allowance Types" },
      { action: "delete", name: "Delete Allowance Types" },
    ],
  },
  {
    resource: "deduction-types",
    actions: [
      { action: "manage", name: "Manage Deduction Types" },
      { action: "manage_all", name: "Manage All Deduction Types" },
      { action: "manage_own", name: "Manage Own Deduction Types" },
      { action: "create", name: "Create Deduction Types" },
      { action: "edit", name: "Edit Deduction Types" },
      { action: "delete", name: "Delete Deduction Types" },
    ],
  },
  {
    resource: "loan-types",
    actions: [
      { action: "manage", name: "Manage Loan Types" },
      { action: "manage_all", name: "Manage All Loan Types" },
      { action: "manage_own", name: "Manage Own Loan Types" },
      { action: "create", name: "Create Loan Types" },
      { action: "edit", name: "Edit Loan Types" },
      { action: "delete", name: "Delete Loan Types" },
    ],
  },
  {
    resource: "allowances",
    actions: [
      { action: "manage", name: "Manage Allowances" },
      { action: "manage_all", name: "Manage All Allowances" },
      { action: "manage_own", name: "Manage Own Allowances" },
      { action: "create", name: "Create Allowances" },
      { action: "edit", name: "Edit Allowances" },
      { action: "delete", name: "Delete Allowances" },
    ],
  },
  {
    resource: "deductions",
    actions: [
      { action: "manage", name: "Manage Deductions" },
      { action: "manage_all", name: "Manage All Deductions" },
      { action: "manage_own", name: "Manage Own Deductions" },
      { action: "create", name: "Create Deductions" },
      { action: "edit", name: "Edit Deductions" },
      { action: "delete", name: "Delete Deductions" },
    ],
  },
  {
    resource: "loans",
    actions: [
      { action: "manage", name: "Manage Loans" },
      { action: "manage_all", name: "Manage All Loans" },
      { action: "manage_own", name: "Manage Own Loans" },
      { action: "view", name: "View Loans" },
      { action: "create", name: "Create Loans" },
      { action: "edit", name: "Edit Loans" },
      { action: "delete", name: "Delete Loans" },
    ],
  },
  {
    resource: "overtimes",
    actions: [
      { action: "manage", name: "Manage Overtimes" },
      { action: "manage_all", name: "Manage All Overtimes" },
      { action: "manage_own", name: "Manage Own Overtimes" },
      { action: "view", name: "View Overtimes" },
      { action: "create", name: "Create Overtimes" },
      { action: "edit", name: "Edit Overtimes" },
      { action: "delete", name: "Delete Overtimes" },
    ],
  },
  {
    resource: "payrolls",
    actions: [
      { action: "manage", name: "Manage Payrolls" },
      { action: "manage_all", name: "Manage All Payrolls" },
      { action: "manage_own", name: "Manage Own Payrolls" },
      { action: "view", name: "View Payrolls" },
      { action: "view_all", name: "View All Payrolls" },
      { action: "view_own", name: "View Own Payrolls" },
      { action: "run", name: "Run Payrolls" },
      { action: "create", name: "Create Payrolls" },
      { action: "edit", name: "Edit Payrolls" },
      { action: "delete", name: "Delete Payrolls" },
    ],
  },
  {
    resource: "company-policies",
    actions: [
      { action: "manage", name: "Manage Company Policies" },
      { action: "manage_all", name: "Manage All Company Policies" },
      { action: "manage_own", name: "Manage Own Company Policies" },
      { action: "view", name: "View Company Policies" },
      { action: "create", name: "Create Company Policies" },
      { action: "edit", name: "Edit Company Policies" },
      { action: "delete", name: "Delete Company Policies" },
    ],
  },
];

/** Tenant-only resources explicitly skipped from HR Role defaults */
export const TENANT_ONLY_SKIPPED_RESOURCES = new Set(["working-days", "ip-restricts"]);

export const HRM_PERMISSION_SEEDS: PermissionSeedDef[] = HRM_RESOURCE_ACTIONS.flatMap((group) =>
  group.actions.map((act) => ({
    code: `hrm.${group.resource}.${act.action}`,
    module: "HRM",
    resource: group.resource,
    action: act.action,
    name: act.name,
    description: `${act.name} permission for HRM`,
  }))
);

export const HR_DEFAULT_PERMISSION_CODES: string[] = HRM_PERMISSION_SEEDS.filter(
  (p) => !TENANT_ONLY_SKIPPED_RESOURCES.has(p.resource)
).map((p) => p.code);

let seededOnce = false;

/** Idempotently ensure all HRM permissions exist in PostgreSQL `permissions` table */
export async function ensureHrmPermissionsSeeded(): Promise<void> {
  if (seededOnce) return;
  try {
    await prisma.permission.createMany({
      data: HRM_PERMISSION_SEEDS,
      skipDuplicates: true,
    });
    seededOnce = true;
  } catch (err) {
    console.warn("[HRM Permissions] Seed skipped/warning:", (err as any)?.message);
  }
}

/**
 * Assign all default HRM permissions (excluding `working-days` and `ip-restricts`)
 * to the tenant's HR / HR Manager / HR Admin role(s).
 */
export async function syncHrRoleDefaultPermissions(tenantId: string): Promise<{
  updatedRoles: string[];
  permissionsAssigned: number;
}> {
  await ensureHrmPermissionsSeeded();

  const hrRoles = await prisma.workspaceRole.findMany({
    where: {
      tenantId,
      OR: [
        { name: { equals: "HR", mode: "insensitive" } },
        { name: { equals: "HR Admin", mode: "insensitive" } },
        { name: { equals: "HR Manager", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });

  const perms = await prisma.permission.findMany({
    where: { code: { in: HR_DEFAULT_PERMISSION_CODES } },
    select: { id: true },
  });

  if (hrRoles.length === 0 || perms.length === 0) {
    return { updatedRoles: [], permissionsAssigned: 0 };
  }

  for (const role of hrRoles) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });
  }

  return {
    updatedRoles: hrRoles.map((r) => r.name),
    permissionsAssigned: perms.length,
  };
}
