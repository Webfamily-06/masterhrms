import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { rawPrisma as prisma } from "../prisma";

describe("MASTERHRMS - Company Announcements Module Complete Test Suite", () => {
  const testTenantA = "tenant-announcement-test-a";
  const testTenantB = "tenant-announcement-test-b";

  let deptA1Id: string;
  let deptA2Id: string;
  let branchA1Id: string;
  let empA1Id: string;
  let empA2Id: string;
  let empB1Id: string;
  let userA1Id: string;
  let userA2Id: string;
  let userB1Id: string;

  before(async () => {
    // Clean up any existing test records
    await prisma.announcementAcknowledgement.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.announcementView.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.announcement.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.announcementCategory.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.employee.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.department.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.branch.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "anno.emp1@test-a.com",
            "anno.emp2@test-a.com",
            "anno.emp1@test-b.com",
          ],
        },
      },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantA, testTenantB] } },
    });

    // Create test tenants
    await prisma.tenant.createMany({
      data: [
        { id: testTenantA, name: "Announcement Corp A", slug: "anno-corp-a" },
        { id: testTenantB, name: "Announcement Corp B", slug: "anno-corp-b" },
      ],
    });

    // Create users
    const userA1 = await prisma.user.create({
      data: { email: "anno.emp1@test-a.com", passwordHash: "dummyhash" },
    });
    userA1Id = userA1.id;

    const userA2 = await prisma.user.create({
      data: { email: "anno.emp2@test-a.com", passwordHash: "dummyhash" },
    });
    userA2Id = userA2.id;

    const userB1 = await prisma.user.create({
      data: { email: "anno.emp1@test-b.com", passwordHash: "dummyhash" },
    });
    userB1Id = userB1.id;

    // Create departments in Tenant A
    const deptA1 = await prisma.department.create({
      data: { tenantId: testTenantA, name: "Engineering" },
    });
    deptA1Id = deptA1.id;

    const deptA2 = await prisma.department.create({
      data: { tenantId: testTenantA, name: "Human Resources" },
    });
    deptA2Id = deptA2.id;

    // Create branch in Tenant A
    const branchA1 = await prisma.branch.create({
      data: { tenantId: testTenantA, name: "HQ Mumbai" },
    });
    branchA1Id = branchA1.id;

    // Create employees
    const empA1 = await prisma.employee.create({
      data: {
        tenantId: testTenantA,
        userId: userA1Id,
        firstName: "Alice",
        lastName: "Smith",
        email: "anno.emp1@test-a.com",
        employeeCode: "EMP-ANNO-A1",
        departmentId: deptA1Id,
        branchId: branchA1Id,
        status: "active",
      },
    });
    empA1Id = empA1.id;

    const empA2 = await prisma.employee.create({
      data: {
        tenantId: testTenantA,
        userId: userA2Id,
        firstName: "Bob",
        lastName: "Jones",
        email: "anno.emp2@test-a.com",
        employeeCode: "EMP-ANNO-A2",
        departmentId: deptA2Id,
        status: "active",
      },
    });
    empA2Id = empA2.id;

    const empB1 = await prisma.employee.create({
      data: {
        tenantId: testTenantB,
        userId: userB1Id,
        firstName: "Charlie",
        lastName: "Brown",
        email: "anno.emp1@test-b.com",
        employeeCode: "EMP-ANNO-B1",
        status: "active",
      },
    });
    empB1Id = empB1.id;
  });

  after(async () => {
    // Cleanup
    await prisma.announcementAcknowledgement.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.announcementView.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.announcement.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.announcementCategory.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.employee.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.department.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.branch.deleteMany({
      where: { tenantId: { in: [testTenantA, testTenantB] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "anno.emp1@test-a.com",
            "anno.emp2@test-a.com",
            "anno.emp1@test-b.com",
          ],
        },
      },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantA, testTenantB] } },
    });
  });

  // =========================================================================
  // 1. CATEGORY MANAGEMENT CRUD
  // =========================================================================
  describe("1. Announcement Category CRUD", () => {
    let createdCatId: string;

    it("creates a new announcement category with tenant scoping", async () => {
      const cat = await prisma.announcementCategory.create({
        data: {
          tenantId: testTenantA,
          name: "Product Releases",
          slug: "product_releases",
          description: "New feature releases and roadmap highlights",
          color: "#3B82F6",
          icon: "ph-rocket",
          displayOrder: 1,
          isActive: true,
        },
      });

      assert.ok(cat.id);
      assert.equal(cat.tenantId, testTenantA);
      assert.equal(cat.name, "Product Releases");
      assert.equal(cat.slug, "product_releases");
      createdCatId = cat.id;
    });

    it("enforces tenant-scoped unique name and slug constraint", async () => {
      await assert.rejects(
        async () => {
          await prisma.announcementCategory.create({
            data: {
              tenantId: testTenantA,
              name: "Product Releases", // duplicate in tenant A
              slug: "product_releases_duplicate",
            },
          });
        },
        /Unique constraint failed/
      );
    });

    it("allows the same category name in a different tenant (tenant isolation)", async () => {
      const catB = await prisma.announcementCategory.create({
        data: {
          tenantId: testTenantB,
          name: "Product Releases", // same name in tenant B
          slug: "product_releases",
        },
      });
      assert.ok(catB.id);
      assert.equal(catB.tenantId, testTenantB);
    });

    it("updates an existing category", async () => {
      const updated = await prisma.announcementCategory.update({
        where: { id: createdCatId },
        data: {
          name: "Product & Engineering Releases",
          color: "#10B981",
        },
      });
      assert.equal(updated.name, "Product & Engineering Releases");
      assert.equal(updated.color, "#10B981");
    });
  });

  // =========================================================================
  // 2. ANNOUNCEMENT LIFECYCLE & CRUD
  // =========================================================================
  describe("2. Announcement Lifecycle, Creation & Scheduling", () => {
    let announcementId: string;

    it("creates an announcement with draft status", async () => {
      const draft = await prisma.announcement.create({
        data: {
          tenantId: testTenantA,
          title: "Internal Engineering Hackathon Q1",
          summary: "Upcoming 48-hour hackathon for the engineering team.",
          content: "### Hackathon Guidelines\n\nRegister your teams by Friday.",
          category: "event",
          priority: "high",
          status: "draft",
          targetType: "department",
          targetDepartmentId: deptA1Id,
          publishDate: new Date(),
        },
      });

      assert.ok(draft.id);
      assert.equal(draft.status, "draft");
      assert.equal(draft.targetType, "department");
      assert.equal(draft.targetDepartmentId, deptA1Id);
      announcementId = draft.id;
    });

    it("updates announcement to published and requires policy signature", async () => {
      const published = await prisma.announcement.update({
        where: { id: announcementId },
        data: {
          status: "published",
          acknowledgementRequired: true,
          isPinned: true,
        },
      });

      assert.equal(published.status, "published");
      assert.equal(published.acknowledgementRequired, true);
      assert.equal(published.isPinned, true);
    });

    it("correctly handles scheduled lifecycle transition when publishDate is reached", async () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const scheduledNotice = await prisma.announcement.create({
        data: {
          tenantId: testTenantA,
          title: "Scheduled Office Relocation Notice",
          content: "Office moving details.",
          category: "company_news",
          status: "scheduled",
          publishDate: pastDate,
        },
      });

      // Execute lifecycle sync
      const now = new Date();
      await prisma.announcement.updateMany({
        where: {
          tenantId: testTenantA,
          status: "scheduled",
          publishDate: { lte: now },
        },
        data: { status: "published" },
      });

      const synced = await prisma.announcement.findUnique({
        where: { id: scheduledNotice.id },
      });
      assert.equal(synced?.status, "published");
    });
  });

  // =========================================================================
  // 3. AUDIENCE TARGETING & TENANT ISOLATION
  // =========================================================================
  describe("3. Audience Targeting & Tenant Isolation", () => {
    let companyWideId: string;
    let deptTargetedId: string;
    let branchTargetedId: string;

    before(async () => {
      const c = await prisma.announcement.create({
        data: {
          tenantId: testTenantA,
          title: "Company-Wide Benefits 2026",
          content: "Annual benefits summary.",
          category: "company_news",
          targetType: "all_company",
          status: "published",
        },
      });
      companyWideId = c.id;

      const d = await prisma.announcement.create({
        data: {
          tenantId: testTenantA,
          title: "Engineering Architecture Review",
          content: "Backend refactoring notice.",
          category: "company_news",
          targetType: "department",
          targetDepartmentId: deptA1Id,
          status: "published",
        },
      });
      deptTargetedId = d.id;

      const b = await prisma.announcement.create({
        data: {
          tenantId: testTenantA,
          title: "HQ Mumbai Office Maintenance",
          content: "Elevator servicing schedule.",
          category: "holiday",
          targetType: "branch",
          targetBranchId: branchA1Id,
          status: "published",
        },
      });
      branchTargetedId = b.id;
    });

    it("Alice (Engineering + HQ Mumbai) sees Company-Wide, Engineering, and HQ Mumbai announcements", async () => {
      const aliceAnnouncements = await prisma.announcement.findMany({
        where: {
          tenantId: testTenantA,
          status: "published",
          OR: [
            { targetType: "all_company" },
            { targetType: "department", targetDepartmentId: deptA1Id },
            { targetType: "branch", targetBranchId: branchA1Id },
          ],
        },
      });

      const ids = aliceAnnouncements.map((a) => a.id);
      assert.ok(ids.includes(companyWideId));
      assert.ok(ids.includes(deptTargetedId));
      assert.ok(ids.includes(branchTargetedId));
    });

    it("Bob (HR + No Branch) sees Company-Wide but NOT Engineering or HQ Mumbai announcements", async () => {
      const bobAnnouncements = await prisma.announcement.findMany({
        where: {
          tenantId: testTenantA,
          status: "published",
          OR: [
            { targetType: "all_company" },
            { targetType: "department", targetDepartmentId: deptA2Id },
          ],
        },
      });

      const ids = bobAnnouncements.map((a) => a.id);
      assert.ok(ids.includes(companyWideId));
      assert.ok(!ids.includes(deptTargetedId), "Bob should not see Engineering notice");
      assert.ok(!ids.includes(branchTargetedId), "Bob should not see Branch notice");
    });

    it("Charlie (Tenant B) sees zero announcements from Tenant A (strict tenant isolation)", async () => {
      const charlieAnnouncements = await prisma.announcement.findMany({
        where: {
          tenantId: testTenantB,
          status: "published",
        },
      });

      const tenantAIds = [companyWideId, deptTargetedId, branchTargetedId];
      charlieAnnouncements.forEach((a) => {
        assert.ok(!tenantAIds.includes(a.id), "Tenant B must never see Tenant A records");
      });
    });
  });

  // =========================================================================
  // 4. ENGAGEMENT TRACKING & POLICY SIGNATURES
  // =========================================================================
  describe("4. Engagement Tracking, Views & Policy Acknowledgements", () => {
    let policyNoticeId: string;

    before(async () => {
      const p = await prisma.announcement.create({
        data: {
          tenantId: testTenantA,
          title: "Mandatory Clean Desk & Information Security Policy",
          content: "Please read and acknowledge.",
          category: "policy_update",
          priority: "urgent",
          targetType: "all_company",
          status: "published",
          acknowledgementRequired: true,
        },
      });
      policyNoticeId = p.id;
    });

    it("records a unique employee view in announcement_views", async () => {
      const view = await prisma.announcementView.create({
        data: {
          tenantId: testTenantA,
          announcementId: policyNoticeId,
          employeeId: empA1Id,
          viewCount: 1,
        },
      });

      assert.ok(view.id);
      assert.equal(view.employeeId, empA1Id);
      assert.equal(view.viewCount, 1);

      // Increment announcement global viewCount
      await prisma.announcement.update({
        where: { id: policyNoticeId },
        data: { viewCount: { increment: 1 } },
      });
    });

    it("handles repeat views by incrementing viewCount without duplicate unique rows", async () => {
      const updatedView = await prisma.announcementView.upsert({
        where: {
          announcementId_employeeId: {
            announcementId: policyNoticeId,
            employeeId: empA1Id,
          },
        },
        create: {
          tenantId: testTenantA,
          announcementId: policyNoticeId,
          employeeId: empA1Id,
          viewCount: 1,
        },
        update: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date(),
        },
      });

      assert.equal(updatedView.viewCount, 2);

      const totalUniqueViews = await prisma.announcementView.count({
        where: { announcementId: policyNoticeId },
      });
      assert.equal(totalUniqueViews, 1, "Must maintain exactly 1 unique viewer record");
    });

    it("records employee policy acknowledgement / digital compliance signature", async () => {
      const ack = await prisma.announcementAcknowledgement.create({
        data: {
          tenantId: testTenantA,
          announcementId: policyNoticeId,
          employeeId: empA1Id,
          comments: "I have read and agree to comply with this policy.",
        },
      });

      assert.ok(ack.id);
      assert.equal(ack.employeeId, empA1Id);
      assert.ok(ack.acknowledgedAt);
    });

    it("prevents duplicate policy acknowledgement (idempotency)", async () => {
      await assert.rejects(
        async () => {
          await prisma.announcementAcknowledgement.create({
            data: {
              tenantId: testTenantA,
              announcementId: policyNoticeId,
              employeeId: empA1Id,
            },
          });
        },
        /Unique constraint failed/
      );
    });

    it("computes accurate analytics rates (view rate, acknowledgement rate)", async () => {
      const totalEligible = await prisma.employee.count({
        where: { tenantId: testTenantA, status: "active" },
      });
      assert.equal(totalEligible, 2, "Tenant A has 2 active employees");

      const uniqueViews = await prisma.announcementView.count({
        where: { announcementId: policyNoticeId },
      });
      assert.equal(uniqueViews, 1);

      const acks = await prisma.announcementAcknowledgement.count({
        where: { announcementId: policyNoticeId },
      });
      assert.equal(acks, 1);

      const viewRate = Math.round((uniqueViews / totalEligible) * 100);
      const ackRate = Math.round((acks / totalEligible) * 100);

      assert.equal(viewRate, 50, "1 of 2 employees viewed (50%)");
      assert.equal(ackRate, 50, "1 of 2 employees acknowledged (50%)");
    });
  });

  // =========================================================================
  // 5. BULK OPERATIONS
  // =========================================================================
  describe("5. Bulk Operations", () => {
    let bulk1Id: string;
    let bulk2Id: string;

    before(async () => {
      const b1 = await prisma.announcement.create({
        data: {
          tenantId: testTenantA,
          title: "Bulk Test Notice 1",
          content: "Content 1",
          status: "draft",
        },
      });
      bulk1Id = b1.id;

      const b2 = await prisma.announcement.create({
        data: {
          tenantId: testTenantA,
          title: "Bulk Test Notice 2",
          content: "Content 2",
          status: "draft",
        },
      });
      bulk2Id = b2.id;
    });

    it("bulk publishes multiple announcements", async () => {
      const ids = [bulk1Id, bulk2Id];
      await prisma.announcement.updateMany({
        where: { tenantId: testTenantA, id: { in: ids } },
        data: { status: "published", publishDate: new Date() },
      });

      const updated = await prisma.announcement.findMany({
        where: { id: { in: ids } },
      });
      assert.equal(updated.length, 2);
      assert.equal(updated[0].status, "published");
      assert.equal(updated[1].status, "published");
    });

    it("bulk archives multiple announcements", async () => {
      const ids = [bulk1Id, bulk2Id];
      await prisma.announcement.updateMany({
        where: { tenantId: testTenantA, id: { in: ids } },
        data: { status: "archived" },
      });

      const updated = await prisma.announcement.findMany({
        where: { id: { in: ids } },
      });
      assert.equal(updated[0].status, "archived");
      assert.equal(updated[1].status, "archived");
    });
  });
});
