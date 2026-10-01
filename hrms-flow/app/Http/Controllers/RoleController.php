<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Http\Request;

class RoleController extends BaseController
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-roles')) {
            $query = Role::with(['permissions', 'creator'])->where(function ($q) {
                if (Auth::user()->can('manage-any-roles')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-roles')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });



            if ($request->filled('search')) {
                $searchTerm = $request->search;
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('label', 'like', '%' . $searchTerm . '%')
                        ->orWhere('name', 'like', '%' . $searchTerm . '%')
                        ->orWhere('description', 'like', '%' . $searchTerm . '%');
                });
            }

            // Handle sorting with validation
            $allowedSortFields = ['label', 'created_at'];
            $sortField = $request->input('sort_field', 'created_at');
            $sortDirection = $request->input('sort_direction', 'desc');

            // Validate sort field
            if (!in_array($sortField, $allowedSortFields)) {
                $sortField = 'created_at';
            }

            // Validate sort direction
            $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

            $query->orderBy($sortField, $sortDirection);

            // Handle pagination
            $perPage = $request->has('per_page') ? (int) $request->per_page : 10;
            $roles = $query->paginate($perPage)->withQueryString();

            $roles->getCollection()->transform(function ($role) {
                $role->is_editable = !in_array($role->name, isNotEditableRoles());
                return $role;
            });

            return Inertia::render('roles/index', [
                'roles' => $roles,
                'filters' => request()->only(['search', 'role', 'per_page', 'page', 'sort_field', 'sort_direction']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function create()
    {
        if (Auth::user()->can('create-roles')) {
            $permissions = $this->getFilteredPermissions();

            return Inertia::render('roles/create', [
                'permissions' => $permissions,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function show(Role $role)
    {
        if (Auth::user()->can('view-roles')) {
            $role->load(['permissions', 'creator']);
            $role->is_editable = !in_array($role->name, isNotEditableRoles());

            $permissions = $this->getFilteredPermissions();

            return Inertia::render('roles/show', [
                'role'        => $role,
                'permissions' => $permissions,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function edit(Role $role)
    {
        if (Auth::user()->can('edit-roles')) {
            $role->load(['permissions', 'creator']);
            $role->is_editable = !in_array($role->name, isNotEditableRoles());

            $permissions = $this->getFilteredPermissions();

            return Inertia::render('roles/edit', [
                'role'        => $role,
                'permissions' => $permissions,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    private function getFilteredPermissions()
    {
        $user = Auth::user();
        $userType = $user->type ?? 'company';

        // Superadmin can see all permissions
        if ($userType === 'superadmin' || $userType === 'super admin') {
            return Permission::all()->groupBy('module')
                ->mapWithKeys(fn($perms, $module) => [
                    Str::title(str_replace(['-', '_'], ' ', $module)) => $perms
                ]);
        }

        // Get allowed modules for current user role
        $allowedModules = config('role-permissions.' . $userType, config('role-permissions.company'));

        // Filter permissions by allowed modules
        $query = Permission::whereIn('module', $allowedModules);

        // For company users, filter specific settings permissions
        if ($userType === 'company') {
            // When in settings module, only show email, system and brand settings permissions
            $query->where(function ($q) {
                $q->where('module', '!=', 'settings')
                    ->orWhereIn('name', [
                        'manage-email-settings',
                        'manage-system-settings',
                        'manage-brand-settings',
                    ]);
            });
        }

        $permissions = $query->get()->groupBy('module')
            ->mapWithKeys(fn($perms, $module) => [
                Str::title(str_replace(['-', '_'], ' ', $module)) => $perms
            ]);

        return $permissions;
    }

    private function validatePermissions(array $permissions, $role = null)
    {
        $user = Auth::user();
        if (!$user) {
            throw new \Exception('User not authenticated');
        }

        $userType = $user->type ?? 'company';

        // Superadmin can assign any permission
        if (in_array($userType, ['superadmin', 'super admin'])) {
            return $permissions;
        }

        // Get allowed modules for current user role
        $allowedModules = config('role-permissions.' . $userType, config('role-permissions.company'));
        if (!is_array($allowedModules)) {
            $allowedModules = [];
        }

        // Get existing permissions if updating a role
        $existingPermissions = [];
        if ($role) {
            $existingPermissions = $role->permissions->pluck('name')->toArray();
        }

        // Build query to get valid permissions from allowed modules
        $query = Permission::whereIn('module', $allowedModules)
            ->whereIn('name', array_filter($permissions));

        // For company users, restrict settings permissions
        if ($userType === 'company') {
            $query->where(function ($q) {
                $q->where('module', '!=', 'settings')
                    ->orWhereIn('name', [
                        'manage-email-settings',
                        'manage-system-settings',
                        'manage-brand-settings',
                    ]);
            });
        }

        $validPermissions = $query->pluck('name')->toArray();

        // Remove permissions from disallowed modules automatically
        if ($role) {
            $permissionsFromDisallowedModules = Permission::whereNotIn('module', $allowedModules)
                ->whereIn('name', $existingPermissions)
                ->pluck('name')
                ->toArray();

            if (!empty($permissionsFromDisallowedModules)) {
                $role->revokePermissionTo($permissionsFromDisallowedModules);
            }
        }

        return $validPermissions;
    }


    public function store(RoleRequest $request)
    {
        if (Auth::user()->can('create-roles')) {
            // Validate permissions against user's allowed modules
            $validatedPermissions = $this->validatePermissions($request->permissions ?? []);

            $checkRoleExist = Role::where('name', Str::slug($request->label))->whereIn('created_by', getCompanyAndUsersId())->exists();
            if (!$checkRoleExist) {
                // Use direct model creation to bypass Spatie's duplicate check
                $role = new Role;
                $role->label = $request->label;
                $role->name = Str::slug($request->label);
                $role->description = $request->description;
                $role->created_by = Auth::id();
                $role->guard_name = 'web';
                $role->save();

                if ($role) {
                    $role->syncPermissions($validatedPermissions);

                    return redirect()->route('roles.index')->with('success', __('Role created successfully with Permissions!'));
                }

                return redirect()->back()->with('error', __('Unable to create Role with permissions. Please try again!'));
            } else {
                return redirect()->back()->with('error', __('Role already exists!'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function update(RoleRequest $request, Role $role)
    {
        if (Auth::user()->can('edit-roles')) {
            if ($role) {
                // Validate permissions (will keep existing ones from commented modules)
                $validatedPermissions = $this->validatePermissions($request->permissions ?? [], $role);

                $newSlug = Str::slug($request->label);

                // Check if role name already exists (excluding current role)
                $checkRoleExist = Role::where('name', $newSlug)
                    ->where('id', '!=', $role->id)
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->exists();

                if ($checkRoleExist) {
                    return redirect()->back()->with('error', __('Role already exists!'));
                }

                // Only update name if it's different to avoid duplicate key error
                if ($role->name !== $newSlug) {
                    $role->name = $newSlug;
                }

                $role->label = $request->label;
                $role->description = $request->description;

                $role->save();

                // Update the permissions
                $role->syncPermissions($validatedPermissions);

                return redirect()->route('roles.index')->with('success', __('Role updated successfully with Permissions!'));
            }

            return redirect()->back()->with('error', __('Unable to update Role with permissions. Please try again!'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }


    public function destroy(Role $role)
    {
        if (Auth::user()->can('delete-roles')) {
            if ($role) {
                // Prevent deletion of system roles
                // if ($role->is_system_role) {
                //     return redirect()->back()->with('error', __('System roles cannot be deleted!'));
                // }

                if (in_array($role->name, isNotDeletableRoles())) {
                    return redirect()->back()->with('error', __('System roles cannot be deleted!'));
                }

                $role->delete();

                return redirect()->route('roles.index')->with('success', __('Role deleted successfully!'));
            }

            return redirect()->back()->with('error', __('Unable to delete Role. Please try again!'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }
}
