<?php

namespace App\Http\Controllers;

use App\Models\Interview;
use App\Models\Candidate;
use App\Models\InterviewRound;
use App\Models\InterviewType;
use App\Models\User;
use App\Models\User as UserModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class InterviewController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-interviews')) {
            $query = Interview::with(['candidate', 'job', 'round', 'interviewType'])->where(function ($q) {
                if (Auth::user()->can('manage-any-interviews')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-interviews')) {
                    $q->where('created_by', Auth::id())->orwhereJsonContains('interviewers', (string) Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            if ($request->has('search') && !empty($request->search)) {
                $query->whereHas('candidate', function ($q) use ($request) {
                    $q->where('first_name', 'like', '%' . $request->search . '%')
                        ->orWhere('last_name', 'like', '%' . $request->search . '%');
                });
            }

            if ($request->has('candidate_id') && !empty($request->candidate_id) && $request->candidate_id !== 'all') {
                $query->where('candidate_id', $request->candidate_id);
            }

            $pivotDate = !empty($request->selected_date)
                ? \Carbon\Carbon::parse($request->selected_date)
                : \Carbon\Carbon::today();

            if (!isDemo()) {
                if ($request->has('selected_date') && !empty($request->selected_date)) {
                    $query->whereDate('scheduled_date', $request->selected_date);
                } else {
                    $query->whereDate('scheduled_date', $pivotDate->toDateString());
                }
            }
            $defaultSelectedDate = $pivotDate->toDateString();

            $statusCounts = [
                'all'       => (clone $query)->count(),
                'Scheduled' => (clone $query)->where('status', 'Scheduled')->count(),
                'Completed' => (clone $query)->where('status', 'Completed')->count(),
                'Cancelled' => (clone $query)->where('status', 'Cancelled')->count(),
                'No-show'   => (clone $query)->where('status', 'No-show')->count(),
            ];

            $statsQuery = Interview::with([])->where(function ($q) {
                if (Auth::user()->can('manage-any-interviews')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-interviews')) {
                    $q->where('created_by', Auth::id())->orWhereJsonContains('interviewers', (string) Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            $kpiStats = [
                'total'            => (clone $statsQuery)->count(),
                'scheduled'        => (clone $statsQuery)->where('status', 'Scheduled')->count(),
                'completed'        => (clone $statsQuery)->where('status', 'Completed')->count(),
                'pending_feedback' => (clone $statsQuery)->where('feedback_submitted', false)->count(),
            ];

            $weekStart  = $pivotDate->copy()->startOfWeek();
            $monthLabel = $pivotDate->format('F Y');

            $weekEnd = $weekStart->copy()->endOfWeek();

            $weeklyRaw = (clone $statsQuery)
                ->whereBetween('scheduled_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                ->selectRaw('scheduled_date, COUNT(*) as count')
                ->groupBy('scheduled_date')
                ->pluck('count', 'scheduled_date')
                ->toArray();

            $weeklyCalendar = [];
            for ($i = 0; $i < 7; $i++) {
                $day     = $weekStart->copy()->addDays($i);
                $dateStr = $day->toDateString();
                $weeklyCalendar[] = [
                    'date'       => $dateStr,
                    'day_name'   => $day->format('D'),
                    'day_number' => $day->format('j'),
                    'count'      => $weeklyRaw[$dateStr] ?? 0,
                ];
            }

            $weekRange = [
                'label'            => $weekStart->format('d M') . ' – ' . $weekEnd->format('d M Y'),
                'week_start'       => $weekStart->toDateString(),
                'week_end'         => $weekEnd->toDateString(),
                'month_label'      => $monthLabel,
                'default_selected' => $defaultSelectedDate,
            ];

            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $query->orderBy('scheduled_time', 'asc');
            $interviews = $query->paginate($request->per_page ?? 10);

            $candidates = Candidate::whereIn('created_by', getCompanyAndUsersId())
                ->select('id', 'first_name', 'last_name')
                ->where('status', 'Interview')
                ->get();

            $interviewTypes = InterviewType::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            $employees = UserModel::with('employee')
                ->whereIn('type', ['manager', 'hr', 'employee'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name', 'type')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'type' => $user->type,
                        'employee_id' => $user->employee->employee_id ?? ''
                    ];
                });

            // Next day interviews for sidebar
            // If selected date is today or past date: show tomorrow's records
            // If selected date is future: show the day after the selected date
            $todayDate = \Carbon\Carbon::today();
            $nextDate  = $pivotDate->lessThanOrEqualTo($todayDate)
                ? $todayDate->copy()->addDay()
                : $pivotDate->copy()->addDay();

            $upcomingQuery = (clone $statsQuery)->with(['candidate', 'job', 'round', 'interviewType']);
            if (isDemo()) {
                // In demo mode show upcoming interviews scheduled for nextDate or latest
                $upcomingQuery->whereDate('scheduled_date', $nextDate->toDateString())
                    ->orderBy('scheduled_time');

                if ((clone $upcomingQuery)->count() === 0) {
                    $upcomingQuery = (clone $statsQuery)->with(['candidate', 'job', 'round', 'interviewType'])
                        ->where('scheduled_date', '<=', \Carbon\Carbon::today()->toDateString())
                        ->orderBy('scheduled_time');
                }
            } else {
                $upcomingQuery->whereDate('scheduled_date', $nextDate->toDateString())
                    ->orderBy('scheduled_time');
            }
            $upcomingNext = $upcomingQuery->limit(5)->get()->map(function ($i) {
                    return [
                        'id'             => $i->id,
                        'scheduled_time' => $i->scheduled_time,
                        'duration'       => $i->duration,
                        'candidate_name' => trim(($i->candidate->first_name ?? '') . ' ' . ($i->candidate->last_name ?? '')),
                        'job_title'      => $i->job->title ?? '',
                        'round_name'     => $i->round->name ?? '',
                        'type_name'      => $i->interviewType->name ?? '',
                        'location'       => $i->location ?: ($i->meeting_link ? 'Online' : ''),
                        'meeting_link'   => $i->meeting_link,
                        'status'         => $i->status,
                    ];
                });

            // Monthly summary for sidebar — scoped to the pivot month (all-time in demo)
            $monthStart = $pivotDate->copy()->startOfMonth()->toDateString();
            $monthEnd   = $pivotDate->copy()->endOfMonth()->toDateString();
            $summaryBase = isDemo()
                ? clone $statsQuery
                : (clone $statsQuery)->whereBetween('scheduled_date', [$monthStart, $monthEnd]);
            $monthlySummary = [
                'total'            => (clone $summaryBase)->count(),
                'scheduled'        => (clone $summaryBase)->where('status', 'Scheduled')->count(),
                'completed'        => (clone $summaryBase)->where('status', 'Completed')->count(),
                'pending_feedback' => (clone $summaryBase)->where('feedback_submitted', false)->count(),
                'cancelled'        => (clone $summaryBase)->where('status', 'Cancelled')->count(),
                'no_show'          => (clone $summaryBase)->where('status', 'No-show')->count(),
                'next_date'        => $nextDate->toDateString(),
                'next_date_label'  => $nextDate->format('d M Y'),
                'month_label'      => $monthLabel,
            ];

            return Inertia::render('hr/recruitment/interviews/index', [
                'interviews'      => $interviews,
                'candidates'      => $candidates,
                'interviewTypes'  => $interviewTypes,
                'employees'       => $employees,
                'statusCounts'    => $statusCounts,
                'kpiStats'        => $kpiStats,
                'weeklyCalendar'  => $weeklyCalendar,
                'weekRange'       => $weekRange,
                'upcomingNext'    => $upcomingNext,
                'monthlySummary'  => $monthlySummary,
                'filters'         => $request->all(['search', 'status', 'candidate_id', 'per_page', 'sort_field', 'sort_direction', 'selected_date']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function kanban(Request $request)
    {
        if (Auth::user()->can('manage-interviews')) {
            $query = Interview::with(['candidate', 'job', 'round', 'interviewType'])->where(function ($q) {
                if (Auth::user()->can('manage-any-interviews')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-interviews')) {
                    $q->where('created_by', Auth::id())->orWhereJsonContains('interviewers', (string) Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            if ($request->has('search') && !empty($request->search)) {
                $query->whereHas('candidate', function ($q) use ($request) {
                    $q->where('first_name', 'like', '%' . $request->search . '%')
                        ->orWhere('last_name', 'like', '%' . $request->search . '%');
                });
            }

            if ($request->has('candidate_id') && !empty($request->candidate_id) && $request->candidate_id !== 'all') {
                $query->where('candidate_id', $request->candidate_id);
            }

            $interviews = $query->orderBy('scheduled_date', 'desc')->get()->map(function ($i) {
                $rawInterviewers = $i->interviewers;
                if (is_string($rawInterviewers)) {
                    $rawInterviewers = json_decode($rawInterviewers, true);
                }
                $interviewerIds = is_array($rawInterviewers) ? array_map('intval', array_filter($rawInterviewers)) : [];

                $interviewerUsers = UserModel::whereIn('id', $interviewerIds)->get()->map(function($u) {
                    return [
                        'id' => $u->id,
                        'name' => $u->name,
                        'avatar' => check_file($u->avatar) ? get_file($u->avatar) : get_file('avatars/avatar.png'),
                    ];
                });

                return [
                    'id' => $i->id,
                    'candidate_id' => $i->candidate_id,
                    'candidate_name' => trim(($i->candidate->first_name ?? '') . ' ' . ($i->candidate->last_name ?? '')),
                    'candidate_initials' => strtoupper(substr($i->candidate->first_name ?? 'A', 0, 1) . substr($i->candidate->last_name ?? 'T', 0, 1)),
                    'job_title' => $i->job->title ?? '',
                    'round_id' => $i->round_id,
                    'round_name' => $i->round->name ?? '',
                    'interview_type_id' => $i->interview_type_id,
                    'type_name' => $i->interviewType->name ?? '',
                    'scheduled_date' => $i->scheduled_date,
                    'scheduled_time' => $i->scheduled_time,
                    'duration' => $i->duration,
                    'location' => $i->location ?: ($i->meeting_link ? 'Online' : ''),
                    'meeting_link' => $i->meeting_link,
                    'status' => $i->status,
                    'interviewers' => $interviewerIds,
                    'interviewer_details' => $interviewerUsers
                ];
            });

            $candidates = Candidate::whereIn('created_by', getCompanyAndUsersId())
                ->select('id', 'first_name', 'last_name')
                ->where('status', 'Interview')
                ->get();

            $interviewTypes = InterviewType::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            $interviewRounds = InterviewRound::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            $employees = UserModel::with('employee')
                ->whereIn('type', ['manager', 'hr', 'employee'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name', 'type')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'type' => $user->type,
                        'employee_id' => $user->employee->employee_id ?? ''
                    ];
                });

            return Inertia::render('hr/recruitment/interviews/kanban', [
                'interviews' => $interviews,
                'candidates' => $candidates,
                'interviewTypes' => $interviewTypes,
                'interviewRounds' => $interviewRounds,
                'employees' => $employees,
                'filters' => $request->all(['search', 'candidate_id']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'candidate_id' => 'required|exists:candidates,id',
            'round_id' => 'required|exists:interview_rounds,id',
            'interview_type_id' => 'required|exists:interview_types,id',
            'scheduled_date' => 'required|date|after_or_equal:today',
            'scheduled_time' => 'required|date_format:H:i',
            'duration' => 'required|integer|min:15|max:480',
            'location' => 'nullable|string|max:255',
            'meeting_link' => 'nullable|url',
            'interviewers' => 'required|array|min:1',
            'interviewers.*' => 'exists:users,id',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Check if interview already exists for this candidate and round
        $existingInterview = Interview::where('candidate_id', $request->candidate_id)
            ->where('round_id', $request->round_id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($existingInterview) {
            return redirect()->back()->with('error', __('Interview already exists for this interview round'));
        }

        $candidate = Candidate::find($request->candidate_id);

        Interview::create([
            'candidate_id' => $request->candidate_id,
            'job_id' => $candidate->job_id,
            'round_id' => $request->round_id,
            'interview_type_id' => $request->interview_type_id,
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'duration' => $request->duration,
            'location' => $request->location,
            'meeting_link' => $request->meeting_link,
            'interviewers' => $request->interviewers,
            'created_by' => creatorId(),
        ]);

        return redirect()->back()->with('success', __('Interview scheduled successfully'));
    }

    public function update(Request $request, Interview $interview)
    {
        if (!in_array($interview->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this interview'));
        }

        $validator = Validator::make($request->all(), [
            'candidate_id' => 'required|exists:candidates,id',
            'round_id' => 'required|exists:interview_rounds,id',
            'interview_type_id' => 'required|exists:interview_types,id',
            'scheduled_date' => 'required|date',
            'scheduled_time' => 'required',
            'duration' => 'required|integer|min:15|max:480',
            'location' => 'nullable|string|max:255',
            'meeting_link' => 'nullable|url',
            'interviewers' => 'required|array|min:1',
            'interviewers.*' => 'exists:users,id',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Check if interview already exists for this candidate and round (excluding current record)
        $existingInterview = Interview::where('candidate_id', $request->candidate_id)
            ->where('round_id', $request->round_id)
            ->where('id', '!=', $interview->id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($existingInterview) {
            return redirect()->back()->with('error', __('Interview already exists for this interview round'));
        }

        $candidate = Candidate::find($request->candidate_id);

        $interview->update([
            'candidate_id' => $request->candidate_id,
            'job_id' => $candidate->job_id,
            'round_id' => $request->round_id,
            'interview_type_id' => $request->interview_type_id,
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'duration' => $request->duration,
            'location' => $request->location,
            'meeting_link' => $request->meeting_link,
            'interviewers' => $request->interviewers,
        ]);

        return redirect()->back()->with('success', __('Interview updated successfully'));
    }

    public function destroy(Interview $interview)
    {
        if (!in_array($interview->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to delete this interview'));
        }

        $interview->delete();
        return redirect()->back()->with('success', __('Interview deleted successfully'));
    }

    public function updateStatus(Request $request, Interview $interview)
    {
        if (!in_array($interview->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this interview'));
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Scheduled,Completed,Cancelled,No-show',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }

        $interview->update(['status' => $request->status]);
        return redirect()->back()->with('success', __('Interview status updated successfully'));
    }

    public function show(Interview $interview)
    {
        if (!Auth::user()->can('view-interviews')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        if (!in_array($interview->created_by, getCompanyAndUsersId())) {
            return abort(404);
        }

        $interview->load([
            'candidate', 
            'job', 
            'round', 
            'interviewType', 
            'feedback' => function ($q) {
                if (Auth::user()->can('manage-any-interview-feedback')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-interview-feedback')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            }
        ]);

        if ($interview->feedback) {
            $interview->feedback->transform(function ($fb) {
                $fb->interviewers = $fb->interviewers;
                return $fb;
            });
        }

        // Resolve interviewer names from the stored JSON array of user IDs
        $interviewerUsers = collect();
        if (!empty($interview->interviewers)) {
            $query = \App\Models\User::whereIn('id', $interview->interviewers)
                ->select('id', 'name', 'email', 'type', 'avatar');

            if (Auth::user()->can('manage-any-interview-feedback')) {
                // Can see all interviewers
            } elseif (Auth::user()->can('manage-own-interview-feedback')) {
                $query->where('id', Auth::id());
            } else {
                $query->whereRaw('1 = 0');
            }

            $interviewerUsers = $query->get()
                ->map(function ($user) {
                    $user->avatar = check_file($user->avatar) ? get_file($user->avatar) : get_file('avatars/avatar.png');
                    return $user;
                });
        }

        return Inertia::render('hr/recruitment/interviews/show', [
            'interview'         => $interview,
            'interviewerUsers'  => $interviewerUsers,
        ]);
    }

    public function getRoundsByCandidate(Candidate $candidate)
    {
        if (!in_array($candidate->created_by, getCompanyAndUsersId())) {
            return response()->json([]);
        }

        $rounds = InterviewRound::where('job_id', $candidate->job_id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->select('id', 'name')
            ->get();

        return response()->json($rounds);
    }
}
