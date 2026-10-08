import * as THREE from 'three';
import { COIN, LOOT, LOOT_MAPLE_LANE, RARITIES } from '../data/pickups';
import { OBSTACLES, OBSTACLE_IDS, type ObstacleId } from '../data/obstacles';
import { PickupKind, type Field } from '../gameplay/Field';
import {
  OBSTACLE_GEOMETRY,
  clotheslinePole,
  coinGeometry,
  fishBoneGeometry,
  lootGeometry,
  sockGeometry,
} from '../procgen/obstacles';
import { createToonMaterial } from './ToonMaterial';

/** Draws the Field with one InstancedMesh per obstacle kind and pickup type. Matrices update per frame. */
export class FieldView {
  readonly root = new THREE.Group();
  private readonly obstacles = {} as Record<ObstacleId, THREE.InstancedMesh>;
  private readonly poles: THREE.InstancedMesh;
  private readonly coins: THREE.InstancedMesh;
  private readonly loot: THREE.InstancedMesh;
  private readonly bones: THREE.InstancedMesh;
  private readonly socks: THREE.InstancedMesh;
  private readonly counts = {} as Record<ObstacleId, number>;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private readonly col = new THREE.Color();
  private time = 0;

  constructor() {
    const vc = createToonMaterial(0xffffff, { vertexColors: true });
    for (const id of OBSTACLE_IDS) {
      const mesh = new THREE.InstancedMesh(OBSTACLE_GEOMETRY[id](), vc, OBSTACLES[id].capacity);
      mesh.frustumCulled = false;
      if (id === 'car') mesh.setColorAt(0, this.col.setHex(0xffffff));
      this.obstacles[id] = mesh;
      this.root.add(mesh);
    }
    this.poles = this.instanced(clotheslinePole(), vc, OBSTACLES.clothesline.capacity * 2);
    this.coins = this.instanced(coinGeometry(), createToonMaterial(COIN.color), COIN.capacity);
    this.loot = this.instanced(lootGeometry(), createToonMaterial(0xffffff), LOOT.capacity);
    this.loot.setColorAt(0, this.col.setHex(0xffffff));
    this.bones = this.instanced(fishBoneGeometry(LOOT.fishBoneColor), vc, LOOT.capacity);
    this.socks = this.instanced(sockGeometry(), vc, LOOT.capacity);
    this.socks.setColorAt(0, this.col.setHex(0xffffff));
  }

  private instanced(g: THREE.BufferGeometry, m: THREE.Material, n: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(g, m, n);
    mesh.frustumCulled = false;
    this.root.add(mesh);
    return mesh;
  }

  /** `distance` is the interpolated cat distance; world z = distance - s. */
  update(field: Field, distance: number, dt: number): void {
    this.time += dt;
    for (const id of OBSTACLE_IDS) this.counts[id] = 0;
    let poles = 0;
    for (const o of field.obstacles) {
      if (!o.active) continue;
      const mesh = this.obstacles[o.id];
      const i = this.counts[o.id]++;
      const z = distance - o.s0;
      const len = o.s1 - o.s0;
      this.set(o.x, 0, z, 0, 0, 1, o.id === 'clothesline' ? len : 1);
      mesh.setMatrixAt(i, this.m);
      if (o.id === 'car') mesh.setColorAt(i, this.col.setHex(o.color));
      if (o.id === 'clothesline') {
        this.set(o.x + 1.45, 0, z, 0, 0, 1, 1);
        this.poles.setMatrixAt(poles++, this.m);
        this.set(o.x + 1.45, 0, z - len, 0, 0, 1, 1);
        this.poles.setMatrixAt(poles++, this.m);
      }
    }
    for (const id of OBSTACLE_IDS) this.finish(this.obstacles[id], this.counts[id]);
    this.finish(this.poles, poles);

    const spin = this.time * COIN.spinPerSec;
    let n = 0;
    for (const c of field.coins) {
      if (!c.active) continue;
      this.set(c.x, c.y, distance - c.s, spin, 0, 1, 1);
      this.coins.setMatrixAt(n++, this.m);
    }
    this.finish(this.coins, n);

    let nl = 0;
    let nb = 0;
    let ns = 0;
    const bob = Math.sin(this.time * 3) * 0.08;
    for (const p of field.pickups) {
      if (!p.active) continue;
      const z = distance - p.s;
      if (p.kind === PickupKind.Loot) {
        this.set(p.x, p.y + bob, z, spin * 0.6, 0, 1, 1);
        this.loot.setMatrixAt(nl, this.m);
        const c = p.blocked ? 0x6d6d6d : RARITIES[LOOT_MAPLE_LANE[p.item].rarity].color;
        this.loot.setColorAt(nl++, this.col.setHex(c));
      } else if (p.kind === PickupKind.FishBone) {
        this.set(p.x, p.y + bob, z, spin, 0, 1, 1);
        this.bones.setMatrixAt(nb++, this.m);
      } else {
        this.set(p.x, p.y, z, 0, Math.sin(this.time * 4 + p.s) * 0.25, 1, 1);
        this.socks.setMatrixAt(ns, this.m);
        this.socks.setColorAt(ns++, this.col.setHex(LOOT.sockColors[Math.floor(p.s) % LOOT.sockColors.length]));
      }
    }
    this.finish(this.loot, nl);
    this.finish(this.bones, nb);
    this.finish(this.socks, ns);
  }

  private set(x: number, y: number, z: number, ry: number, rz: number, s: number, sz: number): void {
    this.p.set(x, y, z);
    this.q.setFromEuler(this.e.set(0, ry, rz));
    this.sc.set(s, s, sz);
    this.m.compose(this.p, this.q, this.sc);
  }

  private finish(mesh: THREE.InstancedMesh, count: number): void {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}
