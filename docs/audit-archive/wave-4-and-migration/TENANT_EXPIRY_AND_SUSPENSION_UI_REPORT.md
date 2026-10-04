# Tenant Expiry and Suspension UI Report

**Components:**
- `src/components/subscription/subscription-warning-popup.tsx`
- `src/components/subscription/subscription-footer-bar.tsx`
- `src/components/subscription/suspended-account-view.tsx`
- `src/components/subscription/expired-subscription-view.tsx`
- `src/routes/_authenticated/_app/route.tsx`

**Status:** COMPLETED AND VERIFIED  
**Date:** October 3, 2026  

---

## 1. Overview & UI Architecture

The tenant subscription warning and locking system provides a multi-tiered UI experience:
1. **Pre-Expiry Warnings:** Dismissible modal dialogs triggered at milestone intervals (15, 10, 5, 3, 2, 1 days).
2. **Persistent Footer Banner:** An unobtrusive bottom bar indicating remaining time and renewal actions.
3. **Suspended Account Lock View:** Full-screen animated blocking view when `Tenant.status === 'SUSPENDED'`.
4. **Expired Subscription Lock View:** Full-screen animated blocking view when `expiresAt < now` or `subscription.status === 'EXPIRED'`.

---

## 2. Component Specifications & Behavior

### A. Dismissible Expiry Warning Popup (`SubscriptionWarningPopup`)
- **Trigger Logic:** Checks `subscription.expiresAt` relative to the current local date. If `daysRemaining <= 15`, matches the nearest threshold bracket: `[15, 10, 5, 3, 2, 1]`.
- **Dismissal Persistence:** Dismissal state is saved to client `localStorage` with a threshold-specific key:
  `hrms_dismissed_expiry_warning_${thresholdDays}_${tenantId}`
- **Progression:** Dismissing the 15-day warning suppresses only the 15-day dialog. When the clock reaches 10 days, the key changes to `..._10_...`, causing the popup to resurface automatically.
- **Controls & Actions:**
  - Displays plan badge, expiry date, days remaining.
  - "Renew Plan" navigates directly to `/billing`.
  - "Remind Me Later" / "Dismiss" closes the popup.
  - Dismissal does **not** close or hide the persistent footer notification.

### B. Persistent Footer Notification (`SubscriptionFooterBar`)
- **Positioning:** Fixed to viewport bottom with `z-50`, non-intrusive height (52px), subtle shadow, and responsive flex wrap.
- **Tone & Severity:**
  - `daysRemaining <= 2`: Amber/Red urgency styling (`bg-amber-500/10 border-amber-500/30 text-amber-300`).
  - `daysRemaining <= 15`: Informational warning styling (`bg-blue-500/10 border-blue-500/30 text-blue-300`).
- **Dynamic Messaging:**
  - `0 days`: "Your subscription expires today."
  - `1 day`: "Your subscription expires tomorrow."
  - `N days`: "Your subscription expires in {N} days ({formattedDate})."
- **Actions:** Includes a prominent "Renew Plan" button linking to `/billing`.

### C. Full-Screen Suspended Account View (`SuspendedAccountView`)
- **Activation:** Renders in `_app/route.tsx` whenever `tenant.status === 'SUSPENDED'`.
- **Visual Design:**
  - Ambient radial background glow with subtle red accents.
  - Centered glassmorphic card with WebFamily branding (`/logo.webp`).
  - Animated pulsing shield icon (`ShieldAlert`).
  - Company name, suspension date, and optional administrative reason box.
- **Security & Route Containment:**
  - Completely supersedes the sidebar, top header, and workspace page router outlet.
  - Users cannot navigate away to any protected tenant route via URL manipulation.
  - Provides a safe "Contact Support" mailto button and an accessible "Sign Out" button.

### D. Full-Screen Expired Subscription View (`ExpiredSubscriptionView`)
- **Activation:** Renders in `_app/route.tsx` whenever `subscription.isExpired === true` or `expiresAt < new Date()`.
- **Visual Design:**
  - Ambient amber/orange glow reflecting subscription lapse.
  - Centered card with WebFamily logo and animated `ClockAlert` icon.
  - Displays company name, lapsed plan name, and authoritative expiry date.
  - Explanatory copy notifying the user that workspace records and actions are locked.
- **Actions:**
  - "Renew Subscription" opens the renewal workflow or billing page.
  - "Contact Support" links to support.
  - "Sign Out" cleanly logs out the session.

---

## 3. Responsive & Accessible Implementation

- **Desktop (1200px+):** Centered card layouts with comfortable padding and clear typographic hierarchy.
- **Tablet (768px - 1024px):** Fluid widths, adjusted font sizes, and accessible button tap targets.
- **Mobile (< 768px):** Single-column layout, compact badges, full-width action buttons.
- **WCAG Compliance:** Contrast ratios meet AA requirements for dark and light themes.

---

## 4. Assets & Icons

- Reused official workspace assets: `/logo.webp` and `/favicon.webp`.
- High-performance vector icons sourced from `lucide-react`: `AlertTriangle`, `ClockAlert`, `ShieldAlert`, `RefreshCw`, `LogOut`, `LifeBuoy`.
