import { ABILITY, type AbilityId } from '../data/abilities';
import { ECONOMY_START } from '../data/chase';
import type { IStorage } from '../platform/Storage';

export interface Profile {
  version: 1;
  bestScore: number;
  bestDistance: number;
  coins: number;
  fishBones: number;
  runs: number;
  revives: number;
  /** Consumables: Roomba rides and start boosts. */
  inventory: { roomba: number; zoomies: number; fishRocket: number };
  ability: AbilityId;
  /** Lucky Bell ids found in Maple Lane. */
  bells: number[];
  goldenCollar: boolean;
  /** Daily Hunt: UTC day number and letter indices found that day. */
  hunt: { day: number; found: number[] };
}

const KEY = 'wr.save.v1';

export function defaultProfile(): Profile {
  return {
    version: 1,
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
  };
}

/** Versioned player profile behind an IStorage. Extended with inventory and upgrades in M5. */
export class Save {
  profile: Profile;

  constructor(private readonly storage: IStorage) {
    this.profile = this.load();
  }

  private load(): Profile {
    const raw = this.storage.get(KEY);
    if (!raw) return defaultProfile();
    try {
      const p = JSON.parse(raw) as Partial<Profile>;
      return { ...defaultProfile(), ...p, version: 1 };
    } catch {
      return defaultProfile();
    }
  }

  write(): void {
    this.storage.set(KEY, JSON.stringify(this.profile));
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
