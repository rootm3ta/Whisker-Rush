/** Obstacle definitions for Maple Lane. Geometry is authored front face at z=0 extending to -length. */
export type ObstacleId =
  | 'trashCans'
  | 'hedge'
  | 'bike'
  | 'sprinkler'
  | 'gardenFence'
  | 'lowBranch'
  | 'laundry'
  | 'car'
  | 'mailTruck'
  | 'ramp'
  | 'hedgeWall'
  | 'clothesline';

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
}

const base = { top: null, ramp: false, grind: false, lethal: false, kickable: false } as const;

export const OBSTACLES: Record<ObstacleId, ObstacleDef> = {
  trashCans: { ...base, length: 1.0, halfWidth: 1.0, body: [0, 1.0], lethal: true, capacity: 16 },
  hedge: { ...base, length: 1.2, halfWidth: 1.2, body: [0, 0.85], capacity: 12 },
  bike: { ...base, length: 0.8, halfWidth: 1.0, body: [0, 0.75], capacity: 8 },
  sprinkler: { ...base, length: 0.8, halfWidth: 1.1, body: [0, 0.65], capacity: 8 },
  gardenFence: { ...base, length: 0.3, halfWidth: 1.3, body: [0, 1.0], lethal: true, capacity: 10 },
  lowBranch: { ...base, length: 0.6, halfWidth: 1.3, body: [0.85, 2.6], capacity: 8 },
  laundry: { ...base, length: 0.4, halfWidth: 1.3, body: [0.85, 2.6], capacity: 8 },
  car: { ...base, length: 4.2, halfWidth: 1.05, body: [0, 1.4], top: 1.4, lethal: true, kickable: true, capacity: 12 },
  mailTruck: { ...base, length: 6.5, halfWidth: 1.2, body: [0, 2.5], top: 2.5, lethal: true, kickable: true, capacity: 6 },
  ramp: { ...base, length: 4, halfWidth: 1.2, body: null, top: 1.4, ramp: true, capacity: 6 },
  hedgeWall: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 8 },
  clothesline: { ...base, length: 20, halfWidth: 1.4, body: null, top: 1.5, grind: true, capacity: 6 },
};

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
} as const;
