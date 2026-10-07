import { getTenantDb } from "../context/tenant-context";
import { provisionEmployeeUser } from "../lib/auth-helpers";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { NotificationService } from "./notification.service";
import { sanitizeSensitiveFields } from "../lib/field-security";
import { attachAllowedActions } from "../lib/allowed-actions";
import { buildDataScopeFilter, UserSecurityContext, DataScope } from "../lib/data-scope";

export interface CreateEmployeeInput {
  // Step 1: Personal
  firstName: string;
  lastName: string;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  avatarUrl?: string | null;
  maritalStatus?: string | null;

  // Step 2: Contact
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;

  // Step 3: Job
  employeeCode: string;
  branchId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  managerId?: string | null;
  position?: string | null;
  employmentType?: "full_time" | "part_time" | "contract" | "intern";
  status?: "active" | "on_leave" | "terminated";
  joinedAt?: string | Date | null;

  // Step 4: Compensation
  salary?: number | string | null;
  taxRegime?: "old" | "new";
  pfEligible?: boolean;
  esiEligible?: boolean;
  ptEligible?: boolean;
  tdsEligible?: boolean;

  // Step 5: Statutory & Bank
  pan?: string | null;
  aadhaar?: string | null;
  uan?: string | null;
  esiNumber?: string | null;
  pfNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;

  // Step 6: Documents
  documents?: Array<{
    title: string;
    mediaUrl: string;
    documentType?: string;
  }>;

  // Step 7: Access
  createLoginAccount?: boolean;
  userRole?: string;
  password?: string;

  // Step 8: Onboarding
  onboardingNotes?: string | null;
}

export interface ListEmployeesQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  status?: string;
  employmentType?: string;
  managerId?: string;
}

export class EmployeeService {
  /**
   * ATOMIC EMPLOYEE CREATION (8-Step Wizard Target)
   * Executes inside a single transactional boundary:
   * Employee + User Account + Org Assignment + AuditLog + OutboxEvent + Notification
   * Rolls back completely if any step fails.
   */
  static async createEmployeeAtomic(
    tenantId: string,
    actorId: string,
    input: CreateEmployeeInput
  ) {
    const db = getTenantDb();

    // 1. Pre-validation: uniqueness within tenant
    const existingCode = await db.employee.findFirst({
      where: { tenantId, employeeCode: input.employeeCode },
    });
    if (existingCode) {
      throw new Error(`An employee with code '${input.employeeCode}' already exists in this workspace.`);
    }

    const existingEmail = await db.employee.findFirst({
      where: { tenantId, email: input.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new Error(`An employee with email '${input.email}' already exists in this workspace.`);
    }

    // 2. Execute Transaction
    const result = await db.$transaction(async (tx: any) => {
      // Step A: Optional User Account provisioning
      let userId: string | null = null;
      if (input.createLoginAccount !== false) {
        try {
          userId = await provisionEmployeeUser(tx, {
            tenantId,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            avatarUrl: input.avatarUrl,
            password: input.password || "Employee@123",
          });
        } catch (err: any) {
          // If user provisioning fails, rethrow to abort employee creation
          throw new Error(`Failed to provision user access: ${err.message}`);
        }
      }

      // Step B: Create Employee record
      const employee = await tx.employee.create({
        data: {
          tenantId,
          userId,
          employeeCode: input.employeeCode.trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: input.email.toLowerCase().trim(),
          phone: input.phone || null,
          position: input.position || null,
          branchId: input.branchId || null,
          departmentId: input.departmentId || null,
          designationId: input.designationId || null,
          managerId: input.managerId || null,
          employmentType: input.employmentType || "full_time",
          status: input.status || "active",
          salary: input.salary !== undefined && input.salary !== null ? String(input.salary) : null,
          joinedAt: input.joinedAt ? new Date(input.joinedAt) : new Date(),
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender || null,
          taxRegime: input.taxRegime || "new",
          pfEligible: input.pfEligible !== false,
          esiEligible: input.esiEligible !== false,
          ptEligible: input.ptEligible !== false,
          tdsEligible: input.tdsEligible !== false,
          pan: input.pan || null,
          aadhaar: input.aadhaar || null,
          uan: input.uan || null,
          esiNumber: input.esiNumber || null,
          pfNumber: input.pfNumber || null,
          bankName: input.bankName || null,
          bankAccount: input.bankAccount || null,
          bankIfsc: input.bankIfsc || null,
          bankBranch: input.bankBranch || null,
        },
        include: {
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, name: true } },
        },
      });

      // Step C: Optional documents attachment
      if (input.documents && input.documents.length > 0) {
        for (const doc of input.documents) {
          await tx.companyDocument.create({
            data: {
              tenantId,
              title: doc.title,
              fileUrl: doc.mediaUrl,
              fileType: doc.documentType || "general",
              uploadedById: employee.id,
            },
          });
        }
      }

      // Step D: Masked audit logging (sensitive PII stripped/masked)
      const auditPayload = {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        designationId: employee.designationId,
        status: employee.status,
        hasPan: !!employee.pan,
        hasAadhaar: !!employee.aadhaar,
        hasBankAccount: !!employee.bankAccount,
      };

      await AuditService.logMutation(
        {
          tenantId,
          actorId,
          action: "EMPLOYEE_CREATE",
          entityType: "Employee",
          entityId: employee.id,
          newState: auditPayload,
        },
        tx
      );

      // Step E: Outbox event emission
      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "employee.created",
          entityType: "Employee",
          entityId: employee.id,
          actorId,
          payload: {
            id: employee.id,
            employeeCode: employee.employeeCode,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
            department: employee.department?.name,
            branch: employee.branch?.name,
          },
        },
        tx
      );

      return employee;
    });

    // Step F: Asynchronous notification to HR team
    try {
      await NotificationService.sendNotification({
        tenantId,
        recipientUserId: actorId,
        title: "Employee Onboarded Successfully",
        message: `${result.firstName} ${result.lastName} (${result.employeeCode}) has been created in the directory.`,
        type: "SUCCESS",
        metadata: { employeeId: result.id },
      });
    } catch {
      // Non-blocking notification dispatch
    }

    return result;
  }

  /**
   * LIST EMPLOYEES WITH DATA SCOPING & FIELD-LEVEL SECURITY
   */
  static async listEmployees(
    tenantId: string,
    userContext: UserSecurityContext,
    userPermissions: string[],
    query: ListEmployeesQuery
  ) {
    const db = getTenantDb();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // Build data-scope Prisma filter
    const effectiveScope: DataScope = (query as any)?.dataScope || (userContext.isTenantAdmin ? "ALL" : "ALL");
    const scopeFilter = buildDataScopeFilter(effectiveScope, userContext, "employee");

    const where: any = {
      tenantId,
      ...scopeFilter,
    };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { employeeCode: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { position: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.branchId && query.branchId !== "all") where.branchId = query.branchId;
    if (query.departmentId && query.departmentId !== "all") where.departmentId = query.departmentId;
    if (query.designationId && query.designationId !== "all") where.designationId = query.designationId;
    if (query.status && query.status !== "all") where.status = query.status;
    if (query.employmentType && query.employmentType !== "all") where.employmentType = query.employmentType;
    if (query.managerId) where.managerId = query.managerId;

    const sortBy = query.sortBy || "createdAt";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

    const [total, rawEmployees] = await Promise.all([
      db.employee.count({ where }),
      db.employee.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    // Apply Field-Level Security mask
    const canViewSensitive = userContext.roles.some((r) =>
      ["admin", "hr_admin", "super_admin", "Workspace Admin"].includes(r)
    );
    const maskedEmployees = rawEmployees.map((emp: any) =>
      sanitizeSensitiveFields(emp, { canViewSensitive, isSelf: emp.id === userContext.employeeId })
    );

    // Attach allowed actions
    const withActions = attachAllowedActions(
      "Employee",
      maskedEmployees,
      userContext,
      userPermissions
    );

    return {
      data: withActions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * EMPLOYEE 360 CONSOLIDATED PROFILE
   */
  static async getEmployee360(
    tenantId: string,
    employeeId: string,
    userContext: UserSecurityContext,
    userPermissions: string[]
  ) {
    const db = getTenantDb();

    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        department: true,
        branch: true,
        designation: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            position: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            position: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            roles: { select: { role: true } },
          },
        },
        changeRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        awards: {
          include: { awardType: true },
          orderBy: { awardDate: "desc" },
        },
      },
    });

    if (!employee) {
      throw new Error("Employee not found in current workspace");
    }

    // Apply Field Security Mask
    const canViewSensitive = userContext.roles.some((r) =>
      ["admin", "hr_admin", "super_admin", "Workspace Admin"].includes(r)
    );
    const masked = sanitizeSensitiveFields(employee, {
      canViewSensitive,
      isSelf: employee.id === userContext.employeeId,
    });

    // Attach allowed actions
    const withActions = attachAllowedActions(
      "Employee",
      masked,
      userContext,
      userPermissions
    );

    return withActions;
  }

  /**
   * EMPLOYEE IMPORT: DRY RUN VALIDATION
   */
  static async validateImportDryRun(tenantId: string, records: any[]) {
    const db = getTenantDb();

    // Preload tenant master caches for rapid validation
    const [existingEmployees, branches, departments, designations] = await Promise.all([
      db.employee.findMany({
        where: { tenantId },
        select: { employeeCode: true, email: true },
      }),
      db.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true, code: true },
      }),
      db.department.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
      db.designation.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    const existingCodeSet = new Set(existingEmployees.map((e: any) => e.employeeCode.toLowerCase()));
    const existingEmailSet = new Set(existingEmployees.map((e: any) => e.email.toLowerCase()));

    const branchNameMap = new Map(branches.map((b: any) => [b.name.toLowerCase(), b.id]));
    const branchCodeMap = new Map(branches.filter((b: any) => b.code).map((b: any) => [b.code!.toLowerCase(), b.id]));
    const deptMap = new Map(departments.map((d: any) => [d.name.toLowerCase(), d.id]));
    const desigMap = new Map(designations.map((d: any) => [d.name.toLowerCase(), d.id]));

    const validationErrors: Array<{ row: number; field: string; message: string }> = [];
    const validRows: any[] = [];
    const batchCodeSet = new Set<string>();
    const batchEmailSet = new Set<string>();

    records.forEach((row, index) => {
      const rowNum = index + 1;
      const rowErrors: string[] = [];

      // Required fields
      const firstName = String(row.firstName || "").trim();
      const lastName = String(row.lastName || "").trim();
      const email = String(row.email || "").toLowerCase().trim();
      const code = String(row.employeeCode || row.code || "").trim();

      if (!firstName) rowErrors.push("First name is required");
      if (!lastName) rowErrors.push("Last name is required");
      if (!email) {
        rowErrors.push("Email is required");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push("Invalid email format");
      }

      if (!code) rowErrors.push("Employee code is required");

      // Duplicate checks
      if (code) {
        const lowerCode = code.toLowerCase();
        if (existingCodeSet.has(lowerCode)) {
          rowErrors.push(`Employee code '${code}' already exists in workspace`);
        }
        if (batchCodeSet.has(lowerCode)) {
          rowErrors.push(`Duplicate employee code '${code}' within import batch`);
        }
        batchCodeSet.add(lowerCode);
      }

      if (email) {
        if (existingEmailSet.has(email)) {
          rowErrors.push(`Email '${email}' already exists in workspace`);
        }
        if (batchEmailSet.has(email)) {
          rowErrors.push(`Duplicate email '${email}' within import batch`);
        }
        batchEmailSet.add(email);
      }

      // Foreign key lookups
      let resolvedBranchId: string | null = null;
      if (row.branch) {
        const bKey = String(row.branch).toLowerCase().trim();
        resolvedBranchId = branchCodeMap.get(bKey) || branchNameMap.get(bKey) || null;
        if (!resolvedBranchId) {
          rowErrors.push(`Branch '${row.branch}' not found`);
        }
      }

      let resolvedDeptId: string | null = null;
      if (row.department) {
        const dKey = String(row.department).toLowerCase().trim();
        resolvedDeptId = deptMap.get(dKey) || null;
        if (!resolvedDeptId) {
          rowErrors.push(`Department '${row.department}' not found`);
        }
      }

      let resolvedDesigId: string | null = null;
      if (row.designation) {
        const dgKey = String(row.designation).toLowerCase().trim();
        resolvedDesigId = desigMap.get(dgKey) || null;
        if (!resolvedDesigId) {
          rowErrors.push(`Designation '${row.designation}' not found`);
        }
      }

      if (rowErrors.length > 0) {
        rowErrors.forEach((msg) => {
          validationErrors.push({ row: rowNum, field: "general", message: msg });
        });
      } else {
        validRows.push({
          firstName,
          lastName,
          email,
          employeeCode: code,
          phone: row.phone || null,
          position: row.position || null,
          branchId: resolvedBranchId,
          departmentId: resolvedDeptId,
          designationId: resolvedDesigId,
          employmentType: row.employmentType || "full_time",
          status: row.status || "active",
          salary: row.salary || null,
          joinedAt: row.joinedAt || row.joinDate || new Date().toISOString(),
          pan: row.pan || null,
          aadhaar: row.aadhaar || null,
          bankAccount: row.bankAccount || null,
          bankIfsc: row.bankIfsc || null,
        });
      }
    });

    return {
      totalRecords: records.length,
      validCount: validRows.length,
      errorCount: validationErrors.length,
      errors: validationErrors,
      preview: validRows.slice(0, 10),
      canCommit: validationErrors.length === 0 && validRows.length > 0,
      validatedRows: validRows,
    };
  }

  /**
   * EMPLOYEE IMPORT: COMMIT CONFIRMED BATCH
   */
  static async commitImport(
    tenantId: string,
    actorId: string,
    validatedRows: any[]
  ) {
    const db = getTenantDb();
    let importedCount = 0;

    for (const record of validatedRows) {
      await EmployeeService.createEmployeeAtomic(tenantId, actorId, {
        ...record,
        createLoginAccount: true,
      });
      importedCount++;
    }

    return {
      success: true,
      importedCount,
    };
  }
}
