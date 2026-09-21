import { lockWorkspaceCapacity } from "../services/workspace-policy.service";
import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { requireAuth, requirePermission, AuthRequest } from "../middleware/auth";
import { provisionEmployeeUser } from "../lib/auth-helpers";

export const employeesRouter = Router();

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


// GET /api/employees
employeesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const where = { tenantId };

    const employees = await prisma.employee.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return res.json(employees);
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
    });

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
    } = req.body;

    const existingEmp = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (avatarUrl && existingEmp) {
      if (existingEmp.userId) {
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
        status: status ? parseEmployeeStatus(status) : undefined,
        salary: salary !== undefined && salary !== "" && !isNaN(Number(salary)) ? Number(salary) : undefined,
        joinedAt: joinedAt && !isNaN(Date.parse(joinedAt)) ? new Date(joinedAt) : undefined,
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

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, userId: true, firstName: true, lastName: true },
    });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

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
    const where = { tenantId };

    let departments = await prisma.department.findMany({
      where,
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

// POST /api/employees/departments
employeesRouter.post("/departments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);

    const { name, description } = req.body;
    const department = await prisma.department.create({
      data: {
        tenantId,
        name,
        description,
      },
    });

    return res.status(201).json(department);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/employees/departments/:id
employeesRouter.delete("/departments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = await getTenantId(req);
    await prisma.department.delete({ where: { id } });
    return res.json({ success: true, message: "Department deleted" });
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

