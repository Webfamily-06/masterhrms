import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { prismaProxy, createDynamicPrismaProxy } from "./facade/prisma-proxy.facade";

// Ensure environment variables are loaded before PrismaClient initializes
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

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

