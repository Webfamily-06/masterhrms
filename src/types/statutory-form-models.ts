/**
 * Authoritative Form-Specific Statutory Data Models
 * Master ERP HRMS SaaS - Government Compliance Standard
 */

export interface Form16Model {
  formCode: "FORM_16_ITA2025";
  partA: {
    deductorName: string;
    deductorAddress: string;
    deductorTan: string;
    deductorPan: string;
    employeeName: string;
    employeePan: string;
    employeeCode: string;
    assessmentYear: string;
    financialYear: string;
    employmentPeriod: string;
    quarterlyReceipts: Array<{
      quarter: string;
      receiptNo: string;
      amountCredited: number;
      taxDeducted: number;
      taxDeposited: number;
      bsrCode: string;
      dateDeposited: string;
      challanNo: string;
    }>;
    totalTdsDeposited: number;
  };
  partB: {
    grossSalary17_1: number;
    allowancesExempt10: number;
    netSalary: number;
    standardDeduction: number;
    professionalTax: number;
    incomeChargeableSalaries: number;
    otherIncome: number;
    grossTotalIncome: number;
    chapter6ADeductions: {
      section80C: number;
      section80D: number;
      section80G: number;
      section24b: number;
      otherDeductions: number;
      totalDeductions: number;
    };
    totalTaxableIncome: number;
    taxOnTotalIncome: number;
    rebate87A: number;
    taxAfterRebate: number;
    cess: number;
    netTaxPayable: number;
    tdsDeducted: number;
    netTaxDueOrRefund: number;
  };
}

export interface Form12BBModel {
  formCode: "FORM_12BB_ITA2025";
  employee: {
    name: string;
    pan: string;
    code: string;
    designation: string;
    department: string;
    financialYear: string;
  };
  houseRentAllowance: {
    rentPaidAnnual: number;
    landlordName: string;
    landlordAddress: string;
    landlordPan: string;
    receiptsCount: number;
  };
  leaveTravelConcession: {
    amountClaimed: number;
    journeyDetails: string;
    proofAttached: boolean;
  };
  homeLoanInterest24b: {
    lenderName: string;
    lenderPan: string;
    lenderAddress: string;
    interestAmount: number;
    principalAmount: number;
  };
  chapter6ADeductions: {
    epfEmployee: number;
    ppf: number;
    lifeInsurancePremium: number;
    elssMutualFunds: number;
    tuitionFees: number;
    homeLoanPrincipal: number;
    total80C: number;
    medicalInsurance80D: {
      selfAndFamily: number;
      parents: number;
      seniorCitizenParents: boolean;
      total80D: number;
    };
    nps80CCD1B: number;
    donations80G: number;
    totalClaimed: number;
  };
  supportingDocuments: Array<{
    category: string;
    description: string;
    verified: boolean;
  }>;
}

export interface Form121Model {
  formCode: "FORM_121_ITA2025";
  assessee: {
    name: string;
    pan: string;
    status: string;
    residentialStatus: string;
    address: string;
    email: string;
    phone: string;
    financialYear: string;
  };
  estimatedIncome: {
    estimatedIncomeForDecl: number;
    estimatedTotalIncomePreviousYear: number;
    totalFormsFiled: number;
    aggregateAmountForms: number;
  };
  payer: {
    name: string;
    tan: string;
    pan: string;
    address: string;
    dateReceived: string;
    amountCredited: number;
    datePaid: string;
    authorizedSignatory: string;
  };
}

export interface Form138Model {
  formCode: "FORM_138_ITA2025" | "FORM_24Q_ITA1961";
  deductor: {
    name: string;
    tan: string;
    pan: string;
    address: string;
    quarter: string;
    financialYear: string;
    fvuVersion: string;
    signatoryName: string;
  };
  challans: Array<{
    challanNo: string;
    bsrCode: string;
    dateOfDeposit: string;
    challanAmount: number;
    taxAmount: number;
    interest: number;
    fee: number;
    status: string;
  }>;
  deductees: Array<{
    slNo: number;
    pan: string;
    name: string;
    employeeCode: string;
    paymentDate: string;
    amountPaid: number;
    tdsRate: number;
    tdsDeducted: number;
    totalTdsDeposited: number;
    certificateNo: string;
  }>;
  controlTotals: {
    totalDeducteesCount: number;
    totalGrossDisbursed: number;
    totalTdsWithheld: number;
    totalChallansCount: number;
    totalChallanAmount: number;
  };
}

export interface EPFForm19Model {
  formCode: "EPF_FORM_19";
  member: {
    name: string;
    fatherOrSpouseName: string;
    uan: string;
    epfAccountNo: string;
    aadhaar: string;
    pan: string;
    dateOfBirth: string;
  };
  service: {
    establishmentName: string;
    establishmentId: string;
    dateOfJoining: string;
    dateOfLeaving: string;
    reasonForLeaving: string;
  };
  financialSettlement: {
    employeeShareAccumulated: number;
    employerShareAccumulated: number;
    totalSettlementAmount: number;
  };
  bankMandate: {
    bankName: string;
    branch: string;
    accountNumber: string;
    ifscCode: string;
  };
  claimParticulars: {
    claimType: string;
    modeOfDisbursal: string;
    dateOfApplication: string;
  };
}

export interface EPFForm10CModel {
  formCode: "EPF_FORM_10C";
  member: {
    name: string;
    uan: string;
    dateOfBirth: string;
    pan: string;
    aadhaar: string;
  };
  service: {
    establishmentName: string;
    dateOfJoiningEPS: string;
    dateOfExitEPS: string;
    totalPensionServiceYears: number;
    totalPensionServiceMonths: number;
    causeOfLeaving: string;
  };
  schemeBenefit: {
    claimOption: "WITHDRAWAL_BENEFIT" | "SCHEME_CERTIFICATE";
    withdrawalBenefitAmount: number;
    certificateNumber: string;
  };
  familyNominees: Array<{
    name: string;
    relationship: string;
    age: number;
    dateOfBirth: string;
  }>;
  bankMandate: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
}

export interface EPFForm31Model {
  formCode: "EPF_FORM_31";
  member: {
    name: string;
    uan: string;
    epfAccountNo: string;
    monthlyBasicAndDa: number;
    establishmentName: string;
  };
  advanceClaim: {
    purpose: string;
    ruleParagraph: string;
    accumulatedPfBalance: number;
    maxEligibleLimit: number;
    amountRequested: number;
    amountSanctioned: number;
    supportingProofDetails: string;
  };
  bankMandate: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
}

export interface ESIForm1Model {
  formCode: "ESI_FORM_1";
  employer: {
    establishmentName: string;
    employerCode: string;
    address: string;
    principalEmployerName: string;
  };
  insuredPerson: {
    name: string;
    fatherOrSpouseName: string;
    dateOfBirth: string;
    gender: string;
    maritalStatus: string;
    esiInsuranceNumber: string;
    dateOfAppointment: string;
    monthlyGrossWage: number;
    department: string;
    dispensaryName: string;
  };
  familyDependents: Array<{
    name: string;
    relationship: string;
    dateOfBirth: string;
    residesWithMember: boolean;
  }>;
  nominee: {
    name: string;
    relationship: string;
    address: string;
  };
}

export interface GratuityFormIModel {
  formCode: "GRATUITY_FORM_I";
  employee: {
    name: string;
    code: string;
    designation: string;
    department: string;
    address: string;
    pan: string;
  };
  employer: {
    establishmentName: string;
    address: string;
  };
  serviceRecord: {
    dateOfAppointment: string;
    dateOfSeparation: string;
    totalContinuousYears: number;
    totalContinuousMonths: number;
    causeOfSeparation: string;
  };
  gratuityCalculation: {
    lastDrawnBasicSalary: number;
    calculationFormula: string;
    gratuityAmountCalculated: number;
    statutoryCeiling: number;
    finalAmountClaimed: number;
  };
  bankMandate: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
}

export interface WagesRegisterModel {
  formCode: "WAGES_REGISTER_FORM_A";
  establishment: {
    name: string;
    registrationNumber: string;
    wagePeriod: string;
    year: number;
    month: number;
    totalEmployees: number;
  };
  rosterRows: Array<{
    slNo: number;
    employeeCode: string;
    employeeName: string;
    designation: string;
    department: string;
    daysWorked: number;
    lopDays: number;
    basicSalary: number;
    hra: number;
    otherAllowances: number;
    overtime: number;
    grossWages: number;
    epfDeduction: number;
    esiDeduction: number;
    ptDeduction: number;
    tdsDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
    netWages: number;
  }>;
  totals: {
    totalEmployees: number;
    totalDaysWorked: number;
    totalBasic: number;
    totalGrossWages: number;
    totalEpf: number;
    totalEsi: number;
    totalPt: number;
    totalTds: number;
    totalDeductions: number;
    totalNetWages: number;
  };
}

export type AnyStatutoryFormModel =
  | Form16Model
  | Form12BBModel
  | Form121Model
  | Form138Model
  | EPFForm19Model
  | EPFForm10CModel
  | EPFForm31Model
  | ESIForm1Model
  | GratuityFormIModel
  | WagesRegisterModel;
