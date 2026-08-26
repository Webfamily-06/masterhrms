import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import { prisma } from "../prisma";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token format" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    const userId = decoded.userId || (decoded as any).id;
    const roles = Array.isArray(decoded.roles)
      ? decoded.roles
      : (decoded as any).role
        ? [(decoded as any).role]
        : ["employee"];

    req.user = {
      ...decoded,
      userId,
      tenantId: decoded.tenantId ?? null,
      roles,
    };
    (req.user as any).id = userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Token expired or invalid" });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    next();
  };
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole("super_admin")(req, res, next);
}
