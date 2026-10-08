import { ABILITY, type AbilityId } from '../data/abilities';
import type { Slot } from '../data/accessories';
import type { CatId } from '../data/cats';
import { ECONOMY_START } from '../data/chase';
import type { MissionStat, UpgradeId } from '../data/economy';
import type { IStorage } from '../platform/Storage';

export interface MissionSlot {
  id: string;
  progress: number;
}

export interface Profile {
  version: 2;
  bestScore: number;
  bestDistance: number;
  coins: number;
  fishBones: number;
  runs: number;
  revives: number;
  inventory: { roomba: number; zoomies: number; fishRocket: number };
  ability: AbilityId;
  bells: number[];
  goldenCollar: boolean;
  hunt: { day: number; found: number[] };
  /** Loot item id -> count, kept between runs for Old Tom. */
  stash: Record<string, number>;
  upgrades: Partial<Record<UpgradeId, number>>;
  cats: CatId[];
  cat: CatId;
  accessories: string[];
  outfit: Partial<Record<Slot, string>>;
  /** Completed (traded) Collection Sets. */
  sets: string[];
  missions: { set: number; multiplier: number; active: MissionSlot[] };
  challenges: { day: number; list: (MissionSlot & { done: boolean })[] };
  login: { lastDay: number; streak: number; next: number; streakRewarded: boolean };
  pass: { stamps: number; claimed: number[] };
  /** Secret Stock purchases as "bucket:id". */
  secretBought: string[];
  settings: { music: boolean; sfx: boolean; haptics: boolean };
  /** First-session onboarding flags (GAME_DESIGN 8.1). */
  flags: { introSeen: boolean; tutorialDone: boolean; firstRunDone: boolean; tomIntroDone: boolean; freeHatClaimed: boolean };
  sessions: number;
  totals: Partial<Record<MissionStat, number>>;
}

const KEY = 'wr.save';
const LEGACY_KEYS = ['wr.save.v1'];

export function defaultProfile(): Profile {
  return {
    version: 2,
    bestScore: 0,
    bestDistance: 0,
    coins: ECONOMY_START.coins,
    fishBones: ECONOMY_START.fishBones,
    runs: 0,
    revives: 0,
    inventory: { ...ECONOMY_START.inventory },
    ability: ABILITY.default,
    bells: [],
    goldenCollar: false,
    hunt: { day: -1, found: [] },
    stash: {},
    upgrades: {},
    cats: ['miso'],
    cat: 'miso',
    accessories: [],
    outfit: {},
    sets: [],
    missions: { set: 0, multiplier: 1, active: [] },
    challenges: { day: -1, list: [] },
    login: { lastDay: -1, streak: 0, next: 0, streakRewarded: false },
    pass: { stamps: 0, claimed: [] },
    secretBought: [],
    settings: { music: true, sfx: true, haptics: true },
    flags: { introSeen: false, tutorialDone: false, firstRunDone: false, tomIntroDone: false, freeHatClaimed: false },
    sessions: 0,
    totals: {},
  };
}

/** Upgrades any older save shape to the current version, keeping what it can. */
export function migrate(raw: unknown): Profile {
  const base = defaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Partial<Profile> & { version?: number };
  const merged = { ...base, ...p, version: 2 as const };
  // Nested objects from v1 may be missing keys added later.
  merged.inventory = { ...base.inventory, ...(p.inventory ?? {}) };
  merged.settings = { ...base.settings, ...(p.settings ?? {}) };
  merged.login = { ...base.login, ...(p.login ?? {}) };
  merged.missions = { ...base.missions, ...(p.missions ?? {}) };
  merged.pass = { ...base.pass, ...(p.pass ?? {}) };
  // Players from before onboarding existed have already played: skip the first-session flow.
  merged.flags = p.flags ? { ...base.flags, ...p.flags } : { ...base.flags, ...(p.runs ? { introSeen: true, tutorialDone: true, firstRunDone: true, tomIntroDone: true } : {}) };
  if (!merged.cats.includes('miso')) merged.cats = ['miso', ...merged.cats];
  return merged;
}

/** Versioned player profile behind an IStorage. */
export class Save {
  profile: Profile;

  constructor(private readonly storage: IStorage) {
    this.profile = this.load();
  }

  private load(): Profile {
    for (const key of [KEY, ...LEGACY_KEYS]) {
      const raw = this.storage.get(key);
      if (!raw) continue;
      try {
        return migrate(JSON.parse(raw));
      } catch {
        /* Corrupt save: fall through to the next key or defaults. */
      }
    }
    return defaultProfile();
  }

  write(): void {
    this.storage.set(KEY, JSON.stringify(this.profile));
  }

  reset(): void {
    this.profile = defaultProfile();
    this.write();
  }

  /** Records a finished run; returns true on a new best score. */
  recordRun(score: number, distance: number): boolean {
    const p = this.profile;
    p.runs++;
    const best = score > p.bestScore;
    if (best) p.bestScore = Math.floor(score);
    p.bestDistance = Math.max(p.bestDistance, Math.floor(distance));
    this.write();
    return best;
  }

  addCurrency(coins: number, fishBones: number): void {
    this.profile.coins += coins;
    this.profile.fishBones += fishBones;
    this.write();
  }

  spendFishBones(n: number): boolean {
    if (this.profile.fishBones < n) return false;
    this.profile.fishBones -= n;
    this.write();
    return true;
  }
}
