import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { runWithTenantContext } from "../context/tenant-context";
import { RestaurantMenuService } from "../services/restaurant-menu.service";
import { GoogleLeadsService } from "../services/google-leads.service";
import { JobBoardService } from "../services/job-board.service";
import { LmsService } from "../services/lms.service";
import { EbookService } from "../services/ebook.service";
import { RoadmapCentralService } from "../services/roadmap-central.service";
import { RequestManagementService } from "../services/request-management.service";
import { SidebarMenuService } from "../services/sidebar-menu.service";

test("MASTERHRMS — WorkDo Reference Modules Wave 5 Verification Suite (Milestone 7.8 Final)", async (t) => {
  const ts = Date.now();
  const testTenantId = `tenant-w5-${ts}`;
  const otherTenantId = `tenant-w5-iso-${ts}`;
  const userId = `usr-w5-${ts}`;
  const otherUserId = `usr-w5-iso-${ts}`;
  const empId = `emp-w5-${ts}`;
  const otherEmpId = `emp-w5-iso-${ts}`;
  const deptId = `dept-w5-${ts}`;

  const withTenant = <T>(tenantId: string, fn: () => Promise<T>): Promise<T> => {
    return runWithTenantContext(
      {
        tenantId,
        userId,
        roles: ["admin"],
        status: "ACTIVE",
        tenancyStrategy: "SHARED_SCHEMA",
        db: rawPrisma as any,
      },
      fn
    );
  };

  const cleanup = async () => {
    try {
      await rawPrisma.courseEnrollment.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.trainingCourse.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.jobCandidate.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.jobPosting.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.crmContact.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.setting.deleteMany({
        where: { scopeId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.employee.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.department.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.user.deleteMany({
        where: { id: { in: [userId, otherUserId] } },
      }).catch(() => {});
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  };

  // Pre-test setup
  await cleanup();

  await rawPrisma.tenant.create({
    data: {
      id: testTenantId,
      name: `Wave 5 Test Tenant ${ts}`,
      slug: `wave-5-tenant-${ts}`,
    },
  });

  await rawPrisma.tenant.create({
    data: {
      id: otherTenantId,
      name: `Wave 5 Isolation Tenant ${ts}`,
      slug: `wave-5-iso-${ts}`,
    },
  });

  await rawPrisma.user.create({
    data: {
      id: userId,
      email: `admin-w5-${ts}@masterhrms.test`,
      passwordHash: "$2b$10$hashedpasswordforwave5verificationtest",
    },
  });

  await rawPrisma.user.create({
    data: {
      id: otherUserId,
      email: `admin-iso-w5-${ts}@masterhrms.test`,
      passwordHash: "$2b$10$hashedpasswordforwave5verificationtest",
    },
  });

  await rawPrisma.department.create({
    data: {
      id: deptId,
      tenantId: testTenantId,
      name: "Product & Engineering",
    },
  });

  await rawPrisma.employee.create({
    data: {
      id: empId,
      tenantId: testTenantId,
      employeeCode: `EMP-W5-${ts.toString().slice(-4)}`,
      firstName: "Alexander",
      lastName: "Wright",
      email: `alex.wright-${ts}@masterhrms.test`,
      departmentId: deptId,
      position: "Lead Architect",
    },
  });

  await rawPrisma.employee.create({
    data: {
      id: otherEmpId,
      tenantId: otherTenantId,
      employeeCode: `EMP-ISO-${ts.toString().slice(-4)}`,
      firstName: "Diana",
      lastName: "Prince",
      email: `diana.prince-${ts}@masterhrms.test`,
      position: "External Auditor",
    },
  });

  t.after(async () => {
    await cleanup();
  });

  // ==========================================
  // 1. ADDON-051: Restaurant Menu
  // ==========================================
  await t.test("ADDON-051: Restaurant Menu Service — Catalog, Categories, Dietary Badges, Availability & QR Generation", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Initial menu catalog retrieval
      const menu = await RestaurantMenuService.getMenu(testTenantId);
      assert.ok(menu);
      assert.equal(menu.tenantId, testTenantId);
      assert.ok(menu.categories.length >= 4);

      // 2. Add custom category
      const chefCategory = await RestaurantMenuService.addCategory(testTenantId, {
        name: "Chef's Tasting Specials",
        sortOrder: 10,
        icon: "ChefHat",
      });
      assert.equal(chefCategory.name, "Chef's Tasting Specials");
      assert.equal(chefCategory.sortOrder, 10);

      // 3. Add menu item with dietary badges
      const item = await RestaurantMenuService.addItem(testTenantId, chefCategory.id, {
        name: "Wild Mushroom & Truffle Risotto",
        description: "Arborio rice infused with black truffle oil and porcini broth",
        price: 28.5,
        dietaryBadges: ["Vegetarian", "Gluten-Free"],
        isAvailable: true,
        preparationTimeMinutes: 20,
      });
      assert.equal(item.name, "Wild Mushroom & Truffle Risotto");
      assert.equal(item.price, 28.5);
      assert.deepEqual(item.dietaryBadges, ["Vegetarian", "Gluten-Free"]);
      assert.equal(item.isAvailable, true);

      // 4. Toggle item availability
      const updatedItem = await RestaurantMenuService.toggleAvailability(testTenantId, item.id, false);
      assert.equal(updatedItem.isAvailable, false);

      const reAvailable = await RestaurantMenuService.toggleAvailability(testTenantId, item.id, true);
      assert.equal(reAvailable.isAvailable, true);

      // 5. Generate digital QR menu payload
      const qrData = await RestaurantMenuService.generateQrPayload(testTenantId, "dining.masterhrms.internal");
      assert.ok(qrData.qrPayload.includes(`dining.masterhrms.internal/menu/qr/${testTenantId}`));
      assert.ok(qrData.totalItems >= 1);

      // 6. Multi-tenant isolation: other tenant sees empty or default catalog without custom item
      const otherMenu = await RestaurantMenuService.getMenu(otherTenantId);
      const otherCategories = otherMenu.categories.map((c) => c.name);
      assert.ok(!otherCategories.includes("Chef's Tasting Specials"));
    });
  });

  // ==========================================
  // 2. ADDON-052: Google Leads Integration
  // ==========================================
  await t.test("ADDON-052: Google Leads Service — Webhook Ingestion, CrmContact Auto-Creation & Idempotency", async () => {
    await withTenant(testTenantId, async () => {
      const leadId = `goog-lead-${ts}-001`;
      const formPayload = {
        leadId,
        formId: "form_enterprise_trial_2026",
        campaignId: "campaign_apac_expansion",
        adGroupId: "adgroup_hr_directors",
        userColumnData: {
          fullName: "Evelyn Vance",
          email: `evelyn.vance-${ts}@acme-corp.com`,
          phone: "+1-555-019-2834",
          companyName: "Acme Industrial Technologies",
          city: "San Francisco",
          notes: "Evaluating HRMS replacement for 1,200 employees.",
        },
        utmSource: "google_ads",
        utmCampaign: "apac_expansion",
      };

      // 1. Ingest lead webhook
      const result = await GoogleLeadsService.ingestLead(testTenantId, formPayload);
      assert.equal(result.success, true);
      assert.equal(result.isDuplicate, false);
      assert.ok(result.contactId);
      assert.equal(result.leadId, leadId);

      // 2. Verify CrmContact record in database
      const crmContact = await rawPrisma.crmContact.findUnique({
        where: { id: result.contactId },
      });
      assert.ok(crmContact);
      assert.equal(crmContact.tenantId, testTenantId);
      assert.equal(crmContact.name, "Evelyn Vance");
      assert.equal(crmContact.email, `evelyn.vance-${ts}@acme-corp.com`);
      assert.equal(crmContact.company, "Acme Industrial Technologies");
      assert.equal(crmContact.city, "San Francisco");
      assert.equal(crmContact.role, "Inbound Prospect");
      assert.ok(crmContact.notes?.includes("campaign_apac_expansion"));

      // 3. Webhook idempotency test: duplicate ingestion must return isDuplicate: true and same contactId
      const duplicateResult = await GoogleLeadsService.ingestLead(testTenantId, formPayload);
      assert.equal(duplicateResult.success, true);
      assert.equal(duplicateResult.isDuplicate, true);
      assert.equal(duplicateResult.contactId, result.contactId);

      // 4. Verify lead listing
      const leads = await GoogleLeadsService.listLeads(testTenantId);
      assert.equal(leads.length, 1);
      assert.equal(leads[0].leadId, leadId);

      // 5. Multi-tenant isolation: other tenant has 0 leads
      const otherLeads = await GoogleLeadsService.listLeads(otherTenantId);
      assert.equal(otherLeads.length, 0);
    });
  });

  // ==========================================
  // 3. ADDON-099: Job Search & Candidate Application
  // ==========================================
  await t.test("ADDON-099: Job Board Service — Published Postings, Candidate Ingestion & Stage Progression", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Create published job posting
      const job = await rawPrisma.jobPosting.create({
        data: {
          tenantId: testTenantId,
          departmentId: deptId,
          title: "Principal Cloud Systems Engineer",
          slug: `principal-cloud-systems-engineer-${ts}`,
          description: "Architect high-throughput multi-tenant cloud platforms.",
          requirements: "8+ years in distributed systems, PostgreSQL, Node.js.",
          benefits: "Competitive equity, health coverage, flexible PTO.",
          location: "San Francisco, CA / Remote",
          employmentType: "full_time",
          experienceLevel: "Senior",
          salaryMin: 180000,
          salaryMax: 240000,
          status: "published",
        },
      });
      assert.ok(job.id);

      // 2. Discover published jobs via JobBoardService
      const publishedJobs = await JobBoardService.listPublishedJobs(testTenantId, {
        search: "Cloud Systems",
      });
      assert.ok(publishedJobs.length >= 1);
      assert.equal(publishedJobs[0].id, job.id);

      // 3. Get single job details
      const fetchedJob = await JobBoardService.getJobDetails(testTenantId, job.slug);
      assert.ok(fetchedJob);
      assert.equal(fetchedJob.title, "Principal Cloud Systems Engineer");

      // 4. External candidate submits application
      const candidate = await JobBoardService.submitApplication(testTenantId, job.id, {
        fullName: "Marcus Holloway",
        email: `marcus.holloway-${ts}@dedsec.net`,
        phone: "+1-415-555-8821",
        resumeUrl: "https://storage.masterhrms.com/resumes/marcus_holloway.pdf",
        coverLetter: "Excited to bring extensive distributed systems experience to the platform.",
        portfolioUrl: "https://github.com/mholloway",
        yearsOfExperience: 9,
        expectedSalary: 210000,
      });
      assert.ok(candidate.id);
      assert.equal(candidate.fullName, "Marcus Holloway");
      assert.equal(candidate.stage, "applied");
      assert.equal(Number(candidate.expectedSalary), 210000);

      // 5. Update recruitment stage
      const updatedCandidate = await JobBoardService.updateCandidateStage(testTenantId, candidate.id, "shortlisted");
      assert.equal(updatedCandidate.stage, "shortlisted");

      // 6. List applications for job
      const applications = await JobBoardService.listApplications(testTenantId, job.id);
      assert.equal(applications.length, 1);
      assert.equal(applications[0].fullName, "Marcus Holloway");

      // 7. Multi-tenant isolation: other tenant cannot query this job or application
      const otherJobs = await JobBoardService.listPublishedJobs(otherTenantId);
      assert.equal(otherJobs.length, 0);

      await assert.rejects(
        () => JobBoardService.submitApplication(otherTenantId, job.id, {
          fullName: "Intruder",
          email: "intruder@evil.com",
        }),
        /Job posting not found/
      );
    });
  });

  // ==========================================
  // 4. ADDON-100: LMS / Learning Management System
  // ==========================================
  await t.test("ADDON-100: LMS Service — Course Provisioning, Enrollment, Progress & Certificate Issuance", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Create training course
      const course = await LmsService.createCourse(testTenantId, {
        title: "Enterprise Multi-Tenant Security & SOC2 Compliance",
        category: "Information Security",
        instructor: "Chief Information Security Officer",
        durationHours: 6.0,
        isMandatory: true,
        passingScore: 85,
        description: "Mandatory enterprise training covering data governance, encryption and tenant isolation.",
      });
      assert.ok(course.id);
      assert.equal(course.passingScore, 85);
      assert.equal(course.status, "published");

      // 2. Enroll employee
      const enrollment = await LmsService.enrollEmployee(testTenantId, course.id, empId);
      assert.ok(enrollment.id);
      assert.equal(enrollment.status, "in_progress");
      assert.equal(enrollment.progressPercent, 0);

      // 3. Update intermediate progress
      const progressMid = await LmsService.updateProgress(testTenantId, enrollment.id, 50, 60);
      assert.equal(progressMid.progressPercent, 50);
      assert.equal(progressMid.status, "in_progress");

      // 4. Complete course with passing score 95%
      const progressDone = await LmsService.updateProgress(testTenantId, enrollment.id, 100, 95);
      assert.equal(progressDone.progressPercent, 100);
      assert.equal(progressDone.status, "completed");
      assert.ok(progressDone.certifiedAt);

      // 5. Generate verifiable completion certificate
      const cert = await LmsService.getCertificate(testTenantId, enrollment.id);
      assert.ok(cert.certificateId.startsWith("CERT-"));
      assert.equal(cert.courseTitle, "Enterprise Multi-Tenant Security & SOC2 Compliance");
      assert.equal(cert.recipientName, "Alexander Wright");
      assert.equal(cert.issuer, "MasterHRMS Academy");
      assert.ok(cert.completedAt);

      // 6. Multi-tenant isolation: other tenant cannot access course or enrollments
      await assert.rejects(
        () => LmsService.enrollEmployee(otherTenantId, course.id, otherEmpId),
        /Course not found/
      );
    });
  });

  // ==========================================
  // 5. ADDON-101: eBook Library
  // ==========================================
  await t.test("ADDON-101: eBook Service — Library Ingestion, Categorization, Reading Sessions & Download Tracking", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Add eBooks to library
      const book1 = await EbookService.createBook(testTenantId, {
        title: "Enterprise Architecture Patterns & Distributed Multi-Tenancy",
        author: "Martin Fowler & Core Arch Team",
        category: "Software Architecture",
        description: "In-depth guide to building resilient distributed ERP engines.",
        fileUrl: "https://storage.masterhrms.com/ebooks/enterprise_architecture.pdf",
        fileFormat: "PDF",
        totalPages: 340,
      });
      assert.ok(book1.id);
      assert.equal(book1.totalPages, 340);
      assert.equal(book1.downloadsCount, 0);

      const book2 = await EbookService.createBook(testTenantId, {
        title: "Mastering Financial Accounting for High-Growth SaaS",
        author: "Elena Rostova",
        category: "Finance & Operations",
        fileUrl: "https://storage.masterhrms.com/ebooks/saas_finance.epub",
        fileFormat: "EPUB",
        totalPages: 210,
      });
      assert.ok(book2.id);

      // 2. Filter books by category
      const archBooks = await EbookService.listBooks(testTenantId, "Software Architecture");
      assert.equal(archBooks.length, 1);
      assert.equal(archBooks[0].title, "Enterprise Architecture Patterns & Distributed Multi-Tenancy");

      const allBooks = await EbookService.listBooks(testTenantId);
      assert.equal(allBooks.length, 2);

      // 3. Record reading session progress
      const result = await EbookService.recordProgress(testTenantId, book1.id, empId, 170);
      assert.equal(result.session.lastPageRead, 170);
      assert.equal(result.session.progressPercentage, 50);

      // 4. Increment download counter
      const downloadRes = await EbookService.recordDownload(testTenantId, book1.id);
      assert.equal(downloadRes.downloadsCount, 1);

      // 5. Multi-tenant isolation: other tenant cannot see testTenant's books
      const otherBooks = await EbookService.listBooks(otherTenantId);
      assert.equal(otherBooks.length, 0);

      await assert.rejects(
        () => EbookService.recordDownload(otherTenantId, book1.id),
        /eBook not found/
      );
    });
  });

  // ==========================================
  // 6. ADDON-106: Roadmap Central
  // ==========================================
  await t.test("ADDON-106: Roadmap Central Service — Feature Horizons, Upvoting & Lifecycle Progression", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Create roadmap epic item
      const item = await RoadmapCentralService.createItem(testTenantId, {
        title: "Autonomous Workload Balancing & Predictive Resourcing",
        description: "AI-assisted resource balancing and burn-down prediction for engineering sprints.",
        category: "AI & Optimization",
        horizon: "Q3",
        priority: "HIGH",
      });
      assert.ok(item.id);
      assert.equal(item.horizon, "Q3");
      assert.equal(item.status, "PLANNED");
      assert.equal(item.upvotesCount, 0);

      // 2. Filter roadmap items by horizon
      const q3Items = await RoadmapCentralService.listItems(testTenantId, { horizon: "Q3" });
      assert.equal(q3Items.length, 1);
      assert.equal(q3Items[0].title, "Autonomous Workload Balancing & Predictive Resourcing");

      // 3. Community upvoting: employee upvotes
      const upvoted = await RoadmapCentralService.toggleUpvote(testTenantId, item.id, empId);
      assert.equal(upvoted.upvotesCount, 1);
      assert.ok(upvoted.upvotedBy.includes(empId));

      // 4. Toggle upvote: upvoting again removes the vote
      const unvoted = await RoadmapCentralService.toggleUpvote(testTenantId, item.id, empId);
      assert.equal(unvoted.upvotesCount, 0);
      assert.ok(!unvoted.upvotedBy.includes(empId));

      // 5. Progress item lifecycle: PLANNED -> IN_PROGRESS -> DELIVERED
      const inProgress = await RoadmapCentralService.updateStatus(testTenantId, item.id, "IN_PROGRESS");
      assert.equal(inProgress.status, "IN_PROGRESS");

      const delivered = await RoadmapCentralService.updateStatus(testTenantId, item.id, "DELIVERED");
      assert.equal(delivered.status, "DELIVERED");

      // 6. Multi-tenant isolation: other tenant sees 0 roadmap items
      const otherItems = await RoadmapCentralService.listItems(otherTenantId);
      assert.equal(otherItems.length, 0);

      await assert.rejects(
        () => RoadmapCentralService.updateStatus(otherTenantId, item.id, "CANCELLED"),
        /Roadmap item not found/
      );
    });
  });

  // ==========================================
  // 7. ADDON-109: Request Management
  // ==========================================
  await t.test("ADDON-109: Request Management Service — Service Requests, Category Routing & Review Workflow", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Submit service request
      const req = await RequestManagementService.createRequest(testTenantId, {
        employeeId: empId,
        employeeName: "Alexander Wright",
        category: "IT_HARDWARE",
        title: "Dual 4K Monitor Arm & Docking Station",
        details: "Requesting ergonomic monitor arm and high-power Thunderbolt 4 dock for architectural modeling workstation.",
        priority: "HIGH",
      });
      assert.ok(req.id);
      assert.ok(req.requestNo.startsWith("REQ-"));
      assert.equal(req.status, "PENDING");
      assert.equal(req.category, "IT_HARDWARE");

      // 2. List requests by category
      const itRequests = await RequestManagementService.listRequests(testTenantId, { category: "IT_HARDWARE" });
      assert.equal(itRequests.length, 1);
      assert.equal(itRequests[0].id, req.id);

      // 3. Review and approve request
      const approvedReq = await RequestManagementService.reviewRequest(
        testTenantId,
        req.id,
        "APPROVED",
        "Operations VP",
        "Approved under Q4 hardware refresh budget."
      );
      assert.equal(approvedReq.status, "APPROVED");
      assert.equal(approvedReq.reviewedBy, "Operations VP");
      assert.equal(approvedReq.reviewNotes, "Approved under Q4 hardware refresh budget.");
      assert.ok(approvedReq.reviewedAt);

      // 4. Fulfill request
      const fulfilledReq = await RequestManagementService.reviewRequest(
        testTenantId,
        req.id,
        "FULFILLED",
        "IT Support Lead",
        "Equipment dispatched and installed at Desk Bay 42."
      );
      assert.equal(fulfilledReq.status, "FULFILLED");

      // 5. Multi-tenant isolation: other tenant has 0 requests
      const otherRequests = await RequestManagementService.listRequests(otherTenantId);
      assert.equal(otherRequests.length, 0);

      await assert.rejects(
        () => RequestManagementService.reviewRequest(otherTenantId, req.id, "REJECTED", "Intruder"),
        /Service request not found/
      );
    });
  });

  // ==========================================
  // 8. ADDON-111: Sidebar Menu Builder
  // ==========================================
  await t.test("ADDON-111: Sidebar Menu Builder Service — Custom Navigation, Role Visibility & Reordering", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Retrieve default navigation config
      const config = await SidebarMenuService.getConfig(testTenantId);
      assert.ok(config);
      assert.ok(config.items.length >= 5);

      // 2. Add custom navigation item
      const newItem = await SidebarMenuService.addCustomMenuItem(testTenantId, {
        title: "Vendor Contracts Hub",
        path: "/vendor-contracts",
        icon: "FileSignature",
        roles: ["admin", "manager"],
        sortOrder: 6,
      });
      assert.ok(newItem.id);
      assert.equal(newItem.title, "Vendor Contracts Hub");
      assert.equal(newItem.isCustom, true);

      // 3. Role visibility filtering
      // Employee role should NOT see "Vendor Contracts Hub" (only admin, manager)
      const employeeMenu = await SidebarMenuService.getNavigation(testTenantId, "employee");
      const employeeTitles = employeeMenu.map((m) => m.title);
      assert.ok(!employeeTitles.includes("Vendor Contracts Hub"));
      assert.ok(employeeTitles.includes("Dashboard"));

      // Admin role SHOULD see "Vendor Contracts Hub"
      const adminMenu = await SidebarMenuService.getNavigation(testTenantId, "admin");
      const adminTitles = adminMenu.map((m) => m.title);
      assert.ok(adminTitles.includes("Vendor Contracts Hub"));

      // 4. Toggle visibility
      const disabledItem = await SidebarMenuService.toggleMenuItem(testTenantId, newItem.id, false);
      assert.equal(disabledItem.isEnabled, false);

      const adminMenuAfterDisable = await SidebarMenuService.getNavigation(testTenantId, "admin");
      const adminTitlesAfterDisable = adminMenuAfterDisable.map((m) => m.title);
      assert.ok(!adminTitlesAfterDisable.includes("Vendor Contracts Hub"));

      // 5. Multi-tenant isolation: other tenant retains untouched default navigation
      const otherConfig = await SidebarMenuService.getConfig(otherTenantId);
      const otherTitles = otherConfig.items.map((m) => m.title);
      assert.ok(!otherTitles.includes("Vendor Contracts Hub"));

      await assert.rejects(
        () => SidebarMenuService.toggleMenuItem(otherTenantId, newItem.id, true),
        /Sidebar menu item not found/
      );
    });
  });

  // ==========================================
  // 9. Comprehensive Wave 5 Multi-Tenant Isolation Audit
  // ==========================================
  await t.test("Wave 5 Comprehensive Cross-Tenant Boundary Enforcement Audit", async () => {
    await withTenant(otherTenantId, async () => {
      // Validate that other tenant cannot view any data created by testTenant across all 8 modules
      const restaurantMenu = await RestaurantMenuService.getMenu(otherTenantId);
      assert.equal(restaurantMenu.categories.find((c) => c.name === "Chef's Tasting Specials"), undefined);

      const leads = await GoogleLeadsService.listLeads(otherTenantId);
      assert.equal(leads.length, 0);

      const jobs = await JobBoardService.listPublishedJobs(otherTenantId);
      assert.equal(jobs.length, 0);

      const ebooks = await EbookService.listBooks(otherTenantId);
      assert.equal(ebooks.length, 0);

      const roadmaps = await RoadmapCentralService.listItems(otherTenantId);
      assert.equal(roadmaps.length, 0);

      const requests = await RequestManagementService.listRequests(otherTenantId);
      assert.equal(requests.length, 0);

      const sidebars = await SidebarMenuService.getConfig(otherTenantId);
      assert.equal(sidebars.items.find((i) => i.title === "Vendor Contracts Hub"), undefined);
    });
  });
});
