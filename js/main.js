// ============================================================
// main.js — Phaser 3 game bootstrap
// ============================================================

window.game = new Phaser.Game({
  type:            Phaser.AUTO,    // WebGL → Canvas fallback
  width:           GAME_W,
  height:          GAME_H,
  parent:          'game-container',
  backgroundColor: '#0a0a1a',
  antialias:       true,

  // ── Responsive scaling — fits any screen size while keeping aspect ratio.
  // On desktop: canvas stays at native size up to screen bounds.
  // On mobile/tablet: canvas shrinks/grows to fill available space, centered.
  scale: {
    mode:         Phaser.Scale.FIT,
    autoCenter:   Phaser.Scale.CENTER_BOTH,
    width:        GAME_W,
    height:       GAME_H,
    expandParent: false,
  },

  // ── Input: ensure touch events are treated as pointer events ─────────
  input: {
    touch: {
      capture: true,  // capture touch so scrolling doesn't interfere
    },
  },

  scene: [BootScene, MenuScene, OyongHomeScene, LevelSelectScene, LoadoutScene, GameScene, UIScene, LevelCompleteScene],
});
