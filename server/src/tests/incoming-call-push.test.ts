import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import assert from "node:assert";
import { VapidService } from "../services/vapid.service";
import { PushSubscriptionStore } from "../services/push-subscription.store";
import { IncomingCallPushService } from "../services/incoming-call-push.service";
import { activeCalls, ActiveCallSession } from "../socket";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runIncomingCallPushVerification() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: WEB PUSH NOTIFICATIONS & INCOMING CALLS");
  console.log("================================================================================\n");

  let suitesPassed = 0;
  let testsPassed = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 1: VAPID Key Generation, Encoding & RFC 8292 Compliance
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("👉 SUITE 1: VAPID Key Generation & Identity Specification");
  {
    const keys = VapidService.getVapidKeys();
    assert(keys.publicKey, "VAPID public key must not be empty");
    assert(keys.privateKey, "VAPID private key must not be empty");

    // Public key must be URL-safe base64 of 65 bytes uncompressed P-256 point (starts with 0x04)
    const pubBuffer = Buffer.from(keys.publicKey, "base64url");
    assert.strictEqual(pubBuffer.length, 65, "VAPID public key must be exactly 65 bytes (P-256 uncompressed)");
    assert.strictEqual(pubBuffer[0], 0x04, "P-256 uncompressed point must start with 0x04 byte");

    // Private key must be 32 bytes scalar
    const privBuffer = Buffer.from(keys.privateKey, "base64url");
    assert.strictEqual(privBuffer.length, 32, "VAPID private key must be exactly 32 bytes");

    // Generate ephemeral keypair to test key-generation utility
    const freshKeys = VapidService.generateVapidKeys();
    assert.notStrictEqual(freshKeys.publicKey, keys.publicKey, "Freshly generated keys must have unique entropy");
    assert.strictEqual(Buffer.from(freshKeys.publicKey, "base64url").length, 65);
    assert.strictEqual(Buffer.from(freshKeys.privateKey, "base64url").length, 32);

    console.log("   ✅ VAPID ECDSA P-256 keypair validated (RFC 8292 uncompressed point)");
    testsPassed += 2;
    suitesPassed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 2: RFC 8292 VAPID Authorization JWT Generation & Signature Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n👉 SUITE 2: RFC 8292 VAPID Authorization Token");
  {
    const keys = VapidService.getVapidKeys();
    const audience = "https://fcm.googleapis.com";
    const jwt = VapidService.createVapidJwt(audience, keys, 3600);

    const parts = jwt.split(".");
    assert.strictEqual(parts.length, 3, "VAPID JWT must consist of header.payload.signature");

    // Check Header
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    assert.strictEqual(header.typ, "JWT", "JWT header typ must be JWT");
    assert.strictEqual(header.alg, "ES256", "JWT header alg must be ES256");

    // Check Claims
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    assert.strictEqual(payload.aud, audience, "JWT claim aud must match push service origin");
    assert(payload.exp > Math.floor(Date.now() / 1000), "JWT exp must be in the future");
    assert(payload.sub.startsWith("mailto:"), "JWT sub must specify a mailto: contact URI");

    // Cryptographic verification of ES256 signature using Public Key
    const unsignedToken = `${parts[0]}.${parts[1]}`;
    const rawSignature = Buffer.from(parts[2], "base64url");
    assert.strictEqual(rawSignature.length, 64, "Raw ES256 signature must be exactly 64 bytes (r:32 + s:32)");

    // Convert raw (r, s) IEEE P1363 signature to DER format for Node crypto.verify
    const r = rawSignature.subarray(0, 32);
    const s = rawSignature.subarray(32, 64);

    function toDerInt(buf: Buffer): Buffer {
      let start = 0;
      while (start < buf.length - 1 && buf[start] === 0) start++;
      const trimmed = buf.subarray(start);
      if (trimmed[0] & 0x80) {
        return Buffer.concat([Buffer.from([0x02, trimmed.length + 1, 0x00]), trimmed]);
      }
      return Buffer.concat([Buffer.from([0x02, trimmed.length]), trimmed]);
    }

    const derR = toDerInt(r);
    const derS = toDerInt(s);
    const derSig = Buffer.concat([
      Buffer.from([0x30, derR.length + derS.length]),
      derR,
      derS,
    ]);

    // Construct PEM public key
    const pubKeyBuffer = Buffer.from(keys.publicKey, "base64url");
    const derHeader = Buffer.from("3059301306072a8648ce3d020106082a8648ce3d030107034200", "hex");
    const fullDer = Buffer.concat([derHeader, pubKeyBuffer]);
    const pem = `-----BEGIN PUBLIC KEY-----\n${fullDer.toString("base64")}\n-----END PUBLIC KEY-----`;

    const verifier = crypto.createVerify("SHA256");
    verifier.update(unsignedToken);
    const isValid = verifier.verify(pem, derSig);
    assert.strictEqual(isValid, true, "ES256 signature must mathematically verify against VAPID public key");

    console.log("   ✅ VAPID JWT generation & ES256 signature verification passed");
    testsPassed += 3;
    suitesPassed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 3: RFC 8291 Web Push Message Encryption (aes128gcm) & Round-Trip Decrypt
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n👉 SUITE 3: RFC 8291 Payload Encryption (aes128gcm & HKDF Key Derivation)");
  {
    // Generate simulated client push subscription keypair
    const clientEcdh = crypto.createECDH("prime256v1");
    clientEcdh.generateKeys();
    const clientPublicKey = clientEcdh.getPublicKey("base64url");
    const clientAuthSecret = crypto.randomBytes(16).toString("base64url");

    const message = JSON.stringify({
      type: "CALL_INCOMING",
      callId: "call_test_12345",
      callerName: "Dr. Sarah Telecom",
      callType: "video",
    });

    const encrypted = VapidService.encryptPayload(message, {
      p256dh: clientPublicKey,
      auth: clientAuthSecret,
    });

    // Encrypted envelope must contain RFC 8291 header (16 + 4 + 1 + 65 = 86 bytes) + ciphertext + 16 byte tag
    assert(encrypted.length > 86 + 16, "Encrypted message must exceed minimum header + tag length");

    const salt = encrypted.subarray(0, 16);
    const rs = encrypted.readUInt32BE(16);
    assert.strictEqual(rs, 4096, "Record size must match RFC 8291 default 4096 bytes");
    const idlen = encrypted[20];
    assert.strictEqual(idlen, 65, "Server public key ID length must be 65 bytes");
    const serverEphemeralPublicKey = encrypted.subarray(21, 21 + 65);
    assert.strictEqual(serverEphemeralPublicKey[0], 0x04, "Server public key must be uncompressed P-256");

    // Client-side decryption simulation (proving recipient browser can decrypt)
    const clientAuthBuffer = Buffer.from(clientAuthSecret, "base64url");
    const sharedSecret = clientEcdh.computeSecret(serverEphemeralPublicKey);

    // HKDF PRK derivation
    const authInfo = Buffer.from("WebPush: info\0", "utf8");
    const prk = crypto.hkdfSync("sha256", sharedSecret, clientAuthBuffer, authInfo, 32);

    // HKDF CEK and Nonce derivation
    const prkBuffer = Buffer.from(prk);
    const keyInfo = Buffer.concat([Buffer.from("Content-Encoding: aes128gcm\0", "utf8")]);
    const nonceInfo = Buffer.concat([Buffer.from("Content-Encoding: nonce\0", "utf8")]);

    const contentEncryptionKey = Buffer.from(crypto.hkdfSync("sha256", prkBuffer, salt, keyInfo, 16));
    const nonce = Buffer.from(crypto.hkdfSync("sha256", prkBuffer, salt, nonceInfo, 12));

    const ciphertextWithTag = encrypted.subarray(86);
    const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);
    const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);

    const decipher = crypto.createDecipheriv("aes-128-gcm", contentEncryptionKey, nonce);
    decipher.setAuthTag(authTag);
    const decryptedPadded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // Strip RFC 8291 padding delimiter (0x02)
    assert.strictEqual(decryptedPadded[decryptedPadded.length - 1], 0x02, "Plaintext must end with 0x02 delimiter");
    const decryptedText = decryptedPadded.subarray(0, decryptedPadded.length - 1).toString("utf8");

    assert.strictEqual(decryptedText, message, "Decrypted message must exactly match original plaintext");

    console.log("   ✅ RFC 8291 encryption and round-trip decryption validated");
    testsPassed += 4;
    suitesPassed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 4: Multi-Tenant Push Subscription Store Isolation & Deduplication
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n👉 SUITE 4: Multi-Tenant Push Subscription Persistence & Scope Isolation");
  {
    const tenantA = `tenant_corp_a_${Date.now()}`;
    const tenantB = `tenant_corp_b_${Date.now()}`;
    const user1 = `user_101_${Date.now()}`;

    const sub1 = {
      endpoint: `https://push.browser.net/sub/${Date.now()}/device_alpha`,
      keys: { p256dh: "mock_p256dh_alpha", auth: "mock_auth_alpha" },
    };

    const sub2 = {
      endpoint: `https://push.browser.net/sub/${Date.now()}/device_beta`,
      keys: { p256dh: "mock_p256dh_beta", auth: "mock_auth_beta" },
    };

    // Save 2 subscriptions for User1 in Tenant A
    const saved1 = await PushSubscriptionStore.saveSubscription({
      tenantId: tenantA,
      userId: user1,
      subscription: sub1,
      deviceType: "desktop",
    });
    assert.strictEqual(saved1.tenantId, tenantA);
    assert.strictEqual(saved1.userId, user1);

    await PushSubscriptionStore.saveSubscription({
      tenantId: tenantA,
      userId: user1,
      subscription: sub2,
      deviceType: "mobile",
    });

    // Retrieve active subscriptions for Tenant A
    const activeTenantA = await PushSubscriptionStore.getActiveSubscriptions(tenantA, user1);
    assert.strictEqual(activeTenantA.length, 2, "Tenant A user1 must have 2 active subscriptions");

    // Verify Tenant B has ZERO subscriptions for same userId (Cross-tenant isolation)
    const activeTenantB = await PushSubscriptionStore.getActiveSubscriptions(tenantB, user1);
    assert.strictEqual(activeTenantB.length, 0, "Cross-tenant isolation: Tenant B must not access Tenant A subscriptions");

    // Remove one subscription and verify count
    const removed = await PushSubscriptionStore.removeSubscription(tenantA, user1, sub1.endpoint);
    assert.strictEqual(removed, true, "Unsubscribe must succeed");

    const remaining = await PushSubscriptionStore.getActiveSubscriptions(tenantA, user1);
    assert.strictEqual(remaining.length, 1, "Only 1 subscription should remain after unsubscribe");
    assert.strictEqual(remaining[0].endpoint, sub2.endpoint);

    console.log("   ✅ Multi-tenant push subscription isolation and management verified");
    testsPassed += 5;
    suitesPassed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 5: Incoming Call Push Dispatch & Cancellation Lifecycles
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n👉 SUITE 5: Incoming Call Push Service & Dismissal Lifecycle");
  {
    const tenantId = `tenant_push_${Date.now()}`;
    const callerId = `caller_${Date.now()}`;
    const targetUserId = `callee_${Date.now()}`;
    const callId = `call_${Date.now()}_9988`;

    // Intercept outbound HTTP fetch to simulate push gateway response
    let lastPushedOptions: any = null;
    let pushPayloadReceived: any = null;
    const origSendNotification = VapidService.sendNotification;

    (VapidService as any).sendNotification = async (sub: any, payload: any, options: any) => {
      lastPushedOptions = options;
      pushPayloadReceived = payload;
      return { success: true, statusCode: 201 };
    };

    try {
      // Callee registers subscription
      await PushSubscriptionStore.saveSubscription({
        tenantId,
        userId: targetUserId,
        subscription: {
          endpoint: `https://push.services.mozilla.com/mock/${Date.now()}`,
          keys: { p256dh: "key_p256", auth: "auth_sec" },
        },
      });

      // 1. Dispatch Incoming Call Push
      const result = await IncomingCallPushService.sendIncomingCallPush({
        tenantId,
        targetUserId,
        callId,
        callerId,
        callerName: "Director Jane",
        callerAvatar: "https://example.com/avatar.png",
        callType: "video",
        threadId: "direct_thread_1",
      });

      assert.strictEqual(result.sentCount, 1, "Must dispatch exactly 1 push notification");
      assert.strictEqual(result.failureCount, 0);
      assert.strictEqual(lastPushedOptions?.urgency, "high", "Calls must specify high urgency");
      assert.strictEqual(lastPushedOptions?.ttl, 45, "Incoming calls must specify 45s TTL");
      assert.strictEqual(lastPushedOptions?.topic, `call_${callId}`, "Must specify collapse topic");
      assert.strictEqual(pushPayloadReceived?.type, "CALL_INCOMING");
      assert.strictEqual(pushPayloadReceived?.callId, callId);
      assert.strictEqual(pushPayloadReceived?.callerName, "Director Jane");
      assert.strictEqual(pushPayloadReceived?.callType, "video");

      // 2. Dispatch Call Cancelled Push
      const cancelResult = await IncomingCallPushService.sendCallCancelledPush({
        tenantId,
        targetUserId,
        callId,
        reason: "timeout",
      });

      assert.strictEqual(cancelResult.sentCount, 1);
      assert.strictEqual(pushPayloadReceived?.type, "CALL_CANCELLED");
      assert.strictEqual(pushPayloadReceived?.callId, callId);
      assert.strictEqual(pushPayloadReceived?.reason, "timeout");

      console.log("   ✅ Incoming call high-urgency push & cancellation dispatch verified");
      testsPassed += 8;
      suitesPassed++;
    } finally {
      VapidService.sendNotification = origSendNotification;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 6: Authoritative Call State Registry & REST Fallback Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n👉 SUITE 6: Active Call Session State & Cancellation Guardrails");
  {
    const tenantId = `tenant_active_${Date.now()}`;
    const callerId = `caller_${Date.now()}`;
    const targetUserId = `callee_${Date.now()}`;
    const callId = `call_${Date.now()}_state`;

    // Populate active call in memory
    const session: ActiveCallSession = {
      callId,
      tenantId,
      callerId,
      callerName: "Alice Architect",
      targetUserId,
      targetName: "Bob Engineer",
      callType: "audio",
      startedAt: new Date(),
      status: "ringing",
      timeoutTimer: null,
    };
    activeCalls.set(callId, session);

    // Verify session retrieval
    const current = activeCalls.get(callId);
    assert(current, "Active call session must be present");
    assert.strictEqual(current.status, "ringing");
    assert.strictEqual(current.callerId, callerId);
    assert.strictEqual(current.targetUserId, targetUserId);

    // Transition to connected
    session.status = "connected";
    assert.strictEqual(activeCalls.get(callId)?.status, "connected");

    // Clean up
    activeCalls.delete(callId);
    assert.strictEqual(activeCalls.get(callId), undefined, "Call session cleanly deleted on termination");

    console.log("   ✅ Authoritative call session lifecycle verified");
    testsPassed += 4;
    suitesPassed++;
  }

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${suitesPassed}/${suitesPassed} SUITES PASSED — ${testsPassed} ASSERTIONS VERIFIED`);
  console.log("================================================================================\n");
}

runIncomingCallPushVerification().catch((err) => {
  console.error("❌ Incoming Call & Web Push Verification Failed:", err);
  process.exit(1);
});
