<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerProgress extends Model
{
    protected $fillable = ['user_id', 'progress'];

    protected function casts(): array
    {
        return [
            'progress' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
