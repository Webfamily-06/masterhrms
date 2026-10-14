import { Router } from "express";
import { AiAssistantService, PLATFORM_LANGUAGES } from "../services/ai-assistant.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAddon } from "../middleware/entitlements";

const router = Router();

// Apply auth and add-on entitlement middlewares
router.use(requireAuth);
router.use(requireAddon("ai-assistant"));

/**
 * GET /settings - Retrieve provider config
 */
router.get("/settings", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const config = await AiAssistantService.getProviderConfig(tenantId);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /settings - Update provider config
 */
router.put("/settings", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const config = await AiAssistantService.updateProviderConfig(tenantId, req.body);
    res.json(config);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /settings/test - Test provider connection
 */
router.post("/settings/test", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const result = await AiAssistantService.testConnection(tenantId, req.body?.apiKey);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /providers - Get supported adapters
 */
router.get("/providers", (_req, res) => {
  res.json(AiAssistantService.getProviders());
});

/**
 * GET /models - Get models
 */
router.get("/models", async (req, res) => {
  try {
    const provider = req.query.provider as string | undefined;
    const models = await AiAssistantService.getModels(provider);
    res.json(models);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /languages - Platform language registry
 */
router.get("/languages", (_req, res) => {
  res.json(PLATFORM_LANGUAGES);
});

/**
 * GET /fields - Get field rules for installed modules
 */
router.get("/fields", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const fields = await AiAssistantService.getFieldRules(tenantId);
    res.json(fields);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /fields/:id - Update field rule toggle
 */
router.put("/fields/:id", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { isEnabled } = req.body;
    const updated = await AiAssistantService.updateFieldRule(tenantId, req.params.id, Boolean(isEnabled));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /generate - Generate content
 */
router.post("/generate", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.id || "user-unknown";
    const result = await AiAssistantService.generate(tenantId, userId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /history - Get generation logs
 */
router.get("/history", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const history = await AiAssistantService.getHistory(tenantId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /history/:id - Get generation log detail
 */
router.get("/history/:id", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const detail = await AiAssistantService.getHistoryDetail(tenantId, req.params.id);
    if (!detail) {
      return res.status(404).json({ error: "Generation record not found" });
    }
    res.json(detail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /usage - Get usage metrics
 */
router.get("/usage", async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const analytics = await AiAssistantService.getUsageAnalytics(tenantId, from, to);
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
