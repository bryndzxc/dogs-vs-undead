// ============================================================
// CloudService.js — leaderboard + cloud progress helpers
// ============================================================

const CloudService = {
  _saveTimer: null,

  _emitStatus(kind, message) {
    window.dispatchEvent(new CustomEvent('dvz-cloud-status', {
      detail: { kind, message },
    }));
  },

  _emitProgressUpdated() {
    window.dispatchEvent(new CustomEvent('dvz-progress-updated'));
  },

  isAvailable() {
    return typeof ApiClient !== 'undefined';
  },

  _sumStars(levelStars) {
    return (Array.isArray(levelStars) ? levelStars : []).reduce((sum, stars) => {
      return sum + Math.max(0, Math.floor(Number(stars) || 0));
    }, 0);
  },

  _highestClearedLevel(saveData) {
    const stars = Array.isArray(saveData?.levelStars) ? saveData.levelStars : [];
    let highest = 0;
    stars.forEach((value, index) => {
      if ((Number(value) || 0) > 0) highest = index + 1;
    });
    return highest;
  },

  _progressTuple(saveData) {
    return [
      this._highestClearedLevel(saveData),
      this._sumStars(saveData?.levelStars),
      (saveData?.collection?.owned || []).length,
    ];
  },

  _isBetterProgress(candidate, baseline) {
    const left = this._progressTuple(candidate);
    const right = this._progressTuple(baseline);

    for (let i = 0; i < left.length; i++) {
      if (left[i] > right[i]) return true;
      if (left[i] < right[i]) return false;
    }

    return false;
  },

  _unionUnique(...lists) {
    return Array.from(new Set(lists.flat().filter(Boolean)));
  },

  _mergeNumberMaps(first, second) {
    const merged = {};
    const keys = new Set([
      ...Object.keys(first || {}),
      ...Object.keys(second || {}),
    ]);

    keys.forEach(key => {
      merged[key] = Math.max(
        0,
        Math.floor(Number(first?.[key]) || 0),
        Math.floor(Number(second?.[key]) || 0)
      );
    });

    return merged;
  },

  _clone(value) {
    return JSON.parse(JSON.stringify(value));
  },

  getLeaderboardPayload(saveData = Progression.load()) {
    return {
      highest_level: this._highestClearedLevel(saveData),
      total_stars: this._sumStars(saveData.levelStars),
      score: Math.max(0, Math.floor(Number(saveData?.stats?.totalBiscuitsEarned) || 0)),
      metadata: {
        collection_count: (saveData?.collection?.owned || []).length,
        bond_level: Math.max(1, Math.floor(Number(saveData?.home?.bondLevel) || 1)),
      },
    };
  },

  getProgressPayload(saveData = Progression.load()) {
    return {
      version: saveData.version,
      levelUnlocked: saveData.levelUnlocked,
      levelStars: saveData.levelStars,
      unlockedDogs: saveData.unlockedDogs,
      homeCurrency: saveData.homeCurrency,
      bonusTreatReserve: saveData.bonusTreatReserve,
      stats: saveData.stats,
      missions: saveData.missions,
      collection: saveData.collection,
      home: saveData.home,
    };
  },

  async fetchLeaderboard() {
    const response = await ApiClient.request('leaderboard');
    return Array.isArray(response?.leaderboard) ? response.leaderboard : [];
  },

  async submitScore(saveData = Progression.load()) {
    if (!AuthService.isAuthenticated()) return null;

    return ApiClient.request('submit-score', {
      method: 'POST',
      token: AuthService.getToken(),
      body: this.getLeaderboardPayload(saveData),
    });
  },

  async saveProgress(saveData = Progression.load()) {
    if (!AuthService.isAuthenticated()) return null;

    return ApiClient.request('save-progress', {
      method: 'POST',
      token: AuthService.getToken(),
      body: {
        progress: this.getProgressPayload(saveData),
      },
    });
  },

  async loadProgress() {
    if (!AuthService.isAuthenticated()) return null;

    const response = await ApiClient.request('load-progress', {
      token: AuthService.getToken(),
    });

    return response?.progress || null;
  },

  mergeProgress(localSave, remoteSave) {
    const local = Progression._normalizeSave(localSave || {});
    const remote = Progression._normalizeSave(remoteSave || {});
    const preferred = this._isBetterProgress(remote, local) ? remote : local;
    const alternate = preferred === local ? remote : local;
    const merged = this._clone(preferred);

    // Keep the better progression snapshot as the base, then safely fold in
    // max/union values from the other side so login merges stay simple.
    merged.levelUnlocked = Math.max(local.levelUnlocked, remote.levelUnlocked);
    merged.levelStars = merged.levelStars.map((_, index) => {
      return Math.max(local.levelStars[index] || 0, remote.levelStars[index] || 0);
    });
    merged.unlockedDogs = this._unionUnique(local.unlockedDogs, remote.unlockedDogs);
    merged.homeCurrency = Math.max(local.homeCurrency, remote.homeCurrency);
    merged.bonusTreatReserve = Math.max(local.bonusTreatReserve, remote.bonusTreatReserve);

    merged.stats = {
      totalBiscuitsEarned: Math.max(local.stats.totalBiscuitsEarned, remote.stats.totalBiscuitsEarned),
      perfectWins: Math.max(local.stats.perfectWins, remote.stats.perfectWins),
      threeStarWins: Math.max(local.stats.threeStarWins, remote.stats.threeStarWins),
      dogWins: this._mergeNumberMaps(local.stats.dogWins, remote.stats.dogWins),
      levelPerfectWins: this._mergeNumberMaps(local.stats.levelPerfectWins, remote.stats.levelPerfectWins),
      levelThreeStarWins: this._mergeNumberMaps(local.stats.levelThreeStarWins, remote.stats.levelThreeStarWins),
    };

    merged.missions = {
      completed: this._unionUnique(local.missions.completed, remote.missions.completed),
      progress: this._mergeNumberMaps(local.missions.progress, remote.missions.progress),
      notifications: Array.isArray(preferred.missions.notifications)
        ? preferred.missions.notifications.slice(-10)
        : [],
    };

    merged.collection = {
      owned: this._unionUnique(local.collection.owned, remote.collection.owned),
      equipped: {},
    };

    ['skin', 'collar', 'accent'].forEach(category => {
      const preferredId = preferred.collection?.equipped?.[category];
      const alternateId = alternate.collection?.equipped?.[category];
      merged.collection.equipped[category] = merged.collection.owned.includes(preferredId)
        ? preferredId
        : (merged.collection.owned.includes(alternateId) ? alternateId : null);
    });

    merged.home = {
      ...preferred.home,
      hunger: Math.max(local.home.hunger, remote.home.hunger),
      mood: Math.max(local.home.mood, remote.home.mood),
      energy: Math.max(local.home.energy, remote.home.energy),
      happiness: Math.max(local.home.happiness, remote.home.happiness),
      bondXp: Math.max(local.home.bondXp, remote.home.bondXp),
      bondLevel: Math.max(local.home.bondLevel, remote.home.bondLevel),
      ownedDecor: this._unionUnique(local.home.ownedDecor, remote.home.ownedDecor),
      lastCareUpdateAt: Math.max(local.home.lastCareUpdateAt, remote.home.lastCareUpdateAt),
    };

    merged.home.decorSlots = {};
    HOME_DECOR_SLOTS.forEach(slot => {
      const preferredDecor = preferred.home?.decorSlots?.[slot.key];
      const alternateDecor = alternate.home?.decorSlots?.[slot.key];
      merged.home.decorSlots[slot.key] = merged.home.ownedDecor.includes(preferredDecor)
        ? preferredDecor
        : (merged.home.ownedDecor.includes(alternateDecor) ? alternateDecor : null);
    });
    if (!merged.home.decorSlots.bed) merged.home.decorSlots.bed = 'cloud_bed';

    return Progression._normalizeSave(merged);
  },

  async mergeLocalWithCloud() {
    if (!AuthService.isAuthenticated()) return Progression.load();

    let remoteProgress = null;
    try {
      remoteProgress = await this.loadProgress();
    } catch (error) {
      if (error.status && error.status !== 404) throw error;
    }

    const localProgress = Progression.load();
    const merged = remoteProgress
      ? this.mergeProgress(localProgress, remoteProgress)
      : Progression._normalizeSave(localProgress);

    Progression.save(merged);
    this._emitProgressUpdated();
    await this.saveProgress(merged);
    await this.submitScore(merged);
    this._emitStatus('success', 'Cloud save synced.');
    return merged;
  },

  async syncProgress(options = {}) {
    if (!AuthService.isAuthenticated()) return null;

    const saveData = Progression._normalizeSave(options.saveData || Progression.load());
    this._emitStatus('info', 'Syncing cloud save...');

    try {
      await this.saveProgress(saveData);
      if (options.includeScore) {
        await this.submitScore(saveData);
      }
      this._emitStatus('success', options.includeScore ? 'Cloud save and leaderboard updated.' : 'Cloud save updated.');
      return true;
    } catch (error) {
      this._emitStatus('error', error.message || 'Cloud sync failed.');
      return false;
    }
  },

  queueProgressSave(saveData, options = {}) {
    if (!AuthService.isAuthenticated()) return;

    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this.syncProgress({
        saveData,
        includeScore: !!options.includeScore,
      });
    }, 450);
  },
};
