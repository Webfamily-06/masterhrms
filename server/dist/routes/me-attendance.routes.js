"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meAttendanceRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const attendance_service_1 = require("../services/attendance.service");
const idempotency_middleware_1 = require("../middleware/idempotency.middleware");
exports.meAttendanceRouter = (0, express_1.Router)();
exports.meAttendanceRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// Helper to get self employee
async function getSelfEmployee(req) {
    const tenantId = req.tenantId;
    const employee = await prisma_1.rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user.userId },
        include: { branch: true, department: true, designation: true },
    });
    if (!employee)
        throw new Error("Employee profile not found for user");
    return employee;
}
// GET /api/v1/me/attendance/status (Today's active punch status & shift)
exports.meAttendanceRouter.get("/status", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const [attendance, roster, policy] = await Promise.all([
            prisma_1.rawPrisma.attendance.findUnique({
                where: {
                    tenantId_employeeId_date: {
                        tenantId,
                        employeeId: employee.id,
                        date: today,
                    },
                },
            }),
            prisma_1.rawPrisma.shiftRoster.findUnique({
                where: {
                    tenantId_employeeId_rosterDate: {
                        tenantId,
                        employeeId: employee.id,
                        rosterDate: today,
                    },
                },
                include: { shift: true },
            }),
            prisma_1.rawPrisma.attendancePolicy.findFirst({
                where: {
                    tenantId,
                    OR: [
                        { departmentId: employee.departmentId },
                        { branchId: employee.branchId },
                        { isDefault: true },
                    ],
                },
                orderBy: { isDefault: "asc" },
            }),
        ]);
        let elapsedSeconds = 0;
        if (attendance?.checkIn && !attendance?.checkOut) {
            elapsedSeconds = Math.round((now.getTime() - attendance.checkIn.getTime()) / 1000);
        }
        else if (attendance?.hours) {
            elapsedSeconds = Math.round(Number(attendance.hours) * 3600);
        }
        return res.json({
            isCheckedIn: !!attendance?.checkIn && !attendance?.checkOut,
            checkInTime: attendance?.checkIn || null,
            checkOutTime: attendance?.checkOut || null,
            elapsedSeconds,
            status: attendance?.status || "not_marked",
            shift: roster?.shift || { name: "General Shift", startTime: "09:30", endTime: "18:30" },
            policy: policy ? { name: policy.name, graceMinutes: policy.graceMinutes, version: policy.version } : null,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/v1/me/attendance/punch (Check-in / Check-out)
exports.meAttendanceRouter.post("/punch", idempotency_middleware_1.enforceIdempotency, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const { type, latitude, longitude, notes } = req.body;
        if (!type || !["check_in", "check_out"].includes(type)) {
            return res.status(400).json({ error: "type must be 'check_in' or 'check_out'" });
        }
        const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
        const result = await attendance_service_1.AttendanceService.recordPunch(tenantId, employee.id, {
            type,
            latitude: latitude ? Number(latitude) : undefined,
            longitude: longitude ? Number(longitude) : undefined,
            notes,
            source: "WEB",
            ipAddress,
        });
        return res.json(result);
    }
    catch (err) {
        if (err.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message });
        return res.status(400).json({ error: err.message });
    }
});
// GET /api/v1/me/attendance/records (Month calendar & list)
exports.meAttendanceRouter.get("/records", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const now = new Date();
        const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10);
        const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
        const records = await prisma_1.rawPrisma.attendance.findMany({
            where: {
                tenantId,
                employeeId: employee.id,
                date: { gte: start, lte: end },
            },
            orderBy: { date: "asc" },
        });
        // Summary calculation
        const presentCount = records.filter((r) => r.status === "present").length;
        const halfDayCount = records.filter((r) => r.status === "half_day").length;
        const lateCount = records.filter((r) => r.status === "late").length;
        const leaveCount = records.filter((r) => r.status === "on_leave").length;
        return res.json({
            records,
            summary: {
                totalRecords: records.length,
                present: presentCount,
                halfDay: halfDayCount,
                late: lateCount,
                leave: leaveCount,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/v1/me/attendance/regularizations
exports.meAttendanceRouter.get("/regularizations", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const items = await prisma_1.rawPrisma.attendanceRegularization.findMany({
            where: { tenantId, employeeId: employee.id },
            orderBy: { createdAt: "desc" },
        });
        return res.json(items);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/v1/me/attendance/regularizations
exports.meAttendanceRouter.post("/regularizations", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const { attendanceDate, proposedIn, proposedOut, reason } = req.body;
        if (!attendanceDate || !reason) {
            return res.status(400).json({ error: "attendanceDate and reason are required" });
        }
        const date = new Date(attendanceDate);
        date.setUTCHours(0, 0, 0, 0);
        await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, date);
        const reg = await prisma_1.rawPrisma.attendanceRegularization.create({
            data: {
                tenantId,
                employeeId: employee.id,
                attendanceDate: date,
                proposedIn: proposedIn ? new Date(proposedIn) : null,
                proposedOut: proposedOut ? new Date(proposedOut) : null,
                reason,
                status: "PENDING",
            },
        });
        return res.status(201).json(reg);
    }
    catch (err) {
        if (err.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/v1/me/attendance/shifts
exports.meAttendanceRouter.get("/shifts", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 14));
        const [rosters, swaps] = await Promise.all([
            prisma_1.rawPrisma.shiftRoster.findMany({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    rosterDate: { gte: start, lte: end },
                },
                include: { shift: true },
                orderBy: { rosterDate: "asc" },
            }),
            prisma_1.rawPrisma.shiftSwapRequest.findMany({
                where: {
                    tenantId,
                    OR: [{ requesterEmployeeId: employee.id }, { targetEmployeeId: employee.id }],
                },
                include: { requesterEmployee: true, targetEmployee: true },
                orderBy: { createdAt: "desc" },
            }),
        ]);
        return res.json({ rosters, swaps });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/v1/me/attendance/policies
exports.meAttendanceRouter.get("/policies", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const policy = await prisma_1.rawPrisma.attendancePolicy.findFirst({
            where: {
                tenantId,
                OR: [
                    { departmentId: employee.departmentId },
                    { branchId: employee.branchId },
                    { isDefault: true },
                ],
            },
            orderBy: { isDefault: "asc" },
        });
        return res.json(policy || { name: "Standard Corporate Policy", graceMinutes: 15, halfDayHours: 4.0, fullDayHours: 8.0 });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/v1/me/attendance/requests (Unified OT, WFH)
exports.meAttendanceRouter.get("/requests", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const [overtime, wfh] = await Promise.all([
            prisma_1.rawPrisma.overtimeRequest.findMany({
                where: { tenantId, employeeId: employee.id },
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.rawPrisma.wfhRequest.findMany({
                where: { tenantId, employeeId: employee.id },
                orderBy: { createdAt: "desc" },
            }),
        ]);
        return res.json({ overtime, wfh });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/v1/me/attendance/requests (Submit OT or WFH)
exports.meAttendanceRouter.post("/requests", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const { type, date, fromDate, toDate, hours, reason } = req.body;
        if (type === "OVERTIME") {
            const ot = await prisma_1.rawPrisma.overtimeRequest.create({
                data: {
                    tenantId,
                    employeeId: employee.id,
                    overtimeDate: new Date(date),
                    hoursRequested: Number(hours),
                    reason,
                    status: "pending",
                },
            });
            return res.status(201).json(ot);
        }
        else if (type === "WFH") {
            const wfh = await prisma_1.rawPrisma.wfhRequest.create({
                data: {
                    tenantId,
                    employeeId: employee.id,
                    fromDate: new Date(fromDate || date),
                    toDate: new Date(toDate || date),
                    reason,
                    status: "pending",
                },
            });
            return res.status(201).json(wfh);
        }
        return res.status(400).json({ error: "Unknown request type" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/v1/me/attendance/timesheets
exports.meAttendanceRouter.get("/timesheets", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const timesheets = await prisma_1.rawPrisma.timesheet.findMany({
            where: { tenantId, employeeId: employee.id },
            include: { project: true },
            orderBy: { date: "desc" },
        });
        return res.json(timesheets);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/v1/me/attendance/timesheets
exports.meAttendanceRouter.post("/timesheets", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const { date, hours, description, projectId } = req.body;
        if (!date || !hours) {
            return res.status(400).json({ error: "date and hours are required" });
        }
        const tDate = new Date(date);
        tDate.setUTCHours(0, 0, 0, 0);
        await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, tDate);
        const timesheet = await prisma_1.rawPrisma.timesheet.create({
            data: {
                tenantId,
                employeeId: employee.id,
                date: tDate,
                hours: Number(hours),
                description: description || null,
                projectId: projectId || null,
                status: "pending",
            },
        });
        return res.status(201).json(timesheet);
    }
    catch (err) {
        if (err.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
});
