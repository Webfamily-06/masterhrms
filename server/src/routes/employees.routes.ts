import { lockWorkspaceCapacity } from "../services/workspace-policy.service";
import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { requireAuth, requirePermission, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { provisionEmployeeUser } from "../lib/auth-helpers";

export const employeesRouter = Router();

// Enforce Request-Scoped Tenant Context on all employee endpoints
employeesRouter.use(requireAuth, resolveTenantContext);

// ---------------------------------------------------------------------------
// PII MASKING — WAVE 2 SECURITY ENFORCEMENT
// Protects Aadhaar, PAN, Bank Account numbers from exposure to non-privileged
// users. Only HR admins and payroll managers may see full statutory identifiers.
// Compliant with: Aadhaar Act 2016, DPDP Act 2023, Income-tax Act Section 139A.
// ---------------------------------------------------------------------------

/**
 * Returns true if the requesting user has elevated HR/Finance privileges that
 * entitle them to view full statutory PII (Aadhaar, PAN, bank account).
 */
function callerHasStatutoryPIIAccess(req: AuthRequest): boolean {
  if (!req.user) return false;
  // Super admins always have full access
  if (req.user.roles?.includes("super_admin")) return true;
  // Workspace Admin and HR Admin have full access (Workspace Admin bypass is in requirePermission)
  if (req.user.roles?.includes("admin") || req.user.roles?.includes("hr_admin") || req.user.roles?.includes("Workspace Admin")) return true;
  // Explicit HR/payroll permission — granted to HR managers and finance roles
  const hrPermissions = ["hrm.employees.manage", "hrm.payroll.manage"];
  const userPerms: string[] = (req.user as any).permissions || [];
  return hrPermissions.some((p) => userPerms.includes(p));
}

/**
 * Masks a numeric-identifier string, keeping only the last `visible` characters.
 * Example: maskNumeric("123456789012", 4) => "XXXXXXXX9012"
 */
function maskNumeric(value: string | null | undefined, visible = 4): string | null {
  if (!value) return value ?? null;
  const s = String(value);
  if (s.length <= visible) return s; // too short to meaningfully mask
  return "X".repeat(s.length - visible) + s.slice(-visible);
}

/**
 * Masks an alphanumeric PAN, keeping last 4 alphanumeric characters visible.
 * Example: maskPAN("ABCDE1234F") => "XXXXXX234F"
 */
function maskPAN(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  const s = String(value);
  if (s.length <= 4) return s;
  return "X".repeat(s.length - 4) + s.slice(-4);
}

/**
 * Apply statutory PII masking to a single employee record if the caller is
 * not entitled to view full sensitive identifiers.
 */
function applyPIIMask(employee: any, req: AuthRequest): any {
  if (!employee) return employee;
  if (callerHasStatutoryPIIAccess(req)) return employee; // no masking for privileged callers

  // Check self-access: employee can view their own profile unmasked
  const selfEmployeeId = (req.user as any)?.employeeId;
  if (selfEmployeeId && selfEmployeeId === employee.id) return employee;

  return {
    ...employee,
    aadhaar: maskNumeric(employee.aadhaar, 4),
    pan: maskPAN(employee.pan),
    bankAccount: maskNumeric(employee.bankAccount, 4),
    // UAN and ESI are less sensitive but mask for consistency
    uan: maskNumeric(employee.uan, 4),
    esiNumber: maskNumeric(employee.esiNumber, 4),
  };
}

/**
 * Apply PII masking to an array of employee records.
 */
function applyPIIMaskList(employees: any[], req: AuthRequest): any[] {
  if (callerHasStatutoryPIIAccess(req)) return employees;
  return employees.map((emp) => applyPIIMask(emp, req));
}

function parseEmployeeStatus(status?: any): "active" | "on_leave" | "terminated" {
  if (!status) return "active";
  const s = String(status).toLowerCase().trim();
  if (s === "on_leave" || s === "onleave" || s === "leave") return "on_leave";
  if (s === "terminated" || s === "inactive") return "terminated";
  return "active";
}

function parseEmploymentType(type?: any): "full_time" | "part_time" | "contract" | "intern" {
  if (!type) return "full_time";
  const t = String(type).toLowerCase().trim();
  if (t === "part_time" || t === "parttime") return "part_time";
  if (t === "contract") return "contract";
  if (t === "intern" || t === "internship") return "intern";
  return "full_time";
}


/**
 * Helper to safely extract tenantId with robust fallback
 */
async function getTenantId(req: AuthRequest): Promise<string> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw Object.assign(new Error("Workspace context required"), { status: 403 });
  return tenantId;
}


import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

// GET /api/employees (Stocky Rule 0: Universal Query Contract)
employeesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const pagination = parsePaginationParams(req, "createdAt", 50);
    const { departmentId, status, employmentType } = req.query;

    const where: any = { tenantId };

    if (pagination.search) {
      where.OR = [
        { firstName: { contains: pagination.search } },
        { lastName: { contains: pagination.search } },
        { email: { contains: pagination.search } },
        { employeeCode: { contains: pagination.search } },
        { phone: { contains: pagination.search } },
        { position: { contains: pagination.search } },
      ];
    }

    if (departmentId && departmentId !== "all") {
      where.departmentId = String(departmentId);
    }
    if (status && status !== "all") {
      where.status = parseEmployeeStatus(status);
    }
    if (employmentType && employmentType !== "all") {
      where.employmentType = parseEmploymentType(employmentType);
    }

    const sortField = ["firstName", "lastName", "employeeCode", "createdAt", "updatedAt", "joinedAt", "salary"].includes(pagination.sortField)
      ? pagination.sortField
      : "createdAt";

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          manager: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          user: {
            select: {
              profile: {
                select: { avatarUrl: true },
              },
            },
          },
        },
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    // WAVE 2 — Apply PII masking based on caller privilege
    const maskedEmployees = applyPIIMaskList(employees, req);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(maskedEmployees, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(maskedEmployees);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/employees
employeesRouter.post("/", requireAuth, requirePermission("hrm.employees.create"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);

    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      employeeCode,
      departmentId,
      managerId,
      employmentType,
      salary,
      joinedAt,
      avatarUrl,
      password,
      pan,
      aadhaar,
      uan,
      esiNumber,
      bankName,
      bankAccount,
      bankIfsc,
      bankBranch,
      dateOfBirth,
      gender,
      taxRegime,
      state,
      pfEligible,
      esiEligible,
      ptEligible,
      tdsEligible,
    } = req.body;

    const employee = await prisma.$transaction(async (tx) => {
    await lockWorkspaceCapacity(tx, tenantId, "employees");
    const cleanEmail = email.toLowerCase().trim();
    let userId: string | undefined;

    try {
      userId = await provisionEmployeeUser(tx, {
        tenantId,
        email: cleanEmail,
        firstName,
        lastName,
        phone,
        avatarUrl,
        password: password || "Password@123",
      });
    } catch (userErr) {
      throw userErr;
    }

    const created = await tx.employee.create({
      data: {
        tenantId,
        userId: userId || null,
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        phone,
        position,
        employeeCode: employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
        departmentId: departmentId || null,
        managerId: managerId || null,
        employmentType: parseEmploymentType(employmentType),
        status: parseEmployeeStatus(req.body.status),
        salary: salary ? Number(salary) : null,
        joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
        pan: pan ? String(pan).toUpperCase().trim() : null,
        aadhaar: aadhaar ? String(aadhaar).trim() : null,
        uan: uan ? String(uan).trim() : null,
        esiNumber: esiNumber ? String(esiNumber).trim() : null,
        bankName: bankName ? String(bankName).trim() : null,
        bankAccount: bankAccount ? String(bankAccount).trim() : null,
        bankIfsc: bankIfsc ? String(bankIfsc).toUpperCase().trim() : null,
        bankBranch: bankBranch ? String(bankBranch).trim() : null,
        dateOfBirth: dateOfBirth && !isNaN(Date.parse(dateOfBirth)) ? new Date(dateOfBirth) : null,
        gender: gender ? String(gender).trim() : null,
        taxRegime: taxRegime === "old" ? "old" : "new",
        state: state ? String(state).trim() : "MH",
        pfEligible: pfEligible !== undefined ? Boolean(pfEligible) : true,
        esiEligible: esiEligible !== undefined ? Boolean(esiEligible) : true,
        ptEligible: ptEligible !== undefined ? Boolean(ptEligible) : true,
        tdsEligible: tdsEligible !== undefined ? Boolean(tdsEligible) : true,
      },
      include: {
        department: true,
        user: {
          select: {
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
    });

    return created;
    }, { timeout: 30000, maxWait: 10000 });

    return res.status(201).json(employee);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/employees/:id
employeesRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      employeeCode,
      departmentId,
      managerId,
      employmentType,
      status,
      salary,
      joinedAt,
      avatarUrl,
      pan,
      aadhaar,
      uan,
      esiNumber,
      bankName,
      bankAccount,
      bankIfsc,
      bankBranch,
      dateOfBirth,
      gender,
      taxRegime,
      state,
      pfEligible,
      esiEligible,
      ptEligible,
      tdsEligible,
    } = req.body;

    const tenantId = req.user?.tenantId;
    const isSuperAdmin = req.user?.roles?.includes("super_admin");

    const existingEmp = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingEmp || (!isSuperAdmin && tenantId && existingEmp.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Employee not found." });
    }

    // Resolve the new status being applied
    const newStatus = status ? parseEmployeeStatus(status) : existingEmp.status;
    const isReactivation = existingEmp.status === "terminated" && newStatus === "active";

    // WAVE 2 — REACTIVATION CAPACITY ENFORCEMENT
    // When reactivating a terminated employee, enforce subscription seat limits
    // atomically using a pessimistic row lock on the tenant row.
    if (isReactivation && tenantId) {
      const employee = await prisma.$transaction(async (tx) => {
        // This executes SELECT ... FOR UPDATE on the tenant row and checks maxEmployees
        await lockWorkspaceCapacity(tx, tenantId, "employees", 1);

        // Perform the avatar update inside the same transaction if required
        if (avatarUrl && existingEmp.userId) {
          await tx.profile.upsert({
            where: { userId: existingEmp.userId },
            create: {
              userId: existingEmp.userId,
              fullName: `${firstName || ""} ${lastName || ""}`.trim() || email,
              email: email ? email.toLowerCase().trim() : existingEmp.email,
              avatarUrl,
              tenantId: existingEmp.tenantId,
            },
            update: {
              avatarUrl,
              fullName: `${firstName || ""} ${lastName || ""}`.trim() || email,
            },
          });
        }

        return tx.employee.update({
          where: { id },
          data: {
            firstName,
            lastName,
            email: email ? email.toLowerCase().trim() : undefined,
            phone,
            position,
            employeeCode,
            departmentId: departmentId || null,
            managerId: managerId || null,
            employmentType: employmentType ? parseEmploymentType(employmentType) : undefined,
            status: newStatus,
            salary: salary !== undefined && salary !== "" && !isNaN(Number(salary)) ? Number(salary) : undefined,
            joinedAt: joinedAt && !isNaN(Date.parse(joinedAt)) ? new Date(joinedAt) : undefined,
            ...(pan !== undefined && { pan: pan ? String(pan).toUpperCase().trim() : null }),
            ...(aadhaar !== undefined && { aadhaar: aadhaar ? String(aadhaar).trim() : null }),
            ...(uan !== undefined && { uan: uan ? String(uan).trim() : null }),
            ...(esiNumber !== undefined && { esiNumber: esiNumber ? String(esiNumber).trim() : null }),
            ...(bankName !== undefined && { bankName: bankName ? String(bankName).trim() : null }),
            ...(bankAccount !== undefined && { bankAccount: bankAccount ? String(bankAccount).trim() : null }),
            ...(bankIfsc !== undefined && { bankIfsc: bankIfsc ? String(bankIfsc).toUpperCase().trim() : null }),
            ...(bankBranch !== undefined && { bankBranch: bankBranch ? String(bankBranch).trim() : null }),
            ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth && !isNaN(Date.parse(dateOfBirth)) ? new Date(dateOfBirth) : null }),
            ...(gender !== undefined && { gender: gender ? String(gender).trim() : null }),
            ...(taxRegime !== undefined && { taxRegime: taxRegime === "old" ? "old" : "new" }),
            ...(state !== undefined && { state: state ? String(state).trim() : null }),
            ...(pfEligible !== undefined && { pfEligible: Boolean(pfEligible) }),
            ...(esiEligible !== undefined && { esiEligible: Boolean(esiEligible) }),
            ...(ptEligible !== undefined && { ptEligible: Boolean(ptEligible) }),
            ...(tdsEligible !== undefined && { tdsEligible: Boolean(tdsEligible) }),
          },
          include: {
            department: true,
            user: {
              select: {
                profile: {
                  select: { avatarUrl: true },
                },
              },
            },
          },
        });
      }, { timeout: 30000, maxWait: 10000 });
      return res.json(employee);
    }

    // --- Non-reactivation update path (no capacity check needed) ---
    if (avatarUrl && existingEmp.userId) {
      await prisma.profile.upsert({
        where: { userId: existingEmp.userId },
        create: {
          userId: existingEmp.userId,
          fullName: `${firstName || ""} ${lastName || ""}`.trim() || email,
          email: email ? email.toLowerCase().trim() : existingEmp.email,
          avatarUrl,
          tenantId: existingEmp.tenantId,
        },
        update: {
          avatarUrl,
          fullName: `${firstName || ""} ${lastName || ""}`.trim() || email,
        },
      });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email: email ? email.toLowerCase().trim() : undefined,
        phone,
        position,
        employeeCode,
        departmentId: departmentId || null,
        managerId: managerId || null,
        employmentType: employmentType ? parseEmploymentType(employmentType) : undefined,
        status: newStatus,
        salary: salary !== undefined && salary !== "" && !isNaN(Number(salary)) ? Number(salary) : undefined,
        joinedAt: joinedAt && !isNaN(Date.parse(joinedAt)) ? new Date(joinedAt) : undefined,
        ...(pan !== undefined && { pan: pan ? String(pan).toUpperCase().trim() : null }),
        ...(aadhaar !== undefined && { aadhaar: aadhaar ? String(aadhaar).trim() : null }),
        ...(uan !== undefined && { uan: uan ? String(uan).trim() : null }),
        ...(esiNumber !== undefined && { esiNumber: esiNumber ? String(esiNumber).trim() : null }),
        ...(bankName !== undefined && { bankName: bankName ? String(bankName).trim() : null }),
        ...(bankAccount !== undefined && { bankAccount: bankAccount ? String(bankAccount).trim() : null }),
        ...(bankIfsc !== undefined && { bankIfsc: bankIfsc ? String(bankIfsc).toUpperCase().trim() : null }),
        ...(bankBranch !== undefined && { bankBranch: bankBranch ? String(bankBranch).trim() : null }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth && !isNaN(Date.parse(dateOfBirth)) ? new Date(dateOfBirth) : null }),
        ...(gender !== undefined && { gender: gender ? String(gender).trim() : null }),
        ...(taxRegime !== undefined && { taxRegime: taxRegime === "old" ? "old" : "new" }),
        ...(state !== undefined && { state: state ? String(state).trim() : null }),
        ...(pfEligible !== undefined && { pfEligible: Boolean(pfEligible) }),
        ...(esiEligible !== undefined && { esiEligible: Boolean(esiEligible) }),
        ...(ptEligible !== undefined && { ptEligible: Boolean(ptEligible) }),
        ...(tdsEligible !== undefined && { tdsEligible: Boolean(tdsEligible) }),
      },
      include: {
        department: true,
        user: {
          select: {
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
    });

    return res.json(employee);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/employees/:id (Full Cascade: removes all related employee and user records from DB)
employeesRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Employee ID is required" });

    const tenantId = req.user?.tenantId;
    const isSuperAdmin = req.user?.roles?.includes("super_admin");

    // Verify employee exists and belongs to current tenant
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, userId: true, firstName: true, lastName: true, tenantId: true },
    });
    if (!employee || (!isSuperAdmin && tenantId && employee.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Employee not found" });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Attendance records
      await tx.attendance.deleteMany({ where: { employeeId: id } });

      // 2. Leave requests
      await tx.leaveRequest.deleteMany({ where: { employeeId: id } });

      // 3. Expense claims
      await tx.expenseClaim.deleteMany({ where: { employeeId: id } });

      // 4. Course enrollments
      await tx.courseEnrollment.deleteMany({ where: { employeeId: id } });

      // 5. OKR checkins, reviews, key results, objectives
      await tx.okrCheckin.deleteMany({ where: { employeeId: id } });
      await tx.okrReview.deleteMany({ where: { employeeId: id } });
      await tx.okrReview.deleteMany({ where: { reviewerId: id } });
      await tx.okrKeyResult.deleteMany({ where: { objective: { ownerId: id } } });
      await tx.okrObjective.deleteMany({ where: { ownerId: id } });

      // 6. Shift swaps & rosters
      await tx.shiftSwapRequest.deleteMany({ where: { requesterEmployeeId: id } });
      await tx.shiftSwapRequest.deleteMany({ where: { targetEmployeeId: id } });
      await tx.shiftRoster.deleteMany({ where: { employeeId: id } });

      // 7. Payslips
      await tx.payslip.deleteMany({ where: { employeeId: id } });

      // 8. Assets
      await tx.assetRequest.deleteMany({ where: { employeeId: id } });
      await tx.assetAssignment.deleteMany({ where: { employeeId: id } });
      await tx.asset.updateMany({
        where: { assignedEmployeeId: id },
        data: { assignedEmployeeId: null, status: "available" },
      });

      // 9. Interviews conducted
      await tx.jobCandidateInterview.deleteMany({ where: { interviewerId: id } });

      // 10. Employee exits & checklist items
      const exits = await tx.employeeExit.findMany({ where: { employeeId: id }, select: { id: true } });
      if (exits.length > 0) {
        await tx.exitChecklistItem.deleteMany({
          where: { exitId: { in: exits.map((x) => x.id) } },
        });
        await tx.employeeExit.deleteMany({ where: { employeeId: id } });
      }

      // 11. Biometric punch logs
      await tx.biometricPunchLog.updateMany({
        where: { employeeId: id },
        data: { employeeId: null },
      });

      // 12. Announcement acknowledgements & authored announcements
      await tx.announcementAcknowledgement.deleteMany({ where: { employeeId: id } });
      await tx.announcement.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      });

      // 13. Helpdesk tickets & comments
      const tickets = await tx.helpdeskTicket.findMany({
        where: { employeeId: id },
        select: { id: true },
      });
      if (tickets.length > 0) {
        await tx.helpdeskComment.deleteMany({
          where: { ticketId: { in: tickets.map((t) => t.id) } },
        });
        await tx.helpdeskTicket.deleteMany({ where: { employeeId: id } });
      }

      // 14. Company documents & custom forms
      await tx.companyDocument.updateMany({
        where: { employeeId: id },
        data: { employeeId: null },
      });
      await tx.customForm.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      });
      await tx.formSubmission.updateMany({
        where: { employeeId: id },
        data: { employeeId: null },
      });

      // 15. Subordinates managerId reference
      await tx.employee.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });

      // 16. Finally delete the employee record from the DB
      await tx.employee.delete({ where: { id } });

      // 17. Clean up associated user account if applicable
      if (employee.userId) {
        const otherLinked = await tx.employee.count({
          where: { userId: employee.userId, id: { not: id } },
        });
        if (otherLinked === 0) {
          await tx.profile.deleteMany({ where: { userId: employee.userId } });
          await tx.twoFactorOtp.deleteMany({ where: { userId: employee.userId } });
          await tx.userRole.deleteMany({ where: { userId: employee.userId } });
          await tx.userRoleAssignment.deleteMany({ where: { userId: employee.userId } });
          await tx.user.delete({ where: { id: employee.userId } });
        }
      }
    });

    console.log("[DELETE /employees/" + id + "] Employee " + employee.firstName + " " + employee.lastName + " successfully deleted from database.");
    return res.json({
      success: true,
      message: "Employee " + employee.firstName + " " + employee.lastName + " and all related records deleted permanently from database.",
    });
  } catch (err: any) {
    console.error("Employee delete error:", err.message);
    return res.status(err.status || 500).json({ error: err.message || "Internal server error during employee deletion" });
  }
});

// GET /api/employees/departments
employeesRouter.get("/departments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);

    const departments = await prisma.department.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json(departments);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/employees/departments/:id
employeesRouter.get("/departments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = await getTenantId(req);

    const department = await prisma.department.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    return res.json(department);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/employees/departments
employeesRouter.post("/departments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);

    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Department name is required" });
    }

    const department = await prisma.department.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return res.status(201).json(department);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/employees/departments/:id
employeesRouter.put("/departments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = await getTenantId(req);
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Department name is required" });
    }

    // Tenant isolation: ensure department belongs to this tenant
    const existing = await prisma.department.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Department not found" });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() ?? existing.description,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// PATCH /api/employees/departments/:id  (partial update alias)
employeesRouter.patch("/departments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = await getTenantId(req);
    const { name, description } = req.body;

    // Tenant isolation
    const existing = await prisma.department.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Department not found" });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() || null }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/employees/departments/:id
employeesRouter.delete("/departments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = await getTenantId(req);

    // Tenant isolation: ensure department belongs to this tenant
    const existing = await prisma.department.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Department not found" });
    }

    await prisma.department.delete({ where: { id } });
    return res.json({ success: true, message: "Department deleted" });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/employees/:id (Fetch single employee record with tenant boundary)
employeesRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const isSuperAdmin = req.user?.roles?.includes("super_admin");

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        user: {
          select: {
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
    });

    if (!employee || (!isSuperAdmin && tenantId && employee.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // WAVE 2 — Apply PII masking based on caller privilege
    return res.json(applyPIIMask(employee, req));
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/employees/:id/reset-2fa (Tenant Admin resets 2FA for an employee)
employeesRouter.post("/:id/reset-2fa", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee || (tenantId && employee.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Employee record not found in this workspace." });
    }

    // Find user record by email
    const user = await prisma.user.findUnique({
      where: { email: employee.email },
    });

    if (!user) {
      return res.status(404).json({ error: `No login account found for ${employee.email}` });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorConfirmedAt: null,
      },
    });

    return res.json({
      success: true,
      message: `Two-Factor Authentication reset for ${employee.firstName} ${employee.lastName} (${employee.email}). Account unlocked.`,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/employees/:id/login-account (Fetch employee login account status & roles)
employeesRouter.get("/:id/login-account", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!employee || (tenantId && employee.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Employee record not found." });
    }

    const user = await prisma.user.findUnique({
      where: { email: employee.email.toLowerCase().trim() },
      include: {
        roles: true,
        profile: true,
      },
    });

    return res.json({
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
      hasAccount: !!user,
      userId: user?.id || null,
      twoFactorEnabled: user?.twoFactorEnabled || false,
      roles: user?.roles?.map((r) => r.role) || ["employee"],
      isLocked: false,
      createdAt: user?.createdAt || null,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/employees/:id/set-password (Admin sets / resets employee login password)
employeesRouter.post("/:id/set-password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword, sendNotification } = req.body;
    const tenantId = req.user?.tenantId;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee || (tenantId && employee.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Employee record not found in this workspace." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const email = employee.email.toLowerCase().trim();

    await prisma.$transaction(async (tx) => {
      const userId = await provisionEmployeeUser(tx, {
        tenantId: employee.tenantId, email, firstName: employee.firstName,
        lastName: employee.lastName, phone: employee.phone, password: newPassword,
      });
      await tx.employee.update({ where: { id: employee.id }, data: { userId } });
    });

    // Log audit
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: employee.tenantId,
          userId: req.user?.userId || (req.user as any)?.id,
          action: "EMPLOYEE_PASSWORD_SET",
          entity: "Employee",
          entityId: employee.id,
          details: `Admin reset password for employee ${employee.firstName} ${employee.lastName} (${email})`,
        },
      });
    } catch {}

    return res.json({
      success: true,
      message: `Password successfully updated for ${employee.firstName} ${employee.lastName}. The employee can now login at /auth using their email and new password.`,
      email,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/employees/bulk-import
// Imports multiple employees in batch with auto department resolution & KYC ingestion
employeesRouter.post("/bulk-import", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const rawList = Array.isArray(req.body) ? req.body : req.body.employees || req.body.data || [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({ error: "An array of employee records is required in 'employees'." });
    }

    const importedEmployees: any[] = [];
    const errors: Array<{ index: number; email?: string; error: string }> = [];
    let skippedCount = 0;

    // Cache departments to avoid repeated queries
    const existingDepts = await prisma.department.findMany({ where: { tenantId } });
    const deptMap = new Map<string, string>();
    for (const d of existingDepts) {
      deptMap.set(d.name.toLowerCase().trim(), d.id);
    }

    for (let i = 0; i < rawList.length; i++) {
      const row = rawList[i];
      const firstName = (row.firstName || row.first_name || "").trim();
      const lastName = (row.lastName || row.last_name || "").trim();
      const rawEmail = (row.email || "").trim().toLowerCase();

      if (!firstName || !rawEmail) {
        errors.push({ index: i, email: rawEmail, error: "First name and email are mandatory." });
        continue;
      }

      // Check if employee already exists in this tenant
      const existing = await prisma.employee.findFirst({
        where: { tenantId, email: rawEmail },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Resolve department
      let departmentId = row.departmentId || row.department_id || null;
      const deptName = (row.department || row.departmentName || "").trim();
      if (!departmentId && deptName) {
        const lowerDept = deptName.toLowerCase();
        if (deptMap.has(lowerDept)) {
          departmentId = deptMap.get(lowerDept);
        } else {
          try {
            const newDept = await prisma.department.create({
              data: { tenantId, name: deptName },
            });
            deptMap.set(lowerDept, newDept.id);
            departmentId = newDept.id;
          } catch {}
        }
      }

      try {
        const created = await prisma.$transaction(async (tx) => {
          let userId: string | undefined;
          try {
            userId = await provisionEmployeeUser(tx, {
              tenantId,
              email: rawEmail,
              firstName,
              lastName: lastName || "-",
              phone: row.phone || null,
              password: row.password || "Password@123",
            });
          } catch {}

          const empCode = row.employeeCode || row.employee_code || `EMP-${Date.now().toString().slice(-4)}${i}`;

          return await tx.employee.create({
            data: {
              tenantId,
              userId: userId || null,
              firstName,
              lastName: lastName || "-",
              email: rawEmail,
              phone: row.phone || null,
              position: row.position || row.designation || "Team Member",
              employeeCode: empCode,
              departmentId,
              employmentType: parseEmploymentType(row.employmentType || row.employment_type),
              status: parseEmployeeStatus(row.status),
              salary: row.salary ? Number(row.salary) : null,
              joinedAt: row.joinedAt ? new Date(row.joinedAt) : new Date(),
              pan: row.pan ? String(row.pan).toUpperCase().trim() : null,
              aadhaar: row.aadhaar ? String(row.aadhaar).trim() : null,
              uan: row.uan ? String(row.uan).trim() : null,
              esiNumber: row.esiNumber || row.esi_number ? String(row.esiNumber || row.esi_number).trim() : null,
              bankName: row.bankName || row.bank_name || null,
              bankAccount: row.bankAccount || row.bank_account || null,
              bankIfsc: row.bankIfsc || row.bank_ifsc ? String(row.bankIfsc || row.bank_ifsc).toUpperCase().trim() : null,
              bankBranch: row.bankBranch || row.bank_branch || null,
              taxRegime: row.taxRegime === "old" ? "old" : "new",
              state: row.state || "MH",
            },
            include: {
              department: true,
            },
          });
        });

        importedEmployees.push(created);
      } catch (insertErr: any) {
        errors.push({ index: i, email: rawEmail, error: insertErr.message || "Failed to create employee" });
      }
    }

    // Log bulk audit activity
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: req.user?.userId || (req.user as any)?.id,
          action: "EMPLOYEES_BULK_IMPORTED",
          entity: "Employee",
          details: `Bulk imported ${importedEmployees.length} employees (skipped: ${skippedCount}, errors: ${errors.length})`,
        },
      });
    } catch {}

    return res.json({
      success: true,
      total: rawList.length,
      imported: importedEmployees.length,
      skipped: skippedCount,
      failed: errors.length,
      employees: importedEmployees,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error during bulk import" });
  }
});


