# MASTERHRMS — FCM BACKEND HTTP V1 AUDIT & MIGRATION REPORT
## Independent Audit, Protocol Migration & Verification

---

## 1. MANDATORY AUDIT FINDINGS

An independent audit was conducted on `server/src/services/native-push-dispatcher.service.ts`, `server/package.json`, and backend configuration files:

| Audit Question | Finding | Status / Severity |
|---|---|---|
| **1. Exact FCM endpoint previously used** | `https://fcm.googleapis.com/fcm/send` (with `Authorization: key=${fcmServerKey}`) | **CRITICAL DEPRECATION** |
| **2. Retired legacy FCM status** | Google officially deprecated the legacy FCM HTTP protocol on June 20, 2023, and **completely shut down / retired it on June 20, 2024**. Requests to this endpoint now fail. | **MIGRATION MANDATORY** |
| **3. Firebase Admin SDK in `server/package.json`** | Not installed in `server/package.json`. | Addressed via zero-dependency RFC 7523 OAuth 2.0 client |
| **4. Current credential-loading mechanism** | Relied on `FIREBASE_SERVER_KEY` / `FCM_SERVER_KEY` / `FIREBASE_API_KEY`. (In `server/.env`, `FIREBASE_API_KEY` was a Web API key, which cannot authenticate server-side FCM calls). | **INVALID FOR FCM V1** |
| **5. Firebase secrets exposure to clients** | Inspected `mobile-app/android/app/google-services.json` and client files: Only public client IDs and Web API keys are present. **No private keys or service account secrets are exposed to mobile or web clients**. | **SECURE & VERIFIED** |

---

## 2. REQUIRED MIGRATION TO FCM HTTP V1

Because Google retired the legacy API, `NativePushDispatcher` has been migrated to the official **Google FCM HTTP v1 API** with **RFC 7523 OAuth 2.0 Service Account Authentication**.

### New Architectural Flow:
1. **Google OAuth 2.0 Authorization**:
   - Generates an RS256-signed JWT assertion using Node.js built-in `crypto` and `jsonwebtoken`:
     - Scope: `https://www.googleapis.com/auth/firebase.messaging`
     - Audience: `https://oauth2.googleapis.com/token`
     - Issuer: Service account `client_email`
   - Requests OAuth 2.0 Bearer access token from Google's token endpoint (`https://oauth2.googleapis.com/token`).
   - Caches the access token in memory (`FcmHttpV1Client.cachedAccessToken`) with a 5-minute pre-expiration renewal window.
2. **Official Endpoint**:
   - `POST https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`
   - Header: `Authorization: Bearer <google_oauth2_access_token>`
3. **Payload Structure (Strict FCM v1 Schema)**:
   - `message.token`: Target device registration token.
   - `message.notification`: `{ title, body }`.
   - `message.android`:
     - `priority`: `"HIGH"`
     - `notification`: `{ title, body, sound: "default", channel_id, click_action: "OPEN_ACTIVITY", default_vibrate_timings: true, default_light_settings: true }`
   - `message.data`: **All keys and values are strictly serialized to strings** (`String(val)`), as mandated by the FCM v1 schema to prevent HTTP 400 `INVALID_ARGUMENT` errors.
4. **Incoming Call Notifications**:
   - Channel mapped to `"calls"` with `priority: "HIGH"`.
   - Full metadata (`callId`, `callerName`, `callType`, `threadId`) passed in `message.data`.
5. **Token Lifecycle & Dead-Token Pruning**:
   - Google FCM v1 returns error details when a device token is expired or uninstalled: `errorCode: "UNREGISTERED"`, `status: "NOT_FOUND"`, or `errorCode: "INVALID_ARGUMENT"`.
   - The dispatcher automatically intercepts these error codes and invokes `NativePushStore.markExpired(t.userId, t.token)`, removing the dead token from the active distribution list.
6. **Bounded Retries**:
   - Transient server errors (HTTP 429, 500, 503) retry with exponential backoff up to 2 attempts.
7. **Expo Push Delivery**:
   - Expo push notification service (`https://exp.host/--/api/v2/push/send`) remains completely intact and supported for Expo tokens.

---

## 3. EXACT FILES MODIFIED

1. **`server/src/services/native-push-dispatcher.service.ts`**:
   - Added `FcmHttpV1Client` class supporting:
     * Credentials loading from `FIREBASE_SERVICE_ACCOUNT` (JSON string or file path), `GOOGLE_APPLICATION_CREDENTIALS` (file path), or individual env vars (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID`).
     * Google OAuth 2.0 access token minting and in-memory caching.
   - Migrated `dispatchFcmTokens()` from retired `fcm.googleapis.com/fcm/send` to `fcm.googleapis.com/v1/projects/{projectId}/messages:send`.
   - Stringified all data attributes for FCM v1 compliance.
   - Implemented `UNREGISTERED` error handling to trigger `NativePushStore.markExpired`.
2. **`server/src/services/native-push.store.ts`**:
   - Added `updatedAt?: string` to `StoredDevicePushToken` interface.
3. **`server/src/tests/native-push-registration.test.ts`**:
   - Expanded from 3 to 4 suites (12 tests total).
   - Added comprehensive tests for OAuth 2.0 JWT generation, FCM HTTP v1 delivery, incoming call notification payloads, dead-token pruning on `UNREGISTERED`, and graceful handling of missing credentials.
4. **`server/.env.example`**:
   - Added documentation for `FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

---

## 4. CREDENTIAL CONFIGURATION REQUIREMENTS

To enable FCM HTTP v1 in staging or production:
1. Go to **Google Firebase Console** > **Project Settings** > **Service accounts**.
2. Click **Generate new private key** (downloads a `.json` file).
3. Configure the backend using **one** of the following supported options:

### Option A: Raw JSON String in Environment Variable
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"masterhrms-ab50b","private_key_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"firebase-adminsdk@masterhrms-ab50b.iam.gserviceaccount.com"}'
```

### Option B: Path to Service Account JSON File
```env
FIREBASE_SERVICE_ACCOUNT="/etc/secrets/firebase-service-account.json"
# OR standard Google Cloud variable:
GOOGLE_APPLICATION_CREDENTIALS="/etc/secrets/firebase-service-account.json"
```

### Option C: Individual Environment Variables
```env
FIREBASE_PROJECT_ID="masterhrms-ab50b"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@masterhrms-ab50b.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 5. AUTOMATED TEST EVIDENCE

### 1. Server Native Push & FCM HTTP v1 Verification
Command: `./server/node_modules/.bin/tsx server/src/tests/native-push-registration.test.ts`
```
================================================================================
🧪 RUNNING COMPREHENSIVE VERIFICATION: FCM HTTP V1 & NATIVE PUSH PIPELINE
================================================================================

👉 SUITE 1: NativePushStore Registration & Token Deduplication
   ✅ Expo device token registered successfully
   ✅ Native FCM token registered successfully
   ✅ Retrieved active device tokens count matches expected
   ✅ Strict tenant isolation confirmed (0 cross-tenant leaks)
   ✅ Token rotation and device deduplication verified

👉 SUITE 2: Device Revocation & Expiration Lifecycle
   ✅ Device token revocation upon logout verified
   ✅ Token expiration handling verified

👉 SUITE 3: Expo Push Dispatch Pipeline
   ✅ Expo Push payload construction and ticket resolution verified

👉 SUITE 4: FCM HTTP v1 Migration & Delivery Verification
   ✅ FCM HTTP v1 OAuth 2.0 token exchange & message delivery verified
   ✅ FCM HTTP v1 Incoming Call high-priority notification verified (channel: calls)
[NativePushDispatcher] Unregistering expired/invalid FCM token for user user_fcm_expire: fcm_token_unregister... (UNREGISTERED)
   ✅ Invalid / UNREGISTERED FCM token automatic cleanup verified
[NativePushDispatcher] FCM HTTP v1 credentials not configured (FIREBASE_SERVICE_ACCOUNT or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY required). Direct FCM dispatch skipped.
   ✅ Missing credentials handled gracefully without throwing or crashing

================================================================================
🎉 ALL 12 FCM HTTP V1 & NATIVE PUSH BACKEND TESTS PASSED!
================================================================================
```

### 2. Mobile Client FCM Lifecycle Suite
Command: `cd mobile-app && npm test -- __tests__/fcm_native_push_registration.test.ts`
```
PASS __tests__/fcm_native_push_registration.test.ts
  MASTERHRMS Notification Lifecycle & Native FCM Development Build Suite
    ✓ 1. Expo Go skips native push initialization, channel setup, and token acquisition (22 ms)
    ✓ 2. Development build configures default and calls notification channels on Android (1 ms)
    ✓ 3. Development build acquires actual native FCM token via getDevicePushTokenAsync (1 ms)
    ✓ 4. Backend registration succeeds with registered status and correct payload (1 ms)
    ✓ 5. Token refresh listener syncs rotated FCM token with backend
    ✓ 6. Logout revokes token through backend unregister endpoint (1 ms)
    ✓ 7. Failed backend registration does not crash app startup and records failure status (1514 ms)
    ✓ 8. Socket.IO in-app notifications still present local notifications safely in Expo Go and native builds (2 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

### 3. Full Mobile Regression Suite
Command: `cd mobile-app && npm test -- --runInBand --forceExit`
```
Test Suites: 13 passed, 13 total
Tests:       165 passed, 165 total
Time:        3.374 s
```

### 4. Static Type Analysis
- `cd server && npx tsc --noEmit` -> **0 errors**
- `cd mobile-app && npm run typecheck` -> **0 errors**

---

## 6. PHYSICAL DEVICE VERIFICATION STATUS

- **Mock & Contract Verification**: **100% Complete & Passing**.
- **Physical Device Delivery Status**: **PENDING LIVE SERVICE ACCOUNT KEY ON ENVIRONMENT**.
  - In accordance with testing guidelines, actual over-the-air notification display on a physical Android device cannot be claimed until a production Google Service Account key (`FIREBASE_SERVICE_ACCOUNT`) is loaded into the host environment and a native APK (`npx expo run:android`) is registered with Google Play Services.
  - The entire protocol pipeline, OAuth 2.0 token exchange, FCM v1 payload construction, dead-token pruning, error recovery, and backend registration are completely implemented, type-checked, and regression-tested.
