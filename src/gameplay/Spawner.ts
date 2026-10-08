import { Rng } from '../core/Rng';
import { LANES } from '../data/runner';
import { LOOT, LOOT_MAPLE_LANE, RARITIES, RARITY_DISTANCE_BONUS, SOCK_ITEM, COIN, type Rarity } from '../data/pickups';
import { OBSTACLES, OBSTACLE_COLORS } from '../data/obstacles';
import { PATTERNS, type Pattern } from '../data/patterns';
import { SPAWNER } from '../data/spawner';
import { PickupKind, type Field } from './Field';

const BY_TIER: Pattern[][] = [1, 2, 3].map((t) => PATTERNS.filter((p) => p.tier === t));

/** Tier weights for a distance: last table row whose `from` <= distance. */
export function tierWeights(distance: number): readonly number[] {
  let row: (typeof SPAWNER.tierTable)[number] = SPAWNER.tierTable[0];
  for (const r of SPAWNER.tierTable) if (r.from <= distance) row = r;
  return row.weights;
}

export function weightedIndex(weights: readonly number[], r: number): number {
  let total = 0;
  for (const w of weights) total += w;
  let x = r * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0 && weights[i] > 0) return i;
  }
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i;
  return 0;
}

export function pickTier(distance: number, rng: Rng): 1 | 2 | 3 {
  return (weightedIndex(tierWeights(distance), rng.next()) + 1) as 1 | 2 | 3;
}

/** Weighted pattern pick inside a tier, avoiding an immediate repeat when possible. */
export function pickPattern(tier: 1 | 2 | 3, rng: Rng, last: Pattern | null): Pattern {
  const list = BY_TIER[tier - 1];
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = list[weightedIndex(list.map((q) => q.weight), rng.next())];
    if (p !== last || list.length === 1) return p;
  }
  return list[0] === last && list.length > 1 ? list[1] : list[0];
}

export function rollRarity(rng: Rng, distance: number): Rarity {
  const k = distance / 1000;
  const w = RARITIES.map((r, i) => r.weight * (1 + RARITY_DISTANCE_BONUS[i] * k));
  return weightedIndex(w, rng.next()) as Rarity;
}

export function rollLootItem(rng: Rng, distance: number): number {
  const rarity = rollRarity(rng, distance);
  const items = LOOT_MAPLE_LANE.filter((i) => i.rarity === rarity);
  const item = rng.pick(items);
  return LOOT_MAPLE_LANE.indexOf(item);
}

/** Streams patterns ahead of the cat into the Field. */
export class Spawner {
  private nextS = SPAWNER.firstAt;
  private last: Pattern | null = null;
  private readonly rng = new Rng(SPAWNER.seed);

  constructor(private readonly field: Field) {}

  reset(seed: number = SPAWNER.seed): void {
    this.rng.reseed(seed);
    this.nextS = SPAWNER.firstAt;
    this.last = null;
  }

  update(distance: number, speed: number): void {
    while (this.nextS < distance + SPAWNER.aheadM) {
      const tier = pickTier(this.nextS, this.rng);
      const p = pickPattern(tier, this.rng, this.last);
      this.place(p, this.nextS, this.rng.next() < SPAWNER.mirrorChance);
      this.last = p;
      this.nextS += p.length + Math.max(SPAWNER.minGapM, speed * SPAWNER.gapSec);
    }
  }

  private place(p: Pattern, s0: number, mirror: boolean): void {
    const f = this.field;
    const rng = this.rng;
    const lx = (lane: number) => (mirror ? -lane : lane) * LANES.width;
    for (const e of p.entries) {
      const x = lx(e.lane);
      const s = s0 + e.z;
      switch (e.t) {
        case 'o': {
          const color = e.id === 'car' ? rng.pick(OBSTACLE_COLORS.cars) : 0xffffff;
          f.addObstacle(e.id, x, s, e.len ?? OBSTACLES[e.id].length, color);
          break;
        }
        case 'coins':
          for (let i = 0; i < e.n; i++) f.addCoin(x, s + i * e.gap, e.y);
          break;
        case 'arc':
          for (let i = 0; i < e.n; i++) {
            const t = e.n === 1 ? 0.5 : i / (e.n - 1);
            f.addCoin(x, s + t * e.len, e.y + Math.sin(t * Math.PI) * e.h);
          }
          break;
        case 'loot':
          if (rng.next() < LOOT.fishBoneChance) f.addPickup(PickupKind.FishBone, 0, x, s, e.y);
          else f.addPickup(PickupKind.Loot, rollLootItem(rng, s), x, s, e.y);
          break;
        case 'line': {
          f.addObstacle('clothesline', x, s, e.len, 0xffffff);
          const top = OBSTACLES.clothesline.top ?? 0;
          for (let i = 0; i < e.socks; i++) {
            f.addPickup(PickupKind.Sock, SOCK_ITEM, x, s + ((i + 1) * e.len) / (e.socks + 1), top + 0.2);
          }
          for (let k = 0; k < e.len; k += COIN.gap * 1.5) f.addCoin(x, s + k, top + COIN.y);
          break;
        }
      }
    }
  }
}
