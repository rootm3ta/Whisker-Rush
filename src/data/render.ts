/** Rendering tunables. */
export const RENDER = {
  maxDpr: 2,
  lowTierDpr: 1.5,
  fov: 60,
  near: 0.1,
  far: 260,
  /** Curved world: downward bend per metre^2 of view depth. */
  curveDown: 0.0016,
  /** Curved world: sideways bend per metre^2 of view depth. */
  curveSide: 0.0004,
  /** Toon ramp brightness steps (0..255). */
  toonSteps: [90, 170, 255],
} as const;

export const SIM = {
  hz: 60,
  /** Clamp to avoid spiral of death after tab switches. */
  maxFrameSec: 0.25,
} as const;
