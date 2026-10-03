# Media Management & Image Resizing Pipeline Reference

This manual details file upload locations, image processing algorithms, resizing parameters, and storage abstraction across Stocky.

---

## 1. Directory Topology (`public/images/`)

All public media files are partitioned by module inside `public/images/`:

```
public/images/
├── products/              # Product catalog images (Primary & Gallery)
│   └── no-image.png       # Global fallback image (800x800)
├── brands/                # Brand manufacturer logos (Resized to 200x200)
│   └── no-image.png       # Brand fallback
├── banners/               # Storefront marketing sliders & promos
├── store/                 # Online store logo, favicon.ico, hero_image.jpg
│   └── theme/             # Category & collection theme tiles
├── avatar/                # Staff & client profile pictures
│   └── avatar-default.jpg # Default user avatar
├── documents/             # DocumentArchive attachments & PDF scans
├── expense_documents/     # Receipts & invoices attached to expenses
├── payment_proofs/        # Bank transfer deposit slips uploaded by clients
├── popups/                # Promotional modal graphics
├── vehicles/              # Fleet management vehicle photos
├── doctors/               # Hospital management doctor portraits
├── patients/              # Hospital management patient identification photos
├── leaves/                # Medical certificates & leave request attachments
├── marketing/             # Email & WhatsApp campaign image attachments
└── meetings/              # Board & client meeting presentation attachments
```

---

## 2. Remote vs. Local Image Helper (`product_images.php`)

Stocky supports both **local uploaded files** and **absolute external URLs** (e.g. CDNs, S3, WooCommerce imported URLs).

Located at `app/Support/product_images.php`:

```php
function product_image_is_remote($value): bool {
    $v = trim((string) $value);
    return $v !== '' && (bool) preg_match('#^(https?:)?//#i', $v);
}

function product_image_url($value): string {
    $v = trim((string) $value);
    // 1. Empty or placeholder fallback
    if ($v === '' || $v === 'no-image.png') {
        return asset('images/products/no-image.png');
    }
    // 2. Absolute remote URL
    if (product_image_is_remote($v)) {
        return $v;
    }
    // 3. Absolute path on disk
    if ($v[0] === '/') {
        return $v;
    }
    // 4. Relative filename in public/images/products/
    return asset('images/products/' . $v);
}
```

---

## 3. Image Resizing Engine (Intervention Image)

Stocky uses `intervention/image` (`^2.5`) with GD/Imagick drivers.

### 3.1 Product Image Processing
*   **Target Size**: Dynamic, read from database column `settings.product_image_max_size` (default `800` px).
*   **Toggle**: Controlled via `settings.product_image_resize` (boolean).
*   **Storage**: Comma-separated strings in `products.image` and relational records in `product_images` table.

### 3.2 Brand Logo Processing (`BrandsController.php`)
```php
if ($request->hasFile('image')) {
    $image = $request->file('image');
    $filename = rand(11111111, 99999999) . $image->getClientOriginalName();

    $image_resize = Image::make($image->getRealPath());
    $image_resize->resize(200, 200);
    $image_resize->save(public_path('/images/brands/' . $filename));
} else {
    $filename = 'no-image.png';
}
```

### 3.3 Old File Deletion Lifecycle
When an image is updated or replaced, the controller verifies it is not the default fallback before unlinking:
```php
$oldImagePath = public_path('images/brands/' . $currentImage);
if (file_exists($oldImagePath) && $currentImage !== 'no-image.png') {
    @unlink($oldImagePath);
}
```

---

## 4. Cloud Storage & AWS S3 Integration

Stocky includes `aws/aws-sdk-php: ^3.0` in `composer.json` for database backups and document storage:
*   Configured in `config/filesystems.php` under the `s3` disk.
*   Enables automated scheduled MySQL dumps to be pushed to private S3 buckets.
