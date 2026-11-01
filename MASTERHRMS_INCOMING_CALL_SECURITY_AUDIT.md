# MASTERHRMS — INCOMING CALL SECURITY AUDIT
## Cryptographic Key Management, Multi-Tenant Subscription Isolation, Signaling Authorization & Privacy Controls

**Document ID:** `MH-SEC-2026-001`  
**Classification:** Security Engineering & Cryptographic Audit  
**Status:** Passed — Complete Hardening Verified  
**Date:** November 2026  

---

## 1. Security Scope & Objectives

This audit examines the security, cryptographic guarantees, tenant isolation, and privacy protections of the MasterHRMS Web Push and WebRTC incoming call implementation.

The audit evaluates:
1. VAPID key generation, storage, and zero-leakage guarantees.
2. Web Push payload encryption (RFC 8291) against eavesdropping by intermediate push gateways.
3. Multi-tenant push subscription isolation across the shared database architecture.
4. WebSocket and REST signaling authorization (preventing unauthorized call interception or session hijacking).
5. Data privacy and prevention of personally identifiable information (PII) leakage in push payloads.

---

## 2. Cryptographic Security Analysis

### 2.1 VAPID Keys & Identity Protection

- **Key Architecture:** NIST P-256 (`prime256v1` / `secp256r1`) ECDSA keypair.
- **Storage Strategy:** Keys are read from environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). If absent during local development, keys are derived from high-entropy platform secrets.
- **Leakage Prevention:**
  - The `VAPID_PRIVATE_KEY` is strictly confined to `server/src/services/vapid.service.ts`.
  - The REST endpoint `/api/notifications/push/status` returns only the public key.
  - Client bundles and service workers contain zero private keys or secrets.
  - Unit tests verify that private keys are never serialized in payloads or response structures.

### 2.2 RFC 8291 End-to-End Encryption

Every push message is encrypted by the application server before transmission to external push services (FCM, Apple APNs, Mozilla autopush):

- **Cipher:** `aes-128-gcm` (authenticated encryption with 16-byte authentication tag).
- **Key Derivation:** HKDF-SHA256 with 16 bytes of cryptographically secure random salt generated per push.
- **P2P Confidentiality:** The intermediate push service routes only the ciphertext envelope (`Salt || rs || idlen || Key || Ciphertext || AuthTag`). Without the callee's browser private key, neither Google, Apple, nor Mozilla can decrypt the payload.
- **Replay Protection:** The unique 16-byte salt and ephemeral ECDH keypair generated per push ensure that replaying past push packets produces decryption failure.

---

## 3. Multi-Tenant Subscription Isolation

MasterHRMS enforces strict logical tenant isolation across all push subscriptions:

```
Database: Setting (Scope: USER, scopeId: userId)
Key: "push_sub_" + sha256(endpoint).slice(0, 32)
```

1. **Tenant ID Verification:** Every subscription registration (`POST /api/notifications/push/subscribe`) requires a valid JWT. The user's `tenantId` is extracted authoritatively from the verified JWT, never accepted from user-supplied request bodies.
2. **Cross-Tenant Guardrail:** When querying active subscriptions in `PushSubscriptionStore.getActiveSubscriptions(tenantId, userId)`, the query strictly matches `tenantId`. If a malicious actor in Tenant B guesses or knows the `userId` of an executive in Tenant A, zero subscriptions are returned.
3. **Empirical Verification:** Test Suite 4 in `server/src/tests/incoming-call-push.test.ts` verified that identical user IDs in different tenants return 0 cross-tenant subscriptions.

---

## 4. Signaling Authorization & State Machine Guardrails

Socket.IO and REST signaling endpoints implement strict transition checks:

1. **Cross-Tenant Call Blocking:** In `server/src/socket.ts` (`call:invite`), the server queries the database to verify that the target recipient belongs to the caller's tenant. Calls to users outside the tenant are rejected with `CALL_FORBIDDEN`.
2. **Third-Party Impersonation Prevention:** In `call:accept`, `call:reject`, `call:cancel`, and `call:signal`:
   - The session must exist in `activeCalls`.
   - The socket's authenticated `tenantId` must match `session.tenantId`.
   - The socket's authenticated `userId` must be an active participant (`session.callerId` or `session.targetUserId`).
   - Third-party sockets attempting to accept, reject, or signal into a call are immediately disconnected with `CALL_FORBIDDEN`.
3. **Callee-Only Rejection & Caller-Only Cancellation:**
   - A caller cannot reject their own call (they must use cancel).
   - A callee cannot cancel a call (they must use reject/decline).
   - This state machine prevents race conditions and ambiguous call states.

---

## 5. Privacy & Data Minimization

1. **Push Payload Contents:**
   - The push notification contains only functional routing metadata: `callId`, `callerName`, `callType` ("audio" | "video"), `actionRoute`.
   - Passwords, access tokens, TURN server credentials, and conversation message contents are never included in Web Push payloads.
2. **Ringtone Audio Privacy:**
   - Ringtone audio is generated locally on the client using the browser's Web Audio API. No external audio files are downloaded, preventing tracking or metadata leakage to third-party CDNs.
3. **Audit Conclusion:** The implementation adheres to OWASP ASVS Level 2 standards for session management, cryptographic algorithms, and multi-tenant authorization.
