import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { provisionEmployeeUser } from "../lib/auth-helpers";

export const employeesRouter = Router();

// GET /api/employees
employeesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const where = tenantId ? { tenantId } : {};

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
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/employees
employeesRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required to create employees." });
    }

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

    // Automatically provision user credentials in DB
    const cleanEmail = email.toLowerCase().trim();
    let userId: string | undefined;

    try {
      userId = await provisionEmployeeUser(prisma, {
        tenantId,
        email: cleanEmail,
        firstName,
        lastName,
        phone,
        avatarUrl,
        password: password || "Password@123",
      });
    } catch (userErr) {
      console.warn("User auto-provisioning note:", userErr);
    }

    const employee = await prisma.employee.create({
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
        employmentType: employmentType || "full_time",
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

    return res.status(201).json(employee);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
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
        employmentType,
        status,
        salary: salary !== undefined ? Number(salary) : undefined,
        joinedAt: joinedAt ? new Date(joinedAt) : undefined,
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
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/employees/:id
employeesRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.employee.delete({ where: { id } });
    return res.json({ success: true, message: "Employee removed successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/employees/departments
employeesRouter.get("/departments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const where = tenantId ? { tenantId } : {};

    let departments = await prisma.department.findMany({
      where,
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Auto-seed default departments if empty
    if (departments.length === 0 && tenantId) {
      const defaults = [
        { name: "Engineering", description: "Software development & DevOps" },
        { name: "Human Resources", description: "Talent acquisition & people operations" },
        { name: "Sales & Marketing", description: "Revenue generation & growth" },
        { name: "Finance & Accounting", description: "Financial reporting & payroll" },
        { name: "Operations", description: "Business processes & logistics" },
      ];

      await Promise.all(
        defaults.map((d) =>
          prisma.department.create({
            data: {
              tenantId,
              name: d.name,
              description: d.description,
            },
          }),
        ),
      );

      departments = await prisma.department.findMany({
        where,
        include: {
          _count: { select: { employees: true } },
        },
        orderBy: { name: "asc" },
      });
    }

    return res.json(departments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/employees/departments
employeesRouter.post("/departments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

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
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/employees/departments/:id
employeesRouter.delete("/departments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({ where: { id } });
    return res.json({ success: true, message: "Department deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
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
    return res.status(500).json({ error: err.message || "Internal server error" });
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
    return res.status(500).json({ error: err.message || "Internal server error" });
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

    // Upsert User
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
        },
      });

      // Link to employee record if userId was missing
      if (!employee.userId) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { userId: existingUser.id },
        });
      }
    } else {
      // Create fresh user account
      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash,
          profile: {
            create: {
              fullName: `${employee.firstName} ${employee.lastName}`.trim() || email,
              email,
              phone: employee.phone || null,
              tenantId: employee.tenantId,
            },
          },
          roles: {
            create: {
              role: "employee",
              tenantId: employee.tenantId,
            },
          },
        },
      });

      await prisma.employee.update({
        where: { id: employee.id },
        data: { userId: newUser.id },
      });
    }

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
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

