# 04 — PAGE UI & COMPONENT INVENTORY: WORKDO DASH SAAS

**Reference Application**: WorkDo Dash SaaS (`https://dash-demo.workdo.io/`)  
**Auditor**: Principal Enterprise Solutions Architect & Reverse Engineering Specialist  
**Design System Observed**: Tailwind CSS v3.4 + Radix UI + Lucide Icons + FullCalendar + Chart.js  
**Verification Level**: **VERIFIED**

---

## 1. Design System & Layout Foundations

### A. Layout Specifications
- **Sidebar (`[data-sidebar="sidebar"]`)**:
  - Expanded Width: `16rem` (`256px` or `w-64`).
  - Collapsed Rail Width: `4rem` (`64px` or `w-16`).
  - Background: Clean white in light mode (`bg-sidebar`), slate navy in dark mode (`dark:bg-slate-900`).
  - Border: Subtle right border `border-r border-sidebar-border`.
- **Top Navigation Bar (`header`)**:
  - Height: `4rem` (`64px` or `h-16`), sticky positioned at top.
  - Border: `border-b border-border/40 backdrop-blur`.
  - Left Section: Sidebar toggle button (`lucide-panel-left`), breadcrumb trail (`Dashboard > Module > Screen`).
  - Right Section: Language switcher (`lucide-globe`), Notification bell (`lucide-bell`), User profile pill with rounded avatar and type indicator.
- **Content Area (`main`)**:
  - Padding: `p-6 md:p-8`.
  - Max Width: Fluid responsive grid (`w-full min-h-screen bg-muted/20`).
  - Typography: Inter / SF Pro Display font stack with clear hierarchy:
    - `h1`: `text-2xl font-bold tracking-tight text-foreground`
    - `h2`: `text-xl font-semibold text-foreground`
    - `h3`: `text-lg font-medium text-foreground`
    - Body / Labels: `text-sm font-medium text-muted-foreground`
    - Meta / Notes: `text-xs text-muted-foreground`

---

## 2. Interactive Component Catalog

### A. Action Buttons
| Component Name | Visual Style | Classes / Specs | Common Triggers |
|---|---|---|---|
| **Primary Action Button** | Solid Primary Fill | `bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-md` | `+ Create Employee`, `Save`, `Submit`, `Approve` |
| **Secondary / Outline** | Light Border | `border border-input bg-background hover:bg-accent h-9 px-3 rounded-md` | `Cancel`, `Back`, `Export CSV` |
| **View Icon Button** | Emerald Green Icon | `h-8 w-8 text-green-600 hover:bg-green-50 rounded-md` (`lucide-eye`) | View Profile, View Details |
| **Edit Icon Button** | Blue Accent Icon | `h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-md` (`lucide-square-pen`) | Edit Record |
| **Delete Icon Button** | Destructive Red Icon | `h-8 w-8 text-destructive hover:bg-red-50 rounded-md` (`lucide-trash2`) | Delete Record (triggers confirmation modal) |
| **Action / Run Icon Button**| Purple Accent Icon | `h-8 w-8 text-purple-600 hover:bg-purple-50 rounded-md` (`lucide-play`) | Run Payroll, Open Approval Modal |
| **Download Icon Button** | Amber / Orange Icon | `h-8 w-8 text-orange-600 hover:bg-orange-50 rounded-md` (`lucide-download`)| Download PDF Payslip, Export |

---

### B. Form Inputs & Selectors
| Component Name | Type / Implementation | Interaction Behavior |
|---|---|---|
| **Text & Search Input** | `<input type="text">` | `h-10 border border-input rounded-md px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary`. Real-time debounce on search. |
| **Date Picker** | Radix Popover + Calendar | Shows selected date (e.g. `2025-06-20`), dropdown calendar with year/month jump. |
| **Single Select** | Radix Select Primitive | Clean popover with search filter inside dropdown, displays placeholder e.g. `Select Branch first`. |
| **Dependent Dynamic Select**| State-driven Select | Department dropdown disables with `Select Branch first` until Branch is chosen; Designation disables with `Select Department first`. |
| **Radio Group** | Radix Radio Primitive | Pill-style rounded toggle buttons for Gender (`Male`, `Female`, `Other`) and Employment Type. |
| **File Upload Dropzone** | Drag-and-drop container | Dashed border `border-2 border-dashed border-input rounded-lg p-6`, supports drag-over, shows file name, size, and preview thumbnail. |

---

### C. Data Tables & Pagination
- **Table Container**: `w-full overflow-x-auto rounded-lg border border-border bg-card`
- **Table Header (`thead`)**:
  - `bg-muted/50 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground`
  - Sticky header support with sort arrows (`lucide-arrow-up-down`) on sortable columns.
- **Table Rows (`tbody tr`)**:
  - Alternating hover state: `hover:bg-muted/30 transition-colors`
  - Cell padding: `p-4 text-sm align-middle`
- **Pagination Footer**:
  - Left: Summary label `Showing 1 to 10 of 413 results`
  - Center/Right: Page size selector (`10 per page`, `25`, `50`) and numbered pagination buttons (`Previous`, `1`, `2`, `3`, ..., `Next`).

---

### D. Modals, Drawers & Popovers
1. **Approval / Action Dialog (`role="dialog"`)**:
   - Background overlay: `fixed inset-0 bg-black/50 backdrop-blur-sm z-50`
   - Card container: `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background rounded-xl p-6 shadow-2xl`
   - Header with Title & Close button (`lucide-x`).
   - Body area with Form / Textarea.
   - Footer with split action buttons (`Reject` [Red Outline], `Approve` [Green Solid]).
2. **Filter Slide-Over Drawer**:
   - Collapses or slides in from the right edge with clear filter reset and apply buttons.
3. **Toast Notifications (`sonner` / `react-toastify`)**:
   - Position: Bottom-right (`Notifications alt+T`), displaying success (emerald checkmark), error (rose exclamation), or loading spinner.
