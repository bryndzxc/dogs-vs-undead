// ============================================================
// Progression.js — save/load, level unlocks, rewards, home data
// ============================================================

const SAVE_KEY = 'dvz_progress_v5';
const SAVE_VERSION = 6;

function _defaultLevelStars() {
  return Array(LEVEL_DATA.length).fill(0);
}

function _defaultHome() {
  return {
    happiness: HOME_START_HAPPINESS,
    hunger: HOME_START_HUNGER,
    mood: HOME_START_MOOD,
    energy: HOME_START_ENERGY,
    bondXp: 0,
    bondLevel: 1,
    ownedDecor: ['cloud_bed'],
    decorSlots: { bed: 'cloud_bed' },
    currentEvent: {
      type: 'cozy',
      text: 'Oyong is curled up happily at home.',
      createdAt: Date.now(),
    },
    lastCareUpdateAt: Date.now(),
  };
}

function _defaultStats() {
  return {
    totalBiscuitsEarned: 0,
    perfectWins: 0,
    threeStarWins: 0,
    dogWins: {},
    levelPerfectWins: {},
    levelThreeStarWins: {},
  };
}

function _defaultMissionState() {
  return {
    completed: [],
    progress: {},
    notifications: [],
  };
}

function _defaultCollection() {
  return {
    owned: [],
    equipped: {
      skin: null,
      collar: null,
      accent: null,
    },
  };
}

function _defaultSave() {
  return {
    version: SAVE_VERSION,
    levelUnlocked: 1,
    levelStars: _defaultLevelStars(),
    unlockedDogs: ['bark_pup', 'guard_dog', 'treat_pup'],
    homeCurrency: 0,
    bonusTreatReserve: 0,
    waveBest: 0,
    stats: _defaultStats(),
    missions: _defaultMissionState(),
    collection: _defaultCollection(),
    home: _defaultHome(),
  };
}

function _parseNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function _decorateId(id) {
  const aliases = {
    patchwork_quilt: 'patchwork_rug',
    paw_banner: 'paw_frame',
    moon_mobile: 'moon_frame',
    flower_pot: 'squeaky_toy',
  };
  return aliases[id] || id;
}

function _dogId(id) {
  const aliases = {
    puppy: 'bark_pup',
    shiba: 'guard_dog',
    corgi: 'frost_pup',
    bulldog: 'treat_pup',
  };
  return aliases[id] || id;
}

function _normalizeNumberMap(source) {
  const output = {};
  if (!source || typeof source !== 'object') return output;
  Object.entries(source).forEach(([key, value]) => {
    output[key] = Math.max(0, Math.floor(_parseNumber(value, 0)));
  });
  return output;
}

const Progression = {
  _normalizeSave(source) {
    const fallback = _defaultSave();
    const saveData = {
      version: SAVE_VERSION,
      levelUnlocked: Math.max(1, Math.min(LEVEL_DATA.length, Math.floor(_parseNumber(source?.levelUnlocked, 1)))),
      levelStars: _defaultLevelStars(),
      unlockedDogs: [],
      homeCurrency: Math.max(0, Math.floor(_parseNumber(source?.homeCurrency, 0))),
      bonusTreatReserve: Math.max(0, Math.floor(_parseNumber(source?.bonusTreatReserve, 0))),
      waveBest: Math.max(0, Math.floor(_parseNumber(source?.waveBest, 0))),
      stats: _defaultStats(),
      missions: _defaultMissionState(),
      collection: _defaultCollection(),
      home: _defaultHome(),
    };

    if (Array.isArray(source?.levelStars)) {
      for (let i = 0; i < saveData.levelStars.length; i++) {
        saveData.levelStars[i] = Math.max(0, Math.min(3, Math.floor(_parseNumber(source.levelStars[i], 0))));
      }
    }

    const unlocked = Array.isArray(source?.unlockedDogs) ? source.unlockedDogs : fallback.unlockedDogs;
    const availableDogs = Object.keys(DOG_DEFS);
    saveData.unlockedDogs = unlocked
      .map(_dogId)
      .filter((id, index, arr) => availableDogs.includes(id) && arr.indexOf(id) === index);
    if (!saveData.unlockedDogs.includes('bark_pup')) saveData.unlockedDogs.unshift('bark_pup');
    if (!saveData.unlockedDogs.includes('guard_dog')) saveData.unlockedDogs.push('guard_dog');
    if (!saveData.unlockedDogs.includes('treat_pup')) saveData.unlockedDogs.push('treat_pup');

    const legacyMood = clampHomeStat(_parseNumber(source?.home?.happiness, HOME_START_MOOD));
    const rawHome = source?.home || {};

    saveData.home.hunger = clampHomeStat(_parseNumber(rawHome.hunger, HOME_START_HUNGER));
    saveData.home.mood = clampHomeStat(_parseNumber(rawHome.mood, legacyMood));
    saveData.home.energy = clampHomeStat(_parseNumber(rawHome.energy, HOME_START_ENERGY));
    saveData.home.happiness = saveData.home.mood;
    saveData.home.bondXp = Math.max(0, Math.floor(_parseNumber(rawHome.bondXp, 0)));
    saveData.home.bondLevel = getBondLevelForXp(saveData.home.bondXp);

    const rawOwnedDecor = Array.isArray(rawHome.ownedDecor) ? rawHome.ownedDecor : [];
    const ownedDecor = rawOwnedDecor
      .map(_decorateId)
      .filter((id, index, arr) => HOME_DECOR_DEFS[id] && arr.indexOf(id) === index);
    if (!ownedDecor.includes('cloud_bed')) ownedDecor.unshift('cloud_bed');
    saveData.home.ownedDecor = ownedDecor;

    const rawSlots = rawHome.decorSlots && typeof rawHome.decorSlots === 'object' ? rawHome.decorSlots : {};
    const normalizedSlots = {};
    Object.entries(rawSlots).forEach(([slotKey, decorId]) => {
      const normalizedSlot = slotKey === 'corner' ? 'toy' : slotKey;
      const normalizedDecorId = _decorateId(decorId);
      if (!HOME_DECOR_SLOTS.some(slot => slot.key === normalizedSlot)) return;
      if (!saveData.home.ownedDecor.includes(normalizedDecorId)) return;
      const decorDef = HOME_DECOR_DEFS[normalizedDecorId];
      if (!decorDef || decorDef.slot !== normalizedSlot) return;
      normalizedSlots[normalizedSlot] = normalizedDecorId;
    });
    if (!normalizedSlots.bed) normalizedSlots.bed = 'cloud_bed';
    saveData.home.decorSlots = normalizedSlots;

    const currentEvent = rawHome.currentEvent;
    if (currentEvent && typeof currentEvent.text === 'string' && currentEvent.text.trim()) {
      saveData.home.currentEvent = {
        type: typeof currentEvent.type === 'string' ? currentEvent.type : 'cozy',
        text: currentEvent.text.trim(),
        createdAt: Math.max(0, Math.floor(_parseNumber(currentEvent.createdAt, Date.now()))),
      };
    } else {
      saveData.home.currentEvent = fallback.home.currentEvent;
    }

    saveData.home.lastCareUpdateAt = Math.max(
      0,
      Math.floor(_parseNumber(rawHome.lastCareUpdateAt, Date.now()))
    );

    const rawStats = source?.stats || {};
    saveData.stats.totalBiscuitsEarned = Math.max(
      0,
      Math.floor(_parseNumber(rawStats.totalBiscuitsEarned, source?.homeCurrency || 0))
    );
    saveData.stats.perfectWins = Math.max(0, Math.floor(_parseNumber(rawStats.perfectWins, 0)));
    saveData.stats.threeStarWins = Math.max(0, Math.floor(_parseNumber(rawStats.threeStarWins, 0)));
    saveData.stats.dogWins = _normalizeNumberMap(rawStats.dogWins);
    saveData.stats.levelPerfectWins = _normalizeNumberMap(rawStats.levelPerfectWins);
    saveData.stats.levelThreeStarWins = _normalizeNumberMap(rawStats.levelThreeStarWins);

    const rawMissions = source?.missions || {};
    const completedIds = Array.isArray(rawMissions.completed) ? rawMissions.completed : [];
    saveData.missions.completed = completedIds
      .filter((id, index, arr) => getMissionDef(id) && arr.indexOf(id) === index);
    saveData.missions.progress = _normalizeNumberMap(rawMissions.progress);
    saveData.missions.notifications = Array.isArray(rawMissions.notifications)
      ? rawMissions.notifications
          .filter(item => item && typeof item.title === 'string' && typeof item.rewardText === 'string')
          .map(item => ({
            missionId: typeof item.missionId === 'string' ? item.missionId : '',
            title: item.title,
            rewardText: item.rewardText,
            createdAt: Math.max(0, Math.floor(_parseNumber(item.createdAt, Date.now()))),
          }))
      : [];

    const rawCollection = source?.collection || {};
    const rawOwnedCollectibles = Array.isArray(rawCollection.owned) ? rawCollection.owned : [];
    saveData.collection.owned = rawOwnedCollectibles
      .filter((id, index, arr) => getCollectibleDef(id) && arr.indexOf(id) === index);

    const rawEquipped = rawCollection.equipped && typeof rawCollection.equipped === 'object'
      ? rawCollection.equipped
      : {};
    Object.keys(saveData.collection.equipped).forEach(category => {
      const equippedId = rawEquipped[category];
      const def = getCollectibleDef(equippedId);
      saveData.collection.equipped[category] =
        def && def.category === category && saveData.collection.owned.includes(def.id)
          ? def.id
          : null;
    });

    return saveData;
  },

  save(saveData, options = {}) {
    const normalized = this._normalizeSave(saveData);
    localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));

    if (options.syncCloud && typeof CloudService !== 'undefined' && CloudService.queueProgressSave) {
      CloudService.queueProgressSave(normalized, options);
    }

    return normalized;
  },

  _createHomeEvent(home, context = 'idle') {
    const now = Date.now();
    if (context === 'feed') {
      return { type: 'fed', text: 'Oyong wiggles happily after that snack.', createdAt: now };
    }
    if (context === 'pet') {
      return { type: 'pet', text: 'Oyong leans in for even more pats.', createdAt: now };
    }
    if (context === 'rest') {
      return { type: 'rest', text: 'Oyong takes a cozy rest and wakes up refreshed.', createdAt: now };
    }
    if (context === 'battle-win') {
      return { type: 'excited', text: 'Oyong is excited after that brave battle.', createdAt: now };
    }
    if (context === 'battle-loss') {
      return { type: 'tired', text: 'Oyong looks a little tired and wants a gentle break.', createdAt: now };
    }

    if (home.hunger <= 32) {
      return { type: 'hungry', text: 'Oyong noses the bowl and looks ready for a snack.', createdAt: now };
    }
    if (home.energy <= 32) {
      return { type: 'sleepy', text: 'Oyong is sleepy and curls up for a soft nap.', createdAt: now };
    }
    if (home.mood <= 32) {
      return { type: 'attention', text: 'Oyong wants a little attention and tail pats.', createdAt: now };
    }

    const roll = Math.random();
    if (roll < 0.18) {
      return { type: 'found', text: 'Oyong found a spare biscuit near the rug.', createdAt: now };
    }
    if (roll < 0.45) {
      return { type: 'excited', text: 'Oyong is bouncing around the room with happy energy.', createdAt: now };
    }
    if (roll < 0.7) {
      return { type: 'cozy', text: 'Oyong is curled up happily at home.', createdAt: now };
    }
    return { type: 'calm', text: 'Oyong gives you a calm, trusting look.', createdAt: now };
  },

  _awardBond(saveData, amount) {
    const gain = Math.max(0, Math.floor(amount || 0));
    if (gain <= 0) return { gained: 0, levelUp: false, level: saveData.home.bondLevel };
    const prevLevel = saveData.home.bondLevel;
    saveData.home.bondXp += gain;
    saveData.home.bondLevel = getBondLevelForXp(saveData.home.bondXp);
    return {
      gained: gain,
      levelUp: saveData.home.bondLevel > prevLevel,
      level: saveData.home.bondLevel,
    };
  },

  _grantMissionReward(saveData, reward) {
    const parts = [];
    if (!reward) return 'No reward';

    if (reward.biscuits) {
      saveData.homeCurrency += reward.biscuits;
      parts.push(`+${reward.biscuits} ${HOME_CURRENCY_NAME}`);
    }

    if (reward.bonusTreats) {
      saveData.bonusTreatReserve += reward.bonusTreats;
      parts.push(`+${reward.bonusTreats} bonus treats`);
    }

    if (reward.decorId && HOME_DECOR_DEFS[reward.decorId]) {
      if (!saveData.home.ownedDecor.includes(reward.decorId)) {
        saveData.home.ownedDecor.push(reward.decorId);
        parts.push(`${HOME_DECOR_DEFS[reward.decorId].name} unlocked`);
      } else {
        saveData.homeCurrency += 6;
        parts.push(`+6 ${HOME_CURRENCY_NAME}`);
      }
    }

    return parts.join(' • ') || 'No reward';
  },

  _syncMissionState(saveData) {
    const completedSet = new Set(saveData.missions.completed || []);
    const completedNow = [];

    MISSION_DEFS.forEach(mission => {
      saveData.missions.progress[mission.id] = Math.min(
        Math.max(0, Math.floor(getMissionProgressValue(mission, saveData))),
        Math.max(1, Math.floor(mission.target || 1))
      );
    });

    MISSION_DEFS.forEach(mission => {
      const progressValue = saveData.missions.progress[mission.id] || 0;
      const target = Math.max(1, Math.floor(mission.target || 1));
      if (completedSet.has(mission.id) || progressValue < target) return;

      completedSet.add(mission.id);
      const rewardText = this._grantMissionReward(saveData, mission.reward);
      const notification = {
        missionId: mission.id,
        title: mission.title,
        rewardText,
        createdAt: Date.now(),
      };
      saveData.missions.notifications.push(notification);
      completedNow.push(notification);
    });

    saveData.missions.completed = Array.from(completedSet);
    return completedNow;
  },

  _applyPassiveHomeDecay(saveData) {
    const now = Date.now();
    const lastUpdate = Math.max(0, saveData.home.lastCareUpdateAt || now);
    if (now <= lastUpdate) return false;

    const steps = Math.floor((now - lastUpdate) / HOME_PASSIVE_DECAY_MS);
    if (steps <= 0) return false;

    saveData.home.hunger = clampHomeStat(saveData.home.hunger - (steps * 2));
    saveData.home.mood = clampHomeStat(saveData.home.mood - steps);
    saveData.home.energy = clampHomeStat(saveData.home.energy - (steps * 2));
    saveData.home.happiness = saveData.home.mood;
    saveData.home.lastCareUpdateAt = lastUpdate + (steps * HOME_PASSIVE_DECAY_MS);

    if (!saveData.home.currentEvent || (now - saveData.home.currentEvent.createdAt) > HOME_PASSIVE_DECAY_MS) {
      saveData.home.currentEvent = this._createHomeEvent(saveData.home, 'idle');
    }
    return true;
  },

  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      const initial = this.save(_defaultSave());
      return initial;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const reset = this.save(_defaultSave());
      return reset;
    }

    const normalized = this._normalizeSave(parsed);
    let changed = JSON.stringify(parsed) !== JSON.stringify(normalized);
    changed = this._applyPassiveHomeDecay(normalized) || changed;
    const missionStateBefore = JSON.stringify(normalized.missions);
    const completedOnLoad = this._syncMissionState(normalized);
    changed = changed || completedOnLoad.length > 0 || JSON.stringify(normalized.missions) !== missionStateBefore;
    if (!normalized.home.currentEvent) {
      normalized.home.currentEvent = this._createHomeEvent(normalized.home, 'idle');
      changed = true;
    }
    if (changed) this.save(normalized);
    return normalized;
  },

  clear() {
    localStorage.removeItem(SAVE_KEY);
  },

  reset() {
    this.clear();
    return this.save(_defaultSave());
  },

  getHomeState(saveData = this.load()) {
    return saveData.home;
  },

  getHomeCurrency(saveData = this.load()) {
    return Math.max(0, Math.floor(saveData.homeCurrency || 0));
  },

  getMissionTreatReserve(saveData = this.load()) {
    return Math.max(0, Math.floor(saveData.bonusTreatReserve || 0));
  },

  getCollectionState(saveData = this.load()) {
    return saveData.collection;
  },

  getCollectibleItems(saveData = this.load()) {
    const ownedSet = new Set(saveData.collection?.owned || []);
    const equipped = saveData.collection?.equipped || {};
    return getCollectibleItems().map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      desc: item.desc,
      owned: ownedSet.has(item.id),
      equipped: equipped[item.category] === item.id,
      rarityStyle: getCollectibleRarityStyle(item.rarity),
    }));
  },

  getHappiness(saveData = this.load()) {
    return clampHomeStat(saveData.home?.mood);
  },

  getUnlockedDogs(saveData = this.load()) {
    return Array.isArray(saveData.unlockedDogs) ? saveData.unlockedDogs.slice() : ['bark_pup', 'guard_dog'];
  },

  getBestStars(levelId, saveData = this.load()) {
    const index = LEVEL_DATA.findIndex(l => l.id === levelId);
    if (index < 0) return 0;
    return Math.max(0, Math.min(3, Math.floor(saveData.levelStars[index] || 0)));
  },

  isUnlocked(levelId, saveData = this.load()) {
    const numericLevel = Math.floor(Number(levelId) || 0);
    if (numericLevel <= 0) return false;
    return numericLevel <= Math.max(1, Math.floor(saveData.levelUnlocked || 1));
  },

  getBondState(saveData = this.load()) {
    return getBondProgress(saveData.home.bondXp);
  },

  getCurrentHomeEvent(saveData = this.load()) {
    return saveData.home.currentEvent || this._createHomeEvent(saveData.home, 'idle');
  },

  getBattleBonus(saveData = this.load()) {
    return getHomeCareBonus(saveData.home);
  },

  getActiveMissions(saveData = this.load(), limit = 2) {
    const completed = new Set(saveData.missions?.completed || []);
    return MISSION_DEFS
      .filter(mission => !completed.has(mission.id))
      .map(mission => {
        const progress = getMissionProgressValue(mission, saveData);
        return {
          id: mission.id,
          title: mission.title,
          desc: mission.desc,
          progress,
          target: mission.target,
          progressText: getMissionProgressText(mission, progress),
          rewardText: getMissionRewardText(mission.reward),
        };
      })
      .slice(0, Math.max(1, limit));
  },

  drainMissionNotifications() {
    const saveData = this.load();
    const notifications = Array.isArray(saveData.missions?.notifications)
      ? saveData.missions.notifications.slice()
      : [];
    saveData.missions.notifications = [];
    this.save(saveData);
    return notifications;
  },

  consumeMissionTreatReserve() {
    const saveData = this.load();
    const amount = Math.max(0, Math.floor(saveData.bonusTreatReserve || 0));
    if (amount <= 0) return 0;
    saveData.bonusTreatReserve = 0;
    this.save(saveData);
    return amount;
  },

  equipCollectible(collectibleId) {
    const saveData = this.load();
    const collectible = getCollectibleDef(collectibleId);
    if (!collectible) return { ok: false, reason: 'missing' };
    if (!saveData.collection.owned.includes(collectibleId)) {
      return { ok: false, reason: 'not_owned' };
    }

    saveData.collection.equipped[collectible.category] = collectibleId;
    const persisted = this.save(saveData, { syncCloud: true });
    return { ok: true, saveData: persisted, collectible };
  },

  unequipCollectible(category) {
    const saveData = this.load();
    if (!category || !Object.prototype.hasOwnProperty.call(saveData.collection.equipped, category)) {
      return { ok: false, reason: 'missing_category' };
    }

    const equippedId = saveData.collection.equipped[category];
    if (!equippedId) {
      return { ok: false, reason: 'not_equipped' };
    }

    const collectible = getCollectibleDef(equippedId);
    saveData.collection.equipped[category] = null;
    const persisted = this.save(saveData, { syncCloud: true });
    return { ok: true, saveData: persisted, collectible, category };
  },

  completeLevel(levelId, starsEarned, battleSummary) {
    const saveData = this.load();
    const index = LEVEL_DATA.findIndex(l => l.id === levelId);
    if (index < 0) return saveData;
    const summary = battleSummary && typeof battleSummary === 'object'
      ? battleSummary
      : null;

    const firstClear = saveData.levelStars[index] <= 0;
    const prevStars = saveData.levelStars[index] || 0;
    const stars = Math.max(prevStars, Math.max(0, Math.min(3, Math.floor(starsEarned || 0))));
    saveData.levelStars[index] = stars;

    if (saveData.levelUnlocked < LEVEL_DATA.length && index + 2 > saveData.levelUnlocked) {
      saveData.levelUnlocked = index + 2;
    }
    saveData.levelUnlocked = Math.max(saveData.levelUnlocked, 1);

    const unlocks = LEVEL_DATA.reduce((map, level, idx) => {
      if (level && level.dogUnlock) map[idx] = level.dogUnlock;
      return map;
    }, {});
    GameState.newUnlocks = [];
    if (firstClear && unlocks[index] && !saveData.unlockedDogs.includes(unlocks[index])) {
      saveData.unlockedDogs.push(unlocks[index]);
      GameState.newUnlocks.push(unlocks[index]);
    }

    const baseReward = 8 + (stars * 3) + (firstClear ? 5 : 0);
    const careBonus = getHomeCareBonus(saveData.home);
    const rewardBonus = careBonus.rewardBonus;
    const totalReward = baseReward + rewardBonus;
    saveData.homeCurrency += totalReward;
    saveData.stats.totalBiscuitsEarned += totalReward;

    if (stars >= 3) {
      saveData.stats.threeStarWins += 1;
      saveData.stats.levelThreeStarWins[levelId] = (saveData.stats.levelThreeStarWins[levelId] || 0) + 1;
    }

    if (summary && summary.perfectWin) {
      saveData.stats.perfectWins += 1;
      saveData.stats.levelPerfectWins[levelId] = (saveData.stats.levelPerfectWins[levelId] || 0) + 1;
    }

    if (summary && Array.isArray(summary.usedDogTypes)) {
      summary.usedDogTypes.forEach(dogType => {
        if (!DOG_DEFS[dogType]) return;
        saveData.stats.dogWins[dogType] = (saveData.stats.dogWins[dogType] || 0) + 1;
      });
    }

    const bondGain = this._awardBond(saveData, 5 + stars + (firstClear ? 3 : 0));
    saveData.home.currentEvent = this._createHomeEvent(saveData.home, 'battle-win');
    saveData.home.lastCareUpdateAt = Date.now();
    this._syncMissionState(saveData);

    const dropResult = rollCollectibleDrop(saveData.collection.owned, stars, firstClear);
    const collectibleDrop = dropResult && dropResult.item ? dropResult.item : null;
    if (collectibleDrop) {
      saveData.collection.owned.push(collectibleDrop.id);
      if (!saveData.collection.equipped[collectibleDrop.category]) {
        saveData.collection.equipped[collectibleDrop.category] = collectibleDrop.id;
      }
      GameState.lastCollectibleDrop = collectibleDrop;
    } else {
      GameState.lastCollectibleDrop = null;
    }
    GameState.lastRewardDropInfo = {
      chance: dropResult?.chance || 0,
      rarityRates: dropResult?.rarityRates || getCollectibleDropRates(),
      duplicateProtected: dropResult?.duplicateProtected !== false,
      collectionComplete: !!dropResult?.collectionComplete,
      rewardType: collectibleDrop ? collectibleDrop.rewardType || 'collectible' : null,
      reward: collectibleDrop,
      isNew: !!collectibleDrop,
    };

    GameState.lastHomeReward = totalReward;
    GameState.lastHomeRewardBreakdown = {
      baseReward,
      rewardBonus,
      totalReward,
      bondGain: bondGain.gained,
      bondLevelUp: bondGain.levelUp,
      bondLevel: saveData.home.bondLevel,
      dropChance: dropResult?.chance || 0,
    };

    return this.save(saveData);
  },

  applyBattleHomeOutcome(won) {
    const saveData = this.load();
    const decay = won ? HOME_BATTLE_DECAY_WIN : HOME_BATTLE_DECAY_LOSS;

    saveData.home.hunger = clampHomeStat(saveData.home.hunger - decay.hunger);
    saveData.home.mood = clampHomeStat(saveData.home.mood - decay.mood);
    saveData.home.energy = clampHomeStat(saveData.home.energy - decay.energy);
    saveData.home.happiness = saveData.home.mood;

    const bondGain = this._awardBond(saveData, won ? 3 : 1);
    saveData.home.currentEvent = this._createHomeEvent(saveData.home, won ? 'battle-win' : 'battle-loss');
    saveData.home.lastCareUpdateAt = Date.now();
    this._syncMissionState(saveData);

    GameState.lastBondGain = bondGain.gained;
    return this.save(saveData, { syncCloud: true, includeScore: !!won });
  },

  performCareAction(action) {
    const saveData = this.load();
    const gains = { hunger: 0, mood: 0, energy: 0 };
    let cost = 0;
    let bondGain = 0;
    let eventType = 'idle';
    let message = '';

    if (action === 'feed') {
      cost = HOME_FEED_COST;
      if (saveData.homeCurrency < cost) {
        return { ok: false, reason: 'not_enough_currency', message: `Need ${cost} ${HOME_CURRENCY_NAME.toLowerCase()} to feed Oyong.` };
      }
      saveData.homeCurrency -= cost;
      gains.hunger = HOME_FEED_HUNGER_GAIN;
      gains.mood = HOME_FEED_MOOD_GAIN;
      bondGain = 4;
      eventType = 'feed';
      message = `Oyong enjoyed the snack. Hunger +${gains.hunger}, Mood +${gains.mood}.`;
    } else if (action === 'pet') {
      gains.mood = HOME_PET_MOOD_GAIN;
      gains.energy = HOME_PET_ENERGY_GAIN;
      bondGain = 3;
      eventType = 'pet';
      message = `Oyong lights up from the attention. Mood +${gains.mood}.`;
    } else if (action === 'rest') {
      gains.energy = HOME_REST_ENERGY_GAIN;
      gains.mood = HOME_REST_MOOD_GAIN;
      bondGain = 3;
      eventType = 'rest';
      message = `Oyong settles in for a comfy rest. Energy +${gains.energy}.`;
    } else {
      return { ok: false, reason: 'unknown_action', message: 'Unknown care action.' };
    }

    saveData.home.hunger = clampHomeStat(saveData.home.hunger + gains.hunger);
    saveData.home.mood = clampHomeStat(saveData.home.mood + gains.mood);
    saveData.home.energy = clampHomeStat(saveData.home.energy + gains.energy);
    saveData.home.happiness = saveData.home.mood;

    const bond = this._awardBond(saveData, bondGain);
    saveData.home.currentEvent = this._createHomeEvent(saveData.home, eventType);
    saveData.home.lastCareUpdateAt = Date.now();
    this._syncMissionState(saveData);

    const persisted = this.save(saveData, { syncCloud: true });
    return {
      ok: true,
      saveData: persisted,
      gains,
      cost,
      bondGain: bond.gained,
      bondLevelUp: bond.levelUp,
      message,
    };
  },

  feedOyong() {
    return this.performCareAction('feed');
  },

  petOyong() {
    return this.performCareAction('pet');
  },

  restOyong() {
    return this.performCareAction('rest');
  },

  buyDecor(decorId) {
    const saveData = this.load();
    const decor = HOME_DECOR_DEFS[decorId];
    if (!decor) return { ok: false, reason: 'missing' };
    if ((decor.unlockBond || 1) > saveData.home.bondLevel) {
      return { ok: false, reason: 'bond_locked', requiredBond: decor.unlockBond };
    }
    if (saveData.home.ownedDecor.includes(decorId)) {
      return { ok: false, reason: 'owned' };
    }
    if (saveData.homeCurrency < decor.cost) {
      return { ok: false, reason: 'not_enough_currency' };
    }

    saveData.homeCurrency -= decor.cost;
    saveData.home.ownedDecor.push(decorId);
    saveData.home.decorSlots[decor.slot] = decor.id;
    saveData.home.currentEvent = this._createHomeEvent(saveData.home, 'idle');
    const persisted = this.save(saveData, { syncCloud: true });
    return { ok: true, saveData: persisted, decor };
  },

  placeDecor(slotKey, decorId) {
    const saveData = this.load();
    const decor = HOME_DECOR_DEFS[decorId];
    if (!decor || decor.slot !== slotKey) return { ok: false, reason: 'wrong_slot' };
    if (!saveData.home.ownedDecor.includes(decorId)) return { ok: false, reason: 'not_owned' };
    if ((decor.unlockBond || 1) > saveData.home.bondLevel) {
      return { ok: false, reason: 'bond_locked', requiredBond: decor.unlockBond };
    }

    saveData.home.decorSlots[slotKey] = decorId;
    const persisted = this.save(saveData, { syncCloud: true });
    return { ok: true, saveData: persisted, decor };
  },

  // ── Wave Challenge ──────────────────────────────────────────

  /** Record a completed challenge run. Awards biscuits and updates waveBest. */
  saveChallengeResult(wavesCompleted, biscuitsEarned) {
    const saveData = this.load();
    const isNewBest = wavesCompleted > (saveData.waveBest || 0);
    if (isNewBest) saveData.waveBest = wavesCompleted;
    if (biscuitsEarned > 0) {
      saveData.homeCurrency = (saveData.homeCurrency || 0) + biscuitsEarned;
      saveData.stats.totalBiscuitsEarned =
        (saveData.stats.totalBiscuitsEarned || 0) + biscuitsEarned;
    }
    this.save(saveData, { syncCloud: true });
    return isNewBest;
  },

  /** Return the player's best wave count (0 if never played). */
  getWaveBest(saveData) {
    return Math.max(0, Math.floor(_parseNumber(saveData?.waveBest, 0)));
  },
};
