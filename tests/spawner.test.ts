import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/Rng';
import { OBSTACLES } from '../src/data/obstacles';
import { PATTERNS } from '../src/data/patterns';
import { RARITIES } from '../src/data/pickups';
import { RUNNER } from '../src/data/runner';
import { HITBOX, SPAWNER } from '../src/data/spawner';
import { Field } from '../src/gameplay/Field';
import { pickPattern, pickTier, rollRarity, Spawner, tierWeights, weightedIndex } from '../src/gameplay/Spawner';

describe('weights', () => {
  it('weightedIndex follows weights and skips zero weights', () => {
    const counts = [0, 0, 0];
    const rng = new Rng(1);
    for (let i = 0; i < 20000; i++) counts[weightedIndex([1, 0, 3], rng.next())]++;
    expect(counts[1]).toBe(0);
    expect(counts[2] / counts[0]).toBeGreaterThan(2.6);
    expect(counts[2] / counts[0]).toBeLessThan(3.4);
  });

  it('only tier 1 at the start, all tiers deep in the run', () => {
    const rng = new Rng(2);
    for (let i = 0; i < 500; i++) expect(pickTier(100, rng)).toBe(1);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(pickTier(5000, rng));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('tier distribution matches the table row', () => {
    const rng = new Rng(3);
    const w = tierWeights(2000);
    const counts = [0, 0, 0];
    const n = 30000;
    for (let i = 0; i < n; i++) counts[pickTier(2000, rng) - 1]++;
    const total = w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 3; i++) expect(Math.abs(counts[i] / n - w[i] / total)).toBeLessThan(0.02);
  });

  it('never repeats the same pattern twice in a row', () => {
    const rng = new Rng(4);
    let last = null;
    for (let i = 0; i < 300; i++) {
      const p = pickPattern(2, rng, last);
      expect(p).not.toBe(last);
      last = p;
    }
  });

  it('common loot dominates, legendary is rare but possible', () => {
    const rng = new Rng(5);
    const counts = RARITIES.map(() => 0);
    for (let i = 0; i < 50000; i++) counts[rollRarity(rng, 0)]++;
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[4]).toBeGreaterThan(0);
    expect(counts[4]).toBeLessThan(counts[3]);
  });
});

describe('pattern library', () => {
  it('has at least 20 patterns across all tiers', () => {
    expect(PATTERNS.length).toBeGreaterThanOrEqual(20);
    for (const t of [1, 2, 3]) expect(PATTERNS.some((p) => p.tier === t)).toBe(true);
  });

  it('every row leaves at least one lane without an unclimbable wall', () => {
    const wallHeight = RUNNER.jumpHeight + HITBOX.stepUp;
    for (const p of PATTERNS) {
      for (let z = 0; z <= p.length; z += 0.5) {
        let walls = 0;
        for (const lane of [-1, 0, 1]) {
          const blocked = p.entries.some((e) => {
            if (e.t !== 'o' || e.lane !== lane) return false;
            const d = OBSTACLES[e.id];
            const len = e.len ?? d.length;
            return d.body !== null && d.body[0] < 0.5 && d.body[1] > wallHeight && z >= e.z && z <= e.z + len;
          });
          if (blocked) walls++;
        }
        expect(walls, `${p.name} @ ${z}`).toBeLessThan(3);
      }
    }
  });

  it('entries stay inside the pattern length', () => {
    for (const p of PATTERNS) {
      for (const e of p.entries) expect(e.z, p.name).toBeLessThanOrEqual(p.length);
    }
  });
});

describe('Spawner', () => {
  it('fills the field ahead deterministically', () => {
    const a = new Field();
    const b = new Field();
    const sa = new Spawner(a);
    const sb = new Spawner(b);
    sa.update(0, 12);
    sb.update(0, 12);
    const live = (f: Field) => f.obstacles.filter((o) => o.active).map((o) => `${o.id}@${o.s0.toFixed(2)}:${o.x}`);
    expect(live(a).length).toBeGreaterThan(0);
    expect(live(a)).toEqual(live(b));
    expect(Math.min(...a.obstacles.filter((o) => o.active).map((o) => o.s0))).toBeGreaterThanOrEqual(SPAWNER.firstAt);
  });
});
