"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomingCallPushService = void 0;
const vapid_service_1 = require("./vapid.service");
const push_subscription_store_1 = require("./push-subscription.store");
class IncomingCallPushService {
    /**
     * Dispatches high-urgency Web Push notifications to all active device subscriptions
     * of the recipient for an incoming call.
     */
    static async sendIncomingCallPush(session) {
        const { callId, tenantId, callerId, callerName, callerAvatar, targetUserId, callType, threadId } = session;
        // 1. Resolve active push subscriptions for recipient
        const subscriptions = await push_subscription_store_1.PushSubscriptionStore.getActiveSubscriptions(tenantId, targetUserId);
        if (!subscriptions || subscriptions.length === 0) {
            console.log(`[IncomingCallPushService] No active Web Push subscriptions found for user: ${targetUserId}`);
            return { attempts: 0, successful: 0, failed: 0, sentCount: 0, failureCount: 0 };
        }
        console.log(`[IncomingCallPushService] Found ${subscriptions.length} push subscription(s) for user: ${targetUserId}`);
        // 2. Build structured, privacy-safe call push payload (zero private keys or credentials)
        const issuedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 45000).toISOString(); // 45 seconds ringing TTL
        const actionRoute = `/apps/chat/chats?callId=${encodeURIComponent(callId)}&action=accept`;
        const payload = {
            type: "CALL_INCOMING",
            eventType: "CALL_INCOMING",
            schemaVersion: "1.0",
            callId,
            tenantId,
            callerId,
            callerName: callerName || "Colleague",
            callerAvatar: callerAvatar || null,
            callType,
            threadId,
            issuedAt,
            expiresAt,
            actionRoute,
        };
        let successful = 0;
        let failed = 0;
        // 3. Dispatch to all recipient endpoints in parallel
        await Promise.all(subscriptions.map(async (sub) => {
            try {
                const result = await vapid_service_1.VapidService.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                }, payload, {
                    ttl: 45,
                    urgency: "high",
                    topic: `call_${callId}`,
                });
                if (result.success) {
                    successful++;
                }
                else {
                    failed++;
                    if (result.isExpired) {
                        console.log(`[IncomingCallPushService] Deactivating expired subscription for user: ${targetUserId}`);
                        await push_subscription_store_1.PushSubscriptionStore.markExpired(targetUserId, sub.endpoint);
                    }
                    else {
                        console.warn(`[IncomingCallPushService] Push delivery failed to ${sub.endpoint.slice(0, 30)}...: ${result.error}`);
                    }
                }
            }
            catch (err) {
                failed++;
                console.warn(`[IncomingCallPushService] Unexpected dispatch error: ${err.message}`);
            }
        }));
        return {
            attempts: subscriptions.length,
            successful,
            failed,
            sentCount: successful,
            failureCount: failed,
        };
    }
    /**
     * Dispatches a cancellation push so the client service worker can immediately close
     * the persistent incoming-call notification if the caller hung up or timed out.
     */
    static async sendCallCancelledPush(session) {
        const { callId, tenantId, targetUserId, reason } = session;
        const subscriptions = await push_subscription_store_1.PushSubscriptionStore.getActiveSubscriptions(tenantId, targetUserId);
        if (!subscriptions || subscriptions.length === 0)
            return { attempts: 0, successful: 0, failed: 0, sentCount: 0 };
        const cancelPayload = {
            type: "CALL_CANCELLED",
            eventType: "CALL_CANCELLED",
            schemaVersion: "1.0",
            callId,
            tenantId,
            reason: reason || "Caller cancelled",
            timestamp: new Date().toISOString(),
        };
        let successful = 0;
        let failed = 0;
        await Promise.all(subscriptions.map(async (sub) => {
            try {
                const res = await vapid_service_1.VapidService.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                }, cancelPayload, {
                    ttl: 0, // Deliver immediately or drop if device offline
                    urgency: "high",
                    topic: `call_${callId}`,
                });
                if (res?.success)
                    successful++;
                else
                    failed++;
            }
            catch {
                failed++;
            }
        }));
        return { attempts: subscriptions.length, successful, failed, sentCount: successful };
    }
}
exports.IncomingCallPushService = IncomingCallPushService;
