import { Rng } from '../core/Rng';
import { CRATE, LOGIN, MARKET, SATCHEL_LEVELS, SECRET_STOCK, UPGRADES, type UpgradeId } from '../data/economy';
import { LOOT_ITEMS } from '../data/pickups';
import { seedOf } from './Time';
import type { Profile } from './Save';

export function upgradeLevel(p: Profile, id: UpgradeId): number {
  return p.upgrades[id] ?? 1;
}

/** Cost to buy the next level, or null when maxed. */
export function upgradeCost(id: UpgradeId, level: number): number | null {
  const def = UPGRADES[id];
  return level >= def.max ? null : def.costs[level - 1];
}

export function satchelCapacity(level: number): number {
  return SATCHEL_LEVELS[Math.max(0, Math.min(SATCHEL_LEVELS.length - 1, level - 1))];
}

export interface BoardEntry {
  item: number;
  mul: number;
}

/** Daily price board: 3 hot items (x2..x3) and 2 cold items (x0.5), seeded by the local day. */
export function dailyBoard(day: number): BoardEntry[] {
  const rng = new Rng(seedOf(day, 1));
  const idx = LOOT_ITEMS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = rng.int(0, i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const out: BoardEntry[] = [];
  for (let i = 0; i < MARKET.hotCount; i++) {
    const mul = Math.round(rng.range(MARKET.hotMul[0], MARKET.hotMul[1]) * 2) / 2;
    out.push({ item: idx[i], mul });
  }
  for (let i = 0; i < MARKET.coldCount; i++) out.push({ item: idx[MARKET.hotCount + i], mul: MARKET.coldMul });
  return out;
}

export function boardMul(board: readonly BoardEntry[], item: number): number {
  for (const e of board) if (e.item === item) return e.mul;
  return 1;
}

/** Coins for one item today. */
export function sellPrice(item: number, board: readonly BoardEntry[], sellMul = 1, haggle = 1): number {
  return Math.max(1, Math.round(LOOT_ITEMS[item].value * boardMul(board, item) * sellMul * haggle));
}

/** Haggle meter: needle position in [-1, 1] -> price bonus (0 when outside every zone). */
export function haggleBonus(pos: number): number {
  const d = Math.abs(pos);
  for (const z of MARKET.haggleZones) if (d <= z.within) return z.bonus;
  return 0;
}

export function stockBucket(now: number): number {
  return Math.floor(now / (MARKET.secretStockHours * 3_600_000));
}

/** Tom's Secret Stock for an 8-hour bucket. */
export function secretStock(bucket: number): (typeof SECRET_STOCK)[number][] {
  const rng = new Rng(seedOf(bucket, 2));
  const pool = [...SECRET_STOCK];
  const out: (typeof SECRET_STOCK)[number][] = [];
  while (out.length < MARKET.secretStockCount && pool.length) out.push(pool.splice(rng.int(0, pool.length), 1)[0]);
  return out;
}

export function crateOddsPercent(): { label: string; percent: number }[] {
  const total = CRATE.reduce((a, c) => a + c.weight, 0);
  return CRATE.map((c) => ({ label: c.label, percent: Math.round((c.weight / total) * 1000) / 10 }));
}

export function loginReward(index: number): (typeof LOGIN)[number] {
  return LOGIN[index % LOGIN.length];
}
