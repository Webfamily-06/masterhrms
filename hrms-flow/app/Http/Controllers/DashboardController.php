<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Asset;
use App\Models\AttendanceRecord;
use App\Models\Branch;
use App\Models\Candidate;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeContract;
use App\Models\EmployeeTraining;
use App\Models\Holiday;
use App\Models\JobPosting;
use App\Models\LeaveApplication;
use App\Models\LeaveType;
use App\Models\Meeting;
use App\Models\Coupon;
use App\Models\PayrollRun;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\PlanRequest;
use App\Models\Shift;
use App\Models\User;
use App\Models\Warning;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // Super admin always gets dashboard
        if ($user->type === 'superadmin' || $user->type === 'super admin') {
            return $this->renderDashboard();
        }

        // Check if user has dashboard permission (skip if permission doesn't exist)
        try {
            if ($user->hasPermissionTo('manage-dashboard')) {
                return $this->renderDashboard();
            }
        } catch (\Exception $e) {
            // Permission doesn't exist, continue to dashboard for authenticated users
            return $this->renderDashboard();
        }

        // Redirect to first available page
        return $this->redirectToFirstAvailablePage();
    }

    public function redirectToFirstAvailablePage()
    {
        $user = auth()->user();

        // Define available routes with their permissions
        $routes = [
            ['route' => 'users.index', 'permission' => 'manage-users'],
            ['route' => 'roles.index', 'permission' => 'manage-roles'],

            ['route' => 'plans.index', 'permission' => 'manage-plans'],
            ['route' => 'referral.index', 'permission' => 'manage-referral'],
            ['route' => 'settings.index', 'permission' => 'manage-settings'],
        ];

        // Find first available route
        foreach ($routes as $routeData) {
            if ($user->hasPermissionTo($routeData['permission'])) {
                return redirect()->route($routeData['route']);
            }
        }

        // If no permissions found, logout user
        auth()->logout();

        return redirect()->route('login')->with('error', __('No access permissions found.'));
    }

    private function renderDashboard()
    {
        $user = auth()->user();

        if ($user->type === 'superadmin' || $user->type === 'super admin') {
            return $this->renderSuperAdminDashboard();
        } else {
            return $this->renderCompanyDashboard();
        }
    }

    private function renderSuperAdminDashboard()
    {
        $revenueYear = (int) request('revenueYear', now()->year);
        $companiesYear = (int) request('companiesYear', now()->year);

        // Get system-wide statistics
        $totalCompanies = User::where('type', 'company')->count();
        $totalActivePlanCompanies = User::where('type', 'company')->where('plan_is_active', '1')->count();
        $totalUsers = User::where('type', '!=', 'superadmin')->where('type', '!=', 'super admin')->count();
        $totalRevenue = PlanOrder::where('status', 'approved')->sum('final_price') ?? 0;
        $activePlans = Plan::where('is_plan_enable', 'on')->count();
        $pendingRequests = PlanRequest::where('status', 'pending')->count();
        $activeCoupons = Coupon::where('status', true)->count();

        // Monthly revenue for all 12 months of selected year
        if (isDemo()) {
            $demoRevenue = [4200, 5800, 3900, 7100, 6400, 8900, 7600, 9200, 8100, 10500, 9800, 12400];
            $monthlyRevenue = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthlyRevenue[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'revenue' => (float) $demoRevenue[$i - 1],
                ];
            }
        } else {
            $monthlyRevenue = [];
            for ($i = 1; $i <= 12; $i++) {
                $revenue = PlanOrder::where('status', 'approved')
                    ->whereMonth('processed_at', $i)
                    ->whereYear('processed_at', $revenueYear)
                    ->sum('final_price') ?? 0;
                $monthlyRevenue[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'revenue' => (float) $revenue,
                ];
            }
        }

        // Monthly companies registered for selected year
        if (isDemo()) {
            $demoCompanies = [3, 5, 4, 7, 6, 9, 8, 11, 7, 13, 10, 15];
            $monthlyCompanies = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthlyCompanies[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $companiesYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $companiesYear)),
                    'count' => $demoCompanies[$i - 1],
                ];
            }
        } else {
            $monthlyCompanies = [];
            for ($i = 1; $i <= 12; $i++) {
                $count = User::where('type', 'company')
                    ->whereMonth('created_at', $i)
                    ->whereYear('created_at', $companiesYear)
                    ->count();
                $monthlyCompanies[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $companiesYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $companiesYear)),
                    'count' => $count,
                ];
            }
        }

        $firstCompanyYear = User::where('type', 'company')->min('created_at')
            ? (int) date('Y', strtotime(User::where('type', 'company')->min('created_at')))
            : now()->year;
        $availableCompanyYears = range(now()->year, $firstCompanyYear);

        // Calculate monthly growth
        $monthlyGrowth = 0;

        if (IsDemo()) {
            $monthlyGrowth = 55;
        } else {
            $currentMonthCompanies = User::where('type', 'company')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
            $previousMonthCompanies = User::where('type', 'company')
                ->whereMonth('created_at', now()->subMonth()->month)
                ->whereYear('created_at', now()->subMonth()->year)
                ->count();
            $monthlyGrowth = $previousMonthCompanies > 0
                ? round((($currentMonthCompanies - $previousMonthCompanies) / $previousMonthCompanies) * 100, 1)
                : ($currentMonthCompanies > 0 ? 100 : 0);
        }

        $availableYears = range(now()->year + 2, now()->year - 4);

        $dashboardData = [
            'stats' => [
                'totalCompanies' => $totalCompanies,
                'totalActivePlanCompanies' => $totalActivePlanCompanies,
                'totalUsers' => $totalUsers,
                'totalRevenue' => $totalRevenue,
                'activePlans' => $activePlans,
                'pendingRequests' => $pendingRequests,
                'monthlyGrowth' => $monthlyGrowth,
                'activeCoupons' => $activeCoupons,
            ],
            'recentActivity' => User::where('type', 'company')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get(['id', 'name', 'email', 'avatar', 'created_at'])
                ->map(function ($company) {
                    return [
                        'id' => $company->id,
                        'name' => $company->name,
                        'email' => $company->email,
                        'avatar' => check_file($company->avatar) ? get_file($company->avatar) : get_file('avatars/avatar.png'),
                        'registered_at' => $company->created_at->diffForHumans(),
                        'status' => 'active',
                    ];
                }),
            'monthlyRevenue' => $monthlyRevenue,
            'revenueYear' => $revenueYear,
            'availableYears' => $availableYears,
            'monthlyCompanies' => $monthlyCompanies,
            'availableCompanyYears' => $availableCompanyYears,
            'topPlans' => Plan::withCount('users')
                ->orderBy('users_count', 'desc')
                ->take(3)
                ->get()
                ->map(function ($plan) {
                    return [
                        'name' => $plan->name,
                        'subscribers' => $plan->users_count,
                        'revenue' => $plan->users_count * $plan->price,
                    ];
                }),
        ];

        return Inertia::render('superadmin/dashboard', props: [
            'dashboardData' => $dashboardData,
        ]);
    }

    private function renderCompanyDashboard()
    {
        $user = auth()->user();

        // If user is employee, show limited dashboard
        if ($user->type === 'employee') {
            return $this->renderEmployeeDashboard();
        }

        $hiringYear = (int) request('hiringYear', now()->year);
        $growthYear = (int) request('growthYear', now()->year);
        $payrollYear = (int) request('payrollYear', now()->year);

        $companyUserIds = $this->getCompanyUserIds();

        // Core HR Statistics
        $totalEmployees = User::where('type', 'employee')->whereIn('created_by', $companyUserIds)->count();
        $totalBranches = Branch::whereIn('created_by', $companyUserIds)->count();
        $totalDepartments = Department::whereIn('created_by', $companyUserIds)->count();

        // Monthly Statistics
        if (isDemo()) {
            $newEmployeesThisMonth = Employee::whereIn('created_by', $companyUserIds)->count();
            $jobPostsThisMonth = JobPosting::whereIn('created_by', $companyUserIds)->count();
            $candidatesThisMonth = Candidate::whereIn('created_by', $companyUserIds)->count();
        } else {
            $newEmployeesThisMonth = Employee::whereIn('created_by', $companyUserIds)
                ->whereMonth('created_at', now()->month)->count();
            $jobPostsThisMonth = JobPosting::whereIn('created_by', $companyUserIds)
                ->whereMonth('created_at', now()->month)->count();
            $candidatesThisMonth = Candidate::whereIn('created_by', $companyUserIds)
                ->whereMonth('created_at', now()->month)->count();
        }

        // Today's Birthdays
        if (isDemo()) {
            $todayBirthdays = Employee::whereIn('created_by', $companyUserIds)
                ->with('user', 'designation')
                ->limit(6)
                ->get()
                ->map(function ($emp) {
                    $avatar = $emp->user->getRawOriginal('avatar');
                    return [
                        'id'         => $emp->id,
                        'name'       => $emp->user->name,
                        'designation' => $emp->designation?->name ?? '',
                        'avatar'     => check_file($avatar) ? get_file($avatar) : null,
                    ];
                })->values();
        } else {
            $todayBirthdays = Employee::whereIn('created_by', $companyUserIds)
                ->with('user', 'designation')
                ->whereMonth('date_of_birth', today()->month)
                ->whereDay('date_of_birth', today()->day)
                ->get()
                ->map(function ($emp) {
                    $avatar = $emp->user->getRawOriginal('avatar');
                    return [
                        'id'         => $emp->id,
                        'name'       => $emp->user->name,
                        'designation' => $emp->designation?->name ?? '',
                        'avatar'     => check_file($avatar) ? get_file($avatar) : null,
                    ];
                })->values();
        }

        // Today's On Leave
        if (isDemo()) {
            $todayOnLeaveList = LeaveApplication::whereIn('created_by', $companyUserIds)
                ->with(['employee.employee.designation', 'leaveType'])
                ->where('status', 'approved')
                ->limit(7)
                ->get()
                ->map(function ($leave) {
                    $emp = $leave->employee;
                    $avatar = $emp?->getRawOriginal('avatar');
                    return [
                        'id'         => $emp?->id,
                        'name'       => $emp?->name ?? '',
                        'designation' => $emp?->employee?->designation?->name ?? '',
                        'leaveType'  => $leave->leaveType?->name ?? '',
                        'avatar'     => $avatar && check_file($avatar) ? get_file($avatar) : null,
                    ];
                })->values();
        } else {
            $todayOnLeaveList = LeaveApplication::whereIn('created_by', $companyUserIds)
                ->with(['employee.employee.designation', 'leaveType'])
                ->where('status', 'approved')
                ->whereDate('start_date', '<=', today())
                ->whereDate('end_date', '>=', today())
                ->get()
                ->map(function ($leave) {
                    $emp = $leave->employee;
                    $avatar = $emp?->getRawOriginal('avatar');
                    return [
                        'id'         => $emp?->id,
                        'name'       => $emp?->name ?? '',
                        'designation' => $emp?->employee?->designation?->name ?? '',
                        'leaveType'  => $leave->leaveType?->name ?? '',
                        'avatar'     => $avatar && check_file($avatar) ? get_file($avatar) : null,
                    ];
                })->values();
        }

        // Attendance Statistics
        if (isDemo()) {
            $presentToday = 45;
            $attendanceRate = 85.5;
        } else {
            $presentToday = AttendanceRecord::whereIn('created_by', $companyUserIds)
                ->whereDate('date', today())->where('status', 'present')->count();
            $attendanceRate = $totalEmployees > 0 ? round(($presentToday / $totalEmployees) * 100, 1) : 0;
        }

        // Leave Statistics
        $pendingLeaves = LeaveApplication::whereIn('created_by', $companyUserIds)
            ->where('status', 'pending')->count();

        $onLeaveToday = LeaveApplication::whereIn('created_by', $companyUserIds)
            ->where('status', 'approved');

        $onLeaveToday = $onLeaveToday->whereDate('start_date', '<=', today())
            ->whereDate('end_date', '>=', today())->count();

        // Recruitment Statistics
        $activeJobPostings = JobPosting::whereIn('created_by', $companyUserIds)
            ->where('status', 'Published')->count();
        $totalCandidates = Candidate::whereIn('created_by', $companyUserIds)->count();

        // Payroll Statistics
        if (isDemo()) {
            $totalPayrollThisMonth = 125000;
            $payrollRunsThisMonth = 3;
        } else {
            $totalPayrollThisMonth = PayrollRun::whereIn('created_by', $companyUserIds)
                ->where('status', 'completed')
                ->whereMonth('pay_date', now()->month)
                ->whereYear('pay_date', now()->year)
                ->sum('total_net_pay') ?? 0;
            $payrollRunsThisMonth = PayrollRun::whereIn('created_by', $companyUserIds)
                ->whereMonth('created_at', now()->month)->count();
        }

        // Asset Statistics
        if (isDemo()) {
            $totalAssets = 48;
            $assignedAssets = 32;
        } else {
            $totalAssets = Asset::whereIn('created_by', $companyUserIds)->count();
            $assignedAssets = Asset::whereIn('created_by', $companyUserIds)->where('status', 'assigned')->count();
        }

        // Warning & Discipline Statistics
        $pendingWarnings = Warning::whereIn('created_by', $companyUserIds)
            ->whereIn('status', ['draft', 'issued'])->count();

        // Upcoming Holidays
        $upcomingHolidays = Holiday::whereIn('created_by', $companyUserIds)
            ->where('start_date', '>=', today())
            ->where('start_date', '<=', today()->addDays(30))
            ->count();

        // Active Contracts
        $activeContracts = EmployeeContract::whereIn('created_by', $companyUserIds)
            ->where('status', 'Active')->count();
        $expiringContracts = EmployeeContract::whereIn('created_by', $companyUserIds)
            ->where('status', 'Active')
            ->where('end_date', '<=', today()->addDays(30))
            ->whereNotNull('end_date')
            ->count();

        // Training Statistics
        if (isDemo()) {
            $activeTrainings = 12;
            $completedTrainings = 28;
        } else {
            $activeTrainings = EmployeeTraining::whereIn('created_by', $companyUserIds)
                ->whereIn('status', ['assigned', 'in_progress'])->count();
            $completedTrainings = EmployeeTraining::whereIn('created_by', $companyUserIds)
                ->where('status', 'completed')->count();
        }

        // Department Distribution for Chart
        // $predefinedColors = ['#4F46E5', '#10b77f', '#F59E0B', '#EF4444', '#3B82F6', '#D946EF'];
        $predefinedColors = ['#0EA5E9', '#14B8A6', '#6366F1', '#0D9488', '#7C3AED', '#0369A1'];

        $departmentStats = Department::whereIn('created_by', $companyUserIds)
            ->withCount('employees')
            ->with('branch')
            ->orderBy('employees_count', 'desc')
            ->when(config('app.is_demo') == true, function ($query) {
                return $query->take(6);
            })
            ->get()
            ->map(function ($dept, $index) use ($predefinedColors) {
                $displayName = $dept->name . ' (' . $dept->branch->name . ')';

                return [
                    'name' => $displayName,
                    'value' => $dept->employees_count,
                    'color' => config('app.is_demo') == true
                        ? ($predefinedColors[$index] ?? '#' . substr(md5($displayName), 0, 6))
                        : '#' . substr(md5($displayName), 0, 6),
                ];
            });

        // Monthly Hiring Trend for Chart (all 12 months of selected year)
        if (isDemo()) {
            $demoHires = [8, 12, 15, 10, 18, 14, 20, 16, 22, 19, 25, 21];
            $hiringTrend = [];
            for ($i = 1; $i <= 12; $i++) {
                $hiringTrend[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $hiringYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $hiringYear)),
                    'hires' => $demoHires[$i - 1],
                ];
            }
        } else {
            $hiringTrend = [];
            for ($i = 1; $i <= 12; $i++) {
                $count = Employee::whereIn('created_by', $companyUserIds)
                    ->whereMonth('created_at', $i)
                    ->whereYear('created_at', $hiringYear)
                    ->count();
                $hiringTrend[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $hiringYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $hiringYear)),
                    'hires' => $count,
                ];
            }
        }

        $availableYears = range(now()->year + 2, now()->year - 4);

        // Candidate Status Distribution for Chart
        $candidateStatusStats = Candidate::whereIn('created_by', $companyUserIds)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                $colors = [
                    'New'        => '#0EA5E9',
                    'Screening'  => '#F59E0B',
                    'Interview'  => '#8B5CF6',
                    'Offer'      => '#14B8A6',
                    'Hired'      => '#10B981',
                    'Rejected'   => '#EF4444',
                ];

                return [
                    'name' => $item->status,
                    'value' => $item->count,
                    'color' => $colors[$item->status] ?? '#6b7280',
                ];
            });

        // Leave Types for Chart
        $leaveTypesStats = LeaveType::whereIn('created_by', $companyUserIds)
            ->get()
            ->map(function ($leaveType) {
                return [
                    'name' => $leaveType->name,
                    'value' => $leaveType->max_days_per_year,
                    'color' => $leaveType->color ?: '#' . substr(md5($leaveType->name), 0, 6),
                ];
            });

        // Employee Growth Chart
        if (isDemo()) {
            $employeeGrowthChart = [
                ['month' => 'January', 'employees' => 15],
                ['month' => 'February', 'employees' => 5],
                ['month' => 'March', 'employees' => 22],
                ['month' => 'April', 'employees' => 10],
                ['month' => 'May', 'employees' => 28],
                ['month' => 'June', 'employees' => 32],
                ['month' => 'July', 'employees' => 35],
                ['month' => 'August', 'employees' => 50],
                ['month' => 'September', 'employees' => 42],
                ['month' => 'October', 'employees' => 45],
                ['month' => 'November', 'employees' => 48],
                ['month' => 'December', 'employees' => 52],
            ];
        } else {
            $employeeGrowthChart = [];
            for ($month = 1; $month <= 12; $month++) {
                $count = User::where('type', 'employee')
                    ->whereIn('created_by', $companyUserIds)
                    ->whereMonth('created_at', $month)
                    ->whereYear('created_at', $growthYear)
                    ->count();
                $employeeGrowthChart[] = [
                    'month' => date('F', mktime(0, 0, 0, $month, 1)),
                    'employees' => $count,
                ];
            }
        }

        // Leave Status Overview (current month — approved / pending / rejected totals)
        $leaveBase = LeaveApplication::whereIn('created_by', $companyUserIds)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year);
        if (isDemo()) {
            $leaveOverview = [
                ['name' => 'Approved', 'value' => 42, 'color' => '#10B981'],
                ['name' => 'Pending',  'value' => 18, 'color' => '#F59E0B'],
                ['name' => 'Rejected', 'value' => 8,  'color' => '#EF4444'],
            ];
        } else {
            $leaveOverview = [
                ['name' => 'Approved', 'value' => (clone $leaveBase)->where('status', 'approved')->count(), 'color' => '#10B981'],
                ['name' => 'Pending',  'value' => (clone $leaveBase)->where('status', 'pending')->count(),  'color' => '#F59E0B'],
                ['name' => 'Rejected', 'value' => (clone $leaveBase)->where('status', 'rejected')->count(), 'color' => '#EF4444'],
            ];
        }

        // Attendance last 7 days
        if (isDemo()) {
            $attendanceWeekly = [];
            for ($i = 6; $i >= 0; $i--) {
                $day = now()->subDays($i);
                $attendanceWeekly[] = [
                    'day'     => $day->format('D'),
                    'present' => rand(38, 50),
                    'absent'  => rand(2, 8),
                    'leave'   => rand(1, 6),
                ];
            }
        } else {
            $attendanceWeekly = [];
            for ($i = 6; $i >= 0; $i--) {
                $day = now()->subDays($i);
                $base = AttendanceRecord::whereIn('created_by', $companyUserIds)->whereDate('date', $day->toDateString());
                $attendanceWeekly[] = [
                    'day'     => $day->format('D'),
                    'present' => (clone $base)->where('status', 'present')->count(),
                    'absent'  => (clone $base)->where('status', 'absent')->count(),
                    'leave'   => (clone $base)->where('status', 'on_leave')->count(),
                ];
            }
        }

        // Monthly Payroll Trend
        if (isDemo()) {
            $demoPayroll = [95000, 98000, 102000, 99000, 105000, 108000, 112000, 110000, 115000, 118000, 122000, 125000];
            $payrollTrend = [];
            for ($i = 1; $i <= 12; $i++) {
                $payrollTrend[] = [
                    'month'   => date('M', mktime(0, 0, 0, $i, 1)),
                    'netPay'  => $demoPayroll[$i - 1],
                ];
            }
        } else {
            $payrollTrend = [];
            for ($i = 1; $i <= 12; $i++) {
                $net = PayrollRun::whereIn('created_by', $companyUserIds)
                    ->where('status', 'completed')
                    ->whereMonth('pay_date', $i)
                    ->whereYear('pay_date', $payrollYear)
                    ->sum('total_net_pay') ?? 0;
                $payrollTrend[] = [
                    'month'  => date('M', mktime(0, 0, 0, $i, 1)),
                    'netPay' => (float) $net,
                ];
            }
        }

        // Asset Status Distribution
        if (isDemo()) {
            $assetStatusStats = [
                ['name' => 'Available',    'value' => 16, 'color' => '#10B981'],
                ['name' => 'Assigned',     'value' => 32, 'color' => '#3B82F6'],
                ['name' => 'Maintenance',  'value' => 5,  'color' => '#F59E0B'],
                ['name' => 'Disposed',     'value' => 3,  'color' => '#EF4444'],
            ];
        } else {
            $statusColors = [
                'available'         => '#10B981',
                'assigned'          => '#3B82F6',
                'under_maintenance' => '#F59E0B',
                'disposed'          => '#EF4444',
            ];
            $assetStatusStats = Asset::whereIn('created_by', $companyUserIds)
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get()
                ->map(fn($r) => [
                    'name'  => ucfirst(str_replace('_', ' ', $r->status)),
                    'value' => $r->count,
                    'color' => $statusColors[$r->status] ?? '#6b7280',
                ]);
        }

        $recentLeaves = LeaveApplication::whereIn('created_by', $companyUserIds)
            ->with(['employee', 'leaveType'])
            ->whereIn('status', ['approved', 'absent'])
            ->orderByDesc('created_at')
            ->take(5)
            ->get();

        $recentLeaves->transform(function ($leave) {
            $avatar = $leave->employee->getRawOriginal('avatar');
            $leave->employee->avatar = check_file($avatar) ? get_file($avatar) : get_file('avatars/avatar.png');
            return $leave;
        });

        $recentCandidates = Candidate::whereIn('created_by', $companyUserIds)
            ->with(['job'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // Recent Announcements
        $recentAnnouncements = Announcement::whereIn('created_by', $companyUserIds)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // Upcoming Meetings
        $recentMeetings = Meeting::whereIn('created_by', $companyUserIds);
        if (isDemo()) {
            $recentMeetings =  $recentMeetings
                ->orderBy('meeting_date', 'asc')
                ->take(5)
                ->get();
        } else {
            $recentMeetings =  $recentMeetings
                ->where('meeting_date', '>=', today())
                ->orderBy('meeting_date', 'asc')
                ->get();
        }

        $dashboardData = [
            'stats' => [
                'totalEmployees'       => $totalEmployees,
                'totalBranches'        => $totalBranches,
                'totalDepartments'     => $totalDepartments,
                'newEmployeesThisMonth' => $newEmployeesThisMonth,
                'jobPostsThisMonth'    => $jobPostsThisMonth,
                'candidatesThisMonth'  => $candidatesThisMonth,
                'attendanceRate'       => $attendanceRate,
                'presentToday'         => $presentToday,
                'pendingLeaves'        => $pendingLeaves,
                'onLeaveToday'         => $onLeaveToday,
                'activeJobPostings'    => $activeJobPostings,
                'totalCandidates'      => $totalCandidates,
                'totalPayrollThisMonth' => $totalPayrollThisMonth,
                'payrollRunsThisMonth' => $payrollRunsThisMonth,
                'totalAssets'          => $totalAssets,
                'assignedAssets'       => $assignedAssets,
                'pendingWarnings'      => $pendingWarnings,
                'upcomingHolidays'     => $upcomingHolidays,
                'activeContracts'      => $activeContracts,
                'expiringContracts'    => $expiringContracts,
                'activeTrainings'      => $activeTrainings,
                'completedTrainings'   => $completedTrainings,
            ],
            'charts' => [
                'departmentStats'    => $departmentStats,
                'hiringTrend'        => $hiringTrend,
                'hiringYear'         => $hiringYear,
                'availableYears'     => $availableYears,
                'growthYear'          => $growthYear,
                'payrollYear'         => $payrollYear,
                'candidateStatusStats' => $candidateStatusStats,
                'leaveTypesStats'    => $leaveTypesStats,
                'employeeGrowthChart' => $employeeGrowthChart,
                'leaveOverview'      => $leaveOverview,
                'attendanceWeekly'   => $attendanceWeekly,
                'payrollTrend'       => $payrollTrend,
                'assetStatusStats'   => $assetStatusStats,
            ],
            'recentActivities' => [
                'leaves' => $recentLeaves,
                'candidates' => $recentCandidates,
                'announcements' => $recentAnnouncements,
                'meetings' => $recentMeetings,
            ],
            'todayBirthdays' => $todayBirthdays,
            'todayOnLeave' => $todayOnLeaveList,
            'userType' => $user->type,
        ];

        return Inertia::render('dashboard', [
            'dashboardData' => $dashboardData,
        ]);
    }

    private function renderEmployeeDashboard()
    {
        $user = auth()->user();
        $companyUserIds = $this->getCompanyUserIds();

        // Recent Announcements
        $recentAnnouncements = \App\Models\Announcement::whereIn('created_by', $companyUserIds)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // Upcoming Meetings - get meetings where user is organizer
        $recentMeetings = \App\Models\Meeting::with('attendees')
            ->whereIn('created_by', $companyUserIds)
            ->where('organizer_id', $user->id)
            ->where('meeting_date', '>=', today())
            ->orderBy('meeting_date', 'asc')
            ->get();

        // Get meetings where user is attendee
        $meetingAttendee = \App\Models\MeetingAttendee::with('meeting')
            ->where('user_id', $user->id)
            ->get();

        // Extract meetings from attendee records
        $attendeeMeetings = $meetingAttendee->pluck(value: 'meeting')->filter();

        // Merge and remove duplicates
        $recentMeetings = $recentMeetings->merge($attendeeMeetings)
            ->unique('id')
            ->filter(function ($meeting) {
                return $meeting->meeting_date >= today();
            })
            ->sortBy('meeting_date')
            ->values();

        // Employee Stats
        $totalAwards = \App\Models\Award::where('employee_id', $user->id)->count();
        $totalWarnings = \App\Models\Warning::where('employee_id', $user->id)->count();
        $totalComplaints = \App\Models\Complaint::where('against_employee_id', $user->id)->count();

        // Get shifts and attendance policies for clock in functionality
        $shifts = \App\Models\Shift::whereIn('created_by', $companyUserIds)
            ->where('status', 'active')
            ->get(['id', 'name', 'start_time', 'end_time']);

        $attendancePolicies = \App\Models\AttendancePolicy::whereIn('created_by', $companyUserIds)
            ->where('status', 'active')
            ->get(['id', 'name']);

        // Get today's attendance for the employee
        $todayAttendance = AttendanceRecord::where('employee_id', $user->id)
            ->where('date', \Carbon\Carbon::today())
            ->first();

        // Get employee's assigned shift
        $employeeShift = null;
        $employee = Employee::where('user_id', $user->id)->first();
        if ($employee && $employee->shift_id) {
            $employeeShift = Shift::find($employee->shift_id);
        }

        // Auto clock out previous days like yesterday and alll thing if not clocked out
        $previousAttendance = AttendanceRecord::where('employee_id', $user->id)
            ->where('date', '<', \Carbon\Carbon::today())
            ->whereNotNull('clock_in')
            ->whereNull('clock_out')
            ->get();

        foreach ($previousAttendance as $record) {
            $recordDate = \Carbon\Carbon::parse($record->date);
            $shift = Shift::find($record->shift_id) ?? $employeeShift;

            if ($shift) {
                $record->update([
                    'clock_out' => $shift->end_time,
                ]);

                if (method_exists($record, 'processAttendance')) {
                    $record->processAttendance();
                }
            }
        }

        // Auto clock out if shift end time has passed for today
        // if ($todayAttendance && $todayAttendance->clock_in && !$todayAttendance->clock_out && $employeeShift) {
        //     $now = \Carbon\Carbon::now();
        //     $shiftEndTime = \Carbon\Carbon::today()->setTimeFromTimeString($employeeShift->end_time);

        //     if ($now->greaterThan($shiftEndTime)) {
        //         $todayAttendance->update([
        //             'clock_out' => $employeeShift->end_time,
        //         ]);

        //         if (method_exists($todayAttendance, 'processAttendance')) {
        //             $todayAttendance->processAttendance();
        //         }

        //         $todayAttendance = $todayAttendance->fresh();
        //     }
        // }

        $dashboardData = [
            'stats' => [
                'totalAwards' => $totalAwards,
                'totalWarnings' => $totalWarnings,
                'totalComplaints' => $totalComplaints,
            ],
            'recentActivities' => [
                'announcements' => $recentAnnouncements,
                'meetings' => $recentMeetings,
            ],
            'shifts' => $shifts,
            'attendancePolicies' => $attendancePolicies,
            'todayAttendance' => $todayAttendance,
            'currentTime' => \Carbon\Carbon::now()->format('H:i:s'),
            'employeeShift' => $employeeShift,
            'userType' => $user->type,
        ];

        return Inertia::render('employee-dashboard', [
            'dashboardData' => $dashboardData,
        ]);
    }

    // private function getCompanyUserIds()
    // {
    //     $user = auth()->user();
    //     if ($user->type === 'company') {
    //         $companyUserIds = User::where('created_by', $user->id)->pluck('id')->toArray();
    //         $companyUserIds[] = $user->id;
    //         return $companyUserIds;
    //     } else {
    //         $userCreatedBy = User::where('id', $user->created_by)->value('id');
    //         $companyUserIds = User::where('created_by', $userCreatedBy)->pluck('id')->toArray();
    //         $companyUserIds[] = $userCreatedBy;
    //         return $companyUserIds;
    //     }
    // }

    private function getCompanyUserIds()
    {
        $user = auth()->user();
        if ($user->type === 'company') {
            $companyId = getCompanyId($user->id);
            if ($companyId) {
                $allUsers = getAllCompanyUsers($companyId);
                $allUsers[] = $companyId; // Include company itself

                return array_unique($allUsers);
            }

            return [];
        } else {
            $companyId = getCompanyId($user->id);
            if ($companyId) {
                $allUsers = getAllCompanyUsers($companyId);
                $allUsers[] = $companyId; // Include company itself

                return array_unique($allUsers);
            }

            return [];
        }
    }
}
