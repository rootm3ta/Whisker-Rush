/**
 * Per-step gameplay modifiers written by power-ups, Roomba and abilities, read by
 * Runner, Collision and scoring. Reset to neutral at the start of every step.
 */
export class Modifiers {
  speedMul = 1;
  /** Obstacles touched are smashed instead of hurting. */
  invincible = false;
  /** Bodies with a top at or below this height are passed through (Cardboard Box). 0 = off. */
  passLowHeight = 0;
  /** Extra pickup reach in x (Purr Field). */
  reachX = 0;
  coinMul = 1;
  scoreMul = 1;
  /** Shield that absorbs the next hit (Milk Bubble, Roomba). Returns true when absorbed. */
  absorb: (() => boolean) | null = null;

  clear(): void {
    this.speedMul = 1;
    this.invincible = false;
    this.passLowHeight = 0;
    this.reachX = 0;
    this.coinMul = 1;
    this.scoreMul = 1;
  }
}
