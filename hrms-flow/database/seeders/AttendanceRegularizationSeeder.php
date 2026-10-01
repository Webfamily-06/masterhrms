<?php

namespace Database\Seeders;

use App\Models\AttendanceRecord;
use App\Models\AttendanceRegularization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class AttendanceRegularizationSeeder extends Seeder
{
    public function run(): void
    {
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

            // Get managers/HR for approval
            $managers = User::whereIn('type', ['manager', 'hr'])
                ->where('created_by', $company->id)
                ->get();

            // Select only 5 employees
            $selectedEmployees = $employees->take(5);

            // Process months 1 to 6 (matches AttendanceRecordSeeder)
            for ($month = 7; $month <= 12; $month++) {
                $this->processMonth($company, $selectedEmployees, $managers, $currentYear, $month);
            }
        }

        $this->command->info('AttendanceRegularization seeder completed successfully!');
    }

    private function processMonth($company, $employees, $managers, $year, $month)
    {
        foreach ($employees as $employee) {
            // Get attendance records for this employee in this month (exclude on_leave)
            $attendanceRecords = AttendanceRecord::where('employee_id', $employee->id)
                ->whereYear('date', $year)
                ->whereMonth('date', $month)
                ->where('status', '!=', 'on_leave')
                ->get();

            if ($attendanceRecords->isEmpty()) {
                continue;
            }

            // Create 2-3 regularization requests per employee per month
            $recordsToRegularize = $attendanceRecords->take(3);

            foreach ($recordsToRegularize as $index => $record) {
                $this->createRegularization($company, $employee, $managers, $record, $index);
            }
        }
    }

    private function createRegularization($company, $employee, $managers, $attendanceRecord, $index)
    {
        // Check if regularization already exists
        if (
            AttendanceRegularization::where('employee_id', $employee->id)
                ->where('attendance_record_id', $attendanceRecord->id)
                ->exists()
        ) {
            return;
        }

        // Get pattern based on index
        $pattern = $this->getRegularizationPattern($attendanceRecord, $index);

        // Pick a random manager/HR as approver, fallback to company
        $manager = $managers->isNotEmpty() ? $managers->random() : $company;

        AttendanceRegularization::create([
            'employee_id' => $employee->id,
            'attendance_record_id' => $attendanceRecord->id,
            'date' => $attendanceRecord->date,
            'requested_clock_in' => $pattern['requested_clock_in'],
            'requested_clock_out' => $pattern['requested_clock_out'],
            'original_clock_in' => $attendanceRecord->clock_in,
            'original_clock_out' => $attendanceRecord->clock_out,
            'reason' => $pattern['reason'],
            'status' => $pattern['status'],
            'manager_comments' => $pattern['manager_comments'],
            'approved_by' => in_array($pattern['status'], ['approved', 'rejected']) ? $manager->id : null,
            'approved_at' => in_array($pattern['status'], ['approved', 'rejected']) ? now() : null,
            'created_by' => $employee->id,
        ]);
    }

    private function getRegularizationPattern($attendanceRecord, $index)
    {
        $originalClockIn = $attendanceRecord->clock_in ? Carbon::parse($attendanceRecord->clock_in) : null;
        $originalClockOut = $attendanceRecord->clock_out ? Carbon::parse($attendanceRecord->clock_out) : null;

        switch (rand(0, 8)) {
            case 0: // Late arrival correction
                $requestedClockIn = $originalClockIn ? $originalClockIn->copy()->subMinutes(30) : Carbon::parse('09:00:00');

                return [
                    'requested_clock_in' => $requestedClockIn->format('H:i:s'),
                    'requested_clock_out' => $originalClockOut ? $originalClockOut->format('H:i:s') : null,
                    'reason' => 'Traffic jam caused delay, requesting time correction',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];

            case 1: // Early departure correction
                $requestedClockOut = $originalClockOut ? $originalClockOut->copy()->addMinutes(45) : Carbon::parse('18:00:00');

                return [
                    'requested_clock_in' => $originalClockIn ? $originalClockIn->format('H:i:s') : null,
                    'requested_clock_out' => $requestedClockOut->format('H:i:s'),
                    'reason' => 'Had to leave early for medical appointment, worked from home later',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];

            case 2: // Missing punch correction
                return [
                    'requested_clock_in' => $originalClockIn ? $originalClockIn->format('H:i:s') : '09:00:00',
                    'requested_clock_out' => $originalClockOut ? $originalClockOut->format('H:i:s') : '18:00:00',
                    'reason' => 'Biometric device malfunction, forgot to punch in/out',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];

            case 3: // Work from home correction
                $requestedClockIn = $originalClockIn ? $originalClockIn->copy()->subMinutes(15) : Carbon::parse('09:00:00');
                $requestedClockOut = $originalClockOut ? $originalClockOut->copy()->addMinutes(30) : Carbon::parse('18:00:00');

                return [
                    'requested_clock_in' => $requestedClockIn->format('H:i:s'),
                    'requested_clock_out' => $requestedClockOut->format('H:i:s'),
                    'reason' => 'Was working from home, forgot to mark attendance on the system',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];

            case 4: // System error correction
                $requestedClockIn = $originalClockIn ? $originalClockIn->copy()->subMinutes(10) : Carbon::parse('09:00:00');
                $requestedClockOut = $originalClockOut ? $originalClockOut->copy()->addMinutes(20) : Carbon::parse('18:00:00');

                return [
                    'requested_clock_in' => $requestedClockIn->format('H:i:s'),
                    'requested_clock_out' => $requestedClockOut->format('H:i:s'),
                    'reason' => 'System error during clock in/out, actual time was different',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];

            case 5: // Power outage correction
                $requestedClockIn = $originalClockIn ? $originalClockIn->copy()->subMinutes(20) : Carbon::parse('09:00:00');
                $requestedClockOut = $originalClockOut ? $originalClockOut->copy()->addMinutes(15) : Carbon::parse('18:00:00');

                return [
                    'requested_clock_in' => $requestedClockIn->format('H:i:s'),
                    'requested_clock_out' => $requestedClockOut->format('H:i:s'),
                    'reason' => 'Power outage at office caused attendance system to be unavailable',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];

            case 6: // Client visit correction
                $requestedClockIn = $originalClockIn ? $originalClockIn->copy()->subMinutes(25) : Carbon::parse('08:30:00');
                $requestedClockOut = $originalClockOut ? $originalClockOut->copy()->addMinutes(60) : Carbon::parse('19:00:00');

                return [
                    'requested_clock_in' => $requestedClockIn->format('H:i:s'),
                    'requested_clock_out' => $requestedClockOut->format('H:i:s'),
                    'reason' => 'Was at client site for meeting, could not access office attendance system',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];

            case 7: // Internet issue correction
                $requestedClockIn = $originalClockIn ? $originalClockIn->copy()->subMinutes(10) : Carbon::parse('09:00:00');
                $requestedClockOut = $originalClockOut ? $originalClockOut->copy()->addMinutes(10) : Carbon::parse('18:00:00');

                return [
                    'requested_clock_in' => $requestedClockIn->format('H:i:s'),
                    'requested_clock_out' => $requestedClockOut->format('H:i:s'),
                    'reason' => 'Internet connectivity issue prevented online attendance marking',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];

            default: // ID card issue correction
                $requestedClockIn = $originalClockIn ? $originalClockIn->copy()->subMinutes(15) : Carbon::parse('09:00:00');
                $requestedClockOut = $originalClockOut ? $originalClockOut->copy()->addMinutes(25) : Carbon::parse('18:00:00');

                return [
                    'requested_clock_in' => $requestedClockIn->format('H:i:s'),
                    'requested_clock_out' => $requestedClockOut->format('H:i:s'),
                    'reason' => 'ID card was not working properly, security manually logged entry and exit',
                    'status' => 'pending',
                    'manager_comments' => null,
                ];
        }
    }
}
