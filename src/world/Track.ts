import * as THREE from 'three';
import type { CityPalette } from '../data/cities';
import { TRACK as T } from '../data/track';
import { Rng } from '../core/Rng';
import { createToonMaterial } from '../render/ToonMaterial';
import { buildStreetGeometry } from '../procgen/street';
import {
  crownGeometry,
  facadeGeometry,
  fenceGeometry,
  lampGeometry,
  roofGeometry,
  trunkGeometry,
  unitBoxBase,
} from '../procgen/props';

type PropKey = keyof typeof T.capacity;

interface Chunk {
  group: THREE.Group;
  index: number;
  props: Record<PropKey, THREE.InstancedMesh>;
}

const H = T.house;
const L = T.chunkLength;

/**
 * Infinite street built from a fixed pool of chunks. Each chunk owns a set of
 * InstancedMeshes that are re-laid-out (seeded by chunk index) when recycled.
 * The world scrolls toward the cat, which stays at z = 0.
 */
export class Track {
  readonly root = new THREE.Group();
  private readonly chunks: Chunk[] = [];
  private nextIndex = 0;
  private readonly rng = new Rng(0);
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly counts: Record<PropKey, number> = { house: 0, facade: 0, fence: 0, trunk: 0, crown: 0, lamp: 0 };
  private roofCount = 0;
  private readonly roofs: THREE.InstancedMesh[] = [];

  constructor(private readonly p: CityPalette) {
    const street = buildStreetGeometry(p);
    const vc = createToonMaterial(0xffffff, { vertexColors: true });
    const plain = createToonMaterial(0xffffff);
    const geos: Record<PropKey, [THREE.BufferGeometry, THREE.Material]> = {
      house: [unitBoxBase(), plain],
      facade: [facadeGeometry(), plain],
      fence: [fenceGeometry(p), vc],
      trunk: [trunkGeometry(), createToonMaterial(p.trunk)],
      crown: [crownGeometry(), plain],
      lamp: [lampGeometry(p), vc],
    };
    const roofGeo = roofGeometry();

    const total = T.chunksAhead + T.chunksBehind + 1;
    for (let c = 0; c < total; c++) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(street, vc));
      const props = {} as Record<PropKey, THREE.InstancedMesh>;
      for (const key of Object.keys(geos) as PropKey[]) {
        const [g, m] = geos[key];
        const mesh = new THREE.InstancedMesh(g, m, T.capacity[key]);
        props[key] = mesh;
        group.add(mesh);
      }
      const roof = new THREE.InstancedMesh(roofGeo, plain, T.capacity.house);
      this.roofs.push(roof);
      group.add(roof);
      this.root.add(group);
      const chunk: Chunk = { group, index: -1, props };
      this.chunks.push(chunk);
    }
    this.reset();
  }

  reset(): void {
    this.nextIndex = -T.chunksBehind;
    for (let i = 0; i < this.chunks.length; i++) this.layout(i, this.nextIndex++);
  }

  /** Recycle chunks that fell behind. Call from the fixed step. */
  step(distance: number): void {
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      if (distance - (c.index + 1) * L > T.chunksBehind * L) this.layout(i, this.nextIndex++);
    }
  }

  /** Position chunks for the interpolated distance. Call every render frame. */
  render(distance: number): void {
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      c.group.position.z = distance - c.index * L;
    }
  }

  private layout(slot: number, index: number): void {
    const c = this.chunks[slot];
    c.index = index;
    const rng = this.rng;
    rng.reseed((T.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
    for (const k in this.counts) this.counts[k as PropKey] = 0;
    this.roofCount = 0;

    for (const side of [-1, 1]) {
      this.layoutHouses(c, side, slot);
      this.layoutFence(c, side);
      this.layoutGreenery(c, side);
    }
    // Lamps alternate sides every spacing metres.
    for (let z = 0, i = 0; z < L; z += T.lamp.spacing, i++) {
      const side = (index + i) % 2 === 0 ? -1 : 1;
      this.put(c, 'lamp', side * T.lamp.x, 0, -z - T.lamp.spacing / 2, 1, 1, 1, side < 0 ? 0 : Math.PI);
    }

    for (const k in c.props) {
      const m = c.props[k as PropKey];
      m.count = this.counts[k as PropKey];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
    const roof = this.roofs[slot];
    roof.count = this.roofCount;
    roof.instanceMatrix.needsUpdate = true;
    if (roof.instanceColor) roof.instanceColor.needsUpdate = true;
    roof.computeBoundingSphere();
  }

  private layoutHouses(c: Chunk, side: number, slot: number): void {
    const rng = this.rng;
    const p = this.p;
    let z = -rng.range(0, H.gap[1]);
    while (true) {
      const w = rng.range(H.width[0], H.width[1]);
      if (z - w < -L || this.counts.house >= T.capacity.house) break;
      const d = rng.range(H.depth[0], H.depth[1]);
      const h = rng.range(H.height[0], H.height[1]);
      const zc = z - w / 2;
      const xc = side * (H.setback + d / 2);
      this.put(c, 'house', xc, 0, zc, d, h, w, 0, rng.pick(p.houseBodies));

      const roof = this.roofs[slot];
      if (this.roofCount < T.capacity.house) {
        this.setMatrix(xc, h, zc, d + 2 * H.overhang, rng.range(H.roofHeight[0], H.roofHeight[1]), w + 2 * H.overhang, 0);
        roof.setMatrixAt(this.roofCount, this.dummy.matrix);
        roof.setColorAt(this.roofCount, this.color.setHex(rng.pick(p.roofs)));
        this.roofCount++;
      }

      // Facade: door plus windows on the side facing the road.
      const fx = side * (H.setback - 0.04);
      const doorZ = zc + rng.range(-w / 4, w / 4);
      this.put(c, 'facade', fx, H.door[1] / 2, doorZ, 1, H.door[1], H.door[0], 0, rng.pick(p.doors));
      const stories = h >= H.twoStoryMin ? 2 : 1;
      for (let s = 0; s < stories; s++) {
        const wy = s * H.storyHeight + H.storyHeight * 0.6;
        const n = s === 0 ? 2 : 3;
        for (let i = 0; i < n; i++) {
          const wz = zc - w / 2 + ((i + 0.5) * w) / n;
          if (s === 0 && Math.abs(wz - doorZ) < H.door[0] + 0.3) continue;
          this.put(c, 'facade', fx, wy, wz, 1, H.window[1], H.window[0], 0, p.window);
        }
      }
      z -= w + rng.range(H.gap[0], H.gap[1]);
    }
  }

  private layoutFence(c: Chunk, side: number): void {
    const F = T.fence;
    for (let z = 0; z < L; z += F.sectionLength) {
      if (this.rng.next() < F.gapChance) continue;
      this.put(c, 'fence', side * F.x, T.curbHeight, -z, 1, 1, 1, 0);
    }
  }

  private layoutGreenery(c: Chunk, side: number): void {
    const rng = this.rng;
    const p = this.p;
    const tr = T.tree;
    const trees = rng.int(tr.perSide[0], tr.perSide[1] + 1);
    for (let i = 0; i < trees; i++) {
      const x = side * rng.range(tr.x[0], tr.x[1]);
      const z = -rng.range(1, L - 1);
      const th = rng.range(tr.trunk[0], tr.trunk[1]);
      const cs = rng.range(tr.crown[0], tr.crown[1]);
      this.put(c, 'trunk', x, 0, z, 1, th, 1, 0);
      this.put(c, 'crown', x, th + cs * 0.3, z, cs * 1.3, cs * 1.2, cs * 1.3, rng.range(0, 3), rng.pick(p.leaves));
    }
    const b = T.bush;
    const bushes = rng.int(b.perSide[0], b.perSide[1] + 1);
    for (let i = 0; i < bushes; i++) {
      const s = rng.range(b.size[0], b.size[1]);
      this.put(c, 'crown', side * rng.range(b.x[0], b.x[1]), s * 0.35, -rng.range(0, L), s * 1.4, s, s * 1.2, 0, rng.pick(p.bushes));
    }
  }

  private setMatrix(x: number, y: number, z: number, sx: number, sy: number, sz: number, ry: number): void {
    const d = this.dummy;
    d.position.set(x, y, z);
    d.scale.set(sx, sy, sz);
    d.rotation.set(0, ry, 0);
    d.updateMatrix();
  }

  private put(c: Chunk, key: PropKey, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry: number, color?: number): void {
    const i = this.counts[key];
    if (i >= T.capacity[key]) return;
    const m = c.props[key];
    this.setMatrix(x, y, z, sx, sy, sz, ry);
    m.setMatrixAt(i, this.dummy.matrix);
    if (color !== undefined) m.setColorAt(i, this.color.setHex(color));
    this.counts[key] = i + 1;
  }
}
