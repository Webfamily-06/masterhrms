export const SAFE_EMPLOYEE_SELECT = {
  id: true,
  tenantId: true,
  userId: true,
  departmentId: true,
  branchId: true,
  designationId: true,
  managerId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  position: true,
  employmentType: true,
  status: true,
  salary: true,
  joinedAt: true,
  pan: true,
  aadhaar: true,
  uan: true,
  esiNumber: true,
  bankName: true,
  bankAccount: true,
  bankIfsc: true,
  bankBranch: true,
  dateOfBirth: true,
  gender: true,
  taxRegime: true,
  state: true,
  workStateCode: true,
  establishmentId: true,
  clientId: true,
  pfNumber: true,
  pfEligible: true,
  pfCalculationMethod: true,
  pfCustomCap: true,
  esiEligible: true,
  ptEligible: true,
  tdsEligible: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  employeeExits: {
    take: 1,
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      resignationDate: true,
      lastWorkingDay: true,
      reason: true,
      status: true,
    },
  },
  salaryAssignments: {
    where: { isCurrent: true },
    take: 1,
    select: {
      id: true,
      ctcMonthly: true,
      ctcAnnual: true,
      isCurrent: true,
      items: {
        select: {
          componentId: true,
          monthlyAmount: true,
          annualAmount: true,
        },
      },
    },
  },
} as const;

export type SafeEmployee = {
  id: string;
  tenantId: string;
  userId?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
  designationId?: string | null;
  managerId?: string | null;
  employeeCode: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  position?: string | null;
  employmentType?: string | null;
  status: string;
  salary?: any | null;
  joinedAt?: Date | null;
  pan?: string | null;
  aadhaar?: string | null;
  uan?: string | null;
  esiNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  taxRegime?: string | null;
  state?: string | null;
  workStateCode?: string | null;
  establishmentId?: string | null;
  clientId?: string | null;
  pfNumber?: string | null;
  pfEligible?: boolean;
  pfCalculationMethod?: string;
  pfCustomCap?: any | null;
  esiEligible?: boolean;
  ptEligible?: boolean;
  tdsEligible?: boolean;
  createdAt: Date;
  updatedAt: Date;
  department?: { id: string; name: string } | null;
  employeeExits?: Array<{
    id: string;
    resignationDate?: Date | null;
    lastWorkingDay?: Date | null;
    reason?: string | null;
    status: string;
  }>;
  salaryAssignments?: Array<{
    id: string;
    ctcMonthly?: any | null;
    ctcAnnual?: any | null;
    isCurrent?: boolean;
    items?: Array<{
      componentId?: string | null;
      monthlyAmount?: any | null;
      annualAmount?: any | null;
    }>;
  }>;
  // Fallbacks for unmigrated schema fields
  fatherOrSpouseName?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
  completion480DaysDate?: Date | null;
  permanentEmploymentDate?: Date | null;
  workerAgeClassification?: string | null;
  maternityNominationDate?: Date | null;
  dateOfJoining?: Date | null;
};

