# DUPLICATE & UNUSED COMPONENT AUDIT
**MASTERHRMS Enterprise System — Code Hygiene & Redundancy Analysis**
*Read-Only Audit: No files were deleted or modified*

---

## 1. Duplicate & Similar Component Discovery

The following pairs/groups of components exhibit significant functional, structural, or naming overlap:

| Component A | Component B | Similarity Reason | Used Where | Recommendation |
|---|---|---|---|---|
| **DreamsSidebar** | **AppSidebar** | Two distinct navigation sidebars: DreamsSidebar houses 32+ enterprise modules; AppSidebar is earlier legacy/minimal sidebar. | DreamsSidebar in _app/route.tsx; AppSidebar in legacy components | **REVIEW** |
| **CustomDomainSettings** | **SettingsCustomDomain** | Both manage custom domain configuration, SSL verification, and CNAME instructions. | CustomDomainSettings in components; settings.custom-domain.tsx route | **POSSIBLE DUPLICATE** |
| **MediaLibraryManager** | **MediaImageUploader** | MediaLibraryManager was embedded in Super Settings Tab 8; MediaImageUploader handles modal media selection. | Super Settings vs Branding tab | **REVIEW** |
| **EmptyState** | **NoSearchResults** | Both display zero-result graphic with title, message, and action button. | system-states/empty-state.tsx vs no-search-results.tsx | **POSSIBLE DUPLICATE** |
| **SessionExpiredModal** | **SessionExpiredView** | Modal popup dialog vs full-page error view for expired sessions. | system-states/session-expired-modal.tsx vs error-pages/session-expired-view.tsx | **KEEP SEPARATE** |
| **SubscriptionCheckoutModal** | **PaymentCheckoutModal** | Overlapping Razorpay checkout modals with plan card previews. | subscription/subscription-checkout-modal.tsx vs payment-checkout-modal.tsx | **REVIEW** |
| **DataTable** | **Table** | TanStack Table wrapper with pagination/sorting vs primitive table elements. | ui/data-table.tsx vs ui/table.tsx | **KEEP SEPARATE** |
| **SiteHeader** | **DashboardHeader** | Public marketing header with landing links vs authenticated top header with tenant switcher. | marketing/site-header.tsx vs dashboard-header.tsx | **KEEP SEPARATE** |

---

## 2. Potentially Unused / Orphan Components

The following shared components in `src/components/` had **zero direct JSX tag usages** across the 212 evaluated route files:

| Component Name | Source File | Evidence | Confidence |
|---|---|---|---|
| **CyberMeshBackground** | `src/components/3d/CyberMeshBackground.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **Feature3DGlobe** | `src/components/3d/Feature3DGlobe.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **Hero3DCanvas** | `src/components/3d/Hero3DCanvas.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **Interactive3DCard** | `src/components/3d/Interactive3DCard.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **AppSidebar** | `src/components/app-sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **DashboardHeader** | `src/components/dashboard-header.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **INDIAN_GST_STATES** | `src/components/invoices/invoice-creator-view.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **SiteFooter** | `src/components/marketing/site-footer.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **SiteHeader** | `src/components/marketing/site-header.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **PaymentProviderIcon** | `src/components/payment-provider-badge.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **MediaLibraryManager** | `src/components/settings/media-library-manager.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **InactivityTracker** | `src/components/system-states/inactivity-tracker.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **Index** | `src/components/system-states/index.ts` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **OfflineBanner** | `src/components/system-states/offline-banner.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **SessionExpiredModal** | `src/components/system-states/session-expired-modal.tsx` | No direct JSX import or tag usage found across 212 route files | **MEDIUM** |
| **Accordion** | `src/components/ui/accordion.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AccordionItem** | `src/components/ui/accordion.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AccordionTrigger** | `src/components/ui/accordion.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AccordionContent** | `src/components/ui/accordion.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialog** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogPortal** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogOverlay** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogTrigger** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogContent** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogHeader** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogFooter** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogTitle** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogDescription** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogAction** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDialogCancel** | `src/components/ui/alert-dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Alert** | `src/components/ui/alert.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertTitle** | `src/components/ui/alert.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AlertDescription** | `src/components/ui/alert.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **AspectRatio** | `src/components/ui/aspect-ratio.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Breadcrumb** | `src/components/ui/breadcrumb.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **BreadcrumbList** | `src/components/ui/breadcrumb.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **BreadcrumbItem** | `src/components/ui/breadcrumb.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **BreadcrumbLink** | `src/components/ui/breadcrumb.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **BreadcrumbPage** | `src/components/ui/breadcrumb.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **BreadcrumbSeparator** | `src/components/ui/breadcrumb.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **BreadcrumbEllipsis** | `src/components/ui/breadcrumb.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CalendarDayButton** | `src/components/ui/calendar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Carousel** | `src/components/ui/carousel.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CarouselContent** | `src/components/ui/carousel.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CarouselItem** | `src/components/ui/carousel.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CarouselPrevious** | `src/components/ui/carousel.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CarouselNext** | `src/components/ui/carousel.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ChartContainer** | `src/components/ui/chart.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ChartTooltip** | `src/components/ui/chart.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ChartTooltipContent** | `src/components/ui/chart.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ChartLegend** | `src/components/ui/chart.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ChartLegendContent** | `src/components/ui/chart.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ChartStyle** | `src/components/ui/chart.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Collapsible** | `src/components/ui/collapsible.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CollapsibleTrigger** | `src/components/ui/collapsible.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CollapsibleContent** | `src/components/ui/collapsible.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Command** | `src/components/ui/command.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CommandShortcut** | `src/components/ui/command.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **CommandSeparator** | `src/components/ui/command.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenu** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuTrigger** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuContent** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuItem** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuCheckboxItem** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuRadioItem** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuLabel** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuSeparator** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuShortcut** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuGroup** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuPortal** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuSub** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuSubContent** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuSubTrigger** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ContextMenuRadioGroup** | `src/components/ui/context-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DataTable** | `src/components/ui/data-table.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DialogPortal** | `src/components/ui/dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DialogOverlay** | `src/components/ui/dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DialogTrigger** | `src/components/ui/dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DialogClose** | `src/components/ui/dialog.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Drawer** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerPortal** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerOverlay** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerTrigger** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerClose** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerContent** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerHeader** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerFooter** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerTitle** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DrawerDescription** | `src/components/ui/drawer.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuCheckboxItem** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuRadioItem** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuShortcut** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuGroup** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuPortal** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuSub** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuSubContent** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuSubTrigger** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **DropdownMenuRadioGroup** | `src/components/ui/dropdown-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Form** | `src/components/ui/form.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **FormItem** | `src/components/ui/form.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **FormLabel** | `src/components/ui/form.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **FormControl** | `src/components/ui/form.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **FormDescription** | `src/components/ui/form.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **FormMessage** | `src/components/ui/form.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **FormField** | `src/components/ui/form.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **HoverCard** | `src/components/ui/hover-card.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **HoverCardTrigger** | `src/components/ui/hover-card.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **HoverCardContent** | `src/components/ui/hover-card.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **InputOTP** | `src/components/ui/input-otp.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **InputOTPGroup** | `src/components/ui/input-otp.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **InputOTPSlot** | `src/components/ui/input-otp.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **InputOTPSeparator** | `src/components/ui/input-otp.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Menubar** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarMenu** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarTrigger** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarContent** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarItem** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarSeparator** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarLabel** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarCheckboxItem** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarRadioGroup** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarRadioItem** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarPortal** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarSubContent** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarSubTrigger** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarGroup** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarSub** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **MenubarShortcut** | `src/components/ui/menubar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **NavigationMenu** | `src/components/ui/navigation-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **NavigationMenuList** | `src/components/ui/navigation-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **NavigationMenuItem** | `src/components/ui/navigation-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **NavigationMenuContent** | `src/components/ui/navigation-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **NavigationMenuTrigger** | `src/components/ui/navigation-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **NavigationMenuLink** | `src/components/ui/navigation-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **NavigationMenuIndicator** | `src/components/ui/navigation-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **NavigationMenuViewport** | `src/components/ui/navigation-menu.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Pagination** | `src/components/ui/pagination.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **PaginationContent** | `src/components/ui/pagination.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **PaginationLink** | `src/components/ui/pagination.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **PaginationItem** | `src/components/ui/pagination.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **PaginationPrevious** | `src/components/ui/pagination.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **PaginationNext** | `src/components/ui/pagination.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **PaginationEllipsis** | `src/components/ui/pagination.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **PopoverAnchor** | `src/components/ui/popover.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **RadioGroup** | `src/components/ui/radio-group.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **RadioGroupItem** | `src/components/ui/radio-group.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **LineItemRepeater** | `src/components/ui/repeater.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ResizablePanelGroup** | `src/components/ui/resizable.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ResizablePanel** | `src/components/ui/resizable.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ResizableHandle** | `src/components/ui/resizable.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ScrollBar** | `src/components/ui/scroll-area.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SelectGroup** | `src/components/ui/select.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SelectLabel** | `src/components/ui/select.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SelectSeparator** | `src/components/ui/select.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SelectScrollUpButton** | `src/components/ui/select.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SelectScrollDownButton** | `src/components/ui/select.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SheetPortal** | `src/components/ui/sheet.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SheetOverlay** | `src/components/ui/sheet.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SheetTrigger** | `src/components/ui/sheet.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SheetClose** | `src/components/ui/sheet.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SheetFooter** | `src/components/ui/sheet.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Sidebar** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarContent** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarFooter** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarGroup** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarGroupAction** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarGroupContent** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarGroupLabel** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarHeader** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarInput** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarInset** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenu** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenuAction** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenuBadge** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenuButton** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenuItem** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenuSkeleton** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenuSub** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenuSubButton** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarMenuSubItem** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarProvider** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarRail** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarSeparator** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **SidebarTrigger** | `src/components/ui/sidebar.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Sonner** | `src/components/ui/sonner.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **TableFooter** | `src/components/ui/table.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **TableCaption** | `src/components/ui/table.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ToggleGroup** | `src/components/ui/toggle-group.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **ToggleGroupItem** | `src/components/ui/toggle-group.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Toggle** | `src/components/ui/toggle.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **Tooltip** | `src/components/ui/tooltip.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **TooltipTrigger** | `src/components/ui/tooltip.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **TooltipContent** | `src/components/ui/tooltip.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |
| **TooltipProvider** | `src/components/ui/tooltip.tsx` | No direct JSX import or tag usage found across 212 route files | **LOW** |

### Nuance & Safety Rules Regarding "Unused" Candidates:
- **Radix Primitives**: Primitive wrappers (e.g. `collapsible.tsx`, `toggle.tsx`, `repeater.tsx`) may be designed as utility building blocks for upcoming features or imported by dynamic plugins.
- **Dynamic Routing & Lazy Components**: Components loaded via dynamic import or router loader expressions should NOT be deleted without runtime verification.
- **DO NOT DELETE**: Per strict audit instructions, all candidate components must remain intact until explicitly scheduled for retirement during a future cleanup milestone.
