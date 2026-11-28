"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConnectionManager = void 0;
const client_1 = require("@prisma/client");
const tenant_isolation_extension_1 = require("../extensions/tenant-isolation.extension");
function buildPooledDatabaseUrl(rawUrl) {
    if (!rawUrl)
        return undefined;
    try {
        const u = new URL(rawUrl);
        if (!u.searchParams.has("connection_limit")) {
            u.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT || "20");
        }
        if (!u.searchParams.has("pool_timeout")) {
            u.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT || "30");
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
class TenantConnectionManager {
    static instance;
    sharedClient;
    poolCache = new Map();
    maxCachedClients = 20;
    idleTimeoutMs = 10 * 60 * 1000; // 10 minutes
    // Server-side trusted registry (Maps tenantId -> TenantRegistrationConfig)
    registry = new Map();
    constructor() {
        const baseDbUrl = buildPooledDatabaseUrl(process.env.DATABASE_URL);
        if (!baseDbUrl) {
            if (process.env.NODE_ENV === "production") {
                throw new Error("⚠️ [TenantConnectionManager] DATABASE_URL is strictly required in production.");
            }
            console.warn("⚠️ [TenantConnectionManager] DATABASE_URL is missing from environment variables.");
        }
        const rawShared = global.__rawPrisma ||
            (global.__rawPrisma = new client_1.PrismaClient(baseDbUrl ? { datasources: { db: { url: baseDbUrl } } } : undefined));
        this.sharedClient = (0, tenant_isolation_extension_1.createTenantIsolationExtension)(rawShared);
        // Start background idle pool cleanup sweep (runs every minute, unrefed)
        const timer = setInterval(() => {
            this.evictIdleClients().catch((err) => {
                console.error("[TenantConnectionManager] Idle sweep error:", err);
            });
        }, 60 * 1000);
        timer.unref();
    }
    static getInstance() {
        if (!TenantConnectionManager.instance) {
            TenantConnectionManager.instance = new TenantConnectionManager();
        }
        return TenantConnectionManager.instance;
    }
    /**
     * Register trusted tenant configuration (Server-Side Only)
     */
    registerTenant(config) {
        this.registry.set(config.tenantId, config);
    }
    /**
     * Retrieve tenant configuration
     */
    getTenantConfig(tenantId) {
        return this.registry.get(tenantId);
    }
    /**
     * Get the verified PrismaClient for the given tenant ID
     */
    async getClientForTenant(tenantId) {
        let config = this.registry.get(tenantId);
        // If tenant not explicitly registered in memory, default to SHARED_SCHEMA
        if (!config) {
            config = {
                tenantId,
                name: `Tenant_${tenantId}`,
                strategy: "SHARED_SCHEMA",
                status: "ACTIVE",
            };
        }
        if (config.status === "SUSPENDED" || config.status === "EXPIRED") {
            const error = new Error(`WORKSPACE_${config.status}: Workspace is currently ${config.status.toLowerCase()}.`);
            error.status = 403;
            error.code = `WORKSPACE_${config.status}`;
            throw error;
        }
        if (config.strategy === "SHARED_SCHEMA") {
            return { client: this.sharedClient, strategy: "SHARED_SCHEMA", status: config.status };
        }
        if (!config.databaseUrl) {
            const error = new Error(`CONFIGURATION_ERROR: Database URL missing for isolated tenant '${tenantId}'.`);
            error.status = 503;
            error.code = "CONFIGURATION_ERROR";
            throw error;
        }
        // Check LRU pool cache
        const cached = this.poolCache.get(tenantId);
        if (cached) {
            cached.lastAccessedAt = Date.now();
            return { client: cached.client, strategy: config.strategy, status: config.status };
        }
        // Enforce bounded cache size
        if (this.poolCache.size >= this.maxCachedClients) {
            await this.evictOldestClient();
        }
        // Instantiate new PrismaClient for the isolated database
        const rawIsolated = new client_1.PrismaClient({
            datasources: { db: { url: config.databaseUrl } },
        });
        // Verify connectivity before caching
        try {
            await rawIsolated.$queryRaw `SELECT 1`;
        }
        catch (err) {
            await rawIsolated.$disconnect().catch(() => { });
            const error = new Error(`DATABASE_CONNECTION_ERROR: Failed to connect to tenant database: ${err.message}`);
            error.status = 503;
            error.code = "DATABASE_CONNECTION_ERROR";
            throw error;
        }
        const extendedIsolated = (0, tenant_isolation_extension_1.createTenantIsolationExtension)(rawIsolated);
        this.poolCache.set(tenantId, {
            client: extendedIsolated,
            lastAccessedAt: Date.now(),
        });
        return { client: extendedIsolated, strategy: config.strategy, status: config.status };
    }
    /**
     * Evict the least recently used client
     */
    async evictOldestClient() {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [id, entry] of this.poolCache.entries()) {
            if (entry.lastAccessedAt < oldestTime) {
                oldestTime = entry.lastAccessedAt;
                oldestKey = id;
            }
        }
        if (oldestKey) {
            const entry = this.poolCache.get(oldestKey);
            this.poolCache.delete(oldestKey);
            if (entry) {
                await entry.client.$disconnect().catch(() => { });
            }
        }
    }
    /**
     * Disconnect and evict idle connections
     */
    async evictIdleClients() {
        const now = Date.now();
        for (const [id, entry] of this.poolCache.entries()) {
            if (now - entry.lastAccessedAt > this.idleTimeoutMs) {
                this.poolCache.delete(id);
                await entry.client.$disconnect().catch(() => { });
            }
        }
    }
    async evictTenant(tenantId) {
        const entry = this.poolCache.get(tenantId);
        if (entry) {
            this.poolCache.delete(tenantId);
            await entry.client.$disconnect().catch(() => { });
            return true;
        }
        return false;
    }
    getActiveCacheCount() {
        return this.poolCache.size;
    }
    getSharedClient() {
        return this.sharedClient;
    }
    /**
     * Graceful shutdown
     */
    async shutdownAll() {
        for (const [, entry] of this.poolCache.entries()) {
            await entry.client.$disconnect().catch(() => { });
        }
        this.poolCache.clear();
        await this.sharedClient.$disconnect().catch(() => { });
    }
}
exports.TenantConnectionManager = TenantConnectionManager;
