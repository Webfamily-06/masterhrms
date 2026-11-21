"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamWorkloadService = void 0;
const prisma_1 = require("../prisma");
const db = prisma_1.rawPrisma || prisma_1.prisma;
class TeamWorkloadService {
    /**
     * Get team workload summary aggregating project tasks and timesheets
     */
    static async getWorkloadSummary(tenantId, options) {
        const empWhere = { tenantId, status: "active" };
        if (options?.departmentId) {
            empWhere.departmentId = options.departmentId;
        }
        const employees = await db.employee.findMany({
            where: empWhere,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { name: true } },
            },
        });
        const [tasks, timesheets] = await Promise.all([
            db.projectTask.findMany({
                where: { tenantId },
                select: { id: true, assignedTo: true, status: true },
            }),
            db.timesheet.findMany({
                where: {
                    tenantId,
                    ...(options?.startDate || options?.endDate
                        ? {
                            date: {
                                gte: options.startDate,
                                lte: options.endDate,
                            },
                        }
                        : {}),
                },
                select: { id: true, employeeId: true, hours: true },
            }),
        ]);
        const taskMap = new Map();
        for (const t of tasks) {
            if (!t.assignedTo)
                continue;
            const cur = taskMap.get(t.assignedTo) || { total: 0, open: 0, completed: 0 };
            cur.total += 1;
            if (t.status === "completed" || t.status === "done") {
                cur.completed += 1;
            }
            else {
                cur.open += 1;
            }
            taskMap.set(t.assignedTo, cur);
        }
        const timesheetMap = new Map();
        for (const ts of timesheets) {
            const cur = timesheetMap.get(ts.employeeId) || 0;
            timesheetMap.set(ts.employeeId, cur + Number(ts.hours));
        }
        const workloads = employees.map((emp) => {
            const taskStats = taskMap.get(emp.id) || { total: 0, open: 0, completed: 0 };
            const loggedHours = Math.round((timesheetMap.get(emp.id) || 0) * 100) / 100;
            const standardCapacityHours = 40.0;
            const utilizationRate = Math.round((loggedHours / standardCapacityHours) * 100);
            const isOverAllocated = loggedHours > 40.0 || taskStats.total > 8;
            return {
                employeeId: emp.id,
                employeeCode: emp.employeeCode,
                employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
                department: emp.department?.name || null,
                assignedTasksCount: taskStats.total,
                openTasksCount: taskStats.open,
                completedTasksCount: taskStats.completed,
                loggedHours,
                standardCapacityHours,
                utilizationRate,
                isOverAllocated,
            };
        });
        const totalEmployees = workloads.length;
        const totalAssignedTasks = workloads.reduce((sum, w) => sum + w.assignedTasksCount, 0);
        const totalLoggedHours = Math.round(workloads.reduce((sum, w) => sum + w.loggedHours, 0) * 100) / 100;
        const overAllocatedCount = workloads.filter((w) => w.isOverAllocated).length;
        const averageUtilizationRate = totalEmployees > 0
            ? Math.round(workloads.reduce((sum, w) => sum + w.utilizationRate, 0) / totalEmployees)
            : 0;
        return {
            tenantId,
            totalEmployees,
            totalAssignedTasks,
            totalLoggedHours,
            overAllocatedCount,
            averageUtilizationRate,
            workloads,
        };
    }
    /**
     * Get specific employee workload detail
     */
    static async getEmployeeWorkload(tenantId, employeeId) {
        const summary = await this.getWorkloadSummary(tenantId);
        return summary.workloads.find((w) => w.employeeId === employeeId) || null;
    }
}
exports.TeamWorkloadService = TeamWorkloadService;
