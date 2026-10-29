# Implementation Plan - Complete Chat Emoji Picker & Message Reactions

## User Need
In the chat interface, emojis are currently static (only 12 hardcoded emojis in the input box dropdown, and only 2 quick reactions 👍/❤️ on messages). The user requested the entire emoji collection ("entier emoji um venum") for both the chat input box and message reactions.

## Objectives
1. **Comprehensive Emoji Dataset & Picker Component**
   - Create `emoji-data.ts` with hundreds of Unicode emojis organized across 8 standard categories (Smileys & Emotion, People & Body, Animals & Nature, Food & Drink, Activities & Sports, Travel & Places, Objects, Symbols & Flags) with searchable keywords/tags.
   - Create `emoji-picker.tsx` with:
     - Search input with instant filtering by name/keyword.
     - Category navigation tabs with category icons.
     - Recent / Frequently used emojis stored in `localStorage`.
     - Smooth scrolling and clean grid layout (supporting dark/light theme).
     - Callback `onSelectEmoji(emoji: string)`.

2. **Integrate into Chat Input Bar**
   - In `unified-chat-app.tsx`, replace the 12-item static dropdown on the `Smile` button with the full `EmojiPicker` popover.
   - When an emoji is selected, append it to `messageInput` (or at cursor position) seamlessly.

3. **Integrate into Message Reactions Bar**
   - In `unified-chat-app.tsx`, add an "Add Reaction" (`+` / `<SmilePlus className="size-3.5" />`) button in the message hover action bar.
   - Clicking opens the `EmojiPicker` popover; selecting any emoji triggers `handleAddReaction(msg.id, emoji)`.
   - The reaction pills already dynamically handle any emoji and display user lists.

4. **100% Dual-Workspace Byte Parity**
   - Keep identical byte parity between `src/components/chat/` and `CMS/src/components/chat/` as required by the HRMS architecture test suite.

---

## Tasks Breakdown

### Task 1: Create Full Emoji Dataset (`emoji-data.ts`)
- File: `src/components/chat/emoji-data.ts` and `CMS/src/components/chat/emoji-data.ts`
- Structure:
  - Categories: Smileys, People, Animals, Food, Activities, Travel, Objects, Symbols
  - Each item: `{ emoji: string, name: string, keywords: string[] }`
  - Helper functions: `searchEmojis(query: string)`, `getEmojisByCategory(categoryId: string)`

### Task 2: Create Reusable `EmojiPicker` Component (`emoji-picker.tsx`)
- File: `src/components/chat/emoji-picker.tsx` and `CMS/src/components/chat/emoji-picker.tsx`
- Features:
  - Search input with clear button.
  - Category selector tabs (Smileys, People, Nature, Food, Activities, Travel, Objects, Symbols).
  - Recent emojis section (saved in `localStorage` under `chat_recent_emojis`).
  - Fast rendering, hover effects, tooltip/preview.
  - Clean styling with Tailwind and Radix Popover primitives.

### Task 3: Integrate into `unified-chat-app.tsx` (Input Bar & Message Reactions)
- Update `src/components/chat/unified-chat-app.tsx` and `CMS/src/components/chat/unified-chat-app.tsx`:
  - Replace static dropdown with `EmojiPicker` in Popover on message input `<Smile>` button.
  - Add `<Popover>` with `EmojiPicker` on message action bar `<SmilePlus>` reaction button.
  - Ensure zero compilation or typecheck errors.

### Task 4: Verify Tests & Byte Parity
- Run `npm run typecheck` and `npm run cms:typecheck`.
- Run `node scripts/test_chat_consolidation.cjs` to confirm 100% byte parity between `src/` and `CMS/src/`.
- Verify with test script.

