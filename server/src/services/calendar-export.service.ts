export interface IcsEventInput {
  id: string;
  title: string;
  description?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  allDay?: boolean;
  location?: string | null;
  meetingLink?: string | null;
  status?: string;
  recurrenceRule?: string | null;
  organizerEmail?: string | null;
  organizerName?: string | null;
}

export class CalendarExportService {
  /**
   * Formats a Date object to RFC 5545 iCalendar UTC date-time string: YYYYMMDDTHHMMSSZ
   */
  private static formatDateTimeUtc(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      "T" +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      "Z"
    );
  }

  /**
   * Formats a Date object to RFC 5545 date string for all-day events: YYYYMMDD
   */
  private static formatDateOnly(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate());
  }

  /**
   * Escapes special characters according to RFC 5545 section 3.3.11
   */
  private static escapeText(text?: string | null): string {
    if (!text) return "";
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n|\n|\r/g, "\\n");
  }

  /**
   * Generates a complete RFC 5545 iCalendar (.ics) string for a list of events
   */
  public static generateIcs(
    events: any[],
    calendarTitleOrOptions: string | { calendarName?: string; tenantId?: string } = "MasterHRMS Calendar"
  ): string {
    const calendarTitle =
      typeof calendarTitleOrOptions === "string"
        ? calendarTitleOrOptions
        : calendarTitleOrOptions?.calendarName || "MasterHRMS Calendar";

    const nowUtc = this.formatDateTimeUtc(new Date());

    const lines: string[] = [
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
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${ev.id}@masterhrms.com`);
      lines.push(`DTSTAMP:${nowUtc}`);

      if (ev.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${this.formatDateOnly(start)}`);
        // For iCal all-day events, DTEND is exclusive (next day)
        const nextDay = new Date(end.getTime() + 86400000);
        lines.push(`DTEND;VALUE=DATE:${this.formatDateOnly(nextDay)}`);
      } else {
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
      } else if (ev.status === "tentative") {
        lines.push("STATUS:TENTATIVE");
      } else {
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
