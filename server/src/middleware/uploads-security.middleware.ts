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
  "avatars/",
  "profiles/",
  "employees/avatars/",
  "media/avatars/",
];

/**
 * Checks whether a requested relative upload path falls into the allowed public asset categories
 * (system & tenant branding logos, favicons, marketplace icons, screenshots, and public employee avatars).
 * Private employee documents (contracts, identity proofs, payroll) remain strictly protected.
 */
export function isPublicUploadPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const lower = normalized.toLowerCase();
  if (
    lower.startsWith("avatars/") ||
    lower.startsWith("profiles/") ||
    (lower.startsWith("employees/") && lower.includes("/profile/"))
  ) {
    return true;
  }
  return PUBLIC_UPLOAD_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Security triage middleware guarding `/uploads` static file mounts.
 * Rejects unauthenticated access to non-public / sensitive directories (e.g., documents, private, contracts, payroll).
 * Enforces cross-tenant authorization checks via database metadata.
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
  } else if ((req as any).cookies?.auth_token) {
    token = (req as any).cookies.auth_token;
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
    const userTenantId = user.profile?.tenantId || (decoded as any).tenantId || null;

    // Query database for media file ownership
    const mediaFile = await db.mediaFile.findFirst({
      where: {
        filePath: subPath,
        deletedAt: null,
      },
    });

    if (mediaFile) {
      if (!isSuper && mediaFile.tenantId && mediaFile.tenantId !== userTenantId) {
        return res.status(403).json({
          error: "Forbidden: Access denied to private asset belonging to another workspace.",
          code: "FORBIDDEN_WORKSPACE_ASSET",
        });
      }
    } else {
      // If file exists on disk but has no MediaFile record, only Super Admin can access
      if (!isSuper) {
        return res.status(404).json({ error: "Requested asset not found or access denied." });
      }
    }

    return next();
  } catch (_err: any) {
    return res.status(401).json({ error: "Invalid or expired authorization token." });
  }
}
