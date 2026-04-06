// ============================================================
// HomeData.js — Oyong Home progression constants and catalog
// ============================================================

const HOME_CURRENCY_NAME       = 'Biscuits';
const HOME_STAT_MAX            = 100;
const HOME_MAX_HAPPINESS       = HOME_STAT_MAX; // legacy alias
const HOME_START_HUNGER        = 72;
const HOME_START_MOOD          = 68;
const HOME_START_ENERGY        = 76;
const HOME_START_HAPPINESS     = HOME_START_MOOD; // legacy alias

const HOME_FEED_COST           = 4;
const HOME_FEED_HUNGER_GAIN    = 18;
const HOME_FEED_MOOD_GAIN      = 4;
const HOME_PET_MOOD_GAIN       = 16;
const HOME_PET_ENERGY_GAIN     = 4;
const HOME_REST_ENERGY_GAIN    = 18;
const HOME_REST_MOOD_GAIN      = 4;
const HOME_BATTLE_DECAY_WIN    = { hunger: 6, mood: 4, energy: 8 };
const HOME_BATTLE_DECAY_LOSS   = { hunger: 8, mood: 5, energy: 10 };
const HOME_PASSIVE_DECAY_MS    = 45 * 60 * 1000;
const HOME_EARLY_WAVE_BONUS_MS = 25000;
const HOME_BOND_XP_LEVELS      = [0, 20, 48, 90, 150, 230];

const HOME_DECOR_SLOTS = [
  { key: 'bed',  label: 'Bed' },
  { key: 'bowl', label: 'Bowl' },
  { key: 'rug',  label: 'Rug' },
  { key: 'wall', label: 'Wall' },
  { key: 'toy',  label: 'Toy' },
];

const HOME_DECOR_ORDER = [
  'cloud_bed',
  'snack_bowl',
  'patchwork_rug',
  'paw_frame',
  'squeaky_toy',
  'cozy_bed',
  'heart_bowl',
  'moon_frame',
  'toy_basket',
];

const HOME_DECOR_DEFS = {
  cloud_bed: {
    id: 'cloud_bed',
    name: 'Cloud Bed',
    slot: 'bed',
    cost: 0,
    starter: true,
    unlockBond: 1,
    desc: 'A fluffy starter bed for soft naps and tail wags.',
  },
  snack_bowl: {
    id: 'snack_bowl',
    name: 'Snack Bowl',
    slot: 'bowl',
    cost: 10,
    unlockBond: 1,
    desc: 'A tidy little bowl for homey snack time.',
  },
  patchwork_rug: {
    id: 'patchwork_rug',
    name: 'Patchwork Rug',
    slot: 'rug',
    cost: 16,
    unlockBond: 1,
    desc: 'A soft rug that makes the room feel lived in.',
  },
  paw_frame: {
    id: 'paw_frame',
    name: 'Paw Frame',
    slot: 'wall',
    cost: 18,
    unlockBond: 1,
    desc: 'A cheerful wall frame with a proud paw print.',
  },
  squeaky_toy: {
    id: 'squeaky_toy',
    name: 'Squeaky Toy',
    slot: 'toy',
    cost: 12,
    unlockBond: 1,
    desc: 'A round squeaky toy for playful zoomies.',
  },
  cozy_bed: {
    id: 'cozy_bed',
    name: 'Cozy Bed',
    slot: 'bed',
    cost: 26,
    unlockBond: 2,
    desc: 'A thicker bed with plush sides for deep naps.',
  },
  heart_bowl: {
    id: 'heart_bowl',
    name: 'Heart Bowl',
    slot: 'bowl',
    cost: 18,
    unlockBond: 2,
    desc: 'A polished bowl with a tiny heart on the rim.',
  },
  moon_frame: {
    id: 'moon_frame',
    name: 'Moon Frame',
    slot: 'wall',
    cost: 24,
    unlockBond: 3,
    desc: 'A dreamy moon-and-stars frame for the wall shelf.',
  },
  toy_basket: {
    id: 'toy_basket',
    name: 'Toy Basket',
    slot: 'toy',
    cost: 22,
    unlockBond: 2,
    desc: 'A basket of chew toys for playful evenings.',
  },
};

function clampHomeStat(value) {
  return Math.max(0, Math.min(HOME_STAT_MAX, Math.floor(Number(value) || 0)));
}

function getHomeDecorItems() {
  return HOME_DECOR_ORDER.map(id => HOME_DECOR_DEFS[id]).filter(Boolean);
}

function getHomeDecorBySlot(slotKey) {
  return getHomeDecorItems().filter(def => def.slot === slotKey);
}

function getHomeMoodLabel(mood) {
  if (mood >= 80) return 'Bright';
  if (mood >= 55) return 'Cheery';
  if (mood >= 30) return 'Calm';
  return 'Quiet';
}

function getHomeStatLabel(kind, value) {
  if (kind === 'hunger') {
    if (value >= 80) return 'Full';
    if (value >= 55) return 'Content';
    if (value >= 30) return 'Peckish';
    return 'Hungry';
  }
  if (kind === 'energy') {
    if (value >= 80) return 'Zoomy';
    if (value >= 55) return 'Ready';
    if (value >= 30) return 'Drowsy';
    return 'Sleepy';
  }
  return getHomeMoodLabel(value);
}

function getHomeStatTier(value) {
  if (value >= 80) return 3;
  if (value >= 55) return 2;
  if (value >= 30) return 1;
  return 0;
}

function getBondLevelForXp(xp) {
  let level = 1;
  for (let i = 0; i < HOME_BOND_XP_LEVELS.length; i++) {
    if (xp >= HOME_BOND_XP_LEVELS[i]) level = i + 1;
  }
  return level;
}

function getBondProgress(xp) {
  const level = getBondLevelForXp(xp);
  const currentLevelXp = HOME_BOND_XP_LEVELS[level - 1] || 0;
  const nextLevelXp = HOME_BOND_XP_LEVELS[level] || currentLevelXp;
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const progress = level >= HOME_BOND_XP_LEVELS.length
    ? 1
    : Math.max(0, Math.min(1, (xp - currentLevelXp) / span));
  return { level, xp, currentLevelXp, nextLevelXp, progress };
}

function getHomeCareBonus(stats) {
  const hungerTier = getHomeStatTier(stats.hunger);
  const moodTier   = getHomeStatTier(stats.mood);
  const energyTier = getHomeStatTier(stats.energy);

  const rewardBonus = [0, 1, 2, 3][hungerTier];
  const treatBonus  = [0, 2, 4, 6][moodTier];
  const damageMult  = [0, 0.03, 0.06, 0.10][energyTier];

  return {
    rewardBonus,
    treatBonus,
    damageMult,
    desc: `${treatBonus > 0 ? `+${treatBonus} starting treats` : 'No starting treats'} • ${rewardBonus > 0 ? `+${rewardBonus} biscuits after battle` : 'no biscuit bonus'}`,
    rewardDesc: rewardBonus > 0 ? `+${rewardBonus} post-battle ${HOME_CURRENCY_NAME.toLowerCase()}` : 'No post-battle biscuit bonus',
    treatDesc: treatBonus > 0 ? `+${treatBonus} starting treats` : 'No starting treat bonus',
    energyDesc: damageMult > 0 ? `+${Math.round(damageMult * 100)}% early-wave damage` : 'No early-wave combat bonus',
  };
}
