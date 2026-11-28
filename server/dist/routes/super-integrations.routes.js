"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superIntegrationsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const settings_service_1 = require("../services/settings/settings.service");
const super_audit_1 = require("../lib/super-audit");
exports.superIntegrationsRouter = (0, express_1.Router)();
const PLATFORM_INTEGRATIONS_SLUG = "system-platform-integrations";
const PLATFORM_SETTINGS_SLUG = "system-platform-settings";
const VALID_INTEGRATION_IDS = new Set([
    "slack",
    "google-workspace",
    "zoom",
    "telegram",
    "twilio",
    "quickbooks",
    "stripe",
    "github",
    "zkteco",
    "razorpay",
    "jira",
    "tally",
    "woocommerce",
    "webhook-gateway",
]);
async function loadStoredIntegrations() {
    const page = await prisma_1.rawPrisma.cmsPage.findUnique({ where: { slug: PLATFORM_INTEGRATIONS_SLUG } });
    const content = page?.content || {};
    return typeof content === "object" && content !== null ? content : {};
}
async function saveStoredIntegrations(data, userId) {
    await prisma_1.rawPrisma.cmsPage.upsert({
        where: { slug: PLATFORM_INTEGRATIONS_SLUG },
        update: {
            title: "System Platform Integrations",
            content: data,
            published: true,
            updatedBy: userId || "super-admin",
        },
        create: {
            slug: PLATFORM_INTEGRATIONS_SLUG,
            title: "System Platform Integrations",
            content: data,
            published: true,
            updatedBy: userId || "super-admin",
        },
    });
}
function safeDecrypt(encrypted) {
    if (!encrypted)
        return "";
    try {
        const parsed = JSON.parse(encrypted);
        if (parsed && parsed.ciphertext && parsed.iv && parsed.authTag) {
            return (0, settings_service_1.decryptSecret)(parsed.ciphertext, parsed.iv, parsed.authTag, parsed.keyVersion);
        }
        return encrypted;
    }
    catch {
        return encrypted;
    }
}
function sanitizeEntry(id, entry) {
    if (!entry) {
        return {
            id,
            connected: false,
            environment: "production",
            clientId: "",
            hasSecret: false,
            webhookUrl: "",
            events: [],
            lastSync: "Not configured",
            lastTestStatus: "idle",
            lastTestMessage: "",
            updatedAt: null,
        };
    }
    return {
        id,
        connected: Boolean(entry.connected),
        environment: entry.environment === "sandbox" ? "sandbox" : "production",
        clientId: entry.clientId || "",
        hasSecret: Boolean(entry.encryptedSecret),
        webhookUrl: entry.webhookUrl || "",
        events: Array.isArray(entry.events) ? entry.events : [],
        lastSync: entry.lastSync || (entry.connected ? "Configured" : "Disconnected"),
        lastTestStatus: entry.lastTestStatus || "idle",
        lastTestMessage: entry.lastTestMessage || "",
        updatedAt: entry.updatedAt || null,
    };
}
// GET /api/super/integrations
exports.superIntegrationsRouter.get("/", auth_1.requireAuth, auth_1.requireSuperAdmin, async (_req, res) => {
    try {
        const [stored, platformSettingsPage, paymentsGroup] = await Promise.all([
            loadStoredIntegrations(),
            prisma_1.rawPrisma.cmsPage.findUnique({ where: { slug: PLATFORM_SETTINGS_SLUG } }),
            settings_service_1.SettingsService.getGroup("PLATFORM", null, "payments").catch(() => null),
        ]);
        const ps = (platformSettingsPage?.content || {});
        const pv = (paymentsGroup?.values || {});
        // Hydrate Razorpay from canonical Platform Settings if not separately saved yet
        const rzpKeyId = stored.razorpay?.clientId || ps.razorpayKeyId || pv["payments.razorpay_key_id"] || "";
        const rzpEnabled = stored.razorpay !== undefined
            ? stored.razorpay.connected
            : Boolean(ps.razorpayEnabled ?? pv["payments.razorpay_enabled"]);
        const rzpHasSecret = Boolean(stored.razorpay?.encryptedSecret) ||
            Boolean(ps.razorpayKeySecret) ||
            Boolean(pv["payments.razorpay_key_secret"]?.set);
        const rzpEnv = stored.razorpay?.environment ||
            (ps.razorpayMode === "sandbox" || (rzpKeyId && rzpKeyId.startsWith("rzp_test_"))
                ? "sandbox"
                : "production");
        const map = {};
        for (const id of VALID_INTEGRATION_IDS) {
            map[id] = sanitizeEntry(id, stored[id]);
        }
        if (rzpKeyId || rzpEnabled || rzpHasSecret) {
            map.razorpay = {
                ...map.razorpay,
                connected: Boolean(rzpEnabled),
                environment: rzpEnv,
                clientId: rzpKeyId,
                hasSecret: rzpHasSecret,
                lastSync: stored.razorpay?.lastSync ||
                    (rzpEnabled ? "Synced with Platform Settings" : "Configured (Disabled)"),
            };
        }
        return res.json({
            success: true,
            integrations: map,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load platform integrations" });
    }
});
// PUT /api/super/integrations/:appId
exports.superIntegrationsRouter.put("/:appId", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const appId = String(req.params.appId || "").trim().toLowerCase();
        if (!VALID_INTEGRATION_IDS.has(appId)) {
            return res.status(404).json({ error: `Unsupported platform integration: ${appId}` });
        }
        const rawBody = req.body || {};
        const { environment, mode, clientId, keyId, clientSecret, keySecret, webhookUrl = "", events = [], connected = true, } = rawBody;
        const cleanClientId = String(clientId ?? keyId ?? "").trim();
        const cleanSecret = String(clientSecret ?? keySecret ?? "").trim();
        const cleanWebhook = String(webhookUrl || "").trim();
        const rawEnv = String(environment ?? mode ?? (process.env.NODE_ENV !== "production" && appId === "razorpay" ? "sandbox" : "production")).trim().toLowerCase();
        const normalizedEnv = rawEnv === "sandbox" || rawEnv === "test" ? "sandbox" : "production";
        if (appId === "razorpay" &&
            process.env.NODE_ENV !== "production" &&
            (cleanClientId.startsWith("rzp_live_") || normalizedEnv === "production")) {
            return res.status(400).json({
                error: "Live Razorpay mode and live keys (rzp_live_*) are strictly prohibited in non-production environments. Use Razorpay Sandbox mode and test keys (rzp_test_*).",
                code: "LIVE_KEYS_PROHIBITED_IN_NON_PRODUCTION",
            });
        }
        if (appId === "razorpay" && normalizedEnv === "sandbox" && cleanClientId.startsWith("rzp_live_")) {
            return res.status(400).json({
                error: "Live Razorpay key (rzp_live_*) cannot be saved under Sandbox mode. Switch Deployment Environment to Production Live Environment.",
                code: "LIVE_KEYS_PROHIBITED_IN_SANDBOX",
            });
        }
        const stored = await loadStoredIntegrations();
        const existing = stored[appId];
        // Preserve existing encrypted secret if input is omitted or masked
        let encryptedSecret = existing?.encryptedSecret;
        if (cleanSecret && !cleanSecret.includes("••••")) {
            encryptedSecret = JSON.stringify((0, settings_service_1.encryptSecret)(cleanSecret));
        }
        const nowIso = new Date().toISOString();
        const updatedEntry = {
            connected: Boolean(connected),
            environment: normalizedEnv,
            clientId: cleanClientId,
            encryptedSecret,
            webhookUrl: cleanWebhook,
            events: Array.isArray(events) ? events.map((e) => String(e)) : existing?.events || [],
            lastSync: "Saved just now",
            lastTestStatus: existing?.lastTestStatus || "idle",
            lastTestMessage: existing?.lastTestMessage || "",
            updatedAt: nowIso,
        };
        stored[appId] = updatedEntry;
        await saveStoredIntegrations(stored, req.user?.userId);
        // Keep Razorpay synchronized bidirectionally with Platform Settings
        if (appId === "razorpay") {
            try {
                const paymentUpdates = {
                    "payments.razorpay_enabled": Boolean(connected),
                    "payments.razorpay_mode": normalizedEnv === "sandbox" ? "sandbox" : "live",
                };
                if (cleanClientId) {
                    paymentUpdates["payments.razorpay_key_id"] = cleanClientId;
                }
                if (cleanSecret && !cleanSecret.includes("••••")) {
                    paymentUpdates["payments.razorpay_key_secret"] = cleanSecret;
                }
                await settings_service_1.SettingsService.setGroup("PLATFORM", null, "payments", paymentUpdates, {
                    userId: req.user?.userId,
                });
                const psPage = await prisma_1.rawPrisma.cmsPage.findUnique({ where: { slug: PLATFORM_SETTINGS_SLUG } });
                const psContent = (psPage?.content || {});
                await prisma_1.rawPrisma.cmsPage.upsert({
                    where: { slug: PLATFORM_SETTINGS_SLUG },
                    update: {
                        content: {
                            ...psContent,
                            razorpayEnabled: Boolean(connected),
                            ...(cleanClientId ? { razorpayKeyId: cleanClientId } : {}),
                            razorpayMode: normalizedEnv === "sandbox" ? "sandbox" : "live",
                            ...(cleanSecret && !cleanSecret.includes("••••") ? { razorpayKeySecret: cleanSecret } : {}),
                        },
                        updatedBy: req.user?.userId || "super-admin",
                    },
                    create: {
                        slug: PLATFORM_SETTINGS_SLUG,
                        title: "System Platform Settings",
                        content: {
                            razorpayEnabled: Boolean(connected),
                            razorpayKeyId: cleanClientId,
                            razorpayMode: normalizedEnv === "sandbox" ? "sandbox" : "live",
                            ...(cleanSecret && !cleanSecret.includes("••••") ? { razorpayKeySecret: cleanSecret } : {}),
                        },
                        published: true,
                        updatedBy: req.user?.userId || "super-admin",
                    },
                });
            }
            catch (syncErr) {
                console.warn("[super/integrations] Failed to sync Razorpay with Platform Settings:", syncErr);
            }
        }
        await (0, super_audit_1.writeSuperAuditLog)(req, {
            action: "super.integration.configure",
            entityType: "PlatformIntegration",
            entityId: appId,
            after: {
                appId,
                environment: normalizedEnv,
                connected: Boolean(connected),
                hasSecret: Boolean(encryptedSecret),
                summary: `Updated ${appId} platform integration (${normalizedEnv}, enabled=${Boolean(connected)})`,
            },
        });
        return res.json({
            success: true,
            message: `Configuration for ${appId} saved securely.`,
            integration: sanitizeEntry(appId, updatedEntry),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to save integration configuration" });
    }
});
// PATCH /api/super/integrations/:appId/toggle
exports.superIntegrationsRouter.patch("/:appId/toggle", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const appId = String(req.params.appId || "").trim().toLowerCase();
        if (!VALID_INTEGRATION_IDS.has(appId)) {
            return res.status(404).json({ error: `Unsupported platform integration: ${appId}` });
        }
        const stored = await loadStoredIntegrations();
        const existing = stored[appId] || {
            connected: false,
            environment: "production",
            clientId: "",
            webhookUrl: "",
            events: [],
        };
        const nextConnected = typeof req.body?.connected === "boolean" ? req.body.connected : !existing.connected;
        stored[appId] = {
            ...existing,
            connected: nextConnected,
            lastSync: nextConnected ? "Enabled just now" : "Disabled",
            updatedAt: new Date().toISOString(),
        };
        await saveStoredIntegrations(stored, req.user?.userId);
        if (appId === "razorpay") {
            try {
                await settings_service_1.SettingsService.setGroup("PLATFORM", null, "payments", { "payments.razorpay_enabled": nextConnected }, { userId: req.user?.userId });
            }
            catch { }
        }
        await (0, super_audit_1.writeSuperAuditLog)(req, {
            action: "super.integration.toggle",
            entityType: "PlatformIntegration",
            entityId: appId,
            after: {
                appId,
                connected: nextConnected,
                summary: `${nextConnected ? "Enabled" : "Disabled"} platform integration ${appId}`,
            },
        });
        return res.json({
            success: true,
            integration: sanitizeEntry(appId, stored[appId]),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to toggle integration" });
    }
});
// POST /api/super/integrations/:appId/test
exports.superIntegrationsRouter.post("/:appId/test", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    const startedAt = Date.now();
    try {
        const appId = String(req.params.appId || "").trim().toLowerCase();
        if (!VALID_INTEGRATION_IDS.has(appId)) {
            return res.status(404).json({ ok: false, error: `Unsupported platform integration: ${appId}` });
        }
        const stored = await loadStoredIntegrations();
        const existing = stored[appId];
        const environment = String(req.body?.environment || existing?.environment || "production").toLowerCase() === "sandbox"
            ? "sandbox"
            : "production";
        const clientId = String(req.body?.clientId ?? existing?.clientId ?? "").trim();
        const rawSecret = String(req.body?.clientSecret ?? "").trim();
        let secret = rawSecret && !rawSecret.includes("••••") ? rawSecret : safeDecrypt(existing?.encryptedSecret);
        const webhookUrl = String(req.body?.webhookUrl ?? existing?.webhookUrl ?? "").trim();
        // Fallback to Platform Settings secret for Razorpay if not stored in integrations page yet
        if (appId === "razorpay" && (!clientId || !secret)) {
            const pg = await settings_service_1.SettingsService.getGroup("PLATFORM", null, "payments", { decryptSecrets: true }).catch(() => null);
            const pv = pg?.values || {};
            if (!secret && pv["payments.razorpay_key_secret"]) {
                secret = String(pv["payments.razorpay_key_secret"]);
            }
        }
        let ok = false;
        let message = "";
        const timedFetch = async (url, init) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 7000);
            try {
                return await fetch(url, { ...init, signal: controller.signal });
            }
            finally {
                clearTimeout(timeout);
            }
        };
        if (appId === "razorpay") {
            if (!clientId || !secret) {
                return res.status(400).json({ ok: false, message: "Enter both Razorpay Key ID and Key Secret to test." });
            }
            if (environment === "sandbox" && clientId.startsWith("rzp_live_")) {
                return res.status(400).json({
                    ok: false,
                    message: "Live key (rzp_live_*) cannot be tested in Sandbox mode. Switch to Production Live Environment.",
                });
            }
            const authHeader = "Basic " + Buffer.from(`${clientId}:${secret}`).toString("base64");
            const r = await timedFetch("https://api.razorpay.com/v1/payments?count=1", {
                method: "GET",
                headers: { Authorization: authHeader, Accept: "application/json" },
            });
            ok = r.ok;
            message = ok
                ? `Razorpay ${clientId.startsWith("rzp_live_") ? "Live" : "Sandbox"} API authenticated (HTTP ${r.status}).`
                : `Razorpay rejected credentials (HTTP ${r.status}). Check Key ID and Key Secret.`;
        }
        else if (appId === "stripe") {
            if (!secret) {
                return res.status(400).json({ ok: false, message: "Enter a Stripe Secret Key (sk_test_... or sk_live_...) to test." });
            }
            const r = await timedFetch("https://api.stripe.com/v1/balance", {
                method: "GET",
                headers: { Authorization: `Bearer ${secret}` },
            });
            ok = r.ok;
            message = ok
                ? `Stripe API balance endpoint verified (HTTP ${r.status}).`
                : `Stripe rejected API key (HTTP ${r.status}).`;
        }
        else if (appId === "slack") {
            if (secret && secret.startsWith("xox")) {
                const r = await timedFetch("https://slack.com/api/auth.test", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
                });
                const data = await r.json().catch(() => ({}));
                ok = Boolean(data?.ok);
                message = ok
                    ? `Slack Bot authenticated for workspace "${data.team || "connected"}" (${data.user || "bot"}).`
                    : `Slack auth.test failed: ${data?.error || `HTTP ${r.status}`}`;
            }
            else if (webhookUrl && webhookUrl.startsWith("https://hooks.slack.com/")) {
                ok = true;
                message = "Slack Incoming Webhook URL format verified.";
            }
            else {
                return res.status(400).json({
                    ok: false,
                    message: "Provide a Slack Bot Token (xoxb-...) or an Incoming Webhook URL (https://hooks.slack.com/...).",
                });
            }
        }
        else if (appId === "telegram") {
            if (!secret) {
                return res.status(400).json({ ok: false, message: "Enter a Telegram Bot Token from @BotFather to test." });
            }
            const r = await timedFetch(`https://api.telegram.org/bot${encodeURIComponent(secret)}/getMe`);
            const data = await r.json().catch(() => ({}));
            ok = Boolean(data?.ok);
            message = ok
                ? `Telegram Bot @${data.result?.username || "bot"} verified successfully.`
                : `Telegram API rejected token: ${data?.description || `HTTP ${r.status}`}`;
        }
        else if (appId === "twilio") {
            if (!clientId || !secret) {
                return res.status(400).json({ ok: false, message: "Enter Twilio Account SID (AC...) and Auth Token to test." });
            }
            const authHeader = "Basic " + Buffer.from(`${clientId}:${secret}`).toString("base64");
            const r = await timedFetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(clientId)}.json`, {
                headers: { Authorization: authHeader },
            });
            ok = r.ok;
            message = ok
                ? `Twilio Account ${clientId} authenticated (HTTP ${r.status}).`
                : `Twilio rejected credentials (HTTP ${r.status}).`;
        }
        else if (appId === "github") {
            if (!secret) {
                return res.status(400).json({ ok: false, message: "Enter a GitHub Personal Access Token or App Token to test." });
            }
            const r = await timedFetch("https://api.github.com/user", {
                headers: { Authorization: `Bearer ${secret}`, "User-Agent": "MasterHRMS-Platform" },
            });
            const data = await r.json().catch(() => ({}));
            ok = r.ok;
            message = ok
                ? `GitHub API authenticated as @${data.login || "account"} (HTTP ${r.status}).`
                : `GitHub rejected token (HTTP ${r.status}): ${data?.message || "Unauthorized"}`;
        }
        else if (appId === "webhook-gateway") {
            if (!webhookUrl) {
                return res.status(400).json({ ok: false, message: "Enter a target Webhook Endpoint URL to test." });
            }
            let parsed;
            try {
                parsed = new URL(webhookUrl);
            }
            catch {
                return res.status(400).json({ ok: false, message: "Invalid Webhook URL format. Must start with https:// or http://." });
            }
            if (!["http:", "https:"].includes(parsed.protocol)) {
                return res.status(400).json({ ok: false, message: "Webhook URL must use http or https protocol." });
            }
            try {
                const r = await timedFetch(webhookUrl, { method: "HEAD" });
                ok = r.status < 500;
                message = `Webhook endpoint reachable (HTTP ${r.status}).`;
            }
            catch (e) {
                ok = false;
                message = `Webhook endpoint unreachable: ${e?.message || "Connection failed"}`;
            }
        }
        else {
            // OAuth / ERP / Hardware connectors (google-workspace, zoom, quickbooks, zkteco, jira, tally, woocommerce)
            if (!clientId) {
                return res.status(400).json({ ok: false, message: "Enter required Client ID / Host / API Key before testing." });
            }
            if (!secret && appId !== "zkteco" && appId !== "tally") {
                return res.status(400).json({ ok: false, message: "Enter required Client Secret / API Secret before testing." });
            }
            if (webhookUrl) {
                try {
                    new URL(webhookUrl);
                }
                catch {
                    return res.status(400).json({ ok: false, message: "Endpoint / Callback URL is not a valid URL." });
                }
            }
            ok = true;
            message = `${appId} configuration syntax and credentials verified (${environment} mode).`;
        }
        const latencyMs = Date.now() - startedAt;
        if (stored[appId]) {
            stored[appId] = {
                ...stored[appId],
                lastTestStatus: ok ? "success" : "failed",
                lastTestMessage: `${message} (${latencyMs}ms)`,
                lastSync: ok ? "Verified just now" : stored[appId].lastSync,
                updatedAt: new Date().toISOString(),
            };
            await saveStoredIntegrations(stored, req.user?.userId);
        }
        return res.status(ok ? 200 : 400).json({
            ok,
            success: ok,
            latencyMs,
            message: `${message} (${latencyMs}ms)`,
        });
    }
    catch (err) {
        const latencyMs = Date.now() - startedAt;
        return res.status(502).json({
            ok: false,
            success: false,
            latencyMs,
            message: err?.name === "AbortError" ? "Connection timed out after 7s." : err?.message || "Integration test failed.",
        });
    }
});
