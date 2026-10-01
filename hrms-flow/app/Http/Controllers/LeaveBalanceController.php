<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceSync;
use App\Models\LeavePolicy;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LeaveBalanceController extends Controller
{
    private function ensureYearBalances(int $year): void
    {
        $previousYear = $year - 1;
        $companyIds = getCompanyAndUsersId();
        $creatorId = creatorId();

        $leaveTypes = LeaveType::whereIn('created_by', $companyIds)
            ->where('status', 'active')
            ->get();

        $employees = User::emp()
            ->whereIn('created_by', $companyIds)
            ->where('type', 'employee')
            ->where('status', 'active')
            ->pluck('id');

        foreach ($employees as $employeeId) {
            foreach ($leaveTypes as $leaveType) {

                // Skip if balance already exists for this year
                $exists = LeaveBalance::where('employee_id', $employeeId)
                    ->where('leave_type_id', $leaveType->id)
                    ->where('year', $year)
                    ->exists();

                if ($exists) {
                    continue;
                }

                // Get active leave policy for this leave type
                $leavePolicy = LeavePolicy::where('leave_type_id', $leaveType->id)
                    ->whereIn('created_by', $companyIds)
                    ->where('status', 'active')
                    ->first();

                if (! $leavePolicy) {
                    continue;
                }

                // Calculate carry forward from previous year
                $carriedForward = 0;
                if ($leavePolicy->carry_forward_limit > 0) {
                    $prevBalance = LeaveBalance::where('employee_id', $employeeId)
                        ->where('leave_type_id', $leaveType->id)
                        ->where('year', $previousYear)
                        ->first();

                    if ($prevBalance) {
                        $carriedForward = min(
                            max(0, (float) $prevBalance->remaining_days),
                            (float) $leavePolicy->carry_forward_limit
                        );
                    }
                }

                $allocatedDays = (float) ($leaveType->max_days_per_year ?? 0);
                $remainingDays = $allocatedDays + $carriedForward;

                LeaveBalance::create([
                    'employee_id' => $employeeId,
                    'leave_type_id' => $leaveType->id,
                    'leave_policy_id' => $leavePolicy->id,
                    'year' => $year,
                    'allocated_days' => $allocatedDays,
                    'used_days' => 0,
                    'remaining_days' => $remainingDays,
                    'carried_forward' => $carriedForward,
                    'manual_adjustment' => 0,
                    'created_by' => $creatorId,
                ]);
            }
        }
    }

    public function index(Request $request)
    {
        if (! Auth::user()->can('manage-leave-balances')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $currentYear = isDemo() ? now()->year : (int) ($request->year ?? now()->year);
        $companyIds = getCompanyAndUsersId();

        // Get all active leave types for this company
        $leaveTypes = LeaveType::whereIn('created_by', $companyIds)
            ->where('status', 'active')
            ->get(['id', 'name', 'color', 'max_days_per_year']);

        // Build employee query based on permission
        $employeeQuery = User::whereIn('created_by', $companyIds)->where('type', 'employee')->where('status', 'active');

        if (Auth::user()->can('manage-own-leave-balances') && ! Auth::user()->can('manage-any-leave-balances')) {
            $employeeQuery->where('id', Auth::id());
        }

        // Search filter
        if ($request->filled('search')) {
            $employeeQuery->where('name', 'like', '%'.$request->search.'%');
        }

        // Employee filter
        if ($request->filled('employee_id') && $request->employee_id !== 'all') {
            $employeeQuery->where('id', $request->employee_id);
        }

        $perPage = (int) ($request->per_page ?? 9);
        $employees = $employeeQuery->select('id', 'name', 'avatar')->with('employee')->paginate($perPage);

        // Build employee balance cards
        $employeeBalances = $employees->getCollection()->map(function ($employee) use ($leaveTypes, $currentYear) {
            $rawAvatar = $employee->getRawOriginal('avatar');
            $avatar = check_file($rawAvatar) ? get_file($rawAvatar) : get_file('avatars/avatar.png');

            $balances = $leaveTypes->map(function ($leaveType) use ($employee, $currentYear) {
                $balance = LeaveBalance::where('employee_id', $employee->id)
                    ->where('leave_type_id', $leaveType->id)
                    ->where('year', $currentYear)
                    ->first();

                // No DB record for this year — skip this leave type
                if (! $balance) {
                    return null;
                }

                return [
                    'leave_balance_id' => $balance->id,
                    'leave_type_id' => $leaveType->id,
                    'leave_type_name' => $leaveType->name,
                    'leave_type_color' => $leaveType->color,
                    'total' => (float) $balance->allocated_days + (float) $balance->carried_forward + (float) $balance->manual_adjustment,
                    'used' => (float) $balance->used_days,
                    'available' => (float) $balance->remaining_days,
                    'carried_forward' => (float) $balance->carried_forward,
                    'manual_adjustment' => (float) $balance->manual_adjustment,
                    'adjustment_reason' => $balance->adjustment_reason,
                ];
            })->filter()->values();

            // Skip employee if no balances exist for this year
            if ($balances->isEmpty()) {
                return null;
            }

            return [
                'id' => $employee->id,
                'name' => $employee->name,
                'employee_id' => $employee->employee->employee_id ?? null,
                'avatar' => $avatar,
                'balances' => $balances,
            ];
        })->filter()->values();

        $employees->setCollection($employeeBalances);

        // Year options (current year ± 2)
        $systemYear = now()->year;
        $yearOptions = collect(range($systemYear - 2, $systemYear + 2))
            ->map(fn ($y) => ['value' => (string) $y, 'label' => (string) $y])
            ->values();

        return Inertia::render('hr/leave-balances/index', [
            'employeeBalances' => $employees,
            'leaveTypes' => $leaveTypes,
            'employees' => $this->getFilteredEmployees(),
            'yearOptions' => $yearOptions,
            'currentYear' => $currentYear,
            'systemYear' => $systemYear,
            'filters' => $request->only(['search', 'employee_id', 'year', 'per_page']),
            'lastSync' => LeaveBalanceSync::where('created_by', creatorId())
                ->where('year', $systemYear)
                ->latest('synced_at')
                ->first(['synced_at', 'synced_by']),
        ]);
    }

    public function sync(Request $request)
    {
        if (Auth::user()->can('sync-leave-balances')) {
            $year = now()->year;
            $authUserId = creatorId();
            $companyId = getCompanyId($authUserId);

            $this->ensureYearBalances($year);

            LeaveBalanceSync::create([
                'created_by' => $companyId,
                'year' => $year,
                'synced_at' => now(),
                'synced_by' => Auth::id(),
            ]);

            return back()->with('success', __('Leave balances synced successfully for :year.', ['year' => $year]));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function syncHistory(Request $request)
    {
        if (Auth::user()->can('manage-leave-balance-sync-history')) {
            $query = LeaveBalanceSync::with('syncedBy')
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-leave-balance-sync-history')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-leave-balance-sync-history')) {
                        $q->where('synced_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });

            // Handle year filter
            if ($request->has('year') && ! empty($request->year) && $request->year !== 'all') {
                $query->where('year', $request->year);
            }

            // Handle synced_by filter
            if ($request->has('synced_by') && ! empty($request->synced_by) && $request->synced_by !== 'all') {
                $query->where('synced_by', $request->synced_by);
            }

            $query->orderBy('id', 'desc');

            $syncHistory = $query->paginate($request->per_page ?? 10);

            $syncHistory->getCollection()->transform(function ($record) {
                $avatar = check_file($record->syncedBy?->avatar) ? get_file($record->syncedBy->avatar) : get_file('avatars/avatar.png');
                return [
                    'id' => $record->id,
                    'year' => $record->year,
                    'synced_at' => $record->synced_at,
                    'created_at' => $record->created_at,
                    'synced_by_user' => $record->syncedBy ? ['name' => $record->syncedBy->name, 'email' => $record->syncedBy->email, 'avatar' => $avatar] : null,
                ];
            });

            $systemYear = now()->year;
            $yearOptions = collect(range($systemYear - 2, $systemYear + 2))
                ->map(fn ($y) => ['value' => (string) $y, 'label' => (string) $y])
                ->values();

            return Inertia::render('hr/leave-balances/sync-history', [
                'syncHistory' => $syncHistory,
                'yearOptions' => $yearOptions,
                'filters' => $request->only(['year', 'synced_by', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    private function getFilteredEmployees()
    {
        // Get employees for filter dropdown (compatible with getFilteredEmployees logic)
        $employeeQuery = Employee::whereIn('created_by', getCompanyAndUsersId());

        if (Auth::user()->can('manage-own-leave-balances') && ! Auth::user()->can('manage-any-leave-balances')) {
            $employeeQuery->where(function ($q) {
                $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id());
            });
        }

        $employees = User::emp()
            ->with('employee')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->whereIn('id', $employeeQuery->pluck('user_id'))
            ->select('id', 'name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'employee_id' => $user->employee->employee_id ?? '',
                ];
            });

        return $employees;
    }

    public function adjust(Request $request, $leaveBalanceId)
    {
        if (! Auth::user()->can('adjust-leave-balances')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $validated = $request->validate([
            'manual_adjustment' => 'required|numeric',
            'adjustment_reason' => 'required|string|max:500',
        ]);

        $leaveBalance = LeaveBalance::where('id', $leaveBalanceId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (! $leaveBalance) {
            return redirect()->back()->with('error', __('Leave balance not found.'));
        }

        try {
            $leaveBalance->update([
                'manual_adjustment' => $validated['manual_adjustment'],
                'adjustment_reason' => $validated['adjustment_reason'],
            ]);

            // Recalculate remaining days
            $leaveBalance->calculateRemainingDays();
            $leaveBalance->save();

            return redirect()->back()->with('success', __('Leave balance adjusted successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to adjust leave balance.'));
        }
    }

    /**
     * Delete a leave balance record.
     */
    public function destroy($leaveBalanceId)
    {
        if (! Auth::user()->can('delete-leave-balances')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $leaveBalance = LeaveBalance::where('id', $leaveBalanceId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (! $leaveBalance) {
            return redirect()->back()->with('error', __('Leave balance not found.'));
        }

        try {
            $leaveBalance->delete();

            return redirect()->back()->with('success', __('Leave balance deleted successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete leave balance.'));
        }
    }
}
