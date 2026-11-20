"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativePushDispatcher = exports.FcmHttpV1Client = void 0;
const fs_1 = __importDefault(require("fs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const native_push_store_1 = require("./native-push.store");
/**
 * Enterprise Google OAuth 2.0 & Firebase Cloud Messaging (FCM) HTTP v1 Client.
 * Replaces the retired legacy FCM HTTP API (https://fcm.googleapis.com/fcm/send)
 * with the standard FCM HTTP v1 API (https://fcm.googleapis.com/v1/projects/{project_id}/messages:send).
 */
class FcmHttpV1Client {
    static cachedAccessToken = null;
    static tokenExpiresAt = 0;
    /**
     * Loads Firebase service account credentials from supported server-side configurations:
     * 1. FIREBASE_SERVICE_ACCOUNT (JSON string or file path)
     * 2. GOOGLE_APPLICATION_CREDENTIALS (file path)
     * 3. Individual environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
     */
    static loadCredentials() {
        // 1. FIREBASE_SERVICE_ACCOUNT (raw JSON string or file path)
        const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (rawServiceAccount) {
            try {
                const trimmed = rawServiceAccount.trim();
                if (trimmed.startsWith("{")) {
                    const parsed = JSON.parse(trimmed);
                    if (parsed.client_email && parsed.private_key) {
                        return {
                            projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || "masterhrms-ab50b",
                            clientEmail: parsed.client_email,
                            privateKey: parsed.private_key.replace(/\\n/g, "\n"),
                        };
                    }
                }
                else if (fs_1.default.existsSync(trimmed)) {
                    const fileContent = fs_1.default.readFileSync(trimmed, "utf8");
                    const parsed = JSON.parse(fileContent);
                    if (parsed.client_email && parsed.private_key) {
                        return {
                            projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || "masterhrms-ab50b",
                            clientEmail: parsed.client_email,
                            privateKey: parsed.private_key.replace(/\\n/g, "\n"),
                        };
                    }
                }
            }
            catch (err) {
                console.warn("[FcmHttpV1Client] Failed to parse FIREBASE_SERVICE_ACCOUNT:", err?.message || err);
            }
        }
        // 2. GOOGLE_APPLICATION_CREDENTIALS path
        const googleCredsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (googleCredsPath && fs_1.default.existsSync(googleCredsPath.trim())) {
            try {
                const fileContent = fs_1.default.readFileSync(googleCredsPath.trim(), "utf8");
                const parsed = JSON.parse(fileContent);
                if (parsed.client_email && parsed.private_key) {
                    return {
                        projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || "masterhrms-ab50b",
                        clientEmail: parsed.client_email,
                        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
                    };
                }
            }
            catch (err) {
                console.warn("[FcmHttpV1Client] Failed to parse GOOGLE_APPLICATION_CREDENTIALS:", err?.message || err);
            }
        }
        // 3. Individual environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || "masterhrms-ab50b";
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
        if (clientEmail && privateKey) {
            privateKey = privateKey.replace(/\\n/g, "\n");
            return {
                projectId,
                clientEmail,
                privateKey,
            };
        }
        return null;
    }
    /**
     * Acquires a Google OAuth 2.0 access token for the Firebase Cloud Messaging scope.
     * Utilizes RFC 7523 JWT Bearer profile and caches token until 5 minutes before expiry.
     */
    static async getOAuth2AccessToken(credentials) {
        const now = Math.floor(Date.now() / 1000);
        // Return active cached token if valid (5 minute grace period)
        if (this.cachedAccessToken && this.tokenExpiresAt > now + 300) {
            return this.cachedAccessToken;
        }
        const payload = {
            iss: credentials.clientEmail,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
        };
        let signedJwt;
        try {
            signedJwt = jsonwebtoken_1.default.sign(payload, credentials.privateKey, {
                algorithm: "RS256",
            });
        }
        catch (signErr) {
            throw new Error(`Failed to sign Google OAuth2 JWT assertion: ${signErr?.message || signErr}`);
        }
        const tokenUrl = "https://oauth2.googleapis.com/token";
        const bodyParams = new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: signedJwt,
        });
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams.toString(),
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google OAuth2 token exchange rejected [HTTP ${response.status}]: ${errText}`);
        }
        const tokenData = await response.json();
        if (!tokenData?.access_token) {
            throw new Error("Google OAuth2 response did not contain an access_token");
        }
        this.cachedAccessToken = tokenData.access_token;
        this.tokenExpiresAt = now + (tokenData.expires_in || 3600);
        return this.cachedAccessToken;
    }
    /**
     * Resets token cache for testing or key rotation.
     */
    static clearCache() {
        this.cachedAccessToken = null;
        this.tokenExpiresAt = 0;
    }
}
exports.FcmHttpV1Client = FcmHttpV1Client;
class NativePushDispatcher {
    /**
     * Dispatches push notifications to a collection of native device tokens.
     * Routes tokens by type:
     * - 'expo' -> Expo Push Service (https://exp.host/--/api/v2/push/send)
     * - 'fcm'  -> Firebase Cloud Messaging HTTP v1 API (https://fcm.googleapis.com/v1/projects/{projectId}/messages:send)
     */
    static async dispatch(tokens, payload) {
        if (!tokens || tokens.length === 0) {
            return { sent: 0, failed: 0, details: [] };
        }
        const expoTokens = tokens.filter((t) => t.tokenType === "expo");
        const fcmTokens = tokens.filter((t) => t.tokenType === "fcm");
        const otherTokens = tokens.filter((t) => t.tokenType !== "expo" && t.tokenType !== "fcm");
        const details = [];
        let totalSent = 0;
        let totalFailed = 0;
        // 1. Dispatch Expo tokens
        if (expoTokens.length > 0) {
            const expoRes = await this.dispatchExpoTokens(expoTokens, payload);
            totalSent += expoRes.sent;
            totalFailed += expoRes.failed;
            details.push(...expoRes.details);
        }
        // 2. Dispatch native FCM tokens via FCM HTTP v1
        if (fcmTokens.length > 0) {
            const fcmRes = await this.dispatchFcmTokens(fcmTokens, payload);
            totalSent += fcmRes.sent;
            totalFailed += fcmRes.failed;
            details.push(...fcmRes.details);
        }
        // 3. Fallback for generic/apns tokens without direct APNs cert (route via Expo if compatible)
        for (const t of otherTokens) {
            if (t.token.startsWith("ExponentPushToken") || t.token.startsWith("ExpoPushToken")) {
                const res = await this.dispatchExpoTokens([t], payload);
                totalSent += res.sent;
                totalFailed += res.failed;
                details.push(...res.details);
            }
            else {
                details.push({
                    token: t.token,
                    tokenType: t.tokenType,
                    success: false,
                    error: `Direct ${t.tokenType.toUpperCase()} delivery requires dedicated platform provider. Use Expo Push Token format.`,
                });
                totalFailed++;
            }
        }
        return { sent: totalSent, failed: totalFailed, details };
    }
    /**
     * Dispatches to Expo Push Notification Service
     */
    static async dispatchExpoTokens(tokens, payload) {
        const details = [];
        let sent = 0;
        let failed = 0;
        // Expo push accepts arrays of messages up to 100 per request
        const messages = tokens.map((t) => ({
            to: t.token,
            title: payload.title || "MasterHRMS Alert",
            body: payload.body || "",
            sound: payload.sound || "default",
            priority: "high",
            channelId: payload.channelId || "default",
            badge: payload.badge,
            data: {
                id: payload.id,
                notificationId: payload.id,
                tenantId: payload.tenantId,
                type: payload.type || payload.module || "SYSTEM",
                module: payload.module || "SYSTEM",
                linkTo: payload.linkTo || payload.actionUrl || "/",
                actionUrl: payload.actionUrl || payload.linkTo || "/",
                ...(payload.metadata || {}),
            },
        }));
        try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "Accept-Encoding": "gzip, deflate",
                },
                body: JSON.stringify(messages),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`[NativePushDispatcher] Expo push request failed with HTTP ${response.status}:`, errorText);
                for (const t of tokens) {
                    details.push({
                        token: t.token,
                        tokenType: "expo",
                        success: false,
                        error: `HTTP ${response.status}: ${errorText}`,
                    });
                    failed++;
                }
                return { sent, failed, details };
            }
            const resJson = await response.json();
            const tickets = Array.isArray(resJson?.data) ? resJson.data : [resJson?.data];
            for (let i = 0; i < tokens.length; i++) {
                const t = tokens[i];
                const ticket = tickets[i];
                if (ticket?.status === "ok") {
                    sent++;
                    details.push({
                        token: t.token,
                        tokenType: "expo",
                        success: true,
                        ticketId: ticket.id,
                    });
                }
                else {
                    failed++;
                    const errMessage = ticket?.message || ticket?.details?.error || "Unknown Expo error";
                    details.push({
                        token: t.token,
                        tokenType: "expo",
                        success: false,
                        error: errMessage,
                    });
                    // Automatic cleanup of uninstalled / unregistered devices
                    if (ticket?.details?.error === "DeviceNotRegistered") {
                        console.log(`[NativePushDispatcher] Unregistering expired device token: ${t.token.slice(0, 20)}...`);
                        void native_push_store_1.NativePushStore.markExpired(t.userId, t.token);
                    }
                }
            }
        }
        catch (err) {
            console.warn("[NativePushDispatcher] Network error contacting Expo push service:", err?.message || err);
            for (const t of tokens) {
                details.push({
                    token: t.token,
                    tokenType: "expo",
                    success: false,
                    error: err?.message || "Network error",
                });
                failed++;
            }
        }
        return { sent, failed, details };
    }
    /**
     * Dispatches directly to Firebase Cloud Messaging (FCM) using the official HTTP v1 API.
     * Endpoint: https://fcm.googleapis.com/v1/projects/{projectId}/messages:send
     */
    static async dispatchFcmTokens(tokens, payload) {
        const details = [];
        let sent = 0;
        let failed = 0;
        const credentials = FcmHttpV1Client.loadCredentials();
        if (!credentials) {
            console.warn("[NativePushDispatcher] FCM HTTP v1 credentials not configured (FIREBASE_SERVICE_ACCOUNT or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY required). Direct FCM dispatch skipped.");
            for (const t of tokens) {
                details.push({
                    token: t.token,
                    tokenType: "fcm",
                    success: false,
                    error: "FCM HTTP v1 service account credentials not configured on server.",
                });
                failed++;
            }
            return { sent, failed, details };
        }
        let accessToken;
        try {
            accessToken = await FcmHttpV1Client.getOAuth2AccessToken(credentials);
        }
        catch (authErr) {
            console.warn("[NativePushDispatcher] Failed to acquire Google OAuth2 access token for FCM v1:", authErr?.message || authErr);
            for (const t of tokens) {
                details.push({
                    token: t.token,
                    tokenType: "fcm",
                    success: false,
                    error: `Google OAuth2 authentication failed: ${authErr?.message || "Authentication error"}`,
                });
                failed++;
            }
            return { sent, failed, details };
        }
        const fcmV1Endpoint = `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`;
        // Flatten and stringify all data fields for strict FCM v1 schema compliance
        const stringData = {
            id: String(payload.id || ""),
            notificationId: String(payload.id || ""),
            tenantId: String(payload.tenantId || ""),
            title: String(payload.title || "MasterHRMS Alert"),
            body: String(payload.body || ""),
            type: String(payload.type || payload.module || "SYSTEM"),
            module: String(payload.module || "SYSTEM"),
            linkTo: String(payload.linkTo || payload.actionUrl || "/"),
            actionUrl: String(payload.actionUrl || payload.linkTo || "/"),
        };
        if (payload.metadata && typeof payload.metadata === "object") {
            for (const [k, v] of Object.entries(payload.metadata)) {
                stringData[k] = typeof v === "string" ? v : JSON.stringify(v);
            }
        }
        const isCall = payload.type === "CALL" || payload.module === "CALL" || payload.channelId === "calls";
        const channelId = isCall ? "calls" : payload.channelId || "default";
        for (const t of tokens) {
            let attempt = 0;
            const maxRetries = 2;
            let tokenDelivered = false;
            while (attempt <= maxRetries && !tokenDelivered) {
                attempt++;
                try {
                    const messageBody = {
                        message: {
                            token: t.token,
                            notification: {
                                title: payload.title || "MasterHRMS Alert",
                                body: payload.body || "",
                            },
                            android: {
                                priority: "HIGH",
                                notification: {
                                    title: payload.title || "MasterHRMS Alert",
                                    body: payload.body || "",
                                    sound: payload.sound || "default",
                                    channel_id: channelId,
                                    click_action: "OPEN_ACTIVITY",
                                    default_vibrate_timings: true,
                                    default_light_settings: true,
                                },
                            },
                            data: stringData,
                        },
                    };
                    const response = await fetch(fcmV1Endpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify(messageBody),
                    });
                    if (response.ok) {
                        const resJson = await response.json();
                        sent++;
                        tokenDelivered = true;
                        details.push({
                            token: t.token,
                            tokenType: "fcm",
                            success: true,
                            ticketId: resJson?.name || `msg_${Date.now()}`,
                        });
                        break;
                    }
                    // Handle Error response
                    const resText = await response.text();
                    let errJson = null;
                    try {
                        errJson = JSON.parse(resText);
                    }
                    catch { }
                    const fcmErrorCode = errJson?.error?.details?.[0]?.errorCode ||
                        errJson?.error?.status ||
                        `HTTP_${response.status}`;
                    const errMessage = errJson?.error?.message || resText || `HTTP ${response.status}`;
                    // Check if token is permanently unregistered or invalid
                    if (fcmErrorCode === "UNREGISTERED" ||
                        fcmErrorCode === "NOT_FOUND" ||
                        fcmErrorCode === "INVALID_ARGUMENT" ||
                        errMessage.includes("Requested entity was not found")) {
                        console.log(`[NativePushDispatcher] Unregistering expired/invalid FCM token for user ${t.userId}: ${t.token.slice(0, 20)}... (${fcmErrorCode})`);
                        void native_push_store_1.NativePushStore.markExpired(t.userId, t.token);
                        failed++;
                        details.push({
                            token: t.token,
                            tokenType: "fcm",
                            success: false,
                            error: `FCM v1 [${fcmErrorCode}]: ${errMessage}`,
                        });
                        tokenDelivered = true; // No retry for permanently invalid tokens
                        break;
                    }
                    // Retry on transient errors (429, 500, 503)
                    if ((response.status >= 500 || response.status === 429) && attempt <= maxRetries) {
                        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
                        continue;
                    }
                    failed++;
                    details.push({
                        token: t.token,
                        tokenType: "fcm",
                        success: false,
                        error: `FCM v1 [${fcmErrorCode}]: ${errMessage}`,
                    });
                    tokenDelivered = true;
                    break;
                }
                catch (netErr) {
                    if (attempt <= maxRetries) {
                        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
                        continue;
                    }
                    failed++;
                    details.push({
                        token: t.token,
                        tokenType: "fcm",
                        success: false,
                        error: netErr?.message || "FCM v1 network dispatch error",
                    });
                    tokenDelivered = true;
                    break;
                }
            }
        }
        return { sent, failed, details };
    }
}
exports.NativePushDispatcher = NativePushDispatcher;
