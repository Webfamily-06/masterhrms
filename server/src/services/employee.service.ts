import bcrypt from "bcryptjs";
import { getTenantDb, getTenantContext } from "../context/tenant-context";
import { rawPrisma } from "../prisma";
import { provisionEmployeeUser } from "../lib/auth-helpers";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { NotificationService } from "./notification.service";
import { sanitizeSensitiveFields } from "../lib/field-security";
import { attachAllowedActions } from "../lib/allowed-actions";
import { buildDataScopeFilter, UserSecurityContext, DataScope } from "../lib/data-scope";
import { EmployeeSystemIdService } from "./employee-system-id.service";
import { validateAndNormalizeServerPhone } from "../lib/phone-validation";

export interface UpdateEmployeeInput {
  // Step 1: Personal
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  avatarUrl?: string | null;
  bloodGroup?: string | null;

  // Step 2: Employment
  branchId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  joinedAt?: string | Date | null;
  employmentType?: "full_time" | "part_time" | "contract" | "intern";
  status?: "active" | "inactive" | "on_leave" | "terminated";
  shiftId?: string | null;
  attendancePolicyId?: string | null;
  workMode?: string | null;

  // Step 3: Contact
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactRelationshipOther?: string | null;
  emergencyContactPhone?: string | null;

  // Step 4: Banking & Statutory
  bankName?: string | null;
  accountHolderName?: string | null;
  bankAccount?: string | null;
  bicSwift?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  taxPayerId?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  uan?: string | null;
  esiNumber?: string | null;
  pfNumber?: string | null;
  taxRegime?: string | null;
  salary?: number | string | null;

  // Step 5: Documents
  documents?: Array<{
    title: string;
    mediaUrl?: string;
    fileUrl?: string;
    documentType?: string;
    category?: string;
    expiryDate?: string | Date | null;
  }>;
}

export interface CreateEmployeeInput {
  // Step 1: Personal
  firstName: string;
  lastName: string;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  avatarUrl?: string | null;
  maritalStatus?: string | null;
  bloodGroup?: string | null;

  // Step 2: Contact
  email: string;
  phone?: string | null;
  address?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactRelationshipOther?: string | null;
  emergencyContactPhone?: string | null;

  // Step 3: Job
  employeeCode?: string;
  systemId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  managerId?: string | null;
  position?: string | null;
  employmentType?: "full_time" | "part_time" | "contract" | "intern";
  status?: "active" | "inactive" | "on_leave" | "terminated";
  joinedAt?: string | Date | null;
  workMode?: string | null;

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
    mediaUrl?: string;
    fileUrl?: string;
    documentType?: string;
    category?: string;
    expiryDate?: string | Date | null;
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
    if (input.employeeCode) {
      const existingCode = await db.employee.findFirst({
        where: { tenantId, employeeCode: input.employeeCode },
      });
      if (existingCode) {
        throw new Error(`An employee with code '${input.employeeCode}' already exists in this workspace.`);
      }
    }

    if (input.email) {
      const existingEmail = await db.employee.findFirst({
        where: { tenantId, email: input.email.toLowerCase().trim() },
      });
      if (existingEmail) {
        throw new Error(`An employee with email '${input.email}' already exists in this workspace.`);
      }
    }

    // Phone format validation
    if (input.phone) {
      const phoneValidation = validateAndNormalizeServerPhone(input.phone, false, input.country || "India");
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.error || "Invalid phone number format.");
      }
    }
    if (input.emergencyContactPhone) {
      const emergencyValidation = validateAndNormalizeServerPhone(input.emergencyContactPhone, false, input.country || "India");
      if (!emergencyValidation.isValid) {
        throw new Error(emergencyValidation.error || "Invalid emergency contact phone number format.");
      }
    }

    // 2. Execute Transaction
    const result = await db.$transaction(
      async (tx: any) => {
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

      // Step B: Generate immutable System ID & Create Employee record
      const systemId = await EmployeeSystemIdService.generateSystemId(tenantId, input.branchId, tx);
      const finalEmployeeCode = input.employeeCode ? input.employeeCode.trim() : systemId;

      const employee = await tx.employee.create({
        data: {
          tenantId,
          userId,
          employeeCode: finalEmployeeCode,
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
          state: input.state || null,
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

      // Step B2: Persist extended fields, address, blood group & immutable System ID in metadata
      await EmployeeService.setEmployeeMetadata(tenantId, employee.id, {
        systemId,
        bloodGroup: input.bloodGroup,
        district: input.district,
        country: input.country || "India",
        addressLine1: input.addressLine1 || input.address,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode || input.zipCode,
        emergencyContactName: input.emergencyContactName,
        emergencyContactRelationship: input.emergencyContactRelationship,
        emergencyContactRelationshipOther: input.emergencyContactRelationshipOther,
        emergencyContactPhone: input.emergencyContactPhone,
        avatarUrl: input.avatarUrl,
        workMode: input.workMode || null,
      });

      // Step C: Optional documents attachment
      if (input.documents && input.documents.length > 0) {
        for (const doc of input.documents) {
          const randomCode = Math.floor(1000 + Math.random() * 9000);
          await tx.companyDocument.create({
            data: {
              tenantId,
              employeeId: employee.id,
              documentCode: `DOC-${randomCode}`,
              title: doc.title,
              category: doc.category || doc.documentType || "Employment Contract",
              fileName: `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
              fileUrl: doc.mediaUrl || doc.fileUrl || null,
              fileSize: "1.2 MB",
              fileType: "application/pdf",
              status: "verified",
              requiresSignature: false,
              expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
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
    },
    {
      timeout: 25000,
      maxWait: 15000,
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
    if (query.status && query.status !== "all") {
      if (query.status === "inactive") {
        where.status = "inactive";
      } else if (query.status === "probation") {
        where.probationRecords = { some: { status: { in: ["active", "extended", "ongoing"] } } };
      } else {
        where.status = query.status;
      }
    }
    if (query.employmentType && query.employmentType !== "all") where.employmentType = query.employmentType;
    if (query.managerId) where.managerId = query.managerId;

    const sortBy = query.sortBy || "createdAt";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

    // Base scope for counting tab tallies across the tenant (respecting selected org filters)
    const baseWhere: any = { tenantId, ...scopeFilter };
    if (query.branchId && query.branchId !== "all") baseWhere.branchId = query.branchId;
    if (query.departmentId && query.departmentId !== "all") baseWhere.departmentId = query.departmentId;
    if (query.designationId && query.designationId !== "all") baseWhere.designationId = query.designationId;
    if (query.employmentType && query.employmentType !== "all") baseWhere.employmentType = query.employmentType;

    const [total, rawEmployees, allCount, activeCount, inactiveCount, probationCount, terminatedCount] = await Promise.all([
      db.employee.count({ where }),
      db.employee.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          user: {
            select: {
              id: true,
              email: true,
              roles: {
                where: { tenantId },
                select: { id: true, role: true },
              },
              profile: { select: { avatarUrl: true } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      db.employee.count({ where: baseWhere }),
      db.employee.count({ where: { ...baseWhere, status: "active" } }),
      db.employee.count({ where: { ...baseWhere, status: "inactive" } }),
      db.employee.count({ where: { ...baseWhere, probationRecords: { some: { status: { in: ["active", "extended", "ongoing"] } } } } }),
      db.employee.count({ where: { ...baseWhere, status: "terminated" } }),
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

    const empIds = rawEmployees.map((e: any) => e.id);
    const metaAvatarMap = new Map<string, string | null>();
    if (empIds.length > 0) {
      try {
        const cf = await (db as any).customField.findFirst({
          where: { tenantId, module: "EMPLOYEE", label: "avatarUrl" },
          select: { id: true },
        });
        if (cf) {
          const cfValues = await (db as any).customFieldValue.findMany({
            where: {
              tenantId,
              customFieldId: cf.id,
              entityId: { in: empIds },
            },
            select: { entityId: true, value: true },
          });
          for (const cfv of cfValues) {
            metaAvatarMap.set(
              cfv.entityId,
              cfv.value && cfv.value.trim().length > 0 ? cfv.value.trim() : null
            );
          }
        }
      } catch (cfErr: any) {
        console.warn("[listEmployees avatar metadata warning]:", cfErr.message);
      }
    }

    const enrichedEmployees = withActions.map((emp: any) => {
      const userAvatar = emp.user?.profile?.avatarUrl || null;
      let canonicalAvatar: string | null = null;
      if (metaAvatarMap.has(emp.id)) {
        canonicalAvatar = metaAvatarMap.get(emp.id) || null;
      } else {
        canonicalAvatar = userAvatar;
      }

      return {
        ...emp,
        loginStatus: emp.userId ? "active" : "inactive",
        avatarUrl: canonicalAvatar,
        avatar_url: canonicalAvatar,
      };
    });

    return {
      data: enrichedEmployees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts: {
        all: allCount,
        active: activeCount,
        inactive: inactiveCount,
        probation: probationCount,
        terminated: terminatedCount,
      },
    };
  }

  /**
   * EMPLOYEE 360 CONSOLIDATED PROFILE
   */
  static async getEmployee360(
    tenantId: string,
    employeeId: string,
    userContext?: UserSecurityContext,
    userPermissions: string[] = []
  ) {
    const effectiveContext: UserSecurityContext = userContext || {
      userId: "system",
      roles: ["admin", "hr_admin"],
      status: "ACTIVE",
      tenancyStrategy: "SHARED_SCHEMA",
    };
    const effectivePermissions = userPermissions || [];
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
            profile: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                phone: true,
              },
            },
          },
        },
        companyDocuments: {
          orderBy: { createdAt: "desc" },
        },
        generatedLetters: {
          include: { template: true },
          orderBy: { issuedAt: "desc" },
        },
        probationRecords: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        shiftRosters: {
          include: { shift: true },
          orderBy: { rosterDate: "desc" },
          take: 1,
        },
        employeeContracts: {
          include: { contractType: true },
          orderBy: { createdAt: "desc" },
          take: 1,
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
    const canViewSensitive =
      effectiveContext.roles.some((r) =>
        ["admin", "hr_admin", "super_admin", "Workspace Admin"].includes(r)
      ) ||
      effectivePermissions.includes("hr:employee:sensitive:read") ||
      effectivePermissions.includes("hr:employee:sensitive:write") ||
      effectivePermissions.includes("hr:sensitive:read") ||
      effectivePermissions.includes("hr:sensitive:write") ||
      effectivePermissions.includes("hrm.sensitive.edit");
    const isSelf = employee.id === effectiveContext.employeeId || employee.userId === effectiveContext.userId;
    const canViewCompensation = canViewSensitive || isSelf;

    const masked = sanitizeSensitiveFields(employee, {
      canViewSensitive,
      canViewCompensation,
      isSelf,
    });

    const metadata = await EmployeeService.getEmployeeMetadata(tenantId, employeeId);
    const userAvatar = (employee as any).user?.profile?.avatarUrl || null;
    let canonicalAvatar: string | null = null;
    if (metadata.avatarUrl !== undefined) {
      canonicalAvatar =
        metadata.avatarUrl && metadata.avatarUrl.trim().length > 0
          ? metadata.avatarUrl.trim()
          : null;
    } else {
      canonicalAvatar = userAvatar;
    }

    const transformedEmployee = {
      ...masked,
      systemId: metadata.systemId || employee.id,
      bloodGroup: metadata.bloodGroup || null,
      district: metadata.district || null,
      avatarUrl: canonicalAvatar,
      avatar_url: canonicalAvatar,
      addressLine1: metadata.addressLine1 || "",
      addressLine2: metadata.addressLine2 || "",
      city: metadata.city || "",
      state: (employee as any).state || metadata.state || "",
      country: metadata.country || "India",
      postalCode: metadata.postalCode || "",
      emergencyContactName: metadata.emergencyContactName || "",
      emergencyContactRelationship: metadata.emergencyContactRelationship || "",
      emergencyContactRelationshipOther: metadata.emergencyContactRelationshipOther || "",
      emergencyContactPhone: metadata.emergencyContactPhone || "",
      accountHolderName: metadata.accountHolderName || `${employee.firstName} ${employee.lastName}`,
      bicSwift: metadata.bicSwift || "",
      taxPayerId: metadata.taxPayerId || employee.pan || "",
      shiftId: metadata.shiftId || (employee.shiftRosters?.[0]?.shiftId ?? null),
      workMode: metadata.workMode || null,
      metadata: {
        ...metadata,
        avatarUrl: canonicalAvatar,
        workMode: metadata.workMode || null,
        systemId: metadata.systemId || employee.id,
      },
    };

    const sanitizedTransformed = sanitizeSensitiveFields(transformedEmployee, {
      canViewSensitive,
      canViewCompensation,
      isSelf,
    });

    // Attach allowed actions
    const withActions = attachAllowedActions(
      "Employee",
      sanitizedTransformed,
      effectiveContext,
      effectivePermissions
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

  /**
   * Helper to fetch employee extended metadata stored in custom field values
   */
  static async getEmployeeMetadata(tenantId: string, employeeId: string): Promise<Record<string, string>> {
    const ctx = getTenantContext();
    const db = ctx ? getTenantDb() : rawPrisma;
    try {
      const values = await (db as any).customFieldValue.findMany({
        where: { tenantId, entityId: employeeId },
        include: { customField: true },
      });
      const result: Record<string, string> = {};
      for (const v of values) {
        if (v.customField?.label) {
          result[v.customField.label] = v.value || "";
        }
      }
      return result;
    } catch (err) {
      console.warn("[getEmployeeMetadata Warning]:", err);
      return {};
    }
  }

  /**
   * Helper to persist employee extended metadata into custom field values
   */
  static async setEmployeeMetadata(
    tenantId: string,
    employeeId: string,
    metadata: Record<string, string | null | undefined>
  ) {
    const ctx = getTenantContext();
    const db = ctx ? getTenantDb() : rawPrisma;
    for (const [key, val] of Object.entries(metadata)) {
      if (val === undefined) continue;
      try {
        let cf = await (db as any).customField.findFirst({
          where: { tenantId, module: "EMPLOYEE", label: key },
        });
        if (!cf) {
          cf = await (db as any).customField.create({
            data: {
              tenantId,
              module: "EMPLOYEE",
              label: key,
              fieldType: "text",
              status: "active",
            },
          });
        }
        await (db as any).customFieldValue.upsert({
          where: {
            customFieldId_entityId: {
              customFieldId: cf.id,
              entityId: employeeId,
            },
          },
          create: {
            tenantId,
            customFieldId: cf.id,
            entityId: employeeId,
            value: val === null ? "" : String(val),
          },
          update: {
            value: val === null ? "" : String(val),
          },
        });
      } catch (err) {
        console.warn(`[setEmployeeMetadata Warning for ${key}]:`, err);
      }
    }
  }

  /**
   * UPDATE EMPLOYEE
   * Updates an existing employee with comprehensive validation, role authorization,
   * sensitive financial field enforcement, avatar/password updates, and metadata persistence.
   */
  static async updateEmployee(
    tenantId: string,
    actorId: string,
    employeeId: string,
    input: UpdateEmployeeInput,
    userContext: UserSecurityContext,
    userPermissions: string[]
  ) {
    const db = getTenantDb();

    // 1. Employee existence check
    const existing = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        department: true,
        branch: true,
        designation: true,
        user: { include: { profile: true } },
      },
    });

    if (!existing) {
      const err: any = new Error("Employee not found in current workspace");
      err.statusCode = 404;
      throw err;
    }

    // 2. Role authorization check: Employees cannot edit employee records
    const isEmployeeRoleOnly =
      userContext.roles.length === 1 && userContext.roles[0] === "employee";
    if (isEmployeeRoleOnly) {
      const err: any = new Error("Forbidden: Employees are not permitted to edit employee records.");
      err.statusCode = 403;
      throw err;
    }

    // 3. Validation: Code uniqueness within tenant (excluding this employee)
    if (input.employeeCode && input.employeeCode.trim() !== existing.employeeCode) {
      const codeDuplicate = await db.employee.findFirst({
        where: {
          tenantId,
          employeeCode: input.employeeCode.trim(),
          id: { not: employeeId },
        },
      });
      if (codeDuplicate) {
        const err: any = new Error(`An employee with code '${input.employeeCode}' already exists in this workspace.`);
        err.statusCode = 400;
        throw err;
      }
    }

    // 4. Validation: Email uniqueness & format (excluding this employee)
    if (input.email && input.email.toLowerCase().trim() !== existing.email.toLowerCase()) {
      const emailTrimmed = input.email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        const err: any = new Error("Invalid email format");
        err.statusCode = 400;
        throw err;
      }
      const emailDuplicate = await db.employee.findFirst({
        where: {
          tenantId,
          email: emailTrimmed,
          id: { not: employeeId },
        },
      });
      if (emailDuplicate) {
        const err: any = new Error(`An employee with email '${input.email}' already exists in this workspace.`);
        err.statusCode = 400;
        throw err;
      }
    }

    // 4b. Validation: Phone format & length
    if (input.phone) {
      const phoneValidation = validateAndNormalizeServerPhone(
        input.phone,
        false,
        input.country || (existing as any).state || "India"
      );
      if (!phoneValidation.isValid) {
        const err: any = new Error(phoneValidation.error || "Invalid phone number format.");
        err.statusCode = 400;
        throw err;
      }
    }
    if (input.emergencyContactPhone) {
      const emergencyValidation = validateAndNormalizeServerPhone(
        input.emergencyContactPhone,
        false,
        input.country || (existing as any).state || "India"
      );
      if (!emergencyValidation.isValid) {
        const err: any = new Error(emergencyValidation.error || "Invalid emergency contact phone number format.");
        err.statusCode = 400;
        throw err;
      }
    }

    // 5. Validation: Foreign keys belong to tenant
    if (input.branchId && input.branchId !== existing.branchId) {
      const branch = await db.branch.findFirst({ where: { id: input.branchId, tenantId } });
      if (!branch) {
        const err: any = new Error("Selected branch does not belong to this workspace.");
        err.statusCode = 400;
        throw err;
      }
    }
    if (input.departmentId && input.departmentId !== existing.departmentId) {
      const dept = await db.department.findFirst({ where: { id: input.departmentId, tenantId } });
      if (!dept) {
        const err: any = new Error("Selected department does not belong to this workspace.");
        err.statusCode = 400;
        throw err;
      }
    }
    if (input.designationId && input.designationId !== existing.designationId) {
      const desig = await db.designation.findFirst({ where: { id: input.designationId, tenantId } });
      if (!desig) {
        const err: any = new Error("Selected designation does not belong to this workspace.");
        err.statusCode = 400;
        throw err;
      }
    }

    // 6. Sensitive Financial & Statutory authorization check
    const hasSensitivePermission =
      userPermissions.includes("hr:employee:sensitive:write") ||
      userPermissions.includes("hr:sensitive:write") ||
      userPermissions.includes("hrm.sensitive.edit") ||
      userContext.isSuperAdmin ||
      userContext.roles.includes("super_admin") ||
      ((userContext.isTenantAdmin || userContext.roles.includes("admin") || userContext.roles.includes("Workspace Admin") || userContext.roles.includes("hr_admin") || userContext.roles.includes("HR Manager")) &&
        (userPermissions.length === 0 || userPermissions.includes("hr:employee:sensitive:write") || userPermissions.includes("hrm.sensitive.edit")));

    const currentMeta = await EmployeeService.getEmployeeMetadata(tenantId, employeeId);

    const sensitiveFieldsToCheck: Array<{ name: string; cur: string; inputVal?: any }> = [
      { name: "salary", cur: existing.salary ? String(existing.salary) : "", inputVal: input.salary },
      { name: "bankName", cur: existing.bankName || "", inputVal: input.bankName },
      { name: "bankAccount", cur: existing.bankAccount || "", inputVal: input.bankAccount },
      { name: "bankIfsc", cur: existing.bankIfsc || "", inputVal: input.bankIfsc },
      { name: "bicSwift", cur: currentMeta.bicSwift || "", inputVal: input.bicSwift },
      { name: "bankBranch", cur: existing.bankBranch || "", inputVal: input.bankBranch },
      { name: "pan", cur: existing.pan || currentMeta.taxPayerId || "", inputVal: input.pan !== undefined ? input.pan : input.taxPayerId },
      { name: "accountHolderName", cur: currentMeta.accountHolderName || "", inputVal: input.accountHolderName },
      { name: "aadhaar", cur: existing.aadhaar || "", inputVal: input.aadhaar },
      { name: "uan", cur: existing.uan || "", inputVal: input.uan },
      { name: "esiNumber", cur: existing.esiNumber || "", inputVal: input.esiNumber },
      { name: "pfNumber", cur: existing.pfNumber || "", inputVal: input.pfNumber },
      { name: "taxRegime", cur: existing.taxRegime || "", inputVal: input.taxRegime },
    ];

    const isModifyingSensitive = sensitiveFieldsToCheck.some((s) => {
      if (s.inputVal === undefined) return false;
      const cleanInput = s.inputVal === null ? "" : String(s.inputVal).trim();
      const cleanCur = s.cur.trim();
      return cleanInput !== "" && cleanInput !== cleanCur;
    });

    if (isModifyingSensitive && !hasSensitivePermission) {
      const err: any = new Error("Forbidden: You do not have explicit permission (hr:employee:sensitive:write) to modify sensitive financial or banking records.");
      err.statusCode = 403;
      throw err;
    }

    // 7. Atomic Execution
    await db.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (input.firstName !== undefined) updateData.firstName = input.firstName.trim();
      if (input.lastName !== undefined) updateData.lastName = input.lastName.trim();
      if (input.employeeCode !== undefined) updateData.employeeCode = input.employeeCode.trim();
      if (input.email !== undefined) updateData.email = input.email.toLowerCase().trim();
      if (input.phone !== undefined) updateData.phone = input.phone ? input.phone.trim() : null;
      if (input.dateOfBirth !== undefined) updateData.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
      if (input.gender !== undefined) updateData.gender = input.gender || null;
      if (input.branchId !== undefined) updateData.branchId = input.branchId || null;
      if (input.departmentId !== undefined) updateData.departmentId = input.departmentId || null;
      if (input.designationId !== undefined) updateData.designationId = input.designationId || null;
      if (input.managerId !== undefined) updateData.managerId = input.managerId || null;
      if (input.position !== undefined) updateData.position = input.position ? input.position.trim() : null;
      if (input.joinedAt !== undefined) updateData.joinedAt = input.joinedAt ? new Date(input.joinedAt) : null;
      if (input.employmentType !== undefined) updateData.employmentType = input.employmentType;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.state !== undefined) updateData.state = input.state;

      if (hasSensitivePermission) {
        if (input.salary !== undefined) {
          updateData.salary = input.salary !== null && input.salary !== "" ? String(input.salary) : null;
        }
        if (input.bankName !== undefined) updateData.bankName = input.bankName ? input.bankName.trim() : null;
        if (input.bankAccount !== undefined) updateData.bankAccount = input.bankAccount ? input.bankAccount.trim() : null;
        if (input.bankIfsc !== undefined) {
          updateData.bankIfsc = input.bankIfsc ? input.bankIfsc.trim().toUpperCase() : null;
        } else if (input.bicSwift !== undefined) {
          updateData.bankIfsc = input.bicSwift ? input.bicSwift.trim().toUpperCase() : null;
        }
        if (input.bankBranch !== undefined) updateData.bankBranch = input.bankBranch ? input.bankBranch.trim() : null;
        if (input.pan !== undefined || input.taxPayerId !== undefined) {
          const rawPan = input.pan !== undefined ? input.pan : input.taxPayerId;
          updateData.pan = rawPan ? rawPan.trim().toUpperCase() : null;
        }
        if (input.aadhaar !== undefined) updateData.aadhaar = input.aadhaar ? input.aadhaar.trim() : null;
        if (input.uan !== undefined) updateData.uan = input.uan ? input.uan.trim() : null;
        if (input.esiNumber !== undefined) updateData.esiNumber = input.esiNumber ? input.esiNumber.trim() : null;
        if (input.pfNumber !== undefined) updateData.pfNumber = input.pfNumber ? input.pfNumber.trim() : null;
        if (input.taxRegime !== undefined) updateData.taxRegime = input.taxRegime ? input.taxRegime.trim() : "new";
      }

      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: updateData,
        include: {
          department: true,
          branch: true,
          designation: true,
        },
      });

      // Update User password and avatar if user exists (or link by email)
      let targetUserId = existing.userId;
      if (!targetUserId && existing.email) {
        const matchingUser = await tx.user.findFirst({
          where: { email: existing.email.toLowerCase().trim() },
        });
        if (matchingUser) {
          targetUserId = matchingUser.id;
          await tx.employee.update({
            where: { id: employeeId },
            data: { userId: targetUserId },
          });
        }
      }

      if (targetUserId) {
        if (input.password && input.password.trim().length > 0) {
          const passwordHash = await bcrypt.hash(input.password.trim(), 10);
          await tx.user.update({
            where: { id: targetUserId },
            data: { passwordHash },
          });
        }

        const profileData: any = {};
        if (input.firstName !== undefined || input.lastName !== undefined) {
          const fn = input.firstName !== undefined ? input.firstName.trim() : existing.firstName;
          const ln = input.lastName !== undefined ? input.lastName.trim() : existing.lastName;
          profileData.fullName = `${fn} ${ln}`.trim();
        }
        if (input.phone !== undefined) profileData.phone = input.phone || null;
        if (input.avatarUrl !== undefined) {
          const trimmed = input.avatarUrl ? input.avatarUrl.trim() : null;
          profileData.avatarUrl = trimmed && trimmed.length > 0 ? trimmed : null;
        }

        if (Object.keys(profileData).length > 0) {
          try {
            await tx.profile.upsert({
              where: { userId: targetUserId },
              create: {
                userId: targetUserId,
                tenantId,
                ...profileData,
              },
              update: {
                tenantId,
                ...profileData,
              },
            });
          } catch (profileErr: any) {
            console.warn("Profile synchronization non-fatal warning:", profileErr.message);
          }
        }
      }

      // Upsert Shift Roster if shiftId provided
      if (input.shiftId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await tx.shiftRoster.upsert({
          where: {
            tenantId_employeeId_rosterDate: {
              tenantId,
              employeeId,
              rosterDate: today,
            },
          },
          create: {
            tenantId,
            employeeId,
            shiftId: input.shiftId,
            rosterDate: today,
          },
          update: {
            shiftId: input.shiftId,
          },
        });
      }

      // Attach any inline documents if provided
      if (input.documents && input.documents.length > 0) {
        for (const doc of input.documents) {
          const randomCode = Math.floor(1000 + Math.random() * 9000);
          await tx.companyDocument.create({
            data: {
              tenantId,
              employeeId,
              documentCode: `DOC-${randomCode}`,
              title: doc.title,
              category: doc.category || doc.documentType || "Employment Contract",
              fileName: `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
              fileUrl: doc.mediaUrl || doc.fileUrl || null,
              fileSize: "1.2 MB",
              fileType: "application/pdf",
              status: "verified",
              requiresSignature: false,
              expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
            },
          });
        }
      }

      // Audit log mutation
      await AuditService.logMutation(
        {
          tenantId,
          actorId,
          action: "EMPLOYEE_UPDATE",
          entityType: "Employee",
          entityId: employeeId,
          oldState: {
            employeeCode: existing.employeeCode,
            email: existing.email,
            status: existing.status,
            branchId: existing.branchId,
            departmentId: existing.departmentId,
            designationId: existing.designationId,
          },
          newState: {
            employeeCode: emp.employeeCode,
            email: emp.email,
            status: emp.status,
            branchId: emp.branchId,
            departmentId: emp.departmentId,
            designationId: emp.designationId,
          },
        },
        tx
      );

      // Outbox event
      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "employee.updated",
          entityType: "Employee",
          entityId: employeeId,
          actorId,
          payload: {
            id: employeeId,
            employeeCode: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            department: emp.department?.name,
            branch: emp.branch?.name,
          },
        },
        tx
      );
    });

    const metaUpdates: Record<string, string | null | undefined> = {
      bloodGroup: input.bloodGroup,
      avatarUrl:
        input.avatarUrl !== undefined
          ? input.avatarUrl && input.avatarUrl.trim().length > 0
            ? input.avatarUrl.trim()
            : null
          : undefined,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      district: input.district,
      state: input.state,
      country: input.country,
      postalCode: input.postalCode,
      emergencyContactName: input.emergencyContactName,
      emergencyContactRelationship: input.emergencyContactRelationship,
      emergencyContactRelationshipOther: input.emergencyContactRelationshipOther,
      emergencyContactPhone: input.emergencyContactPhone,
      shiftId: input.shiftId,
      attendancePolicyId: input.attendancePolicyId,
      workMode: (input as any).workMode !== undefined ? (input as any).workMode : undefined,
    };

    if (hasSensitivePermission) {
      if (input.accountHolderName !== undefined) metaUpdates.accountHolderName = input.accountHolderName ? input.accountHolderName.trim() : null;
      if (input.bicSwift !== undefined) metaUpdates.bicSwift = input.bicSwift ? input.bicSwift.trim().toUpperCase() : null;
      if (input.taxPayerId !== undefined) metaUpdates.taxPayerId = input.taxPayerId ? input.taxPayerId.trim().toUpperCase() : null;
      if (input.pan !== undefined && !input.taxPayerId) metaUpdates.taxPayerId = input.pan ? input.pan.trim().toUpperCase() : null;
    }

    await EmployeeService.setEmployeeMetadata(tenantId, employeeId, metaUpdates);

    // 9. Return fresh 360 profile
    return await EmployeeService.getEmployee360(tenantId, employeeId, userContext, userPermissions);
  }

  /**
   * CHANGE EMPLOYEE PASSWORD
   * Securely updates an employee's authentication credential using bcrypt (10 rounds).
   * Validates permissions, tenant isolation, password policy, and logs an audit record.
   * Zero plaintext password storage, zero credential leakage.
   */
  static async changeEmployeePassword(
    tenantId: string,
    actorId: string,
    employeeId: string,
    newPassword: string,
    userContext: UserSecurityContext
  ) {
    const db = getTenantDb();

    // 1. Password policy validation (must be at least 6 characters)
    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
      const err: any = new Error("Password must be at least 6 characters long.");
      err.statusCode = 400;
      throw err;
    }

    // 2. Fetch employee with tenant isolation
    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        user: {
          include: {
            roles: { where: { tenantId } },
          },
        },
      },
    });

    if (!employee) {
      const err: any = new Error("Employee not found in current workspace.");
      err.statusCode = 404;
      throw err;
    }

    // 3. Authorization check: caller must have administrative permissions or be the employee
    const canManage = userContext.roles.some((r) =>
      ["admin", "hr_admin", "super_admin", "Workspace Admin", "tenant_admin"].includes(r)
    ) || (userContext.employeeId === employeeId);

    if (!canManage) {
      const err: any = new Error("Forbidden: You do not have permission to change this employee's password.");
      err.statusCode = 403;
      throw err;
    }

    // 4. Protect super admins from non-super admins
    const isCallerSuperAdmin = userContext.roles.includes("super_admin");
    if (employee.user?.roles?.some((r: any) => r.role === "super_admin") && !isCallerSuperAdmin) {
      const err: any = new Error("Forbidden: Cannot reset Super Administrator password.");
      err.statusCode = 403;
      throw err;
    }

    // 5. Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

    // 6. Transactional update or provisioning
    await db.$transaction(async (tx: any) => {
      let targetUserId = employee.userId;

      if (!targetUserId) {
        // Provision new user login account
        targetUserId = await provisionEmployeeUser(tx, {
          tenantId,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          phone: employee.phone,
          password: newPassword.trim(),
        });

        await tx.employee.update({
          where: { id: employeeId },
          data: { userId: targetUserId },
        });
      } else {
        // Update existing user's passwordHash
        await tx.user.update({
          where: { id: targetUserId },
          data: { passwordHash },
        });

        // Ensure user has profile and role in this tenant
        await tx.profile.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            tenantId,
            fullName: `${employee.firstName} ${employee.lastName}`.trim(),
            email: employee.email,
          },
          update: {
            tenantId,
          },
        });

        await tx.userRole.upsert({
          where: {
            userId_role_tenantId: {
              userId: targetUserId,
              role: "employee",
              tenantId,
            },
          },
          create: {
            userId: targetUserId,
            role: "employee",
            tenantId,
          },
          update: {},
        });
      }
    });

    // 7. Audit log (never log password or hash)
    await AuditService.logMutation({
      tenantId,
      actorId,
      action: "EMPLOYEE_PASSWORD_RESET",
      entityType: "Employee",
      entityId: employeeId,
      metadata: {
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.email,
      },
    });

    return {
      success: true,
      message: `Password successfully updated for ${employee.firstName} ${employee.lastName}.`,
    };
  }

  /**
   * TOGGLE EMPLOYEE ACCOUNT STATUS
   * Activates or deactivates an employee's login access in this workspace.
   * Does NOT alter employment status (active / on_leave / terminated), salary, attendance, or payroll.
   * Enforces self-deactivation protection, Super Admin protection, and logs an audit trail.
   */
  static async toggleEmployeeAccountStatus(
    tenantId: string,
    actorId: string,
    employeeId: string,
    userContext: UserSecurityContext
  ) {
    const db = getTenantDb();

    // 1. Fetch employee with tenant isolation
    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        user: {
          include: {
            roles: { where: { tenantId } },
          },
        },
      },
    });

    if (!employee) {
      const err: any = new Error("Employee not found in current workspace.");
      err.statusCode = 404;
      throw err;
    }

    // 2. Authorization check
    const canManage = userContext.roles.some((r) =>
      ["admin", "hr_admin", "super_admin", "Workspace Admin", "tenant_admin"].includes(r)
    );

    if (!canManage) {
      const err: any = new Error("Forbidden: You do not have permission to toggle employee account status.");
      err.statusCode = 403;
      throw err;
    }

    // 3. Prevent self-deactivation
    if (employee.userId && employee.userId === actorId) {
      const err: any = new Error("You cannot deactivate your own administrative login account.");
      err.statusCode = 400;
      throw err;
    }

    // 4. Protect super admins
    if (employee.user?.roles?.some((r: any) => r.role === "super_admin")) {
      const err: any = new Error("Super Administrator accounts cannot be modified or deactivated.");
      err.statusCode = 403;
      throw err;
    }

    const isCurrentlyActive = Boolean(employee.userId);
    const targetStatus = isCurrentlyActive ? "inactive" : "active";

    await db.$transaction(async (tx: any) => {
      if (targetStatus === "inactive") {
        // Deactivate: remove tenant roles & role assignments, and unlink userId
        if (employee.userId) {
          await tx.userRole.deleteMany({
            where: {
              userId: employee.userId,
              tenantId,
            },
          });
          await tx.userRoleAssignment.deleteMany({
            where: {
              userId: employee.userId,
              tenantId,
            },
          });
          await tx.employee.update({
            where: { id: employeeId },
            data: { userId: null },
          });
        }
      } else {
        // Activate: provision if missing or restore userRole
        let targetUserId = employee.userId;
        if (!targetUserId) {
          const existingUser = await tx.user.findUnique({
            where: { email: employee.email.toLowerCase().trim() },
          });

          if (existingUser) {
            targetUserId = existingUser.id;
          } else {
            targetUserId = await provisionEmployeeUser(tx, {
              tenantId,
              email: employee.email,
              firstName: employee.firstName,
              lastName: employee.lastName,
              phone: employee.phone,
            });
          }

          await tx.employee.update({
            where: { id: employeeId },
            data: { userId: targetUserId },
          });
        }

        await tx.userRole.upsert({
          where: {
            userId_role_tenantId: {
              userId: targetUserId,
              role: "employee",
              tenantId,
            },
          },
          create: {
            userId: targetUserId,
            role: "employee",
            tenantId,
          },
          update: {},
        });

        await tx.profile.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            tenantId,
            fullName: `${employee.firstName} ${employee.lastName}`.trim(),
            email: employee.email,
          },
          update: {
            tenantId,
          },
        });
      }
    });

    // Audit log
    await AuditService.logMutation({
      tenantId,
      actorId,
      action: targetStatus === "inactive" ? "EMPLOYEE_ACCOUNT_DEACTIVATED" : "EMPLOYEE_ACCOUNT_ACTIVATED",
      entityType: "Employee",
      entityId: employeeId,
      oldState: {
        loginStatus: isCurrentlyActive ? "active" : "inactive",
      },
      newState: {
        loginStatus: targetStatus,
      },
      metadata: {
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.email,
      },
    });

    return {
      success: true,
      loginStatus: targetStatus,
      message: `Login account access for ${employee.firstName} ${employee.lastName} has been ${
        targetStatus === "active" ? "activated" : "deactivated"
      }.`,
    };
  }

  /**
   * UPDATE EMPLOYEE EMPLOYMENT STATUS
   * Updates employment status (active, inactive, on_leave, terminated) with role checks,
   * audit logging, and outbox event creation.
   */
  static async updateEmployeeStatus(
    tenantId: string,
    actorId: string,
    employeeId: string,
    status: "active" | "inactive" | "on_leave" | "terminated",
    userContext: UserSecurityContext
  ) {
    const validStatuses = ["active", "inactive", "on_leave", "terminated"];
    if (!validStatuses.includes(status)) {
      const err: any = new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(", ")}`);
      err.statusCode = 400;
      throw err;
    }

    const canManage = userContext.roles.some((r) =>
      ["admin", "hr_admin", "super_admin", "Workspace Admin", "tenant_admin"].includes(r)
    );
    if (!canManage) {
      const err: any = new Error("Forbidden: You do not have permission to update employee status.");
      err.statusCode = 403;
      throw err;
    }

    const db = getTenantDb();
    const existing = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!existing) {
      const err: any = new Error("Employee not found in current workspace");
      err.statusCode = 404;
      throw err;
    }

    const oldStatus = existing.status;
    const updated = await db.employee.update({
      where: { id: employeeId },
      data: { status: status as any },
    });

    await AuditService.logMutation(
      {
        tenantId,
        actorId,
        action: "EMPLOYEE_STATUS_CHANGE",
        entityType: "Employee",
        entityId: employeeId,
        oldState: { status: oldStatus },
        newState: { status },
      },
      db
    );

    await OutboxService.createOutboxEvent(
      {
        tenantId,
        eventType: "employee.status_changed",
        entityType: "Employee",
        entityId: employeeId,
        actorId,
        payload: {
          id: employeeId,
          oldStatus,
          newStatus: status,
        },
      },
      db
    );

    return updated;
  }
}

