// ============================================================
// WaveGameOverScene.js — Challenge Mode game over summary
//
// Receives from GameScene:
//   { wavesCompleted, isNewBest, biscuitsEarned, score }
// ============================================================

class WaveGameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'WaveGameOverScene' }); }

  init(data) {
    this.wavesCompleted  = data.wavesCompleted  || 0;
    this.isNewBest       = data.isNewBest       || false;
    this.biscuitsEarned  = data.biscuitsEarned  || 0;
    this.score           = data.score           || 0;
  }

  create() {
    AudioManager.playMusic('home');
    this.saveData = Progression.load();

    this._buildBackground();
    this._buildPanel();
    this._buildContent();
    this._buildButtons();
    this._submitLeaderboard();
    this._playEntryFade();
  }

  _buildBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x07111f, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Stars
    g.fillStyle(0xffffff, 0.5);
    [[80,35],[200,60],[320,20],[450,50],[580,30],[720,55],[850,25],
     [140,90],[380,80],[630,100],[780,70],[920,45]
    ].forEach(([sx, sy]) => g.fillCircle(sx, sy, 1.5));

    // Ground
    g.fillStyle(0x1d4214, 1);
    g.fillRect(0, GAME_H - 50, GAME_W, 50);
    g.fillStyle(0x2b6620, 1);
    g.fillRect(0, GAME_H - 50, GAME_W, 6);

    // Moon
    g.fillStyle(0xfff8e0, 1);
    g.fillCircle(GAME_W - 100, 80, 36);
    g.fillStyle(0x0e1e38, 1);
    g.fillCircle(GAME_W - 86, 72, 30);

    const overlay = this.add.graphics().setDepth(2);
    overlay.fillStyle(0x000000, 0.60);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
  }

  _buildPanel() {
    const panelW = Math.min(620, GAME_W - 60);
    const panelH = 380;
    this._px = (GAME_W - panelW) / 2;
    this._py = (GAME_H - panelH) / 2 - 10;
    this._pw = panelW;
    this._ph = panelH;

    const g = this.add.graphics().setDepth(4);
    const borderColor = this.isNewBest ? 0xffd700 : 0xff5555;

    g.fillStyle(0x0c1730, 0.98);
    g.fillRoundedRect(this._px, this._py, panelW, panelH, 14);
    g.lineStyle(2.5, borderColor, 1);
    g.strokeRoundedRect(this._px, this._py, panelW, panelH, 14);
    g.fillStyle(borderColor, 0.12);
    g.fillRoundedRect(this._px, this._py, panelW, 56, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.03);
    g.fillRoundedRect(this._px + 18, this._py + 70, panelW - 36, panelH - 130, 18);
  }

  _buildContent() {
    const cx = GAME_W / 2;
    const py = this._py;
    const prev = this.saveData.waveBest || 0;

    // Title
    this.add.text(cx, py + 28, 'WAVE CHALLENGE OVER!', {
      fontSize: '26px', fontFamily: 'Arial Black',
      color: '#ff6666', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);

    // Challenge mode badge
    this.add.text(cx, py + 58, '⚡ Wave Challenge Mode', {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: '#bb88ff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    // Waves survived
    const waveColor = this.isNewBest ? '#ffd700' : '#ffffff';
    this.add.text(cx, py + 104,
      this.isNewBest ? `★ NEW BEST ★` : 'Waves Survived', {
      fontSize: this.isNewBest ? '20px' : '14px',
      fontFamily: 'Arial Black',
      color: this.isNewBest ? '#ffd700' : '#8888aa',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    this.add.text(cx, py + 140, String(this.wavesCompleted), {
      fontSize: '72px', fontFamily: 'Arial Black',
      color: waveColor,
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(5);

    this.add.text(cx, py + 192, this.wavesCompleted === 1 ? 'wave' : 'waves', {
      fontSize: '18px', fontFamily: 'Arial', color: '#aaaacc',
    }).setOrigin(0.5).setDepth(5);

    // Previous best
    if (!this.isNewBest && prev > 0) {
      this.add.text(cx, py + 218, `Previous best: ${prev}`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#6688aa',
      }).setOrigin(0.5).setDepth(5);
    }

    // Biscuits earned
    if (this.biscuitsEarned > 0) {
      const g2 = this.add.graphics().setDepth(5);
      g2.fillStyle(0x1a3a10, 0.8);
      g2.fillRoundedRect(cx - 140, py + 240, 280, 40, 10);
      g2.lineStyle(1.5, 0x44aa44, 0.7);
      g2.strokeRoundedRect(cx - 140, py + 240, 280, 40, 10);

      this.add.text(cx, py + 260, `+${this.biscuitsEarned} biscuits earned!`, {
        fontSize: '18px', fontFamily: 'Arial Black',
        color: '#88dd66', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(6);
    }

    // Score
    if (this.score > 0) {
      this.add.text(cx, py + 298, `Score: ${this.score}`, {
        fontSize: '14px', fontFamily: 'Arial', color: '#8899bb',
      }).setOrigin(0.5).setDepth(5);
    }

    // Auth status hint
    const user = typeof AuthService !== 'undefined' && AuthService.getCurrentUser
      ? AuthService.getCurrentUser()
      : null;
    const authHint = user
      ? `Logged in as ${user.username} — score submitted.`
      : 'Sign in to appear on the leaderboard.';
    this.add.text(cx, py + 320, authHint, {
      fontSize: '11px', fontFamily: 'Arial', color: '#5566aa',
    }).setOrigin(0.5).setDepth(5);
  }

  _buildButtons() {
    const cx   = GAME_W / 2;
    const btnY = this._py + this._ph - 36;

    this._makeBtn(cx - 210, btnY, 'Try Again', 0x2a1a3a, 0x5a3a8a, () => {
      GameState.selectedDog = null;
      this.scene.start('LoadoutScene', { challengeMode: true });
    });

    this._makeBtn(cx, btnY, 'Leaderboard', 0x1a2816, 0x2a4826, () => {
      this.scene.start('LeaderboardScene', { from: 'WaveGameOverScene' });
    });

    this._makeBtn(cx + 210, btnY, 'Home', 0x1a2a3a, 0x2a4a6a, () => {
      GameState.selectedDog = null;
      this.scene.start('OyongHomeScene');
    });
  }

  _makeBtn(x, y, label, colNorm, colHover, onClick) {
    const W = 180, H = 42;
    const bg = this.add.graphics().setDepth(6);
    const draw = col => {
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
    }).setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });
    txt.on('pointerover',  () => { draw(colHover); txt.setScale(1.04); });
    txt.on('pointerout',   () => { draw(colNorm);  txt.setScale(1);    });
    txt.on('pointerdown',  () => { SFX.click(); onClick(); });
  }

  async _submitLeaderboard() {
    try {
      if (typeof CloudService !== 'undefined' && AuthService.isAuthenticated()) {
        await CloudService.submitScore(this.saveData);
      }
    } catch (_e) {
      // silently ignore — leaderboard is optional
    }
  }

  _playEntryFade() {
    const fade = this.add.graphics().setDepth(200);
    fade.fillStyle(0x000000, 1);
    fade.fillRect(0, 0, GAME_W, GAME_H);
    this.tweens.add({ targets: fade, alpha: 0, duration: 380, ease: 'Quad.Out',
      onComplete: () => fade.destroy() });
  }
}
