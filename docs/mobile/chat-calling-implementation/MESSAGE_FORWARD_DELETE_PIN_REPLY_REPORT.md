# MASTERHRMS MOBILE APP — MESSAGE FORWARD, DELETE, PIN & REPLY IMPLEMENTATION REPORT

**Document ID:** DOC-MOB-FWD-DEL-PIN-REP-003  
**Project:** MasterHRMS Mobile Application (`mobile-app/`)  
**Scope:** Message Forwarding, Deletion Modals, Pinning, and Quoted Replies  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary

This report documents the implementation of:
- **GAP 2.3 (Forward Message):** Multi-recipient forwarding with Organization User Directory search, profile avatars, designations, and batch dispatch via `POST /api/chat/messages/forward-batch`.
- **GAP 2.4 (Delete Message):** WhatsApp-style delete sheet with "Delete for me" vs "Delete for everyone" options.
- **GAP 2.5 (Pin Message):** Pinning/unpinning, pinned message banner indicator at top of chat, and tap-to-scroll navigation directly to pinned messages.
- **GAP 2.6 (Reply Message):** Composer quote preview banner, sender name, cancellation control, and tap-to-scroll navigation to original messages from quotes in the chat history.

---

## 2. Detailed Feature Implementation

### 2.1 Forward Message with Org Directory (GAP 2.3)
1. **Modal Layout & Search:**
   - Realtime search filter by colleague name, email, department, or designation.
   - Combined list of active chat threads and directory colleagues from `ChatService.getContacts()`.
   - Each item shows profile avatar image or initials circle, full name, and department/designation subtitle.
2. **Multi-Selection:**
   - Checkboxes toggle selection state in `forwardThreadIds`.
   - Action button updates count dynamically: `Forward (${forwardThreadIds.length})`.
3. **Execution Pipeline:**
   - For direct contacts without an active thread, `ChatService.createDirectConversation(targetUserId)` is invoked on the fly to obtain or establish their thread ID.
   - Batch request dispatched to `POST /api/chat/messages/forward-batch` with payload `{ messageId, targetThreadIds }`.
   - Informs user with `Alert.alert('Forwarded', 'Message forwarded to N recipient(s).')`.

### 2.2 Delete Message Modal (GAP 2.4)
1. **Modal Presentation:**
   - Bottom sheet displaying: "Delete message? You can choose to delete this message for yourself, or delete it for everyone in this chat."
2. **"Delete for me":**
   - Calls `ChatService.deleteMessage(msg.id, 'me')`.
   - Dispatches `DELETE /api/chat/messages/:id?mode=me`.
   - Locally removes message from viewer's UI list while preserving it for other participants.
3. **"Delete for everyone":**
   - Available only if sender is current user (<24h old) or user has moderator/admin roles (`canModerateMembers`).
   - Dispatches `DELETE /api/chat/messages/:id?mode=everyone&forEveryone=true`.
   - Informs backend, which broadcasts `chat:message_deleted` via WebSocket and updates message content to "This message was deleted" in italics.

### 2.3 Pin Message & Top Banner Navigation (GAP 2.5)
1. **Pinning:**
   - Toggles pin state via `POST /api/chat/messages/:id/pin`.
   - Broadcasts `chat:message_pinned`.
2. **Top Pinned Banner:**
   - Positioned at top of chat below the header.
   - Displays pin icon, sender name, message index `Pinned (1/N)`, and preview snippet.
3. **Scroll Navigation:**
   - Message elements register their vertical layout position with `messageLayouts.current[msg.id] = e.nativeEvent.layout.y`.
   - Tapping the pinned banner smoothly scrolls the `ScrollView` directly to the pinned message position:
     ```typescript
     scrollToMessage(pinnedMessages[pinnedIdx % pinnedMessages.length].id);
     setPinnedIdx((i) => (i + 1) % pinnedMessages.length);
     ```

### 2.4 Quoted Replies & Composer Banner (GAP 2.6)
1. **Initiation:**
   - Swiping right on a message bubble or selecting "Reply" in the long-press menu sets `replyMessage`.
2. **Composer Banner:**
   - Renders above text input with primary color left accent line.
   - Displays "Replying to [Sender Name]" and message content preview.
   - Includes an "X" button to cancel reply.
3. **Message Transmission:**
   - Sends `replyToId: replyMessage.id` in `ChatService.sendMessage()`.
4. **Quoted Bubble Rendering & Navigation:**
   - Inside the recipient's bubble, `msg.replyTo` is rendered as an interactive quote card.
   - Tapping the quote card calls `scrollToMessage(msg.replyTo.id || msg.replyToId)`, automatically scrolling the chat directly to the original quoted message.

---

## 3. Verification

- All endpoints and behaviors verified in `mobile-app/__tests__/chat_calling_and_attachments.test.ts`.
- Verified batch forwarding dispatches correct array format.
- Verified delete query params distinguish `mode=me` vs `mode=everyone`.
- Verified pin and reaction contracts.
