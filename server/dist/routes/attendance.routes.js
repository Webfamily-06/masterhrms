"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const socket_1 = require("../socket");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
const attendance_service_1 = require("../services/attendance.service");
const leave_service_1 = require("../services/leave.service");
exports.attendanceRouter = (0, express_1.Router)();
// Enforce Request-Scoped Tenant Context on all attendance endpoints
exports.attendanceRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
function isElevatedAttendanceUser(req) {
    const perms = req.user?.permissions || [];
    return (leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles) ||
        perms.includes("*") ||
        perms.includes("hrm.attendance.manage"));
}
// GET /api/attendance (Stocky Rule 0: Universal Query Contract)
exports.attendanceRouter.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "date", 50);
        const { date, employeeId, month, year, status } = req.query;
        const where = { tenantId };
        const isElevated = isElevatedAttendanceUser(req);
        if (!isElevated) {
            const selfEmp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user?.userId },
                select: { id: true },
            });
            if (!selfEmp) {
                return res.json(pagination.isPaginated ? (0, pagination_1.formatPaginatedResponse)([], 0, pagination) : []);
            }
            const directReports = await prisma_1.prisma.employee.findMany({
                where: { tenantId, managerId: selfEmp.id },
                select: { id: true },
            });
            const allowedEmployeeIds = [selfEmp.id, ...directReports.map((d) => d.id)];
            if (employeeId && employeeId !== "all") {
                if (!allowedEmployeeIds.includes(String(employeeId))) {
                    return res.status(403).json({ error: "Forbidden: You do not have access to this employee's attendance." });
                }
                where.employeeId = String(employeeId);
            }
            else {
                where.employeeId = allowedEmployeeIds.length === 1 ? selfEmp.id : { in: allowedEmployeeIds };
            }
        }
        else if (employeeId && employeeId !== "all") {
            where.employeeId = String(employeeId);
        }
        if (status && status !== "all") {
            where.status = String(status);
        }
        if (date) {
            const parts = String(date).split("-");
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                where.date = new Date(Date.UTC(y, m, d));
            }
            else {
                where.date = new Date(String(date));
            }
        }
        else if (month) {
            const parts = String(month).split("-");
            if (parts.length >= 2) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const start = new Date(Date.UTC(y, m, 1));
                const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
                where.date = { gte: start, lte: end };
            }
        }
        if (pagination.search) {
            where.OR = [
                { employee: { firstName: { contains: pagination.search } } },
                { employee: { lastName: { contains: pagination.search } } },
                { employee: { employeeCode: { contains: pagination.search } } },
                { notes: { contains: pagination.search } },
            ];
        }
        const sortField = ["date", "checkIn", "checkOut", "hours", "status"].includes(pagination.sortField)
            ? pagination.sortField
            : "date";
        const [total, records] = await Promise.all([
            prisma_1.prisma.attendance.count({ where }),
            prisma_1.prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            position: true,
                            department: { select: { name: true } },
                        },
                    },
                },
                orderBy: { [sortField]: pagination.sortType },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(records, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(records);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
// GET /api/attendance/summary (FN-009 Canonical Route Alias)
// Comprehensive attendance analytics, work hours & punctuality metrics
exports.attendanceRouter.get("/summary", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, month, year, date } = req.query;
        const where = { tenantId };
        const isElevated = isElevatedAttendanceUser(req);
        if (!isElevated) {
            const selfEmp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user?.userId },
                select: { id: true },
            });
            if (!selfEmp) {
                return res.json({
                    success: true,
                    totalDays: 0,
                    presentCount: 0,
                    lateCount: 0,
                    halfDayCount: 0,
                    absentCount: 0,
                    totalWorkHours: 0,
                    totalOvertimeHours: 0,
                    averageDailyHours: 0,
                    records: [],
                });
            }
            const directReports = await prisma_1.prisma.employee.findMany({
                where: { tenantId, managerId: selfEmp.id },
                select: { id: true },
            });
            const allowedEmployeeIds = [selfEmp.id, ...directReports.map((d) => d.id)];
            if (employeeId && employeeId !== "all") {
                if (!allowedEmployeeIds.includes(String(employeeId))) {
                    return res.status(403).json({ error: "Forbidden: You do not have access to this employee's attendance summary." });
                }
                where.employeeId = String(employeeId);
            }
            else {
                where.employeeId = allowedEmployeeIds.length === 1 ? selfEmp.id : { in: allowedEmployeeIds };
            }
        }
        else if (employeeId && employeeId !== "all") {
            where.employeeId = String(employeeId);
        }
        if (date) {
            const parts = String(date).split("-");
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                where.date = new Date(Date.UTC(y, m, d));
            }
            else {
                where.date = new Date(String(date));
            }
        }
        else if (month) {
            const parts = String(month).split("-");
            if (parts.length >= 2) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const start = new Date(Date.UTC(y, m, 1));
                const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
                where.date = { gte: start, lte: end };
            }
        }
        else if (year) {
            const y = parseInt(String(year), 10);
            const start = new Date(Date.UTC(y, 0, 1));
            const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
            where.date = { gte: start, lte: end };
        }
        const records = await prisma_1.prisma.attendance.findMany({
            where,
            select: {
                id: true,
                date: true,
                checkIn: true,
                checkOut: true,
                status: true,
                hours: true,
                overtimeMinutes: true,
                lateMinutes: true,
                earlyOutMinutes: true,
                employeeId: true,
            },
            orderBy: { date: "asc" },
        });
        let presentCount = 0;
        let lateCount = 0;
        let halfDayCount = 0;
        let absentCount = 0;
        let totalWorkHours = 0;
        let totalOvertimeHours = 0;
        for (const r of records) {
            if (r.status === "present")
                presentCount++;
            else if (r.status === "late")
                lateCount++;
            else if (r.status === "half_day")
                halfDayCount++;
            else if (r.status === "absent")
                absentCount++;
            const h = Number(r.hours) || 0;
            totalWorkHours += h;
            totalOvertimeHours += (r.overtimeMinutes || 0) / 60;
        }
        const totalDays = records.length;
        const averageDailyHours = totalDays > 0 ? Number((totalWorkHours / totalDays).toFixed(2)) : 0;
        return res.json({
            success: true,
            totalDays,
            presentCount,
            lateCount,
            halfDayCount,
            absentCount,
            totalWorkHours: Number(totalWorkHours.toFixed(2)),
            totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
            averageDailyHours,
            records,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate attendance summary." });
    }
});
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// POST /api/attendance (Manual Attendance Recording by HR / Admin)
exports.attendanceRouter.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        if (!isElevatedAttendanceUser(req)) {
            return res.status(403).json({
                error: "Forbidden: Only HR Administrators can manually record or override attendance.",
                code: "HR_ADMIN_REQUIRED",
            });
        }
        const { employeeId, date, checkIn, checkOut, totalHours, hours, status, notes } = req.body;
        if (!employeeId || !date) {
            return res.status(400).json({ error: "employeeId and date are required." });
        }
        const targetEmployee = await prisma_1.prisma.employee.findFirst({
            where: { id: String(employeeId), tenantId },
            select: { id: true },
        });
        if (!targetEmployee) {
            return res.status(404).json({ error: "Employee not found in this workspace." });
        }
        const attendanceDate = new Date(date);
        attendanceDate.setUTCHours(0, 0, 0, 0);
        await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, attendanceDate);
        const calculatedHours = Number(totalHours ?? hours ?? 0);
        let attendanceStatus = status || "present";
        if (calculatedHours > 0 && calculatedHours < 4 && attendanceStatus === "present") {
            attendanceStatus = "half_day";
        }
        const attendance = await prisma_1.prisma.attendance.upsert({
            where: {
                tenantId_employeeId_date: {
                    tenantId,
                    employeeId,
                    date: attendanceDate,
                },
            },
            create: {
                tenantId,
                employeeId,
                date: attendanceDate,
                checkIn: checkIn ? new Date(checkIn) : null,
                checkOut: checkOut ? new Date(checkOut) : null,
                hours: calculatedHours || null,
                status: attendanceStatus,
                notes: notes || null,
            },
            update: {
                checkIn: checkIn ? new Date(checkIn) : undefined,
                checkOut: checkOut ? new Date(checkOut) : undefined,
                hours: calculatedHours || undefined,
                status: attendanceStatus,
                notes: notes || undefined,
            },
            include: {
                employee: {
                    select: { firstName: true, lastName: true, employeeCode: true },
                },
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "attendance:updated", attendance);
        return res.status(201).json(attendance);
    }
    catch (err) {
        if (err?.code === "PERIOD_LOCKED") {
            return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
        }
        console.error("[POST /api/attendance] error:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/attendance/punch (Unified Mobile Geo-Fenced Punch Engine)
exports.attendanceRouter.post("/punch", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, type = "check_in", latitude, longitude, notes, deviceId } = req.body;
        let targetEmployeeId = employeeId;
        const userRoles = req.user?.roles || [];
        const isPrivileged = userRoles.some((r) => ["super_admin", "admin", "hr_admin", "Workspace Admin"].includes(r));
        const selfEmp = await prisma_1.prisma.employee.findFirst({
            where: { tenantId, userId: req.user.userId },
        });
        if (!isPrivileged) {
            if (!selfEmp) {
                return res.status(400).json({ error: "Employee record not found for current user." });
            }
            if (employeeId && employeeId !== selfEmp.id) {
                return res.status(403).json({ error: "Forbidden: You can only punch attendance for yourself." });
            }
            targetEmployeeId = selfEmp.id;
        }
        else if (!targetEmployeeId) {
            if (!selfEmp) {
                return res.status(400).json({ error: "Employee record not found for current user." });
            }
            targetEmployeeId = selfEmp.id;
        }
        const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
        const result = await attendance_service_1.AttendanceService.recordPunch(tenantId, targetEmployeeId, {
            type: type,
            latitude: latitude !== undefined ? Number(latitude) : undefined,
            longitude: longitude !== undefined ? Number(longitude) : undefined,
            notes,
            deviceId,
            source: "API",
            ipAddress,
        });
        const fullRecord = await prisma_1.prisma.attendance.findUnique({
            where: { id: result.record.id },
            include: { employee: true },
        });
        return res.json({
            success: true,
            action: result.action,
            attendance: fullRecord,
            geoFence: { valid: result.isGeoValid, distanceMeters: 0 },
        });
    }
    catch (err) {
        if (err?.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/attendance/check-in (with Shift Roster auto-grace and late-in calculation)
exports.attendanceRouter.post("/check-in", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, notes, latitude, longitude } = req.body;
        const isPrivileged = isElevatedAttendanceUser(req);
        const selfEmp = await prisma_1.prisma.employee.findFirst({
            where: { tenantId, userId: req.user.userId },
        });
        let targetEmployeeId = employeeId;
        if (!isPrivileged) {
            if (!selfEmp) {
                return res.status(400).json({ error: "Employee record not found for current user." });
            }
            if (employeeId && employeeId !== selfEmp.id) {
                return res.status(403).json({ error: "Forbidden: You can only check in for yourself." });
            }
            targetEmployeeId = selfEmp.id;
        }
        else if (!targetEmployeeId) {
            if (!selfEmp) {
                return res.status(400).json({ error: "Employee record not found for current user." });
            }
            targetEmployeeId = selfEmp.id;
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, today);
        const existing = await prisma_1.prisma.attendance.findUnique({
            where: {
                tenantId_employeeId_date: {
                    tenantId,
                    employeeId: targetEmployeeId,
                    date: today,
                },
            },
        });
        if (existing && existing.checkIn) {
            return res.status(400).json({ error: "Already checked in for today." });
        }
        // Check assigned shift roster for today to detect late arrival
        let status = "present";
        let lateNote = "";
        const roster = await prisma_1.prisma.shiftRoster.findUnique({
            where: {
                tenantId_employeeId_rosterDate: {
                    tenantId,
                    employeeId: targetEmployeeId,
                    rosterDate: today,
                },
            },
            include: { shift: true },
        });
        if (roster && roster.shift && roster.shift.startTime && roster.shift.startTime !== "00:00") {
            const [shH, shM] = roster.shift.startTime.split(":").map(Number);
            const shiftStartTime = new Date(today);
            shiftStartTime.setHours(shH, shM, 0, 0);
            const graceMinutes = 15;
            const graceThreshold = new Date(shiftStartTime.getTime() + graceMinutes * 60 * 1000);
            if (now > graceThreshold) {
                status = "late";
                const diffMinutes = Math.round((now.getTime() - shiftStartTime.getTime()) / (60 * 1000));
                lateNote = `Late In by ${diffMinutes} min(s) [Shift: ${roster.shift.name} ${roster.shift.startTime}]`;
            }
        }
        // Geo-fence check if coordinates passed
        let geoNote = "";
        if (latitude && longitude) {
            const dist = calculateHaversineDistanceMeters(Number(latitude), Number(longitude), 19.0657, 72.8687);
            geoNote = dist <= 500 ? `[Geo-Verified: ${Math.round(dist)}m]` : `[Geo-Warning: ${Math.round(dist)}m]`;
        }
        const combinedNotes = [lateNote, geoNote, notes].filter(Boolean).join(" | ");
        const attendance = await prisma_1.prisma.attendance.upsert({
            where: {
                tenantId_employeeId_date: {
                    tenantId,
                    employeeId: targetEmployeeId,
                    date: today,
                },
            },
            update: {
                checkIn: now,
                status,
                notes: combinedNotes || undefined,
            },
            create: {
                tenantId,
                employeeId: targetEmployeeId,
                date: today,
                checkIn: now,
                status,
                notes: combinedNotes || null,
            },
            include: {
                employee: true,
            },
        });
        // Real-time WebSocket event
        (0, socket_1.broadcastToTenant)(tenantId, "attendance:updated", attendance);
        (0, socket_1.broadcastToTenant)(tenantId, "punch:new", {
            type: "check_in",
            employeeName: `${attendance.employee?.firstName || ""} ${attendance.employee?.lastName || ""}`.trim() || "Staff Member",
            time: now.toLocaleTimeString(),
            status,
            timestamp: now.toISOString(),
        });
        return res.json(attendance);
    }
    catch (err) {
        if (err?.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/attendance/check-out (with hours and half-day threshold calculation)
exports.attendanceRouter.post("/check-out", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, notes } = req.body;
        const isPrivileged = isElevatedAttendanceUser(req);
        const selfEmp = await prisma_1.prisma.employee.findFirst({
            where: { tenantId, userId: req.user.userId },
        });
        let targetEmployeeId = employeeId;
        if (!isPrivileged) {
            if (!selfEmp) {
                return res.status(400).json({ error: "Employee record not found for current user." });
            }
            if (employeeId && employeeId !== selfEmp.id) {
                return res.status(403).json({ error: "Forbidden: You can only check out for yourself." });
            }
            targetEmployeeId = selfEmp.id;
        }
        else if (!targetEmployeeId) {
            if (!selfEmp) {
                return res.status(400).json({ error: "Employee record not found for current user." });
            }
            targetEmployeeId = selfEmp.id;
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, today);
        const existing = await prisma_1.prisma.attendance.findUnique({
            where: {
                tenantId_employeeId_date: {
                    tenantId,
                    employeeId: targetEmployeeId,
                    date: today,
                },
            },
        });
        if (!existing || !existing.checkIn) {
            return res.status(400).json({ error: "Must check in before checking out." });
        }
        // Calculate total hours
        const diffMs = now.getTime() - new Date(existing.checkIn).getTime();
        const totalHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
        // Half-day check (< 4 hours worked)
        let newStatus = existing.status;
        if (totalHours < 4.0 && existing.status !== "late") {
            newStatus = "half_day";
        }
        const attendance = await prisma_1.prisma.attendance.update({
            where: { id: existing.id },
            data: {
                checkOut: now,
                hours: totalHours,
                status: newStatus,
                notes: notes ? `${existing.notes ? existing.notes + " | " : ""}${notes}` : existing.notes,
            },
            include: {
                employee: true,
            },
        });
        // Real-time WebSocket event
        (0, socket_1.broadcastToTenant)(tenantId, "attendance:updated", attendance);
        (0, socket_1.broadcastToTenant)(tenantId, "punch:new", {
            type: "check_out",
            employeeName: `${attendance.employee?.firstName || ""} ${attendance.employee?.lastName || ""}`.trim() || "Staff Member",
            time: now.toLocaleTimeString(),
            hours: totalHours,
            status: newStatus,
            timestamp: now.toISOString(),
        });
        return res.json(attendance);
    }
    catch (err) {
        if (err?.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/attendance/regularize (Employee Attendance Regularization Request)
exports.attendanceRouter.post("/regularize", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, date, checkIn, checkOut, reason } = req.body;
        let targetEmployeeId = employeeId;
        const isAttAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin", "hr_manager", "admin", "Workspace Admin"].includes(r));
        if (!isAttAdmin) {
            const ownEmp = await prisma_1.prisma.employee.findFirst({ where: { tenantId, userId: req.user.userId } });
            if (!ownEmp || (employeeId && employeeId !== ownEmp.id)) {
                return res.status(403).json({ error: "Forbidden: You may only request regularization for yourself." });
            }
            targetEmployeeId = ownEmp.id;
        }
        else if (!targetEmployeeId) {
            const emp = await prisma_1.prisma.employee.findFirst({ where: { tenantId, userId: req.user.userId } });
            if (!emp)
                return res.status(400).json({ error: "Employee record not found." });
            targetEmployeeId = emp.id;
        }
        if (!date)
            return res.status(400).json({ error: "Date is required." });
        const targetDate = new Date(date);
        const d = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
        await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, d);
        const cIn = checkIn ? new Date(`${date}T${checkIn}`) : new Date(`${date}T09:00:00`);
        const cOut = checkOut ? new Date(`${date}T${checkOut}`) : new Date(`${date}T18:00:00`);
        const diffMs = cOut.getTime() - cIn.getTime();
        const hours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
        if (!isAttAdmin) {
            const regRequest = await prisma_1.prisma.attendanceRegularization.create({
                data: {
                    tenantId,
                    employeeId: targetEmployeeId,
                    attendanceDate: d,
                    proposedIn: cIn,
                    proposedOut: cOut,
                    reason: reason || "Attendance regularization request",
                    status: "PENDING",
                },
            });
            return res.status(201).json({
                success: true,
                status: "PENDING",
                message: "Attendance regularization request submitted for approval.",
                regularization: regRequest,
            });
        }
        const record = await prisma_1.prisma.attendance.upsert({
            where: {
                tenantId_employeeId_date: {
                    tenantId,
                    employeeId: targetEmployeeId,
                    date: d,
                },
            },
            create: {
                tenantId,
                employeeId: targetEmployeeId,
                date: d,
                checkIn: cIn,
                checkOut: cOut,
                hours,
                status: "present",
                notes: `[Regularization Request]: ${reason || "Manual attendance adjustment"}`,
            },
            update: {
                checkIn: cIn,
                checkOut: cOut,
                hours,
                status: "present",
                notes: `[Regularized]: ${reason || "Manual attendance adjustment"}`,
            },
            include: { employee: true },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "attendance:updated", record);
        return res.json({ success: true, message: "Attendance regularized successfully.", record });
    }
    catch (err) {
        if (err?.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
        return res.status(500).json({ error: err.message || "Failed to regularize attendance." });
    }
});
// POST /api/attendance/reconcile (Shift Roster vs Punch Auto-Reconciliation Engine)
exports.attendanceRouter.post("/reconcile", auth_1.requireAuth, async (req, res) => {
    const isReconcileAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin", "hr_manager", "admin", "Workspace Admin"].includes(r));
    if (!isReconcileAdmin) {
        return res.status(403).json({ error: "Forbidden: Only HR Administrators can trigger shift reconciliation." });
    }
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { date, startDate, endDate, departmentId } = req.body;
        const start = startDate ? new Date(startDate) : (date ? new Date(date) : new Date(Date.now() - 24 * 3600 * 1000));
        const end = endDate ? new Date(endDate) : (date ? new Date(date) : new Date());
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const empWhere = { tenantId, status: "active" };
        if (departmentId && departmentId !== "all") {
            empWhere.departmentId = String(departmentId);
        }
        const employees = await prisma_1.prisma.employee.findMany({
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
                // 1. Check existing attendance record
                const att = await prisma_1.prisma.attendance.findUnique({
                    where: {
                        tenantId_employeeId_date: {
                            tenantId,
                            employeeId: emp.id,
                            date: targetDate,
                        },
                    },
                });
                // 2. Check approved leave on this date
                const approvedLeave = await prisma_1.prisma.leaveRequest.findFirst({
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
                        await prisma_1.prisma.attendance.upsert({
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
                // 3. Check scheduled shift in ShiftRoster
                const roster = await prisma_1.prisma.shiftRoster.findUnique({
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
                // If employee has a check-in
                if (att && att.checkIn) {
                    if (roster && roster.shift && roster.shift.startTime && roster.shift.startTime !== "00:00") {
                        const [shH, shM] = roster.shift.startTime.split(":").map(Number);
                        const shiftStart = new Date(targetDate);
                        shiftStart.setHours(shH, shM, 0, 0);
                        const graceThreshold = new Date(shiftStart.getTime() + 15 * 60 * 1000);
                        if (new Date(att.checkIn) > graceThreshold && att.status === "present") {
                            await prisma_1.prisma.attendance.update({
                                where: { id: att.id },
                                data: { status: "late", notes: `Auto-reconciled: Checked in past 15-min shift grace period.` },
                            });
                            markedLate++;
                        }
                        else {
                            alreadyPresent++;
                        }
                    }
                    else {
                        alreadyPresent++;
                    }
                    continue;
                }
                // If no check-in, no leave, and was scheduled to work (not weekly off)
                if (!att && !isScheduledOff) {
                    // If the day is in the past, flag as absent
                    const isPastDate = targetDate.getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime();
                    if (isPastDate) {
                        await prisma_1.prisma.attendance.create({
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
        (0, socket_1.broadcastToTenant)(tenantId, "attendance:reconciled", {
            startDate: startDay.toISOString(),
            endDate: endDay.toISOString(),
            totalEvaluated,
            markedAbsent,
            markedOnLeave,
            markedLate,
        });
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
    }
    catch (err) {
        console.error("Attendance reconcile error:", err);
        return res.status(500).json({ error: err.message || "Failed to reconcile attendance." });
    }
});
// GET /api/attendance/daily-report — Daily Operations & Attendance Report
exports.attendanceRouter.get("/daily-report", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { date, status, sort = "desc" } = req.query;
        const d = date ? new Date(String(date)) : new Date();
        const targetDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        const nextDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
        const where = {
            tenantId,
            date: { gte: targetDate, lt: nextDay },
        };
        const isElevated = isElevatedAttendanceUser(req);
        let scopedEmployeeWhere = {};
        if (!isElevated) {
            const selfEmp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user?.userId },
                select: { id: true },
            });
            if (!selfEmp) {
                return res.json({
                    success: true,
                    metrics: { totalPresent: 0, totalAbsent: 0, completedTasks: 0, pendingTasks: 0 },
                    records: [],
                    monthlyTrends: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => ({ month, present: 0, absent: 0 })),
                });
            }
            const directReports = await prisma_1.prisma.employee.findMany({
                where: { tenantId, managerId: selfEmp.id },
                select: { id: true },
            });
            const allowedIds = [selfEmp.id, ...directReports.map((r) => r.id)];
            scopedEmployeeWhere = { employeeId: { in: allowedIds } };
            where.employeeId = { in: allowedIds };
        }
        if (status && status !== "all") {
            where.status = String(status);
        }
        const currentYear = targetDate.getUTCFullYear();
        const yearStart = new Date(Date.UTC(currentYear, 0, 1));
        const yearEnd = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
        const [attendanceList, totalPresent, totalAbsent, completedTasks, pendingTasks, yearRecords] = await Promise.all([
            prisma_1.prisma.attendance.findMany({
                where,
                orderBy: { date: sort === "asc" ? "asc" : "desc" },
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            position: true,
                            email: true,
                            department: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            prisma_1.prisma.attendance.count({
                where: {
                    tenantId,
                    ...scopedEmployeeWhere,
                    date: { gte: targetDate, lt: nextDay },
                    status: "present",
                },
            }),
            prisma_1.prisma.attendance.count({
                where: {
                    tenantId,
                    ...scopedEmployeeWhere,
                    date: { gte: targetDate, lt: nextDay },
                    status: "absent",
                },
            }),
            prisma_1.prisma.projectTask.count({
                where: {
                    project: { tenantId },
                    status: "completed",
                },
            }),
            prisma_1.prisma.projectTask.count({
                where: {
                    project: { tenantId },
                    status: { not: "completed" },
                },
            }),
            prisma_1.prisma.attendance.findMany({
                where: {
                    tenantId,
                    ...scopedEmployeeWhere,
                    date: { gte: yearStart, lte: yearEnd },
                    status: { in: ["present", "late", "absent"] },
                },
                select: { date: true, status: true },
            }),
        ]);
        // Format records for table (strictly dynamic, zero fake fallback employees)
        const records = attendanceList.map((a) => ({
            id: a.id,
            name: `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.trim() || "Employee",
            email: a.employee?.email || "",
            department: a.employee?.department?.name || "Operations",
            position: a.employee?.position || "Staff",
            date: a.date.toISOString(),
            checkIn: a.checkIn?.toISOString() || null,
            checkOut: a.checkOut?.toISOString() || null,
            status: a.status,
            hours: a.hours ? Number(a.hours) : 0,
        }));
        // Dynamic 12-month trends computed from actual tenant attendance records
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const presentByMonth = new Array(12).fill(0);
        const absentByMonth = new Array(12).fill(0);
        for (const r of yearRecords) {
            const mIdx = new Date(r.date).getUTCMonth();
            if (r.status === "absent")
                absentByMonth[mIdx]++;
            else
                presentByMonth[mIdx]++;
        }
        const monthlyTrends = months.map((m, idx) => ({
            month: m,
            present: presentByMonth[idx],
            absent: absentByMonth[idx],
        }));
        return res.json({
            success: true,
            metrics: {
                totalPresent,
                totalAbsent,
                completedTasks,
                pendingTasks,
            },
            records,
            monthlyTrends,
        });
    }
    catch (err) {
        console.error("Daily report GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch daily report" });
    }
});
