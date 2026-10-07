import { Router, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { requireEmployee, EmployeeAuthRequest } from "../middleware/employee-context.middleware";
import { prisma, rawPrisma } from "../prisma";
import { AuditService } from "../services/audit.service";
import { OutboxService } from "../services/outbox.service";
import { NotificationService } from "../services/notification.service";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

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

    // Queue outbox event and audit log (masked)
    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "profile.change_requested",
      entityType: "EmployeeChangeRequest",
      entityId: changeRequest.id,
      actorId: req.user!.userId,
      payload: {
        employeeId,
        fieldCategory,
        fieldKey,
      },
    });

    await AuditService.logMutation({
      tenantId,
      actorId: req.user!.userId,
      action: "PROFILE_CHANGE_REQUEST_SUBMIT",
      entityType: "EmployeeChangeRequest",
      entityId: changeRequest.id,
      newState: { fieldCategory, fieldKey, status: "PENDING" },
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

/**
 * POST /api/v1/me/attendance/check-in
 * Records employee check-in punch with authoritative server timestamp
 */
employeeSelfServiceRouter.post("/attendance/check-in", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const existing = await db.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        date: today,
      },
    });

    if (existing && existing.checkIn) {
      return res.status(400).json({ error: "Already checked in for today." });
    }

    const attendanceRecord = await db.attendance.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId,
          date: today,
        },
      },
      update: {
        checkIn: now,
        status: "present",
      },
      create: {
        tenantId,
        employeeId,
        date: today,
        checkIn: now,
        status: "present",
      },
    });

    return res.json({
      success: true,
      message: "Check-in punch recorded successfully.",
      data: attendanceRecord,
    });
  } catch (err: any) {
    console.error("[POST /me/attendance/check-in] Error:", err);
    return res.status(500).json({ error: "Failed to record check-in punch" });
  }
});

/**
 * POST /api/v1/me/attendance/check-out
 * Records employee check-out punch and calculates total working hours
 */
employeeSelfServiceRouter.post("/attendance/check-out", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const existing = await db.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        date: today,
      },
    });

    if (!existing || !existing.checkIn) {
      return res.status(400).json({ error: "Cannot check out without a valid check-in today." });
    }

    const diffMs = now.getTime() - new Date(existing.checkIn).getTime();
    const hours = Math.max(0, +(diffMs / (1000 * 60 * 60)).toFixed(2));

    const updated = await db.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        hours,
      },
    });

    return res.json({
      success: true,
      message: "Check-out punch recorded successfully.",
      data: updated,
    });
  } catch (err: any) {
    console.error("[POST /me/attendance/check-out] Error:", err);
    return res.status(500).json({ error: "Failed to record check-out punch" });
  }
});

/**
 * GET /api/v1/me/regularizations
 * Lists attendance regularization requests submitted by caller
 */
employeeSelfServiceRouter.get("/regularizations", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const list = await db.attendanceRegularization.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: list });
  } catch (err: any) {
    console.error("[GET /me/regularizations] Error:", err);
    return res.status(500).json({ error: "Failed to fetch regularization requests" });
  }
});

/**
 * POST /api/v1/me/regularizations
 * Submits a new attendance regularization request
 */
employeeSelfServiceRouter.post("/regularizations", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { attendanceDate, proposedIn, proposedOut, reason } = req.body;

  if (!attendanceDate || !reason) {
    return res.status(400).json({ error: "attendanceDate and reason are required" });
  }

  try {
    const targetDate = new Date(attendanceDate);
    targetDate.setHours(0, 0, 0, 0);

    const record = await db.attendanceRegularization.create({
      data: {
        tenantId,
        employeeId,
        attendanceDate: targetDate,
        proposedIn: proposedIn ? new Date(proposedIn) : null,
        proposedOut: proposedOut ? new Date(proposedOut) : null,
        reason,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Regularization request submitted successfully.",
      data: record,
    });
  } catch (err: any) {
    console.error("[POST /me/regularizations] Error:", err);
    return res.status(500).json({ error: "Failed to submit regularization request" });
  }
});

/**
 * POST /api/v1/me/regularizations/:id/withdraw
 * Withdraws a pending regularization request
 */
employeeSelfServiceRouter.post("/regularizations/:id/withdraw", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const { id } = req.params;

  try {
    const reg = await db.attendanceRegularization.findUnique({ where: { id } });
    if (!reg || reg.employeeId !== employeeId) {
      return res.status(404).json({ error: "Regularization request not found" });
    }

    if (reg.status !== "PENDING") {
      return res.status(400).json({ error: "Only PENDING requests can be withdrawn." });
    }

    const updated = await db.attendanceRegularization.update({
      where: { id },
      data: { status: "WITHDRAWN" },
    });

    return res.json({
      success: true,
      message: "Regularization request withdrawn successfully.",
      data: updated,
    });
  } catch (err: any) {
    console.error("[POST /me/regularizations/:id/withdraw] Error:", err);
    return res.status(500).json({ error: "Failed to withdraw regularization request" });
  }
});

/**
 * POST /api/v1/me/leaves/validate
 * Dry-run leave balance and policy validation
 */
employeeSelfServiceRouter.post("/leaves/validate", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { leaveTypeId, startDate, endDate } = req.body;

  if (!leaveTypeId || !startDate || !endDate) {
    return res.status(400).json({ error: "leaveTypeId, startDate, and endDate are required" });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({
        valid: false,
        blockingIssues: ["End date cannot be prior to start date."],
      });
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping leaves
    const overlap = await db.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: ["pending", "approved"] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    const blockingIssues: string[] = [];
    if (overlap) {
      blockingIssues.push("You already have an active leave request overlapping these dates.");
    }

    return res.json({
      success: true,
      valid: blockingIssues.length === 0,
      calculatedDays: diffDays,
      sandwichDaysAdded: 0,
      blockingIssues,
    });
  } catch (err: any) {
    console.error("[POST /me/leaves/validate] Error:", err);
    return res.status(500).json({ error: "Failed to validate leave application" });
  }
});

/**
 * GET /api/v1/me/leave-balance
 * Returns detailed leave entitlements and balances
 */
employeeSelfServiceRouter.get("/leave-balance", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;

  try {
    const leaveTypes = await db.leaveType.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        daysPerYear: true,
        color: true,
      },
    });

    const usedLeaves = await db.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId,
        status: { in: ["pending", "approved"] },
      },
      select: {
        leaveTypeId: true,
        days: true,
        status: true,
      },
    });

    const balances = leaveTypes.map((type) => {
      const typeUsed = usedLeaves.filter((l) => l.leaveTypeId === type.id);
      const approvedDays = typeUsed
        .filter((l) => l.status === "approved")
        .reduce((sum, l) => sum + (l.days || 0), 0);
      const pendingDays = typeUsed
        .filter((l) => l.status === "pending")
        .reduce((sum, l) => sum + (l.days || 0), 0);
      const totalAccrued = type.daysPerYear || 12;
      const available = Math.max(0, totalAccrued - approvedDays - pendingDays);

      return {
        leaveTypeId: type.id,
        leaveTypeName: type.name,
        color: type.color || "#FF6B00",
        totalAccrued,
        approvedDays,
        pendingDays,
        availableDays: available,
      };
    });

    return res.json({ success: true, data: balances });
  } catch (err: any) {
    console.error("[GET /me/leave-balance] Error:", err);
    return res.status(500).json({ error: "Failed to calculate leave balances" });
  }
});

/**
 * GET /api/v1/me/leaves
 * Lists all leave applications for caller
 */
employeeSelfServiceRouter.get("/leaves", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;

  try {
    const leaves = await db.leaveRequest.findMany({
      where: { tenantId, employeeId },
      include: {
        leaveType: {
          select: { id: true, name: true, color: true, daysPerYear: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: leaves });
  } catch (err: any) {
    console.error("[GET /me/leaves] Error:", err);
    return res.status(500).json({ error: "Failed to fetch leaves" });
  }
});

/**
 * POST /api/v1/me/leaves
 * Submits authoritative leave application for current employee
 */
employeeSelfServiceRouter.post("/leaves", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { leaveTypeId, startDate, endDate, days, reason } = req.body;

  if (!leaveTypeId || !startDate || !endDate) {
    return res.status(400).json({ error: "leaveTypeId, startDate, and endDate are required" });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const calcDays = Number(days) || Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leave = await db.leaveRequest.create({
      data: {
        tenantId,
        employeeId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days: calcDays,
        reason: reason || null,
        status: "pending",
      },
      include: {
        leaveType: { select: { id: true, name: true, color: true } },
      },
    });
    return res.status(201).json({ success: true, data: leave });
  } catch (err: any) {
    console.error("[POST /me/leaves] Error:", err);
    return res.status(500).json({ error: "Failed to apply for leave" });
  }
});

// ==========================================
// PHASE E3: PAYROLL & STATUTORY SELF-SERVICE
// ==========================================

/**
 * GET /api/v1/me/payslips
 * Lists all payslips for current employee
 */
employeeSelfServiceRouter.get("/payslips", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const payslips = await db.payslip.findMany({
      where: { employeeId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return res.json({ success: true, data: payslips });
  } catch (err: any) {
    console.error("[GET /me/payslips] Error:", err);
    return res.status(500).json({ error: "Failed to fetch payslips" });
  }
});

/**
 * GET /api/v1/me/payslips/:id
 * Returns itemized payslip breakdown
 */
employeeSelfServiceRouter.get("/payslips/:id", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const { id } = req.params;

  try {
    const payslip = await db.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            pan: true,
            uan: true,
            bankAccount: true,
            bankIfsc: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
      },
    });

    if (!payslip || payslip.employeeId !== employeeId) {
      return res.status(404).json({ error: "Payslip not found" });
    }

    return res.json({ success: true, data: payslip });
  } catch (err: any) {
    console.error("[GET /me/payslips/:id] Error:", err);
    return res.status(500).json({ error: "Failed to fetch payslip details" });
  }
});

/**
 * GET /api/v1/me/tax-declaration
 * Returns tax declaration for current financial year
 */
employeeSelfServiceRouter.get("/tax-declaration", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const currentYear = new Date().getFullYear();
  const fy = `${currentYear}-${currentYear + 1}`;

  try {
    let declaration = await db.employeeTaxDeclaration.findUnique({
      where: {
        tenantId_employeeId_financialYear: {
          tenantId,
          employeeId,
          financialYear: fy,
        },
      },
      include: {
        proofs: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!declaration) {
      // Auto-create initial draft
      declaration = await db.employeeTaxDeclaration.create({
        data: {
          tenantId,
          employeeId,
          financialYear: fy,
          taxRegime: "new",
          status: "draft",
        },
        include: { proofs: true },
      });
    }

    return res.json({ success: true, data: declaration });
  } catch (err: any) {
    console.error("[GET /me/tax-declaration] Error:", err);
    return res.status(500).json({ error: "Failed to fetch tax declaration" });
  }
});

/**
 * PUT /api/v1/me/tax-declaration
 * Updates tax declaration regime and claimed deductions
 */
employeeSelfServiceRouter.put("/tax-declaration", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const {
    taxRegime,
    houseRentPaid,
    landlordPan,
    landlordName,
    landlordAddress,
    section80C,
    section80D,
    section80G,
    homeLoanInterest,
    otherIncome,
  } = req.body;

  const currentYear = new Date().getFullYear();
  const fy = `${currentYear}-${currentYear + 1}`;

  try {
    const existing = await db.employeeTaxDeclaration.findUnique({
      where: {
        tenantId_employeeId_financialYear: {
          tenantId,
          employeeId,
          financialYear: fy,
        },
      },
    });

    if (existing?.isRegimeLocked && taxRegime && taxRegime !== existing.taxRegime) {
      return res.status(400).json({ error: "Tax regime is locked and cannot be changed for this financial year." });
    }

    const s80C = Number(section80C || 0);
    const s80D = Number(section80D || 0);
    const s80G = Number(section80G || 0);
    const rent = Number(houseRentPaid || 0);
    const homeLoan = Number(homeLoanInterest || 0);
    const totalClaimed = s80C + s80D + s80G + rent + homeLoan;

    const updated = await db.employeeTaxDeclaration.upsert({
      where: {
        tenantId_employeeId_financialYear: {
          tenantId,
          employeeId,
          financialYear: fy,
        },
      },
      update: {
        taxRegime: taxRegime || undefined,
        houseRentPaid: rent,
        landlordPan: landlordPan || undefined,
        landlordName: landlordName || undefined,
        landlordAddress: landlordAddress || undefined,
        section80C: s80C,
        section80D: s80D,
        section80G: s80G,
        homeLoanInterest: homeLoan,
        otherIncome: Number(otherIncome || 0),
        totalDeductionClaimed: totalClaimed,
        status: "submitted",
      },
      create: {
        tenantId,
        employeeId,
        financialYear: fy,
        taxRegime: taxRegime || "new",
        houseRentPaid: rent,
        landlordPan,
        landlordName,
        landlordAddress,
        section80C: s80C,
        section80D: s80D,
        section80G: s80G,
        homeLoanInterest: homeLoan,
        otherIncome: Number(otherIncome || 0),
        totalDeductionClaimed: totalClaimed,
        status: "submitted",
      },
      include: { proofs: true },
    });

    return res.json({
      success: true,
      message: "Tax declaration saved successfully.",
      data: updated,
    });
  } catch (err: any) {
    console.error("[PUT /me/tax-declaration] Error:", err);
    return res.status(500).json({ error: "Failed to update tax declaration" });
  }
});

/**
 * POST /api/v1/me/tax-declaration/proofs
 * Adds an investment proof attachment
 */
employeeSelfServiceRouter.post("/tax-declaration/proofs", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { section, fileName, fileUrl, fileType, declaredAmount } = req.body;

  if (!section || !fileName || !fileUrl) {
    return res.status(400).json({ error: "section, fileName, and fileUrl are required" });
  }

  const currentYear = new Date().getFullYear();
  const fy = `${currentYear}-${currentYear + 1}`;

  try {
    let declaration = await db.employeeTaxDeclaration.findUnique({
      where: {
        tenantId_employeeId_financialYear: {
          tenantId,
          employeeId,
          financialYear: fy,
        },
      },
    });

    if (!declaration) {
      declaration = await db.employeeTaxDeclaration.create({
        data: {
          tenantId,
          employeeId,
          financialYear: fy,
          taxRegime: "new",
          status: "draft",
        },
      });
    }

    const proof = await db.taxDeclarationProof.create({
      data: {
        declarationId: declaration.id,
        section,
        fileName,
        fileUrl,
        fileType: fileType || "application/pdf",
        declaredAmount: Number(declaredAmount || 0),
        status: "pending",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Proof document uploaded successfully.",
      data: proof,
    });
  } catch (err: any) {
    console.error("[POST /me/tax-declaration/proofs] Error:", err);
    return res.status(500).json({ error: "Failed to add declaration proof" });
  }
});

// ==========================================
// PHASE E4: LIFECYCLE, GROWTH & PERFORMANCE
// ==========================================

/**
 * GET /api/v1/me/okrs
 * Returns personal OKR objectives and key results
 */
employeeSelfServiceRouter.get("/okrs", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const objectives = await db.okrObjective.findMany({
      where: { ownerId: employeeId },
      include: {
        keyResults: true,
        cycle: { select: { name: true, startDate: true, endDate: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: objectives });
  } catch (err: any) {
    console.error("[GET /me/okrs] Error:", err);
    return res.status(500).json({ error: "Failed to fetch OKR objectives" });
  }
});

/**
 * GET /api/v1/me/awards
 * Returns awards and recognitions received by employee
 */
employeeSelfServiceRouter.get("/awards", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const awards = await db.award.findMany({
      where: { employeeId },
      include: { awardType: true },
      orderBy: { awardDate: "desc" },
    });

    return res.json({ success: true, data: awards });
  } catch (err: any) {
    console.error("[GET /me/awards] Error:", err);
    return res.status(500).json({ error: "Failed to fetch employee awards" });
  }
});

/**
 * GET /api/v1/me/trainings
 * Returns training courses enrolled by employee
 */
employeeSelfServiceRouter.get("/trainings", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const enrollments = await db.courseEnrollment.findMany({
      where: { employeeId },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: enrollments });
  } catch (err: any) {
    console.error("[GET /me/trainings] Error:", err);
    return res.status(500).json({ error: "Failed to fetch training courses" });
  }
});

/**
 * GET /api/v1/me/documents
 * Returns employee document requests and letters
 */
employeeSelfServiceRouter.get("/documents", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const requests = await db.documentRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: requests });
  } catch (err: any) {
    console.error("[GET /me/documents] Error:", err);
    return res.status(500).json({ error: "Failed to fetch document requests" });
  }
});

/**
 * POST /api/v1/me/documents/request
 * Submits request for official company letter (e.g. Bonafide, NOC, Experience)
 */
employeeSelfServiceRouter.post("/documents/request", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { letterType, purpose } = req.body;

  if (!letterType || !purpose) {
    return res.status(400).json({ error: "letterType and purpose are required" });
  }

  try {
    const created = await db.documentRequest.create({
      data: {
        tenantId,
        employeeId,
        letterType: String(letterType).toUpperCase(),
        purpose,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Document request submitted successfully.",
      data: created,
    });
  } catch (err: any) {
    console.error("[POST /me/documents/request] Error:", err);
    return res.status(500).json({ error: "Failed to submit document request" });
  }
});

// ==========================================
// PHASE E5: ASSETS, RESIGNATION & HELPDESK
// ==========================================

/**
 * GET /api/v1/me/assets
 * Lists assigned physical assets and pending equipment requests
 */
employeeSelfServiceRouter.get("/assets", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const [assignments, requests] = await Promise.all([
      db.assetAssignment.findMany({
        where: { employeeId },
        include: { asset: true },
        orderBy: { assignedAt: "desc" },
      }),
      db.assetRequest.findMany({
        where: { employeeId },
        orderBy: { requestedAt: "desc" },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        assignedAssets: assignments,
        assetRequests: requests,
      },
    });
  } catch (err: any) {
    console.error("[GET /me/assets] Error:", err);
    return res.status(500).json({ error: "Failed to fetch asset inventory" });
  }
});

/**
 * POST /api/v1/me/assets/request
 * Requests hardware, accessories, or equipment
 */
employeeSelfServiceRouter.post("/assets/request", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { categoryName, itemName, quantity, purpose, priority } = req.body;

  if (!categoryName || !itemName || !purpose) {
    return res.status(400).json({ error: "categoryName, itemName, and purpose are required" });
  }

  try {
    const request = await db.assetRequest.create({
      data: {
        tenantId,
        employeeId,
        categoryName,
        itemName,
        quantity: Number(quantity || 1),
        purpose,
        priority: priority || "medium",
        status: "pending",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Asset request submitted successfully.",
      data: request,
    });
  } catch (err: any) {
    console.error("[POST /me/assets/request] Error:", err);
    return res.status(500).json({ error: "Failed to submit asset request" });
  }
});

/**
 * GET /api/v1/me/resignation
 * Returns current resignation / exit status
 */
employeeSelfServiceRouter.get("/resignation", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const exitRecord = await db.employeeExit.findFirst({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: exitRecord || null });
  } catch (err: any) {
    console.error("[GET /me/resignation] Error:", err);
    return res.status(500).json({ error: "Failed to fetch resignation details" });
  }
});

/**
 * POST /api/v1/me/resignation
 * Submits employee resignation request
 */
employeeSelfServiceRouter.post("/resignation", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { reason, preferredLastWorkingDay } = req.body;

  if (!reason || !preferredLastWorkingDay) {
    return res.status(400).json({ error: "reason and preferredLastWorkingDay are required" });
  }

  try {
    const existing = await db.employeeExit.findFirst({
      where: { employeeId, status: { in: ["serving_notice", "clearance_pending"] } },
    });

    if (existing) {
      return res.status(400).json({ error: "You already have an active resignation in progress." });
    }

    const code = `EXIT-${Date.now().toString().slice(-6)}`;
    const exitRecord = await db.employeeExit.create({
      data: {
        tenantId,
        employeeId,
        exitCode: code,
        resignationDate: new Date(),
        lastWorkingDay: new Date(preferredLastWorkingDay),
        reason,
        exitType: "resignation",
        status: "serving_notice",
        noticePeriodDays: 60,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Resignation submitted successfully.",
      data: exitRecord,
    });
  } catch (err: any) {
    console.error("[POST /me/resignation] Error:", err);
    return res.status(500).json({ error: "Failed to submit resignation" });
  }
});

/**
 * GET /api/v1/me/tickets
 * Returns helpdesk tickets raised by caller
 */
employeeSelfServiceRouter.get("/tickets", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;

  try {
    const tickets = await db.helpdeskTicket.findMany({
      where: { employeeId },
      include: { comments: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: tickets });
  } catch (err: any) {
    console.error("[GET /me/tickets] Error:", err);
    return res.status(500).json({ error: "Failed to fetch helpdesk tickets" });
  }
});

/**
 * POST /api/v1/me/tickets
 * Raises a new helpdesk / grievance ticket
 */
employeeSelfServiceRouter.post("/tickets", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;
  const { subject, category, priority, description } = req.body;

  if (!subject || !description) {
    return res.status(400).json({ error: "subject and description are required" });
  }

  try {
    const code = `TCK-${Date.now().toString().slice(-6)}`;
    const ticket = await db.helpdeskTicket.create({
      data: {
        tenantId,
        employeeId,
        ticketCode: code,
        subject,
        category: category || "IT & Hardware",
        priority: priority || "medium",
        description,
        status: "open",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully.",
      data: ticket,
    });
  } catch (err: any) {
    console.error("[POST /me/tickets] Error:", err);
    return res.status(500).json({ error: "Failed to create helpdesk ticket" });
  }
});

// ==========================================
// PHASE E6: MANAGER SELF-SERVICE (MSS)
// ==========================================

/**
 * GET /api/v1/me/team
 * Returns manager's direct reports
 */
employeeSelfServiceRouter.get("/team", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;

  try {
    const directReports = await db.employee.findMany({
      where: {
        tenantId,
        managerId: employeeId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        employeeCode: true,
        status: true,
        joinedAt: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
      orderBy: { firstName: "asc" },
    });

    return res.json({ success: true, data: directReports });
  } catch (err: any) {
    console.error("[GET /me/team] Error:", err);
    return res.status(500).json({ error: "Failed to fetch team members" });
  }
});

/**
 * GET /api/v1/me/team/approvals
 * Returns pending approvals for manager's direct reports (leaves, regularizations, change requests)
 */
employeeSelfServiceRouter.get("/team/approvals", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const tenantId = req.user!.tenantId!;

  try {
    const directReports = await db.employee.findMany({
      where: { tenantId, managerId: employeeId },
      select: { id: true },
    });

    const reportIds = directReports.map((r) => r.id);

    if (reportIds.length === 0) {
      return res.json({
        success: true,
        data: {
          leaves: [],
          regularizations: [],
          changeRequests: [],
        },
      });
    }

    const [leaves, regularizations, changeRequests] = await Promise.all([
      db.leaveRequest.findMany({
        where: {
          tenantId,
          employeeId: { in: reportIds },
          status: "pending",
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          leaveType: { select: { id: true, name: true, color: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.attendanceRegularization.findMany({
        where: {
          tenantId,
          employeeId: { in: reportIds },
          status: "PENDING",
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.employeeChangeRequest.findMany({
        where: {
          tenantId,
          employeeId: { in: reportIds },
          status: "PENDING",
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        leaves,
        regularizations,
        changeRequests,
      },
    });
  } catch (err: any) {
    console.error("[GET /me/team/approvals] Error:", err);
    return res.status(500).json({ error: "Failed to fetch team approvals" });
  }
});

/**
 * POST /api/v1/me/team/regularizations/:id/action
 * Approves or rejects a team member's regularization request
 */
employeeSelfServiceRouter.post("/team/regularizations/:id/action", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const { id } = req.params;
  const { action, comments } = req.body; // action: 'approve' | 'reject'

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
  }

  try {
    const reg = await db.attendanceRegularization.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!reg) {
      return res.status(404).json({ error: "Regularization request not found" });
    }

    // Verify manager relationship or manager role
    if (reg.employee.managerId !== employeeId && !req.user!.roles?.includes("hr_admin") && !req.user!.roles?.includes("super_admin")) {
      return res.status(403).json({ error: "You are not authorized to approve this request." });
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const updated = await db.attendanceRegularization.update({
      where: { id },
      data: {
        status: newStatus,
        approverId: employeeId,
        reviewedAt: new Date(),
        reviewComments: comments || undefined,
      },
    });

    // If approved, update or insert into attendance table
    if (newStatus === "APPROVED" && (reg.proposedIn || reg.proposedOut)) {
      await db.attendance.upsert({
        where: {
          tenantId_employeeId_date: {
            tenantId: reg.tenantId,
            employeeId: reg.employeeId,
            date: reg.attendanceDate,
          },
        },
        update: {
          checkIn: reg.proposedIn || undefined,
          checkOut: reg.proposedOut || undefined,
          status: "present",
        },
        create: {
          tenantId: reg.tenantId,
          employeeId: reg.employeeId,
          date: reg.attendanceDate,
          checkIn: reg.proposedIn,
          checkOut: reg.proposedOut,
          status: "present",
        },
      });
    }

    return res.json({
      success: true,
      message: `Regularization request ${newStatus.toLowerCase()} successfully.`,
      data: updated,
    });
  } catch (err: any) {
    console.error("[POST /me/team/regularizations/:id/action] Error:", err);
    return res.status(500).json({ error: "Failed to process regularization decision" });
  }
});

/**
 * POST /api/v1/me/team/leaves/:id/action
 * Approves or rejects a team member's leave request
 */
employeeSelfServiceRouter.post("/team/leaves/:id/action", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const { id } = req.params;
  const { action, comments } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
  }

  try {
    const leave = await db.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    if (leave.employee.managerId !== employeeId && !req.user!.roles?.includes("hr_admin") && !req.user!.roles?.includes("super_admin")) {
      return res.status(403).json({ error: "You are not authorized to approve this request." });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const updated = await db.leaveRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approverId: employeeId,
        approvedAt: new Date(),
        reason: comments ? `${leave.reason}\n[Manager Note: ${comments}]` : leave.reason,
      },
    });

    return res.json({
      success: true,
      message: `Leave request ${newStatus} successfully.`,
      data: updated,
    });
  } catch (err: any) {
    console.error("[POST /me/team/leaves/:id/action] Error:", err);
    return res.status(500).json({ error: "Failed to process leave decision" });
  }
});

/**
 * POST /api/v1/me/team/profile-changes/:id/action
 * Approves or rejects a team member's sensitive profile change request
 */
employeeSelfServiceRouter.post("/team/profile-changes/:id/action", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const employeeId = req.employee!.id;
  const { id } = req.params;
  const { action, reviewerNotes } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
  }

  try {
    const changeReq = await db.employeeChangeRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!changeReq) {
      return res.status(404).json({ error: "Change request not found" });
    }

    if (changeReq.employee?.managerId !== employeeId && !req.user!.roles?.includes("hr_admin") && !req.user!.roles?.includes("super_admin")) {
      return res.status(403).json({ error: "You are not authorized to review this change request." });
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const updated = await db.employeeChangeRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedBy: employeeId,
        reviewedAt: new Date(),
        reviewComments: reviewerNotes || undefined,
      },
    });

    // If approved, update the employee record dynamically
    if (newStatus === "APPROVED") {
      const allowedFields = ["pan", "aadhaar", "uan", "esiNumber", "pfNumber", "bankName", "bankAccount", "bankIfsc", "bankBranch"];
      if (allowedFields.includes(changeReq.fieldKey)) {
        let parsedVal = changeReq.newValueJson;
        try {
          const parsed = JSON.parse(changeReq.newValueJson);
          if (typeof parsed === "string") parsedVal = parsed;
        } catch {}

        await db.employee.update({
          where: { id: changeReq.employeeId },
          data: {
            [changeReq.fieldKey]: parsedVal,
          },
        });
      }
    }

    // Queue outbox event and audit log
    await OutboxService.createOutboxEvent({
      tenantId: changeReq.tenantId,
      eventType: newStatus === "APPROVED" ? "profile.change_approved" : "profile.change_rejected",
      entityType: "EmployeeChangeRequest",
      entityId: updated.id,
      actorId: req.user!.userId,
      payload: {
        employeeId: changeReq.employeeId,
        fieldKey: changeReq.fieldKey,
        status: newStatus,
      },
    });

    await AuditService.logMutation({
      tenantId: changeReq.tenantId,
      actorId: req.user!.userId,
      action: `PROFILE_CHANGE_REQUEST_${newStatus}`,
      entityType: "EmployeeChangeRequest",
      entityId: updated.id,
      newState: { status: newStatus, reviewedBy: employeeId },
    });

    return res.json({
      success: true,
      message: `Change request ${newStatus.toLowerCase()} successfully.`,
      data: updated,
    });
  } catch (err: any) {
    console.error("[POST /me/team/profile-changes/:id/action] Error:", err);
    return res.status(500).json({ error: "Failed to process change request decision" });
  }
});

// =========================================================================
// P2 ESS: ORGANIZATION STRUCTURE (GET /api/v1/me/organization/structure)
// Stripped of sensitive statutory/payroll data (public directory tree)
// =========================================================================
employeeSelfServiceRouter.get("/organization/structure", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const tenantId = req.user!.tenantId!;

  try {
    const [branches, departments, designations, employees] = await Promise.all([
      db.branch.findMany({
        where: { tenantId, status: "active" },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      db.department.findMany({
        where: { tenantId, status: "active" },
        select: { id: true, name: true, branchId: true },
        orderBy: { name: "asc" },
      }),
      db.designation.findMany({
        where: { tenantId, status: "active" },
        select: { id: true, name: true, departmentId: true },
        orderBy: { name: "asc" },
      }),
      db.employee.findMany({
        where: { tenantId, status: "active" },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          position: true,
          managerId: true,
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Build hierarchy tree
    const employeeMap = new Map<string, any>();
    employees.forEach((emp: any) => {
      employeeMap.set(emp.id, {
        ...emp,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        subordinates: [],
      });
    });

    const rootNodes: any[] = [];
    employees.forEach((emp: any) => {
      const node = employeeMap.get(emp.id);
      if (emp.managerId && employeeMap.has(emp.managerId)) {
        employeeMap.get(emp.managerId).subordinates.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return res.json({
      success: true,
      data: {
        branches,
        departments,
        designations,
        orgChart: rootNodes,
      },
    });
  } catch (err: any) {
    console.error("[GET /me/organization/structure] Error:", err);
    return res.status(500).json({ error: "Failed to fetch organization structure" });
  }
});

// =========================================================================
// P2 ESS: HOLIDAYS (GET /api/v1/me/organization/holidays)
// =========================================================================
employeeSelfServiceRouter.get("/organization/holidays", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const tenantId = req.user!.tenantId!;
  const year = Number(req.query.year) || new Date().getFullYear();

  try {
    const holidays = await db.holiday.findMany({
      where: {
        tenantId,
        year,
      },
      orderBy: { date: "asc" },
    });

    return res.json({
      success: true,
      data: holidays,
    });
  } catch (err: any) {
    console.error("[GET /me/organization/holidays] Error:", err);
    return res.status(500).json({ error: "Failed to fetch holidays" });
  }
});

// =========================================================================
// P2 ESS: ANNOUNCEMENTS (GET /api/v1/me/organization/announcements)
// =========================================================================
employeeSelfServiceRouter.get("/organization/announcements", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const tenantId = req.user!.tenantId!;
  const employeeId = req.employee!.id;
  const departmentId = req.employee!.departmentId;

  try {
    const announcements = await db.announcement.findMany({
      where: {
        tenantId,
        OR: [
          { targetType: "all_company" },
          ...(departmentId ? [{ targetType: "department", targetDepartmentId: departmentId }] : []),
        ],
      },
      include: {
        acknowledgements: {
          where: { employeeId },
          select: { id: true, acknowledgedAt: true },
        },
      },
      orderBy: [{ isPinned: "desc" }, { publishDate: "desc" }],
    });

    const formatted = announcements.map((a: any) => ({
      ...a,
      hasAcknowledged: a.acknowledgements.length > 0,
      acknowledgedAt: a.acknowledgements[0]?.acknowledgedAt || null,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (err: any) {
    console.error("[GET /me/organization/announcements] Error:", err);
    return res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// =========================================================================
// P2 ESS: ANNOUNCEMENT ACKNOWLEDGE (POST /api/v1/me/organization/announcements/:id/acknowledge)
// =========================================================================
employeeSelfServiceRouter.post("/organization/announcements/:id/acknowledge", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const tenantId = req.user!.tenantId!;
  const employeeId = req.employee!.id;
  const announcementId = req.params.id;

  try {
    const existing = await db.announcementAcknowledgement.findUnique({
      where: {
        announcementId_employeeId: {
          announcementId,
          employeeId,
        },
      },
    });

    if (existing) {
      return res.json({ success: true, message: "Already acknowledged", data: existing });
    }

    const ack = await db.announcementAcknowledgement.create({
      data: {
        tenantId,
        announcementId,
        employeeId,
        comments: req.body?.comments || null,
      },
    });

    return res.status(201).json({ success: true, message: "Policy acknowledged", data: ack });
  } catch (err: any) {
    console.error("[POST /me/organization/announcements/:id/acknowledge] Error:", err);
    return res.status(500).json({ error: "Failed to record acknowledgement" });
  }
});

// =========================================================================
// P2 ESS: EMPLOYEE DIRECTORY (GET /api/v1/me/employees)
// Company-wide colleague directory (FLS applied: zero statutory PII)
// =========================================================================
employeeSelfServiceRouter.get("/employees", async (req: EmployeeAuthRequest, res: Response) => {
  const db = rawPrisma || prisma;
  const tenantId = req.user!.tenantId!;
  const pagination = parsePaginationParams(req, "firstName", 50);
  const { departmentId, branchId } = req.query;

  try {
    const where: any = {
      tenantId,
      status: "active",
    };

    if (pagination.search) {
      where.OR = [
        { firstName: { contains: pagination.search, mode: "insensitive" } },
        { lastName: { contains: pagination.search, mode: "insensitive" } },
        { email: { contains: pagination.search, mode: "insensitive" } },
        { employeeCode: { contains: pagination.search, mode: "insensitive" } },
        { position: { contains: pagination.search, mode: "insensitive" } },
      ];
    }

    if (departmentId && departmentId !== "all") {
      where.departmentId = String(departmentId);
    }
    if (branchId && branchId !== "all") {
      where.branchId = String(branchId);
    }

    const [total, colleagues] = await Promise.all([
      db.employee.count({ where }),
      db.employee.findMany({
        where,
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          position: true,
          status: true,
          joinedAt: true,
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { [pagination.sortField]: pagination.sortType },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    const formatted = colleagues.map((c: any) => ({
      ...c,
      fullName: `${c.firstName} ${c.lastName}`.trim(),
    }));

    return res.json(formatPaginatedResponse(formatted, total, pagination));
  } catch (err: any) {
    console.error("[GET /me/employees] Error:", err);
    return res.status(500).json({ error: "Failed to fetch employee directory" });
  }
});



