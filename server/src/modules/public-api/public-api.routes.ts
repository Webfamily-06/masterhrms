import { Router, Request, Response, NextFunction } from "express";
import { PublicApiService } from "./public-api.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

export const publicApiRouter = Router();

// Express middleware for authenticating API requests via API Key
export const authenticateApiKey = (requiredScope?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let rawKey = req.headers["x-api-key"] as string | undefined;

    if (!rawKey && req.headers.authorization?.startsWith("Bearer ")) {
      const token = req.headers.authorization.slice(7).trim();
      if (token.startsWith("mhr_live_")) {
        rawKey = token;
      }
    }

    if (!rawKey) {
      return res.status(401).json({
        error: "Missing API Key. Provide via X-API-Key header or Bearer mhr_live_...",
      });
    }

    const verification = await PublicApiService.verifyApiKey(rawKey, requiredScope);

    if (!verification.valid) {
      if (verification.error === "REVOKED_KEY") {
        return res.status(401).json({ error: "API key has been revoked" });
      }
      if (verification.error === "RATE_LIMIT_EXCEEDED") {
        res.setHeader("Retry-After", String(verification.rateLimitResetSeconds || 60));
        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfterSeconds: verification.rateLimitResetSeconds,
        });
      }
      if (verification.error === "INSUFFICIENT_SCOPE") {
        return res.status(403).json({
          error: `Insufficient scope. Key requires '${requiredScope}' permission.`,
        });
      }
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Set rate limit headers
    if (verification.rateLimitRemaining !== undefined) {
      res.setHeader("X-RateLimit-Remaining", String(verification.rateLimitRemaining));
    }

    (req as any).apiKeyTenantId = verification.tenantId;
    (req as any).apiKeyId = verification.keyId;
    (req as any).apiKeyScopes = verification.scopes;
    next();
  };
};

// 1. OpenAPI Specification / Documentation Viewer (Publicly accessible with session or key)
publicApiRouter.get("/docs", (_req: Request, res: Response) => {
  res.json(PublicApiService.getOpenApiSpec());
});

publicApiRouter.get("/openapi.json", (_req: Request, res: Response) => {
  res.json(PublicApiService.getOpenApiSpec());
});

// 2. Test / Verify Endpoint using API Key
publicApiRouter.post("/verify", async (req: Request, res: Response) => {
  const { rawKey, requiredScope } = req.body;
  if (!rawKey) {
    return res.status(400).json({ error: "rawKey is required" });
  }

  const result = await PublicApiService.verifyApiKey(rawKey, requiredScope);
  return res.json(result);
});

// --- Management Endpoints (Require User Authentication) ---
publicApiRouter.use(requireAuth as any);

// 3. List tenant API keys
publicApiRouter.get("/keys", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const keys = await PublicApiService.listApiKeys(tenantId);
    res.json({ keys });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list API keys" });
  }
});

// 4. Create a new API key (Shows rawKey ONCE)
publicApiRouter.post("/keys", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    const { name, scopes, rateLimit } = req.body;
    const result = await PublicApiService.createApiKey(tenantId, userId, {
      name,
      scopes,
      rateLimit: rateLimit ? Number(rateLimit) : undefined,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create API key" });
  }
});

// 5. Revoke an API key
publicApiRouter.post("/keys/:id/revoke", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    const revoked = await PublicApiService.revokeApiKey(tenantId, id, userId);
    res.json({ key: revoked });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to revoke API key" });
  }
});

// 6. Delete an API key
publicApiRouter.delete("/keys/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    await PublicApiService.deleteApiKey(tenantId, id, userId);
    res.json({ success: true, message: "API key deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to delete API key" });
  }
});
