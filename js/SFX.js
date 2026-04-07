// ============================================================
// SFX.js — File-based audio manager with reusable music + SFX
// ============================================================

const AUDIO_PREFS_KEY = 'dvz_audio_prefs_v3';

const MUSIC_TRACKS = {
  home: '/audio/home.mp3',
  battle: '/audio/battle.mp3',
  boss: '/audio/boss.mp3',
};

const SFX_TRACKS = {
  button_click: '/audio/sfx/button_click.wav',
  tab_switch: '/audio/sfx/tab_switch.wav',
  buy_item: '/audio/sfx/buy_item.wav',
  error: '/audio/sfx/error.wav',
  oyong_attack: '/audio/sfx/oyong_attack.wav',
  melee_hit: '/audio/sfx/melee_hit.wav',
  projectile_hit: '/audio/sfx/projectile_hit.wav',
  enemy_hit: '/audio/sfx/enemy_hit.wav',
  enemy_death: '/audio/sfx/enemy_death.wav',
  explosion: '/audio/sfx/explosion.wav',
  treat_gain: '/audio/sfx/treat_gain.wav',
  passive_income: '/audio/sfx/passive_income.wav',
  level_start: '/audio/sfx/level_start.wav',
  wave_start: '/audio/sfx/wave_start.wav',
  boss_incoming: '/audio/sfx/boss_incoming.wav',
  level_complete: '/audio/sfx/level_complete.wav',
  jump: '/audio/sfx/jump.wav',
  shield_break: '/audio/sfx/shield_break.wav',
  rescue: '/audio/sfx/rescue.wav',
  move: '/audio/sfx/move.wav',
  sell: '/audio/sfx/sell.wav',
  upgrade: '/audio/sfx/upgrade.wav',
};

const SFX_THROTTLES = {
  button_click: 50,
  tab_switch: 70,
  buy_item: 90,
  error: 120,
  oyong_attack: 35,
  melee_hit: 40,
  projectile_hit: 35,
  enemy_hit: 25,
  enemy_death: 45,
  explosion: 80,
  treat_gain: 60,
  passive_income: 100,
  level_start: 200,
  wave_start: 180,
  boss_incoming: 500,
  level_complete: 350,
  jump: 120,
  shield_break: 180,
  rescue: 180,
  move: 60,
  sell: 90,
  upgrade: 220,
};

const AudioManager = {
  muted: false,
  musicVolume: 0.55,
  sfxVolume: 0.80,
  currentTrackName: null,

  _prefsLoaded: false,
  _musicEls: {},
  _sfxPools: {},
  _lastSfxAt: {},
  _fadeInterval: null,
  _currentMusicEl: null,
  _musicFailed: {},
  _maxSfxVoices: 3,
  _audioUnlocked: false,
  _pendingMusicName: null,
  _unlockListenersBound: false,

  _clamp(value, min, max, fallback) {
    value = Number(value);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  },

  _ensurePrefsLoaded() {
    if (this._prefsLoaded) return;
    this._prefsLoaded = true;
    try {
      const raw = localStorage.getItem(AUDIO_PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      this.muted = !!prefs.muted;
      this.musicVolume = this._clamp(prefs.musicVolume, 0, 1, this.musicVolume);
      this.sfxVolume = this._clamp(prefs.sfxVolume, 0, 1, this.sfxVolume);
    } catch (_e) {}
  },

  _savePrefs() {
    try {
      localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify({
        muted: this.muted,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
      }));
    } catch (_e) {}
  },

  _makeAudio(src, loop) {
    const audio = new Audio(this._resolveSrc(src));
    audio.preload = 'auto';
    audio.loop = !!loop;
    audio.volume = 0;
    audio.__failed = false;
    audio.addEventListener('error', () => { audio.__failed = true; }, { once: true });
    return audio;
  },

  _resolveSrc(src) {
    if (!src) return src;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const cleanSrc = src.replace(/^\/+/, '');
    try {
      return new URL(cleanSrc, document.baseURI).href;
    } catch (_e) {
      return src;
    }
  },

  _ensureUnlockListeners() {
    if (this._unlockListenersBound) return;
    this._unlockListenersBound = true;
    const unlock = () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      // Resume AudioContext on mobile (iOS Safari / Chrome mobile require this).
      // Playing a silent buffer is the most reliable cross-browser unlock trick.
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          // Clean up after a tick so the silent play can complete
          setTimeout(() => { try { ctx.close(); } catch (_e) {} }, 500);
        }
      } catch (_e) {}
      this._audioUnlocked = true;
      if (this._pendingMusicName && !this.muted) {
        const pending = this._pendingMusicName;
        this._pendingMusicName = null;
        this.playMusic(pending, 250);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('touchstart', unlock, true);
  },

  _setAudioVolume(audio, volume) {
    if (!audio) return;
    audio.volume = this.muted ? 0 : Math.max(0, Math.min(1, volume));
  },

  canPlayMusic(trackName) {
    this._ensurePrefsLoaded();
    return !!MUSIC_TRACKS[trackName] && !this._musicFailed[trackName];
  },

  _getMusicEl(trackName) {
    this._ensurePrefsLoaded();
    if (!MUSIC_TRACKS[trackName]) return null;
    if (!this._musicEls[trackName]) {
      const audio = this._makeAudio(MUSIC_TRACKS[trackName], true);
      audio.addEventListener('error', () => { this._musicFailed[trackName] = true; }, { once: true });
      this._musicEls[trackName] = audio;
    }
    return this._musicEls[trackName];
  },

  _getSfxPool(name) {
    this._ensurePrefsLoaded();
    const src = SFX_TRACKS[name];
    if (!src) return null;
    if (!this._sfxPools[name]) {
      const pool = [];
      for (let i = 0; i < this._maxSfxVoices; i++) {
        const audio = this._makeAudio(src, false);
        pool.push(audio);
      }
      this._sfxPools[name] = { pool, failed: false };
      pool.forEach(audio => {
        audio.addEventListener('error', () => { this._sfxPools[name].failed = true; }, { once: true });
      });
    }
    return this._sfxPools[name];
  },

  _clearFade() {
    if (this._fadeInterval) {
      clearInterval(this._fadeInterval);
      this._fadeInterval = null;
    }
  },

  _fadeMusic(prev, next, fadeMs) {
    this._clearFade();
    const startedAt = Date.now();
    const startPrev = prev ? (prev.volume || 0) : 0;
    const targetNext = this.muted ? 0 : this.musicVolume;
    const startNext = next ? (next.volume || 0) : 0;

    this._fadeInterval = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / Math.max(1, fadeMs));
      if (prev) prev.volume = startPrev * (1 - t);
      if (next) next.volume = startNext + (targetNext - startNext) * t;
      if (t >= 1) {
        this._clearFade();
        if (prev) {
          prev.pause();
          try { prev.currentTime = 0; } catch (_e) {}
          prev.volume = 0;
        }
        if (next) this._setAudioVolume(next, this.musicVolume);
      }
    }, 40);
  },

  playMusic(trackName, fadeMs) {
    fadeMs = fadeMs || 500;
    if (!this.canPlayMusic(trackName)) return false;
    this._ensureUnlockListeners();
    const next = this._getMusicEl(trackName);
    if (!next || next.__failed) {
      this._musicFailed[trackName] = true;
      return false;
    }

    if (this.currentTrackName === trackName && this._currentMusicEl === next && !next.paused) {
      this._setAudioVolume(next, this.musicVolume);
      return true;
    }

    const prev = this._currentMusicEl;
    this.currentTrackName = trackName;
    this._currentMusicEl = next;

    try {
      next.loop = true;
      next.currentTime = 0;
      next.volume = 0;
      const p = next.play();
      if (p && typeof p.catch === 'function') {
        p.then(() => {
          this._audioUnlocked = true;
          this._pendingMusicName = null;
        }).catch(() => {
          this._pendingMusicName = trackName;
        });
      } else {
        this._audioUnlocked = true;
        this._pendingMusicName = null;
      }
    } catch (_e) {
      this._pendingMusicName = trackName;
    }

    this._fadeMusic(prev, next, fadeMs);
    return true;
  },

  stopMusic(fadeMs) {
    fadeMs = fadeMs || 450;
    const prev = this._currentMusicEl;
    this.currentTrackName = null;
    this._currentMusicEl = null;
    this._pendingMusicName = null;
    this._fadeMusic(prev, null, fadeMs);
  },

  playSFX(name) {
    this._ensurePrefsLoaded();
    if (this.muted) return;
    const last = this._lastSfxAt[name] || 0;
    const throttle = SFX_THROTTLES[name] || 0;
    const now = Date.now();
    if (throttle && now - last < throttle) return;
    this._lastSfxAt[name] = now;

    const entry = this._getSfxPool(name);
    if (!entry || entry.failed) return;

    const audio = entry.pool.find(a => a.paused || a.ended) || null;
    if (!audio) return;
    if (audio.__failed) {
      entry.failed = true;
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = this.muted ? 0 : this.sfxVolume;
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch (_e) {}
  },

  setMusicVolume(value) {
    this.musicVolume = this._clamp(value, 0, 1, this.musicVolume);
    if (this._currentMusicEl) this._setAudioVolume(this._currentMusicEl, this.musicVolume);
    this._savePrefs();
  },

  getMusicVolume() {
    this._ensurePrefsLoaded();
    return this.musicVolume;
  },

  setSFXVolume(value) {
    this.sfxVolume = this._clamp(value, 0, 1, this.sfxVolume);
    this._savePrefs();
  },

  getSFXVolume() {
    this._ensurePrefsLoaded();
    return this.sfxVolume;
  },

  setVolume(value) {
    const v = this._clamp(value, 0, 1, 0.7);
    this.setMusicVolume(v);
    this.setSFXVolume(v);
  },

  getVolume() {
    return (this.getMusicVolume() + this.getSFXVolume()) / 2;
  },

  setMuted(flag) {
    this.muted = !!flag;
    if (this._currentMusicEl) this._setAudioVolume(this._currentMusicEl, this.musicVolume);
    if (!this.muted && this._pendingMusicName) {
      this.playMusic(this._pendingMusicName, 250);
    }
    this._savePrefs();
  },

  toggleMute() {
    this.setMuted(!this.muted);
  },
};

const SFX = {
  get muted() { return AudioManager.muted; },
  set muted(value) { AudioManager.setMuted(value); },
  playSFX(name) { AudioManager.playSFX(name); },
  playMusic(trackName) { AudioManager.playMusic(trackName); },
  stopMusic() { AudioManager.stopMusic(); },
  setVolume(level) { AudioManager.setVolume(level); },
  getVolume() { return AudioManager.getVolume(); },
  setMusicVolume(level) { AudioManager.setMusicVolume(level); },
  getMusicVolume() { return AudioManager.getMusicVolume(); },
  setSFXVolume(level) { AudioManager.setSFXVolume(level); },
  getSFXVolume() { return AudioManager.getSFXVolume(); },
  toggleMute() { AudioManager.toggleMute(); },

  click()       { AudioManager.playSFX('button_click'); },
  tab()         { AudioManager.playSFX('tab_switch'); },
  buy()         { AudioManager.playSFX('buy_item'); },
  error()       { AudioManager.playSFX('error'); },
  place()       { AudioManager.playSFX('buy_item'); },
  attack()      { AudioManager.playSFX('oyong_attack'); },
  meleehit()    { AudioManager.playSFX('melee_hit'); },
  hit()         { AudioManager.playSFX('projectile_hit'); },
  enemyHit()    { AudioManager.playSFX('enemy_hit'); },
  death()       { AudioManager.playSFX('enemy_death'); },
  explosion()   { AudioManager.playSFX('explosion'); },
  treatGain()   { AudioManager.playSFX('treat_gain'); },
  income()      { AudioManager.playSFX('passive_income'); },
  sell()        { AudioManager.playSFX('sell'); },
  move()        { AudioManager.playSFX('move'); },
  jump()        { AudioManager.playSFX('jump'); },
  shieldBreak() { AudioManager.playSFX('shield_break'); },
  rescue()      { AudioManager.playSFX('rescue'); },
  levelWin()    { AudioManager.playSFX('level_complete'); },
  cantAfford()  { AudioManager.playSFX('error'); },
  waveStart()   { AudioManager.playSFX('wave_start'); },
  bossIncoming(){ AudioManager.playSFX('boss_incoming'); },
  levelStart()  { AudioManager.playSFX('level_start'); },
  upgrade()     { AudioManager.playSFX('upgrade'); },
};

AudioManager._ensurePrefsLoaded();
// Bind unlock listeners immediately so ANY first user gesture unlocks audio,
// even if playMusic() hasn't been called yet (e.g. a SFX fires before music starts).
AudioManager._ensureUnlockListeners();

// ── Visibility / focus handler ────────────────────────────────────────────
// When the tab is hidden, duck music to avoid orphaned audio.
// When visible again, safely restore and retry play if needed.
// Also auto-pauses the battle (user must manually resume from the pause overlay).
(function _bindVisibility() {
  document.addEventListener('visibilitychange', function _onVisibilityChange() {
    if (document.hidden) {
      // Tab hidden: duck music to 0 without stopping (preserves playback position)
      if (AudioManager._currentMusicEl && !AudioManager._currentMusicEl.paused) {
        AudioManager._currentMusicEl.volume = 0;
      }
      // Auto-pause the battle if one is active, or freeze timers during idle
      try {
        const gameScenes = window.game && window.game.scene;
        if (gameScenes) {
          const gs = gameScenes.getScene('GameScene');
          if (gs && gs.wavePhase !== 'won' && gs.wavePhase !== 'lost') {
            if (gs.wavePhase === 'idle') {
              // Not in combat — just freeze Phaser timers to prevent passive-income drift
              if (!gs.isBattlePaused && !gs.time.paused) {
                gs.time.paused = true;
                gs._autoIdlePaused = true;
              }
            } else if (gs.pauseBattle) {
              // In combat — full battle pause + show overlay
              gs._autoVisibilityPaused = gs.pauseBattle();
              const ui = gameScenes.getScene('UIScene');
              if (gs._autoVisibilityPaused && ui && ui._showPauseOverlay) {
                ui._showPauseOverlay();
              }
            }
          }
        }
      } catch (_e) {}
    } else {
      // Tab visible again: unfreeze idle timers if we froze them
      try {
        const gameScenes = window.game && window.game.scene;
        if (gameScenes) {
          const gs = gameScenes.getScene('GameScene');
          if (gs && gs._autoIdlePaused) {
            gs._autoIdlePaused = false;
            gs.time.paused = false;
          }
        }
      } catch (_e) {}
      // Restore music volume and retry play if it was interrupted
      if (!AudioManager.muted && AudioManager.currentTrackName) {
        const el = AudioManager._currentMusicEl;
        if (el) {
          // Try to resume playback — browser may have paused it while hidden
          if (el.paused) {
            el.play().catch(() => {
              AudioManager._pendingMusicName = AudioManager.currentTrackName;
            });
          }
          AudioManager._setAudioVolume(el, AudioManager.musicVolume);
        }
      }
    }
  });
}());
