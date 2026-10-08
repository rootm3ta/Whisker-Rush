import * as THREE from 'three';
import { DIZZY, DUST, REVIVE_BURST } from '../data/fx';
import { Rng } from '../core/Rng';
import { createToonMaterial } from './ToonMaterial';

function starGeometry(size: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.45;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: size * 0.3, bevelEnabled: false });
  g.translate(0, 0, -size * 0.15);
  return g;
}

/**
 * Comic crash effects: churning dust cloud with stars and flailing limbs,
 * dizzy stars orbiting Miso's head, and the revive burst ring.
 */
export class CrashFx {
  readonly root = new THREE.Group();
  private readonly cloud = new THREE.Group();
  private readonly puffs: THREE.Mesh[] = [];
  private readonly puffSeed: Float32Array;
  private readonly stars: THREE.Mesh[] = [];
  private readonly limbs: THREE.Mesh[] = [];
  private readonly dizzy = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private cloudT = -1;
  private dizzyOn = false;
  private dizzyT = 0;
  private burstT = -1;

  constructor() {
    const rng = new Rng(77);
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);
    this.puffSeed = new Float32Array(DUST.puffs * 3);
    for (let i = 0; i < DUST.puffs; i++) {
      const m = new THREE.Mesh(puffGeo, createToonMaterial(DUST.colors[i % DUST.colors.length]));
      this.puffs.push(m);
      this.cloud.add(m);
      this.puffSeed[i * 3] = rng.range(0, Math.PI * 2);
      this.puffSeed[i * 3 + 1] = rng.range(DUST.puffRadius[0], DUST.puffRadius[1]);
      this.puffSeed[i * 3 + 2] = rng.range(0.6, 1.4);
    }
    const starGeo = starGeometry(DUST.starSize);
    const starMat = createToonMaterial(DUST.starColor);
    for (let i = 0; i < DUST.stars; i++) {
      const m = new THREE.Mesh(starGeo, starMat);
      this.stars.push(m);
      this.cloud.add(m);
    }
    const limbGeo = new THREE.CapsuleGeometry(0.06, 0.4, 3, 6);
    const limbMat = createToonMaterial(DUST.limbColor);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(limbGeo, limbMat);
      this.limbs.push(m);
      this.cloud.add(m);
    }
    this.cloud.visible = false;
    this.root.add(this.cloud);

    for (let i = 0; i < DIZZY.stars; i++) this.dizzy.add(new THREE.Mesh(starGeo, starMat));
    this.dizzy.visible = false;
    this.root.add(this.dizzy);

    this.ringMat = new THREE.MeshBasicMaterial({ color: REVIVE_BURST.color, transparent: true, depthWrite: false });
    const ringGeo = new THREE.TorusGeometry(1, 0.08, 6, 32);
    ringGeo.rotateX(Math.PI / 2);
    this.ring = new THREE.Mesh(ringGeo, this.ringMat);
    this.ring.visible = false;
    this.root.add(this.ring);
  }

  startCloud(x: number, y: number, z: number): void {
    this.cloud.position.set(x, y + 0.9, z + 0.6);
    this.cloud.visible = true;
    this.cloudT = 0;
  }

  stopCloud(): void {
    this.cloud.visible = false;
    this.cloudT = -1;
  }

  setDizzy(on: boolean): void {
    this.dizzyOn = on;
    this.dizzy.visible = on;
  }

  burst(x: number, y: number, z: number): void {
    this.ring.position.set(x, y + 0.3, z);
    this.ring.visible = true;
    this.burstT = 0;
  }

  /** `catX/catY` place the dizzy halo above Miso's head. */
  update(dt: number, catX: number, catY: number): void {
    if (this.cloudT >= 0) this.updateCloud(dt);
    if (this.dizzyOn) {
      this.dizzyT += dt;
      const a0 = this.dizzyT * DIZZY.spinHz * Math.PI * 2;
      this.dizzy.position.set(catX, catY + DIZZY.height, -0.3);
      const kids = this.dizzy.children;
      for (let i = 0; i < kids.length; i++) {
        const a = a0 + (i / kids.length) * Math.PI * 2;
        kids[i].position.set(Math.cos(a) * DIZZY.radius, Math.sin(a * 2) * 0.06, Math.sin(a) * DIZZY.radius * 0.6);
        kids[i].rotation.z = a * 1.5;
      }
    }
    if (this.burstT >= 0) {
      this.burstT += dt;
      const t = this.burstT / REVIVE_BURST.sec;
      if (t >= 1) {
        this.ring.visible = false;
        this.burstT = -1;
      } else {
        const r = 0.3 + REVIVE_BURST.maxRadius * (1 - (1 - t) * (1 - t));
        this.ring.scale.set(r, 1, r);
        this.ringMat.opacity = 1 - t;
      }
    }
  }

  private updateCloud(dt: number): void {
    this.cloudT += dt;
    const t = this.cloudT;
    const grow = Math.min(1, t * 6);
    const w = DUST.churnHz * Math.PI * 2;
    for (let i = 0; i < this.puffs.length; i++) {
      const a = this.puffSeed[i * 3] + t * w * 0.25 * this.puffSeed[i * 3 + 2];
      const r = this.puffSeed[i * 3 + 1];
      const p = this.puffs[i];
      p.position.set(Math.cos(a) * DUST.spread * 0.8, Math.sin(a * 1.7) * 0.45, Math.sin(a) * DUST.spread * 0.5);
      p.scale.setScalar(r * grow * (0.85 + 0.15 * Math.sin(t * w + i)));
    }
    for (let i = 0; i < this.stars.length; i++) {
      const k = ((t * 1.6 + i / this.stars.length) % 1) * grow;
      const a = (i / this.stars.length) * Math.PI * 2 + 0.6;
      const s = this.stars[i];
      s.position.set(Math.cos(a) * (0.6 + k * 1.2), 0.3 + Math.sin(a) * 0.4 + k * 0.8, 0.6);
      s.rotation.z = t * 8 + i;
      s.scale.setScalar(Math.sin(k * Math.PI) + 0.01);
    }
    for (let i = 0; i < this.limbs.length; i++) {
      const a = (i / this.limbs.length) * Math.PI * 2 + Math.sin(t * w * 0.5 + i) * 0.6;
      const l = this.limbs[i];
      const out = 0.9 + 0.25 * Math.sin(t * w + i * 2);
      l.position.set(Math.cos(a) * out, Math.sin(a) * out * 0.7, 0.3);
      l.rotation.z = a - Math.PI / 2;
      l.scale.setScalar(grow);
    }
  }
}
