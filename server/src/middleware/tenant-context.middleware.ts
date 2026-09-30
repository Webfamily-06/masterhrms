import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { tenantStorage, TenantContext } from "../context/tenant-context";

export interface TenantContextRequest extends AuthRequest {
  tenantContext?: TenantContext;
}

/**
 * Express middleware to resolve, authorize, and bind the Request-Scoped Tenant Context.
 * Placed immediately after requireAuth.
 */
export async function resolveTenantContext(
  req: TenantContextRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication context." });
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "Forbidden: Missing tenant context." });
    }

    // Resolve tenant client and tenancy strategy via Connection Manager
    const connectionManager = TenantConnectionManager.getInstance();
    const { client, strategy, status } = await connectionManager.getClientForTenant(tenantId);

    const context: TenantContext = {
      tenantId,
      userId: user.userId || (user as any).id,
      roles: user.roles || [],
      status,
      tenancyStrategy: strategy,
      db: client,
    };

    req.tenantContext = context;

    // Run remaining middleware and route handlers inside AsyncLocalStorage context scope
    tenantStorage.run(context, () => {
      next();
    });
  } catch (err: any) {
    const status = err.status || 500;
    const message = err.message || "Failed to resolve workspace context.";
    
    // Never expose raw database connection strings or passwords in API response
    const sanitizedMessage = message.replace(/mysql:\/\/.*?@/g, "mysql://[REDACTED]@");

    return res.status(status).json({
      error: sanitizedMessage,
      code: err.code || "TENANT_RESOLUTION_ERROR",
    });
  }
}
