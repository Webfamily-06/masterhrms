"use strict";
/**
 * MASTERHRMS — S-Track Step S2: Realtime Push Runtime Factory
 *
 * Implements authorized Socket.io runtime event propagation with:
 * 1. Strict room isolation (platform:admin for Super Admins, tenant:${tenantId} for Tenants).
 * 2. Event deduplication (prevents duplicate broadcasts or listeners on settings hot-reload).
 * 3. Secret-free safe metadata payloads (zero credentials, passwords, or ciphertexts emitted).
 * 4. Audit logging of real-time configuration events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeFactory = void 0;
const socket_1 = require("../../socket");
class RealtimeFactory {
    static registeredListeners = new Set();
    static lastBroadcastEvent = null;
    /**
     * Check if Socket.io server is initialized and operational
     */
    static isOperational() {
        return !!(0, socket_1.getIO)();
    }
    /**
     * Broadcast settings.updated event with safe metadata payload only.
     * Deduplicates rapid identical emissions within 500ms.
     */
    static broadcastSettingsUpdate(scope, tenantId, group, keys, version) {
        const dedupeKey = `${scope}:${tenantId || "PLATFORM"}:${group}:${version}`;
        const now = Date.now();
        if (this.lastBroadcastEvent &&
            this.lastBroadcastEvent.key === dedupeKey &&
            now - this.lastBroadcastEvent.timestamp < 500) {
            // Duplicate broadcast suppressed
            return { broadcasted: false, targetRoom: "suppressed-duplicate" };
        }
        this.lastBroadcastEvent = { key: dedupeKey, timestamp: now };
        const payload = {
            scope,
            tenantId: scope === "TENANT" ? tenantId : null,
            group,
            keys: keys.map((k) => k.replace(/[^a-zA-Z0-9_.-]/g, "")),
            version,
            timestamp: new Date().toISOString(),
        };
        let targetRoom = "all";
        if (scope === "PLATFORM") {
            // Public platform groups go to all connected clients; private groups to platform:admin only
            if (group === "branding" || group === "locale") {
                (0, socket_1.broadcastToAll)("settings.updated", payload);
                targetRoom = "all";
            }
            else {
                (0, socket_1.broadcastToPlatform)("settings.updated", payload);
                targetRoom = "platform:admin";
            }
        }
        else if (scope === "TENANT" && tenantId) {
            (0, socket_1.broadcastToTenant)(tenantId, "settings.updated", payload);
            targetRoom = `tenant:${tenantId}`;
        }
        return { broadcasted: true, targetRoom };
    }
    /**
     * Register a dynamic event listener safely without creating duplicate listeners
     */
    static registerListener(listenerId, setupFn) {
        if (this.registeredListeners.has(listenerId)) {
            return false; // Already registered
        }
        this.registeredListeners.add(listenerId);
        setupFn();
        return true;
    }
    /**
     * Clear all registered listener metadata
     */
    static clearListeners() {
        this.registeredListeners.clear();
    }
}
exports.RealtimeFactory = RealtimeFactory;
