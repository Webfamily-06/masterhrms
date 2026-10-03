# Backend Services, Eloquent Models & Business Engine Reference

This manual provides the production-ready Laravel 12 backend architecture, Eloquent model scopes (multi-tenant warehouse scoping, record visibility), atomic inventory movement services, and double-entry general ledger posting rules.

---

## 1. Multi-Tenant Eloquent Scopes

### 1.1 Warehouse Isolation Scope (`app/Scopes/WarehouseScope.php`)
Automatically scopes every query to the warehouses assigned to the authenticated user in the `user_warehouse` pivot table, unless the user has `is_all_warehouses = 1`:

```php
namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class WarehouseScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = Auth::user();
        if (!$user) {
            return;
        }

        // Superadmins or users with global warehouse privilege bypass isolation
        if ($user->is_all_warehouses) {
            return;
        }

        // Scope to assigned warehouses
        $assignedWarehouseIds = $user->warehouses()->pluck('warehouses.id')->toArray();
        $builder->whereIn($model->getTable() . '.warehouse_id', $assignedWarehouseIds);
    }
}
```

### 1.2 Record Visibility Scope (`app/Scopes/RecordViewScope.php`)
Restricts staff members without the `record_view` permission to viewing only records they personally created:

```php
namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class RecordViewScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = Auth::user();
        if (!$user) {
            return;
        }

        // If user does not have 'record_view' permission, restrict to own documents
        if (!$user->can('record_view')) {
            $builder->where($model->getTable() . '.user_id', $user->id);
        }
    }
}
```

---

## 2. Core Eloquent Models

### 2.1 Sale Model (`app/Models/Sale.php`)
```php
namespace App\Models;

use App\Scopes\RecordViewScope;
use App\Scopes\WarehouseScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use SoftDeletes;

    protected $table = 'sales';

    protected $fillable = [
        'user_id', 'date', 'Ref', 'is_pos', 'client_id', 'warehouse_id',
        'tax_rate', 'TaxNet', 'discount', 'discount_Method', 'shipping',
        'GrandTotal', 'paid_amount', 'statut', 'payment_statut', 'notes'
    ];

    protected $casts = [
        'tax_rate'    => 'decimal:3',
        'TaxNet'      => 'decimal:3',
        'discount'    => 'decimal:3',
        'shipping'    => 'decimal:3',
        'GrandTotal'  => 'decimal:3',
        'paid_amount' => 'decimal:3',
        'is_pos'      => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new WarehouseScope);
        static::addGlobalScope(new RecordViewScope);
    }

    public function details()
    {
        return $this->hasMany(SaleDetail::class, 'sale_id');
    }

    public function payments()
    {
        return $this->hasMany(PaymentSale::class, 'sale_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
```

### 2.2 Product Model (`app/Models/Product.php`)
```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $table = 'products';

    protected $fillable = [
        'code', 'Type_barcode', 'name', 'cost', 'price', 'category_id',
        'brand_id', 'unit_id', 'unit_sale_id', 'unit_purchase_id',
        'TaxNet', 'tax_method', 'image', 'note', 'stock_alert',
        'is_variant', 'is_imei', 'not_selling', 'is_active'
    ];

    protected $casts = [
        'cost'        => 'decimal:3',
        'price'       => 'decimal:3',
        'TaxNet'      => 'decimal:3',
        'stock_alert' => 'decimal:3',
        'is_variant'  => 'boolean',
        'is_imei'     => 'boolean',
        'is_active'   => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class, 'product_id');
    }

    public function warehouseStocks()
    {
        return $this->hasMany(ProductWarehouse::class, 'product_id');
    }

    public function getStockInWarehouse($warehouseId)
    {
        return $this->warehouseStocks()->where('warehouse_id', $warehouseId)->sum('qte');
    }
}
```

---

## 3. Inventory Movement Service (`app/Services/InventoryMovementService.php`)

Executes transactional stock adjustments, serial status updates, and batch lot deductions:

```php
namespace App\Services;

use App\Models\ProductWarehouse;
use App\Models\ProductBatch;
use App\Models\ProductSerial;
use App\Models\Sale;
use App\Models\Purchase;
use Illuminate\Support\Facades\DB;
use Exception;

class InventoryMovementService
{
    /**
     * Decrements inventory when a Sale is marked 'completed'.
     */
    public function deductStockOnSale(Sale $sale): void
    {
        DB::transaction(function () use ($sale) {
            foreach ($sale->details as $detail) {
                // 1. Decrement stock in product_warehouse
                $stock = ProductWarehouse::firstOrCreate([
                    'product_id'         => $detail->product_id,
                    'warehouse_id'       => $sale->warehouse_id,
                    'product_variant_id' => $detail->product_variant_id
                ], ['qte' => 0.000]);

                $stock->qte -= $detail->quantity;
                $stock->save();

                // 2. Mark serial numbers as 'sold'
                if (!empty($detail->imei_number)) {
                    $serials = array_filter(array_map('trim', explode(',', $detail->imei_number)));
                    ProductSerial::where('product_id', $detail->product_id)
                        ->where('warehouse_id', $sale->warehouse_id)
                        ->whereIn('serial_number', $serials)
                        ->update(['status' => 'sold']);
                }

                // 3. Deduct batch balances if batches allocated
                if (!empty($detail->batches)) {
                    foreach ($detail->batches as $batchAlloc) {
                        $batch = ProductBatch::find($batchAlloc['product_batch_id']);
                        if ($batch) {
                            $batch->current_quantity -= $batchAlloc['qty'];
                            $batch->save();
                        }
                    }
                }
            }
        });
    }

    /**
     * Increments inventory when a Purchase is marked 'received'.
     */
    public function receiveStockOnPurchase(Purchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            foreach ($purchase->details as $detail) {
                $stock = ProductWarehouse::firstOrCreate([
                    'product_id'         => $detail->product_id,
                    'warehouse_id'       => $purchase->warehouse_id,
                    'product_variant_id' => $detail->product_variant_id
                ], ['qte' => 0.000]);

                $stock->qte += $detail->quantity;
                $stock->save();
            }
        });
    }

    /**
     * Re-credits stock when a completed sale is cancelled or soft-deleted.
     */
    public function restoreStockOnSaleDelete(Sale $sale): void
    {
        DB::transaction(function () use ($sale) {
            foreach ($sale->details as $detail) {
                $stock = ProductWarehouse::where([
                    'product_id'         => $detail->product_id,
                    'warehouse_id'       => $sale->warehouse_id,
                    'product_variant_id' => $detail->product_variant_id
                ])->first();

                if ($stock) {
                    $stock->qte += $detail->quantity;
                    $stock->save();
                }

                if (!empty($detail->imei_number)) {
                    $serials = array_filter(array_map('trim', explode(',', $detail->imei_number)));
                    ProductSerial::where('product_id', $detail->product_id)
                        ->where('warehouse_id', $sale->warehouse_id)
                        ->whereIn('serial_number', $serials)
                        ->update(['status' => 'in_stock']);
                }
            }
        });
    }
}
```

---

## 4. Double-Entry General Ledger Service (`app/Services/DoubleEntryService.php`)

Generates balanced journal entries ($\sum \text{Debits} = \sum \text{Credits}$) for commercial transactions:

```php
namespace App\Services;

use App\Models\AccJournalEntry;
use App\Models\AccJournalEntryLine;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;

class DoubleEntryService
{
    /**
     * Posts automated balanced journal entry for a completed Sale.
     * 
     * Debits:
     *   - Cash or Bank Account (Cash Received)
     *   - Accounts Receivable (Unpaid Balance)
     * Credits:
     *   - Sales Revenue (SubTotal)
     *   - Sales Tax / VAT Payable (TaxNet)
     */
    public function postSaleJournalEntry(Sale $sale): AccJournalEntry
    {
        return DB::transaction(function () use ($sale) {
            $entry = AccJournalEntry::create([
                'entry_number' => 'JE-SL-' . $sale->id . '-' . time(),
                'date'         => $sale->date,
                'reference'    => $sale->Ref,
                'description'  => "Automated entry for Sale {$sale->Ref}",
                'status'       => 'posted',
                'posted_at'    => now(),
                'created_by'   => $sale->user_id
            ]);

            $subtotal = $sale->GrandTotal - $sale->TaxNet;

            // 1. Credit Sales Revenue (Account Code 4001)
            $this->addLine($entry->id, '4001', 0, $subtotal, 'Sales Revenue');

            // 2. Credit Sales Tax Payable (Account Code 2001) if tax > 0
            if ($sale->TaxNet > 0) {
                $this->addLine($entry->id, '2001', 0, $sale->TaxNet, 'Sales Tax Payable');
            }

            // 3. Debit Cash or Bank (Account Code 1001) for paid amount
            if ($sale->paid_amount > 0) {
                $this->addLine($entry->id, '1001', $sale->paid_amount, 0, 'Cash / Bank Settlement');
            }

            // 4. Debit Accounts Receivable (Account Code 1002) for unpaid balance
            $due = $sale->GrandTotal - $sale->paid_amount;
            if ($due > 0) {
                $this->addLine($entry->id, '1002', $due, 0, 'Customer Receivable Due');
            }

            return $entry;
        });
    }

    private function addLine($entryId, $accountCode, $debit, $credit, $memo): void
    {
        $account = DB::table('acc_chart_of_accounts')->where('code', $accountCode)->first();
        if ($account) {
            AccJournalEntryLine::create([
                'journal_entry_id' => $entryId,
                'account_id'       => $account->id,
                'debit'            => $debit,
                'credit'           => $credit,
                'memo'             => $memo
            ]);
        }
    }
}
```

---

## 5. Security & Session Middlewares

### 5.1 Active User Enforcement (`app/Http/Middleware/IsActive.php`)
```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class IsActive
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        if ($user && !$user->statut) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'This account has been deactivated. Please contact your system administrator.'
                ], 403);
            }
            Auth::logout();
            return redirect('/login');
        }

        return $next($request);
    }
}
```

### 5.2 Inactivity Session Timeout (`app/Http/Middleware/SessionTimeout.php`)
```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SessionTimeout
{
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $timeout = DB::table('settings')->value('session_timeout_minutes') ?: 60;
            $lastActivity = session('last_activity_time');

            if ($lastActivity && (time() - $lastActivity > ($timeout * 60))) {
                Auth::logout();
                session()->forget('last_activity_time');
                if ($request->expectsJson()) {
                    return response()->json(['message' => 'Session timed out due to inactivity.'], 401);
                }
                return redirect('/login')->withErrors(['session' => 'Session expired.']);
            }

            session(['last_activity_time' => time()]);
        }

        return $next($request);
    }
}
```
