import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/Rng';
import { ACCESSORIES, SLOTS } from '../src/data/accessories';
import { CATS, CAT_IDS } from '../src/data/cats';
import { COST_LADDER, LOGIN, MARKET, MISSIONS, PASS, SATCHEL_LEVELS, SETS, UPGRADES, UPGRADE_IDS } from '../src/data/economy';
import { LOOT_MAPLE_LANE } from '../src/data/pickups';
import { TOM_LINES } from '../src/data/tom';
import { claimLogin, loginState } from '../src/meta/Calendar';
import {
  boardMul,
  crateOddsPercent,
  dailyBoard,
  haggleBonus,
  satchelCapacity,
  secretStock,
  sellPrice,
  stockBucket,
  upgradeCost,
} from '../src/meta/Economy';
import { computeRunConfig } from '../src/meta/Loadout';
import { addToStash, buySecret, itemIndex, sell, sellAll, setProgress, tradeSet } from '../src/meta/Market';
import { applyStats, ensureMissions, missionTarget } from '../src/meta/Missions';
import { claimTier, passTier, runStamps } from '../src/meta/Pass';
import { openCrate } from '../src/meta/Rewards';
import { defaultProfile, migrate, Save } from '../src/meta/Save';
import { buyAccessory, buyCat, selectCat, toggleAccessory } from '../src/meta/Wardrobe';
import { MemoryStorage } from '../src/platform/Storage';

const rng = () => new Rng(1);

describe('upgrade tables', () => {
  it('cost ladders increase and the satchel goes 12 -> 60', () => {
    expect(COST_LADDER).toEqual([500, 1500, 4000, 10000, 25000]);
    for (const id of UPGRADE_IDS) {
      const c = UPGRADES[id].costs;
      expect(c.length).toBe(UPGRADES[id].max - 1);
      for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThan(c[i - 1]);
    }
    expect(satchelCapacity(1)).toBe(12);
    expect(satchelCapacity(SATCHEL_LEVELS.length)).toBe(60);
    expect(upgradeCost('agility', 1)).toBe(500);
    expect(upgradeCost('agility', 5)).toBe(25000);
    expect(upgradeCost('agility', 6)).toBeNull();
  });

  it('loadout reflects upgrades and cat passives', () => {
    const p = defaultProfile();
    const base = computeRunConfig(p);
    p.upgrades.agility = 6;
    p.upgrades.pounceSpring = 6;
    p.upgrades['power:magnet'] = 3;
    p.upgrades.satchel = 8;
    p.cat = 'pixel';
    const c = computeRunConfig(p);
    expect(c.laneSwitchSec).toBeLessThan(base.laneSwitchSec);
    expect(c.jumpHeight).toBeGreaterThan(base.jumpHeight);
    expect(c.maxKicks).toBe(base.maxKicks + 1);
    expect(c.powerLevel('magnet')).toBe(3);
    expect(c.satchelCapacity).toBe(60);
    expect(c.startBubble).toBe(true);
  });
});

describe('market', () => {
  it('daily board: 3 hot (x2..x3) and 2 cold (x0.5), distinct, same all day', () => {
    for (let day = 19000; day < 19030; day++) {
      const b = dailyBoard(day);
      expect(b.length).toBe(MARKET.hotCount + MARKET.coldCount);
      expect(new Set(b.map((e) => e.item)).size).toBe(b.length);
      const hot = b.filter((e) => e.mul > 1);
      expect(hot.length).toBe(3);
      for (const h of hot) expect(h.mul >= 2 && h.mul <= 3).toBe(true);
      expect(b.filter((e) => e.mul === 0.5).length).toBe(2);
      expect(dailyBoard(day)).toEqual(b);
    }
    expect(dailyBoard(1)).not.toEqual(dailyBoard(2));
  });

  it('sell prices apply board, passive and haggle', () => {
    const b = dailyBoard(5);
    const hot = b[0];
    const v = LOOT_MAPLE_LANE[hot.item].value;
    expect(sellPrice(hot.item, b)).toBe(Math.round(v * hot.mul));
    expect(sellPrice(hot.item, b, 1, 1.5)).toBe(Math.round(v * hot.mul * 1.5));
    expect(boardMul(b, 999)).toBe(1);
  });

  it('haggle zones: center pays most, edges pay nothing', () => {
    expect(haggleBonus(0)).toBe(0.5);
    expect(haggleBonus(0.2)).toBe(0.3);
    expect(haggleBonus(-0.4)).toBe(0.1);
    expect(haggleBonus(0.9)).toBe(0);
  });

  it('stash, sell and sell all', () => {
    const p = defaultProfile();
    addToStash(p, [itemIndex('sock'), itemIndex('sock'), itemIndex('toyMouse')]);
    expect(p.stash).toEqual({ sock: 2, toyMouse: 1 });
    const board = dailyBoard(10);
    const c1 = sell(p, 'sock', 1, board);
    expect(c1).toBeGreaterThan(0);
    const all = sellAll(p, board);
    expect(all.items).toBe(2);
    expect(all.socks).toBe(1);
    expect(p.stash).toEqual({});
    expect(p.coins).toBe(c1 + all.coins);
  });

  it('stash overflow auto-sells at base price', () => {
    const p = defaultProfile();
    addToStash(p, new Array(60).fill(itemIndex('bottleCap')));
    const coins = addToStash(p, [itemIndex('silverBell')]);
    expect(coins).toBe(LOOT_MAPLE_LANE[itemIndex('silverBell')].value);
  });

  it('collection sets trade for their reward once', () => {
    const p = defaultProfile();
    const set = SETS.find((s) => s.id === 'fancyThings')!;
    addToStash(p, set.items.map(itemIndex));
    expect(setProgress(p, 'fancyThings').complete).toBe(true);
    expect(tradeSet(p, 'fancyThings', rng())).not.toBeNull();
    expect(p.cats).toContain('mittens');
    expect(tradeSet(p, 'fancyThings', rng())).toBeNull();
    expect(computeRunConfig(p).coinMul).toBeCloseTo(1.02);
  });

  it('secret stock rotates every 8 hours and buys once per bucket', () => {
    const h = 3_600_000;
    expect(stockBucket(0)).toBe(stockBucket(7.9 * h));
    expect(stockBucket(8 * h)).toBe(stockBucket(0) + 1);
    const s = secretStock(3);
    expect(s.length).toBe(3);
    expect(secretStock(3)).toEqual(s);
    const p = defaultProfile();
    p.coins = 1e6;
    p.fishBones = 100;
    expect(buySecret(p, s[0], 3)).toBe(true);
    expect(buySecret(p, s[0], 3)).toBe(false);
  });

  it('Tom has 30+ lines', () => {
    const n = Object.values(TOM_LINES).reduce((a, l) => a + l.length, 0);
    expect(n).toBeGreaterThanOrEqual(30);
  });
});

describe('missions and challenges', () => {
  it('3 active; completing a set bumps the multiplier and draws a new set', () => {
    const p = defaultProfile();
    ensureMissions(p);
    expect(p.missions.active.length).toBe(3);
    const stats: Record<string, number> = {};
    for (const m of p.missions.active) {
      const def = MISSIONS.find((d) => d.id === m.id)!;
      stats[def.stat] = Math.max(stats[def.stat] ?? 0, missionTarget(m.id, 0));
    }
    const res = applyStats(p, stats, 100, rng());
    expect(res.setDone).toBe(true);
    expect(p.missions.multiplier).toBe(2);
    expect(p.missions.set).toBe(1);
    expect(p.missions.active.every((m) => m.progress === 0)).toBe(true);
    expect(missionTarget('kick15', 1)).toBeGreaterThan(missionTarget('kick15', 0));
  });

  it('run-scope missions take the best run, total-scope accumulate', () => {
    const p = defaultProfile();
    p.missions.active = [
      { id: 'run1500', progress: 0 },
      { id: 'kick15', progress: 0 },
      { id: 'boss1', progress: 0 },
    ];
    applyStats(p, { distance: 900, wallKicks: 5 }, 1, rng());
    applyStats(p, { distance: 600, wallKicks: 5 }, 1, rng());
    expect(p.missions.active[0].progress).toBe(900);
    expect(p.missions.active[1].progress).toBe(10);
  });

  it('daily challenges pay Fish Bones once', () => {
    const p = defaultProfile();
    const big = { distance: 1e5, coins: 1e5, wallKicks: 1e3, nearMisses: 1e3, itemsSold: 1e3, jumps: 1e3, powerUps: 1e3, grindMeters: 1e3 };
    const bones = p.fishBones;
    const r = applyStats(p, big, 7, rng());
    expect(r.challengesDone).toBe(3);
    expect(p.fishBones).toBeGreaterThanOrEqual(bones + 3);
    expect(applyStats(p, big, 7, rng()).challengesDone).toBe(0);
  });
});

describe('login calendar, crate and pass', () => {
  it('7-day calendar escalates; a missed day restarts it; 3-day streak gives the cosmetic', () => {
    const p = defaultProfile();
    for (let d = 0; d < 3; d++) expect(claimLogin(p, 100 + d, rng())).not.toBeNull();
    expect(claimLogin(p, 102, rng())).toBeNull();
    expect(p.login.next).toBe(3);
    expect(p.accessories).toContain('sparkleTrail');
    expect(loginState(p, 105).index).toBe(0);
    expect(loginState(p, 106).comeback).toBe(true);
    expect(LOGIN.length).toBe(7);
  });

  it('crate odds are published and sum to 100%', () => {
    const odds = crateOddsPercent();
    expect(odds.reduce((a, o) => a + o.percent, 0)).toBeCloseTo(100);
    const p = defaultProfile();
    for (let i = 0; i < 50; i++) expect(openCrate(p, new Rng(i)).length).toBeGreaterThan(0);
  });

  it('pass tiers come from stamps and claim once', () => {
    const p = defaultProfile();
    p.pass.stamps = PASS.stampsPerTier * 30;
    expect(passTier(p.pass.stamps)).toBe(30);
    expect(claimTier(p, 30, rng())).not.toBeNull();
    expect(p.cats).toContain('pixel');
    expect(claimTier(p, 30, rng())).toBeNull();
    expect(runStamps(1000)).toBe(4);
  });
});

describe('wardrobe', () => {
  it('6 cats and 12+ accessories covering every slot', () => {
    expect(CAT_IDS.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(ACCESSORIES).length).toBeGreaterThanOrEqual(12);
    for (const s of SLOTS) expect(Object.values(ACCESSORIES).some((a) => a.slot === s)).toBe(true);
  });

  it('buy, select, equip and toggle', () => {
    const p = defaultProfile();
    p.coins = CATS.biscuit.unlock.coins! + 5000;
    expect(buyCat(p, 'biscuit')).toBe(true);
    expect(selectCat(p, 'biscuit')).toBe(true);
    expect(selectCat(p, 'noir')).toBe(false);
    expect(buyAccessory(p, 'beret')).toBe(true);
    expect(buyAccessory(p, 'crown')).toBe(false);
    expect(toggleAccessory(p, 'beret')).toBe(true);
    expect(p.outfit.head).toBe('beret');
    toggleAccessory(p, 'beret');
    expect(p.outfit.head).toBeUndefined();
  });
});

describe('save', () => {
  it('migrates a v1 save and keeps progress', () => {
    const storage = new MemoryStorage();
    storage.set('wr.save.v1', JSON.stringify({ version: 1, bestScore: 777, coins: 42, fishBones: 3, inventory: { roomba: 5 } }));
    const s = new Save(storage);
    expect(s.profile.version).toBe(2);
    expect(s.profile.bestScore).toBe(777);
    expect(s.profile.inventory.roomba).toBe(5);
    expect(s.profile.inventory.zoomies).toBe(1);
    expect(s.profile.cats).toEqual(['miso']);
    s.write();
    expect(new Save(storage).profile.coins).toBe(42);
    expect(migrate(null).version).toBe(2);
  });
});
