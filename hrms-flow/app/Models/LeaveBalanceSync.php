<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalanceSync extends Model
{
    protected $fillable = ['created_by', 'year', 'synced_at', 'synced_by'];

    protected $casts = ['synced_at' => 'datetime'];

    public function syncedBy()
    {
        return $this->belongsTo(User::class, 'synced_by');
    }
}
