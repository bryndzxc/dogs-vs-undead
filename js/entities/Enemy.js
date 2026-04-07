// ============================================================
// Enemy.js — Undead that advance right-to-left down a lane
// ============================================================

class Enemy {
  constructor(scene, x, y, lane, type) {
    this.scene  = scene;
    this.x      = x;
    this.y      = y;
    this.lane   = lane;
    this.type   = type;
    this.config = ENEMY_DEFS[type];

    this.hp    = this.config.hp;
    this.maxHp = this.config.hp;
    this.speed = this.config.speed;
    this.baseSpeed = this.config.speed;

    // Combat
    this.blockedBy      = null;
    this.lastAttackTime = 0;

    // Shield state (shielder only)
    this.shieldHp     = this.config.shieldHp   || 0;
    this.shieldBroken = false;

    // Jump state (jumper only) — arc over the first dog in the lane
    this.hasJumped    = false;
    this.jumping      = false;
    this.jumpProgress = 0;
    this.jumpDuration = 550;   // ms for the full arc
    this.jumpStartX   = 0;
    this.jumpEndX     = 0;
    this.jumpStartY   = 0;

    // Exploder state — detonates on first contact with a dog
    this.hasExploded  = false;

    // Boss state — rages at 50% HP
    this.raging       = false;
    this.bossChapter  = null;
    this.bossDef      = null;
    this.bossShieldHp = 0;
    this.bossShieldMax = 0;
    this.shieldRegenPause = 0;
    this.burstTimer   = 0;
    this.burstCooldownTimer = 0;
    this.summonTimer  = 0;

    // Visual state
    this.hitTimer    = 0;
    this.freezeTimer = 0;
    this.animTime    = 0;
    this.attackPulse = 0;
    this.recoilX     = 0;
    this.deathHandled = false;
    this.isDying     = false;
    this.deathTimer  = 0;
    this.deathDuration = this.type === 'boss' ? 620 : this.type === 'brute' ? 460 : 340;
    this.burnTimer   = 0;
    this.burnTickTimer = 0;
    this.burnDamage  = 0;
    this.burnTickInterval = 1000;

    // Phaser graphics
    this.gfx   = scene.add.graphics().setDepth(10);
    this.hpGfx = scene.add.graphics().setDepth(11);

    if (this.type === 'boss') {
      this.bossChapter = (typeof getChapterForLevel === 'function')
        ? (getChapterForLevel(scene.levelId)?.id || 1)
        : 1;
      this.bossDef = BOSS_CHAPTER_DEFS[this.bossChapter] || BOSS_CHAPTER_DEFS[1];
      this.maxHp = Math.round(this.maxHp * (this.bossDef.hpMult || 1));
      this.hp = this.maxHp;
      this.speed = this.config.speed * (this.bossDef.baseSpeedMult || 1);
      this.baseSpeed = this.speed;
      this.bossShieldMax = this.bossDef.shieldMax || 0;
      this.bossShieldHp = this.bossShieldMax;
      this.shieldRegenPause = 0;
      this.burstCooldownTimer = 1600;
      this.summonTimer = (this.bossDef.summonCooldown || 0) * 0.7;
    }
  }

  update(time, delta) {
    this.animTime += delta;
    if (this.hitTimer   > 0) this.hitTimer   -= delta;
    if (this.freezeTimer > 0) this.freezeTimer -= delta;
    if (this.attackPulse > 0) this.attackPulse = Math.max(0, this.attackPulse - delta / 180);
    if (this.shieldRegenPause > 0) this.shieldRegenPause -= delta;
    if (Math.abs(this.recoilX) < 0.35) this.recoilX = 0;
    else this.recoilX *= Math.pow(0.82, delta / 16.67);

    if (this.isDying) {
      this.deathTimer += delta;
      this.blockedBy = null;
      this.draw();
      return;
    }

    if (this.burnTimer > 0) {
      this.burnTimer = Math.max(0, this.burnTimer - delta);
      this.burnTickTimer -= delta;
      while (this.burnTickTimer <= 0 && this.burnTimer > 0 && this.hp > 0) {
        this.burnTickTimer += this.burnTickInterval;
        this.hp -= this.burnDamage;
        this.hitTimer = Math.max(this.hitTimer, 70);
        this.recoilX = Math.max(this.recoilX, 1.6);
        this.scene.spawnHitParticle(this.x, this.y - 6, 0xff8844);
        this.scene.spawnFloatingText(this.x, this.y - 44, `-${this.burnDamage}`, 0xff8844, {
          fontSize: '12px',
          duration: 520,
          scaleFrom: 0.8,
        });
      }
    }

    if (this.type === 'boss') this._updateBossMechanics(time, delta);

    const speed = this.freezeTimer > 0 ? this.speed * 0.08 : this.speed;

    // ── Jumper arc movement ───────────────────────────────────
    if (this.jumping) {
      this.jumpProgress += delta;
      const t  = Math.min(this.jumpProgress / this.jumpDuration, 1);
      this.x   = this.jumpStartX + (this.jumpEndX - this.jumpStartX) * t;
      // Parabola: peak at t=0.5, formula: -4 * peak * t * (t-1)
      this.y   = this.jumpStartY - 90 * 4 * t * (1 - t);
      if (t >= 1) {
        this.jumping = false;
        this.x = this.jumpEndX;
        this.y = this.jumpStartY;
      }
      this.draw();
      return;
    }

    // ── Jumper: detect first dog and initiate arc jump ────────
    if (this.type === 'jumper' && !this.hasJumped) {
      for (const dog of this.scene.dogs) {
        if (dog.lane !== this.lane) continue;
        if (this.x - 44 <= dog.x + 36 && this.x > dog.x) {
          // Trigger jump — land one cell to the left of the dog
          this.hasJumped    = true;
          this.jumping      = true;
          this.jumpProgress = 0;
          this.jumpStartX   = this.x;
          this.jumpEndX     = Math.max(BASE_X + 30, dog.x - GRID.CELL_W);
          this.jumpStartY   = this.y;
          this.scene.spawnFloatingText(this.x, this.y - 50, 'JUMP!', 0xffee44);
          SFX.jump();
          this.draw();
          return;
        }
      }
    }

    // Determine if a dog is blocking this enemy's path
    this.blockedBy = null;
    for (const dog of this.scene.dogs) {
      if (dog.lane !== this.lane) continue;
      // Blocked when front of enemy overlaps a dog cell
      if (this.x - 36 <= dog.x + 36 && this.x > dog.x - 10) {
        this.blockedBy = dog;
        break;
      }
    }

    // ── Smooth lane following — maintain minimum spacing ─────────────────
    // Instead of a hard stop, enemies gradually slow as they close the gap.
    // This prevents ugly stacking while movement stays natural and readable.
    // MIN_ENEMY_SPACING is center-to-center distance in pixels.
    const MIN_ENEMY_SPACING = 68; // roughly one enemy body width; tweak here

    let followSpeed = speed;
    if (!this.blockedBy) {
      for (const other of this.scene.enemies) {
        if (other === this || other.lane !== this.lane || other.isDying || other.hp <= 0) continue;
        const gap = this.x - other.x;
        if (other.x < this.x && gap < MIN_ENEMY_SPACING) {
          // Ramp from full speed (at MIN_SPACING) → 0 (at 45% of MIN_SPACING)
          const t = (gap - MIN_ENEMY_SPACING * 0.45) / (MIN_ENEMY_SPACING * 0.55);
          followSpeed = speed * Math.max(0, Math.min(1, t));
          break;
        }
      }
    }

    if (this.blockedBy) {
      // ── Exploder: detonate on first contact ──────────────────
      if (this.type === 'exploder' && !this.hasExploded) {
        this.hasExploded = true;
        this.scene.triggerExplosion(this);
        return; // scene handles removal
      }

      // Melee attack the blocking dog on cooldown
      if (time - this.lastAttackTime >= this.config.attackRate) {
        this.lastAttackTime = time;
        const dmg = (this.type === 'boss' && this.raging) ? this.config.rageDamage : this.config.damage;
        this.blockedBy.takeDamage(dmg);
        this.scene.spawnHitParticle(this.blockedBy.x, this.blockedBy.y, 0xff0000);
        this.attackPulse = 1;
      }
    } else {
      // Advance left at follow speed (may be reduced by spacing logic above)
      this.x -= followSpeed * delta / 1000;
    }

    // ── Boss rage trigger at 50% HP ───────────────────────────
    if (this.type === 'boss' && !this.raging && this.hp <= this.maxHp * this.config.rageThreshold) {
      this.raging = true;
      this.speed  = this.baseSpeed * this.config.rageSpeedMult;
      this.scene.spawnFloatingText(this.x, this.y - 70, '⚡ RAGE!', 0xff4400);
      this.scene.cameras.main.shake(200, 0.008);
      SFX.waveStart();
    }

    this.draw();
  }

  /** Apply freeze (ice-slow) for a given duration in ms */
  freeze(duration) {
    if (this.isDying) return;
    this.freezeTimer = Math.max(this.freezeTimer, duration);
  }

  takeDamage(amount) {
    if (this.isDying || this.hp <= 0) return;

    if (this.type === 'boss' && this.bossShieldHp > 0) {
      const throughPct = this.bossDef?.shieldThroughPct || 0.2;
      const through = Math.max(1, Math.round(amount * throughPct));
      this.bossShieldHp = Math.max(0, this.bossShieldHp - amount);
      this.hp -= through;
      this.hitTimer = 150;
      this.recoilX = Math.max(this.recoilX, 2.5);
      this.shieldRegenPause = this.bossDef?.shieldRegenDelay || 2200;
      this.scene.spawnFloatingText(this.x, this.y - 36, `-${through}`, 0xddeeff, {
        fontSize: '16px',
        scaleFrom: 0.9,
      });
      this.scene.spawnHitParticle(this.x, this.y, 0x99ccff);
      SFX.enemyHit();

      if (this.bossShieldHp <= 0) {
        this.scene.spawnShieldBreakBurst(this.x, this.y);
        this.scene.spawnFloatingText(this.x, this.y - 58, 'BOSS SHIELD DOWN!', 0x88ddff, {
          fontSize: '14px',
          duration: 1100,
        });
        SFX.shieldBreak();
      }
      return;
    }

    // Shielder shield absorbs a large fraction of each hit
    if (this.shieldHp > 0 && !this.shieldBroken) {
      const reduction = this.config.shieldReduction || 0;
      const through   = Math.max(1, Math.round(amount * (1 - reduction)));
      this.shieldHp  -= amount;   // shield depletes by the full hit value
      this.hp        -= through;
      this.hitTimer   = 150;
      this.recoilX = Math.max(this.recoilX, this.type === 'brute' ? 3.5 : 5);
      this.scene.spawnFloatingText(this.x, this.y - 36, `-${through}`, 0xccddff, {
        fontSize: '16px',
        scaleFrom: 0.9,
      });
      this.scene.spawnHitParticle(this.x, this.y, 0x8899cc);
      SFX.enemyHit();

      if (this.shieldHp <= 0) {
        this.shieldHp   = 0;
        this.shieldBroken = true;
        this.speed      = this.config.speedAfterBreak || this.speed;
        this.scene.spawnShieldBreakBurst(this.x, this.y);
        this.scene.spawnFloatingText(this.x, this.y - 56, 'SHIELD BREAK!', 0x88ccff, {
          fontSize: '14px',
          duration: 1050,
        });
        SFX.shieldBreak();
      }
      return;
    }

    // Normal damage
    this.hp -= amount;
    this.hitTimer = 150;
    this.recoilX = Math.max(this.recoilX, this.type === 'boss' ? 2.5 : this.type === 'brute' ? 3.5 : 5.5);
    this.scene.spawnFloatingText(this.x, this.y - 38, `-${amount}`, 0xffaa00, {
      fontSize: this.type === 'boss' ? '18px' : '16px',
      scaleFrom: this.type === 'boss' ? 1.15 : 0.95,
      duration: this.type === 'boss' ? 950 : 820,
    });
    this.scene.spawnHitParticle(this.x, this.y, 0xffffff);
    SFX.enemyHit();
  }

  applyBurn(damage, duration, tickInterval) {
    if (this.isDying || this.hp <= 0) return;
    this.burnDamage = Math.max(this.burnDamage, Math.max(1, Math.round(damage || 1)));
    this.burnTimer = Math.max(this.burnTimer, duration || 0);
    this.burnTickInterval = Math.max(250, Math.round(tickInterval || 1000));
    this.burnTickTimer = Math.min(this.burnTickTimer || this.burnTickInterval, this.burnTickInterval);
  }

  draw() {
    const flash = this.hitTimer > 0;
    const anim  = this.animTime / 600;
    const pulse = this.attackPulse;
    const deathT = this.isDying ? Math.min(1, this.deathTimer / this.deathDuration) : 0;
    const scaleX = (1 + pulse * 0.06) * (1 - deathT * 0.18);
    const scaleY = (1 - pulse * 0.04) * (1 - deathT * 0.28);
    const idleBob = this.isDying
      ? 0
      : Math.sin(this.animTime / 230 + this.lane * 0.8) * (this.type === 'boss' ? 2.2 : this.type === 'brute' ? 1.7 : 1.3);
    const hitShake = flash
      ? Math.sin(this.animTime / 16) * (this.type === 'boss' ? 1.9 : 1.35) * (this.hitTimer / 150)
      : 0;
    const drawX = this.x + this.recoilX + hitShake - deathT * (this.type === 'boss' ? 4 : 8);
    const drawY = this.y + idleBob + deathT * (this.type === 'boss' ? 16 : 10);

    this.gfx.clear();
    this.gfx.setScale(scaleX, scaleY);
    this.gfx.setAlpha(1 - deathT * 0.92);
    if (this.type === 'shielder') {
      drawShielder(this.gfx, drawX, drawY, flash, anim, this.shieldBroken);
    } else {
      drawEnemyByType(this.gfx, drawX, drawY, this.type, flash, anim, {
        jumping: this.jumping,
        raging:  this.raging,
        dying:   this.isDying,
        deathT,
        chapter: this.bossChapter || 1,
      });
    }

    if (this.type === 'boss') {
      const accent = this.bossDef?.accentColor || 0xff6644;
      this.gfx.lineStyle(4, accent, this.raging ? 0.32 : 0.18);
      this.gfx.strokeCircle(drawX, drawY - 6, this.raging ? 58 : 54);
    }

    if (this.freezeTimer > 0) {
      const freezeR = this.type === 'brute' ? 42 : this.type === 'boss' ? 52 : 30;
      drawFreezeOverlay(this.gfx, drawX, drawY, freezeR);
    }

    if (this.burnTimer > 0) {
      const burnPulse = (Math.sin(this.animTime / 90) + 1) / 2;
      this.gfx.fillStyle(0xff8844, 0.12 + burnPulse * 0.1);
      this.gfx.fillCircle(drawX, drawY - 8, this.type === 'boss' ? 36 : this.type === 'brute' ? 28 : 22);
      this.gfx.fillStyle(0xffcc66, 0.55);
      this.gfx.fillCircle(drawX - 10, drawY - 26 - burnPulse * 3, 3.5);
      this.gfx.fillCircle(drawX + 6, drawY - 30 - burnPulse * 2, 2.8);
      this.gfx.fillCircle(drawX + 14, drawY - 18 - burnPulse * 4, 2.2);
    }

    // HP bar — sized per enemy type
    this.hpGfx.clear();
    this.hpGfx.setAlpha(this.isDying ? Math.max(0, 1 - deathT * 1.35) : 1);
    const isBig = this.type === 'brute' || this.type === 'boss';
    const bw = this.type === 'boss' ? 72 : isBig ? 62 : 52;
    const bh = this.type === 'boss' ? 6  : 5;
    const bx = drawX - bw / 2;
    const by = this.type === 'boss' ? drawY - 82 : isBig ? drawY - 70 : drawY - 60;
    this.hpGfx.fillStyle(0x000000, 0.6);
    this.hpGfx.fillRect(bx, by, bw, bh);
    const pct = Math.max(0, this.hp / this.maxHp);
    const col = this.type === 'boss'
      ? (this.raging ? 0xff6600 : (pct > 0.6 ? 0xee2222 : pct > 0.3 ? 0xff6600 : 0xff2200))
      : (pct > 0.6 ? 0x22dd22 : pct > 0.3 ? 0xffdd00 : 0xff3300);
    this.hpGfx.fillStyle(col, 1);
    this.hpGfx.fillRect(bx, by, bw * pct, bh);

    // Boss name label above HP bar
    if (this.type === 'boss') {
      this.hpGfx.fillStyle(0x000000, 0.55);
      this.hpGfx.fillRoundedRect(bx - 2, by - 14, bw + 4, 13, 3);
      if (this.bossShieldHp > 0 && this.bossShieldMax > 0) {
        drawShieldHpBar(this.hpGfx, drawX, drawY - 12, this.bossShieldHp, this.bossShieldMax);
      }
    }

    // Shielder: extra shield HP bar above the body bar
    if (this.type === 'shielder' && !this.shieldBroken) {
      drawShieldHpBar(this.hpGfx, drawX, drawY, this.shieldHp, this.config.shieldHp);
    }
  }

  startDeath() {
    if (this.isDying) return;
    this.isDying = true;
    this.deathTimer = 0;
    this.hp = 0;
    this.blockedBy = null;
    this.freezeTimer = 0;
    this.burnTimer = 0;
    this.recoilX = Math.max(this.recoilX, this.type === 'boss' ? 4 : this.type === 'brute' ? 5 : 7);
  }

  isDeathComplete() {
    return this.isDying && this.deathTimer >= this.deathDuration;
  }

  destroy() {
    this.gfx.destroy();
    this.hpGfx.destroy();
  }

  _updateBossMechanics(time, delta) {
    if (!this.bossDef) return;

    if (this.bossShieldMax > 0 && this.bossShieldHp < this.bossShieldMax && this.shieldRegenPause <= 0) {
      const prev = this.bossShieldHp;
      this.bossShieldHp = Math.min(
        this.bossShieldMax,
        this.bossShieldHp + (this.bossDef.shieldRegenRate || 0) * delta / 1000
      );
      if (prev <= 0 && this.bossShieldHp > 0) {
        this.scene.spawnFloatingText(this.x, this.y - 58, 'SHIELD REFORMED', 0x9fd8ff, {
          fontSize: '13px',
          duration: 900,
        });
      }
    }

    if (this.bossDef.burstCooldown) {
      if (this.burstTimer > 0) {
        this.burstTimer -= delta;
        this.speed = this.baseSpeed * (this.bossDef.burstSpeedMult || 2);
      } else {
        this.speed = this.raging
          ? this.baseSpeed * this.config.rageSpeedMult
          : this.baseSpeed;
        this.burstCooldownTimer -= delta;
        if (!this.blockedBy && this.burstCooldownTimer <= 0) {
          this.burstTimer = this.bossDef.burstDuration || 1000;
          this.burstCooldownTimer = this.bossDef.burstCooldown || 4000;
          this.scene.spawnFloatingText(this.x, this.y - 54, 'BURST!', 0xff8844, {
            fontSize: '14px',
            duration: 700,
          });
          this.scene.spawnImpactRing(this.x, this.y, 0xff8844, 34, 2.8, 240);
        }
      }
    }

    if (this.bossDef.summonCooldown) {
      this.summonTimer -= delta;
      if (this.summonTimer <= 0) {
        this.summonTimer = this.bossDef.summonCooldown;
        this.scene.spawnBossMinions(this, this.bossDef);
      }
    }
  }
}
