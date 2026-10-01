<?php

namespace App\Http\Controllers;

use App\Models\AttendancePolicy;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\IpRestriction;
use App\Models\LeaveApplication;
use App\Models\Shift;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class AttendanceRecordController extends Controller
{
    // public function index(Request $request)
    // {
    //     if (Auth::user()->can('manage-attendance-records')) {
    //         $query = AttendanceRecord::with(['employee', 'shift', 'attendancePolicy', 'creator'])
    //             ->where(function ($q) {
    //                 if (Auth::user()->can('manage-any-attendance-records')) {
    //                     $q->whereIn('created_by', getCompanyAndUsersId());
    //                 } elseif (Auth::user()->can('manage-own-attendance-records')) {
    //                     $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id());
    //                 } else {
    //                     $q->whereRaw('1 = 0');
    //                 }
    //             });

    //         // Handle search
    //         if ($request->has('search') && ! empty($request->search)) {
    //             $query->where(function ($q) use ($request) {
    //                 $q->whereHas('employee', function ($subQ) use ($request) {
    //                     $subQ->where('name', 'like', '%'.$request->search.'%');
    //                 });
    //             });
    //         }

    //         // Handle employee filter
    //         if ($request->has('employee_id') && ! empty($request->employee_id) && $request->employee_id !== 'all') {
    //             $query->where('employee_id', $request->employee_id);
    //         }

    //         // Handle status filter
    //         if ($request->has('status') && ! empty($request->status) && $request->status !== 'all') {
    //             $query->where('status', $request->status);
    //         }

    //         // Handle date range filter
    //         if ($request->has('date_from') && ! empty($request->date_from)) {
    //             $query->where('date', '>=', $request->date_from);
    //         }
    //         if ($request->has('date_to') && ! empty($request->date_to)) {
    //             $query->where('date', '<=', $request->date_to);
    //         }

    //         // Handle sorting
    //         if ($request->has('sort_field') && ! empty($request->sort_field)) {
    //             $sortField = $request->sort_field;
    //             $sortDirection = $request->sort_direction ?? 'asc';

    //             if ($sortField === 'date') {
    //                 $query->orderBy('date', $sortDirection);
    //             } else {
    //                 $query->orderBy('id', 'desc');
    //             }
    //         } else {
    //             $query->orderBy('id', 'desc');
    //         }

    //         $attendanceRecords = $query->paginate($request->per_page ?? 9);

    //         // Load avatar dynamically — same pattern as AwardController
    //         $attendanceRecords->getCollection()->transform(function ($record) {
    //             if ($record->employee) {
    //                 $rawAvatar = $record->employee->getRawOriginal('avatar');
    //                 $record->employee->avatar = check_file($rawAvatar)
    //                     ? get_file($rawAvatar)
    //                     : get_file('avatars/avatar.png');
    //             }

    //             // Add leave type information for on_leave records
    //             if ($record->status === 'on_leave') {
    //                 $leaveApplication = LeaveApplication::where('employee_id', $record->employee_id)
    //                     ->whereDate('start_date', '<=', $record->date)
    //                     ->whereDate('end_date', '>=', $record->date)
    //                     ->where('status', 'approved')
    //                     ->with('leaveType')
    //                     ->first();

    //                 $record->leave_type = $leaveApplication?->leaveType;
    //             }

    //             return $record;
    //         });

    //         // Get employees for filter dropdown
    //         $employees = User::where('type', 'employee')
    //             ->whereIn('created_by', getCompanyAndUsersId())
    //             ->get(['id', 'name']);

    //         $companyUserIds = getCompanyAndUsersId();

    //         if (isDemo()) {
    //             $statsRecords = AttendanceRecord::whereIn('created_by', $companyUserIds)->get();

    //             $todayStats = [
    //                 'present'       => $statsRecords->where('status', 'present')->count(),
    //                 'on_leave'      => LeaveApplication::whereIn('employee_id', function ($q) use ($companyUserIds) {
    //                                         $q->select('user_id')->from('employees')->whereIn('created_by', $companyUserIds);
    //                                     })->where('status', 'approved')->count(),
    //                 'late_arrivals' => $statsRecords->where('is_late', true)->count(),
    //                 'overtime'      => $statsRecords->where('overtime_hours', '>', 0)->count(),
    //             ];
    //         } else {
    //             $today = Carbon::today();

    //             $todayRecords = AttendanceRecord::whereIn('created_by', $companyUserIds)
    //                 ->whereDate('date', $today)
    //                 ->get();

    //             $todayStats = [
    //                 'present'       => $todayRecords->where('status', 'present')->count(),
    //                 'on_leave'      => LeaveApplication::whereIn('employee_id', function ($q) use ($companyUserIds) {
    //                                         $q->select('user_id')->from('employees')->whereIn('created_by', $companyUserIds);
    //                                     })->where('status', 'approved')->whereDate('start_date', '<=', $today)->whereDate('end_date', '>=', $today)->count(),
    //                 'late_arrivals' => $todayRecords->where('is_late', true)->count(),
    //                 'overtime'      => $todayRecords->where('overtime_hours', '>', 0)->count(),
    //             ];
    //         }

    //         return Inertia::render('hr/attendance-records/index', [
    //             'attendanceRecords' => $attendanceRecords,
    //             'employees' => $this->getFilteredEmployees(),
    //             'hasSampleFile' => file_exists(storage_path('uploads/sample/sample-attendance-record.xlsx')),
    //             'filters' => $request->all(['search', 'employee_id', 'status', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page']),
    //             'todayStats' => $todayStats,
    //         ]);
    //     } else {
    //         return redirect()->back()->with('error', __('Permission Denied.'));
    //     }
    // }

    public function monthlyView(Request $request)
    {
        if (Auth::user()->can('manage-attendance-records')) {
            $month = (int) ($request->month ?? now()->month);
            $year = (int) ($request->year ?? now()->year);
            $companyIds = getCompanyAndUsersId();

            $daysInMonth = Carbon::createFromDate($year, $month, 1)->daysInMonth;
            $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
            $endDate = Carbon::createFromDate($year, $month, 1)->endOfMonth();
            $today = Carbon::today();

            // Build employee query
            $employeeQuery = User::whereIn('created_by', $companyIds)
                ->where('type', 'employee')
                ->where('status', 'active')
                ->with('employee');

            if (Auth::user()->can('manage-own-attendance-records') && ! Auth::user()->can('manage-any-attendance-records')) {
                $employeeQuery->where('id', Auth::id());
            }

            // Employee filter
            if ($request->filled('employee_id') && $request->employee_id !== 'all') {
                $employeeQuery->where('id', $request->employee_id);
            }

            $perPage = (int) ($request->per_page ?? 10);
            $employees = $employeeQuery->select('id', 'name', 'avatar')->with(['employee.designation', 'employee.shift'])->paginate($perPage);
            $employeeCollection = $employees->getCollection();

            // Fetch all attendance records for this month in one query
            $allEmployeeIds = (clone $employeeQuery)->pluck('id');
            $records = AttendanceRecord::whereIn('employee_id', $allEmployeeIds)
                ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
                ->whereIn('created_by', $companyIds)
                ->get()
                ->groupBy(function ($r) {
                    return $r->employee_id.'_'.Carbon::parse($r->date)->day;
                });

            // Fetch approved leaves for this month
            $leaves = LeaveApplication::whereIn('employee_id', $allEmployeeIds)
                ->where('status', 'approved')
                ->where('start_date', '<=', $endDate->toDateString())
                ->where('end_date', '>=', $startDate->toDateString())
                ->with('leaveType')
                ->get();

            // Global settings for working days
            $globalSettings = settings();
            $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[]', true);

            // Build day headers
            $dayHeaders = [];
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $date = Carbon::createFromDate($year, $month, $d);
                $dayHeaders[] = [
                    'day' => $d,
                    'day_name' => $date->format('D'),
                    'is_weekend' => ! in_array($date->dayOfWeek, $workingDaysIndices),
                    'is_future' => $date->startOfDay()->gt($today->startOfDay()),
                ];
            }

            // Build employee rows
            $employeeRows = $employeeCollection->map(function ($employee) use ($records, $leaves, $dayHeaders, $year, $month) {
                $rawAvatar = $employee->getRawOriginal('avatar');
                $avatar = check_file($rawAvatar) ? get_file($rawAvatar) : get_file('avatars/avatar.png');

                $days = [];
                $presentDays = 0;
                $totalWorkingDays = 0;

                // Count ALL working days in the full month based on settings working days
                foreach ($dayHeaders as $header) {
                    if (! $header['is_weekend']) {
                        $totalWorkingDays++;
                    }
                }

                foreach ($dayHeaders as $header) {
                    $d = $header['day'];
                    $date = Carbon::createFromDate($year, $month, $d);
                    $key = $employee->id.'_'.$d;

                    // 1st — Check attendance record (past, today AND future)
                    if (isset($records[$key])) {
                        $record = $records[$key]->first();
                        if ($record->status === 'present') {
                            $presentDays++;
                        }
                        if ($record->status === 'half_day') {
                            $presentDays += 0.5;
                        }
                        if ($record->status === 'holiday') {
                            $presentDays++;
                        }

                        // For on_leave records, enrich with leave type info
                        $leaveTypeName = null;
                        $isPaidLeave   = false;
                        if ($record->status === 'on_leave') {
                            $dateStr = $date->toDateString();
                            $matchedLeave = $leaves->first(function ($leave) use ($employee, $dateStr) {
                                return $leave->employee_id === $employee->id
                                    && $leave->start_date->toDateString() <= $dateStr
                                    && $leave->end_date->toDateString() >= $dateStr;
                            });
                            if ($matchedLeave) {
                                $leaveTypeName = $matchedLeave->leaveType?->name;
                                $isPaidLeave   = (bool) ($matchedLeave->leaveType?->is_paid ?? false);
                                if ($isPaidLeave) {
                                    $presentDays++;
                                }
                            }
                        }

                        $days[] = [
                            'id' => $record->id,
                            'date' => $record->date->format('Y-m-d'),
                            'employee_id' => $record->employee_id,
                            'status' => $record->status,
                            'is_late' => (bool) $record->is_late,
                            'is_early_departure' => (bool) $record->is_early_departure,
                            'overtime_hours' => (float) ($record->overtime_hours ?? 0),
                            'overtime_amount' => (float) ($record->overtime_amount ?? 0),
                            'is_weekend' => false,
                            'clock_in' => $record->clock_in,
                            'clock_out' => $record->clock_out,
                            'total_hours' => $record->total_hours,
                            'notes' => $record->notes,
                            'is_holiday' => (bool) $record->is_holiday,
                            'leave_type_name' => $leaveTypeName,
                            'is_paid_leave'   => $isPaidLeave,
                        ];

                        continue;
                    }

                    // 2nd — Check approved leave (any date)
                    $onLeave = $leaves->first(function ($leave) use ($employee, $date) {
                        return $leave->employee_id === $employee->id
                            && Carbon::parse($leave->start_date)->lte($date)
                            && Carbon::parse($leave->end_date)->gte($date);
                    });

                    if ($onLeave) {
                        $days[] = [
                            'status' => 'on_leave',
                            'is_late' => false,
                            'is_early_departure' => false,
                            'overtime_hours' => 0,
                            'is_weekend' => false,
                            'leave_type_name' => $onLeave->leaveType?->name,
                        ];

                        continue;
                    }

                    // 3rd — Weekend / non-working day with no record
                    if ($header['is_weekend']) {
                        $days[] = ['status' => 'day_off',  'is_late' => false, 'is_early_departure' => false, 'overtime_hours' => 0, 'is_weekend' => true];

                        continue;
                    }

                    // 4th — Future date with no record
                    if ($header['is_future']) {
                        $days[] = ['status' => 'future',   'is_late' => false, 'is_early_departure' => false, 'overtime_hours' => 0, 'is_weekend' => false];

                        continue;
                    }

                    // 5th — Today with no record
                    if ($date->isToday()) {
                        $days[] = ['status' => 'not_added', 'is_late' => false, 'is_early_departure' => false, 'overtime_hours' => 0, 'is_weekend' => false];

                        continue;
                    }

                    // 6th — Past working day with no record = absent
                    $days[] = ['status' => 'absent', 'is_late' => false, 'is_early_departure' => false, 'overtime_hours' => 0, 'is_weekend' => false];
                }

                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'designation' => $employee->employee?->designation?->name ?? null,
                    'shift' => $employee->employee?->shift?->name ?? null,
                    'avatar' => $avatar,
                    'days' => $days,
                    'present_days' => $presentDays,
                    'total_working_days' => $totalWorkingDays,
                ];
            });

            // Month and year options
            $monthOptions = collect(range(1, 12))->map(fn ($m) => [
                'value' => (string) $m,
                'label' => Carbon::createFromDate(null, $m, 1)->format('F'),
            ]);

            $systemYear = now()->year;
            $yearOptions = collect(range($systemYear - 2, $systemYear + 1))->map(fn ($y) => [
                'value' => (string) $y,
                'label' => (string) $y,
            ]);

            $employees->setCollection($employeeRows);

            return Inertia::render('hr/attendance-records/monthly', [
                'employeeRows' => $employees,
                'dayHeaders' => $dayHeaders,
                'employees' => $this->getFilteredEmployees(),
                'monthOptions' => $monthOptions,
                'yearOptions' => $yearOptions,
                'currentMonth' => $month,
                'currentYear' => $year,
                'daysInMonth' => $daysInMonth,
                'hasSampleFile' => file_exists(storage_path('uploads/sample/sample-attendance-record.xlsx')),
                'filters' => $request->only(['employee_id', 'month', 'year', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    private function getFilteredEmployees()
    {
        // Get employees for filter dropdown (compatible with getFilteredEmployees logic)
        $employeeQuery = Employee::whereIn('created_by', getCompanyAndUsersId());

        if (Auth::user()->can('manage-own-attendance-records') && ! Auth::user()->can('manage-any-attendance-records')) {
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
            'date' => 'required|date',
            'clock_in' => 'nullable|date_format:H:i',
            'clock_out' => 'nullable|date_format:H:i',
            'is_holiday' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        // Get employee with shift and policy
        $employee = Employee::where('user_id', $validated['employee_id'])->first();

        // Get working days from settings
        $globalSettings = settings();
        $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[]', true);

        if (empty($workingDaysIndices)) {
            return redirect()->back()->with('error', __('Please configure working days first.'));
        }

        $dateIndex = Carbon::parse($validated['date'])->dayOfWeek;
        if (! in_array($dateIndex, $workingDaysIndices)) {
            return redirect()->back()->with('error', __('Cannot create attendance record for non-working day.'));
        }

        // Check if employee has approved leave for this date
        $hasApprovedLeave = LeaveApplication::where('employee_id', $validated['employee_id'])
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $validated['date'])
            ->whereDate('end_date', '>=', $validated['date'])
            ->exists();

        if ($hasApprovedLeave) {
            return redirect()->back()->with('error', __('Employee has approved leave for this date. Cannot create attendance record.'));
        }

        // Check if record already exists
        $exists = AttendanceRecord::where('employee_id', $validated['employee_id'])
            ->where('date', $validated['date'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', __('Attendance record already exists for this employee and date.'));
        }

        // Use employee's assigned shift and policy, or get defaults
        $shift = $employee && $employee->shift_id ?
            Shift::find($employee->shift_id) :
            Shift::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

        $policy = $employee && $employee->attendance_policy_id ?
            AttendancePolicy::find($employee->attendance_policy_id) :
            AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

        $validated['shift_id'] = $shift?->id;
        $validated['attendance_policy_id'] = $policy?->id;
        $validated['created_by'] = creatorId();
        $validated['is_holiday'] = $validated['is_holiday'] ?? false;
        $validated['break_hours'] = $validated['break_hours'] ?? 0;

        // Set weekend flag
        $validated['is_weekend'] = Carbon::parse($validated['date'])->isWeekend();

        $record = AttendanceRecord::create($validated);

        // Process complete attendance calculation
        $record->fresh(); // Reload to get relationships
        $record->processAttendance();

        return redirect()->back()->with('success', __('Attendance record created successfully.'));
    }

    public function update(Request $request, $attendanceRecordId)
    {
        $attendanceRecord = AttendanceRecord::where('id', $attendanceRecordId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        // Get working days from settings
        $globalSettings = settings();
        $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[]', true);

        if (empty($workingDaysIndices)) {
            return redirect()->back()->with('error', __('Please configure working days first.'));
        }

        $dateIndex = Carbon::parse($request->date)->dayOfWeek;
        if (! in_array($dateIndex, $workingDaysIndices)) {
            return redirect()->back()->with('error', __('Cannot create attendance record for non-working day.'));
        }

        // Check if employee has approved leave for this date
        $hasApprovedLeave = LeaveApplication::where('employee_id', $request->employee_id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $request->date)
            ->whereDate('end_date', '>=', $request->date)
            ->exists();

        if ($hasApprovedLeave) {
            return redirect()->back()->with('error', __('Employee has approved leave for this date. Cannot create attendance record.'));
        }

        if ($attendanceRecord) {
            try {
                $validated = $request->validate([
                    'employee_id' => 'required|exists:users,id',
                    'date' => 'required|date',
                    'clock_in' => 'nullable|date_format:H:i',
                    'clock_out' => 'nullable|date_format:H:i',
                    'break_hours' => 'nullable|numeric|min:0',
                    'is_holiday' => 'boolean',
                    'status' => 'required|in:present,absent,half_day,on_leave,holiday',
                    'notes' => 'nullable|string',
                ]);

                // Check if employee or date changed and if duplicate exists
                if ($attendanceRecord->employee_id != $validated['employee_id'] || $attendanceRecord->date != $validated['date']) {
                    $exists = AttendanceRecord::where('employee_id', $validated['employee_id'])
                        ->where('date', $validated['date'])
                        ->where('id', '!=', $attendanceRecordId)
                        ->exists();

                    if ($exists) {
                        return redirect()->back()->with('error', __('Attendance record already exists for this employee and date.'));
                    }
                }

                // Get employee with shift and policy
                $employee = Employee::where('user_id', $validated['employee_id'])->first();

                // Use employee's assigned shift and policy, or get defaults
                $shift = $employee && $employee->shift_id ?
                    Shift::find($employee->shift_id) :
                    Shift::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                $policy = $employee && $employee->attendance_policy_id ?
                    AttendancePolicy::find($employee->attendance_policy_id) :
                    AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                $validated['shift_id'] = $shift?->id;
                $validated['attendance_policy_id'] = $policy?->id;

                // Set weekend flag
                $validated['is_weekend'] = Carbon::parse($validated['date'])->isWeekend();

                $attendanceRecord->update($validated);

                // Process complete attendance calculation
                $attendanceRecord->fresh(); // Reload to get relationships
                $attendanceRecord->processAttendance();

                return redirect()->back()->with('success', __('Attendance record updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update attendance record'));
            }
        } else {
            return redirect()->back()->with('error', __('Attendance record Not Found.'));
        }
    }

    public function destroy($attendanceRecordId)
    {
        $attendanceRecord = AttendanceRecord::where('id', $attendanceRecordId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($attendanceRecord) {
            try {
                $attendanceRecord->delete();

                return redirect()->back()->with('success', __('Attendance record deleted successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete attendance record'));
            }
        } else {
            return redirect()->back()->with('error', __('Attendance record Not Found.'));
        }
    }

    public function clockIn(Request $request)
    {
        if (Auth::user()->can('clock-in-out')) {
            try {
                $validated = $request->validate([
                    'employee_id' => 'required|exists:users,id',
                ]);

                $settings = settings();
                if (! empty($settings['ipRestrictionEnabled']) && $settings['ipRestrictionEnabled'] == 1) {
                    $loginUserIp = request()->ip();
                    $ip = IpRestriction::whereIn('created_by', getCompanyAndUsersId())->where('ip_address', $loginUserIp)->first();
                    if (empty($ip) || is_null($ip)) {
                        return redirect()->back()->with('error', __('This IP Address Is Not Allowed For Clock In & Clock Out.'));
                    }
                }

                $today = Carbon::today();
                $now = Carbon::now();

                // Get working days from settings
                $globalSettings = settings();
                $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[]', true);

                if (empty($workingDaysIndices)) {
                    return redirect()->back()->with('error', __('Please configure working days first.'));
                }

                $dateIndex = Carbon::parse($today)->dayOfWeek;
                if (! in_array($dateIndex, $workingDaysIndices)) {
                    return redirect()->back()->with('error', __('Cannot create attendance record for non-working day.'));
                }

                // Check if employee has approved leave for this date
                $hasApprovedLeave = LeaveApplication::where('employee_id', $validated['employee_id'])
                    ->where('status', 'approved')
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->exists();

                if ($hasApprovedLeave) {
                    return redirect()->back()->with('error', __('Employee has approved leave for this date. Cannot create attendance record.'));
                }

                // Check if already clocked in today
                $existingRecord = AttendanceRecord::where('employee_id', $validated['employee_id'])
                    ->where('date', $today)
                    ->first();

                if ($existingRecord && $existingRecord->clock_in) {
                    return redirect()->back()->with('error', __('Already clocked in today.'));
                }

                // Get employee with shift and policy
                $employee = \App\Models\Employee::where('user_id', $validated['employee_id'])->first();

                if (! $employee) {
                    return redirect()->back()->with('error', __('Employee profile not found.'));
                }

                // Use employee's assigned shift and policy, or get defaults
                $shift = $employee->shift_id ?
                    Shift::find($employee->shift_id) :
                    Shift::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                $policy = $employee->attendance_policy_id ?
                    AttendancePolicy::find($employee->attendance_policy_id) :
                    AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                if (! $shift || ! $policy) {
                    return redirect()->back()->with('error', __('No active shift or attendance policy found. Please contact HR.'));
                }

                if ($existingRecord) {
                    $existingRecord->update([
                        'clock_in' => $now->format('H:i:s'),
                        'shift_id' => $shift->id,
                        'attendance_policy_id' => $policy->id,
                        'status' => 'present',
                    ]);
                    $record = $existingRecord;
                } else {
                    $record = AttendanceRecord::create([
                        'employee_id' => $validated['employee_id'],
                        'date' => $today,
                        'clock_in' => $now->format('H:i:s'),
                        'shift_id' => $shift->id,
                        'attendance_policy_id' => $policy->id,
                        'is_weekend' => $today->isWeekend(),
                        'status' => 'present',
                        'created_by' => creatorId(),
                    ]);
                }

                // Check for late arrival if methods exist
                if (method_exists($record, 'checkLateArrival')) {
                    $record->checkLateArrival();
                    $record->save();
                }

                return redirect()->back()->with('success', __('Clocked in successfully.'));
            } catch (\Exception $e) {
                \Log::error('Clock in failed: '.$e->getMessage());

                return redirect()->back()->with('error', __('Failed to clock in. Please try again.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function clockOut(Request $request)
    {
        if (Auth::user()->can('clock-in-out')) {
            try {
                $validated = $request->validate([
                    'employee_id' => 'required|exists:users,id',
                ]);

                $today = Carbon::today();
                $now = Carbon::now();

                $record = AttendanceRecord::where('employee_id', $validated['employee_id'])
                    ->where('date', $today)
                    ->first();

                if (! $record || ! $record->clock_in) {
                    return redirect()->back()->with('error', __('Must clock in first.'));
                }

                if ($record->clock_out) {
                    return redirect()->back()->with('error', __('Already clocked out today.'));
                }

                $record->update([
                    'clock_out' => $now->format('H:i:s'),
                ]);

                // Process complete attendance calculation if method exists
                if (method_exists($record, 'processAttendance')) {
                    $record->processAttendance();
                }

                return redirect()->back()->with('success', __('Clocked out successfully.'));
            } catch (\Exception $e) {
                \Log::error('Clock out failed: '.$e->getMessage());

                return redirect()->back()->with('error', __('Failed to clock out. Please try again.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

    }

    public function getTodayAttendance(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
        ]);

        $today = Carbon::today();
        $attendance = AttendanceRecord::where('employee_id', $validated['employee_id'])
            ->where('date', $today)
            ->first();

        return Inertia::render('employee-dashboard', [
            'attendance' => $attendance,
        ]);
    }

    public function export(Request $request)
    {
        if (Auth::user()->can('export-attendance-record')) {
            try {
                $query = AttendanceRecord::with(['employee', 'shift', 'attendancePolicy'])
                    ->where(function ($q) {
                        if (Auth::user()->can('manage-any-attendance-records')) {
                            $q->whereIn('created_by', getCompanyAndUsersId());
                        } elseif (Auth::user()->can('manage-own-attendance-records')) {
                            $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id());
                        } else {
                            $q->whereRaw('1 = 0');
                        }
                    });

                // Apply employee filter
                if ($request->filled('employee_id') && $request->employee_id !== 'all') {
                    $query->where('employee_id', $request->employee_id);
                }

                // Apply month & year filter
                if ($request->filled('month') && $request->filled('year')) {
                    $month = (int) $request->month;
                    $year  = (int) $request->year;
                    $query->whereMonth('date', $month)->whereYear('date', $year);
                } elseif ($request->filled('year')) {
                    $query->whereYear('date', (int) $request->year);
                }

                $attendanceRecords = $query->orderBy('date', 'asc')->get();

                $fileName = 'attendance_records_'.date('Y-m-d_His').'.csv';
                $headers = [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
                ];

                $callback = function () use ($attendanceRecords) {
                    $file = fopen('php://output', 'w');
                    fputcsv($file, [
                        'Employee',
                        'Date',
                        'Shift',
                        'Attedance Policy',
                        'Clock In',
                        'Clock Out',
                        'Break Hours',
                        'Total Hours',
                        'Overtime Hours',
                        'Status',
                        'Is Late',
                        'Is Early Departure',
                        'Notes',
                    ]);

                    foreach ($attendanceRecords as $record) {
                        fputcsv($file, [
                            $record->employee->name ?? '',
                            $record->date ? date('Y-m-d', strtotime($record->date)) : '',
                            $record->shift->name ?? '',
                            $record->attendancePolicy->name ?? '',
                            $record->clock_in ?? '',
                            $record->clock_out ?? '',
                            $record->break_hours ?? '',
                            $record->total_hours ?? '',
                            $record->overtime_hours ?? '',
                            $record->status ?? '',
                            $record->is_late ? 'Yes' : 'No',
                            $record->is_early_departure ? 'Yes' : 'No',
                            $record->notes ?? '',
                        ]);
                    }
                    fclose($file);
                };

                return response()->stream($callback, 200, $headers);
            } catch (\Exception $e) {
                return response()->json(['message' => __('Failed to export attendance records: :message', ['message' => $e->getMessage()])], 500);
            }
        } else {
            return response()->json(['message' => __('Permission Denied.')], 403);
        }
    }

    public function downloadTemplate()
    {
        $filePath = storage_path('uploads/sample/sample-attendance-record.xlsx');
        if (! file_exists($filePath)) {
            return response()->json(['error' => __('Template file not available')], 404);
        }

        return response()->download($filePath, 'sample-attendance-record.xlsx');
    }

    public function parseFile(Request $request)
    {
        if (Auth::user()->can('import-attendance-record')) {
            $rules = ['file' => 'required|mimes:csv,txt,xlsx,xls'];
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json(['message' => $validator->getMessageBag()->first()]);
            }

            try {
                $file = $request->file('file');
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getRealPath());
                $worksheet = $spreadsheet->getActiveSheet();
                $highestColumn = $worksheet->getHighestColumn();
                $highestRow = $worksheet->getHighestRow();
                $headers = [];

                for ($col = 'A'; $col <= $highestColumn; $col++) {
                    $value = $worksheet->getCell($col.'1')->getValue();
                    if ($value) {
                        $headers[] = (string) $value;
                    }
                }

                $previewData = [];
                for ($row = 2; $row <= $highestRow; $row++) {
                    $rowData = [];
                    $colIndex = 0;
                    for ($col = 'A'; $col <= $highestColumn; $col++) {
                        if ($colIndex < count($headers)) {
                            $rowData[$headers[$colIndex]] = (string) $worksheet->getCell($col.$row)->getValue();
                        }
                        $colIndex++;
                    }
                    $previewData[] = $rowData;
                }

                return response()->json(['excelColumns' => $headers, 'previewData' => $previewData]);
            } catch (\Exception $e) {
                return response()->json(['message' => __('Failed to parse file: :error', ['error' => $e->getMessage()])]);
            }
        } else {
            return response()->json(['message' => __('Permission denied.')], 403);
        }
    }

    public function fileImport(Request $request)
    {
        if (Auth::user()->can('import-attendance-record')) {
            $rules = ['data' => 'required|array'];
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return redirect()->back()->with('error', $validator->getMessageBag()->first());
            }

            try {
                $data = $request->data;
                $imported = 0;
                $skipped = 0;

                foreach ($data as $row) {
                    try {
                        if (empty($row['employee']) || empty($row['date'])) {
                            $skipped++;

                            continue;
                        }

                        $employee = User::where('name', $row['employee'])
                            ->whereIn('created_by', getCompanyAndUsersId())
                            ->where('type', 'employee')
                            ->first();

                        if (! $employee) {
                            $skipped++;

                            continue;
                        }

                        // Check if attendance record already exists for this employee and date
                        $exists = AttendanceRecord::where('employee_id', $employee->id)
                            ->whereDate('date', $row['date'])
                            ->exists();

                        if ($exists) {
                            $skipped++;

                            continue;
                        }

                        // Get employee with shift and policy
                        $employeeModel = Employee::where('user_id', $employee->id)->first();

                        $shift = $employeeModel && $employeeModel->shift_id ?
                            Shift::find($employeeModel->shift_id) :
                            Shift::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                        $policy = $employeeModel && $employeeModel->attendance_policy_id ?
                            AttendancePolicy::find($employeeModel->attendance_policy_id) :
                            AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                        if (! $shift || ! $policy) {
                            $skipped++;

                            continue;
                        }

                        $record = AttendanceRecord::create([
                            'employee_id' => $employee->id,
                            'date' => $row['date'],
                            'shift_id' => $shift->id,
                            'attendance_policy_id' => $policy->id,
                            'clock_in' => $row['clock_in'] ?? null,
                            'clock_out' => $row['clock_out'] ?? null,
                            'created_by' => creatorId(),
                        ]);

                        // Process attendance calculation
                        if (method_exists($record, 'processAttendance')) {
                            $record->processAttendance();
                        }
                        $imported++;
                    } catch (\Exception $e) {
                        $skipped++;
                    }
                }

                return redirect()->back()->with('success', __('Import completed: :added attendance records added, :skipped attendance records skipped', ['added' => $imported, 'skipped' => $skipped]));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', __('Failed to import: :error', ['error' => $e->getMessage()]));
            }
        } else {
            return redirect()->back()->with('error', __('Permission denied.'));
        }
    }
}
