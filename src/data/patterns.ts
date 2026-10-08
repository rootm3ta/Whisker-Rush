import type { ObstacleId } from './obstacles';


/** Lane index: -1 left, 0 center, 1 right. */
export type Lane = -1 | 0 | 1;

export type PatternEntry =
  | { t: 'o'; id: ObstacleId; lane: Lane; z: number; len?: number }
  | { t: 'coins'; lane: Lane; z: number; n: number; y: number; gap: number }
  | { t: 'arc'; lane: Lane; z: number; n: number; len: number; h: number; y: number }
  | { t: 'loot'; lane: Lane; z: number; y: number }
  /** Clothesline (grind) with socks hanging along it. */
  | { t: 'line'; lane: Lane; z: number; len: number; socks: number }
  /** Lucky Bell slot (only sometimes filled, see BELLS.slotChance). */
  | { t: 'bell'; lane: Lane; z: number; y: number };

export interface Pattern {
  name: string;
  tier: 1 | 2 | 3;
  weight: number;
  length: number;
  entries: PatternEntry[];
  /** Only spawns in these districts (index into the city's `districts`); omitted = anywhere. */
  districts?: readonly number[];
}

export const L = -1 as const;
export const C = 0 as const;
export const R = 1 as const;

export const o = (id: ObstacleId, lane: Lane, z: number, len?: number): PatternEntry => ({ t: 'o', id, lane, z, len });
export const coins = (lane: Lane, z: number, n: number, y = 0.6, gap = 2.4): PatternEntry => ({ t: 'coins', lane, z, n, y, gap });
export const arc = (lane: Lane, z: number, n: number, len: number, h = 1.5, y = 0.6): PatternEntry => ({ t: 'arc', lane, z, n, len, h, y });
export const loot = (lane: Lane, z: number, y = 0.75): PatternEntry => ({ t: 'loot', lane, z, y });
export const line = (lane: Lane, z: number, len: number, socks = 3): PatternEntry => ({ t: 'line', lane, z, len, socks });
export const bell = (lane: Lane, z: number, y: number): PatternEntry => ({ t: 'bell', lane, z, y });
