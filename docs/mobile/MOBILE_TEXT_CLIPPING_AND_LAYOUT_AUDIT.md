# MASTERHRMS — MOBILE TEXT CLIPPING & LAYOUT OVERFLOW AUDIT

## 1. Executive Summary

This report documents the application-wide audit and remediation of text truncation, clipped descenders, container overflows, and avatar monogram misalignments across the MasterHRMS React Native mobile application.

---

## 2. Root Cause Analysis

### 2.1 Android Font Padding (`includeFontPadding: true`)
- **Issue**: By default, React Native on Android enables extra vertical font padding (`includeFontPadding: true`). On large font sizes (e.g. titles, headers, badges, monograms), this extra space pushed descenders (`g`, `y`, `p`, `q`, `j`) and accents against the bounding box edge, resulting in clipped glyphs.
- **Remediation**:
  1. Updated `mobile-app/src/components/common/Text.tsx` so that `Platform.OS === 'android' ? { includeFontPadding: false } : null` is injected by default on all text renders.
  2. Updated `mobile-app/src/theme/typography.ts` with `includeFontPadding: false` across all variants (`h1`, `h2`, `h3`, `h4`, `bodyLarge`, `body`, `bodySmall`, `caption`, `button`, `mono`).

### 2.2 Avatar 2-Letter Monogram Centering
- **Issue**: When profile photos were absent, initial monograms (e.g., `SA`, `JD`) were clipped or offset vertically inside circular containers due to mismatch between `fontSize`, container diameter, and line-height.
- **Remediation**:
  - Implemented vertical centering using `justifyContent: 'center'`, `alignItems: 'center'`.
  - Added Android-specific line height adjustments (`lineHeight: Platform.OS === 'android' ? 48 : undefined`) and explicit `includeFontPadding: false`.
  - Monograms now render centered and unclipped.

### 2.3 Fixed Container Heights & Missing `flexShrink`
- **Issue**: Several dashboard and chat preview rows used fixed container heights without allowing text containers to shrink when font sizes or user accessibility scaling increased.
- **Remediation**:
  - Replaced rigid fixed heights with `minHeight` or flexible padding.
  - Added `flex: 1`, `minWidth: 0`, and `flexShrink: 1` on text containers wrapping `numberOfLines={1}` or `numberOfLines={2}`.
  - Action buttons and status badges wrap content using `paddingHorizontal` instead of rigid fixed widths.

---

## 3. Screen-by-Screen Remediation Summary

| Screen / Component | Prior Issue | Remediation Applied |
| :--- | :--- | :--- |
| `ChatCallScreen.tsx` | Header debug text clutter; 2-letter monogram clipped; PiP static | Monogram centered with `includeFontPadding: false`; clean duration header; circular controls |
| `Text.tsx` | Default Android font padding enabled | Added universal Android `includeFontPadding: false` |
| `typography.ts` | Missing font padding rules | All typography styles now specify `includeFontPadding: false` and unified font families |
| `TodoListScreen.tsx` | Task title flex clipping on smaller screens | `taskTitle` configured with `flex: 1`, `minWidth: 0` |
| `CalendarMainScreen.tsx` | Mini slot event text clipped in multi-day view | `miniSlotText` inherits unpadded typography with flexible pill padding |
| `EmployeeDashboardScreen.tsx` | Announcements and leave updates clipped | Wrap containers use `flex: 1`, `marginRight: 8` with responsive typography |
