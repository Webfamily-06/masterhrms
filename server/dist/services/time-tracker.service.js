"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeTrackerService = void 0;
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class TimeTrackerService {
    static async getTimers(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "time_tracker", key: "active_timers" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveTimers(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "time_tracker", key: "active_timers" },
        });
        if (existing) {
            await db.setting.update({
                where: { id: existing.id },
                data: { valueJson: { items }, version: { increment: 1 } },
            });
        }
        else {
            await db.setting.create({
                data: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "time_tracker",
                    key: "active_timers",
                    valueType: "JSON",
                    valueJson: { items },
                    version: 1,
                },
            });
        }
    }
    /**
     * Get active running timer for an employee
     */
    static async getActiveTimer(tenantId, employeeId) {
        const timers = await this.getTimers(tenantId);
        const timer = timers.find((t) => t.employeeId === employeeId);
        if (!timer)
            return null;
        const start = new Date(timer.startTime).getTime();
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
        const elapsedHours = Math.round((elapsedSeconds / 3600) * 100) / 100;
        return {
            ...timer,
            elapsedSeconds,
            elapsedHours,
        };
    }
    /**
     * Start a new timer for an employee
     */
    static async startTimer(tenantId, userId, employeeId, data) {
        let timers = await this.getTimers(tenantId);
        // Discard previous active timer if any
        timers = timers.filter((t) => t.employeeId !== employeeId);
        const now = new Date().toISOString();
        const newTimer = {
            id: `timer_${Date.now()}_${crypto_1.default.randomBytes(3).toString("hex")}`,
            tenantId,
            userId,
            employeeId,
            projectId: data.projectId || null,
            taskId: data.taskId || null,
            description: data.description || "Active Tracking Session",
            startTime: now,
            status: "RUNNING",
        };
        timers.push(newTimer);
        await this.saveTimers(tenantId, timers);
        return {
            ...newTimer,
            elapsedSeconds: 0,
            elapsedHours: 0,
        };
    }
    /**
     * Stop timer and automatically commit formal Timesheet entry in PostgreSQL
     */
    static async stopTimer(tenantId, employeeId, options) {
        const timers = await this.getTimers(tenantId);
        const timerIndex = timers.findIndex((t) => t.employeeId === employeeId);
        if (timerIndex === -1) {
            throw new Error("No active timer found for employee.");
        }
        const timer = timers[timerIndex];
        const start = new Date(timer.startTime).getTime();
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
        // Calculate hours, minimum 0.1 hr (6 mins) for real work recording
        const durationHours = Math.max(0.1, Math.round((elapsedSeconds / 3600) * 100) / 100);
        // Commit to PostgreSQL Timesheet
        const timesheet = await db.timesheet.create({
            data: {
                tenantId,
                employeeId,
                projectId: timer.projectId || null,
                taskId: timer.taskId || null,
                date: new Date(),
                hours: new client_1.Prisma.Decimal(durationHours),
                description: options?.description || timer.description,
                status: "pending",
                reviewNotes: options?.reviewNotes || "Auto-logged via Time Tracker",
            },
        });
        // Remove timer from active timers
        timers.splice(timerIndex, 1);
        await this.saveTimers(tenantId, timers);
        return {
            timer,
            timesheet,
            durationHours,
        };
    }
    /**
     * Discard timer without saving timesheet
     */
    static async discardTimer(tenantId, employeeId) {
        let timers = await this.getTimers(tenantId);
        const countBefore = timers.length;
        timers = timers.filter((t) => t.employeeId !== employeeId);
        if (timers.length === countBefore) {
            throw new Error("No active timer found to discard.");
        }
        await this.saveTimers(tenantId, timers);
        return true;
    }
}
exports.TimeTrackerService = TimeTrackerService;
