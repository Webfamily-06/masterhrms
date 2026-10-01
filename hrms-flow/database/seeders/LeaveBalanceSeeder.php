<?php

namespace Database\Seeders;

use App\Models\LeaveApplication;
use App\Models\LeaveBalance;
use App\Models\LeavePolicy;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Database\Seeder;

class LeaveBalanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companies = User::where('type', 'company')->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No company users found. Please run DefaultCompanySeeder first.');

            return;
        }

        $currentYear = (int) date('Y');
        $previousYear = $currentYear - 1;

        foreach ($companies as $company) {
            $employees = User::where('type', 'employee')
                ->where('created_by', $company->id)
                ->where('status', 'active')
                ->get();

            if ($employees->isEmpty()) {
                $this->command->warn('No employees found for company: '.$company->name.'. Please run EmployeeSeeder first.');

                continue;
            }

            $leaveTypes = LeaveType::where('created_by', $company->id)->where('status', 'active')->get();
            $leavePolicies = LeavePolicy::where('created_by', $company->id)->where('status', 'active')->get();

            if ($leaveTypes->isEmpty() || $leavePolicies->isEmpty()) {
                $this->command->warn('No leave types or policies found for company: '.$company->name.'. Please run LeaveTypeSeeder and LeavePolicySeeder first.');

                continue;
            }

            foreach ($employees as $employee) {
                foreach ($leaveTypes as $leaveType) {
                    // Find matching active leave policy
                    $leavePolicy = $leavePolicies->where('leave_type_id', $leaveType->id)->first();
                    if (! $leavePolicy) {
                        continue;
                    }

                    // Skip if balance already exists for this year
                    if (LeaveBalance::where('employee_id', $employee->id)
                        ->where('leave_type_id', $leaveType->id)
                        ->where('year', $currentYear)
                        ->exists()
                    ) {
                        continue;
                    }

                    // allocated_days from leaveType->max_days_per_year (matches ensureYearBalances)
                    $allocatedDays = (float) ($leaveType->max_days_per_year ?? 0);

                    // Calculate carry forward from previous year (matches ensureYearBalances logic)
                    $carriedForward = 0;
                    if ($leavePolicy->carry_forward_limit > 0) {
                        $prevBalance = LeaveBalance::where('employee_id', $employee->id)
                            ->where('leave_type_id', $leaveType->id)
                            ->where('year', $previousYear)
                            ->first();

                        if ($prevBalance) {
                            $carriedForward = min(
                                max(0, (float) $prevBalance->remaining_days),
                                (float) $leavePolicy->carry_forward_limit
                            );
                        }

                        // For demo data: seed a fixed 2 days carried forward for Annual Leave
                        if ($leaveType->name === 'Annual Leave' && $carriedForward === 0) {
                            $carriedForward = min(2, (float) $leavePolicy->carry_forward_limit);
                        }
                    }

                    // Calculate used_days from approved leave applications (LeaveApplicationSeeder runs before this)
                    $usedDays = (float) LeaveApplication::where('employee_id', $employee->id)
                        ->where('leave_type_id', $leaveType->id)
                        ->where('status', 'approved')
                        ->whereYear('start_date', $currentYear)
                        ->sum('total_days');

                    // remaining = (allocated + carried_forward + manual_adjustment) - used_days
                    $remainingDays = ($allocatedDays + $carriedForward) - $usedDays;

                    try {
                        LeaveBalance::create([
                            'employee_id' => $employee->id,
                            'leave_type_id' => $leaveType->id,
                            'leave_policy_id' => $leavePolicy->id,
                            'year' => $currentYear,
                            'allocated_days' => $allocatedDays,
                            'used_days' => $usedDays,
                            'remaining_days' => max(0, $remainingDays),
                            'carried_forward' => $carriedForward,
                            'manual_adjustment' => 0,
                            'adjustment_reason' => null,
                            'created_by' => $company->id,
                        ]);
                    } catch (\Exception $e) {
                        $this->command->error('Failed to create leave balance for employee: '.$employee->name.' and leave type: '.$leaveType->name.' in company: '.$company->name);

                        continue;
                    }
                }
            }
        }

        $this->command->info('LeaveBalance seeder completed successfully!');
    }
}
