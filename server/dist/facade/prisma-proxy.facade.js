"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaProxy = exports.TenantContextRequiredError = void 0;
exports.createDynamicPrismaProxy = createDynamicPrismaProxy;
const tenant_context_1 = require("../context/tenant-context");
const tenant_connection_manager_service_1 = require("../services/tenant-connection-manager.service");
const tenant_models_config_1 = require("../config/tenant-models.config");
class TenantContextRequiredError extends Error {
    status;
    code;
    constructor(message) {
        super(message);
        this.name = "TenantContextRequiredError";
        this.status = 403;
        this.code = "TENANT_CONTEXT_REQUIRED";
    }
}
exports.TenantContextRequiredError = TenantContextRequiredError;
function toPascalCase(str) {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Creates a Dynamic Prisma Proxy Facade that intercepts all model and client property accesses.
 *
 * Access Rules:
 * 1. If an active TenantContext exists in AsyncLocalStorage (getTenantContext() returns store),
 *    all calls are routed to context.db (the pre-resolved tenant client with autoscoping).
 * 2. If NO active TenantContext exists:
 *    - Global Platform Models (User, SubscriptionPlan, Coupon, Addon, CmsPage, Permission, etc.)
 *      are routed to the shared base Prisma client.
 *    - Direct Tenant Models, Child-Dependent Models, Scoped Tenant Models, Root Tenant Model,
 *      and ANY UNCLASSIFIED models FAIL CLOSED by throwing a TenantContextRequiredError (403 TENANT_CONTEXT_REQUIRED).
 *    - Special Prisma methods ($transaction, $queryRaw, $connect, etc.) fallback to shared client.
 */
function createDynamicPrismaProxy(fallbackClient) {
    const manager = tenant_connection_manager_service_1.TenantConnectionManager.getInstance();
    return new Proxy({}, {
        get(_target, prop, receiver) {
            // Diagnostic property
            if (prop === "__isDynamicProxyFacade") {
                return true;
            }
            // Symbols, hidden properties, inspect, or promise methods
            if (typeof prop === "symbol" || prop.startsWith("_") || prop === "then" || prop === "toJSON") {
                const shared = fallbackClient || manager.getSharedClient();
                const val = Reflect.get(shared, prop, receiver);
                return typeof val === "function" ? val.bind(shared) : val;
            }
            const propStr = String(prop);
            const pasModel = toPascalCase(propStr);
            const ctx = (0, tenant_context_1.getTenantContext)();
            // 1. ACTIVE TENANT CONTEXT PRESENT
            if (ctx?.db) {
                const targetClient = ctx.db;
                const val = Reflect.get(targetClient, propStr, receiver);
                if (typeof val === "function") {
                    if (propStr === "$transaction") {
                        return function (...args) {
                            return targetClient.$transaction(...args);
                        };
                    }
                    return val.bind(targetClient);
                }
                return val;
            }
            // 2. NO TENANT CONTEXT PRESENT (UNSCOPED ACCESS)
            const sharedClient = fallbackClient || manager.getSharedClient();
            // Case A: Global Platform Model -> Allowed on shared client
            if (tenant_models_config_1.GLOBAL_MODELS.has(pasModel)) {
                const val = Reflect.get(sharedClient, propStr, receiver);
                return typeof val === "function" ? val.bind(sharedClient) : val;
            }
            // Case B: Direct Tenant Model, Child-Dependent Model, Scoped Model, or Root Tenant Model -> FAIL CLOSED!
            if (tenant_models_config_1.DIRECT_TENANT_MODELS.has(pasModel) ||
                tenant_models_config_1.CHILD_DEPENDENT_MODELS.has(pasModel) ||
                tenant_models_config_1.SCOPED_TENANT_MODELS.has(pasModel) ||
                pasModel === tenant_models_config_1.ROOT_TENANT_MODEL) {
                throw new TenantContextRequiredError(`TENANT_CONTEXT_REQUIRED: Access to tenant-isolated model '${propStr}' was attempted outside of an active tenant context.`);
            }
            // Case C: Client Utility Methods ($transaction, $queryRaw, $executeRaw, $connect, $disconnect)
            if (propStr === "$transaction") {
                return function (...args) {
                    return sharedClient.$transaction(...args);
                };
            }
            if (propStr === "$queryRaw" ||
                propStr === "$queryRawUnsafe" ||
                propStr === "$executeRaw" ||
                propStr === "$executeRawUnsafe") {
                const val = Reflect.get(sharedClient, propStr, receiver);
                return typeof val === "function" ? val.bind(sharedClient) : val;
            }
            if (propStr === "$connect" ||
                propStr === "$disconnect" ||
                propStr === "$on" ||
                propStr === "$use" ||
                propStr === "$extends") {
                const val = Reflect.get(sharedClient, propStr, receiver);
                return typeof val === "function" ? val.bind(sharedClient) : val;
            }
            // Case D: Any unclassified model property -> FAIL CLOSED!
            throw new TenantContextRequiredError(`TENANT_CONTEXT_REQUIRED: Access to unclassified or non-global model '${propStr}' failed closed outside of an active tenant context.`);
        },
    });
}
// Instantiate singleton Dynamic Proxy Facade
exports.prismaProxy = createDynamicPrismaProxy();
