import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import type { GameEvents } from '../src/core/events';
import { Action } from '../src/core/Input';
import { COMBO, POINTS, STUNT_RULES } from '../src/data/scoring';
import { Field } from '../src/gameplay/Field';
import { RunSession } from '../src/gameplay/RunSession';
import { Score } from '../src/gameplay/Score';
import { ScoreKeeper } from '../src/gameplay/ScoreKeeper';
import { Satchel } from '../src/meta/Satchel';

describe('Score', () => {
  it('distance x multiplier x combo', () => {
    const s = new Score();
    s.reset(2);
    s.addDistance(100);
    expect(s.points).toBe(200 * POINTS.perMeter);
    s.bumpCombo(1);
    s.award(10);
    expect(s.points).toBe(200 + 10 * 2 * 2);
  });

  it('combo clamps, decays after the delay and breaks to x1', () => {
    const s = new Score();
    s.bumpCombo(10);
    expect(s.combo).toBe(COMBO.max);
    s.update(COMBO.decayDelay * 0.5);
    expect(s.combo).toBe(COMBO.max);
    for (let i = 0; i < 600; i++) s.update(1 / 60);
    expect(s.combo).toBeLessThan(COMBO.max);
    s.breakCombo();
    expect(s.combo).toBe(COMBO.min);
  });
});

describe('ScoreKeeper', () => {
  it('awards coins, stunts and dodge chains', () => {
    const bus = new EventBus<GameEvents>();
    const score = new Score();
    const keeper = new ScoreKeeper(bus, score);
    const stunts: number[] = [];
    bus.on('stunt', (i) => stunts.push(i));
    bus.emit('coin', 1);
    expect(score.coins).toBe(1);
    expect(score.points).toBe(POINTS.coin);
    bus.emit('wallKick', 1);
    bus.emit('wallKick', 2);
    bus.emit('wallKick', 3);
    expect(stunts).toContain(0);
    bus.emit('grindStart', 0);
    bus.emit('grindEnd', STUNT_RULES.longGrindSec + 0.1);
    expect(stunts).toContain(1);
    for (let i = 0; i < STUNT_RULES.dodgeChainCount; i++) keeper.nearMiss();
    expect(stunts).toContain(2);
    bus.emit('stumble', 0);
    expect(score.combo).toBe(COMBO.min);
  });
});

describe('Satchel', () => {
  it('refuses loot when full', () => {
    const s = new Satchel(2);
    expect(s.add(1)).toBe(true);
    expect(s.add(2)).toBe(true);
    expect(s.add(3)).toBe(false);
    expect(s.count).toBe(2);
  });
});

describe('RunSession collisions', () => {
  const DT = 1 / 60;
  function session(): { run: RunSession; bus: EventBus<GameEvents> } {
    const bus = new EventBus<GameEvents>();
    const run = new RunSession(bus);
    run.reset();
    run.field.reset();
    return { run, bus };
  }
  // Keep the spawner from adding patterns during these tests.
  function clear(run: RunSession): void {
    (run.spawner as unknown as { update: () => void }).update = () => {};
  }

  it('head-on into trash cans crashes', () => {
    const { run } = session();
    clear(run);
    run.field.addObstacle('trashCans', 0, 20, 1, 0);
    for (let i = 0; i < 180 && !run.crashed; i++) run.step(DT);
    expect(run.crashed).toBe(true);
  });

  it('a late jump over cans is a near miss', () => {
    const { run, bus } = session();
    clear(run);
    let misses = 0;
    bus.on('nearMiss', () => misses++);
    run.field.addObstacle('trashCans', 0, 20, 1, 0);
    while (run.runner.distance + 0.35 < 20 - run.runner.speed * 0.2) run.step(DT);
    run.handleAction(Action.Up);
    for (let i = 0; i < 90; i++) run.step(DT);
    expect(run.crashed).toBe(false);
    expect(misses).toBe(1);
  });

  it('walks up a ramp onto a car roof and collects roof coins', () => {
    const { run } = session();
    clear(run);
    run.field.addObstacle('ramp', 0, 10, 4, 0);
    run.field.addObstacle('car', 0, 14, 4.2, 0);
    run.field.addCoin(0, 16, 2.0);
    let maxY = 0;
    for (let i = 0; i < 120; i++) {
      run.step(DT);
      maxY = Math.max(maxY, run.runner.y);
    }
    expect(maxY).toBeCloseTo(1.4);
    expect(run.crashed).toBe(false);
    expect(run.score.coins).toBe(1);
  });

  it('lands on a clothesline and grinds', () => {
    const { run, bus } = session();
    clear(run);
    let grinds = 0;
    bus.on('grindStart', () => grinds++);
    run.field.addObstacle('clothesline', 0, 5, 30, 0);
    run.step(DT);
    run.handleAction(Action.Up);
    for (let i = 0; i < 50; i++) run.step(DT);
    expect(grinds).toBe(1);
    expect(run.runner.grinding).toBe(true);
  });

  it('wall-kicks off a hedge wall in the next lane', () => {
    const { run, bus } = session();
    clear(run);
    let kicks = 0;
    bus.on('wallKick', () => kicks++);
    run.field.addObstacle('hedgeWall', 3, 0, 40, 0);
    run.handleAction(Action.Up);
    for (let i = 0; i < 15; i++) run.step(DT);
    const y = run.runner.y;
    expect(run.handleAction(Action.Up)).toBe(true);
    run.step(DT);
    expect(kicks).toBe(1);
    expect(run.runner.vy).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);
  });

  it('runs 2 minutes of spawned patterns without allocating overflow', () => {
    const bus = new EventBus<GameEvents>();
    const run = new RunSession(bus);
    run.reset();
    const f: Field = run.field;
    for (let i = 0; i < 60 * 120 && !run.crashed; i++) run.step(DT);
    expect(f.obstacles.filter((o) => o.active).length).toBeLessThan(f.obstacles.length);
    expect(run.crashed).toBe(true);
  });
});
