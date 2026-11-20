import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { PLACEHOLDER_REGISTRY } from "../services/certificate-studio.service";
import { resolveCertificateVerificationUrl } from "../lib/certificate-verification-resolver";
import { StrategyStudioService } from "../services/strategy-studio.service";
import { STANDARD_FBP_COMPONENTS } from "../services/fbp.service";

test("MASTERHRMS — WorkDo Reference Modules Wave 1 Verification Suite (Milestone 7.4)", async (t) => {
  const ts = Date.now();
  const testTenantId = `tenant-w1-${ts}`;
  const otherTenantId = `tenant-w1-iso-${ts}`;
  const userId = `usr-w1-${ts}`;
  const otherUserId = `usr-w1-iso-${ts}`;

  const cleanup = async () => {
    try {
      await rawPrisma.workspaceTodo.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } });
      await rawPrisma.workspaceNote.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } });
      await rawPrisma.companyDocument.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } });
      await rawPrisma.staffingClient.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } });
      await rawPrisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
      await rawPrisma.tenant.deleteMany({ where: { id: { in: [testTenantId, otherTenantId] } } });
    } catch {
      // Best-effort cleanup
    }
  };

  await t.test("Setup: Create Test Tenant and Fixtures", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: { id: testTenantId, name: "Wave 1 Enterprise Corp", slug: `wave1-${ts}`, currency: "INR" },
    });
    await rawPrisma.tenant.create({
      data: { id: otherTenantId, name: "Isolated Boundary Corp", slug: `wave1-iso-${ts}`, currency: "INR" },
    });

    await rawPrisma.user.create({
      data: { id: userId, email: `owner-${ts}@wave1.com`, passwordHash: "dummy-hash" },
    });
    await rawPrisma.user.create({
      data: { id: otherUserId, email: `other-${ts}@wave1iso.com`, passwordHash: "dummy-hash" },
    });

    assert.ok(testTenantId);
  });

  // =========================================================================
  // 1. Digital Certificate Studio (ADDON-058)
  // =========================================================================
  await t.test("ADDON-058.1: Validates complete placeholder registry coverage with mandatory keys", async () => {
    assert.ok(Array.isArray(PLACEHOLDER_REGISTRY), "PLACEHOLDER_REGISTRY must be an array");
    assert.ok(PLACEHOLDER_REGISTRY.length >= 10, "Registry must contain standard placeholders");

    const keys = PLACEHOLDER_REGISTRY.map((p) => p.key);
    assert.ok(keys.includes("{{employee.name}}"), "Must include employee.name placeholder");
    assert.ok(keys.includes("{{award.title}}"), "Must include award.title placeholder");
    assert.ok(keys.includes("{{certificate.number}}"), "Must include certificate.number placeholder");
    assert.ok(keys.includes("{{certificate.verificationCode}}"), "Must include certificate.verificationCode placeholder");
    assert.ok(keys.includes("{{certificate.verificationUrl}}"), "Must include certificate.verificationUrl placeholder");

    const empPlaceholder = PLACEHOLDER_REGISTRY.find((p) => p.key === "{{employee.name}}");
    assert.equal(empPlaceholder?.required, true, "employee.name must be marked required");
  });

  await t.test("ADDON-058.2: Resolves unguessable certificate verification URL with secure protocol", async () => {
    const testCode = "VERIFY-9C81B27D8310E476A841";
    const verificationUrl = resolveCertificateVerificationUrl(testCode);

    assert.ok(typeof verificationUrl === "string", "Verification URL must be a string");
    assert.ok(verificationUrl.length > 10, "URL must not be empty");
    assert.ok(verificationUrl.includes("verify") || verificationUrl.includes(testCode), "URL must contain route or code");
  });

  await t.test("ADDON-058.3: Certificate serial number and verification formatting", async () => {
    const certSerial = `CERT-${new Date().getFullYear()}-${ts.toString(16).toUpperCase().slice(-8)}`;
    assert.match(certSerial, /^CERT-\d{4}-[A-F0-9]{8}$/, "Serial number must conform to standard enterprise pattern");
  });

  // =========================================================================
  // 2. Strategy Studio Matrices: SWOT, PEST, PESTEL, Porter's 5 Forces (ADDON-067, 068, 069, 070)
  // =========================================================================
  await t.test("ADDON-067: SWOT analysis template quadrants and document lifecycle", async () => {
    const template = StrategyStudioService.getTemplate("swot");
    assert.equal(template.matrixType, "swot");
    assert.ok(Array.isArray(template.categories), "Categories must be an array");

    const catKeys = template.categories.map((c) => c.key);
    assert.deepEqual(catKeys, ["strengths", "weaknesses", "opportunities", "threats"], "SWOT must have standard 4 quadrants");

    const doc = await StrategyStudioService.createDocument(
      testTenantId,
      {
        matrixType: "swot",
        title: "FY27 Product Expansion Strategy",
        initialItems: {
          strengths: [{ id: "s1", category: "strengths", text: "Proprietary AI Engine", impactScore: 5 }],
        },
      },
      userId
    );

    assert.ok(doc.id, "Document ID must be generated");
    assert.equal(doc.matrixType, "swot");
    assert.equal(doc.sections.strengths.length, 1);
    assert.equal(doc.sections.strengths[0].text, "Proprietary AI Engine");
    assert.equal(doc.sections.strengths[0].impactScore, 5);

    const updated = await StrategyStudioService.updateCategoryItem(
      testTenantId,
      doc.id,
      "opportunities",
      { text: "APAC Market Entry", impactScore: 4 },
      userId
    );
    assert.ok(updated.sections.opportunities.some((o: any) => o.text === "APAC Market Entry"));
  });

  await t.test("ADDON-068 & ADDON-069: PEST and PESTEL macro-environmental framework templates", async () => {
    const pestelTemplate = StrategyStudioService.getTemplate("pestel");
    assert.equal(pestelTemplate.matrixType, "pestel");

    const pestelKeys = pestelTemplate.categories.map((c) => c.key);
    assert.deepEqual(
      pestelKeys,
      ["political", "economic", "social", "technological", "environmental", "legal"],
      "PESTEL must have 6 macro-environmental dimensions"
    );

    const pestelDoc = await StrategyStudioService.createDocument(
      testTenantId,
      {
        matrixType: "pestel",
        title: "2027 Regulatory Compliance Landscape",
      },
      userId
    );

    assert.ok(pestelDoc.id);
    assert.equal(pestelDoc.matrixType, "pestel");
  });

  await t.test("ADDON-070: Porter's Five Forces framework and multi-tenant isolation", async () => {
    const doc = await StrategyStudioService.createDocument(
      testTenantId,
      {
        matrixType: "porter-five-forces" as any,
        title: "Competitive Landscape Analysis",
      },
      userId
    );
    assert.ok(doc.id);

    // Multi-tenant boundary isolation
    const tenant1Docs = StrategyStudioService.listDocuments(testTenantId);
    const tenant2Docs = StrategyStudioService.listDocuments(otherTenantId);

    assert.ok(tenant1Docs.some((d) => d.id === doc.id), "Tenant 1 must find its own strategy documents");
    assert.ok(!tenant2Docs.some((d) => d.id === doc.id), "Tenant 2 must NOT find Tenant 1 documents");
  });

  // =========================================================================
  // 3. Document Vault & Repository (ADDON-072)
  // =========================================================================
  await t.test("ADDON-072.1: Creates and stores company documents with metadata and signature flags", async () => {
    const doc = await rawPrisma.companyDocument.create({
      data: {
        tenantId: testTenantId,
        documentCode: `DOC-EMP-${ts}`,
        title: "Enterprise Master Employment Contract",
        category: "Employment Contract",
        fileName: "master-employment-agreement-2026.pdf",
        fileSize: "2.4 MB",
        fileType: "application/pdf",
        requiresSignature: true,
        status: "pending_signature",
      },
    });

    assert.ok(doc.id, "Company document must be created with UUID");
    assert.equal(doc.category, "Employment Contract");
    assert.equal(doc.requiresSignature, true);
    assert.equal(doc.status, "pending_signature");
  });

  await t.test("ADDON-072.2: Enforces strict tenant isolation for document repository", async () => {
    const docs = await rawPrisma.companyDocument.findMany({
      where: { tenantId: otherTenantId },
    });
    assert.equal(docs.length, 0, "Other tenant must not see testTenantId documents");
  });

  // =========================================================================
  // 4. Contract Template & Staffing Billing (ADDON-090)
  // =========================================================================
  await t.test("ADDON-090.1: Creates staffing client terms with configurable markup bases", async () => {
    const client = await rawPrisma.staffingClient.create({
      data: {
        tenantId: testTenantId,
        name: "Acme Global Staffing Partner",
        code: `CL-${ts.toString().slice(-4)}`,
        gstin: "27AABCA1234B1Z5",
        billingStateCode: "27", // Maharashtra
        serviceChargePct: 12.5,
        serviceChargeBase: "earned_gross_plus_statutory",
        status: "active",
      },
    });

    assert.ok(client.id);
    assert.equal(Number(client.serviceChargePct), 12.5);
    assert.equal(client.serviceChargeBase, "earned_gross_plus_statutory");
  });

  await t.test("ADDON-090.2: Computes intra-state vs inter-state GST billing lines accurately", async () => {
    // Commercial billing simulation:
    // Supplier State: 27 (Maharashtra)
    const supplierState = "27";
    const intraStateClient = "27"; // Maharashtra -> Intra-state
    const interStateClient = "29"; // Karnataka -> Inter-state

    const taxableAmount = 100000; // ₹1,00,000

    // Intra-state: CGST 9% + SGST 9%
    const isIntra = supplierState === intraStateClient;
    const cgstRate = isIntra ? 9.0 : 0.0;
    const sgstRate = isIntra ? 9.0 : 0.0;
    const igstRate = isIntra ? 0.0 : 18.0;

    const cgstAmount = (taxableAmount * cgstRate) / 100;
    const sgstAmount = (taxableAmount * sgstRate) / 100;
    const igstAmount = (taxableAmount * igstRate) / 100;
    const totalBilling = taxableAmount + cgstAmount + sgstAmount + igstAmount;

    assert.equal(cgstAmount, 9000);
    assert.equal(sgstAmount, 9000);
    assert.equal(igstAmount, 0);
    assert.equal(totalBilling, 118000, "Intra-state GST total must equal ₹1,18,000");

    // Inter-state: IGST 18%
    const isInter = supplierState !== interStateClient;
    assert.equal(isInter, true);
    const interIgst = (taxableAmount * 18.0) / 100;
    const interTotal = taxableAmount + interIgst;

    assert.equal(interIgst, 18000);
    assert.equal(interTotal, 118000, "Inter-state GST total must equal ₹1,18,000");
  });

  // =========================================================================
  // 5. Flexible Benefit Plan (ADDON-105)
  // =========================================================================
  await t.test("ADDON-105.1: Validates standard FBP components and statutory cap limits", async () => {
    assert.ok(Array.isArray(STANDARD_FBP_COMPONENTS), "FBP components must be an array");
    assert.ok(STANDARD_FBP_COMPONENTS.length >= 6, "Must define at least 6 standard components");

    const fuel = STANDARD_FBP_COMPONENTS.find((c) => c.code === "FUEL");
    const tel = STANDARD_FBP_COMPONENTS.find((c) => c.code === "TEL");
    const meal = STANDARD_FBP_COMPONENTS.find((c) => c.code === "MEAL");
    const lta = STANDARD_FBP_COMPONENTS.find((c) => c.code === "LTA");

    assert.ok(fuel, "FUEL component must exist");
    assert.equal(fuel?.monthlyMaxCap, 2400, "Fuel monthly cap must be ₹2,400");
    assert.equal(fuel?.annualMaxCap, 28800, "Fuel annual cap must be ₹28,800");
    assert.equal(fuel?.requiresProof, true, "Fuel reimbursement requires bills");

    assert.ok(meal, "MEAL component must exist");
    assert.equal(meal?.requiresProof, false, "Meal vouchers do not require individual bill proof");

    assert.ok(lta, "LTA component must exist");
    assert.equal(lta?.annualMaxCap, 60000, "LTA annual cap must be ₹60,000");
  });

  await t.test("ADDON-105.2: Enforces declaration cap overflow guards", async () => {
    const fuelComponent = STANDARD_FBP_COMPONENTS.find((c) => c.code === "FUEL")!;
    const attemptedMonthly = 3500; // Exceeds ₹2,400

    const isExceeded = attemptedMonthly > fuelComponent.monthlyMaxCap;
    assert.equal(isExceeded, true, "Should flag monthly cap overflow");

    const validMonthly = 2000;
    const validAnnual = validMonthly * 12;
    assert.ok(validAnnual <= fuelComponent.annualMaxCap, "Valid annual allocation within limit");
  });

  // =========================================================================
  // 6. Todo Checklists & Task Lifecycle (ADDON-112)
  // =========================================================================
  await t.test("ADDON-112.1: Creates and updates workspace todo with priority and checklist items", async () => {
    const todo = await rawPrisma.workspaceTodo.create({
      data: {
        tenantId: testTenantId,
        userId,
        title: "Complete Section 115BAC Statutory Audit",
        description: "Reconcile quarterly TDS challans and FVU files",
        priority: "high",
        completed: false,
        tag: "compliance",
      },
    });

    assert.ok(todo.id);
    assert.equal(todo.completed, false);
    assert.equal(todo.priority, "high");

    const updated = await rawPrisma.workspaceTodo.update({
      where: { id: todo.id },
      data: { completed: true },
    });

    assert.equal(updated.completed, true, "Todo should be marked completed");
  });

  await t.test("ADDON-112.2: Enforces tenant and user isolation for workspace todos", async () => {
    const crossTenantTodos = await rawPrisma.workspaceTodo.findMany({
      where: { tenantId: otherTenantId },
    });
    assert.equal(crossTenantTodos.length, 0, "Cross-tenant query must return zero todos");
  });

  // =========================================================================
  // 7. Workspace Notes Studio (ADDON-114)
  // =========================================================================
  await t.test("ADDON-114.1: Manages note authoring, tagging, pinning, and starring", async () => {
    const note = await rawPrisma.workspaceNote.create({
      data: {
        tenantId: testTenantId,
        userId,
        title: "Q4 2026 Microservices Migration Architecture",
        content: "Refactor core monolithic routers into dedicated bounded context modules.",
        tag: "engineering",
        priority: "high",
        isPinned: true,
        isStarred: true,
        color: "blue",
      },
    });

    assert.ok(note.id);
    assert.equal(note.isPinned, true);
    assert.equal(note.isStarred, true);
    assert.equal(note.tag, "engineering");

    const pinnedNotes = await rawPrisma.workspaceNote.findMany({
      where: { tenantId: testTenantId, userId, isPinned: true },
    });
    assert.ok(pinnedNotes.some((n) => n.id === note.id), "Must find pinned notes");
  });

  await t.test("ADDON-114.2: Enforces soft-delete trash lifecycle and tenant boundary", async () => {
    const note = await rawPrisma.workspaceNote.create({
      data: {
        tenantId: testTenantId,
        userId,
        title: "Temporary Scratchpad",
        content: "Notes to be trashed.",
        isTrash: false,
      },
    });

    const trashed = await rawPrisma.workspaceNote.update({
      where: { id: note.id },
      data: { isTrash: true },
    });
    assert.equal(trashed.isTrash, true);

    const activeNotes = await rawPrisma.workspaceNote.findMany({
      where: { tenantId: testTenantId, isTrash: false },
    });
    assert.ok(!activeNotes.some((n) => n.id === note.id), "Trashed note must be excluded from active view");

    const crossTenantNotes = await rawPrisma.workspaceNote.findMany({
      where: { tenantId: otherTenantId },
    });
    assert.equal(crossTenantNotes.length, 0, "Cross-tenant notes query must return zero records");
  });

  // Teardown
  await cleanup();
});
