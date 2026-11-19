# MASTERHRMS MOBILE APP — CHAT & CALLING SECURITY REPORT

**Document ID:** DOC-MOB-SEC-010  
**Project:** MasterHRMS Mobile Application (`mobile-app/`)  
**Scope:** Tenant Isolation, Role Authorization, Attachment Restrictions, JWT Token Security & Media Safety  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary

This report documents the security posture of the chat, attachment, reaction, and WebRTC calling implementations within the MasterHRMS mobile application.

All mobile integrations adhere to the enterprise multi-tenant boundary, zero-trust backend authorization, strict MIME/extension whitelisting, URL sanitization against script injection, and role-based moderation rules.

---

## 2. Multi-Tenant Isolation & Authentication Boundaries

### Tenant Context Propagation:
Every mobile request dispatched via `apiClient` automatically injects:
1. `Authorization: Bearer <JWT>` containing verified tenant claims (`tenantId`, `userId`, `roles`).
2. `x-tenant-id: <slug|uuid>` header for redundant tenant isolation.
3. Chat threads and call invitations are strictly segmented by `tenantId`. A user from `Tenant-A` cannot query, view, react to, or participate in calls or messages belonging to `Tenant-B`.

---

## 3. Attachment Security & Extension Blocking

Reconciled with backend security policy `server/src/routes/chat.routes.ts`:

### 3.1 Blocked Extensions (`CHAT_RESTRICTED_EXTENSIONS`):
The following executable, script, template, and certificate extensions are strictly blocked on the mobile client before upload:
```typescript
'exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'apk', 'com', 'vbs', 'ps1',
'scr', 'pif', 'app', 'dmg', 'pkg', 'deb', 'rpm', 'env', 'json', 'js',
'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'php', 'py', 'pyc', 'rb', 'go',
'java', 'class', 'jar', 'c', 'cpp', 'h', 'hpp', 'cs', 'sql', 'bash',
'zsh', 'lua', 'pl', 'asp', 'aspx', 'jsp', 'wasm', 'yaml', 'yml', 'pem',
'key', 'crt', 'cer', 'pfx', 'p12', 'svg', 'svgz', 'html', 'htm', 'xhtml', 'hta'
```

### 3.2 Maximum File Size & Attachment Counts:
- Maximum individual file size: `30 MB` (`MAX_CHAT_FILE_SIZE_BYTES`). Files exceeding this limit are blocked with a clear user alert.
- Maximum attachments per message: `10` (`MAX_CHAT_ATTACHMENTS_PER_MESSAGE`).

### 3.3 Safe URL Scheme Validation (`resolveSafeBackendUrl`):
All attachment URLs, avatars, and media URLs are validated before rendering. Rejects dangerous schemes:
- `javascript:`
- `data:`
- `vbscript:`
- `file:`
Relative backend paths (`/uploads/...`) are resolved securely against `Config.API_BASE_URL`.

---

## 4. Role Permissions & Moderation Rules

1. **Delete for Everyone (`canModerateMembers`):**
   - Regular members can only delete their own messages if sent within the last 24 hours.
   - Group Owners and Administrators can delete any message for everyone at any time.
2. **Announcement Channels (`effectiveAnnouncementOnly`):**
   - Regular members can only view messages.
   - Text composer, voice recording, camera, and attachment controls are disabled with an announcement lock banner for non-admin members.
3. **Group Moderation & Participant Removal:**
   - Only group owners and administrators can remove participants, transfer ownership, or revoke invite links.

---

## 5. Media & Signaling Security

- WebRTC signaling messages (`call:invite`, `call:signal`, `call:media-state`) are strictly authenticated via WebSocket handshake JWT tokens.
- Calls cannot be joined without valid authorization in the relevant thread or invitation roster.
- Peer heartbeats time out after 5 seconds of inactivity, terminating unauthenticated or dangling sessions.
