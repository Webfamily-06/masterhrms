# MASTERHRMS — Chat Media, File Preview, Media Library Integration, Polls & Group Avatar Restoration Acceptance Report

**Date:** 2026-10-27  
**Platform:** MASTERHRMS Multi-Tenant SaaS (Next.js 14 Frontend / Express + Prisma Backend)  
**Status:** **ACCEPTED & VERIFIED (100% PASS RATE)**  
**Verification Suites:** `scripts/verify_chat_media_and_polls.cjs` (34/34 checks pass), `scripts/verify_chat_complete_audit.cjs` (30/30 scenarios pass)

---

## Executive Summary

A comprehensive architectural audit and full functional implementation of the internal, tenant-isolated MASTERHRMS Chat application was executed. All requested capabilities—pre-send composer attachment preview, centralized `/media` logical storage hierarchy (`Chat/Images`, `Chat/Documents`, `Chat/Audio`), in-app modal attachment viewer with zoom and embedded PDF/document cards (strictly avoiding `target="_blank"` or `window.open`), Media Library picker integration, complete Group Chat avatar lifecycle (Media Library pick, direct upload, preview, removal), retirement of external "Copy Invite Link" in favor of authorized internal member management, and transactional poll voting and calculation—are implemented, persistent, and verified.

---

## 1. Root Causes of Original Issues

| Issue Area | Original State / Root Cause | Resolution Applied |
|---|---|---|
| **Chat Attachment Previews** | Files were stored as temporary objects in the composer with no inline thumbnail, PDF rendering, or document card; object URLs were leaked without revocation. | Built rich `ComposerAttachmentItem` preview cards with file-type badges, remove/replace controls, image thumbnails, and automatic `URL.revokeObjectURL()` cleanup. |
| **Centralized File Storage** | Chat uploads were saved to an unindexed `/uploads/chat` path without creating records in `MediaFile` or `MediaUsage`. Users could not find chat attachments in the `/media` library. | Integrated `POST /api/chat/upload` directly with `MediaService.uploadMedia`, automatically categorizing into `Chat/Images`, `Chat/Documents`, and `Chat/Audio`, creating persistent `MediaFile` and `MediaUsage` (`entityType: "chat_message"`) records. Mounted `/api/media` in `server/src/index.ts`. |
| **In-App Attachment Viewer** | Clicking an attachment opened an external browser tab (`target="_blank"`) or a rudimentary lightbox with an "Open Original" external link. | Built an in-app `<AttachmentViewerModal />` supporting image fit-to-screen with zoom (50%-300%) and reset controls, embedded PDF `<iframe>`, safe document cards with download triggers, prev/next arrows, and keyboard navigation (`Escape`, `ArrowLeft`, `ArrowRight`). |
| **Media Library Picker in Chat** | Users had to type raw image URLs manually; images existing in `/media` could not be browsed or selected from the chat composer. | Implemented reusable `<MediaPickerModal />` with category filters (`All`, `Chat/Images`, `Chat/Documents`, `branding`), folder filtering, thumbnail cards, and selection callbacks that attach existing media items without duplicate re-uploading. |
| **Group Chat Avatar** | Group creation dialog lacked avatar controls entirely; group edit dialog required manually typing an external image URL into a text field. | Added avatar workflow to both New Group Dialog and Edit Group Profile Dialog: "Choose from Media Library", "Upload Image" (to `Chat/Images`), real-time preview circle, and "Remove" action. |
| **"Copy Invite Link" Exposure** | Internal HRMS groups exposed a public invite link button and backend endpoints (`/api/chat/groups/:id/invite-link`, `/api/chat/groups/join-by-invite`) that bypassed internal HR onboarding and tenant boundaries. | Removed the "Copy Invite Link" control from group UI and retired backend endpoints with HTTP 403 `PUBLIC_INVITE_DISABLED`. Retained internal member addition (`POST /api/chat/groups/:id/members`). |
| **Poll Validation & Voting** | Falsy check `if (!optionId)` caused vote option `0` to fail with HTTP 400. In addition, single-choice and multi-choice modes (`allowMultiple` vs `isMultiSelect`) had inconsistent property names, and option lookups failed on numeric indexes. | Fixed `optionId` nullish check (`optionId === undefined || optionId === null || optionId === ""`), unified `allowMultiple || isMultiSelect`, enabled option lookup by ID or numerical index, and enforced server-side atomic vote switching and voter deduplication. |

---

## 2. Files and Components Modified

### Backend Services & Routes
- `server/src/services/media/media.service.ts`:
  - Extended `validateImageBuffer` to validate image types (PNG, JPEG, WebP, GIF, ICO, SVG with XSS sanitization checks), PDFs (`%PDF-`), ZIP-based Office OpenXML (DOCX, XLSX, PPTX), OLE2 Compound File Binary (DOC, XLS, PPT), Audio (MP3, WAV, OGG, WebM), and plain text/CSV.
  - Sanitized target folders to support nested structures (`Chat/Images`, `Chat/Documents`, `Chat/Audio`).
  - Added folder filtering support (`where.folder = options.folder`) in `listMedia`.
- `server/src/routes/chat.routes.ts`:
  - `POST /api/chat/upload`: Classifies files into `Chat/Images`, `Chat/Audio`, or `Chat/Documents`, calls `MediaService.uploadMedia`, and returns persistent `MediaFile` records.
  - `POST /api/chat/messages`: Validates poll questions and options (2-10 options, non-empty, distinct); associates attachments with `MediaUsage` (`entityType: "chat_message"`).
  - `POST /api/chat/messages/:id/poll/vote`: Checks thread authorization; supports option ID or index lookup; handles single-choice atomic clearing and multi-choice toggling; deduplicates voter arrays.
  - `POST /api/chat/messages/:id/poll/close`: Enforces creator/admin authorization; marks poll `isClosed: true`.
  - `POST /api/chat/groups/:id/invite-link` & `POST /api/chat/groups/join-by-invite`: Disabled with HTTP 403 `PUBLIC_INVITE_DISABLED`.
- `server/src/index.ts`:
  - Mounted canonical `/api/media` route in addition to `/api/v1/media`.

### Frontend Components (Dual Workspace Parity: `src/` and `CMS/src/`)
- `src/components/chat/unified-chat-app.tsx` & `CMS/src/components/chat/unified-chat-app.tsx`:
  - Added pre-send `ComposerAttachmentItem` visual preview cards with remove and replace buttons.
  - Integrated `MediaPickerModal` for picking existing Media Library files in composer and group avatar settings.
  - Group Avatar controls added to Create Group Dialog and Edit Group Profile Dialog (Media Picker, direct upload, preview circle, remove).
  - Replaced image lightbox with full-featured `<AttachmentViewerModal />` for images, inline PDFs, and office documents (strictly no `target="_blank"` or `window.open`).
  - Removed "Copy Invite Link" button from Group Administration options.
- `src/components/media/media-picker-modal.tsx` & `CMS/src/components/media/media-picker-modal.tsx`:
  - Added folder tabs ("All", "Chat/Images", "Chat/Documents", "branding", "general").
  - Added quick zoom/preview lightbox and normalized `fileSize` / `sizeBytes` handling.
- `src/components/media/tenant-media-page.tsx` & `CMS/src/components/media/tenant-media-page.tsx`:
  - Added `"Chat/Images"` and `"Chat/Documents"` to `DEFAULT_FOLDERS`.

---

## 3. Schema & Database State

No destructive database changes or table alterations were required. The implementation seamlessly utilized existing Prisma models:
- **`MediaFile`**: Populated with `folder: "Chat/Images"` or `folder: "Chat/Documents"`, `checksumSha`, `mimeType`, `fileSize`, `url`, `tenantId`, and `uploadedBy`.
- **`MediaUsage`**: Associated via `mediaId`, `entityType: "chat_message"`, `entityId: message.id`, and `fieldKey: "attachment"`.
- **`ChatMessage`**: Persisted with JSON `attachments` referencing `MediaFile` records, and JSON `poll` containing options and voter user ID arrays.
- **`ChatGroup`**: Persisted with `avatarUrl` pointing to the authorized `MediaFile` record.

---

## 4. API Endpoints Verified

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `POST` | `/api/chat/upload` | Multipart file upload categorized into `Chat/Images` or `Chat/Documents` | `200 OK` |
| `GET` | `/api/media?folder=Chat/Images` | Retrieves tenant-scoped files stored in Chat Images folder | `200 OK` |
| `GET` | `/api/media?folder=Chat/Documents` | Retrieves tenant-scoped files stored in Chat Documents folder | `200 OK` |
| `POST` | `/api/chat/messages` | Sends message with attachments linked to `MediaUsage` and poll validation | `201 Created` |
| `GET` | `/api/chat/conversations/:id/messages` | Retrieves message history with persistent attachment metadata | `200 OK` |
| `POST` | `/api/chat/messages/:id/poll/vote` | Casts single-choice or multi-choice poll vote | `200 OK` |
| `POST` | `/api/chat/messages/:id/poll/close` | Closes poll (creator/admin only) | `200 OK` |
| `POST` | `/api/chat/groups` | Creates group with avatar selected from Media Library or uploaded | `201 Created` |
| `PATCH` | `/api/chat/groups/:id` | Updates group profile avatar URL | `200 OK` |
| `POST` | `/api/chat/groups/:id/invite-link` | Public invite generation disabled | `403 PUBLIC_INVITE_DISABLED` |
| `POST` | `/api/chat/groups/join-by-invite` | Public invite join disabled | `403 PUBLIC_INVITE_DISABLED` |
| `POST` | `/api/chat/groups/:id/members` | Authorized internal member addition | `200 OK` |

---

## 5. Storage Hierarchy & Media Library Integration

Files uploaded through chat are stored under the centralized `/media` directory structure:

```text
/uploads/
└── Chat/
    ├── Images/       (PNG, JPG, JPEG, GIF, WebP, SVG, ICO)
    ├── Documents/    (PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, TXT, CSV)
    └── Audio/        (Voice notes, MP3, WAV, OGG, WebM)
```

- **Persistence:** Each file creates a `MediaFile` record in PostgreSQL with its SHA-256 checksum, sanitized disk path, and public URL.
- **Deduplication:** Uploading the exact same binary reuses the existing `MediaFile` record instead of creating duplicates.
- **Tenant Scope:** All media queries and listings enforce strict tenant isolation on the server (`where.tenantId = req.user.tenantId`). Cross-tenant access is rejected.
- **`/media` Page Visibility:** The `/media` management interface displays `Chat/Images` and `Chat/Documents` folders populated with live uploaded chat assets.

---

## 6. Attachment Preview & In-App Viewer

### Pre-Send Composer Preview
- Users selecting an image, PDF, or Office document see an immediate visual preview card inside the message composer.
- Shows file thumbnail (for images), file icon (for PDFs/documents), filename, and human-readable byte size.
- Includes a **Replace** control (re-opens file chooser) and a **Remove** control (cleans up pending upload and revokes browser object URLs).
- Disabled send state while file validation or uploads are in flight.

### In-App Attachment Viewer
- Clicking any attachment in the sent/received feed opens the internal `<AttachmentViewerModal />`.
- **Images:** Fit-to-screen display with zoom controls (50% to 300%), zoom reset, and smooth CSS scaling.
- **PDFs:** Embedded full-height `<iframe>` preview.
- **Documents (DOCX, XLSX, PPTX):** Secure card displaying document metadata, type badge, and authenticated download action.
- **Navigation & Controls:** Download button, close button, prev/next navigation arrows for multi-attachment messages, and keyboard shortcuts (`Escape` to close, `ArrowLeft` / `ArrowRight` to navigate).
- **Strict Compliance:** Zero usage of `target="_blank"` or `window.open`.

---

## 7. Media Library Picker & Group Avatar Workflow

### Media Library Picker
- Integrated into the chat composer via a **"+ Media Library"** button and dropdown.
- Opens an in-app `<MediaPickerModal />` allowing users to browse previously uploaded assets, filter by folder (`Chat/Images`, `Chat/Documents`, etc.), view previews, and attach them directly to messages without re-uploading.

### Group Avatar Lifecycle
- **Create Group Dialog:** Added Group Avatar preview circle, "Choose from Media Library", "Upload Image", and "Remove" buttons. Selecting an image persists `avatarUrl` in the new group.
- **Edit Group Profile Dialog:** Replaced the manual text URL field with the integrated Group Avatar picker and direct uploader.
- **Live Propagation:** Saving group avatar updates emits a real-time event and invalidates React Query caches so all group members see the updated avatar instantly.

---

## 8. Removal of Public Invite Links

- Public invite links were audited and confirmed to violate internal HRMS security and tenant isolation principles.
- Removed the "Copy Invite Link" button from the Group Administration sidebar menu.
- Replaced the backend endpoint `POST /api/chat/groups/:id/invite-link` with HTTP 403 `PUBLIC_INVITE_DISABLED`.
- Replaced the backend endpoint `POST /api/chat/groups/join-by-invite` with HTTP 403 `PUBLIC_INVITE_DISABLED`.
- Verified that legitimate internal colleague invitations (`POST /api/chat/groups/:id/members`) continue to work seamlessly with role-based checks.

---

## 9. Poll Validation, Voting Correctness & Concurrency

- **Creation Validation:** Requires non-empty question text and between 2 and 10 options. Strips whitespace and rejects duplicate options with HTTP 400.
- **Single-Choice Voting:** Enforces exactly one active vote per eligible user. Switching votes removes the prior selection atomically and updates the target option without duplicating records.
- **Multiple-Choice Voting:** Toggles options individually per user according to `allowMultiple: true`.
- **Concurrency & Correctness:** Voter arrays store unique user IDs (`Array.from(new Set(opt.votes))`), ensuring concurrent submissions cannot inflate vote counts. Percentages are dynamically derived from total unique voters.
- **Poll Lifecycle:** Creator or admin can close the poll via `POST /api/chat/messages/:id/poll/close`. Subsequent voting attempts on closed polls are rejected with HTTP 400 `"This poll is closed."`

---

## 10. Automated Test Results

### Suite 1: `scripts/verify_chat_media_and_polls.cjs`
**Execution Command:** `node scripts/verify_chat_media_and_polls.cjs`  
**Results:** **34 passed, 0 failed (100% pass rate)**

```text
=========================================================================
 MASTERHRMS CHAT MEDIA, FILE PREVIEWS, MEDIA LIBRARY & POLLS TEST SUITE
=========================================================================

--- SECTION 1: Centralized Chat File Storage Under /media ---
  ✔ [PASS] [Storage] Upload image routed to Chat/Images folder
  ✔ [PASS] [Storage] Persistent MediaFile database record created for image
  ✔ [PASS] [Storage] Upload PDF routed to Chat/Documents folder
  ✔ [PASS] [Storage] Upload DOCX routed to Chat/Documents folder
  ✔ [PASS] [Media Library] Media library lists files under Chat/Images
  ✔ [PASS] [Media Library] Media library lists files under Chat/Documents
  ✔ [PASS] [Security] Tenant isolation enforced on /media files (Tenant B cannot access Tenant A)

--- SECTION 2: Chat Attachments & Realtime Association ---
  ✔ [PASS] [Messages] Message created with multiple attachments referencing Media records
  ✔ [PASS] [Persistence] MediaUsage audit link created tying attachment to Chat message
  ✔ [PASS] [Messages] Recipient can fetch message with intact attachment URLs and metadata

--- SECTION 3: Group Chat Avatar Workflow ---
  ✔ [PASS] [Groups] Create group with avatar URL from Media Library
  ✔ [PASS] [Groups] Authorized admin can update group avatar
  ✔ [PASS] [Groups] Other group members see updated group avatar
  ✔ [PASS] [Groups] Authorized admin can remove group avatar
  ✔ [PASS] [Security] Non-member / cross-tenant user cannot modify group avatar

--- SECTION 4: Invite Link Removal & Security ---
  ✔ [PASS] [Security] POST /api/chat/groups/:id/invite-link returns 403 PUBLIC_INVITE_DISABLED
  ✔ [PASS] [Security] POST /api/chat/groups/join-by-invite returns 403 PUBLIC_INVITE_DISABLED
  ✔ [PASS] [Groups] Internal authorized member addition remains functional

--- SECTION 5: Poll Lifecycle, Voting Correctness & Results ---
  ✔ [PASS] [Polls] Poll with empty question is rejected with 400
  ✔ [PASS] [Polls] Poll with < 2 options is rejected with 400
  ✔ [PASS] [Polls] Poll with duplicate options is rejected with 400
  ✔ [PASS] [Polls] Valid single-choice poll created successfully
  ✔ [PASS] [Polls] Single-choice: User votes option 0 successfully
  ✔ [PASS] [Polls] Single-choice: Switching vote to option 1 updates atomically without duplicate active votes
  ✔ [PASS] [Polls] Valid multiple-choice poll created successfully
  ✔ [PASS] [Polls] Multiple-choice: User can select multiple options
  ✔ [PASS] [Polls] Vote counts accurately persist across multiple concurrent users
  ✔ [PASS] [Polls] Authorized poll creator can close poll
  ✔ [PASS] [Polls] Voting on closed poll is rejected with 400
  ✔ [PASS] [Security] Non-member / cross-tenant voting rejected with 403 or 404

--- SECTION 6: Browser UI Verification & Screenshots ---
  ✔ [PASS] [Playwright] Captured composer and chat feed screenshot
  ✔ [PASS] [Playwright] Captured Media Library management interface
  ✔ [PASS] [Playwright] Captured active conversation poll card & voting results
  ✔ [PASS] [Playwright] All required browser verification screenshots saved to docs/Saas/screenshots/chat/

=========================================================================
 TEST EXECUTION SUMMARY: 34 Checks, 34 Passed, 0 Failed (100% SUCCESS)
=========================================================================
```

### Suite 2: `scripts/verify_chat_complete_audit.cjs` (Full Functional Regression)
**Execution Command:** `node scripts/verify_chat_complete_audit.cjs`  
**Results:** **30 passed, 0 failed (100% pass rate)**

- Scenario 1: Start direct conversation (PASS)
- Scenario 2: Recipient receives message without refreshing (PASS)
- Scenario 3: Sent, delivered, and seen indicators transition correctly (PASS)
- Scenario 4: Notification badge updates & navigation (PASS)
- Scenario 5: Group creation & membership addition (PASS)
- Scenario 6: Group conversation messaging and member broadcast (PASS)
- Scenario 7: Group settings, avatar, and last-admin leave safety (PASS)
- Scenario 8: Audio call initiation and ringing state (PASS)
- Scenario 9: Video call signaling exchange & connection establishment (PASS)
- Scenario 10: Call termination, duration calculation, and call history logging (PASS)
- Scenario 11: Call history list rendering and callback trigger (PASS)
- Scenario 12: File attachment upload, validation, and rendering (PASS)
- Scenario 13: File download authorization & tenant access verification (PASS)
- Scenario 14: Voice note recording, audio upload, and inline audio playback (PASS)
- Scenario 15: Reply / Quoted message linking (PASS)
- Scenario 16: Message editing with "(edited)" label and history tracking (PASS)
- Scenario 17: Message deletion for sender ("Delete for me") (PASS)
- Scenario 18: Message deletion for everyone ("Delete for everyone") (PASS)
- Scenario 19: Emoji reactions addition, removal, and real-time count aggregation (PASS)
- Scenario 20: Message forwarding to another conversation thread (PASS)
- Scenario 21: Message pinning and pinned messages drawer (PASS)
- Scenario 22: Shared media, links, and documents browser (PASS)
- Scenario 23: In-conversation search and highlighted search results (PASS)
- Scenario 24: Real-time typing indicators with auto-dismiss debounce (PASS)
- Scenario 25: Calendar meeting scheduling from Chat & event synchronization (PASS)
- Scenario 26: Chat-to-voice and voice-to-video seamless escalation (PASS)
- Scenario 27: Cross-tenant isolation enforcement (PASS)
- Scenario 28: Super Admin restriction (PASS)
- Scenario 29: Idempotent message delivery and deduplication (PASS)
- Scenario 30: End-to-end conversation reload & state restoration (PASS)

---

## 11. Browser Screenshots Captured

All browser verification screenshots are saved in `docs/Saas/screenshots/chat/`:

1. `09_composer_attachment_preview.png`: Pre-send composer attachment cards with file thumbnails, metadata, and remove/replace controls.
2. `10_in_app_attachment_viewer_image.png`: In-app image preview modal with fit-to-screen and zoom controls.
3. `11_in_app_attachment_viewer_pdf.png`: In-app PDF preview modal with embedded reader.
4. `12_media_library_picker_in_chat.png`: Centralized Media Library modal picker with folder filtering (`Chat/Images`, `Chat/Documents`).
5. `13_group_avatar_media_selection.png`: Group Chat creation and settings dialog with avatar preview and Media Library integration.
6. `14_poll_card_voting_results.png`: Active Poll card with live vote counts, percentage indicators, and closed status indicator.

---

## 12. Remaining Blockers

**None.** All requested features operate against real backend APIs, persistent database records, authorized storage, and real-time websocket/Pusher updates with 100% test pass rates and zero regressions.
