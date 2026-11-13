import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getTenantDb } from "../context/tenant-context.js";
import { documentService } from "../services/document.service.js";
import { DocumentComplianceService } from "../services/document-compliance.service.js";
import { ContractLifecycleService } from "../services/contract-lifecycle.service.js";
import { AuditService } from "../services/audit.service.js";
import { OutboxService } from "../services/outbox.service.js";
import { NotificationService } from "../services/notification.service.js";

export const meDocumentsRouter = Router();

async function resolveEmployee(req: AuthRequest) {
  const tenantId = req.user?.tenantId!;
  const user = req.user!;
  const userId = user.userId || (user as any).id;
  if (!tenantId || !userId) return null;
  const db = getTenantDb();
  return await db.employee.findFirst({
    where: {
      tenantId,
      userId,
      status: { notIn: ["terminated", "inactive"] },
    },
  });
}

// My Company Documents (General company policies or assigned to me)
meDocumentsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const docs = await db.companyDocument.findMany({
      where: {
        tenantId,
        OR: [
          { employeeId: employee.id },
          { employeeId: null }, // Company-wide policies
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(docs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// My Contracts
meDocumentsRouter.get("/contracts", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const contracts = await documentService.listContracts(tenantId, {
      employeeId: employee.id,
    });
    const now = new Date();
    const evaluated = contracts.map((c: any) => {
      const cls = ContractLifecycleService.classifyContract(c, now);
      return {
        ...c,
        classification: cls.classification,
        daysRemaining: cls.daysRemaining,
        isExpired: cls.isExpired,
        isExpiringSoon: cls.isExpiringSoon,
        stage: cls.stage,
      };
    });
    return res.json(evaluated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// My Acknowledgements
meDocumentsRouter.get("/acknowledgements", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const acks = await documentService.listAcknowledgements(tenantId, {
      employeeId: employee.id,
    });
    return res.json(acks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Acknowledge Policy / Document
meDocumentsRouter.post("/acknowledgements/:documentId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const ipAddress = req.ip || (req.headers["x-forwarded-for"] as string) || "127.0.0.1";
    const result = await documentService.submitAcknowledgement(
      tenantId,
      employee.id,
      req.params.documentId,
      ipAddress,
      req.body.comments
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// My Document / Letter Requests
meDocumentsRouter.get("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const requests = await documentService.listRequests(tenantId, {
      employeeId: employee.id,
    });
    return res.json(requests);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

meDocumentsRouter.post("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const request = await documentService.createRequest(tenantId, employee.id, req.body);
    return res.status(201).json(request);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/me/documents/compliance (My Mandatory Compliance Status & Checklist)
meDocumentsRouter.get("/compliance", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const compliance = await DocumentComplianceService.getEmployeeDocumentCompliance(tenantId, employee.id);
    return res.json(compliance);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/me/documents/:id/renew (Submit renewal for my document)
meDocumentsRouter.post("/:id/renew", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const { id } = req.params;
    const db = getTenantDb();

    const predecessor = await db.companyDocument.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, userId: true, firstName: true, lastName: true } },
      },
    });

    if (!predecessor || predecessor.tenantId !== tenantId || predecessor.employeeId !== employee.id) {
      return res.status(404).json({ error: "Document not found or you do not have permission to renew it." });
    }

    const {
      fileUrl,
      fileName,
      fileSize = "1.5 MB",
      fileType = "application/pdf",
      expiryDate,
      notes,
      title,
    } = req.body;

    if (!fileUrl && !fileName) {
      return res.status(400).json({ error: "Replacement file (fileUrl or fileName) is required for document renewal." });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newDocCode = `DOC-RNW-${randomSuffix}`;
    const renewalTitle = title || predecessor.title;
    const renewalExpiry = expiryDate ? new Date(expiryDate) : null;

    const [updatedPredecessor, newDocument] = await db.$transaction([
      db.companyDocument.update({
        where: { id: predecessor.id },
        data: {
          status: "superseded",
          notes: predecessor.notes
            ? `${predecessor.notes}\n[Superseded by renewal ${newDocCode} on ${new Date().toISOString()}]`
            : `[Superseded by renewal ${newDocCode} on ${new Date().toISOString()}]`,
        },
      }),
      db.companyDocument.create({
        data: {
          tenantId,
          employeeId: employee.id,
          documentTypeId: predecessor.documentTypeId,
          documentCode: newDocCode,
          title: renewalTitle,
          category: predecessor.category,
          fileName: fileName || `${renewalTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-renewal.pdf`,
          fileSize,
          fileType,
          fileUrl: fileUrl || null,
          requiresSignature: false,
          status: "pending_verification",
          expiryDate: renewalExpiry,
          notes: notes ? `Self-service renewal: ${notes}` : `Self-service renewal for predecessor ${predecessor.documentCode}`,
        },
        include: {
          employee: { include: { department: true } },
          documentType: true,
        },
      }),
    ]);

    // Audit Log
    try {
      await AuditService.logMutation({
        tenantId,
        actorId: req.user?.userId || "system",
        action: "DOCUMENT_RENEWAL_SUBMITTED",
        entityType: "CompanyDocument",
        entityId: newDocument.id,
        metadata: {
          predecessorId: predecessor.id,
          predecessorCode: predecessor.documentCode,
          newDocumentCode: newDocument.documentCode,
          selfService: true,
        },
      });
    } catch (auditErr: any) {
      console.warn("[meDocuments.renew] Audit log creation failed:", auditErr.message);
    }

    // Outbox Event
    try {
      await OutboxService.createOutboxEvent({
        tenantId,
        eventType: "DOCUMENT_RENEWAL_SUBMITTED",
        entityType: "CompanyDocument",
        entityId: newDocument.id,
        actorId: req.user?.userId,
        payload: {
          predecessorId: predecessor.id,
          predecessorCode: predecessor.documentCode,
          newDocumentId: newDocument.id,
          newDocumentCode: newDocument.documentCode,
          employeeId: employee.id,
          selfService: true,
        },
      });
    } catch (outboxErr: any) {
      console.warn("[meDocuments.renew] Outbox event failed:", outboxErr.message);
    }

    // Notify HR
    try {
      const hrRoles = await db.userRole.findMany({
        where: {
          tenantId,
          role: { in: ["hr_admin", "super_admin"] },
        },
        select: { userId: true },
        take: 5,
      });

      const empName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "An employee";
      for (const hr of hrRoles) {
        await NotificationService.createNotification({
          tenantId,
          userId: hr.userId,
          title: `Document Renewal Submitted: ${newDocument.title}`,
          message: `${empName} has submitted a renewal document for verification.`,
          type: "DOCUMENT_RENEWAL_PENDING",
          actionUrl: "/hr/documents/compliance",
          metadata: {
            documentId: newDocument.id,
            predecessorId: predecessor.id,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[meDocuments.renew] Notification failed:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Document renewal submitted successfully (${newDocument.documentCode}). Awaiting HR verification.`,
      document: newDocument,
      predecessor: updatedPredecessor,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
