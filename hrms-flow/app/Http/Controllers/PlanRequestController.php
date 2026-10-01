<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PlanRequestController extends BaseController
{
    public function index(Request $request)
    {
        $query = PlanRequest::with(['user', 'plan', 'approver', 'rejector']);

        // For Company
        if (Auth::user()->hasRole('company')) {
            $query->where('user_id', Auth::user()->id);
        }

        // Handle search
        if ($request->has('search') && ! empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($userQuery) use ($search) {
                    $userQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                    ->orWhereHas('plan', function ($planQuery) use ($search) {
                        $planQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Handle date range filter
        if ($request->has('date_from') && ! empty($request->date_from)) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && ! empty($request->date_to)) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $statusCounts = [
            'all' => (clone $query)->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'approved' => (clone $query)->where('status', 'approved')->count(),
            'rejected' => (clone $query)->where('status', 'rejected')->count(),
        ];

        // Handle status filter
        if ($request->has('status') && ! empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Handle sorting
        $sortField = $request->get('sort_field', 'id');
        $sortDirection = $request->get('sort_direction', 'desc');

        // Validate sort field
        $allowedSortFields = ['id', 'created_at', 'status'];
        if (! in_array($sortField, $allowedSortFields)) {
            $sortField = 'id';
        }

        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 10);
        $planRequests = $query->paginate($perPage);

        // Transform data for frontend
        $planRequests->getCollection()->transform(function ($planRequest) {
            return [
                'id' => $planRequest->id,
                'user' => [
                    'id' => $planRequest->user->id,
                    'name' => $planRequest->user->name,
                    'email' => $planRequest->user->email,
                    'avatar' => check_file($planRequest->user->avatar) ? get_file($planRequest->user->avatar) : get_file('avatars/avatar.png'),
                ],
                'plan' => [
                    'id' => $planRequest->plan->id,
                    'name' => $planRequest->plan->name,
                    'duration' => $planRequest->billing_cycle,
                ],
                'status' => $planRequest->status,
                'created_at' => $planRequest->created_at,
                'approved_at' => $planRequest->approved_at,
                'rejected_at' => $planRequest->rejected_at,
            ];
        });

        return Inertia::render('plans/plan-request', [
            'planRequests' => $planRequests,
            'filters' => $request->all(['search', 'status', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page']),
            'statusCounts' => $statusCounts,
        ]);
    }

    public function approve(PlanRequest $planRequest)
    {
        // Guard: only pending requests can be approved
        if ($planRequest->status !== 'pending') {
            return redirect()->route('plan-requests.index')
                ->with('error', __('This plan request has already been :status.', ['status' => $planRequest->status]));
        }

        // Guard: plan must still exist
        $plan = Plan::find($planRequest->plan_id);
        if (! $plan) {
            return redirect()->route('plan-requests.index')
                ->with('error', __('The requested plan no longer exists.'));
        }

        // Guard: user must still exist
        $user = $planRequest->user;
        if (! $user) {
            return redirect()->route('plan-requests.index')
                ->with('error', __('The requesting user no longer exists.'));
        }

        // Determine billing cycle (fallback to monthly if null)
        $billingCycle = $planRequest->billing_cycle ?? 'monthly';

        DB::transaction(function () use ($planRequest, $plan, $user, $billingCycle) {
            $planRequest->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);

            assignPlanToUser($user, $plan, $billingCycle);

            $planOrderData = [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'billing_cycle' => $billingCycle,
                'payment_method' => 'Plan Request',
                'coupon_code' => null,
                'payment_id' => null,
                'status' => 'approved',
                'processed_at' => now(),
            ];

            createPlanOrder($planOrderData);
        });

        return redirect()->route('plan-requests.index')
            ->with('success', __('Plan request approved successfully!'));
    }

    public function reject(PlanRequest $planRequest)
    {
        $planRequest->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejected_by' => Auth::id(),
        ]);

        return redirect()->route('plan-requests.index')->with('success', __('Plan request rejected successfully!'));
    }
}
