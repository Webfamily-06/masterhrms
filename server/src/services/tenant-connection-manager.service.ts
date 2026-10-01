import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { TenancyStrategy, WorkspaceStatus } from "../context/tenant-context";
import { createTenantIsolationExtension } from "../extensions/tenant-isolation.extension";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export interface TenantRegistrationConfig {
  tenantId: string;
  name: string;
  strategy: TenancyStrategy;
  status: WorkspaceStatus;
  databaseUrl?: string; // Server-side stored only, NEVER accepted from client requests
}

interface CachedTenantClient {
  client: PrismaClient;
  lastAccessedAt: number;
}

export class TenantConnectionManager {
  private static instance: TenantConnectionManager;
  private sharedClient: PrismaClient;
  private poolCache = new Map<string, CachedTenantClient>();
  private readonly maxCachedClients = 20;
  private readonly idleTimeoutMs = 10 * 60 * 1000; // 10 minutes

  // Server-side trusted registry (Maps tenantId -> TenantRegistrationConfig)
  private registry = new Map<string, TenantRegistrationConfig>();

  private constructor() {
    const baseDbUrl = process.env.DATABASE_URL;
    if (!baseDbUrl) {
      throw new Error("DATABASE_URL must be configured before starting TenantConnectionManager.");
    }
    const rawShared = new PrismaClient({
      datasources: { db: { url: baseDbUrl } },
    });
    this.sharedClient = createTenantIsolationExtension(rawShared) as any;

    // Start background idle pool cleanup sweep (runs every minute, unrefed)
    const timer = setInterval(() => {
      this.evictIdleClients().catch((err) => {
        console.error("[TenantConnectionManager] Idle sweep error:", err);
      });
    }, 60 * 1000);
    timer.unref();
  }

  public static getInstance(): TenantConnectionManager {
    if (!TenantConnectionManager.instance) {
      TenantConnectionManager.instance = new TenantConnectionManager();
    }
    return TenantConnectionManager.instance;
  }

  /**
   * Register trusted tenant configuration (Server-Side Only)
   */
  public registerTenant(config: TenantRegistrationConfig): void {
    this.registry.set(config.tenantId, config);
  }

  /**
   * Retrieve tenant configuration
   */
  public getTenantConfig(tenantId: string): TenantRegistrationConfig | undefined {
    return this.registry.get(tenantId);
  }

  /**
   * Get the verified PrismaClient for the given tenant ID
   */
  public async getClientForTenant(
    tenantId: string
  ): Promise<{ client: PrismaClient; strategy: TenancyStrategy; status: WorkspaceStatus }> {
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
      const error: any = new Error(`WORKSPACE_${config.status}: Workspace is currently ${config.status.toLowerCase()}.`);
      error.status = 403;
      error.code = `WORKSPACE_${config.status}`;
      throw error;
    }

    if (config.strategy === "SHARED_SCHEMA") {
      return { client: this.sharedClient, strategy: "SHARED_SCHEMA", status: config.status };
    }

    if (!config.databaseUrl) {
      const error: any = new Error(`CONFIGURATION_ERROR: Database URL missing for isolated tenant '${tenantId}'.`);
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
    const rawIsolated = new PrismaClient({
      datasources: { db: { url: config.databaseUrl } },
    });

    // Verify connectivity before caching
    try {
      await rawIsolated.$queryRaw`SELECT 1`;
    } catch (err: any) {
      await rawIsolated.$disconnect().catch(() => {});
      const error: any = new Error(`DATABASE_CONNECTION_ERROR: Failed to connect to tenant database: ${err.message}`);
      error.status = 503;
      error.code = "DATABASE_CONNECTION_ERROR";
      throw error;
    }

    const extendedIsolated = createTenantIsolationExtension(rawIsolated) as any;

    this.poolCache.set(tenantId, {
      client: extendedIsolated,
      lastAccessedAt: Date.now(),
    });

    return { client: extendedIsolated, strategy: config.strategy, status: config.status };
  }

  /**
   * Evict the least recently used client
   */
  private async evictOldestClient(): Promise<void> {
    let oldestKey: string | null = null;
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
        await entry.client.$disconnect().catch(() => {});
      }
    }
  }

  /**
   * Disconnect and evict idle connections
   */
  private async evictIdleClients(): Promise<void> {
    const now = Date.now();
    for (const [id, entry] of this.poolCache.entries()) {
      if (now - entry.lastAccessedAt > this.idleTimeoutMs) {
        this.poolCache.delete(id);
        await entry.client.$disconnect().catch(() => {});
      }
    }
  }

  public async evictTenant(tenantId: string): Promise<boolean> {
    const entry = this.poolCache.get(tenantId);
    if (entry) {
      this.poolCache.delete(tenantId);
      await entry.client.$disconnect().catch(() => {});
      return true;
    }
    return false;
  }

  public getActiveCacheCount(): number {
    return this.poolCache.size;
  }

  public getSharedClient(): PrismaClient {
    return this.sharedClient;
  }

  /**
   * Graceful shutdown
   */
  public async shutdownAll(): Promise<void> {
    for (const [, entry] of this.poolCache.entries()) {
      await entry.client.$disconnect().catch(() => {});
    }
    this.poolCache.clear();
    await this.sharedClient.$disconnect().catch(() => {});
  }
}
