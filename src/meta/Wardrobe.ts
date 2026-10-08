import { ACCESSORIES, type Slot } from '../data/accessories';
import { CATS, type CatId } from '../data/cats';
import type { Profile } from './Save';

export function ownsCat(p: Profile, id: CatId): boolean {
  return p.cats.includes(id);
}

export function canBuyCat(p: Profile, id: CatId): boolean {
  const u = CATS[id].unlock;
  if (ownsCat(p, id)) return false;
  if (u.coins) return p.coins >= u.coins;
  if (u.fishBones) return p.fishBones >= u.fishBones;
  return false;
}

export function buyCat(p: Profile, id: CatId): boolean {
  if (!canBuyCat(p, id)) return false;
  const u = CATS[id].unlock;
  p.coins -= u.coins ?? 0;
  p.fishBones -= u.fishBones ?? 0;
  p.cats.push(id);
  return true;
}

export function selectCat(p: Profile, id: CatId): boolean {
  if (!ownsCat(p, id)) return false;
  p.cat = id;
  return true;
}

export function buyAccessory(p: Profile, id: string): boolean {
  const a = ACCESSORIES[id];
  if (!a || a.source || p.accessories.includes(id)) return false;
  if ((a.coins ?? 0) > p.coins || (a.fishBones ?? 0) > p.fishBones) return false;
  p.coins -= a.coins ?? 0;
  p.fishBones -= a.fishBones ?? 0;
  p.accessories.push(id);
  return true;
}

/** Equips an owned accessory, or takes it off if already worn. */
export function toggleAccessory(p: Profile, id: string): boolean {
  if (!p.accessories.includes(id)) return false;
  const slot: Slot = ACCESSORIES[id].slot;
  if (p.outfit[slot] === id) delete p.outfit[slot];
  else p.outfit[slot] = id;
  return true;
}
