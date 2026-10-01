<?php

namespace App\Http\Controllers;

use App\Models\DocumentCategory;
use App\Models\DocumentTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;

class DocumentTemplateController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-document-templates')) {
            $query = DocumentTemplate::with(['category'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-document-templates')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-document-templates')) {
                        $q->where('created_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });

            if ($request->has('search') && ! empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%'.$request->search.'%')
                        ->orWhere('description', 'like', '%'.$request->search.'%');
                });
            }

            if ($request->has('category_id') && ! empty($request->category_id) && $request->category_id !== 'all') {
                $query->where('category_id', $request->category_id);
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

            if ($request->has('status') && ! empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Handle sorting
            $allowedSortFields = ['id', 'name', 'status', 'is_default', 'created_at'];
            if ($request->has('sort_field') && ! empty($request->sort_field)) {
                $sortField = $request->sort_field === 'template_name' ? 'name' : ($request->sort_field === 'created' ? 'created_at' : $request->sort_field);
                if (in_array($sortField, $allowedSortFields)) {
                    $sortDirection = in_array($request->sort_direction, ['asc', 'desc']) ? $request->sort_direction : 'asc';
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('is_default', 'desc')->orderBy('created_at', 'desc');
                }
            } else {
                $query->orderBy('is_default', 'desc')->orderBy('created_at', 'desc');
            }

            $documentTemplates = $query->paginate($request->per_page ?? 10);

            $categories = DocumentCategory::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/documents/document-templates/index', [
                'documentTemplates' => $documentTemplates,
                'statusCounts' => $statusCounts,
                'categories' => $categories,
                'filters' => $request->all(['search', 'category_id', 'status', 'is_default', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function show(DocumentTemplate $documentTemplate)
    {
        if (Auth::user()->can('view-document-templates')) {
            $documentTemplate->load('category');
            return Inertia::render('hr/documents/document-templates/show', [
                'documentTemplate' => $documentTemplate,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function create()
    {
        if (Auth::user()->can('create-document-templates')) {
            $categories = DocumentCategory::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/documents/document-templates/create', [
                'categories' => $categories,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function edit(DocumentTemplate $documentTemplate)
    {
        if (Auth::user()->can('edit-document-templates')) {
            $categories = DocumentCategory::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            return Inertia::render('hr/documents/document-templates/edit', [
                'documentTemplate' => $documentTemplate,
                'categories' => $categories,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        if (Auth::user()->can('create-document-templates')) {
            // Convert placeholders comma-separated string → array
            $placeholders = null;
            if ($request->filled('placeholders') && is_string($request->placeholders)) {
                $placeholders = array_values(array_filter(array_map('trim', explode(',', $request->placeholders))));
            } elseif (is_array($request->placeholders)) {
                $placeholders = $request->placeholders;
            }

            // Convert default_values JSON string → array
            $defaultValues = null;
            if ($request->filled('default_values') && is_string($request->default_values)) {
                $decoded = json_decode($request->default_values, true);
                $defaultValues = is_array($decoded) ? $decoded : null;
            } elseif (is_array($request->default_values)) {
                $defaultValues = $request->default_values;
            }

            $validator = Validator::make(array_merge($request->all(), [
                'placeholders'   => $placeholders,
                'default_values' => $defaultValues,
            ]), [
                'name'             => 'required|string|max:255',
                'description'      => 'nullable|string',
                'category_id'      => 'required|exists:document_categories,id',
                'template_content' => 'required|string',
                'placeholders'     => 'nullable|array',
                'default_values'   => 'nullable|array',
                'is_default'       => 'boolean',
                'file_format'      => 'nullable|string|in:pdf,doc,docx,txt',
                'status'           => 'nullable|string|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return back()->withErrors($validator)->withInput();
            }

            if ($request->boolean('is_default')) {
                DocumentTemplate::whereIn('created_by', getCompanyAndUsersId())
                    ->where('category_id', $request->category_id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            DocumentTemplate::create([
                'name'             => $request->name,
                'description'      => $request->description,
                'category_id'      => $request->category_id,
                'template_content' => $request->template_content,
                'placeholders'     => $placeholders,
                'default_values'   => $defaultValues,
                'is_default'       => $request->boolean('is_default'),
                'file_format'      => $request->file_format ?? 'pdf',
                'status'           => $request->status ?? 'active',
                'created_by'       => creatorId(),
            ]);

            return redirect()->route('hr.documents.document-templates.index')
                ->with('success', __('Document template created successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function update(Request $request, DocumentTemplate $documentTemplate)
    {
        if (Auth::user()->can('edit-document-templates')) {
            // Convert placeholders comma-separated string → array
            $placeholders = null;
            if ($request->filled('placeholders') && is_string($request->placeholders)) {
                $placeholders = array_values(array_filter(array_map('trim', explode(',', $request->placeholders))));
            } elseif (is_array($request->placeholders)) {
                $placeholders = $request->placeholders;
            }

            // Convert default_values JSON string → array
            $defaultValues = null;
            if ($request->filled('default_values') && is_string($request->default_values)) {
                $decoded = json_decode($request->default_values, true);
                $defaultValues = is_array($decoded) ? $decoded : null;
            } elseif (is_array($request->default_values)) {
                $defaultValues = $request->default_values;
            }

            $validator = Validator::make(array_merge($request->all(), [
                'placeholders'   => $placeholders,
                'default_values' => $defaultValues,
            ]), [
                'name'             => 'required|string|max:255',
                'description'      => 'nullable|string',
                'category_id'      => 'required|exists:document_categories,id',
                'template_content' => 'required|string',
                'placeholders'     => 'nullable|array',
                'default_values'   => 'nullable|array',
                'is_default'       => 'boolean',
                'file_format'      => 'nullable|string|in:pdf,doc,docx,txt',
                'status'           => 'nullable|string|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return back()->withErrors($validator)->withInput();
            }

            if ($request->boolean('is_default') && ! $documentTemplate->is_default) {
                DocumentTemplate::whereIn('created_by', getCompanyAndUsersId())
                    ->where('category_id', $request->category_id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            $documentTemplate->update([
                'name'             => $request->name,
                'description'      => $request->description,
                'category_id'      => $request->category_id,
                'template_content' => $request->template_content,
                'placeholders'     => $placeholders,
                'default_values'   => $defaultValues,
                'is_default'       => $request->boolean('is_default'),
                'file_format'      => $request->file_format ?? 'pdf',
                'status'           => $request->status ?? 'active',
            ]);

            return redirect()->route('hr.documents.document-templates.index')
                ->with('success', __('Document template updated successfully'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function destroy(DocumentTemplate $documentTemplate)
    {
        if (Auth::user()->can('delete-document-templates')) {
            try {
                $documentTemplate->delete();
                return redirect()->back()->with('success', __('Document template deleted successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete document template'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function toggleStatus(DocumentTemplate $documentTemplate)
    {
        if (Auth::user()->can('edit-document-templates')) {
            try {
                $documentTemplate->update([
                    'status' => $documentTemplate->status === 'active' ? 'inactive' : 'active',
                ]);
                return redirect()->back()->with('success', __('Template status updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update template status'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function preview(Request $request, DocumentTemplate $documentTemplate)
    {
        if (Auth::user()->can('view-document-templates')) {
            $values = $request->get('values', []);
            $generatedContent = $documentTemplate->generateDocument($values);

            return response()->json([
                'content' => $generatedContent,
                'placeholders' => $documentTemplate->getPlaceholderList(),
                'default_values' => $documentTemplate->default_values,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function generate(Request $request, DocumentTemplate $documentTemplate)
    {
        $values = $request->values ?? [];

        if (!is_array($values)) {
            $values = [];
        }

        $generatedContent = $documentTemplate->generateDocument($values);
        $filename = $request->filename ?? ($documentTemplate->name.'_'.date('Y-m-d'));
        $fileFormat = $documentTemplate->file_format ?? 'txt';

        switch ($fileFormat) {
            case 'pdf':
                $html = '<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">'.nl2br($generatedContent).'</div>';
                $pdf = Pdf::loadHTML($html);
                return $pdf->download($filename.'.pdf');

            case 'doc':
            case 'docx':
                $phpWord = new PhpWord;
                $section = $phpWord->addSection();

                $lines = explode("\n", $generatedContent);
                foreach ($lines as $line) {
                    if (trim($line) !== '') {
                        $section->addText($line);
                    } else {
                        $section->addTextBreak();
                    }
                }

                $writer = IOFactory::createWriter($phpWord, $fileFormat === 'docx' ? 'Word2007' : 'RTF');
                $tempFile = tempnam(sys_get_temp_dir(), 'document');
                $writer->save($tempFile);

                $contentType = $fileFormat === 'docx'
                    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    : 'application/msword';

                return response()->download($tempFile, $filename.'.'.$fileFormat, [
                    'Content-Type' => $contentType,
                ])->deleteFileAfterSend(true);

            default: // txt
                return response($generatedContent)
                    ->header('Content-Type', 'text/plain')
                    ->header('Content-Disposition', 'attachment; filename="'.$filename.'.txt"');
        }
    }
}
