// ============================================================
// BootScene.js — Minimal boot; jumps straight to GameScene
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  create() {
    this.add.text(GAME_W / 2, GAME_H / 2, 'Loading Dogs vs Undead...', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ffe28a',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    Promise.resolve()
      .then(() => {
        if (typeof OverlayUI !== 'undefined' && OverlayUI.init) OverlayUI.init();
      })
      .then(() => {
        if (typeof AuthService !== 'undefined' && AuthService.initialize) {
          return AuthService.initialize();
        }
        return null;
      })
      .catch(() => {
        if (typeof AuthService !== 'undefined' && AuthService.clearSession) {
          AuthService.clearSession();
        }
      })
      .finally(() => {
        // Show first-time tutorial before entering the game. Resolves immediately if already done.
        if (typeof TutorialUI !== 'undefined') {
          TutorialUI.show(() => this.scene.start('MenuScene'));
        } else {
          this.scene.start('MenuScene');
        }
      });
  }
}
