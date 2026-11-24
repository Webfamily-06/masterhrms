import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@prisma/client";
import { prisma as sharedPrisma } from "../prisma";

export type TenancyStrategy = "SHARED_SCHEMA" | "SCHEMA_PER_TENANT" | "DEDICATED_DB";
export type WorkspaceStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "EXPIRED";

export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  status: WorkspaceStatus;
  tenancyStrategy: TenancyStrategy;
  db: PrismaClient;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Retrieve the current request-scoped tenant context from AsyncLocalStorage.
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Controlled database accessor for routes and services.
 * Returns the request's verified tenant database client if in context.
 * Falls back to the dynamic prismaProxy (which fails closed on all tenant-scoped models
 * when no AsyncLocalStorage TenantContext is active).
 */
export function getTenantDb(req?: any): PrismaClient {
  const ctx = getTenantContext();
  if (ctx?.db) {
    return ctx.db;
  }
  if (req?.tenantContext?.db) {
    return req.tenantContext.db;
  }
  // Fallback to dynamic prismaProxy (enforces fail-closed on tenant models)
  return sharedPrisma;
}

/**
 * Strict fail-closed database accessor for tenant-only routes and services.
 * Throws 403 TENANT_CONTEXT_REQUIRED immediately if no verified tenant context exists.
 */
export function requireTenantDb(req?: any): PrismaClient {
  const ctx = getTenantContext();
  if (ctx?.db && ctx.tenantId) {
    return ctx.db;
  }
  if (req?.tenantContext?.db && req?.tenantContext?.tenantId) {
    return req.tenantContext.db;
  }
  const err: any = new Error("TENANT_CONTEXT_REQUIRED: Active tenant context is required for this database operation.");
  err.status = 403;
  err.code = "TENANT_CONTEXT_REQUIRED";
  throw err;
}

/**
 * Executes a function within the specified tenant context in AsyncLocalStorage.
 */
export function runWithTenantContext<T>(
  ctx: TenantContext,
  fn: () => T | Promise<T>
): Promise<T> {
  return tenantStorage.run(ctx, fn) as Promise<T>;
}

