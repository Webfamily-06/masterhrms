<?php

namespace App\Http\Controllers;

use App\Models\OfferTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;

class OfferTemplateController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-offer-templates')) {
            $query = OfferTemplate::where(function ($q) {
                if (Auth::user()->can('manage-any-offer-templates')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-offer-templates')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                        ->orWhere('template_content', 'like', '%' . $request->search . '%');
                });
            }

            $statusCounts = [
                'all' => (clone $query)->count(),
                'active' => (clone $query)->where('status', 'active')->count(),
                'inactive' => (clone $query)->where('status', 'inactive')->count(),
            ];

            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $allowedSortFields = ['name', 'created_at'];
            $sortField = $request->get('sort_field');
            $sortDirection = $request->get('sort_direction', 'desc');

            if ($sortField && in_array($sortField, $allowedSortFields)) {
                $query->orderBy($sortField, $sortDirection);
            } else {
                $query->orderBy('created_at', 'desc');
            }

            $offerTemplates = $query->paginate($request->per_page ?? 10);

            return Inertia::render('hr/recruitment/offer-templates/index', [
                'offerTemplates' => $offerTemplates,
                'filters' => $request->all(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
                'statusCounts' => $statusCounts,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function create()
    {
        if (Auth::user()->can('create-offer-templates')) {
            return Inertia::render('hr/recruitment/offer-templates/create');
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function show(OfferTemplate $offerTemplate)
    {
        if (Auth::user()->can('view-offer-templates')) {
            return Inertia::render('hr/recruitment/offer-templates/show', [
                'offerTemplate' => $offerTemplate,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function edit(OfferTemplate $offerTemplate)
    {
        if (Auth::user()->can('edit-offer-templates')) {
            return Inertia::render('hr/recruitment/offer-templates/edit', [
                'offerTemplate' => $offerTemplate,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        if (Auth::user()->can('create-offer-templates')) {
            $variables = null;
            if ($request->filled('variables') && is_string($request->variables)) {
                $variables = array_values(array_filter(array_map('trim', explode(',', $request->variables))));
            } elseif (is_array($request->variables)) {
                $variables = $request->variables;
            }

            $validator = Validator::make(array_merge($request->all(), ['variables' => $variables]), [
                'name'             => 'required|string|max:255',
                'template_content' => 'required|string',
                'variables'        => 'required|array',
                'status'           => 'nullable|string|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            OfferTemplate::create([
                'name'             => $request->name,
                'template_content' => $request->template_content,
                'variables'        => $variables,
                'status'           => $request->status ?? 'active',
                'created_by'       => creatorId(),
            ]);

            return redirect()->route('hr.recruitment.offer-templates.index')
                ->with('success', __('Offer template created successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function update(Request $request, OfferTemplate $offerTemplate)
    {
        if (Auth::user()->can('edit-offer-templates')) {
            if (!in_array($offerTemplate->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to update this template'));
            }

            $variables = null;
            if ($request->filled('variables') && is_string($request->variables)) {
                $variables = array_values(array_filter(array_map('trim', explode(',', $request->variables))));
            } elseif (is_array($request->variables)) {
                $variables = $request->variables;
            }

            $validator = Validator::make(array_merge($request->all(), ['variables' => $variables]), [
                'name'             => 'required|string|max:255',
                'template_content' => 'required|string',
                'variables'        => 'required|array',
                'status'           => 'nullable|string|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            $offerTemplate->update([
                'name'             => $request->name,
                'template_content' => $request->template_content,
                'variables'        => $variables,
                'status'           => $request->status ?? 'active',
            ]);

            return redirect()->route('hr.recruitment.offer-templates.index')
                ->with('success', __('Offer template updated successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function destroy(OfferTemplate $offerTemplate)
    {
        if (Auth::user()->can('delete-offer-templates')) {
            if (!in_array($offerTemplate->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to delete this template'));
            }
            try {
                $offerTemplate->delete();
                return redirect()->back()->with('success', __('Offer template deleted successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete offer template'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function toggleStatus(OfferTemplate $offerTemplate)
    {
        if (Auth::user()->can('edit-offer-templates')) {
            if (!in_array($offerTemplate->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', __('You do not have permission to update this template'));
            }
            try {
                $offerTemplate->update([
                    'status' => $offerTemplate->status === 'active' ? 'inactive' : 'active',
                ]);
                return redirect()->back()->with('success', __('Template status updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update template status'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function preview(Request $request, OfferTemplate $offerTemplate)
    {
        if (!in_array($offerTemplate->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to preview this template'));
        }

        $variables = $request->get('variables', []);
        $generatedContent = $this->generateOfferContent($offerTemplate, $variables);

        return response()->json([
            'content' => $generatedContent,
            'variables' => $offerTemplate->variables,
        ]);
    }

    public function generate(Request $request, OfferTemplate $offerTemplate)
    {

        $variables = $request->variables ?? [];

        if (!is_array($variables)) {
            $variables = [];
        }

        $generatedContent = $this->generateOfferContent($offerTemplate, $variables);
        $filename = $request->filename ?? ($offerTemplate->name . '_' . date('Y-m-d'));

        $html = '<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">' . nl2br($generatedContent) . '</div>';
        $pdf = Pdf::loadHTML($html);
        return $pdf->download($filename . '.pdf');
    }

    private function generateOfferContent(OfferTemplate $offerTemplate, array $variables = [])
    {
        $content = $offerTemplate->template_content;

        if ($offerTemplate->variables && is_array($offerTemplate->variables)) {
            foreach ($offerTemplate->variables as $variable) {
                $value = $variables[$variable] ?? '{{' . $variable . '}}';
                $content = str_replace('{{' . $variable . '}}', $value, $content);
            }
        }

        return $content;
    }
}
