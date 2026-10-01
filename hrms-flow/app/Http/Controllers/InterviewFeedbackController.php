<?php

namespace App\Http\Controllers;

use App\Models\InterviewFeedback;
use App\Models\Interview;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class InterviewFeedbackController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-interview-feedback')) {
            $query = InterviewFeedback::with(['interview.candidate', 'interview.job', 'interview.round'])->where(function ($q) {
                if (Auth::user()->can('manage-any-interview-feedback')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-interview-feedback')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            if ($request->has('search') && !empty($request->search)) {
                $query->whereHas('interview.candidate', function ($q) use ($request) {
                    $q->where('first_name', 'like', '%' . $request->search . '%')
                        ->orWhere('last_name', 'like', '%' . $request->search . '%');
                });
            }

            if ($request->has('recommendation') && !empty($request->recommendation) && $request->recommendation !== 'all') {
                $query->where('recommendation', $request->recommendation);
            }

            if ($request->has('interviewer_id') && !empty($request->interviewer_id) && $request->interviewer_id !== 'all') {
                $query->whereRaw("FIND_IN_SET(?, interviewer_id)", [$request->interviewer_id]);
                // $query->where('interviewer_id', $request->interviewer_id);
            }

            $sortField = $request->get('sort_field');
            $sortDirection = $request->get('sort_direction', 'desc');

            $allowedSortFields = ['created_at'];
            if ($sortField && in_array($sortField, $allowedSortFields)) {
                $query->orderBy($sortField, $sortDirection);
            } else {
                $query->orderBy('id', 'desc');
            }

            $interviewFeedback = $query->paginate($request->per_page ?? 10);

            $interviewFeedback->getCollection()->transform(function ($feedback) {
                $feedback->interviewers = $feedback->interviewers;
                return $feedback;
            });

            $interviews = Interview::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'Completed')
                ->with(['candidate', 'job', 'round'])
                ->when(
                    Auth::user()->can('manage-own-interview-feedback') && !Auth::user()->can('manage-any-interview-feedback'),
                    function ($q) {
                        $q->whereJsonContains('interviewers', (string) Auth::id());
                    }
                )
                ->when(
                    !Auth::user()->can('manage-any-interview-feedback') && !Auth::user()->can('manage-own-interview-feedback'),
                    function ($q) {
                        $q->whereRaw('1 = 0');
                    }
                )
                ->get();

            $interviewers = User::whereIn('created_by', getCompanyAndUsersId())
                ->whereIn('type', ['manager', 'hr', 'employee'])
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/recruitment/interview-feedback/index', [
                'interviewFeedback' => $interviewFeedback,
                'interviews' => $interviews,
                'interviewers' => $interviewers,
                'filters' => $request->all(['search', 'recommendation', 'interviewer_id', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'interview_id' => 'required|exists:interviews,id',
            'interviewer_id' => 'required',
            'technical_rating' => 'nullable|numeric|min:0.5|max:5',
            'communication_rating' => 'nullable|numeric|min:0.5|max:5',
            'cultural_fit_rating' => 'nullable|numeric|min:0.5|max:5',
            'overall_rating' => 'nullable|numeric|min:0.5|max:5',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'comments' => 'nullable|string',
            'recommendation' => 'nullable',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $requestedInterviewers = explode(',', $request->interviewer_id);

        $existingFeedbacks = InterviewFeedback::where('interview_id', $request->interview_id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->get();

        $alreadySubmitted = [];
        foreach ($existingFeedbacks as $feedback) {
            $existingInterviewers = explode(',', (string) $feedback->interviewer_id);
            $alreadySubmitted = array_merge($alreadySubmitted, $existingInterviewers);
        }

        $alreadySubmitted = array_unique($alreadySubmitted);
        $validInterviewers = array_diff($requestedInterviewers, $alreadySubmitted);

        if (empty($validInterviewers)) {
            return redirect()->back()->with('error', __('Feedback already exists for this interview and interviewer'));
        }

        $request->merge([
            'interviewer_id' => implode(',', $validInterviewers)
        ]);

        InterviewFeedback::create([
            'interview_id' => $request->interview_id,
            'interviewer_id' => $request->interviewer_id,
            'technical_rating' => $request->technical_rating,
            'communication_rating' => $request->communication_rating,
            'cultural_fit_rating' => $request->cultural_fit_rating,
            'overall_rating' => $request->overall_rating,
            'strengths' => $request->strengths,
            'weaknesses' => $request->weaknesses,
            'comments' => $request->comments,
            'recommendation' => $request->recommendation,
            'created_by' => creatorId(),
        ]);

        Interview::where('id', $request->interview_id)->update(['feedback_submitted' => true]);

        return redirect()->back()->with('success', __('Interview feedback submitted successfully'));
    }

    public function update(Request $request, InterviewFeedback $interviewFeedback)
    {
        if (!in_array($interviewFeedback->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this feedback'));
        }

        $validator = Validator::make($request->all(), [
            'interview_id' => 'required|exists:interviews,id',
            'interviewer_id' => 'required',
            'technical_rating' => 'nullable|numeric|min:0.5|max:5',
            'communication_rating' => 'nullable|numeric|min:0.5|max:5',
            'cultural_fit_rating' => 'nullable|numeric|min:0.5|max:5',
            'overall_rating' => 'nullable|numeric|min:0.5|max:5',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'comments' => 'nullable|string',
            'recommendation' => 'nullable',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $interviewFeedback->update([
            'interview_id' => $request->interview_id,
            'interviewer_id' => $request->interviewer_id,
            'technical_rating' => $request->technical_rating,
            'communication_rating' => $request->communication_rating,
            'cultural_fit_rating' => $request->cultural_fit_rating,
            'overall_rating' => $request->overall_rating,
            'strengths' => $request->strengths,
            'weaknesses' => $request->weaknesses,
            'comments' => $request->comments,
            'recommendation' => $request->recommendation,
        ]);

        Interview::where('id', $request->interview_id)->update(['feedback_submitted' => true]);

        return redirect()->back()->with('success', __('Interview feedback updated successfully'));
    }

    public function destroy(InterviewFeedback $interviewFeedback)
    {
        if (!in_array($interviewFeedback->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to delete this feedback'));
        }

        $interviewId = $interviewFeedback->interview_id;
        $interviewFeedback->delete();

        $remainingFeedback = InterviewFeedback::where('interview_id', $interviewId)->exists();
        Interview::where('id', $interviewId)->update(['feedback_submitted' => $remainingFeedback]);

        return redirect()->back()->with('success', __('Interview feedback deleted successfully'));
    }

    public function getInterviewers(Interview $interview)
    {
        if (!in_array($interview->created_by, getCompanyAndUsersId())) {
            return response()->json([]);
        }

        $interviewers = User::whereIn('id', $interview->interviewers)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->select('id', 'name')
            ->get();

        return response()->json($interviewers);
    }
}
