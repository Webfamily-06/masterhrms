import { PrismaClient } from "@prisma/client";
import { getTenantContext, TenantContext } from "../context/tenant-context";
import {
  GLOBAL_MODELS,
  DIRECT_TENANT_MODELS,
  CHILD_DEPENDENT_MODELS,
  SCOPED_TENANT_MODELS,
  ROOT_TENANT_MODEL,
} from "../config/tenant-models.config";

export class TenantIsolationError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, code = "TENANT_CONTEXT_REQUIRED") {
    super(message);
    this.name = "TenantIsolationError";
    this.status = 403;
    this.code = code;
  }
}

const KNOWN_CHILD_RELATION_KEYS = new Set([
  "details",
  "items",
  "lines",
  "payments",
  "warehouseStocks",
  "proofs",
  "keyResults",
  "checkins",
  "reviews",
  "disposalItems",
  "maintenances",
  "interviews",
  "modules",
  "checklistItems",
  "comments",
  "messages",
  "fields",
  "responseValues",
  "permissions",
  "secret",
  "attendees",
  "versions",
  "acls",
  "links",
  "shares",
  "reminders",
]);

/**
 * Recursively walks write payloads and sanitizes/injects tenantId into:
 * 1. Root entity payload
 * 2. Nested `create` (object or array)
 * 3. Nested `createMany` (data array or object)
 * 4. Nested `connectOrCreate` (create payload)
 * 5. Nested `connect` (strips/overwrites spoofed tenantId)
 * 6. Nested `upsert` (create and update payloads)
 * 7. Nested `update` / `updateMany`
 */
function sanitizeWritePayload(
  data: any,
  tenantId: string,
  isDirectTenant: boolean,
  isScopedTenant = false,
  userId?: string
) {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const item of data) {
      sanitizeWritePayload(item, tenantId, isDirectTenant, isScopedTenant, userId);
    }
    return;
  }

  // Enforce scoped tenant models (Setting, SettingAudit) cannot mutate PLATFORM or foreign tenant scopes
  if (isScopedTenant) {
    if (data.scope === "PLATFORM") {
      throw new TenantIsolationError(
        "CROSS_TENANT_FORBIDDEN: Tenant context cannot create or mutate PLATFORM-scoped records.",
        "CROSS_TENANT_FORBIDDEN"
      );
    }
    if (data.scope === "USER" && userId) {
      data.scopeId = userId;
    } else {
      data.scope = "TENANT";
      data.scopeId = tenantId;
    }
  }

  // If this entity level belongs to a direct tenant model or already has a tenantId property
  if (isDirectTenant || "tenantId" in data || "tenant_id" in data) {
    if ("tenant_id" in data) {
      delete data.tenant_id;
    }
    data.tenantId = tenantId;
  }

  // Traverse nested relational operations
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (!val || typeof val !== "object") continue;

    // Handle nested `connect` — overwrite any spoofed tenantId inside compound unique connects
    if ("connect" in val && val.connect && typeof val.connect === "object") {
      const connectTargets = Array.isArray(val.connect) ? val.connect : [val.connect];
      for (const target of connectTargets) {
        if (target && typeof target === "object" && "tenantId" in target) {
          target.tenantId = tenantId;
        }
      }
    }

    // Handle nested `create`
    if ("create" in val) {
      const isChildRel = KNOWN_CHILD_RELATION_KEYS.has(key);
      if (Array.isArray(val.create)) {
        for (const item of val.create) {
          if (!isChildRel) {
            item.tenantId = tenantId;
          }
          sanitizeWritePayload(item, tenantId, !isChildRel);
        }
      } else if (typeof val.create === "object") {
        if (!isChildRel) {
          val.create.tenantId = tenantId;
        }
        sanitizeWritePayload(val.create, tenantId, !isChildRel);
      }
    }

    // Handle nested `createMany`
    if ("createMany" in val && val.createMany) {
      const isChildRel = KNOWN_CHILD_RELATION_KEYS.has(key);
      const cmData = val.createMany.data;
      if (Array.isArray(cmData)) {
        for (const item of cmData) {
          if (!isChildRel) {
            item.tenantId = tenantId;
          }
          sanitizeWritePayload(item, tenantId, !isChildRel);
        }
      } else if (typeof cmData === "object" && cmData !== null) {
        if (!isChildRel) {
          cmData.tenantId = tenantId;
        }
        sanitizeWritePayload(cmData, tenantId, !isChildRel);
      }
    }

    // Handle nested `connectOrCreate`
    if ("connectOrCreate" in val && val.connectOrCreate) {
      const entries = Array.isArray(val.connectOrCreate)
        ? val.connectOrCreate
        : [val.connectOrCreate];
      for (const item of entries) {
        if (item?.where && typeof item.where === "object" && "tenantId" in item.where) {
          item.where.tenantId = tenantId;
        }
        if (item?.create && typeof item.create === "object") {
          item.create.tenantId = tenantId;
          sanitizeWritePayload(item.create, tenantId, true);
        }
      }
    }

    // Handle nested `upsert`
    if ("upsert" in val && val.upsert) {
      const entries = Array.isArray(val.upsert) ? val.upsert : [val.upsert];
      for (const entry of entries) {
        if (entry?.where && typeof entry.where === "object" && "tenantId" in entry.where) {
          entry.where.tenantId = tenantId;
        }
        if (entry?.create && typeof entry.create === "object") {
          entry.create.tenantId = tenantId;
          sanitizeWritePayload(entry.create, tenantId, true);
        }
        if (entry?.update && typeof entry.update === "object") {
          if ("tenantId" in entry.update) {
            entry.update.tenantId = tenantId;
          }
          sanitizeWritePayload(entry.update, tenantId, false);
        }
      }
    }

    // Handle nested `update` / `updateMany`
    if ("update" in val && typeof val.update === "object" && val.update !== null) {
      if ("tenantId" in val.update) {
        val.update.tenantId = tenantId;
      }
      sanitizeWritePayload(val.update, tenantId, false);
    }
    if ("updateMany" in val && typeof val.updateMany === "object" && val.updateMany !== null) {
      const umEntries = Array.isArray(val.updateMany) ? val.updateMany : [val.updateMany];
      for (const entry of umEntries) {
        if (entry?.where && typeof entry.where === "object" && "tenantId" in entry.where) {
          entry.where.tenantId = tenantId;
        }
        if (entry?.data && typeof entry.data === "object") {
          sanitizeWritePayload(entry.data, tenantId, false);
        }
      }
    }
  }
}

/**
 * Builds the mandatory tenant isolation `where` filter for any classified model.
 * Fails closed on unknown models or missing tenant context.
 */
function applyTenantWhereFilter(
  model: string,
  where: any,
  context: TenantContext,
  isWrite: boolean
): any {
  const existingWhere = where || {};

  if (DIRECT_TENANT_MODELS.has(model)) {
    return { ...existingWhere, tenantId: context.tenantId };
  }

  if (model === ROOT_TENANT_MODEL) {
    return { ...existingWhere, id: context.tenantId };
  }

  if (CHILD_DEPENDENT_MODELS.has(model)) {
    const rel = CHILD_DEPENDENT_MODELS.get(model)!;
    const existingRelWhere = existingWhere[rel.parentRelation] || {};

    if (rel.parentModel === "Setting") {
      // SettingSecret inherits scope from Setting
      if (isWrite) {
        return {
          ...existingWhere,
          [rel.parentRelation]: {
            ...existingRelWhere,
            scope: "TENANT",
            scopeId: context.tenantId,
          },
        };
      }
      return {
        ...existingWhere,
        [rel.parentRelation]: {
          ...existingRelWhere,
          OR: [
            { scope: "PLATFORM" },
            { scope: "TENANT", scopeId: context.tenantId },
          ],
        },
      };
    }

    return {
      ...existingWhere,
      [rel.parentRelation]: {
        ...existingRelWhere,
        tenantId: context.tenantId,
      },
    };
  }

  if (SCOPED_TENANT_MODELS.has(model)) {
    if (isWrite) {
      if (existingWhere.scope === "USER" && context.userId) {
        return { ...existingWhere, scope: "USER", scopeId: context.userId };
      }
      return { ...existingWhere, scope: "TENANT", scopeId: context.tenantId };
    }

    const allowedScopes: any[] = [
      { scope: "PLATFORM" },
      { scope: "TENANT", scopeId: context.tenantId },
    ];
    if (context.userId) {
      allowedScopes.push({ scope: "USER", scopeId: context.userId });
    }

    const existingAnd = Array.isArray(existingWhere.AND)
      ? existingWhere.AND
      : existingWhere.AND
        ? [existingWhere.AND]
        : [];

    return {
      ...existingWhere,
      AND: [...existingAnd, { OR: allowedScopes }],
    };
  }

  throw new TenantIsolationError(
    `TENANT_CONTEXT_REQUIRED: Unclassified model '${model}' cannot be accessed through tenant-isolated client.`
  );
}

/**
 * Ensures active tenant context exists for all non-global models (Fail-Closed).
 */
function resolveRequiredContext(model: string): TenantContext | null {
  if (GLOBAL_MODELS.has(model)) {
    return null; // Global models bypass tenant isolation
  }
  const context = getTenantContext();
  if (!context?.tenantId) {
    throw new TenantIsolationError(
      `TENANT_CONTEXT_REQUIRED: Operation on tenant-scoped model '${model}' rejected because tenant context is missing.`
    );
  }
  return context;
}

/**
 * Creates a Prisma Client Extension that strictly enforces multi-tenant isolation rules.
 * SEC-002: Covers all Prisma operations:
 * - findMany, findFirst, findUnique, count, aggregate, groupBy
 * - create, createMany, update, updateMany, delete, deleteMany, upsert
 * - Direct tenant models, Child-dependent models, Scoped tenant models, Root Tenant model
 * - Recursive nested writes & fail-closed missing context protection
 */
export function createTenantIsolationExtension(baseClient: PrismaClient) {
  return baseClient.$extends({
    name: "tenant-isolation-extension",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, false);
          return query(args);
        },

        async findFirst({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, false);
          return query(args);
        },

        async findUnique({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, false);
          return query(args);
        },

        async count({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, false);
          return query(args);
        },

        async aggregate({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, false);
          return query(args);
        },

        async groupBy({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, false);
          return query(args);
        },

        async create({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          const isDirect = DIRECT_TENANT_MODELS.has(model);
          const isScoped = SCOPED_TENANT_MODELS.has(model);
          if (args.data) {
            sanitizeWritePayload(args.data, context.tenantId, isDirect, isScoped, context.userId);
          }

          return query(args);
        },

        async createMany({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          const isDirect = DIRECT_TENANT_MODELS.has(model);
          const isScoped = SCOPED_TENANT_MODELS.has(model);
          if (args.data) {
            if (Array.isArray(args.data)) {
              for (const item of args.data) {
                sanitizeWritePayload(item, context.tenantId, isDirect, isScoped, context.userId);
              }
            } else {
              sanitizeWritePayload(args.data, context.tenantId, isDirect, isScoped, context.userId);
            }
          }

          return query(args);
        },

        async update({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, true);

          const isScoped = SCOPED_TENANT_MODELS.has(model);
          if (args.data) {
            sanitizeWritePayload(args.data, context.tenantId, false, isScoped, context.userId);
          }

          return query(args);
        },

        async updateMany({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, true);

          const isScoped = SCOPED_TENANT_MODELS.has(model);
          if (args.data) {
            sanitizeWritePayload(args.data, context.tenantId, false, isScoped, context.userId);
          }

          return query(args);
        },

        async delete({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, true);
          return query(args);
        },

        async deleteMany({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          args.where = applyTenantWhereFilter(model, args.where, context, true);
          return query(args);
        },

        async upsert({ model, args, query }) {
          const context = resolveRequiredContext(model);
          if (!context) return query(args);

          const isDirect = DIRECT_TENANT_MODELS.has(model);
          const isScoped = SCOPED_TENANT_MODELS.has(model);
          args.where = applyTenantWhereFilter(model, args.where, context, true);

          if (args.create) {
            sanitizeWritePayload(args.create, context.tenantId, isDirect, isScoped, context.userId);
          }
          if (args.update) {
            sanitizeWritePayload(args.update, context.tenantId, false, isScoped, context.userId);
          }

          return query(args);
        },
      },
    },
  });
}
