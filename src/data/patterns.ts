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
}

const L = -1 as const;
const C = 0 as const;
const R = 1 as const;
const CAR_TOP = 2.0;
const TRUCK_TOP = 3.1;

const o = (id: ObstacleId, lane: Lane, z: number, len?: number): PatternEntry => ({ t: 'o', id, lane, z, len });
const coins = (lane: Lane, z: number, n: number, y = 0.6, gap = 2.4): PatternEntry => ({ t: 'coins', lane, z, n, y, gap });
const arc = (lane: Lane, z: number, n: number, len: number, h = 1.5, y = 0.6): PatternEntry => ({ t: 'arc', lane, z, n, len, h, y });
const loot = (lane: Lane, z: number, y = 0.75): PatternEntry => ({ t: 'loot', lane, z, y });
const line = (lane: Lane, z: number, len: number, socks = 3): PatternEntry => ({ t: 'line', lane, z, len, socks });
const bell = (lane: Lane, z: number, y: number): PatternEntry => ({ t: 'bell', lane, z, y });

/** Hand-authored Maple Lane patterns. All are mirrored at random by the spawner. */
export const PATTERNS: Pattern[] = [
  // Tier 1: one decision at a time.
  { name: 'cans-center', tier: 1, weight: 1, length: 24, entries: [o('trashCans', C, 12), coins(L, 2, 8), coins(R, 16, 4)] },
  { name: 'hedge-hop', tier: 1, weight: 1, length: 22, entries: [o('hedge', C, 12), arc(C, 7, 7, 11), coins(L, 0, 4)] },
  { name: 'two-cans', tier: 1, weight: 1, length: 22, entries: [o('trashCans', L, 12), o('trashCans', C, 12), coins(R, 2, 8)] },
  { name: 'bike-sprinkler', tier: 1, weight: 1, length: 26, entries: [o('bike', L, 8), o('sprinkler', R, 18), coins(C, 0, 10)] },
  { name: 'branch-slide', tier: 1, weight: 1, length: 24, entries: [o('lowBranch', C, 12), coins(C, 5, 6, 0.35), loot(L, 16)] },
  { name: 'car-ramp', tier: 1, weight: 1, length: 26, entries: [o('ramp', C, 6), o('car', C, 10), coins(C, 6, 2, 1.2), coins(C, 10.5, 2, CAR_TOP, 1.8), coins(L, 4, 6)] },
  { name: 'stagger-cans', tier: 1, weight: 1, length: 40, entries: [o('trashCans', L, 6), o('trashCans', C, 20), o('trashCans', R, 34), coins(C, 0, 5), coins(R, 14, 5), coins(L, 28, 5)] },
  { name: 'clothes-hop', tier: 1, weight: 0.8, length: 30, entries: [line(C, 8, 18, 4), arc(C, 2, 4, 6, 1.2, 0.8), coins(R, 6, 8)] },
  { name: 'fence-gap', tier: 1, weight: 1, length: 24, entries: [o('gardenFence', L, 12), o('gardenFence', R, 12), coins(C, 2, 5), loot(C, 18)] },
  { name: 'coin-snake', tier: 1, weight: 0.6, length: 34, entries: [coins(L, 0, 4), coins(C, 10, 4), coins(R, 20, 4), loot(R, 30)] },

  // Tier 2: two decisions, high layer and grinds.
  { name: 'car-sandwich', tier: 2, weight: 1, length: 24, entries: [o('car', L, 6), o('car', R, 6), o('hedge', C, 9), arc(C, 4, 7, 11)] },
  { name: 'laundry-car', tier: 2, weight: 1, length: 24, entries: [o('laundry', L, 10), o('laundry', C, 10), o('car', R, 8), coins(R, 8.5, 2, CAR_TOP, 1.8), coins(C, 4, 3, 0.35)] },
  {
    name: 'rooftop-run',
    tier: 2,
    weight: 1,
    length: 34,
    entries: [o('ramp', C, 4), o('car', C, 8), o('car', C, 12.2), o('mailTruck', C, 16.4), coins(C, 9, 4, CAR_TOP, 2), arc(C, 15, 3, 3, 1.4, CAR_TOP), coins(C, 18, 3, TRUCK_TOP, 2), bell(C, 22, TRUCK_TOP), o('trashCans', L, 12), o('trashCans', R, 20)],
  },
  {
    name: 'zigzag',
    tier: 2,
    weight: 1,
    length: 34,
    entries: [o('trashCans', L, 4), o('trashCans', C, 4), o('trashCans', C, 18), o('trashCans', R, 18), o('trashCans', L, 32), o('trashCans', C, 32), coins(R, 0, 4), coins(L, 12, 4), coins(R, 26, 4)],
  },
  { name: 'sprinkler-row', tier: 2, weight: 1, length: 24, entries: [o('sprinkler', L, 12), o('sprinkler', C, 12), o('sprinkler', R, 12), arc(C, 7, 6, 10), arc(L, 7, 6, 10)] },
  { name: 'branch-row', tier: 2, weight: 1, length: 30, entries: [o('lowBranch', L, 8), o('lowBranch', C, 8), o('lowBranch', R, 8), o('trashCans', C, 22), coins(L, 14, 5)] },
  {
    name: 'kick-alley',
    tier: 2,
    weight: 0.9,
    length: 28,
    entries: [o('hedgeWall', L, 6), o('hedgeWall', R, 6), coins(C, 4, 5), arc(C, 8, 5, 8, 1.0, 2.6), loot(C, 12, 3.2), bell(L, 14, 2.9)],
  },
  { name: 'line-hop', tier: 2, weight: 0.8, length: 42, entries: [line(L, 4, 20, 3), line(C, 20, 20, 3), coins(R, 4, 12), arc(L, 0, 3, 4, 1, 0.8)] },

  // Tier 3: dense, mixed moves.
  { name: 'choose-move', tier: 3, weight: 1, length: 24, entries: [o('gardenFence', L, 12), o('laundry', C, 12), o('bike', R, 12), arc(L, 8, 5, 8), coins(C, 9, 3, 0.35)] },
  {
    name: 'traffic',
    tier: 3,
    weight: 1,
    length: 30,
    entries: [o('car', L, 4), o('mailTruck', C, 10), o('trashCans', R, 6), o('trashCans', R, 22), coins(L, 4.5, 2, CAR_TOP, 1.8), coins(R, 10, 4)],
  },
  {
    name: 'jump-slide-center',
    tier: 3,
    weight: 0.9,
    length: 34,
    entries: [o('hedgeWall', L, 2), o('hedgeWall', R, 2), o('hedgeWall', L, 12), o('hedgeWall', R, 12), o('hedge', C, 5), o('lowBranch', C, 18), coins(C, 19, 3, 0.35), arc(C, 8, 4, 6, 1.0, 2.8)],
  },
  {
    name: 'mixed-rows',
    tier: 3,
    weight: 1,
    length: 34,
    entries: [o('bike', L, 8), o('laundry', C, 8), o('gardenFence', R, 8), o('hedge', L, 24), o('lowBranch', C, 24), o('trashCans', R, 24), coins(C, 14, 4)],
  },
  {
    name: 'high-road',
    tier: 3,
    weight: 1,
    length: 32,
    entries: [o('ramp', C, 0), o('car', C, 4), o('car', L, 6), o('mailTruck', C, 8.2), o('trashCans', R, 14), o('gardenFence', L, 22), coins(C, 4.5, 2, CAR_TOP, 1.6), coins(C, 10, 3, TRUCK_TOP, 2), bell(C, 14, TRUCK_TOP)],
  },
  {
    name: 'truck-loot',
    tier: 3,
    weight: 0.7,
    length: 28,
    entries: [o('car', R, 4), o('mailTruck', R, 8.2), loot(R, 11, TRUCK_TOP + 0.1), o('trashCans', L, 6), o('gardenFence', C, 12), coins(C, 0, 4), coins(L, 14, 4)],
  },
  { name: 'double-line', tier: 3, weight: 0.8, length: 34, entries: [line(L, 2, 24, 4), line(R, 2, 24, 4), o('hedge', C, 8), o('lowBranch', C, 20), coins(C, 26, 4), bell(R, 24, 2.1)] },

  // Rare: a glowing cat flap in a hedge wall. Swipe into it to enter the Secret Alley.
  { name: 'cat-door', tier: 1, weight: 0.12, length: 20, entries: [o('catDoorWall', L, 4), o('trashCans', R, 10), coins(C, 2, 6)] },
  { name: 'cat-door-2', tier: 2, weight: 0.12, length: 20, entries: [o('catDoorWall', R, 4), o('hedge', C, 12), arc(C, 8, 5, 8), bell(L, 10, 0.75)] },
];
