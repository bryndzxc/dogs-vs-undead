// ============================================================
// Projectile.js — Ranged attacks (puppy bones, husky frost balls)
// Moves right (toward incoming enemies) at a fixed speed.
// ============================================================

class Projectile {
  constructor(scene, x, y, dogType, damage, speed, lane, freeze, options) {
    this.scene   = scene;
    this.x       = x;
    this.y       = y;
    this.dogType = dogType;  // determines visual style
    this.damage  = damage;
    this.vx      = speed;    // px/s — positive = moving right toward enemies
    this.lane    = lane;
    this.freeze  = freeze;   // ms to freeze enemy on hit (0 = none)
    this.options = options || {};
    this.burn    = this.options.burn || null;
    this.impactColor = this.options.impactColor || null;

    this.gfx = scene.add.graphics().setDepth(15);
  }

  update(delta) {
    this.x += this.vx * delta / 1000;
    this.gfx.clear();
    drawProjectile(this.gfx, this.x, this.y, this.dogType);
  }

  destroy() {
    this.gfx.destroy();
  }
}
