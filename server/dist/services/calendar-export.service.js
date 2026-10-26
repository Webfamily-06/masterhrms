"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarExportService = void 0;
class CalendarExportService {
    /**
     * Formats a Date object to RFC 5545 iCalendar UTC date-time string: YYYYMMDDTHHMMSSZ
     */
    static formatDateTimeUtc(date) {
        const pad = (n) => String(n).padStart(2, "0");
        return (date.getUTCFullYear() +
            pad(date.getUTCMonth() + 1) +
            pad(date.getUTCDate()) +
            "T" +
            pad(date.getUTCHours()) +
            pad(date.getUTCMinutes()) +
            pad(date.getUTCSeconds()) +
            "Z");
    }
    /**
     * Formats a Date object to RFC 5545 date string for all-day events: YYYYMMDD
     */
    static formatDateOnly(date) {
        const pad = (n) => String(n).padStart(2, "0");
        return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate());
    }
    /**
     * Escapes special characters according to RFC 5545 section 3.3.11
     */
    static escapeText(text) {
        if (!text)
            return "";
        return text
            .replace(/\\/g, "\\\\")
            .replace(/;/g, "\\;")
            .replace(/,/g, "\\,")
            .replace(/\r\n|\n|\r/g, "\\n");
    }
    /**
     * Generates a complete RFC 5545 iCalendar (.ics) string for a list of events
     */
    static generateIcs(events, calendarTitleOrOptions = "MasterHRMS Calendar") {
        const calendarTitle = typeof calendarTitleOrOptions === "string"
            ? calendarTitleOrOptions
            : calendarTitleOrOptions?.calendarName || "MasterHRMS Calendar";
        const nowUtc = this.formatDateTimeUtc(new Date());
        const lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//MasterHRMS//SaaS Calendar 2.0//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            `X-WR-CALNAME:${this.escapeText(calendarTitle)}`,
            "X-WR-TIMEZONE:Asia/Kolkata",
        ];
        for (const ev of events) {
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime()))
                continue;
            lines.push("BEGIN:VEVENT");
            lines.push(`UID:${ev.id}@masterhrms.com`);
            lines.push(`DTSTAMP:${nowUtc}`);
            if (ev.allDay) {
                lines.push(`DTSTART;VALUE=DATE:${this.formatDateOnly(start)}`);
                // For iCal all-day events, DTEND is exclusive (next day)
                const nextDay = new Date(end.getTime() + 86400000);
                lines.push(`DTEND;VALUE=DATE:${this.formatDateOnly(nextDay)}`);
            }
            else {
                lines.push(`DTSTART:${this.formatDateTimeUtc(start)}`);
                lines.push(`DTEND:${this.formatDateTimeUtc(end)}`);
            }
            lines.push(`SUMMARY:${this.escapeText(ev.title)}`);
            if (ev.description) {
                lines.push(`DESCRIPTION:${this.escapeText(ev.description)}`);
            }
            if (ev.location) {
                lines.push(`LOCATION:${this.escapeText(ev.location)}`);
            }
            if (ev.meetingLink) {
                lines.push(`URL:${ev.meetingLink}`);
            }
            if (ev.status === "cancelled") {
                lines.push("STATUS:CANCELLED");
            }
            else if (ev.status === "tentative") {
                lines.push("STATUS:TENTATIVE");
            }
            else {
                lines.push("STATUS:CONFIRMED");
            }
            if (ev.recurrenceRule) {
                lines.push(`RRULE:${ev.recurrenceRule}`);
            }
            if (ev.organizerEmail) {
                const orgName = ev.organizerName ? `CN=${this.escapeText(ev.organizerName)}:` : "";
                lines.push(`ORGANIZER;${orgName}MAILTO:${ev.organizerEmail}`);
            }
            lines.push("END:VEVENT");
        }
        lines.push("END:VCALENDAR");
        return lines.join("\r\n");
    }
}
exports.CalendarExportService = CalendarExportService;
