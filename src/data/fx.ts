/** Crash dust cloud and dizzy stars. */
export const DUST = {
  puffs: 9,
  puffRadius: [0.45, 0.8] as const,
  spread: 1.1,
  churnHz: 7,
  stars: 5,
  starSize: 0.22,
  colors: [0xfbf6ec, 0xeadfcb, 0xd9cbb3] as const,
  starColor: 0xf5c542,
  limbColor: 0x2a201c,
} as const;

export const DIZZY = {
  stars: 3,
  radius: 0.55,
  height: 1.55,
  spinHz: 1.1,
} as const;

export const REVIVE_BURST = {
  sec: 0.7,
  maxRadius: 3.2,
  color: 0x9fe08a,
} as const;

/** GPU particle presets. Sizes in world units, lives in seconds, velocities in m/s. */
export const PARTICLES = {
  capacity: 1500,
  shapes: { soft: 0, star: 1, square: 2, leaf: 3, streak: 4 } as const,
  dust: { count: 10, colors: [0xf3ead8, 0xe2d6bf], size: [0.35, 0.6], life: [0.35, 0.6], speed: [0.6, 1.6], up: 0.8, gravity: -0.6 },
  coin: { count: 5, colors: [0xfff1a8, 0xf5c542], size: [0.18, 0.3], life: [0.25, 0.45], speed: [1.2, 2.4], up: 1.2, gravity: -3 },
  loot: { count: 12, colors: [0xffffff], size: [0.2, 0.32], life: [0.35, 0.6], speed: [1.5, 3], up: 1.5, gravity: -3 },
  leaves: { perSec: 3, colors: [0xe9813a, 0xd9562e, 0xf2b33d], size: [0.22, 0.32], life: [2.5, 3.5], fall: 0.9, x: [5, 12], ahead: [20, 45] },
  catnip: { perSec: 40, colors: [0x6fd36a, 0xb8f28a, 0x3fae5a], size: [0.14, 0.24], life: [0.5, 0.8], radius: 0.9 },
  speedLines: { minSpeed: 21, perSec: 30, colors: [0xffffff], size: [0.25, 0.4], life: [0.25, 0.35], z: [-30, -12] },
  confetti: { count: 70, colors: [0xd9562e, 0xf2c14e, 0x6fb38a, 0x4a8fe0, 0xa45fd6, 0xe85d8a], size: [0.18, 0.28], life: [1.4, 2.2], speed: [3, 7], up: 6, gravity: -9 },
  crash: { count: 24, colors: [0xfbf6ec, 0xeadfcb, 0xd9cbb3], size: [0.5, 0.9], life: [0.5, 0.9], speed: [1.5, 4], up: 1.5, gravity: -1 },
  smash: { count: 14, colors: [0xc8915a, 0x8a9aa6, 0x5f8f48], size: [0.15, 0.28], life: [0.4, 0.7], speed: [3, 6], up: 3, gravity: -12 },
} as const;

/** Hit-stop: the world freezes this long (real seconds) on a crash before the dust cloud. */
export const HIT_STOP = { crashSec: 0.14, stumbleSec: 0.06 } as const;

/** Reward fly-to-counter icons. */
export const FLY = { pool: 12, ms: 520 } as const;
