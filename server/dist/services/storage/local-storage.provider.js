"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const storage_provider_interface_1 = require("./storage-provider.interface");
const media_service_1 = require("../media/media.service");
const crypto_config_1 = require("../../lib/crypto-config");
class LocalStorageProvider {
    providerName = "local";
    baseDir;
    constructor(customBaseDir) {
        const root = customBaseDir || (0, media_service_1.getUploadsRoot)();
        this.baseDir = path_1.default.resolve(root, "files");
        if (!fs_1.default.existsSync(this.baseDir)) {
            try {
                fs_1.default.mkdirSync(this.baseDir, { recursive: true });
            }
            catch (err) {
                console.warn("[LocalStorageProvider] Failed to create baseDir:", err);
            }
        }
    }
    resolvePhysicalPath(storageKey) {
        const safeKey = storageKey.replace(/^[/\\]+/, "");
        const inFiles = path_1.default.resolve(this.baseDir, safeKey);
        if (fs_1.default.existsSync(inFiles))
            return inFiles;
        const inRoot = path_1.default.resolve((0, media_service_1.getUploadsRoot)(), safeKey);
        if (fs_1.default.existsSync(inRoot))
            return inRoot;
        return inFiles;
    }
    /**
     * Generates a local upload URL pointing to the server's local binary upload endpoint.
     */
    async initiateUpload(params) {
        const storageKey = (0, storage_provider_interface_1.buildStorageKey)(params.tenantId, params.fileId, params.versionNo);
        const expiresInSeconds = params.expiresInSeconds || 3600;
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
        const token = crypto_1.default
            .createHmac("sha256", (0, crypto_config_1.getFileSigningSecret)())
            .update(`${storageKey}:${expiresAt.getTime()}`)
            .digest("hex");
        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
        const uploadUrl = `${baseUrl}/api/v1/files/uploads/${params.fileId}/binary?token=${token}&exp=${expiresAt.getTime()}&key=${encodeURIComponent(storageKey)}`;
        return {
            uploadUrl,
            storageKey,
            token,
            expiresAt,
            provider: "local",
            headers: {
                "Content-Type": params.mimeType,
                "X-Storage-Key": storageKey,
            },
        };
    }
    /**
     * Verifies that the file exists on the local filesystem.
     */
    async verifyUpload(storageKey, expectedSize) {
        const filePath = this.resolvePhysicalPath(storageKey);
        if (!fs_1.default.existsSync(filePath)) {
            return { exists: false, sizeBytes: 0 };
        }
        const stat = fs_1.default.statSync(filePath);
        return {
            exists: true,
            sizeBytes: stat.size,
        };
    }
    /**
     * Generates a signed download URL using HMAC signature.
     */
    async getSignedDownloadUrl(storageKey, fileName, expiresInSeconds = 300) {
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        const sig = crypto_1.default
            .createHmac("sha256", (0, crypto_config_1.getFileSigningSecret)())
            .update(`download:${storageKey}:${expiresAt}`)
            .digest("hex");
        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
        const encodedKey = encodeURIComponent(storageKey);
        const downloadParam = fileName ? `&download=${encodeURIComponent(fileName)}` : "";
        return `${baseUrl}/api/v1/files/stream?key=${encodedKey}&exp=${expiresAt}&sig=${sig}${downloadParam}`;
    }
    /**
     * Generates a signed preview URL using HMAC signature.
     */
    async getSignedPreviewUrl(storageKey, _mimeType, expiresInSeconds = 300) {
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        const sig = crypto_1.default
            .createHmac("sha256", (0, crypto_config_1.getFileSigningSecret)())
            .update(`preview:${storageKey}:${expiresAt}`)
            .digest("hex");
        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
        const encodedKey = encodeURIComponent(storageKey);
        return `${baseUrl}/api/v1/files/stream?key=${encodedKey}&exp=${expiresAt}&sig=${sig}&inline=true`;
    }
    /**
     * Deletes the file from the local filesystem.
     */
    async deleteObject(storageKey) {
        try {
            const filePath = this.resolvePhysicalPath(storageKey);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            return true;
        }
        catch (err) {
            console.error("[LocalStorageProvider] deleteObject error:", err);
            return false;
        }
    }
    /**
     * Saves a buffer directly to local disk.
     */
    async uploadBuffer(storageKey, buffer, _mimeType) {
        const filePath = this.resolvePhysicalPath(storageKey);
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        fs_1.default.writeFileSync(filePath, buffer);
        return true;
    }
    /**
     * Helper to verify HMAC signature on stream requests.
     * Employs constant-time comparison to prevent timing attacks,
     * with backward-compatible legacy key support during secret rotation.
     */
    verifySignature(type, storageKey, exp, sig) {
        if (Date.now() > exp) {
            return false;
        }
        try {
            const activeSecret = (0, crypto_config_1.getFileSigningSecret)();
            const expected = crypto_1.default
                .createHmac("sha256", activeSecret)
                .update(`${type}:${storageKey}:${exp}`)
                .digest("hex");
            if ((0, crypto_config_1.timingSafeEqualHex)(sig, expected)) {
                return true;
            }
        }
        catch {
            // If active secret throws in production, proceed to legacy rotation secrets
        }
        // Legacy fallback verification for in-flight requests during key rotation
        for (const legacySecret of (0, crypto_config_1.getLegacyFileSigningSecrets)()) {
            const legExpected = crypto_1.default
                .createHmac("sha256", legacySecret)
                .update(`${type}:${storageKey}:${exp}`)
                .digest("hex");
            if ((0, crypto_config_1.timingSafeEqualHex)(sig, legExpected)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Verifies the upload authorization token generated during initiateUpload.
     */
    verifyUploadToken(storageKey, exp, token) {
        if (Date.now() > exp) {
            return false;
        }
        try {
            const activeSecret = (0, crypto_config_1.getFileSigningSecret)();
            const expected = crypto_1.default
                .createHmac("sha256", activeSecret)
                .update(`${storageKey}:${exp}`)
                .digest("hex");
            if ((0, crypto_config_1.timingSafeEqualHex)(token, expected)) {
                return true;
            }
        }
        catch {
            // If active secret throws in production, proceed to legacy rotation secrets
        }
        for (const legacySecret of (0, crypto_config_1.getLegacyFileSigningSecrets)()) {
            const legExpected = crypto_1.default
                .createHmac("sha256", legacySecret)
                .update(`${storageKey}:${exp}`)
                .digest("hex");
            if ((0, crypto_config_1.timingSafeEqualHex)(token, legExpected)) {
                return true;
            }
        }
        return false;
    }
    getPhysicalPath(storageKey) {
        return this.resolvePhysicalPath(storageKey);
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
