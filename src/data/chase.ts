/** Dog pack chase, Pack Rush, crash and revive tunables (GAME_DESIGN 3.3, 3.4). */
export const CHASE = {
  /** Gap (m) behind the cat when the pack is off screen. */
  farGap: 13,
  /** Gap while the pack is on screen after a stumble. */
  closeGap: 1.9,
  /** Seconds the pack stays close after a stumble (same as the stumble window). */
  closeSec: 6,
  gapRate: 3,
  /** Pickle's lunge on stumble: extra forward offset (m) and duration (s). */
  lungeDist: 1.4,
  lungeSec: 0.45,
  /** Duke taunts when the gap is below this, at most every tauntEvery seconds. */
  tauntGap: 3.0,
  tauntEvery: 2.2,
  /** Gap when the pack pounces on a caught cat. */
  pounceGap: 0.4,
  /** Gap while gloating over a dizzy Miso. */
  gloatGap: 1.3,
  /** Hide dogs beyond this gap (behind the camera). */
  visibleGap: 7.5,
  /** Lateral spacing of the pups beside Duke. */
  flankX: 1.15,
  followRate: 5,
} as const;

export const PACK_RUSH = {
  firstAtSec: 120,
  everySec: 90,
  warnSec: 1.6,
  durationSec: 8,
  /** Bolt runs ahead, then drops back through the cat's lane. */
  aheadStart: 14,
  passSec: 2.4,
  passEnd: -4,
  hitHalfX: 0.9,
  hitHalfZ: 0.55,
  /** Bolt's body height: jumpable. */
  height: 0.6,
  bonusCoins: 50,
  bonusPoints: 500,
} as const;

export const CRASH = {
  /** Dust cloud fight duration before Miso pops out (s). */
  cloudSec: 1.5,
  /** Dizzy time before the Game Over screen (s). */
  dizzySec: 1.1,
} as const;

export const REVIVE = {
  /** Fish Bone costs for paid revives, in order. Last value repeats. */
  costs: [1, 2, 4, 8] as const,
  freeAdRevives: 1,
  invulnSec: 3,
  /** Obstacles this far ahead are cleared on revive (m). */
  clearAheadM: 30,
} as const;

export const ADS = {
  mockSec: 2,
} as const;

export const ECONOMY_START = {
  coins: 0,
  fishBones: 2,
} as const;
