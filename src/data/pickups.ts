import { MAPLE_LANE } from './city/mapleLane';
import { ROME } from './city/rome';
import { TOKYO } from './city/tokyo';
import { TBILISI } from './city/tbilisi';
/** Coins, loot, Fish Bones and Satchel (GAME_DESIGN 4.1, 4.2). */
export const COIN = {
  /** Default coin height above its surface (m). */
  y: 0.6,
  gap: 2.4,
  spinPerSec: 3,
  capacity: 256,
  color: 0xf5c542,
} as const;

export type Rarity = 0 | 1 | 2 | 3 | 4;

export const RARITIES = [
  { name: 'Common', color: 0x9aa3ad, weight: 60, points: 50 },
  { name: 'Uncommon', color: 0x5fbf6a, weight: 25, points: 100 },
  { name: 'Rare', color: 0x4a8fe0, weight: 10, points: 250 },
  { name: 'Epic', color: 0xa45fd6, weight: 4, points: 500 },
  { name: 'Legendary', color: 0xf08a2a, weight: 1, points: 1000 },
] as const;

/** Rarity weight multipliers gained per 1000 m (index by rarity), so deep runs find better loot. */
export const RARITY_DISTANCE_BONUS = [0, 0.1, 0.2, 0.3, 0.35] as const;

export interface LootItem {
  /** Home city (where it shows up in runs). */
  city: string;
  id: string;
  name: string;
  rarity: Rarity;
  value: number;
}

/** Every loot item in the game. Append-only: Satchel slots store indices into this list. */
export const LOOT_ITEMS: readonly LootItem[] = [...MAPLE_LANE.loot, ...ROME.loot, ...TOKYO.loot, ...TBILISI.loot];

export const SOCK_ITEM = LOOT_ITEMS.findIndex((i) => i.id === 'sock');

export const LOOT = {
  /** Chance a loot slot becomes a Fish Bone instead. */
  fishBoneChance: 0.03,
  y: 0.75,
  capacity: 32,
  sockColors: [0xf2a6a8, 0x9fc7e8, 0xf2c14e, 0x6fb38a],
  fishBoneColor: 0xe6f2f7,
  sockSpacing: 4,
} as const;

export const SATCHEL = { startCapacity: 12, maxCapacity: 60 } as const;
