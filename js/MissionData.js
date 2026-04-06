// ============================================================
// MissionData.js — simple mission definitions and helpers
// ============================================================

const MISSION_DEFS = [
  {
    id: 'steady-paws',
    title: 'Steady Paws',
    desc: 'Win Level 1 without losing a lane.',
    type: 'perfect_win',
    levelId: 1,
    target: 1,
    reward: { biscuits: 12 },
  },
  {
    id: 'tank-trial',
    title: 'Tank Trial',
    desc: 'Win a level after using Oyong Tank.',
    type: 'use_dog_win',
    dogType: 'guard_dog',
    target: 1,
    reward: { bonusTreats: 6 },
  },
  {
    id: 'best-friends',
    title: 'Best Friends',
    desc: 'Reach Bond Level 2.',
    type: 'bond_level',
    target: 2,
    reward: { decorId: 'heart_bowl' },
  },
  {
    id: 'biscuit-bundle',
    title: 'Biscuit Bundle',
    desc: 'Earn 60 biscuits in total.',
    type: 'earn_biscuits',
    target: 60,
    reward: { biscuits: 15 },
  },
  {
    id: 'golden-finish',
    title: 'Golden Finish',
    desc: 'Complete any level with 3 stars.',
    type: 'three_star_win',
    target: 1,
    reward: { decorId: 'moon_frame', bonusTreats: 8 },
  },
];

function getMissionDef(id) {
  return MISSION_DEFS.find(mission => mission.id === id) || null;
}

function getMissionRewardText(reward) {
  if (!reward) return 'No reward';

  const parts = [];
  if (reward.biscuits) parts.push(`+${reward.biscuits} ${HOME_CURRENCY_NAME}`);
  if (reward.bonusTreats) parts.push(`+${reward.bonusTreats} bonus treats`);
  if (reward.decorId && HOME_DECOR_DEFS[reward.decorId]) {
    parts.push(`${HOME_DECOR_DEFS[reward.decorId].name} unlocked`);
  }
  return parts.join(' • ') || 'No reward';
}

function getMissionProgressValue(mission, saveData) {
  const stats = saveData.stats || {};

  switch (mission.type) {
    case 'perfect_win':
      if (mission.levelId) {
        return Math.max(0, Math.floor((stats.levelPerfectWins && stats.levelPerfectWins[mission.levelId]) || 0));
      }
      return Math.max(0, Math.floor(stats.perfectWins || 0));

    case 'use_dog_win':
      return Math.max(0, Math.floor((stats.dogWins && stats.dogWins[mission.dogType]) || 0));

    case 'bond_level':
      return Math.max(1, Math.floor(saveData.home?.bondLevel || 1));

    case 'earn_biscuits':
      return Math.max(0, Math.floor(stats.totalBiscuitsEarned || 0));

    case 'three_star_win':
      if (mission.levelId) {
        return Math.max(0, Math.floor((stats.levelThreeStarWins && stats.levelThreeStarWins[mission.levelId]) || 0));
      }
      return Math.max(0, Math.floor(stats.threeStarWins || 0));
  }

  return 0;
}

function getMissionProgressText(mission, progressValue) {
  const target = Math.max(1, Math.floor(mission.target || 1));
  const current = Math.max(0, Math.min(target, Math.floor(progressValue || 0)));

  if (mission.type === 'bond_level') {
    return `Lv ${current}/${target}`;
  }
  if (mission.type === 'earn_biscuits') {
    return `${current}/${target}`;
  }
  return `${current}/${target}`;
}
