/** Runner movement, speed curve and input tunables (GAME_DESIGN 3.1, 3.2). */
export const LANES = { count: 3, width: 3 } as const;

export const RUNNER = {
  laneSwitchSec: 0.12,
  jumpHeight: 1.7,
  jumpSec: 0.62,
  fastDropSpeed: 24,
  slideSec: 0.65,
} as const;

export const SPEED = {
  start: 12,
  /** m/s gained per second of run time. */
  rampPerSec: 0.03,
  softCap: 26,
  /** Ramp multiplier once above the soft cap. */
  softRampScale: 0.25,
  hardCap: 30,
} as const;

export const ZONE = { lengthM: 1000 } as const;

export const INPUT = {
  bufferSec: 0.15,
  bufferCapacity: 8,
  swipeMinPx: 24,
  /** Swipe threshold as a fraction of the shorter screen side. */
  swipeFrac: 0.05,
  tapMaxMs: 250,
  doubleTapMs: 300,
} as const;

export const CAMERA = {
  fov: 62,
  speedFov: 9,
  offset: [0, 4.2, 6.2] as const,
  lookAt: [0, 0.6, -10] as const,
  followX: 0.9,
  lookX: 0.7,
  followY: 0.45,
  lookY: 0.3,
  /** While flying (Balloon, Fish Rocket) the camera follows height more closely. */
  flyFollowY: 0.9,
  flyLookY: 0.85,
  /** Exponential follow rates (1/s). Lower = more lag. */
  xRate: 9,
  yRate: 5,
  fovKickStiffness: 90,
  fovKickDamping: 14,
  shakeDecay: 7,
  shakeFreq: 31,
  landShake: 0.008,
  landKick: 4,
} as const;
