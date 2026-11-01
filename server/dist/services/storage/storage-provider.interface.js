"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStorageKey = buildStorageKey;
/**
 * Generates the canonical, unguessable storage key.
 * Original filenames live in the database ONLY, never in the storage key.
 */
function buildStorageKey(tenantId, fileId, versionNo) {
    const versionTag = `v${versionNo}`;
    if (tenantId) {
        return `tenant/${tenantId}/${fileId}/${versionTag}`;
    }
    return `platform/${fileId}/${versionTag}`;
}
