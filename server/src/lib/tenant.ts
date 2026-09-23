import { Response } from "express";
import { AuthRequest } from "../middleware/auth";

/**
 * Strict Multi-Tenant Context Resolver (Constitutional Standard)
 * Ensures queries NEVER execute without an authentic, isolated tenant_id.
 * Rejects unauthenticated or ambiguous requests with 403 Forbidden.
 */
export function resolveTenantId(req: AuthRequest, res: Response): string | null {
  const tenantId = req.user?.tenantId;
  if (!tenantId || tenantId === "default") {
    res.status(403).json({ error: "Forbidden: Valid workspace context is required." });
    return null;
  }
  return tenantId;
}
