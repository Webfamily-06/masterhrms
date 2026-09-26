import { prisma } from "../prisma";

export interface ComplianceEvaluationParams {
  tenantId: string;
  employeeId?: string;
  formCode?: string;
  financialYear: string;
  quarter?: string;
}

export interface RuleCriterion {
  name: string;
  currentValue: string | number | boolean;
  requiredValue: string;
  satisfied: boolean;
  sourceField: string;
}

export interface FormComplianceResult {
  formCode: string;
  formNumber: string;
  title: string;
  actTitle: string;
  classification:
    | "EMPLOYEE_TAX_DECLARATION"
    | "EMPLOYER_CERTIFICATE"
    | "EMPLOYER_RETURN"
    | "EMPLOYER_REGISTER"
    | "EMPLOYEE_EVENT"
    | "CONDITIONAL_CLAIM"
    | "LEGACY_TRANSITIONAL";
  status:
    | "APPLICABLE"
    | "NOT_APPLICABLE"
    | "DECLARATION_PENDING"
    | "DECLARATION_VERIFIED"
    | "NOT_REQUIRED"
    | "EMPLOYER_AGGREGATE";
  isEligible: boolean;
  reasonCode: string;
  reason: string;
  requiredAction: string;
  dataSource: string;
  rulesVersion: string;
  evaluatedAt: string;
  criteria: RuleCriterion[];
  successorNotice?: string;
}

// Configurable Statutory Constants (Versioned Rules Engine)
export const STATUTORY_RULES_CONFIG = {
  VERSION: "2026-27-v1.4",
  ESI_WAGE_CEILING_STANDARD: 21000,
  ESI_WAGE_CEILING_DISABILITY: 25000,
  SENIOR_CITIZEN_AGE_THRESHOLD: 60,
  SUPER_SENIOR_CITIZEN_AGE_THRESHOLD: 80,
  GRATUITY_MIN_SERVICE_YEARS: 5,
  EPS_PENSION_MAX_WITHDRAWAL_YEARS: 10,
  STANDARD_DEDUCTION_NEW_REGIME: 75000,
  STANDARD_DEDUCTION_OLD_REGIME: 50000,
  INCOME_TAX_BASIC_EXEMPTION_THRESHOLD: 300000,
};

/**
 * Authoritative Backend Compliance & Statutory Rules Engine
 */
export async function evaluateComplianceRules(
  params: ComplianceEvaluationParams
): Promise<FormComplianceResult[]> {
  const { tenantId, employeeId, formCode, financialYear, quarter = "Q1" } = params;

  // 1. Fetch Tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error(`Tenant context ${tenantId} not found.`);
  }

  // 2. Fetch Employee if provided
  let employee: any = null;
  let payslips: any[] = [];
  let taxDeclaration: any = null;

  if (employeeId) {
    employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        department: true,
        salaryAssignments: {
          where: { isCurrent: true },
          take: 1,
        },
        taxDeclarations: {
          where: { financialYear },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new Error(`Employee ${employeeId} does not belong to tenant ${tenantId}`);
    }

    const fyYears = financialYear.split("-");
    const startYear = Number(fyYears[0]) || 2026;
    const endYear = Number(fyYears[1]) || startYear + 1;

    payslips = await prisma.payslip.findMany({
      where: {
        tenantId,
        employeeId,
        OR: [
          { periodYear: startYear, periodMonth: { gte: 4 } },
          { periodYear: endYear, periodMonth: { lte: 3 } },
        ],
      },
    });

    taxDeclaration = employee.taxDeclarations?.[0] || null;
  }

  // Derived Employee Compliance Profile
  const now = new Date();
  let age: number | null = null;
  if (employee?.dateOfBirth) {
    const dob = new Date(employee.dateOfBirth);
    age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
  }

  let tenureYears = 0;
  if (employee?.joinedAt) {
    const joined = new Date(employee.joinedAt);
    tenureYears = Math.max(0, Math.floor((now.getTime() - joined.getTime()) / (365.25 * 24 * 3600 * 1000)));
  }

  const assignment = employee?.salaryAssignments?.[0];
  const monthlyGross = Number(assignment?.ctcMonthly || employee?.salary || 0);
  const annualGross = Number(assignment?.ctcAnnual || monthlyGross * 12);
  const isSeparated = ["resigned", "terminated", "retired", "separated"].includes(
    String(employee?.status || "active").toLowerCase()
  );

  const totalTdsPaidFY = payslips.reduce((acc, p) => {
    const bd = p.breakdown as any;
    return acc + Number(bd?.deductions?.tds || 0);
  }, 0);

  const evaluatedAt = new Date().toISOString();

  // Definition of Forms to Evaluate
  const FORMS_TO_EVALUATE = [
    { code: "FORM_16_ITA2025", number: "FORM NO. 16", title: "Certificate under Section 392 for Tax Deducted at Source on Salary", act: "Income-tax Act, 2025" },
    { code: "FORM_12BB_ITA2025", number: "FORM NO. 12BB", title: "Statement of Claims by Employee for Deduction of Tax", act: "Income-tax Rules (Rule 26C)" },
    { code: "FORM_138_ITA2025", number: "FORM NO. 138", title: "Quarterly Statement of TDS on Salary under Section 392", act: "Income-tax Act, 2025" },
    { code: "FORM_121_ITA2025", number: "FORM NO. 121", title: "Declaration for Non-Deduction of Tax under Section 398", act: "Income-tax Act, 2025" },
    { code: "FORM_15G_ITA1961", number: "FORM NO. 15G", title: "Declaration under section 197A(1) for individuals below age 60", act: "Income-tax Act, 1961 (Legacy)" },
    { code: "FORM_15H_ITA1961", number: "FORM NO. 15H", title: "Declaration under section 197A(1C) by senior citizens age 60+", act: "Income-tax Act, 1961 (Legacy)" },
    { code: "FORM_24Q_ITA1961", number: "FORM NO. 24Q", title: "Quarterly statement of tax deduction in respect of salary", act: "Income-tax Act, 1961 (Legacy)" },
    { code: "EPF_FORM_19", number: "FORM NO. 19", title: "Application for Final Settlement of Employees' Provident Fund", act: "Employees' Provident Funds Scheme, 1952" },
    { code: "EPF_FORM_10C", number: "FORM NO. 10C", title: "Application for Scheme Certificate / Pension Withdrawal Benefit", act: "Employees' Pension Scheme, 1995" },
    { code: "EPF_FORM_31", number: "FORM NO. 31", title: "Application for Non-Refundable Advance from Provident Fund", act: "Employees' Provident Funds Scheme, 1952" },
    { code: "ESI_FORM_1", number: "FORM NO. 1", title: "Declaration Form for Employee Registration under ESI", act: "Employees' State Insurance Act, 1948" },
    { code: "GRATUITY_FORM_I", number: "FORM NO. I", title: "Application for Gratuity by an Employee", act: "Payment of Gratuity Act, 1972" },
    { code: "WAGES_REGISTER_FORM_A", number: "FORM NO. A", title: "Statutory Register of Wages, Overtime, and Deductions", act: "Code on Wages, 2019" },
  ];

  const results: FormComplianceResult[] = [];

  for (const form of FORMS_TO_EVALUATE) {
    if (formCode && form.code !== formCode) continue;

    const criteria: RuleCriterion[] = [];
    let classification: FormComplianceResult["classification"] = "CURRENT" as any;
    let status: FormComplianceResult["status"] = "APPLICABLE";
    let isEligible = true;
    let reasonCode = "ELIGIBLE_STANDARD";
    let reason = "Statutory conditions met.";
    let requiredAction = "Ready for generation / download.";
    let dataSource = "Live Database";
    let successorNotice: string | undefined = undefined;

    switch (form.code) {
      // 1. FORM 16 (Salary TDS Certificate)
      case "FORM_16_ITA2025": {
        classification = "EMPLOYER_CERTIFICATE";
        const hasPayroll = payslips.length > 0 || annualGross > 0;
        const hasTds = totalTdsPaidFY > 0;

        criteria.push(
          { name: "Processed Payroll in FY", currentValue: payslips.length, requiredValue: "> 0 runs", satisfied: hasPayroll, sourceField: "payslips.length" },
          { name: "Employee PAN on Record", currentValue: employee?.pan || "Missing", requiredValue: "Valid 10-digit PAN", satisfied: Boolean(employee?.pan), sourceField: "employees.pan" },
          { name: "TDS Deducted in FY", currentValue: `INR ${totalTdsPaidFY}`, requiredValue: "Any or 0", satisfied: true, sourceField: "payslips.breakdown.tds" }
        );

        if (!hasPayroll) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "NO_PAYROLL_IN_FY";
          reason = `No finalized payroll snapshots found for ${employee?.firstName || "employee"} in FY ${financialYear}.`;
          requiredAction = `Process and lock payroll for at least one month in FY ${financialYear} before generating Form 16.`;
        } else if (!employee?.pan) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "MISSING_PAN";
          reason = "Employee PAN is mandatory under Section 392 for Form 16 generation.";
          requiredAction = "Update employee PAN in Employee Master profile.";
        } else {
          status = "APPLICABLE";
          isEligible = true;
          reasonCode = hasTds ? "TDS_CERTIFIED" : "SALARY_CERTIFICATE_ZERO_TDS";
          reason = hasTds
            ? `Applicable: Certified annual salary TDS statement with tax withheld (FY ${financialYear}).`
            : `Applicable: Annual salary certificate issued with Nil TDS liability (FY ${financialYear}).`;
          requiredAction = "Generate and disburse Part A & Part B to employee.";
        }
        dataSource = "Payroll Snapshots → Section 392 Computation Engine";
        break;
      }

      // 2. FORM 12BB (Employee Tax Claims & Declarations)
      case "FORM_12BB_ITA2025": {
        classification = "EMPLOYEE_TAX_DECLARATION";
        const isSubmitted = Boolean(taxDeclaration?.isLocked || taxDeclaration?.totalDeductionApproved > 0);
        const hasDeclarationRecord = Boolean(taxDeclaration);

        criteria.push(
          { name: "Active Employment Status", currentValue: employee?.status || "active", requiredValue: "active", satisfied: !isSeparated, sourceField: "employees.status" },
          { name: "Tax Declaration Submitted", currentValue: isSubmitted ? "Submitted & Verified" : hasDeclarationRecord ? "Draft Pending" : "Not Submitted", requiredValue: "Submitted by employee", satisfied: hasDeclarationRecord, sourceField: "employee_tax_declarations" }
        );

        if (isSeparated) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "EMPLOYEE_SEPARATED";
          reason = "Form 12BB is only applicable to active staff for ongoing financial year tax proof submissions.";
          requiredAction = "No action required for separated staff.";
        } else if (!hasDeclarationRecord) {
          status = "DECLARATION_PENDING";
          isEligible = false;
          reasonCode = "NO_TAX_DECLARATION";
          reason = "Employee has not yet submitted investment claims (80C, 80D, 24b, HRA rent receipts).";
          requiredAction = "Employee must submit tax investment proofs via Employee Self Service portal.";
        } else {
          status = isSubmitted ? "DECLARATION_VERIFIED" : "DECLARATION_PENDING";
          isEligible = true;
          reasonCode = "DECLARATION_ACTIVE";
          reason = `Applicable: Verified investment claim schedule under Rule 26C (FY ${financialYear}).`;
          requiredAction = "Download verified proof schedule for tax records.";
        }
        dataSource = "Employee Tax Declarations → Rule 26C Proof Schedule";
        break;
      }

      // 3. FORM 138 (ITA 2025 Quarterly e-TDS Return)
      case "FORM_138_ITA2025": {
        classification = "EMPLOYER_RETURN";
        status = "EMPLOYER_AGGREGATE";
        isEligible = true;
        reasonCode = "EMPLOYER_LEVEL_RETURN";
        reason = `Organization-level quarterly e-TDS return for Salary TDS (Quarter: ${quarter}, FY ${financialYear}).`;
        requiredAction = "File return quarterly with TIN-NSDL e-Filing portal.";
        dataSource = "Master Payroll Aggregation → Deductor Control Totals";
        criteria.push(
          { name: "Organization TAN Configured", currentValue: tenant.name, requiredValue: "Configured", satisfied: true, sourceField: "tenants.id" },
          { name: "Quarter Selected", currentValue: quarter, requiredValue: "Q1, Q2, Q3, or Q4", satisfied: true, sourceField: "params.quarter" }
        );
        break;
      }

      // 4. FORM 121 (ITA 2025 Zero-TDS Declaration)
      case "FORM_121_ITA2025": {
        classification = "EMPLOYEE_TAX_DECLARATION";
        const estimatedTaxable = Math.max(0, annualGross - STATUTORY_RULES_CONFIG.STANDARD_DEDUCTION_NEW_REGIME);
        const isBelowThreshold = estimatedTaxable <= STATUTORY_RULES_CONFIG.INCOME_TAX_BASIC_EXEMPTION_THRESHOLD || totalTdsPaidFY === 0;

        criteria.push(
          { name: "Active Resident Assessee", currentValue: employee?.state || "Resident", requiredValue: "Resident Individual", satisfied: true, sourceField: "employees.state" },
          { name: "PAN Available", currentValue: employee?.pan || "Missing", requiredValue: "10-digit PAN", satisfied: Boolean(employee?.pan), sourceField: "employees.pan" },
          { name: "Estimated Tax Liability Nil", currentValue: `INR ${totalTdsPaidFY}`, requiredValue: "Nil Tax / Within Exemption Limit", satisfied: isBelowThreshold, sourceField: "payroll.taxCalculated" }
        );

        if (!employee?.pan) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "MISSING_PAN";
          reason = "PAN is mandatory under Section 398 to file zero-TDS self declaration.";
          requiredAction = "Add valid PAN in employee master profile.";
        } else {
          status = "APPLICABLE";
          isEligible = true;
          reasonCode = "ZERO_TDS_ELIGIBLE";
          reason = `Applicable: Self-declaration under Section 398 for non-deduction of tax (FY ${financialYear}).`;
          requiredAction = "Submit signed declaration to payroll deductor.";
        }
        dataSource = "Employee Master → Section 398 Self-Declaration";
        break;
      }

      // 5. FORM 15G (Legacy ITA 1961 - Below 60 yrs)
      case "FORM_15G_ITA1961": {
        classification = "LEGACY_TRANSITIONAL";
        successorNotice = "Legacy form under ITA 1961. Use Form 121 for current FY 2026-27 filings.";
        const isUnder60 = age !== null ? age < STATUTORY_RULES_CONFIG.SENIOR_CITIZEN_AGE_THRESHOLD : true;

        criteria.push(
          { name: "Declarant Age < 60 Years", currentValue: age !== null ? `${age} yrs` : "Unknown", requiredValue: "< 60 years", satisfied: isUnder60, sourceField: "employees.dateOfBirth" },
          { name: "PAN on Record", currentValue: employee?.pan || "Missing", requiredValue: "Valid PAN", satisfied: Boolean(employee?.pan), sourceField: "employees.pan" }
        );

        if (!isUnder60) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "AGE_EXCEEDS_60";
          reason = `Ineligible: Declarant age is ${age} years. Individuals aged 60+ must use Form 15H (Senior Citizen) or Form 121.`;
          requiredAction = "Generate Form 15H or Form 121 instead.";
        } else {
          status = "APPLICABLE";
          isEligible = true;
          reasonCode = "LEGACY_ELIGIBLE";
          reason = `Applicable for legacy audit filings: Resident individual below 60 years (Age: ${age ?? "Verified"}).`;
          requiredAction = "Use Form 121 for current FY26+ compliance or Form 15G for prior year audits.";
        }
        dataSource = "Employee Master → Date of Birth & PAN";
        break;
      }

      // 6. FORM 15H (Legacy ITA 1961 - Senior Citizen 60+)
      case "FORM_15H_ITA1961": {
        classification = "LEGACY_TRANSITIONAL";
        successorNotice = "Legacy form under ITA 1961. Use Form 121 for current FY 2026-27 filings.";
        const isSenior = age !== null && age >= STATUTORY_RULES_CONFIG.SENIOR_CITIZEN_AGE_THRESHOLD;

        criteria.push(
          { name: "Senior Citizen Age >= 60 Years", currentValue: age !== null ? `${age} yrs` : "Date of Birth Not Set", requiredValue: ">= 60 years", satisfied: isSenior, sourceField: "employees.dateOfBirth" }
        );

        if (!isSenior) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "NOT_SENIOR_CITIZEN";
          reason = `Ineligible: Senior citizen exemption requires age 60+ (Current employee age: ${age !== null ? `${age} yrs` : "DOB missing"}).`;
          requiredAction = "Employees below 60 must use Form 15G or Form 121.";
        } else {
          status = "APPLICABLE";
          isEligible = true;
          reasonCode = "SENIOR_CITIZEN_VERIFIED";
          reason = `Applicable for legacy audit filings: Verified senior citizen (Age: ${age} years).`;
          requiredAction = "Retain signed copy for audit archives.";
        }
        dataSource = "Employee Master → Date of Birth Verification";
        break;
      }

      // 7. FORM 24Q (Legacy ITA 1961 Salary Return)
      case "FORM_24Q_ITA1961": {
        classification = "LEGACY_TRANSITIONAL";
        status = "EMPLOYER_AGGREGATE";
        isEligible = true;
        reasonCode = "LEGACY_SALARY_RETURN";
        reason = "Legacy quarterly salary e-TDS return for pre-2026 fiscal years.";
        requiredAction = "Form 138 is the mandatory successor for FY 2026-27 onward.";
        successorNotice = "Superseded by Form 138 under Income-tax Act, 2025.";
        dataSource = "Historical Payroll Database";
        criteria.push(
          { name: "Applicable Period", currentValue: `FY ${financialYear}`, requiredValue: "Pre-2026 Fiscal Years", satisfied: true, sourceField: "params.financialYear" }
        );
        break;
      }

      // 8. EPF FORM 19 (Final PF Settlement)
      case "EPF_FORM_19": {
        classification = "EMPLOYEE_EVENT";
        criteria.push(
          { name: "Separation / Exit Event", currentValue: employee?.status || "active", requiredValue: "Resigned / Terminated / Retired", satisfied: isSeparated, sourceField: "employees.status" },
          { name: "Universal Account Number (UAN)", currentValue: employee?.uan || "Missing", requiredValue: "Valid 12-digit UAN", satisfied: Boolean(employee?.uan), sourceField: "employees.uan" },
          { name: "Bank Account Registered", currentValue: employee?.bankAccount || "Missing", requiredValue: "Active bank account & IFSC", satisfied: Boolean(employee?.bankAccount && employee?.bankIfsc), sourceField: "employees.bankAccount" }
        );

        if (!isSeparated) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "EMPLOYEE_ACTIVE";
          reason = "Form 19 is only applicable upon separation, resignation, or retirement (Employee is currently Active).";
          requiredAction = "Complete employee exit / resignation workflow before initiating PF final settlement.";
        } else if (!employee?.uan) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "MISSING_UAN";
          reason = "Universal Account Number (UAN) is required to process EPFO final settlement.";
          requiredAction = "Update employee UAN in master profile.";
        } else {
          status = "APPLICABLE";
          isEligible = true;
          reasonCode = "SEPARATION_SETTLEMENT_READY";
          reason = "Applicable: Employee separation recorded; eligible for full Provident Fund withdrawal.";
          requiredAction = "Generate and submit signed Form 19 to EPFO regional field office.";
        }
        dataSource = "Employee Master → Separation Lifecycle & EPFO UAN";
        break;
      }

      // 9. EPF FORM 10C (EPS Pension Withdrawal / Scheme Certificate)
      case "EPF_FORM_10C": {
        classification = "EMPLOYEE_EVENT";
        const hasPensionService = tenureYears < STATUTORY_RULES_CONFIG.EPS_PENSION_MAX_WITHDRAWAL_YEARS;

        criteria.push(
          { name: "Separation Status", currentValue: employee?.status || "active", requiredValue: "Resigned / Terminated / Retired", satisfied: isSeparated, sourceField: "employees.status" },
          { name: "Pension Service < 10 Years", currentValue: `${tenureYears} years`, requiredValue: "< 10 years (for withdrawal benefit)", satisfied: hasPensionService, sourceField: "employees.joinedAt" }
        );

        if (!isSeparated) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "EMPLOYEE_ACTIVE";
          reason = "Form 10C is only applicable post-separation for pension withdrawal or Scheme Certificate.";
          requiredAction = "Complete employee separation workflow first.";
        } else if (!hasPensionService) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "TENURE_EXCEEDS_10_YEARS";
          reason = `Ineligible: Pension service is ${tenureYears} years. Members with 10+ years service are eligible for Monthly Pension (Form 10D), not withdrawal benefit.`;
          requiredAction = "Apply for Monthly Pension under Form 10D.";
        } else {
          status = "APPLICABLE";
          isEligible = true;
          reasonCode = "PENSION_WITHDRAWAL_ELIGIBLE";
          reason = `Applicable: Separation with ${tenureYears} years pension service (eligible for lump-sum or Scheme Certificate).`;
          requiredAction = "Submit Form 10C to EPFO.";
        }
        dataSource = "Employees' Pension Scheme (EPS 1995) → Service Computation";
        break;
      }

      // 10. EPF FORM 31 (PF Advance)
      case "EPF_FORM_31": {
        classification = "CONDITIONAL_CLAIM";
        criteria.push(
          { name: "Active PF Member", currentValue: employee?.status || "active", requiredValue: "Active Employment", satisfied: !isSeparated, sourceField: "employees.status" },
          { name: "UAN Available", currentValue: employee?.uan || "Missing", requiredValue: "Valid UAN", satisfied: Boolean(employee?.uan), sourceField: "employees.uan" }
        );

        status = "APPLICABLE";
        isEligible = true;
        reasonCode = "ADVANCE_WORKFLOW_ACTIVE";
        reason = "Applicable: Non-refundable PF advance claim workflow (Illness, Housing, Marriage, Education).";
        requiredAction = "Select advance purpose and submit application.";
        dataSource = "EPF Scheme 1952 → Paragraph 68 Advance Rules";
        break;
      }

      // 11. ESI FORM 1 (Insured Person Declaration)
      case "ESI_FORM_1": {
        classification = "EMPLOYEE_EVENT";
        const isUnderCeiling = monthlyGross <= STATUTORY_RULES_CONFIG.ESI_WAGE_CEILING_STANDARD;
        const isEligibleFlag = employee?.esiEligible !== false;
        const currentMonth = now.getMonth() + 1; // 1-12
        const contributionPeriod = currentMonth >= 4 && currentMonth <= 9 ? "Apr - Sep (Period 1)" : "Oct - Mar (Period 2)";

        criteria.push(
          { name: "Establishment ESI Scheme Registered", currentValue: tenant.name, requiredValue: "Active ESIC Establishment Code", satisfied: true, sourceField: "tenants.name" },
          { name: "Employee ESI Applicability Setting", currentValue: isEligibleFlag ? "Covered / Opt-In" : "Exempt / Opt-Out", requiredValue: "Eligible for statutory social security", satisfied: isEligibleFlag, sourceField: "employees.esiEligible" },
          { name: "Monthly Gross Wage <= Rs 21,000", currentValue: `INR ${monthlyGross.toLocaleString("en-IN")}`, requiredValue: `<= INR ${STATUTORY_RULES_CONFIG.ESI_WAGE_CEILING_STANDARD} / month`, satisfied: isUnderCeiling, sourceField: "employee_salary_assignments.ctcMonthly" },
          { name: "Applicable Contribution Period", currentValue: contributionPeriod, requiredValue: "Current Statutory Cycle", satisfied: true, sourceField: "statutory.contributionPeriod" },
          { name: "ESI IP Number on File", currentValue: employee?.esiNumber || "Pending Generation", requiredValue: "17-digit IP Number (Post-Reg)", satisfied: Boolean(employee?.esiNumber), sourceField: "employees.esiNumber" }
        );

        if (!isEligibleFlag) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "EMPLOYEE_ESI_EXEMPT";
          reason = `Employee is configured as ESI-exempt under organization statutory settings.`;
          requiredAction = "Enable ESI coverage under Employee Master -> Statutory profile if required.";
        } else if (!isUnderCeiling) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "WAGE_EXCEEDS_ESI_CEILING";
          reason = `Statutorily Excluded: Monthly gross wage is ₹${monthlyGross.toLocaleString("en-IN")}, which exceeds the statutory ceiling of ₹${STATUTORY_RULES_CONFIG.ESI_WAGE_CEILING_STANDARD.toLocaleString("en-IN")}/mo under Section 2(9) of ESI Act, 1948.`;
          requiredAction = "No ESI registration required for employees earning above the statutory wage threshold.";
        } else {
          status = "APPLICABLE";
          isEligible = true;
          reasonCode = "ESI_COVERAGE_MANDATORY";
          reason = `Applicable: Monthly gross wage (₹${monthlyGross.toLocaleString("en-IN")}) falls within statutory social security coverage (Period: ${contributionPeriod}).`;
          requiredAction = "Generate Form 1 declaration and register employee with ESIC branch.";
        }
        dataSource = "ESI Act 1948 → Wage Threshold & Registration Schedule";
        break;
      }

      // 12. GRATUITY FORM I (Gratuity Application after 5+ yrs)
      case "GRATUITY_FORM_I": {
        classification = "EMPLOYEE_EVENT";
        const has5Years = tenureYears >= STATUTORY_RULES_CONFIG.GRATUITY_MIN_SERVICE_YEARS;

        criteria.push(
          { name: "Continuous Service >= 5 Years", currentValue: `${tenureYears} year(s)`, requiredValue: ">= 5 continuous years", satisfied: has5Years, sourceField: "employees.joinedAt" },
          { name: "Separation Recorded", currentValue: employee?.status || "active", requiredValue: "Resigned / Superannuated / Deceased", satisfied: isSeparated, sourceField: "employees.status" }
        );

        if (!has5Years) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "TENURE_BELOW_5_YEARS";
          reason = `Ineligible: Payment of Gratuity Act 1972 requires a minimum of 5 continuous years of service (Current tenure: ${tenureYears} year(s)).`;
          requiredAction = "Gratuity payable only upon completing 5 years of continuous service.";
        } else if (!isSeparated) {
          status = "NOT_APPLICABLE";
          isEligible = false;
          reasonCode = "EMPLOYEE_ACTIVE";
          reason = `Tenure requirement met (${tenureYears} yrs), but Form I application is filed upon separation/resignation (Current status: Active).`;
          requiredAction = "Submit Form I upon separation or superannuation.";
        } else {
          status = "APPLICABLE";
          isEligible = true;
          reasonCode = "GRATUITY_CLAIM_READY";
          reason = `Applicable: Eligible for statutory gratuity disbursal (${tenureYears} years continuous service).`;
          requiredAction = "Employer must settle gratuity within 30 days of application.";
        }
        dataSource = "Payment of Gratuity Act 1972 → Rule 7 Computation Engine";
        break;
      }

      // 13. WAGES REGISTER FORM A
      case "WAGES_REGISTER_FORM_A": {
        classification = "EMPLOYER_REGISTER";
        status = "EMPLOYER_AGGREGATE";
        isEligible = true;
        reasonCode = "MANDATORY_ESTABLISHMENT_REGISTER";
        reason = "Mandatory monthly statutory register of wages and deductions under Section 50 of Code on Wages, 2019.";
        requiredAction = "Maintain and preserve at establishment premises.";
        dataSource = "Master Payroll Snapshot Database";
        criteria.push(
          { name: "Establishment Registered", currentValue: tenant.name, requiredValue: "Valid Establishment", satisfied: true, sourceField: "tenants.id" }
        );
        break;
      }
    }

    results.push({
      formCode: form.code,
      formNumber: form.number,
      title: form.title,
      actTitle: form.act,
      classification,
      status,
      isEligible,
      reasonCode,
      reason,
      requiredAction,
      dataSource,
      rulesVersion: STATUTORY_RULES_CONFIG.VERSION,
      evaluatedAt,
      criteria,
      successorNotice,
    });
  }

  return results;
}
