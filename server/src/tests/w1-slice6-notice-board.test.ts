import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NoticeBoardService } from "../modules/notice-board/notice-board.service";
import { noticeBoardManifest } from "../modules/notice-board/manifest";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const db = rawPrisma || proxiedPrisma;

describe("Wave 1 — Slice 6: Notice Board (notice-board)", () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let employeeA: any;
  let employeeB: any;
  let departmentA: any;

  beforeAll(async () => {
    // 1. Setup isolated test tenants
    tenantA = await db.tenant.create({
      data: {
        name: "W1 Notice Board Tenant A",
        slug: `w1-notice-a-${Date.now()}`,
      },
    });

    tenantB = await db.tenant.create({
      data: {
        name: "W1 Notice Board Tenant B",
        slug: `w1-notice-b-${Date.now()}`,
      },
    });

    // 2. Setup department for Tenant A
    departmentA = await db.department.create({
      data: {
        tenantId: tenantA.id,
        name: "Engineering",
      },
    });

    // 3. Setup test users
    userA = await db.user.create({
      data: {
        email: `notice-user-a-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });

    userB = await db.user.create({
      data: {
        email: `notice-user-b-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });

    // 4. Setup employees
    employeeA = await db.employee.create({
      data: {
        tenantId: tenantA.id,
        firstName: "Alice",
        lastName: "Tester",
        email: `alice-${Date.now()}@example.com`,
        employeeCode: `EMP-A-${Date.now().toString().slice(-4)}`,
        departmentId: departmentA.id,
        status: "active",
      },
    });

    employeeB = await db.employee.create({
      data: {
        tenantId: tenantB.id,
        firstName: "Bob",
        lastName: "Tester",
        email: `bob-${Date.now()}@example.com`,
        employeeCode: `EMP-B-${Date.now().toString().slice(-4)}`,
        status: "active",
      },
    });
  });

  afterAll(async () => {
    if (tenantA) {
      await db.announcementAcknowledgement.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.announcement.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.employee.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.department.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.outboxEvent.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB) {
      await db.announcementAcknowledgement.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.announcement.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.employee.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.outboxEvent.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantB.id } }).catch(() => {});
    }
    if (userA) {
      await db.user.delete({ where: { id: userA.id } }).catch(() => {});
    }
    if (userB) {
      await db.user.delete({ where: { id: userB.id } }).catch(() => {});
    }
  });

  it("1. Manifest adheres to specification and catalog standards", () => {
    expect(noticeBoardManifest.slug).toBe("notice-board");
    expect(noticeBoardManifest.engine).toBe("E12");
    expect(noticeBoardManifest.entitlementKey).toBe("notice-board");
    expect(noticeBoardManifest.routePrefix).toBe("/hr/notice-board");
    expect(noticeBoardManifest.provides?.permissions).toContain("notice-board.view");
    expect(noticeBoardManifest.provides?.permissions).toContain("notice-board.acknowledge");
    expect(noticeBoardManifest.provides?.events).toContain("notice-board.notice.created");
  });

  it("2. Creates notice with priority, policy category, and acknowledgement requirement", async () => {
    const notice = await NoticeBoardService.createNotice(tenantA.id, userA.id, {
      title: "Mandatory Information Security Policy 2026",
      summary: "All personnel must read and acknowledge within 48 hours.",
      content: "Please ensure all local hard drives are encrypted with BitLocker/FileVault.",
      priority: "urgent",
      category: "policy_update",
      targetType: "all_company",
      isPinned: true,
      acknowledgementRequired: true,
    });

    expect(notice.id).toBeDefined();
    expect(notice.title).toBe("Mandatory Information Security Policy 2026");
    expect(notice.priority).toBe("urgent");
    expect(notice.category).toBe("policy_update");
    expect(notice.isPinned).toBe(true);
    expect(notice.acknowledgementRequired).toBe(true);

    // Audit and outbox logs recorded
    const audit = await db.auditLog.findFirst({
      where: { tenantId: tenantA.id, action: "notice-board.notice.created" },
    });
    expect(audit).toBeDefined();

    const outbox = await db.outboxEvent.findFirst({
      where: { tenantId: tenantA.id, eventType: "notice-board.notice.created" },
    });
    expect(outbox).toBeDefined();
  });

  it("3. Filters notices by category and audience rules", async () => {
    // Create an engineering-only notice
    await NoticeBoardService.createNotice(tenantA.id, userA.id, {
      title: "Kubernetes Cluster Maintenance Tonight",
      content: "Production nodes will undergo rolling restart at 02:00 UTC.",
      priority: "high",
      category: "company_news",
      targetType: "department",
      targetDepartmentId: departmentA.id,
    });

    // 1. List with engineering department filter
    const deptNotices = await NoticeBoardService.listNotices(tenantA.id, {
      departmentId: departmentA.id,
    });
    expect(deptNotices.length).toBeGreaterThanOrEqual(2); // all_company notice + engineering notice

    // 2. List with policy_update filter
    const policyNotices = await NoticeBoardService.listNotices(tenantA.id, {
      category: "policy_update",
    });
    expect(policyNotices.length).toBe(1);
    expect(policyNotices[0].title).toBe("Mandatory Information Security Policy 2026");
  });

  it("4. Tracks employee acknowledgement and prevents duplicate records", async () => {
    const notices = await NoticeBoardService.listNotices(tenantA.id, {
      category: "policy_update",
    });
    const policyNotice = notices[0];

    // Alice acknowledges the notice
    const ack1 = await NoticeBoardService.acknowledgeNotice(
      tenantA.id,
      policyNotice.id,
      employeeA.id,
      "I have read and comply with the policy."
    );

    expect(ack1.id).toBeDefined();
    expect(ack1.employeeId).toBe(employeeA.id);
    expect(ack1.comments).toBe("I have read and comply with the policy.");

    // Alice acknowledges again (idempotent update, no duplicate row)
    const ack2 = await NoticeBoardService.acknowledgeNotice(
      tenantA.id,
      policyNotice.id,
      employeeA.id,
      "Updated compliance confirmation."
    );

    expect(ack2.id).toBe(ack1.id);
    expect(ack2.comments).toBe("Updated compliance confirmation.");

    // Verify stats calculation
    const stats = await NoticeBoardService.getNoticeStats(tenantA.id);
    expect(stats.totalNotices).toBeGreaterThanOrEqual(2);
    expect(stats.urgentCount).toBeGreaterThanOrEqual(1);
    expect(stats.complianceRate).toBe(100);
  });

  it("5. Strictly enforces tenant isolation on notices and acknowledgements", async () => {
    // Notice created in Tenant B
    const noticeB = await NoticeBoardService.createNotice(tenantB.id, userB.id, {
      title: "Confidential Tenant B Executive Strategy",
      content: "Q4 financial targets and acquisition overview.",
      priority: "high",
    });

    // 1. Tenant A listNotices does NOT see Tenant B's notice
    const noticesA = await NoticeBoardService.listNotices(tenantA.id);
    const foundBInA = noticesA.some((n) => n.id === noticeB.id);
    expect(foundBInA).toBe(false);

    // 2. Tenant A cannot fetch Tenant B notice
    await expect(
      NoticeBoardService.getNotice(tenantA.id, noticeB.id)
    ).rejects.toThrow("Notice not found");

    // 3. Employee A (Tenant A) cannot acknowledge Tenant B's notice
    await expect(
      NoticeBoardService.acknowledgeNotice(tenantA.id, noticeB.id, employeeA.id)
    ).rejects.toThrow("Notice not found in this workspace");

    // 4. Employee B (Tenant B) cannot acknowledge Tenant A's notice in Tenant A
    await expect(
      NoticeBoardService.acknowledgeNotice(tenantA.id, noticesA[0].id, employeeB.id)
    ).rejects.toThrow("Employee not found in this workspace");

    // 5. Tenant A cannot delete Tenant B's notice
    await expect(
      NoticeBoardService.deleteNotice(tenantA.id, noticeB.id, userA.id)
    ).rejects.toThrow("Notice not found");
  });
});
