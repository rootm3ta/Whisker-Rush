import { CITIES, type CityId } from '../data/cities';
import type { Profile } from './Save';

export type UnlockMethod = 'distance' | 'coins' | 'fishBones';

export interface UnlockOption {
  method: UnlockMethod;
  need: number;
  have: number;
  ok: boolean;
}

export function isUnlocked(p: Profile, id: CityId): boolean {
  return p.cities.includes(id);
}

/** Unlock by distance milestone OR coins OR Fish Bones (player's choice, GAME_DESIGN 7). */
export function unlockOptions(p: Profile, id: CityId): UnlockOption[] {
  const u = CITIES[id].unlock;
  const out: UnlockOption[] = [];
  if (u.bestDistance) out.push({ method: 'distance', need: u.bestDistance, have: p.bestDistance, ok: p.bestDistance >= u.bestDistance });
  if (u.coins) out.push({ method: 'coins', need: u.coins, have: p.coins, ok: p.coins >= u.coins });
  if (u.fishBones) out.push({ method: 'fishBones', need: u.fishBones, have: p.fishBones, ok: p.fishBones >= u.fishBones });
  return out;
}

export function unlockCity(p: Profile, id: CityId, method: UnlockMethod): boolean {
  if (isUnlocked(p, id)) return false;
  const opt = unlockOptions(p, id).find((o) => o.method === method);
  if (!opt || !opt.ok) return false;
  if (method === 'coins') p.coins -= opt.need;
  if (method === 'fishBones') p.fishBones -= opt.need;
  p.cities.push(id);
  return true;
}

export function travel(p: Profile, id: CityId): boolean {
  if (!isUnlocked(p, id)) return false;
  p.city = id;
  return true;
}
