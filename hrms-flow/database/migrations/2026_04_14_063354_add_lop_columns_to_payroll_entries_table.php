<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payroll_entries')) {
            Schema::table('payroll_entries', function (Blueprint $table) {
                if (! Schema::hasColumn('payroll_entries', 'lop_days')) {
                    $table->decimal('lop_days', 5, 2)->default(0)->after('absent_days');
                }
                if (! Schema::hasColumn('payroll_entries', 'lop_deduction')) {
                    $table->decimal('lop_deduction', 10, 2)->default(0)->after('lop_days');
                }
                if (! Schema::hasColumn('payroll_entries', 'effective_paid_days')) {
                    $table->decimal('effective_paid_days', 5, 2)->default(0)->after('lop_deduction');
                }
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('payroll_entries')) {
            return;
        }

        Schema::table('payroll_entries', function (Blueprint $table) {
            $columns = ['lop_days', 'lop_deduction', 'effective_paid_days'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('payroll_entries', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
