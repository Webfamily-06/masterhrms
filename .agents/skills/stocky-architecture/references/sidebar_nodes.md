# Sidebar & Navigation Nodes Reference Manual

This document details the exhaustive navigation tree of Stocky configured in `resources/src/config/menu.js` and rendered via `SidebarMenu.vue`, `SidebarLarge.vue`, and `SidebarFlat.vue`.

---

## 1. Permission Evaluation & Target Resolution

### Permission Rule
*   If `permissions: []` (empty array): The item is **unconditionally visible** to all authenticated users.
*   If `permissions: ['perm_1', 'perm_2']`: The user must possess **at least ONE** of the listed permissions (`some(p => auth.can(p))`).
*   Submenus display only if `hasVisibleChildren(group)` evaluates to `true`.

### Target Resolution Bridge (`resolveTarget(to)`)
Stocky utilizes a strangler-fig migration pattern where migrated pages route internally in the Vue 3 router (`/next/*`), while non-migrated legacy screens deep-link into the legacy hash router (`/#/*`):
```javascript
export function resolveTarget(to) {
    if (!to) return null;
    const next = MIGRATED_ROUTES[to];
    return next ? { type: 'next', path: next } : { type: 'legacy', path: `/#${to}` };
}
```

---

## 2. Complete 32-Module Navigation Tree

### 1. Dashboard
*   **Key**: `dashboard`
*   **Label**: `dashboard`
*   **Icon**: `bar-chart` (`BarChart3`)
*   **Path**: `/dashboard`
*   **Permissions**: `[]` (Always visible)

### 2. Store (eCommerce Module)
*   **Key**: `Store`
*   **Label**: `Store`
*   **Icon**: `shopping-bag` (`ShoppingBag`)
*   **Group Permissions**: `['Store_settings_view', 'Orders_view', 'Collections_view', 'Banners_view', 'Subscribers_view', 'Messages_view', 'Customers_view']`
*   **Children**:
    1.  `Visit_Online_Store` -> `/online_store` (External link, `[]`)
    2.  `Settings` -> `/store/settings` (`['Store_settings_view']`)
    3.  `Payment_Gateway` -> `/store/payment-gateway` (`['payment_gateway']`)
    4.  `Online_Orders` -> `/store/orders` (`['Orders_view']`, **Badge**: `new_orders`)
    5.  `Collections` -> `/store/collections` (`['Collections_view']`)
    6.  `Banners` -> `/store/banners` (`['Banners_view']`)
    7.  `Subscribers` -> `/store/subscribers` (`['Subscribers_view']`)
    8.  `Messages` -> `/store/messages` (`['Messages_view']`, **Badge**: `messages`)
    9.  `Invite_Codes` -> `/store/invite-codes` (`['Store_settings_view']`)
    10. `Pending_Customers` -> `/store/pending-customers` (`['Store_settings_view']`, **Badge**: `pending_customers`)
    11. `Customers_without_Login` -> `/customers-without-login` (`['Customers_view']`)
    12. `Customers_with_Login` -> `/customers-with-login` (`['Customers_view']`)
    13. `Shipping_Methods` -> `/store/shipping-methods` (`['Store_settings_view']`)
    14. `Shipping_Zones` -> `/store/shipping-zones` (`['Store_settings_view']`)
    15. `Tax_Rates` -> `/store/tax-rates` (`['Store_settings_view']`)
    16. `Coupons` -> `/store/coupons` (`['Store_settings_view']`)
    17. `Flash_Sales` -> `/store/flash-sales` (`['Store_settings_view']`)
    18. `Product_Reviews` -> `/store/reviews` (`['Store_settings_view']`, **Badge**: `product_reviews`)
    19. `Popup_Messages` -> `/store/popups` (`['Store_settings_view']`)
    20. `Quote_Requests` -> `/store/quote-requests` (`['Orders_view']`, **Badge**: `quote_requests`)
    21. `Returns_Requests` -> `/store/returns` (`['Orders_view']`)
    22. `Pages` -> `/store/pages` (`['Store_settings_view']`)
    23. `Menus` -> `/store/menus` (`['Store_settings_view']`)
    24. **Sub-Group: `Real_Estate`**:
        *   `Properties` -> `/realestate/properties` (`['realestate_properties']`)
        *   `Property_Categories` -> `/realestate/categories` (`['realestate_categories']`)
        *   `Property_Inquiries` -> `/realestate/inquiries` (`['realestate_inquiries']`)

### 3. People (CRM)
*   **Key**: `People`
*   **Label**: `People`
*   **Icon**: `users` (`Users`)
*   **Group Permissions**: `['Customers_view', 'Suppliers_view', 'customers_import', 'Suppliers_import']`
*   **Children**:
    1.  `Customers` -> `/customers` (`['Customers_view']`)
    2.  `Add Customer` -> `/customers/create` (`['Customers_add']`, Composite keys: `['Add', 'Customer']`)
    3.  `Import_Customers` -> `/customers/import` (`['customers_import']`)
    4.  `Client_Portal` -> `/portal` (`['Customers_view']`, External)
    5.  `Suppliers` -> `/suppliers` (`['Suppliers_view']`)
    6.  `Add Supplier` -> `/suppliers/create` (`['Suppliers_add']`, Composite keys: `['Add', 'Supplier']`)
    7.  `Import_Suppliers` -> `/suppliers/import` (`['Suppliers_import']`)

### 4. User Management (Staff & RBAC)
*   **Key**: `User_Management`
*   **Label**: `User_Management`
*   **Icon**: `shield-check` (`ShieldCheck`)
*   **Group Permissions**: `['users_view', 'permissions_view']`
*   **Children**:
    1.  `Users` -> `/users` (`['users_view']`)
    2.  `GroupPermissions` (Roles & Permissions) -> `/permissions` (`['permissions_view']`)

### 5. Products & Inventory
*   **Key**: `products`
*   **Label**: `Products`
*   **Icon**: `library-big` (`LibraryBig`)
*   **Group Permissions**: `['products_add', 'products_view', 'product_import', 'opening_stock_import', 'barcode_view', 'brand', 'unit', 'count_stock', 'category', 'subcategory']`
*   **Children**:
    1.  `AddProduct` -> `/products/create` (`['products_add']`)
    2.  `productsList` -> `/products` (`['products_view']`)
    3.  `import_products` -> `/products/import` (`['product_import']`)
    4.  `Import (Update Only)` -> `/products/import-update` (`['product_import']`)
    5.  `Opening_Stock` -> `/products/opening-stock-import` (`['opening_stock_import']`)
    6.  `Printbarcode` -> `/products/barcode` (`['barcode_view']`)
    7.  `CountStock` (Physical Inventory Count) -> `/products/count-stock` (`['count_stock']`)
    8.  `Categories` -> `/categories` (`['category']`)
    9.  `SubCategory` -> `/subcategories` (`['subcategory']`)
    10. `Brand` -> `/brands` (`['brand']`)
    11. `Size_Guides` -> `/size-guides` (`['size_guides']`)
    12. `Units` -> `/units` (`['unit']`)
    13. `Vehicle Fitment` -> `/products/vehicle-fitment` (`['products_view']`)
    14. `Batches` -> `/products/batches` (`['view_batches', 'batch_view']`)
    15. `Serial_Numbers` -> `/serial-numbers` (`['serial_numbers']`)

### 6. Sales & Point of Sale
*   **Key**: `sales`
*   **Label**: `Sales`
*   **Icon**: `shopping-cart` (`ShoppingCart`)
*   **Group Permissions**: `['Sales_view', 'Sales_add', 'Pos_view', 'customer_display_screen_setup', 'shipment', 'real_time_sales_counter']`
*   **Children**:
    1.  `ListSales` -> `/sales` (`['Sales_view']`)
    2.  `AddSale` -> `/sales/create` (`['Sales_add']`)
    3.  `Import_Sales` -> `/sales/import` (`['Sales_add']`)
    4.  `POS` -> `/pos` (`['Pos_view']`)
    5.  `Customer_Screen` -> `/customer-display/setup` (`['customer_display_screen_setup']`)
    6.  `Shipments` -> `/shipments` (`['shipment']`)
    7.  `Real_time_Sales_Counter` -> `/real-time-sales-counter` (`['real_time_sales_counter']`)

### 7. Kitchen Display System (KDS)
*   **Key**: `kitchen`
*   **Label**: `Kitchen`
*   **Icon**: `chef-hat` (`ChefHat`)
*   **Group Permissions**: `['kitchen_display_view']`
*   **Children**:
    1.  `KitchenDisplay` -> `/kitchen-display` (`['kitchen_display_view']`)
    2.  `KitchenReport` -> `/kitchen/report` (`['kitchen_display_view']`)

### 8. Sales Returns
*   **Key**: `sale_return`
*   **Label**: `SalesReturn`
*   **Icon**: `chevron-right`
*   **Path**: `/sale-returns`
*   **Permissions**: `['Sale_Returns_view']`

### 9. Purchases & Replenishment
*   **Key**: `purchases`
*   **Label**: `Purchases`
*   **Icon**: `receipt` (`Receipt`)
*   **Group Permissions**: `['Purchases_view', 'Purchases_add']`
*   **Children**:
    1.  `AddPurchase` -> `/purchases/create` (`['Purchases_add']`)
    2.  `ListPurchases` -> `/purchases` (`['Purchases_view']`)
    3.  `Import_Purchases` -> `/purchases/import` (`['Purchases_add']`)

### 10. Purchases Returns
*   **Key**: `purchase_return`
*   **Label**: `PurchasesReturn`
*   **Icon**: `chevron-left`
*   **Path**: `/purchase-returns`
*   **Permissions**: `['Purchase_Returns_view']`

### 11. Quotations
*   **Key**: `quotations`
*   **Label**: `Quotations`
*   **Icon**: `shopping-basket`
*   **Group Permissions**: `['Quotations_view', 'Quotations_add']`
*   **Children**:
    1.  `AddQuote` -> `/quotations/create` (`['Quotations_add']`)
    2.  `ListQuotations` -> `/quotations` (`['Quotations_view']`)

### 12. Stock Adjustments & Transfers
*   **Key**: `adjustments` -> `Stock Adjustment` (`['adjustment_view', 'adjustment_add']`):
    *   `CreateAdjustment` -> `/adjustments/create`
    *   `ListAdjustments` -> `/adjustments`
*   **Key**: `transfers` -> `Stock Transfers` (`['transfer_view', 'transfer_add']`):
    *   `CreateTransfer` -> `/transfers/create`
    *   `ListTransfers` -> `/transfers`
*   **Key**: `damages` -> `Damages` (`['damage_view']`):
    *   `Create_Damage` -> `/damages/create`
    *   `Damages` -> `/damages`

### 13. Human Resource Management (HRM)
*   **Key**: `hrm`
*   **Label**: `hrm`
*   **Icon**: `library` (`Library`)
*   **Children**:
    1.  `Company` -> `/hrm/companies` (`['company']`)
    2.  `Departments` -> `/hrm/departments` (`['department']`)
    3.  `Designations` -> `/hrm/designations` (`['designation']`)
    4.  `Office_Shift` -> `/hrm/office-shifts` (`['office_shift']`)
    5.  `Employees` -> `/hrm/employees` (`['view_employee']`)
    6.  `Attendance` -> `/hrm/attendance` (`['attendance']`)
    7.  `Leave_request` Sub-group (`['leave']`):
        *   `Leave_request` -> `/hrm/leaves`
        *   `Leave_type` -> `/hrm/leave-types`
    8.  `Holidays` -> `/hrm/holidays` (`['holiday']`)
    9.  `Payroll` -> `/hrm/payrolls` (`['payroll']`)
    10. `Contracts` -> `/contracts` (`['contracts']`)
    11. `Knowledge_Base` -> `/kb` (`['knowledge_base_view']`)
    12. `Article Groups` -> `/kb/groups` (`['knowledge_base_view']`)

### 14. Accounting & Finance (V2 Double-Entry)
*   **Key**: `accounting`
*   **Label**: `Accounting`
*   **Icon**: `wallet` (`Wallet`)
*   **Children**:
    1.  `dashboard` -> `/accounting-v2/dashboard` (`['accounting_dashboard']`)
    2.  `Chart_of_Accounts_Title` -> `/accounting-v2/chart-of-accounts` (`['chart_of_accounts']`)
    3.  `Journal_Entries_Title` -> `/accounting-v2/journal-entries` (`['journal_entries']`)
    4.  `Trial_Balance_Title` -> `/accounting-v2/reports/trial-balance` (`['trial_balance']`)
    5.  `Profit_Loss_Title` -> `/accounting-v2/reports/profit-and-loss` (`['accounting_profit_loss']`)
    6.  `Balance_Sheet_Title` -> `/accounting-v2/reports/balance-sheet` (`['balance_sheet']`)
    7.  `Tax_Summary_Report` -> `/accounting-v2/reports/tax-report` (`['accounting_tax_report']`)
    8.  `List_accounts` -> `/accounts` (`['account']`)
    9.  `Transfers_Money` -> `/transfer-money` (`['transfer_money']`)
    10. `Create_Expense` / `ListExpenses` -> `/expenses/create`, `/expenses` (`['expense_add']`, `['expense_view']`)
    11. `Create_deposit` / `List_Deposit` -> `/deposits/create`, `/deposits` (`['deposit_add']`, `['deposit_view']`)
    12. `Expense_Category` / `Deposit_Category` -> `/expenses/categories`, `/deposits/categories`

### 15. Extended Vertical ERP Modules
*   **`recruit` (Recruitment & Hiring)**: Jobs, Candidates, Applications, Interviews, Categories, Reports.
*   **`meeting` (Calendar & Meeting Rooms)**: Dashboard, Meetings, Calendar, Reports.
*   **`marketing` (Omnichannel Marketing)**: Campaigns, Segments, SMS/WhatsApp/Email Templates, Reports.
*   **`EWallet` & `commissions`**: Customer eWallets, Gift Cards, Sales Agent Commissions.
*   **`manufacturing` (MRP)**: Bills of Materials (BOM), Work Centres, Production Orders, Shop Floor, Quality Control.
*   **`assets` (Asset Tracking)**: Asset Lifecycle, Assignments, Maintenance, Depreciation.
*   **`projects` (Project & Task Tracking)**: Kanban Task Board, Milestones, Timesheets.
*   **`bookings` (Appointments & Salon/Clinic Trays)**: Appointments list, Calendar View, Trays.
*   **`service` (Repair & Warranty Workshops)**: Service Jobs, Technicians, Checklists, Repair History.
*   **`fleet` (Vehicle Management)**: Vehicles, Maintenance, Fuel Logs, Assignments, Trip Reports.
*   **`hospital` (HMS)**: Patients, Appointments, Visits, Admissions, Wards/Beds, Lab Orders, Billing.
*   **`school` (SMS)**: Students, Enrollment, Attendance, Timetable, Exams & Grades, Tuition Fees.
*   **`ecommerce_platforms` & `integrations`**: WooCommerce, Shopify, Salla, PrestaShop, Jumia, QuickBooks, Xero, Google Sheets, Mailchimp, Slack, Telegram, Webhooks.

### 16. System Settings
*   **Key**: `settings`
*   **Label**: `Settings`
*   **Icon**: `database-zap` (`DatabaseZap`)
*   **Children**:
    1.  `SystemSettings` -> `/settings/system` (`['setting_system']`)
    2.  `update_settings` -> `/settings/update` (`['update_settings']`)
    3.  `Warehouses` -> `/warehouses` (`['warehouse']`)
    4.  `Modules` (Feature Toggles) -> `/settings/business-modules` (`['business_modules']`)
    5.  `Zatca_E_Invoicing` (Saudi Fatoora) -> `/settings/zatca` (`['zatca_settings']`)
    6.  `Dynamic_Appearance` -> `/settings/appearance` (`['appearance_settings']`)
    7.  `Languages` (Translation Editor) -> `/settings/languages` (`['translations_settings']`)
    8.  `Payment_Methods` -> `/settings/payment-methods` (`['payment_methods']`)
    9.  `sms_settings` & `sms_templates` -> `/settings/sms`, `/settings/sms-templates`
    10. `mail_settings` & `email_templates` -> `/settings/mail`, `/settings/email-templates`
    11. `Pos_Settings` & `POS_Receipt` (Designer) -> `/settings/pos`, `/settings/pos-receipt`
    12. `Payment_Gateway` (Stripe, Paypal, Paystack, etc.) -> `/settings/payment-gateway`
    13. `Currencies` & Exchange Rates -> `/currencies` (`['currency']`)
    14. `Backup` (Local & S3 DB Backups) -> `/settings/backup` (`['backup']`)
    15. `System_Health` -> `/settings/system-health` (`['system_health_view']`)
    16. `Login_Device_Management` -> `/settings/login-devices` (`['login_device_management']`)
    17. `Loyalty_Rewards` -> `/loyalty/rewards` (`['loyalty_rewards']`)

### 17. Reports (58 Business Reports)
*   **Key**: `reports`
*   **Label**: `Reports`
*   **Icon**: `trending-up` (`TrendingUp`)
*   **Children**:
    *   *AI Reports* & *3D Sales Dashboard*
    *   *Payments Group*: Purchases, Sales, Sales Return, Purchase Return Payments
    *   *Profit Reports*: By Product, By Category, By Unit, By Customer, By Date, By Warehouse
    *   *Financials*: Profit & Loss, Transactions, Cash Flow, Seller Report, Tax Summary
    *   *Inventory Reports*: Valuation Summary, Stock Inventory Valuation, Quantity Alerts, Warehouse Report, Internal Location Report, Stock Report, Serial Movement/Sold/Available/Inventory, Negative Stock, Zero Sales, Dead Stock, Expiry Report, Batch Register, Stock Aging, Stock Transfer, Stock Adjustment
    *   *CRM & Sales Reports*: Discount Summary, Customer Loyalty Points, Draft Invoices, Return Ratio, Sales Report, Product Sales Summary, Sales by Category/Brand, Customers Report, Inactive Customers, Top Suppliers/Customers, Top Selling Products
    *   *Operations & Audit*: Cash Registers, Attendance Summary, Service Jobs, Maintenance History, User Report, Login Activity, Error Logs
