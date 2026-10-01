<?php

namespace App\Http\Controllers;

use App\Models\TrainingAssessment;
use App\Models\TrainingProgram;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class TrainingAssessmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-training-assessments')) {
            $query = TrainingAssessment::with(['trainingProgram'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-training-assessments')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-training-assessments')) {
                        $q->where('created_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });

            // Handle search
            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                        ->orWhere('description', 'like', '%' . $request->search . '%')
                        ->orWhereHas('trainingProgram', function ($q) use ($request) {
                            $q->where('name', 'like', '%' . $request->search . '%');
                        });
                });
            }

            // Handle program filter
            if ($request->has('training_program_id') && !empty($request->training_program_id)) {
                $query->where('training_program_id', $request->training_program_id);
            }

            // Type counts
            $typeCounts = [
                'all' => (clone $query)->count(),
                'quiz' => (clone $query)->where('type', 'quiz')->count(),
                'practical' => (clone $query)->where('type', 'practical')->count(),
                'presentation' => (clone $query)->where('type', 'presentation')->count(),
            ];

            // Handle type filter
            if ($request->has('type') && !empty($request->type)) {
                $query->where('type', $request->type);
            }

            // Handle sorting
            $allowedSortFields = ['name', 'type', 'passing_score', 'created_at'];

            if ($request->has('sort_field') && !empty($request->sort_field)) {
                $sortField = $request->sort_field;
                $sortDirection = in_array($request->sort_direction, ['asc', 'desc']) ? $request->sort_direction : 'asc';

                if ($sortField === 'program_name') {
                    $query->join('training_programs', 'training_assessments.training_program_id', '=', 'training_programs.id')
                        ->select('training_assessments.*')
                        ->orderBy('training_programs.name', $sortDirection);
                } elseif (in_array($sortField, $allowedSortFields)) {
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('name', 'asc');
                }
            } else {
                $query->orderBy('name', 'asc');
            }

            // Add employee results count
            $query->withCount(['employeeResults']);

            $trainingAssessments = $query->paginate($request->per_page ?? 10);

            // Get training programs for filter dropdown
            $trainingPrograms = TrainingProgram::where('created_by', createdBy())
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/training/assessments/index', [
                'trainingAssessments' => $trainingAssessments,
                'typeCounts' => $typeCounts,
                'trainingPrograms' => $trainingPrograms,
                'filters' => $request->all(['search', 'training_program_id', 'type', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (Auth::user()->can('create-training-assessments')) {
            $validator = Validator::make($request->all(), [
                'training_program_id' => 'required|exists:training_programs,id',
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'type' => 'required|string|in:quiz,practical,presentation',
                'passing_score' => 'required|numeric|min:0|max:100',
                'criteria' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            // Check if training program belongs to current company
            $trainingProgram = TrainingProgram::find($request->training_program_id);
            if (!$trainingProgram || $trainingProgram->created_by != createdBy()) {
                return redirect()->back()->with('error', __('Invalid training program selected'));
            }

            TrainingAssessment::create([
                'training_program_id' => $request->training_program_id,
                'name' => $request->name,
                'description' => $request->description,
                'type' => $request->type,
                'passing_score' => $request->passing_score,
                'criteria' => $request->criteria,
                'created_by' => createdBy(),
            ]);

            return redirect()->back()->with('success', __('Training assessment created successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(TrainingAssessment $trainingAssessment)
    {
        if (Auth::user()->can('view-training-assessments')) {
            // Check ownership based on any/own permission
            $canAccess = Auth::user()->can('manage-any-training-assessments')
                ? in_array($trainingAssessment->created_by, getCompanyAndUsersId())
                : $trainingAssessment->created_by === Auth::id();

            if (!$canAccess) {
                return redirect()->back()->with('error', __('You do not have permission to view this training assessment'));
            }

            // Load relationships
            $trainingAssessment->load([
                'trainingProgram',
                'creator',
                'employeeResults.employeeTraining.employee.employee',
                'employeeResults.assessor',
            ]);

            // Calculate statistics
            $totalResults = $trainingAssessment->employeeResults->count();
            $passedResults = $trainingAssessment->employeeResults->where('is_passed', true)->count();
            $failedResults = $totalResults - $passedResults;
            $passRate = $totalResults > 0 ? ($passedResults / $totalResults) * 100 : 0;
            $averageScore = $totalResults > 0 ? $trainingAssessment->employeeResults->avg('score') : 0;

            return Inertia::render('hr/training/assessments/show', [
                'trainingAssessment' => $trainingAssessment,
                'statistics' => [
                    'totalResults' => $totalResults,
                    'passedResults' => $passedResults,
                    'failedResults' => $failedResults,
                    'passRate' => $passRate,
                    'averageScore' => $averageScore,
                ],
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TrainingAssessment $trainingAssessment)
    {
        if (Auth::user()->can('edit-training-assessments')) {
            // Check ownership based on any/own permission
            $canAccess = Auth::user()->can('manage-any-training-assessments')
                ? in_array($trainingAssessment->created_by, getCompanyAndUsersId())
                : $trainingAssessment->created_by === Auth::id();

            if (!$canAccess) {
                return redirect()->back()->with('error', __('You do not have permission to update this training assessment'));
            }

            $validator = Validator::make($request->all(), [
                'training_program_id' => 'required|exists:training_programs,id',
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'type' => 'required|string|in:quiz,practical,presentation',
                'passing_score' => 'required|numeric|min:0|max:100',
                'criteria' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            // Check if training program belongs to current company
            $trainingProgram = TrainingProgram::find($request->training_program_id);
            if (!$trainingProgram || $trainingProgram->created_by != createdBy()) {
                return redirect()->back()->with('error', __('Invalid training program selected'));
            }

            $trainingAssessment->update([
                'training_program_id' => $request->training_program_id,
                'name' => $request->name,
                'description' => $request->description,
                'type' => $request->type,
                'passing_score' => $request->passing_score,
                'criteria' => $request->criteria,
            ]);

            return redirect()->back()->with('success', __('Training assessment updated successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TrainingAssessment $trainingAssessment)
    {
        if (Auth::user()->can('delete-training-assessments')) {
            // Check ownership based on any/own permission
            $canAccess = Auth::user()->can('manage-any-training-assessments')
                ? in_array($trainingAssessment->created_by, getCompanyAndUsersId())
                : $trainingAssessment->created_by === Auth::id();

            if (!$canAccess) {
                return redirect()->back()->with('error', __('You do not have permission to delete this training assessment'));
            }

            // Check if assessment has results
            if ($trainingAssessment->employeeResults()->count() > 0) {
                return redirect()->back()->with('error', __('Cannot delete assessment that has employee results'));
            }

            $trainingAssessment->delete();

            return redirect()->back()->with('success', __('Training assessment deleted successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }
}