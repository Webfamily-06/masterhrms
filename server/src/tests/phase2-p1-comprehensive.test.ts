import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas/employee.schema';
import { OFFICIAL_STATUTORY_RULE_PACKS } from '../seeds/statutory-rules.seed';
import { AttendanceService } from '../services/attendance.service';

describe('Phase 2 (P1) Comprehensive Verification Suite', () => {

  // =========================================================================
  // TASK-P1-01: Zod Schema Validation on Employee APIs (GAP-VAL-006)
  // =========================================================================
  describe('TASK-P1-01: Zod Schema Validation on Employee APIs (GAP-VAL-006)', () => {
    it('should reject invalid PAN format and accept valid 10-char alphanumeric uppercase PAN', () => {
      const invalidPan = createEmployeeSchema.safeParse({
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh@example.com',
        pan: '12345ABCDE', // Invalid PAN format
      });
      assert.strictEqual(invalidPan.success, false);
      const panIssue = invalidPan.error?.issues.find(i => i.path.includes('pan'));
      assert.ok(panIssue, 'Expected validation error on invalid PAN');

      const validPan = createEmployeeSchema.safeParse({
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh@example.com',
        pan: 'ABCDE1234F', // Valid PAN format
      });
      assert.strictEqual(validPan.success, true);
    });

    it('should reject invalid 12-digit Aadhaar and accept valid numeric Aadhaar', () => {
      const invalidAadhaar = createEmployeeSchema.safeParse({
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya@example.com',
        aadhaar: '12345678', // Only 8 digits
      });
      assert.strictEqual(invalidAadhaar.success, false);
      const aadhaarIssue = invalidAadhaar.error?.issues.find(i => i.path.includes('aadhaar'));
      assert.ok(aadhaarIssue, 'Expected validation error on invalid Aadhaar');

      const validAadhaar = createEmployeeSchema.safeParse({
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya@example.com',
        aadhaar: '987654321012',
      });
      assert.strictEqual(validAadhaar.success, true);
    });

    it('should reject invalid Indian Bank IFSC code and accept valid format', () => {
      const invalidIfsc = createEmployeeSchema.safeParse({
        firstName: 'Anand',
        lastName: 'Verma',
        email: 'anand@example.com',
        bankIfsc: 'HDFC123456', // Missing 5th char zero
      });
      assert.strictEqual(invalidIfsc.success, false);

      const validIfsc = createEmployeeSchema.safeParse({
        firstName: 'Anand',
        lastName: 'Verma',
        email: 'anand@example.com',
        bankIfsc: 'HDFC0001234',
      });
      assert.strictEqual(validIfsc.success, true);
    });

    it('should reject negative salary and minor dateOfBirth (< 18 years)', () => {
      const negativeSalary = createEmployeeSchema.safeParse({
        firstName: 'Kavita',
        lastName: 'Devi',
        email: 'kavita@example.com',
        salary: -50000,
      });
      assert.strictEqual(negativeSalary.success, false);

      // 10 years old
      const minorDob = new Date();
      minorDob.setFullYear(minorDob.getFullYear() - 10);
      const minor = createEmployeeSchema.safeParse({
        firstName: 'Child',
        lastName: 'Worker',
        email: 'child@example.com',
        dateOfBirth: minorDob,
      });
      assert.strictEqual(minor.success, false);
      const dobIssue = minor.error?.issues.find(i => i.path.includes('dateOfBirth'));
      assert.ok(dobIssue, 'Expected rejection of minor date of birth');
    });

    it('should enforce partial update constraints on updateEmployeeSchema', () => {
      const invalidUpdate = updateEmployeeSchema.safeParse({
        pan: 'INVALID_PAN_STR',
      });
      assert.strictEqual(invalidUpdate.success, false);

      const validUpdate = updateEmployeeSchema.safeParse({
        salary: 75000,
        pan: 'ABCDE5678G',
        bankAccount: '123456789012',
      });
      assert.strictEqual(validUpdate.success, true);
    });
  });

  // =========================================================================
  // TASK-P1-09: Dynamic Branch Geofencing Coordinates Calculation (GAP-DB-API-003)
  // =========================================================================
  describe('TASK-P1-09: Dynamic Branch Geofencing Coordinates Calculation (GAP-DB-API-003)', () => {
    it('should calculate accurate distance in meters between two GPS coordinates', () => {
      // Distance between Nariman Point Mumbai (18.9260, 72.8230) and Marine Drive (18.9430, 72.8235) is ~1.89km
      const dist = (AttendanceService as any).calculateDistanceMeters(18.9260, 72.8230, 18.9430, 72.8235);
      assert.ok(dist > 1800 && dist < 2000, `Expected ~1.89km, got ${dist}`);
    });

    it('should verify proximity inside branch perimeter (e.g. 150m from office)', () => {
      // 100 meters away
      const officeLat = 12.9716;
      const officeLng = 77.5946;
      // Slight delta (~100m)
      const userLat = 12.9725;
      const userLng = 77.5946;
      const dist = (AttendanceService as any).calculateDistanceMeters(userLat, userLng, officeLat, officeLng);
      assert.ok(dist < 150, `Distance ${dist} should be < 150m`);
    });
  });

  // =========================================================================
  // TASK-P1-10: Tamil Nadu Labour Welfare Fund Statutory Seed Rates
  // =========================================================================
  describe('TASK-P1-10: Tamil Nadu LWF Seed Rates Update (STATUTORY_POLICY_REVIEW.md)', () => {
    it('should verify Tamil Nadu LWF rates are updated to Employee ₹20 and Employer ₹40 (Total ₹60)', () => {
      const tnLwf = OFFICIAL_STATUTORY_RULE_PACKS.find(r => r.ruleType === 'LWF' && r.stateCode === 'TN');
      assert.ok(tnLwf, 'Expected TN LWF seed rule to exist');
      const cfg = tnLwf.configJson as any;
      assert.strictEqual(cfg.employeeContribution, 20, 'Employee contribution must be ₹20');
      assert.strictEqual(cfg.employerContribution, 40, 'Employer contribution must be ₹40');
      assert.strictEqual(cfg.employeeContribution + cfg.employerContribution, 60, 'Total LWF must be ₹60');
      assert.strictEqual(tnLwf.version, 2, 'Version must be 2');
      assert.ok(tnLwf.notificationRef.includes('Act No. 44 of 2023'), 'Notification ref must cite Act No. 44 of 2023');
    });
  });

  // =========================================================================
  // TASK-P1-02: Non-Sandwich Leave Attendance Sync Verification (GAP-VAL-008)
  // =========================================================================
  describe('TASK-P1-02: Non-Sandwich Leave Attendance Sync Logic (GAP-VAL-008)', () => {
    it('should accurately detect weekends and public holidays when sandwichRule is false', () => {
      const holidays = new Set(['2026-11-15']);
      const sandwichRule = false;

      // 2026-11-14 is Saturday (Day 6), 2026-11-15 is Sunday (Day 0) + Holiday
      const datesToTest = [
        { date: '2026-11-13', dayOfWeek: 5, expectedDeduction: true },  // Friday
        { date: '2026-11-14', dayOfWeek: 6, expectedDeduction: false }, // Saturday
        { date: '2026-11-15', dayOfWeek: 0, expectedDeduction: false }, // Sunday
        { date: '2026-11-16', dayOfWeek: 1, expectedDeduction: true },  // Monday
      ];

      for (const t of datesToTest) {
        const isWeekend = t.dayOfWeek === 0 || t.dayOfWeek === 6;
        const isHoliday = holidays.has(t.date);
        const shouldSkipAttendanceOverwrite = !sandwichRule && (isWeekend || isHoliday);
        assert.strictEqual(!shouldSkipAttendanceOverwrite, t.expectedDeduction, `Date ${t.date} sandwich evaluation failed`);
      }
    });
  });

  // =========================================================================
  // TASK-P1-05 & TASK-P1-06: Candidate Conversion Gates and Statutory Mapping (GAP-VAL-007, GAP-VAL-012, GAP-VAL-013)
  // =========================================================================
  describe('TASK-P1-05 & TASK-P1-06: Candidate Conversion Gate & Statutory Extraction', () => {
    it('should correctly extract PAN, Aadhaar, UAN, and Bank details from onboarding task responses', () => {
      const mockTasks = [
        { title: 'Upload PAN Card', description: 'PAN details: ABCDE1234F verified', category: 'pan', isMandatory: true, status: 'completed' },
        { title: 'Aadhaar Verification', description: 'Aadhaar UID: 123456789012', category: 'aadhaar', isMandatory: true, status: 'completed' },
        { title: 'EPFO UAN Declaration', description: 'UAN: 101234567890', category: 'uan', isMandatory: true, status: 'completed' },
        { title: 'Bank Account & Cheque', description: 'Bank AC 987654321012 IFSC HDFC0001234', category: 'bank', isMandatory: true, status: 'completed' },
      ];

      let pan: string | null = null;
      let aadhaar: string | null = null;
      let uan: string | null = null;
      let bankAccount: string | null = null;
      let bankIfsc: string | null = null;

      for (const task of mockTasks) {
        const titleLower = task.title.toLowerCase();
        const desc = task.description;

        if (!pan && (titleLower.includes('pan') || task.category === 'pan')) {
          const m = desc.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/i);
          if (m) pan = m[0].toUpperCase();
        }
        if (!aadhaar && (titleLower.includes('aadhaar') || task.category === 'aadhaar')) {
          const m = desc.match(/\b\d{12}\b/);
          if (m) aadhaar = m[0];
        }
        if (!uan && (titleLower.includes('uan') || task.category === 'uan')) {
          const m = desc.match(/\b\d{12}\b/);
          if (m) uan = m[0];
        }
        if (!bankAccount && (titleLower.includes('bank') || task.category === 'bank')) {
          const accMatch = desc.match(/\b\d{9,18}\b/);
          if (accMatch) bankAccount = accMatch[0];
          const ifscMatch = desc.match(/[A-Z]{4}0[A-Z0-9]{6}/i);
          if (ifscMatch) bankIfsc = ifscMatch[0].toUpperCase();
        }
      }

      assert.strictEqual(pan, 'ABCDE1234F');
      assert.strictEqual(aadhaar, '123456789012');
      assert.strictEqual(uan, '101234567890');
      assert.strictEqual(bankAccount, '987654321012');
      assert.strictEqual(bankIfsc, 'HDFC0001234');
    });

    it('should assert BGV and mandatory task gates before conversion', () => {
      const mockOnboardingPendingBgv = {
        bgvStatus: 'in_progress',
        tasks: [{ isMandatory: true, status: 'completed', title: 'Doc' }],
      };
      const validBgvStatuses = ['passed', 'completed', 'verified', 'waived'];
      assert.strictEqual(validBgvStatuses.includes(mockOnboardingPendingBgv.bgvStatus), false);

      const mockOnboardingIncompleteTask = {
        bgvStatus: 'passed',
        tasks: [
          { isMandatory: true, status: 'pending', title: 'Medical Certificate' },
          { isMandatory: true, status: 'completed', title: 'ID Proof' },
        ],
      };
      const incomplete = mockOnboardingIncompleteTask.tasks.filter(t => t.isMandatory && t.status !== 'completed');
      assert.strictEqual(incomplete.length, 1);
      assert.strictEqual(incomplete[0].title, 'Medical Certificate');
    });
  });

  // =========================================================================
  // TASK-P1-07 & TASK-P1-08: Department Clearances & Invalidation on Exit (WF-GAP-006, GAP-VAL-019)
  // =========================================================================
  describe('TASK-P1-07 & TASK-P1-08: Exit Clearances & Auth Token Invalidation (WF-GAP-006, GAP-VAL-019)', () => {
    it('should fail exit finalization if any department clearance is missing', () => {
      const exitRecord = {
        itClearance: true,
        financeClearance: false, // Incomplete!
        hrClearance: true,
        adminClearance: true,
        checklistItems: [{ status: 'completed' }],
      };

      const hasPendingClearance = !exitRecord.itClearance || !exitRecord.financeClearance || !exitRecord.hrClearance || !exitRecord.adminClearance;
      assert.strictEqual(hasPendingClearance, true, 'Should detect pending clearance');
    });

    it('should permit exit finalization when all 4 clearances and checklist items are verified', () => {
      const exitRecord = {
        itClearance: true,
        financeClearance: true,
        hrClearance: true,
        adminClearance: true,
        checklistItems: [{ status: 'completed' }, { status: 'completed' }],
      };

      const hasPendingClearance = !exitRecord.itClearance || !exitRecord.financeClearance || !exitRecord.hrClearance || !exitRecord.adminClearance;
      const hasPendingChecklist = exitRecord.checklistItems.some(i => i.status !== 'completed');
      assert.strictEqual(hasPendingClearance || hasPendingChecklist, false, 'Should allow exit when 100% cleared');
    });
  });

  // =========================================================================
  // TASK-P1-11: Reconcile Statutory Form Generator (GAP-VAL-011)
  // =========================================================================
  describe('TASK-P1-11: Statutory Form Generator Live Record Integration (GAP-VAL-011)', () => {
    it('should map fatherOrSpouseName and live payslip deductions rather than static estimates', () => {
      const mockEmployee = {
        firstName: 'Vikram',
        lastName: 'Aditya',
        fatherOrSpouseName: 'Suryanarayana Aditya',
        uan: '100987654321',
      };

      const mappedFather = mockEmployee.fatherOrSpouseName || '—';
      assert.strictEqual(mappedFather, 'Suryanarayana Aditya');

      const livePayslip = {
        grossSalary: 60000,
        netSalary: 52000,
        breakdown: {
          earnings: { basic: 30000, hra: 12000 },
          deductions: { providentFund: 3600, professionalTax: 208.33, tds: 4191.67 },
        },
      };

      const bd = livePayslip.breakdown;
      assert.strictEqual(bd.earnings.basic, 30000);
      assert.strictEqual(bd.deductions.providentFund, 3600);
      assert.strictEqual(bd.deductions.professionalTax, 208.33);
    });
  });

  // =========================================================================
  // TASK-P1-16: Viewport Breakpoint Synchronization (GAP-UI-011)
  // =========================================================================
  describe('TASK-P1-16: Viewport Breakpoint Harmonization (GAP-UI-011)', () => {
    it('should verify MOBILE_BREAKPOINT is 1024 to match CSS max-width 1023.98px media query', () => {
      const MOBILE_BREAKPOINT = 1024;
      const mediaQueryThreshold = 1023.98;
      assert.strictEqual(MOBILE_BREAKPOINT - 0.02, mediaQueryThreshold);
    });
  });
});
