import { describe, expect, it } from 'vitest';
import { anyOverlap, layoutLabels, type LabelSlot, type Rect } from '../src/ui/labelLayout';
import { timeOfDay } from '../src/data/home';

/** Anchors as fractions of the viewport, roughly where the Home hotspots project. */
const ANCHORS: [number, number, number][] = [
  [0.27, 0.42, 48], // run (door)
  [0.53, 0.41, 76], // market (window)
  [0.82, 0.44, 76], // wardrobe
  [0.36, 0.27, 84], // map, right under the Best ribbon
  [0.14, 0.55, 46], // calendar
  [0.86, 0.6, 118], // upgrades
  [0.5, 0.5, 66], // missions (Miso)
];

function reserved(vw: number, vh: number, top: number): Rect[] {
  return [
    { x: 16, y: top + 10, w: vw - 32, h: 40 },
    { x: 0, y: top + 58, w: 110, h: 30 },
    { x: vw / 2 - 130, y: top + 92, w: 260, h: 50 },
    { x: vw / 2 - 60, y: top + 144, w: 120, h: 26 },
    { x: vw / 2 - 60, y: vh - 34 - 146, w: 120, h: 120 },
  ];
}

function slots(vw: number, vh: number): LabelSlot[] {
  return ANCHORS.map(([fx, fy, w]) => ({ ax: fx * vw, ay: fy * vh, w, h: 24, lead: 16, visible: true, x: 0, y: 0, cand: -1 }));
}

describe('home label layout', () => {
  for (const [name, vw, vh, top] of [
    ['iPhone SE', 375, 667, 20],
    ['iPhone 13', 390, 844, 47],
    ['iPhone 15 Pro Max', 430, 932, 59],
  ] as const) {
    it(`no label overlaps another label or the fixed UI on ${name}`, () => {
      const s = slots(vw, vh);
      const r = reserved(vw, vh, top);
      layoutLabels(s, r, vw, vh);
      expect(anyOverlap(s, r)).toBe(false);
      for (const l of s) {
        expect(l.x).toBeGreaterThanOrEqual(0);
        expect(l.x + l.w).toBeLessThanOrEqual(vw);
      }
      // Stable: a second pass keeps the same spots.
      const before = s.map((l) => [l.x, l.y]);
      layoutLabels(s, r, vw, vh);
      expect(s.map((l) => [l.x, l.y])).toEqual(before);
    });
  }

  it('hidden labels are ignored', () => {
    const s = slots(390, 844);
    for (const l of s) l.visible = false;
    layoutLabels(s, [], 390, 844);
    expect(anyOverlap(s, [{ x: 0, y: 0, w: 390, h: 844 }])).toBe(false);
  });
});

describe('time of day', () => {
  it('follows the local clock', () => {
    expect(timeOfDay(7)).toBe('morning');
    expect(timeOfDay(15)).toBe('golden');
    expect(timeOfDay(19)).toBe('dusk');
    expect(timeOfDay(23)).toBe('night');
    expect(timeOfDay(2)).toBe('night');
  });
});
