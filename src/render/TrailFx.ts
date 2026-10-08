import * as THREE from 'three';
import { ACCESSORIES, TRAIL } from '../data/accessories';
import { createToonMaterial } from './ToonMaterial';

function noteGeometry(): THREE.BufferGeometry {
  const head = new THREE.SphereGeometry(0.06, 8, 6);
  head.scale(1.2, 0.9, 0.6);
  const stem = new THREE.BoxGeometry(0.015, 0.16, 0.015);
  stem.translate(0.06, 0.08, 0);
  const g = new THREE.BufferGeometry();
  const pos = [...head.toNonIndexed().getAttribute('position').array, ...stem.toNonIndexed().getAttribute('position').array];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const GEOMETRY: Record<string, () => THREE.BufferGeometry> = {
  sparkleTrail: () => new THREE.OctahedronGeometry(TRAIL.size * 0.7, 0),
  rainbowTrail: () => new THREE.BoxGeometry(TRAIL.size * 1.4, TRAIL.size * 0.5, TRAIL.size * 1.4),
  bubbleTrail: () => new THREE.SphereGeometry(TRAIL.size * 0.6, 10, 8),
  musicTrail: noteGeometry,
  pixelTrail: () => new THREE.BoxGeometry(TRAIL.size, TRAIL.size, TRAIL.size),
};

/** Pooled trail VFX behind the cat; one InstancedMesh per trail type, built on demand. */
export class TrailFx {
  readonly root = new THREE.Group();
  private readonly meshes = new Map<string, THREE.InstancedMesh>();
  private id: string | null = null;
  private readonly px = new Float32Array(TRAIL.capacity);
  private readonly py = new Float32Array(TRAIL.capacity);
  private readonly pz = new Float32Array(TRAIL.capacity);
  private readonly age = new Float32Array(TRAIL.capacity).fill(TRAIL.life);
  private readonly hue = new Uint8Array(TRAIL.capacity);
  private next = 0;
  private spawnT = 0;
  private count = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly v = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly col = new THREE.Color();

  setTrail(id: string | undefined): void {
    this.id = id && GEOMETRY[id] ? id : null;
    for (const [k, mesh] of this.meshes) mesh.visible = k === this.id;
    if (!this.id || this.meshes.has(this.id)) return;
    const mesh = new THREE.InstancedMesh(GEOMETRY[this.id](), createToonMaterial(0xffffff), TRAIL.capacity);
    mesh.frustumCulled = false;
    mesh.setColorAt(0, this.col.setHex(0xffffff));
    this.meshes.set(this.id, mesh);
    this.root.add(mesh);
  }

  /** `worldSpeed` moves particles back with the scrolling world (0 at home). */
  update(dt: number, x: number, y: number, worldSpeed: number, active: boolean): void {
    if (!this.id) return;
    const mesh = this.meshes.get(this.id)!;
    const colors = ACCESSORIES[this.id].colors;
    if (active && dt > 0) {
      this.spawnT -= dt;
      while (this.spawnT <= 0) {
        this.spawnT += 1 / TRAIL.perSec;
        const i = this.next;
        this.next = (this.next + 1) % TRAIL.capacity;
        this.px[i] = x + (Math.random() - 0.5) * 0.4;
        this.py[i] = y + 0.5 + (Math.random() - 0.5) * 0.3;
        this.pz[i] = 0.7;
        this.age[i] = 0;
        this.hue[i] = (this.hue[(i + TRAIL.capacity - 1) % TRAIL.capacity] + 1) % colors.length;
      }
    }
    let n = 0;
    for (let i = 0; i < TRAIL.capacity; i++) {
      if (this.age[i] >= TRAIL.life) continue;
      this.age[i] += dt;
      this.pz[i] += worldSpeed * dt;
      this.py[i] += 0.4 * dt;
      const k = 1 - this.age[i] / TRAIL.life;
      if (k <= 0) continue;
      this.v.set(this.px[i], this.py[i], this.pz[i]);
      this.q.setFromEuler(this.e.set(this.age[i] * 4, this.age[i] * 6, 0));
      this.s.setScalar(k);
      this.m.compose(this.v, this.q, this.s);
      mesh.setMatrixAt(n, this.m);
      mesh.setColorAt(n++, this.col.setHex(colors[this.hue[i]]));
    }
    this.count = n;
    mesh.count = this.count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}
