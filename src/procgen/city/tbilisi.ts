import * as THREE from 'three';
import { TBILISI_PALETTE as P } from '../../data/city/tbilisi';
import { TRACK as T } from '../../data/track';
import { merge, paint, strip } from '../geo';
import { blob, box, cyl, part } from '../obstacles';
import { unitBoxBase } from '../props';
import { signAtlas, signMaterial, signPlane, type SignSpec } from '../signs';
import type { CityKit, LayoutCtx } from './kit';

const L = T.chunkLength;
const SEGS = T.groundSegments;

/** Mkhedruli shop signs: real Georgian words, no brands. */
const SIGNS: SignSpec[] = [
  { text: 'პური', fg: 0x5a3a2a, bg: 0xf3e2c4 }, // bread
  { text: 'ღვინო', fg: 0xfbf6ec, bg: 0x7a2a3a }, // wine
  { text: 'აფთიაქი', fg: 0xfbf6ec, bg: 0x2f8a5a }, // pharmacy
  { text: 'გამარჯობა', fg: 0x2a201c, bg: 0xf2c84a }, // hello
  { text: 'ხინკალი', fg: 0xfbf6ec, bg: 0x8a4a2a }, // khinkali
  { text: 'ჩურჩხელა', fg: 0x5a2a3a, bg: 0xf0d0a0 }, // churchkhela
  { text: 'აბანო', fg: 0xfbf6ec, bg: 0x3f6f8a }, // bath
  { text: 'სუფრა', fg: 0xffe08a, bg: 0x2a1e30, glow: true }, // supra
  { text: 'კაფე', fg: 0x8affe0, bg: 0x1a2030, glow: true }, // cafe
  { text: 'თბილისი', fg: 0xffd08a, bg: 0x2a1e30, glow: true }, // Tbilisi
];
const DAY = [0, 1, 2, 3, 4, 5, 6];
const NIGHT = [7, 8, 9, 1, 2];

let atlas: THREE.CanvasTexture | null = null;
const signMat = () => signMaterial((atlas ??= signAtlas(SIGNS, 'Noto Sans Georgian')))();

/** Cobbled old-town road with stone curbs. */
function street(): THREE.BufferGeometry {
  const rh = T.roadHalfWidth;
  const cOut = rh + T.curbWidth;
  const sOut = cOut + T.sidewalkWidth;
  const ch = T.curbHeight;
  const parts = [strip(-rh, rh, 0, L, SEGS, P.road)];
  for (let row = 0; row < L / 0.9; row++) {
    for (let x = -rh + 0.25 + (row % 2) * 0.3; x < rh - 0.25; x += 0.6) {
      const g = new THREE.PlaneGeometry(0.42, 0.32);
      g.rotateX(-Math.PI / 2);
      g.translate(x, 0.008, -row * 0.9 - 0.45);
      parts.push(paint(g, (row + Math.floor(x * 3)) % 4 === 0 ? P.cobble : P.road + 0x040404));
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

/** Carved wooden balcony (turquoise and white lattice), faces +x before rotation. */
function balcony(): THREE.BufferGeometry {
  const parts = [box(1.3, 0.12, 3.6, 0x7a5a3a, 0.6, 0, 0), box(0.1, 1.0, 3.6, P.balcony[0], 1.2, 0.55, 0), box(1.3, 0.1, 3.6, P.balcony[2], 0.6, 1.9, 0)];
  for (let i = 0; i < 9; i++) parts.push(box(0.06, 1.0, 0.06, P.balcony[2], 1.24, 0.55, -1.6 + i * 0.4));
  for (let i = 0; i < 4; i++) parts.push(box(0.04, 0.9, 0.04, P.balcony[0], 0.6 + 0.6, 1.4, -1.5 + i * 1.0));
  for (let i = 0; i < 3; i++) parts.push(part(new THREE.TorusGeometry(0.16, 0.03, 4, 10).rotateY(Math.PI / 2), P.balcony[2], 1.26, 0.55, -1.2 + i * 1.2));
  return merge(parts);
}

function vine(): THREE.BufferGeometry {
  return merge([blob(0.6, P.vine[0], 0, 0, 0, 0.5), blob(0.5, P.vine[1], 0.2, -0.2, 0.7, 0.5), blob(0.5, P.vine[0], -0.1, -0.1, -0.8, 0.5), blob(0.12, 0x6a3a6a, 0.3, -0.35, 0.2), blob(0.12, 0x6a3a6a, 0.2, -0.4, -0.4)]);
}

function lada(): THREE.BufferGeometry {
  const parts = [box(1.6, 0.6, 3.9, 0xffffff, 0, 0.55, 0), box(1.5, 0.5, 2.0, 0xffffff, 0, 1.05, 0.2), box(1.52, 0.38, 1.9, 0x3a4a5a, 0, 1.07, 0.2), box(1.62, 0.12, 0.2, 0xd8dce0, 0, 0.45, -1.95), box(1.62, 0.12, 0.2, 0xd8dce0, 0, 0.45, 1.95)];
  for (const x of [-0.78, 0.78]) for (const z of [-1.2, 1.2]) parts.push(part(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10).rotateZ(Math.PI / 2), 0x2b2b2e, x, 0.3, z));
  return merge(parts);
}

function bathDome(): THREE.BufferGeometry {
  // Brick dome of a sulfur bath with a little vent on top.
  return merge([
    part(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), P.brick, 0, 0, 0),
    cyl(0.25, 0.5, P.brick, 0, 1.45, 0, 8),
    part(new THREE.SphereGeometry(0.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0xd8a080, 0, 1.7, 0),
  ]);
}

function fortress(): THREE.BufferGeometry {
  // Narikala's walls on the hill (far scenery) and the aluminium mother statue on the ridge.
  const parts = [part(new THREE.SphereGeometry(30, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 0.6), 0xa8906a, 0, 0, 0)];
  for (let i = 0; i < 5; i++) parts.push(box(3, 5 + (i % 2) * 3, 3, P.stone, -18 + i * 9, 15 + (i % 2) * 2, 4));
  parts.push(box(40, 2.5, 1.5, P.stone, 0, 15, 4));
  parts.push(cyl(0.7, 8, 0xdfe6ee, 22, 19, 0, 6), blob(0.9, 0xdfe6ee, 22, 23.6, 0), box(4, 0.4, 0.4, 0xdfe6ee, 22, 21, 0));
  return merge(parts);
}

function gondolaProp(): THREE.BufferGeometry {
  return merge([box(1.5, 1.2, 1.9, 0xd9483b, 0, 0, 0), box(1.52, 0.5, 1.6, 0xbfe0f0, 0, 0.25, 0), cyl(0.04, 1.2, 0x3a3a40, 0, 1.2, 0, 5)]);
}

function canopy(): THREE.BufferGeometry {
  // Bridge of Peace: a wavy steel-and-glass canopy over the deck, with lights along the ribs.
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const z = -i * 5;
    const h = 5 + Math.sin(i * 0.9) * 0.8;
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI;
      parts.push(box(0.3, 0.3, 0.8, P.steel, -Math.cos(a) * 6.2, Math.sin(a) * h, z));
      if (k < 8) parts.push(box(0.9, 0.06, 4.2, P.glass, -Math.cos(a + Math.PI / 16) * 6.0, Math.sin(a + Math.PI / 16) * h, z - 2.5));
      if (k % 2 === 0) parts.push(part(new THREE.SphereGeometry(0.09, 6, 4), 0xbff6ff, -Math.cos(a) * 6.2, Math.sin(a) * h - 0.12, z));
    }
  }
  for (const x of [-6, 6]) parts.push(box(0.1, 1.1, 40, P.glass, x, 0.7, -20));
  return merge(parts);
}

function stall(): THREE.BufferGeometry {
  // Dry Bridge flea market table: cameras, paintings, horn cups, enamel pins.
  return merge([
    box(2.2, 0.08, 1.0, 0x8a5a33, 0, 0.75, 0),
    ...[-0.95, 0.95].map((x) => box(0.06, 0.75, 0.9, 0x6b4a35, x, 0.37, 0)),
    box(0.3, 0.2, 0.2, 0x2a2a30, -0.6, 0.9, 0.1),
    cyl(0.07, 0.06, 0x6a6a70, -0.6, 0.9, -0.02, 8),
    box(0.6, 0.45, 0.04, 0xfbf6ec, 0.4, 1.0, 0.35),
    box(0.5, 0.35, 0.05, [0x6a9ed8, 0xd9814f, 0x6fae5c][1], 0.4, 1.0, 0.33),
    part(new THREE.ConeGeometry(0.06, 0.3, 6).rotateZ(1.2), 0xc8a46e, 0, 0.85, -0.2),
    ...[0, 1, 2].map((i) => cyl(0.04, 0.02, [0xd9483b, 0x3f7ac9, 0xf2c84a][i], -0.2 + i * 0.12, 0.8, 0.3, 8)),
    // Vendor on a stool.
    cyl(0.18, 0.45, 0x6b4a35, 0, 0.22, -0.9, 8),
    part(new THREE.CylinderGeometry(0.22, 0.26, 0.6, 8), 0x5a6a8a, 0, 0.75, -0.9),
    blob(0.15, 0xe8c4a0, 0, 1.2, -0.9),
    blob(0.15, 0x4a4a50, 0, 1.28, -0.88, 0.5),
  ]);
}

function planeTree(): THREE.BufferGeometry {
  return merge([cyl(0.22, 3.2, 0xb8a890, 0, 1.6, 0, 8), blob(1.6, P.plane[0], 0, 4.2, 0, 0.8), blob(1.2, P.plane[1], 0.9, 4.6, 0.3, 0.8), blob(1.1, P.plane[0], -0.8, 4.8, -0.4, 0.8)]);
}

function cathedral(): THREE.BufferGeometry {
  // A golden-domed cathedral glowing on the hill in the distance (generic).
  return merge([
    part(new THREE.SphereGeometry(30, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 0.6), 0x3a3450, 0, 0, 0),
    box(10, 10, 10, 0xe8dcc4, 0, 15, 0),
    cyl(3, 6, 0xe8dcc4, 0, 22, 0, 12),
    part(new THREE.SphereGeometry(3.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.3, 1), P.gold, 0, 25, 0),
    cyl(0.25, 4, P.gold, 0, 30, 0, 6),
    box(1.8, 0.3, 0.3, P.gold, 0, 31, 0),
  ]);
}

function lampG(): THREE.BufferGeometry {
  return merge([cyl(0.07, 3.8, 0x2a2a30, 0, 1.9, 0, 8), part(new THREE.SphereGeometry(0.25, 10, 8), 0xffe8b0, 0, 3.95, 0), cyl(0.18, 0.12, 0x2a2a30, 0, 4.2, 0, 8)]);
}

function laundry(): THREE.BufferGeometry {
  // A washing line across the lane between two balconies, clothes pegged along it.
  const parts = [box(16.8, 0.02, 0.02, 0x2a2a30, 0, 0, 0)];
  for (let i = 0; i < 9; i++) parts.push(box(0.5, 0.5 + (i % 3) * 0.12, 0.04, [0xf2a6a8, 0x9fc7e8, 0xfaf4e6, 0xf2c14e, 0x6fb38a][i % 5], -6 + i * 1.5, -0.3, 0));
  return merge(parts);
}

/** Old-town houses with carved balconies, vines and laundry between them. */
function houses(ctx: LayoutCtx, side: number, setback: number, h: [number, number], balconies: boolean): void {
  const { rng, length } = ctx;
  let z = -rng.range(0, 1.5);
  while (z > -length) {
    const w = rng.range(5, 7.5);
    if (z - w < -length) break;
    const bh = rng.range(h[0], h[1]);
    const zc = z - w / 2;
    ctx.put('house', side * (setback + 4), 0, zc, 8, bh, w, 0, rng.pick(P.walls));
    ctx.put('roof', side * (setback + 4), bh, zc, 8.6, 0.6, w + 0.4, 0, P.roof);
    const face = side < 0 ? 0 : Math.PI;
    if (balconies) {
      ctx.put('balcony', side * setback, rng.range(3.2, 3.8), zc, 1, 1, Math.min(1.4, w / 4), face);
      if (bh > 7) ctx.put('balcony', side * setback, 6.2, zc, 1, 1, Math.min(1.4, w / 4), face);
      if (rng.next() < 0.5) ctx.put('vine', side * (setback - 0.3), 3.05, zc - w * 0.3, 1, 1, 1, 0);
    }
    if (rng.next() < 0.6) ctx.put(`sign${rng.pick(DAY)}`, side * (setback - 0.1), 2.2, zc + w * 0.2, 1, 1, 1, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    z -= w + rng.range(0, 0.6);
  }
}

function lamps(ctx: LayoutCtx): void {
  for (let z = 0, i = 0; z < L; z += T.lamp.spacing, i++) {
    const side = (ctx.index + i) % 2 === 0 ? -1 : 1;
    ctx.put('lamp', side * 5.3, T.curbHeight, -z - T.lamp.spacing / 2, 1, 1, 1, 0);
  }
}

function festival(ctx: LayoutCtx): void {
  // Tbilisoba: grape garlands and flags strung across the street.
  if (!ctx.festival) return;
  for (let z = 4; z < L; z += 8) {
    ctx.put('garland', 0, 5.2, -z, 1, 1, 1, 0);
  }
}

function oldTown(ctx: LayoutCtx): void {
  houses(ctx, -1, 8.4, [6, 9], true);
  houses(ctx, 1, 8.4, [6, 9], true);
  const { rng } = ctx;
  for (let k = 0; k < 2; k++) ctx.put('laundry', 0, rng.range(6.5, 7.5), -rng.range(4, L - 4), 1, 1, 1, 0);
  for (let k = 0; k < 2; k++) {
    const side = rng.next() < 0.5 ? -1 : 1;
    ctx.put('lada', side * 6.3, T.curbHeight, -rng.range(4, L - 4), 1, 1, 1, rng.range(-0.15, 0.15), rng.pick(P.ladas));
  }
  lamps(ctx);
  festival(ctx);
}

function baths(ctx: LayoutCtx): void {
  const { rng } = ctx;
  // River on the left, bath domes on the right, fortress and statue on the hill beyond.
  ctx.put('river', -15, 0.15, -L / 2, 10, 1, L, 0);
  for (let k = 0; k < 2; k++) ctx.put('dome', rng.range(10, 14), T.curbHeight, -rng.range(6, L - 6), 1, 1, 1, 0);
  houses(ctx, 1, 16, [5, 7], false);
  if (ctx.index % 3 === 0) ctx.put('fortress', -80, 0, -L / 2, 1, 1, 1, Math.PI / 2);
  // Cable car gondolas gliding overhead on their cable.
  ctx.put('cable', -3, 12, -L / 2, 0.05, 0.05, L, 0);
  for (let k = 0; k < 2; k++) ctx.put('gondola', -3, 10.8, -rng.range(4, L - 4), 1, 1, 1, 0);
  lamps(ctx);
  festival(ctx);
}

function bridgeOfPeace(ctx: LayoutCtx): void {
  ctx.put('river', -15, 0.15, -L / 2, 16, 1, L, 0);
  ctx.put('river', 15, 0.15, -L / 2, 16, 1, L, 0);
  ctx.put('canopy', 0, T.curbHeight, 0, 1, 1, 1, 0);
  festival(ctx);
}

function market(ctx: LayoutCtx): void {
  const { rng } = ctx;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) ctx.put('stall', side * rng.range(7.2, 8.4), T.curbHeight, -k * 10 - rng.range(2, 6), 1, 1, 1, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    for (let k = 0; k < 2; k++) ctx.put('plane', side * rng.range(10, 12), T.curbHeight, -rng.range(3, L - 3), 1, rng.range(0.9, 1.1), 1, rng.range(0, 3));
  }
  ctx.put('river', -18, 0.15, -L / 2, 8, 1, L, 0);
  lamps(ctx);
  festival(ctx);
}

function rustaveli(ctx: LayoutCtx): void {
  const { rng } = ctx;
  for (const side of [-1, 1]) {
    let z = -rng.range(0, 2);
    while (z > -L) {
      const w = rng.range(9, 14);
      if (z - w < -L) break;
      const bh = rng.range(10, 15);
      const zc = z - w / 2;
      ctx.put('facade', side * 14, 0, zc, 8, bh, w, 0);
      for (let y = 2.5; y < bh - 1; y += 3) for (let k = 0; k < 3; k++) ctx.put('window', side * 9.98, y, zc - w / 2 + ((k + 0.5) * w) / 3, 0.1, 1.8, 1.1, 0, 0xffd890);
      for (let k = 0; k < 4; k++) ctx.put('column', side * 9.6, 0, zc - w / 2 + ((k + 0.5) * w) / 4, 0.6, 5, 0.6, 0);
      if (rng.next() < 0.6) ctx.put(`sign${rng.pick(NIGHT)}`, side * 9.4, 5.6, zc, 1.2, 1.2, 1.2, side < 0 ? Math.PI / 2 : -Math.PI / 2);
      z -= w + 0.4;
    }
    for (let k = 0; k < 2; k++) ctx.put('plane', side * 7.6, T.curbHeight, -rng.range(3, L - 3), 1, 1, 1, rng.range(0, 3));
  }
  if (ctx.index % 3 === 0) ctx.put('cathedral', 70, 0, -L / 2, 1, 1, 1, 0);
  lamps(ctx);
  festival(ctx);
}

const SIGN_PROPS: CityKit['props'] = Object.fromEntries(SIGNS.map((_, i) => [`sign${i}`, { geometry: () => signPlane(i, SIGNS.length, 2.4, 0.8), material: signMat, capacity: 10 }]));

/** Tbilisi: Old Town, Abanotubani, the Bridge of Peace, the Dry Bridge market and Rustaveli. */
export const TBILISI_KIT: CityKit = {
  street,
  props: {
    house: { geometry: unitBoxBase, material: 'plain', capacity: 16 },
    roof: { geometry: unitBoxBase, material: 'plain', capacity: 16 },
    balcony: { geometry: balcony, material: 'vc', capacity: 24 },
    vine: { geometry: vine, material: 'vc', capacity: 10 },
    laundry: { geometry: laundry, material: 'vc', capacity: 3 },
    lada: { geometry: lada, material: 'plain', capacity: 3 },
    lamp: { geometry: lampG, material: 'vc', capacity: 4 },
    river: { geometry: () => new THREE.BoxGeometry(1, 0.04, 1), material: P.river, capacity: 2 },
    dome: { geometry: bathDome, material: 'vc', capacity: 3 },
    fortress: { geometry: fortress, material: 'vc', capacity: 1 },
    cable: { geometry: () => new THREE.BoxGeometry(1, 1, 1), material: 0x2a2a30, capacity: 1 },
    gondola: { geometry: gondolaProp, material: 'vc', capacity: 2 },
    canopy: { geometry: canopy, material: 'vc', capacity: 1 },
    stall: { geometry: stall, material: 'vc', capacity: 10 },
    plane: { geometry: planeTree, material: 'vc', capacity: 6 },
    facade: { geometry: unitBoxBase, material: 0xf3e6cf, capacity: 10 },
    window: { geometry: () => new THREE.BoxGeometry(1, 1, 1), material: 'plain', capacity: 90 },
    column: { geometry: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0), material: 0xfbf6ec, capacity: 24 },
    cathedral: { geometry: cathedral, material: 'vc', capacity: 1 },
    garland: { geometry: garland, material: 'vc', capacity: 6 },
    ...SIGN_PROPS,
  },
  layout(ctx) {
    switch (ctx.district) {
      case 1:
        baths(ctx);
        break;
      case 2:
        bridgeOfPeace(ctx);
        break;
      case 3:
        market(ctx);
        break;
      case 4:
        rustaveli(ctx);
        break;
      default:
        oldTown(ctx);
    }
  },
  obstacles: {
    marshrutka: () => {
      const Lm = 5;
      const parts = [box(2.1, 2.2, Lm, P.marshrutka, 0, 1.25, -Lm / 2), box(2.12, 0.6, Lm - 1.2, 0x3a4a5a, 0, 1.75, -Lm / 2 - 0.3), box(2.0, 0.7, 0.05, 0x3a4a5a, 0, 1.7, -0.02), box(2.14, 0.15, Lm, 0x2a2a30, 0, 0.3, -Lm / 2), box(1.0, 0.25, 0.04, 0xfbf6ec, 0, 2.15, -0.01)];
      for (const x of [-0.95, 0.95]) for (const z of [-0.8, -Lm + 0.8]) parts.push(part(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12).rotateZ(Math.PI / 2), 0x2b2b2e, x, 0.36, z));
      return merge(parts);
    },
    wineBarrel: () => merge([part(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 14).rotateZ(Math.PI / 2), 0x8a5a33, 0, 0.45, -0.45), ...[-0.3, 0, 0.3].map((x) => part(new THREE.TorusGeometry(0.46, 0.03, 4, 16).rotateY(Math.PI / 2), 0x4a4a50, x, 0.45, -0.45))]),
    churchkhela: () => {
      const parts = [box(2.6, 0.1, 0.1, 0x6b4a35, 0, 2.45, -0.3), ...[-1.25, 1.25].map((x) => box(0.08, 2.5, 0.08, 0x6b4a35, x, 1.25, -0.3))];
      for (let i = 0; i < 9; i++) parts.push(part(new THREE.CylinderGeometry(0.06, 0.05, 1.3, 6), [0x8a2a3a, 0xc8783a, 0x6a2a4a][i % 3], -1.0 + i * 0.25, 1.75, -0.3));
      return merge(parts);
    },
    tonisTray: () =>
      merge([
        box(0.14, 0.8, 0.14, 0x2a2a30, -0.1, 0.4, -0.5),
        box(0.14, 0.8, 0.14, 0x2a2a30, 0.1, 0.4, -0.5),
        part(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), 0xfbf6ec, 0, 1.15, -0.5),
        blob(0.15, 0xe8c4a0, 0, 1.65, -0.5),
        box(1.1, 0.06, 0.6, 0x8a5a33, 0, 1.9, -0.5),
        ...[-0.35, 0, 0.35].map((x) => part(new THREE.SphereGeometry(0.17, 8, 6).scale(1.6, 0.5, 0.7), 0xd8a060, x, 2.0, -0.5)),
      ]),
    pothole: () => merge([part(new THREE.CylinderGeometry(0.9, 0.8, 0.06, 12).scale(1, 1, 0.7), 0x3a342e, 0, 0.03, -0.6), ...[0, 1, 2, 3].map((i) => box(0.3, 0.12, 0.24, P.cobble, Math.cos(i * 1.6) * 0.8, 0.06, -0.6 + Math.sin(i * 1.6) * 0.5))]),
    cellarDoor: () => merge([box(1.6, 0.08, 1.2, 0x2a201c, 0, 0.04, -0.6), box(0.8, 0.06, 1.2, 0x7a5a3a, -0.45, 0.45, -0.6).rotateZ(0.0), box(0.06, 0.9, 1.2, 0x7a5a3a, 0.82, 0.45, -0.6), box(0.06, 0.9, 1.2, 0x7a5a3a, -0.82, 0.45, -0.6)]),
    rooster: () =>
      merge([
        blob(0.24, 0xc8783a, 0, 0.4, -0.3, 0.9),
        blob(0.12, 0xc8783a, 0, 0.62, -0.5),
        part(new THREE.ConeGeometry(0.04, 0.12, 4).rotateX(-Math.PI / 2), 0xf2c84a, 0, 0.6, -0.65),
        box(0.04, 0.12, 0.12, 0xd9302a, 0, 0.75, -0.5),
        part(new THREE.ConeGeometry(0.18, 0.34, 5).rotateX(0.8), 0x2a3a4a, 0, 0.55, -0.05),
        box(0.03, 0.2, 0.03, 0xf2c84a, -0.08, 0.1, -0.3),
        box(0.03, 0.2, 0.03, 0xf2c84a, 0.08, 0.1, -0.3),
      ]),
    steamVent: () => merge([box(1.6, 0.12, 1.0, 0x6a6a70, 0, 0.06, -0.6), blob(0.5, 0xf3eee6, 0, 0.7, -0.6, 1.3), blob(0.45, 0xf6f2ea, 0.1, 1.4, -0.55, 1.3), blob(0.4, 0xfbf8f2, -0.1, 2.0, -0.6, 1.2)]),
    balconyRun: () => {
      const Lb = 5;
      const parts = [box(2.6, 0.18, Lb, 0x7a5a3a, 0, BALC_H - 0.09, -Lb / 2), box(0.08, 0.6, Lb, P.balcony[0], 1.28, BALC_H + 0.3, -Lb / 2), box(0.08, 0.6, Lb, P.balcony[0], -1.28, BALC_H + 0.3, -Lb / 2)];
      for (let i = 0; i < 8; i++) for (const x of [-1.28, 1.28]) parts.push(box(0.05, 0.6, 0.05, P.balcony[2], x * 1.02, BALC_H + 0.3, -0.3 - i * 0.62));
      for (const z of [-0.3, -Lb + 0.3]) for (const x of [-1.1, 1.1]) parts.push(cyl(0.06, BALC_H, 0x6b4a35, x, BALC_H / 2, z, 6));
      return merge(parts);
    },
    bathDome: () => merge([part(new THREE.SphereGeometry(1.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.15, 1.45), P.brick, 0, 0, -2), cyl(0.15, 0.3, P.brick, 0, 1.7, -2, 8)]),
    oldWall: () => {
      const Lw = 10;
      const parts = [box(2.4, 2.1, Lw, P.stone, 0, 1.05, -Lw / 2), box(2.5, 0.2, Lw, 0xe8dcc4, 0, 2.15, -Lw / 2)];
      for (let i = 0; i < 6; i++) parts.push(blob(0.35, i % 2 ? P.vine[0] : P.vine[1], (i % 2 ? 1 : -1) * 0.9, 1.6 - (i % 3) * 0.4, -0.8 - i * 1.6, 0.6));
      return merge(parts);
    },
    catDoorTbilisi: () => {
      const g = TBILISI_KIT.obstacles.oldWall();
      const parts = [g];
      for (const sx of [-1, 1]) parts.push(box(0.06, 0.75, 0.7, 0x3f9a9a, sx * 1.21, 0.42, -5), box(0.07, 0.6, 0.55, 0xffd56b, sx * 1.22, 0.4, -5));
      return merge(parts);
    },
    marketTable: () => stall().translate(0, 0, -0.8),
    khinkaliToss: () => merge([part(new THREE.SphereGeometry(0.4, 12, 8).scale(1, 0.8, 1), 0xf3e6cf, 0, 0.32, -0.4), part(new THREE.ConeGeometry(0.15, 0.3, 8), 0xf3e6cf, 0, 0.72, -0.4)]),
    churchkhelaToss: () => merge([part(new THREE.CylinderGeometry(0.1, 0.09, 1.0, 6).rotateZ(Math.PI / 2), 0x8a2a3a, 0, 0.3, -0.3), part(new THREE.CylinderGeometry(0.1, 0.09, 1.0, 6).rotateZ(Math.PI / 2), 0xc8783a, 0, 0.5, -0.6)]),
  },
  bossVehicle: () => TBILISI_KIT.obstacles.marshrutka(),
};

const BALC_H = 2.4;

function garland(): THREE.BufferGeometry {
  // Grape garland with little flags (Tbilisoba).
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = -8 + i;
    const y = -Math.sin((i / 16) * Math.PI) * 0.8;
    if (i % 2 === 0) parts.push(blob(0.16, i % 4 ? 0x6a2a5a : 0x8aa84a, x, y - 0.15, 0));
    else parts.push(part(new THREE.ConeGeometry(0.18, 0.4, 3).rotateX(Math.PI), [0xd9483b, 0xfbf6ec, 0xf2c84a][i % 3], x, y - 0.25, 0));
  }
  return merge(parts);
}
