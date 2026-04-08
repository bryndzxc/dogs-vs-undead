// ============================================================
// MenuScene.js — Main title screen
// Drawn entirely with code (no assets).
// ============================================================

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    this._authListener = () => {
      if (this.scene && this.scene.isActive()) this.scene.restart();
    };
    window.addEventListener('dvz-auth-changed', this._authListener);
    this.events.once('shutdown', () => {
      window.removeEventListener('dvz-auth-changed', this._authListener);
    });

    this._buildBackground();
    this._buildTitle();
    this._buildAccountSummary();
    this._buildButtons();
    this._buildDog();
  }

  _buildBackground() {
    const g = this.add.graphics();

    // Sky gradient (simulate with two rectangles)
    g.fillStyle(0x0a1628, 1);
    g.fillRect(0, 0, GAME_W, GAME_H * 0.65);
    g.fillStyle(0x1a3a2a, 1);
    g.fillRect(0, GAME_H * 0.65, GAME_W, GAME_H * 0.35);

    // Stars
    g.fillStyle(0xffffff, 0.75);
    const stars = [
      [80,35],[200,60],[320,20],[450,50],[580,30],[720,55],[850,25],
      [140,90],[380,80],[630,100],[780,70],[920,45],[50,120],[500,110],
    ];
    stars.forEach(([sx, sy]) => g.fillCircle(sx, sy, 1.5));

    // Ground strip with grass texture
    g.fillStyle(0x3a7a2a, 1);
    g.fillRect(0, GAME_H - 80, GAME_W, 80);
    g.fillStyle(0x2a5a1a, 1);
    g.fillRect(0, GAME_H - 80, GAME_W, 6);

    // Fence posts along the bottom
    g.fillStyle(0xc8a860, 1);
    for (let x = 20; x < GAME_W; x += 60) {
      g.fillRoundedRect(x, GAME_H - 95, 8, 40, 2);
    }
    g.fillRect(10, GAME_H - 72, GAME_W - 20, 6);
    g.fillRect(10, GAME_H - 58, GAME_W - 20, 6);

    // Moon
    g.fillStyle(0xfff8e0, 1);
    g.fillCircle(GAME_W - 120, 80, 38);
    g.fillStyle(0x0f1e38, 1);
    g.fillCircle(GAME_W - 108, 72, 32); // crescent shadow

    // Clouds (dark, silhouetted)
    g.fillStyle(0x0d2040, 1);
    g.fillEllipse(180, 140, 120, 40);
    g.fillEllipse(220, 128, 80, 36);
    g.fillEllipse(700, 160, 140, 44);
    g.fillEllipse(740, 148, 90, 38);
  }

  _buildTitle() {
    // Shadow
    this.add.text(GAME_W / 2 + 4, 184, 'DOGS vs UNDEAD', {
      fontSize: '58px', fontFamily: 'Arial Black, Arial',
      color: '#000000', alpha: 0.5,
    }).setOrigin(0.5).setAlpha(0.35);

    // Main title
    const title = this.add.text(GAME_W / 2, 180, 'DOGS vs UNDEAD', {
      fontSize: '58px', fontFamily: 'Arial Black, Arial',
      color: '#ffd700',
      stroke: '#884400', strokeThickness: 6,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(GAME_W / 2, 248, 'Deploy your Oyongs. Defend the neighborhood!', {
      fontSize: '19px', fontFamily: 'Arial',
      color: '#aaddff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Pulse animation on title
    this.tweens.add({
      targets: title,
      scaleX: 1.04, scaleY: 1.04,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _buildButtons() {
    const save = Progression.load();
    const hasProgress = Array.isArray(save.levelStars) && save.levelStars.some(stars => (stars || 0) > 0);
    const currentUser = typeof AuthService !== 'undefined' && AuthService.getCurrentUser
      ? AuthService.getCurrentUser()
      : null;

    // Guest status is shown in the account chip — keep labels short
    const playLabel = hasProgress ? 'CONTINUE' : 'PLAY';
    const playY = hasProgress ? 352 : 368;

    // PLAY / CONTINUE button
    this._makeButton(
      GAME_W / 2,
      playY,
      playLabel,
      0x1e7a1e, 0x2aaa2a,
      () => this.scene.start('OyongHomeScene')
    );

    if (hasProgress) {
      // New Game button (secondary)
      this._makeButton(GAME_W / 2, playY + 58, 'NEW GAME', 0x5a3a1a, 0x7a5a2a, () => {
        Progression.reset();
        GameState.selectedDog = null;
        GameState.loadoutDogs = [];
        GameState.newUnlocks = [];
        GameState.lastHomeReward = 0;
        GameState.lastBattleBonus = 0;
        this.scene.start('OyongHomeScene');
      });
    }

    // LOG IN button — only when not signed in
    if (!currentUser) {
      const loginY = hasProgress ? playY + 118 : playY + 58;
      this._makeLoginButton(GAME_W / 2, loginY);
    }

    // Credits line
    this.add.text(GAME_W / 2, GAME_H - 22, 'All visuals drawn with code — no external assets', {
      fontSize: '11px', fontFamily: 'Arial',
      color: '#556677',
    }).setOrigin(0.5);
  }

  _buildAccountSummary() {
    const user = typeof AuthService !== 'undefined' && AuthService.getCurrentUser
      ? AuthService.getCurrentUser()
      : null;

    const message = user
      ? `Signed in as ${user.username}  ·  Cloud save active`
      : 'Progress saves locally. Log in for leaderboard & cloud save.';

    this.add.text(GAME_W / 2, 292, message, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#c7def0',
      stroke: '#000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5);
  }

  _makeButton(x, y, label, colorNormal, colorHover, onClick) {
    const W = 220, H = 48;
    const bg = this.add.graphics();

    const draw = (col) => {
      bg.clear();
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(x - W / 2, y - H / 2, W, H, 10);
      bg.lineStyle(2, 0xffd700, 0.6);
      bg.strokeRoundedRect(x - W / 2, y - H / 2, W, H, 10);
    };
    draw(colorNormal);

    const txt = this.add.text(x, y, label, {
      fontSize: '26px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, W, H)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover',  () => { draw(colorHover);  txt.setScale(1.05); });
    zone.on('pointerout',   () => { draw(colorNormal); txt.setScale(1.0);  });
    zone.on('pointerdown',  () => { SFX.click(); onClick(); });
  }

  _makeLoginButton(x, y) {
    const W = 210, H = 38;
    const bg = this.add.graphics();
    const colorNormal = 0x122240;
    const colorHover  = 0x24486a;

    const draw = (col) => {
      bg.clear();
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(x - W / 2, y - H / 2, W, H, 8);
      bg.lineStyle(1.5, 0x5599cc, 0.65);
      bg.strokeRoundedRect(x - W / 2, y - H / 2, W, H, 8);
    };
    draw(colorNormal);

    const txt = this.add.text(x, y, 'LOG IN / REGISTER', {
      fontSize: '16px', fontFamily: 'Arial Black',
      color: '#88bbdd', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, W, H)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover',  () => { draw(colorHover);  txt.setStyle({ color: '#ddeeff' }); });
    zone.on('pointerout',   () => { draw(colorNormal); txt.setStyle({ color: '#88bbdd' }); });
    zone.on('pointerdown',  () => {
      SFX.click();
      if (typeof OverlayUI !== 'undefined' && OverlayUI.openAuth) {
        OverlayUI.openAuth('login');
      }
    });
  }

  _buildDog() {
    // Animated dog silhouette in bottom-left corner
    const g = this.add.graphics().setDepth(5);
    this._dogAnim = 0;

    this.time.addEvent({
      delay: 16,
      callback: () => {
        this._dogAnim += 16;
        g.clear();
        // Bob and tail wag
        const bob = Math.sin(this._dogAnim / 500) * 4;
        drawDogByType(g, 120, GAME_H - 110 + bob, 'bark_pup', false, this._dogAnim);
      },
      loop: true,
    });

    // Decorative bone
    const bone = this.add.graphics().setDepth(4);
    bone.fillStyle(0xf5f5dc, 1);
    bone.fillCircle(185, GAME_H - 108, 6);
    bone.fillCircle(197, GAME_H - 108, 6);
    bone.fillRect(185, GAME_H - 110.5, 12, 5);
  }
}
