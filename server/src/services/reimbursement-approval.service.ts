import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

export interface ApprovalActionInput {
  tenantId: string;
  claimId: string;
  action: "manager_approve" | "finance_approve" | "reject";
  approverRole: string; // 'manager' | 'hr_admin' | 'super_admin' | 'finance'
  approverName: string;
  approverNotes?: string;
  reimbursementMethod?: string;
}

export interface ApprovalActionResult {
  success: boolean;
  claim: any;
  status: string;
  requiresSecondaryApproval: boolean;
  message: string;
}

export class ReimbursementApprovalService {
  private prisma: PrismaClient;

  // PO-DEC-03: Routing Threshold
  public static readonly SECONDARY_APPROVAL_THRESHOLD = 10000;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Validate category monthly limit before claim submission or approval
   */
  async checkCategoryMonthlyLimit(
    tenantId: string,
    employeeId: string,
    categoryId: string,
    additionalAmount: number,
    expenseDate: Date = new Date(),
    txClient?: any
  ): Promise<{ withinLimit: boolean; currentMonthlySpend: number; monthlyLimit: number | null; projectedTotal: number }> {
    const db = txClient || this.prisma;

    // Concurrency Guard: Acquire pessimistic exclusive row lock on Employee within the active transaction
    // This serializes concurrent claim submissions for the same employee, preventing race conditions/phantom spend
    if (txClient) {
      await txClient.$queryRawUnsafe(
        `SELECT id FROM employees WHERE id = ? AND tenant_id = ? FOR UPDATE`,
        employeeId,
        tenantId
      );
    }

    const category = await db.expenseCategory.findFirst({
      where: { id: categoryId, tenantId },
    });

    if (!category || !category.monthlyLimit) {
      return { withinLimit: true, currentMonthlySpend: 0, monthlyLimit: null, projectedTotal: additionalAmount };
    }

    const limit = Number(category.monthlyLimit);
    const startOfMonth = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(expenseDate.getFullYear(), expenseDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const existingClaims = await db.expenseClaim.findMany({
      where: {
        tenantId,
        employeeId,
        categoryId,
        expenseDate: { gte: startOfMonth, lte: endOfMonth },
        status: { notIn: ["rejected", "cancelled", "draft"] },
      },
      select: { amount: true, status: true },
    });

    const currentSpend = existingClaims.reduce((sum, c) => sum + Number(c.amount), 0);
    const projected = currentSpend + additionalAmount;

    return {
      withinLimit: projected <= limit,
      currentMonthlySpend: currentSpend,
      monthlyLimit: limit,
      projectedTotal: projected,
    };
  }

  /**
   * Process Two-Tier Approval Action according to PO-DEC-03
   * - Claims <= ₹10,000: Reporting Manager approval directly authorizes for finance/payroll payout.
   * - Claims > ₹10,000: Reporting Manager approval sets status to 'manager_approved' (requiring secondary HR/Finance authorization).
   * - Secondary HR/Finance authorization sets status to 'finance_approved' (fully authorized for payroll payout batch).
   */
  async processApproval(input: ApprovalActionInput): Promise<ApprovalActionResult> {
    const { tenantId, claimId, action, approverRole, approverName, approverNotes, reimbursementMethod } = input;

    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, tenantId },
      include: { employee: true, category: true },
    });

    if (!claim) {
      throw new Error("Expense claim not found.");
    }

    if (claim.status === "reimbursed") {
      throw new Error("Cannot alter approval on an already reimbursed claim.");
    }

    const amount = Number(claim.amount);
    const requiresSecondary = amount > ReimbursementApprovalService.SECONDARY_APPROVAL_THRESHOLD;

    if (action === "reject") {
      const updated = await this.prisma.expenseClaim.update({
        where: { id: claimId },
        data: {
          status: "rejected",
          approverNotes: approverNotes || `Claim rejected by ${approverName} (${approverRole})`,
          updatedAt: new Date(),
        },
        include: { employee: true, category: true },
      });

      return {
        success: true,
        claim: updated,
        status: "rejected",
        requiresSecondaryApproval: false,
        message: `Claim ${claim.claimCode} has been rejected.`,
      };
    }

    if (action === "manager_approve") {
      if (claim.status !== "pending") {
        throw new Error(`Cannot perform manager approval on claim in status '${claim.status}'.`);
      }

      if (requiresSecondary) {
        // Amount > ₹10,000: Requires secondary Finance approval
        const updated = await this.prisma.expenseClaim.update({
          where: { id: claimId },
          data: {
            status: "manager_approved",
            approvedBy: approverName,
            approvedAt: new Date(),
            approverNotes: approverNotes || claim.approverNotes,
            updatedAt: new Date(),
          },
          include: { employee: true, category: true },
        });

        return {
          success: true,
          claim: updated,
          status: "manager_approved",
          requiresSecondaryApproval: true,
          message: `Claim ${claim.claimCode} exceeds ₹10,000 threshold. Manager approval recorded; awaiting secondary HR/Finance authorization.`,
        };
      } else {
        // Amount <= ₹10,000: Single-tier approval completes authorization directly
        const updated = await this.prisma.expenseClaim.update({
          where: { id: claimId },
          data: {
            status: "finance_approved",
            approvedBy: approverName,
            approvedAt: new Date(),
            financeApprovedBy: approverName,
            financeApprovedAt: new Date(),
            approverNotes: approverNotes || claim.approverNotes,
            reimbursementMethod: reimbursementMethod || claim.reimbursementMethod || "payroll_addition",
            updatedAt: new Date(),
          },
          include: { employee: true, category: true },
        });

        return {
          success: true,
          claim: updated,
          status: "finance_approved",
          requiresSecondaryApproval: false,
          message: `Claim ${claim.claimCode} approved and authorized for payroll payout.`,
        };
      }
    }

    if (action === "finance_approve") {
      // Must have been manager approved (or HR admin directly authorizing)
      const allowedRoles = ["hr_admin", "super_admin", "finance"];
      const isPrivileged = allowedRoles.includes(approverRole.toLowerCase());

      if (!isPrivileged && claim.status !== "manager_approved") {
        throw new Error("Secondary finance approval requires prior manager approval.");
      }

      const updated = await this.prisma.expenseClaim.update({
        where: { id: claimId },
        data: {
          status: "finance_approved",
          financeApprovedBy: approverName,
          financeApprovedAt: new Date(),
          approverNotes: approverNotes ? `${claim.approverNotes || ""}\nFinance: ${approverNotes}`.trim() : claim.approverNotes,
          reimbursementMethod: reimbursementMethod || claim.reimbursementMethod || "payroll_addition",
          updatedAt: new Date(),
        },
        include: { employee: true, category: true },
      });

      return {
        success: true,
        claim: updated,
        status: "finance_approved",
        requiresSecondaryApproval: false,
        message: `Claim ${claim.claimCode} secondary finance authorization granted. Qualified for payroll batch payout.`,
      };
    }

    throw new Error(`Invalid approval action: ${action}`);
  }

  /**
   * Get all fully authorized claims eligible for inclusion in target payroll month
   */
  async getAuthorizedClaimsForPayroll(
    tenantId: string,
    periodMonth: number,
    periodYear: number,
    employeeIds?: string[]
  ) {
    const monthStr = `${periodYear}-${String(periodMonth).padStart(2, "0")}`;

    const where: any = {
      tenantId,
      status: "finance_approved",
      reimbursementMethod: "payroll_addition",
      payrollRunId: null, // Not yet attached to a finalized run
    };

    if (employeeIds && employeeIds.length > 0) {
      where.employeeId = { in: employeeIds };
    }

    return this.prisma.expenseClaim.findMany({
      where,
      include: { category: true, employee: true },
      orderBy: { expenseDate: "asc" },
    });
  }
}
