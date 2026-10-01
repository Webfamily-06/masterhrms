<?php

namespace App\Http\Controllers;

use App\Models\ContractType;
use App\Models\EmployeeContract;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class EmployeeContractController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-employee-contracts')) {
            $query = EmployeeContract::with(['employee', 'contractType', 'approver'])->where(function ($q) {
                if (Auth::user()->can('manage-any-employee-contracts')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-employee-contracts')) {
                    $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id())->orWhere('approved_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            if ($request->has('search') && ! empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('contract_number', 'like', '%'.$request->search.'%')
                        ->orWhereHas('employee', function ($eq) use ($request) {
                            $eq->where('name', 'like', '%'.$request->search.'%');
                        });
                });
            }

            if ($request->has('contract_type_id') && ! empty($request->contract_type_id) && $request->contract_type_id !== 'all') {
                $query->where('contract_type_id', $request->contract_type_id);
            }

            if ($request->has('employee_id') && ! empty($request->employee_id) && $request->employee_id !== 'all') {
                $query->where('employee_id', $request->employee_id);
            }

            // Status counts
            $statusCounts = [
                'all'              => (clone $query)->count(),
                'Draft'            => (clone $query)->where('status', 'Draft')->count(),
                'Pending Approval' => (clone $query)->where('status', 'Pending Approval')->count(),
                'Active'           => (clone $query)->where('status', 'Active')->count(),
                'Expired'          => (clone $query)->where('status', 'Expired')->count(),
                'Terminated'       => (clone $query)->where('status', 'Terminated')->count(),
                'Renewed'          => (clone $query)->where('status', 'Renewed')->count(),
            ];

            if ($request->has('status') && ! empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Handle sorting
            $allowedSortFields = ['id', 'contract_number', 'start_date', 'end_date', 'basic_salary', 'status', 'created_at'];

            if ($request->has('sort_field') && ! empty($request->sort_field)) {
                $sortField = $request->sort_field;
                $sortDirection = in_array($request->sort_direction, ['asc', 'desc']) ? $request->sort_direction : 'asc';

                if ($sortField === 'contract' || $sortField === 'contract_type') {
                    $query->join('contract_types', 'employee_contracts.contract_type_id', '=', 'contract_types.id')
                        ->select('employee_contracts.*')
                        ->orderBy('contract_types.name', $sortDirection);
                } elseif ($sortField === 'contract_period') {
                    $query->orderBy('start_date', $sortDirection);
                } elseif (in_array($sortField, $allowedSortFields)) {
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('id', 'desc');
                }
            } else {
                $query->orderBy('id', 'desc');
            }

            // Auto-update expired contracts
            EmployeeContract::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'Active')
                ->where('end_date', '<', Carbon::today())
                ->update(['status' => 'Expired']);
            $employeeContracts = $query->paginate($request->per_page ?? 10);

            // Calculate stats based on same permission scope as main query
            $statsQuery = function () {
                return EmployeeContract::where(function ($q) {
                    if (Auth::user()->can('manage-any-employee-contracts')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-employee-contracts')) {
                        $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id())->orWhere('approved_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });
            };

            $stats = [
                'active' => $statsQuery()
                    ->where('status', 'Active')
                    ->count(),
                'near_expiry' => $statsQuery()
                    ->where('status', 'Active')
                    ->whereNotNull('end_date')
                    ->where('end_date', '<=', Carbon::today()->addDays(30))
                    ->where('end_date', '>=', Carbon::today())
                    ->count(),
                'draft' => $statsQuery()
                    ->where('status', 'Draft')
                    ->count(),
            ];

            $employeeContracts->getCollection()->transform(function ($contract) {
                if ($contract->employee) {
                    $rawAvatar = $contract->employee->getRawOriginal('avatar');
                    $contract->employee->avatar = check_file($rawAvatar)
                        ? get_file($rawAvatar)
                        : get_file('avatars/avatar.png');
                }

                return $contract;
            });

            $contractTypes = ContractType::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            $employees = User::whereIn('created_by', getCompanyAndUsersId())
                ->where('type', 'employee')
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/contracts/employee-contracts/index', [
                'employeeContracts' => $employeeContracts,
                'statusCounts' => $statusCounts,
                'contractTypes' => $contractTypes,
                'employees' => $employees,
                'stats' => $stats,
                'filters' => $request->all(['search', 'status', 'contract_type_id', 'employee_id', 'per_page', 'sort_field', 'sort_direction']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id'      => 'required|exists:users,id',
            'contract_type_id' => 'required|exists:contract_types,id',
            'start_date'       => 'required|date',
            'basic_salary'     => 'required|numeric|min:0',
            'terms_conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Use provided end_date or auto-calculate from contract type duration
        $endDate = $request->end_date ?? null;
        if (!$endDate) {
            $contractType = ContractType::find($request->contract_type_id);
            if ($contractType && $contractType->default_duration_months) {
                $endDate = Carbon::parse($request->start_date)
                    ->addMonths($contractType->default_duration_months)
                    ->toDateString();
            }
        }

        // Check for duplicate contract
        $existingContract = EmployeeContract::where('employee_id', $request->employee_id)
            ->where('contract_type_id', $request->contract_type_id)
            ->first();

        if ($existingContract) {
            return redirect()->back()->with('error', __('A contract with the same details already exists for this employee.'));
        }

        // Generate contract number
        $lastContract = EmployeeContract::whereIn('created_by', getCompanyAndUsersId())
            ->orderBy('id', 'desc')
            ->first();
        $nextNumber = $lastContract ? (intval(substr($lastContract->contract_number, -4)) + 1) : 1;
        $contractNumber = 'CON-'.str_pad(creatorId(), 3, '0', STR_PAD_LEFT).'-'.str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        EmployeeContract::create([
            'contract_number'  => $contractNumber,
            'employee_id'      => $request->employee_id,
            'contract_type_id' => $request->contract_type_id,
            'start_date'       => $request->start_date,
            'end_date'         => $endDate,
            'basic_salary'     => $request->basic_salary,
            'terms_conditions' => $request->terms_conditions,
            'created_by'       => creatorId(),
        ]);

        return redirect()->back()->with('success', __('Employee contract created successfully'));
    }

    public function update(Request $request, EmployeeContract $employeeContract)
    {
        if (! in_array($employeeContract->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this contract'));
        }

        $validator = Validator::make($request->all(), [
            'employee_id'      => 'required|exists:users,id',
            'contract_type_id' => 'required|exists:contract_types,id',
            'start_date'       => 'required|date',
            'basic_salary'     => 'required|numeric|min:0',
            'terms_conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Use provided end_date or auto-calculate from contract type duration
        $endDate = $request->end_date ?? null;
        if (!$endDate) {
            $contractType = ContractType::find($request->contract_type_id);
            if ($contractType && $contractType->default_duration_months) {
                $endDate = Carbon::parse($request->start_date)
                    ->addMonths($contractType->default_duration_months)
                    ->toDateString();
            }
        }

        // Check for duplicate contract (excluding current contract)
        $existingContract = EmployeeContract::where('employee_id', $request->employee_id)
            ->where('contract_type_id', $request->contract_type_id)
            ->where('start_date', $request->start_date)
            ->where('id', '!=', $employeeContract->id)
            ->first();

        if ($existingContract) {
            return redirect()->back()->with('error', __('A contract with the same details already exists for this employee.'));
        }

        $employeeContract->update([
            'employee_id'      => $request->employee_id,
            'contract_type_id' => $request->contract_type_id,
            'start_date'       => $request->start_date,
            'end_date'         => $endDate,
            'basic_salary'     => $request->basic_salary,
            'terms_conditions' => $request->terms_conditions,
        ]);

        return redirect()->back()->with('success', __('Employee contract updated successfully'));
    }

    public function destroy(EmployeeContract $employeeContract)
    {
        if (! in_array($employeeContract->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to delete this contract'));
        }

        if ($employeeContract->status === 'Active') {
            return redirect()->back()->with('error', __('Cannot delete active contract'));
        }

        $employeeContract->delete();

        return redirect()->back()->with('success', __('Employee contract deleted successfully'));
    }

    public function updateStatus(Request $request, EmployeeContract $employeeContract)
    {
        if (Auth::user()->can('approve-employee-contracts') || Auth::user()->can('reject-employee-contracts')) {
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:Draft,Pending Approval,Active,Expired,Terminated,Renewed',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator);
            }

            $updateData = ['status' => $request->status];

            if ($request->status === 'Active') {
                $updateData['approved_by'] = creatorId();
                $updateData['approved_at'] = now();
            }

            $employeeContract->update($updateData);

            return redirect()->back()->with('success', __('Contract status updated successfully'));
        } else {
            return redirect()->back()->with('error', __('You do not have permission to update this contract'));
        }
    }

    public function approve(Request $request, EmployeeContract $employeeContract)
    {
        if (! in_array($employeeContract->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to approve this contract'));
        }

        $employeeContract->update([
            'status' => 'Active',
            'approved_by' => creatorId(),
            'approved_at' => now(),
            'approval_notes' => $request->approval_notes,
        ]);

        return redirect()->back()->with('success', __('Contract approved successfully'));
    }

    public function reject(Request $request, EmployeeContract $employeeContract)
    {
        if (! in_array($employeeContract->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to reject this contract'));
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }

        $employeeContract->update([
            'status' => 'Draft',
            'rejection_reason' => $request->rejection_reason,
            'rejected_by' => creatorId(),
            'rejected_at' => now(),
        ]);

        return redirect()->back()->with('success', __('Contract rejected successfully'));
    }
}
