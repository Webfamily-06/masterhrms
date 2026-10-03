# Stocky v5.8 — API Architecture, Protocol Contracts & Complete Endpoint Catalog

This document is the authoritative engineering specification for Stocky's REST API layer, synthesized from the application codebase, `documentation/documentation/api/guides.js`, and the 9.14MB OpenAPI 3.0.3 specification in `documentation/documentation/api/openapi.json`.

It covers **1,251 API paths**, **1,607 operations**, **5 distinct API surfaces**, security and token lifecycles, universal list query contracts, warehouse and record scoping, error envelopes, webhooks, and the exact API endpoint mappings for every functional page and workflow.

---

## 1. Architectural Topology & 5 API Surfaces

Stocky segments its REST endpoints into five distinct surfaces, each with its own authentication guard, rate limiting, and middleware pipeline:

```
                                 [CLIENT REQUEST]
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        │                                                                 │
   [Public / Web]                                                   [JSON API]
  Accept: */* or HTML                                         Accept: application/json
        │                                                                 │
        ├──────────────────────┬──────────────────────┬───────────────────┴───────────────────────┐
        ▼                      ▼                      ▼                                           ▼
1. Public Endpoints     2. Storefront (Web)   3. Client Portal (Web)                     4. Admin / Mobile API
- /api/ping             - /online_store/*     - /api/portal/*                            - /api/*
- /api/sale_pdf/*       Guard: 'store'        Guard: 'portal'                            Guard: 'api' (Passport)
- Webhooks              Session Cookie        Session Cookie                             Bearer Token or Cookie
- No Auth               CSRF: X-XSRF-TOKEN    CSRF: X-XSRF-TOKEN                         Is_Active Middleware
                        Throttled: 60/min     Throttled: 60/min                          Timeout: session_timeout
```

### Surface Specifications Matrix

| Surface | URL Namespace | Auth Mechanism | Session / Token Lifecycle | Rate Limit | Primary Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`admin`** | `/api/…` | Laravel Passport Bearer Token or `Stocky_token` cookie | Generated via `POST /api/getAccessToken`. Does not expire automatically; revoked on `POST /api/logout`, inactivity timeout (`session_timeout_minutes`), or user deactivation (`Is_Active`). | Standard API throttle | Vue 3 Admin SPA, Desktop POS, ERP Admin |
| **`mobile`** | `/api/mobile/…` | Laravel Passport Bearer Token | Authenticated via `POST /api/mobile/login`. Requires `settings.mobile_app_enabled = 1`. Returns user object, token, and complete permission list. | 10 req/min on login | Android / iOS Native Apps |
| **`portal`** | `/api/portal/…` | Session cookie on `portal` guard | Authenticated via `POST /api/portal/login`. Starts Laravel session. Mutations require CSRF token header (`X-XSRF-TOKEN`). | 60 req/min | B2B Customer Portal SPA |
| **`storefront`** | `/online_store/…` | Session cookie on `store` guard | Authenticated via `POST /online_store/login` or `POST /online_store/register`. Blocked with `404` if `store.enabled` is false. | Standard Web | Blade + Tailwind Storefront, Shoppers |
| **`public`** | `/api/…` | None (Unauthenticated) | Stateless. Includes health probe (`/api/ping`), PDF / HTML renderers, translation catalog, payment gateway callbacks, incoming webhooks. | Per-route throttles | Third-party systems, Browser print tabs, Gateways |

---

## 2. Authentication Workflows & Security Contracts

### 2.1 Admin API Authentication Flow (`POST /api/getAccessToken`)

Staff credentials (email + password) are exchanged for a Passport Personal Access Token:

```http
POST /api/getAccessToken HTTP/1.1
Host: your-stocky.example.com
Accept: application/json
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

#### Response Envelope (200 OK):
> [!WARNING]
> **Login 200 Caveat**: The login endpoint **always** returns HTTP `200`, even on failure. API clients must explicitly inspect the boolean `status` property:
> - `status: true` $\rightarrow$ Authentication successful. Token present in `Stocky_token`.
> - `status: false` $\rightarrow$ Invalid email or password.
> - `status: "NotActive"` $\rightarrow$ Account exists but is deactivated by administrator.

```json
{
  "Stocky_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImE2YTU5...",
  "username": "William Castillo",
  "status": true
}
```

#### Subsequent Request Headers:
Clients must attach the token in either of two ways:
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...
# OR (Used automatically by Vue SPA when credentials: true)
Cookie: Stocky_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...
```

#### Universal Middleware Pipeline:
1. **`auth:api`**: Validates Passport token signature and expiry. Returns `401 {"message":"Unauthenticated."}` if missing/invalid.
2. **`Is_Active`**: Checks `users.statut == 1`. If an admin disables a user, their active token is rejected immediately on their very next API call (`403 {"message":"This action is unauthorized."}`).
3. **`session_timeout_minutes`**: Evaluates inactivity duration from `settings.session_timeout_minutes`. If idle time is exceeded, revokes token.
4. **`X-XSRF-TOKEN`**: In cookie-authenticated browser contexts, Passport requires the `X-XSRF-TOKEN` cookie to be read and sent back in the `X-XSRF-TOKEN` header on all mutation requests (`POST`, `PUT`, `DELETE`, `PATCH`).

---

## 3. Universal List Endpoint Query Contract (Rule 0)

Every list endpoint marked with `x-paginated: true` in the OpenAPI specification implements the identical five-parameter query contract. Omitting these defaults causes runtime exceptions in controllers that invoke `$request->SortField` directly into Eloquent's `orderBy()`.

### Query Parameters

| Parameter | Type | Default | Validation & Rules | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **`limit`** | integer | `10` | $\ge -1$. Set to `-1` to disable pagination and stream all matching records. | Rows per page. |
| **`page`** | integer | `1` | 1-indexed positive integer. Ignored if `limit = -1`. | Target page number. |
| **`SortField`** | string | `id` | Must match a physical column in the underlying table (or registered alias). | Column to order by. |
| **`SortType`** | string | `desc` | `asc` or `desc` (case-insensitive). | Sort direction. |
| **`search`** | string | `null` | String up to 255 chars. Escaped internally. | Substring match (`LIKE %term%`) across indexed search columns (e.g. `Ref`, `name`, `code`, `phone`, `email`). |

### Standard List Response Structure

```json
{
  "sales": [
    {
      "id": 142,
      "date": "2026-09-16",
      "Ref": "SL_1112",
      "statut": "completed",
      "GrandTotal": 349.500,
      "paid_amount": 349.500,
      "due": 0.000,
      "payment_statut": "paid",
      "client_name": "ACME Corporation",
      "warehouse_name": "Main Warehouse",
      "created_at": "2026-09-16 10:15:22"
    }
  ],
  "totalRows": 138
}
```
*Note*: The data array key is dynamically named after the resource plural (`sales`, `purchases`, `products`, `clients`, `providers`, `report`, `data`).

---

## 4. Multi-Tenant Scoping, Permissions & Precision Standards

### 4.1 Server-Side Warehouse Scoping
Every list, report, and stock lookup enforces warehouse isolation at the SQL query builder level:
- If the authenticated user has `users.is_all_warehouses == 1`, they can access any warehouse or query with `warehouse_id = null` for an aggregate view.
- If `users.is_all_warehouses == 0`, the query builder injects `WHERE warehouse_id IN (SELECT warehouse_id FROM user_warehouse WHERE user_id = :auth_id)`. Passing a `warehouse_id` query parameter outside this assigned set is ignored or throws a `403`.

### 4.2 Document Visibility (`record_view`)
- Users possessing the `record_view` permission slug can view documents generated by all staff across their permitted warehouses.
- Users **lacking** `record_view` have their queries automatically scoped to `WHERE user_id = :auth_id`. They only see documents they created themselves.
- When attempting to edit or delete another user's document, the `check_record` permission is validated.

### 4.3 3-Decimal Precision Currency Standard
All monetary values, line taxes, unit prices, discounts, sub-totals, and inventory quantity balances follow the `DECIMAL(16, 3)` schema:
- Database Storage: `DECIMAL(16, 3)` (e.g. `124.500`).
- JSON API Serialization: Serialized as machine numbers (or formatted with standard dot separator, no thousands commas, e.g. `124.500`).
- Currency Representation:
  - **Base Currency**: Default financial unit configured in `settings.currency_id`.
  - **Document Currency**: If multi-currency is used, payload includes `currency_id` (foreign currency) and `exchange_rate` (snapshot of the rate at document creation time).

### 4.4 Standard Document Line Item Architecture (`details[]`)
All transactional documents (Sales, Purchases, Quotations, Returns, Adjustments, Transfers) accept line items through a `details[]` array with unified field semantics:

```json
{
  "product_id": 45,
  "product_variant_id": 12,
  "quantity": 2.000,
  "sale_unit_id": 1,
  "Unit_price": 49.900,
  "tax_percent": 15.000,
  "tax_method": "1",
  "discount": 5.000,
  "discount_Method": "2",
  "subtotal": 94.800,
  "imei_number": "358920112345678,358920112345679",
  "batches": [
    {
      "product_batch_id": 8,
      "qty": 2.000
    }
  ]
}
```
- `tax_method`: `"1"` = Exclusive (tax added on top of unit price); `"2"` = Inclusive (tax embedded in unit price).
- `discount_Method`: `"1"` = Percentage; `"2"` = Fixed currency amount.
- `imei_number`: Comma-delimited list of serial numbers (validated against stock when status is `completed`).
- `batches`: Allocation breakdown for batch-tracked items with expiration dates.

---

## 5. Webhooks & Integration Contracts

### 5.1 Outgoing Event Webhooks
Stocky dispatches signed HTTP POST notifications to third-party endpoints on system events (`sale.created`, `sale.updated`, `product.created`, `product.updated`, `stock.alert`).

#### Subscription Management Endpoints:
- `GET /api/webhooks`: List active webhook subscriptions.
- `POST /api/webhooks`: Register a webhook URL, event list, custom headers, and timeout.
- `GET /api/webhooks/available-events`: Fetch list of supported event slugs.
- `POST /api/webhooks/{id}/test`: Trigger an immediate test ping payload.
- `POST /api/webhooks/{id}/regenerate-secret`: Rotate signing secret.
- `GET /api/webhooks/deliveries`: Inspect delivery log, HTTP response codes, execution latency.

#### Signature Verification:
Each outbound POST contains two standard headers:
```http
Content-Type: application/json
X-Stocky-Event: sale.created
X-Stocky-Signature: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```
Verification Formula: `HMAC-SHA256(raw_body, webhook_secret)`
```javascript
// Node.js Verification
const crypto = require('crypto');
const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
const isValid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers['x-stocky-signature']));
```

### 5.2 Incoming Webhook Handler (`POST /api/webhooks/incoming/{source}`)
Public intake endpoint for third-party systems (e.g. ERP, external POS, custom eCommerce).
- Route: `POST /api/webhooks/incoming/{source}`
- Authenticates payload signature against configured `source` secret.
- Logs intake payload into `incoming_webhook_logs` table (`GET /api/webhooks/incoming-logs`).

### 5.3 Payment Gateway Webhook Receivers
- `POST /api/store/webhooks/paypal`
- `POST /api/store/webhooks/razorpay`
- `POST /api/store/webhooks/paystack`
- `POST /api/store/webhooks/flutterwave`
- `POST /api/store/webhooks/sslcommerz`

---

## 6. Complete Module-by-Module API Catalog & Request Flows

The 1,607 API operations map directly to the 15 functional modules of the Stocky platform:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      15 FUNCTIONAL API MODULE DOMAINS                            │
├───────────────────────┬──────────────────────────┬───────────────────────────────┤
│ 01. Auth & Sessions   │ 06. Stock Logistics      │ 11. Accounting & Finance      │
│ 02. Dashboard & KPIs  │ 07. Customers & Loyalty  │ 12. HRM & Workforce           │
│ 03. POS & Hardware    │ 08. Storefront (B2C)     │ 13. Vertical Modules (MRP...) │
│ 04. Sales & Shipments │ 09. Client Portal (B2B)  │ 14. Reports Engine (60+ APIs) │
│ 05. Purchases & Supply│ 10. Products & Catalog   │ 15. System Administration     │
└───────────────────────┴──────────────────────────┴───────────────────────────────┘
```

---

### Module 01: Authentication, Sessions & Security (26 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/getAccessToken` | Exchange staff credentials for Passport Bearer token | None (Public) | `admin` |
| `POST` | `/api/logout` | Revoke active access token and destroy session | None (Auth) | `admin` |
| `GET` | `/api/user` | Fetch current authenticated user, role, and permission slugs | None (Auth) | `admin` |
| `GET` | `/api/Get_Permissions` | Retrieve array of all permissions assigned to user's role | None (Auth) | `admin` |
| `POST` | `/api/sync-locale` | Update user interface language preference | None (Auth) | `admin` |
| `POST` | `/api/mobile/login` | Mobile app login (rate-limited to 10 req/min) | None (Public) | `mobile` |
| `POST` | `/api/mobile/device-tokens` | Register FCM push notification device token | None (Auth) | `mobile` |
| `DELETE`| `/api/mobile/device-tokens/{token}` | Unregister FCM push notification device token | None (Auth) | `mobile` |
| `POST` | `/api/portal/login` | Client portal login (starts `portal` session) | None (Public) | `portal` |
| `POST` | `/api/portal/logout` | Client portal logout | None (Auth) | `portal` |
| `GET` | `/api/portal/profile` | Retrieve customer profile and contact details | None (Auth) | `portal` |
| `PUT` | `/api/portal/profile` | Update customer profile and password | None (Auth) | `portal` |
| `GET` | `/api/security/active-sessions` | List active sessions across devices | `setting_system` | `admin` |
| `DELETE`| `/api/security/sessions/{id}` | Terminate and revoke remote device session | `setting_system` | `admin` |
| `GET` | `/api/security/login-activity-report`| Audit log of IP addresses, devices, and logins | `setting_system` | `admin` |
| `GET` | `/api/ping` | Health check probe (returns `{"status":"ok"}`) | None (Public) | `public` |

---

### Module 02: Dashboard & Realtime Analytics (5 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard_data` | Primary KPI metrics: today's sales, purchases, profit, returns, dues, recent sales, and warehouse filters | `dashboard` | `admin` |
| `GET` | `/api/chart_sale_purchase` | Monthly aggregate sales vs purchases bar chart data | `dashboard` | `admin` |
| `GET` | `/api/report/stock_alert` | Realtime low stock sentinel notifications ($\le \text{stock\_alert}$) | None (Auth) | `admin` |
| `GET` | `/api/report/top_customers` | Top 5 customer spenders list | `Top_customers` | `admin` |
| `GET` | `/api/report/top_products` | Top 5 best-selling products by quantity and revenue | `Top_products` | `admin` |

---

### Module 03: Point of Sale (POS), Registers & Hardware (39 Endpoints)

```
                           [POS HARDWARE & SCREEN PIPELINE]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
       [1. Cash Register]                               [2. POS Cart Actions]
  POST /api/cash-registers/open                    POST /api/pos/create_draft (Hold)
  GET  /api/cash-registers/current/{id}            GET  /api/get_draft_sales
  POST /api/cash-registers/cash-move               GET  /api/pos/data_draft_convert_sale/{id}
  POST /api/cash-registers/close                   POST /api/pos/create_pos (Checkout)
                 │                                               │
                 ├───────────────────────┬───────────────────────┤
                 ▼                       ▼                       ▼
      [3. Customer Display]     [4. Kitchen Display]     [5. Thermal Receipt]
   POST /pos/customer-display/   POST /kitchen/orders     QZ-Tray WebSocket
        broadcast                PATCH /kitchen/item      or GET /sale_print_html/{id}
```

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/pos/data_create_pos` | Boot POS: loads warehouses, customers, categories, brands, payment methods, accounts, currencies, POS settings | `Pos_view` | `admin` |
| `GET` | `/api/pos/get_products_pos` | Paginated product grid with live stock quantities per warehouse | `Pos_view` | `admin` |
| `GET` | `/api/pos/get_products_pos_changes` | Polling endpoint: fetches stock changes since specified timestamp | `Pos_view` | `admin` |
| `POST` | `/api/pos/create_pos` | Finalize and submit POS sale transaction | `Pos_view` | `admin` |
| `POST` | `/api/pos/create_draft` | Hold current cart as a draft order | `Pos_view` | `admin` |
| `GET` | `/api/get_draft_sales` | List currently held POS draft sales | `Pos_view` | `admin` |
| `GET` | `/api/pos/data_draft_convert_sale/{id}`| Resume and restore a held draft into the active POS cart | `Pos_view` | `admin` |
| `DELETE`| `/api/remove_draft_sale/{id}` | Discard and delete a held draft sale | `Pos_view` | `admin` |
| `POST` | `/api/cash-registers/open` | Open a cash register with initial floating cash balance | `Pos_view` | `admin` |
| `GET` | `/api/cash-registers/current/{user_id}` | Check if user has an active open register | `Pos_view` | `admin` |
| `POST` | `/api/cash-registers/cash-move` | Record cash in or cash out movements with reason | `Pos_view` | `admin` |
| `POST` | `/api/cash-registers/close` | Reconcile cash, record closing note, and close register | `Pos_view` | `admin` |
| `POST` | `/api/pos/customer-display/broadcast`| Broadcast active cart lines and total to secondary customer display | None (Auth) | `admin` |
| `GET` | `/api/pos/customer-display/last-cart` | Long-poll or fetch latest cart state on customer display screen | None (Public) | `public` |
| `POST` | `/api/customer-display/generate` | Generate temporary pairing token for secondary screen | `customer_display_screen_setup` | `admin` |
| `GET` | `/api/pos/wallet-balance/{client_id}`| Check customer's e-wallet balance for POS payment | `Pos_view` | `admin` |
| `GET` | `/api/kitchen/orders` | Kitchen display board: list pending and in-prep orders | `kitchen_display_view` | `admin` |
| `POST` | `/api/kitchen/orders` | Route POS items to kitchen prep stations | `kitchen_display_manage` | `admin` |
| `GET` | `/api/kitchen/orders/poll` | Poll kitchen updates (orders changed since timestamp) | `kitchen_display_view` | `admin` |
| `PATCH`| `/api/kitchen/orders/{id}/status` | Update kitchen ticket state (`pending`, `in_prep`, `ready`, `dispatched`)| `kitchen_display_manage` | `admin` |
| `PATCH`| `/api/kitchen/orders/{id}/item` | Bump or mark an individual item as prepared | `kitchen_display_manage` | `admin` |

---

### Module 04: Sales, Quotations, Shipments & Returns (76 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/sales` | Paginated list of sales with warehouse, status, date filters | `Sales_view` | `admin` |
| `POST` | `/api/sales` | Create standard back-office sale order | `Sales_add` | `admin` |
| `GET` | `/api/sales/create` | Lookup dictionaries (clients, warehouses, taxes) for sale form | `Sales_add` | `admin` |
| `GET` | `/api/sales/{id}` | Get sale detail with line items, payments, customer info | `Sales_view` | `admin` |
| `PUT` | `/api/sales/{id}` | Update sale document (recalculates stock if status changed) | `Sales_edit` | `admin` |
| `DELETE`| `/api/sales/{id}` | Soft delete sale (reverses stock deductions and payments) | `Sales_delete` | `admin` |
| `POST` | `/api/sales/delete/by_selection` | Bulk delete multiple sales | `Sales_delete` | `admin` |
| `GET` | `/api/sale_pdf/{id}` | Generate downloadable PDF invoice | None (Public) | `public` |
| `GET` | `/api/sale_print_html/{id}` | Render lightweight thermal receipt HTML for silent printing | None (Public) | `public` |
| `POST` | `/api/sales/send/email` | Email PDF invoice to customer email address | `Sales_view` | `admin` |
| `POST` | `/api/sales/send/sms` | Send SMS invoice link and summary via Twilio/Infobip | `Sales_view` | `admin` |
| `GET` | `/api/payment_sale` | List payments attached to a sale | `Payment_Sales_view` | `admin` |
| `POST` | `/api/payment_sale` | Add a payment to an existing sale | `Payment_Sales_add` | `admin` |
| `PUT` | `/api/payment_sale/{id}` | Edit an existing sale payment amount or method | `Payment_Sales_edit` | `admin` |
| `DELETE`| `/api/payment_sale/{id}` | Delete a sale payment | `Payment_Sales_delete` | `admin` |
| `GET` | `/api/payment_sale_pdf/{id}` | Payment receipt voucher PDF | None (Public) | `public` |
| `GET` | `/api/quotations` | List quotations | `Quotations_view` | `admin` |
| `POST` | `/api/quotations` | Create a new quotation | `Quotations_add` | `admin` |
| `GET` | `/api/quotations/{id}` | Get quotation detail and line items | `Quotations_view` | `admin` |
| `PUT` | `/api/quotations/{id}` | Update quotation | `Quotations_edit` | `admin` |
| `DELETE`| `/api/quotations/{id}` | Delete quotation | `Quotations_delete` | `admin` |
| `GET` | `/api/quotation/convert_sale/{id}`| Pre-fill sale create form from quotation data | `Sales_add` | `admin` |
| `GET` | `/api/quote_pdf/{id}` | Quotation PDF document | None (Public) | `public` |
| `GET` | `/api/shipments` | List delivery shipments | `shipment` | `admin` |
| `POST` | `/api/shipments` | Create a shipment tracking record for a sale | `shipment` | `admin` |
| `PUT` | `/api/shipments/{id}` | Update shipment status (`ordered`, `packed`, `shipped`, `delivered`)| `shipment` | `admin` |
| `DELETE`| `/api/shipments/{id}` | Delete shipment record | `shipment` | `admin` |
| `GET` | `/api/returns/sale` | List sale returns | `Sale_Returns_view` | `admin` |
| `POST` | `/api/returns/sale` | Create sale return (restocks inventory, creates refund balance) | `Sale_Returns_add` | `admin` |
| `GET` | `/api/returns/sale/{id}` | Get sale return details | `Sale_Returns_view` | `admin` |
| `PUT` | `/api/returns/sale/{id}` | Update sale return | `Sale_Returns_edit` | `admin` |
| `DELETE`| `/api/returns/sale/{id}` | Delete sale return | `Sale_Returns_delete` | `admin` |
| `GET` | `/api/return_sale_pdf/{id}` | Sale return credit note PDF | None (Public) | `public` |
| `POST` | `/api/payment_returns_sale` | Issue refund payment for a sale return | `Payment_Sale_Returns` | `admin` |

---

### Module 05: Purchases, Inbound Supply & Suppliers (67 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/purchases` | Paginated purchase orders list | `Purchases_view` | `admin` |
| `POST` | `/api/purchases` | Create purchase order (increases stock if status = `received`)| `Purchases_add` | `admin` |
| `GET` | `/api/purchases/create` | Lookup data (suppliers, warehouses, units) for purchase form | `Purchases_add` | `admin` |
| `GET` | `/api/purchases/{id}` | Get purchase details with supplier invoice and items | `Purchases_view` | `admin` |
| `PUT` | `/api/purchases/{id}` | Update purchase order | `Purchases_edit` | `admin` |
| `DELETE`| `/api/purchases/{id}` | Delete purchase order (reverses stock receipts) | `Purchases_delete` | `admin` |
| `POST` | `/api/purchases/delete/by_selection` | Bulk delete purchases | `Purchases_delete` | `admin` |
| `GET` | `/api/purchase_pdf/{id}` | Purchase order PDF | None (Public) | `public` |
| `GET` | `/api/purchase_print_html/{id}`| Purchase order printable HTML | None (Public) | `public` |
| `POST` | `/api/purchases/send/email` | Email purchase order to supplier | `Purchases_view` | `admin` |
| `GET` | `/api/payment_purchase` | List payments made against a purchase order | `Payment_Purchases_view` | `admin` |
| `POST` | `/api/payment_purchase` | Record an outbound payment to a supplier | `Payment_Purchases_add` | `admin` |
| `PUT` | `/api/payment_purchase/{id}`| Edit a purchase payment | `Payment_Purchases_edit` | `admin` |
| `DELETE`| `/api/payment_purchase/{id}`| Delete a purchase payment | `Payment_Purchases_delete` | `admin` |
| `GET` | `/api/payment_purchase_pdf/{id}`| Supplier payment voucher PDF | None (Public) | `public` |
| `GET` | `/api/providers` | List suppliers with dues and balances | `Suppliers_view` | `admin` |
| `POST` | `/api/providers` | Create new supplier | `Suppliers_add` | `admin` |
| `PUT` | `/api/providers/{id}` | Update supplier profile and payment terms | `Suppliers_edit` | `admin` |
| `DELETE`| `/api/providers/{id}` | Delete supplier | `Suppliers_delete` | `admin` |
| `POST` | `/api/providers/import/csv` | Bulk import suppliers from CSV | `Suppliers_add` | `admin` |
| `GET` | `/api/provider_ledger/{id}` | Comprehensive supplier financial ledger | `Suppliers_view` | `admin` |
| `GET` | `/api/returns/purchase` | List purchase returns (debit notes) | `Purchase_Returns_view` | `admin` |
| `POST` | `/api/returns/purchase` | Return stock to supplier (deducts stock balance) | `Purchase_Returns_add` | `admin` |
| `GET` | `/api/return_purchase_pdf/{id}`| Purchase return debit note PDF | None (Public) | `public` |
| `POST` | `/api/payment_returns_purchase`| Record supplier refund payment | `Payment_Purchase_Returns` | `admin` |

---

### Module 06: Products, Catalog & Inventory Operations (148 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Paginated product list with category, brand, stock filters | `products_view` | `admin` |
| `POST` | `/api/products` | Create product (supports `standard`, `variable`, `is_service`, `combo`)| `products_add` | `admin` |
| `GET` | `/api/products/create` | Lookups for product form (categories, brands, units, warehouses) | `products_add` | `admin` |
| `GET` | `/api/products/{id}` | Get product details, variants, batch tracking flags, images | `products_view` | `admin` |
| `POST` | `/api/products/{id}` | Update product (multipart/form-data for image uploads) | `products_edit` | `admin` |
| `DELETE`| `/api/products/{id}` | Soft delete product | `products_delete` | `admin` |
| `POST` | `/api/products/delete/by_selection` | Bulk delete products | `products_delete` | `admin` |
| `POST` | `/api/products/import/csv` | Batch CSV product import with column mapping | `products_add` | `admin` |
| `GET` | `/api/products/export/excel` | Export matching products to Excel spreadsheet | `products_view` | `admin` |
| `POST` | `/api/products/barcode` | Generate printable barcode sheet (Code128, EAN13, QR) | `barcode_view` | `admin` |
| `GET` | `/api/categories` | List product categories | `category` | `admin` |
| `POST` | `/api/categories` | Create category | `category` | `admin` |
| `PUT` | `/api/categories/{id}` | Update category | `category` | `admin` |
| `DELETE`| `/api/categories/{id}` | Delete category | `category` | `admin` |
| `GET` | `/api/brands` | List brands | `brand` | `admin` |
| `POST` | `/api/brands` | Create brand (with logo upload resized to 200x200) | `brand` | `admin` |
| `PUT` | `/api/brands/{id}` | Update brand | `brand` | `admin` |
| `DELETE`| `/api/brands/{id}` | Delete brand | `brand` | `admin` |
| `GET` | `/api/units` | List measurement units (Base, Sub-units, operators `*`, `/`) | `unit` | `admin` |
| `POST` | `/api/units` | Create measurement unit | `unit` | `admin` |
| `PUT` | `/api/units/{id}` | Update unit | `unit` | `admin` |
| `DELETE`| `/api/units/{id}` | Delete unit | `unit` | `admin` |
| `GET` | `/api/product-batches` | List batches with batch number, expiry date, remaining qty | `batch_tracking` | `admin` |
| `POST` | `/api/product-batches` | Create or adjust batch allocation | `batch_tracking` | `admin` |
| `GET` | `/api/serial-numbers` | List registered IMEI / Serial numbers and movement history | `serial_number_tracking` | `admin` |
| `POST` | `/api/serial-numbers` | Register or update serial number status (`in_stock`, `sold`, `returned`)| `serial_number_tracking` | `admin` |
| `GET` | `/api/adjustments` | List stock quantity adjustments | `Adjustment_view` | `admin` |
| `POST` | `/api/adjustments` | Post stock adjustment (`add` or `subtract` type) | `Adjustment_add` | `admin` |
| `GET` | `/api/adjustment_pdf/{id}` | Stock adjustment voucher PDF | None (Public) | `public` |
| `GET` | `/api/transfers` | List inter-warehouse stock transfers | `transfer_view` | `admin` |
| `POST` | `/api/transfers` | Initiate stock transfer (deducts source, credits destination) | `transfer_add` | `admin` |
| `GET` | `/api/transfer_pdf/{id}` | Stock transfer shipping note PDF | None (Public) | `public` |
| `GET` | `/api/damages` | List damaged inventory records | `damage_view` | `admin` |
| `POST` | `/api/damages` | Write off inventory to damage loss account | `damage_add` | `admin` |
| `GET` | `/api/damage_pdf/{id}` | Damage write-off voucher PDF | None (Public) | `public` |
| `GET` | `/api/warehouses` | List warehouses | `warehouse` | `admin` |
| `POST` | `/api/warehouses` | Create warehouse | `warehouse` | `admin` |
| `PUT` | `/api/warehouses/{id}` | Update warehouse details | `warehouse` | `admin` |
| `DELETE`| `/api/warehouses/{id}` | Delete warehouse | `warehouse` | `admin` |
| `GET` | `/api/warehouse-locations` | List internal warehouse bin/rack/shelf locations | `warehouse` | `admin` |
| `POST` | `/api/warehouse-locations` | Create bin/rack location | `warehouse` | `admin` |

---

### Module 07: Customers, CRM, Loyalty & Wallets (56 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/clients` | Paginated customer directory with dues and points | `Customers_view` | `admin` |
| `POST` | `/api/clients` | Create customer profile | `Customers_add` | `admin` |
| `GET` | `/api/clients/{id}` | Customer detail: contact, credit limit, tier, balance | `Customers_view` | `admin` |
| `PUT` | `/api/clients/{id}` | Update customer | `Customers_edit` | `admin` |
| `DELETE`| `/api/clients/{id}` | Delete customer | `Customers_delete` | `admin` |
| `POST` | `/api/clients/import/csv` | Bulk import customers from CSV | `Customers_add` | `admin` |
| `GET` | `/api/client_ledger/{id}` | Statement of account: sales, payments, refunds, running balance | `Customers_view` | `admin` |
| `GET` | `/api/loyalty/rewards` | List available loyalty reward tiers and exchange rates | `loyalty_program` | `admin` |
| `POST` | `/api/loyalty/rewards` | Configure loyalty points conversion (e.g. 100 points = $5) | `loyalty_program` | `admin` |
| `GET` | `/api/wallets` | List customer digital wallet accounts | `wallet_view` | `admin` |
| `POST` | `/api/wallets/deposit` | Top up customer wallet balance with payment voucher | `wallet_manage` | `admin` |
| `GET` | `/api/wallets/withdrawals` | List customer wallet withdrawal requests | `wallet_view` | `admin` |
| `POST` | `/api/wallets/withdrawals/{id}/approve`| Approve withdrawal request | `wallet_manage` | `admin` |

---

### Module 08: Storefront & eCommerce API (107 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/online_store/login` | Shopper login (sets `store` session cookie) | None (Public) | `storefront` |
| `POST` | `/online_store/register` | New customer self-registration | None (Public) | `storefront` |
| `POST` | `/online_store/logout` | Shopper logout | None (Auth) | `storefront` |
| `GET` | `/api/store/collections` | List published product collections for storefront | None (Public) | `public` |
| `GET` | `/api/store/banners` | Fetch promotional slider banners and popups | None (Public) | `public` |
| `GET` | `/api/store/coupons/validate` | Verify coupon code validity and calculate discount | None (Public) | `public` |
| `POST` | `/api/store/checkout` | Process online order checkout (creates sale with status `ordered`)| None (Public/Auth)| `storefront` |
| `GET` | `/api/online-orders` | Admin panel: list online storefront orders | `online_orders_view` | `admin` |
| `PATCH`| `/api/online-orders/{id}/status`| Update online order status (`received`, `processing`, `shipped`, `delivered`)| `online_orders_manage`| `admin` |
| `GET` | `/api/store/reviews` | List customer product reviews | `store_reviews` | `admin` |
| `POST` | `/api/store/reviews` | Submit product review and rating | None (Auth) | `storefront` |

---

### Module 09: Client Portal API (23 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/portal/dashboard` | Portal dashboard: total spent, outstanding unpaid invoices, recent orders | None (Auth) | `portal` |
| `GET` | `/api/portal/invoices` | List invoices billed to the logged-in customer | None (Auth) | `portal` |
| `GET` | `/api/portal/invoices/{id}` | Get detailed invoice with line items | None (Auth) | `portal` |
| `GET` | `/api/portal/quotations` | List price quotations sent to the customer | None (Auth) | `portal` |
| `POST` | `/api/portal/payments` | Initiate invoice payment via online gateway | None (Auth) | `portal` |
| `GET` | `/api/portal/statement` | Download PDF statement of account | None (Auth) | `portal` |
| `GET` | `/api/portal/contracts` | View signed customer service contracts | None (Auth) | `portal` |
| `GET` | `/api/portal/knowledge-base` | Access public knowledge base and help articles | None (Auth) | `portal` |

---

### Module 10: Accounting V2, Double-Entry & Financials (90 Endpoints)

```
                            [DOUBLE-ENTRY ACCOUNTING V2]
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
[Chart of Accounts]              [Journal Entries]               [Financial Statements]
GET  /accounting/v2/coa          GET  /accounting/v2/journal-     GET /accounting/v2/reports/
POST /accounting/v2/coa               entries                          balance-sheet
PUT  /accounting/v2/coa/{id}     POST /accounting/v2/journal-     GET /accounting/v2/reports/
                                      entries (Draft)                  trial-balance
                                 POST /accounting/v2/journal-     GET /accounting/v2/reports/
                                      entries/{id}/post (Post)         profit-loss
```

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/accounting/v2/dashboard` | Accounting KPIs: Assets, Liabilities, Equity, Revenue, Net Income | `accounting_dashboard` | `admin` |
| `GET` | `/api/accounting/v2/coa` | Full hierarchical Chart of Accounts tree | `chart_of_accounts` | `admin` |
| `POST` | `/api/accounting/v2/coa` | Add account (Asset, Liability, Equity, Income, Expense)| `chart_of_accounts` | `admin` |
| `PUT` | `/api/accounting/v2/coa/{id}` | Update account code, name, parent account | `chart_of_accounts` | `admin` |
| `DELETE`| `/api/accounting/v2/coa/{id}` | Delete account (prevented if balanced transactions exist)| `chart_of_accounts` | `admin` |
| `GET` | `/api/accounting/v2/journal-entries`| Paginated list of general journal vouchers | `journal_entries` | `admin` |
| `POST` | `/api/accounting/v2/journal-entries`| Create draft journal entry ($\sum \text{Debits} = \sum \text{Credits}$)| `journal_entries` | `admin` |
| `GET` | `/api/accounting/v2/journal-entries/{id}`| View journal entry with debit/credit breakdown | `journal_entries` | `admin` |
| `PUT` | `/api/accounting/v2/journal-entries/{id}`| Modify draft journal entry lines | `journal_entries` | `admin` |
| `POST` | `/api/accounting/v2/journal-entries/{id}/post`| Post journal voucher to general ledger (immutable) | `journal_entries` | `admin` |
| `DELETE`| `/api/accounting/v2/journal-entries/{id}`| Delete unposted draft journal entry | `journal_entries` | `admin` |
| `GET` | `/api/accounting/v2/reports/trial-balance`| Trial balance report verifying balance equality | `trial_balance` | `admin` |
| `GET` | `/api/accounting/v2/reports/balance-sheet`| Balance Sheet: Assets vs Liabilities + Owner Equity | `balance_sheet` | `admin` |
| `GET` | `/api/accounting/v2/reports/profit-loss` | Income Statement: Revenue minus Cost of Goods and Expenses | `accounting_profit_loss`| `admin` |
| `GET` | `/api/accounting/v2/reports/tax-summary`| VAT / Sales tax summary report | `accounting_tax_report` | `admin` |
| `GET` | `/api/accounts` | Cash and bank deposit accounts list | `account` | `admin` |
| `POST` | `/api/accounts` | Create bank / cash register account | `account` | `admin` |
| `GET` | `/api/deposits` | List recorded monetary deposits | `deposit_view` | `admin` |
| `POST` | `/api/deposits` | Record direct capital or miscellaneous deposit | `deposit_add` | `admin` |
| `GET` | `/api/expenses` | List company expenses | `expense_view` | `admin` |
| `POST` | `/api/expenses` | Record operating expense with receipt attachment | `expense_add` | `admin` |
| `GET` | `/api/money_transfers` | List transfers between company bank accounts | `transfer_money_view` | `admin` |
| `POST` | `/api/money_transfers` | Transfer balance between accounts | `transfer_money_add` | `admin` |
| `GET` | `/api/zatca/settings` | ZATCA Phase 2 e-Invoicing settings and onboarding status | `zatca_settings` | `admin` |
| `POST` | `/api/zatca/onboard` | Submit CSR to ZATCA portal for CCSID cryptographic certificate | `zatca_settings` | `admin` |
| `POST` | `/api/zatca/sales/{id}/submit`| Generate signed UBL 2.1 XML and submit invoice to ZATCA | `zatca_settings` | `admin` |

---

### Module 11: HRM, Workforce & Payroll (155 Endpoints)

| Method | Route | Description | Required Permission | Surface |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | Paginated employee directory | `view_employee` | `admin` |
| `POST` | `/api/employees` | Create employee profile (personal, salary, shift, bank details)| `add_employee` | `admin` |
| `GET` | `/api/employees/{id}` | Get employee profile, documents, leave balance | `view_employee` | `admin` |
| `PUT` | `/api/employees/{id}` | Update employee | `edit_employee` | `admin` |
| `DELETE`| `/api/employees/{id}` | Terminate and delete employee | `delete_employee` | `admin` |
| `GET` | `/api/attendances` | List daily clock-in / clock-out attendance records | `view_attendance` | `admin` |
| `POST` | `/api/attendances` | Record manual or biometric attendance log | `add_attendance` | `admin` |
| `GET` | `/api/leaves` | Employee leave requests list | `view_leave` | `admin` |
| `POST` | `/api/leaves` | Submit employee leave application | `add_leave` | `admin` |
| `PUT` | `/api/leaves/{id}` | Approve or reject leave application | `edit_leave` | `admin` |
| `GET` | `/api/payroll` | List generated monthly payroll sheets | `view_payroll` | `admin` |
| `POST` | `/api/payroll` | Generate payroll run with allowances, deductions, net pay | `add_payroll` | `admin` |
| `POST` | `/api/payroll/{id}/pay` | Disburse payroll payment from chosen company bank account | `add_payroll` | `admin` |
| `GET` | `/api/departments` | Company departments list | `department` | `admin` |
| `GET` | `/api/designations` | Job designations list | `designation` | `admin` |
| `GET` | `/api/office_shifts` | Shift schedules and grace period configurations | `office_shift` | `admin` |
| `GET` | `/api/holidays` | Company official holidays calendar | `holiday` | `admin` |

---

### Module 12: Business Verticals & Extended Modules (433 Endpoints)

Stocky integrates specialized vertical extensions with dedicated API namespaces:

#### 1. MRP (Manufacturing & Production):
- `GET /api/mrp/bom` / `POST /api/mrp/bom`: Bill of Materials (raw materials recipe, scrap rate, labor cost).
- `GET /api/mrp/production` / `POST /api/mrp/production`: Production orders (consumes components, outputs finished goods into warehouse stock).
- `GET /api/mrp/planning`: Material requirement planning scheduler.

#### 2. Projects, Tasks & Timesheets:
- `GET /api/projects` / `POST /api/projects`: Client billable projects with budget tracking.
- `GET /api/tasks` / `POST /api/tasks`: Kanban tasks with priority, assignee, checklist.
- `POST /api/project-time-logs`: Start / stop billable timer logs.

#### 3. Service & Maintenance (Repair Shop):
- `GET /api/service-jobs` / `POST /api/service-jobs`: Work orders for equipment repair.
- `GET /api/service_job_pdf/{id}`: Work order printout for technician.
- `POST /api/service-jobs/{id}/photos`: Upload diagnostic before/after photos.
- `POST /api/service-job-payments`: Collect repair deposit or final balance.

#### 4. Fleet & Fixed Assets:
- `GET /api/assets` / `POST /api/assets`: Asset register with depreciation calculation.
- `GET /api/fleet/vehicles` / `POST /api/fleet/vehicles`: Vehicle directory, odometer logs.
- `POST /api/fleet/fuel-logs`: Vehicle fuel intake and cost tracking.

#### 5. Hospital & Healthcare:
- `GET /api/hospital/patients` / `POST /api/hospital/patients`: Patient medical history.
- `GET /api/hospital/doctors`: Medical practitioners directory.
- `POST /api/hospital/appointments`: Patient consultations scheduling.
- `POST /api/hospital/prescriptions`: Medication prescriptions (dispensed via POS pharmacy).

#### 6. School & Education:
- `GET /api/school/students` / `POST /api/school/students`: Student enrollments.
- `GET /api/school/fees` / `POST /api/school/fees`: Tuition fee structures and collections.
- `GET /api/school/exams`: Report cards and examination grading.

---

### Module 13: Reports Suite (86 Endpoints)

| Method | Route | Description | Required Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/report/profit_and_loss` | Net profit and loss analysis over date range | `Reports_profit` |
| `GET` | `/api/report/profit/{dimension}` | Multi-dimensional profit breakdown (`warehouse`, `category`, `brand`, `customer`)| `Reports_profit` |
| `GET` | `/api/report/sales` | Consolidated sales audit report | `Reports_sales` |
| `GET` | `/api/report/purchases` | Consolidated purchases audit report | `Reports_purchase` |
| `GET` | `/api/report/stock` | Current stock valuation and quantity by warehouse | `stock_report` |
| `GET` | `/api/report/stock_aging` | Stock aging analysis (0-30, 31-60, 61-90, 90+ days) | `Stock_Aging_Report` |
| `GET` | `/api/report/dead_stock` | Slow-moving and zero-sales items | `Dead_Stock_Report` |
| `GET` | `/api/report/negative_stock` | Inventory audit flag for items with $< 0$ stock | `negative_stock_report` |
| `GET` | `/api/report/cash_registers` | Cash register opening/closing balances and variance | `cash_register_report` |
| `GET` | `/api/report/tax_summary` | Summary of collected sales tax vs input purchase tax | `tax_summary_report` |
| `GET` | `/api/report/client_sales` | Sales grouped by customer | `Reports_customers` |
| `GET` | `/api/report/provider_purchases`| Purchases grouped by supplier | `Reports_suppliers` |
| `GET` | `/api/report/users` | Staff transaction volume and performance audit | `users_report` |

---

### Module 14: Integrations & Connectors (161 Endpoints)

Stocky features bi-directional synchronization connectors with major eCommerce and cloud suites:
- **WooCommerce (44 APIs)**: `/api/woocommerce/sync/products`, `/orders`, `/categories`. Two-way webhook sync.
- **Shopify (23 APIs)**: `/api/shopify/sync/products`, `/inventory`, `/orders`. Automated fulfillment dispatch.
- **Salla (12 APIs)**: Middle-East eCommerce sync for Arabic commerce.
- **PrestaShop & Jumia**: Product catalog and stock level replication.
- **QuickBooks & Xero**: Automated synchronization of daily sales totals to QuickBooks Online and Xero General Ledgers.
- **Google Sheets**: Automatic streaming of completed sales into Google Spreadsheets via Service Account API.
- **Slack & Telegram**: Instant transactional alerts dispatched to staff channels on large sales or stock alerts.

---

### Module 15: System Administration, Settings & Updates (140 Endpoints)

| Method | Route | Description | Required Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings` | Fetch all company and system settings (tax, currency, timezone, logo)| None (Auth) |
| `POST` | `/api/settings` | Save company and system settings (multipart for logo upload) | `setting_system` |
| `GET` | `/api/pos_settings` | POS-specific options: barcode scanner sound, silent print, default customer | None (Auth) |
| `PUT` | `/api/pos_settings` | Save POS settings | `setting_system` |
| `GET` | `/api/module-settings` | Feature flags: toggle HRM, Accounting, Store, Hospital, School | `setting_system` |
| `POST` | `/api/module-settings` | Enable or disable modular extensions | `setting_system` |
| `GET` | `/api/roles` | List staff security roles | `permissions` |
| `POST` | `/api/roles` | Create security role with permission slug assignments | `permissions` |
| `PUT` | `/api/roles/{id}` | Update role permissions matrix | `permissions` |
| `GET` | `/api/users` | List staff user accounts | `users_view` |
| `POST` | `/api/users` | Create staff user (with role and warehouse assignments) | `users_add` |
| `PUT` | `/api/users/{id}` | Update user credentials, status (`1` or `0`), warehouses | `users_edit` |
| `GET` | `/api/backups` | List database dump archives | `backup` |
| `POST` | `/api/backups` | Trigger live SQL database backup archive | `backup` |
| `GET` | `/api/system-health` | Server environment diagnostic (PHP version, MySQL, disk space, SSL)| `setting_system` |
| `GET` | `/api/system-update/check` | Check Stocky update server for new releases | `setting_system` |
| `POST` | `/api/system-update/apply`| Download update zip, apply database migrations, rebuild cache | `setting_system` |

---

## 7. Error Codes, Status Envelopes & Legacy Responses

### Standard HTTP Status Codes

| Code | Status | Meaning in Stocky API | Body Structure |
| :--- | :--- | :--- | :--- |
| **`200`** | OK | Request succeeded. Writes return either the created entity or `{"success": true}`. | Resource JSON or `{"success":true}` |
| **`400`** | Bad Request | Business logic failed via older controller envelope `sendError()`. | `{"success": false, "message": "...", "errors": {...}}` |
| **`401`** | Unauthorized | Token missing, invalid signature, or expired session. | `{"message": "Unauthenticated."}` |
| **`403`** | Forbidden | User lacks the required `x-permission` slug, or `statut == 0` (disabled user). | `{"message": "This action is unauthorized."}` |
| **`404`** | Not Found | Record ID does not exist (`findOrFail`), module disabled, or invalid route. | `{"message": "No query results for model [App\\Models\\...]"}` |
| **`409`** | Conflict | Concurrency conflict, duplicate IMEI serial, or referenced record cannot be deleted. | `{"message": "Record is in use."}` |
| **`422`** | Validation Error | Request body failed Laravel validation rules. | See format below |
| **`429`** | Throttled | Rate limit hit (mobile auth $\gt 10$/min, portal $\gt 60$/min). | `{"message": "Too Many Attempts."}` |
| **`500`** | Server Error | Unhandled backend exception or database error. | `{"message": "Server Error"}` |

### Validation Error Structure (422 Unprocessable Entity)
When validation fails, Laravel returns HTTP `422` with field-keyed arrays of localized human messages:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "client_id": [
      "The client id field is required."
    ],
    "warehouse_id": [
      "The selected warehouse id is invalid."
    ],
    "details.0.quantity": [
      "The quantity must be at least 0.001."
    ]
  }
}
```

---

## 8. Client Developer Guidelines for API Consumption

When building frontend components or external API clients:
1. **Always Set Headers**:
   ```http
   Accept: application/json
   Content-Type: application/json
   ```
2. **Handle Inactivity Gracefully**:
   The admin API relies on `settings.session_timeout_minutes`. The frontend should maintain a 10-minute heartbeat (`GET /api/ping`) while user activity is detected, or redirect to `/login` when receiving a `401`.
3. **Always Include Universal Query Parameters**:
   Never call a list endpoint with naked URLs like `/api/sales`. Always provide:
   `?page=1&limit=10&SortField=id&SortType=desc&search=`
4. **Inspect Validation Errors**:
   Capture HTTP `422` and bind the `errors` dictionary directly to form fields to display precise validation feedback.
