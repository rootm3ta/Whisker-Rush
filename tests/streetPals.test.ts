import { describe, expect, it } from 'vitest';
import { StreetPals } from '../src/gameplay/StreetPals';
import { STREET_PALS } from '../src/data/streetPals';

describe('Street Pals (Tbilisi)', () => {
  it('never appear outside Tbilisi', () => {
    const p = new StreetPals();
    p.reset(false);
    let arrivals = 0;
    for (let d = 0; d < 20000; d += 1) if (p.step(1 / 60, d)) arrivals++;
    expect(arrivals).toBe(0);
  });

  it('arrive now and then in Tbilisi, after the first stretch, and stay for the chase delay', () => {
    const p = new StreetPals();
    p.reset(true);
    const at: number[] = [];
    for (let i = 0; i < 60 * 600; i++) {
      const d = i * 0.25;
      if (p.step(1 / 60, d)) {
        at.push(d);
        expect(p.left).toBeCloseTo(STREET_PALS.delaySec + STREET_PALS.extraSec);
      }
    }
    expect(at.length).toBeGreaterThan(3);
    expect(at[0]).toBeGreaterThanOrEqual(STREET_PALS.firstAtM);
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThanOrEqual(STREET_PALS.everyM[0]);
  });

  it('a visit ends after its time runs out', () => {
    const p = new StreetPals();
    p.reset(true);
    p.arrive();
    expect(p.active).toBe(true);
    for (let i = 0; i < 60 * 10; i++) p.step(1 / 60, 0);
    expect(p.active).toBe(false);
  });
});

import { activeEvent } from '../src/data/events';

describe('Tbilisoba festival', () => {
  it('runs in Tbilisi in late October only', () => {
    expect(activeEvent('tbilisi', new Date(2026, 9, 25))?.id).toBe('tbilisoba');
    expect(activeEvent('tbilisi', new Date(2026, 9, 19))).toBeNull();
    expect(activeEvent('tbilisi', new Date(2026, 10, 1))).toBeNull();
    expect(activeEvent('tokyo', new Date(2026, 9, 25))).toBeNull();
    expect(activeEvent('tbilisi', new Date(2026, 2, 1), true)?.lootMul).toBe(2);
  });
});
