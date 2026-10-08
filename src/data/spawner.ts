/** Pattern spawner tunables: difficulty tiers by distance and spacing. */
export const SPAWNER = {
  seed: 4242,
  firstAt: 60,
  aheadM: 170,
  behindM: 8,
  minGapM: 10,
  /** Gap between patterns scales with speed so reaction time stays fair. */
  gapSec: 0.85,
  mirrorChance: 0.5,
  /** Rows are chosen by the last `from` <= distance. Weights index tier 1..3. */
  tierTable: [
    { from: 0, weights: [1, 0, 0] },
    { from: 500, weights: [0.6, 0.4, 0] },
    { from: 1500, weights: [0.3, 0.45, 0.25] },
    { from: 3000, weights: [0.15, 0.4, 0.45] },
  ],
  capacity: { obstacles: 64 },
} as const;

export const HITBOX = {
  halfWidth: 0.35,
  halfLength: 0.35,
  height: 0.95,
  slideHeight: 0.5,
  /** Max height the cat steps up onto without jumping (forgiving ledges). */
  stepUp: 0.35,
  coinReachX: 0.9,
  coinReachZ: 0.9,
  coinReachY: 0.45,
} as const;

export const WALL_KICK = {
  /** Height gained per kick (m). */
  height: 1.3,
  maxChain: 3,
  /** Kickable obstacle must be within this lateral distance (but not in our lane). */
  reach: 3.7,
  minSide: 1.3,
  zMargin: 1,
} as const;
