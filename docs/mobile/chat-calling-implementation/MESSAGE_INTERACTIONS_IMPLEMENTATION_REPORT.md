# MASTERHRMS MOBILE APP — MESSAGE INTERACTIONS IMPLEMENTATION REPORT

**Document ID:** DOC-MOB-MSG-INT-002  
**Project:** MasterHRMS Mobile Application (`mobile-app/`)  
**Scope:** Message Interactions, Long-Press Menu, Quick Emoji Reactions, Realtime Sync  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary

This report documents the implementation of GAP 2.1 (Long-Press Message Interaction Menu) and GAP 2.2 (Emoji Reactions and Realtime Synchronization). The implementation complies with enterprise security boundaries, role permissions, and backend socket contracts.

---

## 2. Interaction Matrix

When a user long-presses any valid, non-deleted message bubble in `ChatConversationDetailScreen.tsx`:

| Action | UI Presentation | Trigger / Method | Backend Endpoint & Event |
| :--- | :--- | :--- | :--- |
| **Quick Emoji Bar** | Horizontal pill bar with 8 quick emojis (`👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`, `🎉`, `🔥`) | `handleReaction(msg.id, emoji)` | `POST /api/chat/messages/:id/react` (`chat:message_updated`) |
| **Reply** | Standard item with quote icon | `setReplyMessage(actionTargetMsg)` | Prepares composer quote banner with `replyToId` |
| **Forward** | Item with forward arrow icon | `setForwardModalOpen(true)` | Opens Organization Directory recipient selector |
| **Pin / Unpin** | Dynamic toggle label with pin icon | `handleTogglePinMessage(actionTargetMsg)` | `POST /api/chat/messages/:id/pin` (`chat:message_pinned`) |
| **Edit Message** | Displayed only if author is user and message is <24 hours old | Sets composer into edit mode | `PATCH /api/chat/messages/:id` (`chat:message_updated`) |
| **Delete Message** | Red highlight with trash icon | Opens delete confirmation sheet | `DELETE /api/chat/messages/:id` (`chat:message_deleted`) |

---

## 3. Emoji Reactions Implementation (GAP 2.2)

### Client Behavior:
1. Long-press triggers the quick reaction bar above the action menu.
2. Tapping an emoji dispatches `ChatService.reactToMessage(id, emoji)`.
3. The backend toggles the reaction:
   - If user already reacted with that emoji, their userId is removed.
   - If user had not reacted, their userId is added.
4. Messages display reaction pills below the bubble showing:
   - Emoji character
   - Aggregated count
   - Visual outline / tint if the current user is among the reactors.
5. Tapping any reaction pill below a message directly triggers the reaction toggle.

### Realtime Synchronization:
The screen registers a listener with `realtimeManager`:
```typescript
realtimeManager.subscribe('chat:message_updated', (payload) => {
  if (payload?.message?.id) {
    setMessages((prev) =>
      prev.map((m) => (m.id === payload.message.id ? normalizeChatMessage(payload.message) : m))
    );
  }
});
```
When any participant in the conversation adds or removes a reaction, all active mobile and web clients update instantly without page reloads.

---

## 4. Verification

- Verified with unit tests in `mobile-app/__tests__/chat_calling_and_attachments.test.ts`.
- Verified that reaction payload correctly serializes array and map forms in `normalizeReactions`.
- Verified that reaction count and user IDs are correctly displayed in reaction pills.
