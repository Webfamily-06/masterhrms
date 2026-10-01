<?php

namespace Database\Seeders;

use App\Models\LeaveApplication;
use App\Models\LeavePolicy;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class LeaveApplicationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing leave applications first to ensure clean seed data
        LeaveApplication::whereNotIn('status', ['pending', 'rejected'])->delete();

        // Get all companies
        $companies = User::where('type', 'company')->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No company users found. Please run DefaultCompanySeeder first.');

            return;
        }

        // Leave application patterns pool
        // Leave types reference from LeaveTypeSeeder:
        // Annual Leave, Sick Leave, Maternity Leave, Paternity Leave, Emergency Leave,
        // Bereavement Leave, Study Leave, Compensatory Leave, Personal Leave, Marriage Leave
        $monthlyLeavePatterns = [
            1 => ['leave_type' => 'Annual Leave', 'days' => 2, 'reason' => 'New Year vacation', 'status' => 'approved'],
            2 => ['leave_type' => 'Sick Leave', 'days' => 1, 'reason' => 'Fever and cold symptoms', 'status' => 'approved'],
            3 => ['leave_type' => 'Personal Leave', 'days' => 1, 'reason' => 'Personal appointment', 'status' => 'approved'],
            4 => ['leave_type' => 'Annual Leave', 'days' => 1, 'reason' => 'Family vacation', 'status' => 'approved'],
            5 => ['leave_type' => 'Emergency Leave', 'days' => 1, 'reason' => 'Family emergency', 'status' => 'approved'],
            6 => ['leave_type' => 'Compensatory Leave', 'days' => 2, 'reason' => 'Compensatory off for overtime', 'status' => 'approved'],
            7 => ['leave_type' => 'Sick Leave', 'days' => 2, 'reason' => 'Medical checkup and recovery', 'status' => 'approved'],
            8 => ['leave_type' => 'Study Leave', 'days' => 2, 'reason' => 'Professional development course', 'status' => 'approved'],
            9 => ['leave_type' => 'Annual Leave', 'days' => 2, 'reason' => 'Festival celebration', 'status' => 'approved'],
            10 => ['leave_type' => 'Bereavement Leave', 'days' => 2, 'reason' => 'Family bereavement', 'status' => 'approved'],
            11 => ['leave_type' => 'Marriage Leave', 'days' => 3, 'reason' => 'Wedding ceremony', 'status' => 'approved'],
            12 => ['leave_type' => 'Annual Leave', 'days' => 2, 'reason' => 'Year end vacation', 'status' => 'approved'],
        ];

        $currentYear = date('Y');

        foreach ($companies as $company) {
            // Get employees for this company
            $employees = User::where('type', 'employee')->where('created_by', $company->id)->get();

            if ($employees->isEmpty()) {
                $this->command->warn('No employees found for company: ' . $company->name . '. Please run EmployeeSeeder first.');

                continue;
            }

            // Get leave types and policies for this company
            $leaveTypes = LeaveType::where('created_by', $company->id)->get();
            $leavePolicies = LeavePolicy::where('created_by', $company->id)->get();

            if ($leaveTypes->isEmpty() || $leavePolicies->isEmpty()) {
                $this->command->warn('No leave types or policies found for company: ' . $company->name . '. Please run LeaveTypeSeeder and LeavePolicySeeder first.');

                continue;
            }

            // Get managers for approval
            $managers = User::whereIn('type', ['manager', 'hr'])->where('created_by', $company->id)->get();

            // Track processed weeks to avoid duplicating leaves across month boundaries
            $processedWeeks = [];

            // Outer loop: month first
            for ($month = 7; $month <= 12; $month++) {
                $firstDayOfMonth = Carbon::create($currentYear, $month, 1)->startOfMonth();
                $lastDayOfMonth = $firstDayOfMonth->copy()->endOfMonth();
                $startOfWeek = $firstDayOfMonth->copy()->startOfWeek(); // Monday

                while ($startOfWeek->lte($lastDayOfMonth)) {
                    $weekKey = $startOfWeek->format('Y-m-d');
                    if (in_array($weekKey, $processedWeeks)) {
                        $startOfWeek->addWeek();
                        continue;
                    }
                    $processedWeeks[] = $weekKey;

                    // Randomly determine the number of employees on leave this week (between 4 and 5)
                    $targetCount = rand(4, min($employees->count(), 5));

                    // Pick random distinct employees for this week
                    $selectedEmployeesForWeek = $employees->random($targetCount);

                    foreach ($selectedEmployeesForWeek as $employee) {
                        // Pick a random pattern
                        $pattern = $monthlyLeavePatterns[array_rand($monthlyLeavePatterns)];

                        // Find matching leave type and policy for this employee's random pattern
                        $leaveType = $leaveTypes->where('name', $pattern['leave_type'])->first();
                        if (!$leaveType) {
                            $leaveType = $leaveTypes->first();
                        }

                        $leavePolicy = $leavePolicies->where('leave_type_id', $leaveType->id)->first();
                        if (!$leavePolicy) {
                            $leavePolicy = $leavePolicies->first();
                        }

                        // Pick a random approver per employee
                        $approver = $managers->isNotEmpty() ? $managers->random() : null;

                        // Calculate leave days/offsets (fit exactly within Monday to Friday of this week)
                        $duration = min($pattern['days'], 5); // Must not exceed 5 working days
                        $startOffset = rand(0, 5 - $duration); // Start offset between 0 (Monday) and (5 - duration)
                        $endOffset = $startOffset + $duration - 1;

                        $startDate = Carbon::parse($startOfWeek->copy()->addDays($startOffset)->format('Y-m-d'));
                        $endDate = Carbon::parse($startOfWeek->copy()->addDays($endOffset)->format('Y-m-d'));
                        $leaveDays = $duration;

                        // Check if leave application already exists
                        if (
                            LeaveApplication::where('employee_id', $employee->id)
                                ->where('start_date', $startDate)
                                ->where('leave_type_id', $leaveType->id)
                                ->exists()
                        ) {
                            continue;
                        }

                        try {
                            LeaveApplication::create([
                                'employee_id' => $employee->id,
                                'leave_type_id' => $leaveType->id,
                                'leave_policy_id' => $leavePolicy->id,
                                'start_date' => $startDate,
                                'end_date' => $endDate,
                                'total_days' => $leaveDays,
                                'reason' => $pattern['reason'],
                                'attachment' => randomImage(),
                                'status' => $pattern['status'],
                                'manager_comments' => $pattern['status'] === 'approved' ? 'Leave approved as per company policy' : null,
                                'approved_by' => $pattern['status'] === 'approved' ? $approver?->id : null,
                                'approved_at' => $pattern['status'] === 'approved' ? now() : null,
                                'created_by' => $employee->id,
                            ]);
                        } catch (\Exception $e) {
                            $this->command->error('Failed to create leave application for employee: ' . $employee->name . ' in month: ' . $month . ' for company: ' . $company->name);

                            continue;
                        }
                    }

                    $startOfWeek->addWeek();
                }
            }
        }

        $this->command->info('LeaveApplication seeder completed successfully!');
    }
}
