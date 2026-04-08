// ============================================================
// LevelCompleteScene.js — Level complete screen
//
// Receives: { levelId, stars (1–3), isNewBest }
// Animates stars in sequence, shows unlock notification if a new
// dog was unlocked, provides Retry / Next Level / Level Select buttons.
// ============================================================

class LevelCompleteScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelCompleteScene' }); }

  init(data) {
    this.levelId   = data.levelId   || 1;
    this.stars     = data.stars     || 1;
    this.isNewBest = data.isNewBest || false;
    this._particles = [];
  }

  create() {
    AudioManager.playMusic('home');
    this.saveData  = Progression.load();
    this.levelDef  = LEVEL_DATA.find(l => l.id === this.levelId);
    this.hasUnlock = (GameState.newUnlocks || []).length > 0;
    this.rewardDropInfo = GameState.lastRewardDropInfo || {
      chance: 0,
      rarityRates: getCollectibleDropRates(),
      duplicateProtected: true,
      collectionComplete: false,
      reward: null,
      isNew: false,
    };
    this.collectibleDrop = GameState.lastCollectibleDrop;
    this.hasCollectible = !!this.collectibleDrop;

    this._buildBackground();
    this._buildPanel();
    this._buildStarRow();
    this._buildStats();
    this._buildRewardBadge();
    this._buildDropReveal();
    this._buildUnlockBadge();
    this._buildButtons();
    this._playEntryFade();

    const missionNotes = Progression.drainMissionNotifications();
    if (missionNotes.length > 0) this._showMissionPopups(missionNotes);
  }

  _buildBackground() {
    const g = this.add.graphics();

    g.fillStyle(0x07111f, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0xffffff, 0.55);
    [[80,35],[200,60],[320,20],[450,50],[580,30],[720,55],[850,25],
     [140,90],[380,80],[630,100],[780,70],[920,45]
    ].forEach(([sx,sy]) => g.fillCircle(sx, sy, 1.5));

    g.fillStyle(0x1d4214, 1);
    g.fillRect(0, GAME_H - 50, GAME_W, 50);
    g.fillStyle(0x2b6620, 1);
    g.fillRect(0, GAME_H - 50, GAME_W, 6);
    g.fillStyle(0xfff8e0, 1);
    g.fillCircle(GAME_W - 100, 80, 36);
    g.fillStyle(0x0e1e38, 1);
    g.fillCircle(GAME_W - 86, 72, 30);

    const overlay = this.add.graphics().setDepth(2);
    overlay.fillStyle(0x000000, 0.58);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
  }

  _buildPanel() {
    const panelW = Math.min(690, GAME_W - 60);
    const panelH = 536 + (this.hasUnlock ? 94 : 0);
    const px = (GAME_W - panelW) / 2;
    const py = (GAME_H - panelH) / 2;
    const borderColor = this.stars === 3 ? 0xffd700 : this.stars === 2 ? 0x88aadd : 0x5a7a9a;
    const g = this.add.graphics();
    g.setDepth(4);
    g.fillStyle(0x0c1730, 0.98);
    g.fillRoundedRect(px, py, panelW, panelH, 14);
    g.lineStyle(2.5, borderColor, 1);
    g.strokeRoundedRect(px, py, panelW, panelH, 14);
    g.fillStyle(borderColor, 0.12);
    g.fillRoundedRect(px, py, panelW, 56, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.03);
    g.fillRoundedRect(px + 18, py + 70, panelW - 36, panelH - 168, 18);

    this.panelY = py;
    this.panelH = panelH;
    this.panelX = px;
    this.panelW = panelW;
    const cx    = GAME_W / 2;
    this.contentTop = py + 28;
    this.buttonY    = py + panelH - 52;

    this.add.text(cx, this.contentTop, 'LEVEL COMPLETE!', {
      fontSize: panelW < 620 ? '30px' : '34px', fontFamily: 'Arial Black',
      color: '#ffd700', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(6);

    this.add.text(cx, this.contentTop + 36, this.levelDef.name, {
      fontSize: panelW < 620 ? '17px' : '19px', fontFamily: 'Arial',
      color: '#aaddff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    if (this.isNewBest) {
      const bg2 = this.add.graphics().setDepth(5);
      bg2.fillStyle(0x1a4a1a, 1);
      bg2.fillRoundedRect(cx - 68, this.contentTop + 68, 136, 24, 8);
      bg2.lineStyle(1.5, 0x44dd88, 1);
      bg2.strokeRoundedRect(cx - 68, this.contentTop + 68, 136, 24, 8);
      this.add.text(cx, this.contentTop + 80, 'NEW BEST!', {
        fontSize: '13px', fontFamily: 'Arial Black', color: '#44dd88',
      }).setOrigin(0.5).setDepth(6);
    }
  }

  _buildStarRow() {
    const cx = GAME_W / 2;
    const cy = this.panelY + 176;
    const spread = this.panelW < 620 ? 84 : 100;
    const starPositions = [cx - spread, cx, cx + spread];
    const size = this.panelW < 620 ? 34 : 38;

    // Draw all 3 stars initially empty
    this._starContainers = starPositions.map((sx, i) => {
      const container = this.add.container(sx, cy).setDepth(10);
      const g = this.add.graphics();
      drawStar(g, 0, 0, size, false);
      container.add(g);
      return { container, g, filled: false };
    });

    // Animate earned stars in sequence
    for (let i = 0; i < this.stars; i++) {
      this.time.delayedCall(500 + i * 380, () => {
        const entry = this._starContainers[i];
        entry.g.clear();
        drawStar(entry.g, 0, 0, size, true);
        entry.filled = true;
        entry.container.setScale(0.2);
        this.tweens.add({
          targets: entry.container,
          scaleX: 1.3, scaleY: 1.3,
          duration: 200, ease: 'Back.Out',
          onComplete: () => {
            this.tweens.add({
              targets: entry.container,
              scaleX: 1, scaleY: 1, duration: 120,
            });
            this._starBurst(
              this.panelX + (entry.container.x - (GAME_W / 2 - this.panelX - this.panelW / 2)),
              cy
            );
          },
        });
      });
    }
  }

  _starBurst(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const g = this.add.graphics().setDepth(15);
      this._particles.push({
        x, y,
        vx: Math.cos(a) * (60 + Math.random() * 60),
        vy: Math.sin(a) * (60 + Math.random() * 60) - 30,
        life: 550, maxLife: 550, r: 4,
        color: i % 2 === 0 ? 0xffd700 : 0xffee88,
        gfx: g,
      });
    }
  }

  _buildStats() {
    const cx  = GAME_W / 2;
    const py2 = this.panelY + 230;

    const flavors = [
      'Flawless! No Oyongs lost, no close calls.',
      'Well done! Your Oyongs held the line.',
      'You survived — barely!',
    ];
    this.add.text(cx, py2, flavors[this.stars - 1], {
      fontSize: this.panelW < 620 ? '15px' : '16px', fontFamily: 'Arial',
      color: '#aaccdd', stroke: '#000', strokeThickness: 1,
      wordWrap: { width: this.panelW - 100 }, align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5).setDepth(5);
  }

  _buildRewardBadge() {
    const cx = GAME_W / 2;
    const y  = this.panelY + 304;
    const breakdown = GameState.lastHomeRewardBreakdown || {};
    const reward = GameState.lastHomeReward || 0;
    const totalCurrency = Progression.getHomeCurrency(this.saveData);
    const startTotal = Math.max(0, totalCurrency - reward);
    const detailText = breakdown.rewardBonus > 0
      ? `Base ${breakdown.baseReward}  •  Full tummy bonus +${breakdown.rewardBonus}`
      : `Base reward ${breakdown.baseReward || reward}`;

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x1a2f20, 1);
    g.fillRoundedRect(cx - 194, y - 42, 388, 86, 12);
    g.lineStyle(2, 0x5edb8b, 1);
    g.strokeRoundedRect(cx - 194, y - 42, 388, 86, 12);

    this._rewardAmountText = this.add.text(cx, y - 18, `Oyong Home reward: +0 ${HOME_CURRENCY_NAME}`, {
      fontSize: this.panelW < 620 ? '15px' : '16px', fontFamily: 'Arial Black',
      color: '#e8ffd8', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    this.add.text(cx, y + 8, detailText, {
      fontSize: '11px', fontFamily: 'Arial',
      color: '#9de4b2',
      wordWrap: { width: 334 }, align: 'center',
      lineSpacing: 3,
    }).setOrigin(0.5).setDepth(6);

    this._rewardTotalText = this.add.text(cx, y + 30, `Total ${HOME_CURRENCY_NAME}: ${startTotal}`, {
      fontSize: '11px', fontFamily: 'Arial',
      color: '#9de4b2',
    }).setOrigin(0.5).setDepth(6);

    const counter = { reward: 0, total: startTotal };
    this.time.delayedCall(560, () => {
      this.tweens.add({
        targets: counter,
        reward,
        total: totalCurrency,
        duration: 640,
        ease: 'Cubic.Out',
        onStart: () => {
          this.tweens.add({
            targets: this._rewardAmountText,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 120,
            yoyo: true,
            repeat: 2,
          });
        },
        onUpdate: () => {
          this._rewardAmountText.setText(`Oyong Home reward: +${Math.round(counter.reward)} ${HOME_CURRENCY_NAME}`);
          this._rewardTotalText.setText(`Total ${HOME_CURRENCY_NAME}: ${Math.round(counter.total)}`);
        },
      });
    });
  }

  _buildUnlockBadge() {
    // Use GameState.newUnlocks set by Progression.completeLevel()
    const newlyUnlocked = GameState.newUnlocks || [];
    if (newlyUnlocked.length === 0) return;
    // Show the first newly unlocked dog
    const type = newlyUnlocked[0];
    const def  = DOG_DEFS[type];
    if (!def) return;
    this._showUnlock(type, `${def.name} Unlocked!`, def.desc);
  }

  _showUnlock(type, label, desc) {
    const cx = GAME_W / 2;
    const uy = this.panelY + 496;
    const panelW = Math.min(470, this.panelW - 90);
    const panelH = 88;
    const unlock = this.add.container(cx, uy).setDepth(7);

    const ug = this.add.graphics();
    ug.fillStyle(0x0e2a48, 1);
    ug.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
    ug.lineStyle(2, 0x44bbff, 1);
    ug.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
    ug.fillStyle(0x44bbff, 0.08);
    ug.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, 24, { tl: 12, tr: 12, bl: 0, br: 0 });
    unlock.add(ug);

    const dg = this.add.graphics();
    drawDogBustByType(dg, -panelW / 2 + 56, 10, type, false, 0);
    unlock.add(dg);

    const header = this.add.text(36, -23, '\u2605 NEW OYONG UNLOCKED \u2605', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#44bbff',
    }).setOrigin(0.5);
    unlock.add(header);

    const name = this.add.text(42, -2, label, {
      fontSize: '17px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
    unlock.add(name);

    if (desc) {
      const descText = this.add.text(42, 22, desc, {
        fontSize: '11px', fontFamily: 'Arial', color: '#88aacc',
        wordWrap: { width: panelW - 170 }, align: 'center',
      }).setOrigin(0.5);
      unlock.add(descText);
    }

    unlock.setScale(0.7);
    unlock.setAlpha(0);
    this.time.delayedCall(300, () => {
      this.tweens.add({
        targets: unlock,
        scaleX: 1, scaleY: 1, alpha: 1,
        duration: 350, ease: 'Back.Out',
        onComplete: () => {
          this._starBurst(cx - panelW / 2 + 34, uy);
          this._starBurst(cx + panelW / 2 - 34, uy);
          this.tweens.add({
            targets: unlock,
            scaleX: 1.03,
            scaleY: 1.03,
            duration: 420,
            yoyo: true,
            repeat: 1,
          });
        },
      });
    });
  }

  _buildDropReveal() {
    const cx = GAME_W / 2;
    const y = this.panelY + (this.hasUnlock ? 392 : 406);
    const reward = this.collectibleDrop;
    const style = getCollectibleRarityStyle(reward ? reward.rarity : 'common');
    const chancePct = Math.round((this.rewardDropInfo?.chance || 0) * 100);
    const rates = this.rewardDropInfo?.rarityRates || getCollectibleDropRates();
    const g = this.add.graphics().setDepth(7);
    const textLeft = cx - 118;
    const oddsText = `Drop chance ${chancePct}%\nCommon ${Math.round(rates.common * 100)}% • Rare ${Math.round(rates.rare * 100)}%\nEpic ${Math.round(rates.epic * 100)}% • Legendary ${Math.round(rates.legendary * 100)}%`;
    const duplicateText = this.rewardDropInfo?.collectionComplete
      ? 'Collection complete — no new cosmetics left in the pool.'
      : this.rewardDropInfo?.duplicateProtected
        ? 'Duplicate-safe drop pool active.'
        : 'Random reward pool active.';

    this._drawRewardBoxPanel(g, cx, y, false, reward ? style : null);

    const header = this.add.text(textLeft, y - 38, 'REWARD BOX READY', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#fff4cf', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(8);

    const nameText = this.add.text(textLeft, y - 12, 'Opening...', {
      fontSize: '18px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(8);

    const descText = this.add.text(textLeft, y + 14, 'A reward box rattles with a possible cosmetic drop.', {
      fontSize: '11px', fontFamily: 'Arial',
      color: '#eef7ff', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: 290 }, align: 'left',
      lineSpacing: 3,
    }).setOrigin(0, 0.5).setDepth(8);

    const odds = this.add.text(textLeft, y + 46, oddsText, {
      fontSize: '10px', fontFamily: 'Arial Black',
      color: '#b7d2ef', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: 290 }, align: 'left',
      lineSpacing: 4,
    }).setOrigin(0, 0.5).setDepth(8);

    const foot = this.add.text(textLeft, y + 76, duplicateText, {
      fontSize: '10px', fontFamily: 'Arial',
      color: '#9fc0db', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: 290 }, align: 'left',
      lineSpacing: 3,
    }).setOrigin(0, 0.5).setDepth(8);

    this.time.delayedCall(700, () => {
      const revealStyle = reward ? style : {
        label: 'No Drop',
        fill: 0x243448,
        border: 0x6d88a6,
        glow: 0xb7d2ef,
      };
      this._drawRewardBoxPanel(g, cx, y, true, revealStyle);

      if (reward) {
        header.setText(reward.isNew ? 'NEW ITEM!' : `${style.label.toUpperCase()} REWARD`);
        header.setColor('#fff4cf');
        nameText.setText(reward.name);
        nameText.setColor('#ffffff');
        descText.setText(`${reward.desc}\nAdded to your Collection.`);
        foot.setText(`${style.label} drop • Replay for more rare rewards.`);
        odds.setColor(`#${style.border.toString(16).padStart(6, '0')}`);

        [header, nameText, descText].forEach(target => {
          target.setScale(0.88);
          this.tweens.add({
            targets: target,
            scaleX: 1,
            scaleY: 1,
            duration: 220,
            ease: 'Back.Out',
          });
        });

        this.tweens.add({
          targets: g,
          alpha: reward.rarity === 'legendary' ? 0.68 : 0.82,
          duration: 240,
          yoyo: true,
          repeat: reward.rarity === 'legendary' ? 5 : reward.rarity === 'epic' ? 3 : 1,
        });

        const burstCount = reward.rarity === 'legendary' ? 3 : reward.rarity === 'epic' ? 2 : 1;
        for (let i = 0; i < burstCount; i++) {
          this._starBurst(cx - 130 + i * 130, y - 4 + (i % 2 === 0 ? 0 : 10));
        }
      } else {
        header.setText('NO ITEM THIS RUN');
        header.setColor('#d9e6f5');
        nameText.setText(this.rewardDropInfo?.collectionComplete ? 'Collection Complete' : 'Try Another Run');
        descText.setText(this.rewardDropInfo?.collectionComplete
          ? 'You already own every cosmetic in the current drop pool.'
          : 'Replay levels to roll the reward box again and chase rare drops.');
        foot.setText('Biscuits were still awarded normally.');
      }
    });
  }

  _drawRewardBoxPanel(g, cx, y, revealed, style) {
    const panelStyle = style || {
      fill: 0x243448,
      border: 0x6d88a6,
      glow: 0xb7d2ef,
    };
    g.clear();
    g.fillStyle(panelStyle.fill, 0.98);
    g.fillRoundedRect(cx - 210, y - 60, 420, 124, 14);
    g.lineStyle(2.5, panelStyle.border, 1);
    g.strokeRoundedRect(cx - 210, y - 60, 420, 124, 14);
    g.lineStyle(revealed ? 5 : 3, panelStyle.glow, revealed ? 0.18 : 0.1);
    g.strokeRoundedRect(cx - 206, y - 56, 412, 116, 12);

    const boxX = cx - 165;
    const boxY = y - 6;
    g.fillStyle(revealed ? panelStyle.border : 0x8f6733, 1);
    g.fillRoundedRect(boxX - 28, boxY - 20, 56, 40, 10);
    g.fillStyle(revealed ? panelStyle.glow : 0xc3914a, 0.9);
    g.fillRoundedRect(boxX - 28, boxY - 24, 56, 12, 8);
    g.lineStyle(3, revealed ? 0xffffff : 0xf6d49f, 0.75);
    g.lineBetween(boxX, boxY - 24, boxX, boxY + 20);
    g.lineBetween(boxX - 18, boxY, boxX + 18, boxY);
    if (revealed) {
      g.lineStyle(2.5, panelStyle.glow, 0.9);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.lineBetween(
          boxX + Math.cos(a) * 18,
          boxY - 26 + Math.sin(a) * 18,
          boxX + Math.cos(a) * 30,
          boxY - 26 + Math.sin(a) * 30
        );
      }
    }
  }

  _playEntryFade() {
    const overlay = this.add.graphics().setDepth(40);
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 360,
      onComplete: () => overlay.destroy(),
    });
  }

  _buildButtons() {
    const cx     = GAME_W / 2;
    const btnY   = this.buttonY;
    const save   = this.saveData;
    const nextId = this.levelId + 1;
    const hasNext      = nextId <= LEVEL_DATA.length;
    const nextUnlocked = hasNext && Progression.isUnlocked(nextId, save);

    // Button W=190 → each side extends 95px from center.
    // spread must exceed 95 to prevent background rects from overlapping.
    // 3-button: spread 205 gives 15px gap. 2-button: spread 110 gives 30px gap.
    const spread = nextUnlocked ? 205 : 110;

    // Retry (back to loadout for same level)
    this._makeBtn(cx - spread, btnY, 'Retry', 0x3a2a1a, 0x6a4a1a, () => {
      GameState.selectedDog = null;
      this.scene.start('LoadoutScene', { levelId: this.levelId });
    });

    // Oyong Home — centred when 3 buttons, offset when 2
    this._makeBtn(cx + (nextUnlocked ? 0 : spread), btnY, 'Oyong Home', 0x1a2a3a, 0x2a4a6a, () => {
      GameState.selectedDog = null;
      this.scene.start('OyongHomeScene');
    });

    // Next Level (only if unlocked)
    if (nextUnlocked) {
      this._makeBtn(cx + spread, btnY, 'Next Level \u2192', 0x1a4a1a, 0x2a7a2a, () => {
        GameState.selectedDog = null;
        this.scene.start('LoadoutScene', { levelId: nextId });
      });
    }
  }

  _makeBtn(x, y, label, colNorm, colHover, onClick) {
    const W = this.panelW < 620 ? 184 : 190;
    const H = this.panelW < 620 ? 48 : 50;
    const bg = this.add.graphics().setDepth(10);
    const draw = (col) => {
      bg.clear();
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(x - W / 2, y - H / 2, W, H, 8);
      bg.lineStyle(1.5, 0xffd700, 0.35);
      bg.strokeRoundedRect(x - W / 2, y - H / 2, W, H, 8);
    };
    draw(colNorm);
    const txt = this.add.text(x, y, label, {
      fontSize: this.panelW < 620 ? '18px' : '19px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });
    txt.on('pointerover',  () => { draw(colHover); txt.setScale(1.06); });
    txt.on('pointerout',   () => { draw(colNorm);  txt.setScale(1.0);  });
    txt.on('pointerdown',  () => { SFX.click(); onClick(); });
  }

  _showMissionPopups(notifications) {
    notifications.forEach((note, index) => {
      this.time.delayedCall(600 + index * 1450, () => {
        const cx = GAME_W / 2;
        const cy = this.panelY + 292;
        const popup = this.add.container(cx, cy).setDepth(18).setAlpha(0).setScale(0.86);
        const g = this.add.graphics();
        g.fillStyle(0x17314d, 0.98);
        g.fillRoundedRect(-180, -30, 360, 60, 14);
        g.lineStyle(2, 0xffd36c, 1);
        g.strokeRoundedRect(-180, -30, 360, 60, 14);
        popup.add(g);

        const header = this.add.text(0, -10, 'MISSION COMPLETE!', {
          fontSize: '15px', fontFamily: 'Arial Black',
          color: '#ffd36c', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);
        popup.add(header);

        const reward = this.add.text(0, 11, `${note.title}  •  ${note.rewardText}`, {
          fontSize: '11px', fontFamily: 'Arial',
          color: '#eef7ff', stroke: '#000', strokeThickness: 2,
          wordWrap: { width: 330 }, align: 'center',
        }).setOrigin(0.5);
        popup.add(reward);

        this._starBurst(cx - 120 + index * 16, cy + 4);
        this._starBurst(cx + 120 - index * 16, cy + 4);

        this.tweens.add({
          targets: popup,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 240,
          ease: 'Back.Out',
          onComplete: () => {
            this.time.delayedCall(950, () => {
              this.tweens.add({
                targets: popup,
                alpha: 0,
                y: cy - 16,
                duration: 260,
                onComplete: () => popup.destroy(),
              });
            });
          },
        });
      });
    });
  }

  update(time, delta) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= delta;
      if (p.life <= 0) { p.gfx.destroy(); this._particles.splice(i, 1); continue; }
      p.x  += p.vx * delta / 1000;
      p.y  += p.vy * delta / 1000;
      p.vy += 120 * delta / 1000;
      p.gfx.clear();
      const a = p.life / p.maxLife;
      p.gfx.fillStyle(p.color, a);
      p.gfx.fillCircle(p.x, p.y, p.r * a);
    }
  }
}
