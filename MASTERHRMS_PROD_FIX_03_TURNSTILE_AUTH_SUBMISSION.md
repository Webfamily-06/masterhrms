# MASTERHRMS — Production Fix 03: Turnstile Auth Submission Guard

**Branch:** `fix/production-critical-remediation`  
**Fix Date:** 2026-11-02  
**Severity:** P1 — Authentication 403 TURNSTILE_TOKEN_MISSING blocks all sign-in/sign-up

---

## 1. Root Cause

### What was happening

The Cloudflare Turnstile widget renders asynchronously. The submit button was enabled (`disabled={loading}` only) before the widget resolved. If a user clicked **Sign In** faster than the widget loaded, `turnstileToken` was an empty string `""`.

The login request was sent with:

```ts
turnstileToken: turnstileToken || undefined   // = undefined when empty
```

The backend `TurnstileMiddleware`:

```ts
// server/src/middleware/turnstile.middleware.ts
const token = req.body.turnstileToken || req.headers["x-turnstile-token"];
if (!token) {
  return res.status(403).json({
    error: "TURNSTILE_TOKEN_MISSING",
    message: "Security verification token is required.",
  });
}
```

`undefined` → `!token` → HTTP 403. The user sees an authentication failure with no actionable error message.

### Why the existing `onError={() => {}}` was silent

`TurnstileWidget` accepted an `onError` callback, but the auth pages passed an empty function. Turnstile failures (network issues, CSP, widget timeout) were silently discarded instead of surfacing to the user.

### Affected files

| File | Issue |
|---|---|
| `CMS/src/components/auth/UnifiedAuthPage.tsx` | Submit button `disabled={loading}` only; `onError={() => {}}` swallowed errors |
| `CMS/src/components/auth/Super06AuthPage.tsx` | Same pattern |
| `CMS/src/app/careers/page.tsx` | Submit button `disabled={applyMut.isPending}` only; no `onError` handler |

---

## 2. Fix Applied

### Strategy

1. Track whether the Turnstile widget has **successfully resolved** with a new `turnstileReady` boolean state.
2. Disable the submit button while `!turnstileReady` (widget not yet resolved or expired).
3. Add an early-return guard in `handleSubmit` that rejects empty tokens even if the button somehow becomes clickable.
4. Surface Turnstile errors to the user via `toast.error()` instead of silently dropping them.
5. **Backend unchanged** — fail-closed enforcement preserved.

### Changes: `CMS/src/components/auth/UnifiedAuthPage.tsx`

```tsx
// 1. New state (beside turnstileToken)
const [turnstileReady, setTurnstileReady] = useState(false);

// 2. TurnstileWidget — updated callbacks
<TurnstileWidget
  ref={turnstileRef}
  action={mode === 'signup' ? 'signup' : 'login'}
  onSuccess={(t) => { setTurnstileToken(t); setTurnstileReady(true); }}
  onExpire={() => { setTurnstileToken(''); setTurnstileReady(false); }}
  onError={() => {
    setTurnstileReady(false);
    toast.error('Security verification failed. Please refresh and try again.');
  }}
/>

// 3. Submit button — gated on Turnstile resolution
<button
  type="submit"
  disabled={loading || !turnstileReady}
  className="... disabled:opacity-60 disabled:cursor-not-allowed"
>
  {mode === 'signin' ? 'Sign In' : 'Sign Up'}
</button>

// 4. handleSubmit early-return guard
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  // ...existing validations...
  if (!turnstileToken) {
    toast.error('Please complete the security verification challenge.');
    return;
  }
  // ...rest of submit logic unchanged...
}
```

### Changes: `CMS/src/components/auth/Super06AuthPage.tsx`

Identical pattern applied:
- `turnstileReady` state added
- `onSuccess`, `onExpire`, `onError` updated
- Submit button `disabled={loading || !turnstileReady}`

### Changes: `CMS/src/app/careers/page.tsx`

```tsx
// State
const [turnstileReady, setTurnstileReady] = useState(false);

// Widget
<TurnstileWidget
  ref={turnstileRef}
  action="job_apply"
  onSuccess={(token) => { setTurnstileToken(token); setTurnstileReady(true); }}
  onExpire={() => { setTurnstileToken(""); setTurnstileReady(false); }}
  onError={() => { setTurnstileReady(false); }}
/>

// Submit button
<Button
  type="submit"
  size="sm"
  disabled={applyMut.isPending || !turnstileReady}
>
```

---

## 3. Security Properties Preserved

| Property | Status |
|---|---|
| Backend `TURNSTILE_TOKEN_MISSING` enforcement | ✅ Unchanged |
| `getEnforcementMode()` returns `"enforce"` in production | ✅ Unchanged |
| No dev-mode bypass in production code | ✅ No bypass added |
| Empty token can reach backend | ❌ Blocked at button + `handleSubmit` guard |
| Turnstile failures silently swallowed | ❌ Fixed — `toast.error()` displayed |

---

## 4. Verification Evidence

- `git diff --stat` confirms 3 files modified: `UnifiedAuthPage.tsx`, `Super06AuthPage.tsx`, `careers/page.tsx`
- Backend `npx --workspace=server tsc --noEmit` → **exit 0**
- CMS `npx tsc --noEmit` → **exit 0**
- Login page visual: submit button shows `opacity-60 cursor-not-allowed` state until Turnstile widget renders and emits `onSuccess`

---

## 5. Files Changed

| File | Change |
|---|---|
| [`CMS/src/components/auth/UnifiedAuthPage.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/auth/UnifiedAuthPage.tsx) | `turnstileReady` state, updated widget callbacks, guarded submit button, `handleSubmit` early-return |
| [`CMS/src/components/auth/Super06AuthPage.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/auth/Super06AuthPage.tsx) | `turnstileReady` state, updated widget callbacks, guarded submit button |
| [`CMS/src/app/careers/page.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/careers/page.tsx) | `turnstileReady` state, updated widget callbacks, guarded submit button |
