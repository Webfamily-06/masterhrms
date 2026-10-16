export interface EmployeeDocumentCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  isIdentity?: boolean;
  requiresExpiry?: boolean;
}

export const EMPLOYEE_DOCUMENT_CATEGORIES: EmployeeDocumentCategory[] = [
  {
    id: "aadhaar_national_id",
    name: "Aadhaar Card / National Identity Proof",
    slug: "Identity",
    description: "Government-issued identity cards such as Aadhaar, National ID, or SSN",
    isIdentity: true,
  },
  {
    id: "pan_tax_id",
    name: "PAN Card / Tax Identification",
    slug: "Tax",
    description: "Tax identification certificate such as PAN card, W-9, or national tax ID",
    isIdentity: true,
  },
  {
    id: "passport",
    name: "Passport",
    slug: "Passport",
    description: "Official international travel passport",
    isIdentity: true,
    requiresExpiry: true,
  },
  {
    id: "driving_licence",
    name: "Driving Licence",
    slug: "Driving-Licence",
    description: "Motor vehicle operator driving licence",
    isIdentity: true,
    requiresExpiry: true,
  },
  {
    id: "voter_id_other_proof",
    name: "Voter ID / Other Identity Proof",
    slug: "Identity-Other",
    description: "Voter ID, citizenship card, or municipal identity proof",
    isIdentity: true,
  },
  {
    id: "address_proof",
    name: "Address Proof",
    slug: "Address-Proof",
    description: "Utility bills, lease agreement, or permanent residency proof",
  },
  {
    id: "prev_experience_letter",
    name: "Previous Company Experience Letter",
    slug: "Previous-Employment",
    description: "Formal service or work experience letter from prior employer",
  },
  {
    id: "relieving_letter",
    name: "Relieving Letter",
    slug: "Previous-Employment",
    description: "Official relieving letter confirming release from previous company",
  },
  {
    id: "prev_employment_contract",
    name: "Previous Employment Contract",
    slug: "Previous-Employment",
    description: "Signed contract or offer terms from past employment",
  },
  {
    id: "educational_certificate",
    name: "Educational Certificate",
    slug: "Education",
    description: "Degree, diploma, matriculation, or university graduation certificates",
  },
  {
    id: "professional_certification",
    name: "Professional Certification",
    slug: "Certifications",
    description: "Industry accreditations, technical certifications, or licenses",
  },
  {
    id: "current_employment_contract",
    name: "Current Employment Contract",
    slug: "Contracts",
    description: "Master employment agreement, executive service agreement, or appointment contract",
  },
  {
    id: "appointment_letter",
    name: "Appointment Letter",
    slug: "Contracts",
    description: "Formal job offer acceptance and appointment notification",
  },
  {
    id: "salary_slip",
    name: "Salary Slip",
    slug: "Compensation",
    description: "Prior payslips or proof of previous compensation",
  },
  {
    id: "bank_proof_cheque",
    name: "Bank Proof / Cancelled Cheque",
    slug: "Banking",
    description: "Cancelled bank cheque, account passbook, or bank statement for payroll disbursement",
  },
  {
    id: "pf_uan_esic",
    name: "PF / UAN / ESIC Documents",
    slug: "Statutory",
    description: "Provident fund passbook, UAN registration, or ESIC health insurance card",
  },
  {
    id: "medical_certificate",
    name: "Medical Certificate",
    slug: "Medical",
    description: "Pre-employment medical fitness certificate or health check report",
  },
  {
    id: "other_employee_doc",
    name: "Other Employee Document",
    slug: "Other",
    description: "Any other miscellaneous employee-specific documentation",
  },
];

export const EMPLOYEE_DOCUMENT_NAMES = EMPLOYEE_DOCUMENT_CATEGORIES.map((c) => c.name);

export function getDocumentCategorySlug(categoryName: string): string {
  const match = EMPLOYEE_DOCUMENT_CATEGORIES.find((c) => c.name === categoryName);
  return match ? match.slug : "Other";
}
