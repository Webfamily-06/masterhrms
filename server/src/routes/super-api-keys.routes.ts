import crypto from "crypto";
import { Router, Response } from "express";
import { z } from "zod";
import { rawPrisma } from "../prisma";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { superAuditMiddleware } from "../lib/super-audit";

export const superApiKeysRouter = Router();

superApiKeysRouter.use(
  requireAuth,
  requireSuperAdmin,
  superAuditMiddleware("super-api-keys")
);

const SETTING_KEY = "platform_api_keys";
const SETTING_GROUP = "developer";

export interface StoredPlatformApiKey {
  id: string;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: string[];
  rateLimitPerMin: number;
  status: "active" | "revoked";
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  rotatedAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

const createKeySchema = z.object({
  name: z.string().trim().min(2, "Key name must be at least 2 characters.").max(120),
  scopes: z
    .array(z.string().trim().min(1).max(64))
    .min(1, "Select at least one scope.")
    .max(25)
    .default(["super:read"]),
  rateLimitPerMin: z.coerce.number().int().min(10).max(10000).optional().default(120),
  expiresAt: z
    .union([z.string().trim(), z.null()])
    .optional()
    .transform((val) => {
      if (!val) return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) {
        throw new Error("Invalid expiresAt date format.");
      }
      return d.toISOString();
    }),
});

function generateApiKeyMaterial(): { secret: string; prefix: string; keyHash: string } {
  const secret = `mhk_live_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = secret.slice(0, 14);
  const keyHash = crypto.createHash("sha256").update(secret).digest("hex");
  return { secret, prefix, keyHash };
}

function sanitizeKey(record: StoredPlatformApiKey) {
  const isExpired =
    record.status === "active" &&
    Boolean(record.expiresAt) &&
    new Date(record.expiresAt as string).getTime() <= Date.now();

  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    scopes: record.scopes,
    rateLimitPerMin: record.rateLimitPerMin,
    status: isExpired ? "expired" : record.status,
    rawStatus: record.status,
    isExpired,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    rotatedAt: record.rotatedAt,
    revokedAt: record.revokedAt,
    lastUsedAt: record.lastUsedAt,
  };
}

async function readStoredKeys(): Promise<{ settingId: string | null; version: number; keys: StoredPlatformApiKey[] }> {
  const row = await rawPrisma.setting.findFirst({
    where: {
      scope: "PLATFORM",
      scopeId: null,
      key: SETTING_KEY,
    },
  });

  if (!row) {
    return { settingId: null, version: 0, keys: [] };
  }

  const raw = row.valueJson as any;
  const keys = Array.isArray(raw?.keys) ? (raw.keys as StoredPlatformApiKey[]) : [];
  return { settingId: row.id, version: row.version, keys };
}

async function writeStoredKeys(
  settingId: string | null,
  version: number,
  keys: StoredPlatformApiKey[],
  updatedBy: string | null
): Promise<void> {
  const payload = { keys, updatedAt: new Date().toISOString() };
  if (settingId) {
    await rawPrisma.setting.update({
      where: { id: settingId },
      data: {
        valueJson: payload as any,
        updatedBy,
        version: version + 1,
      },
    });
  } else {
    await rawPrisma.setting.create({
      data: {
        scope: "PLATFORM",
        scopeId: null,
        group: SETTING_GROUP,
        key: SETTING_KEY,
        valueType: "json",
        isSecret: true,
        valueJson: payload as any,
        updatedBy,
      },
    });
  }
}

// GET / — List all platform API keys (metadata only, hashes never returned)
superApiKeysRouter.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const { keys } = await readStoredKeys();
    const sanitized = keys
      .map(sanitizeKey)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      total: sanitized.length,
      keys: sanitized,
    });
  } catch (err: any) {
    console.error("[super-api-keys] GET / error:", err);
    return res.status(500).json({ error: err?.message || "Failed to list API keys." });
  }
});

// POST / — Create new API key; returns plaintext secret ONCE
superApiKeysRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createKeySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message || "Invalid API key request.",
      });
    }

    const { name, scopes, rateLimitPerMin, expiresAt } = parsed.data;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ error: "Expiration date must be in the future." });
    }

    const { settingId, version, keys } = await readStoredKeys();
    const { secret, prefix, keyHash } = generateApiKeyMaterial();
    const now = new Date().toISOString();

    const newRecord: StoredPlatformApiKey = {
      id: crypto.randomUUID(),
      name,
      prefix,
      keyHash,
      scopes: Array.from(new Set(scopes)),
      rateLimitPerMin,
      status: "active",
      expiresAt,
      createdAt: now,
      createdBy: req.user?.email || req.user?.userId || "super_admin",
      rotatedAt: null,
      revokedAt: null,
      lastUsedAt: null,
    };

    await writeStoredKeys(settingId, version, [newRecord, ...keys], req.user?.userId || null);

    const safe = sanitizeKey(newRecord);
    res.locals.superAudit = {
      action: "PLATFORM_API_KEY_CREATED",
      entityType: "PlatformApiKey",
      entityId: newRecord.id,
      after: safe,
    };

    return res.status(201).json({
      success: true,
      message: "API key generated. Copy the secret now — it will never be displayed again.",
      key: safe,
      secret,
    });
  } catch (err: any) {
    console.error("[super-api-keys] POST / error:", err);
    return res.status(400).json({ error: err?.message || "Failed to create API key." });
  }
});

// POST /:id/rotate — Rotate secret for an active API key; returns new plaintext secret ONCE
superApiKeysRouter.post("/:id/rotate", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { settingId, version, keys } = await readStoredKeys();
    const idx = keys.findIndex((k) => k.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "API key not found." });
    }

    const existing = keys[idx];
    if (existing.status === "revoked") {
      return res.status(400).json({ error: "Cannot rotate a revoked API key. Create a new key instead." });
    }

    const { secret, prefix, keyHash } = generateApiKeyMaterial();
    const now = new Date().toISOString();

    const updated: StoredPlatformApiKey = {
      ...existing,
      prefix,
      keyHash,
      rotatedAt: now,
    };

    const nextKeys = [...keys];
    nextKeys[idx] = updated;
    await writeStoredKeys(settingId, version, nextKeys, req.user?.userId || null);

    const safe = sanitizeKey(updated);
    res.locals.superAudit = {
      action: "PLATFORM_API_KEY_ROTATED",
      entityType: "PlatformApiKey",
      entityId: updated.id,
      before: sanitizeKey(existing),
      after: safe,
    };

    return res.json({
      success: true,
      message: "API key rotated. Copy the new secret now — the previous secret is invalidated.",
      key: safe,
      secret,
    });
  } catch (err: any) {
    console.error("[super-api-keys] POST /:id/rotate error:", err);
    return res.status(500).json({ error: err?.message || "Failed to rotate API key." });
  }
});

// POST /:id/revoke — Revoke an API key
superApiKeysRouter.post("/:id/revoke", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { settingId, version, keys } = await readStoredKeys();
    const idx = keys.findIndex((k) => k.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "API key not found." });
    }

    const existing = keys[idx];
    const now = new Date().toISOString();
    const updated: StoredPlatformApiKey = {
      ...existing,
      status: "revoked",
      revokedAt: existing.revokedAt || now,
    };

    const nextKeys = [...keys];
    nextKeys[idx] = updated;
    await writeStoredKeys(settingId, version, nextKeys, req.user?.userId || null);

    const safe = sanitizeKey(updated);
    res.locals.superAudit = {
      action: "PLATFORM_API_KEY_REVOKED",
      entityType: "PlatformApiKey",
      entityId: updated.id,
      before: sanitizeKey(existing),
      after: safe,
    };

    return res.json({
      success: true,
      message: `API key "${updated.name}" has been revoked.`,
      key: safe,
    });
  } catch (err: any) {
    console.error("[super-api-keys] POST /:id/revoke error:", err);
    return res.status(500).json({ error: err?.message || "Failed to revoke API key." });
  }
});

// DELETE /:id — Permanently remove an API key record
superApiKeysRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { settingId, version, keys } = await readStoredKeys();
    const existing = keys.find((k) => k.id === id);

    if (!existing) {
      return res.status(404).json({ error: "API key not found." });
    }

    const nextKeys = keys.filter((k) => k.id !== id);
    await writeStoredKeys(settingId, version, nextKeys, req.user?.userId || null);

    res.locals.superAudit = {
      action: "PLATFORM_API_KEY_DELETED",
      entityType: "PlatformApiKey",
      entityId: existing.id,
      before: sanitizeKey(existing),
      after: { deleted: true },
    };

    return res.json({
      success: true,
      message: `API key "${existing.name}" permanently deleted.`,
    });
  } catch (err: any) {
    console.error("[super-api-keys] DELETE /:id error:", err);
    return res.status(500).json({ error: err?.message || "Failed to delete API key." });
  }
});
