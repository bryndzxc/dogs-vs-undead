<?php

namespace App\Http\Controllers;

use App\Models\LeaderboardEntry;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function index()
    {
        $rows = LeaderboardEntry::with('user')
            ->orderByDesc('highest_level')
            ->orderByDesc('total_stars')
            ->orderByDesc('score')
            ->limit(100)
            ->get();

        $leaderboard = $rows->map(fn($entry) => [
            'username'      => $entry->user->username,
            'highest_level' => $entry->highest_level,
            'total_stars'   => $entry->total_stars,
            'score'         => $entry->score,
        ]);

        return response()->json(['leaderboard' => $leaderboard]);
    }

    public function submit(Request $request)
    {
        $validated = $request->validate([
            'highest_level' => 'required|integer|min:0',
            'total_stars'   => 'required|integer|min:0',
            'score'         => 'required|integer|min:0',
            'metadata'      => 'nullable|array',
        ]);

        $userId = $request->user()->id;

        $entry = LeaderboardEntry::firstOrNew(['user_id' => $userId]);

        // Only update if the new submission is better (highest level → stars → score).
        $isBetter =
            $validated['highest_level'] > $entry->highest_level ||
            ($validated['highest_level'] === $entry->highest_level && $validated['total_stars'] > $entry->total_stars) ||
            ($validated['highest_level'] === $entry->highest_level && $validated['total_stars'] === $entry->total_stars && $validated['score'] > $entry->score);

        if (!$entry->exists || $isBetter) {
            $entry->fill([
                'user_id'       => $userId,
                'highest_level' => $validated['highest_level'],
                'total_stars'   => $validated['total_stars'],
                'score'         => $validated['score'],
                'metadata'      => $validated['metadata'] ?? null,
            ])->save();
        }

        return response()->json(['message' => 'Score recorded.']);
    }
}
