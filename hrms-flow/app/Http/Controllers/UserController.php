<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $authUser = Auth::user();
        if (Auth::user()->can('manage-users')) {
            $authUserRole = $authUser->roles->first()?->name;
            // Allow superadmin, admin, product-manager, contact-manager, viewer
            if (! $authUser->hasPermissionTo('view-users')) {
                abort(403, 'Unauthorized Access Prevented');
            }

            // $userQuery = User::withPermissionCheck()->with(['roles', 'creator'])->latest();
            $userQuery = User::with(['roles', 'creator'])->where(function ($q) {
                if (Auth::user()->can('manage-any-users')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-users')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            // Admin
            if ($authUserRole === 'super admin') {
                $userQuery->whereDoesntHave('roles', function ($q) {
                    $q->where('name', 'super admin');
                });
            }

            // Handle search
            if ($request->has('search') && ! empty($request->search)) {
                $search = $request->search;
                $userQuery->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Handle role filter
            if ($request->has('role') && $request->role !== 'all') {
                $userQuery->whereHas('roles', function ($q) use ($request) {
                    $q->where('roles.id', $request->role);
                });
            }

            // Handle sorting
            $sortField = $request->get('sort_field', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');

            // Validate sort field
            $allowedSortFields = ['name', 'created_at', 'id'];
            if (!in_array($sortField, $allowedSortFields)) {
                $sortField = 'created_at';
            }

            // Validate sort direction
            if (!in_array($sortDirection, ['asc', 'desc'])) {
                $sortDirection = 'desc';
            }

            $userQuery->orderBy($sortField, $sortDirection);

            // Handle pagination
            $perPage = $request->has('per_page') ? (int) $request->per_page : 10;
            $users = $userQuery->where('type', '!=', 'employee')->paginate($perPage)->withQueryString();

            // Transform data to resolve avatar URLs
            $users->getCollection()->transform(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => check_file($user->avatar) ? get_file($user->avatar) : get_file('avatars/avatar.png'),
                    'type' => $user->type,
                    'status' => $user->status,
                    'created_at' => $user->created_at,
                    'roles' => $user->roles->map(fn ($role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                        'label' => $role->label ?? $role->name,
                    ]),
                ];
            });

            // Roles listing - Get all roles without filtering
            if ($authUserRole == 'company') {
                // $roles = Role::where('created_by', $authUser->id)->get();
                $roles = Role::whereIn('created_by', getCompanyAndUsersId())
                    ->where('name', '!=', 'employee')
                    ->get();
            } else {
                $roles = Role::where('name', '!=', 'employee')->whereIn('created_by', getCompanyAndUsersId())->get();
            }

            // Get plan limits (only in SaaS mode)
            $planLimits = null;
            if (isSaas() && $authUser->type !== 'superadmin') {
                // Resolve company user — traverse full hierarchy
                $companyUser = $authUser->type === 'company' ? $authUser : User::find(getCompanyId($authUser->id));

                if ($companyUser && $companyUser->type === 'company') {
                    $plan = $companyUser->getCurrentPlan();
                    if ($plan) {
                        $currentUserCount = User::whereIn('created_by', getCompanyAndUsersId())
                            ->where('type', '!=', 'employee')
                            ->count();
                        $planLimits = [
                            'current_users' => $currentUserCount,
                            'max_users'     => $plan->max_users,
                            'can_create'    => $plan->max_users === 0 || $currentUserCount < $plan->max_users,
                        ];
                    }
                }
            }

            return Inertia::render('users/index', [
                'users' => $users,
                'roles' => $roles,
                'planLimits' => $planLimits,
                'filters' => [
                    'search' => $request->search ?? '',
                    'role' => $request->role ?? '',
                    'per_page' => $perPage,
                    'sort_field' => $request->sort_field ?? 'created_at',
                    'sort_direction' => $request->sort_direction ?? 'desc',
                    'view' => $request->view ?? 'list'
                ],
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserRequest $request)
    {
        // Set user language same as creator (company)
        $authUser = Auth::user();
        if (Auth::user()->can('create-users')) {
            $companySettings = settings();
            $userLang = isset($companySettings['defaultLanguage']) ? $companySettings['defaultLanguage'] : $authUser->lang;
            // Check plan limits (only in SaaS mode)
            if (isSaas() && $authUser->type !== 'superadmin') {
                // Resolve the company user — traverse up the hierarchy
                $companyUser = $authUser->type === 'company' ? $authUser : User::find(getCompanyId($authUser->id));

                if ($companyUser && $companyUser->type === 'company') {
                    $plan = $companyUser->getCurrentPlan();
                    if ($plan && $plan->max_users > 0) {
                        $currentUserCount = User::whereIn('created_by', getCompanyAndUsersId())->where('type', '!=', 'employee')->count();
                        if ($currentUserCount >= $plan->max_users) {
                            $message = $authUser->type === 'company'
                                ? __('User limit exceeded. Your plan allows maximum :max users. Please upgrade your plan.', ['max' => $plan->max_users])
                                : __('User limit exceeded. Your company plan allows maximum :max users. Please contact your administrator.', ['max' => $plan->max_users]);

                            return redirect()->back()->with('error', $message);
                        }
                    }
                }
            }

            // Resolve created_by based on SaaS/Non-SaaS mode
            if (isSaas()) {
                if (in_array(auth()->user()->type, ['superadmin', 'company'])) {
                    $created_by = auth()->id();
                } else {
                    $created_by = auth()->user()->created_by;
                }
            } else {
                if (auth()->user()->type === 'company') {
                    $created_by = auth()->id();
                } else {
                    $created_by = auth()->user()->created_by;
                }
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'created_by' => creatorId(),
                'lang' => $userLang,
            ]);

            if ($user && $request->roles) {
                $role = Role::where('id', $request->roles)
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->first();

                $user->roles()->sync([$role->id]);
                $user->type = $role->name;
                $user->save();

                // Trigger email notification
                event(new \App\Events\UserCreated($user, $request->password));

                // Check for email errors
                if (session()->has('email_error')) {
                    return redirect()->route('users.index')->with('warning', __('User created successfully, but welcome email failed: ').session('email_error'));
                }

                return redirect()->route('users.index')->with('success', __('User created with roles'));
            }

            return redirect()->back()->with('error', __('Unable to create User. Please try again!'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user)
    {
        if (Auth::user()->can('edit-users')) {
            if ($user) {
                $user->name = $request->name;
                $user->email = $request->email;

                // find and syncing role
                if ($request->roles) {
                    // Resolve created_by based on SaaS/Non-SaaS mode
                    if (isSaas()) {
                        if (in_array(auth()->user()->type, ['superadmin', 'company'])) {
                            $created_by = auth()->id();
                        } else {
                            $created_by = auth()->user()->created_by;
                        }
                    } else {
                        if (auth()->user()->type === 'company') {
                            $created_by = auth()->id();
                        } else {
                            $created_by = auth()->user()->created_by;
                        }
                    }
                    $role = Role::where('id', $request->roles)
                        ->whereIn('created_by', getCompanyAndUsersId())
                        ->first();

                    $user->roles()->sync([$role->id]);
                    $user->type = $role->name;
                }

                $user->save();

                return redirect()->route('users.index')->with('success', __('User updated with roles'));
            }

            return redirect()->back()->with('error', __('Unable to update User. Please try again!'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        if (Auth::user()->can('delete-users')) {
            if ($user) {
                $user->delete();

                return redirect()->route('users.index')->with('success', __('User deleted with roles'));
            }

            return redirect()->back()->with('error', __('Unable to delete User. Please try again!'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Reset user password
     */
    public function resetPassword(Request $request, User $user)
    {
        $request->validate([
            'password' => 'required|min:8|confirmed',
        ]);

        $user->password = Hash::make($request->password);
        $user->save();

        return redirect()->route('users.index')->with('success', __('Password reset successfully'));
    }

    /**
     * Toggle user status
     */
    public function toggleStatus(User $user)
    {
        $user->status = $user->status === 'active' ? 'inactive' : 'active';
        $user->save();

        return redirect()->route('users.index')->with('success', __('User status updated successfully'));
    }

    // switchBusiness method removed
}
