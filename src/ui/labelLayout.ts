/**
 * Screen-space label placement with collision avoidance. Allocation-free: callers own the arrays.
 * Each label wants to sit centred above its anchor; if that overlaps a reserved rect (top bar, logo,
 * Best ribbon, RUN paw), another label or the screen edge, it tries the next candidate offset.
 * The previous choice is kept while it stays valid, so labels do not flicker as the camera drifts.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Candidate offsets (dx, dy) in px from the preferred spot, nearest first. */
const CAND = [
  0, 0, 0, -26, -44, 0, 44, 0, -44, -26, 44, -26, 0, -52, -70, 0, 70, 0, 0, 26, -44, 26, 44, 26, -70, -26, 70, -26, 0, -78, -90, 0, 90, 0, 0, 52,
  -70, 26, 70, 26, -44, 52, 44, 52, -90, 26, 90, 26, 0, 78, -110, 0, 110, 0, -70, 52, 70, 52, 0, 104, -110, 26, 110, 26, -44, 78, 44, 78, 0, 130,
];
export const CANDIDATES = CAND.length / 2;

export interface LabelSlot {
  /** Anchor (object point) in px. */
  ax: number;
  ay: number;
  /** Label size in px. */
  w: number;
  h: number;
  /** Gap between label bottom and anchor (leader line length when unmoved). */
  lead: number;
  visible: boolean;
  /** Output: label top-left, and the chosen candidate (kept between frames). */
  x: number;
  y: number;
  cand: number;
}

function hit(ax: number, ay: number, aw: number, ah: number, b: Rect, pad: number): boolean {
  return ax < b.x + b.w + pad && ax + aw + pad > b.x && ay < b.y + b.h + pad && ay + ah + pad > b.y;
}

function fits(s: LabelSlot, x: number, y: number, i: number, slots: readonly LabelSlot[], reserved: readonly Rect[], vw: number, vh: number, pad: number): boolean {
  if (x < pad || y < pad || x + s.w > vw - pad || y + s.h > vh - pad) return false;
  for (const r of reserved) if (hit(x, y, s.w, s.h, r, pad)) return false;
  for (let j = 0; j < i; j++) {
    const o = slots[j];
    if (o.visible && hit(x, y, s.w, s.h, o, pad)) return false;
  }
  return true;
}

/** Places slots in priority order (index 0 first). */
export function layoutLabels(slots: LabelSlot[], reserved: readonly Rect[], vw: number, vh: number, pad = 4): void {
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (!s.visible) continue;
    const bx = s.ax - s.w / 2;
    const by = s.ay - s.lead - s.h;
    // Keep last frame's choice if it still fits.
    if (s.cand >= 0) {
      const x = bx + CAND[s.cand * 2];
      const y = by + CAND[s.cand * 2 + 1];
      if (fits(s, x, y, i, slots, reserved, vw, vh, pad)) {
        s.x = x;
        s.y = y;
        continue;
      }
    }
    let chosen = -1;
    for (let c = 0; c < CANDIDATES; c++) {
      const x = bx + CAND[c * 2];
      const y = by + CAND[c * 2 + 1];
      if (fits(s, x, y, i, slots, reserved, vw, vh, pad)) {
        chosen = c;
        s.x = x;
        s.y = y;
        break;
      }
    }
    if (chosen < 0) {
      // Nothing fits: clamp onto the screen at the preferred spot.
      chosen = 0;
      s.x = Math.min(Math.max(bx, pad), vw - pad - s.w);
      s.y = Math.min(Math.max(by, pad), vh - pad - s.h);
    }
    s.cand = chosen;
  }
}

/** True if any two visible labels, or a label and a reserved rect, overlap (for tests). */
export function anyOverlap(slots: readonly LabelSlot[], reserved: readonly Rect[]): boolean {
  for (let i = 0; i < slots.length; i++) {
    const a = slots[i];
    if (!a.visible) continue;
    for (const r of reserved) if (hit(a.x, a.y, a.w, a.h, r, 0)) return true;
    for (let j = i + 1; j < slots.length; j++) {
      const b = slots[j];
      if (b.visible && hit(a.x, a.y, a.w, a.h, b, 0)) return true;
    }
  }
  return false;
}
