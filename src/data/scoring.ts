/** Score, combo, stunts, near miss and stumble tunables (GAME_DESIGN 3.1, 3.3, 5). */
export const POINTS = {
  perMeter: 1,
  coin: 10,
  fishBone: 300,
  nearMiss: 100,
  wallKick: [50, 100, 250] as const,
  grindPerSec: 60,
} as const;

export const COMBO = {
  min: 1,
  max: 3,
  nearMiss: 0.3,
  wallKick: 0.15,
  grindPerSec: 0.15,
  coinStreakEvery: 10,
  coinStreak: 0.05,
  /** Seconds between coins that still count as one streak. */
  coinStreakGap: 1.0,
  decayDelay: 2.5,
  decayPerSec: 0.2,
} as const;

export const STUNTS = [
  { id: 'tripleKick', label: 'TRIPLE KICK', points: 500 },
  { id: 'longGrind', label: 'LONG GRIND', points: 300 },
  { id: 'dodgeChain', label: 'DODGE CHAIN', points: 400 },
  { id: 'packEscape', label: 'PACK ESCAPE', points: 500 },
] as const;

export const STUNT_RULES = {
  longGrindSec: 2,
  dodgeChainCount: 3,
  dodgeChainWindowSec: 6,
} as const;

export const REFLEX = {
  /** Obstacle must be this close in time when the swipe lands (s). */
  windowSec: 0.25,
  timeScale: 0.4,
  /** Real seconds of slow-mo. */
  durationSec: 0.3,
} as const;

export const STUMBLE = {
  /** A second stumble inside this window means caught. */
  windowSec: 6,
  /** Brief invulnerability after a stumble (s). */
  graceSec: 0.6,
} as const;
