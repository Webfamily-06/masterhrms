import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export interface ActiveTimer {
  id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  projectId?: string | null;
  taskId?: string | null;
  description: string;
  startTime: string; // ISO string
  status: "RUNNING" | "PAUSED";
}

export interface ActiveTimerResult extends ActiveTimer {
  elapsedSeconds: number;
  elapsedHours: number;
}

export class TimeTrackerService {
  private static async getTimers(tenantId: string): Promise<ActiveTimer[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "time_tracker", key: "active_timers" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveTimers(tenantId: string, items: ActiveTimer[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "time_tracker", key: "active_timers" },
    });
    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { valueJson: { items } as any, version: { increment: 1 } },
      });
    } else {
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "time_tracker",
          key: "active_timers",
          valueType: "JSON",
          valueJson: { items } as any,
          version: 1,
        },
      });
    }
  }

  /**
   * Get active running timer for an employee
   */
  static async getActiveTimer(tenantId: string, employeeId: string): Promise<ActiveTimerResult | null> {
    const timers = await this.getTimers(tenantId);
    const timer = timers.find((t) => t.employeeId === employeeId);
    if (!timer) return null;

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
  static async startTimer(
    tenantId: string,
    userId: string,
    employeeId: string,
    data: {
      projectId?: string | null;
      taskId?: string | null;
      description?: string;
    }
  ): Promise<ActiveTimerResult> {
    let timers = await this.getTimers(tenantId);

    // Discard previous active timer if any
    timers = timers.filter((t) => t.employeeId !== employeeId);

    const now = new Date().toISOString();
    const newTimer: ActiveTimer = {
      id: `timer_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
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
  static async stopTimer(
    tenantId: string,
    employeeId: string,
    options?: {
      description?: string;
      reviewNotes?: string;
    }
  ): Promise<{ timer: ActiveTimer; timesheet: any; durationHours: number }> {
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
        hours: new Prisma.Decimal(durationHours),
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
  static async discardTimer(tenantId: string, employeeId: string): Promise<boolean> {
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
