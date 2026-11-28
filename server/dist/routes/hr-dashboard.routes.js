"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrDashboardRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenant_context_middleware_js_1 = require("../middleware/tenant-context.middleware.js");
const hr_rbac_middleware_js_1 = require("../middleware/hr-rbac.middleware.js");
const prisma_js_1 = require("../prisma.js");
exports.hrDashboardRouter = (0, express_1.Router)();
// DEFECT-041: Protect company-wide HR dashboard analytics (payroll totals, all-employee attendance/leaves) from standard employee access
exports.hrDashboardRouter.use(auth_js_1.requireAuth, tenant_context_middleware_js_1.resolveTenantContext, (0, hr_rbac_middleware_js_1.requireHrOrAdmin)({
    allowedPermissions: ["hrm.dashboard", "hrm.analytics", "hrm.view"],
    deniedMessage: "Access denied: HR Administrator or Manager privileges are required to view the company-wide HR dashboard.",
}));
exports.hrDashboardRouter.get("/", auth_js_1.requireAuth, async (req, res) => {
    const db = prisma_js_1.rawPrisma || prisma_js_1.prisma;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required." });
    }
    try {
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const fiveDaysAgo = new Date(today.getTime() - 4 * 86400000);
        const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        const [employees, departments, recentAttendance, leaveRequests, jobPostings, trainingCourses, payrollRuns, upcomingHolidays, upcomingMeetings,] = await Promise.all([
            db.employee.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeCode: true,
                    status: true,
                    employmentType: true,
                    departmentId: true,
                    joinedAt: true,
                    position: true,
                    department: { select: { id: true, name: true } },
                    designation: { select: { id: true, name: true } },
                },
            }),
            db.department.findMany({
                where: { tenantId },
                select: { id: true, name: true },
            }),
            db.attendance.findMany({
                where: { tenantId, date: { gte: fiveDaysAgo, lte: today } },
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            department: { select: { name: true } },
                        },
                    },
                },
                orderBy: { date: "desc" },
            }),
            db.leaveRequest.findMany({
                where: { tenantId, createdAt: { gte: startOfYear } },
                include: {
                    employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                    leaveType: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 100,
            }),
            db.jobPosting.findMany({
                where: { tenantId },
                select: { id: true, title: true, status: true, createdAt: true },
            }),
            db.trainingCourse.findMany({
                where: { tenantId },
                select: { id: true, title: true, status: true },
            }),
            db.payrollRun.findMany({
                where: { tenantId },
                orderBy: { createdAt: "desc" },
                take: 6,
            }),
            db.holiday.findMany({
                where: { tenantId, status: "active", date: { gte: today } },
                orderBy: { date: "asc" },
                take: 5,
            }),
            db.meeting.findMany({
                where: { tenantId, startTime: { gte: today } },
                include: { room: { select: { name: true } } },
                orderBy: { startTime: "asc" },
                take: 5,
            }),
        ]);
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter((e) => String(e.status) === "active").length;
        const onLeaveEmployees = employees.filter((e) => String(e.status) === "on_leave").length;
        const terminatedEmployees = employees.filter((e) => String(e.status) === "terminated").length;
        const byEmploymentType = {
            full_time: employees.filter((e) => String(e.employmentType) === "full_time").length,
            part_time: employees.filter((e) => String(e.employmentType) === "part_time").length,
            contract: employees.filter((e) => String(e.employmentType) === "contract").length,
            intern: employees.filter((e) => String(e.employmentType) === "intern").length,
        };
        // Department distribution
        const deptCounts = new Map();
        for (const d of departments)
            deptCounts.set(d.name, 0);
        for (const e of employees) {
            const name = e.department?.name || "Unassigned";
            deptCounts.set(name, (deptCounts.get(name) || 0) + 1);
        }
        const departmentDistribution = Array.from(deptCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
        // Attendance last 5 days trend + late arrivals today
        const dayLabels = [];
        const presentSeries = [];
        const absentSeries = [];
        const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
        for (let i = 4; i >= 0; i--) {
            const d = new Date(today.getTime() - i * 86400000);
            const ymd = d.toISOString().slice(0, 10);
            dayLabels.push(dayFormatter.format(d));
            const dayRows = recentAttendance.filter((a) => new Date(a.date).toISOString().slice(0, 10) === ymd);
            const presentCnt = dayRows.filter((a) => String(a.status).toLowerCase() !== "absent").length;
            const absentCnt = Math.max(0, activeEmployees - presentCnt);
            presentSeries.push(presentCnt);
            absentSeries.push(absentCnt);
        }
        const todayYmd = today.toISOString().slice(0, 10);
        const todayAttendanceRows = recentAttendance.filter((a) => new Date(a.date).toISOString().slice(0, 10) === todayYmd);
        const presentToday = todayAttendanceRows.filter((a) => String(a.status).toLowerCase() !== "absent").length;
        const lateArrivalsToday = todayAttendanceRows
            .filter((a) => String(a.status).toLowerCase() === "late" || Number(a.lateMinutes || 0) > 0)
            .slice(0, 6)
            .map((a) => ({
            id: a.id,
            employeeName: `${a.employee.firstName} ${a.employee.lastName}`.trim(),
            employeeCode: a.employee.employeeCode,
            department: a.employee.department?.name || "General",
            checkIn: a.checkIn,
            lateMinutes: Number(a.lateMinutes || 0),
        }));
        // Leave stats & pending approvals
        const pendingLeaveApprovals = leaveRequests
            .filter((lr) => String(lr.status).toLowerCase() === "pending")
            .slice(0, 6)
            .map((lr) => ({
            id: lr.id,
            employeeName: `${lr.employee.firstName} ${lr.employee.lastName}`.trim(),
            employeeCode: lr.employee.employeeCode,
            leaveType: lr.leaveType?.name || "Leave",
            startDate: lr.startDate,
            endDate: lr.endDate,
            days: Number(lr.days || 1),
            status: lr.status,
        }));
        const leaveTypeMap = new Map();
        for (const lr of leaveRequests) {
            const name = lr.leaveType?.name || "Other";
            leaveTypeMap.set(name, (leaveTypeMap.get(name) || 0) + 1);
        }
        const leaveDistribution = Array.from(leaveTypeMap.entries()).map(([name, count]) => ({
            name,
            count,
        }));
        // Recruitment stats
        const openJobs = jobPostings.filter((j) => ["published", "open", "active"].includes(String(j.status || "").toLowerCase())).length;
        // Training stats
        const activeCourses = trainingCourses.filter((c) => String(c.status || "active").toLowerCase() === "active").length;
        // Payroll stats
        const latestRun = payrollRuns[0];
        const totalNetPayroll = Number(latestRun?.totalNet ?? latestRun?.totalAmount ?? 0);
        const totalDeductions = Number(latestRun?.totalDeductions ?? 0);
        return res.json({
            success: true,
            data: {
                headcount: {
                    total: totalEmployees,
                    active: activeEmployees,
                    onLeave: onLeaveEmployees,
                    terminated: terminatedEmployees,
                    presentToday,
                    byEmploymentType,
                },
                departmentDistribution,
                attendanceTrend: {
                    labels: dayLabels,
                    present: presentSeries,
                    absent: absentSeries,
                },
                lateArrivalsToday,
                leaveSummary: {
                    totalRequests: leaveRequests.length,
                    pendingCount: pendingLeaveApprovals.length,
                    approvedCount: leaveRequests.filter((l) => String(l.status).toLowerCase() === "approved").length,
                    distribution: leaveDistribution,
                },
                pendingApprovals: pendingLeaveApprovals,
                recruitment: {
                    totalJobs: jobPostings.length,
                    openJobs,
                },
                training: {
                    totalCourses: trainingCourses.length,
                    activeCourses,
                },
                payroll: {
                    latestNet: totalNetPayroll,
                    latestDeductions: totalDeductions,
                    runsCount: payrollRuns.length,
                    history: payrollRuns
                        .slice()
                        .reverse()
                        .map((r) => Number(r.totalNet ?? r.totalAmount ?? 0)),
                },
                upcomingHolidays,
                upcomingMeetings: upcomingMeetings.map((m) => ({
                    id: m.id,
                    title: m.title,
                    startTime: m.startTime,
                    roomName: m.room?.name || "Online",
                    status: m.status,
                })),
            },
        });
    }
    catch (err) {
        console.error("[GET /api/hr/dashboard] Error:", err);
        return res.status(500).json({ error: "Failed to load HR dashboard telemetry." });
    }
});
