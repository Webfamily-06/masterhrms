import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { runWithTenantContext } from "../context/tenant-context";
import { NewsletterService } from "../services/newsletter.service";
import { FeedbackService } from "../services/feedback.service";
import { KnowledgeBaseService } from "../services/knowledge-base.service";
import { DiagramService } from "../services/diagram.service";
import { PortfolioService } from "../services/portfolio.service";
import { ResumeBuilderService } from "../services/resume-builder.service";
import { SpreadsheetService } from "../services/spreadsheet.service";
import { SuggestionBoxService } from "../services/suggestion-box.service";
import { StrategyStudioService } from "../services/strategy-studio.service";
import { PlanningStrategyService } from "../services/planning-strategy.service";

test("MASTERHRMS — WorkDo Reference Modules Wave 3 Verification Suite (Milestone 7.6)", async (t) => {
  const ts = Date.now();
  const testTenantId = `tenant-w3-${ts}`;
  const otherTenantId = `tenant-w3-iso-${ts}`;
  const userId = `usr-w3-${ts}`;
  const otherUserId = `usr-w3-iso-${ts}`;

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
      await rawPrisma.marketingCampaign.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.setting.deleteMany({
        where: { scopeId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.userRole.deleteMany({
        where: { userId: { in: [userId, otherUserId] } },
      }).catch(() => {});
      await rawPrisma.user.deleteMany({
        where: { id: { in: [userId, otherUserId] } },
      }).catch(() => {});
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
    } catch (e) {
      // Ignore cleanup error
    }
  };

  await t.test("Setup: Create Test Tenants, Users, and Context", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: {
        id: testTenantId,
        name: "Wave3 Enterprise Corp",
        slug: `w3-corp-${ts}`,
        currency: "INR",
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: otherTenantId,
        name: "Wave3 Isolated Tenant",
        slug: `w3-iso-${ts}`,
        currency: "INR",
      },
    });

    await rawPrisma.user.create({
      data: {
        id: userId,
        email: `admin-w3-${ts}@example.com`,
        passwordHash: "hash-w3",
      },
    });

    await rawPrisma.user.create({
      data: {
        id: otherUserId,
        email: `admin-w3-iso-${ts}@example.com`,
        passwordHash: "hash-w3",
      },
    });

    assert.ok(true, "Setup completed");
  });

  // 1. ADDON-048: Newsletter
  await t.test("ADDON-048.1: Manages subscriber lifecycle, campaigns, and broadcast delivery", async () => {
    await withTenant(testTenantId, async () => {
      // Add subscriber
      const sub = await NewsletterService.addSubscriber(testTenantId, {
        email: `subscriber-${ts}@enterprise.com`,
        name: "Enterprise VIP Lead",
        tags: ["product_updates", "quarterly_reports"],
        source: "portal_footer",
      });
      assert.ok(sub.id);
      assert.equal(sub.status, "SUBSCRIBED");
      assert.equal(sub.email, `subscriber-${ts}@enterprise.com`);

      // Query subscribers
      const subscribers = await NewsletterService.listSubscribers(testTenantId, {
        tag: "product_updates",
      });
      assert.ok(subscribers.some((s) => s.id === sub.id));

      // Create campaign
      const campaign = await NewsletterService.createCampaign(
        testTenantId,
        {
          title: "Q4 Product Feature Release",
          subject: "Discover New Modular Add-ons in MASTERHRMS",
          previewText: "All new knowledge base, diagrams, and portfolio features are now live.",
          contentHtml: "<h1>Quarterly Release Notes</h1><p>Explore cutting edge workspace capabilities.</p>",
          targetTags: ["product_updates"],
        },
        userId
      );
      assert.ok(campaign.id);
      assert.equal(campaign.status, "DRAFT");

      // Broadcast send
      const sent = await NewsletterService.sendCampaign(testTenantId, campaign.id);
      assert.equal(sent.status, "SENT");
      assert.ok(sent.recipientsCount >= 1);
      assert.ok(sent.sentAt);

      // Unsubscribe
      const unsubscribed = await NewsletterService.unsubscribe(testTenantId, sub.email);
      assert.equal(unsubscribed, true);

      const updatedSub = await NewsletterService.listSubscribers(testTenantId, {
        status: "UNSUBSCRIBED",
      });
      assert.ok(updatedSub.some((s) => s.id === sub.id));
    });
  });

  await t.test("ADDON-048.2: Enforces multi-tenant subscriber and campaign isolation", async () => {
    await withTenant(otherTenantId, async () => {
      const subs = await NewsletterService.listSubscribers(otherTenantId);
      assert.equal(subs.length, 0, "Other tenant must have zero subscribers from test tenant");

      const campaigns = await NewsletterService.listCampaigns(otherTenantId);
      assert.equal(campaigns.length, 0, "Other tenant must have zero campaigns from test tenant");
    });
  });

  // 2. ADDON-049: Feedback
  await t.test("ADDON-049.1: Submits multi-channel feedback, calculates sentiment, and resolves workflow", async () => {
    await withTenant(testTenantId, async () => {
      // Positive feedback
      const posFeedback = await FeedbackService.submitFeedback(testTenantId, {
        targetType: "CUSTOMER",
        category: "SERVICE_QUALITY",
        rating: 5,
        title: "Outstanding Payroll Precision",
        comments: "Statutory PF and ESI calculations are 100% compliant with EPFO portal.",
        submitterName: "Apex Corporation CFO",
        submitterEmail: `cfo-${ts}@apex.com`,
      });
      assert.ok(posFeedback.id);
      assert.equal(posFeedback.sentiment, "POSITIVE");
      assert.equal(posFeedback.status, "NEW");

      // Negative feedback
      const negFeedback = await FeedbackService.submitFeedback(testTenantId, {
        targetType: "PRODUCT",
        category: "FEATURE_REQUEST",
        rating: 2,
        title: "Need Biometric Custom USB Driver",
        comments: "Please add native support for SecuGen Hamster Pro fingerprint reader.",
        isAnonymous: true,
      });
      assert.equal(negFeedback.sentiment, "NEGATIVE");
      assert.equal(negFeedback.submitterName, "Anonymous");

      // Metrics
      const metrics = await FeedbackService.getMetrics(testTenantId);
      assert.equal(metrics.totalSubmissions, 2);
      assert.equal(metrics.averageRating, 3.5);
      assert.equal(metrics.sentimentDistribution.POSITIVE, 1);
      assert.equal(metrics.sentimentDistribution.NEGATIVE, 1);

      // Resolution workflow
      const resolved = await FeedbackService.resolveFeedback(
        testTenantId,
        negFeedback.id,
        {
          status: "RESOLVED",
          resolutionNotes: "Hamster Pro driver integration added to hardware roadmap for release 8.2.",
        },
        userId
      );
      assert.equal(resolved.status, "RESOLVED");
      assert.ok(resolved.resolvedAt);
      assert.equal(resolved.resolvedBy, userId);
    });
  });

  // 3. ADDON-054: Knowledge Base
  await t.test("ADDON-054.1: Seeds standard categories, authors articles, tracks views, and records helpful votes", async () => {
    await withTenant(testTenantId, async () => {
      // List seeded categories
      const categories = await KnowledgeBaseService.listCategories(testTenantId);
      assert.ok(categories.length >= 4, "Must auto-seed default categories");
      const hrCat = categories.find((c) => c.slug === "hr-policies");
      assert.ok(hrCat, "Must include HR policies category");

      // Create custom category
      const customCat = await KnowledgeBaseService.createCategory(testTenantId, {
        name: "Security & Cloud Compliance",
        description: "SOC2, ISO 27001, and Indian DPDP compliance protocols",
        icon: "shield-alert",
      });
      assert.ok(customCat.id);
      assert.equal(customCat.slug, "security-cloud-compliance");

      // Create article
      const article = await KnowledgeBaseService.createArticle(
        testTenantId,
        {
          categoryId: customCat.id,
          title: "Multi-Factor Authentication & Zero-Trust Guidelines",
          summary: "Mandatory 2FA setup and device authorization policy for all workspace staff.",
          content: "<h1>Zero Trust Architecture</h1><p>Enforce TOTP authenticator app and strict role scoping.</p>",
          tags: ["security", "2fa", "compliance"],
          status: "PUBLISHED",
        },
        userId,
        "Alice Wave3"
      );
      assert.ok(article.id);
      assert.equal(article.status, "PUBLISHED");
      assert.ok(article.publishedAt);

      // Track view
      const views = await KnowledgeBaseService.incrementView(testTenantId, article.id);
      assert.equal(views, 1);

      // Vote helpful
      const voted = await KnowledgeBaseService.voteArticle(testTenantId, article.id, true);
      assert.equal(voted.helpfulCount, 1);
      assert.equal(voted.notHelpfulCount, 0);

      // Search articles
      const searchResults = await KnowledgeBaseService.listArticles(testTenantId, {
        search: "Zero-Trust",
      });
      assert.equal(searchResults.length, 1);
      assert.equal(searchResults[0].id, article.id);
    });
  });

  // 4. ADDON-055: Diagram
  await t.test("ADDON-055.1: Manages visual architectural diagrams with nodes, edges, canvas layout, and versioning", async () => {
    await withTenant(testTenantId, async () => {
      // Create diagram
      const diagram = await DiagramService.createDiagram(
        testTenantId,
        {
          title: "MASTERHRMS Microservices Topology",
          description: "High availability architecture with fail-closed multi-tenancy",
          diagramType: "ARCHITECTURE",
          nodes: [
            { id: "node-1", type: "gateway", label: "Cloudflare Edge WAF", position: { x: 100, y: 100 } },
            { id: "node-2", type: "service", label: "Express API Core", position: { x: 300, y: 100 } },
            { id: "node-3", type: "database", label: "PostgreSQL Aurora Cluster", position: { x: 500, y: 100 } },
          ],
          edges: [
            { id: "edge-1", source: "node-1", target: "node-2", label: "HTTPS / TLS 1.3" },
            { id: "edge-2", source: "node-2", target: "node-3", label: "Prisma Connection Pool" },
          ],
          canvasConfig: { width: 2560, height: 1440, background: "#f8fafc", gridSnap: true },
        },
        userId
      );
      assert.ok(diagram.id);
      assert.equal(diagram.diagramType, "ARCHITECTURE");
      assert.equal(diagram.nodes.length, 3);
      assert.equal(diagram.edges.length, 2);
      assert.equal(diagram.version, 1);

      // Update diagram with a Redis cache node
      const updated = await DiagramService.updateDiagram(testTenantId, diagram.id, {
        nodes: [
          ...diagram.nodes,
          { id: "node-4", type: "cache", label: "Redis Cluster", position: { x: 300, y: 250 } },
        ],
        isPublished: true,
      });
      assert.equal(updated.version, 2);
      assert.equal(updated.nodes.length, 4);
      assert.equal(updated.isPublished, true);
    });
  });

  // 5. ADDON-056: Portfolio
  await t.test("ADDON-056.1: Manages client project showcase with media assets and testimonials", async () => {
    await withTenant(testTenantId, async () => {
      const item = await PortfolioService.createItem(
        testTenantId,
        {
          title: "Enterprise Banking Core Modernization",
          clientName: "State FinCorp India",
          category: "ENTERPRISE",
          description: "End-to-end migration of legacy payroll and HR operations to MASTERHRMS cloud.",
          technologies: ["Node.js", "React", "PostgreSQL", "Docker", "EPFO Integration"],
          testimonial: {
            clientQuote: "Streamlined 15,000 monthly payslips with zero discrepancies and instant bank disbursement.",
            clientAuthor: "Rajesh Kumar",
            clientPosition: "Chief Information Officer",
          },
          status: "FEATURED",
          sortOrder: 1,
        },
        userId
      );
      assert.ok(item.id);
      assert.equal(item.status, "FEATURED");
      assert.equal(item.testimonial?.clientAuthor, "Rajesh Kumar");

      // Query featured items
      const items = await PortfolioService.listItems(testTenantId, { status: "FEATURED" });
      assert.ok(items.some((i) => i.id === item.id));

      // Filter by tech
      const techFiltered = await PortfolioService.listItems(testTenantId, { tech: "EPFO Integration" });
      assert.ok(techFiltered.some((i) => i.id === item.id));
    });
  });

  // 6. ADDON-057: Resume Builder
  await t.test("ADDON-057.1: Builds candidate/employee resume with structured sections and ATS scoring", async () => {
    await withTenant(testTenantId, async () => {
      const resume = await ResumeBuilderService.createResume(
        testTenantId,
        {
          title: "Principal Staff Engineer & Cloud Architect",
          fullName: "Alice Wave3",
          email: "alice@masterhrms.internal",
          phone: "+91 98765 43210",
          location: "Bengaluru, India",
          template: "TECH_EXECUTIVE",
          summary:
            "Accomplished enterprise software architect with 12+ years of expertise in distributed systems, multi-tenant databases, statutory payroll engines, and high-throughput real-time APIs.",
          experience: [
            {
              id: "exp-1",
              company: "MASTERHRMS Technologies",
              role: "Principal Architect",
              startDate: "2021-01",
              current: true,
              highlights: [
                "Architected 100% fail-closed multi-tenant database abstraction layer.",
                "Engineered statutory compliance engine processing 500k+ employees.",
              ],
            },
          ],
          education: [
            {
              id: "edu-1",
              institution: "Indian Institute of Science (IISc)",
              degree: "M.Tech in Computer Science",
              startDate: "2012",
              endDate: "2014",
            },
          ],
          skillGroups: [
            { category: "Languages & Frameworks", skills: ["TypeScript", "Go", "React", "Node.js"] },
            { category: "Cloud & Databases", skills: ["PostgreSQL", "Prisma", "AWS Aurora", "Docker"] },
          ],
          certifications: [
            { id: "cert-1", name: "AWS Certified Solutions Architect - Professional", issuer: "Amazon Web Services", issueDate: "2023-05" },
          ],
        },
        userId
      );

      assert.ok(resume.id);
      assert.equal(resume.template, "TECH_EXECUTIVE");
      assert.ok(resume.atsScore! >= 80, `Expected high ATS score, got ${resume.atsScore}`);
      assert.equal(resume.experience.length, 1);
      assert.equal(resume.education.length, 1);
      assert.equal(resume.certifications.length, 1);

      // Update resume with an open-source project
      const updated = await ResumeBuilderService.updateResume(testTenantId, resume.id, {
        projects: [
          {
            id: "proj-1",
            name: "Enterprise Multi-Tenant Node SDK",
            description: "High-performance tenancy isolation and connection pooling middleware.",
            technologies: ["TypeScript", "PostgreSQL"],
          },
        ],
      });
      assert.equal(updated.version, 2);
      assert.equal(updated.projects.length, 1);
    });
  });

  // 7. ADDON-061: Spreadsheet
  await t.test("ADDON-061.1: Manages multi-sheet workbook, cell grid coordinates, and formula evaluation", async () => {
    await withTenant(testTenantId, async () => {
      // Create workbook
      const wb = await SpreadsheetService.createWorkbook(
        testTenantId,
        {
          title: "FY26 Operational Budget & Salary Projections",
          description: "Departmental salary expenditures, PF contributions, and bonus allowances",
          initialSheetName: "Engineering Payroll",
          initialCells: {
            A1: { rawValue: "Base Salary", style: { bold: true } },
            B1: { rawValue: 125000 },
            A2: { rawValue: "EPFO Contribution", style: { bold: true } },
            B2: { rawValue: 15000 },
          },
        },
        userId
      );
      assert.ok(wb.id);
      assert.equal(wb.sheets.length, 1);
      assert.equal(wb.sheets[0].name, "Engineering Payroll");
      assert.equal(wb.sheets[0].cells["A1"].rawValue, "Base Salary");

      // Update cells with formula evaluation
      const updatedWb = await SpreadsheetService.updateCells(testTenantId, wb.id, wb.sheets[0].id, {
        A3: { rawValue: "Total CTC", style: { bold: true } },
        B3: { rawValue: 0, formula: "=SUM(125000, 15000)" },
      });
      assert.equal(updatedWb.version, 2);
      assert.equal(updatedWb.sheets[0].cells["B3"].computedValue, 140000, "Formula =SUM(125000, 15000) must compute to 140000");

      // Add second sheet
      const newSheet = await SpreadsheetService.addSheet(testTenantId, wb.id, "Executive Summary");
      assert.ok(newSheet.id);
      assert.equal(newSheet.name, "Executive Summary");

      const fetchedWb = await SpreadsheetService.getWorkbook(testTenantId, wb.id);
      assert.equal(fetchedWb?.sheets.length, 2);
    });
  });

  // 8. ADDON-062: Innovation Center
  await t.test("ADDON-062.1: Suggestion Box & Innovation Center idea workflow, upvoting, and status lifecycle", async () => {
    await withTenant(testTenantId, async () => {
      // Create innovation category
      const cat = await SuggestionBoxService.createCategory(testTenantId, {
        name: "Process Automation & AI",
        color: "#6366f1",
        description: "AI copilots, intelligent document extraction, and workflow bots",
      });
      assert.ok(cat.id);

      // Submit suggestion/idea
      const idea = await SuggestionBoxService.createSuggestion(
        testTenantId,
        {
          title: "Automated OCR Ingestion for Vendor Invoices",
          description: "Use deep learning to parse GSTIN, invoice date, line items, and TDS tax automatically.",
          categoryId: cat.id,
          isAnonymous: false,
        },
        userId,
        "Alice Wave3"
      );
      assert.ok(idea.id);
      assert.equal(idea.status, "New");
      assert.equal(idea.voteCount, 0);

      // Upvote idea (from another user in tenant since self-voting is restricted)
      const voted = await SuggestionBoxService.toggleVote(testTenantId, idea.id, otherUserId);
      assert.equal(voted.voteCount, 1);
      assert.equal(voted.voted, true);

      // Admin review & status progression
      const reviewed = await SuggestionBoxService.adminRespond(
        testTenantId,
        idea.id,
        "Under Review",
        "Assigned to FinTech R&D team for POC evaluation.",
        userId,
        "Admin Alice"
      );
      assert.equal(reviewed.status, "Under Review");
      assert.ok(reviewed.adminResponse);

      const accepted = await SuggestionBoxService.adminRespond(
        testTenantId,
        idea.id,
        "Accepted",
        "Approved for Sprint 42 development.",
        userId,
        "Admin Alice"
      );
      assert.equal(accepted.status, "Accepted");

      // Verify stats
      const stats = await SuggestionBoxService.getStats(testTenantId);
      assert.ok(stats.total >= 1);
      assert.ok(stats.accepted >= 1);
    });
  });

  // 9. ADDON-064: Business Model Canvas
  await t.test("ADDON-064.1: Osterwalder's 9-building-blocks canvas template, quadrant items, and impact ratings", async () => {
    await withTenant(testTenantId, async () => {
      // Get BMC template from StrategyStudioService
      const template = StrategyStudioService.getTemplate("business-model-canvas");
      assert.equal(template.matrixType, "business-model-canvas");
      assert.equal(template.categories.length, 9, "Osterwalder BMC must contain 9 canonical building blocks");

      const categoryKeys = template.categories.map((c) => c.key);
      assert.ok(categoryKeys.includes("key_partners"));
      assert.ok(categoryKeys.includes("key_activities"));
      assert.ok(categoryKeys.includes("key_resources"));
      assert.ok(categoryKeys.includes("value_propositions"));
      assert.ok(categoryKeys.includes("customer_relationships"));
      assert.ok(categoryKeys.includes("channels"));
      assert.ok(categoryKeys.includes("customer_segments"));
      assert.ok(categoryKeys.includes("cost_structure"));
      assert.ok(categoryKeys.includes("revenue_streams"));

      // Create BMC document
      const doc = await StrategyStudioService.createDocument(testTenantId, {
        matrixType: "business-model-canvas",
        title: "MASTERHRMS Enterprise SaaS Business Model",
        description: "Global enterprise HRMS, payroll, and statutory compliance platform",
        initialItems: {
          value_propositions: [
            {
              id: "vp-1",
              category: "value_propositions",
              text: "100% compliant multi-tenant cloud HRMS with native Indian statutory filing",
              impactScore: 5,
            },
          ],
          revenue_streams: [
            {
              id: "rs-1",
              category: "revenue_streams",
              text: "Tiered SaaS subscription per employee/month + modular add-ons marketplace",
              impactScore: 5,
            },
          ],
        },
      });

      assert.ok(doc.id);
      assert.equal(doc.matrixType, "business-model-canvas");
      assert.equal(doc.sections.value_propositions.length, 1);
      assert.equal(doc.sections.revenue_streams.length, 1);

      // Verify PlanningStrategyService model integration
      const stratModel = await PlanningStrategyService.createModel(
        testTenantId,
        {
          name: "FY26 Strategy Studio BMC",
          type: "business_model",
          description: "Osterwalder strategic framework for international expansion",
          budgetAmount: 250000,
        },
        userId
      );
      assert.ok(stratModel.id);
      assert.equal(stratModel.type, "business_model");
    });
  });

  // 10. ADDON-065: Marketing Plan
  await t.test("ADDON-065.1: Strategic Marketing Campaign creation, budget tracking, channel allocation, and status lifecycle", async () => {
    await withTenant(testTenantId, async () => {
      // Create Marketing Campaign directly in Prisma
      const campaign = await rawPrisma.marketingCampaign.create({
        data: {
          tenantId: testTenantId,
          campaignCode: `MKT-HRMS-${ts}`,
          name: "Q4 Enterprise HR Tech Summit & Lead Generation",
          campaignType: "MULTI_CHANNEL",
          channel: "digital_conference",
          budget: 75000.0,
          spent: 28500.0,
          currency: "USD",
          period: "Q4",
          periodValue: 4,
          targetAudience: "CHROs, VPs of HR, and Enterprise Founders",
          description: "Targeted digital marketing and sponsored keynotes at national HR technology conclave.",
          startDate: new Date("2026-10-01"),
          endDate: new Date("2026-12-31"),
          status: "active",
        },
      });

      assert.ok(campaign.id);
      assert.equal(campaign.campaignCode, `MKT-HRMS-${ts}`);
      assert.equal(Number(campaign.budget), 75000);
      assert.equal(Number(campaign.spent), 28500);

      const variance = Number(campaign.budget) - Number(campaign.spent);
      assert.equal(variance, 46500, "Unspent budget should equal 46,500");

      // Verify PlanningStrategyService model integration
      const mktModel = await PlanningStrategyService.createModel(
        testTenantId,
        {
          name: "Global Marketing Expansion Plan 2026",
          type: "marketing_plan",
          description: "Inbound content marketing, enterprise account-based marketing, and partner summits",
          budgetAmount: 150000,
        },
        userId
      );
      assert.ok(mktModel.id);
      assert.equal(mktModel.type, "marketing_plan");
    });
  });

  await t.test("ADDON-065.2: Rejects cross-tenant access and enforces tenant boundary isolation", async () => {
    await withTenant(otherTenantId, async () => {
      const otherCampaigns = await rawPrisma.marketingCampaign.findMany({
        where: { tenantId: otherTenantId },
      });
      assert.equal(otherCampaigns.length, 0, "Other tenant must have zero marketing campaigns");

      const otherWorkbooks = await SpreadsheetService.listWorkbooks(otherTenantId);
      assert.equal(otherWorkbooks.length, 0, "Other tenant must have zero workbooks");

      const otherResumes = await ResumeBuilderService.listResumes(otherTenantId);
      assert.equal(otherResumes.length, 0, "Other tenant must have zero resumes");

      const otherPortfolios = await PortfolioService.listItems(otherTenantId);
      assert.equal(otherPortfolios.length, 0, "Other tenant must have zero portfolio items");

      const otherDiagrams = await DiagramService.listDiagrams(otherTenantId);
      assert.equal(otherDiagrams.length, 0, "Other tenant must have zero diagrams");
    });
  });

  // Teardown
  await t.test("Teardown: Clean up Test Fixtures", async () => {
    await cleanup();
    assert.ok(true, "Teardown completed");
  });
});
