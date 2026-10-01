<?php

namespace Database\Seeders;

use App\Models\AttendancePolicy;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\Shift;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class AttendanceRecordSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing weekend records first
        $this->clearWeekendRecords();

        // $companies = User::where('type', 'company')->where('email', 'company@example.com')->get();
        $companies = User::where('type', 'company')->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No company users found.');

            return;
        }
        $currentYear = date('Y');

        foreach ($companies as $company) {
            $employees = User::where('type', 'employee')
                ->where('created_by', $company->id)
                ->get();

            if ($employees->isEmpty()) {
                continue;
            }

            // Process months 1 to 6
            for ($month = 7; $month <= 12; $month++) {
                $this->processMonth($company, $employees, $currentYear, $month);
            }
        }

        $this->command->info('AttendanceRecord seeder completed successfully!');
    }

    private function clearWeekendRecords()
    {
        $currentYear = (int) date('Y');
        for ($month = 1; $month <= 12; $month++) {
            $startDate = Carbon::create($currentYear, $month, 1);
            $endDate = $startDate->copy()->endOfMonth();

            for ($day = 1; $day <= $endDate->day; $day++) {
                $currentDate = Carbon::create($currentYear, $month, $day);

                if ($currentDate->dayOfWeek == 6 || $currentDate->dayOfWeek == 0) {
                    AttendanceRecord::whereDate('date', $currentDate->format('Y-m-d'))->delete();
                }
            }
        }
    }

    private function processMonth($company, $employees, $year, $month)
    {
        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth();

        for ($day = 1; $day <= $endDate->day; $day++) {
            $currentDate = Carbon::create($year, $month, $day);

            // Skip Saturday (6) and Sunday (0)
            if ($currentDate->dayOfWeek == 6 || $currentDate->dayOfWeek == 0) {
                continue;
            }

            $dateString = $currentDate->format('Y-m-d');

            // Process each employee for this date
            foreach ($employees as $employee) {
                $this->createAttendanceForEmployee($company, $employee, $dateString);
            }
        }
    }

    private function createAttendanceForEmployee($company, $employee, $dateString)
    {
        // Skip weekends — no attendance records on Saturday or Sunday
        $currentDate = Carbon::parse($dateString);
        if ($currentDate->isWeekend()) {
            return;
        }

        // Get employee record
        $employeeRecord = Employee::where('user_id', $employee->id)->first();

        if (!$employeeRecord || !$employeeRecord->shift_id || !$employeeRecord->attendance_policy_id) {
            return;
        }

        $shift = Shift::find($employeeRecord->shift_id);
        $attendancePolicy = AttendancePolicy::find($employeeRecord->attendance_policy_id);

        if (!$shift || !$attendancePolicy) {
            return;
        }

        // Check if employee is on leave
        $isOnLeave = LeaveApplication::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where('start_date', '<=', $dateString)
            ->where('end_date', '>=', $dateString)
            ->exists();

        // Check if record already exists
        $existingRecord = AttendanceRecord::where('employee_id', $employee->id)
            ->where('date', $dateString)
            ->first();

        if ($existingRecord) {
            return;
        }

        if ($isOnLeave) {
            // Create leave attendance
            $record = AttendanceRecord::create([
                'employee_id' => $employee->id,
                'shift_id' => $shift->id,
                'attendance_policy_id' => $attendancePolicy->id,
                'clock_in' => null,
                'clock_out' => null,
                'date' => $dateString,
                'status' => 'on_leave',
                'is_absent' => false,
                'total_hours' => 0,
                'notes' => 'Employee on approved leave',
                'created_by' => $company->id,
            ]);
        } else {
            // Create regular attendance
            $pattern = $this->getAttendancePattern($dateString, $shift, $employee->id);

            $record = AttendanceRecord::create([
                'employee_id' => $employee->id,
                'shift_id' => $shift->id,
                'attendance_policy_id' => $attendancePolicy->id,
                'date' => $dateString,
                'clock_in' => $pattern['clock_in'],
                'clock_out' => $pattern['clock_out'],
                'status' => $pattern['status'],
                'notes' => $pattern['notes'],
                'created_by' => $company->id,
            ]);

            // Process attendance calculations
            $record->processAttendance();
        }
    }

    private function getAttendancePattern($dateString, $shift, $employeeId)
    {
        $date = Carbon::parse($dateString);
        $dayOfMonth = $date->day;
        $shiftStart = Carbon::parse($shift->start_time);
        $shiftEnd = Carbon::parse($shift->end_time);

        // Distribution: 60% present, 10% overtime, 10% late, 10% early departure, 10% absent
        // Include employeeId in roll so different employees get different patterns on same day
        $roll = ($dayOfMonth + $employeeId) % 10;

        if ($roll < 6) {
            // 60% — Regular full present (days 0,1,2,3,4,5)
            return [
                'clock_in' => $shiftStart->format('H:i:s'),
                'clock_out' => $shiftEnd->format('H:i:s'),
                'status' => 'present',
                'notes' => 'Regular attendance',
            ];
        } elseif ($roll === 6) {
            // 10% — Overtime (day 6)
            return [
                'clock_in' => $shiftStart->format('H:i:s'),
                'clock_out' => $shiftEnd->copy()->addHours(2)->format('H:i:s'),
                'status' => 'present',
                'notes' => 'Overtime work',
            ];
        } elseif ($roll === 7) {
            // 10% — Late arrival (day 7)
            return [
                'clock_in' => $shiftStart->copy()->addMinutes(25)->format('H:i:s'),
                'clock_out' => $shiftEnd->format('H:i:s'),
                'status' => 'present',
                'notes' => 'Late arrival',
            ];
        } elseif ($roll === 8) {
            // 10% — Early departure (day 8)
            return [
                'clock_in' => $shiftStart->format('H:i:s'),
                'clock_out' => $shiftEnd->copy()->subMinutes(40)->format('H:i:s'),
                'status' => 'present',
                'notes' => 'Early departure',
            ];
        } else {
            // 10% — Absent (day 9): clock_in at shift start, clock_out after 1 hour
            // processAttendance() will mark as absent since total_hours < half day threshold
            return [
                'clock_in' => $shiftStart->format('H:i:s'),
                'clock_out' => $shiftStart->copy()->addHour()->format('H:i:s'),
                'status' => 'present',
                'notes' => 'Absent',
            ];
        }
    }
}
