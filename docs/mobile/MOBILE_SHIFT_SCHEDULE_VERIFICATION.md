# MasterHRMS Mobile App — Shift Schedule & Swaps Verification Report

**Date:** November 18, 2026  
**Subproject:** `mobile-app/src/modules/ess/screens/ShiftScheduleScreen.tsx`  
**Backend Endpoints:** `GET /api/v1/me/attendance/shifts`, `POST /api/shifts/swaps`

---

## 1. Problem Diagnosis

During pre-audit, the Shift Schedule screen exhibited simulated, non-functional workflows:
1. **Static Monday-Sunday Schedule:**
   The week's schedule was generated purely on the client side using hardcoded logic:
   - Sunday was hardcoded to "Weekly Off" / "Rest Day".
   - Saturday was hardcoded to "Weekend Support / Half".
   - Monday-Friday were assumed to be "General Day Shift".
   It ignored individual shift rosters assigned by HR and supervisors on the backend.
2. **Fake Shift Swap Submission:**
   When tapping "Swap" and submitting the modal form, the application called NO backend API. Instead, it ran:
   ```ts
   setModalVisible(false);
   setColleagueName('');
   setReason('');
   Alert.alert('Shift Swap Request Sent', 'Request forwarded to your manager and colleague for mutual approval.');
   ```
   This gave users a false impression that a request had been submitted to management, when in reality no record was ever sent to the database.

---

## 2. Remediation Applied

### 2.1 Real Backend Shift Rosters
- Integrated `AttendanceService.getMyShifts()` which calls `GET /api/v1/me/attendance/shifts`.
- The endpoint queries `prisma.shiftRoster` for the employee across the current period (-7 to +14 days).
- For each day in the weekly calendar, the screen matches real `rosterDate` records from the server:
  - If a roster entry exists, it renders the exact assigned shift name, start/end hours, and shift type (`WORK`, `HALF`).
  - If no specific roster is defined, it uses the employee's active assigned shift from `AttendanceService.getDashboardSummary()`.

### 2.2 Authentic Shift Swap Request Workflow
- In `AttendanceService`:
  ```ts
  static async createShiftSwap(payload: {
    requesterEmployeeId: string;
    targetEmployeeId: string;
    shiftDate: string;
    reason: string;
  }): Promise<ShiftSwapItem> {
    const response = await apiClient.post<ShiftSwapItem>('/api/shifts/swaps', payload);
    return response.data;
  }
  ```
- In `ShiftScheduleScreen.tsx`:
  - Fetches the employee's genuine profile ID (`EmployeeService.getMyProfile()`).
  - Fetches workspace colleagues via `EmployeeService.getEmployees()`.
  - The modal allows selecting the target colleague, entering/confirming the shift date, and writing the reason.
  - Submits payload to `POST /api/shifts/swaps` with proper loading state (`submitting`), error handling, and server validation.

### 2.3 Live Shift Swap Status Tracking
- Renders a "Shift Swap Requests" section below the weekly schedule displaying all recent swap requests returned by `GET /api/v1/me/attendance/shifts`.
- Displays real status badges:
  - `pending_peer`: Pending Colleague Acceptance
  - `pending_manager`: Accepted by peer, awaiting manager sign-off
  - `approved`: Approved & roster updated
  - `rejected` / `declined`: Rejected by peer or supervisor

---

## 3. Empirical Verification

- Unit test added in `mobile-app/__tests__/services_and_integration.test.ts`:
  - `AttendanceService.getMyShifts` verified with mock server response.
  - `AttendanceService.createShiftSwap` verified calling `POST /api/shifts/swaps` with required parameters.
- TypeScript compilation: 0 errors.
- 90 tests passing.
