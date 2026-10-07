# MASTERHRMS — PHASE P3 OPEN QUESTIONS & BUSINESS RULE DECISIONS

**Date:** 2026-10-07  
**Phase:** P3 Attendance, Leave, Check-In/Out, Realtime & Month Lock  

---

## 1. Attendance Verification Modes (Section 6.1)

### Question:
Which verification mechanisms should be active by default for employee check-in?
- Options:
  1. Web browser punch (IP + optional Geolocation)
  2. Mobile punch with Geo-fence radius verification
  3. Biometric sync (hardware device background sync)
  4. Selfie validation (camera capture)
  5. Manual HR attendance entry

### Resolved Production Doctrine & Policy Configuration:
Per `01_HR_Panel_Spec.md` and `AttendancePolicy` configuration:
- **Default Production Mode:** Multi-modal support governed by `AttendancePolicy.verificationModes` (Default: `WEB,MOBILE,GEO`).
- **Web Browser Punch:** Always supported on `/me` and `/me/dashboard`. Captures client IP and browser geolocation coordinates where permitted by the browser.
- **Geo-Fence:** When coordinates are captured, distance is measured against corporate branch coordinates (default radius 500m). If outside perimeter, the record is flagged with a `[Geo-Warning]` note rather than failing check-in, allowing HR review.
- **Biometric Hardware:** Integrated via existing `BiometricDevice` sync engine.
- **Selfie Validation:** Optional flag in `AttendancePolicy`; when disabled, camera capture is not enforced.
- **Manual HR Entry:** Restricted to `hr_admin`, `super_admin`, and `Workspace Admin` via `/hr/attendance/records` with mandatory audit reason.

---

## 2. Sandwich Rule & Leave Day Calculation

### Question:
Should weekends and holidays falling between applied leave days be counted as leave days?

### Resolved Production Doctrine:
- Controlled by `LeaveType.sandwichRule` and `LeavePolicy.sandwichRule` (boolean flag).
- If `sandwichRule === false` (Standard Default): Intervening holidays and weekly offs (Saturdays/Sundays) are **excluded** from the deducted leave balance.
- If `sandwichRule === true`: Intervening holidays and weekly offs are **counted** as deducted leave days.
- The server-side dry run (`POST /api/v1/me/leave/applications/dry-run`) calculates exact payable vs non-payable days and returns the itemized day list before submission.

---

## 3. Month Lock Governance

### Question:
Who is authorized to lock/unlock an attendance month, and what is the exact locking boundary?

### Resolved Production Doctrine:
- **Authorized Roles:** Only `super_admin`, `hr_admin`, and `Workspace Admin`.
- **Locking Boundary:** Per Tenant, Year, and Month (`AttendanceMonthLock`).
- **Enforcement:**
  - Prevents all attendance mutations (`POST /api/v1/hr/attendance/records`, check-in/out punches, and regularizations) where record date falls within `[year, month]`.
  - Prevents leave approvals/cancellations that retroactively alter attendance status for that locked month.
  - Unlock requires explicit `unlockedById` and `notes` recording in `AuditLog`.

---

## 4. Overtime & Comp-Off Linkage

### Question:
How do overtime requests transition into comp-off credits?

### Resolved Production Doctrine:
- Employees with approved overtime requests (`OvertimeRequest`) can select an approved overtime record as the source when requesting a Comp-off credit in `/me/attendance/requests`.
- Once HR approves the comp-off request, a credit entry of type `CREDIT` is added to `LeaveLedgerEntry` for the Comp-off leave type, increasing available balance.
- Overtime that is marked for payout feeds into the future P4 payroll payable hours dataset.

---

**Status:** ALL P3 BUSINESS RULES LOCKED FOR IMPLEMENTATION.
