import { MAPLE_PALETTE as P } from '../../data/city/mapleLane';
import { TRACK as T } from '../../data/track';
import { MAPLE_OBSTACLES } from '../obstacles';
import { crownGeometry, facadeGeometry, fenceGeometry, lampGeometry, roofGeometry, trunkGeometry, unitBoxBase } from '../props';
import { buildStreetGeometry } from '../street';
import type { CityKit, LayoutCtx } from './kit';

const H = T.house;

function houses(ctx: LayoutCtx, side: number): void {
  const { rng, length: L } = ctx;
  let z = -rng.range(0, H.gap[1]);
  for (let n = 0; n < T.capacity.house / 2; n++) {
    const w = rng.range(H.width[0], H.width[1]);
    if (z - w < -L) break;
    const d = rng.range(H.depth[0], H.depth[1]);
    const h = rng.range(H.height[0], H.height[1]);
    const zc = z - w / 2;
    const xc = side * (H.setback + d / 2);
    ctx.put('house', xc, 0, zc, d, h, w, 0, rng.pick(P.houseBodies));
    ctx.put('roof', xc, h, zc, d + 2 * H.overhang, rng.range(H.roofHeight[0], H.roofHeight[1]), w + 2 * H.overhang, 0, rng.pick(P.roofs));
    // Facade: door plus windows on the side facing the road.
    const fx = side * (H.setback - 0.04);
    const doorZ = zc + rng.range(-w / 4, w / 4);
    ctx.put('facade', fx, H.door[1] / 2, doorZ, 1, H.door[1], H.door[0], 0, rng.pick(P.doors));
    const stories = h >= H.twoStoryMin ? 2 : 1;
    for (let s = 0; s < stories; s++) {
      const wy = s * H.storyHeight + H.storyHeight * 0.6;
      const count = s === 0 ? 2 : 3;
      for (let i = 0; i < count; i++) {
        const wz = zc - w / 2 + ((i + 0.5) * w) / count;
        if (s === 0 && Math.abs(wz - doorZ) < H.door[0] + 0.3) continue;
        ctx.put('facade', fx, wy, wz, 1, H.window[1], H.window[0], 0, P.window);
      }
    }
    z -= w + rng.range(H.gap[0], H.gap[1]);
  }
}

function greenery(ctx: LayoutCtx, side: number): void {
  const { rng, length: L } = ctx;
  const F = T.fence;
  for (let z = 0; z < L; z += F.sectionLength) {
    if (rng.next() < F.gapChance) continue;
    ctx.put('fence', side * F.x, T.curbHeight, -z, 1, 1, 1, 0);
  }
  const tr = T.tree;
  const trees = rng.int(tr.perSide[0], tr.perSide[1] + 1);
  for (let i = 0; i < trees; i++) {
    const x = side * rng.range(tr.x[0], tr.x[1]);
    const z = -rng.range(1, L - 1);
    const th = rng.range(tr.trunk[0], tr.trunk[1]);
    const cs = rng.range(tr.crown[0], tr.crown[1]);
    ctx.put('trunk', x, 0, z, 1, th, 1, 0);
    ctx.put('crown', x, th + cs * 0.3, z, cs * 1.3, cs * 1.2, cs * 1.3, rng.range(0, 3), rng.pick(P.leaves));
  }
  const b = T.bush;
  const bushes = rng.int(b.perSide[0], b.perSide[1] + 1);
  for (let i = 0; i < bushes; i++) {
    const s = rng.range(b.size[0], b.size[1]);
    ctx.put('crown', side * rng.range(b.x[0], b.x[1]), s * 0.35, -rng.range(0, L), s * 1.4, s, s * 1.2, 0, rng.pick(P.bushes));
  }
}

/** Maple Lane: mint and cream houses with gable roofs, picket fences, autumn trees, street lamps. */
export const MAPLE_KIT: CityKit = {
  street: () => buildStreetGeometry(P),
  props: {
    house: { geometry: unitBoxBase, material: 'plain', capacity: T.capacity.house },
    roof: { geometry: roofGeometry, material: 'plain', capacity: T.capacity.house },
    facade: { geometry: facadeGeometry, material: 'plain', capacity: T.capacity.facade },
    fence: { geometry: () => fenceGeometry(P), material: 'vc', capacity: T.capacity.fence },
    trunk: { geometry: trunkGeometry, material: P.trunk, capacity: T.capacity.trunk },
    crown: { geometry: crownGeometry, material: 'plain', capacity: T.capacity.crown },
    lamp: { geometry: () => lampGeometry(P), material: 'vc', capacity: T.capacity.lamp },
  },
  layout(ctx) {
    houses(ctx, -1);
    houses(ctx, 1);
    greenery(ctx, -1);
    greenery(ctx, 1);
    // Lamps alternate sides every spacing metres.
    for (let z = 0, i = 0; z < ctx.length; z += T.lamp.spacing, i++) {
      const side = (ctx.index + i) % 2 === 0 ? -1 : 1;
      ctx.put('lamp', side * T.lamp.x, 0, -z - T.lamp.spacing / 2, 1, 1, 1, side < 0 ? 0 : Math.PI);
    }
  },
  obstacles: MAPLE_OBSTACLES,
  bossVehicle: MAPLE_OBSTACLES.mailTruck,
};
