import { Router, Request, Response, NextFunction } from "express";
import { PublicApiService } from "./public-api.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

export const publicApiRouter = Router();
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
