# Operational Business Flows & Lifecycle Reference

This manual details the step-by-step lifecycles and sequence architectures for all core business operations in Stocky.

---

## 1. Authentication & KeepAlive Inactivity Protection

Stocky uses Passport's cookie guard (`laravel_token`). To ensure cashiers are never kicked out in the middle of a transaction while inactive terminals still safely expire:

```mermaid
sequenceDiagram
    autonumber
    actor Cashier
    participant SPA as Vue 3 App (App.vue)
    participant Http as src/lib/http.js
    participant Server as Laravel Backend

    Cashier->>Server: Login credentials via /login
    Server-->>Cashier: Sets laravel_token & XSRF-TOKEN cookies
    Cashier->>SPA: Mounts Application
    SPA->>Http: GET /api/get_user_auth
    Http->>Server: Attach X-XSRF-TOKEN header
    Server-->>SPA: 200 OK { user, permissions, notifs }

    Note over Cashier, SPA: User actively types or moves mouse
    Cashier->>SPA: pointerdown or keydown event
    SPA->>SPA: lastActivityAt = Date.now()

    loop Every 10 Minutes (KEEPALIVE_EVERY_MS)
        SPA->>SPA: Check if Date.now() - lastActivityAt < 10 mins
        alt Active within window
            SPA->>Server: fetch('/session/keepalive', credentials='same-origin')
            Server-->>SPA: Session lifetime extended
        else Inactive / Abandoned terminal
            SPA->>SPA: Skip ping -> Session times out naturally
        end
    end
```

---

## 2. Point of Sale (POS) Complete Sale Lifecycle

The retail POS engine coordinates inventory checks, batch/serial picking, real-time customer display broadcasting, thermal receipt printing, and hardware drawer triggers:

```mermaid
sequenceDiagram
    autonumber
    actor Cashier
    participant POS as PosPage.vue
    participant LineCalc as lib/lineCalc.js
    participant Echo as WebSocket Channel ('pos-cart.{id}')
    participant CustDisp as CustomerDisplay.vue
    participant Server as Api/SalesController
    participant DB as MySQL DB
    participant QZ as lib/qzPrint.js (QZ-Tray)

    Cashier->>POS: Open Shift -> Enter Opening Cash
    POS->>Server: POST /pos/open-register
    Server->>DB: Insert cash_registers (status='open')

    Cashier->>POS: Scan Barcode / Select Product
    POS->>POS: Check Warehouse Stock (product_warehouse.qte)
    
    alt Product has Batches (Pharmacy / Perishables)
        POS->>Cashier: Prompt Batch & Expiry Picker
        Cashier->>POS: Selects Batch
    end
    alt Product has Serial Numbers (Electronics)
        POS->>Cashier: Prompt Serial Number Picker
        Cashier->>POS: Scans Serial #
    end

    POS->>LineCalc: Calculate (Qty * NetPrice - LineDiscount + LineTax)
    POS->>Echo: Whisper 'cart-updated'
    Echo-->>CustDisp: Updates Cart Lines & Grand Total Live

    Cashier->>POS: Press Pay (F2) -> Open Payment Modal
    Cashier->>POS: Enter Tendered Cash / Select Card / Split
    POS->>Server: POST /api/sales (Payload + Payment Lines)

    rect rgb(240, 248, 255)
        Note over Server, DB: DB Transaction
        Server->>DB: INSERT into sales & sale_details
        Server->>DB: UPDATE product_warehouse (Deduct qte)
        Server->>DB: INSERT sale_detail_batches / product_serial_movements
        Server->>DB: INSERT payment_sales & Update Cash Register
    end

    Server-->>POS: 200 OK { sale_id, invoice_number }
    POS->>Echo: Whisper 'sale-completed'
    Echo-->>CustDisp: Display "Sale Completed, Thank You!"

    opt Silent Print via QZ-Tray
        POS->>QZ: qzPrintRaw(printerName, base64TSPL)
        QZ-->>Cashier: Physical Receipt Prints
        POS->>QZ: Send Hex `27, 112, 0, 25, 250` (Kick Cash Drawer)
    end

    POS->>POS: Clear Cart State & Focus Barcode Input
```

---

## 3. Inventory Purchasing & Replenishment Flow

1.  **Draft / Ordering Phase**:
    *   Select **Supplier (Provider)** and **Destination Warehouse**.
    *   Add line items: Product, Purchase Unit (e.g. Case of 24), Purchase Cost, Discount, and Tax.
    *   Enter Supplier Invoice Reference and expected arrival date.
2.  **Goods Receipt Phase**:
    *   Set status to `Received`:
    *   System checks `units.operator` (multiplication vs division) and converts purchase quantity to base unit quantity.
    *   Increments `product_warehouse.qte`.
    *   If batch-enabled, records `product_batches` row with initial quantity, manufacturing date, and expiration date.
3.  **Financial Settlement**:
    *   Records payment in `payment_purchases` linked to the chosen financial Account.
    *   Updates supplier ledger balance (`providers.due_amount`).

---

## 4. Multi-Warehouse Stock Transfer Flow

```mermaid
graph LR
    A["Warehouse A<br/>(Source)"] -->|1. Create Transfer| T["Transfer In-Transit<br/>(Deducts stock from A immediately)"]
    T -->|2. Warehouse B Manager Review| V{"Approval Status?"}
    V -->|Approved / Completed| B["Warehouse B<br/>(Destination)<br/>(Increments stock in B)"]
    V -->|Rejected / Cancelled| R["Reversal<br/>(Restores stock back to A)"]
```

---

## 5. Storefront eCommerce Customer Flow

1.  **Catalog Navigation**: Client browses products filtered by category, brand, and price range.
2.  **Cart Management**: Client adds products to cart (stored in session / localStorage).
3.  **Checkout**: Client provides shipping address, chooses shipping method (calculated via `shipping_zones`), applies promotional coupon.
4.  **Payment Gateway**: Direct integration with Stripe, PayPal, Paystack, Razorpay, or Flutterwave.
5.  **Order Ingestion**: System generates an `online_orders` record and creates an admin notification badge (`new_orders`) on the Admin sidebar.
