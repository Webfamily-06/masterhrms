# MasterHRMS Mobile App — Chat Media & Location Verification Report

**Date:** November 18, 2026  
**Subproject:** `mobile-app/src/modules/chat/screens/ChatConversationDetailScreen.tsx`  
**Dependencies:** `expo-file-system`, `expo-image-picker`, `expo-document-picker`, `expo-location`

---

## 1. Problem Diagnosis

During pre-audit, the chat media and location sharing system suffered from fake simulation and static mock data:
1. **Hardcoded Fallback File Sizes:** In `sendMediaMessage`, when a picked image or document did not provide `asset.fileSize` or `doc.size`, the application passed hardcoded numbers:
   - `fileSize: 300000` (for images)
   - `fileSize: 250000` (for documents)
   This misrepresented true file payloads to the server and caused incorrect progress calculations.
2. **Hardcoded Chennai Coordinates:** The location sharing action claimed to share current device location, but actually sent static hardcoded coordinates:
   - `latitude: 13.0827, longitude: 80.2707` (Chennai, India)
   - Static string: `'Shared Location (Tap to view)'`
3. **Static Location Display:** Location messages did not dynamically parse and map coordinates when rendered, leaving received GPS coordinates as inert cards without interactive navigation.

---

## 2. Remediation Applied

### 2.1 Genuine Filesystem Metadata via `expo-file-system`
In `ChatConversationDetailScreen.tsx`:
- Imported `* as FileSystem from 'expo-file-system'`.
- Implemented real metadata inspection before dispatching attachments:
  ```ts
  let realSize = asset.fileSize;
  if (!realSize && asset.uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && typeof fileInfo.size === 'number') {
        realSize = fileInfo.size;
      }
    } catch {
      // Non-fatal
    }
  }
  ```
  The same logic was applied to documents picked via `DocumentPicker`. If filesystem inspection fails, it falls back to `undefined` rather than a fake number.

### 2.2 Live Hardware GPS Coordinates & Reverse Geocoding
In `handleShareLocation`:
- Added permission check using `Location.requestForegroundPermissionsAsync()`.
- Obtained live high-accuracy GPS fix from device hardware:
  ```ts
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  ```
- Performed dynamic reverse-geocoding to produce human-readable addresses:
  ```ts
  let locationLabel = `📍 Current Location (${loc.coords.latitude.toFixed(4)}°, ${loc.coords.longitude.toFixed(4)}°)`;
  try {
    const geo = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    if (geo.length > 0) {
      const place = geo[0];
      const parts = [place.name, place.street, place.subregion, place.city, place.region]
        .filter(Boolean);
      if (parts.length > 0) {
        locationLabel = `📍 Location: ${parts.slice(0, 3).join(', ')} [${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}]`;
      }
    }
  } catch {
    // Reverse geocode non-fatal
  }
  ```
- Dispatched real coordinates in payload:
  `{ latitude: loc.coords.latitude, longitude: loc.coords.longitude, address: locationLabel }`.

### 2.3 Interactive Native Map Navigation
In `renderLocationCard`:
- Implemented coordinate extraction from message content or metadata:
  ```ts
  const coordMatch = item.content.match(/\[([-\d.]+),\s*([-\d.]+)\]/);
  ```
- When tapped, launches native Apple Maps on iOS or Google Maps on Android:
  ```ts
  const url = Platform.select({
    ios: `maps:0,0?q=${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}`,
  }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url);
  ```

---

## 3. Empirical Verification

- Verified with `npm run typecheck` (`tsc --noEmit` passed with 0 errors).
- Verified with `npm test` across all chat test suites.
- File attachments now carry true disk sizes; location cards launch native mapping applications with exact GPS coordinates.
