# UIABLE COMPONENT READINESS MAPPING
**MASTERHRMS Enterprise System — Migration Blueprint & Candidate Alignment**
*UIAble Library Reference: 869 Components, 408 Blocks across 43 Categories*

---

## 1. Migration Overview & Strategy

This document establishes the alignment between existing MASTERHRMS UI components and their respective **UIAble** candidate primitives and blocks.

### Classification Categories:
1. **UIABLE EXACT MATCH**: Standard UI primitive with direct 1-to-1 equivalent in `@uiable/<primitive>`.
2. **UIABLE POSSIBLE MATCH**: High-level block or composite pattern matching a UIAble block (e.g. `block-dashboard-layout`, `block-statistics`, `block-pricing`).
3. **KEEP EXISTING**: Custom enterprise business components (e.g. `CompanyProfileSettings`, `BankDisbursementWorkspace`) with specialized backend RPC integrations.
4. **CUSTOM REQUIRED**: Novel domain workflows requiring bespoke composition on top of UIAble primitives.
5. **NEEDS REVIEW**: Components with architectural ambiguity or overlapping variants.

---

## 2. Component-to-UIAble Mapping Directory

| Current Component | Component Type | Usage Count | UIAble Candidate | Mapping Status | Notes |
|---|---|---:|---|---|---|
| **Button** | Forms | 159 | `@uiable/button` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **Badge** | Data Display | 153 | `@uiable/badge` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **Card** | Data Display | 133 | `@uiable/card` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **Input** | Forms | 130 | `@uiable/input` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **Dialog** | Feedback | 112 | `@uiable/dialog` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **DialogContent** | Feedback | 112 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DialogHeader** | Feedback | 111 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **DialogTitle** | Feedback | 111 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DialogFooter** | Feedback | 110 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Label** | Forms | 104 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Select** | Forms | 99 | `@uiable/select` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **SelectContent** | Forms | 99 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SelectItem** | Forms | 99 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SelectTrigger** | Forms | 99 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SelectValue** | Forms | 99 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Link** | Business Component | 97 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **CardContent** | Data Display | 93 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Table** | Data Display | 77 | `@uiable/table` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **TableBody** | Data Display | 77 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TableCell** | Data Display | 77 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TableHead** | Data Display | 77 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TableHeader** | Data Display | 77 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **TableRow** | Data Display | 77 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DialogDescription** | Feedback | 71 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Textarea** | Forms | 66 | `@uiable/textarea` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **CardHeader** | Data Display | 65 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **CardTitle** | Data Display | 61 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CardDescription** | Data Display | 43 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Tabs** | Navigation | 43 | `@uiable/tabs` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **Avatar** | Data Display | 43 | `@uiable/avatar` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **AvatarFallback** | Data Display | 43 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TabsList** | Navigation | 41 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TabsTrigger** | Navigation | 41 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TabsContent** | Navigation | 40 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenu** | Layout | 27 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuContent** | Layout | 27 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuItem** | Layout | 27 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuTrigger** | Layout | 27 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Calendar** | Data Display | 25 | `@uiable/calendar` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **PlanGuard** | Business Component | 18 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **MarketingLayout** | Layout | 15 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Switch** | Forms | 15 | `@uiable/switch` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **AvatarImage** | Data Display | 15 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AccessDenied** | Business Component | 14 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **PageHero** | Layout | 13 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ThemeToggle** | Layout | 13 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Suspense** | Business Component | 13 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **Progress** | Feedback | 10 | `@uiable/progress` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **Checkbox** | Forms | 7 | `@uiable/checkbox` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **Outlet** | Business Component | 6 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **NotFoundView** | Feedback | 4 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuSeparator** | Layout | 4 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PlanLimitBar** | Business Component | 3 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **ServerErrorView** | Feedback | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MethodBadge** | Local Sub-Component | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **StatusBadge** | Local Sub-Component | 2 | `@uiable/statistics, block-statistics` | **UIABLE POSSIBLE MATCH** | UIAble statistics card & metric grid blocks |
| **CardFooter** | Data Display | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Slider** | Forms | 2 | `@uiable/slider` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **DropdownMenuLabel** | Layout | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CommandDialog** | Layout | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CommandEmpty** | Layout | 2 | `@uiable/empty` | **UIABLE EXACT MATCH** | UIAble empty state primitive |
| **CommandGroup** | Layout | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CommandInput** | Layout | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CommandItem** | Layout | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CommandList** | Layout | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **WorkspaceUnavailableView** | Business Component | 2 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **SettingsNestedNav** | Business Component | 2 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **SettingsSectionBreadcrumb** | Business Component | 2 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **CompanyAvatar** | Local Sub-Component | 2 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Separator** | Data Display | 2 | `@uiable/separator` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **PaymentCheckoutModal** | Business Component | 2 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **ForbiddenView** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CopyButton** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SectionHeader** | Local Sub-Component | 1 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **InfoBox** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **EndpointCard** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CountdownTimer** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **OfflineView** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SubscriptionCheckoutModal** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **SessionExpiredView** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CartDrawer** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **ScrollArea** | Data Display | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PageEditorForm** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **HeroSectionEditor** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **BlogCaseStudyEditor** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **BodySectionEditor** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CardsSectionEditor** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **VendorSectionEditor** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FooterSectionEditor** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FooterPreview** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CreatePageDialog** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DeletePageDialog** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FaqManagerStudio** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TestimonialsManagerStudio** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SparklineBar** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Field** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AddUserDialog** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Fragment** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **SuperLoginPage** | Business Component | 1 | `block-login, block-sign-up` | **UIABLE POSSIBLE MATCH** | UIAble authentication blocks |
| **SuperSidebar** | Local Sub-Component | 1 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **MaintenanceMarqueeBanner** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **MediaImageUploader** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **LivePreviewDock** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **UnsavedChangesBar** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **WorkspacePolicyDialog** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **Sheet** | Feedback | 1 | `@uiable/sheet` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **SheetContent** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SheetHeader** | Feedback | 1 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **SheetTitle** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SheetDescription** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Skeleton** | Feedback | 1 | `@uiable/skeleton` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **MiniSparkline** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Popover** | Feedback | 1 | `@uiable/popover` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **PopoverContent** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PopoverTrigger** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PaymentProviderBadge** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **ChartOfAccountsTable** | Business Component | 1 | `@uiable/chart, block-charts` | **UIABLE POSSIBLE MATCH** | UIAble Recharts integration |
| **BankAccountsManager** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **FinancialStatementsView** | Business Component | 1 | `@uiable/statistics, block-statistics` | **UIABLE POSSIBLE MATCH** | UIAble statistics card & metric grid blocks |
| **AvatarCropperDialog** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **InvoiceCreatorView** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **FbpWorkspace** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **TaxVerificationWorkspace** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **BankDisbursementWorkspace** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **StatutoryReturnsWorkspace** | Business Component | 1 | `@uiable/statistics, block-statistics` | **UIABLE POSSIBLE MATCH** | UIAble statistics card & metric grid blocks |
| **AIContentGeneratorModal** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **ProductStockMovementLedger** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CreateSalesReturnDialog** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CreatePurchaseReturnDialog** | Local Sub-Component | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DreamsSidebar** | Layout | 1 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **RealtimeNotificationDrawer** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **AICopilotWidget** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **SuspendedAccountView** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **ExpiredSubscriptionView** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **SubscriptionWarningPopup** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **SubscriptionFooterBar** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **CustomDomainSettings** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **WorkspaceAdminSettings** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **WorkspaceBrandingSettings** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **CompanyProfileSettings** | Business Component | 1 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **EmptyState** | Feedback | 1 | `@uiable/statistics, block-statistics` | **UIABLE POSSIBLE MATCH** | UIAble statistics card & metric grid blocks |
| **NoSearchResults** | Feedback | 1 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **LoadingState** | Feedback | 1 | `@uiable/statistics, block-statistics` | **UIABLE POSSIBLE MATCH** | UIAble statistics card & metric grid blocks |
| **ErrorState** | Feedback | 1 | `@uiable/statistics, block-statistics` | **UIABLE POSSIBLE MATCH** | UIAble statistics card & metric grid blocks |
| **SuccessState** | Feedback | 1 | `@uiable/statistics, block-statistics` | **UIABLE POSSIBLE MATCH** | UIAble statistics card & metric grid blocks |
| **CyberMeshBackground** | Business Component | 0 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **Feature3DGlobe** | Business Component | 0 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **Hero3DCanvas** | Business Component | 0 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **Interactive3DCard** | Business Component | 0 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **AppSidebar** | Layout | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **DashboardHeader** | Layout | 0 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **INDIAN_GST_STATES** | Business Component | 0 | `@uiable/statistics, block-statistics` | **UIABLE POSSIBLE MATCH** | UIAble statistics card & metric grid blocks |
| **SiteFooter** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SiteHeader** | Layout | 0 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **PaymentProviderIcon** | Business Component | 0 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **MediaLibraryManager** | Business Component | 0 | `-` | **CUSTOM REQUIRED** | Custom domain logic component |
| **InactivityTracker** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Index** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **OfflineBanner** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SessionExpiredModal** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Accordion** | Layout | 0 | `@uiable/accordion` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **AccordionItem** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AccordionTrigger** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AccordionContent** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialog** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogPortal** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogOverlay** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogTrigger** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogContent** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogHeader** | Feedback | 0 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **AlertDialogFooter** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogTitle** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogDescription** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogAction** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDialogCancel** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Alert** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertTitle** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AlertDescription** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **AspectRatio** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Breadcrumb** | Navigation | 0 | `@uiable/breadcrumb` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **BreadcrumbList** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **BreadcrumbItem** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **BreadcrumbLink** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **BreadcrumbPage** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **BreadcrumbSeparator** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **BreadcrumbEllipsis** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CalendarDayButton** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Carousel** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CarouselContent** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CarouselItem** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CarouselPrevious** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CarouselNext** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ChartContainer** | Data Display | 0 | `@uiable/chart, block-charts` | **UIABLE POSSIBLE MATCH** | UIAble Recharts integration |
| **ChartTooltip** | Data Display | 0 | `@uiable/chart, block-charts` | **UIABLE POSSIBLE MATCH** | UIAble Recharts integration |
| **ChartTooltipContent** | Data Display | 0 | `@uiable/chart, block-charts` | **UIABLE POSSIBLE MATCH** | UIAble Recharts integration |
| **ChartLegend** | Data Display | 0 | `@uiable/chart, block-charts` | **UIABLE POSSIBLE MATCH** | UIAble Recharts integration |
| **ChartLegendContent** | Data Display | 0 | `@uiable/chart, block-charts` | **UIABLE POSSIBLE MATCH** | UIAble Recharts integration |
| **ChartStyle** | Data Display | 0 | `@uiable/chart, block-charts` | **UIABLE POSSIBLE MATCH** | UIAble Recharts integration |
| **Collapsible** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CollapsibleTrigger** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CollapsibleContent** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Command** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CommandShortcut** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **CommandSeparator** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenu** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuTrigger** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuContent** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuItem** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuCheckboxItem** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuRadioItem** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuLabel** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuSeparator** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuShortcut** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuGroup** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuPortal** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuSub** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuSubContent** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuSubTrigger** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ContextMenuRadioGroup** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DataTable** | Data Display | 0 | `@uiable/data-table` | **UIABLE EXACT MATCH** | UIAble comprehensive data-table with column filtering & sorting |
| **DialogPortal** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DialogOverlay** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DialogTrigger** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DialogClose** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Drawer** | Feedback | 0 | `@uiable/drawer` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **DrawerPortal** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DrawerOverlay** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DrawerTrigger** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DrawerClose** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DrawerContent** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DrawerHeader** | Feedback | 0 | `@uiable/navbar, block-navbar` | **UIABLE POSSIBLE MATCH** | UIAble navigation bar block |
| **DrawerFooter** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DrawerTitle** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DrawerDescription** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuCheckboxItem** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuRadioItem** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuShortcut** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuGroup** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuPortal** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuSub** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuSubContent** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuSubTrigger** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **DropdownMenuRadioGroup** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Form** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FormItem** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FormLabel** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FormControl** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FormDescription** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FormMessage** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **FormField** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **HoverCard** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **HoverCardTrigger** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **HoverCardContent** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **InputOTP** | Forms | 0 | `@uiable/input-otp` | **UIABLE EXACT MATCH** | UIAble OTP verification primitive |
| **InputOTPGroup** | Forms | 0 | `@uiable/input-otp` | **UIABLE EXACT MATCH** | UIAble OTP verification primitive |
| **InputOTPSlot** | Forms | 0 | `@uiable/input-otp` | **UIABLE EXACT MATCH** | UIAble OTP verification primitive |
| **InputOTPSeparator** | Forms | 0 | `@uiable/input-otp` | **UIABLE EXACT MATCH** | UIAble OTP verification primitive |
| **Menubar** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarMenu** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarTrigger** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarContent** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarItem** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarSeparator** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarLabel** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarCheckboxItem** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarRadioGroup** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarRadioItem** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarPortal** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarSubContent** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarSubTrigger** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarGroup** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarSub** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **MenubarShortcut** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **NavigationMenu** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **NavigationMenuList** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **NavigationMenuItem** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **NavigationMenuContent** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **NavigationMenuTrigger** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **NavigationMenuLink** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **NavigationMenuIndicator** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **NavigationMenuViewport** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Pagination** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PaginationContent** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PaginationLink** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PaginationItem** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PaginationPrevious** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PaginationNext** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PaginationEllipsis** | Navigation | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **PopoverAnchor** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **RadioGroup** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **RadioGroupItem** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **LineItemRepeater** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ResizablePanelGroup** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ResizablePanel** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ResizableHandle** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ScrollBar** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SelectGroup** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SelectLabel** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SelectSeparator** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SelectScrollUpButton** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SelectScrollDownButton** | Forms | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SheetPortal** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SheetOverlay** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SheetTrigger** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SheetClose** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **SheetFooter** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Sidebar** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarContent** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarFooter** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarGroup** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarGroupAction** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarGroupContent** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarGroupLabel** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarHeader** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarInput** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarInset** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenu** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenuAction** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenuBadge** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenuButton** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenuItem** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenuSkeleton** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenuSub** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenuSubButton** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarMenuSubItem** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarProvider** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarRail** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarSeparator** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **SidebarTrigger** | Navigation | 0 | `@uiable/sidebar, block-dashboard-layout` | **UIABLE POSSIBLE MATCH** | UIAble responsive sidebar block with nested groups |
| **Sonner** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TableFooter** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TableCaption** | Data Display | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ToggleGroup** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **ToggleGroupItem** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Toggle** | Layout | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **Tooltip** | Feedback | 0 | `@uiable/tooltip` | **UIABLE EXACT MATCH** | Exact match in UIAble primitives collection |
| **TooltipTrigger** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TooltipContent** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |
| **TooltipProvider** | Feedback | 0 | `-` | **KEEP EXISTING** | Custom domain logic component |

---

## 3. Page Migration Complexity Matrix

| Portal | Page | Route | Components | UIAble Candidates | Complexity |
|---|---|---|---:|---|---|
| Public Website & Marketing | 403 | `/403` | 1 | Block Composite | **LOW** |
| Public Website & Marketing | 404 | `/404` | 1 | Block Composite | **LOW** |
| Public Website & Marketing | 500 | `/500` | 1 | Block Composite | **LOW** |
| Public Website & Marketing | A $tag | `/a/:tag` | 6 | 3 Primitives Match | **LOW** |
| Public Website & Marketing | About | `/about` | 3 | 1 Primitives Match | **LOW** |
| Public Website & Marketing | Addons $slug | `/addons/:slug` | 10 | 2 Primitives Match | **LOW** |
| Public Website & Marketing | Addons | `/addons` | 11 | 4 Primitives Match | **LOW** |
| Authentication Portal | Auth | `/auth` | 8 | Block Composite | **CRITICAL** |
| Public Website & Marketing | Careers | `/careers` | 26 | 6 Primitives Match | **HIGH** |
| Public Website & Marketing | Cms $ | `/cms/$` | 3 | Block Composite | **LOW** |
| Public Website & Marketing | Cms Index | `/cms/index` | 2 | Block Composite | **LOW** |
| Public Website & Marketing | Contact | `/contact` | 10 | 3 Primitives Match | **LOW** |
| Public Website & Marketing | Customer Display | `/customer-display` | 10 | 2 Primitives Match | **LOW** |
| Public Website & Marketing | Developer | `/developer` | 40 | 5 Primitives Match | **HIGH** |
| Public Website & Marketing | Docs | `/docs` | 48 | 5 Primitives Match | **HIGH** |
| Public Website & Marketing | Error 404 | `/error-404` | 1 | Block Composite | **LOW** |
| Public Website & Marketing | Error 500 | `/error-500` | 1 | Block Composite | **LOW** |
| Public Website & Marketing | Help Center | `/help-center` | 14 | 4 Primitives Match | **MEDIUM** |
| Public Website & Marketing | Public Home | `/` | 12 | 2 Primitives Match | **MEDIUM** |
| Public Website & Marketing | Legal $slug | `/legal/:slug` | 3 | Block Composite | **LOW** |
| Authentication Portal | Lock Screen | `/lock-screen` | 3 | Block Composite | **LOW** |
| Authentication Portal | Login | `/login` | 0 | Block Composite | **LOW** |
| Public Website & Marketing | Maintenance | `/maintenance` | 13 | 2 Primitives Match | **MEDIUM** |
| Public Website & Marketing | Offline | `/offline` | 1 | Block Composite | **LOW** |
| Public Website & Marketing | Og Preview | `/og-preview` | 20 | 4 Primitives Match | **MEDIUM** |
| Public Website & Marketing | P $slug | `/p/:slug` | 3 | Block Composite | **LOW** |
| Payment Gateway & Checkout Portal | Payment Failed | `/payment/failed` | 12 | 3 Primitives Match | **CRITICAL** |
| Payment Gateway & Checkout Portal | Payment Pending | `/payment/pending` | 9 | 3 Primitives Match | **CRITICAL** |
| Payment Gateway & Checkout Portal | Payment Success | `/payment/success` | 10 | 3 Primitives Match | **CRITICAL** |
| Client Document Portal | Portal Invoices $id | `/portal/invoices/:id` | 7 | 2 Primitives Match | **LOW** |
| Client Document Portal | Portal Proposals $id | `/portal/proposals/:id` | 23 | 5 Primitives Match | **CRITICAL** |
| Client Document Portal | Portal | `/portal` | 21 | 4 Primitives Match | **MEDIUM** |
| Public Website & Marketing | Pricing | `/pricing` | 21 | 3 Primitives Match | **MEDIUM** |
| Public Website & Marketing | Product | `/product` | 6 | 1 Primitives Match | **LOW** |
| Public Website & Marketing | Resources | `/resources` | 12 | 3 Primitives Match | **LOW** |
| Authentication Portal | Session Expired | `/session-expired` | 1 | Block Composite | **LOW** |
| Public Website & Marketing | Solutions | `/solutions` | 6 | 1 Primitives Match | **LOW** |
| Public Website & Marketing | Store | `/store` | 10 | 1 Primitives Match | **LOW** |
| Authentication Portal | Super Login | `/super-login` | 22 | 4 Primitives Match | **MEDIUM** |
| Authentication Portal | Verify 2fa | `/verify-2fa` | 11 | 2 Primitives Match | **LOW** |
| Client / Customer Portal | Dashboard | `/client/dashboard` | 0 | Block Composite | **CRITICAL** |
| Client / Customer Portal | Client Home | `/client` | 0 | Block Composite | **CRITICAL** |
| Employee Portal (ESS) | Dashboard | `/employee/dashboard` | 0 | Block Composite | **CRITICAL** |
| Employee Portal (ESS) | Employee Home | `/employee` | 0 | Block Composite | **CRITICAL** |
| Tenant Onboarding Portal | Onboarding | `/onboarding` | 17 | 4 Primitives Match | **CRITICAL** |
| Authenticated General | Route | `/route` | 1 | Block Composite | **CRITICAL** |
| Super Admin Portal | Agents | `/super/agents` | 10 | Block Composite | **CRITICAL** |
| Super Admin Portal | Analytics | `/super/analytics` | 30 | 5 Primitives Match | **CRITICAL** |
| Super Admin Portal | Api Docs | `/super/api-docs` | 33 | 5 Primitives Match | **CRITICAL** |
| Super Admin Portal | Backup | `/super/backup` | 11 | 3 Primitives Match | **CRITICAL** |
| Super Admin Portal | Blogs | `/super/blogs` | 33 | 6 Primitives Match | **CRITICAL** |
| Super Admin Portal | Case Studies | `/super/case-studies` | 33 | 6 Primitives Match | **CRITICAL** |
| Super Admin Portal | Cms | `/super/cms` | 62 | 6 Primitives Match | **CRITICAL** |
| Super Admin Portal | Coupons | `/super/coupons` | 20 | 4 Primitives Match | **CRITICAL** |
| Super Admin Portal | Domains Documentation | `/super/domains/documentation` | 21 | 3 Primitives Match | **CRITICAL** |
| Super Admin Portal | Domains | `/super/domains` | 34 | 4 Primitives Match | **CRITICAL** |
| Super Admin Portal | Email Templates | `/super/email-templates` | 22 | 5 Primitives Match | **CRITICAL** |
| Super Admin Portal | Escalation Rules | `/super/escalation-rules` | 10 | Block Composite | **CRITICAL** |
| Super Admin Portal | Super Home | `/super` | 16 | 3 Primitives Match | **CRITICAL** |
| Super Admin Portal | Languages | `/super/languages` | 27 | 6 Primitives Match | **CRITICAL** |
| Super Admin Portal | Marketplace | `/super/marketplace` | 36 | 6 Primitives Match | **CRITICAL** |
| Super Admin Portal | Media | `/super/media` | 28 | 6 Primitives Match | **CRITICAL** |
| Super Admin Portal | Notifications | `/super/notifications` | 11 | 4 Primitives Match | **CRITICAL** |
| Super Admin Portal | Plans | `/super/plans` | 35 | 5 Primitives Match | **CRITICAL** |
| Super Admin Portal | Profile | `/super/profile` | 31 | 5 Primitives Match | **CRITICAL** |
| Super Admin Portal | Roles | `/super/roles` | 43 | 6 Primitives Match | **CRITICAL** |
| Super Admin Portal | Route | `/super/route` | 25 | 1 Primitives Match | **CRITICAL** |
| Super Admin Portal | Settings | `/super/settings` | 54 | 6 Primitives Match | **CRITICAL** |
| Super Admin Portal | Sla Policies | `/super/sla-policies` | 10 | Block Composite | **CRITICAL** |
| Super Admin Portal | Support | `/super/support` | 32 | 7 Primitives Match | **CRITICAL** |
| Super Admin Portal | Tenant Support Tickets | `/super/tenant-support-tickets` | 12 | Block Composite | **CRITICAL** |
| Super Admin Portal | Tenant Usage Metrics | `/super/tenant-usage-metrics` | 25 | Block Composite | **CRITICAL** |
| Super Admin Portal | Tenants | `/super/tenants` | 49 | 3 Primitives Match | **CRITICAL** |
| Super Admin Portal | Transactions | `/super/transactions` | 34 | 2 Primitives Match | **CRITICAL** |
| Super Admin Portal | Users | `/super/users` | 40 | 7 Primitives Match | **CRITICAL** |
| Tenant Management | Tenant Home | `/tenant` | 0 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Accounting | `/accounting` | 50 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Adjustments | `/adjustments` | 36 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai Attendance Insights | `/ai-attendance-insights` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai Configuration | `/ai-configuration` | 1 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai Hiring Forecast | `/ai-hiring-forecast` | 30 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai Ocr | `/ai-ocr` | 17 | 4 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai Payroll Forecast | `/ai-payroll-forecast` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai Settings | `/ai-settings` | 1 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai Team Performance Insights | `/ai-team-performance-insights` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai Writer | `/ai-writer` | 30 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ai | `/ai` | 43 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Analytics | `/analytics` | 43 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Announcements | `/announcements` | 42 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Asset Dashboard | `/asset-dashboard` | 6 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Assets | `/assets` | 36 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Attendance Employee | `/attendance-employee` | 34 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Attendance Report | `/attendance-report` | 30 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Attendance | `/attendance` | 55 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Awards | `/awards` | 45 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ban Ip Address | `/ban-ip-address` | 31 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Biometric Sync | `/biometric-sync` | 48 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Biometric | `/biometric` | 59 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Budgets | `/budgets` | 38 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Calendar | `/calendar` | 27 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Call History | `/call-history` | 35 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Campaigns | `/campaigns` | 31 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Campus Hiring | `/campus-hiring` | 38 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Certification Tracking | `/certification-tracking` | 39 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Chat | `/chat` | 67 | 4 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Clear Cache | `/clear-cache` | 20 | 3 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Client Dashboard | `/client-dashboard` | 37 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Clients | `/clients` | 36 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Companies | `/companies` | 41 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Contacts | `/contacts` | 53 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Crm Dashboard | `/crm-dashboard` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Crm | `/crm` | 46 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Cronjob | `/cronjob` | 41 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Currencies | `/currencies` | 35 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Custom Fields | `/custom-fields` | 28 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Daily Report | `/daily-report` | 30 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Dashboard | `/dashboard` | 0 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Deals Dashboard | `/deals-dashboard` | 6 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Departments | `/departments` | 35 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Designations | `/designations` | 36 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Documents | `/documents` | 44 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Employee Dashboard | `/employee-dashboard` | 7 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Employee Details | `/employee-details` | 41 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Employee Report | `/employee-report` | 28 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Employees | `/employees` | 72 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Expenses Report | `/expenses-report` | 25 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Expenses | `/expenses` | 61 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Finance Dashboard | `/finance-dashboard` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Forms | `/forms` | 52 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Google Workspace | `/google-workspace` | 27 | 4 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Help Desk Dashboard | `/help-desk-dashboard` | 6 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Helpdesk | `/helpdesk` | 45 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Holidays | `/holidays` | 36 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Hrm Dashboard | `/hrm-dashboard` | 4 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Hrm | `/hrm` | 9 | 2 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Integrations | `/integrations` | 50 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Inventory Dashboard | `/inventory-dashboard` | 10 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Invoice Report | `/invoice-report` | 33 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Invoice $id Print | `/invoice/:id/print` | 8 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Invoice $id | `/invoice/:id` | 37 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Invoice Create | `/invoice/create` | 1 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Invoices | `/invoices` | 41 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | It Admin Dashboard | `/it-admin-dashboard` | 4 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Leads Dashboard | `/leads-dashboard` | 5 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Learning Analytics | `/learning-analytics` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Leave Report | `/leave-report` | 27 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Leave | `/leave` | 47 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Marketplace | `/marketplace` | 23 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Media | `/media` | 28 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Notes | `/notes` | 27 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Notice Period Tracker | `/notice-period-tracker` | 43 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Offboarding | `/offboarding` | 45 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Okr | `/okr` | 32 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Overtime | `/overtime` | 37 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Payment Report | `/payment-report` | 25 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Payroll Dashboard | `/payroll-dashboard` | 7 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Payroll | `/payroll` | 57 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Payslip Report | `/payslip-report` | 39 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Performance Appraisal | `/performance-appraisal` | 44 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Performance Indicator | `/performance-indicator` | 41 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Performance Review | `/performance-review` | 32 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Pipeline | `/pipeline` | 35 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Pos Dashboard | `/pos-dashboard` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Pos | `/pos` | 50 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Probation | `/probation` | 35 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Procurement Dashboard | `/procurement-dashboard` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Products | `/products` | 58 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Profile | `/profile` | 32 | 4 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Project Dashboard | `/project-dashboard` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Project Report | `/project-report` | 25 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Project $id | `/project/:id` | 57 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Projects | `/projects` | 50 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Promotions | `/promotions` | 34 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Proposals | `/proposals` | 18 | 4 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Provident Fund | `/provident-fund` | 41 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Purchases | `/purchases` | 42 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Razorpay Gateway | `/razorpay-gateway` | 24 | 4 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Recruitment Dashboard | `/recruitment-dashboard` | 1 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Recruitment | `/recruitment` | 58 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Recurring Invoices | `/recurring-invoices` | 41 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Referrals | `/referrals` | 39 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Resignation | `/resignation` | 37 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Returns | `/returns` | 41 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Route | `/_app` | 36 | 2 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Sales Dashboard | `/sales-dashboard` | 10 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Settings Custom Domain | `/settings/custom-domain` | 7 | 1 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Settings | `/settings` | 61 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Setup Notes | `/setup-notes` | 15 | 3 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Shift Swap Requests | `/shift-swap-requests` | 38 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Shifts | `/shifts` | 43 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Shopify | `/shopify` | 41 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Subscription | `/subscription` | 36 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Suppliers | `/suppliers` | 33 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Support Dashboard | `/support-dashboard` | 3 | Block Composite | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Support | `/support` | 34 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | System States | `/system-states` | 26 | 3 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Tally Importer | `/tally-importer` | 22 | 4 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Task Board | `/task-board` | 37 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Tasks | `/tasks` | 24 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Taxes | `/taxes` | 30 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Termination | `/termination` | 37 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Ticket Reports | `/ticket-reports` | 26 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Timesheets | `/timesheets` | 38 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Todo | `/todo` | 27 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Training | `/training` | 52 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Transfers | `/transfers` | 39 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Users | `/users` | 22 | 6 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Warnings | `/warnings` | 44 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Whatsapp Alerts | `/whatsapp-alerts` | 36 | 5 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Work From Home | `/work-from-home` | 37 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Workflows | `/workflows` | 31 | 7 Primitives Match | **CRITICAL** |
| Tenant Admin & Core ERP Portal | Workspace | `/workspace` | 14 | 3 Primitives Match | **CRITICAL** |

---

## 4. Phased Migration Recommendations

1. **Phase 1: Foundation Primitives (Low Risk)**
   - Replace standard primitives (`Button`, `Badge`, `Card`, `Input`, `Select`, `Separator`, `Tooltip`) with `@uiable/*` equivalents.
2. **Phase 2: Complex Displays & Tables (Medium Risk)**
   - Standardize data tables onto `@uiable/data-table` with unified filtering, pagination, and sorting.
3. **Phase 3: Marketing & Public Surfaces (Medium Risk)**
   - Align marketing landing pages, pricing blocks, and auth hero layouts with UIAble landing blocks (`block-hero`, `block-pricing`, `block-testimonials`).
4. **Phase 4: Mission-Critical Enterprise Workflows (Careful Phased Rollout)**
   - Retain existing domain logic for Payroll, Billing, Settings, and POS while adopting UIAble design tokens and outer shell layout blocks.
