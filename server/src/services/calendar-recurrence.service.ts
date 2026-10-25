import { CalendarEvent, CalendarEventShare, CalendarEventReminder } from "@prisma/client";

export interface ParsedRecurrenceRule {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  byDays?: string[]; // e.g. ["MO", "WE", "FR"]
  count?: number;
  until?: Date;
}

export interface ExpandedOccurrence {
  id: string;
  isRecurringInstance: boolean;
  recurringSeriesId: string;
  originalStartTime: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean;
  category: string;
  location?: string | null;
  meetingLink?: string | null;
  status: string;
  visibility: string;
  timezone: string;
  cancelledAt?: string | null;
  cancelledById?: string | null;
  roomId?: string | null;
  shares?: any[];
  reminders?: any[];
}

const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export class CalendarRecurrenceService {
  /**
   * Parse an RRULE-compatible string like:
   * "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR;COUNT=10"
   * or "FREQ=MONTHLY;INTERVAL=1;UNTIL=2026-12-31T23:59:59Z"
   */
  public static parseRule(ruleStr: string): ParsedRecurrenceRule | null {
    if (!ruleStr || typeof ruleStr !== "string") return null;

    const parts = ruleStr.split(";").map((p) => p.trim());
    let frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" = "DAILY";
    let interval = 1;
    let byDays: string[] | undefined;
    let count: number | undefined;
    let until: Date | undefined;

    for (const part of parts) {
      const [key, value] = part.split("=").map((s) => s?.trim());
      if (!key || !value) continue;

      switch (key.toUpperCase()) {
        case "FREQ":
          if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(value.toUpperCase())) {
            frequency = value.toUpperCase() as any;
          }
          break;
        case "INTERVAL":
          const parsedInterval = parseInt(value, 10);
          if (!isNaN(parsedInterval) && parsedInterval > 0) {
            interval = Math.min(parsedInterval, 365);
          }
          break;
        case "BYDAY":
          byDays = value
            .split(",")
            .map((d) => d.trim().toUpperCase())
            .filter((d) => DAY_MAP[d] !== undefined);
          break;
        case "COUNT":
          const parsedCount = parseInt(value, 10);
          if (!isNaN(parsedCount) && parsedCount > 0) {
            count = Math.min(parsedCount, 500); // Guard limit
          }
          break;
        case "UNTIL":
          const parsedUntil = new Date(value);
          if (!isNaN(parsedUntil.getTime())) {
            until = parsedUntil;
          }
          break;
      }
    }

    return { frequency, interval, byDays, count, until };
  }

  /**
   * Builds an RRULE string from structured input
   */
  public static buildRule(params: {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    interval?: number;
    byDays?: string[];
    count?: number;
    until?: string | Date;
  }): string {
    const parts: string[] = [`FREQ=${params.frequency.toUpperCase()}`];
    const interval = params.interval && params.interval > 0 ? params.interval : 1;
    if (interval > 1) {
      parts.push(`INTERVAL=${interval}`);
    }
    if (params.byDays && params.byDays.length > 0) {
      parts.push(`BYDAY=${params.byDays.join(",")}`);
    }
    if (params.count && params.count > 0) {
      parts.push(`COUNT=${params.count}`);
    }
    if (params.until) {
      const untilDate = typeof params.until === "string" ? new Date(params.until) : params.until;
      if (!isNaN(untilDate.getTime())) {
        parts.push(`UNTIL=${untilDate.toISOString()}`);
      }
    }
    return parts.join(";");
  }

  /**
   * Previews upcoming occurrences for a given rule before saving
   */
  public static previewOccurrences(
    startDateOrParams: Date | {
      startDate: Date;
      endDate?: Date;
      recurrenceRule?: string;
      recurrenceEndType?: string;
      recurrenceCount?: number;
      recurrenceUntil?: Date;
      count?: number;
    },
    endDate?: Date,
    ruleStr?: string,
    maxLimit: number = 20
  ): { startDate: string; endDate: string }[] {
    let start: Date;
    let end: Date;
    let ruleString: string;
    let limit: number;

    if (startDateOrParams instanceof Date) {
      start = startDateOrParams;
      end = endDate || new Date(start.getTime() + 3600000);
      ruleString = ruleStr || "";
      limit = maxLimit;
    } else {
      start = startDateOrParams.startDate;
      end = startDateOrParams.endDate || new Date(start.getTime() + 3600000);
      ruleString = startDateOrParams.recurrenceRule || "";
      limit = startDateOrParams.count || 20;
    }

    const rule = this.parseRule(ruleString);
    if (!rule) return [{ startDate: start.toISOString(), endDate: end.toISOString() }];

    const durationMs = Math.max(0, end.getTime() - start.getTime());
    const results: { startDate: string; endDate: string }[] = [];

    let effectiveCount = limit;
    if (typeof startDateOrParams === "object" && !(startDateOrParams instanceof Date)) {
      if (startDateOrParams.recurrenceCount && startDateOrParams.recurrenceCount > 0) {
        effectiveCount = Math.min(effectiveCount, startDateOrParams.recurrenceCount);
      }
    }
    if (rule.count && rule.count > 0) {
      effectiveCount = Math.min(effectiveCount, rule.count);
    }

    const previewHorizonDays = (rule.frequency === "YEARLY" || (rule.count && rule.count > 0)) ? 3652 : 730;
    let effectiveUntil = new Date(start.getTime() + previewHorizonDays * 24 * 60 * 60 * 1000);
    if (typeof startDateOrParams === "object" && !(startDateOrParams instanceof Date)) {
      if (startDateOrParams.recurrenceUntil && startDateOrParams.recurrenceUntil.getTime() < effectiveUntil.getTime()) {
        effectiveUntil = startDateOrParams.recurrenceUntil;
      }
    }
    if (rule.until && rule.until.getTime() < effectiveUntil.getTime()) {
      effectiveUntil = rule.until;
    }

    const occurrences = this.calculateDates(start, effectiveUntil, rule, effectiveCount);

    for (const occStart of occurrences) {
      const occEnd = new Date(occStart.getTime() + durationMs);
      results.push({
        startDate: occStart.toISOString(),
        endDate: occEnd.toISOString(),
      });
    }

    return results;
  }

  /**
   * Generates occurrences for a recurring event series within the requested window,
   * applying any exception records (modified/cancelled single occurrences).
   */
  public static expandSeries(
    seriesEvent: any,
    windowStart: Date,
    windowEnd: Date,
    exceptions: any[] = []
  ): ExpandedOccurrence[] {
    if (!seriesEvent.recurrenceRule) return [];

    const rule = this.parseRule(seriesEvent.recurrenceRule);
    if (!rule) return [];

    const durationMs = Math.max(0, new Date(seriesEvent.endDate).getTime() - new Date(seriesEvent.startDate).getTime());
    const seriesStart = new Date(seriesEvent.startDate);

    // Build map of exceptions keyed by originalStartTime ISO string
    const exceptionMap = new Map<string, any>();
    for (const exc of exceptions) {
      if (exc.originalStartTime) {
        exceptionMap.set(new Date(exc.originalStartTime).toISOString(), exc);
      }
    }

    // Determine effective end bound: minimum of windowEnd, seriesEvent.recurrenceUntil, and rule.until
    let effectiveUntil = windowEnd;
    if (seriesEvent.recurrenceUntil) {
      const rUntil = new Date(seriesEvent.recurrenceUntil);
      if (rUntil.getTime() < effectiveUntil.getTime()) effectiveUntil = rUntil;
    }
    if (rule.until && rule.until.getTime() < effectiveUntil.getTime()) {
      effectiveUntil = rule.until;
    }

    const maxCount = rule.count || seriesEvent.recurrenceCount || 200;
    const generatedDates = this.calculateDates(seriesStart, effectiveUntil, rule, maxCount);

    const occurrences: ExpandedOccurrence[] = [];

    for (const occStart of generatedDates) {
      const occKey = occStart.toISOString();
      const occEnd = new Date(occStart.getTime() + durationMs);

      // Check if this occurrence falls within the requested query window
      if (occEnd < windowStart || occStart > windowEnd) {
        continue;
      }

      // If an exception exists for this occurrence, apply it
      if (exceptionMap.has(occKey)) {
        const exc = exceptionMap.get(occKey);
        // If exception is cancelled, we still return it with status="cancelled" so UI/audit can reflect it
        occurrences.push({
          id: exc.id,
          isRecurringInstance: true,
          recurringSeriesId: seriesEvent.id,
          originalStartTime: occKey,
          title: exc.title || seriesEvent.title,
          description: exc.description !== undefined ? exc.description : seriesEvent.description,
          startDate: exc.startDate ? new Date(exc.startDate).toISOString() : occStart.toISOString(),
          endDate: exc.endDate ? new Date(exc.endDate).toISOString() : occEnd.toISOString(),
          allDay: exc.allDay !== undefined ? exc.allDay : seriesEvent.allDay,
          category: exc.category || seriesEvent.category,
          location: exc.location !== undefined ? exc.location : seriesEvent.location,
          meetingLink: exc.meetingLink !== undefined ? exc.meetingLink : seriesEvent.meetingLink,
          status: exc.status || "confirmed",
          visibility: exc.visibility || seriesEvent.visibility,
          timezone: exc.timezone || seriesEvent.timezone,
          cancelledAt: exc.cancelledAt ? new Date(exc.cancelledAt).toISOString() : null,
          cancelledById: exc.cancelledById || null,
          roomId: exc.roomId !== undefined ? exc.roomId : seriesEvent.roomId,
          shares: exc.shares && exc.shares.length > 0 ? exc.shares : seriesEvent.shares,
          reminders: exc.reminders && exc.reminders.length > 0 ? exc.reminders : seriesEvent.reminders,
        });
      } else {
        // Normal occurrence derived from series root
        occurrences.push({
          id: `rec-${seriesEvent.id}-${occStart.getTime()}`,
          isRecurringInstance: true,
          recurringSeriesId: seriesEvent.id,
          originalStartTime: occKey,
          title: seriesEvent.title,
          description: seriesEvent.description,
          startDate: occStart.toISOString(),
          endDate: occEnd.toISOString(),
          allDay: seriesEvent.allDay,
          category: seriesEvent.category,
          location: seriesEvent.location,
          meetingLink: seriesEvent.meetingLink,
          status: seriesEvent.status,
          visibility: seriesEvent.visibility,
          timezone: seriesEvent.timezone,
          cancelledAt: seriesEvent.cancelledAt ? new Date(seriesEvent.cancelledAt).toISOString() : null,
          cancelledById: seriesEvent.cancelledById,
          roomId: seriesEvent.roomId,
          shares: seriesEvent.shares,
          reminders: seriesEvent.reminders,
        });
      }
    }

    return occurrences;
  }

  /**
   * Internal algorithm to compute occurrence start timestamps according to recurrence frequency
   */
  private static calculateDates(
    startDate: Date,
    untilDate: Date,
    rule: ParsedRecurrenceRule,
    maxCount: number
  ): Date[] {
    const dates: Date[] = [];
    let current = new Date(startDate.getTime());
    const interval = Math.max(1, rule.interval);

    // DAILY
    if (rule.frequency === "DAILY") {
      while (current <= untilDate && dates.length < maxCount) {
        dates.push(new Date(current.getTime()));
        current.setDate(current.getDate() + interval);
        current.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), startDate.getMilliseconds());
      }
      return dates;
    }

    // WEEKLY
    if (rule.frequency === "WEEKLY") {
      const byDays = rule.byDays && rule.byDays.length > 0 ? rule.byDays.map((d) => DAY_MAP[d]) : [startDate.getDay()];

      let weekCursor = new Date(current.getTime());
      // Rewind to Sunday of the start week
      weekCursor.setDate(weekCursor.getDate() - weekCursor.getDay());

      while (weekCursor <= untilDate && dates.length < maxCount) {
        for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
          if (byDays.includes(dayOfWeek)) {
            const candidate = new Date(weekCursor.getTime());
            candidate.setDate(candidate.getDate() + dayOfWeek);
            candidate.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), startDate.getMilliseconds());

            if (candidate >= startDate && candidate <= untilDate) {
              dates.push(candidate);
              if (dates.length >= maxCount) break;
            }
          }
        }
        weekCursor.setDate(weekCursor.getDate() + 7 * interval);
      }
      return dates;
    }

    // MONTHLY
    if (rule.frequency === "MONTHLY") {
      const originalDay = startDate.getDate();
      while (current <= untilDate && dates.length < maxCount) {
        dates.push(new Date(current.getTime()));

        // Advance by interval months, preserving original date of month where possible
        const nextMonth = current.getMonth() + interval;
        const candidate = new Date(current.getTime());
        candidate.setMonth(nextMonth, 1);
        const daysInMonth = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
        candidate.setDate(Math.min(originalDay, daysInMonth));
        candidate.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), startDate.getMilliseconds());
        current = candidate;
      }
      return dates;
    }

    // YEARLY
    if (rule.frequency === "YEARLY") {
      const originalMonth = startDate.getMonth();
      const originalDay = startDate.getDate();

      while (current <= untilDate && dates.length < maxCount) {
        dates.push(new Date(current.getTime()));

        const nextYear = current.getFullYear() + interval;
        const candidate = new Date(current.getTime());
        candidate.setFullYear(nextYear, originalMonth, 1);
        const daysInMonth = new Date(nextYear, originalMonth + 1, 0).getDate();
        candidate.setDate(Math.min(originalDay, daysInMonth));
        candidate.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), startDate.getMilliseconds());
        current = candidate;
      }
      return dates;
    }

    return dates;
  }
}
