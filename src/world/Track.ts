import * as THREE from 'three';
import { TRACK as T } from '../data/track';
import { Rng } from '../core/Rng';
import { createToonMaterial } from '../render/ToonMaterial';
import type { CityKit, LayoutCtx } from '../procgen/city/kit';

interface Chunk {
  group: THREE.Group;
  index: number;
  props: Map<string, THREE.InstancedMesh>;
}

const L = T.chunkLength;

/**
 * Infinite street built from a fixed pool of chunks. Each chunk owns one InstancedMesh
 * per prop kind in the city kit, re-laid-out (seeded by chunk index) when recycled.
 * The world scrolls toward the cat, which stays at z = 0.
 */
export class Track {
  readonly root = new THREE.Group();
  private readonly chunks: Chunk[] = [];
  private nextIndex = 0;
  private readonly rng = new Rng(0);
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly counts = new Map<string, number>();
  private current: Chunk | null = null;
  private readonly ctx: LayoutCtx;

  constructor(private readonly kit: CityKit) {
    const street = kit.street();
    const vc = createToonMaterial(0xffffff, { vertexColors: true });
    const plain = createToonMaterial(0xffffff);
    const specs = Object.entries(kit.props).map(([key, s]) => ({
      key,
      geo: s.geometry(),
      mat: s.material === 'vc' ? vc : s.material === 'plain' ? plain : createToonMaterial(s.material),
      capacity: s.capacity,
      tinted: s.material === 'plain',
    }));
    const total = T.chunksAhead + T.chunksBehind + 1;
    for (let c = 0; c < total; c++) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(street, vc));
      const props = new Map<string, THREE.InstancedMesh>();
      for (const s of specs) {
        const mesh = new THREE.InstancedMesh(s.geo, s.mat, s.capacity);
        if (s.tinted) mesh.setColorAt(0, this.color.setHex(0xffffff));
        props.set(s.key, mesh);
        group.add(mesh);
      }
      this.root.add(group);
      this.chunks.push({ group, index: -1, props });
    }
    this.ctx = { rng: this.rng, length: L, index: 0, put: this.put };
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

  dispose(): void {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
  }

  private layout(slot: number, index: number): void {
    const c = this.chunks[slot];
    c.index = index;
    this.current = c;
    this.rng.reseed((T.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
    for (const k of c.props.keys()) this.counts.set(k, 0);
    this.ctx.index = index;
    this.kit.layout(this.ctx);
    for (const [k, m] of c.props) {
      m.count = this.counts.get(k) ?? 0;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }

  private readonly put = (key: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry: number, color?: number): void => {
    const m = this.current!.props.get(key);
    if (!m) return;
    const i = this.counts.get(key) ?? 0;
    if (i >= m.instanceMatrix.count) return;
    const d = this.dummy;
    d.position.set(x, y, z);
    d.scale.set(sx, sy, sz);
    d.rotation.set(0, ry, 0);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
    if (color !== undefined && m.instanceColor) m.setColorAt(i, this.color.setHex(color));
    this.counts.set(key, i + 1);
  };
}
