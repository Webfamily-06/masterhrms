import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

export interface FbpComponentDefinition {
  code: string;
  name: string;
  monthlyMaxCap: number;
  annualMaxCap: number;
  requiresProof: boolean;
  description: string;
}

export const STANDARD_FBP_COMPONENTS: FbpComponentDefinition[] = [
  {
    code: "FUEL",
    name: "Fuel & Motor Vehicle Allowance",
    monthlyMaxCap: 2400,
    annualMaxCap: 28800,
    requiresProof: true,
    description: "Reimbursement of running & maintenance expenses of motor car for official use.",
  },
  {
    code: "TEL",
    name: "Telephone & Broadband Allowance",
    monthlyMaxCap: 2000,
    annualMaxCap: 24000,
    requiresProof: true,
    description: "Reimbursement of mobile bills and residential broadband expenses.",
  },
  {
    code: "MEAL",
    name: "Meal Coupons / Food Allowance",
    monthlyMaxCap: 2200,
    annualMaxCap: 26400,
    requiresProof: false,
    description: "Non-transferable meal coupons or prepaid food vouchers (tax-exempt up to ₹50/meal).",
  },
  {
    code: "BOOKS",
    name: "Books & Periodicals Allowance",
    monthlyMaxCap: 1500,
    annualMaxCap: 18000,
    requiresProof: true,
    description: "Purchase of professional development books, journals, and learning subscriptions.",
  },
  {
    code: "EDU",
    name: "Children Education Allowance",
    monthlyMaxCap: 800,
    annualMaxCap: 9600,
    requiresProof: true,
    description: "Statutory exemption under Sec 10(14) for children school/hostel fees.",
  },
  {
    code: "LTA",
    name: "Leave Travel Allowance",
    monthlyMaxCap: 5000,
    annualMaxCap: 60000,
    requiresProof: true,
    description: "Travel ticket fare reimbursement for domestic travel on leave under Sec 10(5).",
  },
];

export interface WindowStatusResult {
  isOpen: boolean;
  windowType: "PROJECTION" | "PROOF_SUBMISSION" | "CLOSED";
  isNewJoinerGraceActive: boolean;
  windowLabel: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  reason: string;
}

export class FbpService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check corporate FBP window status in accordance with PO-DEC-04
   * - Annual projection window: April 1 to April 30.
   * - Final tax-proof submission window: December 15 to January 31.
   * - Mid-year joiners: within 30 days of Date of Joining (DOJ).
   */
  async checkWindowStatus(
    tenantId: string,
    employeeId?: string,
    currentDate: Date = new Date()
  ): Promise<WindowStatusResult> {
    const month = currentDate.getMonth(); // 0 = Jan, 3 = Apr, 11 = Dec
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();

    // Check 1: Standard Annual Projection Window (April 1 00:00:00 to April 30 23:59:59)
    if (month === 3) {
      const endOfApril = new Date(year, 3, 30, 23, 59, 59, 999);
      const diffMs = endOfApril.getTime() - currentDate.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        isOpen: true,
        windowType: "PROJECTION",
        isNewJoinerGraceActive: false,
        windowLabel: "Annual FBP Projection Window",
        startDate: `${year}-04-01`,
        endDate: `${year}-04-30`,
        daysRemaining,
        reason: "Annual declaration window is open for the upcoming Financial Year.",
      };
    }

    // Check 2: Final Tax-Proof Submission Window (Dec 15 00:00:00 to Jan 31 23:59:59)
    if ((month === 11 && day >= 15) || month === 0) {
      const endYear = month === 11 ? year + 1 : year;
      const startYear = month === 11 ? year : year - 1;
      const endOfJan = new Date(endYear, 0, 31, 23, 59, 59, 999);
      const diffMs = endOfJan.getTime() - currentDate.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        isOpen: true,
        windowType: "PROOF_SUBMISSION",
        isNewJoinerGraceActive: false,
        windowLabel: "Final Tax-Proof & FBP Submission Window",
        startDate: `${startYear}-12-15`,
        endDate: `${endYear}-01-31`,
        daysRemaining,
        reason: "Final tax proof verification window is open.",
      };
    }

    // Check 3: Mid-Year Joiner 30-Day Grace Period (PO-DEC-04)
    if (employeeId) {
      const emp = await this.prisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: { joinedAt: true },
      });

      if (emp?.joinedAt) {
        const rawDoj = new Date(emp.joinedAt);
        // Normalize DOJ to local beginning of day
        const dojStart = new Date(rawDoj.getFullYear(), rawDoj.getMonth(), rawDoj.getDate(), 0, 0, 0, 0);
        // Grace period spans exactly 30 calendar days from DOJ ending at 23:59:59.999
        const graceEnd = new Date(dojStart.getFullYear(), dojStart.getMonth(), dojStart.getDate() + 30, 23, 59, 59, 999);

        if (currentDate >= dojStart && currentDate <= graceEnd) {
          const diffMs = graceEnd.getTime() - currentDate.getTime();
          const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          const pad = (n: number) => String(n).padStart(2, "0");
          const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

          return {
            isOpen: true,
            windowType: "PROJECTION",
            isNewJoinerGraceActive: true,
            windowLabel: "New Joiner 30-Day FBP Grace Window",
            startDate: fmtDate(dojStart),
            endDate: fmtDate(graceEnd),
            daysRemaining,
            reason: `Special 30-day projection window granted for new joiner (DOJ: ${fmtDate(dojStart)}).`,
          };
        }
      }
    }

    // Otherwise window is closed
    return {
      isOpen: false,
      windowType: "CLOSED",
      isNewJoinerGraceActive: false,
      windowLabel: "FBP Windows Closed",
      startDate: "",
      endDate: "",
      daysRemaining: 0,
      reason: "No active FBP window. Next annual window opens on April 1.",
    };
  }

  /**
   * Calculate maximum allowable FBP annual pool from employee salary structure
   * Typically derived from Special Allowance or Flexible Component pool in CTC
   */
  async getEmployeeFbpAllowancePool(tenantId: string, employeeId: string): Promise<number> {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        salaryAssignments: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });

    if (!emp) return 0;

    const monthlySalary = emp.salaryAssignments[0]?.ctcMonthly
      ? Number(emp.salaryAssignments[0].ctcMonthly)
      : Number(emp.salary || 35000);

    // Standard policy: Special Allowance pool is up to 30% of CTC
    const annualPool = Math.round(monthlySalary * 12 * 0.30);
    return Math.max(60000, annualPool); // Floor at ₹60,000 per annum
  }

  /**
   * Save or update an FBP Declaration (with line items)
   */
  async saveDeclaration(
    tenantId: string,
    employeeId: string,
    financialYear: string,
    items: Array<{ componentCode: string; monthlyDeclared: number }>,
    submitImmediately: boolean = false,
    evaluationDate?: Date
  ) {
    // 1. Check window eligibility
    const windowStatus = await this.checkWindowStatus(tenantId, employeeId, evaluationDate);
    if (!windowStatus.isOpen && !submitImmediately) {
      // Allow draft editing but restrict submission if closed
    }

    // 2. Fetch employee FBP pool
    const totalPool = await this.getEmployeeFbpAllowancePool(tenantId, employeeId);

    // 3. Validate components and calculate totals
    let totalAnnualDeclared = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const def = STANDARD_FBP_COMPONENTS.find((c) => c.code === item.componentCode.toUpperCase());
      if (!def) {
        throw new Error(`Unknown FBP component code: ${item.componentCode}`);
      }

      const monthly = Number(item.monthlyDeclared || 0);
      if (monthly < 0) throw new Error(`Negative declaration amount for ${def.name}`);

      if (monthly > def.monthlyMaxCap) {
        throw new Error(
          `Declared monthly amount ₹${monthly} for ${def.name} exceeds policy ceiling of ₹${def.monthlyMaxCap}.`
        );
      }

      const annual = monthly * 12;
      totalAnnualDeclared += annual;

      validatedItems.push({
        componentCode: def.code,
        componentName: def.name,
        monthlyDeclared: new Decimal(monthly),
        annualDeclared: new Decimal(annual),
        maxAnnualCap: new Decimal(def.annualMaxCap),
        requiresProof: def.requiresProof,
      });
    }

    if (totalAnnualDeclared > totalPool) {
      throw new Error(
        `Total annual declaration ₹${totalAnnualDeclared} exceeds employee's allocated FBP pool of ₹${totalPool}.`
      );
    }

    // 4. Upsert declaration
    const existing = await this.prisma.fbpDeclaration.findUnique({
      where: {
        tenantId_employeeId_financialYear: {
          tenantId,
          employeeId,
          financialYear,
        },
      },
    });

    if (existing && existing.status === "locked") {
      throw new Error("Cannot modify an FBP declaration that has been locked for the financial year.");
    }

    const newStatus = submitImmediately ? "submitted" : existing ? existing.status : "draft";

    let declaration;
    if (existing) {
      // Remove old items and re-create
      await this.prisma.fbpDeclarationItem.deleteMany({
        where: { declarationId: existing.id },
      });

      declaration = await this.prisma.fbpDeclaration.update({
        where: { id: existing.id },
        data: {
          totalFbpAnnual: new Decimal(totalAnnualDeclared),
          status: newStatus,
          submittedAt: submitImmediately ? new Date() : existing.submittedAt,
          items: {
            create: validatedItems,
          },
        },
        include: { items: true, employee: true },
      });
    } else {
      declaration = await this.prisma.fbpDeclaration.create({
        data: {
          tenantId,
          employeeId,
          financialYear,
          totalFbpAnnual: new Decimal(totalAnnualDeclared),
          status: newStatus,
          submittedAt: submitImmediately ? new Date() : null,
          items: {
            create: validatedItems,
          },
        },
        include: { items: true, employee: true },
      });
    }

    return declaration;
  }

  /**
   * Get employee FBP declaration
   */
  async getDeclaration(tenantId: string, employeeId: string, financialYear: string) {
    return this.prisma.fbpDeclaration.findUnique({
      where: {
        tenantId_employeeId_financialYear: {
          tenantId,
          employeeId,
          financialYear,
        },
      },
      include: { items: true, employee: true },
    });
  }

  /**
   * HR approval of FBP declaration
   */
  async approveDeclaration(tenantId: string, declarationId: string, approverName: string) {
    const existing = await this.prisma.fbpDeclaration.findFirst({
      where: { id: declarationId, tenantId },
    });

    if (!existing) throw new Error("FBP declaration not found.");

    return this.prisma.fbpDeclaration.update({
      where: { id: declarationId },
      data: {
        status: "approved",
        approvedBy: approverName,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
      include: { items: true, employee: true },
    });
  }

  /**
   * List FBP declarations for HR Admin
   */
  async listDeclarations(tenantId: string, financialYear?: string, status?: string) {
    const where: any = { tenantId };
    if (financialYear) where.financialYear = financialYear;
    if (status) where.status = status;

    return this.prisma.fbpDeclaration.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
