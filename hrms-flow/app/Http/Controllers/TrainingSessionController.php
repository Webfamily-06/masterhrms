<?php

namespace App\Http\Controllers;

use App\Models\TrainingProgram;
use App\Models\TrainingSession;
use App\Models\TrainingSessionAttendance;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class TrainingSessionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-training-sessions')) {
            $query = TrainingSession::with(['trainingProgram', 'trainers'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-training-sessions')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-training-sessions')) {
                        $q->where('created_by', Auth::id())
                            ->orWhereHas('trainers', function ($tq) {
                                $tq->where('training_session_trainer.employee_id', Auth::id());
                            });
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });

            // Handle search
            if ($request->has('search') && ! empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%'.$request->search.'%')
                        ->orWhere('location', 'like', '%'.$request->search.'%')
                        ->orWhere('notes', 'like', '%'.$request->search.'%')
                        ->orWhereHas('trainingProgram', function ($q) use ($request) {
                            $q->where('name', 'like', '%'.$request->search.'%');
                        });
                });
            }

            // Handle program filter
            if ($request->has('training_program_id') && ! empty($request->training_program_id)) {
                $query->where('training_program_id', $request->training_program_id);
            }

            // Handle location type filter
            if ($request->has('location_type') && ! empty($request->location_type)) {
                $query->where('location_type', $request->location_type);
            }

            // Handle date range filter
            if ($request->has('date_from') && ! empty($request->date_from)) {
                $query->whereDate('start_date', '>=', $request->date_from);
            }
            if ($request->has('date_to') && ! empty($request->date_to)) {
                $query->whereDate('start_date', '<=', $request->date_to);
            }

            $statusCounts = [
                'all'         => (clone $query)->count(),
                'scheduled'   => (clone $query)->where('status', 'scheduled')->count(),
                'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
                'completed'   => (clone $query)->where('status', 'completed')->count(),
                'cancelled'   => (clone $query)->where('status', 'cancelled')->count(),
            ];

            // Handle status filter
            if ($request->has('status') && ! empty($request->status)) {
                $query->where('status', $request->status);
            }



            // Handle sorting
            $allowedSortFields = ['id', 'name', 'start_date', 'end_date', 'status', 'location', 'location_type', 'created_at'];
            if ($request->has('sort_field') && ! empty($request->sort_field)) {
                $sortField = $request->sort_field === 'date_time' ? 'start_date' : $request->sort_field;
                if (in_array($sortField, $allowedSortFields)) {
                    $sortDirection = in_array($request->sort_direction, ['asc', 'desc']) ? $request->sort_direction : 'asc';
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('id', 'desc');
                }
            } else {
                $query->orderBy('id', 'desc');
            }

            // Add attendance count and trainers count
            $query->withCount(['attendance', 'trainers']);

            $trainingSessions = $query->paginate($request->per_page ?? 10);

            $trainingSessions->getCollection()->transform(function ($session) {
                $session->trainers->transform(function ($trainer) {
                    $rawAvatar = $trainer->getRawOriginal('avatar');
                    $trainer->avatar = check_file($rawAvatar) ? get_file($rawAvatar) : get_file('avatars/avatar.png');
                    return $trainer;
                });
                return $session;
            });

            // Get training programs for filter dropdown
            $trainingPrograms = TrainingProgram::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            // Get employees for trainer dropdown
            $employees = User::with('employee')
                ->where('type', 'employee')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'employee_id' => isset($user->employee) ? $user->employee->employee_id : '-',
                    ];
                });

            return Inertia::render('hr/training/sessions/index', [
                'trainingSessions' => $trainingSessions,
                'trainingPrograms' => $trainingPrograms,
                'employees'        => $employees,
                'statusCounts'     => $statusCounts,
                'filters'          => $request->all(['search', 'training_program_id', 'status', 'location_type', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', 'Permission Denied.');
        }
    }

    /**
     * Display the calendar view.
     */
    public function calendar(Request $request)
    {
        // Get training programs for filter dropdown
        $trainingPrograms = TrainingProgram::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->select('id', 'name')
            ->get();

        // In demo mode — return static data covering all 12 months
        if (isDemo()) {
            $year = now()->year;
            $staticEvents = [
                ['title' => 'Leadership Training',        'start' => "{$year}-01-08", 'end' => "{$year}-01-10", 'status' => 'completed',   'program' => 'Leadership Development', 'location' => 'Conference Room A'],
                ['title' => 'Safety Induction',           'start' => "{$year}-01-20", 'end' => "{$year}-01-21", 'status' => 'completed',   'program' => 'Safety Training',        'location' => 'Training Hall'],
                ['title' => 'Excel Advanced',             'start' => "{$year}-02-05", 'end' => "{$year}-02-06", 'status' => 'completed',   'program' => 'IT Skills',              'location' => 'Computer Lab'],
                ['title' => 'Communication Skills',       'start' => "{$year}-02-18", 'end' => "{$year}-02-19", 'status' => 'completed',   'program' => 'Soft Skills',            'location' => 'Room B'],
                ['title' => 'Project Management',         'start' => "{$year}-03-10", 'end' => "{$year}-03-12", 'status' => 'completed',   'program' => 'Management Training',    'location' => 'Board Room'],
                ['title' => 'Customer Service',           'start' => "{$year}-03-24", 'end' => "{$year}-03-25", 'status' => 'completed',   'program' => 'Service Excellence',     'location' => 'Training Hall'],
                ['title' => 'Data Analysis Workshop',     'start' => "{$year}-04-07", 'end' => "{$year}-04-08", 'status' => 'completed',   'program' => 'IT Skills',              'location' => 'Computer Lab'],
                ['title' => 'Team Building',              'start' => "{$year}-04-22", 'end' => "{$year}-04-23", 'status' => 'completed',   'program' => 'Soft Skills',            'location' => 'Outdoor Venue'],
                ['title' => 'HR Compliance',              'start' => "{$year}-05-06", 'end' => "{$year}-05-07", 'status' => 'completed',   'program' => 'Compliance Training',    'location' => 'Conference Room A'],
                ['title' => 'Sales Techniques',           'start' => "{$year}-05-20", 'end' => "{$year}-05-21", 'status' => 'completed',   'program' => 'Sales Training',         'location' => 'Room C'],
                ['title' => 'Cybersecurity Awareness',   'start' => "{$year}-06-03", 'end' => "{$year}-06-04", 'status' => 'completed',   'program' => 'IT Skills',              'location' => 'Computer Lab'],
                ['title' => 'Performance Management',     'start' => "{$year}-06-17", 'end' => "{$year}-06-18", 'status' => 'completed',   'program' => 'Management Training',    'location' => 'Board Room'],
                ['title' => 'First Aid Training',         'start' => "{$year}-07-08", 'end' => "{$year}-07-09", 'status' => 'in_progress', 'program' => 'Safety Training',        'location' => 'Training Hall'],
                ['title' => 'Presentation Skills',        'start' => "{$year}-07-22", 'end' => "{$year}-07-23", 'status' => 'scheduled',   'program' => 'Soft Skills',            'location' => 'Room B'],
                ['title' => 'Financial Literacy',         'start' => "{$year}-08-05", 'end' => "{$year}-08-06", 'status' => 'scheduled',   'program' => 'Finance Training',       'location' => 'Conference Room A'],
                ['title' => 'Agile Methodology',          'start' => "{$year}-08-19", 'end' => "{$year}-08-20", 'status' => 'scheduled',   'program' => 'IT Skills',              'location' => 'Computer Lab'],
                ['title' => 'Conflict Resolution',        'start' => "{$year}-09-09", 'end' => "{$year}-09-10", 'status' => 'scheduled',   'program' => 'Soft Skills',            'location' => 'Room B'],
                ['title' => 'Digital Marketing',          'start' => "{$year}-09-23", 'end' => "{$year}-09-24", 'status' => 'scheduled',   'program' => 'Marketing Training',     'location' => 'Room C'],
                ['title' => 'Leadership Advanced',        'start' => "{$year}-10-07", 'end' => "{$year}-10-09", 'status' => 'scheduled',   'program' => 'Leadership Development', 'location' => 'Board Room'],
                ['title' => 'Quality Management',         'start' => "{$year}-10-21", 'end' => "{$year}-10-22", 'status' => 'scheduled',   'program' => 'Management Training',    'location' => 'Conference Room A'],
                ['title' => 'Workplace Diversity',        'start' => "{$year}-11-04", 'end' => "{$year}-11-05", 'status' => 'scheduled',   'program' => 'Compliance Training',    'location' => 'Training Hall'],
                ['title' => 'Technical Writing',          'start' => "{$year}-11-18", 'end' => "{$year}-11-19", 'status' => 'scheduled',   'program' => 'Soft Skills',            'location' => 'Room B'],
                ['title' => 'Year-End Review Training',   'start' => "{$year}-12-02", 'end' => "{$year}-12-03", 'status' => 'scheduled',   'program' => 'Management Training',    'location' => 'Board Room'],
                ['title' => 'New Year Orientation',       'start' => "{$year}-12-16", 'end' => "{$year}-12-17", 'status' => 'scheduled',   'program' => 'Leadership Development', 'location' => 'Conference Room A'],
            ];

            $statusColors = [
                'scheduled'   => '#3788d8',
                'in_progress' => '#f59e0b',
                'completed'   => '#10b77f',
                'cancelled'   => '#ef4444',
            ];

            $calendarEvents = collect($staticEvents)->map(function ($event, $index) use ($statusColors) {
                return [
                    'id'              => $index + 1,
                    'title'           => $event['title'],
                    'start'           => $event['start'],
                    'end'             => $event['end'],
                    'backgroundColor' => $statusColors[$event['status']] ?? '#6b7280',
                    'borderColor'     => $statusColors[$event['status']] ?? '#6b7280',
                    'url'             => '#',
                    'extendedProps'   => [
                        'program'  => $event['program'],
                        'location' => $event['location'],
                        'status'   => $event['status'],
                    ],
                ];
            });

            return Inertia::render('hr/training/sessions/calendar', [
                'calendarEvents'   => $calendarEvents,
                'trainingPrograms' => $trainingPrograms,
                'filters'          => $request->all(['training_program_id', 'status']),
            ]);
        }

        $query = TrainingSession::with(['trainingProgram'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-training-sessions')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-training-sessions')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('trainers', function ($tq) {
                            $tq->where('training_session_trainer.employee_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        // Handle program filter
        if ($request->has('training_program_id') && ! empty($request->training_program_id)) {
            $query->where('training_program_id', $request->training_program_id);
        }

        // Handle status filter
        if ($request->has('status') && ! empty($request->status)) {
            $query->where('status', $request->status);
        }

        // Get all sessions for calendar
        $trainingSessions = $query->get();

        // Format sessions for calendar
        $calendarEvents = $trainingSessions->map(function ($session) {
            $statusColors = [
                'scheduled' => '#3788d8',
                'in_progress' => '#f59e0b',
                'completed' => '#10b77f',
                'cancelled' => '#ef4444',
            ];

            return [
                'id' => $session->id,
                'title' => $session->name ?? $session->trainingProgram->name,
                'start' => $session->start_date,
                'end' => $session->end_date,
                'backgroundColor' => $statusColors[$session->status] ?? '#6b7280',
                'borderColor' => $statusColors[$session->status] ?? '#6b7280',
                'url' => route('hr.training-sessions.show', $session->id),
                'extendedProps' => [
                    'program' => $session->trainingProgram->name,
                    'location' => $session->location,
                    'status' => $session->status,
                ],
            ];
        });

        // Get training programs for filter dropdown
        $trainingPrograms = TrainingProgram::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->select('id', 'name')
            ->get();

        return Inertia::render('hr/training/sessions/calendar', [
            'calendarEvents' => $calendarEvents,
            'trainingPrograms' => $trainingPrograms,
            'filters' => $request->all(['training_program_id', 'status']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (Auth::user()->can('create-training-sessions')) {
            $validator = Validator::make($request->all(), [
                'training_program_id' => 'required|exists:training_programs,id',
                'name' => 'nullable|string|max:255',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'location' => 'nullable|string|max:255',
                'location_type' => 'required|string|in:physical,virtual',
                'meeting_link' => 'nullable|string|max:255|required_if:location_type,virtual',
                'status' => 'required|string|in:scheduled,in_progress,completed,cancelled',
                'notes' => 'nullable|string',
                'is_recurring' => 'nullable|boolean',
                'recurrence_pattern' => 'nullable|string|in:daily,weekly,monthly|required_if:is_recurring,true',
                'recurrence_count' => 'nullable|integer|min:1|required_if:is_recurring,true',
                'trainer_ids' => 'nullable|array',
                'trainer_ids.*' => 'exists:users,id',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            // Check if training program belongs to current company
            $trainingProgram = TrainingProgram::find($request->training_program_id);
            if (! $trainingProgram || ! in_array($trainingProgram->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', 'Invalid training program selected');
            }

            // Check if trainers belong to current company
            if (! empty($request->trainer_ids)) {
                $trainerIds = $request->trainer_ids;
                $validTrainers = User::whereIn('id', $trainerIds)
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->pluck('id')
                    ->toArray();

                if (count($validTrainers) !== count($trainerIds)) {
                    return redirect()->back()->with('error', 'Invalid trainer selection');
                }
            }

            $sessionData = [
                'training_program_id' => $request->training_program_id,
                'name' => $request->name,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'location' => $request->location,
                'location_type' => $request->location_type,
                'meeting_link' => $request->meeting_link,
                'status' => $request->status,
                'notes' => $request->notes,
                'is_recurring' => $request->is_recurring ?? false,
                'recurrence_pattern' => $request->recurrence_pattern,
                'recurrence_count' => $request->recurrence_count,
                'created_by' => creatorId(),
            ];

            $session = TrainingSession::create($sessionData);

            // Attach trainers if provided
            if (! empty($request->trainer_ids)) {
                $session->trainers()->attach($request->trainer_ids);
            }

            // Create recurring sessions if needed
            if ($request->is_recurring && $request->recurrence_count > 0) {
                $this->createRecurringSessions($session, $request->trainer_ids ?? []);
            }

            return redirect()->back()->with('success', __('Training session created successfully'));
        } else {
            return redirect()->back()->with('error', 'Permission Denied.');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(TrainingSession $trainingSession)
    {
        if (Auth::user()->can('view-training-sessions')) {
            // Load relationships
            $trainingSession->load(['trainingProgram', 'trainers.employee', 'attendance', 'creator']);

            // Process trainer avatars
            $trainingSession->trainers->transform(function ($trainer) {
                $rawAvatar = $trainer->getRawOriginal('avatar');
                $trainer->avatar = check_file($rawAvatar)
                    ? get_file($rawAvatar)
                    : get_file('avatars/avatar.png');

                return $trainer;
            });

            // Get existing attendance records for this session keyed by employee_id
            $existingAttendance = $trainingSession->attendance->keyBy('employee_id');

            // Filter trainers based on permission:
            // manage-any-training-sessions -> all trainers
            // manage-own-training-sessions -> only the logged-in user's own record
            $trainers = $trainingSession->trainers;

            if (!Auth::user()->can('manage-any-training-sessions') && Auth::user()->can('manage-own-training-sessions')) {
                $trainers = $trainers->filter(fn($trainer) => $trainer->id === Auth::id());
            }

            $attendanceData = $trainers->map(function ($trainer) use ($existingAttendance) {
                $record = $existingAttendance->get($trainer->id);

                return [
                    'employee_id'         => $trainer->id,
                    'name'                => $trainer->name,
                    'email'                => $trainer->email,
                    'avatar'                => $trainer->avatar,
                    'employee_id_display' => $trainer->employee->employee_id ?? '-',
                    'is_present'          => $record ? (bool) $record->is_present : false,
                    'notes'               => $record ? $record->notes : null,
                ];
            })->values();

            return Inertia::render('hr/training/sessions/show', [
                'trainingSession' => $trainingSession,
                'attendanceData'  => $attendanceData,
            ]);
        } else {
            return redirect()->back()->with('error', 'Permission Denied.');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TrainingSession $trainingSession)
    {
        if (Auth::user()->can('edit-training-sessions')) {

            $validator = Validator::make($request->all(), [
                'training_program_id' => 'required|exists:training_programs,id',
                'name' => 'nullable|string|max:255',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'location' => 'nullable|string|max:255',
                'location_type' => 'required|string|in:physical,virtual',
                'meeting_link' => 'nullable|string|max:255|required_if:location_type,virtual',
                'status' => 'required|string|in:scheduled,in_progress,completed,cancelled',
                'notes' => 'nullable|string',
                'trainer_ids' => 'nullable|array',
                'trainer_ids.*' => 'exists:users,id',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            // Check if training program belongs to current company
            $trainingProgram = TrainingProgram::find($request->training_program_id);
            if (! $trainingProgram || ! in_array($trainingProgram->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', 'Invalid training program selected');
            }

            // Check if trainers belong to current company
            if (! empty($request->trainer_ids)) {
                $trainerIds = $request->trainer_ids;
                $validTrainers = User::whereIn('id', $trainerIds)
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->pluck('id')
                    ->toArray();

                if (count($validTrainers) !== count($trainerIds)) {
                    return redirect()->back()->with('error', 'Invalid trainer selection');
                }
            }

            $sessionData = [
                'training_program_id' => $request->training_program_id,
                'name' => $request->name,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'location' => $request->location,
                'location_type' => $request->location_type,
                'meeting_link' => $request->meeting_link,
                'status' => $request->status,
                'notes' => $request->notes,
            ];

            $trainingSession->update($sessionData);

            // Sync trainers
            if (isset($request->trainer_ids)) {
                $trainingSession->trainers()->sync($request->trainer_ids);
            } else {
                $trainingSession->trainers()->detach();
            }

            return redirect()->back()->with('success', __('Training session updated successfully'));
        } else {
            return redirect()->back()->with('error', 'Permission Denied.');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TrainingSession $trainingSession)
    {
        if (Auth::user()->can('delete-training-sessions')) {
            // Delete attendance records
            $trainingSession->attendance()->delete();

            // Detach trainers
            $trainingSession->trainers()->detach();

            // Delete the training session
            $trainingSession->delete();

            return redirect()->back()->with('success', __('Training session deleted successfully'));
        } else {
            return redirect()->back()->with('error', 'Permission Denied.');
        }
    }

    /**
     * Update attendance for a training session.
     */
    public function updateAttendance(Request $request, TrainingSession $trainingSession)
    {
        if (Auth::user()->can('manage-attendance')) {
            if (Auth::user()->can('manage-attendance')) {
                $validator = Validator::make($request->all(), [
                    'attendance' => 'present|array',
                    'attendance.*.employee_id' => 'required|exists:users,id',
                    'attendance.*.is_present' => 'required|boolean',
                    'attendance.*.notes' => 'nullable|string',
                ]);

                if ($validator->fails()) {
                    return redirect()->back()->withErrors($validator)->withInput();
                }

                // Check if employees belong to current company
                $employeeIds = collect($request->attendance)->pluck('employee_id')->toArray();
                $validEmployees = User::whereIn('id', $employeeIds)
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->pluck('id')
                    ->toArray();

                if (count($validEmployees) !== count($employeeIds)) {
                    return redirect()->back()->with('error', 'Invalid employee selection');
                }

                // Upsert attendance records — only update submitted employees,
                // never touch other employees' existing records
                foreach ($request->attendance as $attendanceData) {
                    TrainingSessionAttendance::updateOrCreate(
                        [
                            'training_session_id' => $trainingSession->id,
                            'employee_id'         => $attendanceData['employee_id'],
                        ],
                        [
                            'is_present' => $attendanceData['is_present'],
                            'notes'      => $attendanceData['notes'] ?? null,
                        ]
                    );
                }

                return redirect()->back()->with('success', __('Attendance updated successfully'));
            } else {
                return redirect()->back()->with('error', 'Permission Denied.');
            }
        } else {
            return redirect()->back()->with('error', 'Permission Denied.');
        }
    }

    /**
     * Create recurring sessions based on the pattern.
     */
    private function createRecurringSessions($originalSession, $trainerIds = [])
    {
        $startDate = $originalSession->start_date;
        $endDate = $originalSession->end_date;
        $duration = $startDate->diffInSeconds($endDate);

        for ($i = 1; $i <= $originalSession->recurrence_count; $i++) {
            // Calculate new dates based on recurrence pattern
            switch ($originalSession->recurrence_pattern) {
                case 'daily':
                    $newStartDate = $startDate->copy()->addDays($i);
                    break;
                case 'weekly':
                    $newStartDate = $startDate->copy()->addWeeks($i);
                    break;
                case 'monthly':
                    $newStartDate = $startDate->copy()->addMonths($i);
                    break;
                default:
                    continue 2; // Skip this iteration if pattern is invalid
            }

            $newEndDate = $newStartDate->copy()->addSeconds($duration);

            // Create new session
            $newSession = TrainingSession::create([
                'training_program_id' => $originalSession->training_program_id,
                'name' => $originalSession->name,
                'start_date' => $newStartDate,
                'end_date' => $newEndDate,
                'location' => $originalSession->location,
                'location_type' => $originalSession->location_type,
                'meeting_link' => $originalSession->meeting_link,
                'status' => 'scheduled',
                'notes' => $originalSession->notes,
                'is_recurring' => false, // Child sessions are not recurring
                'created_by' => $originalSession->created_by,
            ]);

            // Attach trainers
            if (! empty($trainerIds)) {
                $newSession->trainers()->attach($trainerIds);
            }
        }
    }
}
