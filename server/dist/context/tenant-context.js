"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantStorage = void 0;
exports.getTenantContext = getTenantContext;
exports.getTenantDb = getTenantDb;
exports.runWithTenantContext = runWithTenantContext;
const node_async_hooks_1 = require("node:async_hooks");
const prisma_1 = require("../prisma");
exports.tenantStorage = new node_async_hooks_1.AsyncLocalStorage();
/**
 * Retrieve the current request-scoped tenant context from AsyncLocalStorage.
 */
function getTenantContext() {
    return exports.tenantStorage.getStore();
}
/**
 * Controlled database accessor for routes and services.
 * Returns the request's verified tenant database client if in context,
 * or falls back to the shared Prisma client.
 */
function getTenantDb(req) {
    const ctx = getTenantContext();
    if (ctx?.db) {
        return ctx.db;
    }
    if (req?.tenantContext?.db) {
        return req.tenantContext.db;
    }
    // Fallback to shared prisma
    return prisma_1.prisma;
}
/**
 * Executes a function within the specified tenant context in AsyncLocalStorage.
 */
function runWithTenantContext(ctx, fn) {
    return exports.tenantStorage.run(ctx, fn);
}
