<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only proceed if the table exists and user_id column exists
        if (!Schema::hasTable('login_histories')) {
            return;
        }

        // Step 1: Delete orphaned rows where user_id does not exist in users table
        // This prevents FK constraint violation on existing data
        DB::statement('
            DELETE FROM login_histories
            WHERE user_id IS NULL
               OR user_id = \'\'
               OR CAST(user_id AS UNSIGNED) NOT IN (SELECT id FROM users)
        ');

        // Step 2: Change user_id type and add FK constraint
        if (Schema::hasColumn('login_histories', 'user_id')) {
            Schema::table('login_histories', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->change();
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('login_histories')) {
            return;
        }

        // Drop FK only if it exists
        if (Schema::hasColumn('login_histories', 'user_id')) {
            Schema::table('login_histories', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->string('user_id')->change();
            });
        }
    }
};
