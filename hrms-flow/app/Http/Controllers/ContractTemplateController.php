<?php

namespace App\Http\Controllers;

use App\Models\ContractTemplate;
use App\Models\ContractType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;

class ContractTemplateController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-contract-templates')) {
            $query = ContractTemplate::with(['contractType'])->where(function ($q) {
                if (Auth::user()->can('manage-any-contract-templates')) {
                    $q->whereIn('created_by',  getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-contract-templates')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                        ->orWhere('description', 'like', '%' . $request->search . '%');
                });
            }

            if ($request->has('contract_type_id') && !empty($request->contract_type_id) && $request->contract_type_id !== 'all') {
                $query->where('contract_type_id', $request->contract_type_id);
            }

            if ($request->has('is_default') && $request->is_default !== 'all') {
                $query->where('is_default', $request->is_default === 'true');
            }

            // Status counts
            $statusCounts = [
                'all'      => (clone $query)->count(),
                'active'   => (clone $query)->where('status', 'active')->count(),
                'inactive' => (clone $query)->where('status', 'inactive')->count(),
            ];

            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $allowedSortFields = ['id', 'name', 'status', 'is_default', 'created_at'];
            if ($request->has('sort_field') && !empty($request->sort_field)) {
                $sortField = $request->sort_field === 'template_name' ? 'name' : $request->sort_field;
                if (in_array($sortField, $allowedSortFields)) {
                    $sortDirection = in_array($request->sort_direction, ['asc', 'desc']) ? $request->sort_direction : 'asc';
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('is_default', 'desc')->orderBy('id', 'desc');
                }
            } else {
                $query->orderBy('is_default', 'desc')->orderBy('id', 'desc');
            }

            $contractTemplates = $query->paginate($request->per_page ?? 10);

            $contractTypes = ContractType::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/contracts/contract-templates/index', [
                'contractTemplates' => $contractTemplates,
                'statusCounts'      => $statusCounts,
                'contractTypes'     => $contractTypes,
                'filters' => $request->all(['search', 'contract_type_id', 'status', 'is_default', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function create()
    {
        if (Auth::user()->can('create-contract-templates')) {
            $contractTypes = ContractType::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/contracts/contract-templates/create', [
                'contractTypes' => $contractTypes,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function show(ContractTemplate $contractTemplate)
    {
        if (Auth::user()->can('view-contract-templates')) {
            $contractTemplate->load('contractType');
            return Inertia::render('hr/contracts/contract-templates/show', [
                'contractTemplate' => $contractTemplate,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function edit(ContractTemplate $contractTemplate)
    {
        if (Auth::user()->can('edit-contract-templates')) {
            $contractTypes = ContractType::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/contracts/contract-templates/edit', [
                'contractTemplate' => $contractTemplate,
                'contractTypes' => $contractTypes,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        if (Auth::user()->can('create-contract-templates')) {
            $variables = null;
            if ($request->filled('variables') && is_string($request->variables)) {
                $variables = array_values(array_filter(array_map('trim', explode(',', $request->variables))));
            } elseif (is_array($request->variables)) {
                $variables = $request->variables;
            }

            $clauses = null;
            if ($request->filled('clauses') && is_string($request->clauses)) {
                $clauses = array_values(array_filter(array_map('trim', explode(',', $request->clauses))));
            } elseif (is_array($request->clauses)) {
                $clauses = $request->clauses;
            }

            $validator = Validator::make(array_merge($request->all(), [
                'variables' => $variables,
                'clauses'   => $clauses,
            ]), [
                'name'             => 'required|string|max:255',
                'description'      => 'nullable|string',
                'contract_type_id' => 'required|exists:contract_types,id',
                'template_content' => 'required|string',
                'variables'        => 'required|array',
                'clauses'          => 'nullable|array',
                'is_default'       => 'boolean',
                'status'           => 'nullable|string|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            if ($request->boolean('is_default')) {
                ContractTemplate::whereIn('created_by', getCompanyAndUsersId())
                    ->where('contract_type_id', $request->contract_type_id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            ContractTemplate::create([
                'name'             => $request->name,
                'description'      => $request->description,
                'contract_type_id' => $request->contract_type_id,
                'template_content' => $request->template_content,
                'variables'        => $variables,
                'clauses'          => $clauses,
                'is_default'       => $request->boolean('is_default'),
                'status'           => $request->status ?? 'active',
                'created_by'       => creatorId(),
            ]);

            return redirect()->route('hr.contracts.contract-templates.index')
                ->with('success', __('Contract template created successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function update(Request $request, ContractTemplate $contractTemplate)
    {
        if (Auth::user()->can('edit-contract-templates')) {
            if (!in_array($contractTemplate->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to update this template'));
            }

            $variables = null;
            if ($request->filled('variables') && is_string($request->variables)) {
                $variables = array_values(array_filter(array_map('trim', explode(',', $request->variables))));
            } elseif (is_array($request->variables)) {
                $variables = $request->variables;
            }

            $clauses = null;
            if ($request->filled('clauses') && is_string($request->clauses)) {
                $clauses = array_values(array_filter(array_map('trim', explode(',', $request->clauses))));
            } elseif (is_array($request->clauses)) {
                $clauses = $request->clauses;
            }

            $validator = Validator::make(array_merge($request->all(), [
                'variables' => $variables,
                'clauses'   => $clauses,
            ]), [
                'name'             => 'required|string|max:255',
                'description'      => 'nullable|string',
                'contract_type_id' => 'required|exists:contract_types,id',
                'template_content' => 'required|string',
                'variables'        => 'required|array',
                'clauses'          => 'nullable|array',
                'is_default'       => 'boolean',
                'status'           => 'nullable|string|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            if ($request->boolean('is_default') && !$contractTemplate->is_default) {
                ContractTemplate::whereIn('created_by', getCompanyAndUsersId())
                    ->where('contract_type_id', $request->contract_type_id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            $contractTemplate->update([
                'name'             => $request->name,
                'description'      => $request->description,
                'contract_type_id' => $request->contract_type_id,
                'template_content' => $request->template_content,
                'variables'        => $variables,
                'clauses'          => $clauses,
                'is_default'       => $request->boolean('is_default'),
                'status'           => $request->status ?? 'active',
            ]);

            return redirect()->route('hr.contracts.contract-templates.index')
                ->with('success', __('Contract template updated successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function destroy(ContractTemplate $contractTemplate)
    {
        if (Auth::user()->can('delete-contract-templates')) {
            if (!in_array($contractTemplate->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to delete this template'));
            }
            try {
                $contractTemplate->delete();
                return redirect()->back()->with('success', __('Contract template deleted successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete contract template'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function toggleStatus(ContractTemplate $contractTemplate)
    {
        if (Auth::user()->can('edit-contract-templates')) {
            if (!in_array($contractTemplate->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to update this template'));
            }
            try {
                $contractTemplate->update([
                    'status' => $contractTemplate->status === 'active' ? 'inactive' : 'active',
                ]);
                return redirect()->back()->with('success', __('Template status updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update template status'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function preview(Request $request, ContractTemplate $contractTemplate)
    {
        if (!in_array($contractTemplate->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to preview this template'));
        }

        $variables = $request->get('variables', []);
        $generatedContent = $contractTemplate->generateContract($variables);

        return response()->json([
            'content' => $generatedContent,
            'variables' => $contractTemplate->variables,
        ]);
    }

    public function generate(Request $request, ContractTemplate $contractTemplate)
    {

        $variables = $request->variables ?? [];

        if (!is_array($variables)) {
            $variables = [];
        }

        $generatedContent = $contractTemplate->generateContract($variables);
        $filename = $request->filename ?? ($contractTemplate->name . '_' . date('Y-m-d'));

        $html = '<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">' . nl2br($generatedContent) . '</div>';
        $pdf = Pdf::loadHTML($html);
        return $pdf->download($filename . '.pdf');
    }
}
