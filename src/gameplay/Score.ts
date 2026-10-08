import { COMBO, POINTS } from '../data/scoring';

/** Run score with permanent multiplier and temporary combo (x1..x3). */
export class Score {
  points = 0;
  coins = 0;
  fishBones = 0;
  multiplier = 1;
  combo: number = COMBO.min;
  private sinceGain = 0;

  reset(multiplier = 1): void {
    this.points = 0;
    this.coins = 0;
    this.fishBones = 0;
    this.multiplier = multiplier;
    this.combo = COMBO.min;
    this.sinceGain = 0;
  }

  addDistance(m: number): void {
    this.points += m * POINTS.perMeter * this.multiplier * this.combo;
  }

  award(base: number): void {
    this.points += base * this.multiplier * this.combo;
  }

  bumpCombo(amount: number): void {
    this.combo = Math.min(COMBO.max, this.combo + amount);
    this.sinceGain = 0;
  }

  breakCombo(): void {
    this.combo = COMBO.min;
    this.sinceGain = 0;
  }

  /** Combo decays toward x1 after a quiet spell. */
  update(dt: number): void {
    this.sinceGain += dt;
    if (this.sinceGain > COMBO.decayDelay) this.combo = Math.max(COMBO.min, this.combo - COMBO.decayPerSec * dt);
  }

  /** 0..1 fill for the combo meter. */
  get comboFill(): number {
    return (this.combo - COMBO.min) / (COMBO.max - COMBO.min);
  }
}
