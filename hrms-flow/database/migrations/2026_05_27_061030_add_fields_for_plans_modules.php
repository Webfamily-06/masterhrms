<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if ( isSaaS() && Schema::hasTable('plan_requests')) {
            Schema::table('plan_requests', function (Blueprint $table) {
                if (! Schema::hasColumn('plan_requests', 'billing_cycle')) {
                    $table->string('billing_cycle')->default('monthly')->nullable()->after('plan_id');
                }
            });
        }

        if ( isSaaS() && Schema::hasTable('plan_orders')) {
            Schema::table('plan_orders', function (Blueprint $table) {
                if (! Schema::hasColumn('plan_orders', 'receipt')) {
                    $table->string('receipt')->nullable()->after('payment_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('plan_requests')) {
            Schema::table('plan_requests', function (Blueprint $table) {
                if (Schema::hasColumn('plan_requests', 'billing_cycle')) {
                    $table->dropColumn('billing_cycle');
                }
            });
        }

        if (Schema::hasTable('plan_orders')) {
            Schema::table('plan_orders', function (Blueprint $table) {
                if (Schema::hasColumn('plan_orders', 'receipt')) {
                    $table->dropColumn('receipt');
                }
            });
        }
    }
};
