<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveBalance;
use App\Models\LeavePolicy;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LeaveApplicationController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-leave-applications')) {
            $query = LeaveApplication::with(['employee', 'leaveType', 'leavePolicy', 'approver', 'creator'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-leave-applications')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-leave-applications')) {
                        $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id())->orWhere('approved_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })
                ->whereIn('status', ['pending', 'rejected']);

            // Handle search
            if ($request->has('search') && ! empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('reason', 'like', '%'.$request->search.'%')
                        ->orWhereHas('employee', function ($subQ) use ($request) {
                            $subQ->where('name', 'like', '%'.$request->search.'%');
                        })
                        ->orWhereHas('leaveType', function ($subQ) use ($request) {
                            $subQ->where('name', 'like', '%'.$request->search.'%');
                        });
                });
            }

            // Handle employee filter (list)
            if ($request->has('list_employee_id') && ! empty($request->list_employee_id) && $request->list_employee_id !== 'all') {
                $query->where('employee_id', $request->list_employee_id);
            }

            // Handle leave type filter
            if ($request->has('leave_type_id') && ! empty($request->leave_type_id) && $request->leave_type_id !== 'all') {
                $query->where('leave_type_id', $request->leave_type_id);
            }

            // Handle status filter — default to pending
            $statusFilter = $request->status ?? 'pending';
            if ($statusFilter !== 'all') {
                $query->where('status', $statusFilter);
            }

            // Handle sorting
            if ($request->has('sort_field') && ! empty($request->sort_field)) {
                $sortField = $request->sort_field;
                $sortDirection = $request->sort_direction ?? 'asc';

                if (in_array($sortField, ['start_date', 'end_date', 'created_at'])) {
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('id', 'desc');
                }
            } else {
                $query->orderBy('id', 'desc');
            }

            $leaveApplications = $query->paginate($request->per_page ?? 10);

            $leaveApplications->getCollection()->transform(function ($application) {
                if ($application->employee) {
                    $rawAvatar = $application->employee->getRawOriginal('avatar');
                    $application->employee->avatar = check_file($rawAvatar)
                        ? get_file($rawAvatar)
                        : get_file('avatars/avatar.png');
                }
                return $application;
            });

            // Get employees for filter dropdown
            $employees = User::where('type', 'employee')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->get(['id', 'name']);

            // Get leave types for filter dropdown
            $leaveTypes = LeaveType::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'color']);

            // ---------------------------------------------------------------
            // Calendar data — week view
            // ---------------------------------------------------------------
            $weekStart = $request->filled('week_start')
                ? Carbon::parse($request->week_start)->startOfDay()
                : Carbon::now()->startOfWeek(Carbon::MONDAY);
            $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);

            $weekDays = [];
            for ($i = 0; $i < 7; $i++) {
                $day = $weekStart->copy()->addDays($i);
                $weekDays[] = [
                    'date'     => $day->format('Y-m-d'),
                    'day'      => $day->format('d'),
                    'day_name' => $day->format('D'),
                    'is_today' => $day->isToday(),
                ];
            }

            $employeeQuery = User::whereIn('created_by', getCompanyAndUsersId())
                ->where('type', 'employee')
                ->whereIn('status', ['active','probation'])
                ->whereHas('employee', function ($q) {
                    $q->where('employee_status', 'active');
                })
                ->with(['employee.designation']);
            if (Auth::user()->can('manage-own-leave-applications') && ! Auth::user()->can('manage-any-leave-applications')) {
                $employeeQuery->where('id', Auth::id());                
            }

            if ($request->filled('calendar_employee_id') && $request->calendar_employee_id !== 'all') {
                $employeeQuery->where('id', $request->calendar_employee_id);
            }

            $calendarEmployees = $employeeQuery->select('id', 'name', 'avatar')->with(['employee.designation'])->get();

            $weekLeaves = LeaveApplication::with(['leaveType'])
                ->whereIn('employee_id', $calendarEmployees->pluck('id'))
                ->where('start_date', '<=', $weekEnd->format('Y-m-d'))
                ->where('end_date', '>=', $weekStart->format('Y-m-d'))
                ->where('status', 'approved')
                ->get();

            $employeeRows = $calendarEmployees->map(function ($employee) use ($weekLeaves, $weekDays) {
                $rawAvatar = $employee->getRawOriginal('avatar');
                $avatar    = check_file($rawAvatar) ? get_file($rawAvatar) : get_file('avatars/avatar.png');

                $days = [];
                foreach ($weekDays as $day) {
                    $date  = $day['date'];
                    $leave = $weekLeaves->first(function ($app) use ($employee, $date) {
                        return $app->employee_id === $employee->id
                            && $app->start_date->toDateString() <= $date
                            && $app->end_date->toDateString() >= $date;
                    });
                    $days[] = $leave ? [
                        'has_leave'        => true,
                        'leave_type_name'  => $leave->leaveType?->name,
                        'leave_type_color' => $leave->leaveType?->color ?? '#6b7280',
                        'is_paid'          => (bool) ($leave->leaveType?->is_paid ?? false),
                        'status'           => $leave->status,
                        'reason'           => $leave->reason,
                        'leave_id'         => $leave->id,
                        'employee_id'      => $leave->employee_id,
                        'start_date'       => $leave->start_date->format('Y-m-d'),
                        'end_date'         => $leave->end_date->format('Y-m-d'),
                        'total_days'       => $leave->total_days,
                    ] : ['has_leave' => false];
                }

                return [
                    'id'          => $employee->id,
                    'name'        => $employee->name,
                    'designation' => $employee->employee?->designation?->name ?? null,
                    'avatar'      => $avatar,
                    'days'        => $days,
                ];
            });

            return Inertia::render('hr/leave-applications/index', [
                'leaveApplications' => $leaveApplications,
                'employees'         => $this->getFilteredEmployees(),
                'leaveTypes'        => $leaveTypes,
                'filters'           => array_merge($request->all(['search', 'list_employee_id', 'leave_type_id', 'sort_field', 'sort_direction', 'per_page', 'week_start', 'calendar_employee_id']), ['status' => $statusFilter]),
                'employeeRows'      => $employeeRows,
                'weekDays'          => $weekDays,
                'weekStart'         => $weekStart->format('Y-m-d'),
                'monthLabel'        => $weekStart->copy()->addDays(3)->format('F Y'),
                'currentMonthNum'   => (int) $weekStart->copy()->addDays(3)->format('n'),
                'currentYearNum'    => (int) $weekStart->copy()->addDays(3)->format('Y'),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    private function getFilteredEmployees()
    {
        // Get employees for filter dropdown (compatible with getFilteredEmployees logic)
        $employeeQuery = Employee::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('employee_status', ['active','probation']);

        if (Auth::user()->can('manage-own-leave-applications') && ! Auth::user()->can('manage-any-leave-applications')) {
            $employeeQuery->where(function ($q) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string',
            'attachment' => 'nullable|string',
        ]);

        $validated['created_by'] = creatorId();

        // Get working days from company settings
        $globalSettings     = settings();
        $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[1,2,3,4,5]', true);


        // Calculate total working days (excluding non-working days)
        $startDate = Carbon::parse($validated['start_date']);
        $endDate   = Carbon::parse($validated['end_date']);
        $totalDays = 0;
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            if (in_array($date->dayOfWeek, $workingDaysIndices)) {
                $totalDays++;
            }
        }
        $validated['total_days'] = $totalDays;

        // Get leave policy for this leave type
        $leavePolicy = LeavePolicy::where('leave_type_id', $validated['leave_type_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->first();

        if (! $leavePolicy) {
            return redirect()->back()->with('error', __('No active policy found for selected leave type.'));
        }

        $validated['leave_policy_id'] = $leavePolicy->id;

        // Validate days per application
        if (
            $validated['total_days'] < $leavePolicy->min_days_per_application ||
            $validated['total_days'] > $leavePolicy->max_days_per_application
        ) {
            return redirect()->back()->with(
                'error',
                __('Leave days must be between :min and :max days as per the leave policy.', [
                    'min' => $leavePolicy->min_days_per_application,
                    'max' => $leavePolicy->max_days_per_application,
                ])
            );
        }

        // Check if employee has enough leave balance
        $currentYear = now()->year;
        $leaveBalance = LeaveBalance::where('employee_id', $validated['employee_id'])
            ->where('leave_type_id', $validated['leave_type_id'])
            ->where('year', $currentYear)
            ->first();

        if (! $leaveBalance) {
            // Create initial balance if doesn't exist
            $leaveBalance = LeaveBalance::create([
                'employee_id' => $validated['employee_id'],
                'leave_type_id' => $validated['leave_type_id'],
                'leave_policy_id' => $leavePolicy->id,
                'year' => $currentYear,
                'allocated_days' => $leavePolicy->max_days_per_year ?? 10,
                'used_days' => 0,
                'remaining_days' => $leavePolicy->max_days_per_year ?? 10,
                'created_by' => creatorId(),
            ]);
        }

        // Check if enough balance available
        if ($leaveBalance->remaining_days < $validated['total_days']) {
            return redirect()->back()->with(
                'error',
                __('Insufficient leave balance. Available: :available days, Requested: :requested days', [
                    'available' => $leaveBalance->remaining_days,
                    'requested' => $validated['total_days'],
                ])
            );
        }

        // Handle attachment from media library
        if ($request->has('attachment')) {
            $validated['attachment'] = $request->attachment;
        }

        // Set status based on policy
        $validated['status'] = $leavePolicy->requires_approval ? 'pending' : 'approved';

        $leaveApplication = LeaveApplication::create($validated);

        // Create attendance records if auto-approved
        if ($validated['status'] === 'approved') {
            $leaveApplication->createAttendanceRecords();
        }

        return redirect()->back()->with('success', __('Leave application created successfully.'));
    }

    public function update(Request $request, $leaveApplicationId)
    {
        $leaveApplication = LeaveApplication::where('id', $leaveApplicationId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($leaveApplication) {
            try {
                $validated = $request->validate([
                    'employee_id' => 'required|exists:users,id',
                    'leave_type_id' => 'required|exists:leave_types,id',
                    'start_date' => 'required|date',
                    'end_date' => 'required|date|after_or_equal:start_date',
                    'reason' => 'required|string',
                    'attachment' => 'nullable|string',
                ]);

                // Get working days from company settings
                $globalSettings     = settings();
                $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[1,2,3,4,5]', true);

                // Calculate total working days (excluding non-working days)
                $startDate = Carbon::parse($validated['start_date']);
                $endDate   = Carbon::parse($validated['end_date']);
                $totalDays = 0;
                for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                    if (in_array($date->dayOfWeek, $workingDaysIndices)) {
                        $totalDays++;
                    }
                }
                $validated['total_days'] = $totalDays;

                // Get leave policy
                $leavePolicy = LeavePolicy::where('leave_type_id', $validated['leave_type_id'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('status', 'active')
                    ->first();

                if (! $leavePolicy) {
                    return redirect()->back()->with('error', __('No active policy found for selected leave type.'));
                }

                $validated['leave_policy_id'] = $leavePolicy->id;

                // Handle attachment from media library
                if ($request->has('attachment')) {
                    $validated['attachment'] = $request->attachment;
                }

                $leaveApplication->update($validated);

                return redirect()->back()->with('success', __('Leave application updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update leave application'));
            }
        } else {
            return redirect()->back()->with('error', __('Leave application Not Found.'));
        }
    }

    public function destroy($leaveApplicationId)
    {
        $leaveApplication = LeaveApplication::where('id', $leaveApplicationId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($leaveApplication) {
            try {
                $leaveApplication->delete();

                return redirect()->back()->with('success', __('Leave application deleted successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete leave application'));
            }
        } else {
            return redirect()->back()->with('error', __('Leave application Not Found.'));
        }
    }

    public function updateStatus(Request $request, $leaveApplicationId)
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'manager_comments' => 'nullable|string',
        ]);

        $leaveApplication = LeaveApplication::where('id', $leaveApplicationId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($leaveApplication) {
            try {
                $leaveApplication->update([
                    'status' => $validated['status'],
                    'manager_comments' => $validated['manager_comments'],
                    'approved_by' => Auth::id(),
                    'approved_at' => now(),
                ]);

                // Create attendance records if approved
                if ($validated['status'] === 'approved') {
                    // Double-check balance before final approval
                    $currentYear = now()->year;
                    $leaveBalance = LeaveBalance::where('employee_id', $leaveApplication->employee_id)
                        ->where('leave_type_id', $leaveApplication->leave_type_id)
                        ->where('year', $currentYear)
                        ->first();

                    if ($leaveBalance && $leaveBalance->remaining_days < $leaveApplication->total_days) {
                        return redirect()->back()->with(
                            'error',
                            __('Cannot approve: Insufficient leave balance. Available: :available days, Required: :required days', [
                                'available' => $leaveBalance->remaining_days,
                                'required' => $leaveApplication->total_days,
                            ])
                        );
                    }

                    $leaveApplication->createAttendanceRecords();
                }

                return redirect()->back()->with('success', __('Leave application status updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update leave application status'));
            }
        } else {
            return redirect()->back()->with('error', __('Leave application Not Found.'));
        }
    }

    public function calendar(Request $request)
    {
        if (Auth::user()->can('manage-leave-applications')) {

            // Determine week start (Monday) — default to current week
            $weekStart = $request->filled('week_start')
                ? Carbon::parse($request->week_start)->startOfDay()
                : Carbon::now()->startOfWeek(Carbon::MONDAY);

            $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);

            // Build 7 day headers for the week
            $weekDays = [];
            for ($i = 0; $i < 7; $i++) {
                $day = $weekStart->copy()->addDays($i);
                $weekDays[] = [
                    'date'     => $day->format('Y-m-d'),
                    'day'     => $day->format('d'),
                    'day_name' => $day->format('D'),
                    'is_today' => $day->isToday(),
                ];
            }

            // Get all active employees
            $employeeQuery = User::whereIn('created_by', getCompanyAndUsersId())
                ->where('type', 'employee')
                ->where('status', 'active')
                ->with('employee');

            if (Auth::user()->can('manage-own-leave-applications') && ! Auth::user()->can('manage-any-leave-applications')) {
                $employeeQuery->where('id', Auth::id());
            }

            // Employee filter
            if ($request->filled('employee_id') && $request->employee_id !== 'all') {
                $employeeQuery->where('id', $request->employee_id);
            }

            $employees = $employeeQuery->select('id', 'name', 'avatar')->get();

            // Fetch leave applications overlapping this week
            $leaveApplications = LeaveApplication::with(['leaveType'])
                ->whereIn('employee_id', $employees->pluck('id'))
                ->where('start_date', '<=', $weekEnd->format('Y-m-d'))
                ->where('end_date', '>=', $weekStart->format('Y-m-d'))
                ->whereIn('status', ['approved', 'pending'])
                ->get();

            // Build employee rows with leave data per day
            $employeeRows = $employees->map(function ($employee) use ($leaveApplications, $weekDays) {
                $rawAvatar = $employee->getRawOriginal('avatar');
                $avatar    = check_file($rawAvatar) ? get_file($rawAvatar) : get_file('avatars/avatar.png');

                $days = [];
                foreach ($weekDays as $day) {
                    $date = $day['date'];

                    // Find leave for this employee on this date
                    $leave = $leaveApplications->first(function ($app) use ($employee, $date) {
                        return $app->employee_id === $employee->id
                            && $app->start_date->toDateString() <= $date
                            && $app->end_date->toDateString() >= $date;
                    });

                    $days[] = $leave ? [
                        'has_leave'       => true,
                        'leave_type_name' => $leave->leaveType?->name,
                        'leave_type_color'=> $leave->leaveType?->color ?? '#6b7280',
                        'status'          => $leave->status,
                        'reason'          => $leave->reason,
                        'leave_id'        => $leave->id,
                    ] : ['has_leave' => false];
                }

                return [
                    'id'          => $employee->id,
                    'name'        => $employee->name,
                    'designation' => $employee->employee?->designation?->name ?? null,
                    'avatar'      => $avatar,
                    'days'        => $days,
                ];
            });

            return Inertia::render('hr/leave-applications/calendar', [
                'employeeRows'  => $employeeRows,
                'weekDays'      => $weekDays,
                'weekStart'     => $weekStart->format('Y-m-d'),
                'weekEnd'       => $weekEnd->format('Y-m-d'),
                'monthLabel'    => $weekStart->format('F Y'),
                'employees'     => $this->getFilteredEmployees(),
                'filters'       => $request->only(['week_start', 'employee_id']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function export()
    {
        if (Auth::user()->can('export-leave-applications')) {
            try {
                $leaveApplications = LeaveApplication::with(['employee', 'leaveType', 'approver'])
                    ->where(function ($q) {
                        if (Auth::user()->can('manage-any-leave-applications')) {
                            $q->whereIn('created_by', getCompanyAndUsersId());
                        } elseif (Auth::user()->can('manage-own-leave-applications')) {
                            $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id())->orWhere('approved_by', Auth::id());
                        } else {
                            $q->whereRaw('1 = 0');
                        }
                    })->get();

                $fileName = 'leave_applications_'.date('Y-m-d_His').'.csv';
                $headers = [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
                ];

                $callback = function () use ($leaveApplications) {
                    $file = fopen('php://output', 'w');
                    fputcsv($file, [
                        'Employee',
                        'Leave Type',
                        'Start Date',
                        'End Date',
                        'Total Days',
                        'Reason',
                        'Status',
                        'Approved By',
                        'Approved At',
                        'Manager Comments',
                        'Applied On',
                    ]);

                    foreach ($leaveApplications as $application) {
                        fputcsv($file, [
                            $application->employee->name ?? '',
                            $application->leaveType->name ?? '',
                            $application->start_date ? date('Y-m-d', strtotime($application->start_date)) : '',
                            $application->end_date ? date('Y-m-d', strtotime($application->end_date)) : '',
                            $application->total_days ?? '',
                            $application->reason ?? '',
                            $application->status ?? '',
                            $application->approver->name ?? '',
                            $application->approved_at ?? '',
                            $application->manager_comments ?? '',
                            $application->created_at ?? '',
                        ]);
                    }
                    fclose($file);
                };

                return response()->stream($callback, 200, $headers);
            } catch (\Exception $e) {
                return response()->json(['message' => __('Failed to export leave applications: :message', ['message' => $e->getMessage()])], 500);
            }
        } else {
            return response()->json(['message' => __('Permission Denied.')], 403);
        }
    }
}
