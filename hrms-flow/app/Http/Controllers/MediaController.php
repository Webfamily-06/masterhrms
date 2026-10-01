<?php

namespace App\Http\Controllers;

use App\Models\MediaDirectory;
use App\Models\MediaItem;
use App\Models\User;
use App\Services\StorageConfigService;
use App\Services\DynamicStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $directoryId = request('directory_id');

        if (!$user->can('manage-media')) {
            return response()->json(['error' => __('Permission Denied.')], 403);
        }

        $mediaQuery = Media::query();

        // Apply Any / Own permission scope
        if ($user->can('manage-any-media')) {
            $mediaQuery->whereIn('created_by', getMediaUserIds());
        } elseif ($user->can('manage-own-media')) {
            $mediaQuery->where('created_by', $user->id);
        } else {
            $mediaQuery->whereRaw('1 = 0');
        }

        // Filter by directory
        if ($directoryId) {
            $mediaQuery->where('directory_id', $directoryId);
        }

        $media = $mediaQuery->latest()->get()->map(function ($media) {
            try {
                $url = getImageUrlPrefix() . '/storage/media/' . $media->file_name;
                return [
                    'id' => $media->id,
                    'name' => $media->name,
                    'file_name' => $media->file_name,
                    'url' => $url,
                    'thumb_url' => $url,
                    'size' => $media->size,
                    'mime_type' => $media->mime_type,
                    'creator_id' => $media->creator_id,
                    'directory_id' => $media->directory_id, // Add this field
                    'created_at' => $media->created_at,
                ];
            } catch (\Exception $e) {
                return null;
            }
        })->filter();

        // Get directories with Any / Own permission scope
        $directoriesQuery = MediaDirectory::query()->whereNull('parent_id');

        if ($user->can('manage-any-media-directories')) {
            $directoriesQuery->whereIn('created_by', getMediaUserIds());
        } elseif ($user->can('manage-own-media-directories')) {
            $directoriesQuery->where('created_by', $user->id);
        } else {
            $directoriesQuery->whereRaw('1 = 0');
        }

        $directories = $directoriesQuery->get(['id', 'name', 'slug']);

        return response()->json([
            'media' => $media,
            'directories' => $directories
        ]);
    }

    private function getFullUrl($url)
    {
        if (str_starts_with($url, 'http')) {
            return $url;
        }

        $baseUrl = request()->getSchemeAndHttpHost();
        return $baseUrl . $url;
    }

    private function getUserFriendlyError(\Exception $e, $fileName): string
    {
        $message = $e->getMessage();
        $extension = strtoupper(pathinfo($fileName, PATHINFO_EXTENSION));

        // Handle media library collection errors
        if (str_contains($message, 'was not accepted into the collection')) {
            if (str_contains($message, 'mime:')) {
                return __("File type not allowed : :extension", ['extension' => $extension]);
            }
            return __("File format not supported : :extension", ['extension' => $extension]);
        }

        // Handle storage errors
        if (str_contains($message, 'storage') || str_contains($message, 'disk')) {
            return __("Storage error : :extension", ['extension' => $extension]);
        }

        // Handle file size errors
        if (str_contains($message, 'size') || str_contains($message, 'large')) {
            return __("File too large : :extension", ['extension' => $extension]);
        }

        // Handle permission errors
        if (str_contains($message, 'permission') || str_contains($message, 'denied')) {
            return __("Permission denied : :extension", ['extension' => $extension]);
        }

        // Generic fallback
        return __("Upload failed : :extension", ['extension' => $extension]);
    }

    public function batchStore(Request $request)
    {
        // Check storage limits
        if (isSaaS()) {
            $storageCheck = $this->checkStorageLimit($request->file('files'));
            if ($storageCheck) {
                return $storageCheck;
            }
        }


        $config = StorageConfigService::getStorageConfig();
        $validationRules = StorageConfigService::getFileValidationRules();

        // Custom validation with user-friendly messages
        $allowedTypes = isset($config['allowed_file_types']) && $config['allowed_file_types']
            ? strtoupper(str_replace(',', ', ', $config['allowed_file_types']))
            : __('Please check storage settings');

        $validator = Validator::make($request->all(), [
            'files' => 'required|array',
            'files.*' => array_merge(['file'], $validationRules),
        ], [
            'files.*.mimes' => __('Only specified file types are allowed: :types', [
                'types' => $allowedTypes
            ]),
            'files.*.max' => __('File size cannot exceed :max MB.', ['max' => $config['max_file_size_mb']]),
        ]);


        // Additional file validation
        $allowedExtensions = array_map('trim', explode(',', strtolower($config['allowed_file_types'])));
        $allowedTypesStr = strtoupper(implode(', ', $allowedExtensions));

        foreach ($request->file('files') as $file) {
            $extension = strtolower($file->getClientOriginalExtension());

            if (!in_array($extension, $allowedExtensions)) {
                return response()->json([
                    'message' => __('File type not allowed: :type', ['type' => strtoupper($extension)]),
                    'errors' => [__('Only specified file types are allowed: :types', ['types' => $allowedTypesStr])]
                ], 422);
            }
        }


        if ($validator->fails()) {
            return response()->json([
                'message' => __('File validation failed'),
                'errors' => $validator->errors()->all(),
                'allowed_types' => $config['allowed_file_types'],
                'max_size_mb' => $config['max_file_size_mb']
            ], 422);
        }

        $uploadedMedia = [];
        $errors = [];

        foreach ($request->file('files') as $file) {
            try {
                // Configure dynamic storage before upload
                DynamicStorageService::configureDynamicDisks();

                $activeDisk = StorageConfigService::getActiveDisk();

                // Store file directly to storage
                $fileName = $file->getClientOriginalName();
                $hashedName = $file->hashName();
                $storedPath = $file->storeAs('media', $hashedName, $activeDisk);

                // Create media record directly
                $media = new Media();
                $media->model_type = 'App\Models\User';
                $media->model_id = creatorId();
                $media->collection_name = 'files';
                $media->name = pathinfo($fileName, PATHINFO_FILENAME);
                $media->file_name = $hashedName;
                $media->mime_type = $file->getMimeType();
                $media->disk = $activeDisk;
                $media->size = $file->getSize();
                $media->manipulations = [];
                $media->custom_properties = [];
                $media->generated_conversions = [];
                $media->responsive_images = [];
                $media->uuid = Str::uuid();

                $media->created_by = creatorId();
                if ($request->has('directory_id') && $request->directory_id) {
                    $media->directory_id = $request->directory_id;
                }
                $media->save();

                // Update user storage usage
                if (isSaaS()) {
                    $this->updateStorageUsage(getUser(), $media->size);
                }

                // Force thumbnail generationAdd commentMore actions
                try {
                    $media->getUrl('thumb');
                } catch (\Exception $e) {
                    // Thumbnail generation failed, but continue
                }

                $originalUrl = Storage::disk($activeDisk)->url('media/' . $hashedName);
                $thumbUrl = $originalUrl; // Default to original

                $uploadedMedia[] = [
                    'id' => $media->id,
                    'name' => $media->name,
                    'file_name' => $media->file_name,
                    'url' => $originalUrl,
                    'thumb_url' => $thumbUrl,
                    'size' => $media->size,
                    'mime_type' => $media->mime_type,
                    'creator_id' => $media->creator_id,
                    'directory_id' => $media->directory_id, // Add this field
                    'created_at' => $media->created_at,
                ];
            } catch (\Exception $e) {
                if (isset($storedPath) && Storage::disk($activeDisk)->exists($storedPath)) {
                    Storage::disk($activeDisk)->delete($storedPath);
                }

                // Log the actual error for debugging
                Log::error('Media upload failed', [
                    'file' => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);

                $errors[] = [
                    'file' => $file->getClientOriginalName(),
                    'error' => $this->getUserFriendlyError($e, $file->getClientOriginalName())
                ];
            }
        }

        if (count($uploadedMedia) > 0 && empty($errors)) {
            return response()->json([
                'message' => count($uploadedMedia) . __(' file(s) uploaded successfully'),
                'data' => $uploadedMedia
            ]);
        } elseif (count($uploadedMedia) > 0 && !empty($errors)) {
            return response()->json([
                'message' => count($uploadedMedia) . ' uploaded, ' . count($errors) . ' failed',
                'data' => $uploadedMedia,
                'errors' => array_column($errors, 'error')
            ]);
        } else {
            return response()->json([
                'message' => 'Upload failed',
                'errors' => array_column($errors, 'error')
            ], 422);
        }
    }

    public function download($id)
    {
        $user = auth()->user();

        if (!$user->can('download-media')) {
            return response()->json(['error' => __('Permission Denied.')], 403);
        }

        $query = Media::query()->where('id', $id);

        // Apply Any / Own permission scope
        if ($user->can('manage-any-media')) {
            $query->whereIn('created_by', getMediaUserIds());
        } elseif ($user->can('manage-own-media')) {
            $query->where('created_by', $user->id);
        } else {
            $query->whereRaw('1 = 0');
        }

        $media = $query->first();

        if (!$media) {
            return response()->json(['error' => __('Media file not found')], 404);
        }

        try {
            $disk = Storage::disk($media->disk);
            $filePath = 'media/' . $media->file_name;

            if (!$disk->exists($filePath)) {
                return response()->json(['error' => __('File not found on storage')], 404);
            }

            // For all storage types, use download method
            return $disk->download($filePath, $media->file_name);
        } catch (\Exception $e) {
            return response()->json(['error' => __('File storage unavailable: ') . $e->getMessage()], 500);
        }
    }
    public function destroy($id)
    {
        $user = auth()->user();

        if (!$user->can('delete-media')) {
            return response()->json(['error' => __('Permission denied')], 403);
        }

        $query = Media::query()->where('id', $id);

        // Apply Any / Own permission scope
        if ($user->type === 'superadmin' || $user->can('manage-any-media')) {
            $query->whereIn('created_by', getMediaUserIds());
        } elseif ($user->can('manage-own-media')) {
            $query->where('created_by', $user->id);
        } else {
            $query->whereRaw('1 = 0');
        }

        $media = $query->firstOrFail();
        $mediaItem = $media->model;

        $fileSize = $media->size;

        try {
            // Delete file from storage
            Storage::disk($media->disk)->delete('media/' . $media->file_name);
            $media->delete();
        } catch (\Exception $e) {
            // If storage disk is unavailable, force delete from database
            $media->forceDelete();
        }

        // Update user storage usage
        if (isSaaS()) {
            $this->updateStorageUsage(getUser(), -$fileSize);
        }

        return response()->json(['message' => __('Media deleted successfully')]);
    }

    private function checkStorageLimit($files)
    {
        $user = auth()->user();
        if ($user->type === 'superadmin')
            return null;

        $limit = $this->getUserStorageLimit($user);
        if (!$limit)
            return null;

        $uploadSize = collect($files)->sum('size');
        $currentUsage = $this->getUserStorageUsage($user);

        if (($currentUsage + $uploadSize) > $limit) {
            return response()->json([
                'message' => __('Your plan storage limit has been exceeded.'),
                'errors' => [__('Your plan storage limit has been exceeded. Please delete some files or upgrade your plan to continue.')]
            ], 422);
        }
        return null;
    }

    private function getUserStorageLimit($user)
    {
        if ($user->type === 'company' && $user->plan) {
            return $user->plan->storage_limit * 1024 * 1024;
        }
        $getCompanyId = getCompanyId($user->created_by);
        if ($getCompanyId) {
            $company = User::find($getCompanyId);
            if ($company && $company->plan) {
                $storageLimit = $company->plan->storage_limit * 1024 * 1024;
                return $storageLimit;
            }
        }

        return null;
    }

    private function getUserStorageUsage($user)
    {
        if ($user->type === 'company') {
            return User::where('created_by', $user->id)
                ->orWhere('id', $user->id)
                ->sum('storage_limit');
        }

        $getCompanyId = getCompanyId($user->created_by);
        if ($user->created_by) {
            $company = User::find($getCompanyId);
            if ($company) {
                $data = $company->storage_limit;
                return $data;
            }
        }

        return $user->storage_limit;
    }

    private function updateStorageUsage($user, $size)
    {
        $user->increment('storage_limit', $size);
    }

    public function createDirectory(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $slug = Str::slug($request->name . '-' . time());

        $directory = MediaDirectory::create([
            'name' => $request->name,
            'slug' => $slug,
            'created_by' => creatorId(),
        ]);

        return response()->json([
            'message' => __('Directory created successfully'),
            'directory' => $directory
        ]);
    }
}