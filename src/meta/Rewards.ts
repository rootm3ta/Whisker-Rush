import { Rng } from '../core/Rng';
import { ACCESSORIES, ACCESSORY_IDS } from '../data/accessories';
import { CATS, type CatId } from '../data/cats';
import { CRATE, type Reward } from '../data/economy';
import { weightedIndex } from '../gameplay/Spawner';
import type { Profile } from './Save';

/** Applies a reward to the profile and returns short human-readable lines describing it. */
export function grant(p: Profile, r: Reward, rng: Rng): string[] {
  const out: string[] = [];
  if (r.coins) {
    p.coins += r.coins;
    out.push(`${r.coins} coins`);
  }
  if (r.fishBones) {
    p.fishBones += r.fishBones;
    out.push(`${r.fishBones} Fish Bone${r.fishBones > 1 ? 's' : ''}`);
  }
  if (r.roomba) {
    p.inventory.roomba += r.roomba;
    out.push(`${r.roomba} Roomba`);
  }
  if (r.zoomies) {
    p.inventory.zoomies += r.zoomies;
    out.push(`${r.zoomies} Zoomies`);
  }
  if (r.fishRocket) {
    p.inventory.fishRocket += r.fishRocket;
    out.push(`${r.fishRocket} Fish Rocket`);
  }
  if (r.accessory && !p.accessories.includes(r.accessory)) {
    p.accessories.push(r.accessory);
    out.push(ACCESSORIES[r.accessory].name);
  }
  if (r.cat && !p.cats.includes(r.cat as CatId)) {
    p.cats.push(r.cat as CatId);
    out.push(`${CATS[r.cat as CatId].name} joins the crew`);
  }
  for (let i = 0; i < (r.crate ?? 0); i++) out.push(...openCrate(p, rng));
  return out;
}

/** Catnip Crate: weighted roll from the published odds table. */
export function openCrate(p: Profile, rng: Rng): string[] {
  const e = CRATE[weightedIndex(CRATE.map((c) => c.weight), rng.next())];
  if (e.id === 'accessory') {
    const locked = ACCESSORY_IDS.filter((id) => !p.accessories.includes(id));
    if (locked.length === 0) return grant(p, { coins: 1000 }, rng);
    return grant(p, { accessory: rng.pick(locked) }, rng);
  }
  const { coins, fishBones, roomba, zoomies } = e as { coins?: number; fishBones?: number; roomba?: number; zoomies?: number };
  return grant(p, { coins, fishBones, roomba, zoomies }, rng);
}
