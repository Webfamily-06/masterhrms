"use strict";
/**
 * MASTERHRMS — S-Track Step S2: Settings Hot-Update Lifecycle Service
 *
 * Implements a unified, transactional lifecycle for settings modifications:
 * 1. Pre-validation of proposed settings against SETTINGS_REGISTRY.
 * 2. Atomic persistence with AES-256-GCM authenticated secret encryption.
 * 3. Cache invalidation across SettingsService and all runtime factories.
 * 4. Hot re-instantiation / client refresh without server restarts.
 * 5. Safe Socket.io metadata broadcast (platform:admin vs tenant:${tenantId}).
 * 6. Fail-closed rollback: invalid payloads never corrupt running factories.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeLifecycleService = void 0;
const settings_service_1 = require("./settings.service");
const settings_registry_1 = require("./settings-registry");
const mailer_factory_1 = require("../factories/mailer.factory");
const oauth_factory_1 = require("../factories/oauth.factory");
const storage_factory_1 = require("../factories/storage.factory");
const sms_factory_1 = require("../factories/sms.factory");
const realtime_factory_1 = require("../factories/realtime.factory");
const maintenance_1 = require("../../middleware/maintenance");
class RuntimeLifecycleService {
    /**
     * Pre-validates a proposed settings payload against the schema registry
     */
    static validatePayload(scope, group, payload) {
        const definitions = (0, settings_registry_1.getGroupDefinitions)(group);
        if (definitions.length === 0) {
            return { valid: false, errors: [`Unknown or unregistered settings group: '${group}'`] };
        }
        const defMap = new Map(definitions.map((d) => [d.key, d]));
        const errors = [];
        for (const [key, val] of Object.entries(payload)) {
            if (key.startsWith("_"))
                continue;
            const def = defMap.get(key);
            if (!def) {
                errors.push(`Invalid setting key '${key}' for group '${group}'`);
                continue;
            }
            if (!def.scopes.includes(scope)) {
                errors.push(`Setting '${key}' cannot be configured in '${scope}' scope`);
                continue;
            }
            const check = (0, settings_registry_1.validateSettingValue)(key, val, scope);
            if (!check.valid) {
                errors.push(`Validation failed for '${key}': ${check.error}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Executes the full transactional settings update and factory hot-reload lifecycle
     */
    static async updateSettingsGroup(scope, scopeId, group, payload, context = {}) {
        // 1. Pre-validation phase (fail-closed before mutating state)
        const validation = this.validatePayload(scope, group, payload);
        if (!validation.valid) {
            const err = new Error(`Settings Validation Failed: ${validation.errors.join("; ")}`);
            err.status = 400;
            err.validationErrors = validation.errors;
            throw err;
        }
        // 2. Atomic persistence phase
        const saveResult = await settings_service_1.SettingsService.setGroup(scope, scopeId, group, payload, context);
        const changedKeys = Object.keys(payload).filter((k) => !k.startsWith("_"));
        const normScopeId = scope === "PLATFORM" ? null : (scopeId || null);
        // 3. Cache Invalidation phase
        settings_service_1.SettingsService.invalidateCache(scope, normScopeId, group);
        if (scope === "PLATFORM") {
            settings_service_1.SettingsService.clearCache();
        }
        // 4. Hot re-instantiation / Factory refresh phase
        const hotReloaded = [];
        if (group === "email") {
            await mailer_factory_1.MailerFactory.invalidate(scope, normScopeId);
            hotReloaded.push("MailerFactory");
        }
        if (group === "oauth" && scope === "PLATFORM") {
            oauth_factory_1.OAuthFactory.invalidate();
            hotReloaded.push("OAuthFactory");
        }
        if (group === "storage") {
            storage_factory_1.StorageFactory.invalidate(scope, normScopeId);
            hotReloaded.push("StorageFactory");
        }
        if (group === "messaging" || group === "sms") {
            sms_factory_1.SmsFactory.invalidate(normScopeId || undefined);
            hotReloaded.push("SmsFactory");
        }
        if (group === "system" || changedKeys.some((k) => k.startsWith("system."))) {
            (0, maintenance_1.invalidateMaintenanceCache)();
            hotReloaded.push("MaintenanceMiddleware");
        }
        // 5. Realtime Socket.io broadcast phase (safe metadata only)
        const { targetRoom } = realtime_factory_1.RealtimeFactory.broadcastSettingsUpdate(scope, normScopeId, group, changedKeys, saveResult.version);
        return {
            success: true,
            scope,
            scopeId: normScopeId,
            group,
            version: saveResult.version,
            changedKeys,
            hotReloadedFactories: hotReloaded,
            broadcastTarget: targetRoom,
        };
    }
    /**
     * Explains multi-process limitations for architecture documentation
     */
    static getProcessSyncInfo() {
        return {
            mode: "single-process-in-memory",
            clusterSynchronized: false,
            description: "Settings cache invalidation and factory hot-reloading operate within the local Node.js process memory. In multi-instance / clustered deployments, a Redis Pub/Sub or message bus is required to propagate invalidation events across separate OS processes.",
        };
    }
}
exports.RuntimeLifecycleService = RuntimeLifecycleService;
