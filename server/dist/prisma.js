"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaProxy = exports.createDynamicPrismaProxy = exports.prisma = exports.rawPrisma = void 0;
exports.buildPooledDatabaseUrl = buildPooledDatabaseUrl;
const client_1 = require("@prisma/client");
const prisma_proxy_facade_1 = require("./facade/prisma-proxy.facade");
Object.defineProperty(exports, "prismaProxy", { enumerable: true, get: function () { return prisma_proxy_facade_1.prismaProxy; } });
Object.defineProperty(exports, "createDynamicPrismaProxy", { enumerable: true, get: function () { return prisma_proxy_facade_1.createDynamicPrismaProxy; } });
function buildPooledDatabaseUrl(rawUrl) {
    if (!rawUrl)
        return undefined;
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
    }
    catch {
        return rawUrl;
    }
}
const dbUrl = buildPooledDatabaseUrl(process.env.DATABASE_URL);
if (!dbUrl) {
    console.warn("⚠️ [WARN] DATABASE_URL is not configured. Database operations will be unavailable until DATABASE_URL is provided.");
}
// Un-proxied base PrismaClient (retained for explicit system/admin access or rollback)
exports.rawPrisma = global.__rawPrisma ||
    new client_1.PrismaClient(dbUrl
        ? {
            datasources: {
                db: {
                    url: dbUrl,
                },
            },
        }
        : undefined);
// Dynamic Prisma Proxy Facade exported as the default application-wide 'prisma' client instance
exports.prisma = (global.__prismaProxy || prisma_proxy_facade_1.prismaProxy);
// Retain Prisma singleton across lambda / hot-reloads
global.__rawPrisma = exports.rawPrisma;
global.__prismaProxy = exports.prisma;
