import * as THREE from 'three';
import { TOKYO_PALETTE as P } from '../../data/city/tokyo';
import { TRACK as T } from '../../data/track';
import { merge, paint, strip } from '../geo';
import { blob, box, cyl, part } from '../obstacles';
import { unitBoxBase } from '../props';
import { screenMaterial, signAtlas, signMaterial, signPlane, type SignSpec } from '../signs';
import type { CityKit, LayoutCtx } from './kit';

const L = T.chunkLength;
const SEGS = T.groundSegments;

/** Shop and neon lettering (invented names, no brands). */
const SIGNS: SignSpec[] = [
  { text: 'ラーメン', fg: 0xfbf6ec, bg: 0xc8342a },
  { text: 'カラオケ', fg: 0xff5ad0, bg: 0x1a1428, glow: true },
  { text: '喫茶 ねこ', fg: 0x5a3a2a, bg: 0xf3e6c9 },
  { text: '居酒屋', fg: 0x5ae8ff, bg: 0x101828, glow: true },
  { text: '本屋', fg: 0xfbf6ec, bg: 0x2f4a6a },
  { text: 'たい焼き', fg: 0x2a201c, bg: 0xf2a33a },
  { text: '団子', fg: 0x8a2a4a, bg: 0xf7c6d9 },
  { text: '薬', fg: 0x7aff9a, bg: 0x102018, glow: true },
  { text: 'まいにち', fg: 0x2f8a4a, bg: 0xfbfbf6 },
  { text: 'ゆ', fg: 0xfbf6ec, bg: 0x2a3a6a },
  { text: 'ねこ屋', fg: 0xffe066, bg: 0x2a1a3a, glow: true },
  { text: '酒', fg: 0xfbf6ec, bg: 0x8a2a2a },
];
const NEON_SIGNS = [1, 3, 7, 10];
const DAY_SIGNS = [0, 2, 4, 5, 6, 8, 9, 11];

let atlas: THREE.CanvasTexture | null = null;
const signMat = () => signMaterial((atlas ??= signAtlas(SIGNS, 'Noto Sans JP')))();

/** Asphalt with white lane dashes, grey curbs and tiled sidewalks. */
function street(): THREE.BufferGeometry {
  const rh = T.roadHalfWidth;
  const cOut = rh + T.curbWidth;
  const sOut = cOut + T.sidewalkWidth;
  const ch = T.curbHeight;
  const parts = [strip(-rh, rh, 0, L, SEGS, P.road)];
  for (const x of [-1.5, 1.5]) for (let z = 0; z < L; z += 6) parts.push(box(0.12, 0.01, 3, P.stripe, x, 0.006, -z - 1.5));
  for (const x of [-rh + 0.25, rh - 0.25]) parts.push(box(0.14, 0.01, L, P.stripe, x, 0.006, -L / 2));
  for (const side of [-1, 1]) {
    const lo = (a: number, b: number) => (side < 0 ? [-b, -a] : [a, b]) as [number, number];
    parts.push(strip(...lo(rh, cOut), ch, L, SEGS, P.curb));
    parts.push(strip(...lo(cOut, sOut), ch, L, SEGS, P.sidewalk));
    // Tactile paving strip (the yellow guide blocks of Japanese sidewalks).
    parts.push(box(0.3, 0.012, L, 0xe8c84a, side * (cOut + 0.6), ch + 0.006, -L / 2));
    parts.push(strip(...lo(sOut, T.lawnOuter), ch - 0.02, L, SEGS, P.lawn));
    const face = new THREE.PlaneGeometry(L, ch, SEGS, 1);
    face.rotateY(side < 0 ? Math.PI / 2 : -Math.PI / 2);
    face.translate(side * rh, ch / 2, -L / 2);
    parts.push(paint(face, P.curb));
  }
  return merge(parts);
}

// ---- Props ----------------------------------------------------------------------------------

function lantern(): THREE.BufferGeometry {
  return merge([
    part(new THREE.SphereGeometry(0.28, 12, 8).scale(1, 1.35, 1), P.lantern, 0, 0, 0),
    cyl(0.2, 0.06, 0x2a201c, 0, 0.36, 0, 10),
    cyl(0.2, 0.06, 0x2a201c, 0, -0.36, 0, 10),
    cyl(0.012, 0.5, 0x2a201c, 0, 0.65, 0, 4),
  ]);
}

function vending(): THREE.BufferGeometry {
  // Glowing front panel, product rows, coin slot.
  const parts = [box(1.0, 1.9, 0.75, 0xffffff, 0, 0.95, 0), box(0.82, 1.0, 0.02, 0xfffbe8, 0, 1.25, -0.38)];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) parts.push(box(0.12, 0.22, 0.02, [0xd9483b, 0x3f7ac9, 0xf2c14e, 0x6fb38a][(r + c) % 4], -0.27 + c * 0.18, 1.55 - r * 0.32, -0.395));
  parts.push(box(0.6, 0.18, 0.04, 0x2a2a30, 0, 0.4, -0.39));
  return merge(parts);
}

function torii(): THREE.BufferGeometry {
  return merge([
    cyl(0.14, 3.4, P.torii, -1.3, 1.7, 0, 10),
    cyl(0.14, 3.4, P.torii, 1.3, 1.7, 0, 10),
    box(3.6, 0.22, 0.3, 0x2a201c, 0, 3.55, 0),
    box(3.3, 0.18, 0.24, P.torii, 0, 3.35, 0),
    box(3.0, 0.14, 0.2, P.torii, 0, 2.8, 0),
    box(0.16, 0.6, 0.16, P.torii, 0, 3.05, 0),
    // Little shrine behind it.
    box(1.4, 1.1, 1.2, 0xc8a46e, 0, 0.55, 2.6),
    part(new THREE.ConeGeometry(1.15, 0.7, 4).rotateY(Math.PI / 4), 0x4a5664, 0, 1.45, 2.6),
  ]);
}

function sakura(): THREE.BufferGeometry {
  return merge([
    cyl(0.18, 2.4, P.trunk, 0, 1.2, 0, 7),
    blob(1.4, P.sakura[0], 0, 3.2, 0, 0.8),
    blob(1.0, P.sakura[1], 0.9, 3.0, 0.3, 0.8),
    blob(0.9, P.sakura[2], -0.8, 3.4, -0.3, 0.8),
    blob(0.8, P.sakura[0], 0.2, 3.9, 0.5, 0.8),
  ]);
}

function wallCat(): THREE.BufferGeometry {
  // A neighbourhood cat loafing on a wall, watching you pass.
  return merge([
    box(0.5, 1.2, 3.0, 0xc8c2bc, 0, 0.6, 0),
    blob(0.2, 0xf3e6c9, 0, 1.38, 0, 0.7),
    blob(0.13, 0xf3e6c9, 0, 1.55, -0.12),
    part(new THREE.ConeGeometry(0.05, 0.1, 4), 0xf3e6c9, -0.07, 1.68, -0.12),
    part(new THREE.ConeGeometry(0.05, 0.1, 4), 0xf3e6c9, 0.07, 1.68, -0.12),
    box(0.04, 0.04, 0.3, 0xe8863a, 0, 1.32, 0.25),
  ]);
}

function bridge(): THREE.BufferGeometry {
  // Red arched footbridge over the river.
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = Math.sin(t * Math.PI) * 1.4 + 0.4;
    parts.push(box(2.4, 0.2, 0.62, 0xb08a5a, 0, y, -t * 6));
    if (i % 2 === 0) for (const x of [-1.2, 1.2]) parts.push(box(0.12, 0.8, 0.12, P.torii, x, y + 0.4, -t * 6));
  }
  for (const x of [-1.2, 1.2]) parts.push(box(0.1, 0.1, 6.4, P.torii, x, 1.9, -3));
  return merge(parts);
}

function latticeTower(): THREE.BufferGeometry {
  // A red and white lattice tower on the skyline (generic, not a landmark replica).
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const w = 6 - i * 0.45;
    const y = i * 5;
    const c = i % 2 ? 0xfbf6ec : P.torii;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(box(0.4, 5.2, 0.4, c, (x * w) / 2, y + 2.5, (z * w) / 2));
    parts.push(box(w, 0.3, 0.3, c, 0, y + 4.9, w / 2), box(w, 0.3, 0.3, c, 0, y + 4.9, -w / 2));
  }
  parts.push(box(1.6, 3, 1.6, 0xfbf6ec, 0, 60, 0), cyl(0.2, 8, P.torii, 0, 65, 0, 6));
  return merge(parts);
}

function bike(): THREE.BufferGeometry {
  const wheel = (z: number) => part(new THREE.TorusGeometry(0.32, 0.04, 6, 16).rotateY(Math.PI / 2), 0x2a2a30, 0, 0.34, z);
  return merge([wheel(-0.4), wheel(0.4), box(0.05, 0.05, 0.85, 0xc9d4e0, 0, 0.55, 0), box(0.3, 0.2, 0.3, 0x8a8a90, 0, 0.82, -0.5), cyl(0.03, 0.4, 0x2a2a30, 0, 0.75, 0.2, 5)]);
}

function utilityPole(): THREE.BufferGeometry {
  return merge([cyl(0.12, 8, 0x9a948c, 0, 4, 0, 8), box(1.6, 0.1, 0.1, 0x9a948c, 0, 7.4, 0), box(1.2, 0.1, 0.1, 0x9a948c, 0, 6.8, 0), cyl(0.16, 0.5, 0x6a6a70, 0.4, 6.4, 0, 8)]);
}

function lampT(): THREE.BufferGeometry {
  return merge([cyl(0.06, 4.4, 0x6a6a70, 0, 2.2, 0, 8), box(0.1, 0.1, 1.0, 0x6a6a70, 0, 4.35, -0.45), box(0.36, 0.12, 0.6, 0xfff4d8, 0, 4.25, -0.85)]);
}

function pots(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(cyl(0.18, 0.3, [0xc0603a, 0x6a8aa8, 0xc8a46e][i % 3], 0, 0.15, -i * 0.45, 8));
    parts.push(blob(0.22, [0x5f9a4f, 0x6fae5c, 0x4d7a3c][i % 3], 0, 0.45, -i * 0.45));
  }
  return merge(parts);
}

/** Every chunk: utility poles strung with overhead wires (very Tokyo), plus lamps. */
function streetFurniture(ctx: LayoutCtx, wires: boolean): void {
  for (let z = 0, i = 0; z < L; z += T.lamp.spacing, i++) {
    const side = (ctx.index + i) % 2 === 0 ? -1 : 1;
    ctx.put('lamp', side * 5.3, T.curbHeight, -z - T.lamp.spacing / 2, 1, 1, 1, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    if (wires) {
      ctx.put('pole', -side * 6.6, T.curbHeight, -z - 4, 1, 1, 1, 0);
      ctx.put('wire', 0, 7.2, -z - 4 - (ctx.index % 2) * 0.5, 13.2, 0.03, 0.03, 0.06);
      ctx.put('wire', 0, 6.7, -z - 4.4, 13.2, 0.03, 0.03, -0.04);
    }
  }
}

function rowOf(ctx: LayoutCtx, side: number, setback: number, w: [number, number], h: [number, number], colors: readonly number[], key = 'block'): number[] {
  const { rng, length } = ctx;
  const centers: number[] = [];
  let z = -rng.range(0, 2);
  while (z > -length) {
    const bw = rng.range(w[0], w[1]);
    if (z - bw < -length) break;
    const bh = rng.range(h[0], h[1]);
    const d = 8;
    const zc = z - bw / 2;
    ctx.put(key, side * (setback + d / 2), 0, zc, d, bh, bw, 0, rng.pick(colors));
    centers.push(zc, bh, bw);
    z -= bw + rng.range(0.2, 1.2);
  }
  return centers;
}

function shibuya(ctx: LayoutCtx): void {
  const { rng } = ctx;
  for (const side of [-1, 1]) {
    const c = rowOf(ctx, side, 9.5, [8, 13], [16, 30], P.glass);
    for (let i = 0; i < c.length; i += 3) {
      const [zc, bh, bw] = [c[i], c[i + 1], c[i + 2]];
      // Window bands, and a giant screen on some towers.
      for (let y = 3; y < bh - 1; y += 3.2) ctx.put('band', side * 9.45, y, zc, 0.1, 0.25, bw - 0.4, 0, 0xeef4f8);
      if (rng.next() < 0.55) ctx.put('screen', side * 9.4, rng.range(8, Math.max(9, bh - 7)), zc, Math.min(bw - 1, 8), 5, 1, side < 0 ? Math.PI / 2 : -Math.PI / 2);
      if (rng.next() < 0.5) ctx.put(`sign${rng.pick(DAY_SIGNS)}`, side * 9.3, 3, zc, 1, 1, 1, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  // The scramble crossing: wide zebra bars across the road at the start of every other chunk.
  if (ctx.index % 2 === 0) for (let x = -4.2; x <= 4.2; x += 0.9) ctx.put('zebra', x, 0.012, -6, 0.5, 0.01, 4.2, 0);
  streetFurniture(ctx, false);
}

function yokocho(ctx: LayoutCtx): void {
  const { rng } = ctx;
  for (const side of [-1, 1]) {
    const c = rowOf(ctx, side, 8.2, [3.5, 5.5], [4.5, 7], P.wood, 'block');
    for (let i = 0; i < c.length; i += 3) {
      const [zc, , bw] = [c[i], c[i + 1], c[i + 2]];
      const face = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      ctx.put(`sign${rng.pick([0, 5, 6, 9, 11])}`, side * 8.1, 2.6, zc, 0.9, 0.9, 0.9, face);
      ctx.put('noren', side * 8.05, 1.7, zc, 0.06, 0.7, Math.min(2.2, bw * 0.5), 0, rng.pick([0x2a3a6a, 0x8a2a2a, 0xf3e6c9]));
      for (let k = 0; k < 2; k++) ctx.put('lantern', side * 7.6, 2.4, zc - bw * 0.3 + k * bw * 0.6, 1, 1, 1, 0);
      if (rng.next() < 0.4) ctx.put('bike', side * 7.3, T.curbHeight, zc + 1, 1, 1, 1, 0.2 * side);
    }
  }
  // Strings of lanterns across the alley.
  for (let z = 6; z < L; z += 10) for (let x = -6; x <= 6; x += 2) ctx.put('lantern', x, 4.6 - Math.cos((x / 6) * 1.2) * 0.4, -z, 0.8, 0.8, 0.8, 0);
  streetFurniture(ctx, true);
}

function railbed(): THREE.BufferGeometry {
  // Side railway: ballast, sleepers, rails and a low fence (the commuter train runs here).
  const parts = [box(4, 0.3, L, 0x8a7a6a, 0, 0.15, -L / 2)];
  for (let z = 0; z < L; z += 0.9) parts.push(box(2.6, 0.08, 0.25, 0x5a4a3a, 0, 0.34, -z - 0.45));
  for (const x of [-0.72, 0.72]) parts.push(box(0.08, 0.1, L, 0x9aa0a8, x, 0.42, -L / 2));
  for (let z = 0; z < L; z += 2.5) parts.push(box(0.06, 1.0, 0.06, 0x6a6a70, -2.3, 0.5, -z));
  parts.push(box(0.04, 0.04, L, 0x6a6a70, -2.3, 0.95, -L / 2));
  return merge(parts);
}

function shitamachi(ctx: LayoutCtx): void {
  const { rng } = ctx;
  // The right side is the railway embankment the commuter train runs along.
  ctx.put('railbed', 10.5, T.curbHeight, 0, 1, 1, 1, 0);
  for (const side of [-1]) {
    const c = rowOf(ctx, side, 9.5, [6, 9], [4.5, 7], P.houses, 'block');
    for (let i = 0; i < c.length; i += 3) {
      const [zc, bh, bw] = [c[i], c[i + 1], c[i + 2]];
      ctx.put('roofT', side * 13.5, bh, zc, 9, 1.2, bw + 0.6, 0, P.roofTile);
      if (rng.next() < 0.6) ctx.put('pots', side * 8.3, T.curbHeight, zc + bw * 0.3, 1, 1, 1, 0);
    }
  }
  for (const side of [-1, 1]) {
    ctx.put('vendingProp', side * 7.9, T.curbHeight, -rng.range(4, L - 4), 1, 1, 1, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    if (rng.next() < 0.7) ctx.put('wallCat', side * 7.9, T.curbHeight, -rng.range(6, L - 6), 1, 1, 1, 0);
  }
  if (ctx.index % 3 === 0) ctx.put('torii', -12, T.curbHeight, -L / 2, 1, 1, 1, Math.PI / 2);
  // Konbini on the corner (left side; the right is the railway).
  if (ctx.index % 3 === 1) {
    ctx.put('block', -14, 0, -L / 2, 9, 4.2, 10, 0, 0xfbfbf6);
    ctx.put('band', -9.45, 3.4, -L / 2, 0.1, 0.5, 10, 0, 0x2f8a4a);
    ctx.put('band', -9.44, 3.0, -L / 2, 0.1, 0.25, 10, 0, 0x3f7ac9);
    ctx.put('sign8', -9.3, 3.7, -L / 2, 1.3, 1.3, 1.3, Math.PI / 2);
  }
  streetFurniture(ctx, true);
}

function riverside(ctx: LayoutCtx): void {
  const { rng } = ctx;
  // River on the left, sakura avenue on both sides.
  ctx.put('river', -16, 0.15, -L / 2, 12, 1, L, 0);
  for (let i = 0; i < 3; i++) ctx.put('boat', -rng.range(12, 20), 0.17, -rng.range(2, L - 2), 1, 1, 1, rng.range(0, 3));
  if (ctx.index % 2 === 0) ctx.put('bridge', -16, 0, -L / 2 + 3, 1, 1, 1, Math.PI / 2);
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) ctx.put('sakura', side * rng.range(8.2, 9.4), T.curbHeight, -rng.range(3, L - 3), 1, rng.range(0.9, 1.15), 1, rng.range(0, 3));
  rowOf(ctx, 1, 12, [6, 9], [5, 8], P.houses, 'block');
  if (ctx.index % 4 === 0) ctx.put('tower', -70, 0, -L / 2, 1, 1, 1, 0.4);
  streetFurniture(ctx, false);
}

function neon(ctx: LayoutCtx): void {
  const { rng } = ctx;
  for (const side of [-1, 1]) {
    const c = rowOf(ctx, side, 9, [5, 9], [10, 22], P.neonDark);
    for (let i = 0; i < c.length; i += 3) {
      const [zc, bh] = [c[i], c[i + 1]];
      const face = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      // Stacked vertical neon signs up the facade.
      for (let y = 3; y < bh - 2; y += 3.6) ctx.put(`sign${rng.pick(NEON_SIGNS)}`, side * 8.85, y, zc + rng.range(-1, 1), 1.4, 1.4, 1.4, face);
      if (rng.next() < 0.3) ctx.put('screen', side * 8.9, rng.range(9, Math.max(10, bh - 5)), zc, 5, 4, 1, face);
    }
    ctx.put('vendingProp', side * 7.9, T.curbHeight, -rng.range(4, L - 4), 1, 1, 1, side < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  // Wet road: neon reflections smeared along the lanes.
  for (let k = 0; k < 6; k++) ctx.put('puddle', rng.range(-4, 4), 0.01, -rng.range(1, L - 1), rng.range(0.3, 0.8), 0.01, rng.range(3, 7), 0, rng.pick([0xff5ad0, 0x5ae8ff, 0xffe066, 0x8a6aff]));
  streetFurniture(ctx, true);
}

const SIGN_PROPS: CityKit['props'] = Object.fromEntries(SIGNS.map((s, i) => [`sign${i}`, { geometry: () => signPlane(i, SIGNS.length, s.vertical ? 1 : 2.4, s.vertical ? 2.4 : 0.9), material: signMat, capacity: 10 }]));

/** Tokyo: five districts with their own buildings, light and props, all from one kit. */
export const TOKYO_KIT: CityKit = {
  street,
  props: {
    block: { geometry: unitBoxBase, material: 'plain', capacity: 16 },
    band: { geometry: () => new THREE.BoxGeometry(1, 1, 1), material: 'plain', capacity: 60 },
    roofT: { geometry: unitBoxBase, material: 'plain', capacity: 14 },
    screen: { geometry: () => new THREE.PlaneGeometry(1, 1).rotateY(0), material: screenMaterial, capacity: 6 },
    zebra: { geometry: () => new THREE.BoxGeometry(1, 1, 1), material: 0xf6f6f2, capacity: 12 },
    noren: { geometry: () => new THREE.BoxGeometry(1, 1, 1), material: 'plain', capacity: 16 },
    lantern: { geometry: lantern, material: 'vc', capacity: 50 },
    bike: { geometry: bike, material: 'vc', capacity: 8 },
    pole: { geometry: utilityPole, material: 'vc', capacity: 4 },
    wire: { geometry: () => new THREE.BoxGeometry(1, 1, 1), material: P.wire, capacity: 8 },
    lamp: { geometry: lampT, material: 'vc', capacity: 4 },
    pots: { geometry: pots, material: 'vc', capacity: 12 },
    vendingProp: { geometry: vending, material: 'vc', capacity: 4 },
    railbed: { geometry: railbed, material: 'vc', capacity: 1 },
    wallCat: { geometry: wallCat, material: 'vc', capacity: 4 },
    torii: { geometry: torii, material: 'vc', capacity: 2 },
    river: { geometry: () => new THREE.BoxGeometry(1, 0.04, 1), material: P.river, capacity: 2 },
    boat: { geometry: () => merge([part(new THREE.ConeGeometry(0.35, 0.3, 4).rotateX(Math.PI).scale(1, 1, 2), 0xfbf6ec, 0, 0.15, 0), part(new THREE.ConeGeometry(0.18, 0.4, 4), 0xfbf6ec, 0, 0.45, 0)]), material: 'vc', capacity: 4 },
    bridge: { geometry: bridge, material: 'vc', capacity: 2 },
    sakura: { geometry: sakura, material: 'vc', capacity: 8 },
    tower: { geometry: latticeTower, material: 'vc', capacity: 1 },
    puddle: { geometry: () => new THREE.BoxGeometry(1, 1, 1), material: 'plain', capacity: 8 },
    ...SIGN_PROPS,
  },
  layout(ctx) {
    switch (ctx.district) {
      case 1:
        yokocho(ctx);
        break;
      case 2:
        shitamachi(ctx);
        break;
      case 3:
        riverside(ctx);
        break;
      case 4:
        neon(ctx);
        break;
      default:
        shibuya(ctx);
    }
  },
  obstacles: {
    crowd: () => {
      // Three commuters mid-stride, umbrellas and bags.
      const parts: THREE.BufferGeometry[] = [];
      const coats = [0x2a3a5a, 0xc9b49a, 0x6a6a70];
      [-0.6, 0, 0.6].forEach((x, i) => {
        const h = 1.55 + (i % 2) * 0.15;
        parts.push(box(0.14, h * 0.45, 0.14, 0x2a2a30, x - 0.08, h * 0.22, -0.5), box(0.14, h * 0.45, 0.14, 0x2a2a30, x + 0.08, h * 0.22, -0.5));
        parts.push(part(new THREE.CylinderGeometry(0.2, 0.24, h * 0.45, 8), coats[i], x, h * 0.66, -0.5));
        parts.push(blob(0.13, 0xe8c4a0, x, h * 0.95, -0.5), blob(0.135, 0x2a201c, x, h * 0.99, -0.47, 0.6));
      });
      parts.push(box(0.3, 0.22, 0.1, 0x6b4a35, 0.85, 0.85, -0.5), part(new THREE.ConeGeometry(0.5, 0.25, 8), 0xe85d8a, -0.6, 1.95, -0.5), cyl(0.015, 0.5, 0x2a2a30, -0.6, 1.7, -0.5, 4));
      return merge(parts);
    },
    deliveryRobot: () =>
      merge([
        box(0.7, 0.45, 0.8, P.robot, 0, 0.4, -0.45),
        box(0.66, 0.08, 0.76, 0x3f7ac9, 0, 0.66, -0.45),
        box(0.4, 0.12, 0.02, 0x2a2a30, 0, 0.5, -0.86),
        part(new THREE.SphereGeometry(0.035, 6, 4), 0x7aff9a, -0.12, 0.5, -0.88),
        part(new THREE.SphereGeometry(0.035, 6, 4), 0x7aff9a, 0.12, 0.5, -0.88),
        ...[-0.3, 0.3].flatMap((x) => [-0.15, -0.75].map((z) => part(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10).rotateZ(Math.PI / 2), 0x2a2a30, x, 0.1, z))),
        cyl(0.012, 0.6, 0x2a2a30, 0.25, 0.95, -0.2, 4),
        box(0.18, 0.12, 0.01, 0xf2a33a, 0.34, 1.2, -0.2),
      ]),
    mamachari: () => {
      const wheel = (z: number) => part(new THREE.TorusGeometry(0.33, 0.04, 6, 16).rotateY(Math.PI / 2), 0x2b2b2e, 0, 0.35, z);
      return merge([
        wheel(-0.25),
        wheel(-1.35),
        box(0.06, 0.06, 1.0, 0xffffff, 0, 0.62, -0.8),
        box(0.36, 0.25, 0.34, 0x8a8a90, 0, 0.88, -1.48),
        // Rider: commuter in a coat.
        part(new THREE.CylinderGeometry(0.2, 0.24, 0.6, 8), 0x3f5f8a, 0, 1.15, -0.65),
        blob(0.15, 0xe8c4a0, 0, 1.6, -0.75),
        cyl(0.03, 0.4, 0x2a2a30, 0, 0.85, -0.35, 5),
        box(0.5, 0.04, 0.04, 0xa9b2bc, 0, 1.05, -1.3),
      ]);
    },
    crow: () =>
      merge([
        blob(0.24, 0x1a1a22, 0, 1.45, -0.3, 0.75),
        blob(0.13, 0x1a1a22, 0, 1.55, -0.55),
        part(new THREE.ConeGeometry(0.05, 0.16, 5).rotateX(-Math.PI / 2), 0x3a3a40, 0, 1.53, -0.72),
        part(new THREE.SphereGeometry(0.02, 4, 3), 0xf2c14e, 0.05, 1.58, -0.62),
        box(1.3, 0.04, 0.32, 0x1a1a22, 0, 1.5, -0.3),
        box(0.18, 0.04, 0.28, 0x1a1a22, 0, 1.42, -0.05),
      ]),
    ramenCart: () => {
      const parts = [
        box(2.0, 0.9, 1.9, 0x8a5a33, 0, 0.75, -1.0),
        box(2.1, 0.08, 2.0, 0x5a3a2a, 0, 1.22, -1.0),
        box(2.3, 0.14, 2.2, 0xc8342a, 0, 2.15, -1.0),
        ...[-0.95, 0.95].map((x) => box(0.08, 0.95, 0.08, 0x5a3a2a, x, 1.7, -0.15)),
        part(new THREE.CylinderGeometry(0.22, 0.2, 0.28, 10), 0xfbf6ec, -0.4, 1.4, -0.6),
        blob(0.25, 0xf3eee6, -0.4, 1.75, -0.6, 1.4),
        blob(0.2, 0xf3eee6, -0.35, 2.0, -0.5, 1.2),
        part(new THREE.SphereGeometry(0.22, 10, 8).scale(1, 1.35, 1), P.lantern, 0.75, 1.7, -0.1),
      ];
      for (const z of [-0.35, -1.65]) parts.push(part(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12).rotateZ(Math.PI / 2), 0x2b2b2e, 1.05, 0.3, z));
      return merge(parts);
    },
    sakuraBranch: () => merge([box(1.4, 0.12, 0.12, P.trunk, 0, 0.12, -0.6), box(0.6, 0.08, 0.08, P.trunk, 0.4, 0.2, -0.4), blob(0.4, P.sakura[0], -0.4, 0.35, -0.6, 0.6), blob(0.35, P.sakura[1], 0.3, 0.32, -0.5, 0.6), blob(0.28, P.sakura[2], 0.6, 0.38, -0.7, 0.6)]),
    railBarrier: () => {
      const parts = [cyl(0.08, 1.4, 0x2a2a30, -1.4, 0.7, -0.2, 8), box(0.4, 0.4, 0.2, 0x2a2a30, -1.4, 1.6, -0.2)];
      for (let i = 0; i < 6; i++) parts.push(box(0.45, 0.14, 0.1, i % 2 ? 0xf2d43a : 0x2a2a30, -1.15 + i * 0.45, 1.15, -0.2));
      parts.push(part(new THREE.SphereGeometry(0.1, 8, 6), 0xff3b3b, -1.5, 1.6, -0.32), part(new THREE.SphereGeometry(0.1, 8, 6), 0xff3b3b, -1.3, 1.6, -0.32));
      return merge(parts);
    },
    commuterTrain: () => {
      const parts: THREE.BufferGeometry[] = [];
      for (let car = 0; car < 2; car++) {
        const z0 = -car * 11 - 5.4;
        parts.push(box(2.8, 2.7, 10.6, 0xd8dcd8, 0, 1.75, z0), box(2.82, 0.4, 10.6, 0x3faa5a, 0, 1.1, z0), box(2.82, 0.12, 10.6, 0x3faa5a, 0, 2.7, z0));
        for (let w = 0; w < 4; w++) parts.push(box(2.84, 0.8, 1.6, 0x3a4a5a, 0, 2.15, z0 - 3.6 + w * 2.4));
      }
      parts.push(box(3.2, 0.12, 24, 0x6a5a4a, 0, 0.06, -11));
      return merge(parts);
    },
    vendingMachine: vending,
    tokyoAwning: () => {
      const Lw = 8;
      const parts = [box(2.6, 0.08, Lw, 0xffffff, 0, AWNING_H, -Lw / 2)];
      for (let i = 0; i < 8; i++) parts.push(box(2.62, 0.09, 0.5, i % 2 ? 0x2a3a6a : 0xfbf6ec, 0, AWNING_H, -0.25 - i * 1.0));
      for (const x of [-1.25, 1.25]) for (const z of [-0.2, -Lw + 0.2]) parts.push(cyl(0.05, AWNING_H, 0x6a6a70, x, AWNING_H / 2, z, 6));
      parts.push(box(2.0, 0.8, 1.2, 0x8a5a33, 0, 0.4, -Lw / 2), part(new THREE.SphereGeometry(0.22, 10, 8).scale(1, 1.35, 1), P.lantern, 0, 1.7, -Lw / 2));
      return merge(parts);
    },
    overpass: () => {
      const Lo = 12;
      const parts = [box(2.6, 0.25, Lo, 0xc8c2bc, 0, 2.48, -Lo / 2), box(2.6, 0.6, 0.1, 0x8a8a90, 0, 2.9, -0.05)];
      for (const x of [-1.3, 1.3]) parts.push(box(0.08, 0.5, Lo, 0x8a8a90, x, 2.85, -Lo / 2));
      for (const z of [-1, -Lo + 1]) for (const x of [-1.1, 1.1]) parts.push(cyl(0.12, 2.4, 0x9a948c, x, 1.2, z, 8));
      return merge(parts);
    },
    elevatedTrack: () => {
      const Le = 24;
      const parts = [box(2.8, 0.4, Le, 0xb8b4b0, 0, 3.0, -Le / 2)];
      for (const x of [-0.7, 0.7]) parts.push(box(0.1, 0.12, Le, 0x8a8a90, x, 3.26, -Le / 2));
      for (let z = 0; z < Le; z += 0.8) parts.push(box(2.0, 0.06, 0.25, 0x6a5a4a, 0, 3.22, -z - 0.4));
      for (const z of [-2, -12, -22]) for (const x of [-1.42, 1.42]) parts.push(box(0.28, 2.8, 0.8, 0xa8a49e, x, 1.4, z));
      return merge(parts);
    },
    tokyoStairs: () => {
      const parts: THREE.BufferGeometry[] = [];
      const n = 14;
      for (let i = 0; i < n; i++) parts.push(box(2.4, (ELEV_H * (i + 1)) / n, 0.5, 0xc8c2bc, 0, (ELEV_H * (i + 1)) / n / 2, -i * 0.5 - 0.25));
      for (const x of [-1.2, 1.2]) parts.push(box(0.06, 0.06, 7, 0x6a6a70, x, ELEV_H * 0.6, -3.5));
      return merge(parts);
    },
    shutterWall: () => {
      const Lw = 10;
      const parts = [box(2.4, 2.1, Lw, 0xb8bcc0, 0, 1.05, -Lw / 2), box(2.5, 0.2, Lw, 0x6a6a70, 0, 2.15, -Lw / 2)];
      for (let y = 0.2; y < 2; y += 0.18) parts.push(box(2.42, 0.03, Lw, 0x9a9ea2, 0, y, -Lw / 2));
      parts.push(box(2.44, 0.6, 2.4, 0xd9483b, 0, 1.6, -3), box(2.44, 0.6, 2.4, 0x3f7ac9, 0, 1.0, -7));
      return merge(parts);
    },
    catDoorTokyo: () => {
      const g = TOKYO_KIT.obstacles.shutterWall();
      const parts = [g];
      for (const sx of [-1, 1]) parts.push(box(0.06, 0.75, 0.7, 0x8d5f38, sx * 1.21, 0.42, -5), box(0.07, 0.6, 0.55, 0xffd56b, sx * 1.22, 0.4, -5));
      return merge(parts);
    },
    cardboard: () => merge([box(0.8, 0.5, 0.7, 0xc8915a, 0, 0.25, -0.4), box(0.82, 0.04, 0.12, 0xd8c08a, 0, 0.5, -0.4), box(0.6, 0.35, 0.5, 0xb8814a, 0.05, 0.67, -0.4)]),
    onigiriToss: () =>
      merge([
        part(new THREE.ConeGeometry(0.42, 0.62, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(1, 1, 0.5), 0xfbfbf6, 0, 0.4, -0.35),
        box(0.45, 0.32, 0.36, 0x1e2a1e, 0, 0.18, -0.35),
      ]),
  },
  bossVehicle: () => {
    // Little white kei delivery truck, boxes in the back; Duke drives.
    const parts = [
      box(1.7, 1.5, 1.4, 0xf6f6f2, 0, 1.0, -0.7),
      box(1.6, 0.7, 0.05, 0x3a4a5a, 0, 1.35, -0.02),
      box(1.8, 0.15, 3.0, 0x8a8a90, 0, 0.5, -2.9),
      box(1.8, 0.5, 0.06, 0xf6f6f2, 0, 0.8, -4.38),
      ...[-0.9, 0.9].map((x) => box(0.06, 0.5, 3.0, 0xf6f6f2, x, 0.8, -2.9)),
      box(0.7, 0.5, 0.6, 0xc8915a, -0.4, 0.85, -2.4),
      box(0.6, 0.45, 0.6, 0xb8814a, 0.4, 0.85, -3.3),
      box(0.5, 0.4, 0.5, 0xc8915a, 0, 1.3, -2.9),
    ];
    for (const [x, z] of [[-0.85, -0.6], [0.85, -0.6], [-0.85, -3.8], [0.85, -3.8]]) parts.push(part(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12).rotateZ(Math.PI / 2), 0x2b2b2e, x, 0.28, z));
    return merge(parts);
  },
};

const AWNING_H = 2.1;
const ELEV_H = 3.2;
