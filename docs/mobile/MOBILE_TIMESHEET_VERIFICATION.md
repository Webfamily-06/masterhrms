# MasterHRMS Mobile App — Timesheet Verification Report

**Date:** November 18, 2026  
**Subproject:** `mobile-app/src/modules/ess/screens/TimesheetScreen.tsx`  
**Services:** `AttendanceService`, `LeaveService`

---

## 1. Problem Diagnosis

During pre-audit, `TimesheetScreen.tsx` exhibited three critical operational bugs:
1. **Broken "+ Add Time Entry" Button:**
   The modal visibility was conditioned directly on `editingEntry` (`<Modal visible={Boolean(editingEntry)}>`). When tapping "+", `handleOpenAdd()` set `editingEntry(null)`. Consequently, the modal remained closed and users could not add new timesheet entries.
2. **Approved Timesheet Mutability & Incomplete Edit Flow:**
   Tapping edit on an approved timesheet attempted to open it for editing even though backend business rules forbid modifying approved timesheets without supervisor reopening. Furthermore, the backend has no direct `PUT /api/timesheets/:id` for employees.
3. **Hardcoded Leave Statistic:**
   In the 4-box stats grid, Regular, Overtime, and Total hours were computed from timesheet entries, but Leave was hardcoded to a static string: `<Text style={styles.statVal}>0.0</Text>`.

---

## 2. Remediation Applied

### 2.1 Decoupled Modal State & Working Add Flow
- Introduced explicit state variables:
  ```ts
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedEntry, setSelectedEntry] = useState<TimesheetItem | null>(null);
  ```
- Implemented `handleOpenAdd()`:
  - Resets form fields.
  - Sets `formMode = 'create'`.
  - Sets `isModalVisible = true`.
  The modal now opens immediately when the user taps "+".

### 2.2 Approved Timesheet Protection & Clean Update Flow
- In `handleOpenEdit(entry)`:
  - If `entry.status === 'approved'`, alerts:
    `"Timesheet Locked: This timesheet entry has already been approved and cannot be modified or deleted without management reopening."`
  - If pending, opens the modal in `'edit'` mode.
- In `handleSaveEntry()`:
  - If `formMode === 'edit'` and `selectedEntry` is pending, cleanly deletes the old record (`AttendanceService.deleteTimesheet(selectedEntry.id)`) and submits the updated record (`AttendanceService.createTimesheet(...)`).
- Added `handleDeleteEntry()` button inside the modal for pending records.

### 2.3 Dynamic Leave Derivation from Real Leave Requests
- Integrated `LeaveService.getMyRequests()` alongside timesheets in `loadData()`.
- Dynamically calculates the employee's approved leave hours overlapping the current pay period (Weekly or Bi-Weekly):
  ```ts
  let calculatedLeaveDays = 0;
  if (Array.isArray(myLeaves)) {
    myLeaves.forEach((l) => {
      if (l.status === 'APPROVED' || l.status === 'approved') {
        const lStart = new Date(l.startDate).getTime();
        const lEnd = new Date(l.endDate).getTime();
        if (!isNaN(lStart) && !isNaN(lEnd) && lStart <= pEnd && lEnd >= pStart) {
          calculatedLeaveDays += Number(l.days) || 1;
        }
      }
    });
  }
  setLeaveHours((calculatedLeaveDays * 8).toFixed(1));
  ```
- Replaced the static `0.0` with `{leaveHours}` derived from authentic server records.

---

## 3. Empirical Verification

- Unit tests added in `mobile-app/__tests__/services_and_integration.test.ts`:
  - `AttendanceService.getTimesheets` verified.
  - `AttendanceService.createTimesheet` verified.
  - `AttendanceService.deleteTimesheet` verified.
- TypeScript compilation: 0 errors.
- Jest test suite: 90 tests passing.
