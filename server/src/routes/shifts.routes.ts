import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantId } from "../lib/tenant";

export const shiftsRouter = Router();

// Default standard seed shifts for new workspaces
const DEFAULT_SEED_SHIFTS = [
  { name: "General Shift", code: "GEN", startTime: "09:30", endTime: "18:30", breakMinutes: 60, allowance: 0, color: "blue", isOvertimeEligible: true },
  { name: "Morning Shift", code: "MORN", startTime: "07:00", endTime: "15:30", breakMinutes: 30, allowance: 250, color: "amber", isOvertimeEligible: true },
  { name: "Evening Shift", code: "EVE", startTime: "15:00", endTime: "23:30", breakMinutes: 30, allowance: 350, color: "purple", isOvertimeEligible: true },
  { name: "Night Differential", code: "NIGHT", startTime: "23:00", endTime: "07:30", breakMinutes: 30, allowance: 600, color: "indigo", isOvertimeEligible: true },
  { name: "Weekly Off", code: "OFF", startTime: "00:00", endTime: "00:00", breakMinutes: 0, allowance: 0, color: "slate", isOvertimeEligible: false },
];

/**
 * Helper to auto-seed default shifts if tenant has none
 */
async function ensureSeedShifts(tenantId: string) {
  const count = await prisma.shiftDefinition.count({ where: { tenantId } });
  if (count === 0) {
    for (const s of DEFAULT_SEED_SHIFTS) {
      await prisma.shiftDefinition.create({
        data: {
          tenantId,
          name: s.name,
          code: s.code,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: s.breakMinutes,
          allowance: s.allowance,
          color: s.color,
          isOvertimeEligible: s.isOvertimeEligible,
        },
      });
    }
  }
}

// GET /api/shifts (List shift definitions)
shiftsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const shifts = await prisma.shiftDefinition.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    return res.json(shifts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list shifts." });
  }
});

// POST /api/shifts (Create shift definition)
shiftsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { name, code, startTime, endTime, breakMinutes, allowance, isOvertimeEligible, color } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Shift name and code are required." });
    }

    const shift = await prisma.shiftDefinition.create({
      data: {
        tenantId,
        name,
        code: String(code).toUpperCase().trim(),
        startTime: startTime || "09:30",
        endTime: endTime || "18:30",
        breakMinutes: breakMinutes ? Number(breakMinutes) : 60,
        allowance: allowance ? Number(allowance) : 0,
        isOvertimeEligible: isOvertimeEligible !== undefined ? Boolean(isOvertimeEligible) : true,
        color: color || "blue",
      },
    });

    return res.status(201).json(shift);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create shift definition." });
  }
});

// PUT /api/shifts/:id (Update shift definition)
shiftsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.shiftDefinition.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Shift definition not found." });
    }

    const { name, code, startTime, endTime, breakMinutes, allowance, isOvertimeEligible, color } = req.body;

    const updated = await prisma.shiftDefinition.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code: String(code).toUpperCase().trim() }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(breakMinutes !== undefined && { breakMinutes: Number(breakMinutes) }),
        ...(allowance !== undefined && { allowance: Number(allowance) }),
        ...(isOvertimeEligible !== undefined && { isOvertimeEligible: Boolean(isOvertimeEligible) }),
        ...(color && { color }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update shift definition." });
  }
});

// DELETE /api/shifts/:id (Delete shift definition)
shiftsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.shiftDefinition.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Shift definition not found." });
    }

    // Check if shift is currently assigned to rosters
    const rosterCount = await prisma.shiftRoster.count({ where: { shiftId: id } });
    if (rosterCount > 0) {
      return res.status(400).json({
        error: `Cannot delete shift: It is currently assigned to ${rosterCount} roster schedules. Reassign them first.`,
      });
    }

    await prisma.shiftDefinition.delete({ where: { id } });
    return res.json({ success: true, message: "Shift definition deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete shift definition." });
  }
});

// GET /api/shifts/roster (Get weekly or monthly roster matrix)
shiftsRouter.get("/roster", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { startDate, endDate, departmentId } = req.query;

    const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const end = endDate ? new Date(String(endDate)) : new Date(Date.now() + 14 * 24 * 3600 * 1000);

    const empWhere: any = { tenantId, status: "active" };
    if (departmentId && departmentId !== "all") {
      empWhere.departmentId = String(departmentId);
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      include: {
        department: true,
        shiftRosters: {
          where: {
            rosterDate: {
              gte: start,
              lte: end,
            },
          },
          include: {
            shift: true,
          },
        },
        attendance: {
          where: {
            date: {
              gte: start,
              lte: end,
            },
          },
        },
      },
      orderBy: { firstName: "asc" },
    });

    return res.json(employees);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch roster schedule." });
  }
});

// POST /api/shifts/roster/assign (Assign shift for single day)
shiftsRouter.post("/roster/assign", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { employeeId, shiftId, rosterDate, notes } = req.body;

    if (!employeeId || !shiftId || !rosterDate) {
      return res.status(400).json({ error: "Employee, shift, and roster date are required." });
    }

    const date = new Date(rosterDate);

    const roster = await prisma.shiftRoster.upsert({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId,
          employeeId,
          rosterDate: date,
        },
      },
      create: {
        tenantId,
        employeeId,
        shiftId,
        rosterDate: date,
        notes: notes || null,
        status: "assigned",
      },
      update: {
        shiftId,
        notes: notes || null,
        status: "assigned",
      },
      include: {
        shift: true,
        employee: true,
      },
    });

    return res.json(roster);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to assign shift." });
  }
});

// POST /api/shifts/roster/bulk-assign (Auto-assign shift pattern for date range)
shiftsRouter.post("/roster/bulk-assign", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { employeeIds, shiftId, offShiftId, startDate, daysCount, includeWeekendOff } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0 || !shiftId || !startDate) {
      return res.status(400).json({ error: "Employee IDs, shift ID, and start date are required." });
    }

    const totalDays = Number(daysCount) || 7;
    const start = new Date(startDate);

    // Get off shift definition (fallback to OFF)
    let offShift = offShiftId;
    if (includeWeekendOff && !offShift) {
      const defOff = await prisma.shiftDefinition.findFirst({
        where: { tenantId, code: "OFF" },
      });
      offShift = defOff?.id || shiftId;
    }

    let createdCount = 0;

    await prisma.$transaction(async (tx: any) => {
      for (const empId of employeeIds) {
        for (let i = 0; i < totalDays; i++) {
          const currentDay = new Date(start);
          currentDay.setDate(start.getDate() + i);

          const dayOfWeek = currentDay.getDay(); // 0 = Sun, 6 = Sat
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          const targetShiftId = includeWeekendOff && isWeekend && offShift ? offShift : shiftId;

          await tx.shiftRoster.upsert({
            where: {
              tenantId_employeeId_rosterDate: {
                tenantId,
                employeeId: empId,
                rosterDate: currentDay,
              },
            },
            create: {
              tenantId,
              employeeId: empId,
              shiftId: targetShiftId,
              rosterDate: currentDay,
              status: "assigned",
            },
            update: {
              shiftId: targetShiftId,
              status: "assigned",
            },
          });
          createdCount++;
        }
      }
    });

    return res.json({
      success: true,
      message: `Successfully scheduled ${createdCount} shift roster slots across ${employeeIds.length} employees!`,
    });
  } catch (err: any) {
    console.error("[bulk-assign] error:", err);
    return res.status(500).json({ error: err.message || "Failed to bulk assign roster." });
  }
});

// GET /api/shifts/swaps (List shift swap requests)
shiftsRouter.get("/swaps", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { status } = req.query;
    const where: any = { tenantId };
    if (status && status !== "all") {
      where.status = String(status);
    }

    const swaps = await prisma.shiftSwapRequest.findMany({
      where,
      include: {
        requesterEmployee: {
          include: { department: true },
        },
        targetEmployee: {
          include: { department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(swaps);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list shift swaps." });
  }
});

// POST /api/shifts/swaps (Create shift swap request)
shiftsRouter.post("/swaps", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { requesterEmployeeId, targetEmployeeId, shiftDate, reason } = req.body;

    if (!requesterEmployeeId || !targetEmployeeId || !shiftDate || !reason) {
      return res.status(400).json({ error: "Requester, target peer, date, and reason are required." });
    }

    if (requesterEmployeeId === targetEmployeeId) {
      return res.status(400).json({ error: "Cannot request a shift swap with yourself." });
    }

    const swap = await prisma.shiftSwapRequest.create({
      data: {
        tenantId,
        requesterEmployeeId,
        targetEmployeeId,
        shiftDate: new Date(shiftDate),
        reason,
        status: "pending_peer",
      },
      include: {
        requesterEmployee: true,
        targetEmployee: true,
      },
    });

    return res.status(201).json(swap);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create swap request." });
  }
});

// PUT /api/shifts/swaps/:id/peer-action (Peer accepts or declines swap)
shiftsRouter.put("/swaps/:id/peer-action", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // accept or decline
    const tenantId = req.user?.tenantId;

    const swap = await prisma.shiftSwapRequest.findUnique({ where: { id } });
    if (!swap || (tenantId && swap.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Swap request not found." });
    }

    if (swap.status !== "pending_peer") {
      return res.status(400).json({ error: `Cannot perform peer action. Current status is '${swap.status}'.` });
    }

    const newStatus = action === "accept" ? "pending_manager" : "rejected";

    const updated = await prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: newStatus },
      include: {
        requesterEmployee: true,
        targetEmployee: true,
      },
    });

    return res.json({
      success: true,
      message: action === "accept" ? "Peer agreed. Shift swap forwarded to Manager for final approval." : "Shift swap declined.",
      swap: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to process peer action." });
  }
});

// PUT /api/shifts/swaps/:id/manager-action (Manager approves and executes swap)
shiftsRouter.put("/swaps/:id/manager-action", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, managerNotes } = req.body; // approve or reject
    const tenantId = req.user?.tenantId;

    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: {
        requesterEmployee: true,
        targetEmployee: true,
      },
    });

    if (!swap || (tenantId && swap.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Swap request not found." });
    }

    if (action === "reject") {
      const rejected = await prisma.shiftSwapRequest.update({
        where: { id },
        data: {
          status: "rejected",
          managerNotes: managerNotes || "Rejected by Manager",
        },
      });
      return res.json({ success: true, message: "Shift swap rejected by manager.", swap: rejected });
    }

    // Execute atomic shift swap in database!
    await prisma.$transaction(async (tx: any) => {
      // Find both rosters on that date
      const requesterRoster = await tx.shiftRoster.findUnique({
        where: {
          tenantId_employeeId_rosterDate: {
            tenantId: swap.tenantId,
            employeeId: swap.requesterEmployeeId,
            rosterDate: swap.shiftDate,
          },
        },
      });

      const targetRoster = await tx.shiftRoster.findUnique({
        where: {
          tenantId_employeeId_rosterDate: {
            tenantId: swap.tenantId,
            employeeId: swap.targetEmployeeId,
            rosterDate: swap.shiftDate,
          },
        },
      });

      if (requesterRoster && targetRoster) {
        // Swap their shiftIds
        await tx.shiftRoster.update({
          where: { id: requesterRoster.id },
          data: { shiftId: targetRoster.shiftId, status: "swapped" },
        });

        await tx.shiftRoster.update({
          where: { id: targetRoster.id },
          data: { shiftId: requesterRoster.shiftId, status: "swapped" },
        });
      }

      await tx.shiftSwapRequest.update({
        where: { id },
        data: {
          status: "approved",
          managerNotes: managerNotes || "Approved by Manager",
          approvedAt: new Date(),
        },
      });
    });

    return res.json({
      success: true,
      message: `Shift swap approved and executed between ${swap.requesterEmployee.firstName} and ${swap.targetEmployee.firstName}!`,
    });
  } catch (err: any) {
    console.error("[manager-action] error:", err);
    return res.status(500).json({ error: err.message || "Failed to process manager action." });
  }
});

// POST /api/shifts/reconcile (Roster-to-Attendance Auto-Reconciliation)
shiftsRouter.post("/reconcile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { date, startDate, endDate, departmentId } = req.body;

    const start = startDate ? new Date(startDate) : (date ? new Date(date) : new Date(Date.now() - 24 * 3600 * 1000));
    const end = endDate ? new Date(endDate) : (date ? new Date(date) : new Date());

    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const empWhere: any = { tenantId, status: "active" };
    if (departmentId && departmentId !== "all") {
      empWhere.departmentId = String(departmentId);
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    });

    let totalEvaluated = 0;
    let markedAbsent = 0;
    let markedOnLeave = 0;
    let markedLate = 0;
    let alreadyPresent = 0;

    const cur = new Date(startDay);

    while (cur <= endDay) {
      const targetDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());

      for (const emp of employees) {
        totalEvaluated++;

        const att = await prisma.attendance.findUnique({
          where: {
            tenantId_employeeId_date: {
              tenantId,
              employeeId: emp.id,
              date: targetDate,
            },
          },
        });

        const approvedLeave = await prisma.leaveRequest.findFirst({
          where: {
            tenantId,
            employeeId: emp.id,
            status: "approved",
            startDate: { lte: targetDate },
            endDate: { gte: targetDate },
          },
          include: { leaveType: true },
        });

        if (approvedLeave) {
          if (!att || att.status !== "on_leave") {
            await prisma.attendance.upsert({
              where: {
                tenantId_employeeId_date: { tenantId, employeeId: emp.id, date: targetDate },
              },
              update: { status: "on_leave", notes: `Approved Leave: ${approvedLeave.leaveType?.name || "Leave"}` },
              create: {
                tenantId,
                employeeId: emp.id,
                date: targetDate,
                status: "on_leave",
                notes: `Approved Leave: ${approvedLeave.leaveType?.name || "Leave"}`,
              },
            });
            markedOnLeave++;
          }
          continue;
        }

        const roster = await prisma.shiftRoster.findUnique({
          where: {
            tenantId_employeeId_rosterDate: {
              tenantId,
              employeeId: emp.id,
              rosterDate: targetDate,
            },
          },
          include: { shift: true },
        });

        const isScheduledOff = roster?.shift?.code === "OFF";

        if (att && att.checkIn) {
          if (roster && roster.shift && roster.shift.startTime && roster.shift.startTime !== "00:00") {
            const [shH, shM] = roster.shift.startTime.split(":").map(Number);
            const shiftStart = new Date(targetDate);
            shiftStart.setHours(shH, shM, 0, 0);

            const graceThreshold = new Date(shiftStart.getTime() + 15 * 60 * 1000);
            if (new Date(att.checkIn) > graceThreshold && att.status === "present") {
              await prisma.attendance.update({
                where: { id: att.id },
                data: { status: "late", notes: `Auto-reconciled: Checked in past 15-min shift grace period.` },
              });
              markedLate++;
            } else {
              alreadyPresent++;
            }
          } else {
            alreadyPresent++;
          }
          continue;
        }

        if (!att && !isScheduledOff) {
          const isPastDate = targetDate.getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime();
          if (isPastDate) {
            await prisma.attendance.create({
              data: {
                tenantId,
                employeeId: emp.id,
                date: targetDate,
                status: "absent",
                notes: `Auto-reconciled: No punch recorded for scheduled ${roster?.shift?.name || "Shift"}.`,
              },
            });
            markedAbsent++;
          }
        }
      }

      cur.setDate(cur.getDate() + 1);
    }

    return res.json({
      success: true,
      message: `Shift roster auto-reconciliation complete for ${employees.length} employees.`,
      metrics: {
        totalEvaluated,
        markedAbsent,
        markedOnLeave,
        markedLate,
        alreadyPresent,
      },
    });
  } catch (err: any) {
    console.error("Shifts reconcile error:", err);
    return res.status(500).json({ error: err.message || "Failed to reconcile shifts with attendance." });
  }
});

