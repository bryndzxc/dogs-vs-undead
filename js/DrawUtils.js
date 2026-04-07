// ============================================================
// DrawUtils.js — All visuals drawn with Phaser 3 Graphics only.
// No external images, sprites, or asset files used.
//
// ════════════════════════════════════════════════════════════
// HOW THE MASCOT DOG IS CONSTRUCTED (layer order, back→front):
//
//  1. TAIL       — filled circle, x-position driven by sin(animTime/280)
//                  to produce a left-right wagging motion
//  2. BODY       — fillEllipse, cream/white/ice-blue depending on variant
//  3. LEGS       — two fillRoundedRect stubs below the body
//  4. EAR OUTER  — two fillTriangle calls (tall pointed, amber/brown)
//                  ★ Key silhouette feature: tip is ~32px above head top
//  5. HEAD       — fillCircle, drawn over ear bases to hide rough join
//  6. EAR INNER  — two fillTriangle calls (pink, slightly smaller)
//                  Sits inside the outer ear to give depth
//  7. CHEEK FLUFFS — two fillEllipse calls extending sideways from head
//                    create the puffy cheek fur of the reference dog
//  8. CHEST FLUFF  — three layered fillEllipse calls (white/cream)
//                    brightest layer on top — prominent fluffy chest
//  9. FACE MARKINGS — two fillEllipse over the eye areas (brown/dark/blue)
//                     echoes the brown patches around the eyes of the dog photo
// 10. MUZZLE     — fillEllipse, lighter colour — defines the snout area
// 11. EYES       — fillCircle ×2 + white shine dots
//                  Blink: animTime % 3500 < 130 → draws closed-eye lines instead
// 12. NOSE       — fillEllipse (black oval) + tiny grey shine
// 13. MOUTH      — strokePath two-line smile
//
// ── WHERE TO TWEAK ──────────────────────────────────────────
//  Ear height/angle : edit fillTriangle coords in drawDogBase(), "EAR OUTER" section
//  Ear width        : move the base-outer x-coord (currently ±22 from center)
//  Cheek size       : edit the 17/20 axes in "CHEEK FLUFFS" section
//  Chest fluff size : edit the ellipse sizes in "CHEST FLUFF" section
//  Face markings    : edit the 12/8 axes in "FACE MARKINGS" section
//  Colors per unit  : edit the DOG_COLORS object below
//  Blink speed      : change 3500 (cycle ms) and 130 (blink hold ms)
//  Tail wag speed   : change 280 (lower = faster wag)
//  Body proportions : edit the 46/38 axes of the body fillEllipse
// ════════════════════════════════════════════════════════════

// DOG_COLORS is defined in Config.js — accessible here as a global.

// ─── SHARED DOG BASE ─────────────────────────────────────────

/**
 * drawDogBase — renders the mascot dog silhouette.
 * Called by each variant's wrapper which then adds extra details.
 *
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} cx  — horizontal center
 * @param {number} cy  — vertical center (bob offset already applied by caller)
 * @param {object} col — color object from DOG_COLORS
 * @param {boolean} flash — hit-flash state (tints body reddish)
 * @param {number} animTime — ms counter driving tail wag + blink
 */
function drawDogBase(g, cx, cy, col, flash, animTime, S = 1.20) {
  // ── UNIT SCALE — passed per-variant so silhouettes differ by role ───────
  // All offsets from (cx, cy) are multiplied by S so the dog scales
  // proportionally around its center point. Each variant passes its own S.

  // Apply hit flash: lighten all colors toward red-white
  const body     = flash ? 0xffcccc : col.body;
  const marking  = flash ? 0xffaaaa : col.marking;
  const earOut   = flash ? 0xffbbaa : col.earOuter;
  const earIn    = flash ? 0xffddcc : col.earInner;
  const chest    = flash ? 0xffffff : col.chest;
  const dark     = flash ? 0x884444 : col.dark;

  // ── TAIL (wags left-right) ──────────────────────────────
  const tailX = Math.sin(animTime / 280) * 6 * S;
  g.fillStyle(body, 1);
  g.fillCircle(cx + 22*S + tailX, cy + 2*S, 10*S);
  g.fillStyle(chest, 0.45);
  g.fillCircle(cx + 24*S + tailX, cy, 6*S); // lighter curl tip

  // ── BODY ────────────────────────────────────────────────
  g.fillStyle(body, 1);
  g.fillEllipse(cx, cy + 4*S, 46*S, 38*S);

  // ── LEGS ────────────────────────────────────────────────
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 15*S, cy + 21*S, 11*S, 11*S, 3);
  g.fillRoundedRect(cx +  4*S, cy + 21*S, 11*S, 11*S, 3);

  // ── EAR OUTER (tall pointed triangles — key silhouette) ──
  // Left ear:  inner-base → tip → outer-base (all offsets scaled by S)
  // Right ear: mirrored
  g.fillStyle(earOut, 1);
  g.fillTriangle(cx - 6*S,  cy - 30*S,   cx - 18*S, cy - 56*S,   cx - 28*S, cy - 26*S);
  g.fillTriangle(cx + 6*S,  cy - 30*S,   cx + 18*S, cy - 56*S,   cx + 28*S, cy - 26*S);

  // ── HEAD (drawn over ear bases to clean up the join) ────
  g.fillStyle(body, 1);
  g.fillCircle(cx, cy - 16*S, 26*S);

  // ── EAR INNER (pink, slightly smaller — creates depth) ──
  g.fillStyle(earIn, 1);
  g.fillTriangle(cx - 8*S,  cy - 32*S,   cx - 16*S, cy - 52*S,   cx - 24*S, cy - 28*S);
  g.fillTriangle(cx + 8*S,  cy - 32*S,   cx + 16*S, cy - 52*S,   cx + 24*S, cy - 28*S);

  // ── CHEEK FLUFFS (two ellipses extending from head sides) ─
  g.fillStyle(body, 0.92);
  g.fillEllipse(cx - 24*S, cy - 14*S, 20*S, 24*S); // left cheek puff
  g.fillEllipse(cx + 24*S, cy - 14*S, 20*S, 24*S); // right cheek puff
  // Lighter centre of each puff
  g.fillStyle(chest, 0.28);
  g.fillEllipse(cx - 24*S, cy - 15*S, 14*S, 18*S);
  g.fillEllipse(cx + 24*S, cy - 15*S, 14*S, 18*S);

  // ── CHEST FLUFF (three layered ellipses — prominent white fluff) ─
  g.fillStyle(chest, 1);
  g.fillEllipse(cx, cy + 6*S, 30*S, 24*S);      // large base layer
  g.fillStyle(0xffffff, 0.82);
  g.fillEllipse(cx - 2, cy + 4*S, 22*S, 17*S); // mid layer
  g.fillStyle(0xffffff, 0.65);
  g.fillEllipse(cx + 3, cy + 2*S, 15*S, 12*S); // small front tuft

  // ── FACE MARKINGS (dark oval patches around eyes) ────────
  g.fillStyle(marking, 0.70);
  g.fillEllipse(cx - 9*S, cy - 20*S, 14*S, 9*S); // left eye patch
  g.fillEllipse(cx + 9*S, cy - 20*S, 14*S, 9*S); // right eye patch
  // Subtle forehead marking
  g.fillStyle(marking, 0.30);
  g.fillEllipse(cx, cy - 30*S, 12*S, 6*S);

  // ── MUZZLE (lighter oval — defines the snout area) ───────
  g.fillStyle(flash ? 0xffeedd : chest, 0.92);
  g.fillEllipse(cx, cy - 11*S, 20*S, 14*S);

  // ── EYES (blink animation every ~3.5 s) ──────────────────
  const blinkPhase = animTime % 3500;
  const blinking   = blinkPhase < 130;

  if (blinking) {
    // Closed: thin curved line (happy squint)
    g.lineStyle(2.5, dark, 0.9);
    g.lineBetween(cx - 12*S, cy - 20*S, cx - 6*S, cy - 21*S);
    g.lineBetween(cx + 12*S, cy - 20*S, cx + 6*S, cy - 21*S);
  } else {
    g.fillStyle(dark, 1);
    g.fillCircle(cx - 9*S, cy - 20*S, 4.5*S);
    g.fillCircle(cx + 9*S, cy - 20*S, 4.5*S);
    // White eye-shine dots
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 7*S,  cy - 22*S, 1.6*S);
    g.fillCircle(cx + 11*S, cy - 22*S, 1.6*S);
  }

  // ── NOSE (black oval — prominent feature) ────────────────
  g.fillStyle(0x111111, 1);
  g.fillEllipse(cx, cy - 10*S, 11*S, 7*S);
  // Tiny nose shine
  g.fillStyle(0x888888, 0.45);
  g.fillCircle(cx - 1, cy - 12*S, 1.6*S);

  // ── MOUTH (two-line smile) ────────────────────────────────
  g.lineStyle(1.8, dark, 0.6);
  g.beginPath();
  g.moveTo(cx - 4*S, cy - 5*S);
  g.lineTo(cx,       cy - 3*S);
  g.lineTo(cx + 4*S, cy - 5*S);
  g.strokePath();
}

// ─── DOG VARIANT WRAPPERS ────────────────────────────────────

/**
 * Bark Pup — Scout. Smaller, agile silhouette with speed-streak accents.
 * Extra: blue collar + tag + 3 speed lines on right (energetic identity).
 */
function drawBarkPup(g, cx, cy, flash, animTime) {
  const S = 1.0; // smaller than others — visually reads as quick/light
  drawDogBase(g, cx, cy, DOG_COLORS.bark_pup, flash, animTime, S);

  // Blue collar + small yellow tag
  g.fillStyle(flash ? 0x888888 : 0x3a6aaa, 1);
  g.fillRoundedRect(cx - 11*S, cy - 5*S, 22*S, 6*S, 3);
  g.fillStyle(0xdddd00, 1);
  g.fillCircle(cx, cy - 2*S, 2.4); // tag

  // Speed streaks — energetic/agile identity
  if (!flash) {
    g.lineStyle(1.5, 0xffff88, 0.55);
    g.lineBetween(cx + 26*S, cy - 8*S, cx + 36*S, cy - 8*S);
    g.lineBetween(cx + 24*S, cy - 2*S, cx + 33*S, cy - 2*S);
    g.lineBetween(cx + 26*S, cy + 4*S, cx + 34*S, cy + 4*S);
  }
}

/**
 * Guard Dog — Tank. Bulkier silhouette via wide shoulder-pad circles.
 * Extra: grey collar + red bandana + heavy shoulder pads (key silhouette marker).
 */
function drawGuardDog(g, cx, cy, flash, animTime) {
  const S = 1.20; // standard scale — width comes from shoulder pads, not scale
  drawDogBase(g, cx, cy, DOG_COLORS.guard_dog, flash, animTime, S);

  // Wide shoulder pads — key silhouette: makes Tank clearly wider than Scout
  g.fillStyle(flash ? 0xbbbbbb : 0x5a6a72, 1);
  g.fillEllipse(cx - 33*S, cy - 1*S, 20*S, 13*S);
  g.fillEllipse(cx + 33*S, cy - 1*S, 20*S, 13*S);
  g.fillStyle(flash ? 0xdddddd : 0x7d9099, 0.65);
  g.fillEllipse(cx - 33*S, cy - 2.5*S, 14*S, 8*S); // highlight left
  g.fillEllipse(cx + 33*S, cy - 2.5*S, 14*S, 8*S); // highlight right

  // Grey collar (drawn after shoulders so it appears on top)
  g.fillStyle(flash ? 0x999999 : 0x555555, 1);
  g.fillRoundedRect(cx - 12*S, cy - 5*S, 24*S, 7*S, 3);

  // Red bandana (downward-pointing triangle at chest top)
  if (!flash) {
    g.fillStyle(0xcc1500, 1);
    g.fillTriangle(cx - 10*S, cy - 1*S, cx + 10*S, cy - 1*S, cx, cy + 13*S);
    g.fillStyle(0xaa1000, 0.55);
    g.fillTriangle(cx - 7*S, cy + 1*S, cx + 7*S, cy + 1*S, cx, cy + 10*S);
  }
}

/**
 * Treat Pup — Economy/Support. Warm golden dog with heart icon + treat satchel.
 * Heart between ears = instantly readable support identity.
 * Extra: golden coin collar + heart above head + treat satchel + orbiting treats.
 */
function drawTreatPup(g, cx, cy, flash, animTime) {
  const S = 1.15; // medium scale; warmth reads from color + accessories
  drawDogBase(g, cx, cy, DOG_COLORS.treat_pup, flash, animTime, S);

  // Gold coin collar
  g.fillStyle(flash ? 0xaa8800 : 0xe8a020, 1);
  g.fillRoundedRect(cx - 12*S, cy - 5*S, 24*S, 7*S, 3);
  if (!flash) {
    g.fillStyle(0xffd700, 1);
    g.fillCircle(cx - 7*S, cy - 2*S, 2.8*S);
    g.fillCircle(cx,       cy - 2*S, 2.8*S);
    g.fillCircle(cx + 7*S, cy - 2*S, 2.8*S);
    g.fillStyle(0xffffff, 0.45);
    g.fillCircle(cx - 7.5*S, cy - 2.8*S, 1.2*S);
    g.fillCircle(cx - 0.5,   cy - 2.8*S, 1.2*S);
    g.fillCircle(cx + 6.5*S, cy - 2.8*S, 1.2*S);
  }

  // Treat satchel (larger, more prominent)
  g.fillStyle(flash ? 0xaa7744 : 0x7a4e1c, 1);
  g.fillRoundedRect(cx + 13*S, cy + 2*S, 14*S, 13*S, 4);
  g.fillStyle(flash ? 0xccaa77 : 0xc8922a, 0.7);
  g.fillRoundedRect(cx + 14*S, cy + 4*S, 12*S, 5*S, 3); // clasp highlight
  g.lineStyle(2, flash ? 0xccaa77 : 0xd8b078, 0.9);
  g.lineBetween(cx + 8*S, cy - 1*S, cx + 20*S, cy + 5*S);

  // Heart icon between ears — warm/support identity marker
  if (!flash) {
    g.fillStyle(0xff6680, 0.92);
    g.fillCircle(cx - 3.5*S, cy - 57*S, 3.8*S);
    g.fillCircle(cx + 3.5*S, cy - 57*S, 3.8*S);
    g.fillTriangle(cx - 7.5*S, cy - 55.5*S, cx + 7.5*S, cy - 55.5*S, cx, cy - 48*S);
    // Shine on heart
    g.fillStyle(0xffd0dd, 0.6);
    g.fillCircle(cx - 4.5*S, cy - 58.5*S, 1.5*S);
  }

  // Orbiting treat icons (larger, more visible)
  if (!flash) {
    const t = animTime / 1300;
    for (let i = 0; i < 3; i++) {
      const a  = t + (i * Math.PI * 2 / 3);
      const bx = cx + Math.cos(a) * 32*S;
      const by = cy - 8*S + Math.sin(a) * 13*S;
      // Treat bone shape: two circles + rect
      g.fillStyle(0xfdf0b8, 0.92);
      g.fillCircle(bx - 3*S, by, 2.8*S);
      g.fillCircle(bx + 3*S, by, 2.8*S);
      g.fillRoundedRect(bx - 2.5*S, by - 1.5*S, 5*S, 3*S, 1);
    }
  }
}

/**
 * Frost Pup — Ice Slow support. Ice-blue with center crystal spike + sparkle field.
 * Crystal spike between ears = instantly readable cold/slow identity.
 * Extra: ice collar + center ice crystal + enhanced sparkle crosses.
 */
function drawFrostPup(g, cx, cy, flash, animTime) {
  const S = 1.15; // medium-small; icy feel from color field, not bulk
  drawDogBase(g, cx, cy, DOG_COLORS.frost_pup, flash, animTime, S);

  // Ice-blue collar
  g.fillStyle(flash ? 0x8888cc : 0x5599cc, 1);
  g.fillRoundedRect(cx - 11*S, cy - 5*S, 22*S, 6*S, 3);
  g.fillStyle(0xaaddff, 1);
  g.fillCircle(cx, cy - 2*S, 2.4);

  if (!flash) {
    // Center ice crystal spike — sits between the two ears for a distinct crown silhouette
    // (Ears tip at ±18*S horizontally; crystal is centered, pointing above them)
    g.fillStyle(0xc8f0ff, 0.88);
    g.fillTriangle(cx - 5*S, cy - 43*S, cx, cy - 65*S, cx + 5*S, cy - 43*S);
    g.fillStyle(0xe8faff, 0.65);
    g.fillTriangle(cx - 3*S, cy - 44*S, cx + 1*S, cy - 61*S, cx + 4*S, cy - 44*S);
    // Small flanking crystal shards
    g.fillStyle(0xaaddff, 0.70);
    g.fillTriangle(cx - 10*S, cy - 42*S, cx - 6*S, cy - 55*S, cx - 2*S, cy - 42*S);
    g.fillTriangle(cx + 2*S, cy - 42*S, cx + 6*S, cy - 55*S, cx + 10*S, cy - 42*S);

    // Sparkle crosses — larger and brighter than before
    g.fillStyle(0x87ceeb, 0.75);
    g.fillCircle(cx - 35*S, cy - 2*S, 3.5);
    g.fillCircle(cx - 40*S, cy + 9*S, 2.8);
    g.fillCircle(cx + 35*S, cy - 4*S, 3.5);
    g.fillCircle(cx + 38*S, cy + 9*S, 2.8);

    g.lineStyle(1.5, 0xaaddff, 0.70);
    g.lineBetween(cx - 35*S, cy - 6*S, cx - 35*S, cy + 2*S);
    g.lineBetween(cx - 39*S, cy - 2*S, cx - 31*S, cy - 2*S);
    g.lineBetween(cx + 35*S, cy - 8*S, cx + 35*S, cy);
    g.lineBetween(cx + 31*S, cy - 4*S, cx + 39*S, cy - 4*S);
  }
}

function drawSniperOyong(g, cx, cy, flash, animTime) {
  const S = 1.05; // slimmer than Tank — precise/focused silhouette
  drawDogBase(g, cx, cy, DOG_COLORS.sniper_oyong, flash, animTime, S);

  // Scope visor above head
  g.fillStyle(flash ? 0x7788aa : 0x32496e, 1);
  g.fillRoundedRect(cx - 16*S, cy - 25*S, 32*S, 7*S, 3);
  g.fillStyle(flash ? 0xbbd4ff : 0x9cc4ff, 1);
  g.fillCircle(cx + 10*S, cy - 22*S, 4*S);
  // Reticle crosshairs on scope lens
  if (!flash) {
    g.lineStyle(1, 0xc8e4ff, 0.8);
    g.lineBetween(cx + 10*S, cy - 25*S, cx + 10*S, cy - 19*S);
    g.lineBetween(cx + 7*S, cy - 22*S, cx + 13*S, cy - 22*S);
  }
  // Scope rail + barrel
  g.fillStyle(flash ? 0x99aacc : 0x556d88, 1);
  g.fillRoundedRect(cx + 18*S, cy + 2*S, 20*S, 5*S, 3);
  g.fillRoundedRect(cx + 32*S, cy + 1*S, 12*S, 3*S, 2);
}

function drawFireOyong(g, cx, cy, flash, animTime) {
  const S = 1.20;
  drawDogBase(g, cx, cy, DOG_COLORS.fire_oyong, flash, animTime, S);
  const pulse = (Math.sin(animTime / 180) + 1) / 2;

  // Fire collar
  g.fillStyle(flash ? 0xffb87a : 0xcc4a10, 1);
  g.fillRoundedRect(cx - 11*S, cy - 5*S, 22*S, 6*S, 3);

  // Wider 3-flame arrangement — clear burn/fire identity
  if (!flash) {
    // Outer left flame
    g.fillStyle(0xff6622, 0.75);
    g.fillTriangle(cx - 11*S, cy - 36*S, cx - 7*S, cy - 50*S - pulse * 3, cx - 3*S, cy - 36*S);
    // Center main flame (tallest)
    g.fillStyle(0xffaa33, 0.90);
    g.fillTriangle(cx - 5*S, cy - 38*S, cx, cy - 60*S - pulse * 5, cx + 5*S, cy - 38*S);
    // Inner bright core
    g.fillStyle(0xffdd66, 0.85);
    g.fillTriangle(cx - 2*S, cy - 39*S, cx + 1*S, cy - 52*S - pulse * 3, cx + 4*S, cy - 39*S);
    // Outer right flame
    g.fillStyle(0xff6622, 0.75);
    g.fillTriangle(cx + 3*S, cy - 36*S, cx + 8*S, cy - 50*S - pulse * 2, cx + 12*S, cy - 36*S);
    // Ember sparks on sides
    g.fillStyle(0xff8844, 0.65);
    g.fillCircle(cx + 32*S, cy - 5*S, 3.5);
    g.fillCircle(cx + 37*S, cy + 8*S, 2.5);
    g.fillCircle(cx - 34*S, cy - 3*S, 2.5);
  }
}

function drawChainOyong(g, cx, cy, flash, animTime) {
  const S = 1.15; // medium; electric identity from sparks not size
  drawDogBase(g, cx, cy, DOG_COLORS.chain_oyong, flash, animTime, S);

  // Purple collar
  g.fillStyle(flash ? 0xbb99ff : 0x7a57c4, 1);
  g.fillRoundedRect(cx - 12*S, cy - 5*S, 24*S, 6*S, 3);

  // Chain arcs below collar
  g.lineStyle(2, flash ? 0xe6d8ff : 0xd6c4ff, 0.85);
  g.lineBetween(cx - 8*S, cy + 6*S, cx - 1*S, cy + 13*S);
  g.lineBetween(cx - 1*S, cy + 13*S, cx + 5*S, cy + 5*S);
  g.lineBetween(cx + 5*S, cy + 5*S, cx + 12*S, cy + 12*S);

  if (!flash) {
    const pulse = (Math.sin(animTime / 130) + 1) / 2;
    // Pulsing electric orbs on both sides
    g.fillStyle(0xdccfff, 0.50 + pulse * 0.20);
    g.fillCircle(cx - 34*S, cy - 4*S, 3.5);
    g.fillCircle(cx + 36*S, cy - 6*S, 3.2);
    // Electric bolt lines from orbs
    g.lineStyle(1.5, 0xe8d8ff, 0.55 + pulse * 0.25);
    // Left bolt
    g.lineBetween(cx - 34*S, cy - 7*S, cx - 30*S, cy - 2*S);
    g.lineBetween(cx - 30*S, cy - 2*S, cx - 34*S, cy + 2*S);
    // Right bolt
    g.lineBetween(cx + 36*S, cy - 9*S, cx + 32*S, cy - 3*S);
    g.lineBetween(cx + 32*S, cy - 3*S, cx + 36*S, cy + 2*S);
  }
}

function drawGuardianOyong(g, cx, cy, flash, animTime) {
  const S = 1.30; // biggest unit — wall/blocker silhouette
  drawDogBase(g, cx, cy, DOG_COLORS.guardian_oyong, flash, animTime, S);

  // Heavy chest armor plate
  g.fillStyle(flash ? 0xb4cad4 : 0x506775, 1);
  g.fillRoundedRect(cx - 17*S, cy - 6*S, 34*S, 20*S, 5);
  g.fillStyle(flash ? 0xe8f3ff : 0xb9d0dd, 0.9);
  g.fillRoundedRect(cx - 15*S, cy - 4*S, 30*S, 7*S, 4); // armor highlight stripe
  g.fillStyle(flash ? 0x99aeb8 : 0x415562, 0.55);
  g.fillRoundedRect(cx - 10*S, cy + 5*S, 20*S, 6*S, 3); // lower armor ridge

  // Heavy shoulder pauldrons — biggest silhouette extenders
  g.fillStyle(flash ? 0xb4cad4 : 0x506775, 1);
  g.fillCircle(cx - 27*S, cy + 5*S, 11*S);
  g.fillCircle(cx + 27*S, cy + 5*S, 11*S);
  g.fillStyle(flash ? 0xe0eef3 : 0x8aabb8, 0.7);
  g.fillCircle(cx - 27*S, cy + 3*S, 7*S); // shoulder highlight
  g.fillCircle(cx + 27*S, cy + 3*S, 7*S);

  // Helmet above head
  g.fillStyle(flash ? 0x99aeb8 : 0x415562, 1);
  g.fillRoundedRect(cx - 10*S, cy - 35*S, 20*S, 10*S, 3);
}

/** Dispatcher — call this everywhere a dog needs to be drawn */
function drawDogByType(g, cx, cy, type, flash, animTime) {
  flash    = !!flash;
  animTime = animTime || 0;
  switch (type) {
    case 'bark_pup':  drawBarkPup(g,  cx, cy, flash, animTime); break;
    case 'guard_dog': drawGuardDog(g, cx, cy, flash, animTime); break;
    case 'frost_pup': drawFrostPup(g, cx, cy, flash, animTime); break;
    case 'sniper_oyong': drawSniperOyong(g, cx, cy, flash, animTime); break;
    case 'fire_oyong': drawFireOyong(g, cx, cy, flash, animTime); break;
    case 'chain_oyong': drawChainOyong(g, cx, cy, flash, animTime); break;
    case 'guardian_oyong': drawGuardianOyong(g, cx, cy, flash, animTime); break;
    case 'treat_pup': drawTreatPup(g, cx, cy, flash, animTime); break;
  }
}

// ─── DOG BUST PORTRAIT (card close-up) ───────────────────────

/**
 * drawDogBust — head/bust-only close-up for selection cards.
 * Draws ears, head, cheeks, upper chest only (no body or legs).
 * Scaled 1.15× vs the field dog for better card readability.
 *
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} cx — horizontal center
 * @param {number} cy — vertical center
 * @param {object} col — color object from DOG_COLORS
 * @param {boolean} flash — hit-flash state
 * @param {number} animTime — ms counter driving blink animation
 */
function drawDogBust(g, cx, cy, col, flash, animTime, s = 1.15) {
  const body  = flash ? 0xffcccc : col.body;
  const mrk   = flash ? 0xffaaaa : col.marking;
  const earO  = flash ? 0xffbbaa : col.earOuter;
  const earI  = flash ? 0xffddcc : col.earInner;
  const chest = flash ? 0xffffff : col.chest;
  const dark  = flash ? 0x884444 : col.dark;

  // EAR OUTER (tall pointed — key silhouette feature, matches drawDogBase proportions × s)
  g.fillStyle(earO, 1);
  g.fillTriangle(cx - 6*s,  cy - 30*s,  cx - 18*s, cy - 56*s,  cx - 28*s, cy - 26*s);
  g.fillTriangle(cx + 6*s,  cy - 30*s,  cx + 18*s, cy - 56*s,  cx + 28*s, cy - 26*s);

  // HEAD (r=26 matching field dog)
  g.fillStyle(body, 1);
  g.fillCircle(cx, cy - 16*s, 26*s);

  // EAR INNER
  g.fillStyle(earI, 1);
  g.fillTriangle(cx - 8*s,  cy - 32*s,  cx - 16*s, cy - 52*s,  cx - 24*s, cy - 28*s);
  g.fillTriangle(cx + 8*s,  cy - 32*s,  cx + 16*s, cy - 52*s,  cx + 24*s, cy - 28*s);

  // CHEEK FLUFFS
  g.fillStyle(body, 0.92);
  g.fillEllipse(cx - 24*s, cy - 14*s, 20*s, 24*s);
  g.fillEllipse(cx + 24*s, cy - 14*s, 20*s, 24*s);
  g.fillStyle(chest, 0.28);
  g.fillEllipse(cx - 24*s, cy - 15*s, 14*s, 18*s);
  g.fillEllipse(cx + 24*s, cy - 15*s, 14*s, 18*s);

  // UPPER CHEST FLUFF (just the top, no body below)
  g.fillStyle(chest, 1);
  g.fillEllipse(cx, cy + 4*s, 32*s, 18*s);
  g.fillStyle(0xffffff, 0.8);
  g.fillEllipse(cx - 1, cy + 3*s, 22*s, 12*s);

  // FACE MARKINGS
  g.fillStyle(mrk, 0.70);
  g.fillEllipse(cx - 9*s, cy - 20*s, 14*s, 9*s);
  g.fillEllipse(cx + 9*s, cy - 20*s, 14*s, 9*s);
  g.fillStyle(mrk, 0.30);
  g.fillEllipse(cx, cy - 30*s, 12*s, 6*s);

  // MUZZLE
  g.fillStyle(flash ? 0xffeedd : chest, 0.92);
  g.fillEllipse(cx, cy - 11*s, 20*s, 14*s);

  // EYES (blink animation — bigger: 3.5 → 4.5)
  const blink = (animTime % 3500) < 130;
  if (blink) {
    g.lineStyle(2.5 * s, dark, 0.9);
    g.lineBetween(cx - 12*s, cy - 20*s, cx - 6*s,  cy - 21*s);
    g.lineBetween(cx + 12*s, cy - 20*s, cx + 6*s,  cy - 21*s);
  } else {
    g.fillStyle(dark, 1);
    g.fillCircle(cx - 9*s, cy - 20*s, 4.5*s);
    g.fillCircle(cx + 9*s, cy - 20*s, 4.5*s);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 7*s,  cy - 22*s, 1.6*s);
    g.fillCircle(cx + 11*s, cy - 22*s, 1.6*s);
  }

  // NOSE
  g.fillStyle(0x111111, 1);
  g.fillEllipse(cx, cy - 10*s, 11*s, 7*s);
  g.fillStyle(0x888888, 0.45);
  g.fillCircle(cx - 1, cy - 12*s, 1.6*s);

  // MOUTH
  g.lineStyle(1.8, dark, 0.6);
  g.beginPath();
  g.moveTo(cx - 4*s, cy - 5*s);
  g.lineTo(cx,       cy - 3*s);
  g.lineTo(cx + 4*s, cy - 5*s);
  g.strokePath();
}

/** Dispatcher for bust portraits — s is passed from drawDogBustByType per type */
function drawDogBustAccessory(g, cx, cy, type, flash, animTime, s = 1.15) {
  switch (type) {
    case 'bark_pup':
      // Collar + speed streaks
      g.fillStyle(flash ? 0x888888 : 0x3a6aaa, 1);
      g.fillRoundedRect(cx - 11*s, cy - 5*s, 22*s, 5*s, 3);
      g.fillStyle(0xdddd00, 1);
      g.fillCircle(cx, cy - 2*s, 2.2);
      if (!flash) {
        g.lineStyle(1.2, 0xffff88, 0.55);
        g.lineBetween(cx + 22*s, cy - 7*s, cx + 30*s, cy - 7*s);
        g.lineBetween(cx + 20*s, cy - 1*s, cx + 27*s, cy - 1*s);
      }
      break;
    case 'guard_dog':
      // Shoulder hints + collar + bandana
      g.fillStyle(flash ? 0xbbbbbb : 0x5a6a72, 1);
      g.fillEllipse(cx - 28*s, cy - 1*s, 16*s, 10*s);
      g.fillEllipse(cx + 28*s, cy - 1*s, 16*s, 10*s);
      g.fillStyle(flash ? 0x999999 : 0x555555, 1);
      g.fillRoundedRect(cx - 11*s, cy - 5*s, 22*s, 6*s, 3);
      if (!flash) {
        g.fillStyle(0xcc1500, 1);
        g.fillTriangle(cx - 8*s, cy - 1*s, cx + 8*s, cy - 1*s, cx, cy + 9*s);
      }
      break;
    case 'frost_pup':
      // Ice collar + center crystal spike between ears
      g.fillStyle(flash ? 0x8888cc : 0x5599cc, 1);
      g.fillRoundedRect(cx - 11*s, cy - 5*s, 22*s, 5*s, 3);
      g.fillStyle(0xaaddff, 1);
      g.fillCircle(cx, cy - 2*s, 2.3);
      if (!flash) {
        g.fillStyle(0xc8f0ff, 0.88);
        g.fillTriangle(cx - 4.5*s, cy - 43*s, cx, cy - 61*s, cx + 4.5*s, cy - 43*s);
        g.fillStyle(0xe8faff, 0.65);
        g.fillTriangle(cx - 2.5*s, cy - 44*s, cx + 1*s, cy - 57*s, cx + 4*s, cy - 44*s);
      }
      break;
    case 'sniper_oyong':
      // Scope visor + reticle
      g.fillStyle(flash ? 0x7788aa : 0x32496e, 1);
      g.fillRoundedRect(cx - 14*s, cy - 24*s, 28*s, 7*s, 3);
      g.fillStyle(0x9cc4ff, 1);
      g.fillCircle(cx + 9*s, cy - 21*s, 3.4*s);
      if (!flash) {
        g.lineStyle(0.9, 0xc8e4ff, 0.8);
        g.lineBetween(cx + 9*s, cy - 24*s, cx + 9*s, cy - 18*s);
        g.lineBetween(cx + 6*s, cy - 21*s, cx + 12*s, cy - 21*s);
      }
      break;
    case 'fire_oyong': {
      const pulse = (Math.sin(animTime / 180) + 1) / 2;
      g.fillStyle(flash ? 0xffb87a : 0xcc4a10, 1);
      g.fillRoundedRect(cx - 11*s, cy - 5*s, 22*s, 5*s, 3);
      if (!flash) {
        g.fillStyle(0xff6622, 0.75);
        g.fillTriangle(cx - 9*s, cy - 36*s, cx - 5*s, cy - 48*s - pulse*2, cx - 1*s, cy - 36*s);
        g.fillStyle(0xffaa33, 0.88);
        g.fillTriangle(cx - 4*s, cy - 38*s, cx, cy - 55*s - pulse*4, cx + 4*s, cy - 38*s);
        g.fillStyle(0xff6622, 0.75);
        g.fillTriangle(cx + 1*s, cy - 36*s, cx + 6*s, cy - 48*s - pulse*2, cx + 10*s, cy - 36*s);
      }
      break;
    }
    case 'chain_oyong': {
      const pulse = (Math.sin(animTime / 130) + 1) / 2;
      g.fillStyle(flash ? 0xbb99ff : 0x7a57c4, 1);
      g.fillRoundedRect(cx - 11*s, cy - 5*s, 22*s, 5*s, 3);
      g.lineStyle(1.8, 0xe8dcff, 0.85);
      g.lineBetween(cx - 8*s, cy + 5*s, cx - 1*s, cy + 11*s);
      g.lineBetween(cx - 1*s, cy + 11*s, cx + 5*s, cy + 5*s);
      g.lineBetween(cx + 5*s, cy + 5*s, cx + 11*s, cy + 10*s);
      if (!flash) {
        g.fillStyle(0xdccfff, 0.50 + pulse * 0.20);
        g.fillCircle(cx - 27*s, cy - 3*s, 3);
        g.fillCircle(cx + 29*s, cy - 5*s, 2.8);
      }
      break;
    }
    case 'guardian_oyong':
      // Wide armor + shoulder pads in bust
      g.fillStyle(flash ? 0xb4cad4 : 0x506775, 1);
      g.fillRoundedRect(cx - 16*s, cy - 5*s, 32*s, 15*s, 5);
      g.fillCircle(cx - 25*s, cy + 3*s, 9*s);
      g.fillCircle(cx + 25*s, cy + 3*s, 9*s);
      g.fillStyle(flash ? 0xe0eef3 : 0x8aabb8, 0.7);
      g.fillCircle(cx - 25*s, cy + 2*s, 5.5*s);
      g.fillCircle(cx + 25*s, cy + 2*s, 5.5*s);
      g.fillStyle(flash ? 0x99aeb8 : 0x415562, 1);
      g.fillRoundedRect(cx - 9*s, cy - 32*s, 18*s, 9*s, 3);
      break;
    case 'treat_pup':
      // Gold collar + coins + heart between ears
      g.fillStyle(flash ? 0xaa8800 : 0xe8a020, 1);
      g.fillRoundedRect(cx - 11*s, cy - 5*s, 22*s, 6*s, 3);
      g.fillStyle(0xffd700, 1);
      g.fillCircle(cx - 6*s, cy - 2*s, 2.2*s);
      g.fillCircle(cx, cy - 2*s, 2.2*s);
      g.fillCircle(cx + 6*s, cy - 2*s, 2.2*s);
      if (!flash) {
        g.fillStyle(0xff6680, 0.92);
        g.fillCircle(cx - 3.5*s, cy - 53*s, 3.5*s);
        g.fillCircle(cx + 3.5*s, cy - 53*s, 3.5*s);
        g.fillTriangle(cx - 7.5*s, cy - 51.5*s, cx + 7.5*s, cy - 51.5*s, cx, cy - 44*s);
        g.fillStyle(0xffd0dd, 0.6);
        g.fillCircle(cx - 4.5*s, cy - 54.5*s, 1.5*s);
      }
      break;
  }
}

function drawDogBustByType(g, cx, cy, type, flash, animTime) {
  flash    = !!flash;
  animTime = animTime || 0;
  const colors = DOG_COLORS[type];
  if (!colors) return;
  // Per-type bust scale — Scout smaller, Guardian largest, others medium
  const BUST_SCALES = {
    bark_pup:       1.02,
    guard_dog:      1.12,
    frost_pup:      1.08,
    treat_pup:      1.08,
    sniper_oyong:   1.05,
    fire_oyong:     1.10,
    chain_oyong:    1.10,
    guardian_oyong: 1.20,
  };
  const s = BUST_SCALES[type] || 1.10;
  drawDogBust(g, cx, cy, colors, flash, animTime, s);
  drawDogBustAccessory(g, cx, cy, type, flash, animTime, s);
}

/**
 * drawPaw — single paw icon for emergency-save indicators.
 * Main pad + 3 toe pads.
 *
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} cx  — center x
 * @param {number} cy  — center y
 * @param {number} color — fill color (e.g. 0xffa040 active, 0x334455 spent)
 * @param {number} alpha — opacity
 */
function drawPaw(g, cx, cy, color, alpha) {
  g.fillStyle(color, alpha);
  g.fillCircle(cx,      cy + 3,  5);   // main pad
  g.fillCircle(cx - 6,  cy - 2,  3);   // left toe
  g.fillCircle(cx,      cy - 6,  3);   // center toe
  g.fillCircle(cx + 6,  cy - 2,  3);   // right toe
}

// ─── ENEMY DRAWING ───────────────────────────────────────────

function drawUndeadShadow(g, cx, cy, width, height, alpha) {
  g.fillStyle(0x000000, alpha);
  g.fillEllipse(cx, cy, width, height);
}

function drawUndeadTorso(g, cx, cy, opts) {
  const x = cx - opts.w / 2 + (opts.lean || 0);
  const y = cy + (opts.y || 0);
  const radius = opts.radius || 6;
  g.fillStyle(opts.color, 1);
  g.fillRoundedRect(x, y, opts.w, opts.h, radius);

  g.fillStyle(opts.highlight || 0xffffff, opts.highlightAlpha || 0.16);
  g.fillRoundedRect(x + 2, y + 2, opts.w - 4, opts.h * 0.34, radius);

  g.fillStyle(opts.shadow || 0x000000, opts.shadowAlpha || 0.16);
  g.fillRoundedRect(x + 3, y + opts.h * 0.52, opts.w - 6, opts.h * 0.26, Math.max(3, radius - 2));

  if (opts.stitchColor) {
    g.lineStyle(1.4, opts.stitchColor, 0.55);
    g.lineBetween(cx + (opts.stitchX || 0) + (opts.lean || 0), y + 4, cx + (opts.stitchX || 0) + (opts.lean || 0), y + opts.h - 6);
    for (let i = 0; i < 4; i++) {
      const sy = y + 8 + i * (opts.h - 18) / 3;
      g.lineBetween(cx - 4 + (opts.stitchX || 0) + (opts.lean || 0), sy, cx + 4 + (opts.stitchX || 0) + (opts.lean || 0), sy);
    }
  }
}

function drawUndeadLimb(g, fromX, fromY, midX, midY, toX, toY, color, shadow, thickness, clawColor) {
  g.lineStyle(thickness, color, 1);
  g.lineBetween(fromX, fromY, midX, midY);
  g.lineBetween(midX, midY, toX, toY);

  g.lineStyle(Math.max(1, thickness * 0.32), shadow || 0x000000, 0.42);
  g.lineBetween(fromX + 1, fromY + 1, midX + 1, midY + 1);
  g.lineBetween(midX + 1, midY + 1, toX + 1, toY + 1);

  g.fillStyle(color, 1);
  g.fillCircle(fromX, fromY, thickness * 0.34);
  g.fillCircle(midX, midY, thickness * 0.30);
  g.fillCircle(toX, toY, thickness * 0.26);

  if (clawColor) {
    const dir = toX >= midX ? 1 : -1;
    g.lineStyle(Math.max(1, thickness * 0.16), clawColor, 0.8);
    g.lineBetween(toX, toY, toX + dir * thickness * 0.35, toY - thickness * 0.18);
    g.lineBetween(toX, toY, toX + dir * thickness * 0.38, toY);
    g.lineBetween(toX, toY, toX + dir * thickness * 0.35, toY + thickness * 0.18);
  }
}

function drawUndeadMouth(g, cx, cy, opts) {
  const width = opts.width || 10;
  const dark = opts.dark || 0x120808;
  const teeth = opts.teeth || 0xd8d8aa;
  switch (opts.style) {
    case 'grim':
      g.lineStyle(1.8, dark, 0.85);
      g.beginPath();
      g.moveTo(cx - width / 2, cy + 1);
      g.lineTo(cx - width * 0.14, cy + 3);
      g.lineTo(cx + width / 2, cy + 1);
      g.strokePath();
      break;
    case 'smirk':
      g.lineStyle(1.8, dark, 0.8);
      g.beginPath();
      g.moveTo(cx - width / 2, cy);
      g.lineTo(cx, cy + 1.6);
      g.lineTo(cx + width / 2, cy - 1);
      g.strokePath();
      break;
    case 'roar':
      g.fillStyle(dark, 1);
      g.fillRoundedRect(cx - width / 2, cy - 1, width, 8, 3);
      g.fillStyle(teeth, 1);
      for (let i = 0; i < 4; i++) g.fillRect(cx - width / 2 + 1.5 + i * (width - 4) / 4, cy - 1, 2, 5);
      break;
    default:
      g.fillStyle(dark, 1);
      g.fillRoundedRect(cx - width / 2, cy - 1, width, 5.5, 2.5);
      g.fillStyle(teeth, 1);
      g.fillRect(cx - width / 2 + 1.5, cy - 1, 2.2, 4.4);
      g.fillRect(cx + width / 2 - 3.8, cy - 1, 2.2, 4.4);
      break;
  }
}

function drawUndeadHead(g, cx, cy, opts) {
  const radius = opts.radius || 14;
  g.fillStyle(opts.skin, 1);
  g.fillCircle(cx, cy, radius);

  g.fillStyle(opts.highlight || 0xffffff, opts.highlightAlpha || 0.18);
  g.fillEllipse(cx - radius * 0.25, cy - radius * 0.32, radius * 0.9, radius * 0.58);

  g.fillStyle(opts.patch || opts.shadow || 0x000000, opts.patchAlpha || 0.24);
  g.fillEllipse(cx + radius * 0.24, cy - radius * 0.02, radius * 0.82, radius * 0.54);

  const eyeY = cy + (opts.eyeYOffset || -2);
  const spread = opts.eyeSpread || radius * 0.42;
  const eyeRadius = opts.eyeRadius || Math.max(2.6, radius * 0.22);
  const glowRadius = opts.glowRadius || eyeRadius * 1.9;
  const eyeShape = opts.eyeShape || 'round';
  const glowColor = opts.eyeGlow || opts.eyeColor;

  g.fillStyle(glowColor, opts.glowAlpha || 0.34);
  g.fillCircle(cx - spread, eyeY, glowRadius);
  g.fillCircle(cx + spread, eyeY, glowRadius);

  g.fillStyle(opts.eyeColor, 1);
  if (eyeShape === 'slit') {
    g.fillEllipse(cx - spread, eyeY, eyeRadius * 2.2, eyeRadius * 1.2);
    g.fillEllipse(cx + spread, eyeY, eyeRadius * 2.2, eyeRadius * 1.2);
  } else {
    g.fillCircle(cx - spread, eyeY, eyeRadius);
    g.fillCircle(cx + spread, eyeY, eyeRadius);
  }

  if (opts.eyeHot) {
    g.fillStyle(opts.eyeHot, 0.75);
    g.fillCircle(cx - spread - eyeRadius * 0.15, eyeY - eyeRadius * 0.2, Math.max(1.1, eyeRadius * 0.44));
    g.fillCircle(cx + spread - eyeRadius * 0.15, eyeY - eyeRadius * 0.2, Math.max(1.1, eyeRadius * 0.44));
  }

  if (opts.pupil) {
    g.fillStyle(opts.pupil, 0.95);
    if (eyeShape === 'slit') {
      g.fillRect(cx - spread - 0.7, eyeY - eyeRadius * 0.48, 1.4, eyeRadius * 0.96);
      g.fillRect(cx + spread - 0.7, eyeY - eyeRadius * 0.48, 1.4, eyeRadius * 0.96);
    } else {
      g.fillCircle(cx - spread + 0.2, eyeY, Math.max(1, eyeRadius * 0.42));
      g.fillCircle(cx + spread + 0.2, eyeY, Math.max(1, eyeRadius * 0.42));
    }
  }

  const browColor = opts.browColor || opts.shadow || 0x120808;
  g.lineStyle(opts.browWidth || 2.1, browColor, 0.82);
  g.lineBetween(cx - spread - eyeRadius, eyeY - eyeRadius - 1.5, cx - spread + eyeRadius, eyeY - eyeRadius + (opts.browTiltLeft || 0));
  g.lineBetween(cx + spread - eyeRadius, eyeY - eyeRadius + (opts.browTiltRight || 0), cx + spread + eyeRadius, eyeY - eyeRadius - 1.5);

  drawUndeadMouth(g, cx + (opts.mouthOffsetX || 0), cy + (opts.mouthYOffset || radius * 0.45), {
    style: opts.mouthStyle || 'snarl',
    width: opts.mouthWidth || radius * 0.9,
    dark: opts.mouthDark || opts.shadow || 0x120808,
    teeth: opts.teeth || 0xd8d8aa,
  });

  if (opts.scarColor) {
    g.lineStyle(1.4, opts.scarColor, 0.72);
    g.lineBetween(cx - radius * 0.1, cy - radius * 0.55, cx + radius * 0.22, cy + radius * 0.15);
    g.lineStyle(1, opts.scarColor, 0.45);
    g.lineBetween(cx + radius * 0.02, cy - radius * 0.34, cx + radius * 0.1, cy - radius * 0.16);
    g.lineBetween(cx + radius * 0.09, cy - radius * 0.02, cx + radius * 0.2, cy + radius * 0.12);
  }
}

/**
 * Walker — classic shambling zombie (mossy green).
 * Recognizable by: outstretched arms, heavy sway, X-eyes, and slow lumber.
 * Scaled 15% larger than the original design for better readability.
 */
function drawWalker(g, cx, cy, flash, anim) {
  const SE = 1.15;
  const body = flash ? 0xb8e4a8 : 0x5f9b48;
  const skin = flash ? 0xd7f0c6 : 0x89b86d;
  const dark = 0x173311;
  const bob = Math.sin(anim * Math.PI * 2) * 2.2 * SE;
  const sway = Math.sin(anim * Math.PI * 2) * 6.5 * SE;
  const legDrift = Math.cos(anim * Math.PI * 2) * 2.5 * SE;

  drawUndeadShadow(g, cx, cy + 34 * SE, 34 * SE, 9 * SE, 0.18);
  drawUndeadTorso(g, cx, cy + bob, {
    w: 28 * SE,
    h: 34 * SE,
    y: -6 * SE,
    radius: 6,
    color: body,
    highlight: 0xc9f1b6,
    shadow: dark,
    stitchColor: dark,
    stitchX: 2 * SE,
  });

  drawUndeadLimb(g, cx - 12 * SE, cy + bob - 1 * SE, cx - 22 * SE, cy + bob + 4 * SE + sway * 0.35, cx - 31 * SE, cy + bob + 1 * SE + sway, body, dark, 8 * SE, dark);
  drawUndeadLimb(g, cx + 12 * SE, cy + bob - 2 * SE, cx + 22 * SE, cy + bob + 1 * SE - sway * 0.25, cx + 31 * SE, cy + bob - 5 * SE - sway * 0.75, body, dark, 8 * SE, dark);

  drawUndeadLimb(g, cx - 7 * SE, cy + bob + 26 * SE, cx - 8 * SE, cy + bob + 34 * SE + legDrift * 0.5, cx - 9 * SE, cy + bob + 42 * SE, body, dark, 8.5 * SE);
  drawUndeadLimb(g, cx + 7 * SE, cy + bob + 26 * SE, cx + 9 * SE, cy + bob + 34 * SE - legDrift * 0.5, cx + 11 * SE, cy + bob + 42 * SE, body, dark, 8.5 * SE);

  drawUndeadHead(g, cx, cy - 23 * SE + bob, {
    radius: 16 * SE,
    skin,
    shadow: dark,
    patch: 0x54843f,
    eyeColor: 0xb8ff74,
    eyeGlow: 0x79c347,
    eyeHot: 0xf5ffd5,
    pupil: dark,
    eyeSpread: 6.6 * SE,
    mouthStyle: 'grim',
    mouthWidth: 11 * SE,
    mouthYOffset: 7 * SE,
    scarColor: dark,
    browTiltLeft: 2,
    browTiltRight: -2,
  });
}

/**
 * Runner — fast lean zombie (blood red), strongly angled forward.
 * Recognizable by: extreme forward lean, slim torso, rapid leg animation,
 * and prominent speed streaks. Thinner/lighter than Walker at a glance.
 * Scaled 15% larger for readability while staying visually light/agile.
 */
function drawRunner(g, cx, cy, flash, anim) {
  const SE = 1.15;
  const body = flash ? 0xffa2a2 : 0xc84b49;
  const skin = flash ? 0xffcbc3 : 0xd17363;
  const dark = 0x2b0808;
  const lean = 12 * SE;
  const bob = Math.sin(anim * Math.PI * 3) * 1.6 * SE;
  const stride = Math.sin(anim * Math.PI * 4) * 8 * SE;

  g.lineStyle(2, 0xff7f74, 0.42);
  g.lineBetween(cx - 36 * SE, cy - 8 * SE, cx - 6 * SE + lean, cy - 8 * SE);
  g.lineBetween(cx - 40 * SE, cy + 2 * SE, cx - 8 * SE + lean, cy + 2 * SE);
  g.lineBetween(cx - 30 * SE, cy + 12 * SE, cx - 2 * SE + lean, cy + 12 * SE);
  g.lineStyle(1.2, 0xffc2b8, 0.28);
  g.lineBetween(cx - 22 * SE, cy - 2 * SE, cx - 4 * SE + lean, cy - 2 * SE);

  drawUndeadShadow(g, cx + lean * 0.48, cy + 28 * SE, 30 * SE, 8 * SE, 0.16);
  drawUndeadTorso(g, cx + lean, cy + bob, {
    w: 18 * SE,
    h: 28 * SE,
    y: -7 * SE,
    radius: 5,
    color: body,
    highlight: 0xffb0ab,
    shadow: dark,
  });

  drawUndeadLimb(g, cx + lean - 7 * SE, cy + bob - 1 * SE, cx + lean - 16 * SE, cy + bob + 4 * SE, cx + lean - 24 * SE, cy + bob + 8 * SE, body, dark, 6.5 * SE, dark);
  drawUndeadLimb(g, cx + lean + 7 * SE, cy + bob - 2 * SE, cx + lean + 16 * SE, cy + bob - 5 * SE, cx + lean + 24 * SE, cy + bob - 10 * SE, body, dark, 6.5 * SE, dark);

  drawUndeadLimb(g, cx + lean - 3 * SE, cy + bob + 20 * SE, cx + lean - 8 * SE, cy + bob + 28 * SE + stride * 0.45, cx + lean - 12 * SE, cy + bob + 40 * SE + stride * 0.7, body, dark, 7 * SE);
  drawUndeadLimb(g, cx + lean + 5 * SE, cy + bob + 20 * SE, cx + lean + 10 * SE, cy + bob + 28 * SE - stride * 0.45, cx + lean + 14 * SE, cy + bob + 40 * SE - stride * 0.7, body, dark, 7 * SE);

  drawUndeadHead(g, cx + lean + 3 * SE, cy - 20 * SE + bob, {
    radius: 13 * SE,
    skin,
    shadow: dark,
    patch: 0x9c4139,
    eyeColor: 0xff6655,
    eyeGlow: 0xff3322,
    eyeHot: 0xfff0d7,
    pupil: dark,
    eyeShape: 'slit',
    eyeSpread: 5.2 * SE,
    eyeRadius: 2.9 * SE,
    mouthStyle: 'snarl',
    mouthWidth: 10 * SE,
    mouthYOffset: 6 * SE,
    browTiltLeft: -2,
    browTiltRight: 2,
  });
}

/**
 * Brute — massive slow zombie (dark brick-red/brown).
 * Recognizable by: enormous body width, huge fists, heavy head, slow stomp bob.
 * Noticeably wider and bulkier than Walker at a glance — the "tank" threat.
 * Scaled 15% larger with enhanced bulk to reinforce the threat feel.
 */
function drawBrute(g, cx, cy, flash, anim) {
  const SE = 1.18;
  const body = flash ? 0xd8c2ff : 0x5a3e78;
  const skin = flash ? 0xe7d8ff : 0x7a5f9b;
  const dark = 0x1a1026;
  const bob = Math.sin(anim * Math.PI * 1.8) * 2.3 * SE;
  const armPulse = Math.sin(anim * Math.PI * 2) * 3 * SE;

  drawUndeadShadow(g, cx, cy + 43 * SE, 54 * SE, 11 * SE, 0.2);
  drawUndeadTorso(g, cx, cy + bob, {
    w: 58 * SE,
    h: 48 * SE,
    y: -4 * SE,
    radius: 9,
    color: body,
    highlight: 0x8e75ba,
    shadow: dark,
    stitchColor: 0xbda4dd,
    stitchX: -3 * SE,
  });

  drawUndeadLimb(g, cx - 25 * SE, cy + bob + 1 * SE, cx - 39 * SE, cy + bob + 10 * SE + armPulse * 0.3, cx - 45 * SE, cy + bob + 15 * SE + armPulse * 0.4, 0x6a4b91, dark, 12 * SE);
  drawUndeadLimb(g, cx + 25 * SE, cy + bob + 1 * SE, cx + 39 * SE, cy + bob + 10 * SE - armPulse * 0.3, cx + 45 * SE, cy + bob + 15 * SE - armPulse * 0.4, 0x6a4b91, dark, 12 * SE);
  g.fillStyle(0x43305c, 1);
  g.fillCircle(cx - 48 * SE, cy + bob + 16 * SE + armPulse * 0.4, 10 * SE);
  g.fillCircle(cx + 48 * SE, cy + bob + 16 * SE - armPulse * 0.4, 10 * SE);

  drawUndeadLimb(g, cx - 12 * SE, cy + bob + 35 * SE, cx - 13 * SE, cy + bob + 44 * SE, cx - 13 * SE, cy + bob + 52 * SE, body, dark, 11 * SE);
  drawUndeadLimb(g, cx + 12 * SE, cy + bob + 35 * SE, cx + 13 * SE, cy + bob + 44 * SE, cx + 13 * SE, cy + bob + 52 * SE, body, dark, 11 * SE);

  drawUndeadHead(g, cx, cy - 24 * SE + bob, {
    radius: 20 * SE,
    skin,
    shadow: dark,
    patch: 0x523a73,
    eyeColor: 0xff99ff,
    eyeGlow: 0x9d63ff,
    eyeHot: 0xffffff,
    pupil: dark,
    eyeSpread: 8 * SE,
    eyeRadius: 4.2 * SE,
    mouthStyle: 'roar',
    mouthWidth: 18 * SE,
    mouthYOffset: 10 * SE,
    scarColor: 0xe4c9ff,
    browWidth: 3,
    browTiltLeft: 1.5,
    browTiltRight: -1.5,
  });

  g.fillStyle(0x24152f, 1);
  for (let i = 0; i < 5; i++) {
    const hx = cx - 16 * SE + i * 8 * SE;
    g.fillTriangle(hx - 4 * SE, cy - 38 * SE + bob, hx, cy - 52 * SE + bob - (i % 2 === 0 ? 5 * SE : 0), hx + 4 * SE, cy - 38 * SE + bob);
  }
}

/**
 * Shielder — slow armored zombie with a heavy shield on its left arm.
 * Recognizable by: purple/indigo colors, prominent kite shield, amber glow eyes.
 * Shield is drawn large so the mechanic is immediately obvious.
 * Scaled 15% larger for better field readability.
 */
function drawShielder(g, cx, cy, flash, anim, shieldBroken) {
  const SE   = 1.15;  // enemy scale — tweak here
  const body = flash ? 0xccbbee : 0x5a4a8a;  // deep indigo — distinct from others
  const skin = flash ? 0xddd0ff : 0x7a6aaa;
  const dark = 0x140820;
  const bob  = Math.sin(anim * Math.PI * 2) * 2 * SE;

  // Stocky body — wider than walker to feel armored
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 15*SE, cy - 6*SE + bob, 30*SE, 36*SE, 6);
  // Armor highlight
  g.fillStyle(0x7a6aaa, 0.35);
  g.fillRoundedRect(cx - 15*SE, cy - 6*SE + bob, 30*SE, 12*SE, 6);

  // Head
  g.fillStyle(skin, 1);
  g.fillCircle(cx + 2*SE, cy - 22*SE + bob, 16*SE);

  // Glowing amber eyes — unnerving orange-gold (unique to shielder)
  g.fillStyle(0xff8800, 0.55);
  g.fillCircle(cx - 4*SE, cy - 24*SE + bob, 6*SE);
  g.fillCircle(cx + 8*SE, cy - 24*SE + bob, 6*SE);
  g.fillStyle(0xffcc00, 1);
  g.fillCircle(cx - 4*SE, cy - 24*SE + bob, 3.5*SE);
  g.fillCircle(cx + 8*SE, cy - 24*SE + bob, 3.5*SE);

  // Gaping mouth
  g.fillStyle(dark, 1);
  g.fillRoundedRect(cx - 4*SE, cy - 15*SE + bob, 11*SE, 5*SE, 2);
  g.fillStyle(0xbbbb90, 1);
  g.fillRect(cx - 3*SE, cy - 15*SE + bob, 2.5*SE, 4*SE);
  g.fillRect(cx + 4*SE, cy - 15*SE + bob, 2.5*SE, 4*SE);

  // ── Shield (left arm / front) ──
  if (!shieldBroken) {
    // Shield body — large kite shape, very prominent
    g.fillStyle(0x7a8a9a, 1);
    g.fillRoundedRect(cx - 42*SE, cy - 30*SE + bob, 28*SE, 50*SE, 5);
    // Gradient highlight on top portion
    g.fillStyle(0xaabbcc, 0.60);
    g.fillRoundedRect(cx - 42*SE, cy - 30*SE + bob, 28*SE, 18*SE, 5);
    // Bold outline to read at a glance
    g.lineStyle(2.5, 0x99bbcc, 1);
    g.strokeRoundedRect(cx - 42*SE, cy - 30*SE + bob, 28*SE, 50*SE, 5);
    // Cross decoration
    g.lineStyle(2, 0xffffff, 0.35);
    g.lineBetween(cx - 28*SE, cy - 28*SE + bob, cx - 28*SE, cy + 18*SE + bob);
    g.lineBetween(cx - 40*SE, cy - 4*SE + bob,  cx - 16*SE, cy - 4*SE + bob);
    // Corner rivets
    g.fillStyle(0x7a8899, 1);
    g.fillCircle(cx - 39*SE, cy - 27*SE + bob, 3.5*SE);
    g.fillCircle(cx - 15*SE, cy - 27*SE + bob, 3.5*SE);
    g.fillCircle(cx - 39*SE, cy + 17*SE + bob, 3.5*SE);
    g.fillCircle(cx - 15*SE, cy + 17*SE + bob, 3.5*SE);
    // Arm holding shield
    g.fillStyle(body, 1);
    g.fillRoundedRect(cx - 24*SE, cy - 4*SE + bob, 11*SE, 30*SE, 3);
  } else {
    // ── Broken shield fragments (shielder revealed and moving faster) ──
    g.fillStyle(0x4a5060, 0.85);
    g.fillRoundedRect(cx - 38*SE, cy - 28*SE + bob, 15*SE, 22*SE, 4);
    g.fillRoundedRect(cx - 40*SE, cy - 4*SE + bob,  18*SE, 24*SE, 4);
    g.lineStyle(1.5, 0x667788, 0.55);
    g.lineBetween(cx - 38*SE, cy - 8*SE + bob, cx - 26*SE, cy - 2*SE + bob);
    g.lineBetween(cx - 36*SE, cy - 4*SE + bob, cx - 24*SE, cy + 10*SE + bob);
    // Exposed arm
    g.fillStyle(body, 1);
    g.fillRoundedRect(cx - 33*SE, cy - 2*SE + bob, 11*SE, 32*SE, 3);
  }

  // Legs
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 11*SE, cy + 28*SE + bob, 11*SE, 13*SE, 3);
  g.fillRoundedRect(cx +  2*SE, cy + 28*SE + bob, 11*SE, 13*SE, 3);
}

/**
 * Jumper — agile zombie that vaults over the first dog in its path.
 * Recognizable by: coiled crouching stance, glowing yellow eyes, reaching claws,
 * and a unique hunched silhouette unlike any other enemy type.
 * Scaled 15% larger with more exaggerated spring-loaded posture.
 */
function drawJumper(g, cx, cy, flash, anim, isJumping) {
  const SE   = 1.15;  // enemy scale — tweak here
  const body = flash ? 0xddaa88 : 0x8a4a1a;  // warm rusty brown — distinct hue
  const skin = flash ? 0xeeccaa : 0xaa6a38;
  const dark = 0x200800;
  // Fast bob: 3× speed vs walker for nervous/twitchy feel
  const bob  = isJumping ? 0 : Math.sin(anim * Math.PI * 3) * 3 * SE;

  // Airborne shadow
  if (isJumping) {
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(cx, cy + 26*SE, 36*SE, 9*SE);
  }

  // Crouched compact body — hunched forward
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 12*SE, cy - 2*SE + bob, 24*SE, 26*SE, 5);
  // Back hump ridge — key silhouette feature
  g.fillStyle(0x6a3010, 0.6);
  g.fillEllipse(cx + 4*SE, cy - 4*SE + bob, 18*SE, 12*SE);

  // Coiled/tucked legs
  g.fillStyle(body, 1);
  if (isJumping) {
    // Tucked mid-air — knees up
    g.fillRoundedRect(cx - 14*SE, cy + 14*SE + bob, 12*SE, 9*SE, 3);
    g.fillRoundedRect(cx +  2*SE, cy + 14*SE + bob, 12*SE, 9*SE, 3);
  } else {
    // Coiled spring stance — ready to leap
    g.fillRoundedRect(cx - 14*SE, cy + 22*SE + bob, 12*SE, 14*SE, 3);
    g.fillRoundedRect(cx +  2*SE, cy + 22*SE + bob, 12*SE, 14*SE, 3);
    // Bent knee bend visual
    g.fillStyle(0x6a3010, 0.5);
    g.fillEllipse(cx - 8*SE, cy + 22*SE + bob, 10*SE, 6*SE);
    g.fillEllipse(cx + 8*SE, cy + 22*SE + bob, 10*SE, 6*SE);
  }

  // Long reaching arms with claws — key silhouette
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 30*SE, cy - 4*SE + bob, 19*SE, 8*SE, 3);
  g.fillRoundedRect(cx + 11*SE, cy - 4*SE + bob, 19*SE, 8*SE, 3);
  // Claw tips (3 scratches on each hand)
  g.lineStyle(2, dark, 0.9);
  for (let i = 0; i < 3; i++) {
    g.lineBetween(cx - 12*SE + i*3.5*SE, cy - 2*SE + bob, cx - 16*SE + i*3.5*SE, cy - 8*SE + bob);
    g.lineBetween(cx + 13*SE + i*3.5*SE, cy - 2*SE + bob, cx + 11*SE + i*3.5*SE, cy - 8*SE + bob);
  }

  // Head — tilted forward, slightly oversized for the compact body
  g.fillStyle(skin, 1);
  g.fillCircle(cx + 3*SE, cy - 17*SE + bob, 14*SE);

  // Glowing yellow eyes — eerie alert predator look
  g.fillStyle(0xffcc00, 0.50);
  g.fillCircle(cx - 3*SE, cy - 19*SE + bob, 6*SE);   // outer glow
  g.fillCircle(cx + 9*SE, cy - 19*SE + bob, 6*SE);
  g.fillStyle(0xffee00, 1);
  g.fillCircle(cx - 3*SE, cy - 19*SE + bob, 3.5*SE); // bright iris
  g.fillCircle(cx + 9*SE, cy - 19*SE + bob, 3.5*SE);
  g.fillStyle(dark, 1);
  g.fillCircle(cx - 2*SE, cy - 19*SE + bob, 1.6*SE); // pupil
  g.fillCircle(cx + 10*SE, cy - 19*SE + bob, 1.6*SE);

  // Jagged open mouth
  g.fillStyle(dark, 1);
  g.fillRoundedRect(cx - 3*SE, cy - 11*SE + bob, 10*SE, 5*SE, 2);
  g.fillStyle(0xd8d890, 1);
  g.fillRect(cx - 2*SE, cy - 11*SE + bob, 2.5*SE, 4*SE);
  g.fillRect(cx + 3*SE, cy - 11*SE + bob, 2.5*SE, 4*SE);
}

/**
 * drawShieldHpBar — drawn on top of the normal HP bar for a shielder.
 * Shows shield health as a blue bar above the body HP bar.
 */
function drawShieldHpBar(g, cx, cy, shieldHp, maxShieldHp) {
  const bw = 52, bh = 4;
  const bx = cx - bw / 2;
  const by = cy - 74;  // above the body HP bar (adjusted for scaled shielder)
  g.fillStyle(0x000000, 0.55);
  g.fillRect(bx, by, bw, bh);
  const pct = Math.max(0, shieldHp / maxShieldHp);
  g.fillStyle(0x6699ff, 1);
  g.fillRect(bx, by, bw * pct, bh);
  // Label
  g.lineStyle(1, 0x4477cc, 0.6);
  g.strokeRect(bx, by, bw, bh);
}

/**
 * drawStar — 5-point star shape, filled (gold) or empty (dark outline).
 * Draw centered at (cx, cy) with outer radius = size.
 */
function drawStar(g, cx, cy, size, filled) {
  const inner = size * 0.42;
  const pts   = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI / 5) - Math.PI / 2;
    const r = i % 2 === 0 ? size : inner;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }

  g.fillStyle(filled ? 0xffd700 : 0x2a3a4a, 1);
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < 20; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillPath();

  g.lineStyle(1.5, filled ? 0xffaa00 : 0x445566, filled ? 0.5 : 0.8);
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < 20; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.strokePath();
}

/**
 * Exploder — volatile orange zombie packed with unstable energy.
 * Recognizable by: bloated barrel body, cracks of inner glow, warning symbols,
 * and a pulsing aura. Explodes on contact — kill it before it reaches your dogs!
 */
function drawExploder(g, cx, cy, flash, anim) {
  const SE   = 1.15;
  const body = flash ? 0xffcc88 : 0xcc4400;
  const glow = flash ? 0xffffaa : 0xff8800;
  const dark = 0x1a0a00;
  const bob  = Math.sin(anim * Math.PI * 2.5) * 3 * SE; // nervous jitter
  const pulse = (Math.sin(anim * Math.PI * 4) + 1) / 2; // 0→1 fast pulse

  // Pulsing danger aura ring
  g.fillStyle(0xff6600, 0.10 + pulse * 0.14);
  g.fillCircle(cx, cy + bob, 34 * SE);

  // Bloated barrel body
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 20*SE, cy - 10*SE + bob, 40*SE, 42*SE, 10);

  // Inner-glow cracks (orange fissures across the torso)
  g.lineStyle(2.5, glow, 0.8);
  g.lineBetween(cx - 10*SE, cy - 4*SE + bob,  cx - 2*SE,  cy + 12*SE + bob);
  g.lineBetween(cx + 2*SE,  cy - 6*SE + bob,  cx + 14*SE, cy + 8*SE  + bob);
  g.lineBetween(cx - 6*SE,  cy + 14*SE + bob, cx + 8*SE,  cy + 28*SE + bob);
  g.lineStyle(1.5, 0xffcc44, 0.5);
  g.lineBetween(cx + 6*SE, cy - 2*SE + bob, cx + 2*SE, cy + 18*SE + bob);

  // Warning ⚠ markings — two diagonal black stripes
  g.fillStyle(dark, 0.30);
  g.fillRoundedRect(cx - 20*SE, cy + 2*SE + bob, 40*SE, 8*SE, 0);

  // Short stubby arms (hands pointing outward — comedic threat)
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 36*SE, cy - 4*SE + bob, 18*SE, 10*SE, 3);
  g.fillRoundedRect(cx + 18*SE, cy - 4*SE + bob, 18*SE, 10*SE, 3);

  // Round head — slightly oversized for the chubby body
  g.fillStyle(0xdd5500, 1);
  g.fillCircle(cx, cy - 24*SE + bob, 16*SE);

  // Glowing orange eyes — wild/manic expression
  g.fillStyle(0xff8800, 0.50);
  g.fillCircle(cx - 6*SE, cy - 26*SE + bob, 6*SE);
  g.fillCircle(cx + 6*SE, cy - 26*SE + bob, 6*SE);
  g.fillStyle(0xffee00, 1);
  g.fillCircle(cx - 6*SE, cy - 26*SE + bob, 3.5*SE);
  g.fillCircle(cx + 6*SE, cy - 26*SE + bob, 3.5*SE);
  // Spiral pupils — crazed look
  g.fillStyle(dark, 1);
  g.fillCircle(cx - 5*SE, cy - 25*SE + bob, 1.6*SE);
  g.fillCircle(cx + 7*SE, cy - 25*SE + bob, 1.6*SE);

  // Wide grinning mouth
  g.fillStyle(dark, 1);
  g.fillRoundedRect(cx - 8*SE, cy - 16*SE + bob, 16*SE, 6*SE, 3);
  g.fillStyle(0xd8d890, 1);
  for (let i = 0; i < 4; i++) {
    g.fillRect(cx - 7*SE + i * 4.5*SE, cy - 16*SE + bob, 2.5*SE, 5*SE);
  }

  // Stubby legs
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 13*SE, cy + 30*SE + bob, 11*SE, 10*SE, 3);
  g.fillRoundedRect(cx +  2*SE, cy + 30*SE + bob, 11*SE, 10*SE, 3);
}

/**
 * Boss — colossal crimson undead warlord.
 * Recognizable by: massive bulk, glowing red eyes, crown of bone spikes,
 * intimidating scale. Rages at 50% HP — turns bright orange.
 */
// Chapter-specific color palettes for boss identity
const BOSS_CHAPTER_COLORS = {
  1: { body: 0x8a0010, skin: 0xaa1828, accent: 0xff6644 }, // Ch1 — crimson brute
  2: { body: 0x7a1a00, skin: 0xcc4422, accent: 0xff8844 }, // Ch2 — orange runner
  3: { body: 0x1a2a6a, skin: 0x3a4a9a, accent: 0x88ccff }, // Ch3 — blue shield
  4: { body: 0x5a3a00, skin: 0x8a5a10, accent: 0xffbb55 }, // Ch4 — amber summoner
  5: { body: 0x6a1a00, skin: 0xaa3300, accent: 0xff6600 }, // Ch5 — ember tyrant
  6: { body: 0x2a0a4a, skin: 0x5a1a8a, accent: 0xcc66ff }, // Ch6 — void king
};

function drawBoss(g, cx, cy, flash, anim, raging, chapter) {
  const SE    = 1.35; // noticeably larger than brute
  const pal   = BOSS_CHAPTER_COLORS[chapter] || BOSS_CHAPTER_COLORS[1];
  const body  = flash ? 0xffbbbb : (raging ? 0xdd4400 : pal.body);
  const skin  = flash ? 0xffddcc : (raging ? 0xee6622 : pal.skin);
  const dark  = 0x0a0000;
  const bob   = Math.sin(anim * Math.PI * 1.5) * 2 * SE;
  const rage  = raging ? 1 : 0;

  // Rage aura — fiery outer glow when enraged
  if (raging) {
    g.fillStyle(0xff4400, 0.15 + Math.sin(anim * Math.PI * 6) * 0.08);
    g.fillCircle(cx, cy + bob, 60 * SE);
  }

  // Massive torso — wider and taller than brute
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 34*SE, cy - 6*SE + bob, 68*SE, 52*SE, 10);
  g.fillStyle(raging ? 0xaa2200 : 0x5a000a, 0.55);
  g.fillRoundedRect(cx - 34*SE, cy - 6*SE + bob, 68*SE, 16*SE, 10);

  // Armor plates — riveted chest plate
  g.lineStyle(2, raging ? 0xff6644 : 0x6a0010, 0.7);
  g.strokeRoundedRect(cx - 24*SE, cy - 2*SE + bob, 48*SE, 34*SE, 6);
  g.fillStyle(raging ? 0xcc3300 : 0x6a0010, 0.4);
  g.fillRoundedRect(cx - 20*SE, cy + 4*SE + bob, 40*SE, 22*SE, 4);

  // Enormous fists — iconic threat silhouette
  g.fillStyle(raging ? 0xcc3310 : 0x8a1010, 1);
  g.fillCircle(cx - 50*SE, cy + 8*SE + bob, 22*SE);
  g.fillCircle(cx + 50*SE, cy + 8*SE + bob, 22*SE);
  g.fillStyle(body, 1);
  g.fillRect(cx - 50*SE, cy - 4*SE + bob, 20*SE, 18*SE);
  g.fillRect(cx + 30*SE, cy - 4*SE + bob, 20*SE, 18*SE);
  // Knuckle ridges
  g.fillStyle(raging ? 0xaa2200 : 0x6a0a0a, 0.7);
  g.fillEllipse(cx - 52*SE, cy + 14*SE + bob, 14*SE, 8*SE);
  g.fillEllipse(cx + 52*SE, cy + 14*SE + bob, 14*SE, 8*SE);

  // Massive head
  g.fillStyle(skin, 1);
  g.fillCircle(cx, cy - 28*SE + bob, 24*SE);

  // Crown of bone spikes (6 spikes — regal menace; tinted by chapter accent)
  g.fillStyle(raging ? 0xffaa44 : (pal.accent || 0xddddaa), 1);
  const spikeCount = 6;
  for (let i = 0; i < spikeCount; i++) {
    const sx = cx - 20*SE + i * 8*SE;
    const tipY = cy - 52*SE + bob - (i % 2 === 0 ? 10*SE : 0); // alternating heights
    g.fillTriangle(sx - 5*SE, cy - 44*SE + bob, sx, tipY, sx + 5*SE, cy - 44*SE + bob);
  }

  // Deep-set burning eyes — glowing intense
  const eyeColor = raging ? 0xff8800 : 0xff0000;
  g.fillStyle(eyeColor, 0.45);
  g.fillCircle(cx - 10*SE, cy - 30*SE + bob, 9*SE);
  g.fillCircle(cx + 10*SE, cy - 30*SE + bob, 9*SE);
  g.fillStyle(eyeColor, 1);
  g.fillCircle(cx - 10*SE, cy - 30*SE + bob, 5.5*SE);
  g.fillCircle(cx + 10*SE, cy - 30*SE + bob, 5.5*SE);
  // White hot core when raging
  if (raging) {
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx - 10*SE, cy - 30*SE + bob, 2.5*SE);
    g.fillCircle(cx + 10*SE, cy - 30*SE + bob, 2.5*SE);
  }
  // Angry ridge brows
  g.lineStyle(3.5, dark, 0.9);
  g.lineBetween(cx - 17*SE, cy - 37*SE + bob, cx - 5*SE,  cy - 34*SE + bob);
  g.lineBetween(cx + 5*SE,  cy - 37*SE + bob, cx + 17*SE, cy - 34*SE + bob);

  // Battle-scarred face — deep horizontal slash
  g.lineStyle(2.5, dark, 0.85);
  g.lineBetween(cx - 16*SE, cy - 26*SE + bob, cx + 16*SE, cy - 26*SE + bob);
  g.lineStyle(1.5, dark, 0.50);
  g.lineBetween(cx - 12*SE, cy - 22*SE + bob, cx + 12*SE, cy - 22*SE + bob);

  // Gaping roar mouth — filled with jagged teeth
  g.fillStyle(dark, 1);
  g.fillRoundedRect(cx - 11*SE, cy - 16*SE + bob, 22*SE, 8*SE, 3);
  g.fillStyle(0xd8d8a0, 1);
  for (let i = 0; i < 4; i++) {
    g.fillRect(cx - 10*SE + i * 6*SE, cy - 16*SE + bob, 4*SE, 7*SE);
  }

  // Heavy stomping legs
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - 26*SE, cy + 44*SE + bob, 20*SE, 12*SE, 5);
  g.fillRoundedRect(cx +  6*SE, cy + 44*SE + bob, 20*SE, 12*SE, 5);
}

/** Enemy dispatcher */
function drawEnemyByType(g, cx, cy, type, flash, anim, extra) {
  flash = !!flash;
  anim  = anim  || 0;
  switch (type) {
    case 'walker':   drawWalker(g,   cx, cy, flash, anim);                            break;
    case 'runner':   drawRunner(g,   cx, cy, flash, anim);                            break;
    case 'brute':    drawBrute(g,    cx, cy, flash, anim);                            break;
    case 'shielder': drawShielder(g, cx, cy, flash, anim, false);                     break;
    case 'jumper':   drawJumper(g,   cx, cy, flash, anim, extra && extra.jumping);    break;
    case 'exploder': drawExploder(g, cx, cy, flash, anim);                            break;
    case 'boss':     drawBoss(g,     cx, cy, flash, anim, extra && extra.raging, extra && extra.chapter); break;
  }
}

// ─── PROJECTILE VISUALS ───────────────────────────────────────

/**
 * Bark Pup fires a "bark pulse" — golden orb + ripple ring + star lines.
 * Frost Pup fires a frost orb  — blue circle + white highlight + sparkle dot.
 */
function drawProjectile(g, cx, cy, type) {
  if (type === 'frost_pup') {
    // Frost orb
    g.fillStyle(0x87ceeb, 0.95);
    g.fillCircle(cx, cy, 7);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx - 2, cy - 2, 3);
    g.fillStyle(0xaaddff, 1);
    g.fillCircle(cx + 3, cy + 2, 2);
  } else if (type === 'sniper_oyong') {
    g.fillStyle(0xe8f4ff, 0.95);
    g.fillRect(cx - 10, cy - 1.5, 20, 3);
    g.fillStyle(0x99ccff, 0.85);
    g.fillCircle(cx + 8, cy, 3.2);
    g.lineStyle(1.5, 0xbfdfff, 0.75);
    g.strokeCircle(cx + 8, cy, 5.8);
  } else if (type === 'fire_oyong') {
    g.fillStyle(0xff8844, 0.92);
    g.fillCircle(cx, cy, 7);
    g.fillStyle(0xffcc55, 0.95);
    g.fillCircle(cx - 1.5, cy - 2, 3.6);
    g.fillStyle(0xff4422, 0.48);
    g.fillCircle(cx + 4, cy + 2, 5);
  } else if (type === 'treat_pup') {
    g.fillStyle(0xffd76a, 0.96);
    g.fillEllipse(cx, cy, 10, 7);
    g.fillStyle(0xffffff, 0.65);
    g.fillCircle(cx - 2, cy - 1.5, 1.6);
    g.fillStyle(0x77bb55, 0.9);
    g.fillTriangle(cx + 1, cy - 1, cx + 6, cy - 7, cx + 4, cy - 1);
  } else {
    // Bark pulse (gold orb with ripple ring)
    g.fillStyle(0xffdd33, 0.92);
    g.fillCircle(cx, cy, 6);
    g.fillStyle(0xffffff, 0.65);
    g.fillCircle(cx - 2, cy - 2, 2.5);
    g.lineStyle(2, 0xffaa22, 0.7);
    g.strokeCircle(cx, cy, 9);
    // Small star-burst lines
    g.lineStyle(1.5, 0xffdd44, 0.5);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.lineBetween(
        cx + Math.cos(a) * 8,  cy + Math.sin(a) * 8,
        cx + Math.cos(a) * 12, cy + Math.sin(a) * 12
      );
    }
  }
}

/**
 * Freeze overlay drawn on top of a frozen enemy.
 * Semi-transparent ice circle + radiating crystal spokes.
 */
function drawFreezeOverlay(g, cx, cy, size) {
  g.fillStyle(0x87ceeb, 0.22);
  g.fillCircle(cx, cy, size);
  g.lineStyle(1.5, 0xaaddff, 0.7);
  g.strokeCircle(cx, cy, size);
  g.lineStyle(1, 0xffffff, 0.4);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.lineBetween(cx, cy,
      cx + Math.cos(a) * size * 0.72,
      cy + Math.sin(a) * size * 0.72);
  }
}

// ─── DOG EVOLUTION EFFECTS ────────────────────────────────────

/**
 * drawEvolutionEffects — draws aura/glow behind the dog for Lv2 and Lv3.
 * Called in Dog.draw() BEFORE drawDogByType so the dog sits on top.
 *
 * Lv2: soft pulsing ring in the dog's type color
 * Lv3: rotating orbital particles + strong animated ring + inner glow
 *
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} cx        — dog center x (with recoil applied)
 * @param {number} cy        — dog center y (with bob applied)
 * @param {number} level     — 2 or 3
 * @param {string} type      — dog type key (from DOG_DEFS)
 * @param {number} animTime  — scene time in ms
 */
function drawEvolutionEffects(g, cx, cy, level, type, animTime) {
  // Aura color per dog type
  const auraColor = {
    bark_pup:  0xffaa44,
    guard_dog: 0xff6655,
    frost_pup: 0x44ccff,
    sniper_oyong: 0x99ccff,
    fire_oyong: 0xff8844,
    chain_oyong: 0xbb88ff,
    guardian_oyong: 0x88c8d8,
    treat_pup: 0xffd700,
  }[type] || 0xffffff;

  // Aura is centered slightly above body center (dog head area).
  const acy = cy - 10;

  if (level === 2) {
    // Dual pulsing rings + floating energy diamonds
    const pulse  = (Math.sin(animTime / 600) + 1) / 2;
    const pulse2 = (Math.sin(animTime / 400 + 1.2) + 1) / 2;

    // Outer ring
    g.lineStyle(2, auraColor, 0.28 + pulse * 0.22);
    g.strokeCircle(cx, acy, 46);
    // Inner ring (offset phase)
    g.lineStyle(1.5, auraColor, 0.14 + pulse2 * 0.14);
    g.strokeCircle(cx, acy, 36);
    // Soft fill
    g.fillStyle(auraColor, 0.04 + pulse * 0.05);
    g.fillCircle(cx, acy, 46);

    // 4 floating energy diamonds at ring edge
    const dT = animTime / 1400;
    for (let i = 0; i < 4; i++) {
      const angle = dT + (i / 4) * Math.PI * 2;
      const dx = cx  + Math.cos(angle) * 46;
      const dy = acy + Math.sin(angle) * 36;
      const da = 0.5 + pulse * 0.4;
      g.fillStyle(auraColor, da);
      // Diamond shape (4 triangles)
      g.fillTriangle(dx, dy - 4, dx - 3, dy, dx, dy + 4);
      g.fillTriangle(dx, dy - 4, dx + 3, dy, dx, dy + 4);
    }
  }

  if (level === 3) {
    // ── MAX LEVEL: crown spikes + 8 orbital particles + pulsing core ──
    const pulse  = (Math.sin(animTime / 220) + 1) / 2;
    const pulse2 = (Math.sin(animTime / 350 + 0.8) + 1) / 2;

    // Bright inner core glow (type color)
    g.fillStyle(auraColor, 0.10 + pulse2 * 0.09);
    g.fillCircle(cx, acy, 32);

    // 8 orbital particles with trails (elliptical orbit)
    const t = animTime / 750;
    for (let i = 0; i < 8; i++) {
      const angle = t + (i / 8) * Math.PI * 2;
      const ox = cx  + Math.cos(angle) * 52;
      const oy = acy + Math.sin(angle) * 38;
      g.fillStyle(auraColor, 0.90);
      g.fillCircle(ox, oy, 3.0);
      // Trail (two fading dots)
      const ta1 = angle - 0.30;
      const ta2 = angle - 0.60;
      g.fillStyle(auraColor, 0.45);
      g.fillCircle(cx + Math.cos(ta1) * 52, acy + Math.sin(ta1) * 38, 2.0);
      g.fillStyle(auraColor, 0.18);
      g.fillCircle(cx + Math.cos(ta2) * 52, acy + Math.sin(ta2) * 38, 1.3);
    }

    // Pulsing main ring
    g.lineStyle(3.5, auraColor, 0.50 + pulse * 0.38);
    g.strokeCircle(cx, acy, 44);
    // Outer halo
    g.lineStyle(1.5, auraColor, 0.15 + pulse * 0.14);
    g.strokeCircle(cx, acy, 57);
    // Second outer halo (slow pulse, offset)
    g.lineStyle(1, auraColor, 0.08 + pulse2 * 0.08);
    g.strokeCircle(cx, acy, 64);

    // Crown spikes: 6 upward spikes above the dog (regal max-level marker)
    const spikeBase = acy - 44;
    g.fillStyle(auraColor, 0.72 + pulse * 0.20);
    for (let i = 0; i < 5; i++) {
      const sx = cx - 16 + i * 8;
      const tipH = (i % 2 === 0) ? 14 : 9;
      g.fillTriangle(sx - 4, spikeBase, sx, spikeBase - tipH, sx + 4, spikeBase);
    }
    // Crown base bar
    g.fillStyle(auraColor, 0.40 + pulse * 0.20);
    g.fillRect(cx - 20, spikeBase - 2, 40, 4);
  }
}
