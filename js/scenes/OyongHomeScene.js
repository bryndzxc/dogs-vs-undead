// ============================================================
// OyongHomeScene.js — Cozy home/base layer outside battles
// ============================================================

class OyongHomeScene extends Phaser.Scene {
  constructor() { super({ key: 'OyongHomeScene' }); }

  create() {
    AudioManager.playMusic('home');
    this.saveData = Progression.load();
    this.panelMode = 'home';
    this.selectedDecorSlot = this.selectedDecorSlot || HOME_DECOR_SLOTS[0].key;
    this._animTime = 0;
    this.panelObjects = [];
    this.panelContentObjects = [];
    this.fxParticles = [];
    this.actionButtons = {};
    this.statRowTexts = [];
    this.bonusLineTexts = [];
    this.panelScrollY = 0;
    this.panelScrollMax = 0;

    const rewardInfo = GameState.lastHomeRewardBreakdown;
    this.statusMessage = rewardInfo
      ? `Battle reward banked: +${rewardInfo.totalReward} ${HOME_CURRENCY_NAME}.`
      : 'Care for Oyong, decorate the room, then head back into battle.';
    GameState.lastHomeReward = 0;
    GameState.lastHomeRewardBreakdown = null;
    GameState.lastCollectibleDrop = null;
    GameState.lastRewardDropInfo = null;

    this.layout = this._computeLayout();

    this._buildBackground();
    this._buildHud();
    this._buildAudioControls();
    this._buildHomeButtons();
    this._buildInfoPanel();
    this.input.on('wheel', this._onWheel, this);

    // ── Touch / pointer drag-scroll for mobile ─────────────────
    this._dragStartY   = null;  // Y position where drag began
    this._dragScrollY  = 0;     // panelScrollY snapshot at drag start
    this._isDragging   = false; // true once drag threshold exceeded
    this.input.on('pointerdown', this._onDragStart, this);
    this.input.on('pointermove', this._onDragMove,  this);
    this.input.on('pointerup',   this._onDragEnd,   this);

    this.events.once('shutdown', () => {
      this.input.off('wheel',       this._onWheel,   this);
      this.input.off('pointerdown', this._onDragStart, this);
      this.input.off('pointermove', this._onDragMove,  this);
      this.input.off('pointerup',   this._onDragEnd,   this);
    });
    this._refreshHud();
    this._setPanel('home');

    const missionNotes = Progression.drainMissionNotifications();
    if (missionNotes.length > 0) this._showMissionPopups(missionNotes);
  }

  update(time, delta) {
    this._animTime += delta;
    this._drawRoomDynamic();
    this._updateFx(delta);
  }

  _computeLayout() {
    const margin = 20;
    const gap = 18;
    const topY = 18;
    const topH = 390;
    const roomW = Math.floor((GAME_W - margin * 2 - gap) * 0.58);
    const sideW = GAME_W - margin * 2 - gap - roomW;
    const bottomY = topY + topH + gap;
    const bottomH = GAME_H - bottomY - margin;

    return {
      margin,
      gap,
      room: { x: margin, y: topY, w: roomW, h: topH },
      side: { x: margin + roomW + gap, y: topY, w: sideW, h: topH },
      shop: { x: margin, y: bottomY, w: GAME_W - margin * 2, h: bottomH },
    };
  }

  _buildBackground() {
    const g = this.add.graphics();
    const { room, side, shop } = this.layout;

    g.fillStyle(0x12182a, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0x1c2742, 1);
    g.fillRect(0, 0, GAME_W, GAME_H * 0.62);
    g.fillStyle(0xffffff, 0.55);
    [[68, 36], [152, 54], [288, 28], [426, 52], [588, 32], [734, 58], [874, 34], [910, 78], [228, 88]]
      .forEach(([sx, sy]) => g.fillCircle(sx, sy, 1.5));

    g.fillStyle(0x29391d, 1);
    g.fillRect(0, GAME_H - 58, GAME_W, 58);
    g.fillStyle(0x3a5c22, 1);
    g.fillRect(0, GAME_H - 58, GAME_W, 6);

    this._drawPanelShell(g, room, 0x121b2c, 0x35506d, 0x1c2a44);
    this._drawPanelShell(g, side, 0x10192a, 0x334b67, 0x1a273f);
    this._drawPanelShell(g, shop, 0x0f1727, 0x334b67, 0x1b2a42);
    this._drawRoomBackdrop(g, room);

    this.roomG = this.add.graphics().setDepth(10);
    this.fxG = this.add.graphics().setDepth(20);
  }

  _drawPanelShell(g, rect, fill, stroke, topStrip) {
    g.fillStyle(fill, 0.98);
    g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 20);
    g.lineStyle(2, stroke, 1);
    g.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 20);
    g.fillStyle(topStrip, 1);
    g.fillRoundedRect(rect.x, rect.y, rect.w, 44, { tl: 20, tr: 20, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.03);
    g.fillRoundedRect(rect.x + 16, rect.y + 56, rect.w - 32, rect.h - 72, 18);
  }

  _drawRoomBackdrop(g, room) {
    const inner = { x: room.x + 20, y: room.y + 54, w: room.w - 40, h: room.h - 74 };
    const floorY = inner.y + inner.h * 0.72;

    g.fillStyle(0x624b39, 1);
    g.fillRoundedRect(inner.x, inner.y, inner.w, inner.h, 18);
    g.fillStyle(0x745945, 1);
    for (let x = inner.x; x < inner.x + inner.w; x += 34) g.fillRect(x, inner.y, 18, floorY - inner.y);

    g.fillStyle(0x433224, 1);
    g.fillRoundedRect(inner.x, floorY, inner.w, inner.h - (floorY - inner.y), { tl: 0, tr: 0, bl: 18, br: 18 });
    g.fillStyle(0x5b4432, 1);
    for (let x = inner.x + 8; x < inner.x + inner.w; x += 44) g.fillRect(x, floorY + 6, 26, inner.h - (floorY - inner.y) - 10);

    const windowX = inner.x + 26;
    const windowY = inner.y + 24;
    g.fillStyle(0x24476a, 1);
    g.fillRoundedRect(windowX, windowY, 148, 104, 16);
    g.lineStyle(4, 0xd2b077, 1);
    g.strokeRoundedRect(windowX, windowY, 148, 104, 16);
    g.lineStyle(3, 0xd2b077, 0.85);
    g.lineBetween(windowX + 74, windowY, windowX + 74, windowY + 104);
    g.lineBetween(windowX, windowY + 52, windowX + 148, windowY + 52);
    g.fillStyle(0xf9f3c7, 1);
    g.fillCircle(windowX + 112, windowY + 28, 16);
    g.fillStyle(0x24476a, 1);
    g.fillCircle(windowX + 118, windowY + 24, 13);
    g.fillStyle(0xffffff, 0.75);
    [[windowX + 28, windowY + 18], [windowX + 54, windowY + 40], [windowX + 128, windowY + 56]]
      .forEach(([sx, sy]) => g.fillCircle(sx, sy, 1.8));

    const shelfX = inner.x + inner.w - 174;
    const shelfY = inner.y + 56;
    g.fillStyle(0x7b5c42, 1);
    g.fillRoundedRect(shelfX, shelfY, 126, 10, 5);
    g.fillRoundedRect(shelfX, shelfY + 86, 126, 10, 5);
    g.fillStyle(0xa6815c, 1);
    g.fillCircle(shelfX + 28, shelfY - 8, 12);
    g.fillRect(shelfX + 18, shelfY - 8, 20, 30);
    g.fillStyle(0xdfc37c, 1);
    g.fillCircle(shelfX + 92, shelfY - 10, 10);
    g.fillStyle(0x89a8d8, 1);
    g.fillRoundedRect(shelfX + 82, shelfY - 4, 18, 26, 4);

    const closetX = inner.x + inner.w - 154;
    const closetY = inner.y + 116;
    g.fillStyle(0x8e6b4c, 1);
    g.fillRoundedRect(closetX, closetY, 118, 120, 18);
    g.lineStyle(2, 0x654830, 1);
    g.strokeRoundedRect(closetX, closetY, 118, 120, 18);
    g.fillStyle(0x795a40, 1);
    g.fillRoundedRect(closetX + 14, closetY + 14, 42, 92, 12);
    g.fillRoundedRect(closetX + 62, closetY + 14, 42, 92, 12);
    g.fillStyle(0xf1d7a8, 1);
    g.fillCircle(closetX + 52, closetY + 60, 4);
    g.fillCircle(closetX + 66, closetY + 60, 4);
  }

  _buildHud() {
    const { room, side } = this.layout;

    this.add.text(room.x + 24, room.y + 18, 'OYONG ROOM', {
      fontSize: '17px', fontFamily: 'Arial Black',
      color: '#ffe3ae', stroke: '#000', strokeThickness: 3,
    }).setDepth(15);

    this.eventBubbleG = this.add.graphics().setDepth(14);
    this.eventText = this.add.text(room.x + room.w - 124, room.y + 72, '', {
      fontSize: '10px', fontFamily: 'Arial',
      color: '#2b2130', wordWrap: { width: 118 }, align: 'center',
    }).setOrigin(0.5).setDepth(15);

    this.add.text(side.x + 24, side.y + 18, 'OYONG HOME', {
      fontSize: '24px', fontFamily: 'Arial Black',
      color: '#ffdca0', stroke: '#4a2a12', strokeThickness: 5,
    }).setDepth(15);

    this.add.text(side.x + 24, side.y + 46, 'Keep Oyong cozy, cared for, and ready for the next battle.', {
      fontSize: '11px', fontFamily: 'Arial',
      color: '#b8cfe0', stroke: '#000', strokeThickness: 2,
      wordWrap: { width: side.w - 50 },
    }).setDepth(15);

    this.statsCardG = this.add.graphics().setDepth(13);
    this.currencyLabel = this.add.text(side.x + 34, side.y + 80, 'BISCUITS BANK', {
      fontSize: '10px', fontFamily: 'Arial Black', color: '#9fc0db',
    }).setDepth(15);
    this.currencyText = this.add.text(side.x + 34, side.y + 96, '', {
      fontSize: '24px', fontFamily: 'Arial Black',
      color: '#ffe28a', stroke: '#000', strokeThickness: 3,
    }).setDepth(15);

    this.bondText = this.add.text(side.x + side.w - 34, side.y + 82, '', {
      fontSize: '11px', fontFamily: 'Arial Black',
      color: '#ffd0ea', stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(15);

    this.statGraphics = this.add.graphics().setDepth(14);
    this.bonusChipG = this.add.graphics().setDepth(14);
    this.bondXpText = this.add.text(side.x + 34, side.y + 216, '', {
      fontSize: '10px', fontFamily: 'Arial',
      color: '#d7e6f3',
      wordWrap: { width: side.w - 68 },
    }).setDepth(15);
    this.bonusHeaderText = this.add.text(side.x + 34, side.y + 248, 'BATTLE BONUSES', {
      fontSize: '10px', fontFamily: 'Arial Black', color: '#9fc0db',
    }).setDepth(15);
    this.bonusLineTexts = [
      this.add.text(side.x + 34, side.y + 262, '', {
        fontSize: '10px', fontFamily: 'Arial', color: '#d8eeff',
        wordWrap: { width: side.w - 68 },
      }).setDepth(15),
      this.add.text(side.x + 34, side.y + 274, '', {
        fontSize: '10px', fontFamily: 'Arial', color: '#d8eeff',
        wordWrap: { width: side.w - 68 },
      }).setDepth(15),
      this.add.text(side.x + 34, side.y + 286, '', {
        fontSize: '10px', fontFamily: 'Arial', color: '#d8eeff',
        wordWrap: { width: side.w - 68 },
      }).setDepth(15),
    ];
  }

  _buildAudioControls() {
    const { side } = this.layout;
    const baseX = side.x + side.w - 162;
    const y = side.y + 20;
    this._audioControlG = this.add.graphics().setDepth(15);
    this._audioMuteTxt = this.add.text(baseX + 18, y + 10, '', {
      fontSize: '16px', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });
    this._audioMusicDownTxt = this.add.text(baseX + 58, y + 10, 'M-', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#c0d6ea',
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });
    this._audioMusicUpTxt = this.add.text(baseX + 86, y + 10, 'M+', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#c0d6ea',
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });
    this._audioSfxDownTxt = this.add.text(baseX + 116, y + 10, 'S-', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#c0d6ea',
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });
    this._audioSfxUpTxt = this.add.text(baseX + 144, y + 10, 'S+', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#c0d6ea',
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });
    this._audioVolTxt = this.add.text(baseX + 92, y + 28, '', {
      fontSize: '9px', fontFamily: 'Arial Black', color: '#9fc0db',
    }).setOrigin(0.5).setDepth(16);

    this._audioMuteTxt.on('pointerdown', () => {
      AudioManager.toggleMute();
      this._drawAudioControls();
    });
    this._audioMusicDownTxt.on('pointerdown', () => {
      SFX.click();
      AudioManager.setMusicVolume(AudioManager.getMusicVolume() - 0.1);
      this._drawAudioControls();
    });
    this._audioMusicUpTxt.on('pointerdown', () => {
      SFX.click();
      AudioManager.setMusicVolume(AudioManager.getMusicVolume() + 0.1);
      this._drawAudioControls();
    });
    this._audioSfxDownTxt.on('pointerdown', () => {
      SFX.click();
      AudioManager.setSFXVolume(AudioManager.getSFXVolume() - 0.1);
      this._drawAudioControls();
    });
    this._audioSfxUpTxt.on('pointerdown', () => {
      SFX.click();
      AudioManager.setSFXVolume(AudioManager.getSFXVolume() + 0.1);
      this._drawAudioControls();
    });
    this._drawAudioControls();
  }

  _drawAudioControls() {
    if (!this._audioControlG) return;
    const { side } = this.layout;
    const x = side.x + side.w - 162;
    const y = side.y + 20;
    this._audioControlG.clear();
    this._audioControlG.fillStyle(0x122033, 0.95);
    this._audioControlG.fillRoundedRect(x, y, 154, 36, 10);
    this._audioControlG.lineStyle(1.2, 0x3a5a7a, 1);
    this._audioControlG.strokeRoundedRect(x, y, 154, 36, 10);
    this._audioMuteTxt.setText(AudioManager.muted ? '🔇' : '🔊');
    this._audioMuteTxt.setAlpha(AudioManager.muted ? 0.45 : 1);
    this._audioVolTxt.setText(`M ${Math.round(AudioManager.getMusicVolume() * 100)}%  S ${Math.round(AudioManager.getSFXVolume() * 100)}%`);
  }

  _buildHomeButtons() {
    const { side } = this.layout;
    const railX = side.x + 18;
    const railY = side.y + 302;
    const railW = side.w - 36;
    const railH = 102;

    this.actionRailG = this.add.graphics().setDepth(12);
    this.actionRailG.fillStyle(0x0f1c2e, 0.96);
    this.actionRailG.fillRoundedRect(railX, railY, railW, railH, 14);
    this.actionRailG.lineStyle(1.5, 0x3a5a78, 1);
    this.actionRailG.strokeRoundedRect(railX, railY, railW, railH, 14);

    const addSectionLabel = (x, y, text, align = 'left') => this.add.text(x, y, text, {
      fontSize: '9px',
      fontFamily: 'Arial Black',
      color: '#8ebbd8',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(align === 'center' ? 0.5 : 0, 0.5).setDepth(14).setAlpha(0.85);

    // Subtle separators between button groups
    this.actionRailG.lineStyle(0.5, 0xffffff, 0.10);
    this.actionRailG.lineBetween(railX + 12, railY + 42, railX + railW - 12, railY + 42);
    this.actionRailG.lineBetween(railX + 12, railY + 74, railX + railW - 12, railY + 74);

    const careGap = 8;
    const careW = Math.floor((railW - careGap * 2) / 3);
    const careH = 16;
    const primaryW = railW - 12;
    const primaryH = 24;
    const primaryY = railY + 24;
    const secondaryY = railY + 58;
    const careY = railY + 94;

    const halfW  = Math.floor((railW - careGap - 8) / 2);
    const leftX  = railX + 4 + halfW / 2;
    const rightX = railX + 4 + halfW + careGap + halfW / 2;

    addSectionLabel(railX + 12, railY + 10, 'Battle');
    this._makeActionButton('challenge', railX + railW / 2, primaryY, primaryW, primaryH, '⚡ Start Wave', 0x3a1a5a, 0x6a3aaa, () => {
      this.scene.start('LoadoutScene', { challengeMode: true });
    });
    this.actionButtons.challenge.txt.setFontSize('15px');

    addSectionLabel(leftX - halfW / 2, railY + 48, 'Stage');
    this._makeActionButton('play', leftX, secondaryY, halfW, 18, 'Levels', 0x2d6b3e, 0x43a860, () => {
      this.scene.start('LevelSelectScene');
    });
    this.actionButtons.play.txt.setFontSize('11px');

    addSectionLabel(rightX - halfW / 2, railY + 48, 'Collection');
    this._makeActionButton('dogs', rightX, secondaryY, halfW, 18, 'Dogs / Collection', 0x16283a, 0x243d56, () => {
      this._setPanel('collection');
    });
    this.actionButtons.dogs.txt.setFontSize('9px');
    this.actionButtons.dogs.txt.setColor('#8ebbd8');

    addSectionLabel(railX + 12, railY + 84, 'Care');
    this._makeActionButton('feed', railX + careW / 2, careY, careW, careH, 'Feed', 0x7a4e28, 0xa06030, () => {
      this._performCareAction('feed');
    });
    this._makeActionButton('pet', railX + careW + careGap + careW / 2, careY, careW, careH, 'Pet', 0x7a3d67, 0xa05480, () => {
      this._performCareAction('pet');
    });
    this._makeActionButton('rest', railX + (careW + careGap) * 2 + careW / 2, careY, careW, careH, 'Rest', 0x3d5178, 0x5878a8, () => {
      this._performCareAction('rest');
    });
    this.actionButtons.feed.txt.setFontSize('10px');
    this.actionButtons.pet.txt.setFontSize('10px');
    this.actionButtons.rest.txt.setFontSize('10px');
  }

  _buildInfoPanel() {
    // panelTitle/panelHint kept as hidden refs — panel render methods still call .setText()
    this.panelTitle = this.add.text(-9999, -9999, '').setVisible(false).setDepth(0);
    this.panelHint = this.add.text(-9999, -9999, '').setVisible(false).setDepth(0);

    this.panelContent = this.add.container(0, 0).setDepth(15);
    this.panelMaskG = this.add.graphics().setDepth(14);
    const viewport = this._getPanelViewport();
    this.panelMaskG.fillStyle(0xffffff, 1);
    this.panelMaskG.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);
    this.panelContent.setMask(this.panelMaskG.createGeometryMask());
  }

  _getPanelViewport() {
    const { shop } = this.layout;
    return {
      x: shop.x + 14,
      y: shop.y + 46,
      w: shop.w - 28,
      h: shop.h - 58,
    };
  }

  _makeActionButton(key, x, y, w, h, label, colorNormal, colorHover, onClick) {
    const bg = this.add.graphics().setDepth(13);
    const txt = this.add.text(x, y, label, {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(14);

    const button = { key, bg, txt, x, y, w, h, colorNormal, colorHover };
    this.actionButtons[key] = button;

    // Full-area hit zone so the entire button background is clickable, not just the label text.
    const zone = this.add.zone(x - w / 2, y - h / 2, w, h).setOrigin(0, 0).setDepth(15)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      if (!this._isActionActive(key)) {
        this._drawActionButton(button, colorHover, true);
      }
      txt.setScale(1.03);
    });
    zone.on('pointerout', () => {
      txt.setScale(1);
      this._refreshActionButtons();
    });
    zone.on('pointerdown', onClick);
  }

  _drawActionButton(button, color, active) {
    button.bg.clear();
    button.bg.fillStyle(color, 1);
    button.bg.fillRoundedRect(button.x - button.w / 2, button.y - button.h / 2, button.w, button.h, 10);
    button.bg.lineStyle(active ? 2 : 1.2, active ? 0xffe3ae : 0xffe2a8, active ? 1 : 0.45);
    button.bg.strokeRoundedRect(button.x - button.w / 2, button.y - button.h / 2, button.w, button.h, 10);
  }

  _isActionActive(key) {
    return (key === 'dogs' && this.panelMode === 'collection')
      || (key === 'decor' && this.panelMode === 'decor');
  }

  _refreshActionButtons() {
    Object.values(this.actionButtons).forEach(button => {
      const active = this._isActionActive(button.key);
      this._drawActionButton(button, active ? button.colorHover : button.colorNormal, active);
    });
  }

  _refreshHud() {
    const { room, side } = this.layout;
    const home = Progression.getHomeState(this.saveData);
    const bond = Progression.getBondState(this.saveData);
    const bonus = Progression.getBattleBonus(this.saveData);
    const currentEvent = Progression.getCurrentHomeEvent(this.saveData);
    this.currencyText.setText(String(Progression.getHomeCurrency(this.saveData)));
    this.bondText.setText(`Bond Lv ${bond.level}`);
    this.bondXpText.setText(
      bond.nextLevelXp > bond.currentLevelXp
        ? `Bond XP: ${bond.xp} / ${bond.nextLevelXp}`
        : 'Bond XP: Max level reached'
    );
    this.eventText.setText(currentEvent.text);
    this.bonusLineTexts[0].setText(`Fullness: ${bonus.rewardDesc}`);
    this.bonusLineTexts[1].setText(`Mood: ${bonus.treatDesc}`);
    this.bonusLineTexts[2].setText(`Energy: ${bonus.energyDesc}`);

    this.eventBubbleG.clear();
    this.eventBubbleG.fillStyle(0xffefdc, 0.96);
    this.eventBubbleG.fillRoundedRect(room.x + room.w - 184, room.y + 42, 152, 44, 16);
    this.eventBubbleG.lineStyle(2, 0xc89c6e, 1);
    this.eventBubbleG.strokeRoundedRect(room.x + room.w - 184, room.y + 42, 152, 44, 16);
    this.eventBubbleG.fillTriangle(room.x + room.w - 96, room.y + 86, room.x + room.w - 82, room.y + 86, room.x + room.w - 90, room.y + 96);

    this.statsCardG.clear();
    this.statsCardG.fillStyle(0x101d2d, 0.97);
    this.statsCardG.fillRoundedRect(side.x + 18, side.y + 68, side.w - 36, 170, 12);
    this.statsCardG.lineStyle(1.2, 0x3a5672, 1);
    this.statsCardG.strokeRoundedRect(side.x + 18, side.y + 68, side.w - 36, 170, 12);

    this.statGraphics.clear();
    this.statRowTexts.forEach(obj => obj.destroy && obj.destroy());
    this.statRowTexts = [];
    this._drawStatRow(side.x + 34, side.y + 122, side.w - 68, 'Hunger', home.hunger, 0xf2b45f, getHomeStatLabel('hunger', home.hunger));
    this._drawStatRow(side.x + 34, side.y + 146, side.w - 68, 'Mood', home.mood, 0xff88c2, getHomeStatLabel('mood', home.mood));
    this._drawStatRow(side.x + 34, side.y + 170, side.w - 68, 'Energy', home.energy, 0x88d2ff, getHomeStatLabel('energy', home.energy));
    this._drawStatRow(side.x + 34, side.y + 194, side.w - 68, 'Bond', Math.round(bond.progress * 100), 0xb899ff, `${Math.round(bond.progress * 100)}%`);

    this.bonusChipG.clear();
    this.bonusChipG.fillStyle(0x101d2d, 1);
    this.bonusChipG.fillRoundedRect(side.x + 18, side.y + 244, side.w - 36, 56, 10);
    this.bonusChipG.lineStyle(1, 0x304e68, 1);
    this.bonusChipG.strokeRoundedRect(side.x + 18, side.y + 244, side.w - 36, 56, 10);

    this._refreshActionButtons();
  }

  _drawStatRow(x, y, width, label, value, fill, suffix) {
    const barX = x + 54;
    const barW = width - 116;
    const pct = Math.max(0, Math.min(1, value / 100));

    this.statGraphics.fillStyle(0x2a3040, 1);
    this.statGraphics.fillRoundedRect(barX, y, barW, 10, 5);
    this.statGraphics.fillStyle(fill, 1);
    this.statGraphics.fillRoundedRect(barX + 2, y + 2, Math.max(0, Math.floor((barW - 4) * pct)), 6, 4);
    this.statGraphics.lineStyle(1, 0xffffff, 0.35);
    this.statGraphics.strokeRoundedRect(barX, y, barW, 10, 5);

    const labelText = this.add.text(x, y + 5, label, {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#d8eeff',
    }).setOrigin(0, 0.5).setDepth(15);

    const suffixText = this.add.text(x + width, y + 5, suffix, {
      fontSize: '9px', fontFamily: 'Arial', color: '#c6d9eb',
    }).setOrigin(1, 0.5).setDepth(15);
    this.statRowTexts.push(labelText, suffixText);
  }

  _setPanel(mode, preserveScroll = false) {
    const nextMode = (mode === 'dogs' || mode === 'units') ? 'collection' : mode;
    if (this.panelMode !== nextMode) SFX.tab();
    this.panelMode = nextMode;
    const savedScroll = preserveScroll ? this.panelScrollY : 0;
    this.panelScrollY = 0;
    this.panelScrollMax = 0;
    this._clearPanel();
    // Restore saved scroll before render so _finalizePanelContent clamps and applies it
    this.panelScrollY = savedScroll;
    this._renderMainTabs();
    if (this.panelMode === 'home') this._renderHomePanel();
    else if (this.panelMode === 'collection') this._renderCollectionPanel();
    else this._renderDecorPanel();
    this._refreshActionButtons();
  }

  _clearPanel() {
    this.panelObjects.forEach(obj => obj && obj.destroy && obj.destroy());
    this.panelObjects = [];
    if (this.panelContent) this.panelContent.removeAll(true);
    this.panelContentObjects = [];
    if (this.panelContent) this.panelContent.y = 0;
  }

  _renderMainTabs() {
    const { shop } = this.layout;
    const tabs = [
      { key: 'home', label: 'Home' },
      { key: 'collection', label: 'Collection' },
      { key: 'decor', label: 'Decor' },
    ];
    const gap = 6;
    const tabW = Math.floor((shop.w - 28 - gap * (tabs.length - 1)) / tabs.length);
    const tabY = shop.y + 6;
    const tabH = 32;
    tabs.forEach((tab, idx) => {
      const x = shop.x + 14 + idx * (tabW + gap);
      this._makeTabButton(x, tabY, tabW, tabH, tab.label, this.panelMode === tab.key, () => {
        this._setPanel(tab.key);
      });
    });
  }

  _addPanelContent(obj) {
    this.panelContent.add(obj);
    this.panelContentObjects.push(obj);
    return obj;
  }

  _makePanelTabButton(x, y, w, h, label, active, onClick) {
    const bg = this._addPanelContent(this.add.graphics().setDepth(16));
    bg.fillStyle(active ? 0x2a4b6e : 0x111c29, 1);
    bg.fillRoundedRect(x, y, w, h, 9);
    bg.lineStyle(active ? 1.5 : 1, active ? 0x5a96c8 : 0x2e4560, 1);
    bg.strokeRoundedRect(x, y, w, h, 9);
    if (active) {
      bg.lineStyle(2, 0xffd78a, 1);
      bg.lineBetween(x + 8, y + 1, x + w - 8, y + 1);
    }

    const txt = this._addPanelContent(this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: active ? '11px' : '10px', fontFamily: 'Arial Black',
      color: active ? '#f8dfa0' : '#4a6880',
    }).setOrigin(0.5).setDepth(17));

    // Full-area hit zone — entire tab background responds to clicks, not just the label text.
    const zone = this._addPanelContent(this.add.zone(x, y, w, h).setOrigin(0, 0).setDepth(18)
      .setInteractive({ useHandCursor: true }));
    zone.on('pointerover', () => { if (!active) txt.setColor('#80aece'); });
    zone.on('pointerout',  () => { if (!active) txt.setColor('#4a6880'); });
    zone.on('pointerdown', () => { SFX.tab(); onClick(); });
    return { bg, txt };
  }

  _finalizePanelContent(bottomY) {
    const viewport = this._getPanelViewport();
    const contentHeight = Math.max(0, bottomY - viewport.y);
    this.panelScrollMax = Math.max(0, contentHeight - viewport.h);
    this.panelScrollY = Phaser.Math.Clamp(this.panelScrollY, 0, this.panelScrollMax);
    this.panelContent.y = -this.panelScrollY;
  }

  _onWheel(pointer, _gameObjects, _dx, dy) {
    if (this.panelScrollMax <= 0) return;
    const viewport = this._getPanelViewport();
    const inside = pointer.x >= viewport.x && pointer.x <= viewport.x + viewport.w
      && pointer.y >= viewport.y && pointer.y <= viewport.y + viewport.h;
    if (!inside) return;

    this.panelScrollY = Phaser.Math.Clamp(this.panelScrollY + dy * 0.7, 0, this.panelScrollMax);
    this.panelContent.y = -this.panelScrollY;
  }

  // ── Touch drag-scroll handlers ─────────────────────────────────
  _onDragStart(pointer) {
    if (this.panelScrollMax <= 0) return;
    const viewport = this._getPanelViewport();
    const inside = pointer.x >= viewport.x && pointer.x <= viewport.x + viewport.w
      && pointer.y >= viewport.y && pointer.y <= viewport.y + viewport.h;
    if (!inside) return;

    this._dragStartY  = pointer.y;
    this._dragScrollY = this.panelScrollY;
    this._isDragging  = false;
  }

  _onDragMove(pointer) {
    if (this._dragStartY === null || !pointer.isDown) return;
    const dy = this._dragStartY - pointer.y;       // positive = scrolling down
    if (!this._isDragging && Math.abs(dy) < 5) return; // dead-zone: ignore micro-moves
    this._isDragging = true;
    this.panelScrollY = Phaser.Math.Clamp(this._dragScrollY + dy, 0, this.panelScrollMax);
    this.panelContent.y = -this.panelScrollY;
  }

  _onDragEnd() {
    this._dragStartY = null;
    this._isDragging = false;
  }

  _drawRoomDynamic() {
    const g = this.roomG;
    const { room } = this.layout;
    const home = Progression.getHomeState(this.saveData);
    const collection = Progression.getCollectionState(this.saveData);
    const slots = home.decorSlots;
    const cx = room.x + room.w * 0.5;
    const cy = room.y + room.h * 0.69 + Math.sin(this._animTime / 420) * 4;

    g.clear();
    this._drawDecorItem(g, slots.rug, this._animTime, room);
    this._drawDecorItem(g, slots.bed, this._animTime, room);
    this._drawDecorItem(g, slots.bowl, this._animTime, room);
    this._drawDecorItem(g, slots.wall, this._animTime, room);
    this._drawDecorItem(g, slots.toy, this._animTime, room);
    this._drawEquippedCollectibles(g, collection, room, cx, cy, this._animTime, false);
    drawDogByType(g, cx, cy, 'bark_pup', false, this._animTime);
    this._drawEquippedCollectibles(g, collection, room, cx, cy, this._animTime, true);

    if (!slots.bowl) {
      g.fillStyle(0xf8f0d8, 1);
      g.fillCircle(cx + 74, cy + 16, 8);
      g.fillCircle(cx + 88, cy + 16, 8);
      g.fillRect(cx + 74, cy + 12, 14, 8);
    }
  }

  _drawEquippedCollectibles(g, collection, room, cx, cy, animTime, frontLayer) {
    const equipped = collection && collection.equipped ? collection.equipped : {};

    if (!frontLayer) {
      if (equipped.skin === 'sunny-bandana') {
        g.fillStyle(0xffcf6a, 0.55);
        g.fillEllipse(cx, cy - 6, 118, 96);
      }
      if (equipped.skin === 'paw-knit-wrap') {
        g.fillStyle(0x8bd1ff, 0.28);
        g.fillEllipse(cx, cy - 2, 126, 104);
      }
      if (equipped.skin === 'royal-halo') {
        const pulse = 0.65 + Math.sin(animTime / 220) * 0.18;
        g.lineStyle(4, 0xffd86f, pulse);
        g.strokeEllipse(cx, cy - 56, 54, 16);
        g.fillStyle(0xffefad, 0.65);
        g.fillCircle(cx - 22, cy - 52, 2);
        g.fillCircle(cx + 18, cy - 58, 2);
      }
      if (equipped.accent === 'starlight-garland') {
        const garlandY = room.y + 78;
        const startX = room.x + 56;
        const ctrlX = room.x + room.w / 2;
        const endX = room.x + room.w - 64;
        const endY = garlandY - 2;
        g.lineStyle(2, 0x8cb2ff, 0.8);
        g.beginPath();
        g.moveTo(startX, garlandY);
        for (let step = 1; step <= 12; step++) {
          const t = step / 12;
          const inv = 1 - t;
          const px = inv * inv * startX + 2 * inv * t * ctrlX + t * t * endX;
          const py = inv * inv * garlandY + 2 * inv * t * (garlandY + 20) + t * t * endY;
          g.lineTo(px, py);
        }
        g.strokePath();
        [0, 1, 2, 3, 4, 5].forEach(i => {
          const px = room.x + 70 + i * 74;
          const py = garlandY + Math.sin((animTime / 260) + i) * 4 + (i % 2 === 0 ? 10 : 18);
          const colors = [0xffd86f, 0x8fd8ff, 0xff9ccf];
          g.fillStyle(colors[i % colors.length], 0.95);
          g.fillCircle(px, py, 5);
        });
      }
      return;
    }

    if (equipped.collar === 'berry-collar') {
      g.fillStyle(0xd96b88, 1);
      g.fillRoundedRect(cx - 18, cy + 4, 36, 6, 3);
      g.fillStyle(0xfff0ba, 1);
      g.fillCircle(cx + 10, cy + 10, 3);
    }
    if (equipped.collar === 'moon-bell') {
      g.fillStyle(0x6ea9ff, 1);
      g.fillRoundedRect(cx - 19, cy + 4, 38, 6, 3);
      g.fillStyle(0xffefad, 1);
      g.fillCircle(cx + 10, cy + 10, 4);
      g.fillStyle(0x203b61, 1);
      g.fillCircle(cx + 10, cy + 9, 1.5);
    }
    if (equipped.skin === 'sunny-bandana') {
      g.fillStyle(0xffcf6a, 1);
      g.fillTriangle(cx - 10, cy + 4, cx + 14, cy + 4, cx + 2, cy + 18);
    }
    if (equipped.skin === 'paw-knit-wrap') {
      g.fillStyle(0x6fc0e6, 1);
      g.fillRoundedRect(cx - 22, cy + 1, 44, 9, 4);
      g.fillStyle(0xdff4ff, 0.9);
      g.fillCircle(cx - 8, cy + 6, 1.5);
      g.fillCircle(cx + 3, cy + 6, 1.5);
      g.fillCircle(cx + 12, cy + 6, 1.5);
    }
  }

  _drawDecorItem(g, decorId, animTime, room) {
    const cx = room.x + room.w * 0.50;
    const floorY = room.y + room.h * 0.79;
    switch (decorId) {
      case 'patchwork_rug':
        g.fillStyle(0x8d5f7e, 1);
        g.fillEllipse(cx, floorY + 18, 308, 88);
        g.lineStyle(3, 0xf2c67a, 0.7);
        g.strokeEllipse(cx, floorY + 18, 308, 88);
        g.fillStyle(0xe0a55d, 0.75);
        g.fillEllipse(cx, floorY + 18, 176, 34);
        break;
      case 'cloud_bed':
        g.fillStyle(0xd8c8b0, 1);
        g.fillEllipse(cx - 6, floorY - 76, 208, 50);
        g.fillStyle(0xf5e7d6, 1);
        g.fillEllipse(cx - 6, floorY - 82, 186, 34);
        g.fillStyle(0xfff7ef, 0.75);
        g.fillEllipse(cx - 42, floorY - 86, 66, 20);
        g.fillEllipse(cx + 28, floorY - 82, 80, 22);
        break;
      case 'cozy_bed':
        g.fillStyle(0xb27f64, 1);
        g.fillRoundedRect(cx - 112, floorY - 108, 222, 54, 24);
        g.fillStyle(0xe7d7c5, 1);
        g.fillRoundedRect(cx - 96, floorY - 98, 192, 28, 16);
        g.fillStyle(0xf1e4d0, 1);
        g.fillRoundedRect(cx - 94, floorY - 120, 58, 24, 10);
        g.fillStyle(0xcf8fa4, 1);
        g.fillRoundedRect(cx - 8, floorY - 98, 76, 28, 14);
        break;
      case 'snack_bowl':
        g.fillStyle(0x7aa1d1, 1);
        g.fillEllipse(cx + 92, floorY - 58, 34, 12);
        g.fillStyle(0xf5d083, 1);
        g.fillEllipse(cx + 92, floorY - 61, 24, 6);
        break;
      case 'heart_bowl':
        g.fillStyle(0xd97b95, 1);
        g.fillEllipse(cx + 92, floorY - 58, 36, 13);
        g.fillStyle(0xf9e2ea, 1);
        g.fillCircle(cx + 86, floorY - 63, 3);
        g.fillCircle(cx + 92, floorY - 63, 3);
        g.fillTriangle(cx + 83, floorY - 62, cx + 95, floorY - 62, cx + 89, floorY - 56);
        break;
      case 'paw_frame':
        g.fillStyle(0x8e694a, 1);
        g.fillRoundedRect(room.x + room.w - 146, room.y + 92, 124, 78, 10);
        g.fillStyle(0x324f78, 1);
        g.fillRoundedRect(room.x + room.w - 136, room.y + 102, 104, 58, 8);
        g.fillStyle(0xf9f0dd, 1);
        g.fillCircle(room.x + room.w - 84, room.y + 126, 11);
        g.fillCircle(room.x + room.w - 99, room.y + 111, 4);
        g.fillCircle(room.x + room.w - 88, room.y + 106, 4);
        g.fillCircle(room.x + room.w - 76, room.y + 106, 4);
        g.fillCircle(room.x + room.w - 65, room.y + 111, 4);
        break;
      case 'moon_frame': {
        const sway = Math.sin(animTime / 900) * 3;
        g.fillStyle(0x8e694a, 1);
        g.fillRoundedRect(room.x + room.w - 146, room.y + 92, 124, 78, 10);
        g.fillStyle(0x263a5b, 1);
        g.fillRoundedRect(room.x + room.w - 136, room.y + 102, 104, 58, 8);
        g.fillStyle(0xf8efc0, 1);
        g.fillCircle(room.x + room.w - 60, room.y + 118, 10);
        g.fillStyle(0x263a5b, 1);
        g.fillCircle(room.x + room.w - 56, room.y + 114, 9);
        drawStar(g, room.x + room.w - 108 + sway, room.y + 122, 8, true);
        drawStar(g, room.x + room.w - 84 - sway, room.y + 140, 6, true);
        break;
      }
      case 'squeaky_toy': {
        const bounce = Math.sin(animTime / 300) * 2;
        g.fillStyle(0xf2a64d, 1);
        g.fillCircle(room.x + room.w - 74, floorY - 62 + bounce, 12);
        g.fillStyle(0xffd58a, 1);
        g.fillCircle(room.x + room.w - 74, floorY - 65 + bounce, 5);
        break;
      }
      case 'toy_basket':
        g.fillStyle(0x9d724c, 1);
        g.fillRoundedRect(room.x + room.w - 104, floorY - 92, 68, 38, 10);
        g.lineStyle(2, 0xc79a6c, 0.8);
        g.lineBetween(room.x + room.w - 92, floorY - 92, room.x + room.w - 92, floorY - 54);
        g.lineBetween(room.x + room.w - 74, floorY - 92, room.x + room.w - 74, floorY - 54);
        g.lineBetween(room.x + room.w - 56, floorY - 92, room.x + room.w - 56, floorY - 54);
        g.fillStyle(0x78a7d7, 1);
        g.fillCircle(room.x + room.w - 88, floorY - 94, 10);
        g.fillStyle(0xf8f0d8, 1);
        g.fillCircle(room.x + room.w - 60, floorY - 97, 7);
        g.fillCircle(room.x + room.w - 48, floorY - 97, 7);
        g.fillRect(room.x + room.w - 60, floorY - 101, 12, 8);
        break;
    }
  }

  _renderHomePanel() {
    const viewport = this._getPanelViewport();
    const home = Progression.getHomeState(this.saveData);
    const bond = Progression.getBondState(this.saveData);
    const bonus = Progression.getBattleBonus(this.saveData);
    const currentEvent = Progression.getCurrentHomeEvent(this.saveData);
    const missions = Progression.getActiveMissions(this.saveData, 3);
    const dogs = Progression.getUnlockedDogs(this.saveData);

    this.panelTitle.setText('Home');
    this.panelHint.setText('Latest home updates, care notes, and next goals.');

    const statusG = this._addPanelContent(this.add.graphics().setDepth(15));
    statusG.fillStyle(0x111e2c, 1);
    statusG.fillRoundedRect(viewport.x + 2, viewport.y + 4, viewport.w - 4, 68, 12);
    statusG.lineStyle(1.2, 0x2e4e6a, 1);
    statusG.strokeRoundedRect(viewport.x + 2, viewport.y + 4, viewport.w - 4, 68, 12);
    this._addPanelContent(this.add.text(viewport.x + 16, viewport.y + 15, 'Oyong Today', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#e8f4ff',
    }).setDepth(16));
    this._addPanelContent(this.add.text(viewport.x + 16, viewport.y + 35, currentEvent.text, {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ffdea0',
    }).setDepth(16));
    this._addPanelContent(this.add.text(viewport.x + 16, viewport.y + 52, this.statusMessage, {
      fontSize: '10px', fontFamily: 'Arial', color: '#b8d8f4',
      wordWrap: { width: viewport.w - 32 },
    }).setDepth(16));

    const careY = viewport.y + 82;
    const careG = this._addPanelContent(this.add.graphics().setDepth(15));
    careG.fillStyle(0x111e2c, 1);
    careG.fillRoundedRect(viewport.x + 2, careY, viewport.w - 4, 84, 12);
    careG.lineStyle(1.2, 0x2e4e6a, 1);
    careG.strokeRoundedRect(viewport.x + 2, careY, viewport.w - 4, 84, 12);
    this._addPanelContent(this.add.text(viewport.x + 16, careY + 13, 'Care Snapshot', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#e8f4ff',
    }).setDepth(16));
    this._addPanelContent(this.add.text(viewport.x + 16, careY + 36,
      `Bond Lv ${bond.level}  •  Hunger ${home.hunger}/100  •  Mood ${home.mood}/100  •  Energy ${home.energy}/100`, {
        fontSize: '10px', fontFamily: 'Arial', color: '#c0d8ee',
        wordWrap: { width: viewport.w - 32 },
      }).setDepth(16));
    this._addPanelContent(this.add.text(viewport.x + 16, careY + 56,
      `Battle mood bonus: ${bonus.desc}`, {
        fontSize: '10px', fontFamily: 'Arial', color: '#9abcd4',
        wordWrap: { width: viewport.w - 32 },
      }).setDepth(16));

    const missionY   = careY + 94;
    const missionRowH = 30;   // title line + desc line per mission
    const missionH   = 56 + Math.max(1, missions.length) * missionRowH;
    const missionG = this._addPanelContent(this.add.graphics().setDepth(15));
    missionG.fillStyle(0x111e2c, 1);
    missionG.fillRoundedRect(viewport.x + 2, missionY, viewport.w - 4, missionH, 12);
    missionG.lineStyle(1.2, 0x2e4e6a, 1);
    missionG.strokeRoundedRect(viewport.x + 2, missionY, viewport.w - 4, missionH, 12);
    this._addPanelContent(this.add.text(viewport.x + 16, missionY + 13, 'Active Goals', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#e8f4ff',
    }).setDepth(16));
    if (missions.length === 0) {
      this._addPanelContent(this.add.text(viewport.x + 16, missionY + 36,
        'All missions complete — check back after more battles.', {
          fontSize: '10px', fontFamily: 'Arial', color: '#9abcd4',
          wordWrap: { width: viewport.w - 32 },
        }).setDepth(16));
    } else {
      missions.forEach((mission, idx) => {
        const rowY = missionY + 34 + idx * missionRowH;
        // Title row: mission name + progress + reward
        this._addPanelContent(this.add.text(viewport.x + 16, rowY,
          `${mission.title}  •  ${mission.progressText}  •  ${mission.rewardText}`, {
            fontSize: '10px', fontFamily: 'Arial Black', color: '#b8d4ea',
          }).setDepth(16));
        // Objective row: specific goal description
        this._addPanelContent(this.add.text(viewport.x + 18, rowY + 13,
          mission.desc, {
            fontSize: '9px', fontFamily: 'Arial', color: '#6a8ea8',
            wordWrap: { width: viewport.w - 36 },
          }).setDepth(16));
      });
    }

    const packY = missionY + missionH + 10;
    const packG = this._addPanelContent(this.add.graphics().setDepth(15));
    packG.fillStyle(0x111e2c, 1);
    packG.fillRoundedRect(viewport.x + 2, packY, viewport.w - 4, 56, 12);
    packG.lineStyle(1.2, 0x2e4e6a, 1);
    packG.strokeRoundedRect(viewport.x + 2, packY, viewport.w - 4, 56, 12);
    this._addPanelContent(this.add.text(viewport.x + 16, packY + 13, 'Pack', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#e8f4ff',
    }).setDepth(16));
    this._addPanelContent(this.add.text(viewport.x + 16, packY + 33,
      `${dogs.length} unlocked units — browse via the Collection tab.`, {
        fontSize: '10px', fontFamily: 'Arial', color: '#9abcd4',
        wordWrap: { width: viewport.w - 32 },
      }).setDepth(16));

    this._finalizePanelContent(packY + 66);
  }

  _renderUnitsPanel() {
    const { shop } = this.layout;
    const viewport = this._getPanelViewport();
    const unlocked = Progression.getUnlockedDogs(this.saveData);
    this.panelTitle.setText('Dogs / Units');
    this.panelHint.setText('A cleaner roster view. Scroll if needed.');

    const cols = 2;
    const gap = 12;
    const cardW = Math.floor((shop.w - 32 - gap * (cols - 1)) / cols);
    const cardH = 104;
    const startX = shop.x + 16;
    const startY = viewport.y + 4;

    unlocked.forEach((type, idx) => {
      const def = DOG_DEFS[type];
      const x = startX + (idx % cols) * (cardW + gap);
      const y = startY + Math.floor(idx / cols) * (cardH + 12);
      const bg = this._addPanelContent(this.add.graphics().setDepth(15));
      bg.fillStyle(0x17263a, 1);
      bg.fillRoundedRect(x, y, cardW, cardH, 14);
      bg.lineStyle(2, 0x466a8f, 1);
      bg.strokeRoundedRect(x, y, cardW, cardH, 14);

      const dogG = this._addPanelContent(this.add.graphics().setDepth(16));
      drawDogBustByType(dogG, x + 46, y + 54, type, false, this._animTime);

      this._addPanelContent(this.add.text(x + cardW / 2 + 10, y + 20, def.name, {
        fontSize: '14px', fontFamily: 'Arial Black',
        color: '#ffdca0', stroke: '#000', strokeThickness: 2,
        wordWrap: { width: cardW - 100 }, align: 'center',
      }).setOrigin(0.5).setDepth(16));

      this._addPanelContent(this.add.text(x + cardW / 2 + 12, y + 52, def.desc, {
        fontSize: '10px', fontFamily: 'Arial',
        color: '#a9c6de', wordWrap: { width: cardW - 104 }, align: 'center',
      }).setOrigin(0.5).setDepth(16));

      this._addPanelContent(this.add.text(x + cardW / 2 + 12, y + 82, `Cost ${def.cost}  HP ${def.hp}`, {
        fontSize: '10px', fontFamily: 'Arial Black',
        color: '#9de4b2',
      }).setOrigin(0.5).setDepth(16));
    });

    const rows = Math.ceil(unlocked.length / cols);
    this._finalizePanelContent(startY + rows * (cardH + 12));
  }

  _renderCollectionPanel() {
    const { shop } = this.layout;
    const viewport = this._getPanelViewport();
    const items = Progression.getCollectibleItems(this.saveData);
    const collection = Progression.getCollectionState(this.saveData);
    const dogs = Progression.getUnlockedDogs(this.saveData);
    const ownedCount = items.filter(item => item.owned).length;
    const total = items.length;

    this.panelTitle.setText('Collection');
    this.panelHint.setText('Owned cosmetics live here, with a compact view of your unlocked pack.');

    const summaryG = this._addPanelContent(this.add.graphics().setDepth(15));
    summaryG.fillStyle(0x111e2c, 1);
    summaryG.fillRoundedRect(viewport.x + 2, viewport.y + 4, viewport.w - 4, 24, 10);
    summaryG.lineStyle(1, 0x2e4a64, 1);
    summaryG.strokeRoundedRect(viewport.x + 2, viewport.y + 4, viewport.w - 4, 24, 10);
    const skinLabel = collection.equipped.skin ? collection.equipped.skin.replace(/-/g, ' ') : 'none';
    this._addPanelContent(this.add.text(
      viewport.x + 14,
      viewport.y + 16,
      `${ownedCount}/${total} owned  •  ${dogs.length} dogs  •  Skin: ${skinLabel}`,
      { fontSize: '10px', fontFamily: 'Arial Black', color: '#b0ccdf', wordWrap: { width: viewport.w - 28 } }
    ).setOrigin(0, 0.5).setDepth(16));

    const dogStripY = viewport.y + 34;
    const chipH = 52;
    const chipRowGap = 8;
    // Show every unlocked dog — calculate grid dimensions from actual count.
    const dogCols = Math.min(4, Math.max(1, dogs.length));
    const dogRows = Math.ceil(dogs.length / dogCols);
    const dogStripH = 26 + dogRows * chipH + (dogRows - 1) * chipRowGap + 12;
    const dogStripG = this._addPanelContent(this.add.graphics().setDepth(15));
    dogStripG.fillStyle(0x14202f, 1);
    dogStripG.fillRoundedRect(viewport.x + 2, dogStripY, viewport.w - 4, dogStripH, 14);
    dogStripG.lineStyle(1.2, 0x3a5878, 1);
    dogStripG.strokeRoundedRect(viewport.x + 2, dogStripY, viewport.w - 4, dogStripH, 14);
    this._addPanelContent(this.add.text(viewport.x + 18, dogStripY + 10, 'Unlocked Dogs', {
      fontSize: '12px', fontFamily: 'Arial Black', color: '#c8dff2',
    }).setDepth(16));
    const chipGap = 10;
    const chipW = Math.floor((viewport.w - 32 - chipGap * (dogCols - 1)) / dogCols);
    dogs.forEach((type, idx) => {
      const def = DOG_DEFS[type];
      const chipCol = idx % dogCols;
      const chipRow = Math.floor(idx / dogCols);
      const x = viewport.x + 16 + chipCol * (chipW + chipGap);
      const y = dogStripY + 28 + chipRow * (chipH + chipRowGap);
      const chip = this._addPanelContent(this.add.graphics().setDepth(16));
      chip.fillStyle(0x1b2e44, 1);
      chip.fillRoundedRect(x, y, chipW, chipH, 12);
      chip.lineStyle(1.2, 0x3d6080, 1);
      chip.strokeRoundedRect(x, y, chipW, chipH, 12);
      // Scaled bust portrait via Container — prevents overflow
      const portraitCx = x + 26;
      const portraitCy = y + chipH / 2;
      const dogContainer = this._addPanelContent(this.add.container(portraitCx, portraitCy).setDepth(17));
      const dogG = this.add.graphics();
      drawDogBustByType(dogG, 0, 0, type, false, this._animTime);
      dogContainer.add(dogG);
      dogContainer.setScale(0.45);
      this._addPanelContent(this.add.text(x + 48, y + 16, def.name, {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#ffdca0',
        wordWrap: { width: chipW - 56 },
      }).setOrigin(0, 0.5).setDepth(17));
      this._addPanelContent(this.add.text(x + 48, y + 34, def.desc, {
        fontSize: '9px', fontFamily: 'Arial', color: '#8ab4cc',
        wordWrap: { width: chipW - 56 },
      }).setOrigin(0, 0.5).setDepth(17));
    });

    const cols = 2;
    const gap = 12;
    const cardW = Math.floor((shop.w - 32 - gap * (cols - 1)) / cols);
    const cardH = 96;
    const startY = dogStripY + dogStripH + 8;

    items.forEach((item, idx) => {
      const x = shop.x + 16 + (idx % cols) * (cardW + gap);
      const y = startY + Math.floor(idx / cols) * (cardH + 10);
      const style = item.rarityStyle;
      const locked = !item.owned;
      const equipped = item.equipped;
      const bg = this._addPanelContent(this.add.graphics().setDepth(15));
      bg.fillStyle(
        equipped ? style.fill : locked ? 0x10161f : style.fill,
        equipped ? 1 : locked ? 0.82 : 0.96
      );
      bg.fillRoundedRect(x, y, cardW, cardH, 12);
      bg.lineStyle(2, equipped ? style.glow : locked ? 0x2b3947 : style.border, 1);
      bg.strokeRoundedRect(x, y, cardW, cardH, 12);
      if (equipped) {
        bg.lineStyle(5, style.glow, 0.22);
        bg.strokeRoundedRect(x + 2, y + 2, cardW - 4, cardH - 4, 10);
      } else if (!locked && item.rarity === 'legendary') {
        bg.lineStyle(6, style.glow, 0.16);
        bg.strokeRoundedRect(x + 2, y + 2, cardW - 4, cardH - 4, 10);
      }

      // Rarity badge — top right
      const rarityG = this._addPanelContent(this.add.graphics().setDepth(16));
      rarityG.fillStyle(locked ? 0x3a4654 : style.border, locked ? 0.55 : 0.9);
      rarityG.fillRoundedRect(x + cardW - 72, y + 9, 60, 15, 7);
      this._addPanelContent(this.add.text(x + cardW - 42, y + 16.5, style.label, {
        fontSize: '8px', fontFamily: 'Arial Black', color: locked ? '#b4c0cb' : '#07101d',
      }).setOrigin(0.5).setDepth(17));

      if (locked) {
        const lockG = this._addPanelContent(this.add.graphics().setDepth(17));
        lockG.lineStyle(3.5, 0x748395, 1);
        lockG.beginPath();
        lockG.arc(x + 26, y + 31, 8, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
        lockG.strokePath();
        lockG.fillStyle(0x748395, 1);
        lockG.fillRoundedRect(x + 15, y + 32, 22, 16, 5);
        lockG.fillStyle(0x1a2330, 1);
        lockG.fillCircle(x + 26, y + 39, 3);
      }

      // Name
      this._addPanelContent(this.add.text(x + 12, y + 13, item.name, {
        fontSize: '12px', fontFamily: 'Arial Black',
        color: equipped ? '#fff3c7' : locked ? '#6b7b8c' : '#eef5ff',
      }).setDepth(16));

      // Description
      this._addPanelContent(this.add.text(x + 12, y + 33, locked ? 'Locked Cosmetic\nUnlock from drops' : item.desc, {
        fontSize: '9px', fontFamily: 'Arial',
        color: equipped ? '#dfeeff' : locked ? '#526473' : '#b8d4ea',
        wordWrap: { width: cardW - 26 },
      }).setDepth(16));

      const stateChipG = this._addPanelContent(this.add.graphics().setDepth(16));
      const stateChipColor = equipped ? 0x345f44 : locked ? 0x2b3540 : 0x284564;
      stateChipG.fillStyle(stateChipColor, 1);
      stateChipG.fillRoundedRect(x + 12, y + 70, 92, 16, 7);
      const stateLabel = equipped ? 'EQUIPPED' : locked ? 'LOCKED' : 'OWNED';
      this._addPanelContent(this.add.text(x + 58, y + 78, stateLabel, {
        fontSize: '8px', fontFamily: 'Arial Black',
        color: equipped ? '#baffc6' : locked ? '#92a1b0' : '#b9dcff',
      }).setOrigin(0.5).setDepth(17));

      // Action button — bottom right
      const actionLabel = equipped ? 'Unequip' : item.owned ? 'Equip' : 'Locked';
      const btn = this._makeMiniButton(
        x + cardW - 44,
        y + 72,
        76,
        20,
        actionLabel,
        equipped ? 0x587a64 : item.owned ? style.border : 0x2f3944,
        locked ? null : equipped
          ? () => this._unequipCollectible(item.category)
          : () => this._equipCollectible(item.id)
      );

      this._addPanelContent(btn.bg);
      this._addPanelContent(btn.txt);
    });

    const rows = Math.ceil(items.length / cols);
    this._finalizePanelContent(startY + rows * (cardH + 10));
  }

  _equipCollectible(collectibleId) {
    const result = Progression.equipCollectible(collectibleId);
    if (!result.ok) {
      SFX.error();
      return;
    }

    this.saveData = result.saveData;
    this.statusMessage = `${result.collectible.name} is now equipped at Oyong Home.`;
    SFX.buy();
    this._refreshHud();
    this._setPanel('collection', true);
  }

  _unequipCollectible(category) {
    const result = Progression.unequipCollectible(category);
    if (!result.ok) {
      SFX.error();
      return;
    }

    this.saveData = result.saveData;
    this.statusMessage = `${result.collectible ? result.collectible.name : 'Cosmetic'} was unequipped.`;
    SFX.click();
    this._refreshHud();
    this._setPanel('collection', true);
  }

  _renderDecorPanel() {
    const { shop } = this.layout;
    const viewport = this._getPanelViewport();
    const home = Progression.getHomeState(this.saveData);
    const bond = Progression.getBondState(this.saveData);
    const selected = this.selectedDecorSlot;
    const slotDef = HOME_DECOR_SLOTS.find(slot => slot.key === selected) || HOME_DECOR_SLOTS[0];
    const equippedId = home.decorSlots[selected];
    const equipped = equippedId ? HOME_DECOR_DEFS[equippedId] : null;
    const items = getHomeDecorBySlot(selected);

    this.panelTitle.setText('Decor');
    this.panelHint.setText('The decor shop now uses the full panel width so browsing feels cleaner.');

    const tabY = viewport.y + 4;
    const tabGap = 10;
    const tabW = Math.floor((shop.w - 32 - tabGap * (HOME_DECOR_SLOTS.length - 1)) / HOME_DECOR_SLOTS.length);
    HOME_DECOR_SLOTS.forEach((slot, idx) => {
      const x = shop.x + 16 + idx * (tabW + tabGap);
      this._makePanelTabButton(x, tabY, tabW, 24, slot.label, slot.key === selected, () => {
        this.selectedDecorSlot = slot.key;
        this._setPanel('decor');
      });
    });

    const summaryG = this._addPanelContent(this.add.graphics().setDepth(15));
    summaryG.fillStyle(0x111e2c, 1);
    summaryG.fillRoundedRect(viewport.x + 2, viewport.y + 32, viewport.w - 4, 26, 10);
    summaryG.lineStyle(1, 0x2e4a64, 1);
    summaryG.strokeRoundedRect(viewport.x + 2, viewport.y + 32, viewport.w - 4, 26, 10);
    const ownedCount = items.filter(item => home.ownedDecor.includes(item.id)).length;
    this._addPanelContent(this.add.text(
      viewport.x + 14,
      viewport.y + 45,
      `${slotDef.label}  •  Equipped: ${equipped ? equipped.name : 'None'}  •  ${ownedCount}/${items.length} owned  •  Bond Lv ${bond.level}`,
      { fontSize: '10px', fontFamily: 'Arial Black', color: '#9ab8cf', wordWrap: { width: viewport.w - 28 } }
    ).setOrigin(0, 0.5).setDepth(16));

    const cols = viewport.w >= 820 ? 3 : 2;
    const cardGap = 12;
    const cardW = Math.floor((shop.w - 32 - cardGap * (cols - 1)) / cols);
    const cardH = 92;
    const rowY = viewport.y + 68;
    items.forEach((def, idx) => {
      const x = shop.x + 16 + (idx % cols) * (cardW + cardGap);
      const y = rowY + Math.floor(idx / cols) * (cardH + 10);
      const owned = home.ownedDecor.includes(def.id);
      const equippedNow = home.decorSlots[def.slot] === def.id;
      const lockedByBond = (def.unlockBond || 1) > home.bondLevel;
      const stateLabel = equippedNow ? 'Placed' : lockedByBond ? `Bond ${def.unlockBond}` : owned ? 'Owned' : 'Buy';
      const stateColor = equippedNow ? 0x3a7d59 : lockedByBond ? 0x5e5572 : owned ? 0x446e9a : 0x8b6437;

      const bg = this._addPanelContent(this.add.graphics().setDepth(15));
      bg.fillStyle(owned ? 0x172a3e : 0x111c28, 1);
      bg.fillRoundedRect(x, y, cardW, cardH, 12);
      bg.lineStyle(1.5, equippedNow ? 0x55cc8a : 0x2e4e6a, 1);
      bg.strokeRoundedRect(x, y, cardW, cardH, 12);

      this._addPanelContent(this.add.text(x + 12, y + 11, def.name, {
        fontSize: '12px', fontFamily: 'Arial Black', color: owned ? '#ddeeff' : '#6a8298',
        wordWrap: { width: cardW - 26 },
      }).setDepth(16));

      const metaText = lockedByBond
        ? `Unlock at Bond Lv ${def.unlockBond}`
        : owned
          ? def.desc
          : `Costs ${def.cost} ${HOME_CURRENCY_NAME}`;
      this._addPanelContent(this.add.text(x + 12, y + 30, metaText, {
        fontSize: '9px', fontFamily: 'Arial', color: owned ? '#8ab0c8' : '#4e6878',
        wordWrap: { width: cardW - 26 },
      }).setDepth(16));

      const stateG = this._addPanelContent(this.add.graphics().setDepth(16));
      stateG.fillStyle(stateColor, 0.9);
      stateG.fillRoundedRect(x + 12, y + 60, 56, 18, 9);
      this._addPanelContent(this.add.text(x + 40, y + 69, stateLabel, {
        fontSize: '9px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setOrigin(0.5).setDepth(17));

      const actionLabel = lockedByBond ? 'Locked' : equippedNow ? 'Using' : owned ? 'Equip' : `Buy ${def.cost}`;
      const btn = this._makeMiniButton(
        x + cardW - 54,
        y + 69,
        96,
        22,
        actionLabel,
        lockedByBond ? 0x40394e : equippedNow ? 0x3a5c4a : owned ? 0x295580 : 0x6e5030,
        (lockedByBond || equippedNow) ? null : () => this._handleDecorAction(def)
      );

      this._addPanelContent(btn.bg);
      this._addPanelContent(btn.txt);
    });

    const rows = Math.ceil(items.length / cols);
    this._finalizePanelContent(rowY + rows * (cardH + 10));
  }

  _makeTabButton(x, y, w, h, label, active, onClick) {
    const bg = this.add.graphics().setDepth(15);
    const radius = { tl: 10, tr: 10, bl: 0, br: 0 };
    if (active) {
      bg.fillStyle(0x1e3a58, 1);
      bg.fillRoundedRect(x, y, w, h, radius);
      bg.lineStyle(1.5, 0x4a7aaa, 1);
      bg.strokeRoundedRect(x, y, w, h, radius);
      bg.lineStyle(2.5, 0xffd78a, 1);
      bg.lineBetween(x + 10, y + 1, x + w - 10, y + 1);
      bg.fillStyle(0xffffff, 0.04);
      bg.fillRoundedRect(x + 2, y + 2, w - 4, Math.floor(h * 0.5), { tl: 9, tr: 9, bl: 0, br: 0 });
    } else {
      bg.fillStyle(0x0f1a27, 1);
      bg.fillRoundedRect(x, y, w, h, radius);
      bg.lineStyle(1, 0x223344, 1);
      bg.strokeRoundedRect(x, y, w, h, radius);
    }

    const txt = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: active ? '12px' : '11px', fontFamily: 'Arial Black',
      color: active ? '#fce8a0' : '#4a6b82',
    }).setOrigin(0.5).setDepth(16);

    // Full-area hit zone — entire tab background responds to clicks, not just the label text.
    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0).setDepth(17)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { if (!active) txt.setColor('#88b8d4'); });
    zone.on('pointerout',  () => { if (!active) txt.setColor('#4a6b82'); });
    zone.on('pointerdown', () => { SFX.click(); onClick(); });
    this.panelObjects.push(bg, txt, zone);
  }

  _makeMiniButton(x, y, w, h, label, color, onClick) {
    const bg = this.add.graphics().setDepth(16);
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    bg.lineStyle(1, 0xffe9c2, 0.65);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);

    const txt = this.add.text(x, y, label, {
      fontSize: '10px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(17);

    if (onClick) {
      // Full-area hit zone — tracked via _addPanelContent so it is destroyed on _clearPanel(),
      // preventing stale zones from firing old callbacks after each equip/unequip re-render.
      const zone = this._addPanelContent(
        this.add.zone(x - w / 2, y - h / 2, w, h).setOrigin(0, 0).setDepth(18)
          .setInteractive({ useHandCursor: true })
      );
      zone.on('pointerover', () => txt.setScale(1.04));
      zone.on('pointerout', () => txt.setScale(1));
      zone.on('pointerdown', () => { SFX.click(); onClick(); });
    } else {
      txt.setAlpha(0.7);
      bg.setAlpha(0.7);
    }

    return { bg, txt };
  }

  _handleDecorAction(def) {
    const home = Progression.getHomeState(this.saveData);
    let result;

    if (home.ownedDecor.includes(def.id)) {
      result = Progression.placeDecor(def.slot, def.id);
      if (result.ok) {
        this.saveData = result.saveData;
        this.statusMessage = `${def.name} is now placed in the ${HOME_DECOR_SLOTS.find(s => s.key === def.slot).label.toLowerCase()} slot.`;
        SFX.click();
      }
    } else {
      result = Progression.buyDecor(def.id);
      if (result.ok) {
        this.saveData = result.saveData;
        this.statusMessage = `Bought ${def.name} and placed it right away.`;
        SFX.buy();
      }
    }

    if (!result || !result.ok) {
      if (result && result.reason === 'bond_locked') {
        this.statusMessage = `Reach Bond Lv ${result.requiredBond} to unlock ${def.name}.`;
      } else {
        this.statusMessage = `Not enough ${HOME_CURRENCY_NAME.toLowerCase()} for that yet.`;
      }
      SFX.error();
    }

    this.selectedDecorSlot = def.slot;
    this._refreshHud();
    this._setPanel('decor', true);
  }

  _performCareAction(action) {
    const room = this.layout.room;
    let result = null;
    if (action === 'feed') result = Progression.feedOyong();
    if (action === 'pet') result = Progression.petOyong();
    if (action === 'rest') result = Progression.restOyong();

    if (result && result.ok) {
      this.saveData = result.saveData;
      this.statusMessage = result.message + (result.bondLevelUp ? ` Bond up! Now Lv ${this.saveData.home.bondLevel}.` : '');
      this._spawnHearts(6, room.x + room.w * 0.50, room.y + room.h * 0.56);
      SFX.buy();
      const missionNotes = Progression.drainMissionNotifications();
      if (missionNotes.length > 0) this._showMissionPopups(missionNotes);
    } else if (result && result.reason === 'cooldown') {
      const waitSeconds = Math.max(1, Math.ceil((result.remainingMs || 0) / 1000));
      this.statusMessage = `${result.message} Try again in ${waitSeconds}s.`;
      SFX.error();
    } else if (result && result.reason === 'not_enough_currency') {
      this.statusMessage = `Need ${HOME_FEED_COST} ${HOME_CURRENCY_NAME.toLowerCase()} to feed Oyong.`;
      SFX.error();
    }

    this._refreshHud();
    if (this.panelMode === 'decor') this._setPanel('decor', true);
  }

  _spawnHearts(count, x, y) {
    for (let i = 0; i < count; i++) {
      this.fxParticles.push({
        x: x + (Math.random() * 42 - 21),
        y: y + (Math.random() * 20 - 10),
        vx: Math.random() * 18 - 9,
        vy: -30 - Math.random() * 24,
        life: 900,
        maxLife: 900,
      });
    }
  }

  _updateFx(delta) {
    this.fxG.clear();
    for (let i = this.fxParticles.length - 1; i >= 0; i--) {
      const p = this.fxParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.fxParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * delta / 1000;
      p.y += p.vy * delta / 1000;
      const alpha = p.life / p.maxLife;
      this.fxG.fillStyle(0xff8fbe, alpha);
      this.fxG.fillCircle(p.x - 4, p.y, 4 * alpha);
      this.fxG.fillCircle(p.x + 4, p.y, 4 * alpha);
      this.fxG.fillTriangle(p.x - 8, p.y, p.x + 8, p.y, p.x, p.y + 10 * alpha);
    }
  }

  _showMissionPopups(notifications) {
    notifications.forEach((note, index) => {
      this.time.delayedCall(250 + index * 1400, () => {
        const cx = GAME_W / 2;
        const cy = 78;
        const container = this.add.container(cx, cy).setDepth(40).setAlpha(0).setScale(0.88);
        const g = this.add.graphics();
        g.fillStyle(0x17314d, 0.98);
        g.fillRoundedRect(-170, -28, 340, 56, 14);
        g.lineStyle(2, 0xffd36c, 1);
        g.strokeRoundedRect(-170, -28, 340, 56, 14);
        container.add(g);

        const header = this.add.text(0, -10, 'MISSION COMPLETE!', {
          fontSize: '15px', fontFamily: 'Arial Black',
          color: '#ffd36c', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);
        container.add(header);

        const body = this.add.text(0, 10, `${note.title}  •  ${note.rewardText}`, {
          fontSize: '11px', fontFamily: 'Arial',
          color: '#eef7ff', stroke: '#000', strokeThickness: 2,
          wordWrap: { width: 314 }, align: 'center',
        }).setOrigin(0.5);
        container.add(body);

        this.tweens.add({
          targets: container,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 220,
          ease: 'Back.Out',
          onComplete: () => {
            this.time.delayedCall(900, () => {
              this.tweens.add({
                targets: container,
                alpha: 0,
                y: cy - 18,
                duration: 260,
                onComplete: () => container.destroy(),
              });
            });
          },
        });
      });
    });
  }
}
