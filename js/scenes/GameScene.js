// ============================================================
// GameScene.js — Main game: grid, entities, wave logic, effects
//
// FIELD INTERACTION MODES  (this.fieldMode)
//   'place'  — normal; click empty cell places selected dog
//   'menu'   — action menu open for a placed dog (Move / Sell / Cancel)
//   'moving' — player chose Move; next click on empty cell relocates dog
//
// MOVE / SELL RULES
//   • Move is free and allowed any time during prep phase (wavePhase === 'idle').
//   • Move is disabled (grayed) while a wave is active.
//   • Sell refunds SELL_REFUND_PCT of the dog's treat cost.
//   • Repositioning preserves the dog's current HP and all timers.
// ============================================================

const SELL_REFUND_PCT = 0.60;  // 60 % refund on sell

/** Compute 1–3 stars based on clean play */
function computeStars(emergencyUsed, dogsLost, emergencySavesPerLane) {
  if (emergencyUsed === 0 && dogsLost === 0)                                  return 3;
  if (emergencyUsed <= Math.max(1, Math.floor(emergencySavesPerLane * 0.5))) return 2;
  return 1;
}

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.challengeMode = !!(data && data.challengeMode);
    this.levelId = (data && data.levelId) ? data.levelId : 1;
  }

  create() {
    this.levelData = this.challengeMode
      ? buildChallengeLevelData()
      : (LEVEL_DATA.find(l => l.id === this.levelId) || LEVEL_DATA[0]);
    this.chapterData = getChapterForLevel(this.levelId);
    this.layoutConfig = getChapterLayout(this.levelId);
    this.maxPlaceCols = this.layoutConfig.maxPlaceCols;
    this.blockedTiles = new Set(
      (this.layoutConfig.blockedTiles || []).map(([lane, col]) => `${lane}:${col}`)
    );
    this.isBattlePaused = false;
    this._pausedMusicVolume = null;
    this._battleCleanedUp = false;
    AudioManager.playMusic('battle');
    SFX.levelStart();
    this.homeSave  = Progression.load();
    this.homeBonus = Progression.getBattleBonus(this.homeSave);
    this.missionTreatBonus = Progression.consumeMissionTreatReserve();
    this.placedDogTypes = new Set();

    this.availableDogTypes = GameState.loadoutDogs.length > 0
      ? GameState.loadoutDogs
      : Object.keys(DOG_DEFS);

    this.drawBackground();

    // ── Rendering layers (depth order) ────────────────────────
    this.dangerGfx    = this.add.graphics().setDepth(4);   // lane danger pulse
    this.gridGfx      = this.add.graphics().setDepth(5);   // hover / move highlights
    this.previewGfx   = this.add.graphics().setDepth(6);   // ghost dog preview
    this.emergencyGfx = this.add.graphics().setDepth(7);   // paw indicators
    this.selGfx       = this.add.graphics().setDepth(12);  // selected-dog glow ring
    this.menuGfx      = this.add.graphics().setDepth(30);  // action menu panel
    this.infoPanelGfx = this.add.graphics().setDepth(30);  // dog info panel

    // ── Game object lists ─────────────────────────────────────
    this.dogs        = [];
    this.enemies     = [];
    this.projectiles = [];
    this.particles   = [];
    this.floatTexts  = [];
    this._bossIncomingActive = false;
    this._bossIncomingShownForWave = false;
    this._transitionOverlay = null;

    this.grid = Array.from({ length: GRID.ROWS }, () => Array(GRID.COLS).fill(null));

    // ── Resources ─────────────────────────────────────────────
    this.treats = this.levelData.startTreats + this.homeBonus.treatBonus + this.missionTreatBonus;
    GameState.lastBattleBonus = this.homeBonus.treatBonus;
    this.emergencySaves     = new Array(GRID.ROWS).fill(this.levelData.emergencySaves);
    this.emergencyUsedTotal = 0;
    this.dogsLostTotal      = 0;
    this._dangerActive      = new Array(GRID.ROWS).fill(false);

    // ── Wave Challenge tracking ───────────────────────────────
    this.challengeScore          = 0;
    this.challengeBiscuitsEarned = 0;

    // ── Wave state ────────────────────────────────────────────
    this.currentWave   = 0;
    this.wavePhase     = 'idle';
    this.spawnQueue    = [];
    this.waveStartTime = 0;

    // ── Field interaction state ───────────────────────────────
    this.fieldMode   = 'place';   // 'place' | 'menu' | 'moving'
    this.menuDog     = null;      // dog whose action menu is open
    this.movingDog   = null;      // dog currently being relocated
    this.menuObjects = [];        // Phaser objects that belong to the action menu

    // ── Hover ─────────────────────────────────────────────────
    this.hoverCol  = -1;
    this.hoverLane = -1;

    this.input.on('pointermove', this.onMove,  this);
    this.input.on('pointerdown', this.onClick, this);
    this.events.once('shutdown', this._cleanupBattleState, this);

    // Passive income ticker
    this.passiveIncomeEvent = this.time.addEvent({
      delay:    this.levelData.passiveInterval,
      callback: () => {
        if (this.wavePhase !== 'won' && this.wavePhase !== 'lost') {
          this.treats += this.levelData.passiveIncome;
          this.spawnFloatingText(160, 32, `+${this.levelData.passiveIncome}`, 0xffd700);
          SFX.income();
          this._treatBounce = 3;
        }
      },
      loop: true,
    });

    // Lane danger checker
    this.laneDangerEvent = this.time.addEvent({
      delay: 800, callback: this._checkLaneDanger,
      callbackScope: this, loop: true,
    });

    this.drawEmergencyIndicators();
    this.scene.launch('UIScene');
    this._showLevelIntroTransition();

    if (this.homeBonus.treatBonus > 0) {
      this.time.delayedCall(220, () => {
        this.spawnFloatingText(260, 32, `Home bonus +${this.homeBonus.treatBonus}`, 0xffb3da);
      });
    }
    if (this.homeBonus.damageMult > 0) {
      this.time.delayedCall(420, () => {
        this.spawnFloatingText(
          436,
          32,
          `Energetic start +${Math.round(this.homeBonus.damageMult * 100)}%`,
          0x8ff0b5
        );
      });
    }
    if (this.missionTreatBonus > 0) {
      this.time.delayedCall(620, () => {
        this.spawnFloatingText(676, 32, `Mission treats +${this.missionTreatBonus}`, 0xffde7f);
      });
    }

    // L1 tutorial: show a hint prompt and highlight the center tile
    if (this.levelId === 1) this._showTutorialHint();
  }

  /** Level 1 only: animated hint + glowing center tile prompt */
  _showTutorialHint() {
    const cx = gridX(3), cy = laneY(2);   // col 3, lane 2 (center-right)

    // Pulsing highlight on a good starter tile
    this._tutGfx = this.add.graphics().setDepth(4);
    this._tutGfxTime = 0;

    // Hint text banner
    const bg = this.add.graphics().setDepth(45);
    bg.fillStyle(0x0a1628, 0.88);
    bg.fillRoundedRect(GAME_W / 2 - 200, 68, 400, 34, 8);
    bg.lineStyle(1.5, 0xffd700, 0.7);
    bg.strokeRoundedRect(GAME_W / 2 - 200, 68, 400, 34, 8);

    const hint = this.add.text(GAME_W / 2, 85,
      'Select an Oyong card, then click a tile to place them!', {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: '#ffd700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(46);

    // Dismiss hint once first dog is placed
    this._tutHintObjs = [bg, hint];
    this._tutDismissed = false;
  }

  // ════════════════════════════════════════════════════════════
  // BACKGROUND
  // ════════════════════════════════════════════════════════════

  drawBackground() {
    const bg = this.add.graphics();

    bg.fillStyle(0x1a2a3e, 1);
    bg.fillRect(0, 0, GAME_W, 60);
    bg.lineStyle(2, 0x3a5a7e, 1);
    bg.lineBetween(0, 60, GAME_W, 60);

    const stripes = [0x7ec850, 0x6db840, 0x7ec850, 0x6db840, 0x7ec850];
    for (let r = 0; r < GRID.ROWS; r++) {
      const y = 60 + r * GRID.CELL_H;
      bg.fillStyle(stripes[r], 1);
      bg.fillRect(0, y, GAME_W, GRID.CELL_H);
      bg.fillStyle(0x4a7a30, 0.25);
      bg.fillRect(0, y, GAME_W, 2);
    }

    bg.fillStyle(0x2e1e0e, 1);
    bg.fillRect(0, 500, GAME_W, GAME_H - 500);
    bg.fillStyle(0x5a4020, 1);
    bg.fillRect(0, 500, GAME_W, 3);

    bg.lineStyle(1, 0x000000, 0.07);
    for (let c = 0; c <= GRID.COLS; c++) {
      const x = GRID.OFFSET_X - GRID.CELL_W / 2 + c * GRID.CELL_W;
      bg.lineBetween(x, 60, x, 500);
    }
    for (let r = 0; r <= GRID.ROWS; r++) {
      bg.lineBetween(BASE_X, 60 + r * GRID.CELL_H, GAME_W - 20, 60 + r * GRID.CELL_H);
    }

    for (let lane = 0; lane < GRID.ROWS; lane++) {
      for (let col = 0; col < GRID.COLS; col++) {
        if (!this.isTileBlocked(col, lane)) continue;
        const cx = gridX(col);
        const cy = laneY(lane);
        const left = cx - GRID.CELL_W / 2;
        const top = cy - GRID.CELL_H / 2;
        bg.fillStyle(col >= this.maxPlaceCols ? 0x28364a : 0x382020, 0.58);
        bg.fillRect(left, top, GRID.CELL_W, GRID.CELL_H);
        bg.lineStyle(1.4, col >= this.maxPlaceCols ? 0x8aa0b6 : 0xc67a7a, 0.7);
        bg.strokeRect(left + 2, top + 2, GRID.CELL_W - 4, GRID.CELL_H - 4);
        for (let step = -GRID.CELL_H; step < GRID.CELL_W; step += 16) {
          bg.lineBetween(
            left + Math.max(0, step),
            top + Math.max(0, -step),
            left + Math.min(GRID.CELL_W, step + GRID.CELL_H),
            top + Math.min(GRID.CELL_H, GRID.CELL_H - step)
          );
        }
      }
    }

    this.drawHouse(bg);

    const rx = GRID.OFFSET_X + GRID.COLS * GRID.CELL_W - GRID.CELL_W / 2 + 2;
    bg.fillStyle(0x3a2050, 0.55);
    bg.fillRect(rx, 60, GAME_W - rx, 440);
    for (let r = 0; r < GRID.ROWS; r++) {
      const tx = rx + 35, ty = laneY(r);
      bg.fillStyle(0x888aaa, 1);
      bg.fillRoundedRect(tx - 10, ty - 22, 20, 26, { tl: 8, tr: 8, bl: 0, br: 0 });
      bg.fillRect(tx - 14, ty + 2, 28, 6);
      bg.lineStyle(1.5, 0x666888, 1);
      bg.lineBetween(tx, ty - 19, tx, ty - 9);
      bg.lineBetween(tx - 5, ty - 14, tx + 5, ty - 14);
    }
  }

  drawHouse(g) {
    g.fillStyle(0xffe4b5, 1);
    g.fillRect(0, 60, 48, 440);
    g.fillStyle(0xcd7e3a, 1);
    g.fillRect(0, 48, 50, 14);
    g.lineStyle(1, 0x8b5220, 0.4);
    for (let i = 0; i < 5; i++) g.lineBetween(0, 50 + i * 2.5, 50, 50 + i * 2.5);
    for (let r = 0; r < GRID.ROWS; r++) {
      const wy = 60 + r * GRID.CELL_H + 18;
      g.fillStyle(0xffff88, 1);
      g.fillRoundedRect(5, wy, 36, 30, 4);
      g.lineStyle(1.5, 0xccaa44, 1);
      g.lineBetween(23, wy, 23, wy + 30);
      g.lineBetween(5, wy + 15, 41, wy + 15);
    }
    g.fillStyle(0x8b5a1a, 1);
    g.fillRoundedRect(10, 406, 28, 54, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.fillStyle(0xffd700, 1);
    g.fillCircle(33, 432, 3);
    g.lineStyle(2, 0xa07830, 1);
    g.strokeRect(0, 60, 48, 440);
  }

  // ════════════════════════════════════════════════════════════
  // MAIN UPDATE
  // ════════════════════════════════════════════════════════════

  update(time, delta) {
    if (this.isBattlePaused) return;
    if (this.wavePhase === 'won' || this.wavePhase === 'lost') return;

    this.tickSpawns(time);

    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(time, delta);
      if (!e.isDying && e.x < BASE_X) {
        if (this.emergencySaves[e.lane] > 0) {
          this.showEmergencyRescue(e.lane);
          e.destroy(); this.enemies.splice(i, 1);
        } else { this.endGame(false); return; }
        continue;
      }
      if (e.hp <= 0) {
        if (!e.deathHandled) {
          e.deathHandled = true;
          this.treats += e.config.reward;
          if (this.challengeMode) this.challengeScore += e.config.reward;
          this.spawnDeathBurst(e.x, e.y, e.config.color, e.type === 'boss' ? 1.4 : 1);
          this.spawnDeathPop(e.x, e.y, e.type === 'boss' ? 0xff8844 : e.config.color, e.type === 'boss' ? 54 : 28);
          if (e.type === 'boss' && e.bossDef && e.bossDef.deathExplosionRadius) {
            this.triggerExplosion(e, {
              radius: e.bossDef.deathExplosionRadius,
              damage: e.bossDef.deathExplosionDamage,
              reward: false,
              removeEntity: false,
              message: 'BOSS BLAST!',
              colorSet: [0xffaa00, 0xff4400, 0xffdd66],
              shakeDuration: 220,
              shakeIntensity: 0.010,
            });
          }
          SFX.death();
          this.cameras.main.shake(
            e.type === 'boss' ? 320 : e.type === 'brute' ? 120 : 70,
            e.type === 'boss' ? 0.014 : e.type === 'brute' ? 0.005 : 0.0025
          );
          e.startDeath();
          this._treatBounce = 4;
        }
        if (e.isDeathComplete()) {
          e.destroy(); this.enemies.splice(i, 1);
        }
      }
    }

    // Dogs
    for (let i = this.dogs.length - 1; i >= 0; i--) {
      const d = this.dogs[i];
      d.update(time, delta);
      if (d.hp <= 0) {
        this.dogsLostTotal++;
        // Dismiss menu if this dog was selected
        if (this.menuDog === d || this.movingDog === d) this._dismissMenu();
        this.grid[d.lane][d.col] = null;
        this.spawnDeathBurst(d.x, d.y, d.config.color);
        this.spawnDeathPop(d.x, d.y, d.config.color, 26);
        d.destroy(); this.dogs.splice(i, 1);
      }
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta);
      let hit = false;
      for (const e of this.enemies) {
        if (e.isDying || e.hp <= 0) continue;
        if (Math.abs(p.x - e.x) < 28 && Math.abs(p.y - e.y) < 32) {
          e.takeDamage(p.damage);
          if (p.freeze > 0) e.freeze(p.freeze);
          if (p.burn && e.applyBurn) e.applyBurn(p.burn.damage, p.burn.duration, p.burn.tick);
          this.spawnImpactRing(
            p.x,
            p.y,
            p.impactColor || (p.dogType === 'frost_pup' ? 0x88ddff : 0xffdd44)
          );
          SFX.hit();
          hit = true; break;
        }
      }
      if (hit || p.x > GAME_W + 60) { p.destroy(); this.projectiles.splice(i, 1); }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) { p.gfx.destroy(); this.particles.splice(i, 1); continue; }
      p.x += p.vx * delta / 1000;
      p.y += p.vy * delta / 1000;
      p.vy += 150 * delta / 1000;
      p.gfx.clear();
      const a = p.life / p.maxLife;
      p.gfx.fillStyle(p.color, a);
      p.gfx.fillCircle(p.x, p.y, p.r * a);
    }

    // Floating texts
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.life -= delta;
      if (ft.life <= 0) { ft.obj.destroy(); this.floatTexts.splice(i, 1); continue; }
      ft.x += (ft.vx || 0) * delta / 1000;
      ft.y += (ft.vy || -32) * delta / 1000;
      ft.obj.setPosition(ft.x, ft.y);
      const alpha = ft.life / ft.maxLife;
      ft.obj.setAlpha(alpha);
      if (ft.scaleFrom) {
        const t = 1 - alpha;
        ft.obj.setScale(Math.max(0.7, ft.scaleFrom - t * 0.22));
      }
    }

    const activeBoss = this.getActiveBoss();
    if (activeBoss || this._bossIncomingActive) {
      if (AudioManager.currentTrackName !== 'boss') AudioManager.playMusic('boss');
    } else if (AudioManager.currentTrackName === 'boss') {
      AudioManager.playMusic('battle');
    }

    // Wave completion
    if (this.wavePhase === 'fighting' && this.enemies.length === 0) {
      if (!this.challengeMode && this.currentWave >= this.levelData.waves.length) {
        this.endGame(true);
      } else {
        this.wavePhase = 'idle';
        if (this.challengeMode) {
          const reward = getChallengeMilestoneReward(this.currentWave);
          if (reward > 0) {
            this.challengeBiscuitsEarned += reward;
            this.spawnFloatingText(
              GAME_W / 2, GAME_H / 2 - 60,
              `Wave ${this.currentWave} Clear!  +${reward} \uD83C\uDF6A`,
              0xffd700
            );
          }
        }
      }
    }

    // L1 tutorial tile pulse
    if (this._tutGfx && !this._tutDismissed) {
      this._tutGfxTime += delta;
      this._tutGfx.clear();
      const pulse = (Math.sin(this._tutGfxTime / 300) + 1) / 2;
      this._tutGfx.lineStyle(2.5, 0xffd700, 0.5 + pulse * 0.5);
      this._tutGfx.strokeRect(
        gridX(3) - GRID.CELL_W / 2, laneY(2) - GRID.CELL_H / 2,
        GRID.CELL_W, GRID.CELL_H);
      this._tutGfx.fillStyle(0xffd700, 0.06 + pulse * 0.10);
      this._tutGfx.fillRect(
        gridX(3) - GRID.CELL_W / 2, laneY(2) - GRID.CELL_H / 2,
        GRID.CELL_W, GRID.CELL_H);
      // Dismiss after first dog placed
      if (this.dogs.length > 0) {
        this._tutDismissed = true;
        this._tutGfx.clear();
        if (this._tutHintObjs) this._tutHintObjs.forEach(o => {
          this.tweens.add({ targets: o, alpha: 0, duration: 400,
            onComplete: () => o.destroy() });
        });
      }
    }

    // Selected-dog glow ring (pulsing gold circle)
    const activeDog = this.movingDog || this.menuDog;
    this.selGfx.clear();
    if (activeDog) {
      const pulse = 0.45 + Math.sin(time / 180) * 0.35;
      this.selGfx.lineStyle(3, 0xffd700, pulse);
      this.selGfx.strokeCircle(activeDog.x, activeDog.y, 34);
      this.selGfx.fillStyle(0xffd700, 0.07);
      this.selGfx.fillCircle(activeDog.x, activeDog.y, 34);
    }

    // Refresh info panel text (HP changes each frame)
    if (activeDog) this._refreshInfoPanel(activeDog);

    this.drawGridOverlay();
  }

  getEarlyWaveDamageMultiplier(time) {
    if (!this.homeBonus || this.homeBonus.damageMult <= 0) return 1;
    if (this.currentWave !== 1) return 1;
    if (this.wavePhase !== 'spawning' && this.wavePhase !== 'fighting') return 1;
    if (time - this.waveStartTime > HOME_EARLY_WAVE_BONUS_MS) return 1;
    return 1 + this.homeBonus.damageMult;
  }

  // ════════════════════════════════════════════════════════════
  // WAVE MANAGEMENT
  // ════════════════════════════════════════════════════════════

  tickSpawns(time) {
    if (this.wavePhase !== 'spawning') return;
    const elapsed = time - this.waveStartTime;
    if (!this._bossIncomingShownForWave && this.spawnQueue[0] && this.spawnQueue[0].type === 'boss') {
      const leadTime = this.spawnQueue[0].delay - elapsed;
      if (leadTime <= 1600) {
        this._bossIncomingShownForWave = true;
        this._showBossIncoming();
      }
    }
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= elapsed) {
      const s = this.spawnQueue.shift();
      const e = new Enemy(this, SPAWN_X, enemyLaneY(s.lane, s.type), s.lane, s.type);
      if (this.challengeMode) this._applyChallengeScaling(e, this.currentWave);
      this.enemies.push(e);
    }
    if (this.spawnQueue.length === 0) this.wavePhase = 'fighting';
  }

  startWave() {
    if (this.isBattlePaused) return;
    if (this.wavePhase !== 'idle') return;
    if (!this.challengeMode && this.currentWave >= this.levelData.waves.length) {
      this.endGame(true); return;
    }
    this._dismissMenu();
    this.wavePhase     = 'spawning';
    this.waveStartTime = this.time.now;
    this._bossIncomingShownForWave = false;
    this.currentWave++;

    if (this.challengeMode) {
      this.spawnQueue = generateChallengeWave(this.currentWave);
    } else {
      this.spawnQueue = [...this.levelData.waves[this.currentWave - 1]];
    }

    this._showWaveAnnouncement(this.currentWave);
    SFX.waveStart();
  }

  _showWaveAnnouncement(waveNum) {
    const isBossW = this.challengeMode && isChallengeWaveBoss(waveNum);
    const isLast  = !this.challengeMode && waveNum === this.levelData.waves.length;
    let label;
    if (isBossW)      label = `WAVE ${waveNum} — BOSS WAVE!`;
    else if (isLast)  label = `WAVE ${waveNum} — FINAL WAVE!`;
    else              label = `WAVE ${waveNum}`;
    this._flashStageOverlay(isLast ? 0x661100 : 0x10263a, isLast ? 0.22 : 0.16, 220);

    const txt = this.add.text(GAME_W / 2, GAME_H / 2 - 40, label, {
      fontSize: isLast ? '46px' : '52px',
      fontFamily: 'Arial Black',
      color: isLast ? '#ff4444' : '#ffdd44',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(0.6);

    this.tweens.add({
      targets: txt, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 280, ease: 'Back.Out',
      onComplete: () => this.time.delayedCall(700, () =>
        this.tweens.add({ targets: txt, alpha: 0, scaleX: 1.2, scaleY: 1.2,
          duration: 380, onComplete: () => txt.destroy() })
      ),
    });

    // Screen shake on final wave — adds weight to the moment
    if (isLast) {
      this.cameras.main.shake(320, 0.008);
    }
  }

  // ════════════════════════════════════════════════════════════
  // FIELD INTERACTION — CLICK HANDLER
  // ════════════════════════════════════════════════════════════

  onMove(pointer) {
    if (this.isBattlePaused) return;
    this.hoverCol  = Math.round((pointer.x - GRID.OFFSET_X) / GRID.CELL_W);
    this.hoverLane = Math.round((pointer.y - GRID.OFFSET_Y) / GRID.CELL_H);
  }

  onClick(pointer) {
    if (this.isBattlePaused) return;
    if (pointer.y < 60 || pointer.y > 500) return;

    const col  = Math.round((pointer.x - GRID.OFFSET_X) / GRID.CELL_W);
    const lane = Math.round((pointer.y - GRID.OFFSET_Y) / GRID.CELL_H);
    const inGrid = col >= 0 && col < GRID.COLS && lane >= 0 && lane < GRID.ROWS;

    // ── Moving mode ───────────────────────────────────────────
    if (this.fieldMode === 'moving') {
      if (inGrid && !this.isTileBlocked(col, lane) && !this.grid[lane][col]) {
        this._executeMove(col, lane);
      } else {
        this._cancelMove();
      }
      return;
    }

    // ── Menu mode: any click outside dismisses ────────────────
    if (this.fieldMode === 'menu') {
      // The menu buttons handle their own clicks via zones;
      // a raw click anywhere else dismisses the menu.
      this._dismissMenu();
      return;
    }

    // ── Place mode ────────────────────────────────────────────
    if (!inGrid) return;
    if (this.isTileBlocked(col, lane)) {
      SFX.cantAfford();
      return;
    }

    const occupant = this.grid[lane][col];

    if (occupant) {
      // Clicked a placed dog → open action menu
      GameState.selectedDog = null;  // deselect card selection first
      this._showActionMenu(occupant);
      return;
    }

    // Place a new dog from card selection
    if (!GameState.selectedDog) return;
    if (this.treats < DOG_DEFS[GameState.selectedDog].cost) {
      SFX.cantAfford();
      return;
    }
    this.treats -= DOG_DEFS[GameState.selectedDog].cost;
    const dog = new Dog(this, col, lane, GameState.selectedDog);
    this.dogs.push(dog);
    this.grid[lane][col] = dog;
    this.placedDogTypes.add(GameState.selectedDog);
    SFX.place();
    this._treatBounce = 2;  // subtle bounce to acknowledge spend
  }

  // ════════════════════════════════════════════════════════════
  // ACTION MENU — MOVE / SELL / CANCEL
  // ════════════════════════════════════════════════════════════

  /**
   * Open the contextual action menu for a placed dog.
   * Draws a panel near the dog with Upgrade, Move, Sell, and Cancel options.
   * Move is only enabled during prep phase (wavePhase === 'idle').
   */
  _showActionMenu(dog) {
    this._dismissMenu();      // clear any previous menu first
    this.fieldMode = 'menu';
    this.menuDog   = dog;

    // ── Panel position: prefer right of dog, clamp to canvas ──
    const panelW = 164, panelH = 236;
    let   mx = dog.x + 44;
    if (mx + panelW > GAME_W - 8) mx = dog.x - 44 - panelW;
    mx = Math.max(BASE_X + 4, mx);
    const my = Math.max(64, Math.min(500 - panelH - 4, dog.y - panelH / 2));

    const g = this.menuGfx;
    g.clear();

    // Panel background
    g.fillStyle(0x0d1c2e, 0.96);
    g.fillRoundedRect(mx, my, panelW, panelH, 10);
    g.lineStyle(2, 0xffd700, 0.8);
    g.strokeRoundedRect(mx, my, panelW, panelH, 10);

    // Header strip
    g.fillStyle(0xffd700, 0.12);
    g.fillRoundedRect(mx, my, panelW, 46, { tl: 10, tr: 10, bl: 0, br: 0 });

    // Dog name
    const nameT = this.add.text(mx + panelW / 2, my + 13,
      DOG_DEFS[dog.type].name, {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: '#ffd700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(31);
    this.menuObjects.push(nameT);

    // HP fraction + level indicator
    const lvColors = ['', '#88ccff', '#88ccff', '#ffd700'];
    const lvLabel  = `Lv${dog.level}`;
    const hpT = this.add.text(mx + panelW / 2, my + 30,
      `${lvLabel}  ·  HP ${Math.max(0, dog.hp)} / ${dog.maxHp}`, {
      fontSize: '11px', fontFamily: 'Arial',
      color: lvColors[dog.level] || '#aaddcc',
    }).setOrigin(0.5).setDepth(31);
    this.menuObjects.push(hpT);

    // Separator line
    g.lineStyle(1, 0x2a4a6a, 1);
    g.lineBetween(mx + 10, my + 46, mx + panelW - 10, my + 46);

    // ── Upgrade button ────────────────────────────────────────
    if (dog.level < 3) {
      const upgCost     = UPGRADE_COSTS[dog.type][dog.level - 1];
      const canAffordUpg = this.treats >= upgCost;
      this._buildMenuBtn(
        mx, my + 54, panelW,
        canAffordUpg
          ? `Evolve Lv${dog.level + 1}  (-${upgCost}\uD83E\uDDB4)`
          : `Evolve Lv${dog.level + 1}  (${upgCost}\uD83E\uDDB4)`,
        canAffordUpg ? 0x0e2e14 : 0x1a1a20,
        canAffordUpg ? 0x1a5a24 : 0x1a1a20,
        canAffordUpg ? '#88ff99' : '#3a4a3a',
        canAffordUpg ? () => this._upgradeDog(dog) : null
      );
    } else {
      // Max level — gold badge button (non-interactive)
      this._buildMenuBtn(
        mx, my + 54, panelW,
        'MAX LEVEL  \u2736',
        0x1a1a00, 0x1a1a00, '#ffd700', null
      );
    }

    // Move button (disabled if wave is active)
    const canMove = this.wavePhase === 'idle';
    this._buildMenuBtn(
      mx, my + 100, panelW,
      canMove ? 'Move' : 'Move  (prep only)',
      canMove ? 0x1a3a5a : 0x1e1e28,
      canMove ? 0x2a5a8a : 0x1e1e28,
      canMove ? '#88ccff' : '#3a4a5a',
      canMove ? () => this._startMove(dog) : null
    );

    // Sell button — always enabled
    const refund = this._getSellRefund(dog);
    this._buildMenuBtn(
      mx, my + 146, panelW,
      `Sell  (+${refund} \uD83E\uDDB4)`,
      0x3a2010, 0x6a3a10, '#ffbb55',
      () => this._sellDog(dog)
    );

    // Cancel button
    this._buildMenuBtn(
      mx, my + 192, panelW,
      'Cancel',
      0x1e1e2e, 0x2e2e4e, '#8899aa',
      () => this._dismissMenu()
    );

    // Build the persistent info panel
    this._buildInfoPanel(dog);
  }

  /** Returns total treat refund for selling dog at its current level */
  _getSellRefund(dog) {
    let totalSpent = DOG_DEFS[dog.type].cost;
    for (let lv = 1; lv < dog.level; lv++) {
      totalSpent += UPGRADE_COSTS[dog.type][lv - 1];
    }
    return Math.floor(totalSpent * SELL_REFUND_PCT);
  }

  /** Spend treats to evolve a placed dog to the next level */
  _upgradeDog(dog) {
    const cost = UPGRADE_COSTS[dog.type][dog.level - 1];
    if (this.treats < cost) return;
    this.treats -= cost;
    dog.upgrade();

    // Challenge mode: full HP restore on upgrade (tactical heal mechanic)
    if (this.challengeMode) {
      dog.hp = dog.maxHp;
      this.spawnFloatingText(dog.x, dog.y - 66, '+HEALED!', 0x88ff88);
    }

    // Visual + audio feedback
    this.spawnEvolutionBurst(dog.x, dog.y, dog.type);
    const lvColors = ['', '', '#88ccff', '#ffd700'];
    this.spawnFloatingText(dog.x, dog.y - 46,
      dog.level === 3 ? '\u2736 EVOLVED! Lv3' : `\u25b2 Lv${dog.level}`,
      dog.level === 3 ? 0xffd700 : 0x88ccff);
    SFX.upgrade();
    this._treatBounce = 5;

    // Refresh menu to reflect new level and upgrade cost
    this._showActionMenu(dog);
  }

  // ════════════════════════════════════════════════════════════
  // WAVE CHALLENGE — ENEMY SCALING
  // ════════════════════════════════════════════════════════════

  /**
   * Scale an Enemy's stats for the current challenge wave.
   * Called immediately after Enemy construction — does NOT mutate global ENEMY_DEFS.
   */
  _applyChallengeScaling(enemy, waveNum) {
    const hpMult    = getChallengeEnemyHpMult(waveNum);
    const speedMult = getChallengeEnemySpeedMult(waveNum);
    const rewMult   = getChallengeRewardMult(waveNum);

    enemy.hp    = Math.round(enemy.hp    * hpMult);
    enemy.maxHp = Math.round(enemy.maxHp * hpMult);
    enemy.speed     = enemy.speed     * speedMult;
    enemy.baseSpeed = enemy.baseSpeed * speedMult;

    // Isolate config so reward change doesn't affect ENEMY_DEFS
    enemy.config = Object.assign({}, enemy.config);
    enemy.config.reward = Math.round(enemy.config.reward * rewMult);

    if (enemy.shieldHp > 0) {
      enemy.shieldHp = Math.round(enemy.shieldHp * hpMult);
    }
  }

  /** Starburst particle effect for dog evolution */
  spawnEvolutionBurst(x, y, type) {
    const auraColor = {
      bark_pup: 0xffaa44, guard_dog: 0xff6655,
      frost_pup: 0x44ccff, treat_pup: 0xffd700,
      sniper_oyong: 0x99ccff, fire_oyong: 0xff8844,
      chain_oyong: 0xbb88ff, guardian_oyong: 0x88c8d8,
    }[type] || 0xffffff;

    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 160;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        life: 600 + Math.random() * 300, maxLife: 900,
        r: 3 + Math.random() * 5, color: i % 3 === 0 ? 0xffffff : auraColor,
        gfx: this.add.graphics().setDepth(20),
      });
    }
    // Expanding ring
    this.spawnImpactRing(x, y - 8, auraColor);
    this.spawnImpactRing(x, y - 8, 0xffffff);
  }

  spawnChainArc(fromX, fromY, toX, toY, color) {
    const g = this.add.graphics().setDepth(21);
    const midX = (fromX + toX) / 2;
    const bend = ((toY - fromY) * 0.2) - 12;
    this.tweens.add({
      targets: { a: 0.95 },
      a: 0,
      duration: 140,
      ease: 'Quad.Out',
      onUpdate: (tween, target) => {
        g.clear();
        g.lineStyle(3, color || 0xd9c4ff, target.a);
        g.beginPath();
        g.moveTo(fromX, fromY);
        g.lineTo(midX - 10, fromY + bend);
        g.lineTo(midX + 6, toY - bend * 0.35);
        g.lineTo(toX, toY);
        g.strokePath();

        g.lineStyle(1.2, 0xffffff, target.a * 0.7);
        g.beginPath();
        g.moveTo(fromX, fromY);
        g.lineTo(midX - 6, fromY + bend * 0.8);
        g.lineTo(midX + 10, toY - bend * 0.2);
        g.lineTo(toX, toY);
        g.strokePath();
      },
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Draw a single button row inside the action menu.
   * onClick === null means the button is disabled (not interactive).
   */
  _buildMenuBtn(mx, my, w, label, colNorm, colHover, textColor, onClick) {
    const H = 36;
    const bg = this.add.graphics().setDepth(31);
    const drawBg = (col) => {
      bg.clear();
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(mx + 8, my, w - 16, H, 6);
    };
    drawBg(colNorm);
    this.menuObjects.push(bg);

    const txt = this.add.text(mx + w / 2, my + H / 2, label, {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: textColor, stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(32);
    this.menuObjects.push(txt);

    if (onClick) {
      const zone = this.add.zone(mx + 8, my, w - 16, H)
        .setOrigin(0, 0).setDepth(33).setInteractive({ useHandCursor: true });
      zone.on('pointerover',  () => { drawBg(colHover); txt.setScale(1.04); });
      zone.on('pointerout',   () => { drawBg(colNorm);  txt.setScale(1.0);  });
      zone.on('pointerdown',  () => { SFX.click(); onClick(); });
      this.menuObjects.push(zone);
    }
  }

  /** Dismiss the action menu and return to place mode */
  _dismissMenu() {
    this.menuObjects.forEach(o => o.destroy());
    this.menuObjects = [];
    this.menuGfx.clear();
    this.infoPanelGfx.clear();
    this._destroyInfoPanelTexts();
    this.fieldMode = 'place';
    this.menuDog   = null;
    this.movingDog = null;
    this.selGfx.clear();
  }

  // ════════════════════════════════════════════════════════════
  // MOVE FLOW
  // ════════════════════════════════════════════════════════════

  /** Switch to moving mode: keep the glow, drop the menu panel */
  _startMove(dog) {
    // Destroy menu panel objects but keep info panel
    this.menuObjects.forEach(o => o.destroy());
    this.menuObjects = [];
    this.menuGfx.clear();

    this.fieldMode = 'moving';
    this.menuDog   = null;
    this.movingDog = dog;
  }

  /** Execute the move: update grid, dog position, return to place mode */
  _executeMove(col, lane) {
    const dog = this.movingDog;

    // Vacate old cell
    this.grid[dog.lane][dog.col] = null;

    // Update dog position
    dog.col  = col;
    dog.lane = lane;
    dog.x    = gridX(col);
    dog.y    = laneY(lane);

    // Occupy new cell
    this.grid[lane][col] = dog;

    // Brief gold flash to confirm the move
    this.spawnFloatingText(dog.x, dog.y - 38, 'Moved!', 0xffd700);
    SFX.move();

    this._dismissMenu();
  }

  /** Abort the move (click on occupied cell or invalid spot) */
  _cancelMove() {
    this._dismissMenu();
  }

  // ════════════════════════════════════════════════════════════
  // SELL FLOW
  // ════════════════════════════════════════════════════════════

  _sellDog(dog) {
    const refund = this._getSellRefund(dog);
    this.treats += refund;

    this.grid[dog.lane][dog.col] = null;
    this.spawnDeathBurst(dog.x, dog.y, DOG_DEFS[dog.type].color);
    this.spawnFloatingText(dog.x, dog.y - 42, `+${refund}`, 0xffd700);
    SFX.sell();

    const idx = this.dogs.indexOf(dog);
    if (idx !== -1) this.dogs.splice(idx, 1);
    dog.destroy();

    this._dismissMenu();
  }

  // ════════════════════════════════════════════════════════════
  // DOG INFO PANEL (shown while menu or moving is active)
  //
  // Position: bottom-right corner of game field, above card bar.
  // Shows: dog name, role, HP bar, refund value.
  // ════════════════════════════════════════════════════════════

  _buildInfoPanel(dog) {
    this._destroyInfoPanelTexts();
    this._infoPanelTexts = [];

    const pw = 212, ph = 72;
    const px = GAME_W - pw - 4;
    const py = 500 - ph - 4;

    // Panel is drawn once; HP bar is refreshed each frame in _refreshInfoPanel
    this.infoPanelGfx.clear();
    this.infoPanelGfx.fillStyle(0x0a1828, 0.94);
    this.infoPanelGfx.fillRoundedRect(px, py, pw, ph, 8);
    this.infoPanelGfx.lineStyle(1.5, 0xffd700, 0.6);
    this.infoPanelGfx.strokeRoundedRect(px, py, pw, ph, 8);

    const lvColors = ['', '#88ccff', '#88ccff', '#ffd700'];
    const lvStr    = dog.level === 3 ? '\u2736 Lv3' : `Lv${dog.level}`;
    const nameT = this.add.text(px + 10, py + 9,
      `${DOG_DEFS[dog.type].name}  ${lvStr}`, {
      fontSize: '11px', fontFamily: 'Arial Black',
      color: lvColors[dog.level] || '#ffd700', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: pw - 70 },
    }).setDepth(31);
    const roleT = this.add.text(px + 10, py + 26,
      DOG_DEFS[dog.type].role || DOG_DEFS[dog.type].desc, {
      fontSize: '10px', fontFamily: 'Arial', color: '#88aacc',
    }).setDepth(31);
    // HP label (static; value updated in _refreshInfoPanel)
    this._hpLabelT = this.add.text(px + 10, py + 43, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#aaddcc',
    }).setDepth(31);

    // Sell hint (accounts for upgrade investment)
    const refund = this._getSellRefund(dog);
    const hintT = this.add.text(px + pw - 8, py + 9,
      `Sell: +${refund}\uD83E\uDDB4`, {
      fontSize: '10px', fontFamily: 'Arial', color: '#cc9933',
    }).setOrigin(1, 0).setDepth(31);

    this._infoPanelTexts = [nameT, roleT, this._hpLabelT, hintT];
    this._infoPanelDog = dog;
    this._infoPanelPx  = px;
    this._infoPanelPy  = py;
    this._infoPanelPw  = pw;
    this._infoPanelPh  = ph;
  }

  _refreshInfoPanel(dog) {
    if (!this._hpLabelT || !this._hpLabelT.active) return;
    const pct = Math.max(0, dog.hp / dog.maxHp);
    this._hpLabelT.setText(`HP  ${Math.max(0, dog.hp)} / ${dog.maxHp}`);

    // Redraw the HP bar portion only
    const bx = this._infoPanelPx + 10;
    const by = this._infoPanelPy + 55;
    const bw = this._infoPanelPw - 20;
    const bh = 6;
    // We can't easily clear just part of the Graphics — redraw the whole panel bg
    this.infoPanelGfx.clear();
    this.infoPanelGfx.fillStyle(0x0a1828, 0.94);
    this.infoPanelGfx.fillRoundedRect(
      this._infoPanelPx, this._infoPanelPy,
      this._infoPanelPw, this._infoPanelPh || 72, 8);
    this.infoPanelGfx.lineStyle(1.5, 0xffd700, 0.6);
    this.infoPanelGfx.strokeRoundedRect(
      this._infoPanelPx, this._infoPanelPy,
      this._infoPanelPw, this._infoPanelPh || 72, 8);

    // HP bar background
    this.infoPanelGfx.fillStyle(0x111111, 0.8);
    this.infoPanelGfx.fillRoundedRect(bx, by, bw, bh, 3);
    // HP bar fill
    const col = pct > 0.6 ? 0x22dd22 : pct > 0.3 ? 0xffdd00 : 0xff3300;
    this.infoPanelGfx.fillStyle(col, 1);
    this.infoPanelGfx.fillRoundedRect(bx, by, bw * pct, bh, 3);
  }

  _destroyInfoPanelTexts() {
    if (this._infoPanelTexts) {
      this._infoPanelTexts.forEach(t => { if (t && t.active) t.destroy(); });
    }
    this._infoPanelTexts = [];
    this._hpLabelT       = null;
    this._infoPanelDog   = null;
  }

  // ════════════════════════════════════════════════════════════
  // GRID OVERLAY
  // ════════════════════════════════════════════════════════════

  drawGridOverlay() {
    this.gridGfx.clear();
    this.previewGfx.clear();

    const col  = this.hoverCol;
    const lane = this.hoverLane;
    const inGrid = col >= 0 && col < GRID.COLS && lane >= 0 && lane < GRID.ROWS;

    // ── Moving mode: paint all cells as valid (green) or blocked (dim red) ──
    if (this.fieldMode === 'moving') {
      for (let r = 0; r < GRID.ROWS; r++) {
        for (let c = 0; c < GRID.COLS; c++) {
          const cx2 = gridX(c), cy2 = laneY(r);
          const blocked = this.isTileBlocked(c, r);
          const occupied = !!this.grid[r][c];
          if (blocked || occupied) {
            // Cell taken — dim red tint
            this.gridGfx.fillStyle(blocked ? 0x884444 : 0xff3300, blocked ? 0.28 : 0.18);
          } else {
            // Valid drop — green tint, brighter on hover
            const hovering = (c === col && r === lane);
            this.gridGfx.fillStyle(0x00ff88, hovering ? 0.38 : 0.14);
          }
          this.gridGfx.fillRect(
            cx2 - GRID.CELL_W / 2, cy2 - GRID.CELL_H / 2,
            GRID.CELL_W, GRID.CELL_H);
        }
      }
      // Ghost dog preview on hovered empty cell
      if (inGrid && !this.isTileBlocked(col, lane) && !this.grid[lane][col] && this.movingDog) {
        this.previewGfx.setAlpha(0.5);
        drawDogByType(this.previewGfx, gridX(col), laneY(lane), this.movingDog.type);
      }

      // Bold border around the dog being moved (original cell)
      if (this.movingDog) {
        const ox = gridX(this.movingDog.col);
        const oy = laneY(this.movingDog.lane);
        this.gridGfx.lineStyle(2, 0xffd700, 0.8);
        this.gridGfx.strokeRect(
          ox - GRID.CELL_W / 2, oy - GRID.CELL_H / 2,
          GRID.CELL_W, GRID.CELL_H);
      }

      // "Tap empty tile" hint
      if (!inGrid || this.grid[lane] && this.grid[lane][col]) {
        // nothing extra needed
      }
      return;
    }

    // ── Place / menu mode: normal hover overlay ───────────────
    if (!inGrid) return;
    this.gridGfx.fillStyle(0xffffff, 0.07);
    this.gridGfx.fillRect(BASE_X, 60 + lane * GRID.CELL_H, GAME_W - BASE_X, GRID.CELL_H);

    const cx = gridX(col), cy = laneY(lane);
    const blocked = this.isTileBlocked(col, lane);

    if (blocked) {
      this.gridGfx.fillStyle(0x662222, 0.28);
      this.gridGfx.fillRect(cx - GRID.CELL_W / 2, cy - GRID.CELL_H / 2, GRID.CELL_W, GRID.CELL_H);
      this.gridGfx.lineStyle(2, 0xff8888, 0.55);
      this.gridGfx.strokeRect(cx - GRID.CELL_W / 2, cy - GRID.CELL_H / 2, GRID.CELL_W, GRID.CELL_H);
    } else if (GameState.selectedDog && !this.grid[lane][col] && this.fieldMode === 'place') {
      const canAfford = this.treats >= DOG_DEFS[GameState.selectedDog].cost;
      this.gridGfx.fillStyle(canAfford ? 0x00ff88 : 0xff3300, 0.22);
      this.gridGfx.fillRect(cx - GRID.CELL_W / 2, cy - GRID.CELL_H / 2, GRID.CELL_W, GRID.CELL_H);
      this.previewGfx.setAlpha(0.42);
      drawDogByType(this.previewGfx, cx, cy, GameState.selectedDog);
    } else if (this.grid[lane] && this.grid[lane][col] && this.fieldMode === 'place') {
      // Hover over an existing dog — subtle gold outline hint
      this.gridGfx.lineStyle(1.5, 0xffd700, 0.35);
      this.gridGfx.strokeRect(cx - GRID.CELL_W / 2, cy - GRID.CELL_H / 2, GRID.CELL_W, GRID.CELL_H);
    } else {
      this.gridGfx.lineStyle(2, 0xffffff, 0.22);
      this.gridGfx.strokeRect(cx - GRID.CELL_W / 2, cy - GRID.CELL_H / 2, GRID.CELL_W, GRID.CELL_H);
    }
  }

  // ════════════════════════════════════════════════════════════
  // EMERGENCY RESCUE
  // ════════════════════════════════════════════════════════════

  showEmergencyRescue(lane) {
    this.emergencySaves[lane]--;
    this.emergencyUsedTotal++;
    const flash = this.add.graphics().setDepth(15);
    flash.fillStyle(0xff1100, 0.38);
    flash.fillRect(0, 60 + lane * GRID.CELL_H, BASE_X + 100, GRID.CELL_H);
    this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
    this.spawnDeathBurst(BASE_X + 12, laneY(lane), 0xffaa00);
    this.spawnFloatingText(BASE_X + 60, laneY(lane) - 24, 'RESCUED!', 0xffdd00);
    SFX.rescue();
    this.cameras.main.shake(180, 0.006);
    this.drawEmergencyIndicators();
  }

  drawEmergencyIndicators() {
    this.emergencyGfx.clear();
    const maxSaves = this.levelData.emergencySaves;
    if (maxSaves === 0) return;
    for (let lane = 0; lane < GRID.ROWS; lane++) {
      const remaining = this.emergencySaves[lane];
      for (let s = 0; s < maxSaves; s++) {
        drawPaw(
          this.emergencyGfx, BASE_X + 14 + s * 16, laneY(lane) + 26,
          s < remaining ? 0xffa040 : 0x2a3a4a,
          s < remaining ? 0.85 : 0.35
        );
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // LANE DANGER WARNING
  // ════════════════════════════════════════════════════════════

  _checkLaneDanger() {
    if (this.isBattlePaused) return;
    if (this.wavePhase === 'won' || this.wavePhase === 'lost') return;
    this.dangerGfx.clear();
    const dangerX = gridX(2);
    for (let lane = 0; lane < GRID.ROWS; lane++) {
      if (this.enemies.some(e => !e.isDying && e.hp > 0 && e.lane === lane && e.x < dangerX)) {
        const pulse = (Math.sin(this.time.now / 140) + 1) / 2;
        this.dangerGfx.fillStyle(0xff2200, 0.08 + pulse * 0.18);
        this.dangerGfx.fillRect(BASE_X, 60 + lane * GRID.CELL_H, gridX(2) - BASE_X + 20, GRID.CELL_H);
        this.dangerGfx.lineStyle(2, 0xff4400, 0.4 + pulse * 0.4);
        this.dangerGfx.lineBetween(BASE_X, 60 + lane * GRID.CELL_H, BASE_X, 60 + (lane + 1) * GRID.CELL_H);
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // PARTICLE & TEXT EFFECTS
  // ════════════════════════════════════════════════════════════

  spawnDeathBurst(x, y, color, scale) {
    scale = scale || 1;
    for (let i = 0; i < Math.round(12 * scale); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (60 + Math.random() * 130) * scale;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50,
        life: 600 + Math.random() * 300, maxLife: 900,
        r: (3 + Math.random() * 6) * scale, color,
        gfx: this.add.graphics().setDepth(20),
      });
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.particles.push({
        x, y, vx: Math.cos(a) * 28 * scale, vy: Math.sin(a) * 28 * scale - 20,
        life: 900, maxLife: 900, r: 2, color,
        gfx: this.add.graphics().setDepth(20),
      });
    }
  }

  spawnDeathPop(x, y, color, radius) {
    const g = this.add.graphics().setDepth(22);
    const pulse = { r: 8, a: 0.45 };
    this.tweens.add({
      targets: pulse,
      r: radius || 28,
      a: 0,
      duration: 180,
      ease: 'Quad.Out',
      onUpdate: () => {
        g.clear();
        g.fillStyle(color, pulse.a * 0.25);
        g.fillCircle(x, y, pulse.r * 0.52);
        g.lineStyle(3, color, pulse.a);
        g.strokeCircle(x, y, pulse.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  /**
   * triggerExplosion — called by an Exploder enemy on first contact.
   * Deals AoE damage to all dogs in the same lane within explosionRadius pixels,
   * spawns a large particle burst + expanding ring, then removes the exploder.
   */
  triggerExplosion(exploder, options) {
    options = options || {};
    const radius  = options.radius || exploder.config.explosionRadius || 130;
    const damage  = options.damage || exploder.config.damage;
    const ex = exploder.x, ey = exploder.y;
    const colorSet = options.colorSet || [0xff6600, 0xff4400, 0xffcc00];

    // Damage all dogs in the same lane within radius
    for (const dog of this.dogs) {
      if (dog.lane !== exploder.lane) continue;
      if (Math.abs(dog.x - ex) <= radius) {
        dog.takeDamage(damage);
      }
    }

    // Large orange explosion burst
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 220;
      const r = 5 + Math.random() * 10;
      const color = colorSet[Math.floor(Math.random() * colorSet.length)];
      this.particles.push({
        x: ex, y: ey,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80,
        life: 700 + Math.random() * 400, maxLife: 1100,
        r, color,
        gfx: this.add.graphics().setDepth(20),
      });
    }

    // Expanding orange rings
    [0, 80].forEach(delay => {
      this.time.delayedCall(delay, () => {
        const g = this.add.graphics().setDepth(21);
        this.tweens.add({
          targets: { r: 8, a: 0.9 },
          r: radius * 0.75, a: 0,
          duration: 380,
          ease: 'Quad.Out',
          onUpdate: (tween, target) => {
            g.clear();
            g.lineStyle(4, colorSet[0], target.a);
            g.strokeCircle(ex, ey, target.r);
          },
          onComplete: () => g.destroy(),
        });
      });
    });

    this.spawnFloatingText(ex, ey - 60, options.message || '💥 BOOM!', colorSet[0], {
      fontSize: '18px',
      scaleFrom: 1.15,
      duration: 1000,
    });
    this.cameras.main.shake(options.shakeDuration || 140, options.shakeIntensity || 0.007);
    SFX.explosion();

    // Remove the exploder from the scene
    if (options.removeEntity !== false) {
      const idx = this.enemies.indexOf(exploder);
      if (idx >= 0) {
        exploder.destroy();
        this.enemies.splice(idx, 1);
      }
    }
    if (options.reward !== false) {
      this.treats += exploder.config.reward;
      this._treatBounce = 4;
    }
  }

  /** Expanding ring that fades out — projectile impact confirmation */
  spawnImpactRing(x, y, color, maxRadius, width, duration) {
    const g = this.add.graphics().setDepth(21);
    this.tweens.add({
      targets: { r: 4, a: 0.9 },
      r: maxRadius || 22, a: 0,
      duration: duration || 220,
      ease: 'Quad.Out',
      onUpdate: (tween, target) => {
        g.clear();
        g.lineStyle(width || 2, color, target.a);
        g.strokeCircle(x, y, target.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  spawnHitParticle(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 60;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 280, maxLife: 280, r: 3, color,
        gfx: this.add.graphics().setDepth(20),
      });
    }
  }

  spawnTreatBurst(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.particles.push({
        x, y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55 - 30,
        life: 450, maxLife: 450, r: 4, color: 0xffd700,
        gfx: this.add.graphics().setDepth(20),
      });
    }
  }

  spawnShieldBreakBurst(x, y) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 160;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        life: 700, maxLife: 700,
        r: 3 + Math.random() * 5,
        color: i % 3 === 0 ? 0xaaddff : 0xffffff,
        gfx: this.add.graphics().setDepth(20),
      });
    }
  }

  spawnFloatingText(x, y, msg, color, options) {
    options = options || {};
    color = color || 0xff4444;
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(x, y, msg, {
      fontSize: options.fontSize || '15px', fontFamily: 'Arial Black, Arial',
      color: hex, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    if (options.scaleFrom) t.setScale(options.scaleFrom);
    this.floatTexts.push({
      obj: t, x, y,
      vx: options.vx || 0,
      vy: options.vy || -32,
      life: options.duration || 900,
      maxLife: options.duration || 900,
      scaleFrom: options.scaleFrom || 0,
    });
  }

  _showLevelIntroTransition() {
    const overlay = this.add.graphics().setDepth(180);
    overlay.fillStyle(0x000000, 1);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
    this._transitionOverlay = overlay;

    const titleLabel    = this.challengeMode ? '⚡ Wave Challenge' : `Level ${this.levelId}`;
    const subtitleLabel = this.challengeMode ? 'Survive as long as you can!' : this.levelData.name;
    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 18, titleLabel, {
      fontSize: '34px', fontFamily: 'Arial Black',
      color: this.challengeMode ? '#bb88ff' : '#ffd700',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(181);
    const subtitle = this.add.text(GAME_W / 2, GAME_H / 2 + 18, subtitleLabel, {
      fontSize: '16px', fontFamily: 'Arial',
      color: '#c8def8', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(181);

    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 520,
      delay: 180,
      onComplete: () => overlay.destroy(),
    });
    this.tweens.add({
      targets: [title, subtitle],
      alpha: 0,
      y: '-=14',
      duration: 420,
      delay: 380,
      onComplete: () => { title.destroy(); subtitle.destroy(); },
    });
  }

  _flashStageOverlay(color, alpha, duration) {
    const g = this.add.graphics().setDepth(48);
    g.fillStyle(color, alpha || 0.15);
    g.fillRect(0, 60, GAME_W, 440);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: duration || 240,
      onComplete: () => g.destroy(),
    });
  }

  _showBossIncoming() {
    if (this._bossIncomingActive) return;
    this._bossIncomingActive = true;
    const chapter = getChapterForLevel(this.levelId);
    const bossDef = BOSS_CHAPTER_DEFS[chapter?.id || 1] || BOSS_CHAPTER_DEFS[1];
    this._flashStageOverlay(0x3a0000, 0.22, 420);

    const banner = this.add.container(GAME_W / 2, GAME_H / 2 - 10).setDepth(60).setAlpha(0);
    const bg = this.add.graphics();
    bg.fillStyle(0x1b0004, 0.96);
    bg.fillRoundedRect(-220, -36, 440, 72, 14);
    bg.lineStyle(2.5, bossDef.accentColor, 1);
    bg.strokeRoundedRect(-220, -36, 440, 72, 14);
    banner.add(bg);
    banner.add(this.add.text(0, -10, 'BOSS INCOMING', {
      fontSize: '28px', fontFamily: 'Arial Black',
      color: '#ffcc88', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5));
    banner.add(this.add.text(0, 16, bossDef.name, {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#ffd6cf', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5));

    this.tweens.add({
      targets: banner,
      alpha: 1,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 180,
      yoyo: true,
      hold: 850,
      onComplete: () => {
        banner.destroy();
        this._bossIncomingActive = false;
      },
    });
    this.cameras.main.shake(180, 0.006);
    SFX.bossIncoming();
    AudioManager.playMusic('boss');
  }

  spawnBossMinions(boss, bossDef) {
    if (!boss || boss.hp <= 0 || this.wavePhase === 'won' || this.wavePhase === 'lost') return;
    const summonTypes = bossDef.summonTypes || ['walker'];
    const summonCount = bossDef.summonCount || 1;
    for (let i = 0; i < summonCount; i++) {
      const type = summonTypes[i % summonTypes.length];
      const ex = Math.max(SPAWN_X - 20, boss.x + 70 + i * 26);
      this.enemies.push(new Enemy(this, ex, enemyLaneY(boss.lane, type), boss.lane, type));
    }
    this.spawnFloatingText(boss.x, boss.y - 64, 'SUMMON!', 0xffbb55, {
      fontSize: '14px',
      duration: 850,
    });
    this.spawnImpactRing(boss.x, boss.y, bossDef.accentColor || 0xffbb55, 38, 2.5, 260);
  }

  getActiveBoss() {
    return this.enemies.find(e => e.type === 'boss' && e.hp > 0) || null;
  }

  // ════════════════════════════════════════════════════════════
  // END GAME
  // ════════════════════════════════════════════════════════════

  endGame(won) {
    if (this.isBattlePaused) this.resumeBattle();
    this.wavePhase = won ? 'won' : 'lost';
    this._dismissMenu();

    const ui = this.scene.get('UIScene');
    if (ui && ui.showEndMessage) ui.showEndMessage();

    if (won) {
      SFX.levelWin();
      this._flashStageOverlay(0xffffff, 0.14, 260);
      const stars   = computeStars(
        this.emergencyUsedTotal, this.dogsLostTotal, this.levelData.emergencySaves);
      const save    = Progression.load();
      const oldBest = Progression.getBestStars(this.levelId, save);
      Progression.completeLevel(this.levelId, stars, {
        perfectWin: this.emergencyUsedTotal === 0,
        usedDogTypes: Array.from(this.placedDogTypes),
      });
      Progression.applyBattleHomeOutcome(true);
      const fade = this.add.graphics().setDepth(190);
      fade.fillStyle(0x000000, 0);
      fade.fillRect(0, 0, GAME_W, GAME_H);
      this.tweens.add({
        targets: fade,
        alpha: 1,
        duration: 420,
        delay: 220,
        onComplete: () => {
          this.scene.stop('UIScene');
          this.scene.start('LevelCompleteScene', {
            levelId: this.levelId, stars, isNewBest: stars > oldBest,
          });
        },
      });
      return;
    }

    // Challenge mode loss — go to WaveGameOverScene
    if (this.challengeMode) {
      const wavesCompleted = Math.max(0, this.currentWave - 1);
      const isNewBest = Progression.saveChallengeResult(
        wavesCompleted, this.challengeBiscuitsEarned);
      const overlay = this.add.graphics().setDepth(190);
      overlay.fillStyle(0x000000, 0.5);
      overlay.fillRect(0, 60, GAME_W, 440);
      this.time.delayedCall(600, () => {
        this.scene.stop('UIScene');
        this.scene.start('WaveGameOverScene', {
          wavesCompleted,
          isNewBest,
          biscuitsEarned: this.challengeBiscuitsEarned,
          score: Math.floor(this.challengeScore),
        });
      });
      return;
    }

    // Campaign loss
    Progression.applyBattleHomeOutcome(false);
    const overlay = this.add.graphics().setDepth(190);
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 60, GAME_W, 440);
    this.add.text(GAME_W / 2, GAME_H / 2 - 80, 'GAME OVER\nThe undead reached home!', {
      fontSize: '36px', fontFamily: 'Arial Black', color: '#ff5555',
      stroke: '#000', strokeThickness: 5, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(200);

    this._makeEndBtn(GAME_W / 2 - 110, GAME_H / 2 + 14, 'Retry', 0x3a1a1a, 0x6a2a2a, () => {
      GameState.selectedDog = null;
      this.scene.stop('UIScene');
      this.scene.start('LoadoutScene', { levelId: this.levelId });
    });
    this._makeEndBtn(GAME_W / 2 + 110, GAME_H / 2 + 14, 'Level Select', 0x1a2a3a, 0x2a4a6a, () => {
      GameState.selectedDog = null;
      this.scene.stop('UIScene');
      this.scene.start('LevelSelectScene');
    });
  }

  _makeEndBtn(x, y, label, colNorm, colHover, onClick) {
    const W = 180, H = 42;
    const bg = this.add.graphics().setDepth(200);
    const draw = (col) => {
      bg.clear();
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(x - W / 2, y - H / 2, W, H, 8);
      bg.lineStyle(1.5, 0xffd700, 0.4);
      bg.strokeRoundedRect(x - W / 2, y - H / 2, W, H, 8);
    };
    draw(colNorm);
    const txt = this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
    txt.on('pointerover',  () => { draw(colHover); txt.setScale(1.05); });
    txt.on('pointerout',   () => { draw(colNorm);  txt.setScale(1.0);  });
    txt.on('pointerdown',  () => { SFX.click(); onClick(); });
  }

  isTileBlocked(col, lane) {
    if (col < 0 || col >= GRID.COLS || lane < 0 || lane >= GRID.ROWS) return true;
    return col >= this.maxPlaceCols || this.blockedTiles.has(`${lane}:${col}`);
  }

  pauseBattle() {
    if (this.isBattlePaused || this.wavePhase === 'won' || this.wavePhase === 'lost') return false;
    this.isBattlePaused = true;
    this.input.enabled = false;
    this.tweens.pauseAll();
    this.time.paused = true;
    this._pausedMusicVolume = AudioManager.getMusicVolume();
    AudioManager.setMusicVolume(this._pausedMusicVolume * 0.35);
    return true;
  }

  resumeBattle() {
    if (!this.isBattlePaused) return;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.input.enabled = true;
    if (this._pausedMusicVolume !== null) {
      AudioManager.setMusicVolume(this._pausedMusicVolume);
      this._pausedMusicVolume = null;
    }
    this.isBattlePaused = false;
  }

  endChallenge() {
    if (!this.challengeMode) return;
    if (this.wavePhase === 'won' || this.wavePhase === 'lost') return;

    // Count waves completed: if in idle, currentWave was fully cleared
    const wavesCompleted = (this.wavePhase === 'idle')
      ? this.currentWave
      : Math.max(0, this.currentWave - 1);

    // Resume so tweens/cleanup work cleanly
    if (this.isBattlePaused) this.resumeBattle();
    this.wavePhase = 'lost';
    this._dismissMenu();

    const isNewBest = Progression.saveChallengeResult(
      wavesCompleted, this.challengeBiscuitsEarned);
    const ui = this.scene.get('UIScene');
    if (ui && ui.showEndMessage) ui.showEndMessage();

    const overlay = this.add.graphics().setDepth(190);
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
    this.tweens.add({
      targets: overlay, alpha: 1, duration: 350,
      onComplete: () => {
        this._cleanupBattleState();
        this.scene.stop('UIScene');
        this.scene.start('WaveGameOverScene', {
          wavesCompleted,
          isNewBest,
          biscuitsEarned: this.challengeBiscuitsEarned,
          score: Math.floor(this.challengeScore),
        });
      },
    });
  }

  restartLevel() {
    GameState.selectedDog = null;
    this._cleanupBattleState();
    this.scene.stop('UIScene');
    if (this.challengeMode) {
      this.scene.start('LoadoutScene', { challengeMode: true });
    } else {
      this.scene.restart({ levelId: this.levelId });
    }
  }

  returnHome() {
    GameState.selectedDog = null;
    this._cleanupBattleState();
    this.scene.stop('UIScene');
    this.scene.start('OyongHomeScene');
  }

  _cleanupBattleState() {
    if (this._battleCleanedUp) return;
    this._battleCleanedUp = true;
    this.isBattlePaused = false;
    this.time.paused = false;
    this.input.enabled = true;
    this.input.off('pointermove', this.onMove, this);
    this.input.off('pointerdown', this.onClick, this);
    if (this.passiveIncomeEvent) this.passiveIncomeEvent.remove(false);
    if (this.laneDangerEvent) this.laneDangerEvent.remove(false);
    this.tweens.killAll();
    if (this._pausedMusicVolume !== null) {
      AudioManager.setMusicVolume(this._pausedMusicVolume);
      this._pausedMusicVolume = null;
    }
  }
}
