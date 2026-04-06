<?php

namespace App\Http\Controllers;

use App\Models\PlayerProgress;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function save(Request $request)
    {
        $request->validate([
            'progress' => 'required|array',
        ]);

        PlayerProgress::updateOrCreate(
            ['user_id' => $request->user()->id],
            ['progress' => $request->input('progress')]
        );

        return response()->json(['message' => 'Progress saved.']);
    }

    public function load(Request $request)
    {
        $record = PlayerProgress::where('user_id', $request->user()->id)->first();

        if (!$record) {
            return response()->json(['progress' => null], 404);
        }

        return response()->json(['progress' => $record->progress]);
    }
}
