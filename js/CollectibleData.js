// ============================================================
// CollectibleData.js — cosmetic collection rewards
// ============================================================

const COLLECTIBLE_RARITY_STYLES = {
  common: {
    label: 'Common',
    fill: 0x2a3c52,
    border: 0x89a6c5,
    glow: 0xb7d2ef,
  },
  rare: {
    label: 'Rare',
    fill: 0x1d3c68,
    border: 0x59a7ff,
    glow: 0xa9d7ff,
  },
  epic: {
    label: 'Epic',
    fill: 0x41245d,
    border: 0xc97cff,
    glow: 0xf1b5ff,
  },
  legendary: {
    label: 'Legendary',
    fill: 0x5b3b11,
    border: 0xffcf5a,
    glow: 0xffefad,
  },
};

const COLLECTIBLE_DEFS = [
  {
    id: 'sunny-bandana',
    name: 'Sunny Bandana',
    category: 'skin',
    rarity: 'common',
    desc: 'A warm little bandana that makes Oyong look extra bright.',
  },
  {
    id: 'berry-collar',
    name: 'Berry Collar',
    category: 'collar',
    rarity: 'common',
    desc: 'A soft berry-red collar with a tiny paw charm.',
  },
  {
    id: 'moon-bell',
    name: 'Moon Bell',
    category: 'collar',
    rarity: 'rare',
    desc: 'A midnight-blue collar with a moonlit bell.',
  },
  {
    id: 'paw-knit-wrap',
    name: 'Paw Knit Wrap',
    category: 'skin',
    rarity: 'rare',
    desc: 'A cozy wrap with stitched paw patterns.',
  },
  {
    id: 'starlight-garland',
    name: 'Starlight Garland',
    category: 'accent',
    rarity: 'epic',
    desc: 'A glowing room garland that makes home feel magical.',
  },
  {
    id: 'royal-halo',
    name: 'Royal Halo',
    category: 'skin',
    rarity: 'legendary',
    desc: 'A radiant halo shimmer fit for a legendary Oyong.',
  },
];

function getCollectibleDef(id) {
  return COLLECTIBLE_DEFS.find(item => item.id === id) || null;
}

function getCollectibleItems() {
  return COLLECTIBLE_DEFS.slice();
}

function getCollectibleRarityStyle(rarity) {
  return COLLECTIBLE_RARITY_STYLES[rarity] || COLLECTIBLE_RARITY_STYLES.common;
}

function getCollectibleRewardChance(stars, firstClear) {
  let chance = 0.30;
  if (stars >= 3) chance += 0.08;
  if (firstClear) chance += 0.05;
  return Math.min(0.55, chance);
}

function getCollectibleDropRates() {
  return {
    common: 0.70,
    rare: 0.20,
    epic: 0.08,
    legendary: 0.02,
  };
}

function rollCollectibleDrop(ownedIds, stars, firstClear) {
  const ownedSet = new Set(Array.isArray(ownedIds) ? ownedIds : []);
  const candidates = COLLECTIBLE_DEFS.filter(item => !ownedSet.has(item.id));
  const dropChance = getCollectibleRewardChance(stars, firstClear);
  const rarityRates = getCollectibleDropRates();
  if (candidates.length === 0) {
    return {
      item: null,
      chance: dropChance,
      rarityRates,
      duplicateProtected: true,
      collectionComplete: true,
    };
  }

  if (Math.random() > dropChance) {
    return {
      item: null,
      chance: dropChance,
      rarityRates,
      duplicateProtected: true,
      collectionComplete: false,
    };
  }

  const rarityWeights = {
    common: 70,
    rare: 20,
    epic: 8,
    legendary: 2,
  };

  const weighted = candidates.map(item => ({
    item,
    weight: rarityWeights[item.rarity] || 1,
  }));

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return {
        item: Object.assign({ rewardType: 'collectible', isNew: true }, entry.item),
        chance: dropChance,
        rarityRates,
        duplicateProtected: true,
        collectionComplete: false,
      };
    }
  }
  return {
    item: Object.assign({ rewardType: 'collectible', isNew: true }, weighted[weighted.length - 1].item),
    chance: dropChance,
    rarityRates,
    duplicateProtected: true,
    collectionComplete: false,
  };
}
