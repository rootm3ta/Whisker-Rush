import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { LOOT_MAPLE_LANE, RARITIES } from '../data/pickups';
import { PACK_RUSH } from '../data/chase';
import { COMBO, POINTS, STUNTS, STUNT_RULES } from '../data/scoring';
import type { Score } from './Score';

const STUNT = { tripleKick: 0, longGrind: 1, dodgeChain: 2, packEscape: 3 } as const;

/** Turns gameplay events into points, combo and stunts. Pure logic, driven by the event bus. */
export class ScoreKeeper {
  private time = 0;
  private lastCoinAt = -Infinity;
  private streak = 0;
  private readonly missTimes = new Float64Array(STUNT_RULES.dodgeChainCount);
  private missCount = 0;
  private grinding = false;
  /** Coins per coin pickup (x2 Treats) times the Lucky Bell bonus. */
  coinMul = 1;
  private coinFrac = 0;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly score: Score,
  ) {
    score.onBump = (gain) => bus.emit('comboGain', gain);
    bus.on('coin', () => this.onCoin());
    bus.on('loot', (item) => score.award(RARITIES[LOOT_MAPLE_LANE[item].rarity].points));
    bus.on('fishBone', () => {
      score.fishBones++;
      score.award(POINTS.fishBone);
    });
    bus.on('wallKick', (chain) => {
      score.award(POINTS.wallKick[Math.min(chain, POINTS.wallKick.length) - 1]);
      score.bumpCombo(COMBO.wallKick);
      if (chain === 3) this.stunt(STUNT.tripleKick);
    });
    bus.on('grindStart', () => (this.grinding = true));
    bus.on('grindEnd', (sec) => {
      this.grinding = false;
      if (sec >= STUNT_RULES.longGrindSec) this.stunt(STUNT.longGrind);
    });
    bus.on('packRushEnd', (survived) => {
      if (!survived) return;
      score.coins += PACK_RUSH.bonusCoins;
      this.stunt(STUNT.packEscape);
    });
    bus.on('stumble', () => {
      score.breakCombo();
      this.streak = 0;
    });
  }

  reset(): void {
    this.time = 0;
    this.lastCoinAt = -Infinity;
    this.streak = 0;
    this.missCount = 0;
    this.grinding = false;
    this.coinMul = 1;
    this.coinFrac = 0;
  }

  /** Records a near miss; returns how many are in the current chain window. */
  nearMiss(): number {
    const s = this.score;
    s.award(POINTS.nearMiss);
    s.bumpCombo(COMBO.nearMiss);
    const w = STUNT_RULES.dodgeChainWindowSec;
    let n = 0;
    for (let i = 0; i < this.missCount; i++) if (this.time - this.missTimes[i] <= w) this.missTimes[n++] = this.missTimes[i];
    this.missTimes[n++] = this.time;
    this.missCount = n;
    if (n >= STUNT_RULES.dodgeChainCount) {
      this.missCount = 0;
      this.stunt(STUNT.dodgeChain);
    }
    return n;
  }

  update(dt: number, meters: number): void {
    this.time += dt;
    const s = this.score;
    s.addDistance(meters);
    if (this.grinding) {
      s.award(POINTS.grindPerSec * dt);
      s.bumpCombo(COMBO.grindPerSec * dt);
    }
    s.update(dt);
  }

  private onCoin(): void {
    const s = this.score;
    const v = this.coinMul + this.coinFrac;
    const whole = Math.floor(v);
    this.coinFrac = v - whole;
    s.coins += whole;
    s.award(POINTS.coin * this.coinMul);
    this.streak = this.time - this.lastCoinAt <= COMBO.coinStreakGap ? this.streak + 1 : 1;
    this.lastCoinAt = this.time;
    if (this.streak % COMBO.coinStreakEvery === 0) s.bumpCombo(COMBO.coinStreak);
  }

  private stunt(i: number): void {
    this.score.award(STUNTS[i].points);
    this.bus.emit('stunt', i);
  }
}
