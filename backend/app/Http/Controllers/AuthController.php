<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'username'              => 'required|string|min:2|max:32|unique:users,username|alpha_dash',
            'password'              => 'required|string|min:6',
            'password_confirmation' => 'required|same:password',
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'password' => $validated['password'],
        ]);

        $token = $user->createToken('dvz-auth')->plainTextToken;

        return response()->json([
            'user'  => ['id' => $user->id, 'username' => $user->username],
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid username or password.'], 401);
        }

        $token = $user->createToken('dvz-auth')->plainTextToken;

        return response()->json([
            'user'  => ['id' => $user->id, 'username' => $user->username],
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => ['id' => $user->id, 'username' => $user->username],
        ]);
    }
}
