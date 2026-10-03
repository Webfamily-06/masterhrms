# Stocky v5.8 — Product Operations Manual & Functional Architecture

This document synthesizes the official operational product documentation located in `documentation/documentation/index.html` into an exhaustive engineering guide. It details the operational workflows, business rules, hardware integration protocols, offline mechanics, and configuration standards for every module in Stocky v5.8.

---

## 1. System Foundations & Setup Workflows

### 1.1 Server Prerequisites & Environment
- **PHP Version**: PHP 8.2.0 or higher.
- **Required Extensions**: `bcmath`, `ctype`, `curl`, `fileinfo`, `gd` (or `imagick`), `json`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `zip`.
- **Database Engine**: MySQL 8.0+ or MariaDB 10.5+ with InnoDB default engine and `utf8mb4_unicode_ci` character set.
- **Web Servers**: Nginx or Apache 2.4 with URL rewriting enabled (`mod_rewrite`).
- **PHP Directives**:
  - `memory_limit = 256M` (or `512M` for massive batch operations / large PDF rendering).
  - `upload_max_filesize = 64M`.
  - `post_max_size = 64M`.
  - `max_execution_time = 300`.

### 1.2 The "First Hour" Setup Path
To achieve a fully functional store from a pristine install within 60 minutes:
1. **System Settings**: Set store currency, currency symbol, default email, and timezone.
2. **Default Warehouse**: Define primary outlet/storefront location (e.g. `Main Warehouse`).
3. **Catalog Prerequisites**: Create at least 1 Category (e.g. `General`), 1 Brand (e.g. `Generic`), and 1 Unit (e.g. `Piece`).
4. **First Product**: Add a product with barcode, purchase price, sales price, and assign initial stock to the primary warehouse.
5. **Open Cash Register**: Cashier navigates to `/pos`, enters opening floating cash amount (e.g. `$100.000`), and initializes the register.
6. **Execute Test Sale**: Scan product barcode, select cash payment, print thermal receipt, and verify stock deduction in real-time.

---

## 2. Point of Sale (POS), Offline Mode & Hardware Integration

```
+---------------------------------------------------------------------------------------+
|                                    POS SCREEN ANATOMY                                 |
+---------------------------------------------------+-----------------------------------+
| LEFT PANEL: Product Grid & Search (60%)           | RIGHT PANEL: Cart & Actions (40%) |
| • Warehouse & Category Filters                    | • Customer Selector (Quick Add)   |
| • Live Barcode / SKU Scanner Input                | • Cart Line Items (Qty, Price, Tax|
| • Visual Product Cards with Stock Badges          | • Discounts & Coupon Code Input   |
| • Quick-Click Category Carousel                   | • Running Subtotal, Tax & Total   |
| • Hold Cart (Drafts) & Resume Buttons             | • Action Buttons: Pay, Reset, Hold|
+---------------------------------------------------+-----------------------------------+
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
       [Offline Storage]       [Secondary Display]      [QZ-Tray Thermal Print]
     IndexedDB Local Cache    WebSocket / Polling sync     Direct ESC/POS / TSPL
     Local sales queue        Real-time cart lines       Kick RJ11 Cash Drawer
```

### 2.1 Cash Register Management Lifecycle
1. **Register Initialization (`POST /api/cash-registers/open`)**:
   - Cashier enters opening balance (`cash_in_hand`).
   - System locks register to `user_id` and `warehouse_id`.
2. **Cash Movements (`POST /api/cash-registers/cash-move`)**:
   - Cashier or supervisor records mid-shift `cash_in` (adding change float) or `cash_out` (safe drops, petty cash expenses) with an audit reason.
3. **Shift Closing & Reconciliation (`POST /api/cash-registers/close`)**:
   - Cashier enters physical cash count (`total_cash_counted`).
   - Backend computes theoretical balance: $\text{Expected Cash} = \text{Opening Float} + \text{Cash Sales} + \text{Cash In} - \text{Cash Out}$.
   - Computes variance (`expected - counted`). Generates closing shift summary report.

### 2.2 Offline POS Architecture
- **Local Persistence Layer**: When browser loses Internet connectivity, the POS switches into offline fallback mode using browser **IndexedDB**.
- **Data Pre-Caching**: Product catalog, prices, barcodes, units, and active taxes are synced to IndexedDB during POS initialization (`GET /api/pos/data_create_pos`).
- **Offline Sales Queue**: Completed sales are written to local IndexedDB queue with client-generated temporary IDs (`OFFLINE_timestamp`).
- **Automatic Re-synchronization**: When network connectivity is restored, the offline worker automatically drains the queue, posting transactions sequentially via `POST /api/pos/create_pos`, updating local records with official server reference numbers.

### 2.3 Thermal Printing & Cash Drawer Kick (QZ-Tray)
- **Protocol**: Silent desktop thermal printing is handled via WebSocket connection to local **QZ-Tray** daemon on `wss://localhost:8182`.
- **Printer Command Set**:
  - **ESC/POS**: Receipts formatted using standard thermal commands:
    ```
    \x1B\x40       (Initialize printer)
    \x1B\x61\x01   (Center alignment)
    \x1B\x21\x30   (Double height/width header)
    \x1B\x64\x02   (Feed 2 lines)
    \x1D\x56\x41   (Paper cut)
    \x1B\x70\x00\x19\xFA (Kick RJ11 Cash Drawer pin 2)
    ```
  - **TSPL**: Label barcode printing on thermal sticker printers (TSC, Zebra, Godex).
- **Silent Security Certificates**: Uses self-signed digital certificate (`qz-tray.crt` & `qz-tray.key`) to bypass browser print confirmation prompts.

### 2.4 Secondary Screen Customer Display
- **Dual-Screen Setup**: Secondary monitor facing the shopper displaying live cart updates.
- **Connection Mechanisms**:
  - **Same Machine (Dual Display)**: Browser `BroadcastChannel("pos-cart.{screenId}")`. Zero latency, works completely offline.
  - **Network Secondary Screen (Tablet/Phone)**: Server-side broadcast via `POST /api/pos/customer-display/broadcast` with polling or WebSockets.
- **Display Layout**: Left pane displays active itemized cart (Name, Unit Price, Qty, Line Total). Right pane displays live Subtotal, Tax, Discounts, Grand Total, and promotional banners.

### 2.5 Kitchen Display System (KDS) & Prep Stations
- **Order Routing**: Items belonging to designated preparation categories (e.g. `Kitchen`, `Bar`, `Grill`) are automatically dispatched as digital kitchen tickets (`POST /api/kitchen/orders`).
- **Cook Interface**: KDS screen at prep stations displays order cards with color-coded timers (Green: $< 5\text{ min}$, Yellow: $5-10\text{ min}$, Red: $> 10\text{ min}$).
- **Line Bumping**: Cooks tap items to mark prepared, or bump the entire ticket to `Ready`, triggering notification on the customer-facing Order-Ready screen.

---

## 3. Product Catalog, Inventory Controls & Stock Operations

### 3.1 Product Types & Morphologies
1. **Standard Product**: Physical item with single barcode, cost price, retail price, and inventory tracked per warehouse.
2. **Variable Product**: Item with multiple SKU variants across attributes (e.g. Size, Color). Each variant has unique barcode, SKU, additional cost, additional price, and individual warehouse stock balances.
3. **Combo Product (Bundle)**: Virtual bundle composed of two or more standard products. Stock is dynamic, calculated based on the lowest stock quantity of its constituent components. Selling a combo deducts individual component stocks.
4. **Service**: Intangible offering (e.g. Labour, Shipping, Repair Service). Stock is not tracked, but line revenue and costs are accounted for in profit/loss calculations.

### 3.2 Batches, Expiration & FIFO Management
- **Pharmaceutical & Food Retail**: Enabled via `settings.batch_tracking`.
- **Lot Tracking**: Inbound purchases require batch number (`batch_number`) and expiration date (`expiry_date`).
- **Depletion Strategy**: When selling, cashiers select specific batches. The system supports automated **FIFO (First In, First Out)** or **FEFO (First Expired, First Out)** auto-allocation to ensure expiring lots are depleted first.
- **Batch Expiry Alerts**: Visual warning indicators in POS and automated reporting on items expiring within 30, 60, or 90 days.

### 3.3 Serial Numbers (IMEI) Tracking
- **Electronics & Mobile Retail**: Enabled via `settings.serial_number_tracking`.
- **Traceability**: Individual items track unique serial numbers or mobile IMEIs throughout their entire lifecycle:
  `Supplier Purchase Order` $\rightarrow$ `Warehouse Stock` $\rightarrow$ `Sale Invoice` $\rightarrow$ `Customer Warranty` $\rightarrow$ `Return / Replacement`.
- **Duplicate Prevention**: Backend prevents duplicate serial registration within the same warehouse.
- **Movement Audit**: Serial number audit report traces exact dates of purchase, movement, and retail sale.

### 3.4 Multi-Warehouse Logistics Workflows
- **Stock Adjustments (`/api/adjustments`)**: Used for physical inventory count reconciliations. Supports `add` (found stock) or `subtract` (loss/shrinkage) with mandatory reason code.
- **Stock Transfers (`/api/transfers`)**: Inter-warehouse stock transit. Supports three-stage lifecycle:
  1. `ordered`: Transfer request logged.
  2. `sent`: Stock deducted from source warehouse and placed in transit.
  3. `completed`: Stock accepted and credited to destination warehouse inventory.
- **Stock Damages (`/api/damages`)**: Damaged or expired goods written off. Stock is deducted and monetary loss posted to the designated Damage Expense Account.

---

## 4. Sales, CRM, Client Portal & Financial Lifecycles

### 4.1 Sales Order to Cash Lifecycle
```
[Quotation]  ──(Convert)──>  [Sale Order]  ──(Fulfill)──>  [Shipment]
     │                             │                             │
     ▼                             ▼                             ▼
Customer Quote               Invoice Issued             Tracking Dispatched
(Draft / Sent)               Stock Deducted             (Packed / Shipped)
                                   │
                                   ▼
                         [Payment Collection]
                    Cash / Card / Wallet / Points
                                   │
                                   ▼
                       [ZATCA e-Invoice / PDF]
```

1. **Quotation Generation**: Price quote sent to customer without affecting warehouse inventory.
2. **One-Click Conversion**: Quotation converted into formal Sale via `GET /api/quotation/convert_sale/{id}`.
3. **Invoice Status Enforcement**:
   - `completed`: Stock deducted immediately; payments recorded.
   - `pending` or `ordered`: Sale logged in order pipeline without stock depletion.
4. **Multi-Payment Split**: A single invoice can be settled across multiple payment methods (e.g. $50 Cash + $100 Credit Card + $20 Customer Wallet balance).
5. **Credit Sales & Due Tracking**: Unpaid balances automatically update customer debt in `clients.due_amount` and append an entry to the customer statement of account ledger.

### 4.2 Customer Ledger & Loyalty Rewards
- **Customer Statement of Account**: Unified chronological ledger recording every Sale (Debit), Payment Voucher (Credit), and Sale Return Credit Note (Credit), maintaining a running balance.
- **Loyalty Program**:
  - Configured in `settings.loyalty_program`.
  - Customers earn points based on net spending (e.g. 1 point per $10 spent).
  - Points can be redeemed at checkout for instant order discounts (e.g. 100 points = $5 discount) or converted to store credit in their digital wallet.

### 4.3 B2B Client Portal
Dedicated customer-facing web portal accessed via `/portal`:
- Authenticated via session guard `portal`.
- Enables B2B clients to view invoices, download PDF receipts, review outstanding balances, submit quotation requests, and initiate online invoice payments via credit card or digital gateways.

---

## 5. Double-Entry Accounting V2 & ZATCA e-Invoicing

### 5.1 Accounting V2 Architecture
Stocky v5.8 incorporates an enterprise **Double-Entry General Ledger Engine**:
- **Five Primary Account Classes**:
  1. **Assets** (Code `1xxx`): Cash, Bank Accounts, Accounts Receivable, Inventory.
  2. **Liabilities** (Code `2xxx`): Accounts Payable, Sales Tax Payable, Loans.
  3. **Equity** (Code `3xxx`): Owner's Capital, Retained Earnings.
  4. **Income** (Code `4xxx`): Sales Revenue, Service Revenue, Discounts Received.
  5. **Expenses** (Code `5xxx`): Cost of Goods Sold (COGS), Salaries, Rent, Utilities, Damages.

### 5.2 Automated Journal Posting Rules
When transactional operations occur, automated balanced journal vouchers are created:
- **Cash Sale**:
  - `Debit`: Cash Account (`1001`) $[GrandTotal]$
  - `Credit`: Sales Revenue (`4001`) $[SubTotal]$
  - `Credit`: VAT / Tax Payable (`2001`) $[TaxNet]$
  - `Debit`: Cost of Goods Sold (`5001`) $[Cost]$
  - `Credit`: Inventory Asset (`1005`) $[Cost]$
- **Supplier Credit Purchase**:
  - `Debit`: Inventory Asset (`1005`) $[SubTotal]$
  - `Debit`: Input Tax Asset (`1006`) $[TaxNet]$
  - `Credit`: Accounts Payable (`2002`) $[GrandTotal]$

### 5.3 ZATCA Phase 2 e-Invoicing (Saudi Arabia)
Fully compliant with Saudi ZATCA (FATOORA) e-invoicing Phase 2 mandate:
1. **CSR Generation**: Cryptographic Certificate Signing Request generated directly from admin panel (`POST /api/zatca/csr/regenerate`).
2. **Onboarding & CCSID**: Submits OTP to ZATCA compliance portal to receive cryptographic stamp certificate (CCSID).
3. **UBL 2.1 Compliant XML**: Invoices generated in signed XML standard containing:
   - Cryptographic Hash (SHA-256) of previous invoice (Invoice Hash Chaining).
   - Base64 ECDSA Digital Signature (secp256k1).
   - Phase 2 QR Code payload encoding Seller Name, VAT Number, Timestamp, Total, VAT Total, Hash, and ECDSA Signature.

---

## 6. Storefront (eCommerce) Architecture

The integrated online store runs directly on top of the shared catalog database:
- **Zero Data Sync Delay**: Products published in the admin catalog (`is_active = 1`, `store_published = 1`) immediately appear on the storefront. Online sales immediately decrement warehouse stock.
- **Themes & Layouts**: Five pre-built responsive themes customizable via theme settings.
- **Cart & Guest Checkout**: Supports both registered customer accounts and friction-free guest checkout.
- **Payment Gateway Integrations**: Out-of-the-box support for Stripe, PayPal, Razorpay, Paystack, Flutterwave, and Cash on Delivery (COD).

---

## 7. Reporting & Analytics Suite

Stocky provides over 60 analytical reports categorized into 6 core intelligence groups:
1. **Profit & Loss**: Gross Profit, Operating Expenses, Net Income by custom date range, outlet, or category.
2. **Inventory Valuation & Aging**: FIFO valuation, dead stock identification (zero sales $> 90\text{ days}$), and stock aging brackets.
3. **Cash Register Variance**: Shift cash reconciliation auditing, cash short/over variances per cashier.
4. **Tax Summary**: Compliant reporting of output tax collected vs input tax paid for tax authority filing.
5. **Customer & Supplier Analytics**: Top spenders, customer credit aging, supplier purchase history, and debit balances.
6. **Best Sellers**: Volume vs Revenue matrix identifying high-margin core products vs fast-moving low-margin items.
