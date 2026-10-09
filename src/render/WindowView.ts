import * as THREE from 'three';
import { WINDOW, type TimeOfDay, type WindowEvent } from '../data/home';
import { merge, paint } from '../procgen/geo';
import { createToonMaterial } from './ToonMaterial';
import { hex } from './Sky';
import { Rng } from '../core/Rng';

const C = WINDOW.colors;
const GROUND = -1.25;

/** Painted box translated to (x, y, z). */
function bx(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);
}
function ball(r: number, color: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  return paint(new THREE.SphereGeometry(r, 10, 7).scale(sx, sy, sz).translate(x, y, z), color);
}
/** Gable roof: a 45-degree box whose lower half hides inside the house. */
function roof(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return paint(new THREE.BoxGeometry(1, 1, d).rotateZ(Math.PI / 4).scale(w / 2 / 0.7071, h / 0.7071, 1).translate(x, y, z), color);
}

/** A person (coat color, optional bag) as one merged mesh, feet at y = 0, facing +x. */
function person(coat: number, skin: number, hat: number, bag: number | null, h = 1.05): THREE.BufferGeometry {
  const parts = [
    bx(0.12, h * 0.42, 0.14, 0x3a3f55, 0, h * 0.21, 0),
    paint(new THREE.CylinderGeometry(0.13, 0.16, h * 0.4, 8).translate(0, h * 0.62, 0), coat),
    ball(0.11, skin, 0, h * 0.9, 0),
    paint(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 8).translate(0, h * 0.99, 0), hat),
  ];
  if (bag !== null) parts.push(bx(0.08, 0.2, 0.26, bag, -0.14, h * 0.55, 0));
  return merge(parts);
}

function dogGeo(body: number, ear: number, scale = 1): THREE.BufferGeometry {
  const g = merge([
    ball(0.13, body, 0, 0.2, 0, 1.6, 0.9, 0.9),
    ball(0.09, body, 0.2, 0.3, 0),
    ball(0.04, ear, 0.24, 0.38, 0.05),
    ball(0.04, ear, 0.24, 0.38, -0.05),
    bx(0.04, 0.14, 0.04, body, -0.1, 0.07, 0.05),
    bx(0.04, 0.14, 0.04, body, 0.1, 0.07, -0.05),
    bx(0.12, 0.03, 0.03, body, -0.24, 0.27, 0),
  ]);
  return g.scale(scale, scale, scale);
}

/** Duke, merged into one mesh: stocky bulldog, sunglasses, spiked collar. Faces +x. */
function dukeGeo(): THREE.BufferGeometry {
  const fawn = 0xc9a27a;
  const cream = 0xe8d4b8;
  const parts = [
    ball(0.2, fawn, 0, 0.3, 0, 1.5, 1, 1.15),
    ball(0.17, fawn, 0.28, 0.45, 0, 1, 0.95, 1.1),
    bx(0.12, 0.1, 0.22, cream, 0.42, 0.4, 0),
    bx(0.03, 0.06, 0.26, 0x1d1d22, 0.4, 0.52, 0),
    bx(0.03, 0.04, 0.3, 0x2a201c, 0.39, 0.55, 0),
    bx(0.08, 0.06, 0.3, 0x3a2a2a, 0.2, 0.36, 0),
    ball(0.05, 0x8a6a4f, 0.22, 0.6, 0.1),
    ball(0.05, 0x8a6a4f, 0.22, 0.6, -0.1),
  ];
  for (const [x, z] of [[-0.18, 0.1], [-0.18, -0.1], [0.16, 0.12], [0.16, -0.12]]) parts.push(bx(0.07, 0.2, 0.07, cream, x, 0.1, z));
  for (let i = 0; i < 4; i++) parts.push(paint(new THREE.ConeGeometry(0.015, 0.05, 5).rotateZ(-Math.PI / 2 + (i - 1.5) * 0.5).translate(0.24, 0.36 + (i - 1.5) * 0.04, 0.12), 0xd9dde2));
  return merge(parts);
}

function skyTexture(top: number, bottom: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, hex(top));
  gr.addColorStop(1, hex(bottom));
  g.fillStyle = gr;
  g.fillRect(0, 0, 2, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Actor {
  obj: THREE.Object3D;
  /** Walk path along local x, depth z, speed m/s, bob Hz. */
  x0: number;
  x1: number;
  z: number;
  speed: number;
  bobHz: number;
}

/**
 * The living window: a layered street (sky, clouds, houses, tree, fence, lamp) seen through a hole
 * in the back wall, lit by the player's local time of day, with ambient events that Miso reacts to.
 * Everything is low-poly and merged; at most ~10 draw calls are visible at once.
 */
export class WindowView {
  readonly root = new THREE.Group();
  /** World position of whatever Miso should watch (valid while `event` is set). */
  readonly focus = new THREE.Vector3();
  event: WindowEvent | null = null;
  /** Fired at the dramatic beat: birds land in view (chatter) or Duke stops to glare (hiss). */
  onCue: ((cue: 'chatter' | 'hiss') => void) | null = null;
  onEvent: ((e: WindowEvent) => void) | null = null;
  tod: TimeOfDay = 'golden';

  private readonly rng = new Rng((Date.now() & 0xffff) >>> 0);
  private readonly sky: THREE.MeshBasicMaterial;
  private readonly skyTex = new Map<TimeOfDay, THREE.CanvasTexture>();
  private readonly windowsMat = new THREE.MeshBasicMaterial({ color: 0xa8b4bc });
  private readonly lampGlow: THREE.Sprite;
  private readonly stars: THREE.Points;
  private readonly leaves: THREE.Mesh;
  private readonly clouds: THREE.InstancedMesh;
  private readonly birds: THREE.InstancedMesh;
  private readonly falling: THREE.InstancedMesh;
  private readonly actors: Record<'mail' | 'walker' | 'bike' | 'duke' | 'butterfly', Actor>;
  private readonly walkerDog: THREE.Mesh;
  private readonly dummy = new THREE.Object3D();
  private readonly tmp = new THREE.Vector3();
  private t = 0;
  private next: number = WINDOW.firstEventSec;
  private et = 0;
  private cued = false;

  constructor() {
    const R = this.root;
    R.position.set(WINDOW.hole.x, WINDOW.hole.y, -2.95);
    const vc = createToonMaterial(0xffffff, { vertexColors: true });

    // Sky plane far back, swapped per time of day.
    for (const k of Object.keys(WINDOW.times) as TimeOfDay[]) this.skyTex.set(k, skyTexture(WINDOW.times[k].skyTop, WINDOW.times[k].skyBottom));
    this.sky = new THREE.MeshBasicMaterial({ map: this.skyTex.get('golden')!, fog: false });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), this.sky);
    sky.position.set(0.3, 0.2, -14);
    R.add(sky);

    // Stars (night only).
    const sp = new Float32Array(60 * 3);
    const srng = new Rng(7);
    for (let i = 0; i < 60; i++) sp.set([srng.range(-3.5, 4), srng.range(0.1, 2.8), -13.9], i * 3);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.05, transparent: true, opacity: 0, fog: false }));
    R.add(this.stars);

    // Static street: one merged mesh.
    const P: THREE.BufferGeometry[] = [];
    P.push(bx(12, 0.05, 3, C.street, 0.3, GROUND - 0.03, -6.5));
    P.push(bx(12, 0.08, 1.6, C.sidewalk, 0.3, GROUND, -3.6));
    P.push(bx(12, 0.08, 1.4, C.sidewalk, 0.3, GROUND, -8.5));
    P.push(bx(12, 0.05, 6, C.grass, 0.3, GROUND - 0.02, -12));
    // Hills far back.
    P.push(ball(2.2, 0x7fae6a, -2.2, GROUND - 0.6, -13, 1.6, 0.6, 0.5), ball(2.6, 0x8fbf7a, 2.8, GROUND - 0.9, -13.2, 1.5, 0.55, 0.5));
    // Houses across the street.
    const houseX = [-2.3, -1.05, 0.25, 1.55, 2.85];
    houseX.forEach((x, i) => {
      const h = 1.15 + (i % 3) * 0.22;
      const w = 1.05;
      const col = C.houses[i % C.houses.length];
      P.push(bx(w, h, 0.9, col, x, GROUND + h / 2, -9.8));
      P.push(roof(w + 0.15, 0.5, 0.86, C.roof, x, GROUND + h, -9.8));
      P.push(bx(0.24, 0.42, 0.04, C.roof, x + 0.2, GROUND + 0.21, -9.33));
      P.push(bx(w + 0.04, 0.05, 0.94, C.trim, x, GROUND + h - 0.02, -9.8));
    });
    // Picket fence just outside the window.
    for (let i = 0; i < 26; i++) P.push(bx(0.1, 0.4, 0.04, C.fence, -2.4 + i * 0.22, GROUND + 0.2, -1.2));
    P.push(bx(6, 0.05, 0.05, C.fence, 0.3, GROUND + 0.3, -1.18));
    // Lamp post and Old Tom's cart.
    P.push(paint(new THREE.CylinderGeometry(0.035, 0.05, 1.7, 6).translate(1.15, GROUND + 0.85, -3.0), C.lampPost));
    P.push(bx(0.22, 0.12, 0.22, C.lampPost, 1.15, GROUND + 1.72, -3.0));
    P.push(bx(0.7, 0.35, 0.4, 0x8d5f38, -0.55, GROUND + 0.45, -2.6), bx(0.78, 0.06, 0.48, C.cart, -0.55, GROUND + 0.98, -2.6));
    for (let i = 0; i < 4; i++) P.push(bx(0.16, 0.12, 0.12, [0x9fdcc4, 0xf6c9a8, 0xf3e6c9, 0xe85d8a][i], -0.8 + i * 0.17, GROUND + 0.68, -2.6));
    P.push(bx(0.04, 0.5, 0.04, 0x5e3a22, -0.88, GROUND + 0.75, -2.42), bx(0.04, 0.5, 0.04, 0x5e3a22, -0.22, GROUND + 0.75, -2.42));
    P.push(paint(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 7).translate(-1.05, GROUND + 0.6, -5), C.trunk));
    R.add(new THREE.Mesh(merge(P), vc));

    // House windows (lit at dusk and night).
    const W: THREE.BufferGeometry[] = [];
    houseX.forEach((x, i) => {
      const h = 1.15 + (i % 3) * 0.22;
      W.push(new THREE.BoxGeometry(0.22, 0.24, 0.02).translate(x - 0.22, GROUND + h - 0.38, -9.34));
      if (h > 1.3) W.push(new THREE.BoxGeometry(0.22, 0.24, 0.02).translate(x + 0.22, GROUND + h - 0.38, -9.34));
    });
    const wg = merge(W.map((g) => paint(g, 0xffffff)));
    R.add(new THREE.Mesh(wg, this.windowsMat));

    // Lamp glow sprite.
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.lampGlow.position.set(1.15, GROUND + 1.68, -2.95);
    this.lampGlow.scale.setScalar(0.9);
    R.add(this.lampGlow);

    // Tree crown (sways).
    this.leaves = new THREE.Mesh(
      merge([ball(0.5, C.leaves, 0, 0, 0, 1, 0.85, 1), ball(0.38, 0x6fae5c, 0.35, 0.18, 0.1), ball(0.36, 0x548a46, -0.35, 0.12, -0.1), ball(0.32, 0x6fae5c, 0.05, 0.42, 0)]),
      vc,
    );
    this.leaves.position.set(-1.05, GROUND + 1.45, -5);
    R.add(this.leaves);

    // Clouds.
    const cloud = merge([ball(0.3, C.cloud, 0, 0, 0, 1.4, 0.6, 0.6), ball(0.22, C.cloud, 0.3, 0.08, 0), ball(0.2, C.cloud, -0.3, 0.05, 0)]);
    this.clouds = new THREE.InstancedMesh(cloud, createToonMaterial(0xffffff, { vertexColors: true }), 3);
    R.add(this.clouds);

    // Birds (V shapes), falling leaves.
    const bird = merge([bx(0.14, 0.015, 0.04, 0x2a201c, -0.06, 0, 0).rotateZ(0.4), bx(0.14, 0.015, 0.04, 0x2a201c, 0.06, 0, 0).rotateZ(-0.4)]);
    this.birds = new THREE.InstancedMesh(bird, vc, 5);
    this.birds.visible = false;
    R.add(this.birds);
    this.falling = new THREE.InstancedMesh(paint(new THREE.PlaneGeometry(0.08, 0.05), 0xd98a3a), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), 8);
    this.falling.visible = false;
    R.add(this.falling);

    const mk = (geo: THREE.BufferGeometry, x0: number, x1: number, z: number, speed: number, bobHz: number): Actor => {
      const m = new THREE.Mesh(geo, vc);
      m.visible = false;
      R.add(m);
      return { obj: m, x0, x1, z, speed, bobHz };
    };
    this.actors = {
      mail: mk(person(0x3f6f8a, 0xe8c4a0, 0x3f6f8a, 0x8d5f38, 1.35), -3, 3.4, -3.4, 0.9, 1.8),
      walker: mk(person(0xd9562e, 0xc89a78, 0x2a201c, null, 1.3), 3.4, -3, -3.8, 0.8, 1.7),
      bike: mk(merge([...[-0.22, 0.22].map((x) => paint(new THREE.TorusGeometry(0.15, 0.025, 5, 12).translate(x, 0.15, 0), 0x2a201c)), bx(0.46, 0.04, 0.04, 0xe8863a, 0, 0.3, 0), person(0x6fa38a, 0xe8c4a0, 0xf2c14e, null, 0.7).translate(0, 0.3, 0)]).scale(1.3, 1.3, 1.3), -3, 3.6, -3.6, 2.4, 0),
      duke: mk(dukeGeo().scale(1.7, 1.7, 1.7), -3, 3.4, -3.3, 1.1, 3.2),
      butterfly: mk(merge([ball(0.05, 0xf2c14e, -0.04, 0, 0, 1, 1.3, 0.2), ball(0.05, 0xf2c14e, 0.04, 0, 0, 1, 1.3, 0.2), bx(0.012, 0.07, 0.012, 0x2a201c, 0, 0, 0)]), -1.5, 0.3, -0.2, 0.7, 0),
    };
    this.walkerDog = new THREE.Mesh(dogGeo(0xf3e6c9, 0x8a6a4f, 1.5), vc);
    this.walkerDog.visible = false;
    R.add(this.walkerDog);
  }

  setTime(tod: TimeOfDay): void {
    this.tod = tod;
    const T = WINDOW.times[tod];
    this.sky.map = this.skyTex.get(tod)!;
    this.sky.needsUpdate = true;
    this.windowsMat.color.setHex(T.windows);
    this.lampGlow.visible = T.lamp !== 0;
    this.lampGlow.material.color.setHex(T.lamp || 0xffffff);
    (this.stars.material as THREE.PointsMaterial).opacity = T.stars;
    this.stars.visible = T.stars > 0;
  }

  /** Starts an event: a named one (debug) replaces whatever is playing; a random one waits its turn. */
  play(e?: WindowEvent): void {
    if (this.event) {
      if (!e) return;
      this.endEvent();
    }
    if (!e) {
      const W = WINDOW.events;
      let total = 0;
      for (const k in W) total += W[k as WindowEvent];
      let r = this.rng.next() * total;
      e = 'birds';
      for (const k in W) {
        r -= W[k as WindowEvent];
        if (r <= 0) {
          e = k as WindowEvent;
          break;
        }
      }
    }
    this.event = e;
    this.et = 0;
    this.cued = false;
    this.onEvent?.(e);
  }

  /** Back to a quiet window (e.g. on leaving Home). */
  reset(): void {
    this.endEvent();
    this.next = WINDOW.firstEventSec;
  }

  private endEvent(): void {
    this.event = null;
    for (const a of Object.values(this.actors)) a.obj.visible = false;
    this.walkerDog.visible = false;
    this.birds.visible = false;
    this.falling.visible = false;
    const [a, b] = WINDOW.eventEvery;
    this.next = this.rng.range(a, b);
  }

  update(dt: number): void {
    this.t += dt;
    const t = this.t;
    this.leaves.rotation.z = Math.sin(t * 1.3) * 0.04 + Math.sin(t * 3.1) * 0.015;
    const d = this.dummy;
    for (let i = 0; i < 3; i++) {
      const x = ((t * 0.05 + i * 2.3) % 7) - 3.2;
      d.position.set(x, 0.35 + i * 0.22, -12.5);
      d.scale.setScalar(0.9 + i * 0.25);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      this.clouds.setMatrixAt(i, d.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
    if (this.lampGlow.visible) this.lampGlow.material.opacity = 0.75 + Math.sin(t * 2.3) * 0.08;

    if (!this.event) {
      this.next -= dt;
      if (this.next <= 0) this.play();
      return;
    }
    this.et += dt;
    if (!this.step(this.event, this.et)) this.endEvent();
  }

  /** Advances the running event; returns false when it is over. Sets `focus` (world). */
  private step(e: WindowEvent, et: number): boolean {
    const d = this.dummy;
    switch (e) {
      case 'birds': {
        const B = this.birds;
        B.visible = true;
        const dur = 6;
        for (let i = 0; i < 5; i++) {
          const k = et / dur;
          d.position.set(-2.6 + k * 6 + (i % 3) * 0.25, 0.1 + k * 0.5 + Math.sin(et * 2 + i) * 0.06 + (i % 2) * 0.12, -5 + i * 0.2);
          d.rotation.set(0, 0, 0);
          d.scale.set(1, 0.4 + Math.abs(Math.sin(et * 9 + i)) * 1.2, 1);
          d.updateMatrix();
          B.setMatrixAt(i, d.matrix);
        }
        B.instanceMatrix.needsUpdate = true;
        this.tmp.set(-2.6 + (et / dur) * 6.2, 0.1 + (et / dur) * 0.5, -5);
        if (!this.cued && et > dur * 0.4) this.cue('chatter');
        return this.toWorld(et < dur);
      }
      case 'leaves': {
        const F = this.falling;
        F.visible = true;
        const dur = 5;
        for (let i = 0; i < 8; i++) {
          const k = (et + i * 0.3) / dur;
          d.position.set(-1.6 + k * 3.6 + Math.sin(et * 2 + i) * 0.2, 0.5 - k * 1.4 + Math.sin(et * 3 + i * 2) * 0.1, -1.6 - (i % 3) * 0.6);
          d.rotation.set(et * 3 + i, et * 2, et * 4 + i);
          d.scale.setScalar(1);
          d.updateMatrix();
          F.setMatrixAt(i, d.matrix);
        }
        F.instanceMatrix.needsUpdate = true;
        this.tmp.set(-1.6 + (et / dur) * 3.6, 0.3 - (et / dur) * 1.2, -1.8);
        return this.toWorld(et < dur);
      }
      case 'butterfly': {
        const a = this.actors.butterfly;
        a.obj.visible = true;
        const dur = 6;
        // Flutters in, taps the glass three times, flutters off.
        const k = Math.min(1, et / 1.5);
        const out = Math.max(0, (et - 4.5) / 1.5);
        a.obj.position.set(-1.5 + k * 1.5 + out * 2, 0.1 + Math.sin(et * 5) * 0.06 + out * 0.6, -0.4 + k * 0.25 - Math.abs(Math.sin(et * 6)) * 0.05 * (et > 1.5 && et < 4.5 ? 1 : 0));
        a.obj.scale.set(0.4 + Math.abs(Math.sin(et * 18)) * 0.6, 1, 1);
        this.tmp.copy(a.obj.position);
        return this.toWorld(et < dur);
      }
      case 'walker':
        this.walk(this.actors.walker, et, 1);
        this.walkerDog.visible = true;
        this.walkerDog.position.set(this.actors.walker.obj.position.x - 0.5, GROUND + 0.04 + Math.abs(Math.sin(et * 7)) * 0.03, -3.5);
        this.walkerDog.rotation.y = Math.PI;
        this.tmp.copy(this.walkerDog.position);
        return this.toWorld(this.inView(this.actors.walker, et));
      case 'duke': {
        const a = this.actors.duke;
        // Walks to the middle, stops and glares at Miso for 2.2 s, then trots off.
        const mid = 0.55;
        const tMid = (mid - a.x0) / a.speed;
        const stop = 2.2;
        const x = et < tMid ? a.x0 + et * a.speed : et < tMid + stop ? mid : mid + (et - tMid - stop) * a.speed * 1.3;
        a.obj.visible = true;
        const glaring = et >= tMid && et < tMid + stop;
        a.obj.position.set(x, GROUND + 0.04 + (glaring ? 0 : Math.abs(Math.sin(et * a.bobHz * Math.PI)) * 0.04), a.z);
        a.obj.rotation.y = glaring ? -Math.PI / 2 * Math.min(1, (et - tMid) * 4) : 0;
        if (glaring && !this.cued) this.cue('hiss');
        this.tmp.copy(a.obj.position).setY(GROUND + 0.8);
        return this.toWorld(x < a.x1);
      }
      default: {
        const a = this.actors[e];
        this.walk(a, et, 1);
        this.tmp.copy(a.obj.position).setY(GROUND + 0.8);
        return this.toWorld(this.inView(a, et));
      }
    }
  }

  private walk(a: Actor, et: number, dir: number): void {
    const s = Math.sign(a.x1 - a.x0) * dir;
    a.obj.visible = true;
    a.obj.position.set(a.x0 + s * et * a.speed, GROUND + 0.04 + (a.bobHz ? Math.abs(Math.sin(et * a.bobHz * Math.PI)) * 0.04 : 0), a.z);
    a.obj.rotation.y = s > 0 ? 0 : Math.PI;
  }

  private inView(a: Actor, et: number): boolean {
    return et * a.speed < Math.abs(a.x1 - a.x0);
  }

  private cue(c: 'chatter' | 'hiss'): void {
    this.cued = true;
    this.onCue?.(c);
  }

  private toWorld(alive: boolean): boolean {
    this.focus.copy(this.tmp).applyMatrix4(this.root.matrixWorld);
    return alive;
  }
}
