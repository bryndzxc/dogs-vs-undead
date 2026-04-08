// ============================================================
// UIScene.js — HUD overlay: treats, wave status, dog selection cards
//
// Dog cards show bust portraits (redrawn each frame for animation).
// Cards are built from GameState.loadoutDogs, set by LoadoutScene.
// ============================================================

class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene' }); }

  create() {
    this.gs = this.scene.get('GameScene');

    // ── Top bar ──────────────────────────────────────────────
    this.add.text(10, 9, 'Treats:', {
      fontSize: '17px', fontFamily: 'Arial', color: '#aaccff',
    });
    this.add.text(73, 7, '\u{1F9B4}', { fontSize: '24px' });
    this.treatsText = this.add.text(100, 10, '100', {
      fontSize: '23px', fontFamily: 'Arial Black',
      color: '#ffd700', stroke: '#000', strokeThickness: 3,
    });

    this.waveLabel = this.add.text(GAME_W / 2, 7, 'Get Ready!', {
      fontSize: '24px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(GAME_W / 2, 34, 'Place Oyongs, then press Start Wave!', {
      fontSize: '15px', fontFamily: 'Arial',
      color: '#aaddff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.bossBarGfx = this.add.graphics().setDepth(55).setVisible(false);
    this.bossNameText = this.add.text(GAME_W / 2, 8, '', {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#ffd6cf', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(56).setVisible(false);
    this.bossHintText = this.add.text(GAME_W / 2, 26, '', {
      fontSize: '10px', fontFamily: 'Arial',
      color: '#ffccaa', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(56).setVisible(false);

    // Start Wave button — larger for better mobile tap target
    this.startBtnGfx = this.add.graphics();
    this.startBtnTxt = this.add.text(GAME_W - 101, 30, 'Start Wave ▶', {
      fontSize: '18px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-89, -22, 186, 42),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    this.startBtnTxt.on('pointerover',  () => this.startBtnTxt.setColor('#ffd700'));
    this.startBtnTxt.on('pointerout',   () => this.startBtnTxt.setColor('#ffffff'));
    this.startBtnTxt.on('pointerdown',  () => { SFX.click(); this.gs.startWave(); });

    this.pauseBtnGfx = this.add.graphics().setDepth(52);
    this.pauseBtnTxt = this.add.text(GAME_W - 246, 30, 'Pause II', {
      fontSize: '17px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(53).setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-80, -22, 126, 42),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    this.pauseBtnTxt.on('pointerover', () => this.pauseBtnTxt.setColor('#ffd700'));
    this.pauseBtnTxt.on('pointerout',  () => this.pauseBtnTxt.setColor('#ffffff'));
    this.pauseBtnTxt.on('pointerdown', () => {
      SFX.click();
      if (this.gs && this.gs.pauseBattle && this.gs.pauseBattle()) this._showPauseOverlay();
    });

    this.selOutline = this.add.graphics().setDepth(52);

    // ── Sound widget — compact toggle button + collapsible panel ─────────────
    // Button sits in the right margin (x>832, clear of dog cards).
    // Panel opens above the button on click; closed by default.
    this._soundOpen = false;
    // Panel background (hidden until opened)
    this._sndPanGfx = this.add.graphics().setDepth(52).setVisible(false);
    // Small speaker toggle button background (always visible)
    this._sndBtnGfx = this.add.graphics().setDepth(52);
    // Speaker icon — clickable toggle
    this._sndToggleTxt = this.add.text(896, 606, '\uD83D\uDD0A', {
      fontSize: '16px', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(53).setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-28, -13, 56, 26),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    // Mute toggle text inside panel
    this._sndMuteTxt = this.add.text(896, 526, '', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#c0d6ea',
    }).setOrigin(0.5).setDepth(53).setVisible(false).setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-44, -13, 88, 26),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    // Music row: M- / M% / M+
    this._sndMDown = this._makeSndBtn(858, 556, 'M\u2212');
    this._sndMValTxt = this.add.text(896, 556, '', {
      fontSize: '10px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(53).setVisible(false);
    this._sndMUp = this._makeSndBtn(934, 556, 'M+');
    // SFX row: S- / S% / S+
    this._sndSDown = this._makeSndBtn(858, 576, 'S\u2212');
    this._sndSValTxt = this.add.text(896, 576, '', {
      fontSize: '10px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(53).setVisible(false);
    this._sndSUp = this._makeSndBtn(934, 576, 'S+');

    this._refreshSoundWidget();

    this._sndToggleTxt.on('pointerdown', () => {
      this._soundOpen = !this._soundOpen;
      this._refreshSoundWidget();
    });
    this._sndMuteTxt.on('pointerdown', () => {
      AudioManager.toggleMute();
      this._refreshSoundWidget();
    });
    this._sndMDown.on('pointerdown', () => {
      SFX.click();
      AudioManager.setMusicVolume(AudioManager.getMusicVolume() - 0.1);
      this._refreshSoundWidget();
    });
    this._sndMUp.on('pointerdown', () => {
      SFX.click();
      AudioManager.setMusicVolume(AudioManager.getMusicVolume() + 0.1);
      this._refreshSoundWidget();
    });
    this._sndSDown.on('pointerdown', () => {
      SFX.click();
      AudioManager.setSFXVolume(AudioManager.getSFXVolume() - 0.1);
      this._refreshSoundWidget();
    });
    this._sndSUp.on('pointerdown', () => {
      SFX.click();
      AudioManager.setSFXVolume(AudioManager.getSFXVolume() + 0.1);
      this._refreshSoundWidget();
    });

    // ── Dog cards ────────────────────────────────────────────
    // Use the loadout selection; fall back to all dogs if bypassed
    const types   = (GameState.loadoutDogs && GameState.loadoutDogs.length > 0)
      ? GameState.loadoutDogs
      : Object.keys(DOG_DEFS);

    // Cards sit in the bottom UI strip (y=500–620) and stay centered.
    // Width is derived from card count so 3-card and 4-card loadouts both
    // remain readable without pushing into the field above.
    const maxCards = types.length;
    const sidePad  = 16;
    const gap      = maxCards >= 4 ? 8 : 10;
    const maxCardW = maxCards <= 2 ? 250 : maxCards === 3 ? 212 : 170;
    const cardW    = Math.min(maxCardW,
      Math.floor((GAME_W - sidePad * 2 - gap * (maxCards - 1)) / maxCards));
    const cardH    = 112;
    const totalW   = maxCards * cardW + (maxCards - 1) * gap;
    let   startX   = (GAME_W - totalW) / 2 + cardW / 2;

    this.cards = {};
    types.forEach(type => {
      this.createCard(type, startX, 560, cardW, cardH);
      startX += cardW + gap;
    });
  }

  _showPauseOverlay() {
    this._hidePauseOverlay();

    const inChallenge = !!(this.gs && this.gs.challengeMode);
    // Challenge mode: 4 buttons need more height
    const panelH   = inChallenge ? 290 : 248;
    const panelTop = 148;
    const btnGap   = 44;
    const btnY0    = inChallenge ? panelTop + 116 : panelTop + 120;

    const shade = this.add.graphics().setDepth(120);
    shade.fillStyle(0x000000, 0.62);
    shade.fillRect(0, 0, GAME_W, GAME_H);

    const blocker = this.add.zone(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H)
      .setDepth(121)
      .setInteractive({ useHandCursor: true });

    const panel = this.add.graphics().setDepth(122);
    panel.fillStyle(0x122034, 0.98);
    panel.fillRoundedRect(GAME_W / 2 - 180, panelTop, 360, panelH, 16);
    panel.lineStyle(2, 0x87b7ff, 0.9);
    panel.strokeRoundedRect(GAME_W / 2 - 180, panelTop, 360, panelH, 16);

    const title = this.add.text(GAME_W / 2, panelTop + 36, 'Battle Paused', {
      fontSize: '30px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(123);

    const body = this.add.text(GAME_W / 2, panelTop + 72, 'Everything is frozen until you choose what to do next.', {
      fontSize: '13px', fontFamily: 'Arial',
      color: '#b7cbe4', stroke: '#000', strokeThickness: 2,
      align: 'center', wordWrap: { width: 300 },
    }).setOrigin(0.5).setDepth(123);

    const buttons = [
      ...this._buildPauseBtn(GAME_W / 2, btnY0, 'Resume', 0x164022, 0x1f6432, () => {
        if (this.gs && this.gs.resumeBattle) this.gs.resumeBattle();
        this._hidePauseOverlay();
      }),
    ];

    if (inChallenge) {
      buttons.push(...this._buildPauseBtn(
        GAME_W / 2, btnY0 + btnGap, 'End Challenge', 0x3a1010, 0x6a2020, () => {
          this._showEndChallengeConfirm();
        }
      ));
    }

    buttons.push(
      ...this._buildPauseBtn(
        GAME_W / 2, btnY0 + btnGap * (inChallenge ? 2 : 1),
        'Restart Level', 0x3a2a10, 0x6a5018, () => {
          if (this.gs && this.gs.restartLevel) this.gs.restartLevel();
        }
      ),
      ...this._buildPauseBtn(
        GAME_W / 2, btnY0 + btnGap * (inChallenge ? 3 : 2),
        'Return Home', 0x2b1c3d, 0x473064, () => {
          if (this.gs && this.gs.returnHome) this.gs.returnHome();
        }
      ),
    );

    this._pauseOverlayObjects = [shade, blocker, panel, title, body, ...buttons];
  }

  _showEndChallengeConfirm() {
    this._hidePauseOverlay();

    const shade = this.add.graphics().setDepth(120);
    shade.fillStyle(0x000000, 0.72);
    shade.fillRect(0, 0, GAME_W, GAME_H);

    const blocker = this.add.zone(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H)
      .setDepth(121).setInteractive({ useHandCursor: true });

    const panel = this.add.graphics().setDepth(122);
    panel.fillStyle(0x1a0a0a, 0.98);
    panel.fillRoundedRect(GAME_W / 2 - 180, 170, 360, 222, 16);
    panel.lineStyle(2, 0xff6644, 0.9);
    panel.strokeRoundedRect(GAME_W / 2 - 180, 170, 360, 222, 16);

    const title = this.add.text(GAME_W / 2, 208, 'End Challenge?', {
      fontSize: '26px', fontFamily: 'Arial Black',
      color: '#ff8866', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(123);

    const body = this.add.text(GAME_W / 2, 278, 'Your current wave and score\nwill be saved to the leaderboard.', {
      fontSize: '13px', fontFamily: 'Arial', color: '#c8b8a8',
      stroke: '#000', strokeThickness: 2, align: 'center',
    }).setOrigin(0.5).setDepth(123);

    const confirmBtns = [
      ...this._buildPauseBtn(GAME_W / 2, 326, 'Yes, End Run', 0x4a1010, 0x7a2020, () => {
        if (this.gs && this.gs.endChallenge) this.gs.endChallenge();
      }),
      ...this._buildPauseBtn(GAME_W / 2, 368, 'Cancel', 0x1a2636, 0x2a3a50, () => {
        this._showPauseOverlay();
      }),
    ];

    this._pauseOverlayObjects = [shade, blocker, panel, title, body, ...confirmBtns];
  }

  _hidePauseOverlay() {
    if (!this._pauseOverlayObjects) return;
    this._pauseOverlayObjects.forEach(obj => obj.destroy());
    this._pauseOverlayObjects = null;
  }

  _buildPauseBtn(x, y, label, colNorm, colHover, onClick) {
    const W = 230;
    const H = 36;
    const bg = this.add.graphics().setDepth(123);
    const draw = (color) => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(x - W / 2, y - H / 2, W, H, 8);
      bg.lineStyle(1.5, 0xffd700, 0.35);
      bg.strokeRoundedRect(x - W / 2, y - H / 2, W, H, 8);
    };
    draw(colNorm);

    const txt = this.add.text(x, y, label, {
      fontSize: '17px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(124).setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-W / 2, -H / 2, W, H),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });

    txt.on('pointerover', () => {
      draw(colHover);
      txt.setScale(1.03);
    });
    txt.on('pointerout', () => {
      draw(colNorm);
      txt.setScale(1);
    });
    txt.on('pointerdown', () => {
      SFX.click();
      onClick();
    });

    return [bg, txt];
  }

  createCard(type, cx, cy, w, h) {
    const def    = DOG_DEFS[type];
    const bg     = this.add.graphics().setDepth(50);
    this._drawCardBg(bg, cx, cy, w, h, false);

    const dogGfx = this.add.graphics().setDepth(51);

    // Cost badge upper-right — slightly larger for readability
    const badgeGfx = this.add.graphics().setDepth(51);
    badgeGfx.fillStyle(0x1e3a18, 1);
    badgeGfx.fillRoundedRect(cx + w / 2 - 62, cy - h / 2 + 6, 56, 24, 6);

    this.add.text(cx + w / 2 - 34, cy - h / 2 + 18, `\u{1F9B4} ${def.cost}`, {
      fontSize: '14px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5).setDepth(52);

    const textX = cx + 18;
    const textWrap = Math.max(76, w - 84);

    this.add.text(textX, cy + 5, def.name, {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: '#ffd700', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: textWrap }, align: 'center',
    }).setOrigin(0.5).setDepth(51);

    // Flavor text (short italic line)
    if (def.flavor) {
      this.add.text(textX, cy + 22, `"${def.flavor}"`, {
        fontSize: '10px', fontFamily: 'Arial', color: '#aaccaa',
        fontStyle: 'italic', wordWrap: { width: textWrap }, align: 'center',
      }).setOrigin(0.5).setDepth(51);
    }

    this.add.text(textX, cy + 41, def.role || def.desc, {
      fontSize: '10px', fontFamily: 'Arial', color: '#9ab0cc',
      wordWrap: { width: textWrap }, align: 'center',
    }).setOrigin(0.5).setDepth(51);

    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      if (GameState.selectedDog === type) {
        GameState.selectedDog = null;
        SFX.click();
      } else {
        GameState.selectedDog = type;
        SFX.click();
        // Shake card if player can't afford it
        const gs = this.scene.get('GameScene');
        if (gs && gs.treats < DOG_DEFS[type].cost) {
          SFX.cantAfford();
          this.tweens.add({
            targets: this.cards[type].bg,
            x: { from: -4, to: 4 }, duration: 60, yoyo: true, repeat: 2,
            onComplete: () => { if (this.cards[type].bg) this.cards[type].bg.x = 0; },
          });
        }
      }
    });
    zone.on('pointerover', () => this._drawCardBg(bg, cx, cy, w, h, true));
    zone.on('pointerout',  () => this._drawCardBg(bg, cx, cy, w, h, false));

    this.cards[type] = { cx, cy, w, h, bg, dogGfx, badgeGfx };
  }

  _drawCardBg(bg, cx, cy, w, h, hovered) {
    bg.clear();
    bg.fillStyle(hovered ? 0x243040 : 0x1a2636, 1);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
    bg.lineStyle(2, hovered ? 0x5a8aaa : 0x3a5a7a, 1);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
  }

  update() {
    const gs = this.gs;
    if (!gs) return;

    const totalWaves = gs.levelData ? gs.levelData.waves.length : 3;

    const prevTreats = this._lastTreats || 0;
    this._lastTreats = gs.treats;
    this.treatsText.setText(String(gs.treats));

    // Bounce treat counter when treats increase
    if (gs._treatBounce > 0) {
      gs._treatBounce--;
      if (!this._bouncing) {
        this._bouncing = true;
        this.tweens.add({
          targets: this.treatsText,
          scaleX: 1.35, scaleY: 1.35,
          duration: 90, yoyo: true, ease: 'Quad.Out',
          onComplete: () => { this._bouncing = false; this.treatsText.setScale(1); },
        });
      }
    }

    if (gs.challengeMode) {
      this.waveLabel.setText(
        gs.currentWave === 0 ? '\u26A1 Wave Challenge' : `\u26A1 Wave ${gs.currentWave}`
      );
    } else {
      this.waveLabel.setText(
        gs.currentWave === 0 ? 'Get Ready!' : `Wave ${gs.currentWave} / ${totalWaves}`
      );
    }

    const msgs = {
      idle:     gs.currentWave === 0
                  ? (gs._prepTimerActive
                    ? `Wave 1 starts in ${Math.ceil(gs._prepTimerRemaining / 1000)}s — place Oyongs or press Start Wave!`
                    : 'Place Oyongs, then press Start Wave!')
                  : gs.challengeMode
                    ? `Wave ${gs.currentWave} cleared! \u26A1 Next wave incoming`
                    : `Wave ${gs.currentWave} done!  Next wave incoming`,
      spawning: `Wave ${gs.currentWave} — zombies incoming!`,
      fighting: `Wave ${gs.currentWave} — hold the line!`,
      won:      'Victory! The neighborhood is safe!',
      lost:     gs.challengeMode ? 'The challenge is over...' : 'The undead broke through...',
    };
    const activeBoss = gs.getActiveBoss ? gs.getActiveBoss() : null;
    this.statusText.setText(
      gs.isBattlePaused ? 'Game paused' : (activeBoss ? 'Boss fight — hold the line!' : (msgs[gs.wavePhase] || ''))
    );

    const showBtn = !gs.isBattlePaused && gs.wavePhase === 'idle' && gs.currentWave === 0;
    this.startBtnTxt.setVisible(showBtn);
    this.startBtnGfx.clear();
    if (showBtn) {
      // Pulse the button green brightness to draw attention
      const pulse = (Math.sin(this.time.now / 400) + 1) / 2;
      const g = 95 + Math.floor(pulse * 45);  // 95–140 green brightness
      this.startBtnGfx.fillStyle(Phaser.Display.Color.GetColor(18, g, 20), 1);
      this.startBtnGfx.fillRoundedRect(GAME_W - 190, 8, 186, 42, 9);
      this.startBtnGfx.lineStyle(2.5, Phaser.Display.Color.GetColor(80, 220, 90), 1);
      this.startBtnGfx.strokeRoundedRect(GAME_W - 190, 8, 186, 42, 9);
    }

    const showPauseBtn = gs.wavePhase !== 'won' && gs.wavePhase !== 'lost';
    this.pauseBtnTxt.setVisible(showPauseBtn);
    this.pauseBtnGfx.clear();
    if (showPauseBtn) {
      this.pauseBtnTxt.setAlpha(gs.isBattlePaused ? 0.72 : 1);
      this.pauseBtnGfx.fillStyle(gs.isBattlePaused ? 0x4a3f18 : 0x243244, 1);
      this.pauseBtnGfx.fillRoundedRect(GAME_W - 326, 8, 126, 42, 9);
      this.pauseBtnGfx.lineStyle(2, gs.isBattlePaused ? 0xffd76a : 0x89b8ff, 1);
      this.pauseBtnGfx.strokeRoundedRect(GAME_W - 326, 8, 126, 42, 9);
    }

    // Selected card gold outline
    this.selOutline.clear();
    const sel = GameState.selectedDog;
    if (sel && this.cards[sel]) {
      const c = this.cards[sel];
      this.selOutline.lineStyle(3, 0xffd700, 1);
      this.selOutline.strokeRoundedRect(c.cx - c.w / 2, c.cy - c.h / 2, c.w, c.h, 9);
    }

    // Animate bust portraits
    const now = this.time.now;
    Object.entries(this.cards).forEach(([type, card]) => {
      const canAfford = gs.treats >= DOG_DEFS[type].cost;
      const alpha     = canAfford ? 1 : 0.45;
      card.bg.setAlpha(alpha);
      card.badgeGfx.setAlpha(alpha);
      card.dogGfx.clear();
      card.dogGfx.setAlpha(alpha);
      drawDogBustByType(card.dogGfx, card.cx - 34, card.cy - 8, type, false, now);
    });

    this._drawBossBar(activeBoss);
  }

  _makeSndBtn(x, y, label) {
    return this.add.text(x, y, label, {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#c0d6ea',
    }).setOrigin(0.5).setDepth(53).setVisible(false).setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-14, -12, 28, 24),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
  }

  _refreshSoundWidget() {
    const muted = AudioManager.muted;
    const mv = Math.round(AudioManager.getMusicVolume() * 100);
    const sv = Math.round(AudioManager.getSFXVolume() * 100);
    const open = this._soundOpen;

    // Toggle button background (always visible, small)
    this._sndBtnGfx.clear();
    this._sndBtnGfx.fillStyle(open ? 0x1e3550 : 0x111e2d, 0.95);
    this._sndBtnGfx.fillRoundedRect(868, 593, 56, 25, 5);
    this._sndBtnGfx.lineStyle(1.5, open ? 0x6a9fcc : (muted ? 0x773333 : 0x3a5a7a), 1);
    this._sndBtnGfx.strokeRoundedRect(868, 593, 56, 25, 5);
    this._sndToggleTxt.setText(muted ? '\uD83D\uDD07' : '\uD83D\uDD0A');
    this._sndToggleTxt.setAlpha(muted ? 0.45 : 1);

    // Panel
    const showPanel = open;
    this._sndPanGfx.setVisible(showPanel);
    this._sndMuteTxt.setVisible(showPanel);
    this._sndMDown.setVisible(showPanel);
    this._sndMValTxt.setVisible(showPanel);
    this._sndMUp.setVisible(showPanel);
    this._sndSDown.setVisible(showPanel);
    this._sndSValTxt.setVisible(showPanel);
    this._sndSUp.setVisible(showPanel);

    if (showPanel) {
      // Panel: x=836–956 (width=120), y=506–592 (height=86)
      this._sndPanGfx.clear();
      this._sndPanGfx.fillStyle(0x111e2d, 0.98);
      this._sndPanGfx.fillRoundedRect(836, 506, 120, 86, 8);
      this._sndPanGfx.lineStyle(1.5, muted ? 0x773333 : 0x3a5a7a, 1);
      this._sndPanGfx.strokeRoundedRect(836, 506, 120, 86, 8);
      this._sndPanGfx.lineStyle(1, 0x2a4a6a, 0.6);
      this._sndPanGfx.lineBetween(844, 542, 948, 542);

      this._sndMuteTxt.setText(muted ? '\uD83D\uDD07  Muted' : '\uD83D\uDD0A  Sound On');
      this._sndMuteTxt.setAlpha(muted ? 0.55 : 1);
      this._sndMValTxt.setText(`${mv}%`);
      this._sndSValTxt.setText(`${sv}%`);
    }
  }

  _drawBossBar(boss) {
    this.bossBarGfx.clear();
    if (!boss) {
      this.bossBarGfx.setVisible(false);
      this.bossNameText.setVisible(false);
      this.bossHintText.setVisible(false);
      this.waveLabel.setY(7);
      this.statusText.setY(34);
      return;
    }

    const bossDef = boss.bossDef || BOSS_CHAPTER_DEFS[boss.bossChapter || 1] || BOSS_CHAPTER_DEFS[1];
    const barW = 360;
    const barH = 12;
    const x = GAME_W / 2 - barW / 2;
    const y = 6;
    const hpPct = Math.max(0, boss.hp / boss.maxHp);
    const shieldPct = boss.bossShieldMax > 0 ? Math.max(0, boss.bossShieldHp / boss.bossShieldMax) : 0;

    this.waveLabel.setY(36);
    this.statusText.setY(52);

    this.bossBarGfx.setVisible(true);
    this.bossNameText.setVisible(true).setText(bossDef.name);
    this.bossHintText.setVisible(true).setText(bossDef.intro || 'Boss encounter');

    this.bossBarGfx.fillStyle(0x000000, 0.72);
    this.bossBarGfx.fillRoundedRect(x - 4, y - 4, barW + 8, 34, 10);
    this.bossBarGfx.lineStyle(2, bossDef.accentColor || 0xff6644, 1);
    this.bossBarGfx.strokeRoundedRect(x - 4, y - 4, barW + 8, 34, 10);
    this.bossBarGfx.fillStyle(0x2a0f16, 1);
    this.bossBarGfx.fillRoundedRect(x, y + 10, barW, barH, 6);
    this.bossBarGfx.fillStyle(boss.raging ? 0xff8844 : 0xdd2233, 1);
    this.bossBarGfx.fillRoundedRect(x, y + 10, barW * hpPct, barH, 6);
    if (shieldPct > 0) {
      this.bossBarGfx.fillStyle(0x88d8ff, 0.9);
      this.bossBarGfx.fillRoundedRect(x, y + 10, barW * shieldPct, 4, 4);
    }
  }

  showEndMessage() {
    this._hidePauseOverlay();
    this.pauseBtnTxt.setVisible(false);
    this.pauseBtnGfx.clear();
    this.startBtnTxt.setVisible(false);
    this.startBtnGfx.clear();
  }
}
