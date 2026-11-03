import path from "path";
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";

const PUBLIC_UPLOAD_PREFIXES = [
  "system/branding/",
  "branding/",
  "platform/branding/",
  "workspace/branding/",
  "addons/",
  "media/icons/",
  "media/screens/",
];

// Folders / categories that contain confidential PII or employee documents
const SENSITIVE_DOCUMENT_FOLDERS = [
  "documents",
  "employee",
  "employees",
  "contracts",
  "medical",
  "disciplinary",
  "salary_slip",
  "payslips",
  "passport",
  "national_id",
  "statutory",
  "private",
  "identity",
];

/**
 * Checks whether a requested relative upload path falls into the allowed public asset categories
 * (system & tenant branding logos, favicons, marketplace icons, screenshots).
 */
export function isPublicUploadPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return PUBLIC_UPLOAD_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Security triage middleware guarding `/uploads` static file mounts.
 * Rejects unauthenticated access to non-public / sensitive directories (e.g., documents, private, contracts, payroll).
 * Enforces cross-tenant authorization checks via database metadata.
 * TASK-P1-03: Enforces employee-level authorization (BOLA protection) on confidential documents.
 */
export async function uploadsSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  const rawPath = req.path;
  const normalizedPath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, "");

  // Prevent directory traversal attacks
  if (rawPath.includes("..") || normalizedPath.includes("..")) {
    return res.status(400).json({ error: "Invalid path: Path traversal detected." });
  }

  const subPath = normalizedPath.replace(/\\/g, "/").replace(/^\/+/, "");

  // Public assets pass through directly to express.static
  if (isPublicUploadPath(subPath)) {
    return next();
  }

  // Extract authentication token from Authorization header, query parameter, or cookie
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query?.token && typeof req.query.token === "string") {
    token = req.query.token;
  } else if ((req as any).cookies?.hrms_auth_token) {
    token = (req as any).cookies.hrms_auth_token;
  } else if ((req as any).cookies?.auth_token) {
    token = (req as any).cookies.auth_token;
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  } else if (req.headers.cookie) {
    const rawCookies = req.headers.cookie;
    const match = rawCookies.match(/(?:^|;\s*)(?:hrms_auth_token|auth_token|token)=([^;]+)/);
    if (match) {
      try {
        token = decodeURIComponent(match[1]);
      } catch {
        token = match[1];
      }
    }
  }

  if (!token) {
    return res.status(401).json({
      error: "Authentication required to access private document assets.",
      code: "UPLOAD_AUTH_REQUIRED",
    });
  }

  try {
    const decoded = verifyToken(token);
    const userId = decoded.userId || (decoded as any).id;
    const db = rawPrisma || proxiedPrisma;
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true, roles: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid or expired user session." });
    }

    const isSuper = user.roles.some((r) => r.role === "super_admin");
    const isHrOrAdmin = user.roles.some((r) =>
      ["admin", "super_admin", "hr_admin", "hr_manager", "Workspace Admin"].includes(r.role)
    );
    const userTenantId = user.profile?.tenantId || (decoded as any).tenantId || null;

    // Query database for media file ownership
    const mediaFile = await db.mediaFile.findFirst({
      where: {
        OR: [
          { filePath: subPath },
          { url: `/uploads/${subPath}` },
        ],
        deletedAt: null,
      },
    });

    if (mediaFile) {
      // 1. Cross-Tenant Isolation Guard
      if (!isSuper && mediaFile.tenantId && mediaFile.tenantId !== userTenantId) {
        return res.status(403).json({
          error: "Forbidden: Access denied to private asset belonging to another workspace.",
          code: "FORBIDDEN_WORKSPACE_ASSET",
        });
      }

      // 2. TASK-P1-03: Object-Level Authorization (BOLA Guard) for Confidential Documents
      const folderLower = (mediaFile.folder || "").toLowerCase();
      const pathLower = subPath.toLowerCase();
      const isConfidential = SENSITIVE_DOCUMENT_FOLDERS.some(
        (f) => folderLower.includes(f) || pathLower.includes(f)
      );

      if (isConfidential && !isSuper && !isHrOrAdmin) {
        // Find employee ID for caller if exists
        const employee = await db.employee.findFirst({
          where: { userId: user.id },
          select: { id: true },
        }).catch(() => null);

        const isOwner =
          mediaFile.uploadedBy === user.id ||
          (employee && mediaFile.uploadedBy === employee.id) ||
          (employee && (pathLower.includes(employee.id.toLowerCase()) || folderLower.includes(employee.id.toLowerCase())));

        const userPermissions: string[] = (decoded as any).permissions || [];
        const hasDocPermission = userPermissions.includes("hrm.documents.view_all") || userPermissions.includes("hrm.employees.view");

        if (!isOwner && !hasDocPermission) {
          return res.status(403).json({
            error: "Forbidden: You are not authorized to view this confidential document.",
            code: "UNAUTHORIZED_DOCUMENT_ACCESS",
          });
        }
      }
    } else {
      // If file exists on disk but has no MediaFile record, only Super Admin or HR can access
      if (!isSuper && !isHrOrAdmin) {
        return res.status(404).json({ error: "Requested asset not found or access denied." });
      }
    }

    return next();
  } catch (_err: any) {
    return res.status(401).json({ error: "Invalid or expired authorization token." });
  }
}
