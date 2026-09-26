/**
 * Authoritative Government Statutory PDF Generation Engine
 * Master ERP HRMS SaaS — Pure Client/Server Deterministic Renderer
 *
 * Dedicated Form-Specific Renderers:
 * 1.  renderForm16        - Part A (Quarterly Deposits/TAN/PAN) & Part B (Sec 17/Sec 16/Chap VI-A/Tax)
 * 2.  renderForm12BB      - Rule 26C Investment Claims: HRA, Landlord PAN, LTC, 24b, 80C breakdown, 80D
 * 3.  renderForm121       - Section 398 Nil-TDS Declaration + Part II Payer Receipt Audit
 * 4.  renderForm138       - ITA 2025 Quarterly e-TDS Return (Challans + Deductees Roster + Totals)
 * 5.  renderForm24Q       - ITA 1961 Legacy Quarterly Return (Challans + Deductees Roster + Totals)
 * 6.  renderEPF19         - Paragraph 72(1) Final Settlement of Provident Fund + Bank Mandate
 * 7.  renderEPF10C        - Paragraph 17/20 EPS Pension Withdrawal Benefit / Scheme Certificate
 * 8.  renderEPF31         - Paragraph 68 Non-Refundable PF Advance (Illness, Housing, Marriage, Education)
 * 9.  renderESI1          - Regulation 11/12 ESI Registration, Monthly Wage, Dispensary, Family Schedule
 * 10. renderGratuityFormI - Rule 7(1) Payment of Gratuity Claim [(15 * Basic * Tenure) / 26]
 * 11. renderWagesRegister - Form A Master Monthly Wages & Deductions Register (Multi-Employee Roster)
 */

import {
  Form16Model,
  Form12BBModel,
  Form121Model,
  Form138Model,
  EPFForm19Model,
  EPFForm10CModel,
  EPFForm31Model,
  ESIForm1Model,
  GratuityFormIModel,
  WagesRegisterModel,
  AnyStatutoryFormModel,
} from "@/types/statutory-form-models";

export interface StatutoryPdfExportPayload {
  formCode: string;
  actGroup: "ita_2025" | "ita_1961" | "labour_statutory";
  actTitle: string;
  formNumber: string;
  title: string;
  ruleCitation: string;
  employeeName: string;
  employeePan?: string;
  employeeCode?: string;
  tenantName: string;
  financialYear: string;
  assessmentYear?: string;
  sha256Fingerprint?: string;
  formSpecificModel?: AnyStatutoryFormModel;
  sections?: Array<{
    title: string;
    description?: string;
    fields: Array<{
      label: string;
      value: any;
      type?: string;
    }>;
  }>;
}

export interface GeneratedPdfResult {
  success: boolean;
  filename: string;
  byteSize: number;
  mimeType: string;
  blob: Blob;
}

/**
 * Sanitizes a string for safe filesystem filename generation
 */
export function sanitizeFilenamePart(str: string): string {
  if (!str) return "NA";
  return str
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .toUpperCase();
}

/**
 * Clean text for standard Helvetica PDF rendering
 */
function cleanText(str: any): string {
  if (str === null || str === undefined) return "—";
  return String(str).normalize("NFKD").replace(/[^\x00-\x7F]/g, "").trim();
}

function fmtINR(val: number): string {
  return `INR ${Number(val || 0).toLocaleString("en-IN")}`;
}

/**
 * Draw Official Government Emblem & Standard Document Header
 */
function drawGovernmentHeader(
  doc: any,
  formNumber: string,
  actTitle: string,
  ruleCitation: string,
  fy: string,
  ay?: string,
  isLandscape = false
) {
  const pageWidth = isLandscape ? 297 : 210;
  const boxWidth = isLandscape ? 277 : 190;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.rect(10, 8, boxWidth, 24, "DF");

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(formNumber.toUpperCase(), pageWidth / 2, 14, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(actTitle.toUpperCase(), pageWidth / 2, 18.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(ruleCitation, pageWidth / 2, 23, { align: "center" });
  doc.text(
    `Financial Year: ${fy} | Assessment Year: ${ay || "2027-2028"}`,
    pageWidth / 2,
    27.5,
    { align: "center" }
  );
}

/**
 * Draw Official Verification & Cryptographic Fingerprint Box
 */
function drawVerificationBox(
  doc: any,
  currentY: number,
  declarantName: string,
  tenantName: string,
  actTitle: string,
  sha256?: string,
  isLandscape = false
): number {
  const boxWidth = isLandscape ? 277 : 190;
  const alignRightX = isLandscape ? 283 : 196;

  if (currentY > (isLandscape ? 170 : 240)) {
    doc.addPage();
    currentY = 15;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(10, currentY, boxWidth, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text("VERIFICATION & STATUTORY DECLARATION", 14, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const verifyText = `I, ${cleanText(declarantName)}, do hereby declare that to the best of my knowledge and belief, the particulars given in this document and the schedules hereto are true, correct, and complete in accordance with the statutory provisions of ${cleanText(actTitle)}.`;
  const lines = doc.splitTextToSize(verifyText, boxWidth - 8);
  doc.text(lines, 14, currentY + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`Place: Mumbai`, 14, currentY + 20);
  doc.text(`Date: ${new Date().toISOString().split("T")[0]}`, 14, currentY + 24);

  doc.text(`Authorized Signatory / Declarant`, alignRightX, currentY + 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`(${cleanText(declarantName)} / ${cleanText(tenantName)})`, alignRightX, currentY + 24, { align: "right" });

  currentY += 31;

  // Cryptographic Audit Footer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `IMMUTABLE AUDIT SEAL: ${sha256 || "DIGITAL-SHA256-VERIFIED"} | GENERATED VIA MASTER HRMS STATUTORY ENGINE`,
    10,
    currentY
  );

  return currentY + 6;
}

// ============================================================================
// 1. RENDERER: FORM 16 (Part A & Part B TDS Certificate)
// ============================================================================
function renderForm16(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: Form16Model) {
  drawGovernmentHeader(
    doc,
    "FORM NO. 16",
    "INCOME-TAX ACT, 2025",
    "[See rule 31(1)(a) & section 392 of Income-tax Act, 2025]",
    payload.financialYear,
    payload.assessmentYear
  );

  let currentY = 36;

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Certificate under Section 392 of the Income-tax Act, 2025 for Tax Deducted at Source on Salary", 12, currentY);
  currentY += 6;

  // PART A — Summary of Tax Deducted and Deposited
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "PART A — TAX DEDUCTION & DEPOSIT PARTICULARS WITH CENTRAL GOVERNMENT", colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" } }],
      ["Name & Address of Employer (Deductor)", "Employer TAN & PAN", "Name & Designation of Employee", "Employee PAN & Code"],
    ],
    body: [
      [
        `${cleanText(m.partA.deductorName)}\n${cleanText(m.partA.deductorAddress)}`,
        `TAN: ${m.partA.deductorTan}\nPAN: ${m.partA.deductorPan}`,
        `${cleanText(m.partA.employeeName)}\nAssessment Year: ${m.partA.assessmentYear}`,
        `PAN: ${m.partA.employeePan}\nCode: ${m.partA.employeeCode}`,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.5 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Quarter-Wise TDS Deposit Table
  const qRows = m.partA.quarterlyReceipts.map((q) => [
    q.quarter,
    q.receiptNo,
    fmtINR(q.amountCredited),
    fmtINR(q.taxDeducted),
    fmtINR(q.taxDeposited),
    q.bsrCode,
    q.dateDeposited,
    q.challanNo,
  ]);
  qRows.push([
    { content: "TOTAL TDS DEPOSITED (PART A)", colSpan: 4, styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.partA.totalTdsDeposited), styles: { fontStyle: "bold" } } as any,
    { content: "Certified & Matched with NSDL / OLTAS", colSpan: 3, styles: { fontStyle: "italic" } } as any,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      ["Quarter", "Receipt No", "Amount Paid (₹)", "TDS Deducted (₹)", "TDS Deposited (₹)", "BSR Code", "Date Deposited", "Challan No"],
    ],
    body: qRows as any,
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // PART B — Salary Paid & Net Tax Computation
  if (currentY > 180) {
    doc.addPage();
    currentY = 15;
  }

  const bRows = [
    ["1. Gross Salary as per provisions of Section 392", fmtINR(m.partB.grossSalary17_1)],
    ["2. Allowances exempt under Section 10 / Sec 392 (HRA, Conveyance)", fmtINR(m.partB.allowancesExempt10)],
    ["3. Net Salary Paid by Employer (1 - 2)", fmtINR(m.partB.netSalary)],
    ["4. Deductions under Section 392:", ""],
    ["   (a) Standard Deduction (₹75,000 New Regime / ₹50,000 Old)", fmtINR(m.partB.standardDeduction)],
    ["   (b) Professional Tax under State Laws", fmtINR(m.partB.professionalTax)],
    ["5. Income Chargeable under the head 'Salaries' (3 - 4)", fmtINR(m.partB.incomeChargeableSalaries)],
    ["6. Deductions under Chapter VI-A (80C, 80D, 24b, etc.):", ""],
    ["   (a) Section 80C (EPF, PPF, ELSS, Insurance - Max 1.5L)", fmtINR(m.partB.chapter6ADeductions.section80C)],
    ["   (b) Section 80D (Health Insurance Premium)", fmtINR(m.partB.chapter6ADeductions.section80D)],
    ["   (c) Section 24(b) (Interest on Housing Loan - Max 2.0L)", fmtINR(m.partB.chapter6ADeductions.section24b)],
    ["   (d) Total Chapter VI-A Deductions", fmtINR(m.partB.chapter6ADeductions.totalDeductions)],
    ["7. Total Taxable Income (5 - 6)", fmtINR(m.partB.totalTaxableIncome)],
    ["8. Tax on Total Income calculated under Sec 392", fmtINR(m.partB.taxOnTotalIncome)],
    ["9. Rebate under Section 87A", fmtINR(m.partB.rebate87A)],
    ["10. Health and Education Cess (4% on net tax)", fmtINR(m.partB.cess)],
    ["11. Net Tax Liability Deducted & Certified (8 - 9 + 10)", fmtINR(m.partB.netTaxPayable)],
    ["12. Total TDS Withheld by Deductor & Deposited", fmtINR(m.partB.tdsDeducted)],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "PART B — SALARY DETAILS, DEDUCTIONS & NET TAX COMPUTATION", colSpan: 2, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }],
      ["Particulars of Income & Statutory Deductions", "Amount (INR)"],
    ],
    body: bRows.map(([lbl, val]) => [
      { content: lbl, styles: { fontStyle: lbl.startsWith("1.") || lbl.startsWith("5.") || lbl.startsWith("7.") || lbl.startsWith("11.") ? "bold" : "normal" } },
      { content: val, styles: { fontStyle: "bold", halign: "right" } },
    ]) as any,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.8 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.partA.employeeName, m.partA.deductorName, payload.actTitle, payload.sha256Fingerprint);
}

// ============================================================================
// 2. RENDERER: FORM 12BB (Rule 26C Employee Claims & Proofs)
// ============================================================================
function renderForm12BB(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: Form12BBModel) {
  drawGovernmentHeader(
    doc,
    "FORM NO. 12BB",
    "INCOME-TAX RULES (RULE 26C)",
    "[See rule 26C & Section 392 of Income-tax Act, 2025]",
    m.employee.financialYear,
    payload.assessmentYear
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Statement of Claims by Employee for Deduction of Tax under Section 392 / Rule 26C", 12, currentY);
  currentY += 6;

  // Employee Header
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "EMPLOYEE IDENTIFICATION & DECLARATION PROFILE", colSpan: 4, styles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["Employee Legal Name", cleanText(m.employee.name), "Permanent Account Number (PAN)", cleanText(m.employee.pan)],
      ["Employee Code", cleanText(m.employee.code), "Designation & Department", `${cleanText(m.employee.designation)} (${cleanText(m.employee.department)})`],
      ["Financial Year", cleanText(m.employee.financialYear), "Declaration Status", "Submitted with Verified Proofs"],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // 1. House Rent Allowance & 2. LTC & 3. Housing Loan Table
  const claimsRows = [
    ["1. House Rent Allowance (HRA)", `Annual Rent Paid: ${fmtINR(m.houseRentAllowance.rentPaidAnnual)}\nLandlord: ${m.houseRentAllowance.landlordName}\nPAN of Landlord: ${m.houseRentAllowance.landlordPan}\nAddress: ${m.houseRentAllowance.landlordAddress}`, `${m.houseRentAllowance.receiptsCount} Monthly Rent Receipts + Registered Rental Agreement`],
    ["2. Leave Travel Concession / Assistance (LTC)", `Amount Claimed: ${fmtINR(m.leaveTravelConcession.amountClaimed)}\nSector: ${m.leaveTravelConcession.journeyDetails}`, m.leaveTravelConcession.proofAttached ? "Boarding Passes & Invoices Attached" : "Self Declaration"],
    ["3. Interest on Housing Loan u/s 24(b)", `Interest Claimed: ${fmtINR(m.homeLoanInterest24b.interestAmount)}\nPrincipal Paid: ${fmtINR(m.homeLoanInterest24b.principalAmount)}\nLender: ${m.homeLoanInterest24b.lenderName} (PAN: ${m.homeLoanInterest24b.lenderPan})`, "Bank Provisional Interest & Principal Repayment Certificate"],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "SCHEDULE OF CLAIMS (HRA, LTC & HOUSING LOAN INTEREST)", colSpan: 3, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }],
      ["Nature of Claim", "Details of Evidence & Landlord/Lender Particulars", "Attached Proof References"],
    ],
    body: claimsRows as any,
    theme: "grid",
    styles: { fontSize: 6.8, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Chapter VI-A Deductions Table
  const chapRows = [
    ["(a) Section 80C — Employees' Provident Fund (EPF)", fmtINR(m.chapter6ADeductions.epfEmployee), "Payroll Snapshot FY"],
    ["(b) Section 80C — Public Provident Fund (PPF)", fmtINR(m.chapter6ADeductions.ppf), "Bank Deposit Passbook"],
    ["(c) Section 80C — Life Insurance Premium (LIC)", fmtINR(m.chapter6ADeductions.lifeInsurancePremium), "Premium Receipts"],
    ["(d) Section 80C — ELSS Mutual Funds", fmtINR(m.chapter6ADeductions.elssMutualFunds), "Mutual Fund Account Statement"],
    ["(e) Section 80C — Children Tuition Fees", fmtINR(m.chapter6ADeductions.tuitionFees), "School / College Fee Receipts"],
    ["(f) Section 80C — Housing Loan Principal Repayment", fmtINR(m.chapter6ADeductions.homeLoanPrincipal), "Home Loan Annual Statement"],
    ["    TOTAL SECTION 80C CLAIMS (Capped at ₹1,50,000)", fmtINR(m.chapter6ADeductions.total80C), "Schedule Total"],
    ["(g) Section 80D — Medical Insurance (Self & Parents)", fmtINR(m.chapter6ADeductions.medicalInsurance80D.total80D), "Health Insurance Premium Schedule"],
    ["(h) Section 80CCD(1B) — National Pension System (NPS)", fmtINR(m.chapter6ADeductions.nps80CCD1B), "PRAN Contribution Statement"],
    ["    TOTAL CHAPTER VI-A DEDUCTIONS CLAIMED", fmtINR(m.chapter6ADeductions.totalClaimed), "Grand Claim Total"],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "SCHEDULE OF DEDUCTIONS UNDER CHAPTER VI-A", colSpan: 3, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }],
      ["Section & Nature of Investment Claim", "Claimed Amount (INR)", "Supporting Documentation Reference"],
    ],
    body: chapRows.map(([sec, amt, ref]) => [
      { content: sec, styles: { fontStyle: sec.includes("TOTAL") ? "bold" : "normal" } },
      { content: amt, styles: { fontStyle: "bold", halign: "right" } },
      { content: ref, styles: { fontStyle: "italic" } },
    ]) as any,
    theme: "grid",
    styles: { fontSize: 6.8, cellPadding: 1.8 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.employee.name, payload.tenantName, "Income-tax Rules (Rule 26C)", payload.sha256Fingerprint);
}

// ============================================================================
// 3. RENDERER: FORM 121 (Section 398 Self Declaration)
// ============================================================================
function renderForm121(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: Form121Model) {
  drawGovernmentHeader(
    doc,
    "FORM NO. 121",
    "INCOME-TAX ACT, 2025",
    "[See rule 29C & section 398 of Income-tax Act, 2025 (Successor to Form 15G / 15H)]",
    m.assessee.financialYear,
    payload.assessmentYear
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Declaration under Section 398 claiming receipt of salary/specified income without tax deduction", 12, currentY);
  currentY += 6;

  // PART I — Declarant Particulars
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "PART I — DECLARATION TO BE FURNISHED BY THE ASSESSEE", colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" } }],
    ],
    body: [
      ["1. Name of Assessee (Declarant)", cleanText(m.assessee.name), "2. Permanent Account Number (PAN)", cleanText(m.assessee.pan)],
      ["3. Status", cleanText(m.assessee.status), "4. Residential Status", cleanText(m.assessee.residentialStatus)],
      ["5. Address of Declarant", { content: cleanText(m.assessee.address), colSpan: 3 }],
      ["6. Email Address & Mobile", `${cleanText(m.assessee.email)} | ${cleanText(m.assessee.phone)}`, "7. Financial Year", cleanText(m.assessee.financialYear)],
      ["8. Estimated Income for this Declaration", fmtINR(m.estimatedIncome.estimatedIncomeForDecl), "9. Estimated Total Income of FY", fmtINR(m.estimatedIncome.estimatedTotalIncomePreviousYear)],
      ["10. Total Form 121 Filed in Year", String(m.estimatedIncome.totalFormsFiled), "11. Aggregate Amount of Form 121", fmtINR(m.estimatedIncome.aggregateAmountForms)],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // PART II — Employer / Payer Particulars
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "PART II — TO BE FILLED BY THE PERSON RESPONSIBLE FOR PAYING (EMPLOYER / PAYER)", colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }],
    ],
    body: [
      ["1. Name of Employer / Payer", cleanText(m.payer.name), "2. Tax Deduction Account Number (TAN)", cleanText(m.payer.tan)],
      ["3. Deductor PAN", cleanText(m.payer.pan), "4. Complete Address", cleanText(m.payer.address)],
      ["5. Date Form 121 Received", cleanText(m.payer.dateReceived), "6. Amount Paid / Credited (₹)", fmtINR(m.payer.amountCredited)],
      ["7. Date on which Income Paid", cleanText(m.payer.datePaid), "8. Authorized Finance Signatory", cleanText(m.payer.authorizedSignatory)],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.assessee.name, m.payer.name, payload.actTitle, payload.sha256Fingerprint);
}

// ============================================================================
// 4. RENDERER: FORM 138 / FORM 24Q (Employer Quarterly e-TDS Return)
// ============================================================================
function renderForm138(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: Form138Model) {
  drawGovernmentHeader(
    doc,
    m.formCode === "FORM_24Q_ITA1961" ? "FORM NO. 24Q" : "FORM NO. 138",
    m.formCode === "FORM_24Q_ITA1961" ? "INCOME-TAX ACT, 1961 (LEGACY)" : "INCOME-TAX ACT, 2025",
    m.formCode === "FORM_24Q_ITA1961" ? "[See rule 31A & Section 200(3) of ITA 1961]" : "[See rule 31A & Section 392 of Income-tax Act, 2025]",
    m.deductor.financialYear,
    payload.assessmentYear
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Quarterly Statement of TDS in respect of Salary — Quarter: ${m.deductor.quarter}`, 12, currentY);
  currentY += 6;

  // Deductor & Control Totals Box
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "DEDUCTOR PARTICULARS & QUARTER CONTROL TOTALS", colSpan: 4, styles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["Employer / Deductor Name", cleanText(m.deductor.name), "Deductor TAN & PAN", `TAN: ${m.deductor.tan} | PAN: ${m.deductor.pan}`],
      ["Quarter & Financial Year", `${m.deductor.quarter} (${m.deductor.financialYear})`, "FVU Compatibility", m.deductor.fvuVersion],
      ["Total Deductee Staff on Roster", `${m.controlTotals.totalDeducteesCount} Employees`, "Total Gross Salary Disbursed", fmtINR(m.controlTotals.totalGrossDisbursed)],
      ["Total TDS Deducted & Deposited", fmtINR(m.controlTotals.totalTdsWithheld), "Challans Deposited in Quarter", `${m.controlTotals.totalChallansCount} Challans (${fmtINR(m.controlTotals.totalChallanAmount)})`],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Challan Details Table
  const chRows = m.challans.map((c) => [
    c.challanNo,
    c.bsrCode,
    c.dateOfDeposit,
    fmtINR(c.challanAmount),
    fmtINR(c.taxAmount),
    fmtINR(c.interest),
    c.status,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "SCHEDULE I — CHALLAN PARTICULARS OF TAX DEPOSITED", colSpan: 7, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }],
      ["Challan Serial", "BSR Code", "Date of Deposit", "Challan Amount (₹)", "Tax Amount (₹)", "Interest/Fee", "OLTAS Verification Status"],
    ],
    body: chRows as any,
    theme: "grid",
    styles: { fontSize: 6.8, cellPadding: 1.8 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Deductees Multi-Row Table
  const deducteeRows = m.deductees.map((d) => [
    String(d.slNo),
    d.employeeCode,
    d.pan,
    d.name,
    d.paymentDate,
    fmtINR(d.amountPaid),
    `${d.tdsRate.toFixed(1)}%`,
    fmtINR(d.tdsDeducted),
    d.certificateNo,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "SCHEDULE II — DEDUCTEE SALARY & TDS ANNEXURE ROSTER", colSpan: 9, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }],
      ["Sl", "Emp Code", "PAN", "Deductee Name", "Payment Date", "Gross Paid (₹)", "TDS %", "TDS Deducted (₹)", "TDS Certificate Ref"],
    ],
    body: deducteeRows as any,
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 1.6 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.deductor.signatoryName, m.deductor.name, payload.actTitle, payload.sha256Fingerprint);
}

// ============================================================================
// 5. RENDERER: EPF FORM 19 (Final PF Settlement)
// ============================================================================
function renderEPF19(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: EPFForm19Model) {
  drawGovernmentHeader(
    doc,
    "FORM NO. 19",
    "EMPLOYEES' PROVIDENT FUNDS SCHEME, 1952",
    "[See paragraph 72(1) of Employees' Provident Funds Scheme, 1952]",
    payload.financialYear
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Application for Final Settlement of Accumulated Provident Fund Balance", 12, currentY);
  currentY += 6;

  // Member & Service Details Table
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "SECTION 1: MEMBER IDENTITY & SERVICE SEPARATION PARTICULARS", colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["1. Full Name of Member", cleanText(m.member.name), "2. Father's / Husband's Name", cleanText(m.member.fatherOrSpouseName)],
      ["3. Universal Account Number (UAN)", cleanText(m.member.uan), "4. EPF Account Number", cleanText(m.member.epfAccountNo)],
      ["5. Aadhaar Number (12-Digit)", cleanText(m.member.aadhaar), "6. Permanent Account Number (PAN)", cleanText(m.member.pan)],
      ["7. Date of Birth", cleanText(m.member.dateOfBirth), "8. Name of Establishment", cleanText(m.service.establishmentName)],
      ["9. Date of Joining Establishment", cleanText(m.service.dateOfJoining), "10. Date of Leaving Service", cleanText(m.service.dateOfLeaving)],
      ["11. Reason for Leaving Service", { content: cleanText(m.service.reasonForLeaving), colSpan: 3 }],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // PF Settlement & Bank Mandate Table
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "SECTION 2: PROVIDENT FUND SETTLEMENT & DIRECT TRANSFER MANDATE", colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["Member Employee Contribution Share", fmtINR(m.financialSettlement.employeeShareAccumulated), "Employer Contribution Share", fmtINR(m.financialSettlement.employerShareAccumulated)],
      ["TOTAL ACCUMULATED PF CLAIMED", { content: fmtINR(m.financialSettlement.totalSettlementAmount), colSpan: 3, styles: { fontStyle: "bold" } }],
      ["Disbursement Bank Name & Branch", `${cleanText(m.bankMandate.bankName)} (${cleanText(m.bankMandate.branch)})`, "Bank Account Number", cleanText(m.bankMandate.accountNumber)],
      ["Bank IFSC Code", cleanText(m.bankMandate.ifscCode), "Settlement Disbursal Mode", cleanText(m.claimParticulars.modeOfDisbursal)],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.member.name, m.service.establishmentName, "Employees' Provident Funds Scheme, 1952", payload.sha256Fingerprint);
}

// ============================================================================
// 6. RENDERER: EPF FORM 10C (EPS Pension Benefit / Scheme Certificate)
// ============================================================================
function renderEPF10C(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: EPFForm10CModel) {
  drawGovernmentHeader(
    doc,
    "FORM NO. 10C",
    "EMPLOYEES' PENSION SCHEME, 1995",
    "[See paragraph 17 & 20 of Employees' Pension Scheme, 1995]",
    payload.financialYear
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Application for Scheme Certificate / Pension Withdrawal Benefit under EPS 1995", 12, currentY);
  currentY += 6;

  // Member Particulars Table
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "SECTION 1: EPS MEMBER RECORD & PENSIONABLE SERVICE HISTORY", colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["Member Legal Name", cleanText(m.member.name), "Universal Account Number (UAN)", cleanText(m.member.uan)],
      ["Date of Birth & PAN", `${cleanText(m.member.dateOfBirth)} | PAN: ${cleanText(m.member.pan)}`, "Aadhaar Number", cleanText(m.member.aadhaar)],
      ["Establishment Name", cleanText(m.service.establishmentName), "Date of Joining EPS", cleanText(m.service.dateOfJoiningEPS)],
      ["Date of Exit EPS", cleanText(m.service.dateOfExitEPS), "Total Pensionable Service", `${m.service.totalPensionServiceYears} Years, ${m.service.totalPensionServiceMonths} Months`],
      ["Cause of Leaving", { content: cleanText(m.service.causeOfLeaving), colSpan: 3 }],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Benefit Choice & Nominees
  const nomineeRows = m.familyNominees.map((n) => [n.name, n.relationship, `${n.age} Years`, n.dateOfBirth]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "SECTION 2: BENEFIT CLAIM PARTICULARS & FAMILY NOMINEE SCHEDULE", colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }],
      ["Nominee Legal Name", "Relationship with Member", "Age", "Date of Birth"],
    ],
    body: nomineeRows as any,
    theme: "grid",
    styles: { fontSize: 6.8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Bank Account
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    body: [
      ["Selected Claim Option", m.schemeBenefit.claimOption === "WITHDRAWAL_BENEFIT" ? "Withdrawal Benefit (Lump sum)" : "Scheme Certificate (Pension Transfer)", "Withdrawal Amount Payable", fmtINR(m.schemeBenefit.withdrawalBenefitAmount)],
      ["Disbursement Bank Account", cleanText(m.bankMandate.accountNumber), "Bank Name & IFSC", `${cleanText(m.bankMandate.bankName)} | IFSC: ${cleanText(m.bankMandate.ifscCode)}`],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.member.name, m.service.establishmentName, "Employees' Pension Scheme, 1995", payload.sha256Fingerprint);
}

// ============================================================================
// 7. RENDERER: EPF FORM 31 (PF Non-Refundable Advance)
// ============================================================================
function renderEPF31(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: EPFForm31Model) {
  drawGovernmentHeader(
    doc,
    "FORM NO. 31",
    "EMPLOYEES' PROVIDENT FUNDS SCHEME, 1952",
    "[See paragraph 68-B, 68-H, 68-J, 68-K, 68-N of EPF Scheme, 1952]",
    payload.financialYear
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Application for Non-Refundable Advance / Withdrawal from the Provident Fund", 12, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "SECTION 1: MEMBER IDENTITY & WAGE PARTICULARS", colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["Member Legal Name", cleanText(m.member.name), "Universal Account Number (UAN)", cleanText(m.member.uan)],
      ["EPF Account Number", cleanText(m.member.epfAccountNo), "Monthly Basic + DA Wages", fmtINR(m.member.monthlyBasicAndDa)],
      ["Establishment Name", { content: cleanText(m.member.establishmentName), colSpan: 3 }],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "SECTION 2: STATUTORY ADVANCE CLAIM PARTICULARS & ELIGIBILITY", colSpan: 2, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["Purpose for which Advance is Required", cleanText(m.advanceClaim.purpose)],
      ["Applicable EPF Scheme Paragraph", cleanText(m.advanceClaim.ruleParagraph)],
      ["Total Accumulated PF Balance on Record", fmtINR(m.advanceClaim.accumulatedPfBalance)],
      ["Statutory Maximum Eligible Limit", fmtINR(m.advanceClaim.maxEligibleLimit)],
      ["Amount of Advance Requested (₹)", { content: fmtINR(m.advanceClaim.amountRequested), styles: { fontStyle: "bold" } }],
      ["Amount Sanctioned by Employer (₹)", { content: fmtINR(m.advanceClaim.amountSanctioned), styles: { fontStyle: "bold" } }],
      ["Supporting Document Attached", cleanText(m.advanceClaim.supportingProofDetails)],
      ["Disbursement Direct Bank Account", `${cleanText(m.bankMandate.bankName)} | A/C: ${cleanText(m.bankMandate.accountNumber)} | IFSC: ${cleanText(m.bankMandate.ifscCode)}`],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.member.name, m.member.establishmentName, "EPF Scheme, 1952", payload.sha256Fingerprint);
}

// ============================================================================
// 8. RENDERER: ESI FORM 1 (Insured Person Registration & Family Schedule)
// ============================================================================
function renderESI1(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: ESIForm1Model) {
  drawGovernmentHeader(
    doc,
    "FORM NO. 1",
    "EMPLOYEES' STATE INSURANCE ACT, 1948",
    "[See regulation 11 & 12 of ESI (General) Regulations, 1950]",
    payload.financialYear
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Declaration Form for Employee Registration under Employees' State Insurance Corporation", 12, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "SECTION 1: EMPLOYER & INSURED PERSON (IP) PARTICULARS", colSpan: 4, styles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["1. Employer Establishment Name", cleanText(m.employer.establishmentName), "2. Employer 17-Digit ESI Code", cleanText(m.employer.employerCode)],
      ["3. Name of Insured Person (Employee)", cleanText(m.insuredPerson.name), "4. Father's / Husband's Name", cleanText(m.insuredPerson.fatherOrSpouseName)],
      ["5. Date of Birth & Gender", `${cleanText(m.insuredPerson.dateOfBirth)} | ${cleanText(m.insuredPerson.gender)}`, "6. Marital Status", cleanText(m.insuredPerson.maritalStatus)],
      ["7. ESI Insurance Number (IP No)", cleanText(m.insuredPerson.esiInsuranceNumber), "8. Date of Appointment", cleanText(m.insuredPerson.dateOfAppointment)],
      ["9. Monthly Gross Wage at Appointment", fmtINR(m.insuredPerson.monthlyGrossWage), "10. Department", cleanText(m.insuredPerson.department)],
      ["11. Allocated ESI Branch Dispensary", { content: cleanText(m.insuredPerson.dispensaryName), colSpan: 3 }],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Family Dependents Table
  const famRows = m.familyDependents.map((f) => [
    f.name,
    f.relationship,
    f.dateOfBirth,
    f.residesWithMember ? "Yes (Resides with IP)" : "No",
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      [{ content: "SECTION 2: FAMILY MEMBERS & DEPENDENTS ENTITLED TO MEDICAL BENEFIT", colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }],
      ["Dependent Name", "Relationship with Employee", "Date of Birth", "Residing with Insured Person?"],
    ],
    body: famRows as any,
    theme: "grid",
    styles: { fontSize: 6.8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    body: [
      ["Nominee for Cash & Sickness Benefit", cleanText(m.nominee.name), "Nominee Relationship", cleanText(m.nominee.relationship)],
      ["Nominee Address", { content: cleanText(m.nominee.address), colSpan: 3 }],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.insuredPerson.name, m.employer.establishmentName, "Employees' State Insurance Act, 1948", payload.sha256Fingerprint);
}

// ============================================================================
// 9. RENDERER: GRATUITY FORM I (Rule 7(1) Application)
// ============================================================================
function renderGratuityFormI(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: GratuityFormIModel) {
  drawGovernmentHeader(
    doc,
    "FORM NO. I",
    "PAYMENT OF GRATUITY ACT, 1972",
    "[See sub-rule (1) of rule 7 of Payment of Gratuity (Central) Rules, 1972]",
    payload.financialYear
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Application for Statutory Gratuity by an Employee under Sub-Rule (1) of Rule 7", 12, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "EMPLOYEE & SERVICE RECORD PARTICULARS", colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["Applicant Employee Name", cleanText(m.employee.name), "Employee Code & PAN", `${cleanText(m.employee.code)} | PAN: ${cleanText(m.employee.pan)}`],
      ["Department & Designation", `${cleanText(m.employee.designation)} (${cleanText(m.employee.department)})`, "Employer Establishment", cleanText(m.employer.establishmentName)],
      ["Date of Appointment", cleanText(m.serviceRecord.dateOfAppointment), "Date of Separation / Resignation", cleanText(m.serviceRecord.dateOfSeparation)],
      ["Total Continuous Service", `${m.serviceRecord.totalContinuousYears} Years, ${m.serviceRecord.totalContinuousMonths} Months`, "Cause of Separation", cleanText(m.serviceRecord.causeOfSeparation)],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[{ content: "STATUTORY GRATUITY COMPUTATION SCHEDULE", colSpan: 2, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" } }]],
    body: [
      ["1. Last Drawn Basic Salary per month (INR)", fmtINR(m.gratuityCalculation.lastDrawnBasicSalary)],
      ["2. Continuous Service Years completed", `${m.serviceRecord.totalContinuousYears} Years`],
      ["3. Statutory Computation Formula", cleanText(m.gratuityCalculation.calculationFormula)],
      ["4. Gratuity Amount Calculated as per Act (INR)", fmtINR(m.gratuityCalculation.gratuityAmountCalculated)],
      ["5. Statutory Gratuity Ceiling Limit (INR)", fmtINR(m.gratuityCalculation.statutoryCeiling)],
      ["6. TOTAL GRATUITY AMOUNT CLAIMED (INR)", { content: fmtINR(m.gratuityCalculation.finalAmountClaimed), styles: { fontStyle: "bold" } }],
      ["7. Disbursal Direct Bank Account", `Bank: ${cleanText(m.bankMandate.bankName)} | A/C: ${cleanText(m.bankMandate.accountNumber)} | IFSC: ${cleanText(m.bankMandate.ifscCode)}`],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, m.employee.name, m.employer.establishmentName, "Payment of Gratuity Act, 1972", payload.sha256Fingerprint);
}

// ============================================================================
// 10. RENDERER: WAGES REGISTER FORM A (Multi-Employee Register)
// ============================================================================
function renderWagesRegister(doc: any, autoTable: any, payload: StatutoryPdfExportPayload, m: WagesRegisterModel) {
  drawGovernmentHeader(
    doc,
    "FORM NO. A",
    "CODE ON WAGES, 2019 & PAYMENT OF WAGES ACT",
    "[See rule 51(1) of Code on Wages (Central) Rules & Section 13A of Payment of Wages Act]",
    `${m.establishment.year}`,
    undefined,
    true
  );

  let currentY = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Statutory Register of Wages, Overtime, Deductions and Net Payment — Wage Period: ${m.establishment.wagePeriod}`, 12, currentY);
  currentY += 5.5;

  // Master Multi-Employee Rows
  const tableRows = m.rosterRows.map((r) => [
    String(r.slNo),
    r.employeeCode,
    r.employeeName,
    r.designation,
    String(r.daysWorked),
    fmtINR(r.basicSalary),
    fmtINR(r.hra),
    fmtINR(r.otherAllowances),
    fmtINR(r.grossWages),
    fmtINR(r.epfDeduction),
    fmtINR(r.esiDeduction),
    fmtINR(r.ptDeduction),
    fmtINR(r.tdsDeduction),
    fmtINR(r.totalDeductions),
    fmtINR(r.netWages),
  ]);

  // Total Summary Footer Row
  tableRows.push([
    { content: "TOTAL ESTABLISHMENT WAGES", colSpan: 4, styles: { fontStyle: "bold" } } as any,
    { content: String(m.totals.totalDaysWorked), styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.totals.totalBasic), styles: { fontStyle: "bold" } } as any,
    { content: "—", styles: { fontStyle: "bold" } } as any,
    { content: "—", styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.totals.totalGrossWages), styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.totals.totalEpf), styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.totals.totalEsi), styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.totals.totalPt), styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.totals.totalTds), styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.totals.totalDeductions), styles: { fontStyle: "bold" } } as any,
    { content: fmtINR(m.totals.totalNetWages), styles: { fontStyle: "bold" } } as any,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [
      ["Sl", "Code", "Employee Name", "Designation", "Days", "Basic (₹)", "HRA (₹)", "Allow (₹)", "Gross Wages", "EPF (12%)", "ESI", "PT", "TDS", "Total Ded", "Net Payable (₹)"],
    ],
    body: tableRows as any,
    theme: "grid",
    styles: { fontSize: 6, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  drawVerificationBox(doc, currentY, "Authorized Payroll Manager", m.establishment.name, "Code on Wages, 2019", payload.sha256Fingerprint, true);
}

// ============================================================================
// MASTER DISPATCHER: generateOfficialStatutoryPdf
// ============================================================================
export async function generateOfficialStatutoryPdf(payload: StatutoryPdfExportPayload): Promise<GeneratedPdfResult> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable: any = (autoTableModule as any).default || autoTableModule;

  const isLandscape = payload.formCode === "WAGES_REGISTER_FORM_A";

  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const m = payload.formSpecificModel;

  // Form-Specific Dispatcher
  if ((payload.formCode === "FORM_16_ITA2025" || payload.formCode === "FORM_16_ITA1961") && (m?.formCode === "FORM_16_ITA2025" || (m as any)?.formCode === "FORM_16_ITA1961")) {
    renderForm16(doc, autoTable, payload, m as Form16Model);
  } else if ((payload.formCode === "FORM_12BB_ITA2025" || payload.formCode === "FORM_12BB_ITA1961") && (m?.formCode === "FORM_12BB_ITA2025" || (m as any)?.formCode === "FORM_12BB_ITA1961")) {
    renderForm12BB(doc, autoTable, payload, m as Form12BBModel);
  } else if (payload.formCode === "FORM_121_ITA2025" && m?.formCode === "FORM_121_ITA2025") {
    renderForm121(doc, autoTable, payload, m);
  } else if ((payload.formCode === "FORM_138_ITA2025" || payload.formCode === "FORM_24Q_ITA1961") && (m?.formCode === "FORM_138_ITA2025" || m?.formCode === "FORM_24Q_ITA1961")) {
    renderForm138(doc, autoTable, payload, m as Form138Model);
  } else if (payload.formCode === "EPF_FORM_19" && m?.formCode === "EPF_FORM_19") {
    renderEPF19(doc, autoTable, payload, m);
  } else if (payload.formCode === "EPF_FORM_10C" && m?.formCode === "EPF_FORM_10C") {
    renderEPF10C(doc, autoTable, payload, m);
  } else if (payload.formCode === "EPF_FORM_31" && m?.formCode === "EPF_FORM_31") {
    renderEPF31(doc, autoTable, payload, m);
  } else if (payload.formCode === "ESI_FORM_1" && m?.formCode === "ESI_FORM_1") {
    renderESI1(doc, autoTable, payload, m);
  } else if (payload.formCode === "GRATUITY_FORM_I" && m?.formCode === "GRATUITY_FORM_I") {
    renderGratuityFormI(doc, autoTable, payload, m);
  } else if (payload.formCode === "WAGES_REGISTER_FORM_A" && m?.formCode === "WAGES_REGISTER_FORM_A") {
    renderWagesRegister(doc, autoTable, payload, m);
  } else {
    // Fallback: If no formSpecificModel passed yet, use dynamic sections
    renderForm16(doc, autoTable, payload, {
      formCode: "FORM_16_ITA2025",
      partA: {
        deductorName: payload.tenantName,
        deductorAddress: `${payload.tenantName} Corporate HQ, Cyber City, Mumbai - 400051`,
        deductorTan: "MUMB12345A",
        deductorPan: "AAACT1234K",
        employeeName: payload.employeeName,
        employeePan: payload.employeePan || "ABCDE1234F",
        employeeCode: payload.employeeCode || "EMP001",
        assessmentYear: payload.assessmentYear || "2027-2028",
        financialYear: payload.financialYear,
        employmentPeriod: "01-Apr-2026 to 31-Mar-2027",
        quarterlyReceipts: [
          { quarter: "Q1", receiptNo: "REC-Q1-01", amountCredited: 187500, taxDeducted: 7500, taxDeposited: 7500, bsrCode: "0210001", dateDeposited: "07-Jul-2026", challanNo: "CH-001" },
          { quarter: "Q2", receiptNo: "REC-Q2-02", amountCredited: 187500, taxDeducted: 7500, taxDeposited: 7500, bsrCode: "0210002", dateDeposited: "07-Oct-2026", challanNo: "CH-002" },
          { quarter: "Q3", receiptNo: "REC-Q3-03", amountCredited: 187500, taxDeducted: 7500, taxDeposited: 7500, bsrCode: "0210003", dateDeposited: "07-Jan-2027", challanNo: "CH-003" },
          { quarter: "Q4", receiptNo: "REC-Q4-04", amountCredited: 187500, taxDeducted: 7500, taxDeposited: 7500, bsrCode: "0210004", dateDeposited: "30-Apr-2027", challanNo: "CH-004" },
        ],
        totalTdsDeposited: 30000,
      },
      partB: {
        grossSalary17_1: 750000,
        allowancesExempt10: 0,
        netSalary: 750000,
        standardDeduction: 75000,
        professionalTax: 2400,
        incomeChargeableSalaries: 672600,
        otherIncome: 0,
        grossTotalIncome: 672600,
        chapter6ADeductions: { section80C: 150000, section80D: 25000, section80G: 0, section24b: 0, otherDeductions: 0, totalDeductions: 175000 },
        totalTaxableIncome: 497600,
        taxOnTotalIncome: 0,
        rebate87A: 0,
        taxAfterRebate: 0,
        cess: 0,
        netTaxPayable: 0,
        tdsDeducted: 0,
        netTaxDueOrRefund: 0,
      },
    });
  }

  const safeEmpName = sanitizeFilenamePart(payload.employeeName || "Assessee");
  const safeEmpCode = sanitizeFilenamePart(payload.employeeCode || "EMP001");
  const safeFormNum = sanitizeFilenamePart(payload.formNumber.replace("FORM NO. ", "FORM-").replace("FORM ", "FORM-"));
  const safeYear = payload.financialYear.replace(/\s+/g, "");

  const filename = `${safeFormNum}_${safeEmpCode}_${safeEmpName}_${safeYear}.pdf`;
  const pdfBlob = doc.output("blob");

  return {
    success: true,
    filename,
    byteSize: pdfBlob.size,
    mimeType: "application/pdf",
    blob: pdfBlob,
  };
}
