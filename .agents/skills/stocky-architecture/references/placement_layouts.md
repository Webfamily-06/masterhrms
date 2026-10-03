# Placement, Layouts & Visual Coordinates Reference

This manual provides exact layout metrics, flex dimensions, responsive breakpoints, and styling structures across all Stocky application shells.

---

## 1. Admin Master Shell (`AdminLayout.vue`)

### 1.1 Structural Flex Diagram
```
+-----------------------------------------------------------------------------------------+
| a-layout (min-height: 100vh, flex-direction: row)                                       |
+----------------------+------------------------------------------------------------------+
| a-layout-sider       | a-layout (flex-direction: column)                                |
| • Sticky (top: 0)    | +--------------------------------------------------------------+ |
| • Height: 100vh      | | a-layout-header.topbar (Height: 64px, Padding: 0 16px)       | |
| • Width: 240px/300px | +--------------------------------------------------------------+ |
| • Col: 72px/88px     | | a-layout-content.content (Margin: 24px 16px)                 | |
| • Theme: light/dark  | |   +--------------------------------------------------------+ | |
| • Custom Hover Gutter| |   | .page-header (Margin-bottom: 24px)                     | | |
| • Brand (32x32 logo) | |   | Title / Breadcrumbs          [Filter / Action Buttons] | | |
| • Menu Tree Scroll   | |   +--------------------------------------------------------+ | |
|                      | |   | Route Chunk Viewport (<router-view :key="$route.path"/>| | |
|                      | |   +--------------------------------------------------------+ | |
|                      | +--------------------------------------------------------------+ |
|                      | | a-layout-footer.footer (Padding: 10px 50px, Font-size: 12px) | |
+----------------------+------------------------------------------------------------------+
```

### 1.2 Exact Coordinate & Dimensional Specifications

| Element | CSS Selector | Desktop (> 992px) | Mobile (<= 991px) | Phone (<= 767px) |
| :--- | :--- | :--- | :--- | :--- |
| **Sidebar (Default)** | `.sider` | `width: 240px;` | `width: 240px; fixed; z-index: 200;` | `width: 240px; fixed;` |
| **Sidebar (Collapsed)** | `.sider.ant-layout-sider-collapsed` | `width: 72px;` | Off-canvas overlay | Off-canvas overlay |
| **Sidebar (Large Mode)**| `ui.sidebarLayout === 'large'` | `width: 300px;` (Col: 88px) | 300px (Drawer) | 300px (Drawer) |
| **Topbar Header** | `.topbar` | `height: 64px; padding: 0 16px;` | `height: 56px; padding: 0 12px;` | `height: 56px;` |
| **Brand Logo Box** | `.brand` | `padding: 16px 20px; height: 64px;` | `padding: 12px 16px;` | `padding: 12px 16px;` |
| **Brand Image** | `.brand-logo` | `width: 32px; height: 32px;` | `width: 32px; height: 32px;` | `32x32px` |
| **Brand Initial** | `.brand-initial` | `32x32px, border-radius: 8px; bg: #6d28d9;` | Same | Same |
| **Content Area** | `.content` | `margin: 24px 16px;` | `margin: 20px 14px;` | `margin: 16px 12px;` |
| **Content Loader** | `.content-loader` | `inset: -24px -16px; z-index: 50;` | `inset: -20px -14px;` | `inset: -16px -12px;` |
| **Footer** | `.footer` | `padding: 10px 50px; font-size: 12px;` | `padding: 10px 24px;` | `padding: 10px 16px;` |

### 1.3 The 4 Sidebar Rendering Modes
1.  **`default`** (`SidebarMenu.vue`): Ant Design inline accordion. When collapsed, turns into an icon rail with instant popover submenus.
2.  **`large`** (`SidebarLarge.vue`): 300px split-rail enterprise layout. Left icon rail (88px) handles top-level navigation; right flyout panel displays all module children.
3.  **`flat`** (`SidebarFlat.vue`): Single list without collapsible accordion headers; sections are separated by dividers.
4.  **`dark`**: Preserves a dark sidebar (`#001529`) while the content viewport uses light mode (`#fafafa`), with a distinct edge border `border-inline-end: 1px solid rgba(255, 255, 255, 0.08)`.

---

## 2. Topbar Navigation Layout (`AppTopbar.vue`)

```
+---------------------------------------------------------------------------------------+
| [Toggle Button]                           [POS Button] [Install PWA] [Today's Summary]|
| (MenuFold / Unfold)                       [Dark/Light] [Fullscreen] [Language Dropdown]|
|                                           [Notification Badge] | [User Avatar + Name] |
+---------------------------------------------------------------------------------------+
```

### Key Elements & Interactions
*   **POS Button**: Green/Primary accent button (`CalculatorOutlined`) routing directly to `/pos` (guarded by `auth.can('Pos_view')`).
*   **PWA Install Trigger**: Appears dynamically only when the browser fires `beforeinstallprompt`.
*   **Today's Summary Drawer**: Quick modal displaying revenue, order count, expenses, and current cash register balance for the active date.
*   **Theme Switcher**: Instant transition between Light, Dark (`antTheme.darkAlgorithm`), and Auto (detects `prefers-color-scheme`).
*   **Language Selector**: Multi-language dropdown with SVG country flag icons (En, Fr, Es, Ar, De, Tr).
*   **Notifications Dropdown**: Real-time counter badge linked to `pendingWorkStore` showing unread customer orders, stock alerts, and quotation requests.
*   **User Account Popover**: Shows user avatar, company name, email, link to User Profile, System Settings shortcut, and CSRF-protected `/logout` action.

---

## 3. Fullscreen POS Layout (`PosPage.vue`)

```
+---------------------------------------------------------------------------------------+
| TOP TOOLBAR (Height: 48px, Background: #fff, Border-bottom: 1px solid #e6e6ec)        |
| [Brand Logo] | Register #1 [OPEN/CLOSED] | Warehouse [v] | Cat [v] | Brand [v] | Set |
+------------------------------------------------------+--------------------------------+
| LEFT PANE: PRODUCT EXPLORER (Flex: 1)                | RIGHT PANE: ACTIVE CART (380px)|
| • Barcode Search Input (Autofocus, Icon, Clear)      | • Customer Selector [Quick Add]|
| • Category Horizontal Pill Badges                    | • Scrollable Cart Line Items   |
| • Responsive Product Grid:                           |   - Item Name, Unit Price      |
|   - minmax(130px, 1fr) auto-fill                     |   - Qty (+/- buttons)          |
|   - Product Image (80x80 object-fit cover)           |   - Batch / Expiry Badge       |
|   - Product Name (Truncated 2 lines)                 |   - Serial Number Chip         |
|   - Stock Quantity & Price Badge                     |   - Delete (Trash Icon)        |
|                                                      | • Calculation Matrix:          |
| • Bottom Bar:                                        |   - Subtotal, Tax, Discount    |
|   - [Hold Orders (N)] [Recent Transactions]          |   - Shipping, Grand Total      |
|                                                      | • Action Buttons:              |
|                                                      |   [ PAY NOW / F2 ]             |
|                                                      |   [Hold] [Quote] [Reset]       |
+------------------------------------------------------+--------------------------------+
```

---

## 4. Dual-Monitor Customer Display (`CustomerDisplay.vue`)

```
+---------------------------------------------------------------------------------------+
| HEADER (Height: 90px, Background: Surface Elevated, Border-bottom: Line Subtle)       |
| [Store Logo (Height: 60px)]   Welcome! Thank you for shopping   | TOTAL DUE: $120.50  |
+-----------------------------------------------------------------+---------------------+
| CART ITEMS SCROLL VIEW (Flex: 1)                                | SUMMARY CARD (340px)|
| • Item Card 1: Premium Olive Oil       x 2            $34.00    | Subtotal:    $110.00|
| • Item Card 2: Fresh Baguette          x 1             $4.50    | Tax (10%):    $11.00|
| • Item Card 3: Sparkling Water 500ml   x 4             $8.00    | Discount:     -$5.00|
| (Staggered CSS animations: idx * 0.05s)                         | Shipping:      $4.50|
|                                                                 | TOTAL:       $120.50|
+-----------------------------------------------------------------+---------------------+
| FOOTER: "Thank you for your purchase!"                          (Live Pulsing Indicator)
+---------------------------------------------------------------------------------------+
```

---

## 5. Storefront eCommerce Layout (`layouts/store.blade.php`)

Built with **Tailwind CSS** and **Alpine.js**:
*   **Announcement Bar**: Height `36px`, dark background, multi-currency & language picker.
*   **Sticky Header**: Logo, Search bar with autocomplete drop panel, Customer account menu, Wishlist count badge, and Cart button with slide-over drawer toggle.
*   **Category Megamenu**: Hover dropdown displaying nested subcategories and featured brand banners.
*   **Product Cards**: Aspect ratio `1/1`, badges (`New`, `Deal`, `Refurbished`), rating stars, price with strikethrough original price, and quick-add to cart button.
*   **Alpine Mini-Cart Drawer**: Right off-canvas slide-over (`max-w-md`), item quantity toggles, coupon promo code field, and "Proceed to Checkout" CTA.
