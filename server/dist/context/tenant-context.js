"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantStorage = void 0;
exports.getTenantContext = getTenantContext;
exports.getTenantDb = getTenantDb;
exports.requireTenantDb = requireTenantDb;
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
 * Returns the request's verified tenant database client if in context.
 * Falls back to the dynamic prismaProxy (which fails closed on all tenant-scoped models
 * when no AsyncLocalStorage TenantContext is active).
 */
function getTenantDb(req) {
    const ctx = getTenantContext();
    if (ctx?.db) {
        return ctx.db;
    }
    if (req?.tenantContext?.db) {
        return req.tenantContext.db;
    }
    // Fallback to dynamic prismaProxy (enforces fail-closed on tenant models)
    return prisma_1.prisma;
}
/**
 * Strict fail-closed database accessor for tenant-only routes and services.
 * Throws 403 TENANT_CONTEXT_REQUIRED immediately if no verified tenant context exists.
 */
function requireTenantDb(req) {
    const ctx = getTenantContext();
    if (ctx?.db && ctx.tenantId) {
        return ctx.db;
    }
    if (req?.tenantContext?.db && req?.tenantContext?.tenantId) {
        return req.tenantContext.db;
    }
    const err = new Error("TENANT_CONTEXT_REQUIRED: Active tenant context is required for this database operation.");
    err.status = 403;
    err.code = "TENANT_CONTEXT_REQUIRED";
    throw err;
}
/**
 * Executes a function within the specified tenant context in AsyncLocalStorage.
 */
function runWithTenantContext(ctx, fn) {
    return exports.tenantStorage.run(ctx, fn);
}
