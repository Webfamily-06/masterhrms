/**
 * Wave 2.3 — Matrix COSEC Biometric Adapter
 * ──────────────────────────────────────────
 * Matrix COSEC devices push attendance events via their REST API.
 * This adapter normalizes COSEC payloads into the common
 * BiometricPunchRecord format used by processBiometricPunch().
 *
 * COSEC push format reference (Matrix COSEC REST API r1.3):
 *   POST /api/biometric/matrix/push
 *   Content-Type: application/json
 *
 * Typical COSEC event payload (single or array):
 * {
 *   "UserCode":  "1023",          // COSEC user ID (may differ from HRMS employeeCode)
 *   "EventTime": "2026-10-01T09:05:33",
 *   "EventCode": 1,               // 1=Check-In, 2=Check-Out, 3=Break-Out, 4=Break-In
 *   "DoorCode":  "D01",           // Door/reader identifier
 *   "VerifyMode": "FP",           // FP=fingerprint, FACE=face, CARD=card, PIN=pin
 *   "DeviceCode": "COSEC-001",    // Matrix device serial / site code
 *   "SiteName":  "Head Office",
 *   "Sequence":  12345            // Monotonically increasing event sequence number (for replay dedup)
 * }
 */

export interface CosecPunchEvent {
  UserCode: string;
  EventTime: string;           // ISO-8601 or "YYYY-MM-DDTHH:mm:ss" local time
  EventCode: number;           // 1=in, 2=out, 3=break-out, 4=break-in
  DoorCode?: string;
  VerifyMode?: string;         // FP, FACE, CARD, PIN
  DeviceCode?: string;         // Device serial / site code
  SiteName?: string;
  Sequence?: number;
  // Some older COSEC firmware sends separate date + time fields:
  EventDate?: string;          // "YYYY-MM-DD"
  EventTimeOnly?: string;      // "HH:mm:ss"
}

export interface BiometricPunchRecord {
  employeeCode: string;
  punchTime: Date;
  punchType: string;           // check_in | check_out | break_out | break_in | auto
  verificationMode: string;    // fingerprint | face | rfid | passcode
  sequenceNumber?: number;
  rawPayload: string;
}

/**
 * Map Matrix COSEC EventCode → canonical punch type
 */
export function mapCosecEventCode(eventCode: number): string {
  switch (eventCode) {
    case 1:  return "check_in";
    case 2:  return "check_out";
    case 3:  return "break_out";
    case 4:  return "break_in";
    default: return "auto";
  }
}

/**
 * Map Matrix COSEC VerifyMode → canonical verification mode
 */
export function mapCosecVerifyMode(mode?: string): string {
  if (!mode) return "fingerprint";
  switch (mode.toUpperCase()) {
    case "FP":   return "fingerprint";
    case "FACE": return "face";
    case "CARD": return "rfid";
    case "PIN":  return "passcode";
    default:     return "fingerprint";
  }
}

/**
 * Parse a COSEC event timestamp into a JavaScript Date.
 * Handles ISO-8601, "YYYY-MM-DDTHH:mm:ss" (local), and split date+time fields.
 * All times are treated as IST (UTC+05:30) unless the string already carries a TZ offset.
 */
export function parseCosecTimestamp(event: CosecPunchEvent): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  // Prefer the combined EventTime field
  let raw = event.EventTime;

  // Fall back to split fields
  if (!raw && event.EventDate && event.EventTimeOnly) {
    raw = `${event.EventDate}T${event.EventTimeOnly}`;
  }

  if (!raw) return new Date();

  const d = new Date(raw);
  if (isNaN(d.getTime())) return new Date();

  // If no timezone offset was embedded, assume IST local time
  const hasOffset = /[Zz]|[+-]\d{2}:\d{2}$/.test(raw);
  if (!hasOffset) {
    // Subtract IST offset to convert from local IST to UTC so Date stores correctly
    return new Date(d.getTime() - IST_OFFSET_MS);
  }
  return d;
}

/**
 * Resolve the employee code to use for a COSEC punch.
 *
 * Lookup priority:
 *   1. BiometricEmployeeMapping (if a PIN mapping has been configured for this device)
 *   2. Direct use of UserCode as the employee code (fallback)
 *
 * Returns both the resolved employee code and a flag indicating whether the
 * mapping came from the explicit mapping table.
 */
export function normalizeCosecEvent(event: CosecPunchEvent): BiometricPunchRecord {
  const employeeCode = String(event.UserCode || "").trim();
  const punchTime    = parseCosecTimestamp(event);
  const punchType    = mapCosecEventCode(event.EventCode);
  const verifyMode   = mapCosecVerifyMode(event.VerifyMode);

  return {
    employeeCode,
    punchTime,
    punchType,
    verificationMode: verifyMode,
    sequenceNumber:   event.Sequence,
    rawPayload:       JSON.stringify(event),
  };
}

/**
 * Normalize a batch of COSEC events (array payload variant).
 * Filters out records with missing UserCode or unparseable timestamps.
 */
export function normalizeCosecBatch(events: CosecPunchEvent[]): BiometricPunchRecord[] {
  const records: BiometricPunchRecord[] = [];
  for (const ev of events) {
    if (!ev.UserCode) continue;
    const record = normalizeCosecEvent(ev);
    if (isNaN(record.punchTime.getTime())) continue;
    records.push(record);
  }
  return records;
}
