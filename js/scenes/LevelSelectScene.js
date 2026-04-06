// ============================================================
// LevelSelectScene.js — Chapter-based level selection
//
// Two views:
//   chapters — 3×2 grid of chapter cards
//   levels   — 2×5 grid of the 10 levels within a chapter
//
// Flow: chapters → (click chapter card) → levels → (back) → chapters
// ============================================================

class LevelSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelSelectScene' }); }

  init(data) {
    // Allow jumping directly to a chapter's level list (e.g. from LevelCompleteScene)
    this.startChapter = (data && data.chapterId) ? data.chapterId : null;
  }

  create() {
    AudioManager.playMusic('home');
    this.saveData = Progression.load();
    this._view    = 'chapters'; // 'chapters' | 'levels'
    this._chapter = null;       // currently selected CHAPTER_DATA entry

    this._bgLayer       = [];   // static background objects
    this._chapterLayer  = [];   // chapter card objects (shown in chapter view)
    this._levelLayer    = [];   // level card objects  (shown in level view)
    this._headerLayer   = [];   // dynamic header text objects

    this._buildBackground();
    this._buildChapterCards();
    this._buildBackButton();

    if (this.startChapter) {
      const chapter = CHAPTER_DATA.find(c => c.id === this.startChapter);
      if (chapter && isChapterUnlocked(chapter.id, this.saveData)) {
        this._openChapter(chapter);
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // BACKGROUND
  // ════════════════════════════════════════════════════════════

  _buildBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x0a1628, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    // Stars
    g.fillStyle(0xffffff, 0.55);
    [
      [60,30],[180,55],[340,18],[490,46],[640,28],[790,52],[900,22],
      [110,90],[390,75],[570,95],[730,65],[870,82],
      [150,120],[430,110],[700,130],[820,108],
    ].forEach(([sx, sy]) => g.fillCircle(sx, sy, 1.5));
    // Ground
    g.fillStyle(0x2a5a1a, 1);
    g.fillRect(0, GAME_H - 40, GAME_W, 40);

    this._bgLayer.push(g);
  }

  // ════════════════════════════════════════════════════════════
  // HEADER (rebuilt for each view)
  // ════════════════════════════════════════════════════════════

  _buildHeader(title, subtitle) {
    this._headerLayer.forEach(o => o.destroy());
    this._headerLayer = [];

    const t1 = this.add.text(GAME_W / 2, 24, title, {
      fontSize: '28px', fontFamily: 'Arial Black',
      color: '#ffd700', stroke: '#7a3a00', strokeThickness: 4,
    }).setOrigin(0.5);

    const t2 = this.add.text(GAME_W / 2, 52, subtitle, {
      fontSize: '13px', fontFamily: 'Arial',
      color: '#88c4e8', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    this._headerLayer.push(t1, t2);
  }

  // ════════════════════════════════════════════════════════════
  // BACK BUTTON
  // ════════════════════════════════════════════════════════════

  _buildBackButton() {
    const g = this.add.graphics().setDepth(50);
    const _drawBg = (hov) => {
      g.clear();
      g.fillStyle(hov ? 0x254460 : 0x1a2534, 1);
      g.fillRoundedRect(12, 10, 108, 34, 10);
      g.lineStyle(1.2, hov ? 0x5a9acc : 0x3a5468, 1);
      g.strokeRoundedRect(12, 10, 108, 34, 10);
    };
    _drawBg(false);

    const btn = this.add.text(66, 27, '\u2190 Back', {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#90bcd4', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => { _drawBg(true);  btn.setColor('#ffd700'); });
    btn.on('pointerout',   () => { _drawBg(false); btn.setColor('#90bcd4'); });
    btn.on('pointerdown',  () => {
      SFX.click();
      if (this._view === 'levels') {
        this._closeChapter();
      } else {
        this.scene.start('OyongHomeScene');
      }
    });

    this._backBtn    = btn;
    this._backBtnGfx = g;
  }

  // ════════════════════════════════════════════════════════════
  // CHAPTER CARDS VIEW
  // ════════════════════════════════════════════════════════════

  _buildChapterCards() {
    this._buildHeader('DOGS vs UNDEAD', 'Choose a Chapter — deploy your Oyongs!');
    this._view = 'chapters';

    const cols    = 3;
    const rows    = 2;
    const sidePad = 18;
    const gapX    = 16;
    const gapY    = 14;
    const topY    = 70;
    const cardW   = Math.floor((GAME_W - sidePad * 2 - gapX * (cols - 1)) / cols);
    const cardH   = Math.floor((GAME_H - topY - 40 - gapY * (rows - 1)) / rows);

    CHAPTER_DATA.forEach((chapter, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx  = sidePad + col * (cardW + gapX) + cardW / 2;
      const cy  = topY + row * (cardH + gapY) + cardH / 2;
      this._drawChapterCard(cx, cy, cardW, cardH, chapter);
    });
  }

  _drawChapterCard(cx, cy, w, h, chapter) {
    const unlocked = isChapterUnlocked(chapter.id, this.saveData);
    const complete  = isChapterComplete(chapter.id, this.saveData);
    const stars     = getChapterStars(chapter.id, this.saveData);
    const left = cx - w / 2, top = cy - h / 2;

    const baseBg  = unlocked ? chapter.color : 0x0d131c;
    const baseBdr = unlocked ? chapter.accentColor : 0x1e2a38;

    const g = this.add.graphics();

    const _redraw = (hov) => {
      g.clear();
      const bg  = hov ? Phaser.Display.Color.ValueToColor(baseBg).lighten(18).color : baseBg;
      const bdr = hov ? Phaser.Display.Color.ValueToColor(baseBdr).lighten(25).color : baseBdr;
      g.fillStyle(bg, 1);
      g.fillRoundedRect(left, top, w, h, 14);
      g.lineStyle(hov ? 2.5 : 1.5, bdr, 1);
      g.strokeRoundedRect(left, top, w, h, 14);
      if (hov && unlocked) {
        g.lineStyle(6, bdr, 0.12);
        g.strokeRoundedRect(left + 2, top + 2, w - 4, h - 4, 13);
      }
      // Accent top-strip
      if (unlocked) {
        g.fillStyle(chapter.accentColor, 0.22);
        g.fillRoundedRect(left, top, w, 36, { tl: 14, tr: 14, bl: 0, br: 0 });
      }
    };
    _redraw(false);

    if (!unlocked) {
      // Locked chapter
      this._drawPadlock(g, cx, cy - 14);
      const lt = this.add.text(cx, cy + 28, 'LOCKED', {
        fontSize: '17px', fontFamily: 'Arial Black', color: '#3a4a5a',
      }).setOrigin(0.5);
      const prevChap = CHAPTER_DATA.find(c => c.id === chapter.id - 1);
      const hint = prevChap ? `Complete ${prevChap.name} first` : '';
      const ht = this.add.text(cx, cy + 52, hint, {
        fontSize: '11px', fontFamily: 'Arial', color: '#2c3d4e',
        wordWrap: { width: w - 24 }, align: 'center',
      }).setOrigin(0.5);
      this._chapterLayer.push(g, lt, ht);
      return;
    }

    // Chapter number badge
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(left + 10, top + 8, 42, 22, 7);
    const badge = this.add.text(left + 31, top + 19, `Ch.${chapter.id}`, {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#ddf0ff',
    }).setOrigin(0.5);

    // Completion star badge (top-right)
    const starBadge = this.add.text(left + w - 10, top + 19,
      `${stars.earned}/${stars.total}★`, {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: stars.earned > 0 ? '#ffd700' : '#445566',
    }).setOrigin(1, 0.5);

    // Chapter name
    const nameT = this.add.text(cx, top + 52, chapter.name, {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Theme tag
    const themeT = this.add.text(cx, top + 78, chapter.theme, {
      fontSize: '13px', fontFamily: 'Arial',
      color: Phaser.Display.Color.ValueToColor(chapter.accentColor).lighten(40).rgba,
    }).setOrigin(0.5);

    // Description
    const descT = this.add.text(cx, top + 105, chapter.desc, {
      fontSize: '12px', fontFamily: 'Arial',
      color: '#88aac0', wordWrap: { width: w - 32 }, align: 'center',
    }).setOrigin(0.5);

    // Star bar
    this._drawStarBar(g, cx, top + h - 50, stars.earned, stars.total, chapter.accentColor);

    // Levels range label
    const lvls = chapter.levels;
    const lvlT = this.add.text(cx, top + h - 22, `Levels ${lvls[0]} – ${lvls[lvls.length - 1]}`, {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: complete ? '#6aff88' : '#4a7a9a',
    }).setOrigin(0.5);

    // Completion badge
    if (complete) {
      const cbg = this.add.graphics();
      cbg.fillStyle(0x003300, 0.6);
      cbg.fillRoundedRect(left + w - 54, top + h - 30, 48, 20, 6);
      const ct = this.add.text(left + w - 30, top + h - 20, '✔ DONE', {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#6aff88',
      }).setOrigin(0.5);
      this._chapterLayer.push(cbg, ct);
    }

    // Interactive zone
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => _redraw(true));
    zone.on('pointerout',  () => _redraw(false));
    zone.on('pointerdown', () => { SFX.tab(); this._openChapter(chapter); });

    this._chapterLayer.push(g, badge, starBadge, nameT, themeT, descT, lvlT, zone);
  }

  _drawStarBar(g, cx, cy, earned, total, accentColor) {
    const barW = 120, barH = 7, rx = cx - barW / 2;
    g.fillStyle(0x0a1628, 0.8);
    g.fillRoundedRect(rx - 2, cy - 2, barW + 4, barH + 4, 4);
    g.fillStyle(0x1a3040, 1);
    g.fillRoundedRect(rx, cy, barW, barH, 3);
    const pct = total > 0 ? earned / total : 0;
    if (pct > 0) {
      g.fillStyle(accentColor, 1);
      g.fillRoundedRect(rx, cy, barW * pct, barH, 3);
    }
  }

  _drawPadlock(g, cx, cy) {
    g.lineStyle(5, 0x445566, 1);
    g.beginPath();
    g.arc(cx, cy - 12, 12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    g.fillStyle(0x445566, 1);
    g.fillRoundedRect(cx - 14, cy - 4, 28, 22, 5);
    g.fillStyle(0x1a2230, 1);
    g.fillCircle(cx, cy + 5, 5);
    g.fillRect(cx - 3, cy + 5, 6, 8);
  }

  // ════════════════════════════════════════════════════════════
  // LEVEL CARDS VIEW
  // ════════════════════════════════════════════════════════════

  _openChapter(chapter) {
    // Hide chapter cards
    this._chapterLayer.forEach(o => o.setVisible(false));
    this._chapter = chapter;
    this._view    = 'levels';

    this._buildHeader(
      chapter.name,
      `Chapter ${chapter.id} — ${chapter.theme}`
    );

    this._buildLevelCards(chapter);
    this._backBtn.setText('\u2190 Chapters');
  }

  _closeChapter() {
    // Destroy level cards and show chapter cards
    this._levelLayer.forEach(o => o.destroy());
    this._levelLayer = [];
    this._chapterLayer.forEach(o => o.setVisible(true));
    this._view    = 'chapters';
    this._chapter = null;

    this._buildHeader('DOGS vs UNDEAD', 'Choose a Chapter — deploy your Oyongs!');
    this._backBtn.setText('\u2190 Back');
  }

  _buildLevelCards(chapter) {
    const perRow  = 5;
    const sidePad = 18;
    const gap     = 10;
    const cardW   = Math.floor((GAME_W - sidePad * 2 - gap * (perRow - 1)) / perRow);
    const cardH   = 228;
    const rowGap  = 10;
    const topY    = 68;
    const totalW  = perRow * cardW + (perRow - 1) * gap;
    const startX  = (GAME_W - totalW) / 2 + cardW / 2;

    const row0Y = topY + cardH / 2;
    const row1Y = row0Y + cardH + rowGap;

    chapter.levels.forEach((levelId, i) => {
      const level  = LEVEL_DATA.find(l => l.id === levelId);
      if (!level) return;
      const col    = i % perRow;
      const row    = Math.floor(i / perRow);
      const cx     = startX + col * (cardW + gap);
      const cy     = row === 0 ? row0Y : row1Y;
      const unlocked  = Progression.isUnlocked(level.id, this.saveData);
      const bestStars = Progression.getBestStars(level.id, this.saveData);
      const isBoss    = level.id % 10 === 0;
      this._drawLevelCard(cx, cy, cardW, cardH, level, unlocked, bestStars, isBoss, chapter);
    });
  }

  _drawLevelCard(cx, cy, w, h, level, unlocked, bestStars, isBoss, chapter) {
    const g    = this.add.graphics();
    const top  = cy - h / 2;
    const left = cx - w / 2;

    const bgColor     = unlocked
      ? (bestStars > 0 ? 0x1a3a4a : 0x172c3c)
      : 0x141820;
    const borderColor = unlocked
      ? (bestStars > 0 ? 0x6ac8ee : 0x2f5c84)
      : 0x222b38;
    const bossBorder  = 0xcc4422;

    const _redrawBg = (hov) => {
      g.clear();
      const bg  = hov ? 0x1e4a64 : bgColor;
      let   bdr = hov ? (bestStars > 0 ? 0x99eeff : 0x4ea8d8) : borderColor;
      if (isBoss && unlocked) bdr = hov ? 0xff7755 : bossBorder;
      g.fillStyle(bg, 1);
      g.fillRoundedRect(left, top, w, h, 12);
      g.lineStyle(hov ? 2.5 : (isBoss && unlocked ? 2 : 1.5), bdr, 1);
      g.strokeRoundedRect(left, top, w, h, 12);
      if (hov && unlocked) {
        g.lineStyle(5, bdr, 0.12);
        g.strokeRoundedRect(left + 2, top + 2, w - 4, h - 4, 11);
      }
      // Boss glow pulse on bg
      if (isBoss && unlocked && !hov) {
        g.fillStyle(0xcc2200, 0.06);
        g.fillRoundedRect(left, top, w, h, 12);
      }
    };
    _redrawBg(false);

    if (!unlocked) {
      this._drawPadlock(g, cx, cy - 18);
      const lt = this.add.text(cx, cy + 22, 'LOCKED', {
        fontSize: '16px', fontFamily: 'Arial Black', color: '#4a5a6a',
      }).setOrigin(0.5);
      const nt = this.add.text(cx, cy + 42, `Level ${level.id}`, {
        fontSize: '12px', fontFamily: 'Arial Black', color: '#3a4e60',
      }).setOrigin(0.5);
      this._levelLayer.push(g, lt, nt);
      const zone = this.add.zone(cx, cy, w, h).setInteractive();
      zone.on('pointerover', () => _redrawBg(false));
      zone.on('pointerout',  () => _redrawBg(false));
      this._levelLayer.push(zone);
      return;
    }

    // ── Level number badge (top-left) ────────────────────────
    g.fillStyle(isBoss ? 0x5a1010 : 0x1a537e, 1);
    g.fillRoundedRect(left + 8, top + 8, isBoss ? 50 : 38, 24, 8);
    const badgeTxt = isBoss ? `${level.id} 👑` : `${level.id}`;
    const badge = this.add.text(left + (isBoss ? 33 : 27), top + 20, badgeTxt, {
      fontSize: isBoss ? '13px' : '15px',
      fontFamily: 'Arial Black',
      color: isBoss ? '#ffcc88' : '#ddf0ff',
    }).setOrigin(0.5);

    // ── Stars (top-right) ────────────────────────────────────
    if (bestStars > 0) {
      const starStr = '★'.repeat(bestStars) + '☆'.repeat(3 - bestStars);
      const st = this.add.text(cx + w / 2 - 8, top + 20, starStr, {
        fontSize: '14px', color: '#ffd700',
      }).setOrigin(1, 0.5);
      this._levelLayer.push(st);
    }

    // ── Boss badge ───────────────────────────────────────────
    if (isBoss) {
      const bg2 = this.add.graphics();
      bg2.fillStyle(0x550000, 0.85);
      bg2.fillRoundedRect(left + 8, top + 36, w - 16, 16, 4);
      const bt = this.add.text(cx, top + 44, 'BOSS LEVEL', {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#ff8866',
      }).setOrigin(0.5);
      this._levelLayer.push(bg2, bt);
    }

    // ── Dog bust portrait ─────────────────────────────────────
    const dogTypes = (typeof DOG_ORDER !== 'undefined' && Array.isArray(DOG_ORDER) && DOG_ORDER.length)
      ? DOG_ORDER
      : ['bark_pup', 'guard_dog', 'frost_pup', 'treat_pup'];
    const dogType  = dogTypes[(level.id - 1) % dogTypes.length];
    const dogGfx   = this.add.graphics();
    const bustY    = isBoss ? top + 90 : top + 86;
    drawDogBustByType(dogGfx, cx, bustY, dogType, false, Date.now() + level.id * 1337);

    // ── Level title ──────────────────────────────────────────
    const nameT = this.add.text(cx, top + 130, level.name, {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: isBoss ? '#ffcc88' : '#eaf4ff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // ── Description ──────────────────────────────────────────
    const descT = this.add.text(cx, top + 150, level.description, {
      fontSize: '10px', fontFamily: 'Arial',
      color: '#88b8d4', wordWrap: { width: w - 22 }, align: 'center',
    }).setOrigin(0.5);

    // ── Wave count ───────────────────────────────────────────
    const waveT = this.add.text(cx, top + 175, `${level.waves.length} Waves`, {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#5e9ec0',
    }).setOrigin(0.5);

    // ── Difficulty dots ──────────────────────────────────────
    this._drawDifficulty(cx, top + 192, level.id, chapter.accentColor);

    // ── Enemy icons ──────────────────────────────────────────
    this._drawEnemyIcons(g, cx, top + 214, level);

    // ── Interactive zone ─────────────────────────────────────
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => _redrawBg(true));
    zone.on('pointerout',  () => _redrawBg(false));
    zone.on('pointerdown', () => {
      SFX.click();
      GameState.selectedDog = null;
      this.scene.start('LoadoutScene', { levelId: level.id });
    });

    this._levelLayer.push(g, badge, dogGfx, nameT, descT, waveT, zone);
  }

  _drawDifficulty(cx, cy, levelId, accentColor) {
    const total = 5;
    const spacing = 16;
    // Scale dots to chapter progress: 1 dot per 2 levels, capped at total
    const filled = Math.min(total, Math.ceil(((levelId - 1) % 10 + 1) / 2));
    const startX = cx - (total - 1) * spacing / 2;
    for (let i = 0; i < total; i++) {
      const px = startX + i * spacing;
      const active = i < filled;
      const tmp = this.add.graphics();
      tmp.fillStyle(active ? accentColor : 0x2a3a4a, active ? 1 : 0.5);
      tmp.fillCircle(px, cy + 3, 4);
      tmp.fillCircle(px - 4, cy - 2, 2.2);
      tmp.fillCircle(px,     cy - 5, 2.2);
      tmp.fillCircle(px + 4, cy - 2, 2.2);
      this._levelLayer.push(tmp);
    }
  }

  _drawEnemyIcons(g, cx, cy, level) {
    const types = new Set();
    level.waves.forEach(wave => wave.forEach(e => types.add(e.type)));

    const style = {
      walker:   { color: 0x6aad4a, shape: 'circle'  },
      runner:   { color: 0xcc4444, shape: 'diamond'  },
      brute:    { color: 0x8b3a2a, shape: 'circle'   },
      shielder: { color: 0x6a5a9a, shape: 'square'   },
      jumper:   { color: 0x9a5a2a, shape: 'diamond'  },
      exploder: { color: 0xff6600, shape: 'burst'    },
      boss:     { color: 0xcc0022, shape: 'crown'    },
    };

    const order = ['walker','runner','brute','shielder','jumper','exploder','boss'];
    const present = order.filter(t => types.has(t));
    const spacing = 16;
    const startX  = cx - (present.length - 1) * spacing / 2;

    present.forEach((type, i) => {
      const px = startX + i * spacing;
      const s  = style[type];
      if (!s) return;
      g.fillStyle(s.color, 0.85);
      if (s.shape === 'circle') {
        g.fillCircle(px, cy, 5);
      } else if (s.shape === 'diamond') {
        g.fillTriangle(px, cy - 6, px + 5, cy, px - 5, cy);
        g.fillTriangle(px, cy + 6, px + 5, cy, px - 5, cy);
      } else if (s.shape === 'square') {
        g.fillRect(px - 4.5, cy - 4.5, 9, 9);
      } else if (s.shape === 'burst') {
        // Exploder: star/burst shape
        g.fillCircle(px, cy, 4);
        g.fillStyle(0xffcc00, 0.85);
        g.fillCircle(px, cy, 2);
      } else if (s.shape === 'crown') {
        // Boss: small crown triangle
        g.fillTriangle(px - 5, cy + 3, px, cy - 5, px + 5, cy + 3);
        g.fillStyle(0xff4444, 0.9);
        g.fillCircle(px, cy - 2, 2);
      }
      g.lineStyle(1, 0xffffff, 0.2);
      g.strokeCircle(px, cy, 5);
    });
  }
}
