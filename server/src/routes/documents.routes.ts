import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const documentsRouter = Router();

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

    await ensureSeedDocuments(tenantId);

    const { category, status, employeeId, search } = req.query;

    const where: any = { tenantId };
    if (category && category !== "all") {
      where.category = String(category);
    }
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (employeeId && employeeId !== "all") {
      where.employeeId = String(employeeId);
    }
    if (search) {
      where.OR = [
        { documentCode: { contains: String(search) } },
        { title: { contains: String(search) } },
        { fileName: { contains: String(search) } },
        { signerName: { contains: String(search) } },
        { employee: { firstName: { contains: String(search) } } },
        { employee: { lastName: { contains: String(search) } } },
      ];
    }

    const documents = await prisma.companyDocument.findMany({
      where,
      include: {
        employee: {
          include: { department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

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

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const documentCode = `DOC-${randomCode}`;

    const doc = await prisma.companyDocument.create({
      data: {
        tenantId,
        documentCode,
        title,
        category: category || "Employment Contract",
        employeeId: employeeId || null,
        fileName: fileName || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
        fileSize: fileSize || "1.5 MB",
        fileType: fileType || "application/pdf",
        fileUrl: fileUrl || null,
        requiresSignature: requiresSignature !== undefined ? Boolean(requiresSignature) : true,
        status: requiresSignature ? "pending_signature" : "verified",
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes || null,
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

// GET /api/documents/:id (Single document details)
documentsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const doc = await prisma.companyDocument.findUnique({
      where: { id },
      include: {
        employee: { include: { department: true } },
      },
    });

    if (!doc || (tenantId && doc.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Document not found." });
    }

    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch document." });
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

    const existing = await prisma.companyDocument.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Document not found." });
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
