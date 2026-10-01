<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class PayrollRun extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'title',
        'payroll_frequency',
        'pay_period_start',
        'pay_period_end',
        'pay_date',
        'total_gross_pay',
        'total_deductions',
        'total_net_pay',
        'employee_count',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'pay_period_start' => 'date:Y-m-d',
        'pay_period_end' => 'date:Y-m-d',
        'pay_date' => 'date:Y-m-d',
        'total_gross_pay' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'total_net_pay' => 'decimal:2',
    ];

    /**
     * Get the payroll entries.
     */
    public function payrollEntries()
    {
        return $this->hasMany(PayrollEntry::class);
    }

    /**
     * Get the payslips through payroll entries.
     */
    public function payslips()
    {
        return $this->hasManyThrough(Payslip::class, PayrollEntry::class);
    }

    /**
     * Get the user who created the payroll run.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Calculate and update totals.
     */
    public function calculateTotals()
    {
        $entries = $this->payrollEntries;

        $this->total_gross_pay = $entries->sum('gross_pay');
        $this->total_deductions = $entries->sum('total_deductions');
        $this->total_net_pay = $entries->sum('net_pay');
        $this->employee_count = $entries->count();

        $this->save();
    }

    /**
     * Process payroll for all employees.
     */
    public function processPayroll()
    {
        if ($this->status !== 'draft') {
            return false;
        }

        $this->status = 'draft';
        $this->save();

        try {
            // Get all active employees
            $employees = User::with('employee')->where('type', 'employee')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->whereHas('employee', function ($q) {
                    $q->whereIn('employee_status', ['active', 'probation']);
                })
                ->orderby('id', 'desc')
                ->get();

            foreach ($employees as $employee) {
                $this->processEmployeePayroll($employee);
            }

            $this->calculateTotals();
            $this->status = 'completed';
            $this->save();

            return true;
        } catch (\Exception $e) {
            $this->status = 'draft';
            $this->save();
            throw $e;
        }
    }

    /**
     * Process payroll for individual employee.
     */
    private function processEmployeePayroll($employee)
    {
        // Skip if entry already exists for this employee in this run
        $existingEntry = PayrollEntry::where('payroll_run_id', $this->id)
            ->where('employee_id', $employee->id)
            ->exists();

        if ($existingEntry) {
            return;
        }

        // Working days config from global settings
        $globalSettings     = settings();
        $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[]', true);

        if (empty($workingDaysIndices)) {
            throw new \Exception(__('Please configure working days first.'));
        }

        // Get active salary record — holds the components list (earnings/deductions)
        // calculateAllComponents will resolve base_salary from employees.base_salary internally
        $employeeSalary = EmployeeSalary::getActiveSalary($employee->id);

        if (! $employeeSalary) {
            return;
        }

        // Pass $employee so calculateAllComponents resolves base_salary from employees table
        // Returns null if employee has no base_salary configured
        $salaryBreakdown = $employeeSalary->calculateAllComponents($employee);

        if (! $salaryBreakdown) {
            return;
        }

        $basicSalary     = (float) $salaryBreakdown['basic_salary'];
        $totalEarnings   = (float) $salaryBreakdown['total_earnings'];   // basic + all earning components
        $totalDeductions = (float) $salaryBreakdown['total_deductions']; // sum of deduction components

        // ---------------------------------------------------------------
        // STEP 1: Calculate total working days in pay period
        // Only days matching configured working day indices are counted
        // ---------------------------------------------------------------
        $startDate        = new \DateTime($this->pay_period_start);
        $endDate          = new \DateTime($this->pay_period_end);
        $totalWorkingDays = 0;

        for ($date = clone $startDate; $date <= $endDate; $date->modify('+1 day')) {
            if (in_array((int) $date->format('w'), $workingDaysIndices)) {
                $totalWorkingDays++;
            }
        }

        // ---------------------------------------------------------------
        // STEP 2: Attendance summary from attendance records
        // ---------------------------------------------------------------
        $attendanceRecords = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('date', [$this->pay_period_start, $this->pay_period_end])
            ->get();

        $fullPresentDays = (int)   $attendanceRecords->where('status', 'present')->count();
        $halfDays        = (int)   $attendanceRecords->where('status', 'half_day')->count();
        $absentDays      = (int)   $attendanceRecords->where('status', 'absent')->count();
        $holidayDays     = (int)   $attendanceRecords->where('status', 'holiday')->count();
        $overtimeHours   = (float) $attendanceRecords->sum('overtime_hours');
        $overtimeAmount  = (float) $attendanceRecords->sum('overtime_amount');

      

        // ---------------------------------------------------------------
        // STEP 3: Leave data for pay period
        // ---------------------------------------------------------------
        $leaveData       = $this->getEmployeeLeaveData($employee->id);
        $paidLeaveDays   = (float) $leaveData['paid_leave_days'];
        $unpaidLeaveDays = (float) $leaveData['unpaid_leave_days'];

        // ---------------------------------------------------------------
        // STEP 4: Effective paid days
        // These are the days the employee is entitled to be paid for:
        //   - Full present days
        //   - Holiday days (company holidays = paid)
        //   - Approved paid leave days
        //   - Half days count as 0.5 each
        // ---------------------------------------------------------------

        // present_days = full present days + half days counted as 0.5
        $presentDays       = $fullPresentDays + $holidayDays + $paidLeaveDays + ($halfDays * 0.5);
        $effectivePaidDays = $fullPresentDays + $holidayDays + $paidLeaveDays + ($halfDays * 0.5);

        // Cap effectivePaidDays to totalWorkingDays (cannot exceed total)
        $effectivePaidDays = min((float) $effectivePaidDays, (float) $totalWorkingDays);

        // ---------------------------------------------------------------
        // STEP 5: LOP (Loss of Pay) calculation
        // First: all missing days (absent + unpaid leave)
        // Then:  subtract unpaid leave → LOP = only absent/unaccounted days
        // ---------------------------------------------------------------
        $lopDays = max(0.0, $totalWorkingDays - $effectivePaidDays); // absent + unpaid leave
        $lopDays = max(0.0, $lopDays - $unpaidLeaveDays);            // remove unpaid leave → only absent
        // ---------------------------------------------------------------
        // STEP 6: Per day salary — based on basic salary only
        // Used for LOP deduction and unpaid leave deduction
        // ---------------------------------------------------------------
        $perDaySalary = $totalWorkingDays > 0 ? round($basicSalary / $totalWorkingDays, 4) : 0.0;

        // ---------------------------------------------------------------
        // STEP 7: Deductions from salary
        //   lopDeduction         = perDaySalary × lopDays
        //   unpaidLeaveDeduction = perDaySalary × unpaidLeaveDays
        //   (unpaid leaves are on top of LOP — explicit leave without pay)
        // ---------------------------------------------------------------
        $lopDeduction         = round($perDaySalary * $lopDays, 2);
        $unpaidLeaveDeduction = round($perDaySalary * $unpaidLeaveDays, 2);

        // ---------------------------------------------------------------
        // STEP 8: Gross and Net salary
        //   grossSalary = total_earnings - lopDeduction - unpaidLeaveDeduction + overtime
        //   netSalary   = grossSalary - component deductions
        //   Both clamped to 0 (cannot be negative)
        // ---------------------------------------------------------------
        $grossSalary = $totalEarnings - $lopDeduction - $unpaidLeaveDeduction + $overtimeAmount;
        $grossSalary = max(0.0, round($grossSalary, 2));

        $netSalary = max(0.0, round($grossSalary - $totalDeductions, 2));

        // component_earnings = all earning components excluding basic salary
        $componentEarnings = round($totalEarnings - $basicSalary, 2);

        // ---------------------------------------------------------------
        // STEP 9: Persist payroll entry
        // ---------------------------------------------------------------
        PayrollEntry::create([
            'payroll_run_id'       => $this->id,
            'employee_id'          => $employee->id,
            'basic_salary'         => $basicSalary,
            'component_earnings'   => $componentEarnings,
            'total_earnings'       => $totalEarnings,
            'total_deductions'     => $totalDeductions,
            'gross_pay'            => $grossSalary,
            'net_pay'              => $netSalary,
            'working_days'         => $totalWorkingDays,
            'present_days'         => $presentDays,
            'full_present_days'    => $fullPresentDays,
            'half_days'            => $halfDays,
            'holiday_days'         => $holidayDays,
            'paid_leave_days'      => $paidLeaveDays,
            'unpaid_leave_days'    => $unpaidLeaveDays,
            'absent_days'            => $absentDays,
            'lop_days'               => $lopDays,
            'lop_deduction'          => $lopDeduction,
            'effective_paid_days'    => $effectivePaidDays,
            'overtime_hours'         => $overtimeHours,
            'overtime_amount'        => $overtimeAmount,
            'per_day_salary'         => $perDaySalary,
            'unpaid_leave_deduction' => $unpaidLeaveDeduction,
            'earnings_breakdown'   => $salaryBreakdown['earnings'],
            'deductions_breakdown' => $salaryBreakdown['deductions'],
            'created_by'           => $this->created_by,
        ]);
    }

    /**
     * Get employee leave data for pay period.
     */
    private function getEmployeeLeaveData($employeeId)
    {
        $leaveApplications = \App\Models\LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where(function ($query) {
                $query->whereBetween('start_date', [$this->pay_period_start, $this->pay_period_end])
                    ->orWhereBetween('end_date', [$this->pay_period_start, $this->pay_period_end])
                    ->orWhere(function ($q) {
                        $q->where('start_date', '<=', $this->pay_period_start)
                            ->where('end_date', '>=', $this->pay_period_end);
                    });
            })
            ->with('leaveType')
            ->get();

        $paidLeaveDays = 0;
        $unpaidLeaveDays = 0;

        foreach ($leaveApplications as $leave) {
            // Calculate days within pay period
            $leaveStart = max($leave->start_date, $this->pay_period_start);
            $leaveEnd = min($leave->end_date, $this->pay_period_end);
            $leaveDays = $leaveStart->diffInDays($leaveEnd) + 1;

            if ($leave->leaveType->is_paid) {
                $paidLeaveDays += $leaveDays;
            } else {
                $unpaidLeaveDays += $leaveDays;
            }
        }

        return [
            'paid_leave_days' => $paidLeaveDays,
            'unpaid_leave_days' => $unpaidLeaveDays,
        ];
    }
}
