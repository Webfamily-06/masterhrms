<?php

namespace App\Http\Controllers;

use App\Models\Promotion;
use App\Models\User;
use App\Models\Designation;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class PromotionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-promotions')) {
            $query = Promotion::with(['employee', 'designation', 'prevDesignation'])->where(function ($q) {
                if (Auth::user()->can('manage-any-promotions')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-promotions')) {
                    $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            // Handle search
            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($promotionQuery) use ($request) {
                    $promotionQuery->whereHas('employee', function ($q) use ($request) {
                        $q->where('name', 'like', '%' . $request->search . '%')
                            ->orWhere('employee_id', 'like', '%' . $request->search . '%');
                    })
                        ->orWhereHas('designation', function ($q) use ($request) {
                            $q->where('name', 'like', '%' . $request->search . '%');
                        })
                        ->orWhere('previous_designation', 'like', '%' . $request->search . '%')
                        ->orWhere('reason', 'like', '%' . $request->search . '%');
                });
            }

            // Handle employee filter
            if ($request->has('employee_id') && !empty($request->employee_id)) {
                $query->where('employee_id', $request->employee_id);
            }

            // Handle designation filter
            if ($request->has('designation_id') && !empty($request->designation_id)) {
                $query->where('designation_id', $request->designation_id);
            }

            // Handle date range filter
            if ($request->has('date_from') && !empty($request->date_from)) {
                $query->whereDate('promotion_date', '>=', $request->date_from);
            }
            if ($request->has('date_to') && !empty($request->date_to)) {
                $query->whereDate('promotion_date', '<=', $request->date_to);
            }

            $statusCounts = [
                'all' => (clone $query)->count(),
                'pending' => (clone $query)->where('status', 'pending')->count(),
                'approved' => (clone $query)->where('status', 'approved')->count(),
                'rejected' => (clone $query)->where('status', 'rejected')->count(),
            ];

            // Handle status filter
            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Handle sorting
            $sortField = $request->get('sort_field', 'promotion_date');
            $sortDirection = $request->get('sort_direction', 'desc');

            // Validate sort field
            $allowedSortFields = ['promotion_date', 'effective_date', 'id'];
            if (!in_array($sortField, $allowedSortFields)) {
                $sortField = 'promotion_date';
            }

            $query->orderBy($sortField, $sortDirection);

            $promotions = $query->paginate($request->per_page ?? 10);

            $promotions->getCollection()->transform(function ($promotion) {
                if ($promotion->employee) {
                    $rawAvatar = $promotion->employee->getRawOriginal('avatar');
                    $promotion->employee->avatar = check_file($rawAvatar)
                        ? get_file($rawAvatar)
                        : get_file('avatars/avatar.png');
                }
                return $promotion;
            });

            // Get designations for filter dropdown
            $designations = Designation::with(['department.branch'])
                ->whereHas('department', function ($q) {
                    $q->whereHas('branch', function ($q) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    });
                })
                ->where('status', 'active')
                ->select('id', 'name', 'department_id')
                ->get();

            return Inertia::render('hr/promotions/index', [
                'promotions' => $promotions,
                'employees' => $this->getFilteredEmployees(),
                'designations' => $designations,
                'filters' => $request->all(['search', 'employee_id', 'designation_id', 'status', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page']),
                'statusCounts' => $statusCounts,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    private function getFilteredEmployees()
    {
        // Get employees for filter dropdown (compatible with getFilteredEmployees logic)
        $employeeQuery = Employee::whereIn('created_by', getCompanyAndUsersId());

        if (Auth::user()->can('manage-own-promotions') && !Auth::user()->can('manage-any-promotions')) {
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
                    'employee_id' => $user->employee->employee_id ?? ''
                ];
            });
        return $employees;
    }

    /**
     * Get the current designation of an employee.
     */
    public function getEmployeeDesignation(int $employee_id)
    {
        return Employee::where('user_id', $employee_id)?->value('designation_id');
    }

    /**
     * Get the previous designation of an employee.
     */
    public function getEmployeeCurrentDesignation($employee_id)
    {
        $designation = Employee::with('designation')->where('user_id', $employee_id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->get()
            ->map(function ($employee) {
                return [
                    'value' => $employee?->designation?->id,
                    'label' => $employee?->designation?->name
                ];
            });
        return response()->json($designation);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (Auth::user()->can('create-promotions')) {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:users,id',
                'previous_designation_id' => 'required|exists:designations,id',
                'designation_id' => 'required|exists:designations,id',
                'promotion_date' => 'required|date',
                'effective_date' => 'required|date|after_or_equal:promotion_date',
                'salary_adjustment' => 'nullable|numeric|min:0',
                'reason' => 'nullable|string',
                'document' => 'nullable',
                'status' => 'nullable|string|in:pending,approved,rejected',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            // Check if employee belongs to current company
            $employee = User::find($request->employee_id);
            if (!$employee || !in_array($employee->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('Invalid employee selected'));
            }

            // Check if designation belongs to current company
            $designation = Designation::find($request->designation_id);
            if (!$designation || !$designation->department || !$designation->department->branch || !in_array($designation->department->branch->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('Invalid designation selected'));
            }

            $promotionData = [
                'employee_id' => $request->employee_id,
                'previous_designation' => $request->previous_designation_id,
                'designation_id' => $request->designation_id,
                'promotion_date' => $request->promotion_date,
                'effective_date' => $request->effective_date,
                'salary_adjustment' => $request->salary_adjustment,
                'reason' => $request->reason,
                'status' => $request->status ?? 'pending',
                'created_by' => creatorId(),
            ];

            // Handle document upload
            if ($request->has('document')) {
                $documentPath = $request->document;
                $promotionData['document'] = $documentPath;
            }

            Promotion::create($promotionData);

            if($promotionData['status'] === 'approved'){
                Employee::where('user_id', $promotionData['employee_id'])->update(
                    ['designation_id' => $request->designation_id]
                );
            }

            return redirect()->back()->with('success', __('Promotion created successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Promotion $promotion)
    {
        if (Auth::user()->can('edit-promotions')) {
            // Check if promotion belongs to current company
            if (!in_array($promotion->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to update this promotion'));
            }

            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:users,id',
                'designation_id' => 'required|exists:designations,id',
                'promotion_date' => 'required|date',
                'effective_date' => 'required|date|after_or_equal:promotion_date',
                'salary_adjustment' => 'nullable|numeric|min:0',
                'reason' => 'nullable|string',
                'document' => 'nullable',
                'status' => 'nullable|string|in:pending,approved,rejected',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            // Check if employee belongs to current company
            $employee = User::find($request->employee_id);
            if (!$employee || !in_array($employee->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('Invalid employee selected'));
            }

            // Check if designation belongs to current company
            $designation = Designation::find($request->designation_id);
            if (!$designation || !$designation->department || !$designation->department->branch || !in_array($designation->department->branch->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('Invalid designation selected'));
            }
            $promotion->load('prevDesignation');

            $promotionData = [
                'employee_id' => $request->employee_id,
                'previous_designation' => $promotion->prevDesignation ? $promotion->previous_designation : $this->getEmployeeDesignation($request->employee_id),
                'designation_id' => $request->designation_id,
                'promotion_date' => $request->promotion_date,
                'effective_date' => $request->effective_date,
                'salary_adjustment' => $request->salary_adjustment,
                'reason' => $request->reason,
                'status' => $request->status ?? 'pending',
            ];

            // Handle document upload
            if ($request->has('document')) {
                $documentPath = $request->document;
                $promotionData['document'] = $documentPath;
            }

            $promotion->update($promotionData);

            if($promotionData['status'] === 'approved'){
                Employee::where('user_id', $promotionData['employee_id'])->update(
                    ['designation_id' => $request->designation_id]
                );
            }

            return redirect()->back()->with('success', __('Promotion updated successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Promotion $promotion)
    {
        if (Auth::user()->can('delete-promotions')) {
            // Check if promotion belongs to current company
            if (!in_array($promotion->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to delete this promotion'));
            }

            $promotion->delete();

            return redirect()->back()->with('success', __('Promotion deleted successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Download document file.
     */
    public function downloadDocument(Promotion $promotion)
    {
        if (Auth::user()->can('view-promotions')) {
            // Check if promotion belongs to current company
            if (!in_array($promotion->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to access this document'));
            }

            if (!$promotion->document) {
                return redirect()->back()->with('error', __('Document file not found'));
            }

            $filePath = getStorageFilePath($promotion->document);

            if (!file_exists($filePath)) {
                return redirect()->back()->with('error', __('Certificate file not found'));
            }

            return response()->download($filePath);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Update the status of the promotion.
     */
    public function updateStatus(Request $request, Promotion $promotion)
    {
        if (Auth::user()->can('approve-promotions') || Auth::user()->can('reject-promotions') || Auth::user()->can('edit-promotions')) {
            // Check if promotion belongs to current company
            if (!in_array($promotion->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to update this promotion'));
            }

            $validator = Validator::make($request->all(), [
                'status' => 'required|string|in:pending,approved,rejected',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            $promotion->update([
                'status' => $request->status,
            ]);

            if($promotion->status === 'approved'){
                Employee::where('user_id', $promotion->employee_id)->update(
                    ['designation_id' => $promotion->designation_id]
                );
            }

            return redirect()->back()->with('success', __('Promotion status updated successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }
}
