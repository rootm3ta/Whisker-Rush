import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Rng } from '../core/Rng';
import { LANES } from '../data/runner';
import type { Rarity } from '../data/pickups';
import { POWERUPS, POWERUP_IDS, type PowerUpId } from '../data/powerups';
import { BELLS, CAT_DOOR, DAILY_HUNT, MYSTERY_FISH } from '../data/secrets';
import type { Profile } from '../meta/Save';
import type { CityId } from '../data/cities';
import { PickupKind, type Field } from './Field';
import type { PowerUps } from './PowerUps';
import type { Runner } from './Runner';
import type { Score } from './Score';
import { rollLootItem, weightedIndex } from './Spawner';

export function dayNumber(now: number): number {
  return Math.floor(now / 86_400_000);
}

export function huntWord(day: number): string {
  return DAILY_HUNT.words[((day % DAILY_HUNT.words.length) + DAILY_HUNT.words.length) % DAILY_HUNT.words.length];
}

/** Rolls a loot item index of at least `min` rarity from a city's set. */
export function rollLootAtLeast(rng: Rng, distance: number, min: Rarity, city = 'mapleLane'): number {
  return rollLootItem(rng, distance, 1, city, min);
}

const SPAWNABLE: PowerUpId[] = POWERUP_IDS.filter((id) => POWERUPS[id].weight > 0);

/** Lucky Bells, Cat Doors and the Secret Alley, Mystery Fish and the Daily Hunt. */
export class Secrets {
  profile: Profile | null = null;
  word = huntWord(dayNumber(Date.now()));
  alleyLeft = 0;
  loafLeft = 0;
  private readonly bellsSpawned = new Set<number>();
  private letterOnFieldUntil = -Infinity;
  private rowT = 0;
  private lootT = 0;
  private readonly rng = new Rng(9090);

  constructor(private readonly bus: EventBus<GameEvents>) {}

  get inAlley(): boolean {
    return this.alleyLeft > 0;
  }

  /** City the run is in (bells are per city). */
  city: CityId = 'mapleLane';

  private bells(): number[] {
    const p = this.profile;
    if (!p) return [];
    return (p.bellsByCity[this.city] ??= []);
  }

  get bellsFound(): number {
    return this.bells().length;
  }

  reset(profile: Profile | null, now: number, city: CityId = 'mapleLane'): void {
    this.profile = profile;
    this.city = city;
    this.alleyLeft = 0;
    this.loafLeft = 0;
    this.bellsSpawned.clear();
    this.letterOnFieldUntil = -Infinity;
    const day = dayNumber(now);
    this.word = huntWord(day);
    if (profile && profile.hunt.day !== day) profile.hunt = { day, found: [] };
  }

  /** Bell coin bonus (+5% once all bells in the city are found). */
  get coinBonus(): number {
    return this.bellsFound >= BELLS.perCity ? 1 + BELLS.coinBonus : 1;
  }

  /** Next bell id to place in a slot, or -1. */
  nextBell(): number {
    const found = this.bells();
    for (let id = 0; id < BELLS.perCity; id++) {
      if (!found.includes(id) && !this.bellsSpawned.has(id)) return id;
    }
    return -1;
  }

  markBellSpawned(id: number): void {
    this.bellsSpawned.add(id);
  }

  /** Next Daily Hunt letter index to place, or -1 when done or one is already out. */
  nextLetter(s: number): number {
    if (!this.profile || s < this.letterOnFieldUntil) return -1;
    const found = this.profile.hunt.found;
    for (let i = 0; i < this.word.length; i++) {
      if (!found.includes(i)) {
        this.letterOnFieldUntil = s + 60;
        return i;
      }
    }
    return -1;
  }

  collectBell(id: number): void {
    const p = this.profile;
    const bells = this.bells();
    if (!p || bells.includes(id)) return;
    bells.push(id);
    this.bus.emit('bell', id);
    if (bells.length >= BELLS.perCity && !p.goldenCollar) {
      p.goldenCollar = true;
      this.bus.emit('allBells', 0);
    }
  }

  collectLetter(i: number): void {
    const p = this.profile;
    this.letterOnFieldUntil = -Infinity;
    if (!p || p.hunt.found.includes(i)) return;
    p.hunt.found.push(i);
    this.bus.emit('letter', i);
    if (p.hunt.found.length >= this.word.length) {
      p.coins += DAILY_HUNT.rewardCoins;
      p.fishBones += DAILY_HUNT.rewardFishBones;
      this.bus.emit('huntComplete', 0);
    }
  }

  /** Mystery Fish: a random spawnable power-up, or a gag. */
  mysteryFish(powerUps: PowerUps, r: Runner, score: Score): void {
    this.bus.emit('mysteryFish', 0);
    const pick = MYSTERY_FISH.table[weightedIndex(MYSTERY_FISH.table.map((e) => e.weight), this.rng.next())].id;
    if (pick === 'powerup') {
      powerUps.activate(this.rng.pick(SPAWNABLE));
    } else if (pick === 'sneeze') {
      score.coins += MYSTERY_FISH.sneezeCoins;
      if (r.grounded) r.tryAction(2);
      this.bus.emit('gag', 0);
    } else {
      this.loafLeft = MYSTERY_FISH.loafSec;
      this.bus.emit('gag', 1);
    }
  }

  enterAlley(r: Runner, field: Field): void {
    this.alleyLeft = CAT_DOOR.alleySec;
    this.rowT = 0;
    this.lootT = CAT_DOOR.lootEvery * 0.5;
    field.clearAll(r.distance - 1);
  }

  /** Secret Alley: a coin river with rare loot, no obstacles. Returns true when it ends. */
  stepAlley(dt: number, r: Runner, field: Field): boolean {
    if (this.alleyLeft <= 0) return false;
    this.alleyLeft -= dt;
    const ahead = r.distance + 28;
    this.rowT -= dt;
    if (this.rowT <= 0 && this.alleyLeft > 1.5) {
      this.rowT = 1 / CAT_DOOR.coinRowsPerSec;
      for (let lane = -1; lane <= 1; lane++) field.addCoin(lane * LANES.width, ahead, 0.6 + 0.4 * Math.sin(ahead * 0.3 + lane));
    }
    this.lootT -= dt;
    if (this.lootT <= 0 && this.alleyLeft > 1.5) {
      this.lootT = CAT_DOOR.lootEvery;
      const lane = this.rng.int(-1, 2);
      field.addPickup(PickupKind.Loot, rollLootAtLeast(this.rng, r.distance, CAT_DOOR.minRarity as Rarity, this.city), lane * LANES.width, ahead + 1, 0.9);
    }
    if (this.alleyLeft <= 0) {
      this.alleyLeft = 0;
      this.bus.emit('alleyEnd', 0);
      return true;
    }
    return false;
  }

  /** Loaf gag: bonus points while it lasts. Returns points earned this step. */
  stepLoaf(dt: number): number {
    if (this.loafLeft <= 0) return 0;
    this.loafLeft -= dt;
    return MYSTERY_FISH.loafPointsPerSec * dt;
  }
}
