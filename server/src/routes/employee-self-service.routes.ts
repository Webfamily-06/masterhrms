import { Router, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { requireEmployee, EmployeeAuthRequest } from "../middleware/employee-context.middleware";
import { prisma, rawPrisma } from "../prisma";

export const employeeSelfServiceRouter = Router();

// Apply auth and employee resolution to all /api/v1/me/* endpoints
employeeSelfServiceRouter.use(requireAuth);
employeeSelfServiceRouter.use(requireEmployee as any);

/**
 * GET /api/v1/me/profile
 * Returns the caller's full personal and employment profile with sensitive fields masked.
 */
employeeSelfServiceRouter.get("/profile", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;

  try {
    const emp = await db.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, address: true } },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            designation: { select: { name: true } },
          },
        },
        changeRequests: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!emp) {
      return res.status(404).json({ error: "Employee record not found" });
    }

    // Mask sensitive fields by default
    const maskString = (val?: string | null, keepLast = 4) => {
      if (!val) return null;
      if (val.length <= keepLast) return val;
      return "•".repeat(val.length - keepLast) + val.slice(-keepLast);
    };

    const sanitized = {
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`.trim(),
      email: emp.email,
      phone: emp.phone,
      position: emp.position,
      employmentType: emp.employmentType,
      status: emp.status,
      joinedAt: emp.joinedAt,
      gender: emp.gender,
      dateOfBirth: emp.dateOfBirth,
      department: emp.department,
      designation: emp.designation,
      branch: emp.branch,
      manager: emp.manager,
      taxRegime: emp.taxRegime,
      statutory: {
        panMasked: maskString(emp.pan, 4),
        aadhaarMasked: maskString(emp.aadhaar, 4),
        uanMasked: maskString(emp.uan, 4),
        esiNumberMasked: maskString(emp.esiNumber, 4),
        pfNumberMasked: maskString(emp.pfNumber, 4),
        bankName: emp.bankName,
        bankAccountMasked: maskString(emp.bankAccount, 4),
        bankIfsc: emp.bankIfsc,
        bankBranch: emp.bankBranch,
      },
      pendingChangeRequests: emp.changeRequests,
    };

    return res.json({ success: true, data: sanitized });
  } catch (err: any) {
    console.error("[GET /me/profile] Error:", err);
    return res.status(500).json({ error: "Failed to fetch employee profile" });
  }
});

/**
 * PUT /api/v1/me/profile
 * Updates instant non-sensitive fields (phone, gender, emergency contact notes)
 */
employeeSelfServiceRouter.put("/profile", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const { phone, gender } = req.body;

  try {
    const updated = await db.employee.update({
      where: { id: employeeId },
      data: {
        phone: typeof phone === "string" ? phone : undefined,
        gender: typeof gender === "string" ? gender : undefined,
      },
      select: {
        id: true,
        phone: true,
        gender: true,
        updatedAt: true,
      },
    });

    return res.json({ success: true, message: "Profile updated successfully", data: updated });
  } catch (err: any) {
    console.error("[PUT /me/profile] Error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * POST /api/v1/me/profile/change-requests
 * Submits sensitive fields (bank, pan, legal name, aadhaar) for HR review & approval
 */
employeeSelfServiceRouter.post("/profile/change-requests", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { fieldCategory, fieldKey, newValue, proofMediaId } = req.body;

  if (!fieldCategory || !fieldKey || newValue === undefined) {
    return res.status(400).json({ error: "fieldCategory, fieldKey, and newValue are required" });
  }

  const allowedCategories = ["bank", "personal", "statutory", "address"];
  if (!allowedCategories.includes(fieldCategory)) {
    return res.status(400).json({ error: "Invalid field category" });
  }

  try {
    // Current employee record to snapshot old value
    const emp = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!emp) return res.status(404).json({ error: "Employee record not found" });

    const oldValue = (emp as any)[fieldKey] !== undefined ? (emp as any)[fieldKey] : null;

    const changeRequest = await db.employeeChangeRequest.create({
      data: {
        tenantId,
        employeeId,
        fieldCategory,
        fieldKey,
        oldValueJson: JSON.stringify(oldValue),
        newValueJson: JSON.stringify(newValue),
        proofMediaId: proofMediaId || null,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Change request submitted successfully and is pending HR verification.",
      data: changeRequest,
    });
  } catch (err: any) {
    console.error("[POST /me/profile/change-requests] Error:", err);
    return res.status(500).json({ error: "Failed to submit change request" });
  }
});

/**
 * GET /api/v1/me/profile/change-requests
 * Returns all past and pending change requests submitted by this employee
 */
employeeSelfServiceRouter.get("/profile/change-requests", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const list = await db.employeeChangeRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: list });
  } catch (err: any) {
    console.error("[GET /me/profile/change-requests] Error:", err);
    return res.status(500).json({ error: "Failed to fetch change requests" });
  }
});

/**
 * GET /api/v1/me/dashboard
 * Aggregates personal attendance status today, recent announcements, leaves, awards, and warnings
 */
employeeSelfServiceRouter.get("/dashboard", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Attendance today
    const attendanceToday = await db.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        date: today,
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Active announcements
    const announcements = await db.announcement.findMany({
      where: {
        tenantId,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        isPinned: true,
        createdAt: true,
      },
    });

    // 3. Counts: Awards this year, active Warnings, Complaints filed by caller
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const awardsCount = await db.award.count({
      where: {
        tenantId,
        employeeId,
        awardDate: { gte: startOfYear },
      },
    });

    const warningsCount = await db.disciplinaryWarning.count({
      where: {
        tenantId,
        employeeId,
        status: "active",
      },
    });

    // 4. Pending Leave Requests
    const pendingLeaves = await db.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId,
        status: "pending",
      },
      include: {
        leaveType: { select: { id: true, name: true, color: true } },
      },
      take: 3,
    });

    // 5. Shift today
    const shiftRoster = await db.shiftRoster.findFirst({
      where: {
        tenantId,
        employeeId,
        rosterDate: today,
      },
      include: {
        shift: true,
      },
    });

    return res.json({
      success: true,
      data: {
        employee: {
          id: req.employee!.id,
          employeeCode: req.employee!.employeeCode,
          firstName: req.employee!.firstName,
          lastName: req.employee!.lastName,
        },
        attendanceToday: {
          status: attendanceToday ? attendanceToday.status : "NOT_CHECKED_IN",
          checkIn: attendanceToday?.checkIn || null,
          checkOut: attendanceToday?.checkOut || null,
          hours: attendanceToday?.hours || 0,
        },
        shiftToday: shiftRoster ? {
          name: shiftRoster.shift.name,
          startTime: shiftRoster.shift.startTime,
          endTime: shiftRoster.shift.endTime,
        } : null,
        metrics: {
          awardsThisYear: awardsCount,
          activeWarnings: warningsCount,
          pendingLeavesCount: pendingLeaves.length,
        },
        recentAnnouncements: announcements,
        pendingLeaves,
      },
    });
  } catch (err: any) {
    console.error("[GET /me/dashboard] Error:", err);
    return res.status(500).json({ error: "Failed to load employee dashboard" });
  }
});
