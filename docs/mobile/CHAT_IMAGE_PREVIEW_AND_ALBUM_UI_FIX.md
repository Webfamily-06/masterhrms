# MASTERHRMS — CHAT IMAGE PREVIEW & MULTI-IMAGE ALBUM UI SPECIFICATION

## 1. Overview

This document details the WhatsApp-style image preview and multi-image album rendering implemented in `ChatImageAlbum.tsx` and integrated with `ChatConversationDetailScreen.tsx`.

It resolves:
1. `ImagePicker.MediaTypeOptions` SDK 58 deprecation warnings.
2. Inadequate image preview dimensions in chat bubbles.
3. Proper responsive album grid layout with +N overflow badges.
4. Clean separation between image galleries and other attachment types (PDFs, docs, audio).

---

## 2. ImagePicker SDK 58 Modernization

In Expo SDK 58, passing `ImagePicker.MediaTypeOptions.Images` or `ImagePicker.MediaTypeOptions.All` triggers a deprecation warning recommending string array syntax.

### Updates Applied in `ChatConversationDetailScreen.tsx`:
- Camera capture:
  ```typescript
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  ```
- Photo library picker:
  ```typescript
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.85,
    allowsMultipleSelection: true,
    selectionLimit: MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  });
  ```

---

## 3. Album Layout Grid Architecture (`ChatImageAlbum.tsx`)

`ChatImageAlbum.tsx` dynamically structures image previews according to the number of images attached to a single message:

| Image Count | Layout Description | Thumbnail Dimensions | Action / Overlay |
| :--- | :--- | :--- | :--- |
| **1 Image** | Single large responsive card | `width: '100%'`, `height: 200` | Full cover preview, tap to view |
| **2 Images** | 2 equal columns side by side | `flex: 1`, `height: 140` each | Tap individual image to view in gallery |
| **3 Images** | Balanced 3-image layout | Row 1: 2 items (`height: 115`), Row 2: 1 full-width (`height: 115`) | Tap opens gallery at selected index |
| **4 Images** | 2x2 symmetrical grid | 4 items (`height: 105` each) in 2 rows of 2 | Clean 2x2 grid without any overlay |
| **5-10+ Images** | 2x2 grid with overflow badge | 4 visible items (`height: 105` each), 4th item has dark overlay | `+N` badge where $N = \text{total} - 4$ |

### Overflow Math Guarantee
The overflow counter strictly counts **unrendered remaining images**:
$$\text{Overlay Count} = \text{totalImages} - 4$$
For example:
- 5 images total: 4 visible + overlay shows **`+1`**
- 8 images total: 4 visible + overlay shows **`+4`**
- 10 images total: 4 visible + overlay shows **`+6`**

Non-image attachments (PDFs, Excel spreadsheets, audio notes) are filtered out into `otherAttachments` and never factored into the album grid count.

---

## 4. Full-Screen In-App Media Viewer

Tapping any thumbnail in the album triggers `onPressImage(index)`, opening the modal gallery viewer (`galleryViewer` state):
- **Index Preservation**: Opens directly to the tapped image index.
- **Header Information**: Displays `senderName`, filename, and photo index (e.g., `Photo 3 of 7`).
- **Thumbnail Strip**: Scrollable horizontal strip showing all album images with active highlight.
- **Native Actions**: Includes direct `Download` (saving to device filesystem) and `Share` (invoking OS share sheet) without leaving the conversation.
- **Gesture Navigation**: Supports swipe/tap navigation through previous and next photos.

---

## 5. Verification Test Suite

Validated with 20 comprehensive scenarios in `mobile-app/__tests__/chat_image_album_and_theme.test.tsx`:
- Scenario 1: 1 image large display
- Scenario 2: 2 images equal columns
- Scenario 3: 3 images balanced layout
- Scenario 4: 4 images 2x2 grid
- Scenario 5: 5 images with +1 overlay
- Scenario 6: 10 images with +6 overlay
- Scenario 7: Mixed media attachment separation
- Scenarios 8-20: Selection limits, upload batches, gallery index navigation, and dark theme consistency.
