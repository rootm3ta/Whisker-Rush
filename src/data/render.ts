/** Rendering tunables. */
export const RENDER = {
  maxDpr: 2,
  lowTierDpr: 1.5,
  near: 0.1,
  far: 220,
  /** Curved world: downward bend per metre^2 of view depth. */
  curveDown: 0.0016,
  /** Curved world: sideways bend per metre^2 of view depth. */
  curveSide: 0.0004,
  /** Toon ramp brightness steps (0..255). */
  toonSteps: [90, 170, 255],
  /** Ink outline thickness in model units (characters only). */
  outline: 0.014,
  ink: 0x2a201c,
  hemiIntensity: 1.25,
  sunIntensity: 2.3,
  sunPos: [-6, 12, 4] as const,
} as const;

export const SIM = {
  hz: 60,
  /** Clamp to avoid spiral of death after tab switches. */
  maxFrameSec: 0.25,
} as const;
