/** Power-ups (GAME_DESIGN 4.3), Roomba (4.4). Durations in seconds unless noted. */
export type PowerUpId =
  | 'magnet'
  | 'catnip'
  | 'balloon'
  | 'box'
  | 'laser'
  | 'bubble'
  | 'treats'
  | 'zoomies'
  | 'fishRocket';

export interface PowerUpDef {
  name: string;
  /** Seconds; 0 = until used (bubble); for start-only boosts see `meters`. */
  duration: number;
  /** Distance-based boosts (Zoomies, Fish Rocket). */
  meters: number;
  color: number;
  /** Relative spawn weight in runs; 0 = never spawns (start only). */
  weight: number;
}

export const POWERUPS: Record<PowerUpId, PowerUpDef> = {
  magnet: { name: 'Yarn Magnet', duration: 10, meters: 0, color: 0xe85d8a, weight: 1.2 },
  catnip: { name: 'Catnip Frenzy', duration: 6, meters: 0, color: 0x6fd36a, weight: 0.7 },
  balloon: { name: 'Balloon Ride', duration: 8, meters: 0, color: 0xe0453a, weight: 0.8 },
  box: { name: 'Cardboard Box', duration: 6, meters: 0, color: 0xc8915a, weight: 0.8 },
  laser: { name: 'Laser Dot', duration: 10, meters: 0, color: 0xff3b3b, weight: 0.8 },
  bubble: { name: 'Milk Bubble', duration: 0, meters: 0, color: 0xf4f7ff, weight: 1 },
  treats: { name: 'x2 Treats', duration: 15, meters: 0, color: 0xf5c542, weight: 1 },
  zoomies: { name: 'Zoomies', duration: 0, meters: 500, color: 0xffb03a, weight: 0 },
  fishRocket: { name: 'Fish Rocket', duration: 0, meters: 1500, color: 0x4a8fe0, weight: 0 },
};

export const POWERUP_IDS = Object.keys(POWERUPS) as PowerUpId[];

/** Duration multiplier per Scratching Post level (1..5). */
export const POWERUP_LEVEL_MULT = [1, 1.2, 1.4, 1.6, 1.8] as const;

export const POWERUP_FX = {
  magnetRadius: 14,
  magnetAhead: 16,
  magnetPull: 9,
  catnipSpeedMul: 1.5,
  balloonHeight: 4.6,
  balloonRise: 4,
  /** Sky coins spawned along the balloon ride (per second of ride). */
  balloonCoinsPerSec: 4,
  balloonCoinStopSec: 2.5,
  /** Box lets the cat pass through bodies whose top is at or below this. */
  boxPassHeight: 1.1,
  laserLookahead: 26,
  laserDotAhead: 7,
  laserScoreMul: 2,
  treatsCoinMul: 2,
  zoomiesSpeedMul: 2.2,
  rocketSpeedMul: 4,
  rocketHeight: 6,
  /** Invulnerable landing window after flights or absorbed hits (s). */
  afterGraceSec: 1.2,
  /** Seconds at run start the boost buttons stay up. */
  boostWindowSec: 3.5,
} as const;

export const ROOMBA = {
  duration: 30,
  rideHeight: 0.22,
  color: 0x3a3f4a,
  light: 0x7fe0ff,
  flyOffSec: 1.2,
} as const;

export const POWERUP_SPAWN = {
  /** Chance a pattern gap gets a power-up. */
  perGap: 0.22,
  mysteryFish: 0.07,
  letter: 0.12,
  y: 0.9,
} as const;
