import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma, rawPrisma } from "../prisma";
import { verifyToken } from "../lib/jwt";

const SAFE_PREFIXES = [
  "/api/billing",
  "/api/auth",
  "/api/webhooks",
  "/api/health",
  "/api/public",
  "/api/super",
  "/api/workspace/subscription",
];

export async function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  // 1. CORS Preflight & Head requests always allowed
  if (req.method === "OPTIONS" || req.method === "HEAD") {
    return next();
  }

  // 2. Safe routes (billing, auth, webhooks, health, public, super, subscription status) always allowed
  const url = req.originalUrl || req.url || "";
  if (SAFE_PREFIXES.some((p) => url.startsWith(p))) {
    return next();
  }

  // 3. Platform Super Admin and impersonation bypass
  if (req.user?.roles?.includes("super_admin") || (req.user as any)?.isImpersonating) {
    return next();
  }

  // Check token if req.user is not yet populated
  let tenantId = req.user?.tenantId || (req as any).tenantId || (req as any).tenantContext?.tenantId;
  const authHeader = req.headers?.authorization;
  if (!tenantId && authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded: any = verifyToken(token);
      if (decoded.roles?.includes("super_admin") || decoded.isImpersonating) {
        return next();
      }
      tenantId = decoded.tenantId;
    } catch {
      // Downstream requireAuth will reject if invalid
      return next();
    }
  }

  if (!tenantId) {
    return next();
  }

  try {
    const db = rawPrisma || prisma;
    const sub = await db.tenantSubscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    if (!sub) {
      return next();
    }

    // 4. Suspension Enforcement: All business APIs blocked for suspended or cancelled workspaces
    if (["suspended", "cancelled"].includes(sub.status)) {
      return res.status(402).json({
        error: "Workspace account is suspended. Access to business operations is locked.",
        code: "SUBSCRIPTION_SUSPENDED",
        status: sub.status,
        tenantId,
        planName: sub.plan?.name || "Active Plan",
      });
    }

    // 5. Expiration Enforcement: All business APIs blocked once expiresAt timestamp is in the past
    if (sub.expiresAt && new Date(sub.expiresAt).getTime() < Date.now()) {
      return res.status(402).json({
        error: "Workspace subscription has expired. Access to business operations is locked.",
        code: "SUBSCRIPTION_EXPIRED",
        status: "expired",
        expiresAt: sub.expiresAt,
        tenantId,
        planName: sub.plan?.name || "Standard Plan",
      });
    }

    next();
  } catch (err: any) {
    console.error("[requireActiveSubscription] error:", err?.message || err);
    next();
  }
}
