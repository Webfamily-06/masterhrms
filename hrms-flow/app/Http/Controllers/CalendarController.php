<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Meeting;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CalendarController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        if ($user->type === 'employee') {
            if (! $user->hasPermissionTo('view-calendar')) {
                abort(403, 'Unauthorized');
            }
        } else {
            if (! $user->hasPermissionTo('manage-calendar') && ! $user->hasPermissionTo('view-calendar')) {
                abort(403, 'Unauthorized');
            }
        }

        $companyUserIds = getCompanyAndUsersId();

        if (isDemo()) {
            // Static data for demo mode - 12 months
            $meetings = collect();
            $holidays = collect();
            $leaves = collect();
            $birthdays = collect();

            for ($month = 1; $month <= 12; $month++) {
                $date = now()->month($month);

                // 3 meetings per month
                $meetings->push([
                    'id' => 'meeting_' . $month . '_1',
                    'title' => 'Team Meeting',
                    'start' => $date->copy()->day(5)->format('Y-m-d') . 'T10:00:00',
                    'end' => $date->copy()->day(5)->format('Y-m-d') . 'T11:00:00',
                    'type' => 'meeting',
                    'status' => 'scheduled',
                    'backgroundColor' => '#eff6ff',
                    'borderColor' => 'rgba(37, 99, 235, 0.2)',
                    'textColor' => '#1d4ed8',
                ]);

                $meetings->push([
                    'id' => 'meeting_' . $month . '_2',
                    'title' => 'Project Review',
                    'start' => $date->copy()->day(12)->format('Y-m-d') . 'T14:00:00',
                    'end' => $date->copy()->day(12)->format('Y-m-d') . 'T15:30:00',
                    'type' => 'meeting',
                    'status' => 'scheduled',
                    'backgroundColor' => '#eff6ff',
                    'borderColor' => 'rgba(37, 99, 235, 0.2)',
                    'textColor' => '#1d4ed8'
                ]);

                $meetings->push([
                    'id' => 'meeting_' . $month . '_3',
                    'title' => 'Client Presentation',
                    'start' => $date->copy()->day(20)->format('Y-m-d') . 'T09:00:00',
                    'end' => $date->copy()->day(20)->format('Y-m-d') . 'T10:30:00',
                    'type' => 'meeting',
                    'status' => 'scheduled',
                    'backgroundColor' => '#eff6ff',
                    'borderColor' => 'rgba(37, 99, 235, 0.2)',
                    'textColor' => '#1d4ed8'
                ]);

                // 3 holidays per month
                $holidays->push([
                    'id' => 'holiday_' . $month . '_1',
                    'title' => 'Company Foundation Day',
                    'start' => $date->copy()->day(1)->format('Y-m-d'),
                    'end' => $date->copy()->day(1)->format('Y-m-d'),
                    'type' => 'holiday',
                    'allDay' => true,
                    'backgroundColor' => '#f0fdf4',
                    'borderColor' => 'rgba(22, 163, 74, 0.2)',
                    'textColor' => '#15803d'
                ]);

                $holidays->push([
                    'id' => 'holiday_' . $month . '_2',
                    'title' => 'National Holiday',
                    'start' => $date->copy()->day(15)->format('Y-m-d'),
                    'end' => $date->copy()->day(15)->format('Y-m-d'),
                    'type' => 'holiday',
                    'allDay' => true,
                    'backgroundColor' => '#f0fdf4',
                    'borderColor' => 'rgba(22, 163, 74, 0.2)',
                    'textColor' => '#15803d'
                ]);

                $holidays->push([
                    'id' => 'holiday_' . $month . '_3',
                    'title' => 'Festival Holiday',
                    'start' => $date->copy()->day(25)->format('Y-m-d'),
                    'end' => $date->copy()->day(25)->format('Y-m-d'),
                    'type' => 'holiday',
                    'allDay' => true,
                    'backgroundColor' => '#f0fdf4',
                    'borderColor' => 'rgba(22, 163, 74, 0.2)',
                    'textColor' => '#15803d'
                ]);

                // 3 leaves per month
                $leaves->push([
                    'id' => 'leave_' . $month . '_1',
                    'title' => 'John Doe - Sick Leave',
                    'start' => $date->copy()->day(3)->format('Y-m-d'),
                    'end' => $date->copy()->day(5)->format('Y-m-d'),
                    'avatar' => check_file('avatars/avatar-1.png') ? get_file('avatars/avatar-1.png') : get_file('avatars/avatar.png'),
                    'type' => 'leave',
                    'allDay' => true,
                    'backgroundColor' => '#fefce8',
                    'borderColor' => 'rgba(202, 138, 4, 0.2)',
                    'textColor' => '#a16207'
                ]);

                $leaves->push([
                    'id' => 'leave_' . $month . '_2',
                    'title' => 'Jane Smith - Annual Leave',
                    'start' => $date->copy()->day(10)->format('Y-m-d'),
                    'end' => $date->copy()->day(13)->format('Y-m-d'),
                    'avatar' => check_file('avatars/avatar-2.png') ? get_file('avatars/avatar-2.png') : get_file('avatars/avatar.png'),
                    'type' => 'leave',
                    'allDay' => true,
                    'backgroundColor' => '#fefce8',
                    'borderColor' => 'rgba(202, 138, 4, 0.2)',
                    'textColor' => '#a16207'
                ]);

                $leaves->push([
                    'id' => 'leave_' . $month . '_3',
                    'title' => 'Mike Johnson - Casual Leave',
                    'start' => $date->copy()->day(22)->format('Y-m-d'),
                    'end' => $date->copy()->day(23)->format('Y-m-d'),
                    'avatar' => check_file('avatars/avatar-3.png') ? get_file('avatars/avatar-3.png') : get_file('avatars/avatar.png'),
                    'type' => 'leave',
                    'allDay' => true,
                    'backgroundColor' => '#fefce8',
                    'borderColor' => 'rgba(202, 138, 4, 0.2)',
                    'textColor' => '#a16207'
                ]);
            }
        } else {
            // Get meetings
            $meetings = Meeting::query()
                ->when($user->hasRole('employee'), function ($query) use ($user) {
                    $query->where('organizer_id', $user->id)
                        ->orWhereHas('attendees', function ($q) use ($user) {
                            $q->where('user_id', $user->id);
                        });
                }, function ($query) use ($companyUserIds) {
                    $query->whereIn('created_by', $companyUserIds);
                })
                ->get()
                ->map(function ($meeting) {
                    return [
                        'id' => $meeting->id,
                        'title' => $meeting->title,
                        'start' => Carbon::parse($meeting->meeting_date)->format('Y-m-d') . 'T' . Carbon::parse($meeting->start_time)->format('H:i:s'),
                        'end' => Carbon::parse($meeting->meeting_date)->format('Y-m-d') . 'T' . Carbon::parse($meeting->end_time)->format('H:i:s'),
                        'type' => 'meeting',
                        'status' => $meeting->status,
                        'backgroundColor' => '#eff6ff',
                        'borderColor' => 'rgba(37, 99, 235, 0.2)',
                        'textColor' => '#1d4ed8'
                    ];
                });

            // Get holidays
            $holidays = Holiday::whereIn('created_by', $companyUserIds)
                ->get()
                ->map(function ($holiday) {
                    return [
                        'id' => $holiday->id,
                        'title' => $holiday->name,
                        'start' => $holiday->start_date,
                        'end' => $holiday->end_date ?: $holiday->start_date,
                        'type' => 'holiday',
                        'allDay' => true,
                        'backgroundColor' => '#f0fdf4',
                        'borderColor' => 'rgba(22, 163, 74, 0.2)',
                        'textColor' => '#15803d'
                    ];
                });

            // Get leave applications
            $leaves = LeaveApplication::whereIn('created_by', $companyUserIds)
                ->where('status', 'approved')
                ->with(['employee', 'leaveType'])
                ->get()
                ->map(function ($leave) {
                    $rawAvatar = $leave->employee?->getRawOriginal('avatar');
                    return [
                        'id' => $leave->id,
                        'title' => $leave->employee->name . ' - ' . $leave->leaveType->name,
                        'start' => $leave->start_date,
                        'end' => Carbon::parse($leave->end_date)->addDay()->format('Y-m-d'),
                        'type' => 'leave',
                        'allDay' => true,
                        'avatar' => check_file($rawAvatar) ? get_file($rawAvatar) : get_file('avatars/avatar.png'),
                        'backgroundColor' => '#fefce8',
                        'borderColor' => 'rgba(202, 138, 4, 0.2)',
                        'textColor' => '#a16207'
                    ];
                });
        }
        // Get birthdays
        $year = now()->year;
        $birthdays = Employee::whereIn('created_by', $companyUserIds)
            ->whereNotNull('date_of_birth')
            ->with('user')
            ->get()
            ->map(function ($employee) use ($year) {
                $rawAvatar = $employee->user->getRawOriginal('avatar');
                return [
                    'id'    => $employee->id,
                    'title' => ($employee->user->name ?? 'Employee') . "'s Birthday 🎉",
                    'start' => Carbon::create(
                        $year,
                        Carbon::parse($employee->date_of_birth)->month,
                        Carbon::parse($employee->date_of_birth)->day
                    )->toDateString(),
                    'end' => Carbon::create(
                        $year,
                        Carbon::parse($employee->date_of_birth)->month,
                        Carbon::parse($employee->date_of_birth)->day
                    )->toDateString(),
                    'type'  => 'birthday',
                    'allDay' => true,
                    'avatar' => check_file($rawAvatar) ? get_file($rawAvatar) : get_file('avatars/avatar.png'),
                    'backgroundColor' => '#fdf2f8',
                    'borderColor' => 'rgba(219, 39, 119, 0.2)',
                    'textColor' => '#be185d',
                ];
            });

        $events = $meetings->concat($holidays)->concat($leaves)->concat($birthdays);

        return Inertia::render('calendar/index', [
            'events' => $events,
            'canManage' => $user->hasPermissionTo('manage-calendar'),
        ]);
    }
}
