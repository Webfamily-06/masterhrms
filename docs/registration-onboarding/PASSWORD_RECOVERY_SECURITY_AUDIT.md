# MASTERHRMS — PASSWORD RECOVERY & ACCOUNT SECURITY AUDIT

## 1. Executive Summary

This security audit inspects and evaluates the password recovery lifecycle in **MASTERHRMS**, specifically covering `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`.

Account recovery endpoints are historically vulnerable to user enumeration, token replay attacks, token leakage in query parameters, and session persistence after password compromise. This audit demonstrates how MASTERHRMS enforces strict enumeration resistance, cryptographically hashed tokens, single-use consumption, and global device session invalidation upon password update.

---

## 2. Enumeration Resistance (`POST /api/auth/forgot-password`)

### 2.1 Threat Model: User Enumeration Attacks
An attacker attempting to discover valid enterprise email addresses submits candidate emails to the forgot-password endpoint, analyzing differential responses (HTTP status codes, response times, or distinct JSON error payloads).

### 2.2 Implemented Countermeasures
1. **Identical HTTP 200 Response**:
   Both existing and non-existing accounts return the exact same generic success message:
   ```json
   {
     "success": true,
     "message": "If an account with that email exists, password reset instructions have been dispatched.",
     "maskedEmail": "a***e@example.com"
   }
   ```
2. **Timing Normalization**:
   Database query lookups use indexed email columns and consistent execution branches to minimize timing differentials.
3. **Zero Leaked Account Details**:
   No indicators regarding account existence, tenant affiliation, role assignments, or active lockout states are exposed.

---

## 3. Cryptographic Token Lifecycle & Storage Security

### 3.1 Token Generation
- **Entropy Source**: `crypto.randomBytes(32)` providing 256 bits of cryptographic entropy.
- **Token Format**: 64-character hexadecimal string.
- **Dual Verification Mechanism**: A 32-byte direct URL token alongside an expiring 6-digit numeric OTP code (`two_factor_otps`) for backward compatibility with 6-digit code UI dialogs.

### 3.2 Database Persistence via One-Way Hashing
Tokens are NEVER stored in plaintext in the database:
- The raw token is hashed via SHA-256 before insertion into `password_reset_tokens`.
- Stored record:
  - `id`: UUID v4
  - `user_id`: Reference to `users.id`
  - `token_hash`: SHA-256 digest of the raw token
  - `expires_at`: `NOW() + INTERVAL '60 minutes'`
  - `used_at`: Timestamp populated upon consumption (`NULL` prior to consumption)

### 3.3 Atomic Single-Use Consumption (`POST /api/auth/reset-password`)
When a password reset request is received:
1. The submitted token is hashed: `sha256(rawToken)`.
2. A single atomic query verifies validity:
   ```sql
   SELECT id, user_id, expires_at, used_at
   FROM password_reset_tokens
   WHERE token_hash = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW()
   LIMIT 1;
   ```
3. If valid, the token is atomically consumed:
   ```sql
   UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1;
   ```
4. All other existing reset tokens for that user are revoked.
5. Any subsequent replay of the token fails immediately with HTTP 400.

---

## 4. Active Device Session Invalidation (`PWD-003`)

### 4.1 Security Requirement
When a user resets their password (often initiated due to suspected account compromise or stolen credentials), all active device sessions, JWT refresh tokens, and mobile sessions across all devices must be instantly invalidated.

### 4.2 Implementation (`revokeAllSessions`)
Located in `server/src/services/device-session.service.ts`:
```typescript
export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await prisma.deviceSession.updateMany({
    where: {
      userId,
      revoked: false,
    },
    data: {
      revoked: true,
      revokedAt: new Date(),
    },
  });
  return result.count;
}
```
Every authentication check (`requireAuth`) queries the database to ensure `session.revoked === false`. Revoked sessions immediately reject subsequent requests with HTTP 401.

### 4.3 Branded Security Alert Dispatch
Upon successful reset, the system queues a security notification email (`sendPasswordChangedEmail`) informing the user that their password was changed, noting the exact timestamp, and warning them that all active sessions have been signed out.

---

## 5. Verification Test Evidence

| Test ID | Scenario | Expected Behavior | Observed Result |
|---|---|---|---|
| `PWD-001.1` | Existing email forgot-password request | Generic 200 response | **HTTP 200 (PASSED)** |
| `PWD-001.2` | Non-existing email forgot-password request | Identical 200 response | **HTTP 200 (PASSED)** |
| `PWD-002.1` | Password reset with valid 32-byte token | Password updated in DB | **HTTP 200 (PASSED)** |
| `PWD-002.2` | Token replay attack | Replay rejected (HTTP 400) | **HTTP 400 (PASSED)** |
| `PWD-002.3` | Tampered token submission | Rejected (HTTP 400) | **HTTP 400 (PASSED)** |
| `PWD-003.1` | Active sessions exist prior to reset | Sessions active | **2 Sessions Active (PASSED)** |
| `PWD-003.2` | Active sessions after password reset | All sessions revoked | **0 Sessions Active (PASSED)** |
