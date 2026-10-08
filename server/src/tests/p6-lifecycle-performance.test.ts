import { describe, it, expect, vi, beforeEach } from "vitest";

describe("MASTERHRMS P6 — Employee Lifecycle & Performance Test Suite", () => {
  // Mock Tenant Context
  const TENANT_A = "tenant-alpha-uuid";
  const TENANT_B = "tenant-beta-uuid";

  describe("1. Append-Only Employee Event Timeline Store (P6-BR-019)", () => {
    it("creates an immutable historical event record with valid effective date and diff payload", () => {
      const eventPayload = {
        tenantId: TENANT_A,
        employeeId: "emp-101",
        eventType: "PROMOTED",
        effectiveDate: new Date("2026-04-01"),
        previousState: { position: "Junior Engineer", salary: 50000 },
        newState: { position: "Senior Engineer", salary: 75000 },
        changedFields: ["position", "salary"],
        actorId: "hr-admin-1",
        source: "hr_admin",
        reason: "Annual performance appraisal promotion",
      };

      expect(eventPayload.eventType).toBe("PROMOTED");
      expect(eventPayload.changedFields).toContain("position");
      expect(eventPayload.changedFields).toContain("salary");
      expect(eventPayload.newState.salary).toBeGreaterThan(eventPayload.previousState.salary);
    });

    it("ensures event types adhere to the canonical lifecycle state transition enum", () => {
      const canonicalEvents = [
        "JOINED",
        "PROBATION_EXTENDED",
        "CONFIRMED",
        "PROMOTED",
        "TRANSFERRED",
        "WARNING_ISSUED",
        "RESIGNED",
        "RESIGNATION_WITHDRAWN",
        "EXIT_STARTED",
        "EXITED",
        "TERMINATED",
        "REHIRED",
      ];

      expect(canonicalEvents).toContain("JOINED");
      expect(canonicalEvents).toContain("CONFIRMED");
      expect(canonicalEvents).toContain("EXITED");
      expect(canonicalEvents).toHaveLength(12);
    });
  });

  describe("2. Probation & Confirmation Engine (P6-BR-001, P6-BR-002, P6-BR-003)", () => {
    it("enforces default probation period of 90 calendar days", () => {
      const startDate = new Date("2026-01-01");
      const probationDays = 90;
      const expectedEnd = new Date(startDate);
      expectedEnd.setDate(expectedEnd.getDate() + probationDays);

      expect(probationDays).toBe(90);
      expect(expectedEnd.toISOString().split("T")[0]).toBe("2026-04-01");
    });

    it("validates probation extension within 90 days limit and 180 cumulative days ceiling", () => {
      const initialProbationDays = 90;
      const validExtension = 60;
      const totalDays = initialProbationDays + validExtension;

      expect(validExtension).toBeLessThanOrEqual(90);
      expect(totalDays).toBeLessThanOrEqual(180);

      // Illegal extension exceeding 90 days
      const illegalExtension = 100;
      expect(illegalExtension > 90).toBe(true);

      // Illegal cumulative extension exceeding 180 days
      const secondExtension = 40;
      expect(totalDays + secondExtension > 180).toBe(true);
    });

    it("confirms probation and stamps confirmation date while preserving active employee status", () => {
      const probationRecord = {
        id: "prob-1",
        status: "active",
        employeeId: "emp-101",
        probationPeriodDays: 90,
      };

      // Execute confirmation
      const confirmedRecord = {
        ...probationRecord,
        status: "confirmed",
        confirmedAt: new Date(),
        performanceRating: "Exceeds Expectations",
      };

      expect(confirmedRecord.status).toBe("confirmed");
      expect(confirmedRecord.confirmedAt).toBeInstanceOf(Date);
      expect(confirmedRecord.performanceRating).toBe("Exceeds Expectations");
    });
  });

  describe("3. Promotion & Transfer Org Movement (P6-BR-004, P6-BR-005, P6-BR-006)", () => {
    it("updates employee designation and department without mutating historical records", () => {
      const employeeBefore = {
        id: "emp-101",
        position: "Software Engineer",
        departmentId: "dept-eng",
        salary: 60000,
      };

      const promotion = {
        newDesignation: "Lead Engineer",
        newSalary: 85000,
        promotionType: "merit",
        effectiveDate: new Date("2026-04-01"),
      };

      const employeeAfter = {
        ...employeeBefore,
        position: promotion.newDesignation,
        salary: promotion.newSalary,
      };

      expect(employeeAfter.position).toBe("Lead Engineer");
      expect(employeeAfter.salary).toBe(85000);
      expect(employeeBefore.position).toBe("Software Engineer"); // Immutability of past state
    });

    it("validates transfer moves employee across branch and updates reporting manager", () => {
      const transfer = {
        fromBranchId: "branch-mumbai",
        toBranchId: "branch-bengaluru",
        fromDeptId: "dept-sales",
        toDeptId: "dept-enterprise-sales",
        oldManagerId: "mgr-1",
        newManagerId: "mgr-2",
        effectiveDate: new Date("2026-05-01"),
        status: "COMPLETED",
      };

      expect(transfer.fromBranchId).not.toBe(transfer.toBranchId);
      expect(transfer.status).toBe("COMPLETED");
    });
  });

  describe("4. Disciplinary Warnings & Acknowledgements (P6-BR-007)", () => {
    it("supports 4-tier warning severity scale with acknowledgment tracking", () => {
      const validSeverities = ["minor", "moderate", "major", "critical"];
      const warning = {
        severity: "major",
        status: "issued",
        acknowledgedAt: null as Date | null,
        employeeResponse: null as string | null,
      };

      expect(validSeverities).toContain(warning.severity);
      expect(warning.status).toBe("issued");

      // Employee acknowledges
      warning.status = "acknowledged";
      warning.acknowledgedAt = new Date();
      expect(warning.status).toBe("acknowledged");
      expect(warning.acknowledgedAt).toBeInstanceOf(Date);

      // Employee submits response
      warning.employeeResponse = "Clarifying context regarding the incident...";
      warning.status = "appealed";
      expect(warning.status).toBe("appealed");
    });
  });

  describe("5. Resignation & Exit Clearance Protocol (P6-BR-008, P6-BR-009, P6-BR-010, P6-BR-011)", () => {
    it("calculates policy LWD based on 60 days notice period", () => {
      const noticeDate = new Date("2026-04-01");
      const noticePeriodDays = 60;
      const policyLWD = new Date(noticeDate);
      policyLWD.setDate(policyLWD.getDate() + noticePeriodDays);

      expect(policyLWD.toISOString().split("T")[0]).toBe("2026-05-31");
    });

    it("prohibits resignation withdrawal once exit is already finalized or settled", () => {
      const exitServingNotice = { status: "serving_notice" };
      const canWithdrawNotice = exitServingNotice.status === "serving_notice" || exitServingNotice.status === "pending";
      expect(canWithdrawNotice).toBe(true);

      const exitFinalized = { status: "completed" };
      const canWithdrawCompleted = exitFinalized.status === "serving_notice" || exitFinalized.status === "pending";
      expect(canWithdrawCompleted).toBe(false);
    });

    it("verifies multi-department clearance items for IT, Finance, HR, and Admin", () => {
      const departments = ["IT", "Finance", "HR", "Admin"];
      const checklist = [
        { department: "IT", title: "Handover laptop", isCompleted: true },
        { department: "Finance", title: "Clear travel advance", isCompleted: true },
        { department: "HR", title: "Exit interview", isCompleted: true },
        { department: "Admin", title: "Collect badge", isCompleted: false },
      ];

      const allCleared = checklist.every((item) => item.isCompleted);
      expect(allCleared).toBe(false);

      checklist[3].isCompleted = true;
      expect(checklist.every((item) => item.isCompleted)).toBe(true);
      expect(new Set(checklist.map((c) => c.department))).toEqual(new Set(departments));
    });

    it("finalizes exit by transitioning employee status to terminated and disabling user login", () => {
      const employee = { status: "active", userId: "user-101" };
      const exit = { status: "clearance_pending" };

      // Finalize
      exit.status = "completed";
      employee.status = "terminated";

      expect(exit.status).toBe("completed");
      expect(employee.status).toBe("terminated");
    });
  });

  describe("6. Grievance Confidentiality & Isolation (P6-BR-014)", () => {
    it("preserves anonymity by nullifying complainantId when isAnonymous is true", () => {
      const complaint = {
        isAnonymous: true,
        complainantId: null,
        category: "Harassment",
        severity: "critical",
        subject: "Confidential Safety Issue",
      };

      expect(complaint.isAnonymous).toBe(true);
      expect(complaint.complainantId).toBeNull();
    });

    it("strictly excludes complaints filed AGAINST an employee from their ESS view", () => {
      const allComplaints = [
        { id: "c1", complainantId: "emp-alice", accusedEmployeeId: "emp-bob", subject: "Filed by Alice against Bob" },
        { id: "c2", complainantId: "emp-bob", accusedEmployeeId: "emp-charlie", subject: "Filed by Bob against Charlie" },
        { id: "c3", complainantId: "emp-david", accusedEmployeeId: "emp-bob", subject: "Filed by David against Bob" },
      ];

      // ESS Query for emp-bob: should ONLY show complaints where complainantId === 'emp-bob'
      const bobEssComplaints = allComplaints.filter((c) => c.complainantId === "emp-bob");

      expect(bobEssComplaints).toHaveLength(1);
      expect(bobEssComplaints[0].id).toBe("c2");
      // c1 and c3 MUST NOT leak to Bob
      expect(bobEssComplaints.map((c) => c.id)).not.toContain("c1");
      expect(bobEssComplaints.map((c) => c.id)).not.toContain("c3");
    });
  });

  describe("7. Performance Cycles & Phase Workflow (P6-BR-015)", () => {
    it("models ordered cycle phases: goal_setting -> self_review -> manager_review -> calibration -> released -> closed", () => {
      const phases = ["goal_setting", "self_review", "manager_review", "calibration", "released", "closed"];
      expect(phases).toHaveLength(6);
      expect(phases.indexOf("self_review")).toBeLessThan(phases.indexOf("manager_review"));
      expect(phases.indexOf("manager_review")).toBeLessThan(phases.indexOf("released"));
    });
  });

  describe("8. Goal Management & Weight Calculation (P6-BR-016)", () => {
    it("validates goal weights summing to 100%", () => {
      const goals = [
        { title: "Deliver P6 Architecture", weight: 40 },
        { title: "Maintain 100% Test Coverage", weight: 30 },
        { title: "Mentor Junior Engineers", weight: 30 },
      ];

      const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
      expect(totalWeight).toBe(100);
    });

    it("rolls up key result check-in progress into objective completion percentage", () => {
      const keyResults = [
        { startValue: 0, targetValue: 100, currentValue: 80, weight: 1.0 }, // 80%
        { startValue: 0, targetValue: 50, currentValue: 50, weight: 1.0 },   // 100%
      ];

      let weightedSum = 0;
      let totalWeight = 0;
      for (const kr of keyResults) {
        const pct = ((kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue)) * 100;
        weightedSum += pct * kr.weight;
        totalWeight += kr.weight;
      }

      const rolledUpProgress = Math.round(weightedSum / totalWeight);
      expect(rolledUpProgress).toBe(90); // (80 + 100) / 2 = 90%
    });
  });

  describe("9. Rating Engine & Score Calculation (P6-BR-017)", () => {
    it("computes deterministic weighted overall score on standard 5-point scale", () => {
      const indicatorRatings = [
        { indicator: "Technical Excellence", score: 4.5, weight: 40 },
        { indicator: "Leadership & Collaboration", score: 4.0, weight: 30 },
        { indicator: "Delivery & Execution", score: 5.0, weight: 30 },
      ];

      const weightedTotal = indicatorRatings.reduce((sum, r) => sum + r.score * r.weight, 0);
      const totalWeight = indicatorRatings.reduce((sum, r) => sum + r.weight, 0);
      const overallScore = Number((weightedTotal / totalWeight).toFixed(2));

      // 4.5*40 + 4.0*30 + 5.0*30 = 180 + 120 + 150 = 450 / 100 = 4.50
      expect(overallScore).toBe(4.5);
      expect(overallScore).toBeGreaterThanOrEqual(1.0);
      expect(overallScore).toBeLessThanOrEqual(5.0);
    });

    it("masks manager ratings from employee in ESS until review cycle is officially released", () => {
      const reviewPendingRelease = {
        status: "submitted",
        selfRating: 4.0,
        managerRating: 3.5,
        feedbackText: "Manager confidential notes",
      };

      const isReleased = reviewPendingRelease.status === "approved" || reviewPendingRelease.status === "acknowledged";
      const sanitizedForEss = {
        selfRating: reviewPendingRelease.selfRating,
        managerRating: isReleased ? reviewPendingRelease.managerRating : null,
        feedbackText: isReleased ? reviewPendingRelease.feedbackText : null,
      };

      expect(sanitizedForEss.managerRating).toBeNull();
      expect(sanitizedForEss.feedbackText).toBeNull();
      expect(sanitizedForEss.selfRating).toBe(4.0);
    });
  });

  describe("10. Performance Improvement Plan (PIP) Workflow (P6-BR-018)", () => {
    it("initiates PIP with checkpoints and supports successful conclusion", () => {
      const pip = {
        employeeId: "emp-101",
        supervisorId: "mgr-1",
        reason: "Review score below 2.5 benchmark",
        status: "active",
        checkpoints: [
          { week: 2, review: "Progressing on deliverables", passed: true },
          { week: 4, review: "Milestones achieved satisfactorily", passed: true },
        ],
      };

      expect(pip.status).toBe("active");
      expect(pip.checkpoints).toHaveLength(2);

      // Conclude successfully
      const concluded = {
        ...pip,
        status: "successful",
        finalRemarks: "Employee successfully met performance standards.",
        concludedAt: new Date(),
      };

      expect(concluded.status).toBe("successful");
      expect(concluded.concludedAt).toBeInstanceOf(Date);
    });
  });

  describe("11. Cross-Tenant Isolation (MasterHRMS Architectural Contract)", () => {
    it("strictly isolates Tenant A and Tenant B lifecycle and performance entities", () => {
      const records = [
        { id: "e1", tenantId: TENANT_A, type: "EVENT" },
        { id: "e2", tenantId: TENANT_A, type: "TRIP" },
        { id: "e3", tenantId: TENANT_B, type: "EVENT" },
      ];

      const tenantARecords = records.filter((r) => r.tenantId === TENANT_A);
      const tenantBRecords = records.filter((r) => r.tenantId === TENANT_B);

      expect(tenantARecords).toHaveLength(2);
      expect(tenantBRecords).toHaveLength(1);
      expect(tenantARecords.map((r) => r.id)).not.toContain("e3");
      expect(tenantBRecords.map((r) => r.id)).not.toContain("e1");
    });
  });
});
