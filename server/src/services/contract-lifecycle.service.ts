import { prisma, rawPrisma } from "../prisma.js";
import { NotificationService } from "./notification.service.js";
import { OutboxService } from "./outbox.service.js";
import { AuditService } from "./audit.service.js";

export type ContractExpiryClassification =
  | "ACTIVE"
  | "EXPIRING_30_DAYS"
  | "EXPIRING_15_DAYS"
  | "EXPIRING_7_DAYS"
  | "EXPIRING_TODAY"
  | "EXPIRED"
  | "RENEWED"
  | "TERMINATED";

export interface ContractClassificationResult {
  classification: ContractExpiryClassification;
  daysRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  stage: "30_days" | "15_days" | "7_days" | "today" | "expired" | "none";
}

export interface ContractRenewalPayload {
  contractTypeId?: string;
  title?: string;
  startDate: string | Date;
  endDate?: string | Date;
  salary?: number;
  notes?: string;
}

export class ContractLifecycleService {
  /**
   * Pure classification function for an employee contract against a reference date.
   */
  public static classifyContract(
    contract: {
      status?: string | null;
      startDate: Date | string;
      endDate?: Date | string | null;
    },
    referenceDate: Date = new Date()
  ): ContractClassificationResult {
    const rawStatus = (contract.status || "").toLowerCase().trim();

    if (rawStatus === "renewed" || rawStatus === "superseded") {
      return {
        classification: "RENEWED",
        daysRemaining: null,
        isExpired: false,
        isExpiringSoon: false,
        stage: "none",
      };
    }

    if (rawStatus === "terminated" || rawStatus === "cancelled") {
      return {
        classification: "TERMINATED",
        daysRemaining: null,
        isExpired: false,
        isExpiringSoon: false,
        stage: "none",
      };
    }

    if (!contract.endDate) {
      return {
        classification: "ACTIVE",
        daysRemaining: null,
        isExpired: false,
        isExpiringSoon: false,
        stage: "none",
      };
    }

    const expDate = new Date(contract.endDate);
    const expMidnight = Date.UTC(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
    const refMidnight = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

    const diffDays = Math.round((expMidnight - refMidnight) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        classification: "EXPIRED",
        daysRemaining: diffDays,
        isExpired: true,
        isExpiringSoon: false,
        stage: "expired",
      };
    }

    if (diffDays === 0) {
      return {
        classification: "EXPIRING_TODAY",
        daysRemaining: 0,
        isExpired: false,
        isExpiringSoon: true,
        stage: "today",
      };
    }

    if (diffDays <= 7) {
      return {
        classification: "EXPIRING_7_DAYS",
        daysRemaining: diffDays,
        isExpired: false,
        isExpiringSoon: true,
        stage: "7_days",
      };
    }

    if (diffDays <= 15) {
      return {
        classification: "EXPIRING_15_DAYS",
        daysRemaining: diffDays,
        isExpired: false,
        isExpiringSoon: true,
        stage: "15_days",
      };
    }

    if (diffDays <= 30) {
      return {
        classification: "EXPIRING_30_DAYS",
        daysRemaining: diffDays,
        isExpired: false,
        isExpiringSoon: true,
        stage: "30_days",
      };
    }

    return {
      classification: "ACTIVE",
      daysRemaining: diffDays,
      isExpired: false,
      isExpiringSoon: false,
      stage: "none",
    };
  }

  /**
   * Deterministic idempotency key for contract expiration reminders.
   * Pattern: cnt_exp_{contractId}_{endDate}_{stage}
   */
  public static generateIdempotencyKey(contractId: string, endDate: Date | string, stage: string): string {
    const d = new Date(endDate);
    const dateStr = d.toISOString().slice(0, 10);
    return `cnt_exp_${contractId}_${dateStr}_${stage}`;
  }

  public static buildIdempotencyKey(contractId: string, endDate: Date | string, stage: string): string {
    return this.generateIdempotencyKey(contractId, endDate, stage);
  }

  /**
   * Dispatches an automated contract expiry reminder idempotently.
   */
  public static async dispatchContractNotification(params: {
    tenantId: string;
    contract: any;
    stage: "30_days" | "15_days" | "7_days" | "today" | "expired";
    daysRemaining: number;
    dbOverride?: any;
  }): Promise<{ dispatched: boolean; alreadyProcessed: boolean }> {
    const { tenantId, contract, stage, daysRemaining, dbOverride } = params;
    const db = dbOverride || rawPrisma || prisma;

    if (!contract.endDate) {
      return { dispatched: false, alreadyProcessed: false };
    }

    const idempotencyKey = this.generateIdempotencyKey(contract.id, contract.endDate, stage);

    // 1. Check for existing notification in database
    const existingNotif = await db.notification.findFirst({
      where: {
        tenantId,
        metadataJson: {
          path: ["idempotencyKey"],
          equals: idempotencyKey,
        },
      },
    });

    if (existingNotif) {
      return { dispatched: false, alreadyProcessed: true };
    }

    const emp = contract.employee;
    const employeeName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "Employee";
    const employeeUserId = emp?.userId;

    const stageTitles: Record<string, string> = {
      "30_days": `Contract Expiring in 30 Days: ${contract.title}`,
      "15_days": `Contract Expiring in 15 Days: ${contract.title}`,
      "7_days": `URGENT: Contract Expiring in 7 Days: ${contract.title}`,
      today: `Contract Concludes Today: ${contract.title}`,
      expired: `EXPIRED CONTRACT: Action Required for ${contract.title}`,
    };

    const stageBodies: Record<string, string> = {
      "30_days": `Your employment contract "${contract.title}" will expire in 30 days on ${new Date(contract.endDate).toLocaleDateString()}. Please consult with HR regarding renewal terms.`,
      "15_days": `Your employment contract "${contract.title}" will expire in 15 days on ${new Date(contract.endDate).toLocaleDateString()}.`,
      "7_days": `URGENT: Your contract "${contract.title}" expires in 7 days! HR renewal action is required.`,
      today: `Your contract "${contract.title}" reaches its concluding term today (${new Date(contract.endDate).toLocaleDateString()}).`,
      expired: `Contract "${contract.title}" concluded on ${new Date(contract.endDate).toLocaleDateString()}. Please ensure renewal processing is complete.`,
    };

    const title = stageTitles[stage] || `Contract Lifecycle Update: ${contract.title}`;
    const body = stageBodies[stage] || `Contract status update for ${employeeName}`;

    // 2. Dispatch to Employee if user exists
    if (employeeUserId) {
      await NotificationService.createNotification({
        tenantId,
        userId: employeeUserId,
        title,
        message: body,
        type: "CONTRACT_EXPIRY",
        actionUrl: "/me/documents/contracts",
        metadata: {
          idempotencyKey,
          contractId: contract.id,
          stage,
          daysRemaining,
        },
      });
    }

    // 3. Notify HR Admins for action
    try {
      const hrRoles = await db.userRole.findMany({
        where: {
          tenantId,
          role: { in: ["hr_admin", "super_admin"] },
        },
        select: { userId: true },
        take: 5,
      });

      for (const hr of hrRoles) {
        await NotificationService.createNotification({
          tenantId,
          userId: hr.userId,
          title: `[HR Contract Alert] ${employeeName}: ${title}`,
          message: `Employee ${employeeName}'s contract (${contract.title}) ${stage === "expired" ? "has expired" : `expires in ${daysRemaining} days`}.`,
          type: "HR_CONTRACT_EXPIRY_ALERT",
          actionUrl: "/hr/documents/contracts",
          metadata: {
            idempotencyKey: `${idempotencyKey}_hr_${hr.userId}`,
            contractId: contract.id,
            employeeId: contract.employeeId,
            stage,
          },
        });
      }
    } catch (hrErr: any) {
      console.warn("[ContractLifecycleService] HR notification error:", hrErr.message);
    }

    // 4. Outbox Event
    try {
      await OutboxService.createOutboxEvent({
        tenantId,
        eventType: stage === "expired" ? "CONTRACT_EXPIRED" : "CONTRACT_EXPIRING_SOON",
        entityType: "EmployeeContract",
        entityId: contract.id,
        payload: {
          idempotencyKey,
          contractId: contract.id,
          contractTitle: contract.title,
          employeeId: contract.employeeId,
          employeeName,
          stage,
          daysRemaining,
          endDate: contract.endDate,
        },
        metadata: {
          idempotencyKey,
          source: "ContractLifecycleService",
        },
      }, dbOverride);
    } catch (outboxErr: any) {
      console.warn("[ContractLifecycleService] Outbox event error:", outboxErr.message);
    }

    return { dispatched: true, alreadyProcessed: false };
  }

  /**
   * Executes atomic Contract Renewal Workflow:
   * 1. Marks predecessor contract as 'renewed'
   * 2. Preserves predecessor terms and audit lineage
   * 3. Creates successor renewed contract record
   * 4. Enforces no date overlap across active contracts
   * 5. Emits audit and outbox events
   */
  public static async renewContract(params: {
    tenantId: string;
    actorUserId: string;
    predecessorId: string;
    renewal: ContractRenewalPayload;
    dbOverride?: any;
  }) {
    const { tenantId, actorUserId, predecessorId, renewal, dbOverride } = params;
    const db = dbOverride || rawPrisma || prisma;

    const predecessor = await db.employeeContract.findFirst({
      where: { id: predecessorId, tenantId },
      include: {
        employee: { select: { id: true, userId: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });

    if (!predecessor) {
      throw new Error("Predecessor contract not found in current tenant context.");
    }

    if (predecessor.status === "renewed" || predecessor.status === "superseded") {
      throw new Error("Cannot renew a contract that has already been renewed or superseded.");
    }

    const startDate = new Date(renewal.startDate);
    const endDate = renewal.endDate ? new Date(renewal.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new Error("Contract end date must be after the contract start date.");
    }

    // Overlap validation: Ensure no other active contract overlaps with this renewal period for this employee
    const conflictingContracts = await db.employeeContract.findMany({
      where: {
        tenantId,
        employeeId: predecessor.employeeId,
        id: { not: predecessor.id },
        status: "active",
        AND: [
          { startDate: { lte: endDate || new Date("2099-12-31") } },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    if (conflictingContracts.length > 0) {
      throw new Error(
        `Conflicting active contract found (${conflictingContracts[0].title}). Active contract dates cannot overlap.`
      );
    }

    const renewalTitle = renewal.title || `${predecessor.title} (Renewed)`;
    const newSalary = renewal.salary !== undefined ? Number(renewal.salary) : predecessor.salary;
    const newContractTypeId = renewal.contractTypeId || predecessor.contractTypeId;

    // Atomic update + insert
    const [updatedPredecessor, newContract] = await db.$transaction([
      db.employeeContract.update({
        where: { id: predecessor.id },
        data: {
          status: "renewed",
          notes: predecessor.notes
            ? `${predecessor.notes}\n[Renewed on ${new Date().toISOString().slice(0, 10)} by user ${actorUserId}]`
            : `[Renewed on ${new Date().toISOString().slice(0, 10)} by user ${actorUserId}]`,
        },
      }),
      db.employeeContract.create({
        data: {
          tenantId,
          employeeId: predecessor.employeeId,
          contractTypeId: newContractTypeId,
          title: renewalTitle,
          startDate,
          endDate,
          salary: newSalary,
          notes: renewal.notes
            ? `Renewal of predecessor contract ${predecessor.id}. ${renewal.notes}`
            : `Renewal of predecessor contract ${predecessor.id}`,
          status: "active",
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
          },
          contractType: true,
        },
      }),
    ]);

    // Record Audit mutation
    try {
      await AuditService.logMutation({
        tenantId,
        actorId: actorUserId,
        action: "CONTRACT_RENEWED",
        entityType: "EmployeeContract",
        entityId: newContract.id,
        metadata: {
          predecessorId: predecessor.id,
          newContractId: newContract.id,
          employeeId: predecessor.employeeId,
          startDate: newContract.startDate,
          endDate: newContract.endDate,
        },
      });
    } catch (auditErr: any) {
      console.warn("[ContractLifecycleService] Audit error:", auditErr.message);
    }

    // Outbox Event
    try {
      await OutboxService.createOutboxEvent({
        tenantId,
        eventType: "CONTRACT_RENEWED",
        entityType: "EmployeeContract",
        entityId: newContract.id,
        actorId: actorUserId,
        payload: {
          predecessorId: predecessor.id,
          newContractId: newContract.id,
          employeeId: predecessor.employeeId,
          title: newContract.title,
          startDate: newContract.startDate,
          endDate: newContract.endDate,
        },
      });
    } catch (outboxErr: any) {
      console.warn("[ContractLifecycleService] Outbox error:", outboxErr.message);
    }

    // Notify employee of renewal
    if (predecessor.employee?.userId) {
      try {
        await NotificationService.createNotification({
          tenantId,
          userId: predecessor.employee.userId,
          title: `Contract Renewed: ${newContract.title}`,
          message: `Your employment contract has been successfully renewed through ${endDate ? endDate.toLocaleDateString() : "Indefinite term"}.`,
          type: "CONTRACT_RENEWED",
          actionUrl: "/me/documents/contracts",
          metadata: {
            contractId: newContract.id,
            predecessorId: predecessor.id,
          },
        });
      } catch (notifErr: any) {
        console.warn("[ContractLifecycleService] Notification error:", notifErr.message);
      }
    }

    return {
      predecessor: updatedPredecessor,
      contract: newContract,
      successor: newContract,
    };
  }

  /**
   * Retrieves tenant-wide contract overview metrics and evaluations.
   */
  public static async getContractOverview(tenantId: string, dbOverride?: any) {
    const db = dbOverride || rawPrisma || prisma;
    const now = new Date();

    const contracts = await db.employeeContract.findMany({
      where: { tenantId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
          },
        },
        contractType: true,
      },
      orderBy: { endDate: "asc" },
    });

    const evaluated = contracts.map((c: any) => {
      const cls = this.classifyContract(c, now);
      return {
        ...c,
        classification: cls.classification,
        daysRemaining: cls.daysRemaining,
        isExpired: cls.isExpired,
        isExpiringSoon: cls.isExpiringSoon,
        stage: cls.stage,
      };
    });

    const metrics = {
      total: evaluated.length,
      active: evaluated.filter((c: any) => c.status === "active" && !c.isExpired).length,
      expiringSoon: evaluated.filter((c: any) => c.isExpiringSoon && c.status === "active").length,
      expiring30: evaluated.filter((c: any) => c.stage === "30_days").length,
      expiring15: evaluated.filter((c: any) => c.stage === "15_days").length,
      expiring7: evaluated.filter((c: any) => c.stage === "7_days").length,
      expired: evaluated.filter((c: any) => c.isExpired).length,
      renewed: evaluated.filter((c: any) => c.status === "renewed").length,
    };

    return {
      metrics,
      contracts: evaluated,
    };
  }
}
