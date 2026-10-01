<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'type')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('type', 100)->default('company')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'type')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('type', 20)->default('company')->change();
            });
        }
    }
};
