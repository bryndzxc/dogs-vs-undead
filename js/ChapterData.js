// ============================================================
// ChapterData.js — Chapter definitions and helper functions
//
// 6 chapters, 10 levels each (levels 1–60).
// Chapters unlock sequentially: completing all levels in chapter N
// unlocks chapter N+1 (handled via Progression.levelUnlocked).
// ============================================================

const CHAPTER_DATA = [
  {
    id:          1,
    name:        'The First Bark',
    theme:       'Tutorial — Walkers',
    desc:        'Your first encounters with the undead horde.',
    color:       0x1a3a14,
    accentColor: 0x6aad4a,
    levels:      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id:          2,
    name:        'Dead Sprint',
    theme:       'Runners Unleashed',
    desc:        'Fast enemies flood every lane without warning.',
    color:       0x3a1010,
    accentColor: 0xcc4444,
    levels:      [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    id:          3,
    name:        'Iron Curtain',
    theme:       'Shields & Jumpers',
    desc:        'Armored knights and acrobatic leapers advance.',
    color:       0x10103a,
    accentColor: 0x7a6aee,
    levels:      [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  },
  {
    id:          4,
    name:        'The Siege',
    theme:       'All Types, High Pressure',
    desc:        'Every enemy type floods the field at once.',
    color:       0x2e1a06,
    accentColor: 0xdd7720,
    levels:      [31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
  },
  {
    id:          5,
    name:        'Infernal Horde',
    theme:       'Exploders Join the Fray',
    desc:        'Volatile enemies threaten your entire line.',
    color:       0x3a1400,
    accentColor: 0xff6600,
    levels:      [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  },
  {
    id:          6,
    name:        'Undead Apocalypse',
    theme:       'Maximum Difficulty',
    desc:        'Survive the ultimate horde. No mercy given.',
    color:       0x140a2a,
    accentColor: 0xcc44ff,
    levels:      [51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
  },
];

const CHAPTER_LAYOUTS = {
  1: {
    maxPlaceCols: GRID.COLS,
    blockedTiles: [],
  },
  2: {
    maxPlaceCols: GRID.COLS - 1,
    blockedTiles: [],
  },
  3: {
    maxPlaceCols: GRID.COLS,
    blockedTiles: [
      [0, 2], [2, 1], [3, 4], [4, 6],
    ],
  },
  4: {
    maxPlaceCols: GRID.COLS - 2,
    blockedTiles: [],
  },
  5: {
    maxPlaceCols: GRID.COLS - 1,
    blockedTiles: [
      [0, 3], [1, 1], [2, 5], [3, 2], [4, 4],
    ],
  },
  6: {
    maxPlaceCols: GRID.COLS,
    blockedTiles: [
      [0, 1], [0, 6],
      [1, 3], [1, 5],
      [2, 2], [2, 4],
      [3, 1], [3, 6],
      [4, 3], [4, 5],
    ],
  },
};

/** Return the chapter definition that contains a given level id. */
function getChapterForLevel(levelId) {
  return CHAPTER_DATA.find(c => c.levels.includes(levelId)) || CHAPTER_DATA[0];
}

function getChapterLayout(levelId) {
  const chapter = getChapterForLevel(levelId);
  const layout = CHAPTER_LAYOUTS[chapter.id] || CHAPTER_LAYOUTS[1];
  return {
    maxPlaceCols: Math.max(1, Math.min(GRID.COLS, layout.maxPlaceCols || GRID.COLS)),
    blockedTiles: Array.isArray(layout.blockedTiles) ? layout.blockedTiles.map(tile => [...tile]) : [],
  };
}

/** A chapter is unlocked when its first level is reachable via saveData.levelUnlocked. */
function isChapterUnlocked(chapterId, saveData) {
  if (chapterId === 1) return true;
  const chapter = CHAPTER_DATA.find(c => c.id === chapterId);
  if (!chapter) return false;
  return Progression.isUnlocked(chapter.levels[0], saveData);
}

/** A chapter is complete when every one of its levels has at least 1 star. */
function isChapterComplete(chapterId, saveData) {
  const chapter = CHAPTER_DATA.find(c => c.id === chapterId);
  if (!chapter) return false;
  return chapter.levels.every(lvlId => Progression.getBestStars(lvlId, saveData) > 0);
}

/** Return { earned, total } star count for a chapter. */
function getChapterStars(chapterId, saveData) {
  const chapter = CHAPTER_DATA.find(c => c.id === chapterId);
  if (!chapter) return { earned: 0, total: 30 };
  const earned = chapter.levels.reduce(
    (sum, lvlId) => sum + Progression.getBestStars(lvlId, saveData), 0
  );
  return { earned, total: chapter.levels.length * 3 };
}
