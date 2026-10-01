<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Meeting;
use App\Models\MeetingAttendee;
use App\Models\MeetingMinute;
use App\Models\MeetingType;
use App\Models\MeetingRoom;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class MeetingController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-meetings')) {
            $selectedDate   = $request->date ?? Carbon::today()->format('Y-m-d');
            $calendarStart  = $request->filled('calendar_month')
                ? Carbon::parse($request->calendar_month)->startOfMonth()
                : now()->startOfMonth();
            $calendarEnd    = $calendarStart->copy()->endOfMonth();

            $baseQuery = function () {
                return Meeting::with(['type', 'room', 'organizer'])->where(function ($q) {
                    if (Auth::user()->can('manage-any-meetings')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-meetings')) {
                        $q->where('created_by', Auth::id())->orWhere('organizer_id', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });
            };

            $dailyMeetingsQuery = Meeting::with(['type', 'room', 'organizer', 'attendees.user', 'minutes.recorder'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-meetings')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-meetings')) {
                        $q->where('created_by', Auth::id())->orWhere('organizer_id', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });

            $dailyMeetings = null;

            if (IsDemo()) {
                $results = collect();
                for ($i = 0; $i < 10; $i++) {
                    $skipCount = IsSaas() ? 10 : 5;
                    $record = (clone $dailyMeetingsQuery)
                        ->skip($i * $skipCount)
                        ->take(1)
                        ->get();

                    $results = $results->merge($record);
                }
                $dailyMeetings = $results;
            } else {
                $dailyMeetingsQuery->whereDate('meeting_date', $selectedDate);
                $dailyMeetings = $dailyMeetingsQuery
                    ->orderBy('start_time')
                    ->get();
            }

            $dailyMeetings = $dailyMeetings->map(function ($meeting) {
                if ($meeting->organizer) {
                    $rawAvatar = $meeting->organizer->getRawOriginal('avatar');
                    $meeting->organizer->avatar = check_file($rawAvatar)
                        ? get_file($rawAvatar)
                        : get_file('avatars/avatar.png');
                }
                $meeting->attendees->each(function ($attendee) {
                    if ($attendee->user) {
                        $rawAvatar = $attendee->user->getRawOriginal('avatar');
                        $attendee->user->avatar = check_file($rawAvatar)
                            ? get_file($rawAvatar)
                            : get_file('avatars/avatar.png');
                    }
                });
                return $meeting;
            });

            // In demo mode, today always shows data — ensure today's dot is present
            if (IsDemo()) {
                $date = $calendarStart->copy();
                while ($date->lte($calendarEnd)) {
                    $formattedDate = $date->format('Y-m-d');
                    // Add a dot if none exists
                    $calendarDots[$formattedDate] = $calendarDots[$formattedDate] ?? 1;
                    $date->addDay();
                }
            } else {
                $calendarDots = $baseQuery()
                    ->whereBetween('meeting_date', [$calendarStart->format('Y-m-d'), $calendarEnd->format('Y-m-d')])
                    ->selectRaw('meeting_date, COUNT(*) as count')
                    ->groupBy('meeting_date')
                    ->pluck('count', 'meeting_date')
                    ->toArray();
            }

            $dailyStats = [
                'scheduled'   => $dailyMeetings->where('status', 'Scheduled')->count(),
                'in_progress'      => $dailyMeetings->where('status', 'In Progress')->count(),
                'completed' => $dailyMeetings->where('status', 'Completed')->count(),
                'cancelled' => $dailyMeetings->where('status', 'Cancelled')->count(),
                'total'     => $dailyMeetings->count(),
            ];

            $meetingTypes = MeetingType::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            $meetingRooms = MeetingRoom::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name', 'type')
                ->get();

            return Inertia::render('meetings/meetings/index', [
                'dailyMeetings' => $dailyMeetings,
                'calendarDots'  => $calendarDots,
                'dailyStats'    => $dailyStats,
                'selectedDate'  => $selectedDate,
                'meetingTypes'  => $meetingTypes,
                'meetingRooms'  => $meetingRooms,
                'employees'     => $this->getFilteredEmployees(),
                'filters'       => $request->only(['date', 'calendar_month']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }


    private function getFilteredEmployees()
    {
        // Get employees for filter dropdown (compatible with getFilteredEmployees logic)
        $employeeQuery = Employee::whereIn('created_by', getCompanyAndUsersId());

        if (Auth::user()->can('manage-own-meetings') && !Auth::user()->can('manage-any-meetings')) {
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

    public function show(Meeting $meeting, Request $request)
    {
        if (!Auth::user()->can('view-meetings')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        if (!in_array($meeting->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $meeting->load(['type', 'room', 'organizer']);

        if ($meeting->organizer) {
            $rawAvatar = $meeting->organizer->getRawOriginal('avatar');
            $meeting->organizer->avatar = check_file($rawAvatar)
                ? get_file($rawAvatar)
                : get_file('avatars/avatar.png');
        }

        // ── Paginated attendees ───────────────────────────────────────────────
        $attendeeQuery = MeetingAttendee::with('user', 'meeting')
            ->where('meeting_id', $meeting->id);

        if ($request->filled('attendee_search')) {
            $attendeeQuery->whereHas('user', fn($q) => $q->where('name', 'like', '%' . $request->attendee_search . '%'));
        }
        if ($request->filled('rsvp_status')) {
            $attendeeQuery->where('rsvp_status', $request->rsvp_status);
        }
        if ($request->filled('attendance_status')) {
            $attendeeQuery->where('attendance_status', $request->attendance_status);
        }
        $allowedAttendeeSortFields = ['rsvp_date', 'created_at'];
        $attendeeSortField = in_array($request->attendee_sort_field, $allowedAttendeeSortFields) ? $request->attendee_sort_field : 'created_at';
        $attendeeSortDir   = $request->attendee_sort_direction === 'desc' ? 'desc' : 'asc';
        $attendeeQuery->orderBy($attendeeSortField, $attendeeSortDir);

        $meetingAttendees = $attendeeQuery->paginate($request->attendee_per_page ?? 10, ['*'], 'attendee_page')
            ->withQueryString()
            ->through(function ($attendee) {
                if ($attendee->user) {
                    $rawAvatar = $attendee->user->getRawOriginal('avatar');
                    $attendee->user->avatar = check_file($rawAvatar)
                        ? get_file($rawAvatar)
                        : get_file('avatars/avatar.png');
                }
                return $attendee;
            });

        // ── Paginated minutes ─────────────────────────────────────────────────
        $minuteQuery = MeetingMinute::with('recorder', 'meeting')
            ->where('meeting_id', $meeting->id);

        if ($request->filled('minute_search')) {
            $minuteQuery->where(fn($q) => $q->where('topic', 'like', '%' . $request->minute_search . '%')
                ->orWhere('content', 'like', '%' . $request->minute_search . '%'));
        }
        if ($request->filled('minute_type')) {
            $minuteQuery->where('type', $request->minute_type);
        }
        if ($request->filled('recorded_by')) {
            $minuteQuery->where('recorded_by', $request->recorded_by);
        }
        $allowedMinuteSortFields = ['topic', 'type', 'recorded_at', 'created_at'];
        $minuteSortField = in_array($request->minute_sort_field, $allowedMinuteSortFields) ? $request->minute_sort_field : 'created_at';
        $minuteSortDir   = $request->minute_sort_direction === 'desc' ? 'desc' : 'asc';
        $minuteQuery->orderBy($minuteSortField, $minuteSortDir);

        $meetingMinutes = $minuteQuery->paginate($request->minute_per_page ?? 10, ['*'], 'minute_page')
            ->withQueryString()
            ->through(function ($minute) {
                if ($minute->recorder) {
                    $rawAvatar = $minute->recorder->getRawOriginal('avatar');
                    $minute->recorder->avatar = check_file($rawAvatar)
                        ? get_file($rawAvatar)
                        : get_file('avatars/avatar.png');
                }
                return $minute;
            });

        // ── Counts for tab labels (unfiltered) ────────────────────────────────
        $meeting->attendees_count = MeetingAttendee::where('meeting_id', $meeting->id)->count();
        $meeting->minutes_count   = MeetingMinute::where('meeting_id', $meeting->id)->count();

        return Inertia::render('meetings/meetings/show', [
            'meeting'          => $meeting,
            'meetingAttendees' => $meetingAttendees,
            'meetingMinutes'   => $meetingMinutes,
            'employees'        => $this->getFilteredEmployees(),
            'meetingTypes'     => MeetingType::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->select('id', 'name')->get(),
            'meetingRooms'     => MeetingRoom::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->select('id', 'name', 'type')->get(),
            'filters'          => $request->only([
                'tab',
                'attendee_search',
                'rsvp_status',
                'attendance_status',
                'attendee_sort_field',
                'attendee_sort_direction',
                'attendee_per_page',
                'minute_search',
                'minute_type',
                'recorded_by',
                'minute_sort_field',
                'minute_sort_direction',
                'minute_per_page',
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type_id' => 'required|exists:meeting_types,id',
            'room_id' => 'nullable|exists:meeting_rooms,id',
            'meeting_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'agenda' => 'nullable|string',
            'recurrence' => 'required|in:None,Daily,Weekly,Monthly',
            'recurrence_end_date' => 'nullable|date|after:meeting_date',
            'organizer_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $startTime = Carbon::createFromFormat('H:i', $request->start_time);
        $endTime = Carbon::createFromFormat('H:i', $request->end_time);
        $duration = $startTime->diffInMinutes($endTime);

        $meetingData = [
            'title' => $request->title,
            'description' => $request->description,
            'type_id' => $request->type_id,
            'room_id' => $request->room_id,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'duration' => $duration,
            'agenda' => $request->agenda,
            'recurrence' => $request->recurrence,
            'recurrence_end_date' => $request->recurrence_end_date,
            'organizer_id' => $request->organizer_id,
            'created_by' => creatorId(),
        ];

        // Create meetings based on recurrence
        $this->createRecurringMeetings($meetingData, $request->meeting_date, $request->recurrence, $request->recurrence_end_date);

        return redirect()->back()->with('success', __('Meeting created successfully'));
    }

    public function update(Request $request, Meeting $meeting)
    {
        if (!in_array($meeting->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this meeting'));
        }

        // Convert time format if needed
        if ($request->start_time) {
            // Handle different time formats (HH:MM:SS to HH:MM)
            if (strlen($request->start_time) === 8) {
                $request->merge(['start_time' => substr($request->start_time, 0, 5)]);
            }
        }
        if ($request->end_time) {
            // Handle different time formats (HH:MM:SS to HH:MM)
            if (strlen($request->end_time) === 8) {
                $request->merge(['end_time' => substr($request->end_time, 0, 5)]);
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type_id' => 'required|exists:meeting_types,id',
            'room_id' => 'nullable|exists:meeting_rooms,id',
            'meeting_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'agenda' => 'nullable|string',
            'recurrence' => 'required|in:None,Daily,Weekly,Monthly',
            'recurrence_end_date' => 'nullable|date|after_or_equal:meeting_date',
            'organizer_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $startTime = Carbon::createFromFormat('H:i', $request->start_time);
        $endTime = Carbon::createFromFormat('H:i', $request->end_time);
        $duration = $startTime->diffInMinutes($endTime);

        $meeting->update([
            'title' => $request->title,
            'description' => $request->description,
            'type_id' => $request->type_id,
            'room_id' => $request->room_id,
            'meeting_date' => $request->meeting_date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'duration' => $duration,
            'agenda' => $request->agenda,
            'recurrence' => $request->recurrence,
            'recurrence_end_date' => $request->recurrence_end_date,
            'organizer_id' => $request->organizer_id,
        ]);

        return redirect()->back()->with('success', __('Meeting updated successfully'));
    }

    public function destroy(Meeting $meeting)
    {
        if (!in_array($meeting->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to delete this meeting'));
        }

        $meeting->delete();
        return redirect()->back()->with('success', __('Meeting deleted successfully'));
    }

    public function updateStatus(Request $request, Meeting $meeting)
    {
        if (!in_array($meeting->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this meeting'));
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Scheduled,In Progress,Completed,Cancelled',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }

        $meeting->update(['status' => $request->status]);
        return redirect()->back()->with('success', __('Meeting status updated successfully'));
    }

    public function updateMeetingStatus(Request $request, Meeting $meeting)
    {
        if (!in_array($meeting->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this meeting status'));
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Scheduled,In Progress,Completed,Cancelled',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }

        $meeting->update(['status' => $request->status]);
        return redirect()->back()->with('success', __('Meeting status updated successfully'));
    }

    private function createRecurringMeetings($meetingData, $startDate, $recurrence, $endDate)
    {
        $currentDate = Carbon::parse($startDate);
        $endDate = $endDate ? Carbon::parse($endDate) : null;
        $meetings = [];

        // Create first meeting
        $meetingData['meeting_date'] = $currentDate->format('Y-m-d');
        $meetings[] = Meeting::create($meetingData);

        // Create recurring meetings if not 'None'
        if ($recurrence !== 'None' && $endDate) {
            while ($currentDate->lt($endDate)) {
                switch ($recurrence) {
                    case 'Daily':
                        $currentDate->addDay();
                        break;
                    case 'Weekly':
                        $currentDate->addWeek();
                        break;
                    case 'Monthly':
                        $currentDate->addMonth();
                        break;
                }

                if ($currentDate->lte($endDate)) {
                    $meetingData['meeting_date'] = $currentDate->format('Y-m-d');
                    $meetings[] = Meeting::create($meetingData);
                }
            }
        }

        return $meetings;
    }
}
