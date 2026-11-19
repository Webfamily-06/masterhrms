import assert from "node:assert";
import crypto from "node:crypto";
import { prisma, rawPrisma } from "../prisma";
import { NativePushStore, StoredDevicePushToken } from "../services/native-push.store";
import {
  NativePushDispatcher,
  FcmHttpV1Client,
} from "../services/native-push-dispatcher.service";
import { NotificationService } from "../services/notification.service";

async function runNativePushVerification() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: FCM HTTP V1 & NATIVE PUSH PIPELINE");
  console.log("================================================================================\n");

  let testsPassed = 0;

  // Clean up any test records from prior runs
  try {
    const db = rawPrisma || prisma;
    await db.setting.deleteMany({
      where: {
        scope: "USER",
        scopeId: { in: ["user_101", "user_cross_tenant", "user_fcm_100", "user_fcm_expire"] },
        group: "native_push",
      },
    });
  } catch {}

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 1: NativePushStore Registration, Tenant Isolation & Token Deduplication
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("👉 SUITE 1: NativePushStore Registration & Token Deduplication");
  {
    NativePushStore.clearMemoryCache();

    // 1. Register an Expo push token
    const token1 = await NativePushStore.saveDeviceToken({
      tenantId: "tenant_alpha",
      userId: "user_101",
      token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      platform: "android",
      tokenType: "expo",
      deviceId: "pixel_7_pro",
      appVersion: "1.0.0",
    });

    assert(token1.id.startsWith("dtoken_"), "Token ID must start with dtoken_");
    assert.strictEqual(token1.status, "active");
    assert.strictEqual(token1.tokenType, "expo");
    assert.strictEqual(token1.platform, "android");
    assert.strictEqual(token1.deviceId, "pixel_7_pro");
    testsPassed++;
    console.log("   ✅ Expo device token registered successfully");

    // 2. Register a native FCM token on another device
    const token2 = await NativePushStore.saveDeviceToken({
      tenantId: "tenant_alpha",
      userId: "user_101",
      token: "fcm_token_samsung_galaxy_s24_ultra_alphanumeric_152_chars",
      platform: "android",
      tokenType: "fcm",
      deviceId: "samsung_s24",
      appVersion: "1.0.0",
    });

    assert.strictEqual(token2.tokenType, "fcm");
    assert.strictEqual(token2.status, "active");
    testsPassed++;
    console.log("   ✅ Native FCM token registered successfully");

    // 3. Query active tokens for user_101 in tenant_alpha
    const userTokens = await NativePushStore.getActiveDeviceTokens("tenant_alpha", "user_101");
    assert.strictEqual(userTokens.length, 2, "user_101 should have 2 active registered devices");
    testsPassed++;
    console.log("   ✅ Retrieved active device tokens count matches expected");

    // 4. Verify Tenant Isolation: Query user_101 with wrong tenant
    const crossTenantTokens = await NativePushStore.getActiveDeviceTokens("tenant_beta", "user_101");
    assert.strictEqual(crossTenantTokens.length, 0, "Cross-tenant token lookup must return 0 tokens (Tenant Isolation)");
    testsPassed++;
    console.log("   ✅ Strict tenant isolation confirmed (0 cross-tenant leaks)");

    // 5. Token deduplication: Re-registering existing device with rotated token
    await NativePushStore.saveDeviceToken({
      tenantId: "tenant_alpha",
      userId: "user_101",
      token: "ExponentPushToken[rotated_new_token_value]",
      platform: "android",
      tokenType: "expo",
      deviceId: "pixel_7_pro", // Same deviceId
      appVersion: "1.0.1",
    });

    const updatedTokens = await NativePushStore.getActiveDeviceTokens("tenant_alpha", "user_101");
    assert.strictEqual(updatedTokens.length, 2, "Rotated token on existing device should replace old token, not duplicate");
    const foundRotated = updatedTokens.find((t) => t.deviceId === "pixel_7_pro");
    assert.strictEqual(foundRotated?.token, "ExponentPushToken[rotated_new_token_value]");
    testsPassed++;
    console.log("   ✅ Token rotation and device deduplication verified");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 2: Device Revocation & Expiration Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n👉 SUITE 2: Device Revocation & Expiration Lifecycle");
  {
    // 1. Revoke samsung_s24 (e.g. on logout)
    const revoked = await NativePushStore.revokeDeviceToken("tenant_alpha", "user_101", "samsung_s24");
    assert.strictEqual(revoked, true, "Revoke call must return true");

    const tokensAfterRevoke = await NativePushStore.getActiveDeviceTokens("tenant_alpha", "user_101");
    assert.strictEqual(tokensAfterRevoke.length, 1, "Only 1 active token should remain after revocation");
    assert.strictEqual(tokensAfterRevoke[0].deviceId, "pixel_7_pro");
    testsPassed++;
    console.log("   ✅ Device token revocation upon logout verified");

    // 2. Mark remaining token as expired (e.g. app uninstalled)
    await NativePushStore.markExpired("user_101", "ExponentPushToken[rotated_new_token_value]");
    const tokensAfterExpire = await NativePushStore.getActiveDeviceTokens("tenant_alpha", "user_101");
    assert.strictEqual(tokensAfterExpire.length, 0, "No active tokens should remain after token expiration");
    testsPassed++;
    console.log("   ✅ Token expiration handling verified");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 3: Expo Push Notification Service Integration
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n👉 SUITE 3: Expo Push Dispatch Pipeline");
  {
    NativePushStore.clearMemoryCache();

    const originalFetch = globalThis.fetch;
    const fetchCalls: Array<{ url: string; headers: any; body: any }> = [];

    globalThis.fetch = async (input: any, init?: any) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(init.body) : null;
      fetchCalls.push({ url, headers: init?.headers, body });

      if (url.includes("exp.host")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ status: "ok", id: "ticket-expo-999" }],
          }),
        } as any;
      }

      return { ok: false, status: 404, text: async () => "Not Found" } as any;
    };

    try {
      const expoToken: StoredDevicePushToken = {
        id: "dtoken_test1",
        tenantId: "tenant_alpha",
        userId: "user_200",
        token: "ExponentPushToken[valid_mock_token]",
        platform: "android",
        tokenType: "expo",
        deviceId: "dev_test",
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        status: "active",
      };

      const result = await NativePushDispatcher.dispatch([expoToken], {
        id: "notif_555",
        tenantId: "tenant_alpha",
        title: "Test Native Push",
        body: "Your leave request was approved.",
        module: "LEAVE",
        linkTo: "/leaves/history",
      });

      assert.strictEqual(result.sent, 1, "Should record 1 successful dispatch");
      assert.strictEqual(result.failed, 0, "Should record 0 failed dispatches");
      assert.strictEqual(fetchCalls.length, 1, "Should have made 1 HTTP call to Expo push API");
      assert(fetchCalls[0].url.includes("exp.host"));
      assert.strictEqual(fetchCalls[0].body[0].title, "Test Native Push");
      assert.strictEqual(fetchCalls[0].body[0].data.id, "notif_555");
      assert.strictEqual(fetchCalls[0].body[0].data.module, "LEAVE");
      testsPassed++;
      console.log("   ✅ Expo Push payload construction and ticket resolution verified");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 4: FCM HTTP v1 OAuth 2.0 & Native Android Delivery
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n👉 SUITE 4: FCM HTTP v1 Migration & Delivery Verification");
  {
    NativePushStore.clearMemoryCache();
    FcmHttpV1Client.clearCache();

    // Generate real in-memory RSA keypair for testing RFC 7523 OAuth 2.0 JWT generation
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const origProjectId = process.env.FIREBASE_PROJECT_ID;
    const origClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const origPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    process.env.FIREBASE_PROJECT_ID = "masterhrms-ab50b";
    process.env.FIREBASE_CLIENT_EMAIL = "firebase-adminsdk@masterhrms-ab50b.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKey;

    const originalFetch = globalThis.fetch;
    const httpCalls: Array<{ url: string; headers: any; body: any }> = [];

    globalThis.fetch = async (input: any, init?: any) => {
      const url = String(input);
      const headers = init?.headers || {};
      let body: any = null;
      if (typeof init?.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = init.body;
        }
      }
      httpCalls.push({ url, headers, body });

      // 1. Mock Google OAuth 2.0 Token endpoint
      if (url.includes("oauth2.googleapis.com/token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "mock_google_oauth2_bearer_token_xyz_888",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        } as any;
      }

      // 2. Mock Google FCM HTTP v1 endpoint
      if (url.includes("fcm.googleapis.com/v1/projects/masterhrms-ab50b/messages:send")) {
        // Assert Bearer token is provided
        const authHeader = headers["Authorization"] || headers["authorization"];
        if (authHeader !== "Bearer mock_google_oauth2_bearer_token_xyz_888") {
          return {
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: { status: "UNAUTHENTICATED", message: "Invalid Bearer token" } }),
          } as any;
        }

        const msg = body?.message;
        if (msg?.token === "fcm_token_unregistered") {
          return {
            ok: false,
            status: 404,
            text: async () =>
              JSON.stringify({
                error: {
                  code: 404,
                  message: "Requested entity was not found.",
                  status: "NOT_FOUND",
                  details: [{ errorCode: "UNREGISTERED" }],
                },
              }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            name: "projects/masterhrms-ab50b/messages/0:1700000000000000%abcdef123456",
          }),
        } as any;
      }

      return { ok: false, status: 404, text: async () => "Not Found" } as any;
    };

    try {
      // Test 1: Native Android FCM Delivery via HTTP v1
      const fcmToken: StoredDevicePushToken = {
        id: "dtoken_fcm_1",
        tenantId: "tenant_alpha",
        userId: "user_fcm_100",
        token: "fcm_valid_device_token_android_pixel",
        platform: "android",
        tokenType: "fcm",
        deviceId: "pixel_7",
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        status: "active",
      };

      const fcmResult = await NativePushDispatcher.dispatch([fcmToken], {
        id: "alert_101",
        tenantId: "tenant_alpha",
        title: "Salary Credited",
        body: "Your monthly payroll has been processed successfully.",
        module: "PAYROLL",
        linkTo: "/payroll/payslips",
      });

      assert.strictEqual(fcmResult.sent, 1, "Should record 1 successful FCM HTTP v1 dispatch");
      assert.strictEqual(fcmResult.failed, 0, "Should record 0 failed dispatches");

      // Verify OAuth2 call was made
      const oauthCall = httpCalls.find((c) => c.url.includes("oauth2.googleapis.com"));
      assert(oauthCall, "Must execute OAuth 2.0 token exchange");

      // Verify FCM v1 call was made to the official v1 project endpoint
      const fcmCall = httpCalls.find((c) =>
        c.url.includes("fcm.googleapis.com/v1/projects/masterhrms-ab50b/messages:send")
      );
      assert(fcmCall, "Must target official FCM HTTP v1 projects/{id}/messages:send endpoint");
      assert.strictEqual(fcmCall.headers.Authorization, "Bearer mock_google_oauth2_bearer_token_xyz_888");

      // Verify payload follows strict FCM v1 schema
      const sentMsg = fcmCall.body.message;
      assert.strictEqual(sentMsg.token, "fcm_valid_device_token_android_pixel");
      assert.strictEqual(sentMsg.notification.title, "Salary Credited");
      assert.strictEqual(sentMsg.android.priority, "HIGH");
      assert.strictEqual(sentMsg.android.notification.channel_id, "default");
      assert.strictEqual(sentMsg.data.id, "alert_101");
      assert.strictEqual(sentMsg.data.tenantId, "tenant_alpha");
      assert.strictEqual(typeof sentMsg.data.id, "string");
      testsPassed++;
      console.log("   ✅ FCM HTTP v1 OAuth 2.0 token exchange & message delivery verified");

      // Test 2: High-Priority Incoming Call Notification Payload
      httpCalls.length = 0;
      await NativePushDispatcher.dispatch([fcmToken], {
        id: "call_invite_999",
        tenantId: "tenant_alpha",
        title: "Incoming Video Call",
        body: "Alice Telecom is calling you...",
        type: "CALL",
        module: "CALL",
        channelId: "calls",
        metadata: {
          callId: "call_session_777",
          callerName: "Alice Telecom",
          callType: "video",
        },
      });

      const callFcm = httpCalls.find((c) => c.url.includes("messages:send"));
      assert(callFcm, "Must execute FCM send for call notification");
      assert.strictEqual(callFcm.body.message.android.notification.channel_id, "calls");
      assert.strictEqual(callFcm.body.message.android.priority, "HIGH");
      assert.strictEqual(callFcm.body.message.data.callId, "call_session_777");
      assert.strictEqual(callFcm.body.message.data.callerName, "Alice Telecom");
      testsPassed++;
      console.log("   ✅ FCM HTTP v1 Incoming Call high-priority notification verified (channel: calls)");

      // Test 3: Dead / Invalid Token Cleanup on UNREGISTERED
      await NativePushStore.saveDeviceToken({
        tenantId: "tenant_alpha",
        userId: "user_fcm_expire",
        token: "fcm_token_unregistered",
        platform: "android",
        tokenType: "fcm",
        deviceId: "uninstalled_phone",
      });

      const tokensBefore = await NativePushStore.getActiveDeviceTokens("tenant_alpha", "user_fcm_expire");
      assert.strictEqual(tokensBefore.length, 1);

      const unregToken = tokensBefore[0];
      const unregResult = await NativePushDispatcher.dispatch([unregToken], {
        id: "test_clean",
        tenantId: "tenant_alpha",
        title: "Ping",
        body: "Check delivery",
      });

      assert.strictEqual(unregResult.failed, 1, "Unregistered token should fail");
      assert(unregResult.details[0].error?.includes("UNREGISTERED"));

      const tokensAfter = await NativePushStore.getActiveDeviceTokens("tenant_alpha", "user_fcm_expire");
      assert.strictEqual(tokensAfter.length, 0, "Unregistered token must be pruned automatically from active store");
      testsPassed++;
      console.log("   ✅ Invalid / UNREGISTERED FCM token automatic cleanup verified");

      // Test 4: Graceful Handling of Missing / Expired Credentials
      FcmHttpV1Client.clearCache();
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIREBASE_SERVICE_ACCOUNT;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

      const missingCredsResult = await NativePushDispatcher.dispatch([fcmToken], {
        id: "ping_no_creds",
        tenantId: "tenant_alpha",
        title: "Test",
        body: "Test",
      });

      assert.strictEqual(missingCredsResult.failed, 1);
      assert(missingCredsResult.details[0].error?.includes("credentials not configured"));
      testsPassed++;
      console.log("   ✅ Missing credentials handled gracefully without throwing or crashing");
    } finally {
      globalThis.fetch = originalFetch;
      FcmHttpV1Client.clearCache();

      // Restore env vars
      if (origProjectId) process.env.FIREBASE_PROJECT_ID = origProjectId;
      if (origClientEmail) process.env.FIREBASE_CLIENT_EMAIL = origClientEmail;
      if (origPrivateKey) process.env.FIREBASE_PRIVATE_KEY = origPrivateKey;
    }
  }

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${testsPassed} FCM HTTP V1 & NATIVE PUSH BACKEND TESTS PASSED!`);
  console.log("================================================================================\n");
}

runNativePushVerification().catch((err) => {
  console.error("❌ Native Push Verification Failed:", err);
  process.exit(1);
});
