# MASTERHRMS — WEB PUSH NOTIFICATION DEDUPLICATION VERIFICATION

## 1. Problem Statement

In `public/sw.js`, the service worker previously suppressed all OS push notifications whenever any MasterHRMS browser tab was focused and visible:
```javascript
const hasVisibleFocusedClient = clients.some(
  (c) => c.focused && c.visibilityState === "visible"
);
if (hasVisibleFocusedClient) {
  return Promise.resolve();
}
```

### Unintended Side Effects:
1. **Missed Chat Messages**: If a user had the MasterHRMS web application open on the Dashboard, Attendance screen, or another chat conversation, any incoming chat message push was suppressed by the service worker.
2. **Zero System Alerts**: The user received no audio/visual OS notification that a teammate was messaging them.
3. **Inaccurate Deduplication**: Notifications were suppressed based on tab focus alone rather than active context alignment.

---

## 2. Refined Context-Aware Deduplication (`public/sw.js`)

The service worker was updated to inspect the push notification payload and evaluate whether the active visible client is viewing the **exact target conversation**:

```javascript
// Extract conversation identifier
const threadId = payload.threadId || payload.data?.threadId || payload.conversationId || payload.data?.conversationId;

// Determine if this is a chat message notification
const isChatNotification =
  type === "CHAT_MESSAGE" ||
  type === "chat:message" ||
  payload.module === "CHAT" ||
  Boolean(threadId);

const isSuppressedByActiveConversation = clients.some((c) => {
  if (!c.focused || c.visibilityState !== "visible") return false;
  if (!isChatNotification) {
    // For non-chat notifications, do not suppress if user is simply browsing
    return false;
  }
  // If it is a chat notification, only suppress if client is already viewing this exact conversation
  if (!threadId) return false;
  const cUrl = c.url || "";
  return (
    cUrl.includes(String(threadId)) ||
    cUrl.includes(`conversationId=${threadId}`) ||
    cUrl.includes(`threadId=${threadId}`)
  );
});

if (isSuppressedByActiveConversation) {
  return Promise.resolve();
}
```

---

## 3. Behavior Matrix

| Client Window State | Message Target | Previous Behavior | Corrected Behavior |
| :--- | :--- | :--- | :--- |
| **All windows closed** | Thread A | Shows OS notification | **Shows OS notification** |
| **App in background / minimized** | Thread A | Shows OS notification | **Shows OS notification** |
| **Tab open, screen locked** | Thread A | Shows OS notification | **Shows OS notification** |
| **Active tab on Dashboard (`/dashboard`)** | Thread A | ❌ Suppressed (missed) | **Shows OS notification** |
| **Active tab on Leave (`/leave`)** | Thread A | ❌ Suppressed (missed) | **Shows OS notification** |
| **Active tab in Chat Thread B** | Thread A | ❌ Suppressed (missed) | **Shows OS notification** |
| **Active tab in Chat Thread A** | Thread A | Suppressed | **Suppressed** (user actively reading) |
| **Incoming Video/Audio Call** | Any Call | Shows Ringing Notification | **Shows Ringing Notification** (always) |

---

## 4. Call Handling & Click Actions Preserved

- **Incoming Calls (`CALL_INCOMING`)**: Handled by Case 2 with `requireInteraction: true`, persistent ringing, and `Accept` / `Decline` action buttons.
- **Call Cancellations (`CALL_CANCELLED`)**: Broadcasts to all open clients and closes open notification banners.
- **Click Actions (`notificationclick`)**:
  - `Accept`: Focuses window, broadcasts `CALL_ACCEPTED_ON_DEVICE`, navigates to `/chat?callId=...`.
  - `Reject`: Sends reject API request to `/api/calls/:id/reject`, broadcasts `CALL_DECLINED_ON_DEVICE`.
  - Message Click: Focuses client window and navigates to `/chat?conversationId=...`.
