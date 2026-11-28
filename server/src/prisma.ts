import { PrismaClient } from "@prisma/client";
import { prismaProxy, createDynamicPrismaProxy } from "./facade/prisma-proxy.facade";

export function buildPooledDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const u = new URL(rawUrl);
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT || "35");
    }
    if (!u.searchParams.has("pool_timeout")) {
      u.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT || "45");
    }
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "15");
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

const dbUrl = buildPooledDatabaseUrl(process.env.DATABASE_URL);

if (!dbUrl) {
  console.warn("⚠️ [WARN] DATABASE_URL is not configured. Database operations will be unavailable until DATABASE_URL is provided.");
}

declare global {
  // eslint-disable-next-line no-var
  var __rawPrisma: any;
  // eslint-disable-next-line no-var
  var __prismaProxy: any;
}

// Un-proxied base PrismaClient (retained for explicit system/admin access or rollback)
export const rawPrisma: PrismaClient =
  global.__rawPrisma ||
  new PrismaClient(
    dbUrl
      ? {
          datasources: {
            db: {
              url: dbUrl,
            },
          },
        }
      : undefined
  );

// Dynamic Prisma Proxy Facade exported as the default application-wide 'prisma' client instance
export const prisma: PrismaClient & Record<string, any> = (global.__prismaProxy || prismaProxy) as any;

// Retain Prisma singleton across lambda / hot-reloads
global.__rawPrisma = rawPrisma;
global.__prismaProxy = prisma;

export { createDynamicPrismaProxy, prismaProxy };

