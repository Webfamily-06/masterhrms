import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { StorageFactory } from "../services/factories/storage.factory";

export const documentsRouter = Router();

documentsRouter.use(requireAuth, resolveTenantContext as any);

// Standard default company document templates
const DEFAULT_TEMPLATES = [
  {
    title: "Enterprise Master Employment Contract",
    category: "Employment Contract",
    fileName: "master-employment-agreement-2026.pdf",
    fileSize: "2.4 MB",
    fileType: "application/pdf",
    requiresSignature: true,
    notes: "Standard full-time permanent employment terms, compensation, IP assignment, and benefits.",
  },
  {
    title: "Non-Disclosure & Confidentiality Agreement (NDA)",
    category: "NDA & IP Agreement",
    fileName: "global-confidentiality-nda.pdf",
    fileSize: "1.1 MB",
    fileType: "application/pdf",
    requiresSignature: true,
    notes: "Confidentiality of trade secrets, customer data, software source code, and intellectual property.",
  },
  {
    title: "Corporate Code of Business Conduct & Ethics",
    category: "Company Policy",
    fileName: "code-of-business-conduct-v4.pdf",
    fileSize: "3.2 MB",
    fileType: "application/pdf",
    requiresSignature: true,
    notes: "Workplace anti-harassment, anti-bribery, insider trading prohibition, and whistleblower policies.",
  },
  {
    title: "Cybersecurity & Acceptable Asset Use Policy",
    category: "Company Policy",
    fileName: "cybersecurity-acceptable-use-policy.pdf",
    fileSize: "1.8 MB",
    fileType: "application/pdf",
    requiresSignature: true,
    notes: "Zero-trust access rules, multi-factor authentication requirements, and data classification guidelines.",
  },
];

/**
 * Auto-seed standard templates if tenant has no documents
 */
async function ensureSeedDocuments(tenantId: string) {
  const count = await prisma.companyDocument.count({ where: { tenantId } });
  if (count === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const documentCode = `DOC-${randomCode}`;

      await prisma.companyDocument.create({
        data: {
          tenantId,
          documentCode,
          title: t.title,
          category: t.category,
          fileName: t.fileName,
          fileSize: t.fileSize,
          fileType: t.fileType,
          requiresSignature: t.requiresSignature,
          status: "pending_signature",
          notes: t.notes,
        },
      });
    }
  }
}

// GET /api/documents (List documents)
documentsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const currentUserId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    const isSuperAdmin = userRoles.includes("super_admin");
    const isTenantAdmin = userRoles.includes("tenant_admin") || userRoles.includes("admin");
    const isHr = userRoles.includes("hr_admin") || userRoles.includes("hr");

    let currentEmpId: string | undefined;
    if (currentUserId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: currentUserId },
        select: { id: true },
      });
      currentEmpId = emp?.id;
    }

    const { category, status, employeeId, search } = req.query;

    const where: any = { tenantId };
    if (category && category !== "all") {
      where.category = String(category);
    }
    if (status && status !== "all") {
      where.status = String(status);
    }

    const andConditions: any[] = [];

    // Access Scoping
    if (!isSuperAdmin && !isTenantAdmin) {
      if (isHr) {
        // HR can see public templates, policies, and standard employee documents,
        // but cannot see private personal/compensation files of employees unless shared or owned
        andConditions.push({
          OR: [
            { category: { notIn: ["Personal", "Compensation"] } },
            { notes: { not: { contains: "[Private]" } } },
            ...(currentEmpId ? [{ employeeId: currentEmpId }] : []),
            ...(currentUserId ? [{ notes: { contains: `[Owner:${currentUserId}]` } }] : []),
            ...(currentUserId ? [{ notes: { contains: `[SharedWith:${currentUserId}]` } }] : []),
          ],
        });
      } else {
        // Regular Employee scoping:
        // Visible only if: assigned to employee, created by user, explicitly shared, or public policy
        const empConditions: any[] = [
          ...(currentUserId ? [{ notes: { contains: `[Owner:${currentUserId}]` } }] : []),
          ...(currentUserId ? [{ notes: { contains: `[SharedWith:${currentUserId}]` } }] : []),
          { notes: { contains: "[SharedWith:all]" } },
          {
            AND: [
              { employeeId: null },
              { category: { in: ["Company Policy", "Handbook", "General", "Corporate Policy"] } },
              { notes: { not: { contains: "[Private]" } } },
            ],
          },
        ];
        if (currentEmpId) {
          empConditions.push({ employeeId: currentEmpId });
          empConditions.push({ notes: { contains: `[SharedWith:${currentEmpId}]` } });
        }
        andConditions.push({ OR: empConditions });
      }
    }

    if (employeeId && employeeId !== "all") {
      if (!isSuperAdmin && !isTenantAdmin && !isHr && employeeId !== currentEmpId) {
        return res.status(403).json({ error: "Access denied: Cannot query other employees' documents." });
      }
      where.employeeId = String(employeeId);
    }

    if (search) {
      andConditions.push({
        OR: [
          { documentCode: { contains: String(search) } },
          { title: { contains: String(search) } },
          { fileName: { contains: String(search) } },
          { signerName: { contains: String(search) } },
          { employee: { firstName: { contains: String(search) } } },
          { employee: { lastName: { contains: String(search) } } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const pagination = parsePaginationParams(req, "createdAt", 20);

    const [total, documents] = await Promise.all([
      prisma.companyDocument.count({ where }),
      prisma.companyDocument.findMany({
        where,
        include: {
          employee: {
            include: { department: true },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(documents, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(documents);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list documents." });
  }
});

// POST /api/documents (Upload / Create document entry)
documentsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const currentUserId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    const isSuperAdmin = userRoles.includes("super_admin");
    const isTenantAdmin = userRoles.includes("tenant_admin") || userRoles.includes("admin");
    const isHr = userRoles.includes("hr_admin") || userRoles.includes("hr");

    let currentEmpId: string | undefined;
    if (currentUserId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: currentUserId },
        select: { id: true },
      });
      currentEmpId = emp?.id;
    }

    const {
      title,
      category,
      employeeId,
      fileName,
      fileSize,
      fileType,
      fileUrl,
      requiresSignature,
      expiryDate,
      notes,
    } = req.body;

    if (!title) return res.status(400).json({ error: "Document title is required." });

    let resolvedEmployeeId = employeeId || null;
    if (!isSuperAdmin && !isTenantAdmin && !isHr) {
      resolvedEmployeeId = currentEmpId || null;
    }

    // Embed owner tag and private flag in notes for persistent tracking
    let enrichedNotes = notes || "";
    if (currentUserId && !enrichedNotes.includes("[Owner:")) {
      enrichedNotes = enrichedNotes ? `${enrichedNotes} [Owner:${currentUserId}]` : `[Owner:${currentUserId}]`;
    }
    if ((category === "Personal" || category === "Compensation") && !enrichedNotes.includes("[Private]")) {
      enrichedNotes = `${enrichedNotes} [Private]`;
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const documentCode = `DOC-${randomCode}`;

    const doc = await prisma.companyDocument.create({
      data: {
        tenantId,
        documentCode,
        title,
        category: category || "Employment Contract",
        employeeId: resolvedEmployeeId,
        fileName: fileName || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
        fileSize: fileSize || "1.5 MB",
        fileType: fileType || "application/pdf",
        fileUrl: fileUrl || null,
        requiresSignature: requiresSignature !== undefined ? Boolean(requiresSignature) : true,
        status: requiresSignature ? "pending_signature" : "verified",
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: enrichedNotes || null,
      },
      include: {
        employee: { include: { department: true } },
      },
    });

    return res.status(201).json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create document." });
  }
});

// GET /api/documents/:id (Single document details with privacy check)
documentsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const currentUserId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    const isSuperAdmin = userRoles.includes("super_admin");
    const isTenantAdmin = userRoles.includes("tenant_admin") || userRoles.includes("admin");
    const isHr = userRoles.includes("hr_admin") || userRoles.includes("hr");

    let currentEmpId: string | undefined;
    if (currentUserId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: currentUserId },
        select: { id: true },
      });
      currentEmpId = emp?.id;
    }

    const doc = await prisma.companyDocument.findUnique({
      where: { id },
      include: {
        employee: { include: { department: true } },
      },
    });

    if (!doc || (tenantId && doc.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Document not found." });
    }

    const isOwner = (currentEmpId && doc.employeeId === currentEmpId) ||
                    (currentUserId && doc.notes && doc.notes.includes(`[Owner:${currentUserId}]`));
    const isShared = doc.notes && (
      (currentUserId && doc.notes.includes(`[SharedWith:${currentUserId}]`)) ||
      (currentEmpId && doc.notes.includes(`[SharedWith:${currentEmpId}]`)) ||
      doc.notes.includes("[SharedWith:all]")
    );
    const isPublicPolicy = !doc.employeeId && !doc.notes?.includes("[Private]") &&
      ["Company Policy", "Handbook", "General", "Corporate Policy"].includes(doc.category || "");
    const isPrivate = (doc.category === "Compensation" || doc.category === "Personal" || doc.notes?.includes("[Private]"));

    if (!isSuperAdmin && !isTenantAdmin) {
      if (isPrivate) {
        if (!isOwner && !isShared) {
          return res.status(403).json({ error: "Access denied: This document is private to its owner.", code: "DOCUMENT_ACCESS_DENIED" });
        }
      } else if (!isHr && !isOwner && !isShared && !isPublicPolicy) {
        return res.status(403).json({ error: "Access denied: You do not have permission to access this document.", code: "DOCUMENT_ACCESS_DENIED" });
      }
    }

    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch document." });
  }
});

// POST /api/documents/:id/share - Explicit file sharing
documentsRouter.post("/:id/share", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const currentUserId = req.user?.userId;
    const { targetUserId, targetEmployeeId, isPublic } = req.body;

    const doc = await prisma.companyDocument.findUnique({ where: { id } });
    if (!doc || (tenantId && doc.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Document not found." });
    }

    let currentEmpId: string | undefined;
    if (currentUserId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: currentUserId },
        select: { id: true },
      });
      currentEmpId = emp?.id;
    }
    const userRoles = req.user?.roles || [];
    const isOwner = (currentEmpId && doc.employeeId === currentEmpId) ||
                    (currentUserId && doc.notes && doc.notes.includes(`[Owner:${currentUserId}]`));
    const isAdmin = userRoles.includes("super_admin") || userRoles.includes("tenant_admin") || userRoles.includes("admin") || userRoles.includes("hr_admin");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only the document owner or an administrator can share this file." });
    }

    let shareToken = "";
    if (isPublic) {
      shareToken = "[SharedWith:all]";
    } else if (targetUserId) {
      const userInTenant = await prisma.user.findFirst({
        where: { id: targetUserId, profile: { tenantId } },
      });
      if (!userInTenant) {
        return res.status(400).json({
          error: "Target user does not exist in your organization.",
          code: "CROSS_TENANT_SHARING_FORBIDDEN"
        });
      }
      shareToken = `[SharedWith:${targetUserId}]`;
    } else if (targetEmployeeId) {
      const empInTenant = await prisma.employee.findFirst({
        where: { id: targetEmployeeId, tenantId },
      });
      if (!empInTenant) {
        return res.status(400).json({
          error: "Target employee does not exist in your organization.",
          code: "CROSS_TENANT_SHARING_FORBIDDEN"
        });
      }
      shareToken = `[SharedWith:${targetEmployeeId}]`;
    } else {
      return res.status(400).json({ error: "targetUserId, targetEmployeeId, or isPublic is required to share." });
    }

    let newNotes = doc.notes || "";
    if (!newNotes.includes(shareToken)) {
      newNotes = newNotes ? `${newNotes} ${shareToken}` : shareToken;
    }

    const updated = await prisma.companyDocument.update({
      where: { id },
      data: { notes: newNotes },
      include: { employee: { include: { department: true } } },
    });

    return res.json({ success: true, message: "Document shared successfully", document: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to share document." });
  }
});

// DELETE /api/documents/:id/share - Revoke document sharing
documentsRouter.delete("/:id/share", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { targetUserId, targetEmployeeId, revokeAll } = req.body;

    const doc = await prisma.companyDocument.findUnique({ where: { id } });
    if (!doc || (tenantId && doc.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Document not found." });
    }

    let shareToken = "";
    if (revokeAll) {
      shareToken = "[SharedWith:all]";
    } else if (targetUserId) {
      shareToken = `[SharedWith:${targetUserId}]`;
    } else if (targetEmployeeId) {
      shareToken = `[SharedWith:${targetEmployeeId}]`;
    }

    let newNotes = doc.notes || "";
    if (shareToken && newNotes.includes(shareToken)) {
      newNotes = newNotes.replace(shareToken, "").trim();
    }

    const updated = await prisma.companyDocument.update({
      where: { id },
      data: { notes: newNotes },
      include: { employee: { include: { department: true } } },
    });

    return res.json({ success: true, message: "Share revoked successfully", document: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to revoke share." });
  }
});

// POST /api/documents/:id/sign (Execute Digital E-Signature)
documentsRouter.post("/:id/sign", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { signatureDataUrl, signerName } = req.body;
    const tenantId = req.user?.tenantId;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    if (!signatureDataUrl || !signerName) {
      return res.status(400).json({ error: "Signature data and signer name are required." });
    }

    const existing = await prisma.companyDocument.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Document not found." });
    }

    const signed = await prisma.companyDocument.update({
      where: { id },
      data: {
        signatureDataUrl,
        signerName,
        signedAt: new Date(),
        signerIp: String(clientIp),
        status: "signed",
      },
      include: {
        employee: { include: { department: true } },
      },
    });

    return res.json({
      success: true,
      message: `Document ${signed.documentCode} successfully signed with digital audit trail!`,
      document: signed,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to sign document." });
  }
});

// PUT /api/documents/:id/verify (Verify Document / Mark Approved)
documentsRouter.put("/:id/verify", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const verifierName = req.user?.email || "Compliance Officer";

    const userRoles = req.user?.roles || [];
    const userPerms = req.user?.permissions || [];
    const isEmployeeOnly = userRoles.length === 1 && userRoles[0] === "employee";
    const canVerify =
      userPerms.includes("hr:documents:verify") ||
      userPerms.includes("documents:verify") ||
      userRoles.includes("super_admin") ||
      userRoles.includes("hr_admin") ||
      userRoles.includes("admin");

    if (isEmployeeOnly || !canVerify) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to verify or approve employee documents. Only authorized HR personnel may verify documents.",
      });
    }

    const existing = await prisma.companyDocument.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Document not found." });
    }

    const verified = await prisma.companyDocument.update({
      where: { id },
      data: {
        status: "verified",
        verifiedBy: verifierName,
        verifiedAt: new Date(),
      },
      include: {
        employee: { include: { department: true } },
      },
    });

    return res.json({
      success: true,
      message: `Document ${verified.documentCode} verified and certified!`,
      document: verified,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to verify document." });
  }
});

// DELETE /api/documents/:id (Delete document)
documentsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const userRoles = req.user?.roles || [];
    const userPerms = req.user?.permissions || [];
    const isEmployeeOnly = userRoles.length === 1 && userRoles[0] === "employee";
    const canDelete =
      userPerms.includes("hr:documents:delete") ||
      userPerms.includes("documents:delete") ||
      userRoles.includes("super_admin") ||
      userRoles.includes("hr_admin") ||
      userRoles.includes("admin");

    if (isEmployeeOnly || !canDelete) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to delete employee documents.",
      });
    }

    const existing = await prisma.companyDocument.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Document not found or access denied." });
    }

    await prisma.companyDocument.delete({ where: { id } });
    return res.json({ success: true, message: "Document deleted from vault." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete document." });
  }
});

// GET /api/documents/summary (Metrics)
documentsRouter.get("/summary/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const allDocs = await prisma.companyDocument.findMany({ where: { tenantId } });

    const totalDocs = allDocs.length;
    const pendingSignatures = allDocs.filter((d) => d.status === "pending_signature").length;
    const signedCount = allDocs.filter((d) => d.status === "signed").length;
    const verifiedCount = allDocs.filter((d) => d.status === "verified").length;

    return res.json({
      totalDocs,
      pendingSignatures,
      signedCount,
      verifiedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate document metrics." });
  }
});

/**
 * GET /api/documents/:id/stream
 * Secure authenticated binary document streaming route with tenant isolation,
 * ownership checks, on-the-fly decryption, and hardened security headers.
 */
documentsRouter.get("/:id/stream", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    // 1. Fetch StoredDocument or CompanyDocument metadata
    const storedDoc = await prisma.storedDocument.findFirst({
      where: { id, tenantId },
    });

    let companyDoc: any = null;
    if (!storedDoc) {
      companyDoc = await prisma.companyDocument.findFirst({
        where: { id, tenantId },
      });
    }

    if (!storedDoc && !companyDoc) {
      return res.status(404).json({ error: "Document not found or access denied." });
    }

    // 2. Ownership / RBAC check
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const userRoles = req.user?.roles || [];
    const isSuperAdmin = userRoles.includes("super_admin");
    const isTenantAdmin = userRoles.includes("tenant_admin") || userRoles.includes("admin");
    const isHr = userRoles.includes("hr_admin") || userRoles.includes("hr");

    let currentEmpId: string | undefined;
    if (currentUserId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: currentUserId },
        select: { id: true },
      });
      currentEmpId = emp?.id;
    }

    if (storedDoc) {
      if (!isSuperAdmin && !isTenantAdmin && !isHr && storedDoc.uploadedById && storedDoc.uploadedById !== currentUserId) {
        return res.status(403).json({
          error: "Forbidden: You do not have permission to access this private document.",
          code: "DOCUMENT_ACCESS_DENIED"
        });
      }
    } else if (companyDoc) {
      const isOwner = (currentEmpId && companyDoc.employeeId === currentEmpId) ||
                      (currentUserId && companyDoc.notes && companyDoc.notes.includes(`[Owner:${currentUserId}]`));
      const isShared = companyDoc.notes && (
        (currentUserId && companyDoc.notes.includes(`[SharedWith:${currentUserId}]`)) ||
        (currentEmpId && companyDoc.notes.includes(`[SharedWith:${currentEmpId}]`)) ||
        companyDoc.notes.includes("[SharedWith:all]")
      );
      const isPrivate = (companyDoc.category === "Compensation" || companyDoc.category === "Personal" || companyDoc.notes?.includes("[Private]"));

      if (!isSuperAdmin && !isTenantAdmin) {
        if (isPrivate && !isOwner && !isShared) {
          return res.status(403).json({
            error: "Forbidden: You do not have permission to access this private document.",
            code: "DOCUMENT_ACCESS_DENIED"
          });
        }
      }
    }

    // 3. Decrypt and stream from active tenant storage driver
    const storage = await StorageFactory.getDriver("TENANT", tenantId);
    let streamResult;
    try {
      streamResult = await storage.getStream(tenantId, id);
    } catch {
      // Fallback for metadata-only documents: stream text representation
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${companyDoc?.fileName || storedDoc?.originalName || 'document.pdf'}"`);
      return res.send(Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Vault Document) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"));
    }
    const { stream, metadata } = streamResult;

    // 4. Hardened Security Headers
    res.setHeader("Content-Type", metadata.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", metadata.sizeBytes.toString());
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(metadata.originalName)}"`
    );
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Document-Sha256", metadata.sha256Hash);

    // 5. Pipe decrypted binary stream to client
    stream.pipe(res);
  } catch (err: any) {
    console.error(`[GET /api/documents/:id/stream ERROR]:`, err);
    return res.status(500).json({ error: err.message || "Failed to stream document." });
  }
});

