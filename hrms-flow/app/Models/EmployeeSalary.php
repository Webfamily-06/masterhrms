<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeSalary extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'basic_salary',
        'components',
        'is_active',
        'calculation_status',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'components' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get the employee.
     */
    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id','id');
    }



    /**
     * Get the user who created the salary.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get active salary for employee.
     */
    public static function getActiveSalary($employeeId)
    {
        return static::where('employee_id', $employeeId)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Get basic salary for employee.
     */
    public static function getBasicSalary($employeeId)
    {
        $salary = static::getActiveSalary($employeeId);
        return $salary ? $salary->basic_salary : 0;
    }

    /**
     * Calculate salary components.
     * Accepts a User $employee to resolve base_salary from employees.base_salary dynamically.
     * Falls back to $this->basic_salary if $employee is not provided.
     */
    public function calculateAllComponents($employee = null)
    {
        // Resolve basic salary: prefer employees.base_salary, fallback to this record's basic_salary
        $basicSalary = $employee?->employee?->base_salary
        ? (float) $employee->employee->base_salary
        : (float) $this->basic_salary;
        
        // If no valid base salary configured, skip this employee
        if (! $basicSalary || $basicSalary <= 0) {
            return null;
        }

        $selectedComponentIds = $this->components ?? [];
        $components = SalaryComponent::whereIn('id', $selectedComponentIds)
            ->where('status', 'active')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->get();

        $earnings        = ['Basic Salary' => $basicSalary];
        $deductions      = [];
        $totalEarnings   = $basicSalary;
        $totalDeductions = 0;

        foreach ($components as $component) {
            $amount = $component->calculateAmount($basicSalary);
            if ($component->type === 'earning') {
                $earnings[$component->name] = $amount;
                $totalEarnings += $amount;
            } else {
                $deductions[$component->name] = $amount;
                $totalDeductions += $amount;
            }
        }

        return [
            'basic_salary'    => $basicSalary,
            'earnings'        => $earnings,
            'deductions'      => $deductions,
            'total_earnings'  => $totalEarnings,
            'total_deductions'=> $totalDeductions,
            'gross_salary'    => $totalEarnings,
            'net_salary'      => $totalEarnings - $totalDeductions,
        ];
    }
}
