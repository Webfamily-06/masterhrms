# Storefront Frontpage UI Structure & Architecture

This manual details the public eCommerce Storefront architecture built with **Laravel Blade**, **Tailwind CSS**, and **Alpine.js**.

---

## 1. Storefront Multi-Theme Engine

Configured in `store_settings.theme` and rendered via `layouts/store.blade.php`:

| Theme Key | Focus Industry | Layout Style & Characteristics |
| :--- | :--- | :--- |
| **`default`** | General Retail & Apparel | Clean modern aesthetic, sticky header, category megamenu, flyout cart drawer. |
| **`electronics`** | Tech, Gadgets & Hardware | High-density grids, spec sheets, comparison tables, flash-sale countdown timers. |
| **`real_estate`** | Property & Rental Listings | Custom hero search filters (Bedrooms, Price range, Location), property galleries. |

---

## 2. Component Wireframe & Visual Hierarchy

```
+---------------------------------------------------------------------------------------+
| 1. ANNOUNCEMENT TOPBAR (Height: 36px, Dark BG)                                        |
| Currency: [USD v] | Lang: [English v]                       Support: +1 800 555-0199  |
+---------------------------------------------------------------------------------------+
| 2. MAIN HEADER (Height: 80px, White / Surface Elevated)                              |
| [STORE LOGO]   [ Search products, brands, categories... (Live Dropdown) ]            |
|                [Wishlist (3)]  [Account / Login]  [Cart Drawer ($120.50 / 3 items)]   |
+---------------------------------------------------------------------------------------+
| 3. CATEGORY MEGAMENU BAR                                                              |
| [ All Categories v ]  Laptops  Smartphones  Accessories  Flash Deals  Brands  Track Order|
+---------------------------------------------------------------------------------------+
| 4. HERO SECTION (Aspect Ratio: 21/9, Full Width Banner Carousel)                      |
| [ Banner Slider: "Summer Clearance — Up to 40% Off" | Shop Now Button ]               |
+---------------------------------------------------------------------------------------+
| 5. VALUE PROPOSITION BAR                                                              |
| [🚚 Free Shipping >$50]  [🔒 Secure Payment]  [⏱️ 30-Day Returns]  [💬 24/7 Support]  |
+---------------------------------------------------------------------------------------+
| 6. PRODUCT SHOWCASE GRID (Tailwind 2 to 5 columns responsive)                         |
| +------------------+ +------------------+ +------------------+ +--------------------+ |
| | [BADGE: 20% OFF] | | [BADGE: NEW]     | |                  | |                    | |
| | [Product Image]  | | [Product Image]  | | [Product Image]  | | [Product Image]    | |
| | ★★★★☆ (42)       | | ★★★★★ (18)       | | ★★★★☆ (8)        | | ★★★★★ (95)         | |
| | Wireless Headset | | Smart Watch V2   | | USB-C Fast Dock  | | Bluetooth Speaker  | |
| | $79.99 ($99.99)  | | $149.00          | | $39.99           | | $59.00             | |
| | [ Quick Add ]    | | [ Quick Add ]    | | [ Quick Add ]    | | [ Quick Add ]      | |
| +------------------+ +------------------+ +------------------+ +--------------------+ |
+---------------------------------------------------------------------------------------+
| 7. FOOTER                                                                             |
| • About Us, Store Address, Social Links (Facebook, Instagram, X, YouTube)             |
| • Newsletter Subscription Input Form                                                  |
| • Accepted Payment Badges: Visa, Mastercard, PayPal, Stripe, Apple Pay                |
+---------------------------------------------------------------------------------------+
```

---

## 3. Alpine.js Client State Architecture (`storefront.js`)

The frontend avoids heavy React/Vue overhead in the storefront by using ultra-fast Alpine.js components:

```javascript
// Alpine Global Cart Store
document.addEventListener('alpine:init', () => {
  Alpine.store('cart', {
    items: JSON.parse(localStorage.getItem('store_cart') || '[]'),
    drawerOpen: false,
    
    get count() {
      return this.items.reduce((total, item) => total + item.quantity, 0);
    },
    get subtotal() {
      return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    
    add(product, quantity = 1) {
      const existing = this.items.find(i => i.id === product.id && i.variant_id === product.variant_id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        this.items.push({ ...product, quantity });
      }
      this.save();
      this.drawerOpen = true;
    },
    
    remove(index) {
      this.items.splice(index, 1);
      this.save();
    },
    
    save() {
      localStorage.setItem('store_cart', JSON.stringify(this.items));
    }
  });
});
```

---

## 4. Multi-Gateway Checkout Engine

Located in `resources/views/store/checkout.blade.php`, the checkout process handles:

1. **Shipping Calculations**: Matches destination country/state against `shipping_zones` and applies flat-rate or weight-based tariffs.
2. **Coupon Verification**: Validates coupon against minimum purchase amount and expiration in `store_coupons`.
3. **Payment Providers**:
   *   **Stripe**: Uses Stripe Elements with `stripe.confirmCardPayment()`.
   *   **PayPal**: Redirects to PayPal checkout approval URL.
   *   **Paystack & Flutterwave**: Inline popups for African payment corridors.
   *   **Razorpay**: Standard checkout modal for India.
   *   **Cash on Delivery (COD)**: Creates order directly with `payment_status = 'unpaid'`.
   *   **Customer eWallet**: Deducts balance from customer's stored wallet credit.

---

## 5. SEO & Schema.org JSON-LD Engine

Every storefront page automatically generates rich structured metadata for Google search indexing:
*   **BreadcrumbList Schema**: Navigational trail for search results.
*   **Product Schema**: Includes SKU, Brand, Availability (`InStock` vs `OutOfStock`), and Currency Offer prices.
*   **OpenGraph & Twitter Card Tags**: Auto-renders uploaded product photos and descriptions for social sharing.
