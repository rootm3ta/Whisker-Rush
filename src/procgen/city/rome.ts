import * as THREE from 'three';
import { ROME_PALETTE as P } from '../../data/city/rome';
import { LANES } from '../../data/runner';
import { TRACK as T } from '../../data/track';
import { merge, paint, strip } from '../geo';
import { blob, box, cyl, part } from '../obstacles';
import { unitBoxBase } from '../props';
import type { CityKit, LayoutCtx } from './kit';

const L = T.chunkLength;
const SEGS = T.groundSegments;

/** Cobblestone road (offset brick rows), stone curbs, wide sidewalks and a piazza. */
function street(): THREE.BufferGeometry {
  const rh = T.roadHalfWidth;
  const cOut = rh + T.curbWidth;
  const sOut = cOut + T.sidewalkWidth;
  const ch = T.curbHeight;
  const parts = [strip(-rh, rh, 0, L, SEGS, P.road)];
  // Cobbles: short darker bricks in staggered rows.
  for (let row = 0; row < L / 1.2; row++) {
    for (let x = -rh + 0.3 + (row % 2) * 0.45; x < rh - 0.3; x += 0.9) {
      const g = new THREE.PlaneGeometry(0.62, 0.42);
      g.rotateX(-Math.PI / 2);
      g.translate(x, 0.008, -row * 1.2 - 0.6);
      parts.push(paint(g, row % 3 === 0 ? P.cobble : P.road - 0x060606));
    }
  }
  for (const side of [-1, 1]) {
    const lo = (a: number, b: number) => (side < 0 ? [-b, -a] : [a, b]) as [number, number];
    parts.push(strip(...lo(rh, cOut), ch, L, SEGS, P.curb));
    parts.push(strip(...lo(cOut, sOut), ch, L, SEGS, P.sidewalk));
    parts.push(strip(...lo(sOut, T.lawnOuter), ch - 0.02, L, SEGS, P.lawn));
    const face = new THREE.PlaneGeometry(L, ch, SEGS, 1);
    face.rotateY(side < 0 ? Math.PI / 2 : -Math.PI / 2);
    face.translate(side * rh, ch / 2, -L / 2);
    parts.push(paint(face, P.curb));
  }
  return merge(parts);
}

function balcony(): THREE.BufferGeometry {
  const parts = [box(0.7, 0.08, 1.6, P.stone, 0, 0, 0), box(0.04, 0.5, 1.6, 0x2a2a2a, 0.33, 0.25, 0)];
  for (let i = 0; i < 5; i++) parts.push(box(0.03, 0.5, 0.03, 0x2a2a2a, 0.33, 0.25, -0.7 + i * 0.35));
  for (let i = 0; i < 3; i++) parts.push(blob(0.16, [0xd9483b, 0x6f9e4f, 0xe85d8a][i], 0.15, 0.15, -0.5 + i * 0.5, 0.8));
  return merge(parts);
}

function cypress(): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(0.5, 1, 7);
  g.translate(0, 0.5, 0);
  return g;
}

function planter(): THREE.BufferGeometry {
  const pot = new THREE.CylinderGeometry(0.32, 0.24, 0.5, 10);
  return merge([part(pot, P.pot, 0, 0.25, 0), cyl(0.04, 0.6, 0x6b4a35, 0, 0.75, 0, 5), blob(0.35, P.lemon[1], 0, 1.15, 0), blob(0.07, P.lemon[0], 0.2, 1.1, 0.18), blob(0.07, P.lemon[0], -0.18, 1.25, -0.1)]);
}

function lamp(): THREE.BufferGeometry {
  return merge([
    cyl(0.07, 3.6, P.lamp, 0, 1.8, 0, 8),
    cyl(0.16, 0.2, P.lamp, 0, 0.1, 0, 8),
    box(0.06, 0.06, 0.7, P.lamp, 0, 3.55, 0),
    part(new THREE.ConeGeometry(0.2, 0.35, 6), P.lamp, 0, 3.55, -0.35),
    part(new THREE.SphereGeometry(0.14, 8, 6), P.lampHead, 0, 3.35, -0.35),
  ]);
}

function townhouses(ctx: LayoutCtx, side: number): void {
  const { rng, length } = ctx;
  let z = 0;
  // Rome's buildings touch: a continuous wall of facades with occasional alleys.
  while (z > -length) {
    const w = rng.range(5.5, 8.5);
    if (z - w < -length) break;
    const h = rng.range(7, 11);
    const d = 7;
    const zc = z - w / 2;
    const setback = 9.6;
    const xc = side * (setback + d / 2);
    ctx.put('house', xc, 0, zc, d, h, w, 0, rng.pick(P.walls));
    ctx.put('cornice', xc - side * 0.1, h, zc, d + 0.6, 0.3, w + 0.2, 0, P.cornice);
    ctx.put('roof', xc, h + 0.3, zc, d - 0.4, 0.5, w - 0.2, 0, P.roofTiles);
    const fx = side * (setback - 0.05);
    const shutter = rng.pick(P.shutters);
    const floors = Math.floor((h - 1) / 2.4);
    for (let f = 1; f < floors; f++) {
      const wy = f * 2.4 + 0.9;
      const n = w > 7 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const wz = zc - w / 2 + ((i + 0.5) * w) / n;
        ctx.put('window', fx, wy, wz, 1, 1.3, 0.75, 0, P.window);
        ctx.put('window', fx - side * 0.01, wy, wz - 0.6, 1, 1.3, 0.35, 0, shutter);
        ctx.put('window', fx - side * 0.01, wy, wz + 0.6, 1, 1.3, 0.35, 0, shutter);
      }
      if (f === 2 && rng.next() < 0.55) ctx.put('balcony', fx - side * 0.35, wy - 0.75, zc, 1, 1, 1, side < 0 ? 0 : Math.PI);
    }
    // Shopfront: dark doorway under a striped awning.
    ctx.put('window', fx, 1.2, zc, 1, 2.2, Math.min(3, w * 0.45), 0, P.window);
    ctx.put('shopAwning', fx - side * 0.7, 2.45, zc, 1.4, 0.12, Math.min(3.6, w * 0.6), side * 0.35, rng.pick(P.awnings));
    z -= w + (rng.next() < 0.15 ? rng.range(1.5, 3) : 0);
  }
}

/** Rome: terracotta and ochre townhouses, green shutters, balconies, cypresses, cobbles. */
export const ROME_KIT: CityKit = {
  street,
  props: {
    house: { geometry: unitBoxBase, material: 'plain', capacity: 12 },
    cornice: { geometry: unitBoxBase, material: 'plain', capacity: 12 },
    roof: { geometry: unitBoxBase, material: 'plain', capacity: 12 },
    window: { geometry: () => new THREE.BoxGeometry(0.1, 1, 1), material: 'plain', capacity: 110 },
    balcony: { geometry: balcony, material: 'vc', capacity: 8 },
    shopAwning: { geometry: () => new THREE.BoxGeometry(1, 1, 1), material: 'plain', capacity: 12 },
    cypress: { geometry: cypress, material: 'plain', capacity: 8 },
    planter: { geometry: planter, material: 'vc', capacity: 8 },
    lamp: { geometry: lamp, material: 'vc', capacity: 4 },
  },
  layout(ctx) {
    townhouses(ctx, -1);
    townhouses(ctx, 1);
    const { rng } = ctx;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const h = rng.range(3.5, 5.5);
        ctx.put('cypress', side * rng.range(8.2, 9), T.curbHeight, -rng.range(2, L - 2), 1.1, h, 1.1, 0, rng.pick(P.cypress));
      }
      ctx.put('planter', side * 7.3, T.curbHeight, -rng.range(4, L - 4), 1, 1, 1, rng.range(0, 3));
    }
    for (let z = 0, i = 0; z < L; z += T.lamp.spacing, i++) {
      const side = (ctx.index + i) % 2 === 0 ? -1 : 1;
      ctx.put('lamp', side * 5.2, T.curbHeight, -z - T.lamp.spacing / 2, 1, 1, 1, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  },
  obstacles: {
    crates: () => {
      const parts: THREE.BufferGeometry[] = [];
      for (const [x, y] of [[-0.45, 0.3], [0.45, 0.3], [0, 0.85]]) {
        parts.push(box(0.8, 0.55, 0.8, 0xb07a4a, x, y, -0.5), box(0.82, 0.06, 0.82, 0x8d5f38, x, y + 0.1, -0.5));
        parts.push(blob(0.12, x < 0 ? 0xf2a33a : 0xd9483b, x, y + 0.32, -0.5, 0.6));
      }
      return merge(parts);
    },
    planter: () => merge([planter().translate(-0.45, 0, -0.5), planter().translate(0.45, 0, -0.5)]),
    cafeTable: () => {
      const parts = [cyl(0.4, 0.05, 0xfbf6ec, 0, 0.72, -0.5, 14), cyl(0.04, 0.7, 0x2a2a2a, 0, 0.36, -0.5, 6), part(new THREE.ConeGeometry(0.75, 0.4, 10), 0xd9483b, 0, 1.75, -0.5), cyl(0.03, 1.1, 0x8a6a4f, 0, 1.2, -0.5, 6)];
      for (const x of [-0.75, 0.75]) parts.push(box(0.35, 0.05, 0.35, 0x2a2a2a, x, 0.45, -0.5), box(0.35, 0.4, 0.05, 0x2a2a2a, x, 0.65, -0.33));
      return merge(parts);
    },
    vespa: () => {
      const wheel = (z: number) => {
        const w = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12);
        w.rotateZ(Math.PI / 2);
        return part(w, 0x2b2b2e, 0, 0.22, z);
      };
      return merge([
        wheel(-0.2), wheel(-1.4),
        part(new THREE.SphereGeometry(0.42, 12, 8).scale(0.9, 0.75, 1.3), 0xffffff, 0, 0.5, -1.25),
        box(0.4, 0.12, 0.9, 0xffffff, 0, 0.42, -0.75),
        box(0.42, 0.55, 0.18, 0xffffff, 0, 0.55, -0.25),
        box(0.4, 0.12, 0.55, 0x5a3a2a, 0, 0.82, -1.1),
        cyl(0.03, 0.55, 0xa9b2bc, 0, 1.0, -0.2, 6),
        box(0.6, 0.04, 0.04, 0xa9b2bc, 0, 1.25, -0.2),
        part(new THREE.SphereGeometry(0.08, 8, 6), 0xfff1c9, 0, 0.95, -0.1),
      ]);
    },
    fiat: () => {
      const Lc = 3.4;
      const parts = [
        part(new THREE.SphereGeometry(1, 16, 10).scale(0.95, 0.6, Lc / 2), 0xffffff, 0, 0.62, -Lc / 2),
        box(1.5, 0.35, 1.6, 0xffffff, 0, 1.12, -Lc / 2 - 0.1),
        box(1.55, 0.25, 1.5, 0x3a4a5a, 0, 1.1, -Lc / 2 - 0.1),
        box(1.5, 0.06, 1.6, 0xffffff, 0, 1.3, -Lc / 2 - 0.1),
      ];
      for (const x of [-0.78, 0.78]) {
        for (const z of [-0.65, -Lc + 0.65]) {
          const w = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12);
          w.rotateZ(Math.PI / 2);
          parts.push(part(w, 0x2b2b2e, x, 0.28, z));
        }
      }
      return merge(parts);
    },
    apeTruck: () => {
      const Lt = 4.5;
      return merge([
        box(1.6, 1.4, 1.4, 0x8fd3c8, 0, 0.95, -0.7),
        box(1.5, 0.6, 0.05, 0x3a4a5a, 0, 1.3, -0.02),
        box(2.2, 0.15, Lt - 1.4, 0x8a7a6a, 0, 0.55, -1.4 - (Lt - 1.4) / 2),
        box(2.2, 1.8, Lt - 1.5, 0xe8c48a, 0, 1.5, -1.45 - (Lt - 1.5) / 2),
        box(2.25, 0.25, Lt - 1.5, 0xd9483b, 0, 2.3, -1.45 - (Lt - 1.5) / 2),
        part(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10).rotateZ(Math.PI / 2), 0x2b2b2e, 0, 0.3, -0.5),
        part(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10).rotateZ(Math.PI / 2), 0x2b2b2e, -0.9, 0.3, -3.6),
        part(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10).rotateZ(Math.PI / 2), 0x2b2b2e, 0.9, 0.3, -3.6),
      ]);
    },
    laundryDrop: () => merge([box(1.1, 0.18, 1.0, 0xf2a6a8, -0.4, 0.09, -0.6), box(0.9, 0.22, 0.9, 0x9fc7e8, 0.35, 0.2, -0.55), box(0.8, 0.12, 0.7, 0xfaf4e6, 0, 0.4, -0.6), box(0.25, 0.2, 0.06, 0xf2c14e, 0.1, 0.55, -0.5)]),
    fountain: () => {
      const rim = new THREE.CylinderGeometry(1.3, 1.4, 0.8, 20, 1, true);
      const inner = new THREE.CircleGeometry(1.15, 20);
      inner.rotateX(-Math.PI / 2);
      const top = new THREE.RingGeometry(1.1, 1.35, 20);
      top.rotateX(-Math.PI / 2);
      return merge([
        part(rim, P.stone, 0, 0.4, -1.5),
        part(top, 0xe8dcc4, 0, 0.8, -1.5),
        part(inner, P.water, 0, 0.6, -1.5),
        cyl(0.18, 1.4, P.stone, 0, 1.1, -1.5, 10),
        part(new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), P.stone, 0, 1.8, -1.5),
        part(new THREE.ConeGeometry(0.3, 0.6, 8, 1, true), P.water, 0, 2.2, -1.5),
      ]);
    },
    awning: () => {
      const Lw = 8;
      const parts = [box(2.6, 0.08, Lw, 0xffffff, 0, 2.1, -Lw / 2)];
      for (let i = 0; i < 8; i++) parts.push(box(2.62, 0.09, 0.5, i % 2 ? 0xfbf6ec : 0xd9483b, 0, 2.1, -0.25 - i * 1.0));
      for (const x of [-1.25, 1.25]) for (const z of [-0.2, -Lw + 0.2]) parts.push(cyl(0.05, 2.1, 0x2a2a2a, x, 1.05, z, 6));
      parts.push(box(2.4, 0.5, 1.2, 0xb07a4a, 0, 0.25, -Lw / 2), blob(0.2, 0xf2a33a, -0.6, 0.6, -Lw / 2), blob(0.2, 0x6f9e4f, 0.5, 0.6, -Lw / 2));
      return merge(parts);
    },
    stoneWall: () => {
      const Lw = 10;
      const parts = [box(2.4, 2.0, Lw, P.stone, 0, 1.0, -Lw / 2), box(2.5, 0.2, Lw, 0xe8dcc4, 0, 2.1, -Lw / 2)];
      for (let i = 0; i < 6; i++) parts.push(blob(0.35, i % 2 ? 0x6f9e4f : 0x4d7a3c, (i % 2 ? 1 : -1) * 0.9, 1.6 - (i % 3) * 0.4, -0.8 - i * 1.6, 0.6));
      return merge(parts);
    },
    catDoorStone: () => {
      const g = ROME_KIT.obstacles.stoneWall();
      const parts = [g];
      for (const sx of [-1, 1]) parts.push(box(0.06, 0.75, 0.7, 0x8d5f38, sx * 1.21, 0.42, -4), box(0.07, 0.6, 0.55, 0xffd56b, sx * 1.22, 0.4, -4));
      return merge(parts);
    },
    pizzaBoxes: () => merge([box(0.8, 0.12, 0.8, 0xf3ead8, 0, 0.06, -0.4), box(0.8, 0.12, 0.8, 0xe8dcc4, 0.03, 0.19, -0.4), box(0.8, 0.12, 0.8, 0xf3ead8, -0.02, 0.32, -0.42), box(0.82, 0.13, 0.82, 0xd9483b, 0, 0.45, -0.4)]),
  },
  bossVehicle: () => {
    // Delivery scooter with a pizza box carrier; Duke rides it.
    const g = ROME_KIT.obstacles.vespa();
    return merge([g, box(0.7, 0.5, 0.7, 0xd9483b, 0, 1.15, -1.55), box(0.72, 0.12, 0.72, 0xfbf6ec, 0, 1.35, -1.55)]);
  },
};

/** Lane x for a lane index (kept here for kit authors). */
export const laneX = (lane: number) => lane * LANES.width;
