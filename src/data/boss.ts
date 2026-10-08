/** Boss Chase: Duke on the mail truck, every 3000 m (GAME_DESIGN 3.4). */
export const BOSS = {
  every: 3000,
  introSec: 2,
  ahead: 30,
  throwEvery: 1.5,
  throwsToWin: 10,
  flightSec: 0.6,
  laneChangeEvery: 3.5,
  swerveSec: 1.4,
  swerveX: 9,
  chestCoins: 250,
  chestFishBones: 1,
  /** Chest loot is at least this rarity. */
  chestMinRarity: 2,
  throwIds: ['parcel', 'trashCans', 'parcel', 'bike'] as const,
} as const;
