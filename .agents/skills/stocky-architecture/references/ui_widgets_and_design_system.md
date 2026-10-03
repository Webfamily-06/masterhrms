# UI Widget Placement, Sizing & Design System Architecture

This reference manual provides the exact layout coordinates, component structures, widget alignments, pagination contracts, border radii, and color tokens across all pages of the Stocky platform.

---

## 1. Sidebar & Submenu Micro-Architecture

The navigation sidebar is rendered via `SidebarMenu.vue` within the master layout `AdminLayout.vue`.

### 1.1 Structural Anatomy Diagram
```
+-------------------------------------------------------------------------+
| .brand (Height: 64px, Padding: 16px 20px, Border-bottom: 1px #ececee)  |
| [ Logo (32x32px) / Brand Initial (32x32px, Radius: 8px) ]  Company Name |
+-------------------------------------------------------------------------+
| .sidebar-menu (Flex: 1, Overflow-y: auto, Custom 6px Hover Gutter)      |
|                                                                         |
| ▣ Dashboard                                                  (Level 1)  |
|                                                                         |
| ▼ Products                                            [v Arrow] (Open)  |
|   │ (2px Guide Rail ::before line starts at 18px from left edge)        |
|   ├─ Add Product                                             (Level 2)  |
|   ├─ Products List [Active Slice: 3px Solid Primary Indicator]          |
|   ├─ Batches                                                            |
|   └─ ▼ Categories & Subcategories                            (Sub-Group)|
|        │ (Nested 2px Solid Real Border shifted by 14px)                 |
|        ├── Electronics                                       (Level 3)  |
|        └── Clothing & Apparel (Multiline word-wrap enabled)             |
|                                                                         |
| ▶ Sales                                     [Badge: "12"] [> Arrow]     |
| ▶ Purchases                                               [> Arrow]     |
+-------------------------------------------------------------------------+
| SAFE AREA PADDING: calc(16px + env(safe-area-inset-bottom, 0px))        |
+-------------------------------------------------------------------------+
```

### 1.2 Exact CSS & Submenu Metrics

#### 1. The Submenu Guide Rail (`.ant-menu-sub.ant-menu-inline::before`)
Each expanded submenu draws a single continuous vertical line to provide immediate visual grouping:
```css
.sidebar-menu :deep(.ant-menu-sub.ant-menu-inline)::before {
  content: '';
  position: absolute;
  top: 2px;
  bottom: 2px;
  inset-inline-start: 18px; /* Exact distance from sidebar left edge */
  width: 2px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.10); /* Light theme guide line */
  pointer-events: none;
}

/* Dark theme adaptation */
.sidebar-menu.ant-menu-dark :deep(.ant-menu-sub.ant-menu-inline)::before {
  background: rgba(255, 255, 255, 0.14);
}
```

#### 2. Item Hover & Active Slices (`::after`)
*   **Hover Slice**: A semi-transparent primary sliver on the guide line:
    ```css
    .sidebar-menu :deep(.ant-menu-sub.ant-menu-inline .ant-menu-item:hover)::after {
      content: '';
      position: absolute;
      top: 7px;
      bottom: 7px;
      inset-inline-start: 18px;
      width: 2px;
      border-radius: 2px;
      background: var(--sb-primary, #6d28d9);
      opacity: 0.45;
    }
    ```
*   **Active Selected Slice**: A solid, elevated primary marker on the rail:
    ```css
    .sidebar-menu :deep(.ant-menu-sub.ant-menu-inline .ant-menu-item-selected)::after {
      content: '';
      position: absolute;
      top: 5px;
      bottom: 5px;
      inset-inline-start: 18px;
      width: 3px;
      border-radius: 2px;
      background: var(--sb-primary, #6d28d9);
      opacity: 1;
    }
    ```

#### 3. Sub-Group Third-Level Nesting
Third-level items shift inwards by `14px`, disable the pseudo-rail to prevent overlapping lines, and enable multiline word-wrapping:
```css
.sidebar-menu :deep(.ant-menu-sub.ant-menu-inline .ant-menu-sub.ant-menu-inline) {
  margin-inline-start: 14px;
  border-inline-start: 2px solid rgba(0, 0, 0, 0.12);
  background: transparent;
}
.sidebar-menu :deep(.ant-menu-sub.ant-menu-inline .ant-menu-sub.ant-menu-inline .ant-menu-item) {
  padding-inline-start: 14px !important;
  height: auto;
  min-height: 36px;
  line-height: 1.35;
  padding-top: 7px;
  padding-bottom: 7px;
}
```

#### 4. Instant Accordion Animation Elimination
To eliminate lag when expanding 250+ items, Ant Design's expand/collapse transition is deliberately zeroed:
```css
.sidebar-menu :deep(.ant-menu-sub.ant-menu-inline),
.sidebar-menu :deep(.ant-motion-collapse),
.sidebar-menu :deep(.ant-menu-submenu-arrow) {
  transition: none !important;
  animation: none !important;
}
```

#### 5. Pending Work Count Badges (`.sb-row-badge`)
Rendered on menu items carrying actionable work (e.g. pending orders, unread messages):
```css
.sb-row-badge {
  flex: none;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--sb-primary, #6d28d9);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}
```

---

## 2. Standard Page Anatomy & Alignment Matrix

Every administrative page adheres to a standardized 3-zone visual structure:

```
+-----------------------------------------------------------------------------------------+
| ZONE 1: PAGE HEADER (.page-header)                                                      |
| Breadcrumb: Products > Brands                                                           |
| Title: Brands (H3, Margin: 8px 0 0)                           [+ Add Brand] [Extra Actions]|
+-----------------------------------------------------------------------------------------+
| ZONE 2: OPTIONAL SUMMARY / KPI ROW (a-row :gutter="[16, 16]")                            |
| +---------------------+ +---------------------+ +--------------------+ +---------------+ |
| | Tile 1: Total Brands| | Tile 2: Active (84) | | Tile 3: Top Value  | | Tile 4: Alerts| |
| +---------------------+ +---------------------+ +--------------------+ +---------------+ |
+-----------------------------------------------------------------------------------------+
| ZONE 3: DATA CARD & TABLE CONTAINER (DataTable.vue wrapped in a-card)                   |
| +-------------------------------------------------------------------------------------+ |
| | DATATABLE TOOLBAR (.datatable-toolbar, Height: 56px, Padding: 12px 16px)            | |
| | [ Search this table... (280px) ]             [Delete (2)] [Columns v] [🔄 Refresh]  | |
| +-------------------------------------------------------------------------------------+ |
| | a-table (Scroll: { x: 'max-content' }, Ant density: 'middle')                       | |
| | [ ] | Image | Brand Name | Description        | Status   | Actions                  | |
| | --- | ----- | ---------- | ------------------ | -------- | ------------------------ | |
| | [ ] | [IMG] | Apple      | Consumer hardware  | Active   | [Edit (Green)] [Del (Red)]| |
| | [ ] | [IMG] | Samsung    | Electronics & semi | Active   | [Edit (Green)] [Del (Red)]| |
| +-------------------------------------------------------------------------------------+ |
| | a-pagination (Bottom Right Alignment, Margin: 16px 16px)                             | |
| | 1-10 of 124 items                              < [ 1 ] [ 2 ] [ 3 ] ... [ 13 ] >      | |
| |                                                [ 10 / page v ]                       | |
| +-------------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------+
```

### 2.1 Zone 1: Page Header (`PageHeader.vue`)
*   **Container**: `.page-header` (`display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px;`).
*   **Breadcrumbs**: `a-breadcrumb` rendered only when count > 1 (`margin-bottom: 4px; font-size: 13px;`).
*   **Page Title**: `a-typography-title :level="3"` (`font-size: 20px; font-weight: 600; margin: 8px 0 0;`).
*   **Actions Container**: `a-space wrap` right-aligned with primary button `type="primary"` (`border-radius: 6px; font-weight: 500;`).

### 2.2 Zone 2: Filter Drawer Mechanism (`ReportPage.vue`)
Filters never clutter the table toolbar; they reside in a right-sliding off-canvas drawer:
*   **Trigger**: Click on `a-button` with `FilterOutlined` icon in the page header.
*   **Drawer Component**: `a-drawer placement="right" :width="340"`.
*   **Form Controls inside Drawer**: Forced to `width: 100%` (e.g. `a-range-picker`, `a-select`, `a-input`).

---

## 3. Pagination Sizing & Contract

Governed globally by `useCrudTable.js` and rendered via `a-table`:

| Option Item | Value | Behavior & Sizing |
| :--- | :--- | :--- |
| **Page Size Options** | `['10', '25', '50', '100', '100000']` | Sentinel `100000` is converted via `buildPageSizeOptionText` to display as **"All"**. |
| **Default Limit** | `limit: 10` | 10 records per page by default. |
| **Total Indicator** | `showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`` | Displays current window e.g. `1-10 of 142 items`. |
| **Placement & Alignment** | Bottom-Right of `a-table` | `margin: 16px 0; display: flex; justify-content: flex-end;`. |
| **Page Size Changer** | `showSizeChanger: true` | Ant Design select dropdown with options: `10 / page`, `25 / page`, `All`. |

---

## 4. Responsive Breakpoints & Table Behavior

The layout adapts across 5 standardized media query breakpoints:

```
Mobile (< 768px)          Tablet (768px - 991px)        Desktop (>= 992px)
+-----------------------+ +---------------------------+ +-----------------------------------+
| Topbar (56px)         | | Topbar (56px)             | | Topbar (64px)                     |
| Sider: Off-canvas     | | Sider: Off-canvas         | | Sider: Sticky 240px               |
| Content Margin: 16x12 | | Content Margin: 20x14     | | Content Margin: 24x16             |
| Tables: Scroll-X Auto | | Tables: Scroll-X Auto     | | Tables: Full container width      |
+-----------------------+ +---------------------------+ +-----------------------------------+
```

### Table Containment Rule (`theme.css`)
Wide tables with many columns must **never bleed out of their container card**:
```css
.ant-table-wrapper {
  max-width: 100%;
}
.ant-table-wrapper .ant-spin-container {
  width: 100%;
}
.ant-table-wrapper .ant-table,
.ant-table-wrapper .ant-table-container {
  max-width: 100%;
}
.ant-table-wrapper .ant-table-content {
  overflow-x: auto; /* Internal horizontal scrollbar */
}
```

---

## 5. Border Radius Design Tokens

Ant Design's default rounded corners are customized via `token.borderRadius = 10` in `App.vue`:

| Component Level | Exact Border Radius | Where Used |
| :--- | :--- | :--- |
| **Master Surfaces** | `10px` | `a-card`, `a-modal`, `a-drawer` panels. |
| **Buttons & Inputs** | `6px` to `8px` | `a-button`, `a-input`, `a-select`, `a-range-picker`. |
| **Images & Avatars** | `8px` | Brand thumbnail `44x44px`, Product table photos `50x50px`. |
| **Rounded Pills** | `999px` | Table status tags (`Completed`, `Pending`), Badge counters. |
| **Menu Badges** | `9px` | `.sb-row-badge` (18px height). |

---

## 6. Color Palette & Token Hierarchy

```
+---------------------------------------------------------------------------------------+
| THEME TOKEN PALETTE                                                                   |
+-----------------------+-----------------------+-----------------------+---------------+
| BRAND PRIMARY         | SUCCESS / DELTA UP    | DANGER / DELTA DOWN   | WARNING       |
| #6d28d9 (Violet 700)  | #52c41a (Green)       | #ff4d4f (Red)         | #faad14 (Amber|
+-----------------------+-----------------------+-----------------------+---------------+
| LIGHT LAYOUT BG       | LIGHT CARD BG         | DARK LAYOUT BG        | DARK CARD BG  |
| #fafafa               | #ffffff               | #141414               | #1f1f1f       |
+-----------------------+-----------------------+-----------------------+---------------+
| BORDER LIGHT          | BORDER DARK           | TEXT PRIMARY (LIGHT)  | TEXT SEC (LGT)|
| #ececee               | rgba(253,253,253,0.12)| rgba(0, 0, 0, 0.88)   | rgba(0,0,0,0.4|
+-----------------------+-----------------------+-----------------------+---------------+
```

### Semantic Action Icon Colors
*   **Edit Action Button**: `#52c41a` (`EditOutlined` green).
*   **Delete Action Button**: `#ff4d4f` (Danger red).
*   **View / Detail Button**: `#1677ff` (Primary info blue).
*   **PDF / Download Button**: `#eb2f96` (Magenta / Crimson).
