<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fetch all existing feedbacks
        $feedbacks = DB::table('interview_feedback')->get();

        foreach ($feedbacks as $feedback) {
            $interviewers = explode(',', $feedback->interviewer_id);
            
            // If the record has multiple comma-separated interviewers
            if (count($interviewers) > 1) {
                
                // 1. Update the original record to only contain the first interviewer ID
                DB::table('interview_feedback')
                    ->where('id', $feedback->id)
                    ->update(['interviewer_id' => trim($interviewers[0])]);
                
                // 2. Loop through the remaining interviewers and create a duplicate record for each
                for ($i = 1; $i < count($interviewers); $i++) {
                    $newFeedback = (array) $feedback;
                    
                    // Remove the original ID so the database can auto-increment a new one
                    unset($newFeedback['id']); 
                    
                    // Set the interviewer_id to the separated ID
                    $newFeedback['interviewer_id'] = trim($interviewers[$i]);
                    
                    // Insert the new duplicated record
                    DB::table('interview_feedback')->insert($newFeedback);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Note: Reversing this perfectly is difficult because you would need to group 
        // identical feedbacks by interview_id and created_at and concatenate them again.
        // It's recommended to take a database backup before running the 'up' method.
    }
};
