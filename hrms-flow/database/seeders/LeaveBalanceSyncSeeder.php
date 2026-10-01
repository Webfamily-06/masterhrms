<?php

namespace Database\Seeders;

use App\Models\LeaveBalanceSync;
use App\Models\User;
use Illuminate\Database\Seeder;

class LeaveBalanceSyncSeeder extends Seeder
{
    public function run(): void
    {
        $companies = User::where('type', 'company')->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No company users found. Please run DefaultCompanySeeder first.');
            return;
        }

        $currentYear  = (int) date('Y');
        $previousYear = $currentYear - 1;

        foreach ($companies as $company) {
            $this->syncForYear($company, $previousYear, now()->subYear()->startOfYear()->addDays(5));
            $this->syncForYear($company, $currentYear,  now()->startOfYear()->addDays(3));
        }

        $this->command->info('LeaveBalanceSync seeder completed successfully!');
    }

    private function syncForYear(object $company, int $year, $syncedAt): void
    {
        $exists = LeaveBalanceSync::where('created_by', $company->id)
            ->where('year', $year)
            ->exists();

        if ($exists) {
            $this->command->warn("Skipping: sync already exists for company [{$company->name}] year [{$year}].");
            return;
        }

        LeaveBalanceSync::create([
            'created_by' => $company->id,
            'year'       => $year,
            'synced_at'  => $syncedAt,
            'synced_by'  => $company->id,
        ]);

        $this->command->info("Inserted sync for company [{$company->name}] year [{$year}].");
    }
}
