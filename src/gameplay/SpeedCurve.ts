import { SPEED } from '../data/runner';

/** Run speed (m/s) after t seconds: linear ramp, slower past the soft cap, clamped at the hard cap. */
export function speedAt(t: number): number {
  const linear = SPEED.start + SPEED.rampPerSec * t;
  if (linear <= SPEED.softCap) return linear;
  const tSoft = (SPEED.softCap - SPEED.start) / SPEED.rampPerSec;
  const v = SPEED.softCap + SPEED.rampPerSec * SPEED.softRampScale * (t - tSoft);
  return Math.min(v, SPEED.hardCap);
}
