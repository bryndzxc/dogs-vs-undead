// ============================================================
// LeaderboardScene.js — Wave Challenge leaderboard display
//
// Fetches the leaderboard from CloudService and displays top
// players ranked by wave_best (highest wave survived).
// Highlights the current logged-in player's entry.
// ============================================================

class LeaderboardScene extends Phaser.Scene {
  constructor() { super({ key: 'LeaderboardScene' }); }

  init(data) {
    this._fromScene = (data && data.from) || 'OyongHomeScene';
  }

  create() {
    AudioManager.playMusic('home');
    this._buildBackground();
    this._buildPanel();
    this._buildHeader();
    this._buildLoadingRow();
    this._buildBackButton();
    this._playEntryFade();
    this._loadLeaderboard();
  }

  _buildBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x07111f, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    // Stars
    g.fillStyle(0xffffff, 0.45);
    [[80,35],[200,60],[320,20],[450,50],[580,30],[720,55],[850,25],
     [140,90],[380,80],[630,100],[780,70],[920,45],[50,120],[760,115]
    ].forEach(([sx, sy]) => g.fillCircle(sx, sy, 1.5));
    // Ground strip
    g.fillStyle(0x1d4214, 1);
    g.fillRect(0, GAME_H - 50, GAME_W, 50);
    g.fillStyle(0x2b6620, 1);
    g.fillRect(0, GAME_H - 50, GAME_W, 6);
    // Overlay
    const ov = this.add.graphics().setDepth(2);
    ov.fillStyle(0x000000, 0.55);
    ov.fillRect(0, 0, GAME_W, GAME_H);
  }

  _buildPanel() {
    const pw = Math.min(700, GAME_W - 60);
    const ph = 480;
    this._px = (GAME_W - pw) / 2;
    this._py = (GAME_H - ph) / 2 - 16;
    this._pw = pw;
    this._ph = ph;

    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x0c1730, 0.98);
    g.fillRoundedRect(this._px, this._py, pw, ph, 14);
    g.lineStyle(2.5, 0xffd700, 1);
    g.strokeRoundedRect(this._px, this._py, pw, ph, 14);
    g.fillStyle(0xffd700, 0.08);
    g.fillRoundedRect(this._px, this._py, pw, 56, { tl: 14, tr: 14, bl: 0, br: 0 });
  }

  _buildHeader() {
    const cx = GAME_W / 2;
    const py = this._py;

    this.add.text(cx, py + 28, '⚡ WAVE CHALLENGE', {
      fontSize: '26px', fontFamily: 'Arial Black',
      color: '#ffd700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);

    this.add.text(cx, py + 60, 'LEADERBOARD', {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: '#bb88ff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    // Column headers
    const rowY = py + 88;
    const cols = this._colPositions();
    this.add.text(cols.rank,  rowY, '#',         { fontSize: '11px', fontFamily: 'Arial Black', color: '#667799' }).setOrigin(0.5).setDepth(5);
    this.add.text(cols.name,  rowY, 'PLAYER',     { fontSize: '11px', fontFamily: 'Arial Black', color: '#667799' }).setOrigin(0, 0.5).setDepth(5);
    this.add.text(cols.wave,  rowY, 'BEST WAVE',  { fontSize: '11px', fontFamily: 'Arial Black', color: '#667799' }).setOrigin(0.5, 0.5).setDepth(5);
    this.add.text(cols.score, rowY, 'SCORE',      { fontSize: '11px', fontFamily: 'Arial Black', color: '#667799' }).setOrigin(1, 0.5).setDepth(5);

    // Divider
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(1, 0x2a4a6a, 0.8);
    g.lineBetween(this._px + 16, rowY + 12, this._px + this._pw - 16, rowY + 12);
  }

  _buildLoadingRow() {
    const cx = GAME_W / 2;
    this._loadingTxt = this.add.text(cx, this._py + this._ph / 2, 'Loading…', {
      fontSize: '18px', fontFamily: 'Arial', color: '#4466aa',
    }).setOrigin(0.5).setDepth(5);
  }

  _buildBackButton() {
    const cx = GAME_W / 2;
    const by = this._py + this._ph - 36;

    const W = 180, H = 40;
    const bg = this.add.graphics().setDepth(6);
    const draw = col => {
      bg.clear();
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(cx - W / 2, by - H / 2, W, H, 8);
      bg.lineStyle(1.5, 0xffd700, 0.35);
      bg.strokeRoundedRect(cx - W / 2, by - H / 2, W, H, 8);
    };
    draw(0x1a2a3a);

    const txt = this.add.text(cx, by, '← Back', {
      fontSize: '18px', fontFamily: 'Arial Black',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });
    txt.on('pointerover',  () => { draw(0x2a4a6a); txt.setScale(1.04); });
    txt.on('pointerout',   () => { draw(0x1a2a3a); txt.setScale(1); });
    txt.on('pointerdown',  () => {
      SFX.click();
      GameState.selectedDog = null;
      this.scene.start(this._fromScene === 'WaveGameOverScene' ? 'OyongHomeScene' : this._fromScene);
    });
  }

  _colPositions() {
    const left = this._px + 24;
    const right = this._px + this._pw - 24;
    return {
      rank:  left + 14,
      name:  left + 44,
      wave:  GAME_W / 2 + 60,
      score: right,
    };
  }

  async _loadLeaderboard() {
    try {
      let entries = [];
      if (typeof CloudService !== 'undefined') {
        entries = await CloudService.fetchLeaderboard();
      }
      this._showEntries(entries);
    } catch (_e) {
      this._showError();
    }
  }

  _showEntries(entries) {
    if (this._loadingTxt) { this._loadingTxt.destroy(); this._loadingTxt = null; }

    const currentUser = (typeof AuthService !== 'undefined' && AuthService.getCurrentUser)
      ? AuthService.getCurrentUser()
      : null;
    const currentUsername = currentUser ? currentUser.username : null;

    if (!entries || entries.length === 0) {
      this.add.text(GAME_W / 2, this._py + this._ph / 2, 'No entries yet. Be the first!', {
        fontSize: '16px', fontFamily: 'Arial', color: '#4466aa',
      }).setOrigin(0.5).setDepth(5);
      return;
    }

    // Sort by wave_best desc, then score desc
    const sorted = [...entries].sort((a, b) => {
      const wa = Number(a.metadata?.wave_best || a.wave_best || 0);
      const wb = Number(b.metadata?.wave_best || b.wave_best || 0);
      if (wb !== wa) return wb - wa;
      return (Number(b.score || 0)) - (Number(a.score || 0));
    });

    const cols   = this._colPositions();
    const startY = this._py + 108;
    const rowH   = 32;
    const maxRows = Math.floor((this._ph - 140) / rowH);
    const g      = this.add.graphics().setDepth(5);

    let currentRank = -1;

    sorted.slice(0, maxRows).forEach((entry, i) => {
      const y       = startY + i * rowH + rowH / 2;
      const rank    = i + 1;
      const name    = entry.username || entry.name || '—';
      const waveBest = Number(entry.metadata?.wave_best || entry.wave_best || 0);
      const score   = Number(entry.score || 0);
      const isMe    = currentUsername && name.toLowerCase() === currentUsername.toLowerCase();

      if (isMe) currentRank = rank;

      // Row highlight for current user
      if (isMe) {
        g.fillStyle(0xffd700, 0.09);
        g.fillRoundedRect(this._px + 8, y - rowH / 2 + 1, this._pw - 16, rowH - 2, 5);
        g.lineStyle(1, 0xffd700, 0.35);
        g.strokeRoundedRect(this._px + 8, y - rowH / 2 + 1, this._pw - 16, rowH - 2, 5);
      } else if (i % 2 === 0) {
        g.fillStyle(0xffffff, 0.03);
        g.fillRoundedRect(this._px + 8, y - rowH / 2 + 1, this._pw - 16, rowH - 2, 4);
      }

      // Medal for top 3
      const rankColor = rank === 1 ? '#ffd700' : rank === 2 ? '#cccccc' : rank === 3 ? '#cc8844' : '#4466aa';
      const rankLabel = rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : String(rank);

      this.add.text(cols.rank, y, rankLabel, {
        fontSize: rank <= 3 ? '16px' : '13px', fontFamily: 'Arial Black',
        color: rankColor,
      }).setOrigin(0.5).setDepth(6);

      this.add.text(cols.name, y, name.length > 18 ? name.slice(0, 16) + '…' : name, {
        fontSize: '14px', fontFamily: isMe ? 'Arial Black' : 'Arial',
        color: isMe ? '#ffd700' : '#c8daf0',
      }).setOrigin(0, 0.5).setDepth(6);

      this.add.text(cols.wave, y, waveBest > 0 ? `Wave ${waveBest}` : '—', {
        fontSize: '14px', fontFamily: 'Arial Black',
        color: isMe ? '#ffd700' : '#88eecc',
      }).setOrigin(0.5, 0.5).setDepth(6);

      this.add.text(cols.score, y, score > 0 ? score.toLocaleString() : '—', {
        fontSize: '12px', fontFamily: 'Arial',
        color: isMe ? '#ffd700' : '#8899bb',
      }).setOrigin(1, 0.5).setDepth(6);
    });

    // "Your rank" footer if current user not in top N
    const cx = GAME_W / 2;
    if (currentUsername) {
      const rankMsg = currentRank > 0
        ? `Your rank: #${currentRank}`
        : 'Play Wave Challenge to appear on the board!';
      this.add.text(cx, this._py + this._ph - 62, rankMsg, {
        fontSize: '11px', fontFamily: 'Arial', color: '#5566aa',
      }).setOrigin(0.5).setDepth(5);
    } else {
      this.add.text(cx, this._py + this._ph - 62, 'Sign in to appear on the leaderboard.', {
        fontSize: '11px', fontFamily: 'Arial', color: '#5566aa',
      }).setOrigin(0.5).setDepth(5);
    }
  }

  _showError() {
    if (this._loadingTxt) { this._loadingTxt.destroy(); this._loadingTxt = null; }
    this.add.text(GAME_W / 2, this._py + this._ph / 2, 'Could not load leaderboard.', {
      fontSize: '15px', fontFamily: 'Arial', color: '#aa4444',
    }).setOrigin(0.5).setDepth(5);
  }

  _playEntryFade() {
    const fade = this.add.graphics().setDepth(200);
    fade.fillStyle(0x000000, 1);
    fade.fillRect(0, 0, GAME_W, GAME_H);
    this.tweens.add({ targets: fade, alpha: 0, duration: 350, ease: 'Quad.Out',
      onComplete: () => fade.destroy() });
  }
}
