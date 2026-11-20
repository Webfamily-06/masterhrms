import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";

test("MASTERHRMS — Recruitment, Training & Performance Verification Suite", async (t) => {
  const ts = Date.now();
  const tenantId = `test-rec-${ts}`;
  let deptId = "";
  let empId = "";
  let jobId = "";
  let candidateId = "";

  const cleanup = async () => {
    try {
      await rawPrisma.performanceIndicator.deleteMany({ where: { tenantId } });
      await rawPrisma.indicatorCategory.deleteMany({ where: { tenantId } });
      await rawPrisma.courseEnrollment.deleteMany({ where: { tenantId } });
      await rawPrisma.courseModule.deleteMany({ where: { course: { tenantId } } });
      await rawPrisma.trainingCourse.deleteMany({ where: { tenantId } });
      await rawPrisma.jobCandidateInterview.deleteMany({ where: { candidate: { tenantId } } });
      await rawPrisma.jobCandidate.deleteMany({ where: { tenantId } });
      await rawPrisma.jobPosting.deleteMany({ where: { tenantId } });
      await rawPrisma.department.deleteMany({ where: { tenantId } });
      await rawPrisma.employee.deleteMany({ where: { tenantId } });
      await rawPrisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch {
      // Best-effort cleanup
    }
  };

  await t.test("Setup: Create Test Tenant, Department and Employee", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: { id: tenantId, name: "Talent & Growth Corp", slug: `talent-${ts}`, currency: "INR" },
    });

    const dept = await rawPrisma.department.create({
      data: { tenantId, name: "Engineering & Innovation" },
    });
    deptId = dept.id;

    const emp = await rawPrisma.employee.create({
      data: {
        tenantId,
        firstName: "Sneha",
        lastName: "Iyer",
        employeeCode: `EMP-TAL-${ts}`,
        email: `sneha-${ts}@talent.test`,
        status: "active",
        position: "Technical Talent Acquisition Lead",
        departmentId: deptId,
      },
    });
    empId = emp.id;
    assert.ok(empId, "Employee fixture must exist");
  });

  await t.test("FN-050 & ADDON-094: Job Opening Requisition & Career Portal Publishing", async () => {
    const job = await rawPrisma.jobPosting.create({
      data: {
        tenantId,
        departmentId: deptId,
        title: "Staff Security Architect",
        slug: `staff-security-architect-${ts}`,
        description: "Lead zero-trust architecture, cloud security posture management, and compliance",
        status: "active",
        openingsCount: 2,
        experienceLevel: "Senior Staff",
        location: "Bengaluru, Hybrid",
      },
    });
    jobId = job.id;
    assert.ok(jobId, "Job Posting must be created");
    assert.equal(job.status, "active");
    assert.equal(job.openingsCount, 2);
  });

  await t.test("FN-051: Candidate Pipeline & Stage Transition Workflow", async () => {
    // 1. Candidate Application (stage: applied)
    const candidate = await rawPrisma.jobCandidate.create({
      data: {
        tenantId,
        jobPostingId: jobId,
        fullName: "Rahul Varma",
        email: `rahul-${ts}@candidate.test`,
        phone: "+91 91234 56789",
        yearsOfExperience: 9.5,
        stage: "applied",
        expectedSalary: 4200000,
      },
    });
    candidateId = candidate.id;
    assert.ok(candidateId);
    assert.equal(candidate.stage, "applied");

    // 2. Screening Stage
    const screened = await rawPrisma.jobCandidate.update({
      where: { id: candidateId },
      data: { stage: "screening", rating: 4.5 },
    });
    assert.equal(screened.stage, "screening");

    // 3. Technical Interview Stage
    const interviewed = await rawPrisma.jobCandidate.update({
      where: { id: candidateId },
      data: {
        stage: "interview",
        interviewerNotes: "Strong background in Kubernetes security and cryptography",
      },
    });
    assert.equal(interviewed.stage, "interview");

    // 4. Offer Stage & Hired
    const hired = await rawPrisma.jobCandidate.update({
      where: { id: candidateId },
      data: { stage: "hired", isConvertedToEmployee: true },
    });
    assert.equal(hired.stage, "hired");
    assert.equal(hired.isConvertedToEmployee, true);
  });

  await t.test("FN-052 & ADDON-098: Training Course Catalog & Curriculum Definition", async () => {
    const course = await rawPrisma.trainingCourse.create({
      data: {
        tenantId,
        title: "Enterprise Zero-Trust & SOC2 Compliance",
        slug: `soc2-compliance-${ts}`,
        category: "Information Security",
        instructor: "Security & Governance Team",
        durationHours: 6.0,
        isMandatory: true,
        passingScore: 85,
        status: "published",
        description: "Mandatory annual certification covering GDPR, DPDP Act, and Access Management",
        modules: {
          create: [
            {
              title: "Module 1: Password Hygiene & Phishing Defense",
              content: "Identifying targeted spear-phishing attacks and multi-factor authentication",
              durationMinutes: 45,
              orderIndex: 1,
            },
            {
              title: "Module 2: Data Handling & Encryption-in-Transit",
              content: "Protecting employee PII and customer sensitive financial data",
              durationMinutes: 60,
              orderIndex: 2,
            },
          ],
        },
      },
      include: { modules: true },
    });

    assert.ok(course.id);
    assert.equal(course.modules.length, 2);
    assert.equal(course.isMandatory, true);
  });

  await t.test("FN-053: Employee Training Enrollment & Certification Progress", async () => {
    const course = await rawPrisma.trainingCourse.findFirst({ where: { tenantId } });
    assert.ok(course);

    const enrollment = await rawPrisma.courseEnrollment.create({
      data: {
        tenantId,
        courseId: course.id,
        employeeId: empId,
        status: "completed",
        progressPercent: 100,
        score: 95,
      },
    });

    assert.ok(enrollment.id);
    assert.equal(enrollment.status, "completed");
    assert.equal(enrollment.score, 95);
    assert.ok(enrollment.score >= course.passingScore, "Score must meet passing score threshold");
  });

  await t.test("ADDON-096: Performance Management & Appraisal Indicators", async () => {
    const category = await rawPrisma.indicatorCategory.create({
      data: {
        tenantId,
        name: "Technical Leadership & System Design",
        code: `CAT-TECH-${ts}`,
      },
    });

    const indicator = await rawPrisma.performanceIndicator.create({
      data: {
        tenantId,
        categoryId: category.id,
        name: "Zero Downtime Deployments & High Availability",
        code: `HA-DEP-${ts}`,
        weight: 25.0,
        description: "Architecting cloud systems with 99.99% uptime SLA",
      },
    });

    assert.ok(indicator.id);
    assert.equal(Number(indicator.weight), 25.0);
  });

  await t.test("Teardown: Clean Fixtures", async () => {
    await cleanup();
  });
});
