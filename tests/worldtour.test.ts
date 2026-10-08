import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import type { GameEvents } from '../src/core/events';
import { CITIES } from '../src/data/cities';
import { HAZARDS } from '../src/data/hazards';
import { RunSession } from '../src/gameplay/RunSession';
import { computeRunConfig } from '../src/meta/Loadout';
import { defaultProfile, migrate } from '../src/meta/Save';
import { isUnlocked, travel, unlockCity, unlockOptions } from '../src/meta/WorldTour';
import { KITS, OBSTACLE_GEOMETRY } from '../src/procgen/cityKits';

const DT = 1 / 60;

function veteran() {
  const p = defaultProfile();
  p.flags = { introSeen: true, tutorialDone: true, firstRunDone: true, tomIntroDone: true, freeHatClaimed: true };
  return p;
}

describe('World Tour unlocks', () => {
  it('Rome unlocks by distance OR coins OR Fish Bones', () => {
    const p = veteran();
    expect(isUnlocked(p, 'mapleLane')).toBe(true);
    expect(isUnlocked(p, 'rome')).toBe(false);
    expect(unlockOptions(p, 'rome').map((o) => o.method)).toEqual(['distance', 'coins', 'fishBones']);
    expect(unlockCity(p, 'rome', 'coins')).toBe(false);
    p.coins = CITIES.rome.unlock.coins!;
    expect(unlockCity(p, 'rome', 'coins')).toBe(true);
    expect(p.coins).toBe(0);
    expect(travel(p, 'rome')).toBe(true);
    expect(computeRunConfig(p).city).toBe('rome');

    const q = veteran();
    q.bestDistance = CITIES.rome.unlock.bestDistance!;
    expect(unlockCity(q, 'rome', 'distance')).toBe(true);
    expect(q.coins).toBe(defaultProfile().coins);
  });

  it('first-session runs always happen in Maple Lane', () => {
    const p = defaultProfile();
    p.cities.push('rome');
    p.city = 'rome';
    p.flags.tutorialDone = true;
    expect(computeRunConfig(p).city).toBe('mapleLane');
  });

  it('old saves move Maple Lane bells into the per-city table', () => {
    const p = migrate({ version: 2, bells: [1, 4], runs: 3 });
    expect(p.bellsByCity.mapleLane).toEqual([1, 4]);
    expect(p.cities).toEqual(['mapleLane']);
    expect(p.city).toBe('mapleLane');
  });
});

describe('city kits', () => {
  it('every city has a kit, and every obstacle has a mesh', () => {
    for (const id of Object.keys(CITIES) as (keyof typeof CITIES)[]) {
      expect(KITS[id]).toBeDefined();
      for (const o of Object.keys(CITIES[id].obstacles)) expect(OBSTACLE_GEOMETRY[o], o).toBeDefined();
    }
  });
});

describe('Rome hazards', () => {
  function romeRun() {
    const p = veteran();
    p.cities.push('rome');
    p.city = 'rome';
    const run = new RunSession(new EventBus<GameEvents>());
    run.reset(undefined, p, 0, computeRunConfig(p));
    run.field.reset();
    (run.spawner as unknown as { update: () => void }).update = () => {};
    return run;
  }

  it('Vespas drive ahead and weave lanes, but never right in front of you', () => {
    const run = romeRun();
    const v = run.field.addObstacle('vespa', 0, 60, 1.6, 0)!;
    const xs = new Set<number>();
    for (let i = 0; i < 60 * 3; i++) {
      run.step(DT);
      xs.add(Math.round(v.targetX));
      if (v.s0 - run.runner.distance < HAZARDS.weave.minAhead) break;
    }
    expect(v.s0).toBeGreaterThan(60);
    expect(xs.size).toBeGreaterThan(1);
  });

  it('laundry hangs until you are close, then drops and blocks the lane', () => {
    const run = romeRun();
    const l = run.field.addObstacle('laundryDrop', 0, 40, 1.2, 0)!;
    expect(l.flight).toBeGreaterThan(0);
    run.step(DT);
    expect(l.dropping).toBe(false);
    let crashedOrStumbled = false;
    for (let i = 0; i < 60 * 5 && !crashedOrStumbled; i++) {
      run.step(DT);
      crashedOrStumbled = l.hit;
    }
    expect(l.dropping).toBe(true);
    expect(l.flight).toBe(0);
    expect(crashedOrStumbled).toBe(true);
  });

  it('a Rome run spawns Rome patterns and Duke throws pizza boxes', () => {
    const p = veteran();
    p.city = 'rome';
    p.cities.push('rome');
    const run = new RunSession(new EventBus<GameEvents>());
    run.reset(undefined, p, 0, computeRunConfig(p));
    const ids = new Set(run.field.obstacles.filter((o) => o.active).map((o) => o.id));
    const rome = new Set(Object.keys(CITIES.rome.obstacles).concat(['ramp', 'clothesline']));
    for (const id of ids) expect(rome.has(id), id).toBe(true);
    expect(run.boss.throwIds).toContain('pizzaBoxes');
  });
});
