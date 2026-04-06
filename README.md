# Dogs vs Undead

`Dogs vs Undead` is a browser-based lane defense game built with vanilla JavaScript and Phaser 3. The frontend runs directly from `index.html`, while the `backend/` folder contains an optional Laravel API for authentication, leaderboard features, and cloud saves.

## Project overview

- Phaser 3 game loaded from CDN
- Frontend code organized under `js/`
- Audio assets under `audio/`
- Optional Laravel backend under `backend/`
- Local progression stored in the browser, with optional cloud sync when the backend is available

## Project structure

```text
.
|-- index.html
|-- js/
|   |-- main.js
|   |-- Config.js
|   |-- LevelData.js
|   |-- ChapterData.js
|   |-- HomeData.js
|   |-- MissionData.js
|   |-- CollectibleData.js
|   |-- ApiClient.js
|   |-- CloudService.js
|   |-- AuthService.js
|   |-- OverlayUI.js
|   |-- TutorialUI.js
|   |-- Progression.js
|   |-- DrawUtils.js
|   |-- entities/
|   `-- scenes/
|-- audio/
|-- backend/
|-- validate-js.js
|-- validate-syntax.js
`-- check-syntax.js
```

## Running the game locally

### Frontend only

Serve the repository root with a local web server, then open the app in a browser.

This project does not have a frontend build step. `index.html` loads Phaser from:

```html
https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js
```

That means an internet connection is required unless you replace the CDN dependency with a local copy.

If you are using Laragon, you can point a local site at this folder and open the site normally in your browser.

### Optional backend

The frontend expects the API base URL to default to:

```text
backend/public/api
```

If you want login, leaderboard access, score submission, and cloud save/load, run the Laravel backend in `backend/`.

Typical Laravel setup:

```powershell
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Backend details confirmed from the repository:

- PHP `^8.2`
- Laravel `^12.0`
- Sanctum authentication
- API routes for `register`, `login`, `leaderboard`, `me`, `logout`, `submit-score`, `save-progress`, and `load-progress`

If you only want to play locally, the backend is optional. The game supports guest play and browser-based local saves.

## Core gameplay systems

From the current codebase, the project includes:

- Menu, level select, loadout, battle, UI, level complete, and home scenes
- Local progression and unlock tracking via `js/Progression.js`
- Home progression data via `js/HomeData.js`
- Account, leaderboard, and cloud-save overlays via `js/OverlayUI.js`
- Dedicated modules for dogs, enemies, and projectiles under `js/entities/`

Controls are primarily pointer-based: select UI elements and place units using mouse or touch input.

## Audio

The repository includes music and sound effects, including:

- `audio/home.mp3`
- `audio/battle.mp3`
- `audio/boss.mp3`
- additional effects under `audio/`

## Validation scripts

The repository already includes three JavaScript validation helpers:

```powershell
node validate-js.js
node validate-syntax.js
node check-syntax.js
```

These scripts are useful for quick syntax validation of the frontend JavaScript files.

## Notes for contributors

- There is no root-level package manager setup for the frontend.
- The frontend is loaded through plain script tags in `index.html`.
- `backend/README.md` is still the default Laravel README, so this root README is the main project entry point.

## Quick start

1. Serve this folder with a local web server.
2. Open the site in a browser.
3. Optionally start the Laravel backend if you want online features.
4. Run the validation scripts before committing frontend changes.
