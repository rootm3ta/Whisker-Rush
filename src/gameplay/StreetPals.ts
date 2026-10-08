import { Rng } from '../core/Rng';
import { STREET_PALS as S } from '../data/streetPals';

/**
 * Tbilisi's Street Pals: now and then a couple of friendly, ear-tagged street dogs (the city's
 * vaccinated strays) trot up beside Miso and bark at Duke, holding the pack back for a few seconds.
 * Pure logic: call `step` every fixed step; it returns true on the step a pal arrives.
 */
export class StreetPals {
  enabled = false;
  /** Seconds left of the current visit (0 = no pals around). */
  left = 0;
  private nextAt: number = S.firstAtM;
  private readonly rng = new Rng(S.seed);

  reset(enabled: boolean): void {
    this.enabled = enabled;
    this.left = 0;
    this.nextAt = S.firstAtM;
    this.rng.reseed(S.seed);
  }

  get active(): boolean {
    return this.left > 0;
  }

  /** Forces a visit now (debug). */
  arrive(): void {
    this.left = S.stayM / 10;
  }

  step(dt: number, distance: number): boolean {
    if (this.left > 0) this.left = Math.max(0, this.left - dt);
    if (!this.enabled || this.left > 0 || distance < this.nextAt) return false;
    this.nextAt = distance + this.rng.range(S.everyM[0], S.everyM[1]);
    if (this.rng.next() > S.chance) return false;
    this.left = S.delaySec + S.extraSec;
    return true;
  }
}
