# MASTERHRMS — PHASE 1: CALENDAR, CHAT & CONTACT MODULES AUDIT

**Project:** MasterHRMS Multi-Tenant SaaS  
**Phase:** 1 — Full Responsive Architecture Audit & Baseline (Read-Only)  
**Date:** October 31, 2026  
**Status:** AUDIT COMPLETE — BASELINE ESTABLISHED

---

## 1. Calendar Module Forensic Audit

### A. Component Architecture
All calendar routes across all four portals resolve to a single unified engine:
- **Core Component:** [`UnifiedCalendarApp`](file:///Users/apple/Documents/hrms/CMS/src/components/calendar/unified-calendar-app.tsx) (3,302 lines of code).
- **Libraries Used:** React 19, `@tanstack/react-query` v5, `date-fns` v4 (`format`, `startOfMonth`, `endOfWeek`, `eachDayOfInterval`), `lucide-react`, `sonner`.
- **Portals Mounted:**
  - Tenant Admin: `/tenant/calendar`
  - HR Admin: `/hr/calendar`
  - Employee: `/me/calendar`
  - Canonical Legacy: `/calendar`, `/apps/calendar`

```
                                  UnifiedCalendarApp
                ┌─────────────────────────┴────────────────────────┐
                │                                                  │
         Filter Sidebar                                   Main Calendar Area
       (aside w-64 shrink-0)                            (main flex-1 flex-col)
        - Create Event Button                             - Top Navigation Toolbar
        - Mini Month Calendar Picker                      - View Tabs (Month/Week/Day/List)
        - Upcoming Events List                            - Dynamic Grid Canvas
        - Category Checkbox Filters                       - Event Cells & Badges
        - Action Buttons (Refresh/Export)                 - Event Modal Dialogs
```

### B. Calendar Defect Analysis & Evidence

#### 1. Sidebar / Filter Panel Sizing Failure
- **Finding ID:** `CAL-001` (Severity: **CRITICAL**)
- **File:** `CMS/src/components/calendar/unified-calendar-app.tsx:1284-1286`
- **Defect:** `<aside className="w-64 border-r border-border bg-card flex flex-col justify-between shrink-0">` is completely unyielding and static.
- **Impact on Viewports:**
  - **Mobile Small (360x800) & Standard (390x844):** The sidebar consumes 256px of the available 360px–390px, leaving only 104px–134px for the calendar grid. The 7-column month grid columns collapse to ~15px wide each. Dates and event pills overlap into an unreadable vertical stripe.
  - **Tablet Portrait (768x1024):** The 256px sidebar takes 33% of the screen. While functional, the month grid cells are cramped to ~70px wide, truncating event titles after 4 characters.
- **Mandatory Correction:** The filter sidebar must be hidden on screens `< 1024px` (`hidden lg:flex lg:w-64`). On mobile/tablet, it must be mounted inside a responsive Slide-Over Drawer/Sheet triggered by a `<Filter />` button in the calendar toolbar.

#### 2. Toolbar Overflow & View Selector Collisions
- **Finding ID:** `CAL-002` (Severity: **HIGH**)
- **File:** `CMS/src/components/calendar/unified-calendar-app.tsx:1502-1550`
- **Defect:** Header toolbar is styled as `h-14 px-6 border-b flex items-center justify-between`.
- **Impact on Viewports:**
  - Contains 3 large inline blocks: (1) Today button + Prev/Next buttons (120px), (2) "October 2026" title (160px), (3) Month / Week / Day / List toggle pills (210px). Total minimum width required is >490px.
  - On screens `< 480px`, the view selector pills wrap below or overlap the title, pushing the Next chevron off-screen.
- **Mandatory Correction:** Implement a stacked 2-tier responsive toolbar:
  - Top tier: Month title + Today + Chevrons + Filter trigger button.
  - Bottom tier: Full-width segmented view switcher (`Month` | `Week` | `Day` | `List`).

#### 3. Month & Week Grid Mobile Usability
- **Finding ID:** `CAL-003` (Severity: **HIGH**)
- **File:** `CMS/src/components/calendar/unified-calendar-app.tsx:1650-1850`
- **Defect:** 7-column grid layout (`grid-cols-7`) without a mobile alternative view.
- **Impact:** On a phone screen (360px), 7 columns give only ~48px per day. Displaying multiple events per day causes vertical overflow that pushes the calendar beyond the viewport.
- **Mandatory Correction:** On mobile screens (< 640px), automatically default the view mode to **List View** or a **Single-Day / 3-Day Agenda View**, allowing full touch exploration with 44px touch targets.

#### 4. Event Creation & Details Modals
- **Finding ID:** `CAL-004` (Severity: **MEDIUM**)
- **File:** `CMS/src/components/calendar/unified-calendar-app.tsx:2800-3100`
- **Defect:** The Create Event modal contains Title, Category, Start/End DateTime pickers, Description textarea, and Share Recipient selector.
- **Impact:** Inside standard `DialogContent max-h-[85vh]`, when the software keyboard opens on a mobile phone, the submit button is obscured below the bottom fold.
- **Mandatory Correction:** Convert to a bottom `Drawer` on mobile devices with sticky footer actions.

---

## 2. Chat & Contacts Forensic Audit

### A. Component Architecture
All workspace chat routes resolve to:
- **Core Component:** [`UnifiedChatApp`](file:///Users/apple/Documents/hrms/CMS/src/components/chat/unified-chat-app.tsx) (8,696 lines of code).
- **Libraries Used:** React 19, Pusher JS (`pusher-js` v8.6.0), Socket.IO client (`socket.io-client` v4.8.4), WebRTC, `@tanstack/react-query` v5, `date-fns` v4.
- **Modes Supported:**
  1. Personal Direct Chats (`mode="chats"`)
  2. Group Conversations (`mode="groups"`)
  3. Real-time Audio/Video Calls & Schedules (`mode="calls"`)
  4. Workspace Contacts Directory (`mode="contacts"`)

```
                                  UnifiedChatApp
             ┌───────────────────────────┼───────────────────────────┐
             │                           │                           │
      Left Column: Lists          Center: Active View         Right Column: Details
    (aside w-full md:w-[320px])  (section flex-1 flex-col)  (aside w-full sm:w-[300px])
    - Personal / Group / Calls   - Conversation Header      - Profile / Group Avatar
    - Search & Filter Tabs       - Message Stream (Scroll)  - Media & Links Gallery
    - Conversation Item Cards    - Voice Note Player        - Shared Documents
    - Online / Unread Badges     - Composer & Attachments   - Member Roster (Groups)
```

### B. Chat & Contacts Defect Analysis & Evidence

#### 1. Right Info Drawer Screen Occlusion
- **Finding ID:** `CHAT-001` (Severity: **CRITICAL**)
- **File:** `CMS/src/components/chat/unified-chat-app.tsx:725` & `6251-6258`
- **Defect:** `const [showInfo, setShowInfo] = useState(true);`
- **Impact on Viewports:**
  - When a user taps a conversation on mobile (< 768px), `showInfo` is already `true`.
  - The right column mounts at `fixed md:static inset-y-0 right-0 z-40 w-full sm:w-[300px] bg-card`.
  - Because it is `w-full` on screens `< 640px` and `fixed`, it sits directly on top of the message stream. The user sees group or profile details instead of the active conversation, believing the chat did not open.
- **Mandatory Correction:**
  - Initialize `showInfo` to `false`.
  - On mobile and tablet (< 1024px), make the right drawer an explicitly invoked overlay modal/sheet that only appears when the user taps the info (i) button in the conversation header.

#### 2. Tablet Split-Pane Squeezing (768px - 1023px)
- **Finding ID:** `CHAT-002` (Severity: **HIGH**)
- **File:** `CMS/src/components/chat/unified-chat-app.tsx:3996-4003` & `6252`
- **Defect:** Left column is fixed at `md:w-[320px]`, Right drawer is `sm:w-[300px]`.
- **Impact on Viewports:**
  - On Tablet Portrait (768x1024): 320px (left) + 300px (right) = 620px.
  - The center conversation panel is compressed into `768px - 620px = 148px`.
  - The message bubbles, attachment images, and message composer are completely mangled inside 148px width.
- **Mandatory Correction:** On Tablet Portrait (768px–1023px), enforce a 2-panel architecture:
  - Left panel: 280px list.
  - Center panel: remaining 488px for active messages.
  - Right info drawer: MUST be hidden by default on tablet portrait, opening only as an off-canvas drawer.

#### 3. Inescapable Calls Mode on Mobile
- **Finding ID:** `CHAT-003` (Severity: **CRITICAL**)
- **File:** `CMS/src/components/chat/unified-chat-app.tsx:4000-4002`
- **Defect:** In `mode === "calls"`, line 4000 marks the left aside as `hidden md:flex`.
- **Impact:** The left aside contains the segmented navigation tabs (`Personal`, `Group`, `Calls`). When a mobile user switches to Calls mode, the aside disappears. The main area displays the call log table, but there is no navigation element allowing the user to return to `Personal` or `Group` chats. The user must reload the page or navigate away via the sidebar.
- **Mandatory Correction:** Move the segmented mode controller into a global header bar on mobile, or provide a visible "Back to Chats" navigation link in the Calls view header.

#### 4. Single-Panel Mobile Navigation Flow Enforcement
- **Finding ID:** `CHAT-004` (Severity: **HIGH**)
- **Defect:** On mobile, switching between Contacts, Conversations, and Chat views must obey a strict single-panel stack:
  ```
  Step 1: Contact / Conversation List (100% viewport width)
            │
            ▼ (User taps conversation or contact)
  Step 2: Active Chat View (100% viewport width) + Visible [< Back] button
            │
            ▼ (User taps profile/details)
  Step 3: Detail / Info Drawer (Sheet overlay)
  ```
  Currently, selecting a contact in `/tenant/chat/contacts` triggers `startDirectConversationMutation`, but if the target thread fails to set `activeThreadId` synchronously, the mobile screen flashes without navigating.
- **Mandatory Correction:** Ensure state transitions between list and thread views cleanly toggle single-panel visibility with immediate visual feedback.

#### 5. Composer Button Collision & Touch Targets
- **Finding ID:** `CHAT-005` (Severity: **MEDIUM**)
- **File:** `CMS/src/components/chat/unified-chat-app.tsx:5100-5250`
- **Defect:** Bottom message composer mounts 6 icon buttons adjacent to the input field (`Emoji`, `Attachment`, `Voice Note`, `Send`, `Format`, `Poll`).
- **Impact:** On 360px viewports, buttons with 8px gaps leave less than 140px for typing messages.
- **Mandatory Correction:** Collapse secondary actions (`Poll`, `Format`) into an expandable `+` action menu on screens `< 640px`.

---

## 3. Contacts & Call History Audit

### A. `/call-history` (`CMS/src/app/(workspace)/call-history/page.tsx`)
- **Finding ID:** `CALL-001` (Severity: **HIGH**)
- **Defect:** Employs `<Table className="min-w-[640px]">`.
- **Impact:** On viewports under 640px (Mobile Small 360px, Mobile Standard 390px), horizontal scrolling is mandatory. The user cannot see the call duration or action buttons without panning back and forth.
- **Mandatory Correction:** Implement a responsive card-list view on mobile (`md:hidden`) showing caller avatar, call direction badge (`Incoming`/`Outgoing`), duration, and quick-callback buttons, reserving the tabular format for desktop (`hidden md:table`).

---
**Document Status:** Verified Complete — Proceed to Context7 Documentation Verification.

