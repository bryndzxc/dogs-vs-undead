<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\ProgressController;
use Illuminate\Support\Facades\Route;

// --- Public ---
Route::post('register', [AuthController::class, 'register']);
Route::post('login',    [AuthController::class, 'login']);
Route::get('leaderboard', [LeaderboardController::class, 'index']);

// --- Authenticated (Sanctum bearer token) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::get('me',     [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout']);

    Route::post('submit-score',   [LeaderboardController::class, 'submit']);
    Route::post('save-progress',  [ProgressController::class, 'save']);
    Route::get('load-progress',   [ProgressController::class, 'load']);
});
