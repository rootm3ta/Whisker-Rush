/** Hidden perks and secrets (GAME_DESIGN 4.6). */
export const BELLS = {
  perCity: 9,
  /** Chance a bell slot in a pattern actually holds a bell. */
  slotChance: 0.35,
  coinBonus: 0.05,
  color: 0xf2c14e,
} as const;

export const CAT_DOOR = {
  /** Door sits this far into its hedge wall (m) and is this long. */
  at: 4,
  halfLength: 1.4,
  glow: 0xffd56b,
  alleySec: 10,
  /** Coin river rows per second inside the alley. */
  coinRowsPerSec: 6,
  lootEvery: 1.8,
  /** Alley loot is at least this rarity. */
  minRarity: 2,
  fog: 0x6a4f8f,
} as const;

export const MYSTERY_FISH = {
  /** Effects: any spawnable power-up, or a gag. */
  table: [
    { id: 'powerup', weight: 6 },
    { id: 'sneeze', weight: 2 },
    { id: 'loaf', weight: 2 },
  ],
  loafSec: 3,
  loafPointsPerSec: 150,
  sneezeCoins: 25,
  color: 0xa45fd6,
} as const;

export const DAILY_HUNT = {
  words: ['MEOW', 'PURR', 'SNACK', 'NAPS', 'WHISKER', 'ZOOMIES', 'TUNA'],
  rewardCoins: 500,
  rewardFishBones: 1,
  color: 0xfbf6ec,
} as const;
