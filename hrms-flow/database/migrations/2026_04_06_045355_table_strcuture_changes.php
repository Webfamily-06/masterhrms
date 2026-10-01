<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('resignations') && Schema::hasColumn('resignations', 'last_working_day')) {
            Schema::table('resignations', function (Blueprint $table) {
                $table->date('last_working_day')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('resignations') && Schema::hasColumn('resignations', 'last_working_day')) {
            Schema::table('resignations', function (Blueprint $table) {
                $table->date('last_working_day')->nullable(false)->change();
            });
        }
    }
};
