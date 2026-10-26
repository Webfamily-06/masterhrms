"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrototypeTenantConnectionManager = void 0;
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config();
class PrototypeTenantConnectionManager {
    static instance;
    sharedClient;
    poolCache = new Map();
    maxCachedClients = 10;
    idleTimeoutMs = 5 * 60 * 1000; // 5 minutes
    // Trusted server-side registry (Simulating database/vault lookup)
    trustedRegistry = new Map();
    constructor() {
        const baseDbUrl = process.env.DATABASE_URL;
        if (!baseDbUrl) {
            throw new Error("DATABASE_URL must be configured.");
        }
        this.sharedClient = new client_1.PrismaClient({
            datasources: { db: { url: baseDbUrl } }
        });
    }
    static getInstance() {
        if (!PrototypeTenantConnectionManager.instance) {
            PrototypeTenantConnectionManager.instance = new PrototypeTenantConnectionManager();
        }
        return PrototypeTenantConnectionManager.instance;
    }
    /**
     * Register trusted tenant configuration (Server-Side ONLY)
     */
    registerTenantConfig(config) {
        this.trustedRegistry.set(config.tenantId, config);
    }
    /**
     * Resolve a tenant's approved configuration
     */
    getTenantConfig(tenantId) {
        return this.trustedRegistry.get(tenantId);
    }
    /**
     * Get the appropriate PrismaClient for the given tenant ID
     * Rejects unknown tenants and prevents arbitrary URL injection
     */
    async getClientForTenant(tenantId) {
        const config = this.trustedRegistry.get(tenantId);
        if (!config) {
            throw new Error(`TENANT_NOT_FOUND: Tenant '${tenantId}' is not registered in trusted configuration.`);
        }
        if (config.strategy === "SHARED_SCHEMA") {
            return { client: this.sharedClient, strategy: "SHARED_SCHEMA" };
        }
        if (!config.databaseUrl) {
            throw new Error(`CONFIGURATION_ERROR: Database URL missing for isolated tenant '${tenantId}'.`);
        }
        // Check pool cache for connection reuse
        const cached = this.poolCache.get(tenantId);
        if (cached) {
            cached.lastAccessedAt = Date.now();
            return { client: cached.client, strategy: config.strategy };
        }
        // Enforce bounded cache size
        if (this.poolCache.size >= this.maxCachedClients) {
            await this.evictOldestClient();
        }
        // Instantiate isolated PrismaClient
        const isolatedClient = new client_1.PrismaClient({
            datasources: { db: { url: config.databaseUrl } }
        });
        // Test connection health before caching
        try {
            await isolatedClient.$queryRaw `SELECT 1`;
        }
        catch (err) {
            await isolatedClient.$disconnect().catch(() => { });
            throw new Error(`DATABASE_CONNECTION_ERROR: Failed to connect to tenant database: ${err.message}`);
        }
        this.poolCache.set(tenantId, {
            client: isolatedClient,
            lastAccessedAt: Date.now()
        });
        return { client: isolatedClient, strategy: config.strategy };
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
     * Get count of active cached clients
     */
    getActiveCacheCount() {
        return this.poolCache.size;
    }
    /**
     * Get shared client directly
     */
    getSharedClient() {
        return this.sharedClient;
    }
    /**
     * Safe graceful shutdown of all connections
     */
    async shutdownAll() {
        for (const [id, entry] of this.poolCache.entries()) {
            await entry.client.$disconnect().catch(() => { });
        }
        this.poolCache.clear();
        await this.sharedClient.$disconnect().catch(() => { });
    }
}
exports.PrototypeTenantConnectionManager = PrototypeTenantConnectionManager;
