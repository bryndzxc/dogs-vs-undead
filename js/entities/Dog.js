// ============================================================
// Dog.js — Player-placed defender units
// ============================================================

class Dog {
  constructor(scene, col, lane, type) {
    this.scene  = scene;   // GameScene reference
    this.col    = col;
    this.lane   = lane;
    this.type   = type;
    // Shallow copy so upgrade() can mutate stats without affecting DOG_DEFS
    this.config = Object.assign({}, DOG_DEFS[type]);

    // World position (grid cell center)
    this.x = gridX(col);
    this.y = laneY(lane);

    // Evolution level (1–3)
    this.level = 1;

    // Combat
    this.hp             = this.config.hp;
    this.maxHp          = this.config.hp;
    this.lastAttackTime = 0;
    this.target         = null;

    // Visual state
    this.hitTimer = 0;   // ms remaining for red-flash
    this.recoilX  = 0;   // visual kick-back on attack
    this.attackPulse = 0;

    // Treat Pup passive income
    this.lastTreatTime = null;  // null = not yet seeded; seeded on first update

    // Phaser graphics objects — cleared & redrawn every frame
    this.gfx   = scene.add.graphics().setDepth(10);
    this.hpGfx = scene.add.graphics().setDepth(11);
  }

  // ── Evolution ─────────────────────────────────────────────────

  /**
   * Evolve this dog to the next level (1→2 or 2→3).
   * Boosts stats proportionally and unlocks level-3 special abilities.
   * Returns false if already at max level.
   */
  upgrade() {
    if (this.level >= 3) return false;
    this.level++;

    const base  = DOG_DEFS[this.type];
    const mults = UPGRADE_STAT_MULT[this.level];

    // Preserve current HP percentage across the upgrade
    const hpPct    = this.hp / this.maxHp;
    this.maxHp     = Math.round(base.hp * mults.hp);
    this.hp        = Math.round(this.maxHp * hpPct);

    // Attack stats (treat_pup has no attack — values remain 0)
    if (base.attack > 0) {
      this.config.attack     = Math.round(base.attack     * mults.attack);
      this.config.attackRate = Math.round(base.attackRate * mults.attackRate);
    }

    if (base.treatAmount) {
      this.config.treatAmount = Math.round(base.treatAmount * mults.treatAmount);
      this.config.treatRate   = Math.round(base.treatRate   * mults.treatRate);
    }

    if (base.burnDamage) {
      this.config.burnDamage   = Math.max(1, Math.round(base.burnDamage * mults.attack));
      this.config.burnDuration = base.burnDuration;
      this.config.burnTick     = base.burnTick;
    }

    // ── Level-3 special abilities ────────────────────────────
    if (this.level === 3) {
      // bark_pup: dual projectile (fires 2 shots per attack)
      if (this.type === 'bark_pup')  this.config.dualShot = true;
      // guard_dog: 20% damage reduction
      if (this.type === 'guard_dog') this.config.damageReduction = 0.20;
      // frost_pup: doubled freeze duration
      if (this.type === 'frost_pup') this.config.freeze = base.freeze * 2;
      if (this.type === 'sniper_oyong') this.config.attack = Math.round(this.config.attack * 1.2);
      if (this.type === 'fire_oyong') {
        this.config.burnDamage = Math.round(this.config.burnDamage * 1.5);
        this.config.burnDuration = base.burnDuration + 1800;
      }
      if (this.type === 'chain_oyong') this.config.chainTargets = (base.chainTargets || 3) + 1;
      if (this.type === 'guardian_oyong') this.config.damageReduction = 0.28;
    }

    return true;
  }

  // ── Main update ───────────────────────────────────────────────

  update(time, delta) {
    // Tick timers
    if (this.hitTimer > 0) this.hitTimer -= delta;
    this.recoilX *= 0.72;
    if (this.attackPulse > 0) this.attackPulse = Math.max(0, this.attackPulse - delta / 170);
    if (Math.abs(this.recoilX) < 0.4) this.recoilX = 0;

    const bob = Math.sin(time / 500) * 3;

    if (this.config.treatAmount && this.config.treatRate) {
      if (this.lastTreatTime === null) this.lastTreatTime = time;

      // Prep-phase throttle: run at 50% speed when no wave is active.
      // Rewards planning (Treat Oyong still useful before wave) but prevents
      // AFK farming — just double the cooldown during idle/prep phase.
      const inPrepPhase    = this.scene.wavePhase === 'idle';
      const effectiveRate  = inPrepPhase ? this.config.treatRate * 2 : this.config.treatRate;

      if (time - this.lastTreatTime >= effectiveRate) {
        this.lastTreatTime = time;
        const amount = this.config.treatAmount;
        this.scene.treats += amount;
        this.scene.spawnFloatingText(this.x, this.y - 44, `+${amount}`, 0xffd700);
        this.scene.spawnTreatBurst(this.x, this.y);
        this.scene._treatBounce = 4;
        SFX.treatGain();
      }
    }

    // ── Combat dogs: find target + attack ─────────────────────
    const enemiesInRange = this._getEnemiesInRange();
    this.target = this._pickTarget(enemiesInRange);

    if (this.target && this.config.attack > 0 &&
        time - this.lastAttackTime >= this.config.attackRate) {
      this.attack(time, enemiesInRange);
    }

    this.draw(time, bob);
  }

  _getEnemiesInRange() {
    const rangePixels = this.config.range * GRID.CELL_W;
    const enemies = [];
    for (const e of this.scene.enemies) {
      if (e.isDying || e.hp <= 0) continue;
      if (e.lane !== this.lane) continue;
      if (e.x < this.x || e.x > this.x + rangePixels) continue;
      enemies.push(e);
    }
    enemies.sort((a, b) => a.x - b.x);
    return enemies;
  }

  _pickTarget(enemiesInRange) {
    if (!enemiesInRange.length) return null;
    if (this.config.targeting === 'farthest') return enemiesInRange[enemiesInRange.length - 1];
    return enemiesInRange[0];
  }

  attack(time, enemiesInRange) {
    this.lastAttackTime = time;
    const damageMult = this.scene.getEarlyWaveDamageMultiplier
      ? this.scene.getEarlyWaveDamageMultiplier(time)
      : 1;
    const attackPower = Math.max(1, Math.round(this.config.attack * damageMult));

    if (this.config.attackMode === 'chain') {
      const targets = enemiesInRange.slice(0, this.config.chainTargets || 3);
      if (targets.length === 0) return;
      let originX = this.x + 16;
      let originY = this.y - 10;
      targets.forEach((enemy, idx) => {
        const dmg = Math.max(1, Math.round(attackPower * Math.pow(this.config.chainFalloff || 0.72, idx)));
        enemy.takeDamage(dmg);
        if (this.scene.spawnChainArc) {
          this.scene.spawnChainArc(originX, originY, enemy.x, enemy.y - 8, idx === 0 ? 0xe7ddff : 0xbc8cff);
        }
        this.scene.spawnImpactRing(enemy.x, enemy.y, 0xbb88ff, 18 + idx * 4, 1.5, 140);
        this.scene.spawnHitParticle(enemy.x, enemy.y, 0xd7b8ff);
        originX = enemy.x;
        originY = enemy.y - 8;
      });
      this.recoilX = -6;
      this.attackPulse = 1;
      SFX.attack();
      return;
    }

    if (this.config.projSpeed === 0) {
      // Melee — instant damage
      this.target.takeDamage(attackPower);
      this.recoilX = -10;
      this.attackPulse = 1;
      this.scene.spawnHitParticle(this.target.x, this.target.y, 0xffd700);
      SFX.meleehit();
    } else {
      // Ranged — spawn projectile(s)
      const bobY = Math.sin(this.scene.time.now / 500) * 3;
      const projectileOptions = this._buildProjectileOptions();

      if (this.config.dualShot) {
        // Level-3 bark_pup: two simultaneous projectiles with vertical spread
        for (const yOff of [-9, 9]) {
          const proj = new Projectile(
            this.scene,
            this.x + 24,
            this.y + bobY + yOff,
            this.type,
            attackPower,
            this.config.projSpeed,
            this.lane,
            this.config.freeze,
            projectileOptions
          );
          this.scene.projectiles.push(proj);
        }
      } else {
        const proj = new Projectile(
          this.scene,
          this.x + 24,
          this.y + bobY,
          this.type,
          attackPower,
          this.config.projSpeed,
          this.lane,
          this.config.freeze,
          projectileOptions
        );
        this.scene.projectiles.push(proj);
      }

      this.recoilX = -7;
      this.attackPulse = 1;
      SFX.attack();
    }
  }

  _buildProjectileOptions() {
    const options = {};
    if (this.type === 'sniper_oyong') options.impactColor = 0xa8d8ff;
    if (this.type === 'treat_pup') options.impactColor = 0xffe38a;
    if (this.type === 'fire_oyong') {
      options.impactColor = 0xff8844;
      options.burn = {
        damage: this.config.burnDamage,
        duration: this.config.burnDuration,
        tick: this.config.burnTick,
      };
    }
    return options;
  }

  takeDamage(amount) {
    // Level-3 Guard Dog: 20% damage reduction
    if (this.config.damageReduction) {
      amount = Math.max(1, Math.round(amount * (1 - this.config.damageReduction)));
    }
    this.hp -= amount;
    this.hitTimer = 200;
    this.scene.spawnFloatingText(this.x, this.y - 34, `-${amount}`, 0xff4444);
  }

  draw(time, bob) {
    const cx = this.x + this.recoilX;
    const pulse = this.attackPulse;
    const cy = this.y + bob - pulse * 3;
    const scaleX = 1 + pulse * 0.05;
    const scaleY = 1 - pulse * 0.035;

    this.gfx.clear();
    this.gfx.setScale(scaleX, scaleY);

    // Evolution aura (drawn behind the dog so the dog sits on top)
    if (this.level >= 2) {
      drawEvolutionEffects(this.gfx, cx, cy, this.level, this.type, time);
    }

    // Pass time as animTime so blink and tail-wag animate in-game
    drawDogByType(this.gfx, cx, cy, this.type, this.hitTimer > 0, time);

    // HP bar + level pips — positioned above the scaled dog
    // Ear tips reach cy - 56*1.20 ≈ cy - 67, so bar sits at cy - 74
    this.hpGfx.clear();
    const bw = 52, bh = 6;
    const bx = cx - bw / 2;
    const by = cy - 74;
    this.hpGfx.fillStyle(0x000000, 0.55);
    this.hpGfx.fillRect(bx, by, bw, bh);
    const pct = Math.max(0, this.hp / this.maxHp);
    const col = pct > 0.6 ? 0x22dd22 : pct > 0.3 ? 0xffdd00 : 0xff3300;
    this.hpGfx.fillStyle(col, 1);
    this.hpGfx.fillRect(bx, by, bw * pct, bh);

    // Level pips — always shown so the player knows upgrades exist
    const pipY = by + bh + 5;
    for (let i = 0; i < 3; i++) {
      const px = cx - 10 + i * 10;
      const filled = i < this.level;
      const pipColor = (this.level === 3 && filled) ? 0xffd700
                     : filled                        ? 0x66aaff
                     :                                 0x1e2e3e;
      this.hpGfx.fillStyle(pipColor, filled ? 1 : 0.35);
      this.hpGfx.fillCircle(px, pipY, filled ? 4 : 3);
      // Gold ring on each level-3 pip
      if (filled && this.level === 3) {
        this.hpGfx.lineStyle(1.5, 0xffd700, 0.85);
        this.hpGfx.strokeCircle(px, pipY, 5.5);
      }
    }
  }

  destroy() {
    this.gfx.destroy();
    this.hpGfx.destroy();
  }
}
