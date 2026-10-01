<?php

namespace App\Http\Controllers;

use App\Models\HrDocument;
use App\Models\DocumentCategory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class HrDocumentController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-hr-documents')) {
            $query = HrDocument::with(['category', 'uploader', 'approver'])->where(function ($q) {
                if (Auth::user()->can('manage-any-hr-documents')) {
                    $q->whereIn('created_by',  getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-hr-documents')) {
                    $q->where('created_by', Auth::id())->orWhere('uploaded_by', Auth::id())->orWhere('approved_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('title', 'like', '%' . $request->search . '%')
                        ->orWhere('description', 'like', '%' . $request->search . '%')
                        ->orWhere('file_name', 'like', '%' . $request->search . '%');
                });
            }

            if ($request->has('category_id') && !empty($request->category_id) && $request->category_id !== 'all') {
                $query->where('category_id', $request->category_id);
            }

            // Status counts
            $statusCounts = [
                'all'          => (clone $query)->count(),
                'Draft'        => (clone $query)->where('status', 'Draft')->count(),
                'Under Review' => (clone $query)->where('status', 'Under Review')->count(),
                'Approved'     => (clone $query)->where('status', 'Approved')->count(),
                'Published'    => (clone $query)->where('status', 'Published')->count(),
                'Archived'     => (clone $query)->where('status', 'Archived')->count(),
                'Expired'      => (clone $query)->where('status', 'Expired')->count(),
            ];

            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }



            // Auto-update expired documents
            HrDocument::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', '!=', 'Expired')
                ->where('expiry_date', '<', Carbon::today())
                ->update(['status' => 'Expired']);

            // Handle sorting
            $allowedSortFields = ['id', 'title', 'status', 'effective_date', 'expiry_date', 'download_count', 'created_at'];
            if ($request->has('sort_field') && !empty($request->sort_field)) {
                $sortField = $request->sort_field;
                if ($sortField === 'document') {
                    $sortField = 'title';
                } elseif ($sortField === 'expires') {
                    $sortField = 'expiry_date';
                }
                
                if (in_array($sortField, $allowedSortFields)) {
                    $sortDirection = in_array($request->sort_direction, ['asc', 'desc']) ? $request->sort_direction : 'asc';
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('id', 'desc');
                }
            } else {
                $query->orderBy('id', 'desc');
            }

            $hrDocuments = $query->paginate($request->per_page ?? 9);

            $hrDocuments->getCollection()->transform(function ($document) {
                $document->file_url = ($document->file_path && check_file($document->file_path))
                    ? get_file($document->file_path)
                    : null;
                
                // Load uploader avatar
                if ($document->uploader) {
                    $rawAvatar = $document->uploader->getRawOriginal('avatar');
                    $document->uploader->avatar = check_file($rawAvatar)
                        ? get_file($rawAvatar)
                        : get_file('avatars/avatar.png');
                }
                
                // Load approver avatar
                if ($document->approver) {
                    $rawAvatar = $document->approver->getRawOriginal('avatar');
                    $document->approver->avatar = check_file($rawAvatar)
                        ? get_file($rawAvatar)
                        : get_file('avatars/avatar.png');
                }
                
                return $document;
            });

            $categories = DocumentCategory::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->select('id', 'name')
                ->get();

            // Stats — always based on ALL documents, never affected by filters
            $statsQuery = HrDocument::whereIn('created_by', getCompanyAndUsersId());
            $stats = [
                'total'                => (clone $statsQuery)->count(),
                'published'            => (clone $statsQuery)->where('status', 'Published')->count(),
                'expiring_soon'        => (clone $statsQuery)->whereNotNull('expiry_date')
                                            ->where('expiry_date', '>', Carbon::today())
                                            ->where('expiry_date', '<=', Carbon::today()->addDays(30))
                                            ->count(),
                'needs_acknowledgment' => (clone $statsQuery)->where('requires_acknowledgment', true)->count(),
            ];

            return Inertia::render('hr/documents/hr-documents/index', [
                'hrDocuments'  => $hrDocuments,
                'statusCounts' => $statusCounts,
                'categories'   => $categories,
                'stats'        => $stats,
                'filters'     => $request->all(['search', 'category_id', 'status', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:document_categories,id',
            'file' => 'required|string',
            'effective_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:effective_date',
            'requires_acknowledgment' => 'boolean',
        ]);
        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator->errors())->withInput();
        }

        // Extract filename from URL or use default
        $fileUrl = $request->file;
        $fileName = basename(parse_url($fileUrl, PHP_URL_PATH)) ?: 'document_' . time();

        HrDocument::create([
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'file_name' => $fileName,
            'file_path' => $fileUrl,
            'file_type' => 'application/octet-stream',
            'file_size' => 0,
            'effective_date' => $request->effective_date,
            'expiry_date' => $request->expiry_date,
            'requires_acknowledgment' => $request->boolean('requires_acknowledgment'),
            'uploaded_by' => creatorId(),
            'created_by' => creatorId(),
        ]);

        return redirect()->back()->with('success', __('Document uploaded successfully'));
    }

    public function update(Request $request, HrDocument $hrDocument)
    {
        if (!in_array($hrDocument->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this document'));
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:document_categories,id',
            'file' => 'nullable|string',
            'effective_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:effective_date',
            'requires_acknowledgment' => 'boolean',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator->errors())->withInput();
        }

        $updateData = [
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'effective_date' => $request->effective_date,
            'expiry_date' => $request->expiry_date,
            'requires_acknowledgment' => $request->boolean('requires_acknowledgment'),
        ];

        // Handle file replacement from media library
        if ($request->has('file') && !empty($request->file)) {
            $fileUrl = $request->file;
            $fileName = basename(parse_url($fileUrl, PHP_URL_PATH)) ?: 'document_' . time();

            $updateData = array_merge($updateData, [
                'file_name' => $fileName,
                'file_path' => $fileUrl,
                'file_type' => 'application/octet-stream',
                'file_size' => 0,
                'version' => $this->incrementVersion($hrDocument->version),
            ]);
        }

        $hrDocument->update($updateData);

        return redirect()->back()->with('success', __('Document updated successfully'));
    }

    public function destroy(HrDocument $hrDocument)
    {
        if (!in_array($hrDocument->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to delete this document'));
        }

        $hrDocument->delete();
        return redirect()->back()->with('success', __('Document deleted successfully'));
    }

    public function download(HrDocument $hrDocument)
    {
        if (!in_array($hrDocument->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to download this document'));
        }

        // Increment download count
        $hrDocument->increment('download_count');


        $filePath = getStorageFilePath($hrDocument->file_path);

        if (!file_exists($filePath)) {
            return redirect()->back()->with('error', __('Certificate file not found'));
        }

        return response()->download($filePath);
    }

    public function updateStatus(Request $request, HrDocument $hrDocument)
    {
        if (!in_array($hrDocument->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this document'));
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Draft,Under Review,Approved,Published,Archived,Expired',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator->errors());
        }

        $updateData = ['status' => $request->status];

        if ($request->status === 'Approved' && !$hrDocument->approved_at) {
            $updateData['approved_by'] = creatorId();
            $updateData['approved_at'] = now();
        }

        $hrDocument->update($updateData);
        return redirect()->back()->with('success', __('Document status updated successfully'));
    }

    private function incrementVersion($currentVersion)
    {
        $parts = explode('.', $currentVersion);
        $parts[1] = isset($parts[1]) ? (int)$parts[1] + 1 : 1;
        return implode('.', $parts);
    }
}
