import crypto from "crypto";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const prisma = rawPrisma || proxiedPrisma;
import {
  SETTINGS_REGISTRY,
  SettingDefinition,
  SettingScopeType,
  getGroupDefinitions,
  getSettingDefinition,
  validateSettingValue,
} from "./settings-registry";
import { broadcastToAll, broadcastToTenant } from "../../socket";

// ─── AES-256-GCM Secret Encryption Engine ────────────────────────
const ENCRYPTION_SALT = "master-hrms-settings-secret-salt-v1";
const RAW_KEY_MATERIAL =
  process.env.ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  "master-hrms-32-char-encryption-key-phrase!";
const DERIVED_KEY = crypto.scryptSync(RAW_KEY_MATERIAL, ENCRYPTION_SALT, 32);

export function encryptSecret(plaintext: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", DERIVED_KEY, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    authTag,
    keyVersion: 1,
  };
}

export function decryptSecret(ciphertext: string, ivHex: string, authTagHex: string): string {
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", DERIVED_KEY, iv);
  decipher.setAuthTag(authTag);
  let plaintext = decipher.update(ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}

// ─── In-Memory Cache Store ─────────────────────────────────────────
interface CacheEntry {
  value: any;
  version: number;
  updatedAt: number;
}
const cacheStore = new Map<string, CacheEntry>();

export function normalizeScopeId(scope: SettingScopeType, scopeId: string | null | undefined): string {
  if (scope === "PLATFORM") return "global";
  return scopeId && scopeId.trim().length > 0 ? scopeId : "global";
}

function getCacheKey(scope: SettingScopeType, scopeId: string | null | undefined, key: string): string {
  return `${scope}:${normalizeScopeId(scope, scopeId)}:${key}`;
}

export class SettingsService {
  /**
   * Get a single setting by key, resolving inheritance:
   * Scope specific (e.g. USER -> TENANT -> PLATFORM) -> Registry default
   */
  static async get<T = any>(
    scopeOrKey: SettingScopeType | string,
    scopeIdOrScope?: string | null | undefined,
    keyOrOptions?: string | { decryptSecrets?: boolean },
    maybeOptions?: { decryptSecrets?: boolean }
  ): Promise<T> {
    let scope: SettingScopeType;
    let scopeId: string | null | undefined;
    let key: string;
    let options: { decryptSecrets?: boolean } = {};

    if (typeof scopeOrKey === "string" && scopeOrKey.includes(".")) {
      // Called as get(key, scope?, scopeId?, options?)
      key = scopeOrKey;
      scope = (scopeIdOrScope as SettingScopeType) || "PLATFORM";
      scopeId = typeof keyOrOptions === "string" ? keyOrOptions : null;
      options = (typeof keyOrOptions === "object" ? keyOrOptions : maybeOptions) || {};
    } else {
      // Standard signature get(scope, scopeId, key, options)
      scope = scopeOrKey as SettingScopeType;
      scopeId = scopeIdOrScope;
      key = keyOrOptions as string;
      options = maybeOptions || {};
    }

    const def = getSettingDefinition(key);
    const defaultValue = (def?.default ?? null) as T;
    const normScopeId = normalizeScopeId(scope, scopeId);

    const cacheKey = getCacheKey(scope, normScopeId, key);
    const cached = cacheStore.get(cacheKey);
    if (cached) {
      return cached.value as T;
    }

    // Try finding exact match
    const row = await prisma.setting.findFirst({
      where: {
        scope,
        ...(scope === "PLATFORM"
          ? { OR: [{ scopeId: normScopeId }, { scopeId: null }, { scopeId: "global" }] }
          : { scopeId: normScopeId }),
        key,
      },
      include: {
        secret: true,
      },
    });

    if (row) {
      let finalVal = row.valueJson;
      if (row.isSecret && row.secret) {
        if (options.decryptSecrets) {
          try {
            finalVal = decryptSecret(row.secret.ciphertext, row.secret.iv, row.secret.authTag);
          } catch (err) {
            console.error(`Failed to decrypt secret setting ${key}:`, err);
            finalVal = null;
          }
        } else {
          finalVal = { isSecret: true, set: true };
        }
      }

      cacheStore.set(cacheKey, {
        value: finalVal,
        version: row.version,
        updatedAt: Date.now(),
      });
      return finalVal as T;
    }

    // Fallback: If scope is TENANT or USER, fallback to PLATFORM
    if (scope !== "PLATFORM") {
      const platformScopeId = normalizeScopeId("PLATFORM", null);
      const platformRow = await prisma.setting.findFirst({
        where: {
          scope: "PLATFORM",
          OR: [{ scopeId: platformScopeId }, { scopeId: null }, { scopeId: "global" }],
          key,
        },
        include: { secret: true },
      });
      if (platformRow) {
        let finalVal = platformRow.valueJson;
        if (platformRow.isSecret && platformRow.secret) {
          if (options.decryptSecrets) {
            try {
              finalVal = decryptSecret(
                platformRow.secret.ciphertext,
                platformRow.secret.iv,
                platformRow.secret.authTag
              );
            } catch {
              finalVal = null;
            }
          } else {
            finalVal = { isSecret: true, set: true };
          }
        }
        return finalVal as T;
      }
    }

    return defaultValue;
  }

  /**
   * Get all settings in a group, formatted for client UI consumption.
   * Resolves MediaFile URLs for any media ID keys.
   * For TENANT scope, resolves with precedence: TENANT override -> PLATFORM fallback -> SYSTEM default.
   */
  static async getGroup(
    scopeOrGroup: SettingScopeType | string,
    scopeIdOrScope?: string | null | undefined,
    groupOrScopeId?: string
  ): Promise<{
    values: Record<string, any>;
    mediaUrls: Record<string, string>;
    version: number;
    overrides?: Record<string, boolean>;
    sources?: Record<string, "TENANT" | "PLATFORM" | "DEFAULT">;
    items?: Record<
      string,
      {
        key: string;
        value: any;
        mediaUrl?: string;
        source: "TENANT" | "PLATFORM" | "DEFAULT";
        hasTenantOverride: boolean;
        fallbackValue: any;
        fallbackMediaUrl?: string;
      }
    >;
    platformFallbacks?: {
      values: Record<string, any>;
      mediaUrls: Record<string, string>;
    };
  }> {
    let scope: SettingScopeType;
    let scopeId: string | null | undefined;
    let group: string;

    if (!["PLATFORM", "TENANT", "USER"].includes(scopeOrGroup)) {
      // Called as getGroup(group, scope?, scopeId?) e.g. getGroup("branding", "PLATFORM")
      group = scopeOrGroup;
      scope = (scopeIdOrScope as SettingScopeType) || "PLATFORM";
      scopeId = groupOrScopeId || null;
    } else {
      // Called as getGroup(scope, scopeId, group)
      scope = scopeOrGroup as SettingScopeType;
      scopeId = scopeIdOrScope;
      group = groupOrScopeId as string;
    }

    const definitions = getGroupDefinitions(group);
    const values: Record<string, any> = {};
    const mediaUrls: Record<string, string> = {};
    const overrides: Record<string, boolean> = {};
    const sources: Record<string, "TENANT" | "PLATFORM" | "DEFAULT"> = {};
    const platformValues: Record<string, any> = {};
    const platformMediaUrls: Record<string, string> = {};
    const items: Record<
      string,
      {
        key: string;
        value: any;
        mediaUrl?: string;
        source: "TENANT" | "PLATFORM" | "DEFAULT";
        hasTenantOverride: boolean;
        fallbackValue: any;
        fallbackMediaUrl?: string;
      }
    > = {};
    let maxVersion = 1;

    // 1. Load registry defaults first
    for (const def of definitions) {
      values[def.key] = def.default;
      sources[def.key] = "DEFAULT";
      overrides[def.key] = false;
    }

    const normScopeId = normalizeScopeId(scope, scopeId);

    // 2. If scope is TENANT, first overlay PLATFORM settings as base fallback
    if (scope === "TENANT") {
      const platformScopeId = normalizeScopeId("PLATFORM", null);
      const platformRows = await prisma.setting.findMany({
        where: {
          scope: "PLATFORM",
          OR: [{ scopeId: platformScopeId }, { scopeId: null }, { scopeId: "global" }],
          group,
        },
        include: {
          secret: true,
        },
      });

      for (const pRow of platformRows) {
        maxVersion = Math.max(maxVersion, pRow.version);
        if (pRow.isSecret) {
          const secretPlaceholder = { isSecret: true, set: !!pRow.secret };
          platformValues[pRow.key] = secretPlaceholder;
          values[pRow.key] = secretPlaceholder;
          sources[pRow.key] = "PLATFORM";
        } else if (pRow.valueJson !== null && pRow.valueJson !== undefined) {
          platformValues[pRow.key] = pRow.valueJson;
          values[pRow.key] = pRow.valueJson;
          sources[pRow.key] = "PLATFORM";
        }
      }

      // Resolve media URLs for platform fallback values
      const pMediaIds: string[] = [];
      for (const def of definitions) {
        if (def.type === "media" && typeof platformValues[def.key] === "string" && platformValues[def.key]) {
          const val = platformValues[def.key];
          if (val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
            platformMediaUrls[def.key] = val;
          } else {
            pMediaIds.push(val);
          }
        }
      }

      if (pMediaIds.length > 0) {
        const pFiles = await prisma.mediaFile.findMany({
          where: { id: { in: pMediaIds }, deletedAt: null },
        });
        const pMap = new Map(pFiles.map((m) => [m.id, m.url]));
        for (const [key, val] of Object.entries(platformValues)) {
          if (typeof val === "string" && pMap.has(val)) {
            platformMediaUrls[key] = pMap.get(val)!;
          }
        }
      }
    }

    // 3. Query DB for existing entries in current scope
    const rows = await prisma.setting.findMany({
      where: {
        scope,
        ...(scope === "PLATFORM"
          ? { OR: [{ scopeId: normScopeId }, { scopeId: null }, { scopeId: "global" }] }
          : { scopeId: normScopeId }),
        group,
      },
      include: {
        secret: true,
      },
    });

    for (const row of rows) {
      maxVersion = Math.max(maxVersion, row.version);
      if (row.isSecret) {
        values[row.key] = { isSecret: true, set: !!row.secret };
        if (scope === "TENANT") {
          overrides[row.key] = true;
          sources[row.key] = "TENANT";
        } else {
          sources[row.key] = "PLATFORM";
        }
      } else if (row.valueJson !== null && row.valueJson !== undefined) {
        values[row.key] = row.valueJson;
        if (scope === "TENANT") {
          overrides[row.key] = true;
          sources[row.key] = "TENANT";
        } else {
          sources[row.key] = "PLATFORM";
        }
      }
    }

    // 4. Resolve media URLs for all media keys present in values
    const mediaIdsToFetch: string[] = [];
    for (const def of definitions) {
      if (def.type === "media" && typeof values[def.key] === "string" && values[def.key]) {
        const val = values[def.key];
        // If already a URL or relative path, directly set it
        if (val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
          mediaUrls[def.key] = val;
        } else {
          mediaIdsToFetch.push(val);
        }
      }
    }

    if (mediaIdsToFetch.length > 0) {
      const mediaFiles = await prisma.mediaFile.findMany({
        where: {
          id: { in: mediaIdsToFetch },
          deletedAt: null,
        },
      });
      const mediaMap = new Map(mediaFiles.map((m) => [m.id, m.url]));
      for (const [key, val] of Object.entries(values)) {
        if (typeof val === "string") {
          if (mediaMap.has(val)) {
            mediaUrls[key] = mediaMap.get(val)!;
          } else if (!mediaUrls[key] && (val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:"))) {
            mediaUrls[key] = val;
          }
        }
      }
    }

    // 5. Build structured item definitions with exact source and inheritance state
    for (const def of definitions) {
      const hasTenantOverride = scope === "TENANT" ? !!overrides[def.key] : false;
      const source = sources[def.key] || (hasTenantOverride ? "TENANT" : (scope === "PLATFORM" ? "PLATFORM" : "DEFAULT"));
      const fallbackValue = platformValues[def.key] !== undefined ? platformValues[def.key] : def.default;
      const defaultFallbackUrl =
        def.key === "branding.logo_dark_id"
          ? "/white-logo.webp"
          : def.key === "branding.favicon_id"
          ? "/favicon.webp"
          : "/logo.webp";
      const fallbackMediaUrl = platformMediaUrls[def.key] || defaultFallbackUrl;

      items[def.key] = {
        key: def.key,
        value: values[def.key],
        mediaUrl: mediaUrls[def.key] || fallbackMediaUrl,
        source,
        hasTenantOverride,
        fallbackValue,
        fallbackMediaUrl,
      };
    }

    return {
      values,
      mediaUrls,
      version: maxVersion,
      overrides,
      sources,
      items,
      platformFallbacks: {
        values: platformValues,
        mediaUrls: platformMediaUrls,
      },
    };
  }

  /**
   * Save a group of settings atomically with validation, secret encryption,
   * audit logging, cache invalidation, and realtime broadcast.
   */
  static async setGroup(
    scope: SettingScopeType,
    scopeId: string | null | undefined,
    group: string,
    payload: Record<string, any>,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<{ success: boolean; version: number; values: Record<string, any> }> {
    const definitions = getGroupDefinitions(group);
    const defMap = new Map(definitions.map((d) => [d.key, d]));

    // 1. Validate all keys in payload
    for (const [key, val] of Object.entries(payload)) {
      if (key.startsWith("_")) continue; // Skip metadata fields
      const def = defMap.get(key);
      if (!def) {
        throw new Error(`Invalid setting key '${key}' for group '${group}'`);
      }
      if (!def.scopes.includes(scope)) {
        throw new Error(`Setting '${key}' cannot be configured in '${scope}' scope`);
      }
      const validation = validateSettingValue(key, val, scope);
      if (!validation.valid) {
        throw new Error(`Validation failed for '${key}': ${validation.error}`);
      }
    }

    const normScopeId = normalizeScopeId(scope, scopeId);
    let nextVersion = 1;
    const changedKeys: string[] = [];

    // 2. Perform DB transaction
    await prisma.$transaction(async (tx) => {
      for (const [key, rawValue] of Object.entries(payload)) {
        if (key.startsWith("_")) continue;
        const def = defMap.get(key)!;

        // Skip secrets if client sent placeholder { set: true } or "***"
        if (def.isSecret && (rawValue === "***" || (typeof rawValue === "object" && rawValue?.set))) {
          continue;
        }

        const existing = await tx.setting.findFirst({
          where: {
            scope,
            scopeId: normScopeId,
            key,
          },
          include: { secret: true },
        });

        // If in TENANT scope and value is null/undefined/empty string, REMOVE the override
        if (scope === "TENANT" && (rawValue === null || rawValue === undefined || rawValue === "")) {
          if (existing) {
            if (def.type === "media") {
              await tx.mediaUsage.deleteMany({
                where: {
                  entityType: "setting",
                  entityId: existing.id,
                  fieldKey: key,
                },
              });

              // Clean up tenant-owned media file if orphaned
              if (typeof existing.valueJson === "string") {
                const oldMedia = await tx.mediaFile.findUnique({
                  where: { id: existing.valueJson },
                });
                // STRICT RULE: Only tenant-owned media can be cleaned up; NEVER platform media (tenantId === null)!
                if (oldMedia && oldMedia.tenantId === normScopeId) {
                  const remainingUsages = await tx.mediaUsage.count({
                    where: { mediaId: oldMedia.id },
                  });
                  if (remainingUsages === 0) {
                    await tx.mediaFile.update({
                      where: { id: oldMedia.id },
                      data: { deletedAt: new Date() },
                    });
                  }
                }
              }
            }
            if (def.isSecret) {
              await tx.settingSecret.deleteMany({
                where: { settingId: existing.id },
              });
            }
            await tx.setting.delete({
              where: { id: existing.id },
            });
          }

          await tx.settingAudit.create({
            data: {
              scope,
              scopeId: normScopeId,
              key,
              oldValueMasked: JSON.stringify(existing?.valueJson),
              newValueMasked: "[REMOVED OVERRIDE / FALLBACK TO PLATFORM]",
              changedBy: context.userId || "system",
              ipAddress: context.ipAddress || null,
              userAgent: context.userAgent || null,
            },
          });

          changedKeys.push(key);
          cacheStore.delete(getCacheKey(scope, normScopeId, key));
          continue;
        }

        // Cross-tenant media protection
        if (def.type === "media" && typeof rawValue === "string" && rawValue.length > 0) {
          const mediaExists = await tx.mediaFile.findUnique({ where: { id: rawValue } });
          if (!mediaExists) {
            throw new Error(`Media file not found for '${key}'`);
          }
          if (scope === "TENANT" && mediaExists.tenantId && mediaExists.tenantId !== normScopeId) {
            const err: any = new Error("Forbidden: Cannot use media belonging to another tenant");
            err.status = 403;
            throw err;
          }
        }

        const newVersion = (existing?.version || 0) + 1;
        nextVersion = Math.max(nextVersion, newVersion);

        let finalValueJson = rawValue;
        if (def.isSecret) {
          finalValueJson = null; // Secret ciphertext lives in SettingSecret
        }

        const savedSetting = await tx.setting.upsert({
          where: {
            scope_scopeId_key: {
              scope,
              scopeId: normScopeId,
              key,
            },
          },
          update: {
            group,
            valueJson: finalValueJson,
            valueType: def.type,
            isSecret: !!def.isSecret,
            version: newVersion,
            updatedBy: context.userId || null,
          },
          create: {
            scope,
            scopeId: normScopeId,
            group,
            key,
            valueJson: finalValueJson,
            valueType: def.type,
            isSecret: !!def.isSecret,
            version: newVersion,
            updatedBy: context.userId || null,
          },
        });

        // Handle Secret encryption
        if (def.isSecret && typeof rawValue === "string" && rawValue.trim().length > 0) {
          const encrypted = encryptSecret(rawValue);
          await tx.settingSecret.upsert({
            where: { settingId: savedSetting.id },
            update: {
              ciphertext: encrypted.ciphertext,
              iv: encrypted.iv,
              authTag: encrypted.authTag,
              keyVersion: encrypted.keyVersion,
            },
            create: {
              settingId: savedSetting.id,
              ciphertext: encrypted.ciphertext,
              iv: encrypted.iv,
              authTag: encrypted.authTag,
              keyVersion: encrypted.keyVersion,
            },
          });
        }

        // Handle Media Usage tracking
        if (def.type === "media") {
          // If replacing previous media in TENANT scope, check if old tenant-owned media is now orphaned
          if (
            scope === "TENANT" &&
            existing &&
            typeof existing.valueJson === "string" &&
            existing.valueJson !== rawValue
          ) {
            const oldMediaId = existing.valueJson;
            // Remove old usage for this field
            await tx.mediaUsage.deleteMany({
              where: {
                entityType: "setting",
                entityId: existing.id,
                fieldKey: key,
              },
            });

            // If old media belonged to this tenant, check if it has remaining usages
            const oldMedia = await tx.mediaFile.findUnique({
              where: { id: oldMediaId },
            });
            if (oldMedia && oldMedia.tenantId === normScopeId) {
              const remainingUsages = await tx.mediaUsage.count({
                where: { mediaId: oldMediaId },
              });
              if (remainingUsages === 0) {
                await tx.mediaFile.update({
                  where: { id: oldMediaId },
                  data: { deletedAt: new Date() },
                });
              }
            }
          } else {
            // Remove old usage for this field
            await tx.mediaUsage.deleteMany({
              where: {
                entityType: "setting",
                entityId: savedSetting.id,
                fieldKey: key,
              },
            });
          }

          // Add new usage if value is a valid mediaId
          if (typeof rawValue === "string" && rawValue.length > 0) {
            const mediaExists = await tx.mediaFile.findUnique({ where: { id: rawValue } });
            if (mediaExists) {
              await tx.mediaUsage.upsert({
                where: {
                  mediaId_entityType_entityId_fieldKey: {
                    mediaId: rawValue,
                    entityType: "setting",
                    entityId: savedSetting.id,
                    fieldKey: key,
                  },
                },
                update: {},
                create: {
                  mediaId: rawValue,
                  entityType: "setting",
                  entityId: savedSetting.id,
                  fieldKey: key,
                },
              });
            }
          }
        }

        // Audit row
        const oldValueStr = def.isSecret ? "[MASKED SECRET]" : JSON.stringify(existing?.valueJson);
        const newValueStr = def.isSecret ? "[MASKED SECRET]" : JSON.stringify(rawValue);
        await tx.settingAudit.create({
          data: {
            scope,
            scopeId: normScopeId,
            key,
            oldValueMasked: oldValueStr,
            newValueMasked: newValueStr,
            changedBy: context.userId || "system",
            ipAddress: context.ipAddress || null,
            userAgent: context.userAgent || null,
          },
        });

        changedKeys.push(key);
        // Clear in-memory cache
        cacheStore.delete(getCacheKey(scope, normScopeId, key));
      }
    }, { timeout: 30000, maxWait: 10000 });

    // 3. Emit Realtime Event
    const realtimePayload = {
      scope,
      tenantId: scopeId || undefined,
      group,
      keys: changedKeys,
      version: nextVersion,
      timestamp: new Date().toISOString(),
    };

    if (scope === "PLATFORM") {
      broadcastToAll("settings.updated", realtimePayload);
    } else if (scopeId) {
      broadcastToTenant(scopeId, "settings.updated", realtimePayload);
    }

    // Return masked refreshed values
    const refreshed = await this.getGroup(scope, scopeId, group);
    return {
      success: true,
      version: nextVersion,
      values: refreshed.values,
    };
  }

  /**
   * Reset all settings in a group to registry defaults.
   * For TENANT scope, resets overrides back to PLATFORM fallback by removing them.
   */
  static async resetGroup(
    scope: SettingScopeType,
    scopeId: string | null | undefined,
    group: string,
    context: { userId?: string; ipAddress?: string; userAgent?: string } = {}
  ) {
    const definitions = getGroupDefinitions(group);
    const resetPayload: Record<string, any> = {};
    for (const def of definitions) {
      resetPayload[def.key] = scope === "TENANT" ? null : def.default;
    }
    return this.setGroup(scope, scopeId, group, resetPayload, context);
  }

  /**
   * Delete / remove a single setting override.
   * If scope is TENANT, reverts this setting to the PLATFORM fallback without touching platform assets.
   */
  static async deleteSetting(
    scope: SettingScopeType,
    scopeId: string | null | undefined,
    group: string,
    key: string,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<{ success: boolean; key: string; message: string }> {
    const definitions = getGroupDefinitions(group);
    const def = definitions.find((d) => d.key === key);
    if (!def) {
      throw new Error(`Invalid setting key '${key}' for group '${group}'`);
    }

    const normScopeId = normalizeScopeId(scope, scopeId);

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.setting.findFirst({
        where: {
          scope,
          scopeId: normScopeId,
          key,
        },
      });

      if (!existing) {
        return {
          success: true,
          key,
          message: "No setting override exists to remove",
        };
      }

      if (def.type === "media") {
        await tx.mediaUsage.deleteMany({
          where: {
            entityType: "setting",
            entityId: existing.id,
            fieldKey: key,
          },
        });

        if (typeof existing.valueJson === "string") {
          const oldMedia = await tx.mediaFile.findUnique({
            where: { id: existing.valueJson },
          });
          // STRICT RULE: Only tenant-owned media can be cleaned up; NEVER platform media (tenantId === null)!
          if (oldMedia && oldMedia.tenantId === normScopeId) {
            const remainingUsages = await tx.mediaUsage.count({
              where: { mediaId: oldMedia.id },
            });
            if (remainingUsages === 0) {
              await tx.mediaFile.update({
                where: { id: oldMedia.id },
                data: { deletedAt: new Date() },
              });
            }
          }
        }
      }

      if (def.isSecret) {
        await tx.settingSecret.deleteMany({
          where: { settingId: existing.id },
        });
      }

      await tx.setting.delete({
        where: { id: existing.id },
      });

      await tx.settingAudit.create({
        data: {
          scope,
          scopeId: normScopeId,
          key,
          oldValueMasked: JSON.stringify(existing.valueJson),
          newValueMasked: "[DELETED OVERRIDE / REVERTED TO FALLBACK]",
          changedBy: context.userId || "system",
          ipAddress: context.ipAddress || null,
          userAgent: context.userAgent || null,
        },
      });

      cacheStore.delete(getCacheKey(scope, normScopeId, key));

      return {
        success: true,
        key,
        message: "Setting override removed successfully",
      };
    });
  }

  /**
   * Convenience setter for a single key
   */
  static async set(
    keyOrScope: string | SettingScopeType,
    valueOrScopeId: any,
    scopeOrKey?: SettingScopeType | string,
    scopeIdOrValue?: string | null | undefined | any,
    userId?: string
  ): Promise<any> {
    let key: string;
    let value: any;
    let scope: SettingScopeType = "PLATFORM";
    let scopeId: string | null | undefined = null;
    let uid = userId;

    if (typeof keyOrScope === "string" && keyOrScope.includes(".")) {
      // Called as set(key, value, scope?, scopeId?, userId?)
      key = keyOrScope;
      value = valueOrScopeId;
      scope = (scopeOrKey as SettingScopeType) || "PLATFORM";
      scopeId = scopeIdOrValue || null;
    } else {
      // Called as set(scope, scopeId, key, value, userId?)
      scope = keyOrScope as SettingScopeType;
      scopeId = valueOrScopeId;
      key = scopeOrKey as string;
      value = scopeIdOrValue;
    }

    const def = getSettingDefinition(key);
    if (!def) {
      throw new Error(`Unknown setting key: ${key}`);
    }
    return this.setGroup(scope, scopeId, def.group, { [key]: value }, { userId: uid });
  }

  /**
   * Convenience setter for multiple key-value pairs
   */
  static async setMany(
    payload: Record<string, any>,
    scope: SettingScopeType = "PLATFORM",
    scopeId: string | null | undefined = null,
    userId?: string | null
  ): Promise<any> {
    const grouped: Record<string, Record<string, any>> = {};
    for (const [key, val] of Object.entries(payload)) {
      const def = getSettingDefinition(key);
      if (def) {
        if (!grouped[def.group]) grouped[def.group] = {};
        grouped[def.group][key] = val;
      }
    }
    const results = [];
    for (const [group, groupPayload] of Object.entries(grouped)) {
      results.push(
        await this.setGroup(scope, scopeId, group, groupPayload, {
          userId: userId || undefined,
        })
      );
    }
    return results;
  }

  /**
   * Authoritative Default Settings Initializer.
   * Enforces Rules 2 & 3:
   * IF a DB value exists -> preserve DB value (NEVER OVERWRITE)
   * IF no DB value exists -> initialize with registry default
   * Safe to run on server startup, container restart, seed, or bootstrap.
   */
  static async ensureDefaultSettings(): Promise<void> {
    const platformScopeId = normalizeScopeId("PLATFORM", null);
    const definitions = Object.values(SETTINGS_REGISTRY);

    // 1. Fetch all existing platform setting keys in a single query
    const existingSettings = await prisma.setting.findMany({
      where: {
        scope: "PLATFORM",
        OR: [{ scopeId: platformScopeId }, { scopeId: null }, { scopeId: "global" }],
      },
      select: { key: true },
    });
    const existingKeySet = new Set(existingSettings.map((s) => s.key));

    // 2. Identify missing platform defaults
    const missingData: any[] = [];
    for (const def of definitions) {
      if (!def.scopes.includes("PLATFORM")) continue;
      if (existingKeySet.has(def.key)) continue;

      missingData.push({
        scope: "PLATFORM",
        scopeId: platformScopeId,
        group: def.group,
        key: def.key,
        valueJson: def.default,
        valueType: def.type,
        isSecret: !!def.isSecret,
        version: 1,
        updatedBy: "system_bootstrap",
      });
    }

    // 3. Batch insert missing defaults (skipDuplicates for multi-process concurrency safety)
    if (missingData.length > 0) {
      await prisma.setting.createMany({
        data: missingData,
        skipDuplicates: true,
      });
    }
  }

  /**
   * Invalidate entire in-memory cache
   */
  static clearCache() {
    cacheStore.clear();
  }
}
