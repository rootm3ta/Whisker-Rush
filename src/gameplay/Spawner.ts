import { Rng } from '../core/Rng';
import { LANES } from '../data/runner';
import { LOOT, LOOT_ITEMS, RARITIES, RARITY_DISTANCE_BONUS, SOCK_ITEM, COIN, type Rarity } from '../data/pickups';
import { OBSTACLES } from '../data/obstacles';
import type { Pattern } from '../data/patterns';
import { CITIES, type CityId } from '../data/cities';
import { SPAWNER } from '../data/spawner';
import { POWERUPS, POWERUP_IDS, POWERUP_SPAWN } from '../data/powerups';
import { BELLS } from '../data/secrets';
import { PickupKind, type Field } from './Field';

/** Patterns grouped by tier 1..3. */
export function tiersOf(patterns: readonly Pattern[]): Pattern[][] {
  return [1, 2, 3].map((t) => patterns.filter((p) => p.tier === t));
}

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
export function pickPattern(list: readonly Pattern[], rng: Rng, last: Pattern | null, weightOf: (p: Pattern) => number = (p) => p.weight): Pattern {
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = list[weightedIndex(list.map(weightOf), rng.next())];
    if (p !== last || list.length === 1) return p;
  }
  return list[0] === last && list.length > 1 ? list[1] : list[0];
}

/** `luck` (Lucky Whiskers) scales the weight of rare and better loot. */
export function rollRarity(rng: Rng, distance: number, luck = 1): Rarity {
  const k = distance / 1000;
  const w = RARITIES.map((r, i) => r.weight * (1 + RARITY_DISTANCE_BONUS[i] * k) * (i >= 2 ? luck : 1));
  return weightedIndex(w, rng.next()) as Rarity;
}

/** A loot item from this city's set (falls back to any city if the rarity is missing there). */
export function rollLootItem(rng: Rng, distance: number, luck = 1, city: string = 'mapleLane', minRarity = 0): number {
  const rarity = Math.max(minRarity, rollRarity(rng, distance, luck));
  let items = LOOT_ITEMS.filter((i) => i.rarity === rarity && i.city === city);
  if (items.length === 0) items = LOOT_ITEMS.filter((i) => i.rarity === rarity);
  const item = rng.pick(items);
  return LOOT_ITEMS.indexOf(item);
}

const POWER_WEIGHTS = POWERUP_IDS.map((id) => POWERUPS[id].weight);

/** Secrets the spawner asks about when placing bells and Daily Hunt letters. */
export interface SpawnHooks {
  nextBell(): number;
  markBellSpawned(id: number): void;
  nextLetter(s: number): number;
}

/** Streams patterns ahead of the cat into the Field, plus power-ups and secrets in the gaps. */
export class Spawner {
  /** While paused (Boss Chase, Secret Alley) no patterns are placed. */
  paused = false;
  hooks: SpawnHooks | null = null;
  /** Lucky Whiskers multiplier for rare loot. */
  luck = 1;
  /** First run: every gap without a power-up gets a loot item. */
  gapLoot = false;
  /** Noir's passive: cat door patterns appear more often. */
  catDoorMul = 1;
  private readonly weightOf = (p: Pattern): number => (p.name.startsWith('cat-door') ? p.weight * this.catDoorMul : p.weight);
  private nextS: number = SPAWNER.firstAt;
  private tiers: Pattern[][] = tiersOf(CITIES.mapleLane.patterns);
  city: CityId = 'mapleLane';
  private last: Pattern | null = null;
  private readonly rng = new Rng(SPAWNER.seed);

  constructor(private readonly field: Field) {}

  reset(seed: number = SPAWNER.seed): void {
    this.rng.reseed(seed);
    this.nextS = SPAWNER.firstAt;
    this.last = null;
    this.paused = false;
  }

  /** Switches the pattern library and loot set to a city. */
  setCity(city: CityId): void {
    this.city = city;
    this.tiers = tiersOf(CITIES[city].patterns);
  }

  /** Resume placing patterns from `s` onward. */
  resumeAt(s: number): void {
    this.paused = false;
    this.nextS = Math.max(this.nextS, s);
  }

  update(distance: number, speed: number): void {
    if (this.paused) {
      this.nextS = Math.max(this.nextS, distance + SPAWNER.aheadM);
      return;
    }
    while (this.nextS < distance + SPAWNER.aheadM) {
      const tier = pickTier(this.nextS, this.rng);
      const p = pickPattern(this.tiers[tier - 1], this.rng, this.last, this.weightOf);
      this.place(p, this.nextS, this.rng.next() < SPAWNER.mirrorChance);
      this.last = p;
      const gap = Math.max(SPAWNER.minGapM, speed * SPAWNER.gapSec);
      this.placeGapExtras(this.nextS + p.length + gap / 2);
      this.nextS += p.length + gap;
    }
  }

  /** Pattern gaps are clear road: a good place for power-ups, Mystery Fish and Daily Hunt letters. */
  private placeGapExtras(s: number): void {
    const rng = this.rng;
    const x = rng.int(-1, 2) * LANES.width;
    const y = POWERUP_SPAWN.y;
    const roll = rng.next();
    if (roll < POWERUP_SPAWN.perGap) {
      this.field.addPickup(PickupKind.PowerUp, weightedIndex(POWER_WEIGHTS, rng.next()), x, s, y);
    } else if (roll < POWERUP_SPAWN.perGap + POWERUP_SPAWN.mysteryFish) {
      this.field.addPickup(PickupKind.Mystery, 0, x, s, y);
    } else if (roll < POWERUP_SPAWN.perGap + POWERUP_SPAWN.mysteryFish + POWERUP_SPAWN.letter) {
      const letter = this.hooks?.nextLetter(s) ?? -1;
      if (letter >= 0) this.field.addPickup(PickupKind.Letter, letter, x, s, y);
    } else if (this.gapLoot) {
      this.field.addPickup(PickupKind.Loot, rollLootItem(rng, s, this.luck, this.city), x, s, LOOT.y);
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
          const tints = OBSTACLES[e.id].tints;
          const color = tints ? rng.pick(tints) : 0xffffff;
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
          else f.addPickup(PickupKind.Loot, rollLootItem(rng, s, this.luck, this.city), x, s, e.y);
          break;
        case 'bell': {
          const id = this.hooks?.nextBell() ?? -1;
          if (id >= 0 && rng.next() < BELLS.slotChance) {
            this.hooks?.markBellSpawned(id);
            f.addPickup(PickupKind.Bell, id, x, s, e.y);
          }
          break;
        }
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
