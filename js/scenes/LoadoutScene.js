// ============================================================
// LoadoutScene.js — Pre-level dog selection
//
// Player picks up to levelData.loadoutSlots dog types from their
// unlocked roster. Selection is stored in GameState.loadoutDogs
// before transitioning to GameScene.
// ============================================================

class LoadoutScene extends Phaser.Scene {
  constructor() { super({ key: 'LoadoutScene' }); }

  init(data) {
    this.challengeMode = data.challengeMode || false;
    this.levelId = data.levelId || 1;
  }

  create() {
    AudioManager.playMusic('home');
    this.saveData = Progression.load();

    if (this.challengeMode) {
      this.levelDef = buildChallengeLevelData();
      this.maxSlots = 8;
    } else {
      this.levelDef = LEVEL_DATA.find(l => l.id === this.levelId);
      this.maxSlots = this.levelDef.loadoutSlots || 3;
    }
    this.chosen     = [];       // currently selected dog type keys
    this.cardMap    = {};       // type → card object
    this._animTime  = 0;
    this._newUnlocks = [...(GameState.newUnlocks || [])]; // snapshot before clearing
    GameState.newUnlocks = [];                            // clear so badge only shows once

    this._buildBackground();
    this._buildHeader();
    this._buildDogCards();
    this._buildSlotIndicator();
    this._buildFooterButtons();
  }

  _buildBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x0a1628, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Stars
    g.fillStyle(0xffffff, 0.5);
    [[80,35],[200,60],[320,20],[450,50],[580,30],[720,55],[850,25],
     [140,90],[380,80],[630,100],[780,70],[920,45]
    ].forEach(([sx,sy]) => g.fillCircle(sx, sy, 1.5));

    // Ground
    g.fillStyle(0x2a5a1a, 1);
    g.fillRect(0, GAME_H - 40, GAME_W, 40);

    // Level info panel
    g.fillStyle(0x0e1e30, 0.9);
    g.fillRoundedRect(20, 72, GAME_W - 40, 132, 10);
    g.lineStyle(1.5, 0x2a4a6a, 1);
    g.strokeRoundedRect(20, 72, GAME_W - 40, 132, 10);
  }

  _buildHeader() {
    this.add.text(GAME_W / 2, 30, 'CHOOSE YOUR OYONGS', {
      fontSize: '30px', fontFamily: 'Arial Black',
      color: '#ffd700', stroke: '#884400', strokeThickness: 4,
    }).setOrigin(0.5);

    // Level badge
    this.add.text(40, 90, this.challengeMode ? '⚡ WAVE CHALLENGE' : `LEVEL ${this.levelDef.id}`, {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: this.challengeMode ? '#bb88ff' : '#66a2cc',
    });
    this.add.text(GAME_W / 2, 96, this.levelDef.name, {
      fontSize: '24px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 127, this.levelDef.description, {
      fontSize: '15px', fontFamily: 'Arial',
      color: '#9bc0db', wordWrap: { width: GAME_W - 90 }, align: 'center',
    }).setOrigin(0.5);

    // Tip
    this.add.text(GAME_W / 2, 163, `Tip: ${this.levelDef.tip}`, {
      fontSize: '13px', fontFamily: 'Arial',
      color: '#63a680', stroke: '#000', strokeThickness: 1,
      wordWrap: { width: GAME_W - 70 }, align: 'center',
    }).setOrigin(0.5);

    const bonus = Progression.getBattleBonus(this.saveData);
    this.add.text(GAME_W / 2, 186, `Home care bonus: ${bonus.desc}`, {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: '#ffdca0', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: GAME_W - 70 }, align: 'center',
    }).setOrigin(0.5);

    const activeMission = Progression.getActiveMissions(this.saveData, 1)[0];
    const missionTreats = Progression.getMissionTreatReserve(this.saveData);
    const missionLabel = activeMission
      ? `Mission: ${activeMission.title} (${activeMission.progressText})`
      : 'All current missions completed';
    const reserveLabel = missionTreats > 0 ? `  •  Queued treats +${missionTreats}` : '';
    this.add.text(GAME_W / 2, 206, missionLabel + reserveLabel, {
      fontSize: '11px', fontFamily: 'Arial',
      color: '#bfe8ff', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: GAME_W - 70 }, align: 'center',
    }).setOrigin(0.5);

    // Slot instruction
    this.slotLabel = this.add.text(GAME_W / 2, 232, '', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#aaddff',
    }).setOrigin(0.5);
    this._refreshSlotLabel();
  }

  _buildDogCards() {
    const dogOrder  = (typeof DOG_ORDER !== 'undefined' && Array.isArray(DOG_ORDER) && DOG_ORDER.length)
      ? DOG_ORDER.filter(type => DOG_DEFS[type])
      : Object.keys(DOG_DEFS);
    const cardCount = dogOrder.length;
    const cols      = Math.min(4, cardCount);
    const rows      = Math.ceil(cardCount / cols);
    const sidePad   = 36;
    const gapX      = 12;
    const gapY      = 14;
    const topY      = 258;
    const bottomY   = GAME_H - 92;
    const cardW     = Math.floor((GAME_W - sidePad * 2 - gapX * (cols - 1)) / cols);
    const cardH     = Math.min(172, Math.floor((bottomY - topY - gapY * (rows - 1)) / rows));

    dogOrder.forEach((type, idx) => {
      const row     = Math.floor(idx / cols);
      const col     = idx % cols;
      const cx      = sidePad + cardW / 2 + col * (cardW + gapX);
      const cy      = topY + cardH / 2 + row * (cardH + gapY);
      const unlocked = this.saveData.unlockedDogs
        ? this.saveData.unlockedDogs.includes(type)
        : (type === 'bark_pup' || type === 'guard_dog');
      this._createCard(type, cx, cy, cardW, cardH, unlocked);
    });
  }

  _createCard(type, cx, cy, w, h, unlocked) {
    const def = DOG_DEFS[type];
    const bg  = this.add.graphics().setDepth(10);
    this._drawCardBg(bg, cx, cy, w, h, false, false, !unlocked);

    const dogGfx = this.add.graphics().setDepth(11);

    // Cost badge
    const costG = this.add.graphics().setDepth(11);
    costG.fillStyle(0x1e3a18, 1);
    costG.fillRoundedRect(cx - w / 2 + 8, cy - h / 2 + 8, 62, 22, 6);
    this.add.text(cx - w / 2 + 39, cy - h / 2 + 19, `\u{1F9B4} ${def.cost}`, {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5).setDepth(12);

    // Name
    this.add.text(cx, cy + 2, def.name, {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: w - 18 }, align: 'center',
    }).setOrigin(0.5).setDepth(12);

    this.add.text(cx, cy + 20, def.role || def.desc, {
      fontSize: '10px', fontFamily: 'Arial Black', color: '#ffdca0',
      wordWrap: { width: w - 24 }, align: 'center',
    }).setOrigin(0.5).setDepth(12);

    this.add.text(cx, cy + 38, def.desc, {
      fontSize: '9px', fontFamily: 'Arial', color: '#90b4ca',
      wordWrap: { width: w - 22 }, align: 'center',
    }).setOrigin(0.5).setDepth(12);

    this.add.text(cx, cy + h / 2 - 14, this._getCardStatLine(def), {
      fontSize: '9px', fontFamily: 'Arial', color: '#bde2f6',
      wordWrap: { width: w - 18 }, align: 'center',
    }).setOrigin(0.5).setDepth(12);

    // Lock overlay
    let lockG = null;
    if (!unlocked) {
      lockG = this.add.graphics().setDepth(13);
      lockG.fillStyle(0x000000, 0.55);
      lockG.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
      this._drawPadlock(lockG, cx, cy);
      this.add.text(cx, cy + 28, 'Locked', {
        fontSize: '15px', fontFamily: 'Arial Black', color: '#445566',
      }).setOrigin(0.5).setDepth(14);
    }

    // Checkmark graphics (drawn when selected)
    const checkG = this.add.graphics().setDepth(13);

    // "NEW" badge for freshly unlocked dogs
    if (unlocked && this._newUnlocks.includes(type)) {
      const badgeG = this.add.graphics().setDepth(14);
      badgeG.fillStyle(0xdd2244, 1);
      badgeG.fillRoundedRect(cx + w / 2 - 48, cy - h / 2 + 7, 42, 19, 6);
      badgeG.lineStyle(1.5, 0xff88aa, 1);
      badgeG.strokeRoundedRect(cx + w / 2 - 48, cy - h / 2 + 7, 42, 19, 6);
      this.add.text(cx + w / 2 - 27, cy - h / 2 + 16, 'NEW!', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setOrigin(0.5).setDepth(15);
    }

    const card = { type, cx, cy, w, h, bg, dogGfx, checkG, unlocked };
    this.cardMap[type] = card;

    if (!unlocked) return;

    const zone = this.add.zone(cx, cy, w, h)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    zone.on('pointerdown', () => this._toggleCard(type));
    zone.on('pointerover', () => {
      if (!this.chosen.includes(type)) {
        this._drawCardBg(bg, cx, cy, w, h, true, false, false);
      }
    });
    zone.on('pointerout', () => {
      this._drawCardBg(bg, cx, cy, w, h, false, this.chosen.includes(type), false);
    });
  }

  _drawCardBg(bg, cx, cy, w, h, hovered, selected, locked) {
    bg.clear();
    let fill, border;
    if (locked)    { fill = 0x111822; border = 0x1e2a38; }
    else if (selected) { fill = 0x1a3a22; border = 0x44dd88; }
    else if (hovered)  { fill = 0x203048; border = 0x5a8aaa; }
    else               { fill = 0x162232; border = 0x2a4a6a; }
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
    bg.lineStyle(2, border, 1);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
  }

  _drawPadlock(g, cx, cy) {
    g.lineStyle(5, 0x445566, 1);
    g.beginPath();
    g.arc(cx, cy - 14, 14, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    g.fillStyle(0x445566, 1);
    g.fillRoundedRect(cx - 16, cy - 2, 32, 26, 6);
    g.fillStyle(0x1a2230, 1);
    g.fillCircle(cx, cy + 8, 6);
    g.fillRect(cx - 3, cy + 8, 6, 9);
  }

  _toggleCard(type) {
    const idx = this.chosen.indexOf(type);
    if (idx !== -1) {
      this.chosen.splice(idx, 1);
      SFX.click();
    } else {
      if (this.chosen.length >= this.maxSlots) {
        SFX.error();
        return;
      }
      this.chosen.push(type);
      SFX.click();
    }
    this._refreshCardVisuals();
    this._refreshSlotLabel();
    this._refreshStartButton();
  }

  _refreshCardVisuals() {
    Object.values(this.cardMap).forEach(card => {
      if (!card.unlocked) return;
      const selected = this.chosen.includes(card.type);
      this._drawCardBg(card.bg, card.cx, card.cy, card.w, card.h, false, selected, false);

      // Checkmark
      card.checkG.clear();
      if (selected) {
        const x = card.cx + card.w / 2 - 18;
        const y = card.cy - card.h / 2 + 18;
        card.checkG.fillStyle(0x44dd88, 1);
        card.checkG.fillCircle(x, y, 12);
        card.checkG.lineStyle(2.5, 0xffffff, 1);
        card.checkG.beginPath();
        card.checkG.moveTo(x - 6, y);
        card.checkG.lineTo(x - 1, y + 5);
        card.checkG.lineTo(x + 7, y - 6);
        card.checkG.strokePath();
      }
    });
  }

  _buildSlotIndicator() {
    // Drawn dynamically in _refreshSlotLabel
  }

  _getCardStatLine(def) {
    if (def.attackMode === 'chain') {
      return `${def.chainTargets} targets  •  ${def.attack} dmg  •  Rng ${def.range}`;
    }
    if (def.burnDamage) {
      return `Burn ${def.burnDamage} / ${(def.burnTick / 1000).toFixed(1)}s  •  Rng ${def.range}`;
    }
    if (def.treatAmount) {
      return `+${def.treatAmount} treats / ${(def.treatRate / 1000).toFixed(1)}s  •  ATK ${def.attack}`;
    }
    if (def.targeting === 'farthest') {
      return `ATK ${def.attack}  •  Longest lane shot`;
    }
    return `ATK ${def.attack}  •  HP ${def.hp}  •  Rng ${def.range}`;
  }

  _refreshSlotLabel() {
    const remaining = this.maxSlots - this.chosen.length;
    if (remaining === 0) {
      this.slotLabel.setText('Squad full — press START!');
      this.slotLabel.setColor('#44dd88');
    } else {
      this.slotLabel.setText(
        `Select ${remaining} more dog type${remaining !== 1 ? 's' : ''} (max ${this.maxSlots})`
      );
      this.slotLabel.setColor('#aaddff');
    }
  }

  _buildFooterButtons() {
    // Back button
    const backG = this.add.graphics().setDepth(10);
    backG.fillStyle(0x2a2a3a, 1);
    backG.fillRoundedRect(28, GAME_H - 72, 134, 46, 9);
    backG.lineStyle(1.5, 0x5a6a7a, 1);
    backG.strokeRoundedRect(28, GAME_H - 72, 134, 46, 9);
    const backBtn = this.add.text(95, GAME_H - 49, '\u2190 Back', {
      fontSize: '17px', fontFamily: 'Arial Black',
      color: '#aaccdd', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(11);
    backBtn.on('pointerover',  () => backBtn.setColor('#ffd700'));
    backBtn.on('pointerout',   () => backBtn.setColor('#aaccdd'));
    backBtn.on('pointerdown',  () => {
      SFX.click();
      this.scene.start(this.challengeMode ? 'OyongHomeScene' : 'LevelSelectScene');
    });

    // Start button — always interactive; _startLevel() guards the empty-loadout case
    const W = 216, H = 46;
    const bx = GAME_W - 30 - W;
    const by = GAME_H - 72;
    this.startBtnG   = this.add.graphics().setDepth(10);
    this.startBtnTxt = this.add.text(GAME_W - 138, GAME_H - 49, 'START LEVEL \u2192', {
      fontSize: '19px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

    this.startBtnTxt.on('pointerover', () => {
      if (this.chosen.length < 1) return;
      this.startBtnG.clear();
      this.startBtnG.fillStyle(0x2a8a2a, 1);
      this.startBtnG.fillRoundedRect(bx, by, W, H, 8);
      this.startBtnG.lineStyle(1.5, 0x88dd88, 1);
      this.startBtnG.strokeRoundedRect(bx, by, W, H, 8);
      this.startBtnTxt.setScale(1.04);
    });
    this.startBtnTxt.on('pointerout', () => {
      this.startBtnTxt.setScale(1);
      this._refreshStartButton();
    });
    this.startBtnTxt.on('pointerdown', () => {
      if (this.chosen.length >= 1) {
        SFX.click();
        this._startLevel();
      } else {
        SFX.error();
      }
    });

    this._refreshStartButton();
  }

  _refreshStartButton() {
    const W = 216, H = 46;
    const bx = GAME_W - 30 - W;
    const by = GAME_H - 72;
    const canStart = this.chosen.length >= 1;
    this.startBtnG.clear();
    this.startBtnG.fillStyle(canStart ? 0x1a5a1a : 0x2a2a2a, 1);
    this.startBtnG.fillRoundedRect(bx, by, W, H, 8);
    this.startBtnG.lineStyle(1.5, canStart ? 0x5aaa5a : 0x3a3a3a, 1);
    this.startBtnG.strokeRoundedRect(bx, by, W, H, 8);
    this.startBtnTxt.setColor(canStart ? '#ffffff' : '#556655');
    this.startBtnTxt.setAlpha(canStart ? 1 : 0.5);
  }

  _startLevel() {
    GameState.loadoutDogs  = [...this.chosen];
    GameState.selectedDog  = null;
    GameState.challengeMode = this.challengeMode;
    if (this.challengeMode) {
      this.scene.start('GameScene', { challengeMode: true });
    } else {
      this.scene.start('GameScene', { levelId: this.levelId });
    }
  }

  update(time, delta) {
    this._animTime += delta;
    Object.values(this.cardMap).forEach(card => {
      if (!card.unlocked) return;
      card.dogGfx.clear();
      // Bust portrait centered in upper half of card
      drawDogBustByType(card.dogGfx, card.cx, card.cy - 34, card.type, false, this._animTime);
    });
  }
}
