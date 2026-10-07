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
 * Returns the request's verified tenant database client if in context,
 * or falls back to the shared Prisma client.
 */
export function getTenantDb(req?: any): PrismaClient {
  const ctx = getTenantContext();
  if (ctx?.db) {
    return ctx.db;
  }
  if (req?.tenantContext?.db) {
    return req.tenantContext.db;
  }
  // Fallback to shared prisma
  return sharedPrisma;
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

