import * as THREE from 'three';
import { BOSS } from '../data/boss';
import { COIN, LOOT, LOOT_MAPLE_LANE, RARITIES } from '../data/pickups';
import { OBSTACLES, OBSTACLE_IDS, type ObstacleId } from '../data/obstacles';
import { POWERUPS, POWERUP_IDS } from '../data/powerups';
import { BELLS, DAILY_HUNT, MYSTERY_FISH } from '../data/secrets';
import { PickupKind, type Field } from '../gameplay/Field';
import {
  OBSTACLE_GEOMETRY,
  bellGeometry,
  chestGeometry,
  clotheslinePole,
  coinGeometry,
  fishBoneGeometry,
  lootGeometry,
  mysteryFishGeometry,
  sockGeometry,
  tokenGeometry,
} from '../procgen/obstacles';
import { hex } from './Sky';
import { createToonMaterial } from './ToonMaterial';

const MAX_SPECIAL = 12;

/** Draws the Field with one InstancedMesh per obstacle kind and pickup type. Matrices update per frame. */
export class FieldView {
  readonly root = new THREE.Group();
  /** Golden sparkle on coins while x2 Treats is active. */
  goldBoost = false;
  /** Today's Daily Hunt word (letters are drawn from it). */
  word = '';
  private readonly obstacles = {} as Record<ObstacleId, THREE.InstancedMesh>;
  private readonly poles: THREE.InstancedMesh;
  private readonly coins: THREE.InstancedMesh;
  private readonly loot: THREE.InstancedMesh;
  private readonly bones: THREE.InstancedMesh;
  private readonly socks: THREE.InstancedMesh;
  private readonly tokens: THREE.InstancedMesh;
  private readonly fish: THREE.InstancedMesh;
  private readonly bells: THREE.InstancedMesh;
  private readonly chests: THREE.InstancedMesh;
  private readonly letter: THREE.Mesh;
  private readonly letterMat: THREE.MeshBasicMaterial;
  private readonly letterTex = new Map<string, THREE.CanvasTexture>();
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
    for (let i_id = 0; i_id < OBSTACLE_IDS.length; i_id++) {
      const id = OBSTACLE_IDS[i_id];
      const mesh = this.instanced(OBSTACLE_GEOMETRY[id](), vc, OBSTACLES[id].capacity);
      if (id === 'car') mesh.setColorAt(0, this.col.setHex(0xffffff));
      this.obstacles[id] = mesh;
    }
    this.poles = this.instanced(clotheslinePole(), vc, OBSTACLES.clothesline.capacity * 2);
    this.coins = this.instanced(coinGeometry(), createToonMaterial(COIN.color), COIN.capacity);
    this.coins.setColorAt(0, this.col.setHex(0xffffff));
    this.loot = this.instanced(lootGeometry(), createToonMaterial(0xffffff), LOOT.capacity);
    this.loot.setColorAt(0, this.col.setHex(0xffffff));
    this.bones = this.instanced(fishBoneGeometry(LOOT.fishBoneColor), vc, LOOT.capacity);
    this.socks = this.instanced(sockGeometry(), vc, LOOT.capacity);
    this.socks.setColorAt(0, this.col.setHex(0xffffff));
    this.tokens = this.instanced(tokenGeometry(), vc, MAX_SPECIAL);
    this.tokens.setColorAt(0, this.col.setHex(0xffffff));
    this.fish = this.instanced(mysteryFishGeometry(MYSTERY_FISH.color), vc, MAX_SPECIAL);
    this.bells = this.instanced(bellGeometry(BELLS.color), vc, MAX_SPECIAL);
    this.chests = this.instanced(chestGeometry(), vc, 2);
    this.letterMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    this.letter = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), this.letterMat);
    this.letter.visible = false;
    this.root.add(this.letter);
  }

  private instanced(g: THREE.BufferGeometry, m: THREE.Material, n: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(g, m, n);
    mesh.frustumCulled = false;
    this.root.add(mesh);
    return mesh;
  }

  private letterTexture(ch: string): THREE.CanvasTexture {
    let t = this.letterTex.get(ch);
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = hex(DAILY_HUNT.color);
    g.strokeStyle = '#2a201c';
    g.lineWidth = 10;
    g.beginPath();
    g.roundRect(8, 8, 112, 112, 22);
    g.fill();
    g.stroke();
    g.fillStyle = '#d9562e';
    g.font = 'bold 84px Fredoka, Nunito, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, 64, 70);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.letterTex.set(ch, t);
    return t;
  }

  /** `distance` is the interpolated cat distance; world z = distance - s. */
  update(field: Field, distance: number, dt: number): void {
    this.time += dt;
    for (let i_id = 0; i_id < OBSTACLE_IDS.length; i_id++) { const id = OBSTACLE_IDS[i_id]; this.counts[id] = 0; }
    let poles = 0;
    for (let i_o = 0; i_o < field.obstacles.length; i_o++) {
      const o = field.obstacles[i_o];
      if (!o.active) continue;
      const mesh = this.obstacles[o.id];
      const i = this.counts[o.id]++;
      const z = distance - o.s0;
      const len = o.s1 - o.s0;
      if (o.flight > 0) {
        // Boss throw: arc from the truck roof down onto the road, tumbling.
        const p = 1 - o.flight / BOSS.flightSec;
        this.set(o.x, (1 - p) * 3.2 + Math.sin(p * Math.PI) * 1.4, z, p * 6, p * 3, 1, 1);
      } else {
        this.set(o.x, 0, z, 0, 0, 1, o.id === 'clothesline' ? len : 1);
      }
      mesh.setMatrixAt(i, this.m);
      if (o.id === 'car') mesh.setColorAt(i, this.col.setHex(o.color));
      if (o.id === 'clothesline') {
        this.set(o.x + 1.45, 0, z, 0, 0, 1, 1);
        this.poles.setMatrixAt(poles++, this.m);
        this.set(o.x + 1.45, 0, z - len, 0, 0, 1, 1);
        this.poles.setMatrixAt(poles++, this.m);
      }
    }
    for (let i_id = 0; i_id < OBSTACLE_IDS.length; i_id++) { const id = OBSTACLE_IDS[i_id]; this.finish(this.obstacles[id], this.counts[id]); }
    this.finish(this.poles, poles);

    const spin = this.time * COIN.spinPerSec;
    const gold = this.goldBoost ? 1.25 + 0.1 * Math.sin(this.time * 18) : 1;
    let n = 0;
    for (let i_c = 0; i_c < field.coins.length; i_c++) {
      const c = field.coins[i_c];
      if (!c.active) continue;
      this.set(c.x, c.y, distance - c.s, spin, 0, gold, gold);
      this.coins.setMatrixAt(n, this.m);
      this.coins.setColorAt(n++, this.col.setHex(this.goldBoost ? 0xfff0b0 : 0xffffff));
    }
    this.finish(this.coins, n);

    let nl = 0;
    let nb = 0;
    let ns = 0;
    let nt = 0;
    let nf = 0;
    let nbell = 0;
    let nc = 0;
    let letterShown = false;
    const bob = Math.sin(this.time * 3) * 0.08;
    for (let i_p = 0; i_p < field.pickups.length; i_p++) {
      const p = field.pickups[i_p];
      if (!p.active) continue;
      const z = distance - p.s;
      switch (p.kind) {
        case PickupKind.Loot: {
          this.set(p.x, p.y + bob, z, spin * 0.6, 0, 1, 1);
          this.loot.setMatrixAt(nl, this.m);
          const c = p.blocked ? 0x6d6d6d : RARITIES[LOOT_MAPLE_LANE[p.item].rarity].color;
          this.loot.setColorAt(nl++, this.col.setHex(c));
          break;
        }
        case PickupKind.FishBone:
          this.set(p.x, p.y + bob, z, spin, 0, 1, 1);
          this.bones.setMatrixAt(nb++, this.m);
          break;
        case PickupKind.Sock:
          this.set(p.x, p.y, z, 0, Math.sin(this.time * 4 + p.s) * 0.25, 1, 1);
          this.socks.setMatrixAt(ns, this.m);
          this.socks.setColorAt(ns++, this.col.setHex(LOOT.sockColors[Math.floor(p.s) % LOOT.sockColors.length]));
          break;
        case PickupKind.PowerUp:
          if (nt >= MAX_SPECIAL) break;
          this.set(p.x, p.y + bob, z, spin * 0.8, 0, 1.1, 1.1);
          this.tokens.setMatrixAt(nt, this.m);
          this.tokens.setColorAt(nt++, this.col.setHex(POWERUPS[POWERUP_IDS[p.item]].color));
          break;
        case PickupKind.Mystery:
          if (nf >= MAX_SPECIAL) break;
          this.set(p.x, p.y + bob, z, spin, Math.sin(this.time * 6) * 0.3, 1.2, 1.2);
          this.fish.setMatrixAt(nf++, this.m);
          break;
        case PickupKind.Bell:
          if (nbell >= MAX_SPECIAL) break;
          this.set(p.x, p.y + bob, z, 0, Math.sin(this.time * 8) * 0.35, 1.3, 1.3);
          this.bells.setMatrixAt(nbell++, this.m);
          break;
        case PickupKind.Chest:
          if (nc >= 2) break;
          this.set(p.x, p.y + bob * 2, z, Math.sin(this.time * 2) * 0.4, 0, 1.2, 1.2);
          this.chests.setMatrixAt(nc++, this.m);
          break;
        case PickupKind.Letter:
          if (letterShown) break;
          letterShown = true;
          this.letter.position.set(p.x, p.y + 0.2 + bob, z);
          this.letter.rotation.y = Math.sin(this.time * 2) * 0.5;
          {
            const tex = this.letterTexture(this.word[p.item] ?? '?');
            if (this.letterMat.map !== tex) {
              this.letterMat.map = tex;
              this.letterMat.needsUpdate = true;
            }
          }
          break;
      }
    }
    this.letter.visible = letterShown;
    this.finish(this.loot, nl);
    this.finish(this.bones, nb);
    this.finish(this.socks, ns);
    this.finish(this.tokens, nt);
    this.finish(this.fish, nf);
    this.finish(this.bells, nbell);
    this.finish(this.chests, nc);
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
