<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Http\Requests\CouponRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CouponController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Coupon::with('creator');

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Handle type filter
        if ($request->has('type') && !empty($request->type) && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        // Handle date range filter
        if ($request->has('date_from') && !empty($request->date_from)) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && !empty($request->date_to)) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $statusCounts = [
            'all' => (clone $query)->count(),
            'active' => (clone $query)->where('status', 1)->count(),
            'inactive' => (clone $query)->where('status', 0)->count(),
        ];

        // Handle status filter
        if ($request->has('status') && $request->status !== null && $request->status !== '_empty_') {
            $allowedStatuses = ['0', '1'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        // Handle sorting
        $sortField = $request->get('sort_field', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');

        // Validate sort field
        $allowedSortFields = ['id', 'name', 'code', 'type', 'expiry_date', 'created_at'];
        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }

        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 10);
        $coupons = $query->paginate($perPage);

        return Inertia::render('coupons/index', [
            'coupons' => $coupons,
            'filters' => $request->all(['search', 'type', 'status', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page']),
            'statusCounts' => $statusCounts,
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Coupon $coupon)
    {
        $coupon->load('creator');

        if (isDemo()) {
            // Mock usage data for demo mode
            $usageHistory = collect([
                [
                    'id' => 1,
                    'user_name' => 'John Doe',
                    'user_email' => 'john@example.com',
                    'user_avatar' => null,
                    'order_id' => 'ORD-001',
                    'amount' => 100.00,
                    'discount_amount' => 10.00,
                    'used_at' => now()->subDays(2)->toISOString()
                ],
                [
                    'id' => 2,
                    'user_name' => 'Jane Smith',
                    'user_email' => 'jane@example.com',
                    'user_avatar' => null,
                    'order_id' => 'ORD-002',
                    'amount' => 150.00,
                    'discount_amount' => 15.00,
                    'used_at' => now()->subDays(1)->toISOString()
                ]
            ]);

            $perPage = $request->get('per_page', 10);
            $page = $request->get('page', 1);
            $total = $usageHistory->count();
            $items = $usageHistory->forPage($page, $perPage)->values();

            $paginatedUsage = new \Illuminate\Pagination\LengthAwarePaginator(
                $items,
                $total,
                $perPage,
                $page,
                ['path' => $request->url(), 'pageName' => 'page']
            );

            $coupon->used_count = $usageHistory->count();
        } else {
            // Fetch real usage history from plan_orders
            $perPage = $request->get('per_page', 10);

            $query = \App\Models\PlanOrder::with('user')
                ->where('coupon_id', $coupon->id);

            $paginatedOrders = $query->latest('ordered_at')->paginate($perPage);

            $coupon->used_count = \App\Models\PlanOrder::where('coupon_id', $coupon->id)->count();

            $transformedItems = $paginatedOrders->getCollection()->map(function ($order) {
                return [
                    'id' => $order->id,
                    'user_name' => $order->user ? $order->user->name : __('Unknown User'),
                    'user_email' => $order->user ? $order->user->email : '-',
                    'user_avatars' => check_file($order->user->avatar) ? get_file($order->user->avatar) : get_file('avatars/avatar.png'),
                    'order_id' => $order->order_number ?? ('ORD-' . $order->id),
                    'amount' => (float) $order->original_price,
                    'discount_amount' => (float) $order->discount_amount,
                    'used_at' => $order->ordered_at ? $order->ordered_at->toISOString() : $order->created_at->toISOString()
                ];
            });

            $paginatedUsage = new \Illuminate\Pagination\LengthAwarePaginator(
                $transformedItems,
                $paginatedOrders->total(),
                $paginatedOrders->perPage(),
                $paginatedOrders->currentPage(),
                ['path' => $request->url(), 'pageName' => 'page']
            );
        }

        return Inertia::render('coupons/show', [
            'coupon' => $coupon,
            'usage_history' => $paginatedUsage
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CouponRequest $request)
    {

        $data = $request->all();
        $data['created_by'] = Auth::id();

        // Generate code if auto-generate is selected
        if ($request->code_type === 'auto') {
            do {
                $data['code'] = strtoupper(Str::random(8));
            } while (Coupon::where('code', $data['code'])->exists());
        }

        $coupon = Coupon::create($data);

        return redirect()->route('coupons.index')->with('success', __('Coupon created successfully!'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(CouponRequest $request, Coupon $coupon)
    {

        $data = $request->all();

        // Generate new code if switching to auto-generate
        if ($request->code_type === 'auto' && $coupon->code_type !== 'auto') {
            do {
                $data['code'] = strtoupper(Str::random(8));
            } while (Coupon::where('code', $data['code'])->where('id', '!=', $coupon->id)->exists());
        }

        $coupon->update($data);

        return redirect()->route('coupons.index')->with('success', __('Coupon updated successfully!'));
    }

    /**
     * Validate coupon code
     */
    public function validate(Request $request)
    {
        $request->validate([
            'coupon_code' => 'required|string',
            'plan_id' => 'required|integer',
            'amount' => 'required|numeric|min:0'
        ]);

        $coupon = Coupon::where('code', $request->coupon_code)
            ->where('status', 1)
            ->first();

        if (!$coupon) {
            return response()->json([
                'valid' => false,
                'message' => __('Invalid or inactive coupon code')
            ], 400);
        }

        // Check if coupon is expired
        if ($coupon->expiry_date && $coupon->expiry_date < now()) {
            return response()->json([
                'valid' => false,
                'message' => __('Coupon has expired')
            ], 400);
        }

        // Check usage limit
        if ($coupon->use_limit_per_coupon && $coupon->used_count >= $coupon->use_limit_per_coupon) {
            return response()->json([
                'valid' => false,
                'message' => __('Coupon usage limit exceeded')
            ], 400);
        }

        // Check minimum amount
        if ($coupon->minimum_spend && $request->amount < $coupon->minimum_spend) {
            return response()->json([
                'valid' => false,
                'message' => __('Minimum spend requirement not met')
            ], 400);
        }

        return response()->json([
            'valid' => true,
            'coupon' => [
                'id' => $coupon->id,
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->discount_amount
            ]
        ]);
    }

    /**
     * Toggle the status of the specified coupon.
     */
    public function toggleStatus(Coupon $coupon)
    {
        $coupon->update([
            'status' => !$coupon->status
        ]);

        return redirect()->back()->with('success', __('Coupon status updated successfully!'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Coupon $coupon)
    {
        $coupon->delete();

        return redirect()->route('coupons.index')->with('success', __('Coupon deleted successfully!'));
    }
}
