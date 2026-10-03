# Cloning & Re-Implementation Runbook

Follow this step-by-step engineering runbook to replicate, clone, or port the Stocky platform into a new codebase.

---

## Step 1: Environment & Prerequisites

*   **PHP**: `^8.2` or `^8.3` (Extensions: `pdo_mysql`, `gd` or `imagick`, `fileinfo`, `mbstring`, `openssl`, `bcmath`, `curl`)
*   **Node.js**: `^18.0` or `^20.0`
*   **Database**: MySQL `8.0+` or MariaDB `10.6+` (InnoDB engine required)

---

## Step 2: Database Schema & Migration Execution

1.  **Enforce 3-Decimal Precision**:
    Ensure all tables storing currencies, prices, costs, line taxes, and quantities use `DECIMAL(16, 3)` instead of `float` or `double`.
2.  **Core Tables Sequence**:
    *   Authentication: `users`, `roles`, `permissions`, `permission_role`, `role_user`, `user_warehouse`.
    *   Catalog: `categories`, `subcategories`, `brands`, `units`, `products`, `product_variants`, `product_warehouse`, `product_batches`, `product_serials`.
    *   Commercial: `clients`, `providers`, `warehouses`, `sales`, `sale_details`, `purchases`, `purchase_details`, `quotations`, `transfers`, `adjustments`.
    *   Cash & Register: `cash_registers`, `accounts`, `payment_sales`, `payment_purchases`, `expenses`, `deposits`.
    *   Storefront: `store_settings`, `online_orders`, `online_order_items`, `store_banners`, `coupons`.

---

## Step 3: Backend Authentication & Middleware Setup

1.  **Install & Configure Laravel Passport**:
    ```bash
    composer require laravel/passport:^12.0
    php artisan migrate
    php artisan passport:install
    ```
2.  **Configure Multi-Guard in `config/auth.php`**:
    ```php
    'guards' => [
        'web' => ['driver' => 'session', 'provider' => 'users'],
        'api' => ['driver' => 'passport', 'provider' => 'users', 'hash' => false],
        'store' => ['driver' => 'session', 'provider' => 'ecommerce_clients'],
        'portal' => ['driver' => 'session', 'provider' => 'portal_clients'],
    ],
    ```
3.  **Kernel Middleware Group (`web`)**:
    Attach `\Laravel\Passport\Http\Middleware\CreateFreshApiToken::class` to your `web` middleware group so Passport issues the `laravel_token` cookie on successful session authentication.

---

## Step 4: Frontend Scaffolding & Dependencies

1.  **Install Frontend Packages**:
    ```bash
    npm install vue@^3.5 pinia@^4.0 vue-router@^4.6 ant-design-vue@^4.2 @ant-design/icons-vue@^7.0 lucide-vue-next@^1.0 bootstrap-icons@^1.13 qz-tray@^2.2 dayjs@^1.11 apexcharts@^5.3 vue3-apexcharts@^1.8
    npm install -D vite@^6.0 @vitejs/plugin-vue@^5.2 tailwindcss@^3.4 postcss@^8.5 autoprefixer@^10.4 sass@^1.80
    ```
2.  **Offline Receipt Fonts Configuration**:
    Add local font declarations in `public/css/receipt-fonts.css`:
    ```css
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/Inter-Regular.woff2') format('woff2');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/Inter-SemiBold.woff2') format('woff2');
      font-weight: 600;
    }
    ```
3.  **Vite Manifest Loader in Blade** (e.g. `resources/views/app.blade.php`):
    Read `.vite/manifest.json` dynamically and link compiled assets without appending cache-busting query strings (`?v=`):
    ```html
    @php
      $manifestPath = public_path('.vite/manifest.json');
      $manifest = file_exists($manifestPath) ? json_decode(file_get_contents($manifestPath), true) : [];
      $entry = $manifest['resources/src/app.js'] ?? null;
      $jsFile = $entry['file'] ?? 'js/app.js';
      $cssFiles = $entry['css'] ?? [];
    @endphp

    @foreach($cssFiles as $css)
      <link rel="stylesheet" href="{{ asset($css) }}">
    @endforeach
    <script type="module" src="{{ asset($jsFile) }}"></script>
    ```

---

## Step 5: Hardware & Silent Print Integration (QZ-Tray)

1.  **Standalone QZ-Tray Print Utility** (e.g. `src/lib/qzPrint.js`):
    ```javascript
    import qz from 'qz-tray';

    export async function initQz(certEndpoint = '/api/qz/certificate', signEndpoint = '/api/qz/sign') {
      qz.security.setCertificatePromise((resolve, reject) => {
        fetch(certEndpoint).then((res) => res.text()).then(resolve).catch(reject);
      });

      qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
        fetch(signEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ request: toSign })
        }).then((res) => res.text()).then(resolve).catch(reject);
      });

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 2, delay: 1 });
      }
    }

    export async function printThermalReceipt(printerName, htmlReceipt, kickDrawer = false) {
      const config = qz.configs.create(printerName, { rasterize: false });
      const printData = [
        { type: 'html', format: 'plain', data: htmlReceipt }
      ];
      if (kickDrawer) {
        // Standard ESC/POS RJ11 pin 2 drawer kick command: ESC p 0 25 250
        printData.push({ type: 'raw', format: 'hex', data: '1B700019FA' });
      }
      return qz.print(config, printData);
    }
    ```
2.  **Setup Certificate Signing Endpoints in Backend**:
    *   `GET /api/qz/certificate`: Returns your company's self-signed X.509 certificate.
    *   `POST /api/qz/sign`: Signs the raw request string with your private key using `SHA512`.
    *   This eliminates the browser confirmation prompt for thermal receipt printing and cash drawer opening.

---

## Step 6: Build Commands

```bash
# Development (watch mode)
npm run dev

# Full Production Build (All 4 Apps)
npm run build
```
The build runs:
1.  `build:admin`: Compiles main Admin SPA + POS to `public/js/`
2.  `build:customer-display`: Compiles dual-monitor screen (`vite.customer-display.config.js`)
3.  `build:portal`: Compiles B2B client portal (`vite.portal.config.js`)
4.  `build:storefront`: Compiles eCommerce CSS/JS bundle (`vite.storefront.config.js`)
