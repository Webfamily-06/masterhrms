import { PrismaClient } from "@prisma/client";
import { getTenantContext } from "../context/tenant-context";
import {
  GLOBAL_MODELS,
  DIRECT_TENANT_MODELS,
  CHILD_DEPENDENT_MODELS,
  ROOT_TENANT_MODEL,
} from "../config/tenant-models.config";

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
]);

/**
 * Recursively walks write payloads and sanitizes/injects tenantId into:
 * 1. Root entity payload
 * 2. Nested `create` (object or array)
 * 3. Nested `createMany` (data array or object)
 * 4. Nested `connectOrCreate` (create payload)
 * 5. Nested `upsert` (create and update payloads)
 * 6. Nested `update` / `updateMany`
 */
function sanitizeWritePayload(data: any, tenantId: string, isDirectTenant: boolean) {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const item of data) {
      sanitizeWritePayload(item, tenantId, isDirectTenant);
    }
    return;
  }

  // If this entity level belongs to a direct tenant model or already has a tenantId property
  if (isDirectTenant || "tenantId" in data || "tenant_id" in data) {
    data.tenantId = tenantId;
  }

  // Traverse nested relational operations
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (!val || typeof val !== "object") continue;

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
      if (Array.isArray(val.connectOrCreate)) {
        for (const item of val.connectOrCreate) {
          if (item?.create && typeof item.create === "object") {
            item.create.tenantId = tenantId;
            sanitizeWritePayload(item.create, tenantId, true);
          }
        }
      } else if (typeof val.connectOrCreate === "object" && val.connectOrCreate.create) {
        val.connectOrCreate.create.tenantId = tenantId;
        sanitizeWritePayload(val.connectOrCreate.create, tenantId, true);
      }
    }

    // Handle nested `upsert`
    if ("upsert" in val && val.upsert) {
      if (val.upsert.create && typeof val.upsert.create === "object") {
        val.upsert.create.tenantId = tenantId;
        sanitizeWritePayload(val.upsert.create, tenantId, true);
      }
      if (val.upsert.update && typeof val.upsert.update === "object") {
        if ("tenantId" in val.upsert.update) {
          val.upsert.update.tenantId = tenantId;
        }
        sanitizeWritePayload(val.upsert.update, tenantId, true);
      }
    }

    // Handle nested `update` / `updateMany`
    if ("update" in val && typeof val.update === "object") {
      if ("tenantId" in val.update) {
        val.update.tenantId = tenantId;
      }
      sanitizeWritePayload(val.update, tenantId, false);
    }
  }
}

/**
 * Creates a Prisma Client Extension that automatically injects tenant isolation rules.
 * Supports:
 * - Direct tenant models (tenantId column)
 * - Child-dependent models (via parent relation traversal)
 * - Root Tenant model (scoped by id = tenantId)
 * - Recursive nested writes (create, createMany, connectOrCreate, upsert)
 * - Bulk operations (createMany, updateMany, deleteMany)
 * - Interactive transactions ($transaction)
 */
export function createTenantIsolationExtension(baseClient: PrismaClient) {
  return baseClient.$extends({
    name: "tenant-isolation-extension",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          } else if (CHILD_DEPENDENT_MODELS.has(model)) {
            const rel = CHILD_DEPENDENT_MODELS.get(model)!;
            args.where = {
              ...(args.where || {}),
              [rel.parentRelation]: {
                ...(args.where?.[rel.parentRelation] || {}),
                tenantId: context.tenantId,
              },
            };
          }

          return query(args);
        },

        async findFirst({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          } else if (CHILD_DEPENDENT_MODELS.has(model)) {
            const rel = CHILD_DEPENDENT_MODELS.get(model)!;
            args.where = {
              ...(args.where || {}),
              [rel.parentRelation]: {
                ...(args.where?.[rel.parentRelation] || {}),
                tenantId: context.tenantId,
              },
            };
          }

          return query(args);
        },

        async findUnique({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          }

          return query(args);
        },

        async count({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          } else if (CHILD_DEPENDENT_MODELS.has(model)) {
            const rel = CHILD_DEPENDENT_MODELS.get(model)!;
            args.where = {
              ...(args.where || {}),
              [rel.parentRelation]: {
                ...(args.where?.[rel.parentRelation] || {}),
                tenantId: context.tenantId,
              },
            };
          }

          return query(args);
        },

        async create({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          const isDirect = DIRECT_TENANT_MODELS.has(model);
          if (args.data) {
            sanitizeWritePayload(args.data, context.tenantId, isDirect);
          }

          return query(args);
        },

        async createMany({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          const isDirect = DIRECT_TENANT_MODELS.has(model);
          if (args.data) {
            if (Array.isArray(args.data)) {
              for (const item of args.data) {
                sanitizeWritePayload(item, context.tenantId, isDirect);
              }
            } else {
              sanitizeWritePayload(args.data, context.tenantId, isDirect);
            }
          }

          return query(args);
        },

        async update({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          }

          if (args.data) {
            sanitizeWritePayload(args.data, context.tenantId, false);
          }

          return query(args);
        },

        async updateMany({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          }

          if (args.data) {
            sanitizeWritePayload(args.data, context.tenantId, false);
          }

          return query(args);
        },

        async delete({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          }

          return query(args);
        },

        async deleteMany({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          }

          return query(args);
        },

        async upsert({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          const isDirect = DIRECT_TENANT_MODELS.has(model);
          if (isDirect) {
            args.where = { ...(args.where || {}), tenantId: context.tenantId };
          } else if (model === ROOT_TENANT_MODEL) {
            args.where = { ...(args.where || {}), id: context.tenantId };
          }

          if (args.create) {
            sanitizeWritePayload(args.create, context.tenantId, isDirect);
          }
          if (args.update) {
            sanitizeWritePayload(args.update, context.tenantId, false);
          }

          return query(args);
        },
      },
    },
  });
}
