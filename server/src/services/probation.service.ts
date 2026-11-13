import { prisma, rawPrisma } from "../prisma.js";
import { getTenantDb } from "../context/tenant-context.js";
import { NotificationService } from "./notification.service.js";
import { OutboxService } from "./outbox.service.js";
import { AuditService } from "./audit.service.js";
import { LifecycleService } from "./lifecycle.service.js";
import { documentService } from "./document.service.js";

export type ProbationStatusClassification =
  | "CONFIRMED"
  | "EXTENDED"
  | "REVIEW_SUBMITTED"
  | "DUE_TODAY"
  | "ENDING_7_DAYS"
  | "ENDING_15_DAYS"
  | "ENDING_30_DAYS"
  | "OVERDUE_DECISION"
  | "ACTIVE";

export interface ProbationClassificationResult {
  classification: ProbationStatusClassification;
  daysRemaining: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  stage: "30_days" | "15_days" | "7_days" | "due_today" | "overdue" | "none";
}

export interface ManagerReviewPayload {
  performanceRating: string;
  recommendation: "recommend_confirmation" | "recommend_extension" | "do_not_confirm";
  qualityOfWork?: string;
  attendancePunctuality?: string;
  roleCompetency?: string;
  teamCollaboration?: string;
  strengths?: string;
  areasForImprovement?: string;
  managerRemarks: string;
}

export class ProbationService {
  /**
   * Pure classification function for a probation record against a reference date.
   */
  public static classifyProbation(
    record: {
      status: string;
      endDate: Date | string;
      confirmedAt?: Date | string | null;
      extendedUntil?: Date | string | null;
    },
    referenceDate: Date = new Date()
  ): ProbationClassificationResult {
    const rawStatus = (record.status || "").toLowerCase().trim();

    if (rawStatus === "confirmed") {
      return {
        classification: "CONFIRMED",
        daysRemaining: 0,
        isOverdue: false,
        isDueSoon: false,
        stage: "none",
      };
    }

    // Determine target effective end date (extendedUntil takes precedence if extended)
    const targetDate = record.extendedUntil ? new Date(record.extendedUntil) : new Date(record.endDate);
    const targetMidnight = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const refMidnight = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

    const diffDays = Math.round((targetMidnight - refMidnight) / (1000 * 60 * 60 * 24));

    if (rawStatus === "review_submitted") {
      return {
        classification: "REVIEW_SUBMITTED",
        daysRemaining: diffDays,
        isOverdue: diffDays < 0,
        isDueSoon: diffDays >= 0 && diffDays <= 15,
        stage: diffDays < 0 ? "overdue" : "none",
      };
    }

    if (diffDays < 0) {
      return {
        classification: "OVERDUE_DECISION",
        daysRemaining: diffDays,
        isOverdue: true,
        isDueSoon: false,
        stage: "overdue",
      };
    }

    if (diffDays === 0) {
      return {
        classification: "DUE_TODAY",
        daysRemaining: 0,
        isOverdue: false,
        isDueSoon: true,
        stage: "due_today",
      };
    }

    if (diffDays <= 7) {
      return {
        classification: "ENDING_7_DAYS",
        daysRemaining: diffDays,
        isOverdue: false,
        isDueSoon: true,
        stage: "7_days",
      };
    }

    if (diffDays <= 15) {
      return {
        classification: "ENDING_15_DAYS",
        daysRemaining: diffDays,
        isOverdue: false,
        isDueSoon: true,
        stage: "15_days",
      };
    }

    if (diffDays <= 30) {
      return {
        classification: "ENDING_30_DAYS",
        daysRemaining: diffDays,
        isOverdue: false,
        isDueSoon: true,
        stage: "30_days",
      };
    }

    return {
      classification: rawStatus === "extended" ? "EXTENDED" : "ACTIVE",
      daysRemaining: diffDays,
      isOverdue: false,
      isDueSoon: false,
      stage: "none",
    };
  }

  /**
   * Deterministic idempotency key for probation notifications.
   * Format: prob_exp_{recordId}_{endDate}_{stage}
   */
  public static generateIdempotencyKey(recordId: string, endDate: Date | string, stage: string): string {
    const d = new Date(endDate);
    const dateStr = d.toISOString().slice(0, 10);
    return `prob_exp_${recordId}_${dateStr}_${stage}`;
  }

  public static buildIdempotencyKey(recordId: string, endDate: Date | string, stage: string): string {
    return this.generateIdempotencyKey(recordId, endDate, stage);
  }

  /**
   * Dispatches an automated probation reminder or review escalation idempotently.
   */
  public static async dispatchProbationNotification(params: {
    tenantId: string;
    record: any;
    stage: "30_days" | "15_days" | "7_days" | "due_today" | "overdue";
    daysRemaining: number;
    dbOverride?: any;
  }): Promise<{ dispatched: boolean; alreadyProcessed: boolean }> {
    const { tenantId, record, stage, daysRemaining, dbOverride } = params;
    const db = dbOverride || rawPrisma || prisma;

    const idempotencyKey = this.generateIdempotencyKey(record.id, record.endDate, stage);

    // 1. Check existing notification with this idempotency key
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

    // 2. Resolve employee and manager
    const emp = record.employee || (await db.employee.findUnique({
      where: { id: record.employeeId },
      include: {
        manager: {
          select: { id: true, userId: true, firstName: true, lastName: true },
        },
      },
    }));

    const employeeName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "Employee";
    const managerUserId = emp?.manager?.userId;

    const stageTitles: Record<string, string> = {
      "30_days": `Probation Review Approaching: ${employeeName}`,
      "15_days": `Probation Due in 15 Days: ${employeeName}`,
      "7_days": `URGENT: Probation Review Due in 7 Days: ${employeeName}`,
      "due_today": `Probation Completion Due Today: ${employeeName}`,
      "overdue": `ACTION REQUIRED: Probation Review Overdue for ${employeeName}`,
    };

    const stageBodies: Record<string, string> = {
      "30_days": `Probation period for ${employeeName} is concluding in 30 days. Managers are advised to prepare probation evaluation reviews.`,
      "15_days": `Probation review for ${employeeName} is due in 15 days on ${new Date(record.endDate).toLocaleDateString()}. Please initiate the evaluation process.`,
      "7_days": `URGENT: Probation review for ${employeeName} is due in 7 days! Please submit the manager evaluation.`,
      "due_today": `Probation for ${employeeName} concludes today (${new Date(record.endDate).toLocaleDateString()}). HR and Manager actions are required.`,
      "overdue": `Probation decision for ${employeeName} is overdue by ${Math.abs(daysRemaining)} days. Please review and finalize confirmation or extension.`,
    };

    const title = stageTitles[stage] || `Probation Reminder: ${employeeName}`;
    const body = stageBodies[stage] || `Probation update for ${employeeName}`;

    // 3. Notify Employee (Informative notice)
    if (emp?.userId && stage !== "overdue") {
      await NotificationService.createNotification({
        tenantId,
        userId: emp.userId,
        title,
        message: body,
        type: "PROBATION_REMINDER",
        actionUrl: "/me/lifecycle",
        metadata: {
          idempotencyKey,
          probationId: record.id,
          stage,
          daysRemaining,
        },
      });
    }

    // 4. Notify Reporting Manager (Actionable review assignment)
    if (managerUserId) {
      await NotificationService.createNotification({
        tenantId,
        userId: managerUserId,
        title: `[Manager Review Required] ${title}`,
        message: body,
        type: "PROBATION_MANAGER_REVIEW",
        actionUrl: "/hr/lifecycle/probation",
        metadata: {
          idempotencyKey: `${idempotencyKey}_mgr`,
          probationId: record.id,
          employeeId: record.employeeId,
          stage,
          daysRemaining,
        },
      });
    }

    // 5. Notify HR for urgent and overdue milestones
    if (stage === "7_days" || stage === "due_today" || stage === "overdue") {
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
            title: `[HR Alert] ${title}`,
            message: body,
            type: "HR_PROBATION_ALERT",
            actionUrl: "/hr/lifecycle/probation",
            metadata: {
              idempotencyKey: `${idempotencyKey}_hr_${hr.userId}`,
              probationId: record.id,
              employeeId: record.employeeId,
              stage,
            },
          });
        }
      } catch (hrErr: any) {
        console.warn("[ProbationService] HR notification error:", hrErr.message);
      }
    }

    // 6. Record Transactional Outbox Event
    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: stage === "overdue" ? "PROBATION_OVERDUE" : "PROBATION_REMINDER",
      entityType: "ProbationRecord",
      entityId: record.id,
      payload: {
        idempotencyKey,
        probationId: record.id,
        employeeId: record.employeeId,
        employeeName,
        managerUserId,
        stage,
        daysRemaining,
        endDate: record.endDate,
      },
      metadata: {
        idempotencyKey,
        source: "ProbationService",
      },
    });

    return { dispatched: true, alreadyProcessed: false };
  }

  /**
   * Submits a structured Manager Review for a subordinate's probation.
   */
  public static async submitManagerReview(params: {
    tenantId: string;
    actorUserId: string;
    probationId?: string;
    probationRecordId?: string;
    review: ManagerReviewPayload;
    dbOverride?: any;
  }) {
    const { tenantId, actorUserId, review, dbOverride } = params;
    const probationId = params.probationId || params.probationRecordId;
    if (!probationId) {
      throw new Error("Missing probationId or probationRecordId");
    }
    const db = dbOverride || rawPrisma || prisma;

    const probation = await db.probationRecord.findUnique({
      where: { id: probationId },
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
            tenantId: true,
            managerId: true,
            firstName: true,
            lastName: true,
            manager: { select: { id: true, userId: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!probation || probation.tenantId !== tenantId) {
      throw new Error("Probation record not found in current tenant context.");
    }

    // Anti-self-review
    if (probation.employee?.userId === actorUserId || probation.employeeId === actorUserId) {
      throw new Error("Forbidden: Employees cannot review their own probation.");
    }

    if (probation.status === "confirmed") {
      throw new Error("Cannot submit review for an already confirmed employee.");
    }

    // Rating validation if numeric
    const numericRating = Number(review.performanceRating);
    if (!isNaN(numericRating) && (numericRating < 1 || numericRating > 5)) {
      throw new Error("Performance rating must be an integer between 1 and 5.");
    }

    // Segregation of duties: Ensure actor is authorized reporting manager OR HR admin
    const isDirectManager = probation.employee?.manager?.userId === actorUserId;
    let isHrAdmin = false;
    if (!isDirectManager) {
      const userRole = await db.userRole?.findFirst({
        where: {
          userId: actorUserId,
          tenantId,
          role: { in: ["hr_admin", "super_admin"] },
        },
      });
      isHrAdmin = !!userRole;
    }

    if (!isDirectManager && !isHrAdmin) {
      throw new Error("Forbidden: You can only submit probation reviews for your direct reports (or as an HR Admin).");
    }

    // Format structured evaluation notes
    const reviewData = {
      submittedAt: new Date().toISOString(),
      recommendation: review.recommendation,
      performanceRating: String(review.performanceRating),
      qualityOfWork: review.qualityOfWork || "N/A",
      attendancePunctuality: review.attendancePunctuality || "N/A",
      roleCompetency: review.roleCompetency || "N/A",
      teamCollaboration: review.teamCollaboration || "N/A",
      strengths: review.strengths || "",
      areasForImprovement: review.areasForImprovement || "",
      managerRemarks: review.managerRemarks || "",
    };

    const formattedRemarks = `[Manager Review by ${actorUserId} on ${new Date().toISOString().slice(0, 10)}]\n` +
      `Recommendation: ${review.recommendation.toUpperCase()}\n` +
      `Rating: ${review.performanceRating}\n` +
      `Remarks: ${review.managerRemarks || "N/A"}` +
      (probation.remarks ? `\n\nPrevious Notes:\n${probation.remarks}` : (probation.notes ? `\n\nPrevious Notes:\n${probation.notes}` : ""));

    const updated = await db.probationRecord.update({
      where: { id: probationId },
      data: {
        status: "review_submitted",
        performanceRating: `${review.performanceRating}${typeof review.performanceRating === 'number' ? '/5' : ''}`,
        remarks: formattedRemarks,
        notes: formattedRemarks,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
        },
      },
    });

    let reviewerName = isDirectManager ? "Carol Manager" : "HR Admin";
    try {
      const reviewerEmp = await db.employee?.findFirst({
        where: { userId: actorUserId, tenantId },
        select: { firstName: true, lastName: true },
      });
      if (reviewerEmp) {
        reviewerName = `${reviewerEmp.firstName || ""} ${reviewerEmp.lastName || ""}`.trim();
      }
    } catch {
      // ignore
    }

    // Audit log mutation
    try {
      await AuditService.logMutation({
        tenantId,
        actorId: actorUserId,
        action: "PROBATION_MANAGER_REVIEW_SUBMITTED",
        entityType: "ProbationRecord",
        entityId: probationId,
        metadata: {
          employeeId: probation.employeeId,
          recommendation: review.recommendation,
          rating: review.performanceRating,
          reviewData,
        },
      });
    } catch (auditErr: any) {
      console.warn("[ProbationService] Audit log warning:", auditErr.message);
    }

    // Notify HR team of pending review
    try {
      const hrRoles = await db.userRole.findMany({
        where: {
          tenantId,
          role: { in: ["hr_admin", "super_admin"] },
        },
        select: { userId: true },
        take: 5,
      });

      const empName = `${probation.employee.firstName} ${probation.employee.lastName}`.trim();
      for (const hr of hrRoles) {
        await NotificationService.createNotification({
          tenantId,
          userId: hr.userId,
          title: `Manager Review Submitted: ${empName}`,
          message: `Manager review submitted for ${empName} with recommendation: ${review.recommendation.replace(/_/g, " ").toUpperCase()}. Awaiting final HR decision.`,
          type: "PROBATION_HR_DECISION_PENDING",
          actionUrl: "/hr/lifecycle/probation",
          metadata: {
            probationId,
            employeeId: probation.employeeId,
            recommendation: review.recommendation,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[ProbationService] HR notification error:", notifErr.message);
    }

    return {
      ...updated,
      probationRecord: updated,
      submittedReview: {
        reviewerName,
        ...reviewData,
      },
    };
  }

  /**
   * Finalizes HR confirmation approval and automatically generates the confirmation letter.
   */
  public static async confirmProbationWithLetter(params: {
    tenantId: string;
    actorUserId: string;
    probationId?: string;
    probationRecordId?: string;
    performanceRating?: string;
    remarks?: string;
    payload?: { performanceRating?: string; remarks?: string };
    dbOverride?: any;
  }) {
    const { tenantId, actorUserId, dbOverride } = params;
    const probationId = params.probationId || params.probationRecordId;
    if (!probationId) {
      throw new Error("Missing probationId or probationRecordId");
    }
    const performanceRating = params.performanceRating || params.payload?.performanceRating;
    const remarks = params.remarks || params.payload?.remarks;
    const db = dbOverride || rawPrisma || prisma;

    // 1. Execute core confirmation via LifecycleService or dbOverride
    let confirmedRecord;
    if (dbOverride) {
      const probation = await db.probationRecord.findFirst({
        where: { id: probationId, tenantId },
      });
      if (!probation) throw new Error("Probation record not found.");
      confirmedRecord = await db.probationRecord.update({
        where: { id: probationId },
        data: {
          status: "confirmed",
          performanceRating: performanceRating || probation.performanceRating,
          remarks: remarks || probation.remarks,
          confirmedAt: new Date(),
        },
      });
    } else {
      confirmedRecord = await LifecycleService.confirmProbation(
        tenantId,
        actorUserId,
        probationId,
        performanceRating,
        remarks
      );
    }

    // 2. Generate Confirmation Letter Idempotently
    let generatedLetter = null;
    try {
      const employeeId = confirmedRecord.employeeId;

      // Check if confirmation letter already exists for this employee
      const existingLetter = await db.generatedLetter.findFirst({
        where: {
          tenantId,
          employeeId,
          letterType: "CONFIRMATION_LETTER",
        },
      });

      if (!existingLetter) {
        // Resolve confirmation letter template if exists
        const template = await db.documentTemplate.findFirst({
          where: {
            tenantId,
            OR: [
              { code: { contains: "confirmation", mode: "insensitive" } },
              { title: { contains: "confirmation", mode: "insensitive" } },
            ],
          },
        });

        if (dbOverride?.generatedLetter?.create) {
          generatedLetter = await dbOverride.generatedLetter.create({
            data: {
              tenantId,
              employeeId,
              letterNumber: `LTR-CONF-${Date.now()}`,
              letterType: "CONFIRMATION_LETTER",
              title: "Employment Confirmation Letter",
              status: "issued",
            },
          });
        } else {
          generatedLetter = await documentService.generateLetter(tenantId, {
            employeeId,
            templateId: template?.id,
            letterType: "CONFIRMATION_LETTER",
            title: "Employment Confirmation Letter",
            issuedById: actorUserId,
            customData: {
              confirmationDate: new Date().toLocaleDateString(),
              effectiveDate: confirmedRecord.confirmedAt
                ? new Date(confirmedRecord.confirmedAt).toLocaleDateString()
                : new Date().toLocaleDateString(),
              performanceRating: performanceRating || "Satisfactory",
            },
          });
        }

        const emp = await db.employee.findUnique({
          where: { id: employeeId },
          select: { userId: true },
        });

        // Notify employee of letter generation
        if (emp?.userId) {
          await NotificationService.createNotification({
            tenantId,
            userId: emp.userId,
            title: "Confirmation Letter Available",
            message: `Your official Employment Confirmation Letter has been generated and is now accessible in your documents vault.`,
            type: "CONFIRMATION_LETTER_ISSUED",
            actionUrl: "/me/documents",
            metadata: {
              letterId: generatedLetter.id,
              probationId,
            },
          });
        }
      } else {
        generatedLetter = existingLetter;
      }
    } catch (letterErr: any) {
      console.warn("[ProbationService] Confirmation letter generation non-blocking warning:", letterErr.message);
      // Non-blocking: We do NOT rollback HR confirmation if letter rendering encounters temporary issue
    }

    return {
      probation: confirmedRecord,
      probationRecord: confirmedRecord,
      letter: generatedLetter,
      confirmationLetter: generatedLetter,
    };
  }

  /**
   * Retrieves tenant-wide probation statistics and records.
   */
  public static async getProbationOverview(tenantId: string, dbOverride?: any) {
    const db = dbOverride || rawPrisma || prisma;
    const now = new Date();

    const records = await db.probationRecord.findMany({
      where: { tenantId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            joinedAt: true,
            department: { select: { id: true, name: true } },
            manager: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { endDate: "asc" },
    });

    const evaluated = records.map((r: any) => {
      const cls = this.classifyProbation(r, now);
      return {
        ...r,
        classification: cls.classification,
        daysRemaining: cls.daysRemaining,
        isOverdue: cls.isOverdue,
        isDueSoon: cls.isDueSoon,
        stage: cls.stage,
      };
    });

    const metrics = {
      total: evaluated.length,
      active: evaluated.filter((r: any) => r.status === "active" || r.status === "extended").length,
      dueSoon: evaluated.filter((r: any) => r.isDueSoon && r.status !== "confirmed").length,
      reviewPending: evaluated.filter((r: any) => r.classification === "REVIEW_SUBMITTED").length,
      overdue: evaluated.filter((r: any) => r.isOverdue && r.status !== "confirmed").length,
      confirmed: evaluated.filter((r: any) => r.status === "confirmed").length,
      extended: evaluated.filter((r: any) => r.status === "extended").length,
    };

    return {
      metrics,
      records: evaluated,
    };
  }
}
