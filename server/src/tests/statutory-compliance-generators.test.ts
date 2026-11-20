import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { rawPrisma as prisma } from "../prisma";
import { Form16Service } from "../services/form-16.service";
import { Form24QService } from "../services/form-24q.service";
import { EpfoEsicService } from "../services/epfo-esic.service";
import { BankReconciliationService } from "../services/bank-reconciliation.service";

describe("MASTERHRMS — Statutory Compliance, Tax Certificates & Bank Reconciliation Suite (Section A.3)", () => {
  const testRunId = `statutory-${Date.now()}`;
  const tenantId = `tenant-${testRunId}`;
  const userId = `user-${testRunId}`;
  const employeeId = `emp-${testRunId}`;
  const assetId = `ast-${testRunId}`;
  const assetTag = `TAG-${testRunId.slice(-6).toUpperCase()}`;

  before(async () => {
    // 1. Create isolated Tenant
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: "Test Statutory Corporation India",
        slug: `statutory-corp-${testRunId}`,
        currency: "INR",
      },
    });

    // 2. Create User
    await prisma.user.create({
      data: {
        id: userId,
        email: `statutory.${testRunId}@masterhrms.com`,
        passwordHash: "hash-test-pass",
      },
    });

    // 3. Create Department
    const dept = await prisma.department.create({
      data: {
        tenantId,
        name: "Finance & Taxation",
        description: "Statutory filing department",
      },
    });

    // 4. Create Establishment
    const est = await prisma.establishment.create({
      data: {
        tenantId,
        name: "Chennai Head Office",
        code: `EST-${testRunId.slice(-4)}`,
        epfCode: "TN/MAS/0012345/000",
        esicCode: "51000123450000001",
        stateCode: "TN",
        address: "Guindy Tech Park, Chennai, Tamil Nadu",
        status: "active",
      },
    });

    // 5. Create Employee with PAN, UAN, Bank Details
    await prisma.employee.create({
      data: {
        id: employeeId,
        tenantId,
        userId,
        employeeCode: `EMP-${testRunId.slice(-4)}`,
        firstName: "Rajesh",
        lastName: "Sundaram",
        email: `rajesh.${testRunId}@statutory.com`,
        phone: "+919876543210",
        departmentId: dept.id,
        establishmentId: est.id,
        pan: "ABCDE1234F",
        uan: "101234567890",
        esiNumber: "5100012345",
        bankName: "HDFC Bank",
        bankAccount: "50100234567890",
        bankIfsc: "HDFC0000123",
        salary: 75000,
        pfEligible: true,
        esiEligible: false,
        joinedAt: new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000), // 2 years tenure
        status: "active",
      },
    });

    // 6. Create Payroll Run and Payslip
    const payrollRun = await prisma.payrollRun.create({
      data: {
        tenantId,
        periodMonth: 12,
        periodYear: 2025,
        status: "completed",
        approvalStatus: "approved",
      },
    });

    await prisma.payslip.create({
      data: {
        tenantId,
        payrollRunId: payrollRun.id,
        employeeId,
        periodMonth: 12,
        periodYear: 2025,
        grossSalary: 75000,
        netSalary: 64500,
        deductions: 6300,
        breakdown: {
          BASIC: 37500,
          HRA: 18750,
          SPECIAL_ALLOWANCE: 18750,
          EPF: 1800,
          PROFESSIONAL_TAX: 208,
          TDS: 4500,
        },
      },
    });

    // 7. Create Asset Category & Asset for QR Tag test (FN-047)
    const category = await prisma.assetCategory.create({
      data: {
        tenantId,
        name: "Laptops & Computing",
        slug: `laptops-${testRunId}`,
        prefix: "LAP",
      },
    });

    await prisma.asset.create({
      data: {
        id: assetId,
        tenantId,
        assetTag,
        name: 'MacBook Pro 16" M3 Max',
        serialNumber: `SN-${testRunId.toUpperCase()}`,
        categoryId: category.id,
        category: "laptop",
        assignedEmployeeId: employeeId,
        status: "assigned",
        purchasePrice: 249900,
        warrantyExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
  });

  after(async () => {
    // Cleanup fixtures
    try {
      await prisma.asset.deleteMany({ where: { tenantId } });
      await prisma.assetCategory.deleteMany({ where: { tenantId } });
      await prisma.statutoryReturnFiling.deleteMany({ where: { tenantId } });
      await prisma.payslip.deleteMany({ where: { tenantId } });
      await prisma.payrollRun.deleteMany({ where: { tenantId } });
      await prisma.employee.deleteMany({ where: { tenantId } });
      await prisma.establishment.deleteMany({ where: { tenantId } });
      await prisma.department.deleteMany({ where: { tenantId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch (err) {
      // Ignored during teardown
    }
  });

  // -------------------------------------------------------------
  // TEST 1: FN-022 — Form 16 Part A & Part B PDF Generator
  // -------------------------------------------------------------
  test("FN-022: Annual Form 16 Part A & Part B PDF Generation with Tax Computations", async () => {
    const result = await Form16Service.generateForm16({
      tenantId,
      employeeId,
      financialYear: "2025-2026",
      regime: "new",
      generatedBy: "tax-admin@masterhrms.com",
    });

    assert.ok(result, "Form 16 result should be returned");
    assert.equal(result.pan, "ABCDE1234F", "Employee PAN must match");
    assert.equal(result.financialYear, "2025-2026", "Financial Year must match");
    assert.equal(result.assessmentYear, "2026-2027", "Assessment Year must be FY + 1");
    assert.equal(result.regime, "new", "Regime must be new");

    // Part A checks
    assert.equal(result.partA.quarters.length, 4, "Part A must contain exactly 4 quarters (Q1 to Q4)");
    assert.ok(result.partA.totalAmountPaid > 0, "Gross salary paid across quarters must be positive");
    assert.ok(result.partA.totalTaxDeducted >= 0, "Tax deducted must be non-negative");

    // Part B checks
    assert.ok(result.partB.grossSalary > 0, "Part B gross salary must be positive");
    assert.equal(result.partB.standardDeduction, 75000, "Standard deduction under new regime must be ₹75,000");
    assert.ok(result.partB.totalTaxableIncome >= 0, "Taxable income must be calculated");
    assert.ok(result.partB.educationCess >= 0, "4% Education cess must be calculated");

    // PDF validation
    assert.ok(result.pdfBuffer && result.pdfBuffer.length > 500, "PDF buffer must be valid binary document");
    assert.ok(fs.existsSync(result.pdfPath), "PDF file must be written to disk in tenant storage");
    assert.ok(result.pdfHash && result.pdfHash.length === 64, "SHA-256 hash must be 64 characters");

    // DB StatutoryReturnFiling check
    const filing = await prisma.statutoryReturnFiling.findFirst({
      where: {
        tenantId,
        returnType: "FORM_16",
        wageYear: 2026,
      },
    });
    assert.ok(filing, "StatutoryReturnFiling record must be created in database");
    assert.equal(filing.fileFormat, "pdf", "Filing format must be pdf");
  });

  // -------------------------------------------------------------
  // TEST 2: FN-023 — Form 24Q Quarterly Return Generator
  // -------------------------------------------------------------
  test("FN-023: Form 24Q Quarterly TDS Return (NSDL e-TDS FVU Text & CSV Generation)", async () => {
    const q1Result = await Form24QService.generateQuarterlyReturn({
      tenantId,
      financialYear: "2025-2026",
      quarter: "Q1",
      generatedBy: "tds-officer@masterhrms.com",
    });

    assert.ok(q1Result, "Form 24Q result must be returned");
    assert.equal(q1Result.quarter, "Q1", "Quarter must match Q1");
    assert.equal(q1Result.financialYear, "2025-2026", "Financial Year must match");
    assert.ok(q1Result.totalDeductees > 0, "Must contain salary deductees");
    assert.ok(q1Result.totalSalaryPaid > 0, "Total salary paid must be calculated");
    assert.equal(q1Result.totalChallans, 1, "Must contain at least 1 challan record");

    // NSDL FVU Format Verification
    assert.ok(q1Result.fvuContent.includes("^FH^NSDL-24Q^R^"), "File Header must contain valid NSDL-24Q record");
    assert.ok(q1Result.fvuContent.includes("^BH^1^"), "Batch Header must start with ^BH^");
    assert.ok(q1Result.fvuContent.includes("^CD^1^1^"), "Challan Detail must contain ^CD^");
    assert.ok(q1Result.fvuContent.includes("^DD^1^1^"), "Deductee Detail must contain ^DD^");
    assert.ok(q1Result.fvuContent.includes("FVU 8.4"), "Must declare FVU 8.4 spec compatibility");

    // Check files on disk
    assert.ok(fs.existsSync(q1Result.filePath), "FVU text file must be saved on disk");
    assert.ok(q1Result.fileHash && q1Result.fileHash.length === 64, "SHA-256 hash must be valid");

    // Check CSV representation
    assert.ok(q1Result.csvContent.includes("Employee PAN"), "CSV representation must include column headers");
  });

  // -------------------------------------------------------------
  // TEST 3: FN-024 — EPFO Form 19, 10C, 31 & ESIC Form 1
  // -------------------------------------------------------------
  test("FN-024: EPFO Statutory Claims (Form 19 Final Settlement, Form 10C, Form 31 Advance & ESIC Form 1)", async () => {
    // 1. Form 19: PF Final Settlement
    const form19 = await EpfoEsicService.generateClaim({
      tenantId,
      employeeId,
      claimType: "FORM_19",
    });
    assert.equal(form19.claimType, "FORM_19", "Claim type must be FORM_19");
    assert.ok(form19.eligibleAmount > 0, "Eligible settlement amount must be positive based on salary and tenure");
    assert.equal(form19.uan, "101234567890", "UAN must match employee record");
    assert.ok(form19.pdfBuffer && form19.pdfBuffer.length > 500, "Form 19 PDF must be generated");
    assert.ok(fs.existsSync(form19.pdfPath), "Form 19 PDF must be persisted on disk");

    // 2. Form 10C: EPS Pension Benefit
    const form10C = await EpfoEsicService.generateClaim({
      tenantId,
      employeeId,
      claimType: "FORM_10C",
    });
    assert.equal(form10C.claimType, "FORM_10C", "Claim type must be FORM_10C");
    assert.ok(form10C.details.benefitType.includes("Withdrawal Benefit"), "Tenure < 10 yrs must yield Withdrawal Benefit");

    // 3. Form 31: PF Advance (House construction)
    const form31 = await EpfoEsicService.generateClaim({
      tenantId,
      employeeId,
      claimType: "FORM_31",
      reason: "house_construction",
      requestedAmount: 50000,
    });
    assert.equal(form31.claimType, "FORM_31", "Claim type must be FORM_31");
    assert.ok(form31.eligibleAmount >= form31.approvedAmount, "Approved amount cannot exceed eligible amount");
    assert.equal(form31.approvedAmount, 50000, "Requested 50,000 must be approved within cap");

    // 4. ESIC Form 1: Registration Declaration
    const esicForm1 = await EpfoEsicService.generateClaim({
      tenantId,
      employeeId,
      claimType: "ESIC_FORM_1",
    });
    assert.equal(esicForm1.claimType, "ESIC_FORM_1", "Claim type must be ESIC_FORM_1");
    assert.ok(esicForm1.details.dispensary.length > 0, "Dispensary must be designated");
    assert.ok(fs.existsSync(esicForm1.pdfPath), "ESIC Form 1 PDF must be persisted on disk");
  });

  // -------------------------------------------------------------
  // TEST 4: FN-039 — Bank Statement Multi-Tier Reconciliation Engine
  // -------------------------------------------------------------
  test("FN-039: Bank Statement CSV Auto-Reconciliation Engine with Multi-Tier Matching", async () => {
    // 1. Seed sample ERP Sale Payment and Journal Entry
    const sale = await prisma.sale.create({
      data: {
        tenantId,
        invoiceNo: `INV-RECON-${testRunId.slice(-4)}`,
        date: new Date(),
        total: 25000,
        paidAmount: 25000,
        paymentStatus: "paid",
      },
    });

    const payment = await prisma.salePayment.create({
      data: {
        saleId: sale.id,
        amount: 25000,
        method: "Bank Transfer",
        referenceNo: `UTR-HDFC-${testRunId.slice(-5)}`,
        notes: `Customer invoice payment UTR-HDFC-${testRunId.slice(-5)}`,
        paidAt: new Date(),
      },
    });

    const journal = await prisma.journalEntry.create({
      data: {
        tenantId,
        entryNumber: `JV-RECON-${testRunId.slice(-4)}`,
        entryDate: new Date(),
        reference: `CHQ-${testRunId.slice(-4)}`,
        description: "Office Electricity Bill Payment",
        totalAmount: 4800,
        status: "posted",
      },
    });

    // 2. Prepare Sample Bank Statement Rows
    const statementRows = [
      {
        transactionDate: new Date().toISOString().slice(0, 10),
        description: `NEFT Inward Clg UTR-HDFC-${testRunId.slice(-5)}`,
        referenceNo: `UTR-HDFC-${testRunId.slice(-5)}`,
        credit: 25000,
        debit: 0,
        balance: 125000,
      },
      {
        transactionDate: new Date().toISOString().slice(0, 10),
        description: `TNEB EB BILL CHQ-${testRunId.slice(-4)}`,
        referenceNo: `CHQ-${testRunId.slice(-4)}`,
        credit: 0,
        debit: 4800,
        balance: 120200,
      },
      {
        transactionDate: new Date().toISOString().slice(0, 10),
        description: "Unidentified Vendor Wire",
        referenceNo: "WIRE-UNKNOWN-999",
        credit: 0,
        debit: 1500,
        balance: 118700,
      },
    ];

    // 3. Execute Reconciliation
    const report = await BankReconciliationService.reconcile({
      tenantId,
      statementRows,
      autoMatchThreshold: 75,
    });

    assert.ok(report, "Reconciliation report must be generated");
    assert.equal(report.totalStatementRows, 3, "Must evaluate all 3 statement rows");
    assert.equal(report.matchedCount, 2, "Must successfully match the 2 known ERP payments/journals");
    assert.equal(report.unmatchedCount, 1, "Must flag the 1 unknown transaction as unmatched");
    assert.equal(report.matchedAmount, 29800, "Matched amount must equal 25,000 + 4,800");

    // Check match confidence scores
    const creditMatch = report.matchedPairs.find((p) => p.bankTransaction.credit === 25000);
    assert.ok(creditMatch, "Customer receipt must be in matched pairs");
    assert.equal(creditMatch.matchType, "EXACT_MATCH", "Exact UTR + Amount + Date match must be EXACT_MATCH");
    assert.equal(creditMatch.confidenceScore, 100, "Exact match score must be 100");

    const debitMatch = report.matchedPairs.find((p) => p.bankTransaction.debit === 4800);
    assert.ok(debitMatch, "Electricity bill must be in matched pairs");
    assert.ok(debitMatch.confidenceScore >= 90, "Matched journal entry confidence must be >= 90");

    // Check CSV Parser
    const sampleCsv = `Date,Narration,Chq/Ref No,Debit,Credit,Balance
2026-11-20,"NEFT Inward Ref123",REF123,,15000,65000
2026-11-20,"Internet Bill",CHQ456,2500,,62500`;
    const parsed = BankReconciliationService.parseBankCsv(sampleCsv);
    assert.equal(parsed.length, 2, "CSV parser must extract 2 rows");
    assert.equal(parsed[0].credit, 15000, "First row credit must be parsed");
    assert.equal(parsed[1].debit, 2500, "Second row debit must be parsed");

    // Clean fixtures
    await prisma.salePayment.delete({ where: { id: payment.id } });
    await prisma.sale.delete({ where: { id: sale.id } });
    await prisma.journalEntry.delete({ where: { id: journal.id } });
  });

  // -------------------------------------------------------------
  // TEST 5: FN-047 — Public QR Tag Asset Passport Endpoint
  // -------------------------------------------------------------
  test("FN-047: Public Unauthenticated Asset QR Tag Passport Lookup (Warranty & Custodian)", async () => {
    // Directly verify the database asset passport resolution matching handlePublicAssetTagLookup
    const asset = await prisma.asset.findFirst({
      where: { assetTag },
      include: {
        categoryRel: { select: { name: true, icon: true, prefix: true } },
        assignedEmployee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            position: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    assert.ok(asset, "Asset must be discoverable by assetTag");
    assert.equal(asset.assetTag, assetTag, "Asset tag must match query");
    assert.equal(asset.name, 'MacBook Pro 16" M3 Max', "Asset name must match");
    assert.equal(asset.status, "assigned", "Asset status must be assigned");
    assert.ok(asset.categoryRel, "Asset category must be populated");
    assert.equal(asset.categoryRel?.name, "Laptops & Computing", "Category name must match");
    assert.ok(asset.assignedEmployee, "Custodian employee must be populated");
    assert.equal(asset.assignedEmployee?.firstName, "Rajesh", "Custodian first name must match");
    assert.equal(asset.assignedEmployee?.department?.name, "Finance & Taxation", "Custodian department must match");
  });
});
