import { REVIVE } from '../data/chase';

export type ReviveOption = { kind: 'ad'; cost: 0 } | { kind: 'fishBones'; cost: number };

/** Fish Bone price of the n-th paid revive (0-based): 1, 2, 4, 8, then 8. */
export function reviveCost(paid: number): number {
  const c = REVIVE.costs;
  return c[Math.min(paid, c.length - 1)];
}

/** Tracks revives in one run: first ones are free via rewarded ad, then escalating Fish Bones. */
export class ReviveTracker {
  adRevives = 0;
  paidRevives = 0;

  get total(): number {
    return this.adRevives + this.paidRevives;
  }

  reset(): void {
    this.adRevives = 0;
    this.paidRevives = 0;
  }

  next(): ReviveOption {
    if (this.adRevives < REVIVE.freeAdRevives) return { kind: 'ad', cost: 0 };
    return { kind: 'fishBones', cost: reviveCost(this.paidRevives) };
  }

  use(kind: ReviveOption['kind']): void {
    if (kind === 'ad') this.adRevives++;
    else this.paidRevives++;
  }
}
