// ============================================================
// Config.js — Game constants, unit stats
// ============================================================

const GAME_W = 960;
const GAME_H = 620;

// Grid layout — 8 columns × 5 lanes
const GRID = {
  COLS:     8,
  ROWS:     5,
  CELL_W:   92,
  CELL_H:   88,
  OFFSET_X: 94,   // x-center of column 0
  OFFSET_Y: 104,  // y-center of lane 0
};

/** Pixel x-center of a grid column */
function gridX(col)  { return GRID.OFFSET_X + col * GRID.CELL_W; }
/** Pixel y-center of a lane */
function laneY(lane) { return GRID.OFFSET_Y + lane * GRID.CELL_H; }

const ENEMY_LANE_OFFSETS = {
  brute: -6,
};

/** Pixel y-center of an enemy adjusted for type-specific visual centering */
function enemyLaneY(lane, type) {
  return laneY(lane) + (ENEMY_LANE_OFFSETS[type] || 0);
}

const SPAWN_X = 1010; // enemies spawn off-screen right
const BASE_X  = 48;   // enemy reaching this x = lose (house left edge)

// Shared mutable state accessible by all scenes
const GameState = {
  selectedDog:  null,
  loadoutDogs:  [],    // dog types chosen in LoadoutScene; read by UIScene + GameScene
  newUnlocks:   [],    // dog types unlocked on last level completion; cleared by LoadoutScene
  lastHomeReward: 0,   // biscuits earned from the most recent victory
  lastBattleBonus: 0,  // happiness bonus applied to starting treats
  lastHomeRewardBreakdown: null,
  lastBondGain: 0,
  lastCollectibleDrop: null,
  lastRewardDropInfo: null,
  challengeMode: false, // true when playing Wave Challenge (set by LoadoutScene)
};

const DOG_ORDER = [
  'bark_pup',
  'guard_dog',
  'frost_pup',
  'sniper_oyong',
  'fire_oyong',
  'chain_oyong',
  'guardian_oyong',
  'treat_pup',
];

// ─── Color palettes per dog variant ──────────────────────────
// Edit these to recolor a dog without touching draw logic.
const DOG_COLORS = {

  bark_pup: {
    body:     0xf5ede0,  // warm cream-white
    marking:  0x8b4513,  // saddle-brown eye patches
    earOuter: 0xcd853f,  // Peru/amber outer ear
    earInner: 0xffc8a8,  // warm peach inner ear
    chest:    0xffffff,  // bright white fluff
    dark:     0x1a0a00,  // near-black
  },

  guard_dog: {
    body:     0xede8dc,
    marking:  0x5c2a0a,  // deep mahogany
    earOuter: 0x9e6030,
    earInner: 0xffaaa0,  // salmon pink
    chest:    0xffffff,
    dark:     0x100500,
  },

  frost_pup: {
    body:     0xd8ecf8,  // icy blue-white
    marking:  0x4a6898,  // steel blue
    earOuter: 0x7a9dbf,
    earInner: 0xb8d8f0,
    chest:    0xe0f0ff,
    dark:     0x182035,
  },

  treat_pup: {
    body:     0xf9e090,  // warm golden-yellow
    marking:  0xcc8800,  // amber-brown markings
    earOuter: 0xe8a020,  // orange-gold outer ear
    earInner: 0xffe8a0,  // pale gold inner ear
    chest:    0xfffde0,  // cream-gold fluff
    dark:     0x3a1a00,  // dark brown
  },

  sniper_oyong: {
    body:     0xcfd8f0,
    marking:  0x3d537d,
    earOuter: 0x4a658f,
    earInner: 0xbfd0ea,
    chest:    0xf4f8ff,
    dark:     0x101c32,
  },

  fire_oyong: {
    body:     0xffd0a8,
    marking:  0xcc5a18,
    earOuter: 0xe67d2a,
    earInner: 0xffd6a8,
    chest:    0xfff0d6,
    dark:     0x3a1200,
  },

  chain_oyong: {
    body:     0xe0d5ff,
    marking:  0x7354b4,
    earOuter: 0x8e6fd0,
    earInner: 0xd8cbff,
    chest:    0xf8f4ff,
    dark:     0x24153b,
  },

  guardian_oyong: {
    body:     0xd8e3e8,
    marking:  0x4f6672,
    earOuter: 0x6b8594,
    earInner: 0xc6d6de,
    chest:    0xf7fbff,
    dark:     0x18262f,
  },

};

// ─── Dog defender definitions ─────────────────────────────────
//
// BALANCE PHILOSOPHY:
//   Bark Pup  — cheap and fast, backbone of early lanes
//   Guard Dog — expensive but soaks massive damage at front
//   Frost Pup — support: slows entire column so others can catch up
//   Treat Pup — economic engine; needs 2-3 waves to pay back cost
//
// TUNING GUIDE:
//   attackRate — lower = faster attacks (ms between swings)
//   range      — in grid columns (1 = melee, 5 = full-field)
//   projSpeed  — px/s; higher = harder for fast enemies to dodge
//   freeze     — ice-slow duration in ms applied on each hit
// ──────────────────────────────────────────────────────────────
const DOG_DEFS = {

  bark_pup: {
    name:    'Oyong Scout',
    cost:    25,      // affordable × 5 at game start
    hp:      70,      // light — relies on range advantage
    attack:  18,
    attackRate: 1100, // brisk fire rate; compensates low damage
    range:   5,       // full-lane ranged attacker
    projSpeed: 360,
    freeze:  0,
    color:   0xf5ede0,
    role:    'Scout · Fast Ranged',
    desc:    'Quick attacker, great starter',
    flavor:  'Always ready to bark first.',
  },

  guard_dog: {
    name:    'Oyong Tank',
    cost:    50,      // mid-tier; players can afford 2 in L1
    hp:      260,     // tanky — absorbs brutes & shielders
    attack:  48,      // high melee damage — best shield-breaker
    attackRate: 1400, // slower swing but hits hard
    range:   1,       // melee only — must be front-row
    projSpeed: 0,
    freeze:  0,
    color:   0xede8dc,
    role:    'Tank · Blocker',
    desc:    'High HP, takes hits up front',
    flavor:  'Stands his ground no matter what.',
  },

  frost_pup: {
    name:    'Oyong Frost',
    cost:    100,     // premium — pays off vs Runners
    hp:      110,     // fragile; protect with Oyong Tank in front
    attack:  22,
    attackRate: 2000, // slow shots, but every one slows
    range:   4,
    projSpeed: 240,   // faster projectile to hit Runners
    freeze:  3000,    // 3 s slow — strong crowd control
    color:   0xd8ecf8,
    role:    'Ice Slow · Support',
    desc:    'Every hit freezes enemies briefly',
    flavor:  'Cool, calm, and slows enemies.',
  },

  treat_pup: {
    name:    'Treat Farmer Oyong',
    cost:    25,          // early economy unit — same tier as Bark Pup
    hp:      90,
    attack:  6,           // minimal combat — keep in back row
    attackRate: 2500,
    range:   4,
    projSpeed: 250,
    freeze:  0,
    color:   0xf9e090,
    role:    'Economy · Treat Generator',
    desc:    'Generates +10 treats every 5.5s. Place in back row.',
    flavor:  'Works the fields so your fighters can fight.',
    treatAmount: 10,
    treatRate:   5500,
  },

  sniper_oyong: {
    name:    'Sniper Oyong',
    cost:    95,
    hp:      70,
    attack:  90,
    attackRate: 3000,
    range:   8,
    projSpeed: 680,
    freeze:  0,
    color:   0xcfd8f0,
    role:    'Long Range · Sniper',
    desc:    'Hits from across the whole lane',
    flavor:  'Takes the clean shot from deep.',
    targeting: 'farthest',
  },

  fire_oyong: {
    name:    'Fire Oyong',
    cost:    80,
    hp:      95,
    attack:  16,
    attackRate: 1350,
    range:   4,
    projSpeed: 320,
    freeze:  0,
    color:   0xffb066,
    role:    'Burn Damage · DoT',
    desc:    'Sets enemies on fire, damage stacks',
    flavor:  'Leaves every target smoldering.',
    burnDamage: 8,
    burnDuration: 3200,
    burnTick: 900,
  },

  chain_oyong: {
    name:    'Chain Oyong',
    cost:    85,
    hp:      90,
    attack:  20,
    attackRate: 1650,
    range:   4,
    projSpeed: 0,
    freeze:  0,
    color:   0xd9c6ff,
    role:    'Chain · Multi-Target',
    desc:    'Arcs through clustered enemies',
    flavor:  'Turns packs into one connected problem.',
    attackMode: 'chain',
    chainTargets: 3,
    chainFalloff: 0.72,
  },

  guardian_oyong: {
    name:    'Guardian Oyong',
    cost:    75,
    hp:      420,
    attack:  12,
    attackRate: 1750,
    range:   1,
    projSpeed: 0,
    freeze:  0,
    color:   0xd8e3e8,
    role:    'Blocker · Wall',
    desc:    'Massive HP, stops the lane cold',
    flavor:  'Built to stop the lane, not win it alone.',
    damageReduction: 0.12,
  },

};

// ─── Enemy definitions ────────────────────────────────────────
//
// BALANCE PHILOSOPHY:
//   Walker   — tutorial enemy; predictable, easy to block
//   Runner   — fast but frail; punishes uncovered lanes
//   Brute    — slow, enormous HP; requires focus-fire or Guard Dog
//   Shielder — tanky with absorbing shield; break shield to slow, then kill
//   Jumper   — medium HP, skips your first blocker; forces layered defense
//
// TUNING GUIDE:
//   speed       — px/s across the field (~640 px wide)
//   reward      — treats earned on kill
//   attackRate  — ms between attacks on the dog blocking it
//   shieldHp    — shield depletes by full hit value each attack
//   shieldReduction — fraction of hit body takes while shield active (0.65 = 35% through)
// ──────────────────────────────────────────────────────────────
const ENEMY_DEFS = {

  walker: {
    name:       'Walker',
    hp:         80,      // light — Bark Pup kills in ~5 hits
    speed:      25,      // px/s; crosses field in ~25 s unimpeded
    reward:     8,
    damage:     18,
    attackRate: 1500,
    color:      0x5a8a3c,
  },

  runner: {
    name:       'Runner',
    hp:         40,      // very fragile — Bark Pup 2-shots it
    speed:      68,      // crosses field in ~9 s — demanding
    reward:     12,
    damage:     15,
    attackRate: 900,     // fast attacker once blocked
    color:      0xcc4444,
  },

  brute: {
    name:       'Brute',
    hp:         300,     // takes ~7 Guard Dog hits to kill
    speed:      18,      // slowest — gives players time to respond
    reward:     30,
    damage:     50,      // hits very hard — one Guard Dog can hold it
    attackRate: 2000,
    color:      0x8b3a2a,
  },

  shielder: {
    name:             'Shielder',
    hp:               180,
    speed:            22,
    reward:           25,
    damage:           28,
    attackRate:       1600,
    color:            0x4a5a8a,
    // Shield mechanic: absorbs most damage until broken, then shielder speeds up
    shieldHp:         120,    // shield depletes by full hit; easier to break than before
    shieldReduction:  0.65,   // 65% of each hit absorbed — 35% bleeds through
    speedAfterBreak:  36,     // speeds up after shield breaks — don't let it reach house
  },

  jumper: {
    name:       'Jumper',
    hp:         70,      // fragile once it lands — kill it fast
    speed:      42,      // faster than walker; urgent after landing
    reward:     15,
    damage:     20,
    attackRate: 1100,
    color:      0x9a5a2a,   // rusty brown
    // Jump mechanic: skips the first dog blocker with an arc tween (one jump per life)
  },

  exploder: {
    name:             'Exploder',
    hp:               55,      // fragile — kill it before it reaches your line
    speed:            32,      // slightly faster than walker — creates urgency
    reward:           22,
    damage:           60,      // explosion damage per dog in blast radius
    attackRate:       9999999, // never normal-attacks — detonates on first contact
    color:            0xff6600, // vivid orange — "DANGER" signal
    // Exploder mechanic: on first contact with a dog, triggers AoE explosion in the lane.
    // Damages all dogs within explosionRadius pixels. Exploder is destroyed on detonation.
    explosionRadius:  130,
  },

  boss: {
    name:             'Boss',
    hp:               800,     // enormous HP pool — takes sustained focus
    speed:            14,      // slow, deliberate advance
    reward:           80,
    damage:           80,
    attackRate:       1800,
    color:            0xcc0022, // crimson — unmistakable threat
    // Boss mechanic: at rageThreshold HP, enters Rage — speed multiplied, damage increased.
    rageThreshold:    0.50,    // rage triggers at 50% HP
    rageSpeedMult:    2.0,
    rageDamage:       120,
  },

};

const BOSS_CHAPTER_DEFS = {
  1: {
    name: 'The Grave Alpha',
    intro: 'A hulking undead pack leader',
    accentColor: 0xff6644,
    hpMult: 1.10,
    baseSpeedMult: 0.90,
  },
  2: {
    name: 'The Red Strider',
    intro: 'Charges forward in violent bursts',
    accentColor: 0xff8844,
    hpMult: 1.00,
    burstCooldown: 4200,
    burstDuration: 1200,
    burstSpeedMult: 2.3,
  },
  3: {
    name: 'The Iron Maw',
    intro: 'Its shield slowly rebuilds itself',
    accentColor: 0x88ccff,
    hpMult: 1.08,
    shieldMax: 220,
    shieldRegenDelay: 2400,
    shieldRegenRate: 34,
    shieldThroughPct: 0.18,
  },
  4: {
    name: 'The Siege Caller',
    intro: 'Summons extra undead into the lane',
    accentColor: 0xffbb55,
    hpMult: 1.12,
    summonCooldown: 5600,
    summonTypes: ['walker', 'runner'],
    summonCount: 2,
  },
  5: {
    name: 'The Cinder Tyrant',
    intro: 'Detonates in a massive final blast',
    accentColor: 0xff6600,
    hpMult: 1.14,
    deathExplosionRadius: 190,
    deathExplosionDamage: 95,
  },
  6: {
    name: 'The Apocalypse King',
    intro: 'Bursts, shields, summons, then explodes',
    accentColor: 0xcc66ff,
    hpMult: 1.22,
    shieldMax: 240,
    shieldRegenDelay: 2200,
    shieldRegenRate: 40,
    shieldThroughPct: 0.22,
    burstCooldown: 3800,
    burstDuration: 1300,
    burstSpeedMult: 2.15,
    summonCooldown: 5200,
    summonTypes: ['runner', 'shielder'],
    summonCount: 2,
    deathExplosionRadius: 210,
    deathExplosionDamage: 110,
  },
};

// ─── Dog evolution — upgrade costs & stat multipliers ────────
//
// UPGRADE_COSTS[type][0] = treat cost to evolve from Lv1 → Lv2
// UPGRADE_COSTS[type][1] = treat cost to evolve from Lv2 → Lv3
//
const UPGRADE_COSTS = {
  bark_pup:  [30,  60],
  guard_dog: [55, 110],
  frost_pup: [80, 160],
  sniper_oyong: [70, 140],
  fire_oyong: [65, 130],
  chain_oyong: [70, 140],
  guardian_oyong: [75, 150],
  treat_pup: [30,  60],
};

// Multipliers applied to base DOG_DEFS values when a dog reaches that level.
// attackRate multiplier < 1 means faster attacks (lower ms interval).
const UPGRADE_STAT_MULT = {
  2: { hp: 1.40, attack: 1.40, attackRate: 0.85, treatAmount: 1.50, treatRate: 0.75 },
  3: { hp: 2.00, attack: 2.00, attackRate: 0.70, treatAmount: 2.00, treatRate: 0.50 },
};

// Wave definitions live in LevelData.js (per-level)
