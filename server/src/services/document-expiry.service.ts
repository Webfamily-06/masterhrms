import { prisma, rawPrisma } from "../prisma.js";
import { NotificationService } from "./notification.service.js";
import { OutboxService } from "./outbox.service.js";

export type DocumentExpiryClassification =
  | "VALID"
  | "EXPIRING_30_DAYS"
  | "EXPIRING_15_DAYS"
  | "EXPIRING_7_DAYS"
  | "EXPIRED"
  | "NO_EXPIRY"
  | "PENDING_VERIFICATION"
  | "REJECTED"
  | "SUPERSEDED";

export interface ClassificationResult {
  classification: DocumentExpiryClassification;
  daysRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  stage: "30_days" | "15_days" | "7_days" | "expired" | "valid" | "none";
}

export class DocumentExpiryService {
  /**
   * Pure classification function for a document against a reference date.
   * Accurately calculates whole calendar days to avoid timezone hour boundary drift.
   */
  public static classifyDocument(
    document: {
      status?: string | null;
      expiryDate?: Date | string | null;
    },
    referenceDate: Date = new Date()
  ): ClassificationResult {
    const rawStatus = (document.status || "").toLowerCase().trim();

    // Priority status checks
    if (rawStatus === "superseded") {
      return {
        classification: "SUPERSEDED",
        daysRemaining: null,
        isExpired: false,
        isExpiringSoon: false,
        stage: "none",
      };
    }

    if (rawStatus === "rejected") {
      return {
        classification: "REJECTED",
        daysRemaining: null,
        isExpired: false,
        isExpiringSoon: false,
        stage: "none",
      };
    }

    if (rawStatus === "pending_verification") {
      return {
        classification: "PENDING_VERIFICATION",
        daysRemaining: null,
        isExpired: false,
        isExpiringSoon: false,
        stage: "none",
      };
    }

    if (!document.expiryDate) {
      return {
        classification: "NO_EXPIRY",
        daysRemaining: null,
        isExpired: false,
        isExpiringSoon: false,
        stage: "none",
      };
    }

    // Normalizing dates to midnight UTC for precise calendar-day arithmetic
    const expDate = new Date(document.expiryDate);
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
      classification: "VALID",
      daysRemaining: diffDays,
      isExpired: false,
      isExpiringSoon: false,
      stage: "valid",
    };
  }

  /**
   * Generates a deterministic idempotency key for expiry notification dispatches.
   * Pattern: doc_exp_{docId}_{expiryDate}_{stage}
   */
  public static generateIdempotencyKey(documentId: string, expiryDate: Date | string, stage: string): string {
    const d = new Date(expiryDate);
    const dateStr = d.toISOString().slice(0, 10);
    return `doc_exp_${documentId}_${dateStr}_${stage}`;
  }

  /**
   * Dispatches an expiry alert notification idempotently using NotificationService and OutboxService.
   */
  public static async dispatchExpiryNotification(params: {
    tenantId: string;
    document: any;
    stage: "30_days" | "15_days" | "7_days" | "expired";
    daysRemaining: number;
    dbOverride?: any;
  }): Promise<{ dispatched: boolean; alreadyProcessed: boolean }> {
    const { tenantId, document, stage, daysRemaining, dbOverride } = params;
    const db = dbOverride || rawPrisma || prisma;

    if (!document.expiryDate) {
      return { dispatched: false, alreadyProcessed: false };
    }

    const idempotencyKey = this.generateIdempotencyKey(document.id, document.expiryDate, stage);

    // 1. Check for existing notification in the database with this idempotency key
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

    // 2. Resolve employee and associated user for in-app alert
    let targetUserId: string | null = null;
    let employeeName = "Employee";
    if (document.employeeId) {
      const emp = await db.employee.findUnique({
        where: { id: document.employeeId },
        select: { id: true, userId: true, firstName: true, lastName: true },
      });
      if (emp) {
        targetUserId = emp.userId;
        employeeName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee";
      }
    }

    const stageTitles: Record<string, string> = {
      "30_days": `Document Expiring in 30 Days: ${document.title}`,
      "15_days": `Document Expiring in 15 Days: ${document.title}`,
      "7_days": `URGENT: Document Expiring in 7 Days: ${document.title}`,
      expired: `EXPIRED DOCUMENT: Action Required for ${document.title}`,
    };

    const stageBodies: Record<string, string> = {
      "30_days": `Your document "${document.title}" (${document.documentCode}) is scheduled to expire in 30 days on ${new Date(document.expiryDate).toLocaleDateString()}. Please initiate the renewal process soon.`,
      "15_days": `Your document "${document.title}" (${document.documentCode}) will expire in 15 days on ${new Date(document.expiryDate).toLocaleDateString()}. Submit updated documents to maintain compliance.`,
      "7_days": `URGENT: Your document "${document.title}" (${document.documentCode}) expires in 7 days! Please upload a valid replacement immediately.`,
      expired: `Your document "${document.title}" (${document.documentCode}) expired on ${new Date(document.expiryDate).toLocaleDateString()}. Your compliance status is currently affected. Submit a renewal right away.`,
    };

    const title = stageTitles[stage] || `Document Expiry Notification: ${document.title}`;
    const body = stageBodies[stage] || `Document ${document.title} status update.`;

    // 3. Dispatch in-app notification to employee if user exists
    if (targetUserId) {
      await NotificationService.createNotification({
        tenantId,
        userId: targetUserId,
        title,
        message: body,
        type: "DOCUMENT_EXPIRY",
        actionUrl: "/me/documents",
        metadata: {
          idempotencyKey,
          documentId: document.id,
          documentCode: document.documentCode,
          stage,
          daysRemaining,
          expiryDate: document.expiryDate,
        },
      });
    }

    // 4. Record transactional Outbox Event for external webhook/email/audit listeners
    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: stage === "expired" ? "DOCUMENT_EXPIRED" : "DOCUMENT_EXPIRING_SOON",
      entityType: "CompanyDocument",
      entityId: document.id,
      actorId: targetUserId,
      payload: {
        idempotencyKey,
        documentId: document.id,
        documentCode: document.documentCode,
        documentTitle: document.title,
        employeeId: document.employeeId,
        employeeName,
        stage,
        daysRemaining,
        expiryDate: document.expiryDate,
        targetUserId,
      },
      metadata: {
        idempotencyKey,
        source: "DocumentExpiryService",
      },
    });

    // 5. If urgent (7_days or expired), also notify tenant HR admins
    if (stage === "7_days" || stage === "expired") {
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
          const hrIdempotencyKey = `${idempotencyKey}_hr_${hr.userId}`;
          await NotificationService.createNotification({
            tenantId,
            userId: hr.userId,
            title: `[HR Alert] ${employeeName}: ${title}`,
            message: `Employee ${employeeName} has a document (${document.title}) that ${stage === "expired" ? "has expired" : `expires in ${daysRemaining} days`}.`,
            type: "HR_DOCUMENT_EXPIRY_ALERT",
            actionUrl: `/hr/documents/compliance`,
            metadata: {
              idempotencyKey: hrIdempotencyKey,
              documentId: document.id,
              employeeId: document.employeeId,
              stage,
            },
          });
        }
      } catch (hrErr: any) {
        console.warn("[DocumentExpiryService] HR admin notification warning:", hrErr.message);
      }
    }

    return { dispatched: true, alreadyProcessed: false };
  }

  /**
   * Scans and evaluates all documents for a tenant, categorizing them into compliance/expiry buckets.
   */
  public static async evaluateTenantDocuments(
    tenantId: string,
    referenceDate: Date = new Date(),
    dbOverride?: any
  ) {
    const db = dbOverride || rawPrisma || prisma;

    const documents = await db.companyDocument.findMany({
      where: {
        tenantId,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            departmentId: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        documentType: {
          select: {
            id: true,
            name: true,
            code: true,
            isRequired: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const evaluated = documents.map((doc: any) => {
      const classification = this.classifyDocument(doc, referenceDate);
      return {
        ...doc,
        classification: classification.classification,
        daysRemaining: classification.daysRemaining,
        isExpired: classification.isExpired,
        isExpiringSoon: classification.isExpiringSoon,
        stage: classification.stage,
      };
    });

    const summary = {
      total: evaluated.length,
      valid: evaluated.filter((d: any) => d.classification === "VALID").length,
      expiring30: evaluated.filter((d: any) => d.classification === "EXPIRING_30_DAYS").length,
      expiring15: evaluated.filter((d: any) => d.classification === "EXPIRING_15_DAYS").length,
      expiring7: evaluated.filter((d: any) => d.classification === "EXPIRING_7_DAYS").length,
      expired: evaluated.filter((d: any) => d.classification === "EXPIRED").length,
      pendingVerification: evaluated.filter((d: any) => d.classification === "PENDING_VERIFICATION").length,
      rejected: evaluated.filter((d: any) => d.classification === "REJECTED").length,
      superseded: evaluated.filter((d: any) => d.classification === "SUPERSEDED").length,
      noExpiry: evaluated.filter((d: any) => d.classification === "NO_EXPIRY").length,
    };

    return {
      tenantId,
      referenceDate,
      summary,
      documents: evaluated,
    };
  }
}
