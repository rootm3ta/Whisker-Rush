import { Rng } from '../core/Rng';
import { CAT_PASSIVES } from '../data/cats';
import { CONSUMABLES, SETS, SET_COIN_BONUS, STASH, type Reward } from '../data/economy';
import { LOOT_MAPLE_LANE } from '../data/pickups';
import { sellPrice, type BoardEntry } from './Economy';
import { grant } from './Rewards';
import type { Profile } from './Save';

export function stashTotal(p: Profile): number {
  let n = 0;
  for (const k in p.stash) n += p.stash[k];
  return n;
}

/** Moves run loot into the stash. Overflow auto-sells at base price. Returns overflow coins. */
export function addToStash(p: Profile, items: readonly number[]): number {
  let coins = 0;
  for (const i of items) {
    const item = LOOT_MAPLE_LANE[i];
    if (stashTotal(p) >= STASH.capacity) {
      coins += item.value;
      continue;
    }
    p.stash[item.id] = (p.stash[item.id] ?? 0) + 1;
  }
  p.coins += coins;
  return coins;
}

export function itemIndex(id: string): number {
  return LOOT_MAPLE_LANE.findIndex((i) => i.id === id);
}

export function sellMul(p: Profile): number {
  return p.cat === 'mittens' ? CAT_PASSIVES.mittensSellMul : 1;
}

/** Sells `count` of one item; returns coins earned. */
export function sell(p: Profile, id: string, count: number, board: readonly BoardEntry[], haggle = 1): number {
  const have = p.stash[id] ?? 0;
  const n = Math.min(have, count);
  if (n <= 0) return 0;
  const idx = itemIndex(id);
  // Haggle bonus applies to one item of the stack.
  const coins = sellPrice(idx, board, sellMul(p), haggle) + (n - 1) * sellPrice(idx, board, sellMul(p));
  p.stash[id] = have - n;
  if (p.stash[id] === 0) delete p.stash[id];
  p.coins += coins;
  return coins;
}

/** Sells everything; returns coins and how many items were sold. */
export function sellAll(p: Profile, board: readonly BoardEntry[]): { coins: number; items: number; socks: number } {
  let coins = 0;
  let items = 0;
  const socks = p.stash.sock ?? 0;
  for (const id of Object.keys(p.stash)) {
    const n = p.stash[id];
    items += n;
    coins += sell(p, id, n, board);
  }
  return { coins, items, socks };
}

export function setProgress(p: Profile, setId: string): { have: number; need: number; complete: boolean; traded: boolean } {
  const set = SETS.find((s) => s.id === setId)!;
  const have = set.items.filter((id) => (p.stash[id] ?? 0) > 0).length;
  return { have, need: set.items.length, complete: have === set.items.length, traded: p.sets.includes(setId) };
}

/** Trades one of each set item for the set reward and a permanent coin bonus. */
export function tradeSet(p: Profile, setId: string, rng: Rng): string[] | null {
  const set = SETS.find((s) => s.id === setId);
  if (!set || p.sets.includes(setId) || !setProgress(p, setId).complete) return null;
  for (const id of set.items) {
    p.stash[id]--;
    if (p.stash[id] === 0) delete p.stash[id];
  }
  p.sets.push(setId);
  const r: Reward = set.reward.kind === 'cat' ? { cat: set.reward.id } : { accessory: set.reward.id };
  return grant(p, r, rng);
}

export function setCoinBonus(p: Profile): number {
  return 1 + p.sets.length * SET_COIN_BONUS;
}

/** Buys a Secret Stock entry once per bucket. */
export function buySecret(
  p: Profile,
  entry: { kind: 'accessory' | 'consumable'; id: string; coins?: number; fishBones?: number },
  bucket: number,
): boolean {
  const key = `${bucket}:${entry.id}`;
  if (p.secretBought.includes(key)) return false;
  if (entry.kind === 'accessory' && p.accessories.includes(entry.id)) return false;
  if ((entry.coins ?? 0) > p.coins || (entry.fishBones ?? 0) > p.fishBones) return false;
  p.coins -= entry.coins ?? 0;
  p.fishBones -= entry.fishBones ?? 0;
  p.secretBought = p.secretBought.filter((k) => k.startsWith(`${bucket}:`));
  p.secretBought.push(key);
  if (entry.kind === 'accessory') p.accessories.push(entry.id);
  else p.inventory[entry.id as keyof typeof CONSUMABLES]++;
  return true;
}
