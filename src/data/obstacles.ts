import { MAPLE_LANE } from './city/mapleLane';
import { ROME } from './city/rome';
import { TOKYO } from './city/tokyo';

/** Obstacle ids are strings: each city file adds its own. Geometry is authored front face at z=0 extending to -length. */
export type ObstacleId = string;

export interface ObstacleDef {
  /** Default length along the track (m). Clotheslines can override per pattern. */
  length: number;
  /** Half width (x) for support and collision, before adding the cat half width. */
  halfWidth: number;
  /** Blocking volume y range, or null when it never blocks. */
  body: readonly [number, number] | null;
  /** Walkable top height, or null. */
  top: number | null;
  /** Top rises linearly from 0 at the front to `top` at the back. */
  ramp: boolean;
  /** Top is a clothesline (grind). */
  grind: boolean;
  /** Head-on hit is a crash; otherwise a stumble. */
  lethal: boolean;
  /** Can be wall-kicked off from an adjacent lane. */
  kickable: boolean;
  /** Max simultaneous instances (render pool). */
  capacity: number;
  /** Has a glowing cat flap on its side (Secret Alley entrance). */
  catDoor?: boolean;
  /** Per-instance color choices (cars, scooters). */
  tints?: readonly number[];
  /** Drives along slower than the cat and changes lanes (Rome's Vespas). */
  weaves?: boolean;
  /** Hangs overhead until the cat gets close, then drops into the lane (falling laundry, swooping crows). */
  drops?: boolean;
  /** Moves along the track at this speed (m/s): positive drives away (robots), negative comes at you (barrels, trains). */
  rolls?: number;
  /** Sound played once when the cat approaches (crossing chime, railway bell, crow caw...). */
  warn?: WarnSound;
  /** Placed off the road at this |x| instead of in a lane (a train on the side track). */
  sideX?: number;
}

/** Warning sounds hazards can play as the cat approaches. */
export const WARN_SOUNDS = ['chime', 'bell', 'caw', 'horn', 'steam', 'rumble'] as const;
export type WarnSound = (typeof WARN_SOUNDS)[number];

import { base } from './obstacleBase';

/** Shared by every city. */
const SHARED: Record<string, ObstacleDef> = {
  ramp: { ...base, length: 4, halfWidth: 1.2, body: null, top: 1.4, ramp: true, capacity: 6 },
  clothesline: { ...base, length: 20, halfWidth: 1.4, body: null, top: 1.5, grind: true, capacity: 6 },
  parcel: { ...base, length: 0.9, halfWidth: 0.9, body: [0, 0.95], lethal: true, capacity: 12 },
};

export const OBSTACLES: Record<ObstacleId, ObstacleDef> = { ...SHARED, ...MAPLE_LANE.obstacles, ...ROME.obstacles, ...TOKYO.obstacles };

export const OBSTACLE_IDS = Object.keys(OBSTACLES) as ObstacleId[];

export const OBSTACLE_COLORS = {
  can: 0x8a9aa6,
  canLid: 0x667684,
  hedge: 0x5f8f48,
  hedgeDark: 0x4d7a3c,
  bikeFrame: 0xd9483b,
  tire: 0x2b2b2e,
  water: 0xa7dcf2,
  sprinkler: 0x3f6f8a,
  fence: 0xfaf4e6,
  branch: 0x6b4a35,
  leaves: [0xe9813a, 0xd9562e, 0xf2b33d],
  pole: 0x8a6a4f,
  rope: 0xf3ead8,
  sheets: [0xf2a6a8, 0x9fc7e8, 0xfaf4e6, 0xf2c14e],
  cars: [0xd9562e, 0x4a8fe0, 0xf2c14e, 0x6fb38a, 0xe8e2d4],
  carGlass: 0x3a4a5a,
  truck: 0xf5f1e8,
  truckStripe: 0x3f6f8a,
  ramp: 0xb07a4a,
  rampDark: 0x8d5f38,
  parcel: 0xc8915a,
  parcelTape: 0xe8d4b8,
} as const;
