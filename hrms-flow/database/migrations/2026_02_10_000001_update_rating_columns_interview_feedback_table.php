<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('interview_feedback')) {
            Schema::table('interview_feedback', function (Blueprint $table) {
                if (Schema::hasColumn('interview_feedback', 'technical_rating')) {
                    $table->decimal('technical_rating', 3, 1)->nullable()->change();
                }
                if (Schema::hasColumn('interview_feedback', 'communication_rating')) {
                    $table->decimal('communication_rating', 3, 1)->nullable()->change();
                }
                if (Schema::hasColumn('interview_feedback', 'cultural_fit_rating')) {
                    $table->decimal('cultural_fit_rating', 3, 1)->nullable()->change();
                }
                if (Schema::hasColumn('interview_feedback', 'overall_rating')) {
                    $table->decimal('overall_rating', 3, 1)->nullable()->change();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('interview_feedback')) {
            Schema::table('interview_feedback', function (Blueprint $table) {
                if (Schema::hasColumn('interview_feedback', 'technical_rating')) {
                    $table->integer('technical_rating')->nullable()->change();
                }
                if (Schema::hasColumn('interview_feedback', 'communication_rating')) {
                    $table->integer('communication_rating')->nullable()->change();
                }
                if (Schema::hasColumn('interview_feedback', 'cultural_fit_rating')) {
                    $table->integer('cultural_fit_rating')->nullable()->change();
                }
                if (Schema::hasColumn('interview_feedback', 'overall_rating')) {
                    $table->integer('overall_rating')->nullable()->change();
                }
            });
        }
    }
};
