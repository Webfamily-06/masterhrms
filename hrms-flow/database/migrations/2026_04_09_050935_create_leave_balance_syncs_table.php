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
        if (!Schema::hasTable('leave_balance_syncs')) {
            Schema::create('leave_balance_syncs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->integer('year');
                $table->timestamp('synced_at')->nullable();
                $table->foreignId('synced_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_balance_syncs');
    }
};
