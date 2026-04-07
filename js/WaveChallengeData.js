// ============================================================
// WaveChallengeData.js — Wave Challenge Mode: scaling + wave generator
//
// Enemy HP/speed scale up each wave.
// Harder enemy types unlock gradually.
// Boss waves fire every 10th wave.
// ============================================================

// ─── Scaling formulas ────────────────────────────────────────

/** HP multiplier for enemies at a given wave number */
function getChallengeEnemyHpMult(waveNum) {
  return 1 + (waveNum - 1) * 0.09;
}

/** Speed multiplier — increases every 6 waves */
function getChallengeEnemySpeedMult(waveNum) {
  return 1 + Math.floor(waveNum / 6) * 0.07;
}

/** Treat reward multiplier — enemies pay more in later waves */
function getChallengeRewardMult(waveNum) {
  return 1 + Math.floor(waveNum / 10) * 0.4;
}

/** True when this wave should include a boss */
function isChallengeWaveBoss(waveNum) {
  return waveNum > 0 && waveNum % 10 === 0;
}

// ─── Enemy type pool ─────────────────────────────────────────

function _getChallengeEnemyPool(waveNum) {
  const pool = [{ type: 'walker', weight: 10 }];
  if (waveNum >= 3)  pool.push({ type: 'runner',   weight: 6 });
  if (waveNum >= 6)  pool.push({ type: 'brute',    weight: 4 });
  if (waveNum >= 9)  pool.push({ type: 'shielder', weight: 4 });
  if (waveNum >= 13) pool.push({ type: 'jumper',   weight: 5 });
  if (waveNum >= 18) pool.push({ type: 'exploder', weight: 3 });
  return pool;
}

function _pickFromPool(pool) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) return entry.type;
  }
  return pool[pool.length - 1].type;
}

// ─── Wave size ───────────────────────────────────────────────

function _getChallengeWaveSize(waveNum) {
  if (waveNum <= 10) return 4 + waveNum;                          // 5–14
  if (waveNum <= 20) return 14 + Math.floor((waveNum - 10) * 1.5); // 15–29
  if (waveNum <= 30) return 29 + (waveNum - 20) * 2;              // 31–49
  return Math.min(60, 49 + (waveNum - 30) * 2);                   // 51–60 cap
}

// ─── Wave generator ──────────────────────────────────────────

/**
 * Generate a challenge wave entry list for the given wave number.
 * Returns an array of { type, lane, delay } matching LEVEL_DATA wave format.
 */
function generateChallengeWave(waveNum) {
  const entries = [];

  // Boss wave: one boss + flanking enemies
  if (isChallengeWaveBoss(waveNum)) {
    const bossLane = Math.floor(Math.random() * GRID.ROWS);
    entries.push({ type: 'boss', lane: bossLane, delay: 1500 });

    const flankers = 3 + Math.floor(waveNum / 10);
    const flankPool = [{ type: 'walker', weight: 6 }, { type: 'runner', weight: 4 }];
    if (waveNum >= 20) flankPool.push({ type: 'jumper', weight: 3 });

    for (let i = 0; i < flankers; i++) {
      const lane = (bossLane + 1 + Math.floor(Math.random() * (GRID.ROWS - 1))) % GRID.ROWS;
      entries.push({ type: _pickFromPool(flankPool), lane, delay: 3000 + i * 1800 });
    }
    entries.sort((a, b) => a.delay - b.delay);
    return entries;
  }

  // Normal wave
  const count   = _getChallengeWaveSize(waveNum);
  const pool    = _getChallengeEnemyPool(waveNum);
  const baseGap = Math.max(550, 2200 - waveNum * 38);  // gap shrinks each wave

  for (let i = 0; i < count; i++) {
    const lane  = (i + Math.floor(Math.random() * 2)) % GRID.ROWS;
    const type  = _pickFromPool(pool);
    const delay = Math.round(400 + i * baseGap + Math.random() * 350);
    entries.push({ type, lane, delay });
  }

  entries.sort((a, b) => a.delay - b.delay);
  return entries;
}

// ─── Milestone rewards ────────────────────────────────────────

const CHALLENGE_MILESTONES = {
  5:  10,
  10: 30,
  15: 50,
  20: 80,
  25: 110,
  30: 150,
};

/**
 * Biscuit reward for completing a given wave.
 * Waves 31+ give scaled rewards every 5 waves.
 */
function getChallengeMilestoneReward(waveNum) {
  if (CHALLENGE_MILESTONES[waveNum] !== undefined) return CHALLENGE_MILESTONES[waveNum];
  if (waveNum > 30 && waveNum % 5 === 0) return 150 + (waveNum - 30) * 6;
  return 0;
}

/**
 * Synthetic level data object for challenge mode.
 * Matches the shape GameScene expects from LEVEL_DATA entries.
 */
function buildChallengeLevelData() {
  return {
    id:               0,
    name:             'Wave Challenge',
    description:      'Survive as many waves as possible!',
    tip:              'Upgrading an Oyong fully restores its HP in Wave Challenge.',
    startTreats:      150,
    passiveIncome:    25,
    passiveInterval:  6000,
    emergencySaves:   1,
    loadoutSlots:     8,
    waves:            [],  // filled dynamically per wave
  };
}
