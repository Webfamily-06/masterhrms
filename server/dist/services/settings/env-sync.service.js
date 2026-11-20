"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSyncService = void 0;
exports.updateEnvFileSafely = updateEnvFileSafely;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const settings_service_1 = require("./settings.service");
/**
 * EnvSyncService
 *
 * Keeps runtime `process.env` and (in writable self-hosted / local environments)
 * `.env` files synchronized with Super Admin PLATFORM configuration for:
 * - Pusher (`pusher.*`)
 * - Firebase (`firebase.*`)
 * - SMTP / Email (`email.*`)
 *
 * Architecture Note:
 * 1. PostgreSQL (`Setting` + AES-256-GCM `SettingSecret`) is ALWAYS the primary
 *    authoritative runtime source of truth across cold starts and serverless instances.
 * 2. `process.env` is updated immediately in memory so legacy consumers reading
 *    `process.env.*` observe the updated values without restart.
 * 3. On writable filesystems (local / dedicated VPS), `.env` keys are updated
 *    cleanly in-place; on read-only serverless filesystems (e.g. Vercel), `EROFS` /
 *    `EACCES` errors are caught non-fatally without exposing any secret values.
 */
const PLATFORM_KEY_TO_ENV_MAP = {
    // Pusher
    "pusher.enabled": ["PUSHER_ENABLED", "VITE_PUSHER_ENABLED", "NEXT_PUBLIC_PUSHER_ENABLED"],
    "pusher.app_id": ["PUSHER_APP_ID", "VITE_PUSHER_APP_ID"],
    "pusher.key": ["PUSHER_KEY", "VITE_PUSHER_KEY", "NEXT_PUBLIC_PUSHER_KEY"],
    "pusher.secret": ["PUSHER_SECRET"],
    "pusher.cluster": ["PUSHER_CLUSTER", "VITE_PUSHER_CLUSTER", "NEXT_PUBLIC_PUSHER_CLUSTER"],
    // Firebase
    "firebase.enabled": ["FIREBASE_ENABLED", "VITE_FIREBASE_ENABLED", "NEXT_PUBLIC_FIREBASE_ENABLED"],
    "firebase.api_key": ["FIREBASE_API_KEY", "VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY"],
    "firebase.auth_domain": ["FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
    "firebase.project_id": ["FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
    "firebase.storage_bucket": ["FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
    "firebase.messaging_sender_id": ["FIREBASE_MESSAGING_SENDER_ID", "VITE_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
    "firebase.app_id": ["FIREBASE_APP_ID", "VITE_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"],
    "firebase.measurement_id": ["FIREBASE_MEASUREMENT_ID", "VITE_FIREBASE_MEASUREMENT_ID", "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"],
    "firebase.vapid_key": ["FIREBASE_VAPID_KEY", "VITE_FIREBASE_VAPID_KEY", "NEXT_PUBLIC_FIREBASE_VAPID_KEY"],
    "firebase.service_account_json": ["FIREBASE_SERVICE_ACCOUNT_JSON"],
    // SMTP / Email
    "email.smtp_host": ["SMTP_HOST"],
    "email.smtp_port": ["SMTP_PORT"],
    "email.smtp_user": ["SMTP_USER"],
    "email.smtp_password": ["SMTP_PASS", "SMTP_PASSWORD"],
    "email.smtp_encryption": ["SMTP_ENCRYPTION"],
    "email.from_name": ["SMTP_FROM_NAME", "EMAIL_FROM_NAME"],
    "email.from_email": ["SMTP_FROM", "EMAIL_FROM"],
    "email.reply_to": ["SMTP_REPLY_TO"],
};
function formatEnvValue(raw) {
    // Escape newlines and wrap in double quotes if value contains whitespace, #, quotes, or JSON braces
    if (/[\s#"'{}=]/.test(raw) || raw.includes("\n")) {
        const escaped = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
        return `"${escaped}"`;
    }
    return raw;
}
function updateEnvFileSafely(filePath, updates, options) {
    try {
        if (!fs_1.default.existsSync(filePath))
            return false;
        // Skip file mutation during automated unit test runs unless explicitly opted in
        if (process.env.NODE_ENV === "test" && process.env.ALLOW_TEST_ENV_FILE_WRITE !== "true" && !options?.forceWriteInTest) {
            return false;
        }
        const original = fs_1.default.readFileSync(filePath, "utf8");
        const lines = original.split(/\r?\n/);
        const applied = new Set();
        const updatedLines = lines.map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                return line;
            const eqIdx = line.indexOf("=");
            if (eqIdx <= 0)
                return line;
            const envName = line.slice(0, eqIdx).trim();
            if (Object.prototype.hasOwnProperty.call(updates, envName)) {
                applied.add(envName);
                return `${envName}=${formatEnvValue(updates[envName])}`;
            }
            return line;
        });
        const missingKeys = Object.keys(updates).filter((k) => !applied.has(k));
        if (missingKeys.length > 0) {
            if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1].trim() !== "") {
                updatedLines.push("");
            }
            for (const envName of missingKeys) {
                updatedLines.push(`${envName}=${formatEnvValue(updates[envName])}`);
            }
        }
        fs_1.default.writeFileSync(filePath, updatedLines.join("\n"), "utf8");
        return true;
    }
    catch {
        // Non-fatal in read-only / serverless deployments (e.g. Vercel Lambda)
        return false;
    }
}
class EnvSyncService {
    /**
     * Synchronizes a PLATFORM settings group (`pusher`, `firebase`, `email`) into
     * in-memory `process.env` and local writable `.env` files if present.
     */
    static async syncPlatformGroup(group) {
        const memoryUpdatedKeys = [];
        const filesUpdated = [];
        try {
            const resolved = await settings_service_1.SettingsService.getGroup("PLATFORM", null, group, {
                decryptSecrets: true,
            });
            const values = resolved?.values || {};
            const sources = resolved?.sources || {};
            const envUpdates = {};
            for (const [settingKey, envVarNames] of Object.entries(PLATFORM_KEY_TO_ENV_MAP)) {
                if (!settingKey.startsWith(`${group}.`))
                    continue;
                // Only overwrite env when explicitly persisted in PLATFORM scope
                if (sources[settingKey] !== "PLATFORM")
                    continue;
                const val = values[settingKey];
                if (val === undefined || val === null)
                    continue;
                if (typeof val === "string" && val.includes("••••"))
                    continue;
                const serialized = typeof val === "boolean" || typeof val === "number" ? String(val) : String(val);
                for (const envName of envVarNames) {
                    process.env[envName] = serialized;
                    envUpdates[envName] = serialized;
                    memoryUpdatedKeys.push(envName);
                }
            }
            if (Object.keys(envUpdates).length > 0 && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
                const candidatePaths = Array.from(new Set([
                    path_1.default.resolve(process.cwd(), ".env"),
                    path_1.default.resolve(process.cwd(), "server", ".env"),
                    path_1.default.resolve(__dirname, "..", "..", "..", ".env"),
                    path_1.default.resolve(__dirname, "..", "..", "..", "..", ".env"),
                ]));
                for (const candidate of candidatePaths) {
                    if (updateEnvFileSafely(candidate, envUpdates)) {
                        filesUpdated.push(path_1.default.basename(candidate));
                    }
                }
            }
        }
        catch {
            // Never throw or leak secrets on sync failure
        }
        return { memoryUpdatedKeys, filesUpdated };
    }
}
exports.EnvSyncService = EnvSyncService;
