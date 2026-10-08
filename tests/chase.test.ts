import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import type { GameEvents } from '../src/core/events';
import { Action } from '../src/core/Input';
import { CHASE, PACK_RUSH, REVIVE } from '../src/data/chase';
import { Chase, RushPhase } from '../src/gameplay/Chase';
import { reviveCost, ReviveTracker } from '../src/gameplay/Revive';
import { Runner } from '../src/gameplay/Runner';
import { RunSession } from '../src/gameplay/RunSession';
import { Save } from '../src/meta/Save';
import { MemoryStorage } from '../src/platform/Storage';

const DT = 1 / 60;

describe('Chase', () => {
  it('pack closes in on a stumble, then drops back', () => {
    const bus = new EventBus<GameEvents>();
    const chase = new Chase(bus, () => {});
    const r = new Runner(bus);
    for (let i = 0; i < 60; i++) chase.step(DT, r);
    expect(chase.gap).toBeGreaterThan(CHASE.visibleGap);
    bus.emit('stumble', 0);
    for (let i = 0; i < 120; i++) chase.step(DT, r);
    expect(chase.gap).toBeLessThan(CHASE.closeGap + 0.5);
    for (let i = 0; i < 60 * (CHASE.closeSec + 2); i++) chase.step(DT, r);
    expect(chase.gap).toBeGreaterThan(CHASE.visibleGap);
  });

  it('Duke taunts while close', () => {
    const bus = new EventBus<GameEvents>();
    let taunts = 0;
    bus.on('dukeTaunt', () => taunts++);
    const chase = new Chase(bus, () => {});
    bus.emit('stumble', 0);
    for (let i = 0; i < 180; i++) chase.step(DT, new Runner(bus));
    expect(taunts).toBeGreaterThan(0);
  });

  it('Pack Rush warns, runs, and pays out when Bolt never touches the cat', () => {
    const bus = new EventBus<GameEvents>();
    const log: string[] = [];
    bus.on('packRushWarn', () => log.push('warn'));
    bus.on('packRushStart', () => log.push('start'));
    bus.on('packRushEnd', (s) => log.push(`end${s}`));
    let hits = 0;
    const chase = new Chase(bus, () => hits++);
    const r = new Runner(bus);
    r.time = PACK_RUSH.firstAtSec;
    // Keep the cat airborne-high so Bolt passes underneath.
    r.y = 5;
    for (let i = 0; i < 60 * (PACK_RUSH.warnSec + PACK_RUSH.durationSec + 1); i++) {
      r.time += DT;
      chase.step(DT, r);
    }
    expect(log).toEqual(['warn', 'start', 'end1']);
    expect(hits).toBe(0);
    expect(chase.rushPhase).toBe(RushPhase.Idle);
  });

  it('Bolt hits a cat that stays in his lane', () => {
    const bus = new EventBus<GameEvents>();
    let hits = 0;
    const chase = new Chase(bus, () => hits++);
    const r = new Runner(bus);
    r.time = PACK_RUSH.firstAtSec;
    for (let i = 0; i < 60 * (PACK_RUSH.warnSec + PACK_RUSH.passSec + 0.5); i++) {
      r.time += DT;
      chase.step(DT, r);
    }
    expect(hits).toBe(1);
  });
});

describe('Revive', () => {
  it('first revive is a free ad, then 1, 2, 4, 8, 8 Fish Bones', () => {
    const t = new ReviveTracker();
    expect(t.next()).toEqual({ kind: 'ad', cost: 0 });
    t.use('ad');
    const costs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const o = t.next();
      expect(o.kind).toBe('fishBones');
      costs.push(o.cost);
      t.use('fishBones');
    }
    expect(costs).toEqual([1, 2, 4, 8, 8]);
    expect(reviveCost(100)).toBe(8);
    expect(t.total).toBe(6);
  });

  it('revive clears the crash, the way ahead, and grants invulnerability', () => {
    const bus = new EventBus<GameEvents>();
    const run = new RunSession(bus);
    run.reset();
    run.field.reset();
    (run.spawner as unknown as { update: () => void }).update = () => {};
    run.field.addObstacle('trashCans', 0, 15, 1, 0);
    for (let i = 0; i < 120 && !run.crashed; i++) run.step(DT);
    expect(run.crashed).toBe(true);
    run.field.addObstacle('trashCans', 0, run.runner.distance + 10, 1, 0);
    run.revive('ad');
    expect(run.crashed).toBe(false);
    expect(run.field.obstacles.some((o) => o.active)).toBe(false);
    expect(run.collision.invulnerable).toBe(true);
    run.field.addObstacle('trashCans', 0, run.runner.distance + 5, 1, 0);
    for (let i = 0; i < 40; i++) run.step(DT);
    expect(run.crashed).toBe(false);
    for (let i = 0; i < 60 * REVIVE.invulnSec; i++) run.step(DT);
    run.handleAction(Action.Left);
    expect(run.revives.total).toBe(1);
  });
});

describe('Save', () => {
  it('persists best score and currency', () => {
    const storage = new MemoryStorage();
    const a = new Save(storage);
    const startBones = a.profile.fishBones;
    expect(a.recordRun(500, 300)).toBe(true);
    expect(a.recordRun(200, 100)).toBe(false);
    a.addCurrency(10, 1);
    expect(a.spendFishBones(startBones + 2)).toBe(false);
    expect(a.spendFishBones(1)).toBe(true);
    const b = new Save(storage);
    expect(b.profile.bestScore).toBe(500);
    expect(b.profile.coins).toBe(10);
    expect(b.profile.fishBones).toBe(startBones);
    expect(b.profile.runs).toBe(2);
  });
});
